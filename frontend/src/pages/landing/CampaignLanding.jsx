import React, { useState, useEffect } from "react";
import { NavLink, useParams } from "react-router-dom";
import { getToken, getUserRole } from "../../api/client";
import { getCampaign } from "./campaigns.jsx";

// One template behind every /lp/<campaign> page. The wording comes from
// campaigns.jsx, so launching a campaign means adding an entry there.
//
// Unlike the marketing home page this does NOT bounce signed-in visitors to their
// dashboard: you need to be able to open your own ad link and check how it looks.
// The call-to-action still sends a signed-in visitor somewhere useful.
export default function CampaignLanding() {
  const { campaign: slug } = useParams();
  const c = getCampaign(slug);

  // Each campaign gets its own tab title and description for search and link previews.
  useEffect(() => {
    const prevTitle = document.title;
    const tag = document.querySelector('meta[name="description"]');
    const prevDesc = tag?.getAttribute("content");
    document.title = c.title;
    if (tag) tag.setAttribute("content", c.description);
    return () => {
      document.title = prevTitle;
      if (tag && prevDesc != null) tag.setAttribute("content", prevDesc);
    };
  }, [c.title, c.description]);

  // Signed-in visitors go to their dashboard instead of the sign-in form.
  const role = getUserRole();
  const ctaTo = !getToken()
    ? "/login"
    : role === "parent" ? "/parent" : role === "counselor" ? "/counselor" : "/dashboard";

  const [activeVideo, setActiveVideo] = useState(null);

  return (
    <div className="grid" style={{ gap: "3.5rem", paddingBottom: "2rem" }}>
      {/* =========================================================
          1. HERO SECTION
          ========================================================= */}
      <section className="hero landing-hero">
        <div className="landing-hero-content">
          {/* Brand Tagline Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                color: "#fff",
                padding: "0.35rem 0.85rem",
                borderRadius: "999px",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(255, 255, 255, 0.25)"
              }}
            >
              {c.badge}
            </span>
          </div>

          <h1
            style={{
              fontSize: "2.65rem",
              lineHeight: 1.15,
              marginBottom: "0.85rem",
              fontWeight: 800,
              letterSpacing: "-0.02em"
            }}
          >
            {c.headline}
          </h1>

          <p
            style={{
              fontSize: "1.18rem",
              maxWidth: "42ch",
              lineHeight: 1.5,
              color: "rgba(255, 255, 255, 0.95)",
              marginBottom: "1.25rem"
            }}
          >
            {c.subheadline}
          </p>

          {/* 14-Day Free Trial Notice */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid rgba(52, 211, 153, 0.4)",
              borderRadius: "8px",
              padding: "0.5rem 0.9rem",
              maxWidth: "fit-content",
              marginBottom: "1.5rem",
              color: "#fff",
              fontSize: "0.92rem",
              fontWeight: 600
            }}
          >
            <span>{c.trialEmoji}</span>
            <span>{c.trialNote}</span>
          </div>

          <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", alignItems: "center" }}>
            <NavLink className="button white" to={ctaTo} style={{ fontWeight: 700, padding: "0.75rem 1.6rem" }}>
              {c.ctaPrimary}
            </NavLink>
            <button
              type="button"
              className="button ghost"
              onClick={() => setActiveVideo("demo90")}
              style={{
                borderColor: "rgba(255, 255, 255, 0.6)",
                color: "#fff",
                background: "rgba(255, 255, 255, 0.08)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <PlayIcon /> {c.ctaSecondary}
            </button>
          </div>
        </div>

        {/* Right side hero visual */}
        <div className="landing-hero-visual">
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, rgba(31,52,97,0.7) 0%, rgba(31,52,97,0.15) 50%, rgba(4,120,87,0.3) 100%)"
            }}
          />
          {/* Quick interactive preview card floating on hero */}
          <div
            style={{
              position: "absolute",
              bottom: "2rem",
              right: "2rem",
              left: "2rem",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              padding: "1.1rem 1.3rem",
              borderRadius: "12px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem"
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--teal-deep)", fontWeight: 700 }}>
                {c.previewEyebrow}
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--navy)" }}>
                {c.previewTitle}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveVideo("demo90")}
              style={{
                background: "var(--navy)",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: "42px",
                height: "42px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(31,52,97,0.3)"
              }}
              aria-label="Play 90-sec demo video"
            >
              <PlayIcon fill="#fff" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================
          2. SOUND FAMILIAR? (PAIN POINTS SECTION)
          ========================================================= */}
      <section>
        <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 2.5rem" }}>
          <span className="eyebrow" style={{ color: "var(--teal-deep)" }}>
            The Admission Struggle
          </span>
          <h2 className="section-title" style={{ fontSize: "2.1rem", marginTop: "0.4rem" }}>
            Sound Familiar?
          </h2>
          <p className="lede" style={{ marginTop: "0.4rem", color: "var(--ink-muted)" }}>
            Preparing for elite universities is daunting. Most students and parents run into the exact same roadblocks:
          </p>
        </div>

        <div className="grid three">
          <PainCard
            icon="😰"
            title="Not Sure If You're Competitive"
            text="Wondering how your grades, test scores, and extracurriculars really stack up against thousands of top global applicants."
          />
          <PainCard
            icon="📄"
            title="Essay Feels Impossible to Start"
            text="Staring at a blank screen for hours, unable to find your personal story or articulate your unique spike effectively."
          />
          <PainCard
            icon="🗓️"
            title="No Structured Application Plan"
            text="Lost in confusing deadlines, testing dates, subject requirements, and portfolio milestones across US, UK, and China."
          />
          <PainCard
            icon="💸"
            title="Consultant Fees Are Out of Reach"
            text="Private admissions consultants demand $3K–$15K+, putting top-tier guidance out of reach for most families."
          />
          <PainCard
            icon="😵"
            title="Info Overload — No Central Hub"
            text="Important documents, certificates, grades, and drafts scattered across random spreadsheets, emails, and folders."
          />
          <PainCard
            icon="⏰"
            title="Deadlines Approaching Fast"
            text="Feeling constant anxiety that time is slipping away while critical parts of your application remain unfinished."
          />
        </div>
      </section>

      {/* =========================================================
          3. THE STAKES ARE HIGHER THAN EVER
          ========================================================= */}
      <section
        style={{
          background: "var(--surface-warm, #f8fafc)",
          border: "1px solid var(--rule, #e2e8f0)",
          borderRadius: "var(--r-xl, 16px)",
          padding: "3rem 2.5rem"
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 2rem" }}>
          <span className="eyebrow" style={{ color: "#b91c1c" }}>
            Reality Check
          </span>
          <h2 className="section-title" style={{ fontSize: "2rem", marginTop: "0.4rem" }}>
            The Stakes Are Higher Than Ever
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.75rem",
            marginBottom: "2rem"
          }}
        >
          <div
            className="card"
            style={{
              padding: "2rem",
              textAlign: "center",
              borderTop: "4px solid #ef4444",
              background: "#fff"
            }}
          >
            <div
              style={{
                fontSize: "3.2rem",
                fontWeight: 800,
                color: "#b91c1c",
                lineHeight: 1,
                marginBottom: "0.6rem",
                letterSpacing: "-0.03em"
              }}
            >
              &lt; 4%
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--navy)", marginBottom: "0.4rem" }}>
              Harvard &amp; MIT Acceptance Rate
            </div>
            <p className="muted" style={{ fontSize: "0.92rem", margin: 0 }}>
              Top US and global universities reached historic record-low acceptance rates in 2025. Perfect grades alone are no longer enough.
            </p>
          </div>

          <div
            className="card"
            style={{
              padding: "2rem",
              textAlign: "center",
              borderTop: "4px solid var(--teal-deep)",
              background: "#fff"
            }}
          >
            <div
              style={{
                fontSize: "3.2rem",
                fontWeight: 800,
                color: "var(--navy)",
                lineHeight: 1,
                marginBottom: "0.6rem",
                letterSpacing: "-0.03em"
              }}
            >
              $3K–$15K
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--navy)", marginBottom: "0.4rem" }}>
              Average Cost of Private Consultant
            </div>
            <p className="muted" style={{ fontSize: "0.92rem", margin: 0 }}>
              Families spend thousands of dollars for basic guidance. MyEduPort delivers smarter, 24/7 personalized coaching at 1% of the cost.
            </p>
          </div>
        </div>

        {/* Central Callout Banner */}
        <div
          style={{
            background: "var(--grad)",
            color: "#fff",
            padding: "1.6rem 2rem",
            borderRadius: "12px",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            boxShadow: "0 8px 24px rgba(31,52,97,0.2)"
          }}
        >
          <span style={{ fontSize: "1.7rem" }}>🎯</span>
          <span style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
            If your deadline were tomorrow — is your portfolio truly ready?
          </span>
        </div>
      </section>

      {/* =========================================================
          4. NOT JUST AI — AI TRAINED FOR THIS (CORE VALUE PROPOSITION)
          ========================================================= */}
      <section>
        <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 2.5rem" }}>
          <span className="eyebrow" style={{ color: "var(--teal-deep)" }}>
            Purpose-Built Intelligence
          </span>
          <h2 className="section-title" style={{ fontSize: "2.1rem", marginTop: "0.4rem" }}>
            Not Just AI — AI Trained for This
          </h2>
          <p className="lede" style={{ marginTop: "0.6rem", fontSize: "1.08rem" }}>
            MyEduPort’s AI was purpose-built and trained exclusively on university admissions data.
            It knows what top universities look for — because that’s all it was trained to do.
          </p>

          <div style={{ marginTop: "1.25rem" }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => setActiveVideo("ai60")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: 600,
                padding: "0.6rem 1.25rem"
              }}
            >
              <PlayIcon fill="currentColor" /> How Our AI Was Trained — Inside Look (60-sec Video)
            </button>
          </div>
        </div>

        <div className="grid two" style={{ gap: "1.75rem" }}>
          <FeaturePillar
            icon="🎓"
            title="Admissions-Trained Language Model"
            description="Fine-tuned on thousands of successful applications, essays, and university evaluation rubrics — not a generic chatbot. Understands the difference between qualified and admitted."
          />
          <FeaturePillar
            icon="📊"
            title="University-Specific Intelligence"
            description="Knows the nuances of Harvard's holistic review, Oxford's rigorous subject interviews, and Tsinghua's portfolio requirements — individually tailored per target institution."
          />
          <FeaturePillar
            icon="✍️"
            title="Essay Writing That Sounds Like You"
            description="MEPai Essay doesn't write for you — it coaches you through each draft using the same structural frameworks top applicants use, preserving your authentic student voice."
          />
          <FeaturePillar
            icon="🧭"
            title="Real-Time Guidance, 24/7"
            description="MEPai Coach answers any admissions question instantly — Reach / Target / Safety school strategy, activity list refinement, recommendation letters, and interview prep."
          />
        </div>
      </section>

      {/* =========================================================
          5. STUDENTS WHO MADE IT (TESTIMONIALS)
          ========================================================= */}
      <section>
        <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 2.5rem" }}>
          <span className="eyebrow" style={{ color: "var(--teal-deep)" }}>
            Proven Track Record
          </span>
          <h2 className="section-title" style={{ fontSize: "2rem", marginTop: "0.4rem" }}>
            Students Who Made It
          </h2>
          <p className="lede" style={{ marginTop: "0.4rem", color: "var(--ink-muted)" }}>
            Real outcomes from ambitious students admitted to their dream institutions.
          </p>
        </div>

        <div className="grid two" style={{ gap: "2rem" }}>
          <TestimonialCard
            quote="After just 2 hours with MEPai Write, I had a draft my advisor called the best she’d seen from any student in the year."
            name="Piya W."
            school="Triam Udom"
            dest="UCL Computer Science"
            flag="🇬🇧"
          />
          <TestimonialCard
            quote="My family couldn't afford a consultant. MyEduPort gave me everything I needed. Now I'm on a full scholarship at Edinburgh."
            name="Thanakorn S."
            school="Assumption College"
            dest="University of Edinburgh"
            flag="🏴󠁧󠁢󠁳󠁣󠁴󠁿"
          />
        </div>
      </section>

      {/* =========================================================
          6. 14-DAY FREE TRIAL HIGHLIGHT BOX
          ========================================================= */}
      <section
        className="card dark"
        style={{
          background: "var(--grad)",
          padding: "3.5rem 2.75rem",
          borderRadius: "var(--r-xl, 16px)",
          boxShadow: "0 16px 40px rgba(31,52,97,0.25)",
          color: "#fff"
        }}
      >
        <div className="landing-split-box">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(255,255,255,0.18)", padding: "0.3rem 0.8rem", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 700, marginBottom: "1rem" }}>
              🎁 Risk-Free Experience
            </div>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, lineHeight: 1.2, marginBottom: "0.85rem", color: "#fff" }}>
              Try Free for 14 Days
            </h2>
            <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.92)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Full access to all features. No credit card required. Cancel anytime.
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.75rem 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
              <CheckListItemWhite text="AI Portfolio Builder" />
              <CheckListItemWhite text="Acceptance Predictor" />
              <CheckListItemWhite text="MEPai Essay & Coach" />
              <CheckListItemWhite text="University Database" />
            </ul>

            <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.8)", marginBottom: "1.75rem", fontStyle: "italic" }}>
              After 14 days, choose the plan that fits you — or cancel with one click.
            </p>

            <NavLink className="button white" to={ctaTo} style={{ fontSize: "1.05rem", fontWeight: 700, padding: "0.85rem 2rem" }}>
              Claim Your 14-Day Free Access →
            </NavLink>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "14px",
              padding: "2rem",
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>🚀</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.5rem" }}>
              Immediate Portfolio Boost
            </div>
            <p style={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.88)", lineHeight: 1.5, margin: 0 }}>
              Get instant scoring on your GPA, activities, and essay ideas within 5 minutes of signing in.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          7. CHOOSE YOUR PLAN (PRICING SECTION)
          ========================================================= */}
      <section id="pricing">
        <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 2.5rem" }}>
          <span className="eyebrow" style={{ color: "var(--teal-deep)" }}>
            Transparent Pricing
          </span>
          <h2 className="section-title" style={{ fontSize: "2.1rem", marginTop: "0.4rem" }}>
            Choose Your Plan
          </h2>
          <p className="lede" style={{ marginTop: "0.4rem", color: "var(--ink-muted)" }}>
            Start free. Upgrade when you're ready.
          </p>
        </div>

        <div className="grid three" style={{ alignItems: "stretch" }}>
          {/* Plan 1: Free */}
          <PricingCard
            badge="Starter"
            name="Free"
            price="Free"
            sub="14-Day Full Access"
            tagline="No credit card needed"
            features={[
              "AI Portfolio Builder",
              "Acceptance Predictor (3 uni)",
              "MEPai Essay (2 essays)",
              "Smart Timeline",
              "University Database"
            ]}
            ctaText="Start Free"
            ctaTo="/login"
            buttonVariant="ghost"
          />

          {/* Plan 2: Essential */}
          <PricingCard
            badge="Essential"
            name="Essential"
            price="$29/mo"
            sub="≈ ฿990 / month"
            tagline="For Grade 10–12 students"
            features={[
              "AI Portfolio Builder",
              "Acceptance Predictor (10 uni)",
              "MEPai Essay (10 essays/month)",
              "MEPai Coach (limited)",
              "Smart Timeline",
              "University Database"
            ]}
            ctaText="Get Essential"
            ctaTo="/login"
            buttonVariant="primary"
          />

          {/* Plan 3: Professional (Popular) */}
          <PricingCard
            badge="⭐ Most Recommended"
            badgeHighlight
            name="Professional"
            price="$49/mo"
            sub="≈ ฿1,690 / month"
            tagline="For ambitious applicants to top universities"
            features={[
              "Everything in Essential",
              "Acceptance Predictor (50 uni)",
              "MEPai Essay (Unlimited)",
              "MEPai Coach (Unlimited)",
              "Parent Dashboard",
              "Document Storage 10GB"
            ]}
            ctaText="Go Professional"
            ctaTo="/login"
            isPopular
            buttonVariant="gold"
          />
        </div>

        {/* Pricing Reassurance & Money-back Guarantee */}
        <div
          style={{
            marginTop: "2.5rem",
            padding: "1.75rem",
            background: "var(--surface-warm, #f8fafc)",
            border: "1px solid var(--rule, #e2e8f0)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.85rem",
            textAlign: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", justifyContent: "center", fontWeight: 600, color: "var(--navy)" }}>
            <span>✓ 14-Day Free Trial</span>
            <span>·</span>
            <span>✓ Cancel Anytime</span>
            <span>·</span>
            <span>✓ No Credit Card Required</span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.6rem",
              background: "rgba(16, 185, 129, 0.12)",
              color: "var(--teal-deep)",
              padding: "0.5rem 1.2rem",
              borderRadius: "999px",
              fontWeight: 700,
              fontSize: "0.92rem",
              marginTop: "0.25rem"
            }}
          >
            <span>🛡️</span>
            <span>30-Day Money-Back Guarantee — Not satisfied after 30 days? Full refund, no questions asked.</span>
          </div>
        </div>
      </section>

      {/* =========================================================
          8. QUICK ANSWERS (FAQ)
          ========================================================= */}
      <section>
        <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 2.5rem" }}>
          <span className="eyebrow" style={{ color: "var(--teal-deep)" }}>
            Got Questions?
          </span>
          <h2 className="section-title" style={{ fontSize: "2rem", marginTop: "0.4rem" }}>
            Quick Answers
          </h2>
        </div>

        <div style={{ maxWidth: "820px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <FaqItem
            question="What grade should I start?"
            answer="Grade 9–10 is ideal for building a deep, coherent extracurricular spike and rigorous coursework. However, Grade 11–12 students can still benefit significantly by optimizing their activity descriptions, strategizing university lists, and perfecting their application essays — start now."
          />
          <FaqItem
            question="How is this different from a consultant?"
            answer="Smarter AI, trained specifically for admissions evaluation rubrics. Available 24/7 without booking weeks in advance, and at 1% of the cost of traditional private admissions counselors."
          />
          <FaqItem
            question="Do I need any technical background?"
            answer="None at all. MyEduPort is designed intuitively for any high school student or parent to use effortlessly from day one."
          />
        </div>
      </section>

      {/* =========================================================
          9. BOTTOM CLOSING CTA
          ========================================================= */}
      <section
        className="card dark"
        style={{
          background: "var(--grad)",
          padding: "3.75rem 2.5rem",
          textAlign: "center",
          borderRadius: "var(--r-xl, 16px)",
          boxShadow: "0 12px 36px rgba(31,52,97,0.25)"
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{c.closingEmoji}</div>
        <h2 style={{ color: "#fff", fontSize: "2.35rem", fontWeight: 800, marginBottom: "0.85rem", letterSpacing: "-0.02em" }}>
          {c.closingHeadline}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "1.15rem", marginBottom: "2rem", maxWidth: "46ch", margin: "0 auto 2rem" }}>
          {c.closingSubtext}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
          <NavLink
            className="button white"
            to={ctaTo}
            style={{ fontSize: "1.1rem", fontWeight: 700, padding: "0.85rem 2.2rem" }}
          >
            {c.closingCta}
          </NavLink>
        </div>
      </section>

      {/* =========================================================
          10. VIDEO MODAL (Interactive Demo / Inside Look)
          ========================================================= */}
      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveVideo(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "720px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              border: "1px solid var(--rule, #e2e8f0)"
            }}
          >
            <div
              style={{
                background: "var(--navy)",
                color: "#fff",
                padding: "1.2rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontWeight: 700 }}>
                <PlayIcon fill="#fff" />
                <span>
                  {activeVideo === "demo90"
                    ? "MyEduPort.ai — 90-Second Product Walkthrough"
                    : "Inside Look — How MyEduPort’s Admissions AI Was Trained"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: "1.4rem",
                  cursor: "pointer",
                  lineHeight: 1
                }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "2.5rem 2rem", textAlign: "center", background: "#f8fafc" }}>
              <div
                style={{
                  aspectRatio: "16/9",
                  background: "var(--grad)",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  padding: "2rem",
                  position: "relative",
                  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.2)"
                }}
              >
                <div
                  style={{
                    width: "68px",
                    height: "68px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    backdropFilter: "blur(6px)",
                    border: "2px solid #fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem"
                  }}
                >
                  <PlayIcon width="28" height="28" fill="#fff" />
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                  {activeVideo === "demo90" ? "90-Second Interactive Demo" : "60-Second AI Training Explainer"}
                </div>
                <p style={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.85)", maxWidth: "44ch", margin: 0 }}>
                  Experience how MyEduPort scores your portfolio, analyzes gaps, and generates target university recommendations.
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
                <span style={{ fontSize: "0.88rem", color: "var(--ink-muted)" }}>
                  Ready to test with your own profile?
                </span>
                <NavLink
                  className="button"
                  to={ctaTo}
                  onClick={() => setActiveVideo(null)}
                  style={{ fontWeight: 700 }}
                >
                  Start 14-Day Free Trial →
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SUBCOMPONENTS
   ========================================================= */

function PainCard({ icon, title, text }) {
  return (
    <div
      className="card"
      style={{
        padding: "1.75rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        borderRadius: "12px",
        border: "1px solid var(--rule, #e2e8f0)",
        background: "#fff",
        transition: "transform 0.2s ease, box-shadow 0.2s ease"
      }}
    >
      <div style={{ fontSize: "2rem", lineHeight: 1 }}>{icon}</div>
      <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--navy)", margin: 0 }}>
        {title}
      </h3>
      <p className="muted" style={{ fontSize: "0.92rem", lineHeight: 1.5, margin: 0 }}>
        {text}
      </p>
    </div>
  );
}

function FeaturePillar({ icon, title, description }) {
  return (
    <div
      className="card"
      style={{
        padding: "2rem",
        display: "flex",
        gap: "1.25rem",
        alignItems: "flex-start",
        borderRadius: "14px",
        border: "1px solid var(--rule, #e2e8f0)",
        background: "#fff"
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "12px",
          background: "var(--teal-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.6rem",
          flexShrink: 0
        }}
      >
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--navy)", marginBottom: "0.45rem" }}>
          {title}
        </h3>
        <p className="muted" style={{ fontSize: "0.94rem", lineHeight: 1.55, margin: 0 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function TestimonialCard({ quote, name, school, dest, flag }) {
  return (
    <div
      className="card"
      style={{
        padding: "2.25rem 2rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: "14px",
        border: "1px solid var(--rule, #e2e8f0)",
        background: "#fff",
        boxShadow: "0 4px 16px rgba(0,0,0,0.04)"
      }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "2rem", color: "var(--teal-deep)", lineHeight: 1, marginBottom: "0.5rem" }}>
          “
        </div>
        <p
          style={{
            fontSize: "1.08rem",
            lineHeight: 1.6,
            color: "var(--ink)",
            fontStyle: "italic",
            margin: 0
          }}
        >
          {quote}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid var(--rule, #e2e8f0)",
          paddingTop: "1rem"
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--navy)" }}>{name}</div>
          <div style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>{school}</div>
        </div>
        <div
          style={{
            background: "var(--teal-soft)",
            color: "var(--teal-deep)",
            padding: "0.35rem 0.75rem",
            borderRadius: "6px",
            fontSize: "0.88rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}
        >
          <span>→</span>
          <span>{dest}</span>
          <span>{flag}</span>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  badge,
  badgeHighlight,
  name,
  price,
  sub,
  tagline,
  features,
  ctaText,
  ctaTo,
  isPopular,
  buttonVariant
}) {
  return (
    <div
      className={`card ${isPopular ? "highlight" : ""}`}
      style={{
        padding: "2.25rem 2rem",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        borderRadius: "14px",
        border: isPopular ? "2px solid var(--teal-deep)" : "1px solid var(--rule, #e2e8f0)",
        background: "#fff",
        boxShadow: isPopular ? "0 12px 32px rgba(16,185,129,0.15)" : "0 4px 12px rgba(0,0,0,0.03)"
      }}
    >
      {badge && (
        <span
          className={`badge ${badgeHighlight ? "warning" : "primary"}`}
          style={{
            alignSelf: "flex-start",
            marginBottom: "1rem",
            fontSize: "0.78rem",
            fontWeight: 700
          }}
        >
          {badge}
        </span>
      )}

      <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--navy)", marginBottom: "0.25rem" }}>
        {name}
      </h3>
      <p className="muted" style={{ fontSize: "0.88rem", minHeight: "2.4em", marginBottom: "1rem" }}>
        {tagline}
      </p>

      <div style={{ marginBottom: "1.5rem", borderBottom: "1px solid var(--rule, #e2e8f0)", paddingBottom: "1.25rem" }}>
        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>
          {price}
        </div>
        <div style={{ fontSize: "0.88rem", color: "var(--teal-deep)", fontWeight: 600, marginTop: "0.35rem" }}>
          {sub}
        </div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem 0", flex: 1, display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.92rem", color: "var(--ink)" }}>
            <CheckIcon />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <NavLink
        className={`button ${buttonVariant === "gold" ? "gold" : buttonVariant === "ghost" ? "ghost" : ""}`}
        to={ctaTo}
        style={{ textAlign: "center", fontWeight: 700 }}
      >
        {ctaText} →
      </NavLink>
    </div>
  );
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--rule, #e2e8f0)",
        borderRadius: "12px",
        overflow: "hidden"
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "1.25rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left"
        }}
      >
        <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--navy)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span>❓</span> {question}
        </span>
        <span style={{ fontSize: "1.2rem", color: "var(--ink-muted)", fontWeight: 700 }}>
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 1.5rem 1.35rem 1.5rem", color: "var(--ink-muted)", fontSize: "0.96rem", lineHeight: 1.6 }}>
          {answer}
        </div>
      )}
    </div>
  );
}

function CheckListItemWhite({ text }) {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.95rem" }}>
      <span style={{ color: "#34d399", fontWeight: 800 }}>✓</span>
      <span>{text}</span>
    </li>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal-deep)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: "0.15rem", flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlayIcon({ width = "16", height = "16", fill = "currentColor" }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill={fill} style={{ flexShrink: 0 }}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
