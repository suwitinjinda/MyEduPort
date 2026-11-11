import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLegalInfo } from "../utils/legalInfo.js";

// "How we protect your personal data" from MyEduPort_Consent_Form_202611.docx, shown on the
// registration form and the parent consent page. Company details come from Admin → Consents →
// Company details; any left empty show as highlighted [placeholders] so they're easy to spot. When this wording changes materially, bump CONSENT_VERSION in
// backend/src/services/consents.js so everyone is asked again.

const PENDING = ({ children }) => <mark style={{ background: "#fef3c7", color: "#92400e", padding: "0 0.2em", borderRadius: 3 }}>{children}</mark>;
// The admin's value, or the highlighted placeholder while it's still empty
export const Fill = ({ value, children }) => (value !== undefined && value !== null && value !== "" ? <>{value}</> : <PENDING>{children}</PENDING>);

const SECTIONS = [
  ["What we collect", [
    "Account details: name, email, phone number, date of birth, school and grade",
    "Academic details: grades, test scores, activities, awards, essays and target universities",
    "Personality and career-interest questionnaire results (such as IPIP-50 and RIASEC)",
    "Messages you type to EduBot",
    "Usage and device data, such as pages visited, time spent and cookies"
  ]],
  ["How we use it", [
    "To provide the service in your plan, such as admission-chance estimates, gap analysis and essay feedback",
    "To manage your account, keep it secure and contact you about the service",
    "For other purposes only if you opt in below"
  ]],
  ["What we will never do", [
    "Sell your data to anyone",
    "Share your data with universities, schools or counselors unless you choose to share it",
    "Guarantee admission to any university. AI results are guidance to support your decisions."
  ]]
];

export default function PrivacySummary({ defaultOpen = false, audience = "student" }) {
  const [open, setOpen] = useState(defaultOpen);
  const legal = useLegalInfo();
  const you = audience === "parent" ? "the student's" : "your";
  return (
    <div style={{ border: "1px solid var(--rule)", borderRadius: "var(--r-md)", background: "var(--surface-warm, #f8fafc)", marginBottom: "1rem" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.8rem 1rem", background: "transparent", border: "none", cursor: "pointer", font: "inherit", textAlign: "left", color: "var(--ink)" }}
      >
        <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 8, background: "var(--teal-soft, #ccfbf1)", color: "var(--teal-deep, #0f766e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        </span>
        <span style={{ flex: 1 }}>
          <strong style={{ display: "block", fontSize: "0.92rem" }}>How we protect {you} personal data</strong>
          <span className="text-muted" style={{ fontSize: "0.78rem" }}>What we collect, how we use it, and {you} rights — please read before agreeing</span>
        </span>
        <span aria-hidden="true" style={{ transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "none", color: "var(--ink-muted)" }}>›</span>
      </button>
      {open && (
        <div style={{ padding: "0 1rem 1rem", fontSize: "0.84rem", lineHeight: 1.6, color: "var(--ink-soft)", maxHeight: 340, overflowY: "auto" }} tabIndex={0} role="region" aria-label="Privacy summary">
          <p style={{ marginTop: 0 }}>
            <Fill value={legal.entity_name}>[Legal entity name]</Fill> (“MyEduPort”) takes the privacy of students and their families seriously. Please read this summary before you register. Full details are in our <Link to="/privacy" target="_blank">Privacy Policy</Link> and <Link to="/terms" target="_blank">Terms of Service</Link>.
          </p>
          {SECTIONS.map(([title, items]) => (
            <div key={title} style={{ marginTop: "0.75rem" }}>
              <div style={{ fontWeight: 700, color: "var(--ink)" }}>{title}</div>
              <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.1rem" }}>{items.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
          <div style={{ marginTop: "0.75rem" }}>
            <div style={{ fontWeight: 700, color: "var(--ink)" }}>Transfers outside Thailand</div>
            <p style={{ margin: "0.25rem 0 0" }}>Your data may be stored and processed on cloud servers and by AI providers located outside Thailand (<Fill value={legal.countries}>[list countries, e.g. Singapore, United States]</Fill>). Our contracts with these providers require them to protect your data to the standard the law requires.</p>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <div style={{ fontWeight: 700, color: "var(--ink)" }}>How long we keep it</div>
            <p style={{ margin: "0.25rem 0 0" }}>We keep your data while your account is active. If you close your account, we delete your data within <Fill value={legal.delete_days}>[30]</Fill> days and remove it from backups within <Fill value={legal.backup_days}>[90]</Fill> days, unless the law requires us to keep it longer.</p>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <div style={{ fontWeight: 700, color: "var(--ink)" }}>Your rights</div>
            <p style={{ margin: "0.25rem 0 0" }}>You can ask to access, copy, correct, delete or transfer your data, object to or restrict its use, and withdraw consent at any time in “Privacy settings”. Withdrawing consent does not affect processing already carried out. Contact our Data Protection Officer (DPO) at <Fill value={legal.dpo_email ? <a href={`mailto:${legal.dpo_email}`}>{legal.dpo_email}</a> : ""}>[DPO email]</Fill>. You may also complain to the relevant data protection authority.</p>
          </div>
        </div>
      )}
    </div>
  );
}
