import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch, getToken } from "../api/client";
import PrivacySummary from "./PrivacySummary.jsx";
import { ADULT_AGE, ageOf, birthDateOf } from "./SignupConsent.jsx";

// Runs for every signed-in page:
//  - When the consent wording has changed (or an account is from before the consent form),
//    asks for it again before anything else — the same boxes as registration, plus date of
//    birth for students who never gave one, and a parent's email for under-20s.
//  - Keeps a student who is waiting for their parent on the pages they're allowed to use.

// Pages a student waiting for their parent may open (everything public is fine too)
const OPEN_WHILE_WAITING = /^\/(waiting-for-parent|profile|settings|my-plan|guide|admission-resources|career-resources|pricing|privacy|terms|about|contact|user-manual|news-events|application)(\/|$)/;
const STUDENT_APP = /^\/(dashboard|recommendations|compare|tasks|chat|export|rewards|admission-results)(\/|$)/;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function ConsentGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  const load = () => {
    if (!getToken()) { setMe(null); return; }
    apiFetch("/api/auth/me").then(setMe).catch(() => setMe(null));
  };
  useEffect(() => {
    load();
    window.addEventListener("auth-change", load);
    return () => window.removeEventListener("auth-change", load);
  }, []);
  // Re-check status on each page change, so a parent's approval shows up promptly
  useEffect(() => { if (me?.consent?.limited) load(); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!me?.consent || me.role !== "student") return;
    if (me.consent.limited && STUDENT_APP.test(location.pathname) && !OPEN_WHILE_WAITING.test(location.pathname)) {
      navigate("/waiting-for-parent", { replace: true });
    }
  }, [me, location.pathname, navigate]);

  if (!me?.consent?.needs_reconsent) return null;
  return <ReconsentModal me={me} onDone={(next) => { load(); if (next) navigate(next); }} />;
}

function Box({ checked, onChange, required, children }) {
  return (
    <label className={`consent-box${checked ? " on" : ""}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span style={{ flex: 1 }}>{children}</span>
      <span className={`consent-tag ${required ? "req" : "opt"}`}>{required ? "Required" : "Optional"}</span>
    </label>
  );
}

function ReconsentModal({ me, onDone }) {
  const [c, setC] = useState({ consents: { terms_privacy: false, cross_border: false, marketing: false, ai_improvement: false }, dob: { d: "", m: "", y: "" }, parent_email: "", parent_phone: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isStudent = me.role === "student";
  const askDob = isStudent && !me.consent.has_birth_date;
  const age = askDob ? ageOf(c) : null;
  const minor = isStudent && (askDob ? age != null && age < ADULT_AGE : me.consent.minor);
  const askParent = minor && !["pending", "confirmed"].includes(me.consent.parent_consent_status);
  const tick = (k) => (e) => setC({ ...c, consents: { ...c.consents, [k]: e.target.checked } });
  const now = new Date().getFullYear();

  const problem = askDob && !birthDateOf(c) ? "Enter your date of birth."
    : askParent && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.parent_email.trim()) ? "Enter your parent or guardian's email."
    : !c.consents.terms_privacy || !c.consents.cross_border ? "Tick the two required boxes." : "";

  const save = async () => {
    setBusy(true); setErr("");
    try {
      const r = await apiFetch("/api/auth/consents/reconsent", { method: "POST", body: JSON.stringify({
        consents: c.consents,
        ...(askDob ? { birth_date: birthDateOf(c) } : {}),
        ...(askParent ? { parent_email: c.parent_email.trim(), parent_phone: c.parent_phone.trim() } : {})
      }) });
      onDone(r.parent_request ? "/waiting-for-parent" : null);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="consent-overlay" role="dialog" aria-modal="true" aria-labelledby="reconsent-title">
      <div className="consent-sheet">
        <div className="eyebrow">Privacy update</div>
        <h2 id="reconsent-title" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--ink)", margin: "0.25rem 0 0.4rem" }}>Please review how we use your data</h2>
        <p className="muted" style={{ fontSize: "0.88rem", marginTop: 0 }}>We've updated our consent form. Take a moment to read it and choose what you agree to — then you're straight back in.</p>

        {askDob && (
          <fieldset style={{ border: "none", padding: 0, margin: "0 0 0.9rem" }}>
            <legend style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>Date of birth</legend>
            <div className="dob-row" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.4fr) minmax(0, 1fr)", gap: "0.5rem" }}>
              <select aria-label="Day" value={c.dob.d} onChange={(e) => setC({ ...c, dob: { ...c.dob, d: e.target.value } })}><option value="">Day</option>{Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}</select>
              <select aria-label="Month" value={c.dob.m} onChange={(e) => setC({ ...c, dob: { ...c.dob, m: e.target.value } })}><option value="">Month</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
              <select aria-label="Year" value={c.dob.y} onChange={(e) => setC({ ...c, dob: { ...c.dob, y: e.target.value } })}><option value="">Year</option>{Array.from({ length: 60 }, (_, i) => now - 8 - i).map((y) => <option key={y} value={y}>{y}</option>)}</select>
            </div>
          </fieldset>
        )}

        {askParent && (
          <div className="parent-card">
            <div style={{ fontWeight: 700, color: "var(--ink)" }}>Your parent or guardian</div>
            <p style={{ margin: "0.15rem 0 0.7rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>You're under {ADULT_AGE}, so we'll ask them to approve too. Your account keeps working in the meantime.</p>
            <div className="input" style={{ marginBottom: "0.5rem" }}><label htmlFor="rc-pe">Parent or guardian's email</label><input id="rc-pe" type="email" value={c.parent_email} onChange={(e) => setC({ ...c, parent_email: e.target.value })} placeholder="parent@email.com" /></div>
            <div className="input" style={{ marginBottom: 0 }}><label htmlFor="rc-pp">Their phone (optional)</label><input id="rc-pp" type="tel" value={c.parent_phone} onChange={(e) => setC({ ...c, parent_phone: e.target.value })} /></div>
          </div>
        )}

        <PrivacySummary />
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <Box required checked={c.consents.terms_privacy} onChange={tick("terms_privacy")}>I have read and agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and acknowledge the <Link to="/privacy" target="_blank">Privacy Policy</Link>.</Box>
          <Box required checked={c.consents.cross_border} onChange={tick("cross_border")}>I consent to my data being stored and processed outside Thailand as described above.</Box>
          <Box checked={c.consents.marketing} onChange={tick("marketing")}>I'd like to receive news, offers and tips by email, LINE or SMS.</Box>
          <Box checked={c.consents.ai_improvement} onChange={tick("ai_improvement")}>I agree that my de-identified data may be used to improve and train MyEduPort's AI.</Box>
        </div>
        {err && <p style={{ color: "var(--error-deep)", fontSize: "0.85rem", margin: "0.75rem 0 0" }}>{err}</p>}
        <button type="button" className="button" style={{ width: "100%", marginTop: "1rem" }} disabled={!!problem || busy} onClick={save}>{busy ? "Saving…" : "Continue"}</button>
        {problem && <p className="text-muted" style={{ textAlign: "center", fontSize: "0.78rem", margin: "0.4rem 0 0" }}>{problem}</p>}
      </div>
    </div>
  );
}
