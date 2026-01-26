import React, { useState } from "react";

const plans = {
  free: {
    name: "Free",
    tagline: "Get started with basic tools",
    monthly: "$0",
    annual: "$0",
    features: [
      "Create basic student profile",
      "Manual portfolio builder (no AI assistance)",
      "Access to university database (search only)",
      "General college prep resources and blog",
      "Timeline template (not personalized)",
      "Document storage: 100MB",
      "Community forum access",
      "3 AI chatbot questions (one-time)"
    ],
    limitations: [
      "No AI acceptance predictions",
      "No personalized recommendations",
      "No gap analysis",
      "No parent dashboard",
      "No export/sharing capabilities",
      "Basic support only (email, 48hr response)"
    ],
    color: "#64748b",
    buttonText: "Get Started Free",
    popular: false
  },
  essential: {
    name: "Essential",
    tagline: "Perfect for students getting started",
    monthly: "$29",
    annual: "$290",
    savings: "Save $58/year",
    features: [
      "Everything in Free, plus:",
      "Complete AI-powered portfolio builder",
      "Basic AI acceptance predictions (up to 10 universities)",
      "University recommendations (Reach/Target/Safety)",
      "Basic gap analysis (identifies major gaps only)",
      "Personalized timeline with reminders",
      "Document storage: 3GB",
      "30 AI chatbot queries per month",
      "Country-specific guides (US, UK, or China - choose one)",
      "Email support (24hr response)",
      "Export portfolio as PDF",
      "Basic analytics dashboard"
    ],
    color: "#2563eb",
    buttonText: "Start Essential Plan",
    popular: true
  },
  professional: {
    name: "Professional",
    tagline: "For serious students targeting top universities",
    monthly: "$49",
    annual: "$490",
    savings: "Save $98/year",
    features: [
      "Everything in Essential, plus:",
      "Unlimited AI acceptance predictions (any number of universities)",
      "Advanced AI recommendations with detailed explanations",
      "Comprehensive gap analysis with impact predictions and improvement roadmap",
      "AI chatbot: 150 queries/month (5/day average)",
      "All country guides (US, UK, China, EU access)",
      "Field-of-study specific guidance (detailed major exploration)",
      "Essay analyzer with AI feedback (up to 5 essays/month)",
      "Parent dashboard with progress monitoring",
      "Advanced analytics and reports (monthly progress reports)",
      "Competition analysis (see how you compare to typical admits)",
      "Document storage: 10GB",
      "Priority email support (12hr response)",
      "Live chat support (business hours)",
      "Video tutorials and webinars (exclusive access)",
      "Recommendation letter tracker and templates"
    ],
    color: "#7c3aed",
    buttonText: "Start Professional Plan",
    popular: false
  },
  elite: {
    name: "Elite",
    tagline: "White-glove service for top-tier applicants",
    monthly: "$99",
    annual: "$990",
    twoYear: "$1,749",
    savings: "Save $198/year",
    savings2Year: "Save $626 (26% discount)",
    features: [
      "Everything in Professional, plus:",
      "Unlimited AI chatbot queries",
      "Personal success advisor (1 video call per month, 30 min)",
      "Essay editing service (1 professional edit per month, included)",
      "Interview preparation (AI mock interviews + feedback)",
      "Unlimited essay analysis with detailed AI feedback",
      "Advanced 'What-if' scenario modeling (test impact of improvements)",
      "Early access to new features",
      "Custom university research reports (on-demand)",
      "Document storage: 50GB",
      "24/7 priority support (phone, email, chat)",
      "Dedicated success manager (for 2-year plan)",
      "Portfolio review by admission expert (2x per year)",
      "Exclusive networking events (virtual with successful students/counselors)",
      "College application checklist and deadline management",
      "Financial aid and scholarship guidance"
    ],
    color: "#f59e0b",
    buttonText: "Start Elite Plan",
    popular: false
  }
};

const familyPlans = {
  essential: {
    name: "Essential Family",
    monthly: "$49",
    annual: "$490",
    students: "2-3 students",
    features: [
      "All Essential features per student",
      "Shared parent dashboard",
      "$19 savings per additional student"
    ]
  },
  professional: {
    name: "Professional Family",
    monthly: "$89",
    annual: "$890",
    students: "2-3 students",
    features: [
      "All Professional features per student",
      "Shared parent dashboard",
      "$49 savings per additional student"
    ]
  },
  elite: {
    name: "Elite Family",
    monthly: "$169",
    annual: "$1,690",
    students: "2-3 students",
    features: [
      "All Elite features per student",
      "Shared success advisor for all students",
      "$129 savings per additional student"
    ]
  }
};

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState("monthly"); // "monthly" or "annual"

  const getPrice = (plan, cycle) => {
    if (plan.name === "Free") return plan.monthly;
    return cycle === "monthly" ? plan.monthly : plan.annual;
  };

  const getPeriod = (cycle) => {
    return cycle === "monthly" ? "/month" : "/year";
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: "700", marginBottom: "1rem", background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Choose Your Plan
        </h1>
        <p style={{ fontSize: "1.25rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
          Start your journey to top universities with AI-powered guidance
        </p>

        {/* Billing Toggle */}
        <div style={{ display: "inline-flex", background: "var(--bg-tertiary)", padding: "0.5rem", borderRadius: "0.75rem", gap: "0.5rem" }}>
          <button
            onClick={() => setBillingCycle("monthly")}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: billingCycle === "monthly" ? "var(--primary)" : "transparent",
              color: billingCycle === "monthly" ? "#fff" : "var(--text-primary)",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: billingCycle === "annual" ? "var(--primary)" : "transparent",
              color: billingCycle === "annual" ? "#fff" : "var(--text-primary)",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            Annual
            <span style={{ fontSize: "0.75rem", marginLeft: "0.25rem", opacity: 0.9 }}>(Save ~17%)</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "4rem" }}>
        {Object.values(plans).map((plan) => (
          <div
            key={plan.name}
            className="card"
            style={{
              position: "relative",
              border: plan.popular ? `3px solid ${plan.color}` : "1px solid var(--border)",
              borderRadius: "1rem",
              padding: "2rem",
              transition: "all 0.3s ease",
              transform: plan.popular ? "scale(1.05)" : "scale(1)",
              boxShadow: plan.popular ? "var(--shadow-xl)" : "var(--shadow)"
            }}
            onMouseEnter={(e) => {
              if (!plan.popular) {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
              }
            }}
            onMouseLeave={(e) => {
              if (!plan.popular) {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "var(--shadow)";
              }
            }}
          >
            {plan.popular && (
              <div
                style={{
                  position: "absolute",
                  top: "-12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: plan.color,
                  color: "#fff",
                  padding: "0.25rem 1rem",
                  borderRadius: "1rem",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}
              >
                Most Popular
              </div>
            )}

            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem", color: plan.color }}>
                {plan.name}
              </h2>
              <p className="muted" style={{ fontSize: "0.875rem" }}>{plan.tagline}</p>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "3rem", fontWeight: "700", color: plan.color }}>
                  {getPrice(plan, billingCycle)}
                </span>
                {plan.name !== "Free" && (
                  <span style={{ fontSize: "1.25rem", color: "var(--text-secondary)" }}>
                    {getPeriod(billingCycle)}
                  </span>
                )}
              </div>
              {plan.savings && billingCycle === "annual" && (
                <p style={{ fontSize: "0.875rem", color: "var(--success)", fontWeight: "600" }}>
                  {plan.savings}
                </p>
              )}
              {plan.savings2Year && plan.name === "Elite" && (
                <p style={{ fontSize: "0.875rem", color: "var(--success)", fontWeight: "600", marginTop: "0.25rem" }}>
                  2-Year: {plan.twoYear} ({plan.savings2Year})
                </p>
              )}
            </div>

            <button
              className="button"
              style={{
                width: "100%",
                marginBottom: "1.5rem",
                background: plan.color,
                color: "#fff",
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                fontWeight: "600"
              }}
            >
              {plan.buttonText}
            </button>

            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "1.5rem" }}>
              <h3 style={{ fontSize: "0.875rem", fontWeight: "700", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                Features
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    style={{
                      padding: "0.5rem 0",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "start",
                      gap: "0.5rem"
                    }}
                  >
                    <span style={{ color: plan.color, fontSize: "1rem", lineHeight: "1.2" }}>✓</span>
                    <span style={{ color: feature.startsWith("Everything") ? "var(--text-secondary)" : "var(--text-primary)", fontWeight: feature.startsWith("Everything") ? "600" : "400" }}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.limitations && plan.limitations.length > 0 && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-light)" }}>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: "700", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                    Limitations
                  </h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {plan.limitations.map((limitation, idx) => (
                      <li
                        key={idx}
                        style={{
                          padding: "0.5rem 0",
                          fontSize: "0.875rem",
                          display: "flex",
                          alignItems: "start",
                          gap: "0.5rem",
                          color: "var(--text-secondary)"
                        }}
                      >
                        <span style={{ color: "var(--error)", fontSize: "1rem" }}>✗</span>
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Family Plans Section */}
      <div style={{ marginBottom: "4rem" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: "700", textAlign: "center", marginBottom: "1rem" }}>
          Family Plans
        </h2>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "2rem" }}>
          Perfect for families with multiple students
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {Object.values(familyPlans).map((plan) => (
            <div key={plan.name} className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem" }}>{plan.name}</h3>
              <p className="muted" style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>{plan.students}</p>
              <div style={{ marginBottom: "1rem" }}>
                <span style={{ fontSize: "2rem", fontWeight: "700", color: "var(--primary)" }}>
                  {billingCycle === "monthly" ? plan.monthly : plan.annual}
                </span>
                <span style={{ fontSize: "1rem", color: "var(--text-secondary)", marginLeft: "0.25rem" }}>
                  {billingCycle === "monthly" ? "/month" : "/year"}
                </span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    style={{
                      padding: "0.5rem 0",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "start",
                      gap: "0.5rem"
                    }}
                  >
                    <span style={{ color: "var(--success)", fontSize: "1rem" }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                className="button"
                style={{
                  width: "100%",
                  marginTop: "1rem",
                  background: "var(--primary)",
                  color: "#fff"
                }}
              >
                Choose Family Plan
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Options */}
      <div className="card" style={{ padding: "2rem", background: "var(--bg-secondary)" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", textAlign: "center" }}>
          Flexible Payment Options
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.75rem" }}>Payment Plans</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ Monthly Subscription</li>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ Annual (Save ~17%)</li>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ 2-Year Plan (Elite only)</li>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ 3-Year Plan (Elite only)</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.75rem" }}>Payment Methods</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ Credit/Debit Cards</li>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ PayPal</li>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ Apple Pay / Google Pay</li>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ Alipay, WeChat Pay</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.75rem" }}>Billing Transparency</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ 30-day money-back guarantee</li>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ No hidden fees</li>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ Cancel anytime</li>
              <li style={{ padding: "0.5rem 0", fontSize: "0.875rem" }}>✓ Prorated refunds</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ or Additional Info */}
      <div style={{ textAlign: "center", marginTop: "3rem", padding: "2rem", background: "linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)", borderRadius: "1rem" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem" }}>
          Questions about pricing?
        </h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          All plans include a 30-day money-back guarantee. Cancel anytime with no questions asked.
        </p>
        <button className="button" style={{ background: "var(--primary)", color: "#fff" }}>
          Contact Support
        </button>
      </div>
    </div>
  );
}
