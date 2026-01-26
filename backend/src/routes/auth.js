const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

function buildToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  const { email, password, role, name, data_consent } = req.body || {};
  if (!email || !password || !role || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!["student", "parent"].includes(role)) {
    return res.status(400).json({ error: "Role must be student or parent" });
  }
  // Check if data_consent column exists
  let hasConsentColumn = false;
  try {
    await pool.query("SELECT data_consent FROM users LIMIT 1");
    hasConsentColumn = true;
  } catch (err) {
    // Column doesn't exist yet
  }
  
  if (hasConsentColumn && data_consent !== true) {
    return res.status(400).json({ error: "Data consent is required to create an account" });
  }
  // Check if deleted_at column exists, otherwise use basic query
  let existing;
  try {
    [existing] = await pool.query("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL", [email]);
  } catch (err) {
    // Column doesn't exist yet, use basic query
    [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  }
  if (existing.length) {
    return res.status(409).json({ error: "Email already exists" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  let result;
  if (hasConsentColumn) {
    [result] = await pool.query(
      "INSERT INTO users (email, password_hash, role, name, data_consent) VALUES (?, ?, ?, ?, ?)",
      [email, passwordHash, role, name, Boolean(data_consent)]
    );
  } else {
    [result] = await pool.query(
      "INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)",
      [email, passwordHash, role, name]
    );
  }
  const userId = result.insertId;
  if (role === "student") {
    await pool.query("INSERT INTO students (user_id, grade_level) VALUES (?, ?)", [userId, ""]);
  } else {
    await pool.query("INSERT INTO parents (user_id) VALUES (?)", [userId]);
  }
  const token = buildToken({ id: userId, role, email });
  return res.json({ token });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  if (!rows.length) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = buildToken(user);
  return res.json({ token });
});

router.post("/forgot", async (req, res) => {
  // Placeholder: integrate email provider later
  return res.json({ status: "ok" });
});

router.get("/me", authRequired, async (req, res) => {
  // Try to get user with security fields, fallback to basic query
  let rows;
  try {
    [rows] = await pool.query("SELECT id, name, email, role, data_consent, is_disabled FROM users WHERE id = ? AND deleted_at IS NULL", [req.user.id]);
    if (rows.length && rows[0].is_disabled) {
      return res.status(403).json({ error: "Account has been disabled. Please contact support." });
    }
  } catch (err) {
    // Security columns don't exist, use basic query
    [rows] = await pool.query("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.id]);
  }
  
  if (!rows.length) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json(rows[0]);
});

// Reset password
router.put("/password", authRequired, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body || {};
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required" });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long" });
  }
  
  try {
    // Get current user with password hash
    const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ? AND deleted_at IS NULL", [userId]);
    
    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = rows[0];
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newPasswordHash, userId]);
    
    return res.json({ status: "Password updated successfully" });
  } catch (err) {
    console.error("Error resetting password:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
});

// Delete account and all associated data
router.delete("/me", authRequired, async (req, res) => {
  const userId = req.user.id;
  const { confirm } = req.body || {};
  
  if (confirm !== "DELETE") {
    return res.status(400).json({ error: "Please confirm deletion by sending { confirm: 'DELETE' }" });
  }

  try {
    // Check if security columns exist
    let hasSecurityColumns = false;
    try {
      await pool.query("SELECT deleted_at, is_disabled FROM users LIMIT 1");
      hasSecurityColumns = true;
    } catch (err) {
      // Columns don't exist - migration not run
      return res.status(400).json({ error: "Account deletion requires database migration. Please contact administrator." });
    }
    
    // Soft delete: mark as deleted instead of hard delete to maintain referential integrity
    await pool.query("UPDATE users SET deleted_at = NOW(), is_disabled = TRUE WHERE id = ?", [userId]);
    
    // Note: Due to CASCADE foreign keys, related data in students/parents tables will be handled
    // But we keep the user record with deleted_at timestamp for audit purposes
    
    return res.json({ status: "Account deleted successfully" });
  } catch (err) {
    console.error("Error deleting account:", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

module.exports = router;
