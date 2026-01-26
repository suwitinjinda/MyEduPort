const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

function isAdmin(user) {
  return user.email === process.env.ADMIN_EMAIL || user.role === "admin";
}

// Check if current user is admin
router.get("/check", authRequired, async (req, res) => {
  return res.json({ isAdmin: isAdmin(req.user) });
});

// Get all users with status
router.get("/users", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  let rows;
  try {
    [rows] = await pool.query(
      `SELECT id, email, role, name, data_consent, is_disabled, deleted_at, created_at 
       FROM users 
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 100`
    );
  } catch (err) {
    // Security columns don't exist, use basic query
    [rows] = await pool.query(
      `SELECT id, email, role, name, created_at 
       FROM users 
       ORDER BY created_at DESC LIMIT 100`
    );
    // Add default values for missing columns
    rows = rows.map(user => ({
      ...user,
      data_consent: null,
      is_disabled: false,
      deleted_at: null
    }));
  }
  return res.json(rows);
});

// Get all students with details
router.get("/students", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  let rows;
  try {
    [rows] = await pool.query(
      `SELECT s.id, s.grade_level, s.school, u.email, u.name, u.created_at, u.is_disabled,
              (SELECT COUNT(*) FROM academic_records ar WHERE ar.student_id = s.id) AS academics_count,
              (SELECT COUNT(*) FROM activities ac WHERE ac.student_id = s.id) AS activities_count,
              (SELECT COUNT(*) FROM test_scores ts WHERE ts.student_id = s.id) AS tests_count,
              (SELECT COUNT(*) FROM awards aw WHERE aw.student_id = s.id) AS awards_count
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC LIMIT 100`
    );
  } catch (err) {
    // Security columns don't exist, use basic query
    [rows] = await pool.query(
      `SELECT s.id, s.grade_level, s.school, u.email, u.name, u.created_at,
              (SELECT COUNT(*) FROM academic_records ar WHERE ar.student_id = s.id) AS academics_count,
              (SELECT COUNT(*) FROM activities ac WHERE ac.student_id = s.id) AS activities_count,
              (SELECT COUNT(*) FROM test_scores ts WHERE ts.student_id = s.id) AS tests_count,
              (SELECT COUNT(*) FROM awards aw WHERE aw.student_id = s.id) AS awards_count
       FROM students s
       JOIN users u ON s.user_id = u.id
       ORDER BY u.created_at DESC LIMIT 100`
    );
    // Add default value for missing column
    rows = rows.map(student => ({
      ...student,
      is_disabled: false
    }));
  }
  return res.json(rows);
});

// Get usage statistics
router.get("/stats", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  
  // Check if security columns exist
  let hasSecurityColumns = false;
  try {
    await pool.query("SELECT deleted_at, is_disabled FROM users LIMIT 1");
    hasSecurityColumns = true;
  } catch (err) {
    // Columns don't exist
  }
  
  let users, students, parents, disabled;
  if (hasSecurityColumns) {
    [[users]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL");
    [[students]] = await pool.query("SELECT COUNT(*) AS count FROM students s JOIN users u ON s.user_id = u.id WHERE u.deleted_at IS NULL");
    [[parents]] = await pool.query("SELECT COUNT(*) AS count FROM parents p JOIN users u ON p.user_id = u.id WHERE u.deleted_at IS NULL");
    [[disabled]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE is_disabled = TRUE AND deleted_at IS NULL");
  } else {
    [[users]] = await pool.query("SELECT COUNT(*) AS count FROM users");
    [[students]] = await pool.query("SELECT COUNT(*) AS count FROM students");
    [[parents]] = await pool.query("SELECT COUNT(*) AS count FROM parents");
    disabled = { count: 0 };
  }
  
  const [[academics]] = await pool.query("SELECT COUNT(*) AS count FROM academic_records");
  const [[activities]] = await pool.query("SELECT COUNT(*) AS count FROM activities");
  const [[tests]] = await pool.query("SELECT COUNT(*) AS count FROM test_scores");
  const [[awards]] = await pool.query("SELECT COUNT(*) AS count FROM awards");
  
  // Check if essays table exists
  let essays = { count: 0 };
  try {
    [[essays]] = await pool.query("SELECT COUNT(*) AS count FROM essays");
  } catch (err) {
    // Table doesn't exist
  }
  
  const [[universities]] = await pool.query("SELECT COUNT(*) AS count FROM universities");
  
  return res.json({
    users: users.count,
    students: students.count,
    parents: parents.count,
    academics: academics.count,
    activities: activities.count,
    tests: tests.count,
    awards: awards.count,
    essays: essays.count,
    universities: universities.count,
    disabled: disabled.count
  });
});

// Disable/Enable user account
router.put("/users/:id/disable", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const userId = Number(req.params.id);
  const { disabled } = req.body || {};
  
  // Check if column exists
  try {
    await pool.query("SELECT is_disabled FROM users LIMIT 1");
    await pool.query("UPDATE users SET is_disabled = ? WHERE id = ?", [Boolean(disabled), userId]);
    return res.json({ status: disabled ? "disabled" : "enabled" });
  } catch (err) {
    return res.status(400).json({ error: "Database migration required. Please run alter_add_security_fields.sql" });
  }
});

// Delete user account (admin can hard delete)
router.delete("/users/:id", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const userId = Number(req.params.id);
  
  // Check if columns exist
  try {
    await pool.query("SELECT deleted_at, is_disabled FROM users LIMIT 1");
    // Soft delete
    await pool.query("UPDATE users SET deleted_at = NOW(), is_disabled = TRUE WHERE id = ?", [userId]);
    return res.json({ status: "deleted" });
  } catch (err) {
    return res.status(400).json({ error: "Database migration required. Please run alter_add_security_fields.sql" });
  }
});

// University management
router.get("/universities", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const { country, limit = 100 } = req.query || {};
  let query = "SELECT * FROM universities WHERE 1=1";
  const params = [];
  if (country) {
    query += " AND country = ?";
    params.push(country);
  }
  query += " ORDER BY name LIMIT ?";
  params.push(Number(limit));
  const [rows] = await pool.query(query, params);
  return res.json(rows);
});

router.get("/universities/:id", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const { id } = req.params;
  const [rows] = await pool.query("SELECT * FROM universities WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ error: "University not found" });
  return res.json(rows[0]);
});

router.post("/universities", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const { name, country, city, selectivity_band, major_tags } = req.body || {};
  if (!name || !country) {
    return res.status(400).json({ error: "Name and country are required" });
  }
  const [result] = await pool.query(
    "INSERT INTO universities (name, country, city, selectivity_band, major_tags) VALUES (?, ?, ?, ?, ?)",
    [name, country, city || "", selectivity_band || "", major_tags || ""]
  );
  return res.json({ id: result.insertId });
});

router.put("/universities/:id", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const { id } = req.params;
  const { name, country, city, selectivity_band, major_tags } = req.body || {};
  await pool.query(
    "UPDATE universities SET name = ?, country = ?, city = ?, selectivity_band = ?, major_tags = ? WHERE id = ?",
    [name, country, city, selectivity_band, major_tags, id]
  );
  return res.json({ status: "updated" });
});

router.delete("/universities/:id", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const { id } = req.params;
  await pool.query("DELETE FROM universities WHERE id = ?", [id]);
  return res.json({ status: "deleted" });
});

module.exports = router;
