import React, { useEffect, useState } from "react";
import { apiFetch, getToken } from "../api/client";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { storedReferral } from "../utils/referral.js";

// Plans, prices and limits come from Admin → Plan Settings (GET /api/options/plans), so the
// cards and the comparison table always match what the app actually allows.
// DEFAULT_PLANS is only a fallback if that request fails.
const DEFAULT_PLANS = [
  { key: "free", name: "Free", monthly: 0, annual: 0, limits: { adviai: false, export: false, prediction: "none", match: 3, parent_dashboard: false, advisor: 0, gap: false, edubot: 3, essay_feedback: 1 } },
  { key: "essential", name: "Essential", monthly: 29, annual: 290, limits: { adviai: true, export: true, prediction: "basic", match: 10, parent_dashboard: false, advisor: 0, gap: true, edubot: 30, essay_feedback: 5 } },
  { key: "professional", name: "Professional", monthly: 49, annual: 490, limits: { adviai: true, export: true, prediction: "advanced", match: -1, parent_dashboard: true, advisor: 1, gap: true, edubot: 150, essay_feedback: -1 } }
];
const TAGLINES = {
  free: "Get started with the basics",
  essential: "For students getting started",
  professional: "For ambitious students targeting top universities",
  elite: "Hands-on guidance for the most competitive applications"
};
const BUILDER = { free: "Basic", essential: "AI-assisted", professional: "Full AI", elite: "Full AI" };

const YES = "yes";
const NO = "no";
const per = (n, free) => (free ? (n === 1 ? "1 time" : `${n} total`) : `${n} / month`);
const qty = (n, free, unit = "") => (n === -1 ? "Unlimited" : !n ? NO : `${per(n, free)}${unit}`);

// Comparison rows from limits
const COMPARE = [
  ["Portfolio Builder", (l, k) => BUILDER[k] || (l.adviai ? "AI-assisted" : "Basic")],
  ["MEPAi Essay Score", (l, k) => qty(l.essay_feedback, k === "free")],
  ["MEPAi University Match", (l) => (l.match === -1 ? "Unlimited" : l.match ? String(l.match) : NO)],
  ["Acceptance Prediction", (l) => ({ none: NO, basic: "Basic", advanced: "Advanced" }[l.prediction] || NO)],
  ["Parent Dashboard", (l) => (l.parent_dashboard ? YES : NO)],
  ["Export PDF Portfolio", (l) => (l.export ? YES : NO)],
  ["Human Advisor Session", (l) => (l.advisor === -1 ? "Unlimited" : l.advisor ? `${l.advisor} / month` : NO)]
];

// Card bullet lines (included) and "not included" lines for one plan
function cardLines(l, k) {
  const free = k === "free";
  const inc = [];
  const not = [];
  inc.push(`${BUILDER[k] || (l.adviai ? "AI-assisted" : "Basic")} portfolio builder`);
  if (l.essay_feedback) inc.push(l.essay_feedback === -1 ? "Unlimited MEPAi essay scores" : `MEPAi essay score (${per(l.essay_feedback, free)})`);
  if (l.match) inc.push(l.match === -1 ? "Unlimited MEPAi university matches" : `MEPAi university match: ${l.match} universities`);
  if (l.prediction === "basic") inc.push("Basic acceptance prediction");
  else if (l.prediction === "advanced") inc.push("Advanced acceptance prediction (per university)");
  else not.push("No acceptance prediction");
  if (l.export) inc.push("Export PDF portfolio"); else not.push("No PDF portfolio export");
  if (l.gap) inc.push("Gap analysis & next steps");
  if (l.parent_dashboard) inc.push("Parent dashboard"); else not.push("No parent dashboard");
  if (l.advisor) inc.push(l.advisor === -1 ? "Unlimited human advisor sessions" : `Human advisor session${l.advisor === 1 ? "" : "s"} (${l.advisor} / month)`); else not.push("No human advisor session");
  if (l.edubot) inc.push(l.edubot === -1 ? "Unlimited EduBot queries" : free ? `${l.edubot} EduBot questions (one-time)` : `${l.edubot} EduBot queries / month`);
  return { inc, not };
}

function buildCards(list) {
  return list.map((p, i) => {
    const { inc, not } = cardLines(p.limits, p.key);
    const prev = i > 0 ? cardLines(list[i - 1].limits, list[i - 1].key).inc : [];
    const fresh = inc.filter((x) => !prev.includes(x));
    const savings = p.monthly * 12 - p.annual;
    return {
      key: p.key,
      name: p.name,
      tagline: TAGLINES[p.key] || "",
      monthly: `$${p.monthly}`,
      annual: `$${p.annual}`,
      savings: p.key !== "free" && savings > 0 ? `Save $${savings} / yr` : "",
      features: i > 0 ? [`Everything in ${list[i - 1].name}, plus:`, ...fresh] : inc,
      limitations: not,
      cta: p.key === "free" ? "Start 14-day free trial" : `Subscribe to ${p.name}`,
      popular: p.key === "professional"
    };
  });
}

function Cell({ value }) {
  if (value === YES) return <span aria-label="Included" style={{ color: "var(--success)", fontWeight: 700, fontSize: "1.1rem" }}>✓</span>;
  if (value === NO) return <span aria-label="Not included" style={{ color: "var(--error)", fontWeight: 700, fontSize: "1.1rem" }}>✕</span>;
  return <span>{value}</span>;
}

export default function Pricing() {
  const [cycle, setCycle] = useState("monthly");
  const [planList, setPlanList] = useState(DEFAULT_PLANS);
  useEffect(() => { apiFetch("/api/options/plans").then((d) => { if (Array.isArray(d) && d.length) setPlanList(d); }).catch(() => {}); }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = !!getToken();
  const [billing, setBilling] = useState(null); // { configured, test_mode, plan, … }
  const [busyPlan, setBusyPlan] = useState("");
  const [payMsg, setPayMsg] = useState(new URLSearchParams(location.search).get("checkout") === "cancelled" ? "Checkout cancelled — you haven't been charged." : "");
  useEffect(() => { if (loggedIn) apiFetch("/api/billing/status").then(setBilling).catch(() => {}); }, [loggedIn]);
  const [refDiscount, setRefDiscount] = useState(null); // { percent, from }
  useEffect(() => {
    if (loggedIn) {
      apiFetch("/api/ref/mine").then((r) => {
        if (r?.discount_available) setRefDiscount({ percent: r.discount_percent, from: r.from, duration: r.discount_duration, months: r.discount_months });
      }).catch(() => {});
    } else {
      const s = storedReferral();
      if (s?.discount_percent > 0) setRefDiscount({ percent: s.discount_percent, from: s.from, duration: s.discount_duration, months: s.discount_months });
    }
  }, [loggedIn]);
  // after signing in, show the plan they were about to buy
  useEffect(() => {
    if (!loggedIn) return;
    let intended = null;
    try { intended = JSON.parse(sessionStorage.getItem("mep-intended-plan") || "null"); } catch { /* ignore */ }
    if (!intended) return;
    sessionStorage.removeItem("mep-intended-plan");
    if (intended.cycle === "annual" || intended.cycle === "monthly") setCycle(intended.cycle);
    setPayMsg(`You're signed in — continue with ${intended.key[0].toUpperCase() + intended.key.slice(1)} below.`);
  }, [loggedIn]);

  // Free → sign up / dashboard. Paid → Stripe Checkout (or the Billing Portal if already subscribed)
  const choose = async (key) => {
    if (!loggedIn) {
      // come back to Pricing (and this plan) once they've signed in
      try { sessionStorage.setItem("mep-intended-plan", JSON.stringify({ key, cycle })); } catch { /* ignore */ }
      navigate("/login", { state: { from: "/pricing" } });
      return;
    }
    if (key === "free") { navigate("/dashboard"); return; }
    setBusyPlan(key); setPayMsg("");
    try {
      const r = await apiFetch("/api/billing/checkout", { method: "POST", body: JSON.stringify({ plan: key, cycle }) });
      window.location.assign(r.url);
    } catch (err) { setPayMsg(err.message); setBusyPlan(""); }
  };
  const plans = buildCards(planList);
  const comparison = COMPARE.map(([feature, fn]) => ({ feature, cells: planList.map((p) => fn(p.limits, p.key)) }));

  const getPrice = (p) => p.name === "Free" ? p.monthly : (cycle === "monthly" ? p.monthly : p.annual);
  const period = cycle === "monthly" ? "/month" : "/year";

  return (
    <div>
      <header style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 3rem", borderBottom: "1px solid var(--rule)", paddingBottom: "2rem" }}>
        <div className="eyebrow" style={{ paddingLeft: 0, display: "block" }}>Pricing</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.75rem", color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
          Choose your plan.
        </h1>
        <p className="lede">
          Free to start. Premium tiers unlock the AI coaching, gap
          analysis, and unlimited recommendations.
        </p>
        <div style={{ display: "inline-block", marginTop: "1rem", padding: "0.5rem 1rem", background: "var(--success-soft)", borderRadius: "var(--r-full)", fontSize: "0.9rem", fontWeight: 600, color: "var(--ink)" }}>
          🎉 Every new account starts with a 14-day free trial of Professional
        </div>
        {refDiscount && (
          <div style={{ marginTop: "0.75rem", padding: "0.5rem 1rem", background: "var(--success-soft)", borderRadius: "var(--r-md)", fontSize: "0.9rem", color: "var(--success-deep)", display: "inline-block" }}>
            You have {refDiscount.percent}% off{refDiscount.from ? ` from ${refDiscount.from}` : ""}
            {refDiscount.duration === "forever" ? " on every bill" : refDiscount.duration === "repeating" ? ` for your first ${refDiscount.months} months` : " your first bill"}
            {" "}— {loggedIn ? "applied automatically at checkout." : "sign up to use it."}
          </div>
        )}
        {billing?.test_mode && (
          <div style={{ marginTop: "0.75rem", fontSize: "0.82rem", color: "var(--warn)", fontWeight: 600 }}>
            Stripe TEST MODE — use card 4242 4242 4242 4242, any future date, any CVC. No real charges.
          </div>
        )}
        {payMsg && <div style={{ marginTop: "0.75rem", fontSize: "0.88rem", color: "var(--ink)", background: "var(--warn-soft)", padding: "0.5rem 0.9rem", borderRadius: "var(--r-md)", display: "inline-block" }}>{payMsg}</div>}

        <div style={{ display: "inline-flex", marginTop: "2rem", border: "1px solid var(--rule)", background: "var(--surface)", padding: "4px" }}>
          {[
            { id: "monthly", label: "Monthly" },
            { id: "annual", label: "Annual · save ~17%" }
          ].map((b) => (
            <button
              key={b.id}
              onClick={() => setCycle(b.id)}
              style={{
                padding: "0.6rem 1.25rem",
                border: "none",
                background: cycle === b.id ? "var(--ink)" : "transparent",
                color: cycle === b.id ? "var(--paper)" : "var(--ink-muted)",
                fontFamily: "inherit",
                fontSize: "0.78rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main plans */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1.25rem", marginBottom: "4rem" }}>
        {plans.map((plan) => (
          <article
            key={plan.name}
            className="card"
            style={{
              padding: "2rem",
              position: "relative",
              borderTop: plan.popular ? "3px solid var(--gold)" : "1px solid var(--rule)",
              boxShadow: plan.popular ? "var(--shadow-md)" : "var(--shadow-sm)"
            }}
          >
            {plan.popular && (
              <div
                style={{
                  position: "absolute",
                  top: "-1px",
                  right: "2rem",
                  background: "var(--gold)",
                  color: "var(--ink)",
                  padding: "0.3rem 0.85rem",
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase"
                }}
              >
                Most Popular
              </div>
            )}

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--ink)" }}>{plan.name}</div>
              <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>{plan.tagline}</p>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "2.75rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{getPrice(plan)}</span>
                {plan.name !== "Free" && <span className="muted">{period}</span>}
              </div>
              {plan.savings && cycle === "annual" && (
                <p style={{ fontSize: "0.78rem", color: "var(--success)", fontWeight: 600, marginTop: "0.4rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {plan.savings}
                </p>
              )}
            </div>

            <button
              className={plan.popular ? "button" : "button ghost"}
              style={{ width: "100%", marginBottom: "1.5rem" }}
              disabled={!!busyPlan || (billing?.plan === plan.key && plan.key !== "free")}
              onClick={() => choose(plan.key)}
            >
              {busyPlan === plan.key ? "Opening secure checkout…" : billing?.plan === plan.key && plan.key !== "free" ? "Your current plan ✓" : plan.cta}
            </button>

            <div style={{ borderTop: "1px solid var(--rule-soft)", paddingTop: "1.25rem" }}>
              <ul className="list">
                {plan.features.map((f, idx) => (
                  <li key={idx} style={{ fontSize: "0.88rem", color: f.startsWith("Everything") ? "var(--ink-muted)" : "var(--ink-soft)", fontWeight: f.startsWith("Everything") ? 600 : 400 }}>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.limitations && plan.limitations.length > 0 && (
                <>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginTop: "1.5rem", marginBottom: "0.5rem" }}>
                    Not included
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {plan.limitations.map((l, idx) => (
                      <li
                        key={idx}
                        style={{
                          padding: "0.25rem 0 0.25rem 1.25rem",
                          fontSize: "0.82rem",
                          color: "var(--ink-faint)",
                          position: "relative",
                          textDecoration: "line-through"
                        }}
                      >
                        <span style={{ position: "absolute", left: 0, top: 0, color: "var(--error)" }}>×</span>
                        {l}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </article>
        ))}
      </section>

      {/* Feature comparison */}
      <section className="card" style={{ padding: "2rem", marginBottom: "2rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.5rem", marginBottom: "1.25rem", textAlign: "center" }}>Compare plans</h2>
        {/* tabIndex + role: the table scrolls sideways on a phone, so keyboard users need to reach it */}
        <div className="table-scroll" style={{ overflowX: "auto" }} tabIndex={0} role="region" aria-label="Plan comparison table">
          <table style={{ width: "100%", minWidth: "560px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Feature</th>
                {planList.map((p) => <th key={p.key}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.feature}>
                  <td style={{ fontWeight: 600, color: "var(--ink)" }}>{row.feature}</td>
                  {row.cells.map((v, i) => (
                    <td key={planList[i].key} style={{ textAlign: "center" }}><Cell value={v} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payment */}
      <section className="card" style={{ padding: "2.5rem", background: "var(--surface-warm)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Billing &amp; payment</h2>
          <p className="muted">All prices are in US dollars. Cancel any time — no lock-in, no hidden fees.</p>
        </div>
        <div className="grid three">
          <PaymentBlock title="Billing" items={["Monthly or annual", "Annual saves ~17%", "Upgrade or downgrade any time", "Changes are prorated automatically"]} />
          <PaymentBlock title="Payment methods" items={["Visa, Mastercard, American Express", "Apple Pay & Google Pay on supported devices", "Charged in USD", "Secure checkout by Stripe"]} />
          <PaymentBlock title="Your control" items={["Cancel any time from Settings", "Keep access until the period ends", "Invoices &amp; receipts in your billing portal", "Card details never touch our servers"]} />
        </div>
        <p className="text-muted" style={{ textAlign: "center", fontSize: "0.78rem", marginTop: "1.5rem", marginBottom: 0 }}>
          Payments are processed by Stripe. Your card details are entered on Stripe's secure page and are never stored by MyEduPort.
        </p>
      </section>

      <section className="card dark" style={{ textAlign: "center", padding: "2.5rem", marginTop: "2rem" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--paper)", marginBottom: "0.5rem" }}>
          Questions about pricing?
        </h3>
        <p style={{ color: "var(--paper-deep)", fontFamily: "var(--font-serif)", fontStyle: "italic", marginBottom: "1.5rem" }}>
          We're happy to help you find the right plan.
        </p>
        <Link to="/contact" className="button gold">Contact support</Link>
      </section>
    </div>
  );
}

function PaymentBlock({ title, items }) {
  return (
    <div>
      <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.85rem" }}>{title}</div>
      <ul className="list">
        {items.map((i) => <li key={i} style={{ fontSize: "0.88rem" }}>{i}</li>)}
      </ul>
    </div>
  );
}
