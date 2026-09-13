const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { estimateAcceptanceProbability } = require("../services/aiClient");

const router = express.Router();

async function getCounselorIdByUser(userId) {
  const [rows] = await pool.query("SELECT id FROM counselors WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].id : null;
}

router.get("/me", authRequired, async (req, res) => {
  if (req.user.role !== "counselor") return res.status(403).json({ error: "Counselor only" });
  const [rows] = await pool.query(
    "SELECT c.*, u.email, u.name FROM counselors c JOIN users u ON c.user_id = u.id WHERE u.id = ?",
    [req.user.id]
  );
  return res.json(rows[0] || null);
});

router.put("/me", authRequired, async (req, res) => {
  if (req.user.role !== "counselor") return res.status(403).json({ error: "Counselor only" });
  const { organization, title } = req.body || {};
  await pool.query(
    "UPDATE counselors SET organization = ?, title = ? WHERE user_id = ?",
    [organization || "", title || "", req.user.id]
  );
  return res.json({ status: "ok" });
});

// List students this counselor advises
router.get("/me/students", authRequired, async (req, res) => {
  if (req.user.role !== "counselor") return res.status(403).json({ error: "Counselor only" });
  const counselorId = await getCounselorIdByUser(req.user.id);
  if (!counselorId) return res.status(403).json({ error: "Counselor profile missing" });

  const [rows] = await pool.query(
    `SELECT csl.student_id, u.name, u.email, s.grade_level, s.school, s.intended_major,
            (SELECT COUNT(*) FROM academic_records WHERE student_id = s.id) AS academic_count,
            (SELECT COUNT(*) FROM activities WHERE student_id = s.id) AS activity_count,
            (SELECT COUNT(*) FROM awards WHERE student_id = s.id) AS award_count
     FROM counselor_student_links csl
     JOIN students s ON csl.student_id = s.id
     JOIN users u ON s.user_id = u.id
     WHERE csl.counselor_id = ?
     ORDER BY u.name`,
    [counselorId]
  );

  // Quick completion estimate per student
  const enriched = rows.map((r) => {
    const score = Math.min(1, r.academic_count / 4) * 0.5
      + Math.min(1, r.activity_count / 4) * 0.3
      + Math.min(1, r.award_count / 2) * 0.2;
    return { ...r, completion: Math.round(score * 100) };
  });
  return res.json(enriched);
});

// Link a student via their invite code
router.post("/me/link", authRequired, async (req, res) => {
  if (req.user.role !== "counselor") return res.status(403).json({ error: "Counselor only" });
  const { invite_code } = req.body || {};
  if (!invite_code) return res.status(400).json({ error: "invite_code required" });

  const counselorId = await getCounselorIdByUser(req.user.id);
  if (!counselorId) return res.status(403).json({ error: "Counselor profile missing" });

  const [[student]] = await pool.query("SELECT id FROM students WHERE invite_code = ?", [invite_code]);
  if (!student) return res.status(404).json({ error: "Invalid invite code" });

  try {
    await pool.query(
      "INSERT INTO counselor_student_links (counselor_id, student_id, invite_code) VALUES (?, ?, ?)",
      [counselorId, student.id, invite_code]
    );
    return res.json({ status: "linked", student_id: student.id });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Already linked" });
    throw e;
  }
});

router.delete("/me/students/:studentId", authRequired, async (req, res) => {
  if (req.user.role !== "counselor") return res.status(403).json({ error: "Counselor only" });
  const counselorId = await getCounselorIdByUser(req.user.id);
  if (!counselorId) return res.status(403).json({ error: "Counselor profile missing" });
  await pool.query(
    "DELETE FROM counselor_student_links WHERE counselor_id = ? AND student_id = ?",
    [counselorId, req.params.studentId]
  );
  return res.json({ status: "unlinked" });
});

// Read-only portfolio view (mirrors parent route)
router.get("/me/students/:studentId", authRequired, async (req, res) => {
  if (req.user.role !== "counselor") return res.status(403).json({ error: "Counselor only" });
  const counselorId = await getCounselorIdByUser(req.user.id);
  if (!counselorId) return res.status(403).json({ error: "Counselor profile missing" });

  const sid = req.params.studentId;
  const [[link]] = await pool.query(
    "SELECT 1 FROM counselor_student_links WHERE counselor_id = ? AND student_id = ?",
    [counselorId, sid]
  );
  if (!link) return res.status(403).json({ error: "Not linked" });

  const [[student]] = await pool.query(
    "SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?",
    [sid]
  );
  if (!student) return res.status(404).json({ error: "Student not found" });

  const [academics] = await pool.query("SELECT * FROM academic_records WHERE student_id = ? ORDER BY year DESC", [sid]);
  const [tests] = await pool.query("SELECT * FROM test_scores WHERE student_id = ? ORDER BY test_date DESC", [sid]);
  const [activities] = await pool.query("SELECT * FROM activities WHERE student_id = ? ORDER BY start_date DESC", [sid]);
  const [awards] = await pool.query("SELECT * FROM awards WHERE student_id = ? ORDER BY award_date DESC", [sid]);
  const [documents] = await pool.query("SELECT * FROM documents WHERE student_id = ? ORDER BY uploaded_at DESC", [sid]);

  let tasks = [];
  try {
    const [t] = await pool.query(
      "SELECT * FROM tasks WHERE student_id = ? ORDER BY FIELD(status, 'open','in_progress','done'), due_date, id",
      [sid]
    );
    tasks = t;
  } catch (err) { /* migration not yet run */ }

  let savedUniversities = [];
  try {
    const [su] = await pool.query(
      `SELECT su.*, u.name, u.country, u.city, u.selectivity_band
       FROM saved_universities su JOIN universities u ON su.university_id = u.id
       WHERE su.student_id = ?
       ORDER BY FIELD(bucket, 'reach','target','safety'), deadline, u.name`,
      [sid]
    );
    savedUniversities = su;
  } catch (err) { /* migration not yet run */ }

  let essays = [];
  try {
    const [e] = await pool.query(
      "SELECT id, title, word_count, last_edited_at, created_at FROM essays WHERE student_id = ? ORDER BY last_edited_at DESC",
      [sid]
    );
    essays = e;
  } catch (err) { /* essays table missing */ }

  const summary = {
    gradeLevel: student.grade_level,
    intendedMajor: student.intended_major,
    targetCountries: student.target_countries,
    classRank: student.class_rank,
    academicCount: academics.length,
    activityCount: activities.length,
    awardCount: awards.length,
    essayCount: essays.length
  };
  const acceptance = await estimateAcceptanceProbability(summary, savedUniversities);

  return res.json({
    profile: student,
    academics,
    tests,
    activities,
    awards,
    documents,
    tasks,
    savedUniversities,
    essays,
    acceptance
  });
});

module.exports = router;
