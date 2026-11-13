import React from "react";
import { NavLink } from "react-router-dom";
import { CtaBanner, Icon, StatsBar } from "../components/marketing.jsx";

// Why MyEduPort — written in the tone of MyEduPort_Homepage_20261111 (calm, benefit-led, no
// hype). Draft copy: replace with the final wording when it's ready.

const REASONS = [
  { icon: "calendar", title: "We start where strong applications start — Grade 9", text: "Top universities look at four years of choices, not one busy final year. MyEduPort helps you plan subjects, activities and tests early, so the story builds naturally over time." },
  { icon: "stand", title: "Clear guidance, not guesswork", text: "See how your profile compares with typical admits at each university, which gaps matter most, and the next step to take — explained in plain language." },
  { icon: "globe", title: "Built for Thai and international students", text: "IB, A-Level, IGCSE, AP, the Thai national curriculum and English Programmes are all supported — with universities across the US, UK, Asia, Europe and Australia." },
  { icon: "cohort", title: "Students, parents and counsellors on the same page", text: "Students own their portfolio. Parents follow progress from their own dashboard. Counsellors see where every student is and when to step in." },
  { icon: "value", title: "Consultant-quality support at a fraction of the cost", text: "Structured guidance, essay feedback and university matching for every student — not only those who can afford a private consultant." },
  { icon: "shield", title: "Your data is protected", text: "We follow Thailand's PDPA, never sell personal data, and families stay in control of what is shared. Students under 20 join with a parent's consent." }
];

const COMPARE = [
  ["Starts from Grade 9 with a year-by-year plan", false, "Sometimes", true],
  ["Grades, activities, essays and documents in one place", false, false, true],
  ["Clear view of where you stand at each university", false, true, true],
  ["Parent dashboard with progress and deadlines", false, false, true],
  ["Available any time, at your own pace", true, false, true],
  ["Affordable for every family", true, false, true]
];

const Cell = ({ v }) => (v === true
  ? <span className="mk-yes"><Icon name="check" size={18} /><span className="sr-only">Yes</span></span>
  : v === false ? <span className="mk-no" aria-label="No">—</span> : <span className="text-muted" style={{ fontSize: "0.85rem" }}>{v}</span>);

export default function WhyMyEduPort() {
  return (
    <div className="mk-page">
      <section className="mk-plain-hero">
        <span className="eyebrow">Why MyEduPort</span>
        <h1>A Calmer, More Structured Way to Apply to University</h1>
        <p className="mk-lede">Applying to top universities shouldn't depend on luck, last-minute effort, or who can afford the most expensive consultant. MyEduPort gives every student a clear plan, the right information, and a portfolio that tells their story — from Grade 9 to offer day.</p>
        <div className="mk-cta-buttons" style={{ justifyContent: "center" }}>
          <NavLink className="button" to="/login?mode=register">Start Building Your Portfolio</NavLink>
          <NavLink className="button ghost" to="/platform-overview">See the platform</NavLink>
        </div>
      </section>

      <section>
        <div className="mk-head">
          <span className="eyebrow">Six reasons</span>
          <h2 className="mk-h2">What Makes MyEduPort Different</h2>
        </div>
        <div className="mk-reasons">
          {REASONS.map((r) => (
            <div key={r.title} className="mk-feature">
              <span className="mk-icon"><Icon name={r.icon} size={26} /></span>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mk-head">
          <span className="eyebrow">Side by side</span>
          <h2 className="mk-h2">How MyEduPort Compares</h2>
        </div>
        <div className="card mk-compare">
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Comparison">
            <table>
              <thead><tr><th scope="col"><span className="sr-only">What you get</span></th><th scope="col">On your own</th><th scope="col">Private consultant</th><th scope="col" className="mk-us">MyEduPort</th></tr></thead>
              <tbody>
                {COMPARE.map(([label, a, b, c]) => (
                  <tr key={label}><th scope="row">{label}</th><td><Cell v={a} /></td><td><Cell v={b} /></td><td className="mk-us"><Cell v={c} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div className="mk-head">
          <span className="eyebrow">Trusted by families</span>
          <h2 className="mk-h2">Trusted by Families Preparing for Top Universities</h2>
        </div>
        <StatsBar />
      </section>

      <CtaBanner />
    </div>
  );
}
