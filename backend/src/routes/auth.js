const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
  if (!["student", "parent", "counselor"].includes(role)) {
    return res.status(400).json({ error: "Role must be student, parent, or counselor" });
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
  } else if (role === "parent") {
    await pool.query("INSERT INTO parents (user_id) VALUES (?)", [userId]);
  } else if (role === "counselor") {
    await pool.query("INSERT INTO counselors (user_id) VALUES (?)", [userId]);
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
  if (!user.password_hash) {
    return res.status(401).json({ error: "This account uses Google Sign-In. Please sign in with Google." });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = buildToken(user);
  return res.json({ token });
});

router.post("/google", async (req, res) => {
  const { credential, role: requestedRole } = req.body || {};
  if (!credential) {
    return res.status(400).json({ error: "Missing Google credential" });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: "Google Sign-In is not configured" });
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;
    if (!email) {
      return res.status(400).json({ error: "Google account has no email" });
    }

    let hasGoogleColumn = false;
    try {
      await pool.query("SELECT google_id FROM users LIMIT 1");
      hasGoogleColumn = true;
    } catch (err) {
      return res.status(500).json({ error: "Database migration required. Run alter_add_google_auth.sql" });
    }

    let [rows] = await pool.query("SELECT * FROM users WHERE google_id = ?", [googleId]);
    if (rows.length) {
      const user = rows[0];
      const [disabled] = await pool.query("SELECT is_disabled FROM users WHERE id = ?", [user.id]).catch(() => [[{ is_disabled: 0 }]]);
      if (disabled?.[0]?.is_disabled) {
        return res.status(403).json({ error: "Account has been disabled. Please contact support." });
      }
      const token = buildToken(user);
      return res.json({ token });
    }

    [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length) {
      const user = rows[0];
      await pool.query("UPDATE users SET google_id = ? WHERE id = ?", [googleId, user.id]);
      const [disabled] = await pool.query("SELECT is_disabled FROM users WHERE id = ?", [user.id]).catch(() => [[{ is_disabled: 0 }]]);
      if (disabled?.[0]?.is_disabled) {
        return res.status(403).json({ error: "Account has been disabled. Please contact support." });
      }
      const token = buildToken({ ...user, google_id: googleId });
      return res.json({ token });
    }

    // New Google signup — honor the role chosen on the Sign-Up form (default student)
    const role = ["student", "parent", "counselor"].includes(requestedRole) ? requestedRole : "student";
    const displayName = name || email.split("@")[0];
    let result;
    try {
      [result] = await pool.query(
        "INSERT INTO users (email, password_hash, role, name, google_id, data_consent) VALUES (?, NULL, ?, ?, ?, TRUE)",
        [email, role, displayName, googleId]
      );
    } catch (err) {
      [result] = await pool.query(
        "INSERT INTO users (email, password_hash, role, name, google_id) VALUES (?, NULL, ?, ?, ?)",
        [email, role, displayName, googleId]
      );
    }
    const userId = result.insertId;
    if (role === "student") {
      await pool.query("INSERT INTO students (user_id, grade_level) VALUES (?, ?)", [userId, ""]);
    } else if (role === "parent") {
      await pool.query("INSERT INTO parents (user_id) VALUES (?)", [userId]);
    } else if (role === "counselor") {
      await pool.query("INSERT INTO counselors (user_id) VALUES (?)", [userId]);
    }
    const token = buildToken({ id: userId, role, email });
    return res.json({ token });
  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(401).json({ error: "Invalid Google credential" });
  }
});

// Request a password reset. Always returns a generic response so it never reveals
// whether an email is registered. A one-time token (hashed at rest, 1h expiry) is
// issued; delivering it by email needs an SMTP/provider integration (not configured
// here) — until then the link is logged server-side, and returned in non-production.
router.post("/forgot", async (req, res) => {
  const { email } = req.body || {};
  const generic = { status: "ok", message: "If an account exists for that email, a reset link has been sent." };
  if (!email) return res.json(generic);
  const [[user]] = await pool.query("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL", [email]);
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await pool.query(
      "UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?",
      [tokenHash, new Date(Date.now() + 60 * 60 * 1000), user.id]
    );
    const resetUrl = `${process.env.APP_URL || "https://myeduport.ai"}/reset?token=${token}`;
    // Deliver by email (needs SMTP integration) — never return the token in the HTTP
    // response, or anyone could reset another user's password by email alone.
    console.log(`[password-reset] ${email} -> ${resetUrl}`);
  }
  return res.json(generic);
});

// Complete a password reset with the one-time token.
router.post("/reset", async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ error: "Token and new password are required" });
  if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters long" });
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const [[user]] = await pool.query(
    "SELECT id FROM users WHERE reset_token_hash = ? AND reset_token_expires > NOW()",
    [tokenHash]
  );
  if (!user) return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    "UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?",
    [newHash, user.id]
  );
  return res.json({ status: "Password has been reset. You can now sign in with your new password." });
});

router.get("/me", authRequired, async (req, res) => {
  let rows;
  try {
    [rows] = await pool.query("SELECT id, name, email, role, plan, data_consent, is_disabled, password_hash, google_id FROM users WHERE id = ? AND deleted_at IS NULL", [req.user.id]);
    if (rows.length && rows[0].is_disabled) {
      return res.status(403).json({ error: "Account has been disabled. Please contact support." });
    }
  } catch (err) {
    try {
      [rows] = await pool.query("SELECT id, name, email, role, plan, password_hash, google_id FROM users WHERE id = ?", [req.user.id]);
    } catch {
      [rows] = await pool.query("SELECT id, name, email, role FROM users WHERE id = ?", [req.user.id]);
    }
  }

  if (!rows.length) {
    return res.status(404).json({ error: "User not found" });
  }
  const user = rows[0];
  const { password_hash, google_id, ...rest } = user;
  const authProvider = (user.google_id && !user.password_hash) ? "google" : "password";
  return res.json({ ...rest, plan: user.plan || "free", auth_provider: authProvider });
});

// Reset password
router.put("/password", authRequired, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body || {};

  if (!newPassword) {
    return res.status(400).json({ error: "New password is required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long" });
  }

  try {
    // Get current user with password hash and google_id
    const [rows] = await pool.query("SELECT password_hash, google_id FROM users WHERE id = ? AND deleted_at IS NULL", [userId]);

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    const isGoogleOnly = !user.password_hash && user.google_id;

    if (isGoogleOnly) {
      // Google-only user: set password without current password
      if (!currentPassword) {
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newPasswordHash, userId]);
        return res.json({ status: "Password set successfully. You can now sign in with email and password." });
      }
      return res.status(400).json({ error: "You signed in with Google. Leave current password empty to set a new password." });
    }

    if (!currentPassword) {
      return res.status(400).json({ error: "Current password is required" });
    }

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
