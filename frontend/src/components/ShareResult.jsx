import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

// Share button for a test result (Personal Character Test / Career Test).
//
// The link is PUBLIC: anyone who has it can open the result, and social networks cache
// what they fetch. The shared page shows only the student's first name, their scores and
// the AI summary — never school, grades, activities or contact details. Sharing is off
// until the student turns it on, and "Stop sharing" kills the link immediately.
//
// Instagram has no web share URL, so for IG the student copies the link and pastes it
// into a story or their bio. On phones the native share sheet covers IG, LINE and the rest.
export default function ShareResult({ kind, title }) {
  const [state, setState] = useState(null); // { shared, url, views }
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let alive = true;
    apiFetch(`/api/test-share/${kind}`).then((r) => { if (alive) setState(r); }).catch(() => {});
    return () => { alive = false; };
  }, [kind]);

  const act = async (method) => {
    setBusy(true); setNote("");
    try {
      setState(await apiFetch(`/api/test-share/${kind}`, { method }));
      setOpen(method === "POST");
    } catch (e) {
      setNote(e.message);
    } finally {
      setBusy(false);
    }
  };

  const url = state?.url || "";
  const text = `My ${title} — MyEduPort.ai`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied. Paste it into your Instagram story or bio.");
    } catch {
      setNote("Couldn't copy automatically — select the link above and copy it.");
    }
  };
  const nativeShare = async () => {
    try { await navigator.share({ title: text, url }); } catch { /* dismissed */ }
  };

  const link = { display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.8rem", borderRadius: "var(--r-md)", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none", border: "1px solid var(--rule)", background: "var(--surface)", color: "var(--ink)" };

  if (!state) return null;

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--rule)", paddingTop: "1rem" }}>
      {!state.shared ? (
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="button" disabled={busy} onClick={() => act("POST")}>
            {busy ? "Creating link…" : "↗ Share my result"}
          </button>
          <span className="text-muted" style={{ fontSize: "0.78rem" }}>
            Creates a public link showing your first name, your scores and the summary — nothing else.
          </span>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <strong style={{ fontSize: "0.9rem" }}>Your result is shareable</strong>
            <span className="text-muted" style={{ fontSize: "0.76rem" }}>
              {state.views > 0 ? `${state.views} view${state.views === 1 ? "" : "s"}` : "No views yet"}
            </span>
          </div>

          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            aria-label="Public link to your result"
            style={{ width: "100%", fontSize: "0.82rem" }}
          />

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <a style={{ ...link, background: "#1877F2", color: "#fff", borderColor: "#1877F2" }} target="_blank" rel="noopener noreferrer"
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Facebook</a>
            <a style={{ ...link, background: "#000", color: "#fff", borderColor: "#000" }} target="_blank" rel="noopener noreferrer"
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`}>X</a>
            <a style={{ ...link, background: "#06C755", color: "#fff", borderColor: "#06C755" }} target="_blank" rel="noopener noreferrer"
              href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`}>LINE</a>
            <button type="button" style={link} onClick={copy}>Copy link (Instagram)</button>
            {typeof navigator !== "undefined" && navigator.share && (
              <button type="button" style={link} onClick={nativeShare}>More…</button>
            )}
            <a style={link} target="_blank" rel="noopener noreferrer" href={url}>Preview</a>
          </div>

          <div>
            <button type="button" className="button ghost" disabled={busy} onClick={() => act("DELETE")}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}>
              {busy ? "Working…" : "Stop sharing"}
            </button>
            <span className="text-muted" style={{ fontSize: "0.74rem", marginLeft: "0.6rem" }}>
              Turns the link off for everyone. Retaking the test updates what the link shows.
            </span>
          </div>
        </div>
      )}
      {note && <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0.6rem 0 0" }}>{note}</p>}
    </div>
  );
}
