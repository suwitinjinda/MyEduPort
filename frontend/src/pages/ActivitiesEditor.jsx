import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { loadSaved, apiFetch, apiUpload, fileUrl } from "../api/client";
import MepaiWorkspace from "../components/MepaiWorkspace.jsx";
import { PORTFOLIO_GUIDE } from "../components/AdvisoryNote.jsx";

// Instant tips for a 150-character activity description (no AI call)
const WEAK_START = /^(?:i\s|my\s|was\s|helped|participated|member of|part of|did\s|worked on)/i;
function activityTips(text) {
  const t = (text || "").trim();
  if (!t) return ["Start with a strong action verb: Founded, Led, Built, Organized, Designed…"];
  const tips = [];
  if (WEAK_START.test(t)) tips.push("Open with a strong action verb (Founded, Led, Built) instead of “I / helped / participated”.");
  if (!/\d/.test(t)) tips.push("Add one number: people reached, money raised, hours, ranking, growth.");
  if (/\bI\b/.test(t)) tips.push("Drop “I” — Common App descriptions read as short fragments.");
  if (/\b(?:very|really|a lot|many|various|stuff|things)\b/i.test(t)) tips.push("Replace vague words (very, many, various) with specifics.");
  if (!/(?:won|raised|grew|increased|reached|launched|placed|award|finalist|published|served|taught|\d+%)/i.test(t)) tips.push("End with the result or impact — what changed because of you?");
  if (t.length < 90) tips.push(`${t.length}/150 characters — you have room for one more concrete detail.`);
  return tips.slice(0, 5);
}

export default function ActivitiesEditor() {
  const EMPTY_FORM = {
    title: "", topic: "", role: "", description: "", summary: "",
    hours_per_week: "", leadership: false, start_date: "", end_date: "", category: "", ai_score: null
  };
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [essai, setEssai] = useState(null); // { suggestions, tips, note } from MEPAi
  const [essaiLoading, setEssaiLoading] = useState(false);
  const [media, setMedia] = useState([]); // [{ file, url }] photos & videos picked for the activity being added
  const [wsKey, setWsKey] = useState(0); // bump to clear the description workspace after saving
  const [saving, setSaving] = useState(false);
  const draftReady = useRef(false);
  const [recs, setRecs] = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [adviaiOn, setAdviaiOn] = useState(true); // MEPAi feature flag (from plan)

  const loadActivities = () => apiFetch("/api/students/me/activities").then(setActivities).catch(() => {});

  // Reopen with the last MEPAi recommendations and description suggestions
  useEffect(() => {
    loadSaved(["activity_recommendations", "activity_description", "activity_draft"]).then((sv) => {
      if (sv.activity_recommendations?.[""]) setRecs(sv.activity_recommendations[""]);
      if (sv.activity_description?.new) setEssai(sv.activity_description.new);
      // continue an activity the student started but hadn't saved yet
      if (sv.activity_draft?.new?.draft) setForm((f) => ({ ...f, ...sv.activity_draft.new.draft }));
    }).finally(() => { draftReady.current = true; });
  }, []);

  // Autosave the unsaved activity form as a draft (photos/videos are attached on Save)
  useEffect(() => {
    if (!draftReady.current) return undefined;
    const t = setTimeout(() => {
      const empty = Object.entries(form).every(([k, v]) => !v || v === EMPTY_FORM[k]);
      if (empty) apiFetch("/api/ai/saved/activity_draft?scope=new", { method: "DELETE" }).catch(() => {});
      else apiFetch("/api/ai/saved/activity_draft", { method: "PUT", body: JSON.stringify({ scope: "new", draft: form }) }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadActivities();
    apiFetch("/api/students/me/plan").then((p) => setAdviaiOn(!!p?.features?.adviai)).catch(() => {});
  }, []);

  const updateField = (key) => (e) => {
    const value = key === "leadership" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // MEPAi: write 150-char description options from the details filled in so far
  const runEssai = async () => {
    setEssaiLoading(true);
    try {
      setEssai(await apiFetch("/api/ai/activity-description", { method: "POST", body: JSON.stringify({ activity: form, scope: "new" }) }));
    } catch (err) { alert(err.message || "MEPAi could not write a description"); }
    finally { setEssaiLoading(false); }
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
    e?.preventDefault?.();
    if (!form.title.trim()) { setStatus("Add a title first."); return; }
    setSaving(true);
    setStatus("Saving…");
    try {
      const { id } = await apiFetch("/api/students/me/activities", { method: "POST", body: JSON.stringify(form) });
      const failed = [];
      for (let i = 0; i < media.length; i++) {
        setStatus(`Uploading ${i + 1} of ${media.length}…`);
        const fd = new FormData();
        fd.append("file", media[i].file);
        try { await apiUpload(`/api/students/me/activities/${id}/media`, fd); } catch (err) { failed.push(`${media[i].file.name}: ${err.message}`); }
      }
      media.forEach((m) => URL.revokeObjectURL(m.url));
      setMedia([]);
      setForm(EMPTY_FORM);
      setEssai(null);
      // the draft and its MEPAi results belonged to this activity — clear them for the next one
      await Promise.all(["activity_draft", "activity_guidance", "activity_grammar", "activity_description"].map((k) => apiFetch(`/api/ai/saved/${k}?scope=new`, { method: "DELETE" }).catch(() => {})));
      setWsKey((k) => k + 1);
      await loadActivities();
      setStatus(failed.length ? `Saved, but some files didn't upload — ${failed.join("; ")}` : "Saved.");
      if (!failed.length) setTimeout(() => setStatus(""), 2500);
    } catch (err) {
      setStatus(err.message);
    } finally { setSaving(false); }
  };

  const pickMedia = (files) => {
    const next = [...media];
    for (const file of Array.from(files || [])) {
      if (!/^(image|video)\//.test(file.type)) { setStatus(`${file.name} isn't a photo or video.`); continue; }
      if (file.size > 50 * 1024 * 1024) { setStatus(`${file.name} is larger than 50MB.`); continue; }
      if (next.length >= 10) { setStatus("Up to 10 files per activity."); break; }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setMedia(next);
  };
  const removeSavedMedia = async (activityId, docId) => {
    if (!window.confirm("Remove this photo/video?")) return;
    try { await apiFetch(`/api/students/me/activities/${activityId}/media/${docId}`, { method: "DELETE" }); await loadActivities(); } catch (err) { setStatus(err.message); }
  };

  return (
    <div>
      {/* Free plan: MEPAi upsell (paid plans go straight to the recommendations card) */}
      {!adviaiOn && (
        <aside className="advisory" style={{ borderStyle: "dashed" }}>
          <div className="advisory-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>MEPAi</span><span className="badge">Paid</span>
          </div>
          <h4>AI advisory is a paid feature</h4>
          <p style={{ fontSize: "0.9rem" }}>Upgrade to <strong>Essential</strong> or <strong>Professional</strong> to unlock <strong>MEPAi</strong> — recommended activities, AI topic &amp; summary, and an AI score for each activity.</p>
          <Link to="/pricing" className="button gold" style={{ marginTop: "0.6rem", display: "inline-block" }}>View plans &amp; upgrade →</Link>
        </aside>
      )}

      {/* Recommended Extracurricular Activities (MEPAi) — paid only */}
      {adviaiOn && (
        <section className="card" style={{ padding: "1.5rem" }}>
          <div className="flex-between" style={{ flexWrap: "wrap", gap: "0.5rem", marginBottom: recs ? "1rem" : 0 }}>
            <div>
              <h2 className="section-title" style={{ fontSize: "1.2rem", marginBottom: "0.15rem" }}>Recommended Extracurricular Activities (MEPAi)</h2>
              <p className="muted" style={{ fontSize: "0.85rem" }}>Personalized to your intended major and the Spike Strategy.</p>
            </div>
            <button className="button gold" style={{ fontSize: "0.75rem" }} disabled={recsLoading} onClick={loadRecommendations}>
              {recsLoading ? "Thinking…" : recs ? "Rethink" : "Get recommendations"}
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
      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: "2rem" }} className="acts-grid">
        <div className="card" style={{ padding: "2rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}>Extracurricular Activity Editor</h2>
          <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "1.5rem" }}>
            Use the formula: [Action verb] + [What you did] + [Impact / Result], in 150 characters.
          </p>

          <div>
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

            {/* MEPAi summary + score (paid only) */}
            {adviaiOn && (
              <div className="card compact" style={{ background: "var(--surface-warm)", marginBottom: "1rem" }}>
                <div className="flex-between" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: 0 }}>MEPAi topic, summary &amp; score</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    {form.ai_score != null && <span className="badge primary">Score (MEPAi): {form.ai_score}/100</span>}
                    <button type="button" className="button ghost" style={{ padding: "0.35rem 0.85rem", fontSize: "0.72rem" }} disabled={analyzing || !form.title} onClick={analyzeActivity}>
                      {analyzing ? "Analyzing…" : "Generate (MEPAi)"}
                    </button>
                  </div>
                </div>
                {form.summary && (
                  <p style={{ margin: "0.6rem 0 0", fontSize: "0.85rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>{form.summary}</p>
                )}
              </div>
            )}

            <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>Write the description and add photos or videos below, then press <strong>Save activity</strong>. Your draft is saved automatically.</p>
          </div>
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
                    {activity.media?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                        {activity.media.map((m) => (
                          <div key={m.document_id} style={{ position: "relative", width: 72, height: 54, borderRadius: 6, overflow: "hidden", border: "1px solid var(--rule)", background: "#000" }}>
                            <a href={fileUrl(m.file_path)} target="_blank" rel="noopener noreferrer" title={m.original_name}>
                              {m.media_type === "video"
                                ? <video src={fileUrl(m.file_path)} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <img src={fileUrl(m.file_path)} alt={m.original_name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                              {m.media_type === "video" && <span style={{ position: "absolute", left: 4, bottom: 2, color: "#fff", fontSize: "0.7rem" }}>▶</span>}
                            </a>
                            <button type="button" aria-label="Remove" onClick={() => removeSavedMedia(activity.id, m.document_id)} style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", fontSize: "0.7rem", lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
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

      {/* Description (MEPAi workspace) + photos & videos + save — full width */}
      <section className="card" style={{ padding: "2rem", marginTop: "2rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>Description</h2>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
          Common App limit: 150 characters. Write on the left — MEPAi suggests on the right; you make the edits.
        </p>
        <MepaiWorkspace
          heading={form.title ? `Activity: ${form.title}` : "Activity description"}
          value={form.description}
          onChange={(v) => setForm((f) => ({ ...f, description: v }))}
          placeholder="Founded coding nonprofit teaching 500+ elementary students. Recruited 25 volunteers, raised $8K, featured in local news."
          limit={150}
          unit="chars"
          minHeight={380}
          tipsFn={activityTips}
          guidanceKind="activity_guidance"
          grammarKind="activity_grammar"
          scope="new"
          workspace="activity"
          clearKey={wsKey}
          requestGuidance={() => apiFetch("/api/ai/activity-guidance", { method: "POST", body: JSON.stringify({ activity: form, scope: "new" }) })}
          extraPanel={
            <div style={{ border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "var(--surface)", padding: "0.85rem 1rem" }}>
              <div className="flex-between" style={{ marginBottom: essai ? "0.5rem" : 0, gap: "0.5rem", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: "1rem" }}>Need a starting point?</div>
                <button type="button" className="button gold" style={{ padding: "0.3rem 0.8rem", fontSize: "0.72rem" }} disabled={essaiLoading || !(form.title || form.description)} onClick={runEssai}>
                  {essaiLoading ? "Writing…" : essai ? "New options" : "Write 3 options"}
                </button>
              </div>
              {essai && (
                <div style={{ display: "grid", gap: "0.45rem" }}>
                  {(essai.suggestions || []).map((sug, i) => (
                    <div key={i} style={{ padding: "0.5rem 0.65rem", background: "var(--paper-warm)", borderRadius: "var(--r-md)", fontSize: "0.84rem", color: "var(--ink-soft)" }}>
                      {sug}
                      <div className="flex-between" style={{ marginTop: "0.3rem" }}>
                        <span className="text-muted" style={{ fontSize: "0.72rem" }}>{sug.length}/150</span>
                        <button type="button" className="button ghost" style={{ padding: "0.15rem 0.55rem", fontSize: "0.68rem" }} onClick={() => setForm((f) => ({ ...f, description: sug.slice(0, 150) }))}>Use as a start</button>
                      </div>
                    </div>
                  ))}
                  <p className="text-muted" style={{ fontSize: "0.72rem", margin: 0 }}>Then edit it in your own words — replace any [#] with real numbers.</p>
                </div>
              )}
            </div>
          }
        />

        <h3 className="subtitle" style={{ marginTop: "2rem", marginBottom: "0.25rem" }}>Photos &amp; videos</h3>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>Show your work — project photos, competition moments, a short demo video. PNG, JPG, GIF, WebP, MP4, MOV or WebM, up to 50MB each.</p>
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pickMedia(e.dataTransfer.files); }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", padding: "1.25rem", border: "2px dashed var(--rule)", borderRadius: "var(--r-md)", background: "var(--surface)", cursor: "pointer", fontSize: "0.9rem", color: "var(--ink-muted)" }}
        >
          <input type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/quicktime,video/webm" style={{ display: "none" }} onChange={(e) => { pickMedia(e.target.files); e.target.value = ""; }} />
          <span style={{ fontSize: "1.3rem" }}>🖼️</span> Click to add photos or videos, or drag them here
        </label>
        {media.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.85rem" }}>
            {media.map((m, i) => (
              <div key={m.url} style={{ position: "relative", width: 120, height: 90, borderRadius: "var(--r-md)", overflow: "hidden", border: "1px solid var(--rule)", background: "#000" }}>
                {m.file.type.startsWith("video/")
                  ? <video src={m.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <img src={m.url} alt={m.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                {m.file.type.startsWith("video/") && <span style={{ position: "absolute", left: 6, bottom: 4, color: "#fff", fontSize: "0.8rem" }}>▶ video</span>}
                <button type="button" aria-label={`Remove ${m.file.name}`} onClick={() => { URL.revokeObjectURL(m.url); setMedia(media.filter((_, j) => j !== i)); }} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
          <button className="button" type="button" onClick={addActivity} disabled={saving}>{saving ? "Saving…" : "Save activity"}</button>
          {status && <span className="muted" style={{ fontSize: "0.85rem" }}>{status}</span>}
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
