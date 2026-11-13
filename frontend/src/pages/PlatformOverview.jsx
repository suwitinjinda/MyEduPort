import React from "react";
import { NavLink } from "react-router-dom";
import { AUDIENCES, AudienceShowcase, CtaBanner, HowItWorks } from "../components/marketing.jsx";

// Platform Overview — MyEduPort_Platform_Overview_20261112.docx: hero, a "how it works"
// video block, then For Students / Parents / Counsellors, each with a tab per benefit and
// a picture beside it.

export default function PlatformOverview() {
  return (
    <div className="mk-page">
      <section className="mk-plain-hero">
        <span className="eyebrow">Platform overview</span>
        <h1>One Platform. Everything Your Application Needs.</h1>
        <p className="mk-lede">MyEduPort is a structured platform that helps students build, organise, and present a complete university application portfolio — from Grade 9 through offer day.</p>
        <p className="mk-lede">No scattered spreadsheets. No missed deadlines. No last-minute scrambles. Just a clear, guided process that keeps you moving forward.</p>
        <div className="mk-cta-buttons" style={{ justifyContent: "center" }}>
          <NavLink className="button" to="/login?mode=register">Create Your Free Profile</NavLink>
          <a className="button ghost" href="#for-students">Explore the platform ↓</a>
        </div>
      </section>

      <HowItWorks id="platform-how" title="What We Help With" />

      <div className="mk-head" id="for-students" style={{ scrollMarginTop: "90px", marginBottom: 0 }}>
        <span className="eyebrow">Key benefits</span>
        <h2 className="mk-h2">Guidance You Can Trust, Every Step of the Way</h2>
      </div>
      {AUDIENCES.map((a) => <AudienceShowcase key={a.key} audience={a} />)}

      <CtaBanner />
    </div>
  );
}
