const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const ref = require("../services/referrals");

// Public referral-code endpoints, plus the student's own Rewards page data.
// Mounted at /api/ref
const router = express.Router();

const clientIp = (req) => String(req.headers["x-real-ip"] || req.ip || "").split(",")[0].trim();

// A visitor arrived with ?ref=CODE. Count it (affiliates only) and say what it gives them.
router.post("/visit", async (req, res) => {
  try {
    res.json(await ref.recordVisit(req.body?.code, clientIp(req), req.body?.path));
  } catch (err) {
    console.error("[ref] visit:", err.message);
    res.json({ valid: false });
  }
});

// Validate a code typed into the sign-up form. Does not count as a visit.
router.get("/check/:code", async (req, res) => {
  try { res.json(ref.publicInfo(await ref.resolveCode(req.params.code))); }
  catch { res.json({ valid: false }); }
});

// The signed-in user's own referral discount, if it is still waiting to be used
router.get("/mine", authRequired, async (req, res) => {
  const [[att]] = await pool.query(
    "SELECT source, code, terms, first_paid_at FROM referral_attributions WHERE user_id = ?",
    [req.user.id]
  );
  if (!att) return res.json({ referred: false });
  const t = typeof att.terms === "string" ? JSON.parse(att.terms) : att.terms;
  res.json({
    referred: true,
    source: att.source,
    from: t.label,
    discount_percent: Number(t.discount_percent || 0),
    discount_duration: t.discount_duration,
    discount_months: t.discount_months,
    discount_available: !att.first_paid_at && Number(t.discount_percent || 0) > 0
  });
});

// Student Rewards page: invite link, coins, how to earn them
router.get("/rewards", authRequired, async (req, res) => {
  if (!["student", "parent"].includes(req.user.role)) return res.status(403).json({ error: "Students only" });
  const settings = await ref.getReferralSettings();
  const code = settings.enabled ? await ref.ensureReferralCode(req.user.id) : null;
  const app = (process.env.APP_URL || "https://myeduport.ai").replace(/\/+$/, "");

  const [history] = await pool.query(
    "SELECT amount, reason, note, created_at FROM coin_ledger WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100",
    [req.user.id]
  );
  const [[inv]] = await pool.query(
    `SELECT COUNT(*) AS signed_up, SUM(first_paid_at IS NOT NULL) AS paying
       FROM referral_attributions WHERE referrer_user_id = ?`,
    [req.user.id]
  );
  const rules = await ref.getCoinRules();

  res.json({
    enabled: settings.enabled,
    code,
    link: code ? `${app}/?ref=${code}` : null,
    friend_discount: { percent: settings.discount_percent, duration: settings.discount_duration, months: settings.discount_months },
    balance: await ref.coinBalance(req.user.id),
    invites: { signed_up: Number(inv.signed_up || 0), paying: Number(inv.paying || 0) },
    rules: Object.entries(rules).filter(([, r]) => r.coins > 0).map(([key, r]) => ({ key, label: r.label, coins: r.coins, limit: r.limit })),
    history: history.map((h) => ({ ...h, label: rules[h.reason]?.label || (h.reason === "admin_adjust" ? "Adjustment by MyEduPort" : h.reason) }))
  });
});

module.exports = router;
