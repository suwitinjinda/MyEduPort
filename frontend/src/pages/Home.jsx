import React from "react";
import { NavLink, Navigate } from "react-router-dom";
import { PORTFOLIO_GUIDE } from "../components/AdvisoryNote.jsx";
import { getToken, getUserRole } from "../api/client";

export default function Home() {
  // Logged-in users skip the marketing home and go straight to their dashboard.
  if (getToken()) {
    const role = getUserRole();
    const dest = role === "parent" ? "/parent" : role === "counselor" ? "/counselor" : "/dashboard";
    return <Navigate to={dest} replace />;
  }
  return (
    <div className="grid" style={{ gap: "3rem" }}>
      {/* ============== Hero with photo ============== */}
      <section
        className="hero"
        style={{
          padding: 0,
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          alignItems: "stretch",
          overflow: "hidden",
          minHeight: "440px"
        }}
      >
        <div style={{ padding: "3.5rem 3rem", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1 style={{ fontSize: "2.75rem", marginBottom: "0.65rem" }}>
            MyEduPort:<br/>Your Future, Structured.
          </h1>
          <p style={{ fontSize: "1.15rem", maxWidth: "44ch" }}>
            AI-Powered University Guidance & Portfolio for Grades 9–13.
          </p>
          <div style={{ display: "flex", gap: "0.85rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
            <NavLink className="button white" to="/login">
              Student Sign Up
            </NavLink>
            <NavLink className="button ghost" to="/login" style={{ borderColor: "rgba(255,255,255,0.5)", color: "#fff", background: "transparent" }}>
              Parent Sign Up
            </NavLink>
          </div>
        </div>

        <div
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative"
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, rgba(31,52,97,0.4) 0%, rgba(31,52,97,0) 30%)"
            }}
          />
        </div>
      </section>

      {/* ============== Three features ============== */}
      <section className="grid three" style={{ marginTop: "0.5rem" }}>
        <FeatureCard
          icon={<DocumentIcon />}
          title="Build Your Portfolio"
          text="Track academics, activities, awards, and essays in one structured profile — built for grades 9 through 13."
        />
        <FeatureCard
          icon={<BrainIcon />}
          title="Get AI Recommendations"
          text="Claude-powered gap analysis, acceptance probability, and personalized next steps based on your profile."
        />
        <FeatureCard
          icon={<ChartIcon />}
          title="Track Your Progress"
          text="See your portfolio strength score, completion %, and what to do next — updated as you build."
        />
      </section>

      {/* ============== Holistic Review Framework ============== */}
      <section>
        <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 2.5rem" }}>
          <span className="eyebrow">The Holistic Review Framework</span>
          <h2 className="section-title" style={{ fontSize: "2rem", marginTop: "0.5rem" }}>
            What top universities actually weigh
          </h2>
          <p className="lede" style={{ marginTop: "0.5rem" }}>
            Perfect grades make you qualified, not admitted. We structure every
            section of your portfolio around the four pillars admissions officers genuinely use.
          </p>
        </div>

        <div className="grid four">
          {PORTFOLIO_GUIDE.weights.map((w, idx) => (
            <div key={w.label} className="card">
              <div style={{ fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--teal-deep)", fontWeight: 700 }}>
                Pillar {String(idx + 1).padStart(2, "0")}
              </div>
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  color: "var(--navy)",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  margin: "0.75rem 0 0.5rem"
                }}
              >
                {w.weight}<span style={{ fontSize: "1.15rem", color: "var(--ink-muted)", fontWeight: 600 }}>%</span>
              </div>
              <div className="subtitle" style={{ marginBottom: "0.35rem" }}>{w.label}</div>
              <p className="muted" style={{ fontSize: "0.88rem" }}>{w.note}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <NavLink className="button ghost" to="/guide">
            Read the full Portfolio Guide →
          </NavLink>
        </div>
      </section>

      {/* ============== For students / For parents ============== */}
      <section>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.8rem" }}>
            Built for students, parents, and counselors.
          </h2>
        </div>

        <div className="grid three">
          <RoleCard
            badge="For Students · Grades 9–13"
            title="Your portfolio, scored as you build it."
            text="Capture academics, activities, awards, and essays. AI returns a strength score, gap analysis, and prioritized next steps."
            items={[
              "Track academics, tests, and activities",
              "AI strength score + category breakdown",
              "Reach / Target / Safety university matching",
              "EduBot — personalized admissions coaching"
            ]}
            cta="Start your portfolio"
            ctaTo="/login"
          />
          <RoleCard
            badge="For Parents"
            title="See progress without managing it."
            text="Link to your student's portfolio with a single invite code. Stay informed about milestones without being intrusive."
            items={[
              "Link via student invite code",
              "Portfolio completion dashboard",
              "Activity, award, and document timeline",
              "Notifications on milestone changes"
            ]}
            cta="Set up parent access"
            ctaTo="/login"
            ghost
          />
          <RoleCard
            badge="For Counselors"
            title="Advise multiple students from one dashboard."
            text="Read-only access to each linked student's full portfolio with completion percentage and acceptance probability."
            items={[
              "Multi-student dashboard",
              "Per-student completion %",
              "Full 9-tab portfolio view",
              "Acceptance probability tracking"
            ]}
            cta="Counselor access"
            ctaTo="/login"
            ghost
          />
        </div>
      </section>

      {/* ============== Closing CTA ============== */}
      <section
        className="card dark"
        style={{
          background: "var(--grad)",
          padding: "3.5rem 3rem",
          textAlign: "center",
          borderRadius: "var(--r-xl)"
        }}
      >
        <h2 style={{ color: "#fff", fontSize: "2rem", marginBottom: "0.75rem", maxWidth: "22ch", margin: "0 auto 0.75rem" }}>
          Begin the portfolio that gets you in.
        </h2>
        <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "1.05rem", marginBottom: "1.75rem", maxWidth: "48ch", margin: "0 auto 1.75rem" }}>
          Free to start. No credit card. Cancel anytime.
        </p>
        <NavLink className="button white" to="/login">
          Create your portfolio →
        </NavLink>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
      <div
        style={{
          width: "64px",
          height: "64px",
          margin: "0 auto 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--teal-soft)",
          borderRadius: "var(--r-md)",
          color: "var(--teal-deep)"
        }}
      >
        {icon}
      </div>
      <div className="subtitle" style={{ marginBottom: "0.5rem", fontSize: "1.15rem" }}>{title}</div>
      <p className="muted" style={{ fontSize: "0.95rem" }}>{text}</p>
    </div>
  );
}

function RoleCard({ badge, title, text, items, cta, ctaTo, ghost }) {
  return (
    <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column" }}>
      <span className="badge primary" style={{ alignSelf: "flex-start", marginBottom: "1rem" }}>{badge}</span>
      <h3 className="subtitle" style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>{title}</h3>
      <p className="muted" style={{ marginBottom: "1.25rem", flex: 1 }}>{text}</p>
      <ul className="list" style={{ marginBottom: "1.5rem" }}>
        {items.map((i) => (
          <li key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <CheckIcon /> <span>{i}</span>
          </li>
        ))}
      </ul>
      <NavLink className={ghost ? "button ghost" : "button"} to={ctaTo}>
        {cta} →
      </NavLink>
    </div>
  );
}

function DocumentIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <polyline points="3 7 9 11 15 5 21 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal-deep)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: "0.2rem", flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
