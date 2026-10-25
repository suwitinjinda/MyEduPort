const pool = require("../db");

// Fallback used if app_settings row is missing. Admin can override at runtime.
// Mirrors the pricing table:
//   essay_feedback  MEPAi Essay Score      1 (lifetime) / 5 per month / unlimited
//   match           MEPAi University Match 3 / 10 / unlimited universities shown
//   prediction      Acceptance Prediction   none / basic (averages) / advanced (per school)
//   export          Export PDF Portfolio    - / yes / yes
//   parent_dashboard Parent Dashboard       - / - / yes
//   advisor         Human Advisor Session   0 / 0 / 1 per month
// -1 = unlimited, 0 = off.
const PREDICTION_TIERS = ["none", "basic", "advanced"];
const PLAN_TIERS = ["free", "essential", "professional", "elite"];
const DEFAULT_LIMITS = {
  free:         { adviai: false, export: false, prediction: "none",     match: 3,  parent_dashboard: false, advisor: 0, gap: false, edubot: 3,   essay_feedback: 1 },
  essential:    { adviai: true,  export: true,  prediction: "basic",    match: 10, parent_dashboard: false, advisor: 0, gap: true,  edubot: 30,  essay_feedback: 5 },
  professional: { adviai: true,  export: true,  prediction: "advanced", match: -1, parent_dashboard: true,  advisor: 1, gap: true,  edubot: 150, essay_feedback: -1 },
  elite:        { adviai: true,  export: true,  prediction: "advanced", match: -1, parent_dashboard: true,  advisor: 4, gap: true,  edubot: -1,  essay_feedback: -1 }
};

// How each plan appears on the Pricing page (Admin → Plan Settings). Elite starts hidden
// until the admin sets its price and switches it on.
const DEFAULT_DISPLAY = {
  free:         { visible: true,  name: "Free",         monthly: 0,  annual: 0 },
  essential:    { visible: true,  name: "Essential",    monthly: 29, annual: 290 },
  professional: { visible: true,  name: "Professional", monthly: 49, annual: 490 },
  elite:        { visible: false, name: "Elite",        monthly: 99, annual: 990 }
};

async function getPlanDisplay() {
  let v = {};
  try {
    const [[row]] = await pool.query("SELECT sval FROM app_settings WHERE skey = 'plan_display'");
    if (row?.sval) v = typeof row.sval === "string" ? JSON.parse(row.sval) : row.sval;
  } catch (err) { /* defaults */ }
  return Object.fromEntries(PLAN_TIERS.map((t) => [t, { ...DEFAULT_DISPLAY[t], ...(v[t] || {}) }]));
}

async function setPlanDisplay(display) {
  await pool.query(
    "INSERT INTO app_settings (skey, sval) VALUES ('plan_display', ?) ON DUPLICATE KEY UPDATE sval = VALUES(sval)",
    [JSON.stringify(display)]
  );
}

async function getPlanLimits() {
  try {
    const [[row]] = await pool.query("SELECT sval FROM app_settings WHERE skey = 'plan_limits'");
    if (row && row.sval) {
      const v = typeof row.sval === "string" ? JSON.parse(row.sval) : row.sval;
      // shallow-merge over defaults so a missing key never breaks a gate
      return Object.fromEntries(PLAN_TIERS.map((t) => [t, { ...DEFAULT_LIMITS[t], ...(v[t] || {}) }]));
    }
  } catch (err) { /* table missing → defaults */ }
  return DEFAULT_LIMITS;
}

async function setPlanLimits(limits) {
  await pool.query(
    "INSERT INTO app_settings (skey, sval) VALUES ('plan_limits', ?) ON DUPLICATE KEY UPDATE sval = VALUES(sval)",
    [JSON.stringify(limits)]
  );
}

// 14-day free trial for new accounts: a Free account with trial_ends_at in the future is
// treated as TRIAL_PLAN everywhere plans are checked (they all go through getUserPlan).
// Human advisor sessions are excluded during the trial (they use real staff time).
const TRIAL_DAYS = 14;
const TRIAL_PLAN = "professional";

async function getPlanRow(userId) {
  try {
    const [[u]] = await pool.query("SELECT plan, trial_ends_at FROM users WHERE id = ?", [userId]);
    return u || null;
  } catch (err) {
    try { const [[u]] = await pool.query("SELECT plan FROM users WHERE id = ?", [userId]); return u || null; } catch { return null; }
  }
}

function trialFromRow(u) {
  const base = u?.plan || "free";
  const ends = u?.trial_ends_at ? new Date(u.trial_ends_at) : null;
  const active = base === "free" && !!ends && ends.getTime() > Date.now();
  return {
    basePlan: base,
    plan: active ? TRIAL_PLAN : base,
    trial: {
      active,
      plan: TRIAL_PLAN,
      ends_at: ends,
      days_left: active ? Math.max(1, Math.ceil((ends.getTime() - Date.now() - 60000) / 86400000)) : 0, // -1 min: stored time is rounded to the second
      expired: base === "free" && !!ends && !active
    }
  };
}

// Effective plan (trial-aware)
async function getUserPlan(userId) {
  return trialFromRow(await getPlanRow(userId)).plan;
}

// { basePlan, plan, trial: { active, plan, ends_at, days_left, expired } }
async function getPlanStatus(userId) {
  return trialFromRow(await getPlanRow(userId));
}

// Same rule for SQL rows that already carry plan + trial_ends_at
const effectivePlan = (row) => trialFromRow(row).plan;

// Free plans are "one-time" (lifetime) buckets; paid plans reset monthly.
function periodFor(plan) {
  if (plan === "free") return "lifetime";
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function getUsage(userId, feature, period) {
  try {
    const [[r]] = await pool.query(
      "SELECT count FROM usage_counters WHERE user_id = ? AND feature = ? AND period = ?",
      [userId, feature, period]
    );
    return r?.count || 0;
  } catch (err) { return 0; }
}

async function incrementUsage(userId, feature, period) {
  try {
    await pool.query(
      "INSERT INTO usage_counters (user_id, feature, period, count) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE count = count + 1",
      [userId, feature, period]
    );
  } catch (err) { /* non-fatal */ }
}

// Boolean gate (adviai / export / gap / parent_dashboard, or a numeric limit > 0 / unlimited)
async function isFeatureAllowed(userId, feature) {
  const plan = await getUserPlan(userId);
  const limits = await getPlanLimits();
  const v = limits[plan]?.[feature];
  return v === true || v === -1 || (typeof v === "number" && v > 0);
}

// Limits for the user's current plan: { plan, my }
async function getPlanFeatures(userId) {
  const plan = await getUserPlan(userId);
  const limits = await getPlanLimits();
  return { plan, my: limits[plan] || DEFAULT_LIMITS.free };
}

// Quota gate. Returns { allowed, limit, used, remaining, period, plan }.
// limit -1 = unlimited, 0 = blocked.
// limitKey lets a separately-counted feature share another feature's limit.
async function checkQuota(userId, feature, limitKey = feature) {
  const plan = await getUserPlan(userId);
  const limits = await getPlanLimits();
  const limit = limits[plan]?.[limitKey];
  const period = periodFor(plan);
  if (limit === -1) return { allowed: true, limit: -1, used: 0, remaining: -1, period, plan };
  if (!limit || limit <= 0) return { allowed: false, limit: 0, used: 0, remaining: 0, period, plan };
  const used = await getUsage(userId, feature, period);
  return { allowed: used < limit, limit, used, remaining: Math.max(0, limit - used), period, plan };
}

module.exports = {
  DEFAULT_LIMITS,
  DEFAULT_DISPLAY,
  PLAN_TIERS,
  PREDICTION_TIERS,
  getPlanDisplay,
  setPlanDisplay,
  TRIAL_DAYS,
  TRIAL_PLAN,
  getPlanStatus,
  effectivePlan,
  getPlanFeatures,
  getPlanLimits,
  setPlanLimits,
  getUserPlan,
  periodFor,
  getUsage,
  incrementUsage,
  isFeatureAllowed,
  checkQuota
};
