import React, { useState } from "react";
import { NavLink, Navigate } from "react-router-dom";
import { getToken, getUserRole } from "../api/client";
import { BenefitColumns, CtaBanner, FeatureGrid, HowItWorks, StatsBar } from "../components/marketing.jsx";

// Public home page — MyEduPort_Homepage_20261111.docx (hero option A). "How It Works" stays
// hidden until the visitor asks for it ("See How It Works").

export default function Home() {
  const [showHow, setShowHow] = useState(false);
  // Signed-in users skip the marketing home and go straight to their dashboard.
  if (getToken()) {
    const role = getUserRole();
    const dest = role === "parent" ? "/parent" : role === "counselor" ? "/counselor" : role === "admin" ? "/admin" : role === "consult" ? "/consult" : "/dashboard";
    return <Navigate to={dest} replace />;
  }
  const openHow = () => {
    setShowHow(true);
    setTimeout(() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div className="mk-page">
      <section className="hero mk-hero">
        <div className="mk-hero-text">
          <h1>Your Path to the World's Best Universities Starts Here</h1>
          <p>MyEduPort guides students from Grade 9 through every step of the university application journey — from building a standout academic profile to submitting a confident, complete application.</p>
          <div className="mk-cta-buttons">
            <NavLink className="button white" to="/login?mode=register">Start Building Your Portfolio</NavLink>
            <button type="button" className="button mk-outline" aria-expanded={showHow} aria-controls="how-it-works" onClick={openHow}>See How It Works</button>
          </div>
        </div>
        <div className="mk-hero-photo" role="img" aria-label="Students studying together" />
      </section>

      {showHow && <HowItWorks id="how-it-works" />}

      <section>
        <div className="mk-head">
          <span className="eyebrow">What we help with</span>
          <h2 className="mk-h2">Everything You Need, In One Place</h2>
        </div>
        <FeatureGrid />
      </section>

      <section>
        <div className="mk-head">
          <span className="eyebrow">Key benefits</span>
          <h2 className="mk-h2">Guidance You Can Trust, Every Step of the Way</h2>
        </div>
        <BenefitColumns />
        <div style={{ textAlign: "center", marginTop: "1.5rem", display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
          <NavLink className="button ghost" to="/platform-overview">Platform overview →</NavLink>
          <NavLink className="button ghost" to="/why-myeduport">Why MyEduPort →</NavLink>
        </div>
      </section>

      <section>
        <div className="mk-head">
          <span className="eyebrow">Social proof</span>
          <h2 className="mk-h2">Trusted by Families Preparing for Top Universities</h2>
        </div>
        <StatsBar />
      </section>

      <CtaBanner />
    </div>
  );
}
