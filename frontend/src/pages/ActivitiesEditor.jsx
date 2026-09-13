import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import AdvisoryNote, { PORTFOLIO_GUIDE } from "../components/AdvisoryNote.jsx";

export default function ActivitiesEditor() {
  const EMPTY_FORM = {
    title: "", topic: "", role: "", description: "", summary: "",
    hours_per_week: "", leadership: false, start_date: "", end_date: "", category: "", ai_score: null
  };
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [recs, setRecs] = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [adviaiOn, setAdviaiOn] = useState(true); // AdviAI feature flag (from plan)

  const loadActivities = () => apiFetch("/api/students/me/activities").then(setActivities).catch(() => {});

  useEffect(() => {
    loadActivities();
    apiFetch("/api/students/me/plan").then((p) => setAdviaiOn(!!p?.features?.adviai)).catch(() => {});
  }, []);

  const updateField = (key) => (e) => {
    const value = key === "leadership" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const analyzeActivity = async () => {
    setAnalyzing(true);
    try {
      const data = await apiFetch("/api/ai/activity-analyze", { method: "POST", body: JSON.stringify({ activity: form }) });
      setForm((prev) => ({ ...prev, topic: data.topic || prev.topic, summary: data.summary || prev.summary, ai_score: data.score ?? prev.ai_score }));
      setStatus(`AI score: ${data.score}/100`);
      setTimeout(() => setStatus(""), 3000);
    } catch (err) { setStatus(err.message); } finally { setAnalyzing(false); }
  };

  const loadRecommendations = async () => {
    setRecsLoading(true);
    try { setRecs(await apiFetch("/api/ai/activity-recommendations")); } catch (err) { /* ignore */ } finally { setRecsLoading(false); }
  };

  const addActivity = async (e) => {
    e.preventDefault();
    setStatus("Saving…");
    try {
      await apiFetch("/api/students/me/activities", { method: "POST", body: JSON.stringify(form) });
      setForm(EMPTY_FORM);
      await loadActivities();
      setStatus("Saved.");
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Extracurricular Activities · Extracurricular Strategy (AI)</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.25rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Build depth where it counts.
        </h1>
        <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "62ch" }}>
          Top admissions reward 3–5 deep multi-year activities — a spike —
          over ten superficial ones. Capture role, hours, impact, and use
          the 150-character formula.
        </p>
      </header>

      {adviaiOn ? (
        <AdvisoryNote label="AdviAI" title={PORTFOLIO_GUIDE.spike.title} doDont={PORTFOLIO_GUIDE.spike.doDont}>
          <p>{PORTFOLIO_GUIDE.spike.summary}</p>
          <ul>
            {PORTFOLIO_GUIDE.spike.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </AdvisoryNote>
      ) : (
        <aside className="advisory" style={{ borderStyle: "dashed" }}>
          <div className="advisory-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>AdviAI</span><span className="badge">Paid</span>
          </div>
          <h4>AI advisory is a paid feature</h4>
          <p style={{ fontSize: "0.9rem" }}>Upgrade to <strong>Essential</strong> or <strong>Professional</strong> to unlock <strong>AdviAI</strong> — recommended activities, AI topic &amp; summary, and an AI score for each activity.</p>
          <Link to="/pricing" className="button gold" style={{ marginTop: "0.6rem", display: "inline-block" }}>View plans &amp; upgrade →</Link>
        </aside>
      )}

      {/* Recommended Extracurricular Activities (AdviAI) — paid only */}
      {adviaiOn && (
        <section className="card" style={{ marginTop: "1.5rem", padding: "1.5rem" }}>
          <div className="flex-between" style={{ flexWrap: "wrap", gap: "0.5rem", marginBottom: recs ? "1rem" : 0 }}>
            <div>
              <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: "0.15rem" }}>Recommended Extracurricular Activities (AdviAI)</h2>
              <p className="muted" style={{ fontSize: "0.85rem" }}>Personalized to your intended major and the Spike Strategy.</p>
            </div>
            <button className="button gold" style={{ fontSize: "0.75rem" }} disabled={recsLoading} onClick={loadRecommendations}>
              {recsLoading ? "Thinking…" : recs ? "Refresh" : "Get recommendations"}
            </button>
          </div>
          {recs && Array.isArray(recs.recommendations) && (
            <div className="grid two">
              {recs.recommendations.map((r, i) => (
                <div key={i} className="card compact" style={{ background: "var(--surface-warm)" }}>
                  <div className="subtitle" style={{ fontSize: "0.95rem" }}>{r.title}</div>
                  {r.category && <div className="badge" style={{ marginTop: "0.35rem" }}>{r.category}</div>}
                  <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.5rem" }}>{r.why}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Five categories */}
      <section style={{ marginTop: "2.5rem" }}>
        <div className="flex-between" style={{ marginBottom: "0.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.4rem", marginBottom: 0 }}>
            The five categories
          </h2>
          <Link to="/guide#ec" style={{ color: "var(--gold-deep)", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            See full guide →
          </Link>
        </div>
        <p className="muted" style={{ fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          A balanced application typically spans these five categories.
          Position 1 = your biggest spike; descend in importance from there.
        </p>
        <div className="grid three">
          {PORTFOLIO_GUIDE.ecCategories.map((c, i) => (
            <div key={c.name} className="card" style={{ padding: "1.5rem" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "0.82rem", color: "var(--gold-deep)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "0.5rem" }}>
                Category {String(i + 1).padStart(2, "0")}
              </div>
              <div className="subtitle">{c.name}</div>
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem", marginBottom: "0.75rem" }}>{c.examples[0]}</p>
              <div className="badge primary">{c.target}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Spike examples */}
      <section style={{ marginTop: "2.5rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
          Spike examples
        </h2>
        <p className="muted" style={{ fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          Three illustrative spikes. Use them as a template for the depth and shape of your own.
        </p>
        <div className="grid three">
          {PORTFOLIO_GUIDE.spike.examples.map((ex) => (
            <div key={ex.spike} className="card" style={{ padding: "1.5rem", background: "var(--surface-warm)" }}>
              <div className="subtitle" style={{ color: "var(--gold-deep)", fontSize: "1.05rem", marginBottom: "0.5rem" }}>{ex.spike}</div>
              <ul className="list">
                {ex.items.map((it, i) => <li key={i} style={{ fontSize: "0.88rem" }}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Quality indicators */}
      <section style={{ marginTop: "2.5rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
          Quality indicators
        </h2>
        <p className="muted" style={{ fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          What admissions officers actually look for when reading activity descriptions.
        </p>
        <div className="grid four">
          {PORTFOLIO_GUIDE.qualityIndicators.blocks.map((b) => (
            <div key={b.name} className="card compact">
              <div className="subtitle" style={{ fontSize: "0.95rem" }}>{b.name}</div>
              <ul className="list" style={{ marginTop: "0.5rem" }}>
                {b.items.map((it, i) => <li key={i} style={{ fontSize: "0.82rem" }}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: "1px", background: "var(--rule)", margin: "3rem 0 2rem" }} />

      {/* Editor: form + list */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }} className="acts-grid">
        <div className="card" style={{ padding: "2rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}>Extracurricular Activity Editor</h2>
          <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "1.5rem" }}>
            Use the formula: [Action verb] + [What you did] + [Impact / Result], in 150 characters.
          </p>

          <form onSubmit={addActivity}>
            <div className="input">
              <label>Title</label>
              <input value={form.title} onChange={updateField("title")} placeholder="e.g. FRC Robotics Team #1234" />
            </div>
            <div className="input">
              <label>Topic <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(theme — AI can fill this)</span></label>
              <input value={form.topic} onChange={updateField("topic")} placeholder="e.g. STEM Leadership" />
            </div>
            <div className="input">
              <label>Role</label>
              <input value={form.role} onChange={updateField("role")} placeholder="Co-Captain · Founder · Lead Engineer" />
            </div>
            <div className="input">
              <label>Category (Common App)</label>
              <select value={form.category} onChange={updateField("category")}>
                <option value="">Select category</option>
                {PORTFOLIO_GUIDE.activityCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="input">
              <label>Description <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(150 char max)</span></label>
              <textarea
                rows="3"
                value={form.description}
                onChange={updateField("description")}
                placeholder="Founded coding nonprofit teaching 500+ elementary students. Recruited 25 volunteers, raised $8K, featured in local news."
                maxLength={150}
              />
              <small className="text-muted" style={{ alignSelf: "flex-end" }}>
                {form.description.length}/150
              </small>
            </div>
            <div className="grid two">
              <div className="input">
                <label>Hours / week</label>
                <input value={form.hours_per_week} onChange={updateField("hours_per_week")} placeholder="6" />
              </div>
              <div className="input">
                <label>Leadership role</label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", border: "1px solid var(--rule)", cursor: "pointer", background: "var(--surface)" }}>
                  <input type="checkbox" checked={form.leadership} onChange={updateField("leadership")} style={{ accentColor: "var(--gold-deep)" }} />
                  <span style={{ fontSize: "0.9rem" }}>This is a leadership position</span>
                </label>
              </div>
            </div>
            <div className="grid two">
              <div className="input">
                <label>Start date</label>
                <input type="date" value={form.start_date} onChange={updateField("start_date")} />
              </div>
              <div className="input">
                <label>End date</label>
                <input type="date" value={form.end_date} onChange={updateField("end_date")} />
              </div>
            </div>

            {/* AdviAI summary + score (paid only) */}
            {adviaiOn && (
              <div className="card compact" style={{ background: "var(--surface-warm)", marginBottom: "1rem" }}>
                <div className="flex-between" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: 0 }}>AdviAI topic, summary &amp; score</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    {form.ai_score != null && <span className="badge primary">Score (AdviAI): {form.ai_score}/100</span>}
                    <button type="button" className="button ghost" style={{ padding: "0.35rem 0.85rem", fontSize: "0.72rem" }} disabled={analyzing || !form.title} onClick={analyzeActivity}>
                      {analyzing ? "Analyzing…" : "Generate (AdviAI)"}
                    </button>
                  </div>
                </div>
                {form.summary && (
                  <p style={{ margin: "0.6rem 0 0", fontSize: "0.85rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>{form.summary}</p>
                )}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button className="button" type="submit">Save activity</button>
              {status && <span className="muted" style={{ fontSize: "0.85rem" }}>{status}</span>}
            </div>
          </form>
        </div>

        <div>
          <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}>
            Your activities <span className="badge" style={{ marginLeft: "0.5rem" }}>{activities.length}/10</span>
          </h2>
          <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "1.25rem" }}>
            Listed in order of importance — your biggest spike first.
          </p>
          <div style={{ display: "grid", gap: "0.85rem" }}>
            {activities.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                <p className="muted">No activities yet. Add your first to begin.</p>
              </div>
            )}
            {activities.map((activity, idx) => (
              <article key={activity.id} className="card compact" style={{ background: "var(--surface-warm)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1rem", alignItems: "start" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      color: "var(--gold-deep)",
                      lineHeight: 1
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                      <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "var(--ink)" }}>
                        {activity.title}
                      </strong>
                      {activity.leadership ? <span className="badge primary">Leadership</span> : null}
                      {activity.ai_score != null ? <span className="badge">Score {activity.ai_score}/100</span> : null}
                    </div>
                    {activity.topic ? (
                      <div style={{ fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold-deep)", fontWeight: 600, marginTop: "0.2rem" }}>
                        {activity.topic}
                      </div>
                    ) : null}
                    {activity.summary ? (
                      <p className="muted" style={{ fontSize: "0.82rem", fontStyle: "italic", marginTop: "0.35rem" }}>{activity.summary}</p>
                    ) : null}
                    <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                      {activity.role}
                      {activity.hours_per_week ? ` · ${activity.hours_per_week} hrs/wk` : ""}
                    </p>
                    {activity.description && (
                      <>
                        <p style={{ fontFamily: "var(--font-serif)", fontSize: "0.92rem", color: "var(--ink-soft)", marginTop: "0.5rem", lineHeight: 1.55 }}>
                          {activity.description}
                        </p>
                        {activity.description.length > 150 && (
                          <div
                            style={{
                              marginTop: "0.5rem",
                              fontSize: "0.72rem",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--warn)",
                              fontWeight: 600
                            }}
                          >
                            ⚠ {activity.description.length} chars — exceeds 150-char Common App limit by {activity.description.length - 150}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .acts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
