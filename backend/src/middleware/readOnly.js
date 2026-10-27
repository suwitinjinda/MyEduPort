const jwt = require("jsonwebtoken");
const pool = require("../db");

// Read-only mode for lapsed accounts.
//
// When a 14-day trial runs out, or a paid subscription is cancelled, the student keeps
// their account and everything in it: they can still sign in, read every page, and export
// their portfolio to PDF. What stops is changing things — no edits, no uploads, no new AI
// generations — until they subscribe again.
//
// That is enforced here rather than route by route so a new write endpoint can't quietly
// miss the check. Reads (GET/HEAD/OPTIONS) always pass; only writes are inspected, which
// keeps the extra lookup off the hot path.
//
// A plain Free account that never started a trial is NOT lapsed — Free is a real tier with
// its own limits, and those are enforced by the quota system instead.

const SAFE_METHOD = /^(GET|HEAD|OPTIONS)$/i;

// Writes a lapsed account must still be able to make.
const ALWAYS_ALLOWED = [
  /^\/api\/auth\//,                      // sign in / out, password reset
  /^\/api\/billing\//,                   // subscribing again is the way out of this state
  /^\/api\/email\//,                     // unsubscribe links
  /^\/api\/share\//,                     // public share pages
  /^\/api\/campaigns\//,                 // campaign landing pages (wording + visit count)
  /^\/api\/ref\//,                       // referral-link visits — just counting, nothing of theirs changes
  /^\/api\/ai\/saved\/export_prefs$/,    // the export studio remembering layout choices
  // Admin tools run under the ADMIN_EMAIL account, which carries the student role here.
  // Without this, an admin whose own plan lapsed could not take a backup or restore one.
  // Every /api/admin route checks isAdmin itself, so this does not widen access.
  /^\/api\/admin\//
];

// True when the account had paid access and no longer does.
function isLapsed(u) {
  if (!u || u.plan !== "free") return false;
  const trialEnded = !!u.trial_ends_at && new Date(u.trial_ends_at).getTime() <= Date.now();
  const subscriptionEnded = ["canceled", "cancelled", "incomplete_expired", "unpaid"].includes(u.subscription_status || "");
  return trialEnded || subscriptionEnded;
}

async function readOnlyGuard(req, res, next) {
  if (SAFE_METHOD.test(req.method)) return next();
  if (ALWAYS_ALLOWED.some((re) => re.test(req.path))) return next();

  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next(); // unauthenticated — the route decides

  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return next(); // let authRequired produce the real 401
  }
  // Admins and staff are never locked out of their own tools
  if (payload.role && payload.role !== "student" && payload.role !== "parent") return next();

  try {
    const [[u]] = await pool.query(
      "SELECT plan, trial_ends_at, subscription_status FROM users WHERE id = ?",
      [payload.id]
    );
    if (!isLapsed(u)) return next();
  } catch (err) {
    console.error("[read-only] lookup failed, allowing the write:", err.message);
    return next(); // never block someone's work because of a database hiccup
  }

  return res.status(402).json({
    error: "Your access has ended, so your portfolio is read-only. You can still view everything and export it to PDF — subscribe to start editing again.",
    read_only: true
  });
}

module.exports = { readOnlyGuard, isLapsed };
