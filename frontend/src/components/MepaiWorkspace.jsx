import React, { useEffect, useRef, useState } from "react";
import { apiFetch, loadSaved } from "../api/client";

// MEPAi writing workspace: the student writes and edits on the left; MEPAi suggests on the
// right (Actionable Suggestions checklist, Grammar & Spelling, Real-time Tips).
//
// MEPAi never rewrites the student's sentences or ideas — the one exception is "Fix it" on a
// grammar/spelling item, which swaps that exact phrase and can be undone. Everything else is
// theirs to change. Guidance, grammar results and ticked items are saved to the account
// (ai_saved_outputs) under guidanceKind / grammarKind + scope.
//
// Props
//   heading, value, onChange, placeholder
//   limit, unit ("words" | "chars")          — hard limit while typing
//   tipsFn(text, limit) → string[]           — instant tips, no AI call
//   guidanceKind, grammarKind, scope          — where results are saved
//   requestGuidance() → Promise<{score, summary, suggestions}>
//   workspace ("statement" | "activity")      — tells /api/ai/grammar where to save
//   saveButton { label, disabled, busy, onClick }
//   statusText, extraPanel (node shown at the top of the panel), clearKey (bump to clear results)
export const countWords = (t) => ((t || "").trim() ? (t || "").trim().split(/\s+/).length : 0);

export default function MepaiWorkspace({
  heading, value, onChange, placeholder, limit, unit = "words", tipsFn,
  guidanceKind, grammarKind, scope = "", requestGuidance, workspace,
  saveButton, statusText, extraPanel, clearKey, minHeight = 520
}) {
  const taRef = useRef(null);
  const [guidance, setGuidance] = useState(null);
  const [grammar, setGrammar] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ text: "", error: false });
  const [tips, setTips] = useState([]);
  // Snapshots of the text from before each applied grammar fix, newest last.
  const [undoStack, setUndoStack] = useState([]);

  // Reopen with the last saved guidance / grammar for this workspace
  useEffect(() => {
    let alive = true;
    setUndoStack([]); // a different piece of writing — nothing left to undo
    loadSaved([guidanceKind, grammarKind]).then((sv) => {
      if (!alive) return;
      setGuidance(sv[guidanceKind]?.[scope] || null);
      setGrammar(sv[grammarKind]?.[scope] || null);
    });
    return () => { alive = false; };
  }, [guidanceKind, grammarKind, scope, clearKey]);
  useEffect(() => {
    const t = setTimeout(() => setTips(tipsFn ? tipsFn(value, limit) : []), 500);
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const size = unit === "chars" ? (value || "").length : countWords(value);
  const words = countWords(value);
  const chars = (value || "").length;
  const within = (v) => (unit === "chars" ? v.length <= limit : countWords(v) <= limit);

  const run = async (label, fn) => {
    setBusy(label); setMsg({ text: "", error: false });
    try { await fn(); } catch (e) { setMsg({ text: e.message, error: true }); } finally { setBusy(""); }
  };
  const getGuidance = () => run("guide", async () => { setGuidance({ ...(await requestGuidance()), done: [] }); });
  const checkGrammar = () => run("grammar", async () => {
    const r = await apiFetch("/api/ai/grammar", { method: "POST", body: JSON.stringify({ text: value, workspace, scope }) });
    setGrammar({ changes: r.changes || [], done: [] });
    if (!(r.changes || []).length) setMsg({ text: "No grammar or spelling issues found.", error: false });
  });
  const toggle = (which, i) => {
    const cur = which === "g" ? guidance : grammar;
    if (!cur) return;
    const done = cur.done?.includes(i) ? cur.done.filter((x) => x !== i) : [...(cur.done || []), i];
    (which === "g" ? setGuidance : setGrammar)({ ...cur, done });
    apiFetch(`/api/ai/saved/${which === "g" ? guidanceKind : grammarKind}`, { method: "PATCH", body: JSON.stringify({ scope, done }) }).catch(() => {});
  };
  // Select a phrase in the editor and scroll to it, so the student can see what MEPAi
  // is pointing at before deciding anything.
  const locate = (phrase) => {
    const at = (value || "").toLowerCase().indexOf(String(phrase || "").toLowerCase());
    const ta = taRef.current;
    if (!ta || !phrase || at < 0) return -1;
    ta.focus();
    ta.setSelectionRange(at, at + phrase.length);
    ta.scrollTop = Math.max(0, ((value || "").slice(0, at).split("\n").length - 3) * 24);
    return at;
  };
  const findInText = (phrase) => {
    if (locate(phrase) < 0) setMsg({ text: `Couldn't find “${phrase}” — it may already be fixed.`, error: false });
  };

  // Swap one grammar/spelling fix into the text. Only this kind of mechanical fix is
  // applied for the student; MEPAi still never rewrites their sentences or ideas.
  const applyFix = (c, i) => {
    const text = value || "";
    const at = text.toLowerCase().indexOf(String(c.from || "").toLowerCase());
    if (at < 0) { setMsg({ text: `Couldn't find “${c.from}” — it may already be fixed.`, error: false }); return; }
    const next = text.slice(0, at) + c.to + text.slice(at + c.from.length);
    setUndoStack([...undoStack, text]);
    onChange(next);
    if (!grammar?.done?.includes(i)) toggle("r", i);
    setMsg({
      text: within(next) ? "Fix applied — Undo is there if you'd rather keep your version."
        : `Fix applied, but you're now over the ${limit}-${unit === "chars" ? "character" : "word"} limit.`,
      error: false
    });
  };

  const undoFix = () => {
    if (!undoStack.length) return;
    onChange(undoStack[undoStack.length - 1]);
    setUndoStack(undoStack.slice(0, -1));
    setMsg({ text: "Put back the way you wrote it.", error: false });
  };

  const box = { border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "var(--surface)", padding: "0.85rem 1rem" };
  const head = { fontWeight: 700, color: "var(--ink)", fontSize: "1rem", marginBottom: "0.5rem" };
  const btn = { flex: "1 1 auto", padding: "0.6rem 0.75rem", fontSize: "0.82rem", whiteSpace: "nowrap" };

  return (
    <div className="mepai-workspace">
      {/* Left: the student's text */}
      <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "#fff", minHeight }}>
        <div style={{ padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid var(--rule-soft)", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--ink)" }}>{heading}</span>
          {statusText}
        </div>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => { if (within(e.target.value)) onChange(e.target.value); }}
          placeholder={placeholder}
          style={{ flex: 1, border: "none", outline: "none", resize: "none", padding: "1rem 1.25rem", fontSize: "1rem", lineHeight: 1.65, color: "var(--ink)", fontFamily: "inherit", minHeight: minHeight - 100 }}
        />
        <div style={{ padding: "0.5rem 1.25rem", borderTop: "1px solid var(--rule-soft)", textAlign: "right", fontSize: "0.8rem", color: size >= limit ? "var(--warn)" : "var(--ink-muted)" }}>
          {unit === "chars"
            ? <>{chars} / {limit} characters | {words} words</>
            : <>{words} / {limit} words | {chars.toLocaleString()} characters</>}
        </div>
      </div>

      {/* Right: MEPAi guidance (suggestions only) */}
      <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "var(--paper-warm)", minHeight, overflow: "hidden" }}>
        <div style={{ padding: "0.75rem 1rem", background: "var(--success-soft)", fontWeight: 700, color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✦ MEPAi Guidance Panel</span>
          {guidance?.score != null && <span className="badge primary">Score {guidance.score}/100</span>}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0.85rem", display: "grid", gap: "0.85rem", alignContent: "start", maxHeight: minHeight + 40 }}>
          {msg.text && <div style={{ fontSize: "0.82rem", padding: "0.5rem 0.7rem", borderRadius: "var(--r-md)", background: msg.error ? "var(--error-soft)" : "var(--success-soft)", color: msg.error ? "var(--error)" : "var(--ink)" }}>{msg.text}</div>}
          {extraPanel}

          <div style={box}>
            <div style={head}>Actionable Suggestions</div>
            {!guidance ? (
              <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>Click <strong>MEPAi Guidance</strong> to get a checklist of specific improvements.</p>
            ) : (
              <>
                {guidance.summary && <p style={{ fontSize: "0.85rem", margin: "0 0 0.5rem", color: "var(--ink-soft)", fontStyle: "italic" }}>{guidance.summary}</p>}
                <div style={{ display: "grid", gap: "0.45rem" }}>
                  {(guidance.suggestions || []).map((sg, i) => (
                    <label key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.86rem", cursor: "pointer", color: guidance.done?.includes(i) ? "var(--ink-faint)" : "var(--ink)", textDecoration: guidance.done?.includes(i) ? "line-through" : "none" }}>
                      <input type="checkbox" checked={!!guidance.done?.includes(i)} onChange={() => toggle("g", i)} style={{ marginTop: "0.2rem", accentColor: "var(--success)" }} />
                      <span><strong>{i + 1}.</strong> {String(sg).replace(/^\s*\d+[.)]\s*/, "")}</span>
                    </label>
                  ))}
                </div>
                <p className="text-muted" style={{ fontSize: "0.72rem", margin: "0.5rem 0 0" }}>Tick each one off as you fix it in your text.</p>
              </>
            )}
          </div>

          {grammar && (
            <div style={box}>
              <div style={{ ...head, display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span>Grammar &amp; Spelling</span>
                {grammar.changes.length > 0 && <span className="badge">{grammar.changes.length - (grammar.done?.length || 0)} left</span>}
                {undoStack.length > 0 && (
                  <button type="button" className="button ghost" onClick={undoFix}
                    style={{ marginLeft: "auto", padding: "0.2rem 0.6rem", fontSize: "0.72rem", fontWeight: 600 }}>
                    ↶ Undo{undoStack.length > 1 ? ` (${undoStack.length})` : ""}
                  </button>
                )}
              </div>
              {grammar.changes.length === 0 ? <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>No issues found.</p> : (
                <div style={{ display: "grid", gap: "0.45rem" }}>
                  {grammar.changes.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.84rem", opacity: grammar.done?.includes(i) ? 0.5 : 1 }}>
                      <input type="checkbox" checked={!!grammar.done?.includes(i)} onChange={() => toggle("r", i)} style={{ marginTop: "0.2rem", accentColor: "var(--success)" }} title="Mark as fixed" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ textDecoration: "line-through", color: "var(--error)" }}>{c.from}</span> → <strong style={{ color: "var(--success)" }}>{c.to}</strong>
                        {c.why && <div className="muted" style={{ fontSize: "0.75rem" }}>{c.why}</div>}
                      </div>
                      <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                        <button type="button" className="button ghost" title="Highlight this in your text"
                          style={{ padding: "0.15rem 0.5rem", fontSize: "0.68rem" }} onClick={() => findInText(c.from)}>Show me</button>
                        <button type="button" className="button" title="Make this change for me"
                          style={{ padding: "0.15rem 0.5rem", fontSize: "0.68rem" }} onClick={() => applyFix(c, i)}>Fix it</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={box}>
            <div style={head}>Real-time Tips</div>
            {tips.length === 0 ? <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>Looking good — no quick fixes right now.</p> : (
              <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.35rem" }}>
                {tips.map((tp, i) => <li key={i} style={{ fontSize: "0.84rem", color: "var(--ink-soft)" }}>{tp}</li>)}
              </ul>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", padding: "0.75rem", borderTop: "1px solid var(--rule)", background: "var(--surface)" }}>
          <button type="button" className="button" style={btn} disabled={!!busy} onClick={getGuidance}>{busy === "guide" ? "Thinking…" : "MEPAi Guidance"}</button>
          <button type="button" className="button ghost" style={btn} disabled={!!busy || !(value || "").trim()} onClick={checkGrammar}>{busy === "grammar" ? "Checking…" : "Check Grammar"}</button>
          {saveButton && (
            <button type="button" className="button gold" style={btn} disabled={!!busy || saveButton.disabled || saveButton.busy} onClick={saveButton.onClick}>
              {saveButton.busy ? "Saving…" : saveButton.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
