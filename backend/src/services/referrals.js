const crypto = require("crypto");
const pool = require("../db");

// Affiliate and referral programs. Design: doc/affiliate-referral-design.md
//
// Two ways a new account can be "brought in":
//   affiliate — an external partner's code (KRUPOOM). Earns the partner a commission.
//   referral  — an existing student's personal invite code. Earns that student coins.
// Either way the new student gets a discount at checkout. A new account is attributed at
// most once (first touch), so discounts never stack.
//
// Money rules worth knowing before changing anything here:
//   - Terms are copied onto the attribution at sign-up. Editing a partner's terms later
//     only affects people who sign up afterwards.
//   - Every commission row carries an `event_key` (a Stripe invoice id, or signup:<user>)
//     with a UNIQUE index. Stripe retries webhooks; a retry must never pay twice.
//   - Commissions sit `pending` for the partner's hold period so a refund can reverse them,
//     then become `approved`, then `paid` once an admin records the transfer.

const MAX_CODE = 24;
const normalizeCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, MAX_CODE);
const money = (n) => Math.round(Number(n || 0) * 100) / 100;
const parseJson = (v) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };

// ------------------------------------------------------------------ settings

const DEFAULT_REFERRAL_SETTINGS = {
  enabled: true,
  discount_percent: 5,
  discount_duration: "once",   // once | repeating | forever
  discount_months: 12
};

// Each key is wired to a real event in the code (see awardCoins callers). An admin can change
// the coins and the per-user limit, or set coins to 0 to switch a rule off — but a new key
// does nothing until something in the code awards it.
const DEFAULT_COIN_RULES = {
  referral_paid:     { label: "A friend you invited subscribes", coins: 200, limit: null },
  referral_signup:   { label: "A friend you invited signs up", coins: 0, limit: null },
  personality_test:  { label: "Complete the Personal Character Test", coins: 30, limit: 1 },
  career_test:       { label: "Complete the Career Test", coins: 30, limit: 1 },
  admission_result:  { label: "Record an admission result", coins: 20, limit: 10 }
};

async function readSetting(key, fallback) {
  try {
    const [[row]] = await pool.query("SELECT sval FROM app_settings WHERE skey = ?", [key]);
    const val = parseJson(row?.sval);
    return val && typeof val === "object" ? val : fallback;
  } catch { return fallback; }
}
async function writeSetting(key, value) {
  await pool.query(
    "INSERT INTO app_settings (skey, sval) VALUES (?, ?) ON DUPLICATE KEY UPDATE sval = VALUES(sval)",
    [key, JSON.stringify(value)]
  );
}

async function getReferralSettings() {
  return { ...DEFAULT_REFERRAL_SETTINGS, ...(await readSetting("referral_settings", {})) };
}
async function setReferralSettings(input) {
  const cur = await getReferralSettings();
  const next = {
    enabled: input.enabled === undefined ? cur.enabled : !!input.enabled,
    discount_percent: clampNum(input.discount_percent ?? cur.discount_percent, 0, 100),
    discount_duration: ["once", "repeating", "forever"].includes(input.discount_duration) ? input.discount_duration : cur.discount_duration,
    discount_months: Math.round(clampNum(input.discount_months ?? cur.discount_months, 1, 36))
  };
  await writeSetting("referral_settings", next);
  return next;
}

async function getCoinRules() {
  const saved = await readSetting("coin_rules", {});
  const out = {};
  for (const [k, def] of Object.entries(DEFAULT_COIN_RULES)) out[k] = { ...def, ...(saved[k] || {}) };
  return out;
}
async function setCoinRules(input) {
  const cur = await getCoinRules();
  const next = {};
  for (const k of Object.keys(DEFAULT_COIN_RULES)) {
    const r = input?.[k] || {};
    next[k] = {
      label: cur[k].label,
      coins: Math.round(clampNum(r.coins ?? cur[k].coins, 0, 100000)),
      limit: r.limit === null || r.limit === "" ? null : (r.limit === undefined ? cur[k].limit : Math.round(clampNum(r.limit, 1, 10000)))
    };
  }
  await writeSetting("coin_rules", next);
  return next;
}

function clampNum(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

// ------------------------------------------------------------------ codes

// Look a code up. Affiliate codes win over student codes (they are kept distinct anyway).
async function resolveCode(raw) {
  const code = normalizeCode(raw);
  if (code.length < 3) return null;

  const [[aff]] = await pool.query(
    `SELECT a.*, u.name AS user_name FROM affiliates a JOIN users u ON u.id = a.user_id
      WHERE a.code = ? AND a.status = 'active' AND u.deleted_at IS NULL`,
    [code]
  );
  if (aff) return { kind: "affiliate", code, affiliate: aff, label: aff.organisation || aff.user_name };

  const settings = await getReferralSettings();
  if (!settings.enabled) return null;
  const [[ref]] = await pool.query(
    "SELECT id, name, role FROM users WHERE referral_code = ? AND deleted_at IS NULL AND COALESCE(is_disabled, 0) = 0",
    [code]
  );
  if (ref) return { kind: "referral", code, referrer: ref, label: firstName(ref.name), settings };
  return null;
}

const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "a friend";

// The terms frozen onto an attribution
function termsFor(resolved) {
  if (resolved.kind === "affiliate") {
    const a = resolved.affiliate;
    return {
      source: "affiliate",
      label: resolved.label,
      discount_percent: Number(a.discount_percent),
      discount_duration: a.discount_duration,
      discount_months: a.discount_months,
      commission_type: a.commission_type,
      commission_value: Number(a.commission_value),
      commission_scope: a.commission_scope,
      commission_months: a.commission_months,
      earned_on: a.earned_on,
      hold_days: a.hold_days
    };
  }
  const s = resolved.settings;
  return {
    source: "referral",
    label: resolved.label,
    discount_percent: Number(s.discount_percent),
    discount_duration: s.discount_duration,
    discount_months: s.discount_months
  };
}

// What the visitor is shown about a code — nothing about the partner beyond their name
function publicInfo(resolved) {
  if (!resolved) return { valid: false };
  const t = termsFor(resolved);
  return {
    valid: true,
    code: resolved.code,
    kind: resolved.kind,
    from: resolved.label,
    discount_percent: t.discount_percent,
    discount_duration: t.discount_duration,
    discount_months: t.discount_months
  };
}

// Visitors are counted once per day per affiliate. The IP is never stored, only a hash
// salted with the day, so it can't be reversed or linked across days.
async function recordVisit(rawCode, ip, path) {
  const resolved = await resolveCode(rawCode);
  if (resolved?.kind === "affiliate") {
    const day = new Date().toISOString().slice(0, 10);
    const ipHash = crypto.createHash("sha256").update(`${process.env.JWT_SECRET || ""}|${day}|${ip || ""}`).digest("hex").slice(0, 16);
    const [[seen]] = await pool.query(
      "SELECT id FROM affiliate_clicks WHERE affiliate_id = ? AND ip_hash = ? AND created_at >= CURDATE() LIMIT 1",
      [resolved.affiliate.id, ipHash]
    );
    if (!seen) {
      await pool.query("INSERT INTO affiliate_clicks (affiliate_id, ip_hash, path) VALUES (?, ?, ?)",
        [resolved.affiliate.id, ipHash, String(path || "").slice(0, 255)]);
    }
  }
  return publicInfo(resolved);
}

// A student's own invite code, created on first use. Kept clear of affiliate codes.
async function ensureReferralCode(userId) {
  const [[u]] = await pool.query("SELECT name, referral_code FROM users WHERE id = ?", [userId]);
  if (!u) return null;
  if (u.referral_code) return u.referral_code;
  const stem = normalizeCode(firstName(u.name)).slice(0, 10) || "FRIEND";
  for (let i = 0; i < 8; i++) {
    const code = stem + crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
    const [[clash]] = await pool.query("SELECT id FROM affiliates WHERE code = ?", [code]);
    if (clash) continue;
    try {
      const [r] = await pool.query("UPDATE users SET referral_code = ? WHERE id = ? AND referral_code IS NULL", [code, userId]);
      if (r.affectedRows) return code;
      const [[again]] = await pool.query("SELECT referral_code FROM users WHERE id = ?", [userId]);
      return again?.referral_code || null;
    } catch (e) {
      if (e.code !== "ER_DUP_ENTRY") throw e;
    }
  }
  throw new Error("Could not create an invite code");
}

// Is this code free for an admin to give to an affiliate?
async function codeAvailable(rawCode, exceptAffiliateId = 0) {
  const code = normalizeCode(rawCode);
  if (code.length < 3) return false;
  const [[a]] = await pool.query("SELECT id FROM affiliates WHERE code = ? AND id <> ?", [code, exceptAffiliateId]);
  if (a) return false;
  const [[u]] = await pool.query("SELECT id FROM users WHERE referral_code = ?", [code]);
  return !u;
}

// ------------------------------------------------------------------ sign-up

// Called right after an account is created. Must never make sign-up fail.
async function attachAtSignup(userId, role, rawCode) {
  try {
    if (!rawCode || !["student", "parent"].includes(role)) return null;
    const resolved = await resolveCode(rawCode);
    if (!resolved) return null;
    if (resolved.kind === "referral" && resolved.referrer.id === userId) return null;
    if (resolved.kind === "affiliate" && resolved.affiliate.user_id === userId) return null;

    const terms = termsFor(resolved);
    const [r] = await pool.query(
      `INSERT IGNORE INTO referral_attributions (user_id, source, affiliate_id, referrer_user_id, code, terms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, resolved.kind,
        resolved.kind === "affiliate" ? resolved.affiliate.id : null,
        resolved.kind === "referral" ? resolved.referrer.id : null,
        resolved.code, JSON.stringify(terms)]
    );
    if (!r.affectedRows) return null; // already attributed — first touch wins

    if (resolved.kind === "affiliate" && terms.earned_on === "signup" && terms.commission_value > 0) {
      // A sign-up has no payment to take a percentage of, so a sign-up commission is
      // always the configured value as a flat amount.
      await createCommission({
        affiliateId: resolved.affiliate.id, userId, kind: "signup", eventKey: `signup:${userId}`,
        amountPaid: 0, amount: money(terms.commission_value), currency: "usd", holdDays: terms.hold_days
      });
    }
    if (resolved.kind === "referral") {
      await awardCoins(resolved.referrer.id, "referral_signup", `referral_signup:${userId}`);
    }
    return { source: resolved.kind, code: resolved.code };
  } catch (err) {
    console.error("[referrals] attach at sign-up failed:", err.message);
    return null;
  }
}

// ------------------------------------------------------------------ checkout

// The Stripe coupon for a student's referral discount, if they still have one to use.
// Only offered before their first payment: someone who cancels and comes back later pays
// the normal price.
async function checkoutCoupon(userId, stripe) {
  const [[att]] = await pool.query("SELECT terms, first_paid_at FROM referral_attributions WHERE user_id = ?", [userId]);
  if (!att || att.first_paid_at) return null;
  const t = parseJson(att.terms) || {};
  const pct = Number(t.discount_percent || 0);
  if (!(pct > 0)) return null;
  const couponId = await ensureCoupon(stripe, pct, t.discount_duration || "once", t.discount_months || 12);
  return { couponId, percent: pct, from: t.label, duration: t.discount_duration, months: t.discount_months };
}

// Coupons are shared by everyone with the same terms, so the id is derived from them
async function ensureCoupon(stripe, percent, duration, months) {
  const pctTag = String(percent).replace(".", "_");
  const id = `MEP-REF-${pctTag}-${duration === "repeating" ? `R${months}` : duration.toUpperCase()}`;
  try {
    await stripe.coupons.retrieve(id);
    return id;
  } catch (e) {
    if (e.statusCode !== 404 && e.code !== "resource_missing") throw e;
  }
  const params = { id, percent_off: percent, duration, name: `Referral ${percent}% off` };
  if (duration === "repeating") params.duration_in_months = months;
  try {
    await stripe.coupons.create(params);
  } catch (e) {
    if (!/already exists/i.test(e.message)) throw e; // a parallel request created it first
  }
  return id;
}

// ------------------------------------------------------------------ webhook

async function createCommission({ affiliateId, userId, kind, eventKey, chargeId = null, amountPaid, amount, currency, holdDays }) {
  if (!(amount > 0)) return null;
  const availableAt = new Date(Date.now() + Number(holdDays || 0) * 86400000);
  const [r] = await pool.query(
    `INSERT IGNORE INTO commissions
       (affiliate_id, user_id, kind, event_key, stripe_charge_id, amount_paid, amount, currency, available_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [affiliateId, userId, kind, eventKey, chargeId, money(amountPaid), money(amount), (currency || "usd").toLowerCase(), availableAt]
  );
  return r.affectedRows ? r.insertId : null;
}

async function userIdForInvoice(invoice) {
  const meta = invoice?.parent?.subscription_details?.metadata || invoice?.subscription_details?.metadata || {};
  if (Number(meta.user_id)) return Number(meta.user_id);
  if (invoice?.customer) {
    const [[u]] = await pool.query("SELECT id FROM users WHERE stripe_customer_id = ?", [invoice.customer]);
    if (u) return u.id;
  }
  return null;
}

// Stripe `invoice.paid`
async function onInvoicePaid(invoice) {
  const paid = Number(invoice?.amount_paid || 0) / 100;
  if (!(paid > 0)) return { skipped: "nothing paid" };
  const userId = await userIdForInvoice(invoice);
  if (!userId) return { skipped: "no user" };

  const [[att]] = await pool.query("SELECT * FROM referral_attributions WHERE user_id = ?", [userId]);
  if (!att) return { skipped: "not referred" };

  const firstPayment = !att.first_paid_at;
  const paidAt = new Date((invoice.status_transitions?.paid_at || invoice.created || Date.now() / 1000) * 1000);
  if (firstPayment) {
    await pool.query("UPDATE referral_attributions SET first_paid_at = ? WHERE id = ? AND first_paid_at IS NULL", [paidAt, att.id]);
  }
  const t = parseJson(att.terms) || {};

  if (att.source === "referral") {
    if (firstPayment && att.referrer_user_id) {
      await awardCoins(att.referrer_user_id, "referral_paid", `referral_paid:${userId}`);
    }
    return { referral: true };
  }

  if (att.source !== "affiliate" || !att.affiliate_id || t.earned_on !== "payment") return { skipped: "no payment commission" };

  const [[prior]] = await pool.query(
    "SELECT COUNT(*) AS n FROM commissions WHERE affiliate_id = ? AND user_id = ? AND kind = 'payment' AND event_key <> ?",
    [att.affiliate_id, userId, invoice.id]
  );
  const hadOne = Number(prior.n) > 0;

  let amount = 0;
  if (t.commission_type === "fixed") {
    // A flat amount is per student, once — not per bill
    if (hadOne) return { skipped: "fixed commission already earned" };
    amount = Number(t.commission_value);
  } else {
    if (t.commission_scope === "first" && hadOne) return { skipped: "first payment only" };
    if (t.commission_scope === "months") {
      const start = att.first_paid_at ? new Date(att.first_paid_at) : paidAt;
      const end = new Date(start); end.setMonth(end.getMonth() + Number(t.commission_months || 12));
      if (paidAt > end) return { skipped: "outside commission window" };
    }
    amount = paid * Number(t.commission_value) / 100;
  }

  const id = await createCommission({
    affiliateId: att.affiliate_id, userId, kind: "payment", eventKey: invoice.id,
    chargeId: typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id || null,
    amountPaid: paid, amount: money(amount), currency: invoice.currency, holdDays: t.hold_days
  });
  return { commission: id };
}

// Stripe `charge.refunded`. Reverses commissions still in the hold or approved but unpaid.
// One already paid out is left alone and flagged — that money has gone, and whether to
// claw it back from the partner is a human decision.
async function onChargeRefunded(charge) {
  const invoiceId = typeof charge?.invoice === "string" ? charge.invoice : charge?.invoice?.id;
  const [rows] = await pool.query(
    "SELECT id, status FROM commissions WHERE stripe_charge_id = ? OR (? IS NOT NULL AND event_key = ?)",
    [charge?.id || "", invoiceId || null, invoiceId || ""]
  );
  let reversed = 0, flagged = 0;
  for (const c of rows) {
    if (c.status === "pending" || c.status === "approved") {
      await pool.query("UPDATE commissions SET status = 'reversed', note = 'Payment refunded' WHERE id = ?", [c.id]);
      reversed++;
    } else if (c.status === "paid") {
      await pool.query("UPDATE commissions SET note = 'Refunded after this was paid out' WHERE id = ?", [c.id]);
      flagged++;
    }
  }
  return { reversed, flagged };
}

// Move commissions whose hold has passed from pending to approved. Cheap, so it runs
// whenever someone looks at the numbers rather than on a timer.
async function releaseDue(affiliateId = null) {
  if (affiliateId) {
    await pool.query("UPDATE commissions SET status = 'approved' WHERE status = 'pending' AND available_at <= NOW() AND affiliate_id = ?", [affiliateId]);
  } else {
    await pool.query("UPDATE commissions SET status = 'approved' WHERE status = 'pending' AND available_at <= NOW()");
  }
}

// ------------------------------------------------------------------ coins

// Give coins for an event, respecting the rule's value and per-user limit. `refKey`
// identifies the event so a retry or double click can never pay twice.
async function awardCoins(userId, ruleKey, refKey, note = null) {
  try {
    const rules = await getCoinRules();
    const rule = rules[ruleKey];
    if (!rule || !(rule.coins > 0)) return 0;
    if (rule.limit) {
      const [[c]] = await pool.query("SELECT COUNT(*) AS n FROM coin_ledger WHERE user_id = ? AND reason = ?", [userId, ruleKey]);
      if (Number(c.n) >= rule.limit) return 0;
    }
    const [r] = await pool.query(
      "INSERT IGNORE INTO coin_ledger (user_id, amount, reason, ref_key, note) VALUES (?, ?, ?, ?, ?)",
      [userId, rule.coins, ruleKey, refKey, note]
    );
    return r.affectedRows ? rule.coins : 0;
  } catch (err) {
    console.error("[coins] award failed:", err.message);
    return 0;
  }
}

async function coinBalance(userId) {
  const [[r]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS b FROM coin_ledger WHERE user_id = ?", [userId]);
  return Number(r.b);
}

module.exports = {
  normalizeCode, resolveCode, publicInfo, recordVisit, ensureReferralCode, codeAvailable,
  attachAtSignup, checkoutCoupon, ensureCoupon,
  onInvoicePaid, onChargeRefunded, releaseDue, createCommission,
  getReferralSettings, setReferralSettings, getCoinRules, setCoinRules, awardCoins, coinBalance,
  DEFAULT_COIN_RULES
};
