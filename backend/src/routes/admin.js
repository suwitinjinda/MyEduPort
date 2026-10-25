const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { getPlanLimits, setPlanLimits, DEFAULT_LIMITS, PREDICTION_TIERS, PLAN_TIERS, DEFAULT_DISPLAY, getPlanDisplay, setPlanDisplay } = require("../services/plan");
const { OPTION_LIST_KEYS, DEFAULT_OPTION_LISTS, getOptionLists, cleanGroups, setOptionList } = require("../services/options");

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
      `SELECT id, email, role, name, plan, trial_ends_at, data_consent, is_disabled, deleted_at, created_at
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 100`
    );
  } catch (err) {
    // Security columns don't exist, use basic query (plan column does exist)
    [rows] = await pool.query(
      `SELECT id, email, role, name, plan, created_at
       FROM users
       ORDER BY created_at DESC LIMIT 100`
    );
    // Add default values for missing columns
    rows = rows.map(user => ({
      ...user,
      plan: user.plan || "free",
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
  const { country, limit = 500 } = req.query || {};
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
  try {
    const { name, country, city, selectivity_band, major_tags, qs_rank, source, hidden } = req.body || {};
    if (!name || !country) {
      return res.status(400).json({ error: "Name and country are required" });
    }
    const [result] = await pool.query(
      "INSERT INTO universities (name, country, city, selectivity_band, major_tags, qs_rank, source, hidden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [name, country, city || "", selectivity_band || "", major_tags || "",
        qs_rank === "" || qs_rank == null ? null : Number(qs_rank),
        source || "admin", hidden ? 1 : 0]
    );
    return res.json({ id: result.insertId });
  } catch (err) {
    console.error("POST /admin/universities:", err && err.message ? err.message : err);
    return res.status(500).json({ error: "Failed to create university" });
  }
});

router.put("/universities/:id", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  try {
    const { id } = req.params;
    const body = req.body || {};
    // Whitelisted columns; only update what the request actually sends, so the
    // legacy 5-field admin form keeps working while qs_rank/source/hidden are editable.
    const fields = {};
    for (const k of ["name", "country", "city", "selectivity_band", "major_tags", "source"]) {
      if (body[k] !== undefined) fields[k] = body[k]; // only touch fields actually sent (no undefined binds)
    }
    if (body.qs_rank !== undefined) fields.qs_rank = body.qs_rank === "" || body.qs_rank == null ? null : Number(body.qs_rank);
    if (body.hidden !== undefined) fields.hidden = body.hidden ? 1 : 0;
    const keys = Object.keys(fields);
    if (!keys.length) return res.json({ status: "no changes" });
    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    const vals = keys.map((k) => fields[k]);
    await pool.query(`UPDATE universities SET ${setClause} WHERE id = ?`, [...vals, id]);
    return res.json({ status: "updated" });
  } catch (err) {
    console.error("PUT /admin/universities:", err && err.message ? err.message : err);
    return res.status(500).json({ error: "Failed to update university" });
  }
});

router.delete("/universities/:id", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const { id } = req.params;
  await pool.query("DELETE FROM universities WHERE id = ?", [id]);
  return res.json({ status: "deleted" });
});

// Set a user's subscription plan (free / essential / professional)
router.put("/users/:id/plan", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const { id } = req.params;
  const { plan } = req.body || {};
  if (!PLAN_TIERS.includes(plan)) {
    return res.status(400).json({ error: `plan must be one of: ${PLAN_TIERS.join(", ")}` });
  }
  try {
    await pool.query("UPDATE users SET plan = ? WHERE id = ?", [plan, id]);
    return res.json({ status: "ok", plan });
  } catch (err) {
    if (err.code === "ER_BAD_FIELD_ERROR") {
      return res.status(400).json({ error: "Database migration required. Run alter_phase3_plan.sql" });
    }
    throw err;
  }
});

// ---- Admin: configurable plan limits / feature gating ----
router.get("/settings/plan-limits", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const limits = await getPlanLimits();
  return res.json({ limits, defaults: DEFAULT_LIMITS, display: await getPlanDisplay(), tiers: PLAN_TIERS });
});

router.put("/settings/plan-limits", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const { limits } = req.body || {};
  if (!limits || typeof limits !== "object") return res.status(400).json({ error: "limits object required" });
  const clean = {};
  for (const tier of PLAN_TIERS) {
    const src = limits[tier] || {};
    const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    clean[tier] = {
      adviai: Boolean(src.adviai),
      export: Boolean(src.export),
      gap: Boolean(src.gap),
      parent_dashboard: Boolean(src.parent_dashboard),
      prediction: PREDICTION_TIERS.includes(src.prediction) ? src.prediction : "none",
      // blank/invalid falls back to the tier default (0 would hide every university match)
      match: Number.isFinite(Number(src.match)) && String(src.match).trim() !== "" ? Number(src.match) : DEFAULT_LIMITS[tier].match,
      advisor: num(src.advisor),
      edubot: Number.isFinite(Number(src.edubot)) ? Number(src.edubot) : 0,
      essay_feedback: Number.isFinite(Number(src.essay_feedback)) ? Number(src.essay_feedback) : 0
    };
  }
  // Pricing-page display: visibility + prices (Free stays $0)
  const display = {};
  const srcDisplay = req.body?.display || {};
  const cur = await getPlanDisplay();
  for (const tier of PLAN_TIERS) {
    const d = srcDisplay[tier] || cur[tier];
    const price = (v, fb) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v) * 100) / 100 : fb);
    display[tier] = {
      visible: tier === "free" ? true : Boolean(d.visible),
      name: DEFAULT_DISPLAY[tier].name,
      monthly: tier === "free" ? 0 : price(d.monthly, cur[tier].monthly),
      annual: tier === "free" ? 0 : price(d.annual, cur[tier].annual)
    };
  }
  try {
    await setPlanLimits(clean);
    await setPlanDisplay(display);
    return res.json({ status: "ok", limits: clean, display });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.status(400).json({ error: "Run alter_phase4_plan_settings.sql" });
    throw err;
  }
});

// ---- Admin: dropdown lists (Intended Majors, Curriculums, Subjects, Tests) ----
router.get("/option-lists", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  return res.json({ lists: await getOptionLists(), defaults: DEFAULT_OPTION_LISTS });
});

router.put("/option-lists/:key", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const { key } = req.params;
  if (!OPTION_LIST_KEYS.includes(key)) return res.status(400).json({ error: "Unknown list" });
  const groups = cleanGroups(req.body?.groups);
  if (!groups) return res.status(400).json({ error: "groups array required" });
  if (!groups.length) return res.status(400).json({ error: "A list needs at least one option" });
  try {
    const lists = await setOptionList(key, groups);
    return res.json({ status: "ok", lists });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.status(400).json({ error: "Run alter_phase4_plan_settings.sql" });
    throw err;
  }
});

// ---- Admin: Human Advisor Session queue ----
router.get("/advisor-sessions", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS student_name, u.email AS student_email, u.plan AS student_plan
       FROM advisor_sessions a
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       ORDER BY FIELD(a.status, 'requested', 'scheduled', 'completed', 'cancelled'), a.created_at DESC
       LIMIT 200`
    );
    return res.json(rows);
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.json([]);
    throw err;
  }
});

router.put("/advisor-sessions/:id", authRequired, async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: "Admin only" });
  const { status, scheduled_at, meeting_link, admin_note } = req.body || {};
  if (!["requested", "scheduled", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "status must be requested, scheduled, completed, or cancelled" });
  }
  if (meeting_link && !/^https?:\/\//i.test(meeting_link)) return res.status(400).json({ error: "Meeting link must start with http:// or https://" });
  const when = scheduled_at ? new Date(scheduled_at) : null;
  if (when && Number.isNaN(when.getTime())) return res.status(400).json({ error: "Invalid scheduled_at" });
  const [r] = await pool.query(
    "UPDATE advisor_sessions SET status = ?, scheduled_at = ?, meeting_link = ?, admin_note = ? WHERE id = ?",
    [status, when, (meeting_link || "").slice(0, 500) || null, admin_note || null, req.params.id]
  );
  if (!r.affectedRows) return res.status(404).json({ error: "Session not found" });
  return res.json({ status: "ok" });
});

module.exports = router;
