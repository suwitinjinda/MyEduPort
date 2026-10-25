const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const yauzl = require("yauzl");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

// "Restore from my backup" — a student uploads the ZIP that Settings → Back up my work
// produced and puts their portfolio back.
//
// Two steps on purpose:
//   POST /preview   reads the file and reports what is inside, changing nothing
//   POST /apply     replaces the student's own rows with what the backup holds
//
// Restoring REPLACES: the rows in each section are deleted and re-inserted, because
// merging would silently duplicate every essay and activity each time someone restored.
// The preview shows what they have now next to what the file holds, so the trade is
// visible before they commit, and the UI offers to download a backup of the current
// state first — there is no automatic undo beyond that.
//
// The whole apply runs in one transaction: if any part fails, nothing changes.
//
// It only ever touches the signed-in student's own rows. A backup belonging to a
// different account is reported in the preview so nobody restores the wrong file by
// accident, but the choice is theirs — people do change email address.
const router = express.Router();
const UPLOADS = path.join(__dirname, "..", "..", "uploads");
const MAX_ZIP = 60 * 1024 * 1024;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ZIP } });

async function studentIdOf(userId) {
  const [rows] = await pool.query("SELECT id FROM students WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].id : null;
}

// Read a zip from memory into { entries: {name: Buffer} } without writing anything to disk
function readZip(buf) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buf, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(new Error("That file isn't a readable ZIP."));
      const out = {};
      let total = 0;
      zip.readEntry();
      zip.on("entry", (entry) => {
        // Ignore directories, and never trust a path inside the archive
        if (/\/$/.test(entry.fileName)) return zip.readEntry();
        const name = entry.fileName.replace(/\\/g, "/");
        if (name.includes("..") || name.startsWith("/")) return zip.readEntry();
        total += entry.uncompressedSize;
        if (total > 200 * 1024 * 1024) return reject(new Error("That archive is too large to read."));
        zip.openReadStream(entry, (e, stream) => {
          if (e) return reject(e);
          const chunks = [];
          stream.on("data", (c) => chunks.push(c));
          stream.on("end", () => { out[name] = Buffer.concat(chunks); zip.readEntry(); });
          stream.on("error", reject);
        });
      });
      zip.on("end", () => resolve(out));
      zip.on("error", () => reject(new Error("That ZIP could not be read.")));
    });
  });
}

function parseBackup(entries) {
  const raw = entries["my-data.json"];
  if (!raw) throw new Error("This ZIP has no my-data.json — it isn't a MyEduPort backup.");
  let data;
  try { data = JSON.parse(raw.toString("utf8")); } catch { throw new Error("my-data.json is damaged and can't be read."); }
  if (data.backup_of !== "MyEduPort") throw new Error("This isn't a MyEduPort backup file.");
  return data;
}

// Which sections a restore writes, and how to put each one back
const SECTIONS = [
  { key: "academics", table: "academic_records", cols: ["year", "course", "level", "grade"] },
  { key: "tests", table: "test_scores", cols: ["test_type", "test_date", "score", "superscore"] },
  { key: "activities", table: "activities", cols: ["title", "topic", "role", "category", "description", "summary", "hours_per_week", "leadership", "ai_score"] },
  { key: "awards", table: "awards", cols: ["title", "description", "award_date"] },
  { key: "tasks", table: "tasks", cols: ["title", "due_date", "category", "status"] },
  { key: "admission_results", table: "admission_outcomes", cols: ["university_name", "country", "cycle_year", "application_round", "major", "result", "notes"], extra: { source: "student" } }
];

const countOf = (data, key) => (Array.isArray(data[key]) ? data[key].length : 0);

router.post("/preview", authRequired, upload.single("backup"), async (req, res) => {
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  if (!req.file) return res.status(400).json({ error: "Choose your backup ZIP first." });

  try {
    const entries = await readZip(req.file.buffer);
    const data = parseBackup(entries);
    const [[me]] = await pool.query("SELECT u.email FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = ?", [studentId]);

    const current = {};
    for (const s of SECTIONS) {
      const where = s.extra?.source ? " AND source = 'student'" : "";
      try {
        const [[r]] = await pool.query(`SELECT COUNT(*) n FROM \`${s.table}\` WHERE student_id = ?${where}`, [studentId]);
        current[s.key] = Number(r.n);
      } catch { current[s.key] = null; }
    }
    const [[ess]] = await pool.query("SELECT COUNT(*) n FROM essays WHERE student_id = ?", [studentId]);
    current.essays = Number(ess.n);

    res.json({
      taken_at: data.taken_at || null,
      from_account: data.account?.email || null,
      different_account: !!(data.account?.email && me?.email && data.account.email !== me.email),
      files_in_zip: Object.keys(entries).filter((n) => n.startsWith("files/")).length,
      will_restore: {
        ...Object.fromEntries(SECTIONS.map((s) => [s.key, countOf(data, s.key)])),
        essays: countOf(data, "essays"),
        personal_statement: !!data.profile?.personal_statement
      },
      you_have_now: current
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/apply", authRequired, upload.single("backup"), async (req, res) => {
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  if (!req.file) return res.status(400).json({ error: "Choose your backup ZIP first." });
  if (String(req.body?.confirm || "") !== "REPLACE") {
    return res.status(400).json({ error: 'Confirm first — this replaces what you have now.' });
  }

  let entries, data;
  try {
    entries = await readZip(req.file.buffer);
    data = parseBackup(entries);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const conn = await pool.getConnection();
  const restored = {};
  try {
    await conn.beginTransaction();

    // Profile fields and the personal statement (stored in students.bio)
    if (data.profile) {
      const p = data.profile;
      await conn.query(
        `UPDATE students SET grade_level = ?, school = ?, curriculum = ?, target_countries = ?,
            intended_major = ?, class_rank = ?, intended_universities = ?, bio = ?
         WHERE id = ?`,
        [p.grade_level || null, p.school || null, p.curriculum || null, p.target_countries || null,
          p.intended_major || null, p.class_rank || null, p.intended_universities || null,
          p.personal_statement || null, studentId]
      );
      restored.profile = true;
    }

    for (const s of SECTIONS) {
      const rows = Array.isArray(data[s.key]) ? data[s.key] : [];
      const where = s.extra?.source ? " AND source = 'student'" : "";
      await conn.query(`DELETE FROM \`${s.table}\` WHERE student_id = ?${where}`, [studentId]);
      let n = 0;
      for (const r of rows) {
        const cols = ["student_id", ...s.cols, ...Object.keys(s.extra || {})];
        const vals = [studentId, ...s.cols.map((c) => (r[c] === undefined ? null : r[c])), ...Object.values(s.extra || {})];
        await conn.query(
          `INSERT INTO \`${s.table}\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
          vals
        );
        n++;
      }
      restored[s.key] = n;
    }

    // Essays, with their drafts hung back off the new ids
    await conn.query("DELETE FROM essay_drafts WHERE student_id = ?", [studentId]);
    await conn.query("DELETE FROM essays WHERE student_id = ?", [studentId]);
    let essayCount = 0, draftCount = 0;
    for (const e of (Array.isArray(data.essays) ? data.essays : [])) {
      const [r] = await conn.query(
        `INSERT INTO essays (student_id, title, topic, content, summary, word_count, status, ai_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentId, e.title || null, e.topic || null, e.content || null, e.summary || null,
          e.word_count || null, e.status || "draft", e.ai_score ?? null]
      );
      essayCount++;
      for (const d of (Array.isArray(data.essay_drafts) ? data.essay_drafts : []).filter((x) => x.essay_id === e.id)) {
        await conn.query(
          "INSERT INTO essay_drafts (essay_id, student_id, draft_no, content, word_count) VALUES (?, ?, ?, ?, ?)",
          [r.insertId, studentId, d.draft_no || 1, d.content || null, d.word_count || null]
        );
        draftCount++;
      }
    }
    restored.essays = essayCount;
    restored.essay_drafts = draftCount;

    // Uploaded documents: write the files back, then point rows at them
    const fileEntries = Object.entries(entries).filter(([n]) => n.startsWith("files/"));
    if (fileEntries.length) {
      fs.mkdirSync(UPLOADS, { recursive: true });
      await conn.query("DELETE FROM documents WHERE student_id = ?", [studentId]);
      const meta = Array.isArray(data.documents) ? data.documents : [];
      let n = 0;
      for (const [entryName, buf] of fileEntries) {
        const original = path.basename(entryName);
        const stored = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${original}`.replace(/[^\w.\-]+/g, "_");
        fs.writeFileSync(path.join(UPLOADS, stored), buf);
        const m = meta.find((x) => String(x.original_name || "").includes(original.replace(/^\d+-[0-9a-f]+-/, ""))) || {};
        await conn.query(
          "INSERT INTO documents (student_id, file_path, original_name, category) VALUES (?, ?, ?, ?)",
          [studentId, `/uploads/${stored}`, m.original_name || original, m.category || "Other"]
        );
        n++;
      }
      restored.documents = n;
    }

    await conn.commit();
    console.log(`[my-restore] student ${studentId} restored from backup taken ${data.taken_at}`);
    res.json({ ok: true, restored });
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.error("[my-restore] failed:", e.message);
    res.status(500).json({ error: `Restore failed, so nothing was changed: ${e.message}` });
  } finally {
    conn.release();
  }
});

module.exports = router;
