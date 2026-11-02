import React from "react";
import { Link } from "react-router-dom";

// The consent form on Create account (draft wording — the final text replaces it; when it
// changes, bump CONSENT_VERSION in backend/src/services/consents.js).
// Required: terms + AI use, and for students under 20 a parent's agreement and email.
// Optional, unticked by default: anonymous admission results, marketing email.

export const BLANK_CONSENT = {
  consents: { terms: false, ai_processing: false, guardian: false, outcomes_sharing: false, marketing_email: false },
  age_group: "",
  guardian_email: ""
};

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

// What's still missing before the account can be created ("" when ready)
export function consentProblem(c, role) {
  if (!c.consents.terms || !c.consents.ai_processing) return "Tick the first two boxes to continue.";
  if (role !== "student") return "";
  if (!c.age_group) return "Tell us your age group.";
  if (c.age_group === "minor") {
    if (!c.consents.guardian) return "Your parent or guardian needs to agree.";
    if (!isEmail(c.guardian_email)) return "Enter your parent or guardian's email.";
  }
  return "";
}

const row = { display: "flex", alignItems: "start", gap: "0.6rem", fontSize: "0.85rem", lineHeight: 1.55, color: "var(--ink-soft)", cursor: "pointer", marginBottom: "0.6rem" };
const box = { marginTop: "0.25rem", cursor: "pointer", accentColor: "var(--teal)", flexShrink: 0 };
const link = { color: "var(--teal-deep)", textDecoration: "underline" };

export default function SignupConsent({ value, onChange, role }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const tick = (k) => (e) => set({ consents: { ...value.consents, [k]: e.target.checked } });

  return (
    <fieldset style={{ border: "none", borderTop: "1px solid var(--rule)", padding: "1rem 0 0", margin: "0.5rem 0 1rem" }}>
      <legend style={{ fontWeight: 700, color: "var(--ink)", fontSize: "0.95rem", padding: "0 0.4rem 0 0" }}>Before you start</legend>
      <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0 0 0.75rem" }}>The first two are needed to use MyEduPort. The last two are up to you.</p>

      <label style={row}>
        <input type="checkbox" checked={value.consents.terms} onChange={tick("terms")} style={box} />
        <span>I agree to MyEduPort's Terms of Service and <Link to="/privacy" target="_blank" style={link}>Privacy Policy</Link>.</span>
      </label>
      <label style={row}>
        <input type="checkbox" checked={value.consents.ai_processing} onChange={tick("ai_processing")} style={box} />
        <span>MyEduPort and its AI advisor, MEPAi, may use what I add — grades, activities, essays and uploaded files — to give me advice. <Link to="/privacy" target="_blank" style={link}>What's shared and why</Link></span>
      </label>

      {role === "student" && (
        <div style={{ background: "var(--surface-warm, #f8fafc)", border: "1px solid var(--rule)", borderRadius: "var(--r-md)", padding: "0.75rem 0.9rem", margin: "0.25rem 0 0.85rem" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.35rem" }} id="age-label">Your age</div>
          <div role="radiogroup" aria-labelledby="age-label" style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.88rem" }}>
            <label style={{ cursor: "pointer" }}><input type="radio" name="age_group" checked={value.age_group === "adult"} onChange={() => set({ age_group: "adult" })} style={{ accentColor: "var(--teal)" }} /> 20 or older</label>
            <label style={{ cursor: "pointer" }}><input type="radio" name="age_group" checked={value.age_group === "minor"} onChange={() => set({ age_group: "minor" })} style={{ accentColor: "var(--teal)" }} /> Under 20</label>
          </div>
          {value.age_group === "minor" && (
            <div style={{ marginTop: "0.7rem" }}>
              <label style={row}>
                <input type="checkbox" checked={value.consents.guardian} onChange={tick("guardian")} style={box} />
                <span>My parent or guardian has read this and agrees.</span>
              </label>
              <div className="input" style={{ marginBottom: 0 }}>
                <label htmlFor="guardian-email">Parent or guardian's email</label>
                <input id="guardian-email" type="email" value={value.guardian_email} onChange={(e) => set({ guardian_email: e.target.value })} placeholder="parent@email.com" />
              </div>
              <p className="text-muted" style={{ fontSize: "0.75rem", margin: "0.3rem 0 0" }}>We'll email them a copy and how to follow your portfolio.</p>
            </div>
          )}
        </div>
      )}

      <div className="text-muted" style={{ fontSize: "0.78rem", margin: "0.25rem 0 0.4rem" }}>Optional</div>
      <label style={row}>
        <input type="checkbox" checked={value.consents.outcomes_sharing} onChange={tick("outcomes_sharing")} style={box} />
        <span>Use my admission results, without my name, to help MEPAi advise future students.</span>
      </label>
      <label style={row}>
        <input type="checkbox" checked={value.consents.marketing_email} onChange={tick("marketing_email")} style={box} />
        <span>Email me tips, deadline reminders and offers. Unsubscribe any time.</span>
      </label>
      <p className="text-muted" style={{ fontSize: "0.75rem", margin: "0.2rem 0 0" }}>You can change the optional choices later in Settings.</p>
    </fieldset>
  );
}
