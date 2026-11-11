import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { fmtDate, fmtDateTime } from "../utils/date.js";

// For students under 20 while their parent hasn't confirmed yet. Shows where things stand,
// lets them resend, share the link themselves (LINE, copy) or fix the parent's email, and
// moves on by itself once the parent agrees.

export default function WaitingForParent() {
  const navigate = useNavigate();
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState({ text: "", error: false });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ parent_email: "", parent_phone: "" });
  const [copied, setCopied] = useState(false);

  const load = () => apiFetch("/api/consent/me/request").then(setR).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    const t = setInterval(load, 20000); // pick up the parent's answer without a refresh
    return () => clearInterval(t);
  }, []);

  if (err) return <div className="card"><p style={{ color: "var(--error-deep)", margin: 0 }}>{err}</p></div>;
  if (!r) return <p className="muted">Loading…</p>;

  const act = async (label, fn) => {
    setBusy(label); setNote({ text: "", error: false });
    try { await fn(); } catch (e) { setNote({ text: e.message, error: true }); } finally { setBusy(""); }
  };
  const resend = () => act("resend", async () => { setR(await apiFetch("/api/consent/me/request/resend", { method: "POST" })); setNote({ text: `Sent again to ${r.parent_email}.`, error: false }); });
  const change = () => act("change", async () => {
    const next = await apiFetch("/api/consent/me/request", { method: "PUT", body: JSON.stringify(form) });
    setR(next); setEditing(false);
    setNote({ text: next.email_enabled ? `We've emailed ${next.parent_email}.` : "Saved. Now send them the link below.", error: false });
  });
  const copy = async () => {
    try { await navigator.clipboard.writeText(r.link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select the box manually */ }
  };

  const confirmed = r.status === "confirmed";
  const total = Math.max(1, Math.round((new Date(r.expires_at) - new Date(r.created_at)) / 86400000));
  const usedPct = r.expires_at ? Math.min(100, Math.max(0, Math.round(((total - r.days_left) / total) * 100))) : 0;
  const lineMsg = `Hi! I signed up for MyEduPort to plan my university applications. Because I'm under 20, it needs your OK — it takes a minute: ${r.link}`;

  if (confirmed) {
    return (
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div className="card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
          <div aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--success-soft)", color: "var(--success-deep)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: 30 }}>✓</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--ink)", margin: 0 }}>You're all set!</h1>
          <p className="lede" style={{ marginTop: "0.5rem" }}>Your parent gave consent, so everything in MyEduPort is unlocked.</p>
          <button className="button" style={{ marginTop: "1rem" }} onClick={() => navigate("/dashboard")}>Go to my dashboard</button>
        </div>
      </div>
    );
  }
  if (r.status !== "pending") {
    return <div className="card" style={{ maxWidth: 620, margin: "0 auto" }}><p style={{ margin: 0 }}>No parent approval is needed for your account.</p><Link to="/dashboard" className="button" style={{ marginTop: "1rem", display: "inline-block" }}>Go to my dashboard</Link></div>;
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <header style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div aria-hidden="true" style={{ width: 68, height: 68, borderRadius: 20, background: "linear-gradient(135deg, #1f3461, #0f766e)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.9rem" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>Almost there!</h1>
        <p className="lede" style={{ marginTop: "0.4rem" }}>Because you're under 20, your parent or guardian needs to approve your account.</p>
      </header>

      {note.text && <div className="card compact" style={{ marginBottom: "1rem", background: note.error ? "var(--error-soft)" : "var(--success-soft)", color: note.error ? "var(--error-deep)" : "var(--ink)" }}>{note.text}</div>}

      <section className="card" style={{ padding: "1.5rem" }}>
        <ol className="wfp-steps">
          <li className="done"><span>1</span><div><strong>You signed up</strong><small>Done</small></div></li>
          <li className="now"><span>2</span><div><strong>Your parent approves</strong><small>{r.email_enabled ? <>Email sent to {r.parent_email}{r.last_sent_at ? ` · ${fmtDateTime(r.last_sent_at)}` : ""}</> : <>Send them the link below</>}</small></div></li>
          <li><span>3</span><div><strong>Everything unlocks</strong><small>AI advice, uploads, your full portfolio</small></div></li>
        </ol>

        <div style={{ marginTop: "1.25rem" }}>
          <div className="flex-between" style={{ fontSize: "0.82rem", marginBottom: "0.35rem", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ color: "var(--ink-soft)" }}>{r.is_existing ? "Time left before your account is limited" : "Time left before your sign-up is cancelled"}</span>
            <strong style={{ color: r.days_left <= 3 ? "var(--error-deep)" : "var(--ink)" }}>{r.days_left} day{r.days_left === 1 ? "" : "s"} · until {fmtDate(r.expires_at)}</strong>
          </div>
          <div style={{ height: 8, borderRadius: 8, background: "var(--rule)", overflow: "hidden" }}><div style={{ width: `${usedPct}%`, height: "100%", background: r.days_left <= 3 ? "var(--error)" : "#10b981" }} /></div>
          {!r.is_existing && <p className="text-muted" style={{ fontSize: "0.75rem", margin: "0.4rem 0 0" }}>If your parent doesn't approve in time, the information you entered is deleted and you can sign up again.</p>}
        </div>
      </section>

      <section className="card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>Send it to your parent</h2>
        <p className="muted" style={{ fontSize: "0.86rem", marginTop: 0 }}>The fastest way: send the link on LINE. It takes them about a minute.</p>
        {r.link && (
          <>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <a className="button" style={{ background: "#06c755", borderColor: "#06c755" }} target="_blank" rel="noopener noreferrer"
                href={`https://line.me/R/share?text=${encodeURIComponent(lineMsg)}`}>Send on LINE</a>
              <button type="button" className="button ghost" onClick={copy}>{copied ? "Link copied ✓" : "Copy link"}</button>
              {r.email_enabled && <button type="button" className="button ghost" disabled={busy === "resend"} onClick={resend}>{busy === "resend" ? "Sending…" : "Email again"}</button>}
            </div>
            <input readOnly value={r.link} onFocus={(e) => e.target.select()} aria-label="Link for your parent" style={{ width: "100%", marginTop: "0.6rem", fontFamily: "ui-monospace, monospace", fontSize: "0.78rem", padding: "0.55rem 0.7rem", border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "var(--surface-warm, #f8fafc)", color: "var(--ink-soft)" }} />
          </>
        )}

        <div style={{ borderTop: "1px solid var(--rule-soft, var(--rule))", marginTop: "1rem", paddingTop: "0.85rem" }}>
          {!editing ? (
            <div className="flex-between" style={{ gap: "0.5rem", flexWrap: "wrap", fontSize: "0.86rem" }}>
              <span>Parent's email: <strong>{r.parent_email}</strong>{r.parent_phone ? ` · ${r.parent_phone}` : ""}</span>
              <button type="button" className="button ghost" style={{ fontSize: "0.78rem", padding: "0.3rem 0.8rem" }} onClick={() => { setForm({ parent_email: r.parent_email || "", parent_phone: r.parent_phone || "" }); setEditing(true); }}>Change</button>
            </div>
          ) : (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.6rem" }}>
                <div className="input" style={{ marginBottom: 0 }}><label htmlFor="wfp-email">Parent's email</label><input id="wfp-email" type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} /></div>
                <div className="input" style={{ marginBottom: 0 }}><label htmlFor="wfp-phone">Phone (optional)</label><input id="wfp-phone" type="tel" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} /></div>
              </div>
              <p className="text-muted" style={{ fontSize: "0.75rem", margin: "0.4rem 0 0" }}>The old link stops working and a new one is sent.</p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
                <button type="button" className="button" disabled={busy === "change"} onClick={change}>{busy === "change" ? "Saving…" : "Save and send"}</button>
                <button type="button" className="button ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
        <h2 className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>While you wait</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
          <Link to="/profile?section=personal" className="wfp-tile"><strong>Fill in Personal</strong><span>Grade, school, countries</span></Link>
          <Link to="/guide" className="wfp-tile"><strong>Read the Guide</strong><span>How top universities choose</span></Link>
          <Link to="/admission-resources" className="wfp-tile"><strong>Admission articles</strong><span>Tips and university guides</span></Link>
        </div>
        <p className="text-muted" style={{ fontSize: "0.75rem", margin: "0.75rem 0 0" }}>AI advice and file uploads unlock once your parent agrees — MEPAi processes data outside Thailand, which needs their consent.</p>
      </section>
    </div>
  );
}
