const pool = require("../db");

// Fallback used if app_settings row is missing. Admin can override at runtime.
const DEFAULT_LIMITS = {
  free:         { adviai: false, export: false, predictions: 0,  gap: false, edubot: 3,   essay_feedback: 1 },
  essential:    { adviai: true,  export: true,  predictions: 10, gap: true,  edubot: 30,  essay_feedback: 5 },
  professional: { adviai: true,  export: true,  predictions: -1, gap: true,  edubot: 150, essay_feedback: 50 }
};

async function getPlanLimits() {
  try {
    const [[row]] = await pool.query("SELECT sval FROM app_settings WHERE skey = 'plan_limits'");
    if (row && row.sval) {
      const v = typeof row.sval === "string" ? JSON.parse(row.sval) : row.sval;
      // shallow-merge over defaults so a missing key never breaks a gate
      return {
        free: { ...DEFAULT_LIMITS.free, ...(v.free || {}) },
        essential: { ...DEFAULT_LIMITS.essential, ...(v.essential || {}) },
        professional: { ...DEFAULT_LIMITS.professional, ...(v.professional || {}) }
      };
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

async function getUserPlan(userId) {
  try {
    const [[u]] = await pool.query("SELECT plan FROM users WHERE id = ?", [userId]);
    return u?.plan || "free";
  } catch (err) { return "free"; }
}

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

// Boolean gate (adviai / export / gap / predictions>0 or unlimited)
async function isFeatureAllowed(userId, feature) {
  const plan = await getUserPlan(userId);
  const limits = await getPlanLimits();
  const v = limits[plan]?.[feature];
  return v === true || v === -1 || (typeof v === "number" && v > 0);
}

// Quota gate. Returns { allowed, limit, used, remaining, period, plan }.
// limit -1 = unlimited, 0 = blocked.
async function checkQuota(userId, feature) {
  const plan = await getUserPlan(userId);
  const limits = await getPlanLimits();
  const limit = limits[plan]?.[feature];
  const period = periodFor(plan);
  if (limit === -1) return { allowed: true, limit: -1, used: 0, remaining: -1, period, plan };
  if (!limit || limit <= 0) return { allowed: false, limit: 0, used: 0, remaining: 0, period, plan };
  const used = await getUsage(userId, feature, period);
  return { allowed: used < limit, limit, used, remaining: Math.max(0, limit - used), period, plan };
}

module.exports = {
  DEFAULT_LIMITS,
  getPlanLimits,
  setPlanLimits,
  getUserPlan,
  periodFor,
  getUsage,
  incrementUsage,
  isFeatureAllowed,
  checkQuota
};
