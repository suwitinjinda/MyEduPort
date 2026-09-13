const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { estimateAcceptanceProbability } = require("../services/aiClient");

const router = express.Router();

async function getParentIdByUser(userId) {
  const [rows] = await pool.query("SELECT id FROM parents WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].id : null;
}

router.get("/me/students", authRequired, async (req, res) => {
  if (req.user.role !== "parent") return res.status(403).json({ error: "Parent only" });
  const parentId = await getParentIdByUser(req.user.id);
  const [rows] = await pool.query(
    `SELECT s.id AS student_id, s.grade_level, s.school, s.target_countries, s.intended_major,
            u.name, u.email,
            (SELECT COUNT(*) FROM academic_records ar WHERE ar.student_id = s.id) AS academics_count,
            (SELECT COUNT(*) FROM test_scores ts WHERE ts.student_id = s.id) AS tests_count,
            (SELECT COUNT(*) FROM activities ac WHERE ac.student_id = s.id) AS activities_count,
            (SELECT COUNT(*) FROM awards aw WHERE aw.student_id = s.id) AS awards_count,
            (SELECT COUNT(*) FROM documents d WHERE d.student_id = s.id) AS documents_count
     FROM parent_student_links psl
     JOIN students s ON psl.student_id = s.id
     JOIN users u ON s.user_id = u.id
     WHERE psl.parent_id = ?`,
    [parentId]
  );
  const enriched = rows.map((student) => {
    const profileFields = ["grade_level", "school", "target_countries", "intended_major"];
    const filledProfile = profileFields.filter((field) => student[field]).length;
    const profileScore = filledProfile / profileFields.length;
    const dataScore =
      Math.min(1, student.academics_count / 4) * 0.3 +
      Math.min(1, student.tests_count / 2) * 0.2 +
      Math.min(1, student.activities_count / 4) * 0.3 +
      Math.min(1, student.awards_count / 2) * 0.1 +
      Math.min(1, student.documents_count / 3) * 0.1;
    const completion = Math.round((profileScore * 0.4 + dataScore * 0.6) * 100);
    return { ...student, completion };
  });
  return res.json(enriched);
});

router.post("/me/link", authRequired, async (req, res) => {
  if (req.user.role !== "parent") return res.status(403).json({ error: "Parent only" });
  const { invite_code } = req.body || {};
  if (!invite_code) return res.status(400).json({ error: "Invite code required" });
  const parentId = await getParentIdByUser(req.user.id);
  const [[student]] = await pool.query("SELECT id FROM students WHERE invite_code = ?", [invite_code]);
  if (!student) return res.status(404).json({ error: "Invite code not found" });
  await pool.query(
    "INSERT INTO parent_student_links (parent_id, student_id, invite_code) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE invite_code = VALUES(invite_code)",
    [parentId, student.id, invite_code]
  );
  return res.json({ status: "linked" });
});

// Get detailed student portfolio data (read-only for parent)
router.get("/me/students/:studentId", authRequired, async (req, res) => {
  if (req.user.role !== "parent") return res.status(403).json({ error: "Parent only" });
  const parentId = await getParentIdByUser(req.user.id);
  const { studentId } = req.params;

  const [links] = await pool.query(
    "SELECT student_id FROM parent_student_links WHERE parent_id = ? AND student_id = ?",
    [parentId, studentId]
  );
  if (links.length === 0) return res.status(403).json({ error: "Not linked to this student" });

  const [[student]] = await pool.query(
    `SELECT s.*, u.name, u.email
     FROM students s JOIN users u ON s.user_id = u.id
     WHERE s.id = ?`,
    [studentId]
  );

  const [academics] = await pool.query("SELECT * FROM academic_records WHERE student_id = ? ORDER BY year DESC, course ASC", [studentId]);
  const [tests] = await pool.query("SELECT * FROM test_scores WHERE student_id = ? ORDER BY test_date DESC", [studentId]);
  const [activities] = await pool.query("SELECT * FROM activities WHERE student_id = ? ORDER BY start_date DESC", [studentId]);
  const [awards] = await pool.query("SELECT * FROM awards WHERE student_id = ? ORDER BY award_date DESC", [studentId]);
  const [documents] = await pool.query(
    "SELECT id, original_name, category, uploaded_at FROM documents WHERE student_id = ? ORDER BY uploaded_at DESC",
    [studentId]
  );

  // v2 fields — tasks, saved universities, essays
  let tasks = [];
  try {
    const [t] = await pool.query(
      "SELECT * FROM tasks WHERE student_id = ? ORDER BY FIELD(status, 'open', 'in_progress', 'done'), due_date, id",
      [studentId]
    );
    tasks = t;
  } catch (err) { /* migration not yet run */ }

  let savedUniversities = [];
  try {
    const [su] = await pool.query(
      `SELECT su.*, u.name, u.country, u.city, u.selectivity_band
       FROM saved_universities su JOIN universities u ON su.university_id = u.id
       WHERE su.student_id = ?
       ORDER BY FIELD(bucket, 'reach', 'target', 'safety'), deadline, u.name`,
      [studentId]
    );
    savedUniversities = su;
  } catch (err) { /* migration not yet run */ }

  let essays = [];
  try {
    const [e] = await pool.query(
      "SELECT id, title, word_count, last_edited_at, created_at FROM essays WHERE student_id = ? ORDER BY last_edited_at DESC",
      [studentId]
    );
    essays = e;
  } catch (err) { /* essays table missing */ }

  // Compute acceptance probability summary
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
