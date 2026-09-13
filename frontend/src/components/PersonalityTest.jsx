import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";

// Big Five display order + plain-language framing (matches DevSpec §1)
const FACTOR_META = [
  { code: "I", name: "Intellect", desc: "Curiosity, ideas" },
  { code: "A", name: "Agreeableness", desc: "Warmth, empathy" },
  { code: "C", name: "Conscientiousness", desc: "Discipline, order" },
  { code: "E", name: "Extraversion", desc: "Sociability, energy" },
  { code: "ES", name: "Emotional Stability", desc: "Calm under stress" }
];
const bandStyle = (b) =>
  b === "High" ? { bg: "rgba(16,185,129,0.10)", c: "var(--teal-deep)" }
  : b === "Above average" ? { bg: "rgba(31,52,97,0.08)", c: "var(--ink-soft)" }
  : b === "Below average" ? { bg: "rgba(245,158,11,0.14)", c: "#b45309" }
  : { bg: "var(--rule-soft)", c: "var(--ink-faint)" };

const GRAD = "linear-gradient(135deg, var(--navy) 0%, var(--teal) 100%)";

// COPPA: Grade 6/7 (Year 7/8) students are typically under 13
const isUnder13 = (g) => !!g && /Grade 6\b|Grade 7\b|Year 7\b|Year 8\b/i.test(g);

export default function PersonalityTest({ adviaiOn, gradeLevel, ready = true }) {
  const [view, setView] = useState("intro"); // intro | test | report
  const [items, setItems] = useState([]);
  const [scale, setScale] = useState(null);
  const [responses, setResponses] = useState({});
  const [idx, setIdx] = useState(0);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [consent, setConsent] = useState(false);
  const [history, setHistory] = useState([]);

  const needsConsent = isUnder13(gradeLevel);
  const advanceTimer = useRef(null);

  useEffect(() => {
    if (!ready || !adviaiOn) return;
    apiFetch("/api/personality/latest").then((r) => { if (r) { setReport(r); setView("report"); } }).catch(() => {});
    apiFetch("/api/personality/history").then((h) => setHistory(Array.isArray(h) ? h : [])).catch(() => {});
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, [ready, adviaiOn]);

  const start = async () => {
    if (needsConsent && !consent) { alert("A parent or guardian must consent before you begin."); return; }
    setLoading(true);
    try {
      const d = await apiFetch("/api/personality/items");
      setItems(d.items || []); setScale(d.scale || null);
      setResponses({}); setIdx(0); setStartedAt(new Date().toISOString()); setView("test");
    } catch (err) { alert(err.message || "Could not load the test"); }
    finally { setLoading(false); }
  };

  const answer = (val) => {
    const item = items[idx];
    setResponses((prev) => ({ ...prev, [item.id]: val }));
    // clear any pending advance so rapid re-clicks on the same question don't skip one
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (idx < items.length - 1) advanceTimer.current = setTimeout(() => setIdx((i) => i + 1), 160);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await apiFetch("/api/personality/submit", { method: "POST", body: JSON.stringify({ responses, started_at: startedAt, parental_consent: consent }) });
      setReport(r); setView("report");
      apiFetch("/api/personality/history").then((h) => setHistory(Array.isArray(h) ? h : [])).catch(() => {});
    } catch (err) { alert(err.message || "Could not submit"); }
    finally { setSubmitting(false); }
  };

  // Wait until plan + grade are known (avoids a free-content flash and a COPPA race)
  if (!ready) {
    return <div className="card compact" style={{ background: "var(--surface-warm)", color: "var(--ink-faint)", fontSize: "0.85rem" }}>Loading Personal Character Test…</div>;
  }

  // ---------- Free / not-PRO ----------
  if (!adviaiOn) {
    return (
      <div className="card compact" style={{ background: "var(--surface-warm)" }}>
        <div className="subtitle" style={{ fontSize: "0.95rem" }}>Personal Character Test <span className="badge" style={{ fontSize: "0.6rem", marginLeft: "0.3rem" }}>AdviAI</span></div>
        <p className="muted" style={{ fontSize: "0.82rem", margin: "0.4rem 0 0.75rem" }}>
          A 50-question Big Five (IPIP-50) assessment that reveals the strengths shaping your application narrative.
        </p>
        <Link to="/pricing" className="button ghost" style={{ fontSize: "0.75rem", display: "inline-block" }}>Upgrade to unlock →</Link>
      </div>
    );
  }

  // ---------- Report ----------
  if (view === "report" && report) {
    const prevAttempt = history.length > 1 ? history[history.length - 2] : null;
    return (
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ background: GRAD, color: "#fff", padding: "1.4rem 1.6rem" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, opacity: 0.92 }}>Personal Character Test · Your report</div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.01em", marginTop: "0.25rem" }}>Your Big Five personality profile</div>
          <div style={{ fontSize: "0.78rem", opacity: 0.9, marginTop: "0.3rem" }}>
            {report.completed_at ? `Completed ${new Date(report.completed_at).toLocaleDateString()}` : ""} · IPIP-50 · 50/50 answered
          </div>
        </div>
        <div style={{ padding: "1.4rem 1.6rem 1.6rem" }}>
          <div style={{ display: "grid", gap: "0.85rem", marginBottom: "1.4rem" }}>
            {FACTOR_META.map((f) => {
              const avg = report.scores?.average?.[f.code] ?? 0;
              const bnd = report.bands?.[f.code] || "—";
              const bs = bandStyle(bnd);
              return (
                <div key={f.code} style={{ display: "grid", gridTemplateColumns: "150px 1fr 118px", gap: "0.85rem", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(16,185,129,0.10)", color: "var(--teal-deep)", fontWeight: 800, fontSize: "0.72rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.code}</div>
                    <div><div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>{f.name}</div><div style={{ fontSize: "0.7rem", color: "var(--ink-faint)" }}>{f.desc}</div></div>
                  </div>
                  <div style={{ height: "12px", borderRadius: "9999px", background: "var(--rule-soft)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, (avg / 5) * 100)}%`, height: "100%", borderRadius: "9999px", background: GRAD }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "flex-end" }}>
                    {(() => {
                      const prev = prevAttempt?.average?.[f.code];
                      if (prev == null) return null;
                      const d = +(avg - prev).toFixed(1);
                      if (d === 0) return <span style={{ fontSize: "0.66rem", color: "var(--ink-faint)" }}>±0</span>;
                      return <span style={{ fontSize: "0.66rem", fontWeight: 700, color: d > 0 ? "var(--teal-deep)" : "#b45309" }}>{d > 0 ? "▲" : "▼"}{Math.abs(d)}</span>;
                    })()}
                    <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--ink)" }}>{avg}</span>
                    <span style={{ fontSize: "0.66rem", fontWeight: 700, padding: "0.18rem 0.55rem", borderRadius: "9999px", background: bs.bg, color: bs.c }}>{bnd}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {history.length > 1 && (
            <div style={{ marginBottom: "1.1rem", border: "1px solid var(--rule)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
              <div style={{ padding: "0.6rem 0.9rem", background: "var(--surface-warm)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 700 }}>
                Progress over time · {history.length} attempts
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "var(--ink-muted)" }}>
                      <th style={{ textAlign: "left", padding: "0.4rem 0.9rem", fontWeight: 600 }}>Date</th>
                      {FACTOR_META.map((f) => <th key={f.code} style={{ padding: "0.4rem 0.5rem", fontWeight: 600 }}>{f.code}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice().reverse().map((h, i) => (
                      <tr key={h.id} style={{ borderTop: "1px solid var(--rule-soft)", background: i === 0 ? "rgba(16,185,129,0.05)" : "transparent" }}>
                        <td style={{ padding: "0.4rem 0.9rem", color: "var(--ink-soft)" }}>{new Date(h.completed_at).toLocaleDateString()}{i === 0 ? " · latest" : ""}</td>
                        {FACTOR_META.map((f) => <td key={f.code} style={{ padding: "0.4rem 0.5rem", textAlign: "center", fontWeight: i === 0 ? 700 : 400, color: "var(--ink)" }}>{h.average?.[f.code] ?? "—"}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.narrative && (
            <div style={{ border: "1px solid #d1fae5", background: "#f0fdf9", borderRadius: "var(--r-md)", padding: "1rem 1.15rem", marginBottom: "1.1rem" }}>
              <div style={{ fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal-deep)", fontWeight: 700, marginBottom: "0.5rem" }}>AdviAI — what this means for you</div>
              {report.narrative.summary && <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", lineHeight: 1.6, color: "var(--ink-soft)" }}>{report.narrative.summary}</p>}
              {Array.isArray(report.narrative.strengths) && report.narrative.strengths.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.6rem" }}>
                  {report.narrative.strengths.map((s, i) => <span key={i} className="badge primary" style={{ fontSize: "0.7rem" }}>{s}</span>)}
                </div>
              )}
              {Array.isArray(report.narrative.recommendations) && (
                <ul className="list">{report.narrative.recommendations.map((r, i) => <li key={i} style={{ fontSize: "0.85rem" }}>{r}</li>)}</ul>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button className="button ghost" style={{ fontSize: "0.78rem" }} disabled={loading} onClick={() => (needsConsent && !consent ? setView("intro") : start())}>
              {loading ? "Loading…" : "Retake test"}
            </button>
          </div>
          <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--rule-soft)", fontSize: "0.7rem", color: "var(--ink-faint)", lineHeight: 1.55 }}>
            A self-insight tool, not a clinical diagnosis — don't submit it as a formal assessment to universities. Bands are indicative, not a percentile. Source: items from the International Personality Item Pool (<a href="https://ipip.ori.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-deep)" }}>ipip.ori.org</a>) — public domain, source acknowledged.
          </div>
        </div>
      </div>
    );
  }

  // ---------- Taking the test ----------
  if (view === "test" && items.length) {
    const item = items[idx];
    const answered = Object.keys(responses).length;
    const pct = Math.round((answered / items.length) * 100);
    const labels = scale?.labels || { 1: "Very Inaccurate", 2: "Moderately Inaccurate", 3: "Neither", 4: "Moderately Accurate", 5: "Very Accurate" };
    const isLast = idx === items.length - 1;
    return (
      <div className="card" style={{ padding: "1.4rem 1.6rem" }}>
        <div className="flex-between" style={{ marginBottom: "0.6rem" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--teal-deep)", fontWeight: 700 }}>Personal Character Test</div>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)", fontWeight: 600 }}>Question <strong style={{ color: "var(--ink)" }}>{idx + 1}</strong> of {items.length}</div>
        </div>
        <div style={{ height: "8px", borderRadius: "9999px", background: "var(--rule-soft)", overflow: "hidden", marginBottom: "1.6rem" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: "9999px", background: GRAD, transition: "width 0.2s ease" }} />
        </div>

        <div style={{ textAlign: "center", padding: "0.5rem 0 1.6rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--ink-faint)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.6rem" }}>I see myself as someone who…</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.01em", color: "var(--ink)", lineHeight: 1.25, maxWidth: "26ch", margin: "0 auto" }}>…{item.text.charAt(0).toLowerCase()}{item.text.slice(1)}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "0.6rem", marginBottom: "1.4rem" }}>
          {[1, 2, 3, 4, 5].map((v) => {
            const sel = responses[item.id] === v;
            return (
              <button key={v} type="button" onClick={() => answer(v)} style={{
                cursor: "pointer", fontFamily: "inherit", textAlign: "center", padding: "0.9rem 0.4rem",
                borderRadius: "12px",
                border: sel ? "1.5px solid var(--teal)" : "1.5px solid var(--rule)",
                background: sel ? "rgba(16,185,129,0.08)" : "var(--surface)",
                boxShadow: sel ? "0 4px 6px -1px rgba(16,185,129,0.18)" : "none"
              }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "9999px", border: sel ? "6px solid var(--teal)" : "2px solid var(--ink-faint)", margin: "0 auto 0.6rem" }} />
                <div style={{ fontSize: "0.72rem", fontWeight: sel ? 700 : 600, color: sel ? "var(--teal-deep)" : "var(--ink-muted)", lineHeight: 1.3 }}>{labels[v]}</div>
              </button>
            );
          })}
        </div>

        <div className="flex-between" style={{ paddingTop: "1rem", borderTop: "1px solid var(--rule-soft)" }}>
          <button type="button" className="button ghost" style={{ fontSize: "0.78rem" }} disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>← Back</button>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>{answered}/{items.length} answered</span>
          {isLast ? (
            <button type="button" className="button" style={{ fontSize: "0.78rem" }} disabled={answered < items.length || submitting} onClick={submit}>
              {submitting ? "Scoring…" : "Finish & see report"}
            </button>
          ) : (
            <button type="button" className="button" style={{ fontSize: "0.78rem" }} disabled={!responses[item.id]} onClick={() => setIdx((i) => Math.min(items.length - 1, i + 1))}>Next →</button>
          )}
        </div>
      </div>
    );
  }

  // ---------- Intro ----------
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ background: GRAD, color: "#fff", padding: "1.4rem 1.6rem" }}>
        <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, opacity: 0.92, marginBottom: "0.35rem" }}>Personal Character Test · AdviAI</div>
        <div style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.01em" }}>Discover your Big Five personality profile</div>
        <div style={{ fontSize: "0.85rem", opacity: 0.95, marginTop: "0.3rem", maxWidth: "58ch" }}>A validated 50-question self-assessment (IPIP-50) that reveals the strengths shaping your application narrative — then AdviAI turns it into advice.</div>
      </div>
      <div style={{ padding: "1.4rem 1.6rem 1.5rem" }}>
        <div style={{ borderLeft: "3px solid var(--teal)", background: "var(--surface-warm)", borderRadius: "0 var(--r-md) var(--r-md) 0", padding: "0.9rem 1.1rem", marginBottom: "1.1rem" }}>
          <div style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--teal-deep)", fontWeight: 700, marginBottom: "0.35rem" }}>Before you begin</div>
          <div style={{ fontSize: "0.86rem", lineHeight: 1.6, color: "var(--ink-soft)" }}>Describe yourself as you generally are now, not as you wish to be in the future. Describe yourself as you honestly see yourself, in relation to other people you know of the same sex as you are, and roughly your same age. Please read each statement carefully, and then select the response that most accurately describes you.</div>
        </div>
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginBottom: "1.1rem", fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600 }}>
          <span>⏱ 10–15 minutes</span><span>✓ 50 questions · 5-point scale</span><span>↺ Retake anytime</span>
        </div>
        {needsConsent && (
          <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", padding: "0.75rem 0.9rem", background: "var(--warn-soft)", borderLeft: "3px solid var(--warn)", borderRadius: "var(--r-sm)", marginBottom: "1rem", cursor: "pointer" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: "0.2rem", accentColor: "var(--teal-deep)" }} />
            <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>A parent or guardian is aware of and consents to me taking this assessment. <span style={{ color: "var(--ink-faint)" }}>(Required for students under 13.)</span></span>
          </label>
        )}
        <button className="button" disabled={loading || (needsConsent && !consent)} onClick={start}>{loading ? "Loading…" : "Start the test →"}</button>
        <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--rule-soft)", fontSize: "0.7rem", color: "var(--ink-faint)", lineHeight: 1.55 }}>
          A self-insight tool for exploring strengths and interests — not a clinical or diagnostic assessment. Source: items from the International Personality Item Pool (<a href="https://ipip.ori.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-deep)" }}>ipip.ori.org</a>) — public domain, source acknowledged.
        </div>
      </div>
    </div>
  );
}
