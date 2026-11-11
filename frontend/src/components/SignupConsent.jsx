import React from "react";
import { Link } from "react-router-dom";
import PrivacySummary from "./PrivacySummary.jsx";

// The consent part of Create account (MyEduPort_Consent_Form_202611.docx).
// Everyone ticks their own boxes — all start unticked, and Create account stays disabled
// until both required ones are ticked. Students also give their date of birth; under 20,
// a parent's email is needed and the parent is asked to confirm before full access.

export const ADULT_AGE = 20;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const BLANK_CONSENT = {
  consents: { terms_privacy: false, cross_border: false, marketing: false, ai_improvement: false },
  dob: { d: "", m: "", y: "" },
  parent_email: "",
  parent_phone: ""
};

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

// "YYYY-MM-DD" when a real date is chosen, else ""
export function birthDateOf(c) {
  const { d, m, y } = c.dob;
  if (!d || !m || !y) return "";
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (dt.getUTCDate() !== Number(d)) return ""; // e.g. 31 February
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function ageOf(c) {
  const iso = birthDateOf(c);
  if (!iso) return null;
  const b = new Date(iso), t = new Date();
  let a = t.getUTCFullYear() - b.getUTCFullYear();
  if (t.getUTCMonth() < b.getUTCMonth() || (t.getUTCMonth() === b.getUTCMonth() && t.getUTCDate() < b.getUTCDate())) a--;
  return a;
}

// What's still missing ("" when ready to create the account)
export function consentProblem(c, role, ownEmail) {
  if (role === "student") {
    if (!birthDateOf(c)) return "Enter your date of birth.";
    const age = ageOf(c);
    if (age < 8 || age > 100) return "Check your date of birth.";
    if (age < ADULT_AGE) {
      if (!isEmail(c.parent_email)) return "Enter your parent or guardian's email.";
      if (ownEmail && c.parent_email.trim().toLowerCase() === ownEmail.trim().toLowerCase()) return "Use your parent's own email, not yours.";
    }
  }
  if (!c.consents.terms_privacy || !c.consents.cross_border) return "Tick the two required boxes.";
  return "";
}

// The fields the server expects
export function consentPayload(c, role) {
  const minor = role === "student" && ageOf(c) != null && ageOf(c) < ADULT_AGE;
  return {
    consents: c.consents,
    data_consent: c.consents.terms_privacy && c.consents.cross_border,
    ...(role === "student" ? { birth_date: birthDateOf(c) } : {}),
    ...(minor ? { parent_email: c.parent_email.trim(), parent_phone: c.parent_phone.trim() } : {})
  };
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

export default function SignupConsent({ value, onChange, role, ownEmail }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const tick = (k) => (e) => set({ consents: { ...value.consents, [k]: e.target.checked } });
  const setDob = (k) => (e) => set({ dob: { ...value.dob, [k]: e.target.value } });
  const now = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => now - 8 - i);
  const age = ageOf(value);
  const minor = role === "student" && age != null && age < ADULT_AGE;

  return (
    <div style={{ margin: "0.25rem 0 1rem" }}>
      {role === "student" && (
        <fieldset style={{ border: "none", padding: 0, margin: "0 0 1rem" }}>
          <legend style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>Date of birth</legend>
          <div className="dob-row" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.4fr) minmax(0, 1fr)", gap: "0.5rem" }}>
            <select aria-label="Day" value={value.dob.d} onChange={setDob("d")}>
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select aria-label="Month" value={value.dob.m} onChange={setDob("m")}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select aria-label="Year" value={value.dob.y} onChange={setDob("y")}>
              <option value="">Year</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </fieldset>
      )}

      {minor && (
        <div className="parent-card">
          <div style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start" }}>
            <span aria-hidden="true" className="parent-card-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3" /><path d="M3 21v-1a6 6 0 0 1 12 0v1" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 21v-.6a4.5 4.5 0 0 1 5.5-4.4" /></svg>
            </span>
            <div>
              <div style={{ fontWeight: 700, color: "var(--ink)" }}>Your parent or guardian</div>
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>
                You're under {ADULT_AGE}, so we'll email them a short form to approve your account. You can start right away — everything unlocks once they agree.
              </p>
            </div>
          </div>
          <div className="input" style={{ margin: "0.85rem 0 0.5rem" }}>
            <label htmlFor="parent-email">Parent or guardian's email</label>
            <input id="parent-email" type="email" inputMode="email" autoComplete="off" value={value.parent_email} onChange={(e) => set({ parent_email: e.target.value })} placeholder="parent@email.com" />
          </div>
          <div className="input" style={{ marginBottom: 0 }}>
            <label htmlFor="parent-phone">Their phone <span className="text-muted" style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
            <input id="parent-phone" type="tel" inputMode="tel" autoComplete="off" value={value.parent_phone} onChange={(e) => set({ parent_phone: e.target.value })} placeholder="08x xxx xxxx" />
          </div>
        </div>
      )}

      <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: "0.95rem", margin: "0.5rem 0 0.6rem" }}>Before you start</div>
      <PrivacySummary />

      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem" }}>Please select</div>
      <div style={{ display: "grid", gap: "0.45rem" }}>
        <Box required checked={value.consents.terms_privacy} onChange={tick("terms_privacy")}>
          I have read and agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and acknowledge the <Link to="/privacy" target="_blank">Privacy Policy</Link>.
        </Box>
        <Box required checked={value.consents.cross_border} onChange={tick("cross_border")}>
          I consent to my data being stored and processed outside Thailand as described above.
        </Box>
        <Box checked={value.consents.marketing} onChange={tick("marketing")}>
          I'd like to receive news, offers and tips by email, LINE or SMS.
        </Box>
        <Box checked={value.consents.ai_improvement} onChange={tick("ai_improvement")}>
          I agree that my de-identified data may be used to improve and train MyEduPort's AI.
        </Box>
      </div>
      <p className="text-muted" style={{ fontSize: "0.75rem", margin: "0.5rem 0 0" }}>Leaving the optional boxes unticked does not affect your use of the service. You can change them any time in Privacy settings.</p>
    </div>
  );
}
