import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";

// RIASEC types — plain-language framing (DevSpec §1)
const TYPE_META = {
  R: { name: "Realistic", tag: "Doers", desc: "Tools, building, hands-on, outdoors" },
  I: { name: "Investigative", tag: "Thinkers", desc: "Research, analysis, science" },
  A: { name: "Artistic", tag: "Creators", desc: "Writing, music, design, performance" },
  S: { name: "Social", tag: "Helpers", desc: "Teaching, caring, working with people" },
  E: { name: "Enterprising", tag: "Persuaders", desc: "Leading, selling, starting ventures" },
  C: { name: "Conventional", tag: "Organizers", desc: "Data, detail, structure, records" }
};
const GRAD = "linear-gradient(135deg, var(--navy) 0%, var(--teal) 100%)";
const PER_PAGE = 10;
const isUnder13 = (g) => !!g && /Grade 6\b|Grade 7\b|Year 7\b|Year 8\b/i.test(g);

export default function CareerTest({ adviaiOn, gradeLevel, ready = true }) {
  const [view, setView] = useState("intro"); // intro | test | report
  const [items, setItems] = useState([]);
  const [responses, setResponses] = useState({});
  const [page, setPage] = useState(0);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [consent, setConsent] = useState(false);

  const needsConsent = isUnder13(gradeLevel);

  useEffect(() => {
    if (!ready || !adviaiOn) return;
    apiFetch("/api/career/latest").then((r) => { if (r) { setReport(r); setView("report"); } }).catch(() => {});
    apiFetch("/api/career/history").then((h) => setHistory(Array.isArray(h) ? h : [])).catch(() => {});
  }, [ready, adviaiOn]);

  const start = async () => {
    if (needsConsent && !consent) { alert("A parent or guardian must consent before you begin."); return; }
    setLoading(true);
    try {
      const d = await apiFetch("/api/career/items");
      const its = d.items || [];
      setItems(its);
      // start every item unchecked (0) — binary checklist
      const init = {}; its.forEach((i) => { init[i.id] = 0; });
      setResponses(init); setPage(0); setStartedAt(new Date().toISOString()); setView("test");
    } catch (err) { alert(err.message || "Could not load the test"); }
    finally { setLoading(false); }
  };

  const toggle = (id) => setResponses((prev) => ({ ...prev, [id]: prev[id] ? 0 : 1 }));

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await apiFetch("/api/career/submit", { method: "POST", body: JSON.stringify({ responses, started_at: startedAt, parental_consent: consent }) });
      setReport(r); setView("report");
      apiFetch("/api/career/history").then((h) => setHistory(Array.isArray(h) ? h : [])).catch(() => {});
    } catch (err) { alert(err.message || "Could not submit"); }
    finally { setSubmitting(false); }
  };

  const attribution = (
    <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--rule-soft)", fontSize: "0.7rem", color: "var(--ink-faint)", lineHeight: 1.55 }}>
      A self-insight tool for exploring interests — not a guarantee of career fit or a formal credential for universities. Source: this assessment uses the{" "}
      <a href="https://www.onetcenter.org/IP.html" target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-deep)" }}>O*NET® Interest Profiler Short Form</a>, sponsored by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), used under{" "}
      <a href="https://creativecommons.org/licenses/by-nd/4.0/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-deep)" }}>CC BY-ND 4.0</a>. USDOL/ETA has not endorsed MyEduPort.
    </div>
  );

  // Wait until plan + grade are known (avoids a free-content flash and a COPPA race)
  if (!ready) {
    return <div className="card compact" style={{ background: "var(--surface-warm)", color: "var(--ink-faint)", fontSize: "0.85rem" }}>Loading Career Test…</div>;
  }

  // ---------- Free ----------
  if (!adviaiOn) {
    return (
      <div className="card compact" style={{ background: "var(--surface-warm)" }}>
        <div className="subtitle" style={{ fontSize: "0.95rem" }}>Career Test <span className="badge" style={{ fontSize: "0.6rem", marginLeft: "0.3rem" }}>AdviAI</span></div>
        <p className="muted" style={{ fontSize: "0.82rem", margin: "0.4rem 0 0.75rem" }}>A 60-activity RIASEC (Holland Code) interest test that maps your interests to majors and careers.</p>
        <Link to="/pricing" className="button ghost" style={{ fontSize: "0.75rem", display: "inline-block" }}>Upgrade to unlock →</Link>
      </div>
    );
  }

  // ---------- Report ----------
  if (view === "report" && report) {
    const ranking = report.ranking || Object.keys(TYPE_META);
    const prev = history.length > 1 ? history[history.length - 2] : null;
    return (
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ background: GRAD, color: "#fff", padding: "1.4rem 1.6rem" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, opacity: 0.92 }}>Career Test · Your Holland Code</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
            <div style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "0.06em", lineHeight: 1 }}>{report.holland_code}</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.95 }}>{(report.ranking || []).slice(0, 3).map((t) => TYPE_META[t]?.name).join(" · ")}</div>
          </div>
          <div style={{ fontSize: "0.78rem", opacity: 0.9, marginTop: "0.35rem" }}>{report.completed_at ? `Completed ${new Date(report.completed_at).toLocaleDateString()}` : ""} · O*NET® IP-SF · 60 activities</div>
        </div>
        <div style={{ padding: "1.4rem 1.6rem 1.6rem" }}>
          <div style={{ display: "grid", gap: "0.7rem", marginBottom: "1.3rem" }}>
            {ranking.map((code, i) => {
              const m = TYPE_META[code] || {}; const sc = report.scores?.[code] ?? 0;
              const top = i < 3;
              return (
                <div key={code} style={{ display: "grid", gridTemplateColumns: "160px 1fr 70px", gap: "0.85rem", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: top ? "var(--teal-deep)" : "rgba(16,185,129,0.10)", color: top ? "#fff" : "var(--teal-deep)", fontWeight: 800, fontSize: "0.72rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{code}</div>
                    <div><div style={{ fontSize: "0.83rem", fontWeight: 700, color: "var(--ink)" }}>{m.name}</div><div style={{ fontSize: "0.68rem", color: "var(--ink-faint)" }}>{m.tag}</div></div>
                  </div>
                  <div style={{ height: "11px", borderRadius: "9999px", background: "var(--rule-soft)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, (sc / 10) * 100)}%`, height: "100%", borderRadius: "9999px", background: GRAD }} />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--ink)" }}>{sc}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--ink-faint)" }}>/10</span>
                    {prev?.scores?.[code] != null && sc - prev.scores[code] !== 0 && (
                      <span style={{ fontSize: "0.62rem", fontWeight: 700, marginLeft: "0.25rem", color: sc - prev.scores[code] > 0 ? "var(--teal-deep)" : "#b45309" }}>{sc - prev.scores[code] > 0 ? "▲" : "▼"}{Math.abs(sc - prev.scores[code])}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {report.narrative && (
            <div style={{ border: "1px solid #d1fae5", background: "#f0fdf9", borderRadius: "var(--r-md)", padding: "1rem 1.15rem", marginBottom: "1.1rem" }}>
              <div style={{ fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal-deep)", fontWeight: 700, marginBottom: "0.5rem" }}>AdviAI — majors &amp; careers for you</div>
              {report.narrative.summary && <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", lineHeight: 1.6, color: "var(--ink-soft)" }}>{report.narrative.summary}</p>}
              {Array.isArray(report.narrative.majors) && report.narrative.majors.length > 0 && (
                <div style={{ marginBottom: "0.6rem" }}>
                  <div style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 700, marginBottom: "0.3rem" }}>Recommended majors</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>{report.narrative.majors.map((m, i) => <span key={i} className="badge" style={{ fontSize: "0.7rem" }}>{m}</span>)}</div>
                </div>
              )}
              {Array.isArray(report.narrative.careers) && report.narrative.careers.length > 0 && (
                <ul className="list">{report.narrative.careers.map((c, i) => <li key={i} style={{ fontSize: "0.85rem" }}><strong>{c.name}</strong>{c.why ? ` — ${c.why}` : ""}</li>)}</ul>
              )}
              {Array.isArray(report.narrative.recommendations) && report.narrative.recommendations.length > 0 && (
                <>
                  <div style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 700, margin: "0.6rem 0 0.3rem" }}>Next steps</div>
                  <ul className="list">{report.narrative.recommendations.map((r, i) => <li key={i} style={{ fontSize: "0.85rem" }}>{r}</li>)}</ul>
                </>
              )}
            </div>
          )}

          {history.length > 1 && (
            <div style={{ marginBottom: "1.1rem", fontSize: "0.78rem", color: "var(--ink-muted)" }}>
              <strong style={{ color: "var(--ink)" }}>{history.length} attempts</strong> · codes: {history.slice().reverse().map((h) => h.holland_code).join(" → ")}
            </div>
          )}

          <button className="button ghost" style={{ fontSize: "0.78rem" }} disabled={loading} onClick={() => (needsConsent && !consent ? setView("intro") : start())}>
            {loading ? "Loading…" : "Retake test"}
          </button>
          {attribution}
        </div>
      </div>
    );
  }

  // ---------- Taking the test (checklist, ~10 per page) ----------
  if (view === "test" && items.length) {
    const totalPages = Math.ceil(items.length / PER_PAGE);
    const pageItems = items.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
    const checkedCount = Object.values(responses).filter(Boolean).length;
    const isLast = page === totalPages - 1;
    return (
      <div className="card" style={{ padding: "1.4rem 1.6rem" }}>
        <div className="flex-between" style={{ marginBottom: "0.6rem" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--teal-deep)", fontWeight: 700 }}>Career Test</div>
          <div style={{ fontSize: "0.78rem", color: "var(--ink-muted)", fontWeight: 600 }}>Activities {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, items.length)} of {items.length}</div>
        </div>
        <div style={{ height: "8px", borderRadius: "9999px", background: "var(--rule-soft)", overflow: "hidden", marginBottom: "1rem" }}>
          <div style={{ width: `${((page + 1) / totalPages) * 100}%`, height: "100%", borderRadius: "9999px", background: GRAD, transition: "width 0.2s ease" }} />
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", marginBottom: "1rem" }}>Check the activities you <strong>would like to do</strong>. Don't think about education, training, or pay.</p>

        <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.3rem" }}>
          {pageItems.map((it) => {
            const on = !!responses[it.id];
            return (
              <button key={it.id} type="button" onClick={() => toggle(it.id)} style={{
                cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.7rem 0.9rem", borderRadius: "10px",
                border: on ? "1.5px solid var(--teal)" : "1.5px solid var(--rule)",
                background: on ? "rgba(16,185,129,0.06)" : "var(--surface)"
              }}>
                <span style={{ width: "22px", height: "22px", borderRadius: "6px", flexShrink: 0, border: on ? "none" : "2px solid var(--ink-faint)", background: on ? "var(--teal-deep)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                </span>
                <span style={{ fontSize: "0.92rem", color: "var(--ink)", fontWeight: on ? 600 : 400 }}>{it.text}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-between" style={{ paddingTop: "1rem", borderTop: "1px solid var(--rule-soft)" }}>
          <button type="button" className="button ghost" style={{ fontSize: "0.78rem" }} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Back</button>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>{checkedCount} liked · page {page + 1}/{totalPages}</span>
          {isLast ? (
            <button type="button" className="button" style={{ fontSize: "0.78rem" }} disabled={submitting} onClick={submit}>{submitting ? "Scoring…" : "Finish & see code"}</button>
          ) : (
            <button type="button" className="button" style={{ fontSize: "0.78rem" }} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next →</button>
          )}
        </div>
      </div>
    );
  }

  // ---------- Intro ----------
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ background: GRAD, color: "#fff", padding: "1.4rem 1.6rem" }}>
        <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, opacity: 0.92, marginBottom: "0.35rem" }}>Career Test · AdviAI</div>
        <div style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.01em" }}>Find your Holland Code &amp; matching careers</div>
        <div style={{ fontSize: "0.85rem", opacity: 0.95, marginTop: "0.3rem", maxWidth: "58ch" }}>A 60-activity interest checklist (O*NET® RIASEC) that ranks your six interest types — then AdviAI maps them to majors and careers.</div>
      </div>
      <div style={{ padding: "1.4rem 1.6rem 1.5rem" }}>
        <div style={{ borderLeft: "3px solid var(--teal)", background: "var(--surface-warm)", borderRadius: "0 var(--r-md) var(--r-md) 0", padding: "0.9rem 1.1rem", marginBottom: "1.1rem" }}>
          <div style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--teal-deep)", fontWeight: 700, marginBottom: "0.35rem" }}>Before you begin</div>
          <div style={{ fontSize: "0.86rem", lineHeight: 1.6, color: "var(--ink-soft)" }}>Read the 60 work activities below. Place a check by the activities you would like to do. Do not think about how much education/training is needed or how much money you will make!</div>
        </div>
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginBottom: "1.1rem", fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600 }}>
          <span>⏱ 10–15 minutes</span><span>✓ 60 activities · check what you like</span><span>↺ Retake anytime</span>
        </div>
        {needsConsent && (
          <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", padding: "0.75rem 0.9rem", background: "var(--warn-soft)", borderLeft: "3px solid var(--warn)", borderRadius: "var(--r-sm)", marginBottom: "1rem", cursor: "pointer" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: "0.2rem", accentColor: "var(--teal-deep)" }} />
            <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>A parent or guardian is aware of and consents to me taking this assessment. <span style={{ color: "var(--ink-faint)" }}>(Required for students under 13.)</span></span>
          </label>
        )}
        <button className="button" disabled={loading || (needsConsent && !consent)} onClick={start}>{loading ? "Loading…" : "Start the test →"}</button>
        {attribution}
      </div>
    </div>
  );
}
