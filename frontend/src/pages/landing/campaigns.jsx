import React from "react";

// Campaign landing pages live at /lp/<campaign> and all share one template
// (CampaignLanding.jsx). Campaigns are normally created in Admin → Campaigns (stored in
// the database); CAMPAIGNS below is for ones kept in code. Either way, no new component
// and no new route. Anything a campaign leaves out falls back to
// BASE, so an entry can be as small as a headline.
//
//   /lp/facebook-oct   →  CAMPAIGNS["facebook-oct"]
//   /lp                →  BASE
//   /lp/<unknown>      →  BASE (a mistyped ad link still converts)

export const BASE = {
  // Browser tab + what search engines and link previews show
  title: "MyEduPort.ai — AI Trained for University Admissions",
  description:
    "Build a world-class portfolio and get into top universities in the US, UK, and China. AI trained specifically for admissions evaluation rubrics, essays, and guidance. 14-Day Free Trial — No Credit Card Required.",

  // Hero
  badge: "MyEduPort.ai · AI Trained for University Admissions",
  headline: "AI Trained for University Admissions — Not Just Any AI",
  subheadline: (
    <>
      Build a world-class portfolio. Get into top universities in the <strong>US · UK · China</strong>.
    </>
  ),
  trialNote: "14-Day Free Trial — No Credit Card Required",
  trialEmoji: "🎁",
  ctaPrimary: "Start 14-Day Free Trial →",
  ctaSecondary: "See How It Works in 90 Seconds",

  // The small floating card over the hero image
  previewEyebrow: "▶ Product Preview",
  previewTitle: "Watch MyEduPort.ai in action (90 sec)",

  // Closing call to action at the foot of the page
  closingEmoji: "🚀",
  closingHeadline: "Your Future Starts Today",
  closingSubtext: "Join 10,000+ students building world-class portfolios with MyEduPort.ai",
  closingCta: "🚀 Start Free — 14-Day Trial →"
};

// Add one entry per campaign. Only the fields that differ need to be listed.
const CAMPAIGNS = {
  // Example — copy this shape for a real campaign and change the slug.
  "example-parents": {
    title: "MyEduPort.ai — Help Your Child Get Into a Top University",
    description:
      "See exactly where your child's university application stands, and what to do next. 14-Day Free Trial — No Credit Card Required.",
    badge: "MyEduPort.ai · For Parents",
    headline: "Know Exactly Where Your Child's Application Stands",
    subheadline: (
      <>
        Track every part of the portfolio in one place — and see what to fix next, in{" "}
        <strong>plain language</strong>.
      </>
    ),
    ctaPrimary: "Start 14-Day Free Trial →",
    closingHeadline: "Give Them the Edge They Deserve"
  }
};

export function getCampaign(slug) {
  return { slug: slug || "default", ...BASE, ...(CAMPAIGNS[slug] || {}) };
}

export const CAMPAIGN_SLUGS = Object.keys(CAMPAIGNS);
