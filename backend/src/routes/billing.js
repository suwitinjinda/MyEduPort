const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { getPlanDisplay, PLAN_TIERS } = require("../services/plan");

// Stripe subscriptions (Checkout + Billing Portal + webhook).
// Configure in backend/.env:
//   STRIPE_SECRET_KEY      sk_test_… (test mode) or sk_live_…
//   STRIPE_WEBHOOK_SECRET  whsec_…   (Stripe Dashboard → Developers → Webhooks → endpoint
//                                     https://myeduport.ai/api/billing/webhook)
// Prices come from Admin → Plan Settings (USD), sent to Stripe as inline price_data, so no
// products need to be created in the Stripe dashboard.
const router = express.Router();
const PAID = PLAN_TIERS.filter((t) => t !== "free");

let stripeClient = null;
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) stripeClient = require("stripe")(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}
const isTestMode = () => String(process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");

// Where to send the browser back to: the site the request came from (prod or local dev)
function originFor(req) {
  const o = String(req.headers.origin || "");
  if (/^https:\/\/(www\.)?myeduport\.ai$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return o;
  return (process.env.APP_URL || "https://myeduport.ai").replace(/\/+$/, "");
}

// Apply a Stripe subscription to the user it belongs to
async function applySubscription(userId, sub, fallbackPlan, fallbackCycle) {
  const plan = PAID.includes(sub?.metadata?.plan) ? sub.metadata.plan : fallbackPlan;
  const cycle = sub?.metadata?.cycle || fallbackCycle || null;
  const active = ["active", "trialing", "past_due"].includes(sub?.status);
  const periodEnd = sub?.current_period_end || sub?.items?.data?.[0]?.current_period_end;
  await pool.query(
    `UPDATE users SET plan = ?, plan_cycle = ?, stripe_customer_id = COALESCE(?, stripe_customer_id),
       stripe_subscription_id = ?, plan_renews_at = ?, subscription_status = ?,
       trial_ends_at = IF(? , NULL, trial_ends_at)
     WHERE id = ?`,
    [active && plan ? plan : "free", active ? cycle : null, typeof sub?.customer === "string" ? sub.customer : sub?.customer?.id || null,
      active ? sub.id : null, periodEnd ? new Date(periodEnd * 1000) : null, sub?.status || null, active ? 1 : 0, userId]
  );
}

router.get("/status", authRequired, async (req, res) => {
  const [[u]] = await pool.query("SELECT plan, plan_cycle, plan_renews_at, subscription_status, stripe_subscription_id, stripe_customer_id FROM users WHERE id = ?", [req.user.id]);
  res.json({
    configured: !!stripe(),
    test_mode: isTestMode(),
    plan: u?.plan || "free",
    cycle: u?.plan_cycle || null,
    renews_at: u?.plan_renews_at || null,
    status: u?.subscription_status || null,
    has_subscription: !!u?.stripe_subscription_id,
    can_manage: !!u?.stripe_customer_id
  });
});

// Start Stripe Checkout for a paid plan → { url }
router.post("/checkout", authRequired, async (req, res) => {
  const s = stripe();
  if (!s) return res.status(503).json({ error: "Payments aren't set up yet (STRIPE_SECRET_KEY missing)." });
  if (req.user.role !== "student" && req.user.role !== "parent") return res.status(403).json({ error: "Only student and parent accounts can subscribe." });
  const plan = String(req.body?.plan || "");
  const cycle = req.body?.cycle === "annual" ? "annual" : "monthly";
  const display = await getPlanDisplay();
  if (!PAID.includes(plan) || !display[plan]?.visible) return res.status(400).json({ error: "That plan isn't available." });
  const amount = Number(cycle === "annual" ? display[plan].annual : display[plan].monthly);
  if (!(amount > 0)) return res.status(400).json({ error: "That plan has no price set yet." });

  const [[u]] = await pool.query("SELECT id, email, name, stripe_customer_id, stripe_subscription_id, subscription_status FROM users WHERE id = ?", [req.user.id]);
  const origin = originFor(req);
  // Already subscribed → change plan / billing in the Billing Portal instead of a second subscription
  if (u.stripe_subscription_id && ["active", "trialing", "past_due"].includes(u.subscription_status) && u.stripe_customer_id) {
    const portal = await s.billingPortal.sessions.create({ customer: u.stripe_customer_id, return_url: `${origin}/settings` });
    return res.json({ url: portal.url, portal: true });
  }
  try {
    const session = await s.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: String(u.id),
      ...(u.stripe_customer_id ? { customer: u.stripe_customer_id } : { customer_email: u.email }),
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(amount * 100),
          recurring: { interval: cycle === "annual" ? "year" : "month" },
          product_data: { name: `MyEduPort ${display[plan].name}`, description: `${display[plan].name} plan — billed ${cycle === "annual" ? "yearly" : "monthly"}` }
        }
      }],
      subscription_data: { metadata: { user_id: String(u.id), plan, cycle } },
      metadata: { user_id: String(u.id), plan, cycle },
      allow_promotion_codes: true,
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("[stripe] checkout:", err.message);
    res.status(502).json({ error: `Stripe: ${err.message}` });
  }
});

// After Checkout: verify the session with Stripe and apply the plan (works even before the
// webhook is configured; the webhook keeps renewals/cancellations in sync afterwards)
router.get("/confirm", authRequired, async (req, res) => {
  const s = stripe();
  if (!s) return res.status(503).json({ error: "Payments aren't set up yet." });
  try {
    const session = await s.checkout.sessions.retrieve(String(req.query.session_id || ""), { expand: ["subscription"] });
    if (String(session.client_reference_id) !== String(req.user.id)) return res.status(403).json({ error: "This checkout belongs to another account." });
    if (session.status !== "complete" || !session.subscription) return res.json({ status: session.status || "open", paid: false });
    await applySubscription(req.user.id, session.subscription, session.metadata?.plan, session.metadata?.cycle);
    const [[u]] = await pool.query("SELECT plan, plan_cycle, plan_renews_at FROM users WHERE id = ?", [req.user.id]);
    res.json({ status: "complete", paid: session.payment_status === "paid", plan: u.plan, cycle: u.plan_cycle, renews_at: u.plan_renews_at });
  } catch (err) {
    res.status(400).json({ error: `Couldn't verify the payment: ${err.message}` });
  }
});

// Stripe Billing Portal: change plan, update card, cancel, invoices
router.post("/portal", authRequired, async (req, res) => {
  const s = stripe();
  if (!s) return res.status(503).json({ error: "Payments aren't set up yet." });
  const [[u]] = await pool.query("SELECT stripe_customer_id FROM users WHERE id = ?", [req.user.id]);
  if (!u?.stripe_customer_id) return res.status(400).json({ error: "No subscription yet." });
  try {
    const portal = await s.billingPortal.sessions.create({ customer: u.stripe_customer_id, return_url: `${originFor(req)}/settings` });
    res.json({ url: portal.url });
  } catch (err) {
    res.status(502).json({ error: `Stripe: ${err.message}` });
  }
});

// Webhook (raw body — mounted before express.json in index.js)
async function webhook(req, res) {
  const s = stripe();
  if (!s || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send("not configured");
  let event;
  try {
    event = s.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }
  try {
    const obj = event.data.object;
    if (event.type === "checkout.session.completed" && obj.mode === "subscription" && obj.client_reference_id) {
      const sub = await s.subscriptions.retrieve(obj.subscription);
      await applySubscription(Number(obj.client_reference_id), sub, obj.metadata?.plan, obj.metadata?.cycle);
    } else if (["customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.created"].includes(event.type)) {
      let userId = Number(obj.metadata?.user_id) || null;
      if (!userId) {
        const [[u]] = await pool.query("SELECT id FROM users WHERE stripe_customer_id = ?", [obj.customer]);
        userId = u?.id || null;
      }
      if (userId) await applySubscription(userId, event.type === "customer.subscription.deleted" ? { ...obj, status: "canceled" } : obj);
    }
    res.json({ received: true });
  } catch (err) {
    console.error("[stripe] webhook:", err.message);
    res.status(500).send("handler error"); // Stripe retries
  }
}

module.exports = { router, webhook };
