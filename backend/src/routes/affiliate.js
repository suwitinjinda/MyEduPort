const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { releaseDue } = require("../services/referrals");

// The affiliate partner's own dashboard. Mounted at /api/affiliate
//
// Partners see their numbers but never the students behind them: students here are minors,
// so each referral is shown as initials and grade only — no name, email or school.
const router = express.Router();

router.use(authRequired, (req, res, next) =>
  req.user.role === "affiliate" ? next() : res.status(403).json({ error: "Partner accounts only" }));

const app = () => (process.env.APP_URL || "https://myeduport.ai").replace(/\/+$/, "");
const money = (n) => Math.round(Number(n || 0) * 100) / 100;

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase() + ".").join(" ");
}

async function myAffiliate(userId) {
  const [[a]] = await pool.query(
    `SELECT a.*, u.name, u.email FROM affiliates a JOIN users u ON u.id = a.user_id WHERE a.user_id = ?`,
    [userId]
  );
  return a || null;
}

router.get("/me", async (req, res) => {
  const a = await myAffiliate(req.user.id);
  if (!a) return res.status(404).json({ error: "No partner profile on this account." });
  await releaseDue(a.id);

  const base = {
    name: a.name,
    email: a.email,
    organisation: a.organisation,
    status: a.status,
    applied_at: a.created_at,
    approved_at: a.approved_at,
    payout: { method: a.payout_method, details: a.payout_details, tax_id: a.tax_id, phone: a.phone, website: a.website }
  };
  // Until approved there is no code, terms or numbers to show
  if (a.status !== "active" && a.status !== "paused") return res.json(base);

  const q = async (sql, params = [a.id]) => { const [[r]] = await pool.query(sql, params); return r; };
  const clicks30 = await q("SELECT COUNT(*) AS n FROM affiliate_clicks WHERE affiliate_id = ? AND created_at >= NOW() - INTERVAL 30 DAY");
  const clicksAll = await q("SELECT COUNT(*) AS n FROM affiliate_clicks WHERE affiliate_id = ?");
  const att30 = await q("SELECT COUNT(*) AS signups, SUM(first_paid_at IS NOT NULL) AS paying FROM referral_attributions WHERE affiliate_id = ? AND created_at >= NOW() - INTERVAL 30 DAY");
  const attAll = await q("SELECT COUNT(*) AS signups, SUM(first_paid_at IS NOT NULL) AS paying FROM referral_attributions WHERE affiliate_id = ?");
  const earn = await q(
    `SELECT SUM(CASE WHEN status = 'pending'  THEN amount END) AS pending,
            SUM(CASE WHEN status = 'approved' THEN amount END) AS approved,
            SUM(CASE WHEN status = 'paid'     THEN amount END) AS paid
       FROM commissions WHERE affiliate_id = ?`
  );

  const [refs] = await pool.query(
    `SELECT ra.created_at, ra.first_paid_at, u.name, u.role, u.plan, s.grade_level,
            (SELECT SUM(c.amount) FROM commissions c WHERE c.affiliate_id = ra.affiliate_id AND c.user_id = ra.user_id AND c.status <> 'reversed') AS earned,
            (SELECT COUNT(*) FROM commissions c WHERE c.affiliate_id = ra.affiliate_id AND c.user_id = ra.user_id AND c.status = 'reversed') AS reversed
       FROM referral_attributions ra
       JOIN users u ON u.id = ra.user_id
       LEFT JOIN students s ON s.user_id = u.id
      WHERE ra.affiliate_id = ?
      ORDER BY ra.created_at DESC LIMIT 50`,
    [a.id]
  );
  const [payouts] = await pool.query(
    "SELECT amount, currency, method, reference, paid_at FROM affiliate_payouts WHERE affiliate_id = ? ORDER BY paid_at DESC LIMIT 20",
    [a.id]
  );

  res.json({
    ...base,
    code: a.code,
    link: a.code ? `${app()}/?ref=${a.code}` : null,
    terms: {
      commission_type: a.commission_type,
      commission_value: Number(a.commission_value),
      commission_scope: a.commission_scope,
      commission_months: a.commission_months,
      earned_on: a.earned_on,
      hold_days: a.hold_days,
      discount_percent: Number(a.discount_percent),
      discount_duration: a.discount_duration,
      discount_months: a.discount_months,
      min_payout: Number(a.min_payout)
    },
    last30: { clicks: Number(clicks30.n), signups: Number(att30.signups || 0), paying: Number(att30.paying || 0) },
    allTime: { clicks: Number(clicksAll.n), signups: Number(attAll.signups || 0), paying: Number(attAll.paying || 0) },
    earnings: { pending: money(earn.pending), approved: money(earn.approved), paid: money(earn.paid) },
    referrals: refs.map((r) => ({
      date: r.created_at,
      who: `${initials(r.name)}${r.role === "parent" ? " · parent" : r.grade_level ? ` · ${r.grade_level}` : ""}`,
      status: Number(r.reversed) && !Number(r.earned) ? "refunded" : r.first_paid_at ? "paying" : "signed up",
      plan: r.first_paid_at ? r.plan : null,
      earned: money(r.earned)
    })),
    payouts
  });
});

// What a partner may change about themselves. Terms and code are the admin's.
router.put("/me", async (req, res) => {
  const a = await myAffiliate(req.user.id);
  if (!a) return res.status(404).json({ error: "No partner profile on this account." });
  const b = req.body || {};
  const clip = (v, n) => (v == null ? null : String(v).trim().slice(0, n) || null);
  const method = clip(b.payout_method, 30);
  if (method && !["promptpay", "bank", "other"].includes(method)) {
    return res.status(400).json({ error: "Payout method must be PromptPay, bank transfer or other." });
  }
  await pool.query(
    `UPDATE affiliates SET payout_method = ?, payout_details = ?, tax_id = ?, phone = ?, website = ? WHERE id = ?`,
    [method, clip(b.payout_details, 255), clip(b.tax_id, 30), clip(b.phone, 40), clip(b.website, 255), a.id]
  );
  res.json({ ok: true });
});

module.exports = router;
