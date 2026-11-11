import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { fmtDate } from "../utils/date.js";

// "My plan": what the student's plan includes, how much of each monthly allowance is used,
// and a link straight to each feature. Built from the same limits as the Pricing page
// (Admin → Plan Settings) plus this month's usage from /api/students/me/plan.

const PLAN_NAMES = { free: "Free", essential: "Essential", professional: "Professional", elite: "Elite" };
const BUILDER = { free: "Basic", essential: "AI-assisted", professional: "Full AI", elite: "Full AI" };

// One row per feature the plan can include
function rowsFor(planKey, l, q, u) {
  const free = planKey === "free";
  const per = (n) => (free ? (n === 1 ? "1 time" : `${n} in total`) : `${n} / month`);
  const meter = (quota) => (quota && quota.limit > 0 ? { used: quota.used || 0, limit: quota.limit } : null);
  return [
    { key: "builder", on: true, title: `${BUILDER[planKey] || "AI-assisted"} portfolio builder`, detail: l.adviai ? "MEPAi advice in every Portfolio section" : "Build your portfolio section by section", to: "/profile", cta: "Open Portfolio" },
    { key: "essay", on: !!l.essay_feedback, title: "MEPAi essay score & Personal Statement guidance", detail: l.essay_feedback === -1 ? "Unlimited" : `${per(l.essay_feedback)} · shared by both`, meter: l.essay_feedback === -1 ? null : meter(q?.essay_feedback), to: "/profile?section=documents", cta: "Score an essay" },
    { key: "mepai_activity", on: !!l.essay_feedback, title: "MEPAi help with activities", detail: l.essay_feedback === -1 ? "Unlimited" : `Guidance and description writer · ${per(l.essay_feedback)}`, meter: l.essay_feedback === -1 ? null : meter(u?.essai_activity), to: "/profile?section=extracurriculars", cta: "Open activities" },
    { key: "mepai_award", on: !!l.essay_feedback, title: "MEPAi help with awards", detail: l.essay_feedback === -1 ? "Unlimited" : `Guidance and description writer · ${per(l.essay_feedback)}`, meter: l.essay_feedback === -1 ? null : meter(u?.essai_award), to: "/profile?section=awards", cta: "Open awards" },
    { key: "grammar", on: !!l.essay_feedback, title: "MEPAi grammar check", detail: l.essay_feedback === -1 ? "Unlimited" : `${per(l.essay_feedback)} · on every writing page`, meter: l.essay_feedback === -1 ? null : meter(u?.essay_revise), to: "/profile", cta: "Open Portfolio" },
    { key: "match", on: !!l.match, title: "MEPAi university match", detail: l.match === -1 ? "Unlimited universities" : `Up to ${l.match} universities`, to: "/recommendations", cta: "Find matches" },
    { key: "prediction", on: l.prediction !== "none" && !!l.prediction, title: `${l.prediction === "advanced" ? "Advanced" : "Basic"} acceptance prediction`, detail: l.prediction === "advanced" ? "A chance for each saved university, with what would raise it" : "Your average chance across your saved universities", to: "/dashboard", cta: "See prediction" },
    { key: "export", on: !!l.export, title: "Export PDF portfolio", detail: "A designed PDF of your whole portfolio", to: "/export", cta: "Create PDF" },
    { key: "gap", on: !!l.gap, title: "Gap analysis & next steps", detail: "What's missing and what to do next, in order", to: "/dashboard", cta: "See next steps" },
    { key: "edubot", on: !!l.edubot, title: "EduBot queries", detail: l.edubot === -1 ? "Unlimited" : free ? `${l.edubot} questions (one-time)` : `${l.edubot} / month`, meter: l.edubot === -1 ? null : meter(q?.edubot), to: "/chat", cta: "Ask EduBot" },
    { key: "parent", on: !!l.parent_dashboard, title: "Parent dashboard", detail: "A parent can follow your portfolio with your invite code", to: "/settings", cta: "Get invite code" },
    { key: "advisor", on: !!l.advisor, title: "Human advisor session", detail: l.advisor === -1 ? "Unlimited" : `${l.advisor} / month`, meter: meter(q?.advisor), to: "/dashboard", cta: "Book a session" }
  ];
}

function Meter({ used, limit }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const left = Math.max(0, limit - used);
  const color = left === 0 ? "var(--error-deep)" : pct >= 80 ? "#b45309" : "var(--teal-deep, #0f766e)";
  return (
    <div style={{ marginTop: "0.5rem", maxWidth: 320 }}>
      <div style={{ height: 6, borderRadius: 6, background: "var(--rule)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <div style={{ fontSize: "0.75rem", color, marginTop: "0.25rem", fontWeight: 600 }}>
        {used} of {limit} used · {left === 0 ? "none left" : `${left} left`}
      </div>
    </div>
  );
}

export default function MyPlan() {
  const [me, setMe] = useState(null);
  const [usage, setUsage] = useState(null); // MEPAi writing counters (guidance, grammar)
  const [plans, setPlans] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiFetch("/api/students/me/plan").then(setMe).catch((e) => setErr(e.message));
    apiFetch("/api/options/plans").then((d) => setPlans(Array.isArray(d) ? d : [])).catch(() => {});
    apiFetch("/api/ai/usage").then(setUsage).catch(() => {});
  }, []);

  if (err) return <div className="card"><p style={{ color: "var(--error-deep)", margin: 0 }}>{err}</p></div>;
  if (!me) return <p className="muted">Loading…</p>;

  const planKey = me.plan;
  const mine = plans.find((p) => p.key === planKey);
  const limits = mine?.limits || { ...me.features, edubot: me.quota?.edubot?.limit, essay_feedback: me.quota?.essay_feedback?.limit };
  const rows = rowsFor(planKey, limits, me.quota, usage);
  const included = rows.filter((r) => r.on);
  const idx = plans.findIndex((p) => p.key === planKey);
  const next = idx >= 0 ? plans[idx + 1] : null;
  const prev = idx > 0 ? plans[idx - 1] : null;
  const notIncluded = next ? rowsFor(next.key, next.limits, null, null).filter((r) => r.on && !included.some((i) => i.title === r.title)) : [];
  const resets = planKey === "free" ? null : (() => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); })();

  return (
    <div style={{ maxWidth: 860 }}>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.25rem", marginBottom: "1.5rem" }}>
        <div className="eyebrow">My plan</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>
            {PLAN_NAMES[planKey] || planKey}
          </h1>
          {mine && mine.monthly > 0 && <span className="muted">${mine.monthly} / month</span>}
          {me.trial?.active && <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>Free trial · ends {fmtDate(me.trial.ends_at)}</span>}
        </div>
        <p className="lede" style={{ marginTop: "0.5rem" }}>
          {prev ? <>Everything in {prev.name}, plus the tools below.</> : <>Here's everything your plan includes.</>}
          {resets && <> Monthly allowances reset on {fmtDate(resets)}.</>}
        </p>
      </header>

      <section className="card" style={{ padding: "0.5rem 1.5rem", marginBottom: "1.5rem" }}>
        {included.map((r, i) => (
          <div key={r.key} style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "1rem 0", borderTop: i ? "1px solid var(--rule-soft, var(--rule))" : "none", flexWrap: "wrap" }}>
            <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--success-soft)", color: "var(--success-deep)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>✓</span>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "var(--ink)" }}>{r.title}</div>
              <div className="muted" style={{ fontSize: "0.85rem" }}>{r.detail}</div>
              {r.meter && <Meter {...r.meter} />}
            </div>
            <Link to={r.to} className="button ghost" style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}>{r.cta} →</Link>
          </div>
        ))}
      </section>

      {next && notIncluded.length > 0 && (
        <section className="card" style={{ padding: "1.5rem", background: "var(--surface-warm, #f8fafc)" }}>
          <h2 className="section-title" style={{ fontSize: "1.15rem", marginBottom: "0.25rem" }}>Not in your plan</h2>
          <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "0.75rem" }}>Included with {next.name}{next.monthly ? ` ($${next.monthly} / month)` : ""}:</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.45rem" }}>
            {notIncluded.map((r) => (
              <li key={r.key} style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}><span aria-hidden="true" style={{ color: "var(--ink-muted)", marginRight: "0.4rem" }}>+</span><strong style={{ color: "var(--ink)" }}>{r.title}</strong> — {r.detail}</li>
            ))}
          </ul>
          <Link to="/pricing" className="button" style={{ marginTop: "1rem", display: "inline-block" }}>Compare plans</Link>
        </section>
      )}
    </div>
  );
}
