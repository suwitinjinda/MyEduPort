const express = require("express");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

// "Back up my work" — a student downloads everything they have put into MyEduPort as a
// single ZIP they can keep on their own computer.
//
// This is deliberately more than the older /me/data-export JSON, which listed uploaded
// documents by name but did not include the files, and summarised essays without their
// text. A backup that is missing the student's own writing and their transcripts is not a
// backup. This one contains:
//
//   README.txt                what is in here and how to read it
//   my-data.json              every row of their own data, including essay text
//   essays/<title>.txt        each essay as plain text, plus earlier drafts
//   personal-statement.txt    the portfolio personal statement
//   files/<original name>     the actual uploaded documents
//
// Only ever the signed-in student's own rows. Reading is allowed even when the account is
// read-only (lapsed) — getting your own work out should never be the thing you lose.
const router = express.Router();
const UPLOADS = path.join(__dirname, "..", "..", "uploads");

async function studentIdOf(userId) {
  const [rows] = await pool.query("SELECT id FROM students WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].id : null;
}

const parse = (v) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

// Turn a title into something safe to use as a file name inside the zip
function safeName(s, fallback, keepExt = false) {
  const raw = String(s || "").replace(/[^\w\s.\-()]+/g, "").replace(/\s+/g, " ").trim();
  if (!raw) return fallback;
  if (!keepExt) return raw.slice(0, 60) || fallback;
  // Shorten the stem, never the extension — a .pdf that loses its suffix won't open
  const ext = path.extname(raw).slice(0, 10);
  const stem = raw.slice(0, raw.length - ext.length).slice(0, 60 - ext.length) || fallback;
  return stem + ext;
}

// Two essays can share a title, and two uploads can share a name. Identical entries in a
// zip overwrite each other on extraction, which silently loses one of them.
function uniqueName(name, used) {
  if (!used.has(name)) { used.add(name); return name; }
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  let n = 2;
  while (used.has(`${stem} (${n})${ext}`)) n++;
  const out = `${stem} (${n})${ext}`;
  used.add(out);
  return out;
}

const stripHtml = (s) => String(s || "")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/p>/gi, "\n\n")
  .replace(/<[^>]*>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

router.get("/", authRequired, async (req, res) => {
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });

  // A query that fails must not quietly become an empty section — that is how a backup
  // ends up looking complete while missing someone's work. Record every failure and tell
  // the student about it in the README.
  const problems = [];
  const q = async (sql, params = [studentId]) => {
    try {
      const [r] = await pool.query(sql, params);
      return r;
    } catch (err) {
      const what = (sql.match(/FROM\s+`?(\w+)`?/i) || [, "unknown"])[1];
      problems.push(what);
      console.error(`[my-backup] student ${studentId}: could not read ${what} — ${err.message}`);
      return [];
    }
  };

  const [[profile]] = await pool.query(
    "SELECT s.*, u.email, u.name, u.plan, u.created_at AS account_created FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?",
    [studentId]
  );

  const essays = await q("SELECT id, title, topic, status, content, summary, word_count, ai_score, created_at, last_edited_at FROM essays WHERE student_id = ? ORDER BY created_at");
  const drafts = await q("SELECT essay_id, draft_no, content, word_count, created_at FROM essay_drafts WHERE student_id = ? ORDER BY essay_id, draft_no");
  const documents = await q("SELECT original_name, file_path, category, uploaded_at FROM documents WHERE student_id = ? ORDER BY uploaded_at");

  const data = {
    backup_of: "MyEduPort",
    taken_at: new Date().toISOString(),
    account: {
      name: profile?.name, email: profile?.email, plan: profile?.plan, created_at: profile?.account_created
    },
    profile: profile ? {
      grade_level: profile.grade_level, school: profile.school, curriculum: profile.curriculum,
      target_countries: profile.target_countries, intended_major: profile.intended_major,
      class_rank: profile.class_rank, intended_universities: profile.intended_universities,
      // stored as the editor saved it; personal-statement.txt holds the readable version
      personal_statement: profile.bio, // the Personal page stores the statement in students.bio
      personal_statement_text: stripHtml(profile.bio)
    } : null,
    academics: await q("SELECT year, course, level, grade FROM academic_records WHERE student_id = ? ORDER BY year"),
    tests: await q("SELECT test_type, test_date, score, superscore FROM test_scores WHERE student_id = ? ORDER BY test_date"),
    activities: await q("SELECT title, topic, role, category, description, summary, hours_per_week, leadership, ai_score FROM activities WHERE student_id = ?"),
    awards: await q("SELECT title, description, award_date FROM awards WHERE student_id = ? ORDER BY award_date"),
    // content is kept exactly as the editor saved it (HTML), so a restore puts the
    // formatting back; the readable plain-text copies live in essays/*.txt
    essays: essays.map((e) => ({ ...e, content: e.content ?? null, content_text: stripHtml(e.content) })),
    essay_drafts: drafts.map((d) => ({ ...d, content: d.content ?? null, content_text: stripHtml(d.content) })),
    documents: documents.map(({ original_name, category, uploaded_at }) => ({ original_name, category, uploaded_at })),
    tasks: await q("SELECT title, due_date, category, status FROM tasks WHERE student_id = ? ORDER BY due_date"),
    admission_results: await q("SELECT university_name, country, cycle_year, application_round, major, result, notes, created_at FROM admission_outcomes WHERE student_id = ? AND source = 'student'"),
    saved_universities: await q(
      `SELECT COALESCE(u.name, CONCAT('university #', su.university_id)) AS university_name,
              su.bucket, su.application_round, su.deadline, su.notes, su.created_at
         FROM saved_universities su LEFT JOIN universities u ON u.id = su.university_id
        WHERE su.student_id = ?`),
    personality_assessments: (await q("SELECT instrument, instrument_version, scores, bands, narrative, started_at, completed_at FROM personality_assessments WHERE student_id = ? ORDER BY completed_at"))
      .map((r) => ({ ...r, scores: parse(r.scores), bands: parse(r.bands), narrative: parse(r.narrative) })),
    interest_assessments: (await q("SELECT instrument, instrument_version, scores, ranking, holland_code, narrative, started_at, completed_at FROM interest_assessments WHERE student_id = ? ORDER BY completed_at"))
      .map((r) => ({ ...r, scores: parse(r.scores), ranking: parse(r.ranking), narrative: parse(r.narrative) })),
    mepai_saved_advice: (await q("SELECT kind, scope, payload, updated_at FROM ai_saved_outputs WHERE user_id = ? ORDER BY kind", [req.user.id]))
      .map((r) => ({ ...r, payload: parse(r.payload) }))
  };
  // Make a partial backup obvious to anything reading the JSON too, not just a human
  if (problems.length) data.incomplete_sections = [...new Set(problems)];

  const today = new Date().toISOString().slice(0, 10);
  const zipName = `myeduport-backup-${today}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

  const zip = archiver("zip", { zlib: { level: 9 } });
  let failed = false;
  zip.on("warning", (e) => console.warn("[my-backup] warning:", e.message));
  zip.on("error", (e) => {
    failed = true;
    console.error("[my-backup] failed:", e.message);
    // Headers are already out by this point, so the only honest signal is to cut the
    // stream — the browser then reports a failed download instead of saving a broken zip.
    res.destroy();
  });
  zip.pipe(res);

  const included = [];

  zip.append(JSON.stringify(data, null, 2), { name: "my-data.json" });
  included.push("my-data.json — every field, machine readable");

  if (profile?.bio) {
    zip.append(stripHtml(profile.bio), { name: "personal-statement.txt" });
    included.push("personal-statement.txt");
  }

  const essayNames = new Set();
  essays.forEach((e, i) => {
    const base = uniqueName(safeName(e.title, `essay-${i + 1}`), essayNames);
    const body = stripHtml(e.content);
    if (body) zip.append(`${e.title || "Untitled"}\n${e.topic ? e.topic + "\n" : ""}${"=".repeat(40)}\n\n${body}\n`, { name: `essays/${base}.txt` });
    drafts.filter((d) => d.essay_id === e.id).forEach((d) => {
      const dbody = stripHtml(d.content);
      if (dbody) zip.append(dbody + "\n", { name: `essays/${base} - draft ${d.draft_no}.txt` });
    });
  });
  if (essays.length) included.push(`essays/ — ${essays.length} essay(s) and their earlier drafts, as plain text`);

  // The uploaded files themselves, not just their names
  let filesAdded = 0, filesMissing = 0;
  const usedNames = new Set();
  for (const doc of documents) {
    const stored = path.basename(String(doc.file_path || ""));
    const full = path.join(UPLOADS, stored);
    // Keep the read inside the uploads directory no matter what the stored path says
    if (!stored || !full.startsWith(UPLOADS + path.sep) || !fs.existsSync(full)) { filesMissing++; continue; }
    const name = uniqueName(safeName(doc.original_name, stored, true), usedNames);
    zip.file(full, { name: `files/${name}` });
    filesAdded++;
  }
  if (filesAdded) included.push(`files/ — ${filesAdded} uploaded document(s)`);

  const readme = `MyEduPort — your backup
Taken: ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC
Account: ${profile?.name || ""} <${profile?.email || ""}>

WHAT'S IN HERE
${included.map((l) => "  - " + l).join("\n")}
${filesMissing ? `\n  Note: ${filesMissing} document(s) are listed in my-data.json but their files
  could not be found on the server, so they are not in files/.\n` : ""}${problems.length ? `
  INCOMPLETE: these sections could not be read and are empty in my-data.json:
  ${[...new Set(problems)].join(", ")}
  Please contact support before relying on this backup.
` : ""}
HOW TO READ IT
  my-data.json opens in any text editor, or at jsonformatter.org for a tidy view.
  The .txt files open anywhere. The documents in files/ are exactly what you uploaded.

WHAT THIS IS NOT
  This is a copy for you to keep. Putting it back into MyEduPort is not automatic —
  if you ever need that, sign in and contact support with this file.

Your account is unchanged. Downloading a backup does not delete or alter anything.
`;
  zip.append(readme, { name: "README.txt" });

  await zip.finalize();
  if (!failed) console.log(`[my-backup] student ${studentId}: ${filesAdded} file(s), ${essays.length} essay(s)`);
});

module.exports = router;
