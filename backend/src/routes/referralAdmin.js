const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const ref = require("../services/referrals");

// Admin → Affiliates and Admin → Coins. Mounted at /api/admin/referrals
const router = express.Router();
const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL || user.role === "admin";
router.use(authRequired, (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: "Admin only" })));

const money = (n) => Math.round(Number(n || 0) * 100) / 100;
const num = (v, lo, hi, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

// ------------------------------------------------------------------ affiliates

router.get("/affiliates", async (req, res) => {
  await ref.releaseDue();
  const [rows] = await pool.query(
    `SELECT a.id, a.code, a.status, a.organisation, a.created_at, a.approved_at,
            a.commission_type, a.commission_value, a.commission_scope, a.commission_months, a.earned_on,
            a.discount_percent, a.discount_duration, a.discount_months,
            u.name, u.email,
            (SELECT COUNT(*) FROM affiliate_clicks c WHERE c.affiliate_id = a.id) AS clicks,
            (SELECT COUNT(*) FROM referral_attributions r WHERE r.affiliate_id = a.id) AS signups,
            (SELECT COUNT(*) FROM referral_attributions r WHERE r.affiliate_id = a.id AND r.first_paid_at IS NOT NULL) AS paying,
            (SELECT COALESCE(SUM(amount),0) FROM commissions m WHERE m.affiliate_id = a.id AND m.status = 'pending')  AS pending,
            (SELECT COALESCE(SUM(amount),0) FROM commissions m WHERE m.affiliate_id = a.id AND m.status = 'approved') AS owed,
            (SELECT COALESCE(SUM(amount),0) FROM commissions m WHERE m.affiliate_id = a.id AND m.status = 'paid')     AS paid
       FROM affiliates a JOIN users u ON u.id = a.user_id
      WHERE u.deleted_at IS NULL
      ORDER BY FIELD(a.status, 'pending', 'active', 'paused', 'rejected'), a.created_at DESC`
  );
  res.json(rows.map((r) => ({ ...r, pending: money(r.pending), owed: money(r.owed), paid: money(r.paid) })));
});

router.get("/affiliates/:id", async (req, res) => {
  await ref.releaseDue(req.params.id);
  const [[a]] = await pool.query(
    "SELECT a.*, u.name, u.email FROM affiliates a JOIN users u ON u.id = a.user_id WHERE a.id = ?",
    [req.params.id]
  );
  if (!a) return res.status(404).json({ error: "Not found" });
  const [commissions] = await pool.query(
    `SELECT m.id, m.kind, m.amount_paid, m.amount, m.currency, m.status, m.available_at, m.note, m.created_at,
            u.name AS student_name, u.email AS student_email
       FROM commissions m LEFT JOIN users u ON u.id = m.user_id
      WHERE m.affiliate_id = ? ORDER BY m.created_at DESC LIMIT 200`,
    [a.id]
  );
  const [payouts] = await pool.query(
    "SELECT p.*, u.email AS recorded_by_email FROM affiliate_payouts p LEFT JOIN users u ON u.id = p.recorded_by WHERE p.affiliate_id = ? ORDER BY p.paid_at DESC",
    [a.id]
  );
  res.json({ ...a, commissions, payouts });
});

// Approve, pause, reject, or change terms. Terms only affect referrals made after the save.
router.put("/affiliates/:id", async (req, res) => {
  const [[a]] = await pool.query("SELECT * FROM affiliates WHERE id = ?", [req.params.id]);
  if (!a) return res.status(404).json({ error: "Not found" });
  const b = req.body || {};

  const status = b.status ?? a.status;
  if (!["pending", "active", "paused", "rejected"].includes(status)) return res.status(400).json({ error: "Unknown status." });

  let code = b.code === undefined ? a.code : ref.normalizeCode(b.code) || null;
  if (status === "active" && !code) return res.status(400).json({ error: "Give the partner a referral code before approving." });
  if (code && code !== a.code && !(await ref.codeAvailable(code, a.id))) {
    return res.status(409).json({ error: `The code ${code} is already taken.` });
  }
  if (code && code.length < 3) return res.status(400).json({ error: "Codes need at least 3 letters or numbers." });

  const pick = (k, allowed) => (b[k] !== undefined && allowed.includes(b[k]) ? b[k] : a[k]);
  const fields = {
    code,
    status,
    commission_type: pick("commission_type", ["percent", "fixed"]),
    commission_value: num(b.commission_value ?? a.commission_value, 0, 100000, a.commission_value),
    commission_scope: pick("commission_scope", ["first", "months", "forever"]),
    commission_months: Math.round(num(b.commission_months ?? a.commission_months, 1, 120, a.commission_months)),
    earned_on: pick("earned_on", ["payment", "signup"]),
    hold_days: Math.round(num(b.hold_days ?? a.hold_days, 0, 365, a.hold_days)),
    discount_percent: num(b.discount_percent ?? a.discount_percent, 0, 100, a.discount_percent),
    discount_duration: pick("discount_duration", ["once", "repeating", "forever"]),
    discount_months: Math.round(num(b.discount_months ?? a.discount_months, 1, 36, a.discount_months)),
    min_payout: num(b.min_payout ?? a.min_payout, 0, 100000, a.min_payout),
    admin_notes: b.admin_notes === undefined ? a.admin_notes : String(b.admin_notes || "").slice(0, 5000)
  };
  if (fields.commission_type === "percent" && fields.commission_value > 100) {
    return res.status(400).json({ error: "A percentage commission can't be more than 100%." });
  }

  const approvingNow = status === "active" && !a.approved_at;
  await pool.query(
    `UPDATE affiliates SET ${Object.keys(fields).map((k) => `${k} = ?`).join(", ")}
       ${approvingNow ? ", approved_at = NOW(), approved_by = ?" : ""}
     WHERE id = ?`,
    [...Object.values(fields), ...(approvingNow ? [req.user.id] : []), a.id]
  );
  console.log(`[affiliates] ${req.user.email} updated partner ${a.id} → ${status}${code ? ` (${code})` : ""}`);
  res.json({ ok: true });
});

// Record a transfer to the partner. Pays everything currently approved, all at once, so
// the amount on the payout always equals the commissions it covers.
router.post("/affiliates/:id/payouts", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE commissions SET status = 'approved' WHERE status = 'pending' AND available_at <= NOW() AND affiliate_id = ?", [req.params.id]);
    const [due] = await conn.query(
      "SELECT id, amount, currency FROM commissions WHERE affiliate_id = ? AND status = 'approved' FOR UPDATE",
      [req.params.id]
    );
    if (!due.length) { await conn.rollback(); return res.status(400).json({ error: "Nothing is ready to pay." }); }
    const total = money(due.reduce((s, c) => s + Number(c.amount), 0));
    const method = String(req.body?.method || "").slice(0, 30) || null;
    const reference = String(req.body?.reference || "").slice(0, 120) || null;
    const paidAt = req.body?.paid_at ? new Date(req.body.paid_at) : new Date();
    if (Number.isNaN(paidAt.getTime())) { await conn.rollback(); return res.status(400).json({ error: "Invalid payment date." }); }

    const [p] = await conn.query(
      "INSERT INTO affiliate_payouts (affiliate_id, amount, currency, method, reference, paid_at, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.params.id, total, due[0].currency || "usd", method, reference, paidAt, req.user.id]
    );
    await conn.query(
      `UPDATE commissions SET status = 'paid', payout_id = ? WHERE id IN (${due.map(() => "?").join(",")})`,
      [p.insertId, ...due.map((c) => c.id)]
    );
    await conn.commit();
    console.log(`[affiliates] ${req.user.email} recorded payout ${p.insertId}: ${total} to partner ${req.params.id}`);
    res.json({ ok: true, payout_id: p.insertId, amount: total, commissions: due.length });
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
});

// Cancel a single commission by hand (e.g. a self-referral spotted later)
router.post("/commissions/:id/reverse", async (req, res) => {
  const note = String(req.body?.note || "Reversed by admin").slice(0, 255);
  const [r] = await pool.query(
    "UPDATE commissions SET status = 'reversed', note = ? WHERE id = ? AND status IN ('pending', 'approved')",
    [note, req.params.id]
  );
  if (!r.affectedRows) return res.status(400).json({ error: "Only commissions that haven't been paid can be reversed." });
  res.json({ ok: true });
});

// ------------------------------------------------------------------ coins

router.get("/coins/settings", async (req, res) => {
  res.json({ referral: await ref.getReferralSettings(), rules: await ref.getCoinRules() });
});

router.put("/coins/settings", async (req, res) => {
  const referral = req.body?.referral ? await ref.setReferralSettings(req.body.referral) : await ref.getReferralSettings();
  const rules = req.body?.rules ? await ref.setCoinRules(req.body.rules) : await ref.getCoinRules();
  res.json({ referral, rules });
});

// Find students and see balances
router.get("/coins/users", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const like = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.referral_code,
            COALESCE((SELECT SUM(amount) FROM coin_ledger l WHERE l.user_id = u.id), 0) AS balance,
            (SELECT COUNT(*) FROM referral_attributions r WHERE r.referrer_user_id = u.id) AS invited,
            (SELECT COUNT(*) FROM referral_attributions r WHERE r.referrer_user_id = u.id AND r.first_paid_at IS NOT NULL) AS invited_paying
       FROM users u
      WHERE u.deleted_at IS NULL AND u.role IN ('student', 'parent')
        ${q ? "AND (u.name LIKE ? OR u.email LIKE ? OR u.referral_code LIKE ?)" : ""}
      ORDER BY balance DESC, u.id DESC
      LIMIT 50`,
    q ? [like, like, like] : []
  );
  res.json(rows.map((r) => ({ ...r, balance: Number(r.balance) })));
});

router.get("/coins/users/:id", async (req, res) => {
  const [ledger] = await pool.query(
    `SELECT l.id, l.amount, l.reason, l.note, l.created_at, a.email AS by_email
       FROM coin_ledger l LEFT JOIN users a ON a.id = l.created_by
      WHERE l.user_id = ? ORDER BY l.created_at DESC, l.id DESC LIMIT 300`,
    [req.params.id]
  );
  res.json({ balance: await ref.coinBalance(req.params.id), ledger });
});

// Manual adjustment. Always recorded with who did it and why.
router.post("/coins/users/:id/adjust", async (req, res) => {
  const amount = Math.round(Number(req.body?.amount));
  const note = String(req.body?.note || "").trim().slice(0, 255);
  if (!Number.isFinite(amount) || amount === 0) return res.status(400).json({ error: "Enter a non-zero number of coins." });
  if (Math.abs(amount) > 100000) return res.status(400).json({ error: "That's more than 100,000 coins in one go." });
  if (!note) return res.status(400).json({ error: "Say why — it's shown in the history." });
  const [[u]] = await pool.query("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL", [req.params.id]);
  if (!u) return res.status(404).json({ error: "No such user." });
  await pool.query(
    "INSERT INTO coin_ledger (user_id, amount, reason, note, created_by) VALUES (?, ?, 'admin_adjust', ?, ?)",
    [u.id, amount, note, req.user.id]
  );
  console.log(`[coins] ${req.user.email} adjusted user ${u.id} by ${amount}: ${note}`);
  res.json({ ok: true, balance: await ref.coinBalance(u.id) });
});

module.exports = router;
