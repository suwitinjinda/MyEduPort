import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { apiFetch, getUserRole } from "../api/client";
import AdvisoryNote, { PORTFOLIO_GUIDE } from "../components/AdvisoryNote.jsx";

const COMMON_APP_PROMPTS = PORTFOLIO_GUIDE.essays.prompts;

// Short plain-text summary/preview of an essay (for the essays list)
const plainExcerpt = (html, n = 150) => {
  const t = (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n).trim()}…` : t;
};

export default function EssayEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = getUserRole();
  const essayId = searchParams.get("id");

  useEffect(() => {
    if (role === "parent") navigate("/parent", { replace: true });
  }, [role, navigate]);

  if (role === "parent") return null;

  const editorRef = useRef(null);
  const [essay, setEssay] = useState({ id: null, title: "", topic: "", content: "", word_count: 0, status: "draft", ai_score: null });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({ clarity: true, grammar: false, structure: false });
  const [essayList, setEssayList] = useState([]);
  const [showEssayList, setShowEssayList] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [activeDraftNo, setActiveDraftNo] = useState(null); // null = working copy
  const [savingDraft, setSavingDraft] = useState(false);
  const [plan, setPlan] = useState("free");
  const [adviAi, setAdviAi] = useState(null);
  const [adviLoading, setAdviLoading] = useState(false);
  const isPro = plan === "essential" || plan === "professional";

  useEffect(() => {
    apiFetch("/api/auth/me").then((u) => setPlan(u?.plan || "free")).catch(() => {});
  }, []);

  const generateAdviAi = async () => {
    setAdviLoading(true);
    try {
      const data = await apiFetch("/api/ai/essay-advisory", { method: "POST", body: JSON.stringify({ essay: editorRef.current?.innerHTML || "" }) });
      setAdviAi(data);
    } catch (err) { alert(err.message || "Could not generate AdviAI"); }
    finally { setAdviLoading(false); }
  };

  useEffect(() => {
    loadEssays();
    if (essayId) loadEssay(essayId);
    else setEssay({ id: null, title: "Common App Personal Statement", topic: "", content: "", word_count: 0, status: "draft", ai_score: null });
  }, [essayId]);

  const loadEssays = async () => {
    try {
      const data = await apiFetch("/api/students/me/essays");
      setEssayList(data || []);
    } catch (err) { console.error(err); }
  };

  const loadEssay = async (id) => {
    try {
      const data = await apiFetch(`/api/students/me/essays/${id}`);
      setEssay(data);
      if (editorRef.current) editorRef.current.innerHTML = data.content || "";
      setActiveDraftNo(null);
      loadDrafts(id);
    } catch (err) { console.error(err); }
  };

  const loadDrafts = async (id) => {
    if (!id) { setDrafts([]); return; }
    try {
      const data = await apiFetch(`/api/students/me/essays/${id}/drafts`);
      setDrafts(Array.isArray(data) ? data : []);
    } catch (err) { setDrafts([]); }
  };

  // Snapshot the current editor content as a new numbered draft (Draft 1, 2, 3…)
  // If the essay was never saved, auto-save it first so the user doesn't have
  // to press Save separately.
  const saveAsNewDraft = async () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    if (!content || !content.replace(/<[^>]*>/g, "").trim()) { alert("Write something first."); return; }
    setSavingDraft(true);
    try {
      let id = essay.id;
      if (!id) {
        const created = await apiFetch("/api/students/me/essays", {
          method: "POST",
          body: JSON.stringify({ title: essay.title || "Untitled Essay", topic: essay.topic || "", content, summary: plainExcerpt(content) })
        });
        id = created.id;
        setEssay((prev) => ({ ...prev, id }));
        navigate(`/essay?id=${id}`, { replace: true });
        await loadEssays();
      }
      const result = await apiFetch(`/api/students/me/essays/${id}/drafts`, { method: "POST", body: JSON.stringify({ content }) });
      await loadDrafts(id);
      setActiveDraftNo(result.draft_no);
    } catch (err) { alert(err.message || "Could not save draft"); }
    finally { setSavingDraft(false); }
  };

  // Load a saved draft snapshot into the editor
  const openDraft = (d) => {
    if (editorRef.current) editorRef.current.innerHTML = d.content || "";
    setEssay((prev) => ({ ...prev, content: d.content || "", word_count: d.word_count || 0 }));
    setActiveDraftNo(d.draft_no);
  };

  // Return to the live working copy (last saved essay content)
  const openWorking = async () => {
    setActiveDraftNo(null);
    if (essay.id) {
      const data = await apiFetch(`/api/students/me/essays/${essay.id}`).catch(() => null);
      if (data) {
        setEssay(data);
        if (editorRef.current) editorRef.current.innerHTML = data.content || "";
      }
    }
  };

  const deleteDraft = async (d) => {
    if (!window.confirm(`Delete Draft ${d.draft_no}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/students/me/essays/${essay.id}/drafts/${d.id}`, { method: "DELETE" });
      if (activeDraftNo === d.draft_no) await openWorking();
      await loadDrafts(essay.id);
    } catch (err) { alert(err.message); }
  };

  const updateWordCount = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    setEssay((prev) => ({ ...prev, word_count: words.length }));
  };

  // NOTE: do NOT push innerHTML into React state on every keystroke.
  // The editor is uncontrolled — content lives in the DOM (editorRef) and is
  // read on save/feedback. Writing content to state re-renders the
  // dangerouslySetInnerHTML div and resets the caret to the start, which made
  // typing appear reversed (".tset a si sihT"). We only track word count here.
  const handleContentChange = () => {
    updateWordCount();
  };

  const saveEssay = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    try {
      const content = editorRef.current.innerHTML;
      const title = essay.title || "Untitled Essay";
      const topic = essay.topic || "";
      const summary = plainExcerpt(content);
      if (essay.id) {
        await apiFetch(`/api/students/me/essays/${essay.id}`, { method: "PUT", body: JSON.stringify({ title, topic, content, summary, status: essay.status }) });
      } else {
        const result = await apiFetch("/api/students/me/essays", { method: "POST", body: JSON.stringify({ title, topic, content, summary }) });
        setEssay((prev) => ({ ...prev, id: result.id }));
        navigate(`/essay?id=${result.id}`, { replace: true });
      }
      await loadEssays();
    } catch (err) {
      console.error(err);
      alert(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status) => {
    setEssay((prev) => ({ ...prev, status }));
    if (essay.id) {
      try {
        await apiFetch(`/api/students/me/essays/${essay.id}`, { method: "PUT", body: JSON.stringify({ status }) });
        await loadEssays();
      } catch (err) { console.error(err); }
    }
  };

  // Edit & Apply — AI revises the essay, applied straight into the editor
  const applyAiRevision = async () => {
    if (!editorRef.current) return;
    if (!window.confirm("Apply AI revision? This replaces the current draft (you can undo with Ctrl+Z).")) return;
    setApplying(true);
    try {
      const data = await apiFetch("/api/ai/essay-revise", { method: "POST", body: JSON.stringify({ essay: editorRef.current.innerHTML }) });
      if (data?.revised) {
        const html = data.revised.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
        editorRef.current.innerHTML = html;
        handleContentChange();
        await setStatus("revise");
      }
    } catch (err) { console.error(err); } finally { setApplying(false); }
  };

  const getFeedback = async () => {
    if (!editorRef.current) return;
    setLoading(true);
    try {
      const data = await apiFetch("/api/ai/essay-feedback", { method: "POST", body: JSON.stringify({ essay: editorRef.current.innerHTML }) });
      setFeedback(data);
      const aiScore = data?.overall?.score;
      if (aiScore != null) {
        setEssay((prev) => ({ ...prev, ai_score: aiScore }));
        if (essay.id) apiFetch(`/api/students/me/essays/${essay.id}`, { method: "PUT", body: JSON.stringify({ ai_score: aiScore }) }).catch(() => {});
      }
    } catch (err) { alert(err.message || "Could not get feedback"); }
    finally { setLoading(false); }
  };

  const toggleCategory = (k) => setExpandedCategories((p) => ({ ...p, [k]: !p[k] }));

  const formatText = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) formatText("createLink", url);
  };

  const wordTarget = 650;
  const progress = Math.min(100, Math.round((essay.word_count / wordTarget) * 100));

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <div className="eyebrow">EssAI · The 650-Word Personal Statement</div>
        <div className="flex-between" style={{ alignItems: "start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>
              Where you come alive.
            </h1>
            <p className="lede" style={{ marginTop: "0.5rem", maxWidth: "62ch" }}>
              Grades and activities show what you've done. Your essay shows
              who you are — in a voice that sounds like a smart 17-year-old.
            </p>
          </div>
          <button className="button ghost" onClick={() => setShowEssayList(!showEssayList)}>
            {showEssayList ? "Hide essays" : "My essays"}
          </button>
        </div>
      </header>

      {showEssayList && (
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1.5rem", background: "var(--surface-warm)" }}>
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h3 className="subtitle">My essays <span className="badge" style={{ marginLeft: "0.4rem" }}>{essayList.length}/5</span></h3>
            <button
              className="button gold"
              style={{ padding: "0.5rem 1rem", fontSize: "0.72rem" }}
              disabled={essayList.length >= 5}
              title={essayList.length >= 5 ? "Maximum 5 essays" : "Create a new essay"}
              onClick={() => {
                setEssay({ id: null, title: "Untitled Essay", topic: "", content: "", word_count: 0, status: "draft", ai_score: null });
                if (editorRef.current) editorRef.current.innerHTML = "";
                navigate("/essay");
                setShowEssayList(false);
              }}
            >
              {essayList.length >= 5 ? "Limit reached (5)" : "+ New essay"}
            </button>
          </div>
          <div style={{ display: "grid", gap: "0.5rem", maxHeight: "260px", overflowY: "auto" }}>
            {essayList.length === 0 ? (
              <p className="muted" style={{ fontSize: "0.88rem" }}>No essays yet. Create your first one.</p>
            ) : (
              essayList.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    loadEssay(e.id);
                    navigate(`/essay?id=${e.id}`);
                    setShowEssayList(false);
                  }}
                  style={{
                    padding: "0.85rem 1rem",
                    background: essay.id === e.id ? "var(--ink)" : "var(--surface)",
                    color: essay.id === e.id ? "var(--paper)" : "var(--ink)",
                    border: "1px solid var(--rule)",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s ease"
                  }}
                >
                  <strong style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>{e.title || "Untitled"}</strong>
                  {e.topic ? <span style={{ display: "block", fontSize: "0.75rem", fontStyle: "italic", opacity: 0.85, marginTop: "0.15rem" }}>Topic: {e.topic}</span> : null}
                  {(e.summary || plainExcerpt(e.content)) ? (
                    <span style={{ display: "block", fontSize: "0.78rem", opacity: 0.75, marginTop: "0.2rem", lineHeight: 1.4 }}>
                      {e.summary || plainExcerpt(e.content)}
                    </span>
                  ) : null}
                  <p style={{ margin: "0.35rem 0 0", fontSize: "0.72rem", opacity: 0.7 }}>
                    {e.word_count} words · {e.status || "draft"}{e.ai_score != null ? ` · AI ${e.ai_score}/100` : ""} · {new Date(e.last_edited_at).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.75rem" }} className="essay-grid">
        {/* Editor */}
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
          {/* Header strip */}
          <div style={{ padding: "1.5rem 1.75rem 1rem", borderBottom: "1px solid var(--rule-soft)" }}>
            <input
              type="text"
              value={essay.title}
              onChange={(e) => setEssay((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Essay title"
              style={{
                width: "100%",
                padding: "0.5rem 0",
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 700,
                border: "none",
                outline: "none",
                color: "var(--ink)",
                background: "transparent"
              }}
            />

            <input
              type="text"
              value={essay.topic || ""}
              onChange={(e) => setEssay((prev) => ({ ...prev, topic: e.target.value }))}
              placeholder="Topic — e.g. Overcoming self-doubt through debate"
              style={{ width: "100%", padding: "0.35rem 0", fontSize: "0.9rem", border: "none", borderBottom: "1px solid var(--rule-soft)", outline: "none", color: "var(--ink-soft)", background: "transparent", fontStyle: "italic" }}
            />

            {/* Draft / Revise / Final workflow */}
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem" }}>
              {["draft", "revise", "final"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={essay.status === s ? "badge primary" : "badge"}
                  style={{
                    cursor: "pointer", textTransform: "capitalize", padding: "0.35rem 0.85rem", fontSize: "0.72rem",
                    border: essay.status === s ? "1px solid var(--gold-deep)" : "1px solid var(--rule)",
                    background: essay.status === s ? "var(--gold-deep)" : "var(--surface)",
                    color: essay.status === s ? "#fff" : "var(--ink-soft)"
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Draft versions (Draft 1, 2, 3, …) */}
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-muted)", fontWeight: 600, marginRight: "0.15rem" }}>Drafts:</span>
              <button
                type="button"
                onClick={openWorking}
                className={activeDraftNo === null ? "badge primary" : "badge"}
                style={{
                  cursor: "pointer", padding: "0.3rem 0.7rem", fontSize: "0.72rem",
                  border: activeDraftNo === null ? "1px solid var(--teal-deep)" : "1px solid var(--rule)",
                  background: activeDraftNo === null ? "var(--teal-deep)" : "var(--surface)",
                  color: activeDraftNo === null ? "#fff" : "var(--ink-soft)"
                }}
              >
                Working
              </button>
              {drafts.map((d) => (
                <span key={d.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                  <button
                    type="button"
                    onClick={() => openDraft(d)}
                    title={`${d.word_count} words · ${new Date(d.created_at).toLocaleString()}`}
                    className={activeDraftNo === d.draft_no ? "badge primary" : "badge"}
                    style={{
                      cursor: "pointer", padding: "0.3rem 0.7rem", fontSize: "0.72rem",
                      border: activeDraftNo === d.draft_no ? "1px solid var(--teal-deep)" : "1px solid var(--rule)",
                      background: activeDraftNo === d.draft_no ? "var(--teal-deep)" : "var(--surface)",
                      color: activeDraftNo === d.draft_no ? "#fff" : "var(--ink-soft)"
                    }}
                  >
                    Draft {d.draft_no}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteDraft(d)}
                    title={`Delete Draft ${d.draft_no}`}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-faint)", fontSize: "0.85rem", lineHeight: 1, padding: "0 0.15rem" }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={saveAsNewDraft}
                disabled={savingDraft || !essay.word_count}
                title={!essay.word_count ? "Write something first" : "Snapshot the current text as a new draft (auto-saves the essay)"}
                className="badge"
                style={{ cursor: "pointer", padding: "0.3rem 0.7rem", fontSize: "0.72rem", border: "1px dashed var(--rule)", background: "var(--surface)", color: "var(--ink-soft)" }}
              >
                {savingDraft ? "Saving…" : "+ Save as new draft"}
              </button>
            </div>
            {activeDraftNo !== null && (
              <p className="muted" style={{ fontSize: "0.72rem", marginTop: "0.35rem" }}>
                Viewing Draft {activeDraftNo} (a snapshot). Edit and press <strong>Save</strong> to make it your working copy, or switch back to <strong>Working</strong>.
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
              <button
                className="button ghost"
                style={{ padding: "0.4rem 0.75rem", fontSize: "0.7rem" }}
                onClick={() => setPromptOpen(!promptOpen)}
              >
                {promptOpen ? "Hide prompts" : "Common App prompts"}
              </button>
              <div style={{ fontSize: "0.78rem", color: essay.word_count > wordTarget ? "var(--error)" : "var(--ink-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                {essay.word_count} / {wordTarget} words
                {essay.word_count > wordTarget && (
                  <span style={{ marginLeft: "0.5rem", color: "var(--error)" }}>
                    · {essay.word_count - wordTarget} over limit
                  </span>
                )}
                {essay.word_count > 0 && essay.word_count < 500 && (
                  <span style={{ marginLeft: "0.5rem", color: "var(--warn)" }}>
                    · under-developed
                  </span>
                )}
              </div>
            </div>
            <div className="progress" style={{ marginTop: "0.6rem" }}>
              <span style={{ width: `${Math.min(100, progress)}%`, background: essay.word_count > wordTarget ? "var(--error)" : essay.word_count < 500 && essay.word_count > 0 ? "var(--warn)" : "var(--gold)" }} />
            </div>

            {promptOpen && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--surface-warm)", border: "1px solid var(--rule)" }}>
                <div className="eyebrow" style={{ marginBottom: "0.75rem" }}>Choose one prompt</div>
                <ol style={{ paddingLeft: "1.5rem", display: "grid", gap: "0.65rem" }}>
                  {COMMON_APP_PROMPTS.map((p, i) => (
                    <li key={i} style={{ fontFamily: "var(--font-serif)", fontSize: "0.9rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>
                      {p}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", gap: "0.25rem", padding: "0.5rem 1.75rem", borderBottom: "1px solid var(--rule-soft)", background: "var(--paper)" }}>
            {[
              ["undo", "↶"], ["redo", "↷"], ["sep"],
              ["bold", "B"], ["italic", "I"], ["underline", "U"], ["sep"],
              ["justifyLeft", "◧"], ["justifyCenter", "◨"], ["justifyRight", "◩"], ["sep"],
              ["insertUnorderedList", "•"], ["insertOrderedList", "1."]
            ].map((b, idx) =>
              b[0] === "sep" ? (
                <div key={idx} style={{ width: "1px", background: "var(--rule)", margin: "0.25rem 0.25rem" }} />
              ) : (
                <button
                  key={idx}
                  onClick={() => formatText(b[0])}
                  style={{
                    padding: "0.4rem 0.65rem",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-muted)",
                    fontWeight: b[0] === "bold" ? 700 : 500,
                    fontStyle: b[0] === "italic" ? "italic" : "normal",
                    textDecoration: b[0] === "underline" ? "underline" : "none",
                    fontSize: "0.95rem"
                  }}
                >
                  {b[1]}
                </button>
              )
            )}
            <button onClick={insertLink} style={{ padding: "0.4rem 0.65rem", background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-muted)" }}>
              ⌘ link
            </button>
          </div>

          {/* Editor body */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleContentChange}
            style={{
              flex: 1,
              padding: "2.5rem 3rem",
              minHeight: "420px",
              outline: "none",
              fontFamily: "var(--font-serif)",
              fontSize: "1.05rem",
              lineHeight: 1.75,
              color: "var(--ink)",
              overflowY: "auto"
            }}
            dangerouslySetInnerHTML={{ __html: essay.content || "" }}
          />

          {/* Footer */}
          <div style={{ padding: "1rem 1.75rem", borderTop: "1px solid var(--rule-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper)" }}>
            <span className="text-muted">Drafts autosave to your account.</span>
            <button className="button" onClick={saveEssay} disabled={saving} style={{ padding: "0.5rem 1.25rem", fontSize: "0.75rem" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* Feedback panel */}
        <aside style={{ display: "grid", gap: "1.25rem", alignContent: "start" }}>
          {isPro ? (
            /* PRO — AdviAI generates advice personalized to THIS draft */
            <aside className="advisory">
              <div className="advisory-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>AdviAI</span>
                <span className="badge primary" style={{ fontSize: "0.6rem" }}>PRO</span>
              </div>
              <h4>{adviAi ? "Personalized advice for this draft" : PORTFOLIO_GUIDE.essays.title}</h4>
              {!adviAi ? (
                <>
                  <p style={{ fontSize: "0.9rem" }}>Get AI advice tailored to your actual draft — not generic tips.</p>
                  <button className="button gold" onClick={generateAdviAi} disabled={adviLoading || !essay.word_count} style={{ width: "100%", marginTop: "0.5rem" }}>
                    {adviLoading ? "Thinking…" : "Generate AdviAI advice"}
                  </button>
                </>
              ) : (
                <>
                  <p>{adviAi.advisory}</p>
                  {(adviAi.do || adviAi.dont) && (
                    <div className="do-dont">
                      <div className="do">
                        <strong>Do</strong>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {(adviAi.do || []).map((item, idx) => <li key={idx}>{item}</li>)}
                        </ul>
                      </div>
                      <div className="dont">
                        <strong>Don't</strong>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {(adviAi.dont || []).map((item, idx) => <li key={idx}>{item}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}
                  <button className="button ghost" onClick={generateAdviAi} disabled={adviLoading} style={{ width: "100%", marginTop: "0.75rem" }}>
                    {adviLoading ? "Thinking…" : "Re-generate for current draft"}
                  </button>
                </>
              )}
            </aside>
          ) : (
            /* FREE — static Excellent Portfolio Guide advisory */
            <AdvisoryNote label="AdviAI" title={PORTFOLIO_GUIDE.essays.title} doDont={PORTFOLIO_GUIDE.essays.doDont}>
              <p>{PORTFOLIO_GUIDE.essays.summary}</p>
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                Upgrade to a paid plan to get AdviAI advice personalized to your own draft.
              </p>
            </AdvisoryNote>
          )}

          <div className="card">
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <h3 className="subtitle">EssAI Feedback</h3>
              {feedback?.overall && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
                    {feedback.overall.score}<span style={{ color: "var(--gold-deep)", fontSize: "0.85rem" }}>/100</span>
                  </div>
                </div>
              )}
            </div>

            {!feedback && (
              <button className="button gold" onClick={getFeedback} disabled={loading || !essay.word_count} style={{ width: "100%" }}>
                {loading ? "Analyzing…" : "Request EssAI Feedback"}
              </button>
            )}

            {feedback && (
              <>
                {feedback.overall?.feedback && (
                  <p className="muted" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", marginBottom: "1rem" }}>
                    {feedback.overall.feedback}
                  </p>
                )}

                {["clarity", "grammar", "structure"].map((cat) => {
                  const block = feedback[cat];
                  if (!block) return null;
                  return (
                    <div key={cat} style={{ borderTop: "1px solid var(--rule-soft)" }}>
                      <button
                        onClick={() => toggleCategory(cat)}
                        style={{
                          width: "100%",
                          padding: "0.85rem 0",
                          background: "transparent",
                          border: "none",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          color: "var(--ink)",
                          fontFamily: "var(--font-sans)",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase"
                        }}
                      >
                        <span>{cat}</span>
                        <span style={{ color: "var(--gold-deep)" }}>{expandedCategories[cat] ? "−" : "+"}</span>
                      </button>
                      {expandedCategories[cat] && (
                        <div style={{ paddingBottom: "1rem" }}>
                          {cat === "grammar" && block.issues > 0 && (
                            <div style={{ marginBottom: "0.5rem", color: "var(--error)", fontSize: "0.85rem", fontWeight: 600 }}>
                              {block.issues} issues found
                            </div>
                          )}
                          {(block.suggestions || []).map((s, idx) => (
                            <p
                              key={idx}
                              style={{
                                fontFamily: "var(--font-serif)",
                                fontSize: "0.9rem",
                                color: "var(--ink-soft)",
                                padding: "0.3rem 0",
                                paddingLeft: "1rem",
                                borderLeft: "2px solid var(--rule)",
                                marginBottom: "0.5rem",
                                lineHeight: 1.5
                              }}
                            >
                              {s}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button className="button ghost" onClick={getFeedback} disabled={loading} style={{ width: "100%", marginTop: "1rem" }}>
                  {loading ? "Analyzing…" : "Re-analyze"}
                </button>
                <button className="button gold" onClick={applyAiRevision} disabled={applying || !essay.word_count} style={{ width: "100%", marginTop: "0.5rem" }}>
                  {applying ? "Applying…" : "Edit & Apply (AI revision)"}
                </button>
                <p className="text-muted" style={{ fontSize: "0.72rem", textAlign: "center", marginTop: "0.4rem" }}>
                  Applies an AI-revised draft to the editor and marks the essay “revise”.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Essay structure breakdown */}
      <section style={{ marginTop: "3rem" }}>
        <div className="flex-between" style={{ marginBottom: "0.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h2 className="section-title" style={{ fontSize: "1.4rem", marginBottom: 0 }}>
            Essay structure — 650 words, four parts
          </h2>
          <Link to="/guide#essays" style={{ color: "var(--gold-deep)", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            See full guide →
          </Link>
        </div>
        <p className="muted" style={{ fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          A reliable structure for the personal statement.
        </p>
        <div className="grid four">
          {PORTFOLIO_GUIDE.essays.structure.map((s) => (
            <div key={s.part} className="card" style={{ padding: "1.5rem" }}>
              <div className="subtitle" style={{ fontSize: "1rem" }}>{s.part}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "var(--gold-deep)", letterSpacing: "-0.02em", marginTop: "0.5rem" }}>
                {s.words}<span style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>w</span>
              </div>
              <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Overdone vs Unique */}
      <section style={{ marginTop: "2.5rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          Topics — overdone vs unique
        </h2>
        <div className="grid two">
          <div className="card compact" style={{ borderLeft: "2px solid var(--error)" }}>
            <div className="eyebrow" style={{ paddingLeft: 0, display: "block", color: "var(--error)" }}>Overdone</div>
            <ul className="list" style={{ marginTop: "0.5rem" }}>
              {PORTFOLIO_GUIDE.essays.overdone.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
          <div className="card compact" style={{ borderLeft: "2px solid var(--success)" }}>
            <div className="eyebrow" style={{ paddingLeft: 0, display: "block", color: "var(--success)" }}>Unique & effective</div>
            <ul className="list" style={{ marginTop: "0.5rem" }}>
              {PORTFOLIO_GUIDE.essays.unique.map((u, i) => <li key={i}>{u}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* Supplemental essays */}
      <section style={{ marginTop: "2.5rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
          Supplemental essays
        </h2>
        <p className="muted" style={{ fontSize: "0.92rem", marginBottom: "1.5rem" }}>
          Most top schools require 2–10 additional essays. The common types.
        </p>
        <div style={{ display: "grid", gap: "1rem" }}>
          {PORTFOLIO_GUIDE.supplementalEssays.map((e) => (
            <div key={e.type} className="card" style={{ padding: "1.5rem" }}>
              <div className="subtitle" style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>{e.type}</div>
              {e.look && (
                <>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.4rem" }}>What they look for</div>
                  <ul className="list">{e.look.map((l, i) => <li key={i}>{l}</li>)}</ul>
                </>
              )}
              {(e.do || e.dont || e.avoid) && (
                <div className="grid two" style={{ marginTop: "0.75rem", gap: "0.75rem" }}>
                  {e.do && (
                    <div style={{ padding: "0.75rem", background: "var(--success-soft)", borderLeft: "2px solid var(--success)" }}>
                      <div className="eyebrow" style={{ paddingLeft: 0, display: "block", color: "var(--success)" }}>Do</div>
                      <ul className="list" style={{ marginTop: "0.4rem" }}>{e.do.map((d, i) => <li key={i} style={{ fontSize: "0.85rem" }}>{d}</li>)}</ul>
                    </div>
                  )}
                  {(e.dont || e.avoid) && (
                    <div style={{ padding: "0.75rem", background: "var(--error-soft)", borderLeft: "2px solid var(--error)" }}>
                      <div className="eyebrow" style={{ paddingLeft: 0, display: "block", color: "var(--error)" }}>{e.dont ? "Don't" : "Avoid"}</div>
                      <ul className="list" style={{ marginTop: "0.4rem" }}>{(e.dont || e.avoid).map((d, i) => <li key={i} style={{ fontSize: "0.85rem" }}>{d}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Essay timeline */}
      <section style={{ marginTop: "2.5rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          Essay timeline
        </h2>
        <div className="grid two">
          {PORTFOLIO_GUIDE.essayTimeline.map((t) => (
            <div key={t.when} className="card compact" style={{ background: "var(--surface-warm)" }}>
              <div className="eyebrow" style={{ paddingLeft: 0, display: "block" }}>{t.when}</div>
              <ul className="list" style={{ marginTop: "0.5rem" }}>
                {t.do.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: "1rem", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>
          Start early. Good essays take 10–20+ drafts.
        </p>
      </section>

      <style>{`
        @media (max-width: 1024px) {
          .essay-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
