import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, getUserRole } from "../api/client";

export default function EssayEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = getUserRole();
  const essayId = searchParams.get("id");
  
  useEffect(() => {
    if (role === "parent") {
      navigate("/parent", { replace: true });
    }
  }, [role, navigate]);

  if (role === "parent") return null;

  const editorRef = useRef(null);
  const [essay, setEssay] = useState({ id: null, title: "", content: "", word_count: 0 });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({ clarity: true, grammar: false, structure: false });
  const [essayList, setEssayList] = useState([]);
  const [showEssayList, setShowEssayList] = useState(false);

  useEffect(() => {
    loadEssays();
    if (essayId) {
      loadEssay(essayId);
    } else {
      // Create new essay if no ID
      setEssay({ id: null, title: "My Journey in Computer Science", content: "", word_count: 0 });
    }
  }, [essayId]);

  const loadEssays = async () => {
    try {
      const data = await apiFetch("/api/students/me/essays");
      setEssayList(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEssay = async (id) => {
    try {
      const data = await apiFetch(`/api/students/me/essays/${id}`);
      setEssay(data);
      if (editorRef.current) {
        editorRef.current.innerHTML = data.content || "";
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateWordCount = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const words = text.split(/\s+/).filter(w => w.length > 0);
    setEssay(prev => ({ ...prev, word_count: words.length }));
  };

  const handleContentChange = () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    setEssay(prev => ({ ...prev, content }));
    updateWordCount();
  };

  const saveEssay = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    try {
      const content = editorRef.current.innerHTML;
      const title = essay.title || "Untitled Essay";
      const wordCount = editorRef.current.innerText.split(/\s+/).filter(w => w.length > 0).length;
      
      if (essay.id) {
        await apiFetch(`/api/students/me/essays/${essay.id}`, {
          method: "PUT",
          body: JSON.stringify({ title, content })
        });
      } else {
        const result = await apiFetch("/api/students/me/essays", {
          method: "POST",
          body: JSON.stringify({ title, content })
        });
        setEssay(prev => ({ ...prev, id: result.id }));
        navigate(`/essay?id=${result.id}`, { replace: true });
      }
      await loadEssays();
      setSaving(false);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const getFeedback = async () => {
    if (!editorRef.current) return;
    setLoading(true);
    try {
      const content = editorRef.current.innerHTML;
      const data = await apiFetch("/api/ai/essay-feedback", {
        method: "POST",
        body: JSON.stringify({ essay: content })
      });
      setFeedback(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (category, suggestion) => {
    if (!editorRef.current) return;
    // Simple implementation: highlight the suggestion
    alert(`Applying suggestion: ${suggestion}\n\nIn a full implementation, this would automatically update your essay.`);
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      formatText("createLink", url);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.5rem", minHeight: "calc(100vh - 120px)" }}>
      {/* Left: Essay Editor */}
      <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0 }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border-light)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0 }}>AI Essay Editor</h1>
            <button
              className="button ghost"
              onClick={() => setShowEssayList(!showEssayList)}
              style={{ fontSize: "0.875rem" }}
            >
              {showEssayList ? "Hide" : "My Essays"}
            </button>
          </div>
          
          {showEssayList && (
            <div style={{ marginBottom: "1rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <strong>My Essays</strong>
                <button
                  className="button"
                  onClick={() => {
                    setEssay({ id: null, title: "Untitled Essay", content: "", word_count: 0 });
                    if (editorRef.current) editorRef.current.innerHTML = "";
                    navigate("/essay");
                    setShowEssayList(false);
                  }}
                  style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                >
                  New Essay
                </button>
              </div>
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {essayList.length === 0 ? (
                  <p className="muted" style={{ fontSize: "0.875rem" }}>No essays yet. Create your first one!</p>
                ) : (
                  essayList.map((e) => (
                    <div
                      key={e.id}
                      onClick={() => {
                        loadEssay(e.id);
                        navigate(`/essay?id=${e.id}`);
                        setShowEssayList(false);
                      }}
                      style={{
                        padding: "0.5rem",
                        marginBottom: "0.5rem",
                        background: essay.id === e.id ? "var(--primary)" : "#fff",
                        color: essay.id === e.id ? "#fff" : "var(--text-primary)",
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                        fontSize: "0.875rem"
                      }}
                    >
                      <strong>{e.title || "Untitled"}</strong>
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", opacity: 0.8 }}>
                        {e.word_count} words • {new Date(e.last_edited_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <input
            type="text"
            value={essay.title}
            onChange={(e) => setEssay(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Essay Title"
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1.125rem",
              fontWeight: "600",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              background: "#fff"
            }}
          />
        </div>

        {/* Toolbar */}
        <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1px solid var(--border-light)", background: "var(--bg-secondary)", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={() => formatText("undo")} title="Undo" style={{ padding: "0.5rem", background: "#fff", border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer" }}>↶</button>
          <button onClick={() => formatText("redo")} title="Redo" style={{ padding: "0.5rem", background: "#fff", border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer" }}>↷</button>
          <div style={{ width: "1px", background: "var(--border)", margin: "0 0.25rem" }} />
          <button onClick={() => formatText("bold")} title="Bold" style={{ padding: "0.5rem", background: "#fff", border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer", fontWeight: "700" }}>B</button>
          <button onClick={() => formatText("italic")} title="Italic" style={{ padding: "0.5rem", background: "#fff", border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer", fontStyle: "italic" }}>I</button>
          <button onClick={() => formatText("underline")} title="Underline" style={{ padding: "0.5rem", background: "#fff", border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer", textDecoration: "underline" }}>U</button>
          <div style={{ width: "1px", background: "var(--border)", margin: "0 0.25rem" }} />
          <button onClick={() => formatText("justifyLeft")} title="Align Left" style={{ padding: "0.5rem", background: "#fff", border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer" }}>◧</button>
          <button onClick={() => formatText("justifyCenter")} title="Align Center" style={{ padding: "0.5rem", background: "#fff", border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer" }}>◨</button>
          <button onClick={() => formatText("justifyRight")} title="Align Right" style={{ padding: "0.5rem", background: "#fff", border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer" }}>◩</button>
          <div style={{ width: "1px", background: "var(--border)", margin: "0 0.25rem" }} />
          <button onClick={() => formatText("insertUnorderedList")} title="Bullet List" style={{ padding: "0.5rem", background: "#fff", border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer" }}>•</button>
          <button onClick={() => formatText("insertOrderedList")} title="Numbered List" style={{ padding: "0.5rem", background: "#fff", border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer" }}>1.</button>
          <button onClick={insertLink} title="Insert Link" style={{ padding: "0.5rem", background: "#fff", border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer" }}>🔗</button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          style={{
            flex: 1,
            padding: "2rem",
            minHeight: "400px",
            outline: "none",
            fontSize: "1rem",
            lineHeight: "1.6",
            overflowY: "auto"
          }}
          dangerouslySetInnerHTML={{ __html: essay.content || "" }}
        />

        {/* Footer */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)" }}>
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Essay</span>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{essay.word_count} words</span>
            <button
              className="button"
              onClick={saveEssay}
              disabled={saving}
              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Right: AI Feedback */}
      <div className="card" style={{ position: "sticky", top: "100px", alignSelf: "start", maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem" }}>AI Feedback & Suggestions</h2>
        
        {!feedback && (
          <button
            className="button"
            onClick={getFeedback}
            disabled={loading || !essay.content}
            style={{ width: "100%", marginBottom: "1.5rem" }}
          >
            {loading ? "Analyzing..." : "Get AI Feedback"}
          </button>
        )}

        {feedback && (
          <>
            {/* Grammar & Style */}
            <div style={{ marginBottom: "1rem", border: "1px solid var(--border)", borderRadius: "0.5rem", overflow: "hidden" }}>
              <div
                onClick={() => toggleCategory("grammar")}
                style={{
                  padding: "1rem",
                  background: "var(--bg-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <strong>Grammar & Style</strong>
                <span>{expandedCategories.grammar ? "▼" : "▶"}</span>
              </div>
              {expandedCategories.grammar && (
                <div style={{ padding: "1rem" }}>
                  {feedback.grammar.issues > 0 ? (
                    <div style={{ color: "var(--error)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>⚠️</span>
                      <strong>{feedback.grammar.issues} issues found</strong>
                    </div>
                  ) : (
                    <p className="muted">No grammar issues found!</p>
                  )}
                  {feedback.grammar.suggestions && feedback.grammar.suggestions.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                      {feedback.grammar.suggestions.map((s, idx) => (
                        <li key={idx} style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Clarity & Flow */}
            <div style={{ marginBottom: "1rem", border: "1px solid var(--border)", borderRadius: "0.5rem", overflow: "hidden" }}>
              <div
                onClick={() => toggleCategory("clarity")}
                style={{
                  padding: "1rem",
                  background: "var(--bg-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <strong>Clarity & Flow</strong>
                <span>{expandedCategories.clarity ? "▼" : "▶"}</span>
              </div>
              {expandedCategories.clarity && (
                <div style={{ padding: "1rem" }}>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {feedback.clarity.suggestions.map((s, idx) => (
                      <li key={idx} style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Structure */}
            <div style={{ marginBottom: "1.5rem", border: "1px solid var(--border)", borderRadius: "0.5rem", overflow: "hidden" }}>
              <div
                onClick={() => toggleCategory("structure")}
                style={{
                  padding: "1rem",
                  background: "var(--bg-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <strong>Structure</strong>
                <span>{expandedCategories.structure ? "▼" : "▶"}</span>
              </div>
              {expandedCategories.structure && (
                <div style={{ padding: "1rem" }}>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {feedback.structure.suggestions.map((s, idx) => (
                      <li key={idx} style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              className="button"
              onClick={() => {
                // In a full implementation, this would apply suggestions automatically
                alert("Apply Suggestions feature would automatically update your essay based on AI feedback.");
              }}
              style={{ width: "100%" }}
            >
              Apply Suggestions
            </button>

            {feedback.overall && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "0.5rem" }}>
                <div style={{ marginBottom: "0.5rem" }}>
                  <strong>Overall Score: {feedback.overall.score}/100</strong>
                </div>
                <p style={{ fontSize: "0.875rem", margin: 0 }}>{feedback.overall.feedback}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
