const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

async function getStudentIdByUser(userId) {
  const [rows] = await pool.query("SELECT id FROM students WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].id : null;
}

router.get("/me", authRequired, async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ error: "Student only" });
  }
  const [rows] = await pool.query(
    "SELECT s.*, u.email, u.name FROM students s JOIN users u ON s.user_id = u.id WHERE u.id = ?",
    [req.user.id]
  );
  return res.json(rows[0] || null);
});

router.put("/me", authRequired, async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ error: "Student only" });
  }
  const {
    grade_level,
    school,
    target_countries,
    intended_major,
    bio
  } = req.body || {};
  await pool.query(
    "UPDATE students SET grade_level = ?, school = ?, target_countries = ?, intended_major = ?, bio = ? WHERE user_id = ?",
    [grade_level || "", school || "", target_countries || "", intended_major || "", bio || "", req.user.id]
  );
  return res.json({ status: "ok" });
});

router.get("/me/summary", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [[student]] = await pool.query(
    "SELECT grade_level, school, target_countries, intended_major FROM students WHERE id = ?",
    [studentId]
  );
  const [[academics]] = await pool.query("SELECT COUNT(*) AS count FROM academic_records WHERE student_id = ?", [studentId]);
  const [[tests]] = await pool.query("SELECT COUNT(*) AS count FROM test_scores WHERE student_id = ?", [studentId]);
  const [[activities]] = await pool.query("SELECT COUNT(*) AS count FROM activities WHERE student_id = ?", [studentId]);
  const [[awards]] = await pool.query("SELECT COUNT(*) AS count FROM awards WHERE student_id = ?", [studentId]);
  const [[documents]] = await pool.query("SELECT COUNT(*) AS count FROM documents WHERE student_id = ?", [studentId]);

  const profileFields = ["grade_level", "school", "target_countries", "intended_major"];
  const filledProfile = profileFields.filter((field) => student?.[field]).length;
  const profileScore = filledProfile / profileFields.length;
  const dataScore =
    Math.min(1, academics.count / 4) * 0.3 +
    Math.min(1, tests.count / 2) * 0.2 +
    Math.min(1, activities.count / 4) * 0.3 +
    Math.min(1, awards.count / 2) * 0.1 +
    Math.min(1, documents.count / 3) * 0.1;

  const completion = Math.round((profileScore * 0.4 + dataScore * 0.6) * 100);
  return res.json({
    completion,
    counts: {
      academics: academics.count,
      tests: tests.count,
      activities: activities.count,
      awards: awards.count,
      documents: documents.count
    }
  });
});

router.get("/me/invite", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [[student]] = await pool.query("SELECT invite_code FROM students WHERE id = ?", [studentId]);
  if (student?.invite_code) {
    return res.json({ invite_code: student.invite_code });
  }
  const inviteCode = crypto.randomBytes(6).toString("hex");
  await pool.query("UPDATE students SET invite_code = ? WHERE id = ?", [inviteCode, studentId]);
  return res.json({ invite_code: inviteCode });
});

router.get("/me/academics", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [rows] = await pool.query("SELECT * FROM academic_records WHERE student_id = ? ORDER BY year DESC", [studentId]);
  return res.json(rows);
});

router.post("/me/academics", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { year, course, level, grade, school_system } = req.body || {};
  const [result] = await pool.query(
    "INSERT INTO academic_records (student_id, year, course, level, grade, school_system) VALUES (?, ?, ?, ?, ?, ?)",
    [studentId, year || "", course || "", level || "", grade || "", school_system || ""]
  );
  return res.json({ id: result.insertId });
});

router.delete("/me/academics/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  await pool.query("DELETE FROM academic_records WHERE id = ? AND student_id = ?", [id, studentId]);
  return res.json({ status: "deleted" });
});

router.get("/me/tests", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [rows] = await pool.query("SELECT * FROM test_scores WHERE student_id = ? ORDER BY test_date DESC", [studentId]);
  return res.json(rows);
});

router.post("/me/tests", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { test_type, test_date, score, superscore } = req.body || {};
  const [result] = await pool.query(
    "INSERT INTO test_scores (student_id, test_type, test_date, score, superscore) VALUES (?, ?, ?, ?, ?)",
    [studentId, test_type || "", test_date || null, score || "", superscore || ""]
  );
  return res.json({ id: result.insertId });
});

router.delete("/me/tests/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  await pool.query("DELETE FROM test_scores WHERE id = ? AND student_id = ?", [id, studentId]);
  return res.json({ status: "deleted" });
});

router.get("/me/activities", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [rows] = await pool.query("SELECT * FROM activities WHERE student_id = ? ORDER BY start_date DESC", [studentId]);
  return res.json(rows);
});

router.post("/me/activities", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { title, description, role, hours_per_week, leadership, start_date, end_date } = req.body || {};
  const [result] = await pool.query(
    "INSERT INTO activities (student_id, title, description, role, hours_per_week, leadership, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [studentId, title || "", description || "", role || "", Number(hours_per_week || 0), Boolean(leadership), start_date || null, end_date || null]
  );
  return res.json({ id: result.insertId });
});

router.get("/me/awards", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [rows] = await pool.query("SELECT * FROM awards WHERE student_id = ? ORDER BY award_date DESC", [studentId]);
  return res.json(rows);
});

router.post("/me/awards", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { title, description, award_date } = req.body || {};
  const [result] = await pool.query(
    "INSERT INTO awards (student_id, title, description, award_date) VALUES (?, ?, ?, ?)",
    [studentId, title || "", description || "", award_date || null]
  );
  return res.json({ id: result.insertId });
});

router.delete("/me/awards/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  await pool.query("DELETE FROM awards WHERE id = ? AND student_id = ?", [id, studentId]);
  return res.json({ status: "deleted" });
});

// Essay endpoints
router.get("/me/essays", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  try {
    const [rows] = await pool.query("SELECT * FROM essays WHERE student_id = ? ORDER BY last_edited_at DESC", [studentId]);
    return res.json(rows);
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.json([]); // Return empty array if table doesn't exist yet
    }
    throw err;
  }
});

router.get("/me/essays/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM essays WHERE id = ? AND student_id = ?", [id, studentId]);
    if (!rows.length) return res.status(404).json({ error: "Essay not found" });
    return res.json(rows[0]);
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(404).json({ error: "Essay not found" });
    }
    throw err;
  }
});

router.post("/me/essays", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { title, content } = req.body || {};
  try {
    const wordCount = content ? content.replace(/<[^>]*>/g, "").split(/\s+/).filter(w => w.length > 0).length : 0;
    const [result] = await pool.query(
      "INSERT INTO essays (student_id, title, content, word_count) VALUES (?, ?, ?, ?)",
      [studentId, title || "Untitled Essay", content || "", wordCount]
    );
    return res.json({ id: result.insertId, word_count: wordCount });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({ error: "Database migration required. Please run alter_add_essays.sql" });
    }
    throw err;
  }
});

router.put("/me/essays/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  const { title, content } = req.body || {};
  try {
    const wordCount = content ? content.replace(/<[^>]*>/g, "").split(/\s+/).filter(w => w.length > 0).length : 0;
    await pool.query(
      "UPDATE essays SET title = ?, content = ?, word_count = ? WHERE id = ? AND student_id = ?",
      [title || "Untitled Essay", content || "", wordCount, id, studentId]
    );
    return res.json({ status: "ok", word_count: wordCount });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({ error: "Database migration required. Please run alter_add_essays.sql" });
    }
    throw err;
  }
});

router.delete("/me/essays/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM essays WHERE id = ? AND student_id = ?", [id, studentId]);
    return res.json({ status: "deleted" });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({ error: "Database migration required. Please run alter_add_essays.sql" });
    }
    throw err;
  }
});

module.exports = router;
