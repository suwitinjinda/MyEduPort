import React from "react";
import { Link } from "react-router-dom";
import { Fill } from "../components/PrivacySummary.jsx";
import { useLegalInfo } from "../utils/legalInfo.js";

// Terms of Service. Referenced by the required "Terms of Service and Privacy Policy" box on
// sign-up and in the re-consent dialog. Company details come from Admin → Consents → Company
// details; anything still empty shows as a highlighted [placeholder]. This is a working draft
// for MyEduPort's lawyer to review — when the terms change materially, update LAST_UPDATED and
// bump CONSENT_VERSION in backend/src/services/consents.js so everyone agrees again.

const LAST_UPDATED = "November 2026";

const h2 = { fontFamily: "var(--font-display)", fontSize: "1.45rem", fontWeight: 700, margin: "0 0 0.75rem", color: "var(--ink)", letterSpacing: "-0.01em" };
const p = { fontFamily: "var(--font-serif)", fontSize: "1rem", lineHeight: 1.75, margin: "0 0 0.85rem", color: "var(--ink-soft)" };
const ul = { paddingLeft: "1.4rem", fontFamily: "var(--font-serif)", lineHeight: 1.75, margin: "0 0 0.85rem", color: "var(--ink-soft)" };

function Section({ id, n, title, children }) {
  return (
    <section id={id} className="card" style={{ marginBottom: "1.25rem", scrollMarginTop: "90px" }}>
      <h2 style={h2}>{n}. {title}</h2>
      {children}
    </section>
  );
}

const TOC = [
  ["about", "About these terms"],
  ["accounts", "Your account"],
  ["minors", "Students under 20"],
  ["service", "What MyEduPort does — and doesn't"],
  ["plans", "Plans, trial and payment"],
  ["content", "Your content"],
  ["rules", "Acceptable use"],
  ["parents", "Parents, counselors and sharing"],
  ["rewards", "Rewards and referrals"],
  ["privacy", "Privacy"],
  ["ending", "Closing your account"],
  ["liability", "Liability"],
  ["changes", "Changes to the service and these terms"],
  ["law", "Law and contact"]
];

export default function TermsOfService() {
  const legal = useLegalInfo();
  const company = <Fill value={legal.entity_name}>[Legal entity name]</Fill>;
  const contact = <Fill value={legal.dpo_email ? <a href={`mailto:${legal.dpo_email}`}>{legal.dpo_email}</a> : ""}>[contact email]</Fill>;

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto" }}>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "2rem", marginBottom: "2rem" }}>
        <div className="eyebrow">Legal</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.75rem", color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.05 }}>Terms of Service</h1>
        <p className="lede" style={{ marginTop: "0.75rem" }}>The agreement between you and MyEduPort when you use the platform. Written to be read — not just ticked.</p>
        <p className="text-muted" style={{ marginTop: "0.5rem" }}>Last updated: {LAST_UPDATED}</p>
      </header>

      <div className="card" style={{ marginBottom: "1.25rem", background: "var(--surface-warm, #f8fafc)" }}>
        <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>The short version</div>
        <ul style={{ ...ul, margin: 0 }}>
          <li>MyEduPort helps you build a portfolio and plan university applications. AI results are guidance — <strong>no one can guarantee admission</strong>.</li>
          <li>Your portfolio is yours. We use it to run the service and never sell it.</li>
          <li>Under 20? A parent or guardian must agree before everything unlocks.</li>
          <li>Paid plans renew automatically until you cancel. You can cancel any time.</li>
          <li>Be honest in what you enter, and don't misuse the service or other people's data.</li>
        </ul>
      </div>

      <nav aria-label="Contents" className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>Contents</div>
        <ol style={{ margin: 0, paddingLeft: "1.4rem", columns: "2 240px", columnGap: "2rem", lineHeight: 1.9 }}>
          {TOC.map(([id, t]) => <li key={id}><a href={`#${id}`}>{t}</a></li>)}
        </ol>
      </nav>

      <Section id="about" n={1} title="About these terms">
        <p style={p}>MyEduPort (myeduport.ai) is operated by {company} (“MyEduPort”, “we”, “us”). These terms apply to everyone who uses MyEduPort — students, parents and guardians, counselors and affiliates. By creating an account or using the service, you agree to these terms and acknowledge our <Link to="/privacy">Privacy Policy</Link>.</p>
        <p style={{ ...p, marginBottom: 0 }}>If you don't agree, please don't use MyEduPort.</p>
      </Section>

      <Section id="accounts" n={2} title="Your account">
        <ul style={ul}>
          <li>Give accurate information — including your real date of birth — and keep it up to date.</li>
          <li>Keep your password private. You're responsible for what happens under your account; tell us straight away if you think someone else has used it.</li>
          <li>One person, one account. Accounts can't be sold or transferred.</li>
        </ul>
      </Section>

      <Section id="minors" n={3} title="Students under 20">
        <p style={p}>Under Thai law, people under 20 are minors. If you are under 20:</p>
        <ul style={ul}>
          <li>When you sign up, you give us a parent or legal guardian's email. We ask them to read these terms and the Privacy Policy and give consent for you.</li>
          <li>Until they agree, your account is limited: you can fill in your profile and read our guides, but AI advice, uploads and other features stay locked.</li>
          <li>If we don't receive consent within the time shown on your account (normally 14 days), a new account and the information in it are deleted. If your parent says no, it is deleted straight away.</li>
          <li>Your parent or guardian may follow your progress on their Parent Dashboard (if they choose to), change the optional privacy choices, and withdraw consent — which deletes your account.</li>
        </ul>
        <p style={{ ...p, marginBottom: 0 }}>Parents and guardians who give consent accept these terms on the student's behalf.</p>
      </Section>

      <Section id="service" n={4} title="What MyEduPort does — and doesn't">
        <p style={p}>MyEduPort provides tools to organise your academic record, activities and essays; estimate admission chances; find gaps; get AI feedback (MEPAi and EduBot); explore careers and personality; track tasks; and export your portfolio.</p>
        <ul style={ul}>
          <li><strong>No guarantees.</strong> Admission decisions are made by universities alone. Chance estimates, rankings and recommendations are based on the data available to us and may be wrong or out of date.</li>
          <li><strong>AI can make mistakes.</strong> Check anything important — deadlines, requirements, scores — with the university itself.</li>
          <li><strong>Your work stays your work.</strong> AI feedback is there to help you improve your own writing. Submitting AI-written text as your own may break a university's rules — that responsibility is yours.</li>
          <li>We work to keep MyEduPort available, but it may sometimes be interrupted for maintenance or reasons outside our control.</li>
        </ul>
      </Section>

      <Section id="plans" n={5} title="Plans, trial and payment">
        <ul style={ul}>
          <li><strong>Free trial.</strong> New accounts get 14 days of Professional features for free. No card is needed; when it ends you move to the Free plan unless you choose a paid plan.</li>
          <li><strong>Paid plans.</strong> What each plan includes and its price are shown on the <Link to="/pricing">Pricing</Link> page and in “My plan”. Prices include any taxes shown at checkout.</li>
          <li><strong>Automatic renewal.</strong> Monthly and annual plans renew at the end of each period and are charged to your saved card until you cancel. Payments are processed by Stripe; we never see or store your full card number.</li>
          <li><strong>Cancelling.</strong> Cancel any time from Settings → Subscription → “Manage subscription”. You keep your plan until the end of the period you've paid for, then move to the Free plan. Your portfolio is kept.</li>
          <li><strong>Refunds.</strong> Payments already made are not refundable except where the law requires, or where we decide otherwise for a billing mistake. Contact us if something looks wrong.</li>
          <li><strong>Usage limits.</strong> Some features (such as MEPAi Guidance) have monthly limits set by your plan. We may change plans and prices; existing subscribers are told in advance and can cancel before a price change applies.</li>
        </ul>
      </Section>

      <Section id="content" n={6} title="Your content">
        <p style={p}>You own what you put into MyEduPort — grades, activities, essays, documents and other files. You give us permission to store, process and display it only as needed to run the service for you (including sending it to the AI providers that power our features), and to share it with the people you choose.</p>
        <p style={{ ...p, marginBottom: 0 }}>Whether your de-identified data may be used to improve our AI is your choice, made with the optional box on sign-up and changeable any time in Privacy settings. MyEduPort's software, design, guides and content belong to us and our licensors.</p>
      </Section>

      <Section id="rules" n={7} title="Acceptable use">
        <p style={p}>Please don't:</p>
        <ul style={ul}>
          <li>Enter false information, or information about another person without their permission</li>
          <li>Upload anything illegal, harmful, or that you don't have the right to share</li>
          <li>Try to break into, overload, copy or scrape the service, or get around plan limits</li>
          <li>Use MyEduPort to harass anyone, or to cheat in an application or exam</li>
          <li>Create fake accounts or referrals to collect rewards</li>
        </ul>
        <p style={{ ...p, marginBottom: 0 }}>We may remove content or suspend accounts that break these rules. Where reasonable, we'll tell you why first.</p>
      </Section>

      <Section id="parents" n={8} title="Parents, counselors and sharing">
        <p style={{ ...p, marginBottom: 0 }}>Students decide who sees their portfolio — by giving a parent invite code, connecting a counselor, or creating a share link. Anyone you share with must use what they see only to support you. You can remove access or turn off a share link at any time. Parents of students under 20 linked through parental consent can view their child's progress while the student is a minor.</p>
      </Section>

      <Section id="rewards" n={9} title="Rewards and referrals">
        <p style={{ ...p, marginBottom: 0 }}>Coins, rewards and referral or affiliate benefits have no cash value unless we say otherwise, can't be transferred, and may be removed if they were gained by breaking these terms. We may change or end reward programmes with notice.</p>
      </Section>

      <Section id="privacy" n={10} title="Privacy">
        <p style={{ ...p, marginBottom: 0 }}>How we collect, use and protect personal data — including storage and processing outside Thailand (<Fill value={legal.countries}>[countries]</Fill>) — is explained in our <Link to="/privacy">Privacy Policy</Link> and in the summary you read when signing up. We follow Thailand's Personal Data Protection Act B.E. 2562 (PDPA).</p>
      </Section>

      <Section id="ending" n={11} title="Closing your account">
        <ul style={ul}>
          <li>You can delete your account any time in Settings. Download your portfolio first if you want a copy — the export is in “Export MyPort”.</li>
          <li>After you close your account, we delete your data within <Fill value={legal.delete_days}>[30]</Fill> days and from backups within <Fill value={legal.backup_days}>[90]</Fill> days, unless the law requires us to keep something longer.</li>
          <li>We may suspend or close an account that seriously or repeatedly breaks these terms, or if the law requires it. If you've paid for a period you can no longer use because of something we did wrong, we'll refund the unused part.</li>
        </ul>
      </Section>

      <Section id="liability" n={12} title="Liability">
        <p style={p}>MyEduPort is provided “as is”. To the extent the law allows, we are not responsible for admission outcomes, decisions you make based on the service, or losses caused by things outside our reasonable control.</p>
        <p style={{ ...p, marginBottom: 0 }}>If we are responsible for a loss, our total liability is limited to the amount you paid us in the 12 months before the event. Nothing in these terms limits liability that can't be limited by law, or your rights as a consumer.</p>
      </Section>

      <Section id="changes" n={13} title="Changes to the service and these terms">
        <p style={{ ...p, marginBottom: 0 }}>We keep improving MyEduPort, so features may change. If we change these terms in a way that matters, we'll tell you on the site or by email, and ask you to agree again before you continue. If you don't agree, you can close your account.</p>
      </Section>

      <Section id="law" n={14} title="Law and contact">
        <p style={p}>These terms are governed by the laws of Thailand, and disputes go to the Thai courts.</p>
        <p style={{ ...p, marginBottom: 0 }}>Questions about these terms or your data: {contact}, or use our <Link to="/contact">Contact</Link> page.</p>
      </Section>
    </div>
  );
}
