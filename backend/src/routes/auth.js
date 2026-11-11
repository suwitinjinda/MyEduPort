const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { TRIAL_DAYS, getPlanStatus } = require("../services/plan");
const { attachAtSignup } = require("../services/referrals");
const consents = require("../services/consents");
const { isMailConfigured, sendMail } = require("../services/mailer");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

function buildToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// New accounts start a free trial (see services/plan.js)
async function startTrial(userId) {
  try {
    await pool.query("UPDATE users SET trial_ends_at = ? WHERE id = ?", [new Date(Date.now() + TRIAL_DAYS * 86400000), userId]);
  } catch (err) { /* trial_ends_at missing → run alter_phase14_free_trial.sql */ }
}

router.post("/register", async (req, res) => {
  const { email, password, role, name, data_consent, ref } = req.body || {};
  if (!email || !password || !role || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  // `affiliate` is a partner applying through /partners; they start pending until an
  // admin approves them and sets their terms.
  if (!["student", "parent", "counselor", "affiliate"].includes(role)) {
    return res.status(400).json({ error: "Role must be student, parent, or counselor" });
  }
  if (role === "affiliate" && String(password).length < 8) {
    return res.status(400).json({ error: "Use at least 8 characters for your password." });
  }
  // Partners are paid, so they must be adults — our students are 14–18
  if (role === "affiliate" && req.body?.is_adult !== true) {
    return res.status(400).json({ error: "Partners must be 18 or older." });
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
  const consent = role === "affiliate" ? null : consents.readSignupConsents({ ...req.body, email }, role);
  if (consent?.error) return res.status(400).json({ error: consent.error });
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
  if (role === "affiliate") {
    const b = req.body || {};
    const clip = (v, n) => (v == null ? null : String(v).trim().slice(0, n) || null);
    await pool.query(
      "INSERT INTO affiliates (user_id, organisation, phone, website, audience) VALUES (?, ?, ?, ?, ?)",
      [userId, clip(b.organisation, 150), clip(b.phone, 40), clip(b.website, 255), clip(b.audience, 2000)]
    );
    const token = buildToken({ id: userId, role, email });
    return res.json({ token });
  }
  await startTrial(userId);
  if (role === "student") {
    await pool.query("INSERT INTO students (user_id, grade_level) VALUES (?, ?)", [userId, ""]);
  } else if (role === "parent") {
    await pool.query("INSERT INTO parents (user_id) VALUES (?)", [userId]);
  } else if (role === "counselor") {
    await pool.query("INSERT INTO counselors (user_id) VALUES (?)", [userId]);
  }
  await attachAtSignup(userId, role, ref);
  const parentRequest = await saveSignupConsents(req, userId, email, consent);
  const token = buildToken({ id: userId, role, email });
  return res.json({ token, parent_consent: consent?.minor ? { pending: true, emailed: !!parentRequest?.emailed } : null });
});

// Records the consent form at sign-up: the audit rows (with IP), date of birth, the
// marketing choice and — for students under 20 — the request to a parent. A failure here
// never blocks the sign-up itself; a minor without a sent request simply stays pending.
async function saveSignupConsents(req, userId, email, consent) {
  if (!consent) return null;
  try {
    await consents.recordConsents(userId, consent.rows, { source: "signup", ip: consents.clientIp(req) });
    await pool.query("UPDATE users SET birth_date = ?, age_group = ?, parent_consent_status = ? WHERE id = ?",
      [consent.birthDate, consent.birthDate ? (consent.minor ? "minor" : "adult") : "adult", consent.minor ? "pending" : "not_required", userId]);
    await consents.applyMarketingChoice(email, consent.rows.some(([k, g]) => k === "marketing" && g));
    if (consent.minor) return await consents.startParentRequest(userId, { parentEmail: consent.parentEmail, parentPhone: consent.parentPhone });
  } catch (err) {
    console.error("Saving sign-up consents failed:", err.message);
  }
  return null;
}

// The current consent choices (Privacy settings shows and changes the optional ones)
router.get("/consents", authRequired, async (req, res) => {
  const current = await consents.currentConsents(req.user.id).catch(() => ({}));
  // What's in effect, including accounts from before the form: marketing follows the
  // unsubscribe list every campaign uses; AI improvement follows the earlier notice.
  const [[unsub]] = await pool.query("SELECT 1 x FROM email_unsubscribes WHERE email = ?", [String(req.user.email || "").toLowerCase()]).catch(() => [[null]]);
  const ai = current.ai_improvement || current.outcomes_sharing;
  const effective = { marketing: !unsub, ai_improvement: ai ? ai.granted : true };
  const [[u]] = await pool.query("SELECT age_group, parent_consent_status FROM users WHERE id = ?", [req.user.id]).catch(() => [[{}]]);
  res.json({ version: consents.CONSENT_VERSION, optional: consents.OPTIONAL, current, effective, minor: u?.age_group === "minor", parent_consent_status: u?.parent_consent_status || null });
});

router.put("/consents/:key", authRequired, async (req, res) => {
  try {
    await consents.setOptionalConsent(req.user, req.params.key, req.body?.granted === true, { ip: consents.clientIp(req) });
    res.json({ current: await consents.currentConsents(req.user.id) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.status ? err.message : "Couldn't save that choice." });
  }
});

// Agree to the current wording again (after it changed), from the sign-in prompt. Students
// without a date of birth on file give it here; under-20s start the parent confirmation,
// with 14 days of normal use before their account is restricted (never deleted).
router.post("/consents/reconsent", authRequired, async (req, res) => {
  const [[u]] = await pool.query("SELECT id, email, role, birth_date, parent_consent_status FROM users WHERE id = ?", [req.user.id]);
  if (!u) return res.status(404).json({ error: "Account not found" });
  const c = req.body?.consents || {};
  if (!consents.SELF_REQUIRED.every((k) => c[k] === true)) return res.status(400).json({ error: "Tick the two required boxes to continue." });
  let birth = u.birth_date ? { birthDate: null, minor: consents.ageOn(u.birth_date) < consents.ADULT_AGE } : null;
  if (u.role === "student" && !u.birth_date) {
    birth = consents.readBirthDate(req.body?.birth_date);
    if (birth.error) return res.status(400).json({ error: birth.error });
  }
  let parent = null;
  if (u.role === "student" && birth?.minor && !["pending", "confirmed"].includes(u.parent_consent_status)) {
    parent = consents.readParentContact(req.body, u.email);
    if (parent.error) return res.status(400).json({ error: parent.error });
  }
  const ip = consents.clientIp(req);
  await consents.recordConsents(u.id, [...consents.SELF_REQUIRED.map((k) => [k, 1]), ...consents.OPTIONAL.map((k) => [k, c[k] === true ? 1 : 0])], { source: "reconsent", ip });
  await consents.applyMarketingChoice(u.email, c.marketing === true);
  if (birth?.birthDate) await pool.query("UPDATE users SET birth_date = ?, age_group = ? WHERE id = ?", [birth.birthDate, birth.minor ? "minor" : "adult", u.id]);
  if (u.role === "student" && birth && !birth.minor && !u.parent_consent_status) await pool.query("UPDATE users SET parent_consent_status = 'not_required' WHERE id = ?", [u.id]);
  const request = parent ? await consents.startParentRequest(u.id, { parentEmail: parent.parentEmail, parentPhone: parent.parentPhone, isExisting: true }) : null;
  res.json({ ok: true, parent_request: request ? { emailed: request.emailed } : null });
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
  const { credential, role: requestedRole, ref } = req.body || {};
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

    // New Google signup — honor the role chosen on the Sign-Up form (default student). It goes
    // through the same consent form as email sign-up.
    const role = ["student", "parent", "counselor"].includes(requestedRole) ? requestedRole : "student";
    if (!req.body?.consents) {
      return res.status(400).json({ error: "New to MyEduPort? Choose \"Create an account\", fill in the short form, then continue with Google.", code: "signup_required" });
    }
    const consent = consents.readSignupConsents({ ...req.body, email }, role);
    if (consent.error) return res.status(400).json({ error: consent.error });
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
    await startTrial(userId);
    if (role === "student") {
      await pool.query("INSERT INTO students (user_id, grade_level) VALUES (?, ?)", [userId, ""]);
    } else if (role === "parent") {
      await pool.query("INSERT INTO parents (user_id) VALUES (?)", [userId]);
    } else if (role === "counselor") {
      await pool.query("INSERT INTO counselors (user_id) VALUES (?)", [userId]);
    }
    await attachAtSignup(userId, role, ref);
    const parentRequest = await saveSignupConsents(req, userId, email, consent);
    const token = buildToken({ id: userId, role, email });
    return res.json({ token, parent_consent: consent?.minor ? { pending: true, emailed: !!parentRequest?.emailed } : null });
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
    // Delivered by email only — never returned in the HTTP response, or anyone could reset
    // another user's password by knowing their email.
    if (isMailConfigured()) {
      sendMail({
        to: email,
        subject: "Reset your MyEduPort password",
        text: `Someone asked to reset the password for your MyEduPort account.\n\nReset it here (the link works for 1 hour): ${resetUrl}\n\nIf this wasn't you, ignore this email — your password won't change.`,
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#334155"><p>Someone asked to reset the password for your MyEduPort account.</p><p><a href="${resetUrl}" style="display:inline-block;background:#1f3461;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Reset my password</a></p><p style="color:#64748b;font-size:13px">The link works for 1 hour. If this wasn't you, ignore this email — your password won't change.</p></div>`
      }).catch((err) => console.error("[password-reset] email failed:", err.message));
    } else {
      console.log(`[password-reset] email not set up — link for ${email}: ${resetUrl}`);
    }
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
  const status = await getPlanStatus(user.id);
  // Consent state, so the app can ask again after a wording change and show the parent step
  const [[cs]] = await pool.query("SELECT birth_date, age_group, parent_consent_status FROM users WHERE id = ?", [user.id]).catch(() => [[{}]]);
  const needs_reconsent = ["student", "parent", "counselor"].includes(user.role) ? await consents.needsReconsent(user.id) : false;
  const { password_hash: _p, reset_token_hash: _r, ...safe } = rest;
  return res.json({
    ...safe, plan: status.plan, base_plan: status.basePlan, trial: status.trial, auth_provider: authProvider,
    consent: {
      needs_reconsent, version: consents.CONSENT_VERSION, has_birth_date: !!cs?.birth_date, minor: cs?.age_group === "minor",
      parent_consent_status: cs?.parent_consent_status || null,
      limited: user.role === "student" ? await consents.isLimited(user.id).catch(() => false) : false
    }
  });
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
module.exports.helpers = { buildToken, startTrial };
