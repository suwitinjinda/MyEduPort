import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, setToken } from "../api/client";
import { fmtDate } from "../utils/date.js";
import PrivacySummary, { Fill } from "../components/PrivacySummary.jsx";
import { useLegalInfo } from "../utils/legalInfo.js";

// The page a parent opens from the email (no sign-in needed): "Consent from a parent or
// legal guardian" from MyEduPort_Consent_Form_202611.docx. Agreeing unlocks the student's
// account; ticking Parent Dashboard also creates (or links) the parent's own account.
// "I don't agree" deletes the student's account straight away.

const RELATIONSHIPS = [["father", "Father"], ["mother", "Mother"], ["legal_guardian", "Legal guardian"]];
const BOXES = [
  ["parent_consent", true, "I am the student's parent or legal guardian, and I consent to MyEduPort collecting and using the student's data to provide the service."],
  ["cross_border", true, "I consent to the student's data being stored and processed outside Thailand."],
  ["marketing", false, "I agree that the student and I may receive news and offers."],
  ["ai_improvement", false, "I agree that the student's de-identified data may be used to improve the AI."],
  ["parent_dashboard", false, "I would like to follow the student's progress through the Parent Dashboard."]
];

function Box({ checked, onChange, required, children }) {
  return (
    <label className={`consent-box${checked ? " on" : ""}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span style={{ flex: 1 }}>{children}</span>
      <span className={`consent-tag ${required ? "req" : "opt"}`}>{required ? "Required" : "Optional"}</span>
    </label>
  );
}

export default function ParentConsent() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ parent_name: "", relationship: "", parent_phone: "", password: "" });
  const [boxes, setBoxes] = useState(Object.fromEntries(BOXES.map(([k]) => [k, false])));
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(null); // { kind: "confirmed" | "declined", ... }
  const [askDecline, setAskDecline] = useState(false);
  const legal = useLegalInfo();

  useEffect(() => {
    apiFetch(`/api/consent/parent/${encodeURIComponent(token)}`)
      .then((v) => { setView(v); setForm((f) => ({ ...f, parent_phone: v.parent_phone || "" })); })
      .catch((e) => setErr(e.message));
  }, [token]);

  if (err) return <Shell><h1 className="pc-title">This link isn't working</h1><p className="lede">{err}</p></Shell>;
  if (!view) return <Shell><p className="muted">Loading…</p></Shell>;

  const name = view.student_name || "The student";
  if (done?.kind === "confirmed") {
    return (
      <Shell>
        <div className="pc-done">✓</div>
        <h1 className="pc-title" style={{ textAlign: "center" }}>Thank you!</h1>
        <p className="lede" style={{ textAlign: "center" }}>{name}'s account is now fully unlocked.</p>
        {done.token ? (
          <>
            <p style={{ textAlign: "center", color: "var(--ink-soft)" }}>Your parent account is ready, and {name} is linked to it.</p>
            <div style={{ textAlign: "center" }}><button className="button" onClick={() => navigate("/parent")}>Open my Parent Dashboard</button></div>
          </>
        ) : (
          <p style={{ textAlign: "center", color: "var(--ink-soft)" }}>You can create a parent account any time to follow their progress.</p>
        )}
      </Shell>
    );
  }
  if (done?.kind === "declined") {
    return <Shell><h1 className="pc-title">We've deleted the account</h1><p className="lede">{name}'s account and everything they entered have been removed. Thank you for letting us know.</p></Shell>;
  }
  if (view.status !== "pending") {
    const text = {
      confirmed: `You've already given consent — ${name}'s account is active.`,
      declined: "This request was declined and the account was deleted.",
      expired: `This link has expired. ${name} can send you a new one from MyEduPort.`,
      replaced: `${name} sent a newer link. Please use the latest email or message.`
    }[view.status] || "This link is no longer active.";
    return <Shell><h1 className="pc-title">Nothing more to do here</h1><p className="lede">{text}</p></Shell>;
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const tick = (k) => (e) => setBoxes({ ...boxes, [k]: e.target.checked });
  const needsAccount = boxes.parent_dashboard && view.existing_account !== "other";
  const problem = !form.parent_name.trim() ? "Enter your full name."
    : !form.relationship ? "Choose your relationship to the student."
    : !boxes.parent_consent || !boxes.cross_border ? "Tick the two required boxes."
    : boxes.parent_dashboard && view.existing_account === "other" ? "This email already has a non-parent MyEduPort account — untick Parent Dashboard to continue."
    : needsAccount && view.existing_account !== "parent" && form.password.length < 8 ? "Choose a password of at least 8 characters."
    : needsAccount && view.existing_account === "parent" && !form.password ? "Enter your parent account password." : "";

  const confirm = async () => {
    setBusy("confirm"); setMsg("");
    try {
      const r = await apiFetch(`/api/consent/parent/${encodeURIComponent(token)}/confirm`, { method: "POST", body: JSON.stringify({ ...form, consents: boxes }) });
      if (r.token) { setToken(r.token); window.dispatchEvent(new Event("auth-change")); }
      setDone({ kind: "confirmed", token: r.token });
      window.scrollTo(0, 0);
    } catch (e) { setMsg(e.message); } finally { setBusy(""); }
  };
  const decline = async () => {
    setBusy("decline"); setMsg("");
    try { await apiFetch(`/api/consent/parent/${encodeURIComponent(token)}/decline`, { method: "POST" }); setDone({ kind: "declined" }); window.scrollTo(0, 0); }
    catch (e) { setMsg(e.message); } finally { setBusy(""); }
  };

  return (
    <Shell>
      <div className="eyebrow">Consent from a parent or legal guardian</div>
      <h1 className="pc-title">{name} would like to use MyEduPort</h1>
      <p style={{ color: "var(--ink-soft)", lineHeight: 1.6, marginTop: "0.5rem" }}>
        {name} has registered for MyEduPort, an AI platform that helps students build portfolios and plan university applications. Because the student is a minor, we need your consent before we collect and use their data. The way we use the data is the same as described to the student. See our <Link to="/privacy" target="_blank">Privacy Policy</Link> and <Link to="/terms" target="_blank">Terms of Service</Link> for details.
      </p>
      <p className="pc-deadline">Please answer by <strong>{fmtDate(view.expires_at)}</strong>. If we don't hear from you, the information {name} entered will be deleted.</p>

      <h2 className="pc-h2">Parent details</h2>
      <div className="input"><label htmlFor="pc-name">Full name</label><input id="pc-name" value={form.parent_name} onChange={set("parent_name")} autoComplete="name" placeholder="Your full name" /></div>
      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1rem" }}>
        <legend style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>Relationship to the student</legend>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {RELATIONSHIPS.map(([v, l]) => (
            <label key={v} className={`pc-chip${form.relationship === v ? " on" : ""}`}>
              <input type="radio" name="relationship" value={v} checked={form.relationship === v} onChange={set("relationship")} /> {l}
            </label>
          ))}
        </div>
      </fieldset>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
        <div className="input"><label htmlFor="pc-email">Email</label><input id="pc-email" value={view.parent_email} readOnly style={{ background: "var(--surface-warm, #f8fafc)", color: "var(--ink-soft)" }} /></div>
        <div className="input"><label htmlFor="pc-phone">Phone number</label><input id="pc-phone" type="tel" value={form.parent_phone} onChange={set("parent_phone")} placeholder="08x xxx xxxx" /></div>
      </div>

      <PrivacySummary audience="parent" />

      <h2 className="pc-h2">Please select</h2>
      <div style={{ display: "grid", gap: "0.45rem" }}>
        {BOXES.map(([k, req, text]) => <Box key={k} required={req} checked={boxes[k]} onChange={tick(k)}>{text}</Box>)}
      </div>

      {boxes.parent_dashboard && view.existing_account !== "other" && (
        <div className="parent-card" style={{ marginTop: "1rem" }}>
          <div style={{ fontWeight: 700, color: "var(--ink)" }}>{view.existing_account === "parent" ? "Link to your parent account" : "Create your free parent account"}</div>
          <p style={{ margin: "0.2rem 0 0.7rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
            {view.existing_account === "parent"
              ? `You already have a MyEduPort parent account with ${view.parent_email}. Enter its password to add ${name} to it.`
              : `Sign in later with ${view.parent_email} and this password to see ${name}'s progress.`}
          </p>
          <div className="input" style={{ marginBottom: 0 }}>
            <label htmlFor="pc-pw">{view.existing_account === "parent" ? "Your password" : "Choose a password (at least 8 characters)"}</label>
            <div style={{ position: "relative" }}>
              <input id="pc-pw" type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} autoComplete={view.existing_account === "parent" ? "current-password" : "new-password"} style={{ width: "100%", paddingRight: "4rem" }} />
              <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-soft)", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>{showPw ? "HIDE" : "SHOW"}</button>
            </div>
          </div>
        </div>
      )}

      {msg && <div className="card compact" style={{ marginTop: "1rem", background: "var(--error-soft)", color: "var(--error-deep)" }}>{msg}</div>}

      <button type="button" className="button" style={{ width: "100%", marginTop: "1.25rem", padding: "0.85rem" }} disabled={!!problem || !!busy} onClick={confirm}>
        {busy === "confirm" ? "Saving…" : "Give consent"}
      </button>
      {problem && <p className="text-muted" style={{ textAlign: "center", fontSize: "0.8rem", margin: "0.4rem 0 0" }}>{problem}</p>}

      <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
        {!askDecline ? (
          <button type="button" className="pc-decline" onClick={() => setAskDecline(true)}>I don't agree</button>
        ) : (
          <div className="card compact" style={{ background: "var(--error-soft)", textAlign: "left" }}>
            <strong style={{ color: "var(--error-deep)" }}>Delete {name}'s account?</strong>
            <p style={{ fontSize: "0.85rem", margin: "0.3rem 0 0.7rem", color: "var(--ink-soft)" }}>Everything they entered is deleted now. This can't be undone.</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="button" className="button" style={{ background: "var(--error-deep)", borderColor: "var(--error-deep)" }} disabled={!!busy} onClick={decline}>{busy === "decline" ? "Deleting…" : "Yes, delete the account"}</button>
              <button type="button" className="button ghost" onClick={() => setAskDecline(false)}>Go back</button>
            </div>
          </div>
        )}
      </div>

      <p className="text-muted" style={{ fontSize: "0.75rem", marginTop: "1.5rem", lineHeight: 1.5 }}>
        Parents can ask to view, correct or delete the student's data, and withdraw consent at any time, from the Parent Dashboard or by contacting <Fill value={legal.dpo_email ? <a href={`mailto:${legal.dpo_email}`}>{legal.dpo_email}</a> : ""}>[DPO email]</Fill>.
      </p>
    </Shell>
  );
}

function Shell({ children }) {
  return <div style={{ maxWidth: 640, margin: "0 auto" }}><div className="card" style={{ padding: "2rem 1.75rem" }}>{children}</div></div>;
}
