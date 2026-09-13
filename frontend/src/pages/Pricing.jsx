import React, { useState } from "react";

const plans = {
  free: {
    name: "Free",
    tagline: "Get started with the basics",
    monthly: "$0",
    annual: "$0",
    features: [
      "Create basic student profile",
      "Manual portfolio builder (no AI assistance)",
      "University database (search only)",
      "Timeline template (not personalized)",
      "Document storage: 100MB",
      "3 EduBot questions (one-time)"
    ],
    limitations: [
      "No AI acceptance predictions",
      "No personalized recommendations",
      "No gap analysis",
      "No parent dashboard",
      "No export"
    ],
    cta: "Start free",
    popular: false
  },
  essential: {
    name: "Essential",
    tagline: "For students getting started",
    monthly: "$29",
    annual: "$290",
    savings: "Save $58 / yr",
    features: [
      "Everything in Free, plus:",
      "Complete AI portfolio builder",
      "AI acceptance predictions (10 universities)",
      "Reach / Target / Safety matching",
      "Basic gap analysis",
      "Personalized timeline with reminders",
      "Document storage: 3GB",
      "30 EduBot queries / month",
      "PDF portfolio export"
    ],
    cta: "Start Essential",
    popular: true
  },
  professional: {
    name: "Professional",
    tagline: "For ambitious students targeting top universities",
    monthly: "$49",
    annual: "$490",
    savings: "Save $98 / yr",
    features: [
      "Everything in Essential, plus:",
      "Unlimited AI acceptance predictions",
      "Comprehensive gap analysis with roadmap",
      "150 EduBot queries / month",
      "All country guides (US, UK, China, EU)",
      "Field-specific guidance",
      "Essay analyzer (5 essays / month)",
      "Parent dashboard",
      "Document storage: 10GB"
    ],
    cta: "Start Professional",
    popular: false
  }
};

export default function Pricing() {
  const [cycle, setCycle] = useState("monthly");

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
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem", marginBottom: "4rem" }}>
        {Object.values(plans).map((plan) => (
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
            >
              {plan.cta}
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

      {/* Payment */}
      <section className="card" style={{ padding: "2.5rem", background: "var(--surface-warm)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Flexible payment options</h2>
          <p className="muted">No hidden fees. 30-day money-back guarantee. Cancel anytime.</p>
        </div>
        <div className="grid three">
          <PaymentBlock title="Plans" items={["Monthly subscription", "Annual (save ~17%)", "Upgrade anytime", "Downgrade anytime"]} />
          <PaymentBlock title="Methods" items={["Credit / Debit", "PayPal", "Apple Pay / Google Pay", "Alipay, WeChat Pay"]} />
          <PaymentBlock title="Guarantee" items={["30-day money-back", "No hidden fees", "Cancel anytime", "Prorated refunds"]} />
        </div>
      </section>

      <section className="card dark" style={{ textAlign: "center", padding: "2.5rem", marginTop: "2rem" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--paper)", marginBottom: "0.5rem" }}>
          Questions about pricing?
        </h3>
        <p style={{ color: "var(--paper-deep)", fontFamily: "var(--font-serif)", fontStyle: "italic", marginBottom: "1.5rem" }}>
          We're happy to help you find the right plan.
        </p>
        <button className="button gold">Contact support</button>
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
