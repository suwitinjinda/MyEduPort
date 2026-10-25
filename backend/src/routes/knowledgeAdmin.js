const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { extractText, ingestText, searchKb } = require("../services/knowledge");

// Admin → Machine Learning: knowledge-base documents the AI reads as context, and the
// admission-outcomes dataset.
const router = express.Router();
const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL || user.role === "admin";
router.use(authRequired, (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: "Admin only" })));

// Stored outside the public /uploads folder: these files are for the AI, not for download links
const kbDir = path.join(__dirname, "..", "..", "kb_files");
if (!fs.existsSync(kbDir)) fs.mkdirSync(kbDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, kbDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "")}`)
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /\.(pdf|docx|txt|md|csv)$/i.test(file.originalname))
});

// ---------- Knowledge base ----------
router.get("/documents", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, title, source, original_name, status, enabled, chars, chunk_count, error, created_at, updated_at FROM kb_documents ORDER BY created_at DESC"
  );
  res.json(rows);
});

async function createAndIngest({ title, source, originalName, filePath, text, userId }) {
  const [r] = await pool.query(
    "INSERT INTO kb_documents (title, source, original_name, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?)",
    [title, source, originalName, filePath, userId]
  );
  try {
    const body = text != null ? text : await extractText(filePath, originalName);
    const chunks = await ingestText(r.insertId, body);
    return { id: r.insertId, status: "ready", chunks };
  } catch (err) {
    await pool.query("UPDATE kb_documents SET status = 'failed', error = ? WHERE id = ?", [String(err.message).slice(0, 500), r.insertId]);
    return { id: r.insertId, status: "failed", error: err.message };
  }
}

router.post("/documents", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "File is larger than 25MB." : err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Upload a PDF, DOCX, TXT, MD or CSV file." });
  const title = String(req.body?.title || "").trim().slice(0, 255) || req.file.originalname.replace(/\.[^.]+$/, "");
  const source = String(req.body?.source || "").trim().slice(0, 500);
  const out = await createAndIngest({ title, source, originalName: req.file.originalname, filePath: req.file.path, userId: req.user.id });
  res.status(out.status === "failed" ? 422 : 200).json(out);
});

// Paste text directly (articles, notes, guidelines)
router.post("/documents/text", async (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0, 255);
  const text = String(req.body?.text || "");
  if (!title || text.trim().length < 50) return res.status(400).json({ error: "Add a title and at least 50 characters of text." });
  const out = await createAndIngest({ title, source: String(req.body?.source || "").trim().slice(0, 500), originalName: "", filePath: null, text, userId: req.user.id });
  res.status(out.status === "failed" ? 422 : 200).json(out);
});

router.patch("/documents/:id", async (req, res) => {
  const sets = [];
  const vals = [];
  if (req.body?.enabled !== undefined) { sets.push("enabled = ?"); vals.push(req.body.enabled ? 1 : 0); }
  if (req.body?.title !== undefined) { sets.push("title = ?"); vals.push(String(req.body.title).trim().slice(0, 255) || "Untitled"); }
  if (req.body?.source !== undefined) { sets.push("source = ?"); vals.push(String(req.body.source).trim().slice(0, 500)); }
  if (!sets.length) return res.status(400).json({ error: "Nothing to update" });
  const [r] = await pool.query(`UPDATE kb_documents SET ${sets.join(", ")} WHERE id = ?`, [...vals, req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: "Not found" });
  res.json({ status: "ok" });
});

router.delete("/documents/:id", async (req, res) => {
  const [[doc]] = await pool.query("SELECT file_path FROM kb_documents WHERE id = ?", [req.params.id]);
  if (!doc) return res.status(404).json({ error: "Not found" });
  await pool.query("DELETE FROM kb_documents WHERE id = ?", [req.params.id]); // chunks cascade
  if (doc.file_path && path.resolve(doc.file_path).startsWith(kbDir)) fs.unlink(doc.file_path, () => {});
  res.json({ status: "deleted" });
});

router.get("/documents/:id/chunks", async (req, res) => {
  const [rows] = await pool.query("SELECT idx, content FROM kb_chunks WHERE doc_id = ? ORDER BY idx LIMIT 5", [req.params.id]);
  res.json(rows);
});

// Try a question and see which passages the AI would receive
router.get("/search", async (req, res) => {
  res.json(await searchKb(String(req.query.q || ""), 6));
});

// ---------- Admission outcomes ----------
router.get("/outcomes", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT o.*, u.name AS student_name, u.email AS student_email
     FROM admission_outcomes o
     LEFT JOIN students s ON s.id = o.student_id
     LEFT JOIN users u ON u.id = s.user_id
     ORDER BY o.created_at DESC LIMIT 1000`
  );
  res.json(rows.map((r) => ({ ...r, profile_snapshot: typeof r.profile_snapshot === "string" ? JSON.parse(r.profile_snapshot || "null") : r.profile_snapshot })));
});

router.get("/outcomes/stats", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT university_name, COUNT(*) total,
            SUM(result IN ('admitted','enrolled')) admitted,
            SUM(result IN ('waitlisted','deferred')) waitlisted,
            SUM(result = 'rejected') rejected
     FROM admission_outcomes GROUP BY university_name ORDER BY total DESC LIMIT 200`
  );
  res.json(rows.map((r) => ({ ...r, admitted: Number(r.admitted), waitlisted: Number(r.waitlisted), rejected: Number(r.rejected) })));
});

const RESULTS = ["admitted", "waitlisted", "rejected", "deferred", "enrolled"];
router.post("/outcomes", async (req, res) => {
  const b = req.body || {};
  const name = String(b.university_name || "").trim().slice(0, 255);
  if (!name || !RESULTS.includes(b.result)) return res.status(400).json({ error: "University and a valid result are required." });
  const [[uni]] = await pool.query("SELECT id, country FROM universities WHERE name = ? LIMIT 1", [name]);
  const snapshot = {
    gpa: b.gpa ? Number(b.gpa) : null,
    tests: String(b.tests || "").split(",").map((t) => t.trim()).filter(Boolean),
    activities: b.activities !== "" && b.activities != null ? Number(b.activities) : null,
    awards: b.awards !== "" && b.awards != null ? Number(b.awards) : null,
    intended_major: String(b.major || "")
  };
  const [r] = await pool.query(
    `INSERT INTO admission_outcomes (student_id, university_id, university_name, country, cycle_year, application_round, major, result, profile_snapshot, notes, source)
     VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin')`,
    [uni?.id || null, name, String(b.country || uni?.country || "").slice(0, 80), b.cycle_year ? Number(b.cycle_year) : null,
      String(b.application_round || "").slice(0, 40), String(b.major || "").slice(0, 150), b.result, JSON.stringify(snapshot), String(b.notes || "").slice(0, 2000) || null]
  );
  res.json({ id: r.insertId });
});

router.delete("/outcomes/:id", async (req, res) => {
  await pool.query("DELETE FROM admission_outcomes WHERE id = ?", [req.params.id]);
  res.json({ status: "deleted" });
});

module.exports = router;
