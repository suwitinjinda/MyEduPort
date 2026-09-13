import React, { useState } from "react";
import { PORTFOLIO_GUIDE } from "../components/AdvisoryNote.jsx";

const SECTIONS = [
  { id: "framework", num: "01", label: "Holistic Review Framework" },
  { id: "academic", num: "02", label: "Academic Excellence" },
  { id: "ec", num: "03", label: "Extracurricular Impact" },
  { id: "essays", num: "04", label: "Essays" },
  { id: "recs", num: "05", label: "Recommendation Letters" },
  { id: "hooks", num: "06", label: "Hooks & Special Circumstances" },
  { id: "interest", num: "07", label: "Demonstrated Interest" },
  { id: "examples", num: "08", label: "Portfolio Examples" },
  { id: "mistakes", num: "09", label: "Common Mistakes" },
  { id: "financial", num: "10", label: "Financial Considerations" },
  { id: "timeline", num: "11", label: "Year-by-Year Timeline" }
];

export default function Guide() {
  const [active, setActive] = useState("framework");

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.75rem", marginBottom: "2.5rem" }}>
        <div className="eyebrow">The Excellent Portfolio Guide</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.75rem", color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.05, maxWidth: "20ch" }}>
          The complete playbook for top-tier admissions.
        </h1>
        <p className="lede" style={{ marginTop: "1rem", maxWidth: "60ch" }}>
          Target universities: Ivy League, Stanford, MIT, Caltech, Duke,
          Northwestern, UChicago, Johns Hopkins, and similar top-tier
          institutions. Acceptance rates: 3–10%. This guide is the operating
          manual.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "3rem" }} className="guide-layout">
        {/* TOC sidebar */}
        <aside style={{ position: "sticky", top: "100px", alignSelf: "start", maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
          <div style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "1.25rem", fontWeight: 600 }}>
            Contents
          </div>
          <nav style={{ display: "grid", gap: "0.15rem" }}>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActive(s.id)}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.75rem",
                  padding: "0.55rem 0",
                  paddingLeft: active === s.id ? "0.75rem" : "0",
                  borderLeft: active === s.id ? "2px solid var(--gold)" : "2px solid transparent",
                  color: active === s.id ? "var(--ink)" : "var(--ink-muted)",
                  fontWeight: active === s.id ? 600 : 500,
                  fontSize: "0.88rem",
                  transition: "all 0.15s ease"
                }}
              >
                <span style={{ fontFamily: "var(--font-display)", fontSize: "0.78rem", color: "var(--gold-deep)" }}>{s.num}</span>
                <span>{s.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        {/* Body */}
        <div style={{ display: "grid", gap: "4rem" }}>
          <Block id="framework" num="01" title="Holistic Review Framework">
            <Lede>
              Top universities use holistic review. Perfect grades and test
              scores are necessary but not sufficient — they make you
              qualified, not admitted. Here is exactly how the four pillars
              are weighted.
            </Lede>
            <div className="grid four" style={{ marginTop: "1.5rem" }}>
              {PORTFOLIO_GUIDE.weights.map((w, idx) => (
                <div key={w.label} className="card" style={{ borderTop: "2px solid var(--gold)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "0.85rem", color: "var(--gold-deep)", fontWeight: 600, letterSpacing: "0.08em" }}>
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1, margin: "0.5rem 0", letterSpacing: "-0.02em" }}>
                    {w.weight}<span style={{ fontSize: "1rem", color: "var(--ink-muted)" }}>%</span>
                  </div>
                  <div className="subtitle" style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>{w.label}</div>
                  <p className="muted" style={{ fontSize: "0.85rem" }}>{w.note}</p>
                </div>
              ))}
            </div>
          </Block>

          <Block id="academic" num="02" title="Academic Excellence">
            <SubBlock title="GPA & Course Rigor">
              <Lede>{PORTFOLIO_GUIDE.gpa.summary}</Lede>
              <BulletList items={PORTFOLIO_GUIDE.gpa.bullets} />
            </SubBlock>

            <SubBlock title="Ideal Course Load by Year">
              <div style={{ display: "grid", gap: "1rem" }}>
                {PORTFOLIO_GUIDE.courseLoadByYear.map((y) => (
                  <div key={y.grade} className="card compact" style={{ background: "var(--surface-warm)" }}>
                    <div className="subtitle" style={{ fontSize: "1rem" }}>{y.grade}</div>
                    <ul className="list" style={{ marginTop: "0.5rem" }}>
                      {y.load.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </SubBlock>

            <SubBlock title="Recommended AP / IB Courses (take 8–12)">
              <div className="grid two">
                <div className="card compact">
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block" }}>STEM</div>
                  <ul className="list" style={{ marginTop: "0.5rem" }}>
                    {PORTFOLIO_GUIDE.recommendedAPs.stem.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
                <div className="card compact">
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block" }}>Humanities</div>
                  <ul className="list" style={{ marginTop: "0.5rem" }}>
                    {PORTFOLIO_GUIDE.recommendedAPs.humanities.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </div>
            </SubBlock>

            <SubBlock title="Class Rank">
              <Lede>{PORTFOLIO_GUIDE.classRank.summary}</Lede>
              <BulletList items={PORTFOLIO_GUIDE.classRank.bullets} />
            </SubBlock>

            <SubBlock title="Standardized Tests">
              <Lede>{PORTFOLIO_GUIDE.testScores.summary}</Lede>
              <BulletList items={PORTFOLIO_GUIDE.testScores.bullets} />
              <div className="grid two" style={{ marginTop: "1.25rem" }}>
                <div className="card compact" style={{ background: "var(--surface-warm)" }}>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block" }}>{PORTFOLIO_GUIDE.testScores.international.title}</div>
                  <ul className="list" style={{ marginTop: "0.5rem" }}>
                    {PORTFOLIO_GUIDE.testScores.international.bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
                <div className="card compact" style={{ background: "var(--surface-warm)" }}>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block" }}>Strategy</div>
                  <ul className="list" style={{ marginTop: "0.5rem" }}>
                    {PORTFOLIO_GUIDE.testScores.strategy.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              </div>
              <div className="card compact" style={{ marginTop: "1rem", background: "var(--surface-warm)" }}>
                <div className="eyebrow" style={{ paddingLeft: 0, display: "block" }}>AP exam scores</div>
                <ul className="list" style={{ marginTop: "0.5rem" }}>
                  {PORTFOLIO_GUIDE.testScores.apExams.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            </SubBlock>

            <SubBlock title="Academic Achievements">
              <div className="grid two">
                <Sublist title="School level" items={PORTFOLIO_GUIDE.awardsByTier.school} />
                <Sublist title="National level" items={PORTFOLIO_GUIDE.awardsByTier.national} />
              </div>
              <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginTop: "1.75rem", marginBottom: "0.5rem" }}>
                Competition awards
              </div>
              <div className="grid two" style={{ marginTop: "0.5rem" }}>
                <Sublist title="Mathematics" items={PORTFOLIO_GUIDE.awardsByTier.competitions.math} />
                <Sublist title="Science" items={PORTFOLIO_GUIDE.awardsByTier.competitions.science} />
                <Sublist title="Computer Science" items={PORTFOLIO_GUIDE.awardsByTier.competitions.cs} />
                <Sublist title="Humanities / Social Sciences" items={PORTFOLIO_GUIDE.awardsByTier.competitions.humanities} />
                <Sublist title="Research & Publications" items={PORTFOLIO_GUIDE.awardsByTier.competitions.research} />
              </div>
            </SubBlock>
          </Block>

          <Block id="ec" num="03" title="Extracurricular Impact">
            <SubBlock title="The Spike Strategy">
              <Lede>{PORTFOLIO_GUIDE.spike.summary}</Lede>
              <BulletList items={PORTFOLIO_GUIDE.spike.bullets} />
              <DoDont doDont={PORTFOLIO_GUIDE.spike.doDont} />

              <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginTop: "2rem", marginBottom: "0.75rem" }}>
                Spike examples
              </div>
              <div className="grid three">
                {PORTFOLIO_GUIDE.spike.examples.map((ex) => (
                  <div key={ex.spike} className="card compact" style={{ background: "var(--surface-warm)" }}>
                    <div className="subtitle" style={{ fontSize: "1rem", color: "var(--gold-deep)" }}>{ex.spike}</div>
                    <ul className="list" style={{ marginTop: "0.5rem" }}>
                      {ex.items.map((i, idx) => <li key={idx}>{i}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </SubBlock>

            <SubBlock title="The Five Extracurricular Categories">
              <div style={{ display: "grid", gap: "1rem" }}>
                {PORTFOLIO_GUIDE.ecCategories.map((c, idx) => (
                  <div key={c.name} className="card" style={{ padding: "1.25rem" }}>
                    <div className="flex-between" style={{ alignItems: "baseline" }}>
                      <div>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "0.85rem", color: "var(--gold-deep)", marginRight: "0.5rem" }}>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="subtitle" style={{ fontSize: "1.05rem" }}>{c.name}</span>
                      </div>
                      <span className="badge primary">{c.target}</span>
                    </div>
                    <div className="grid two" style={{ marginTop: "0.75rem", gap: "1rem" }}>
                      <Sublist title="Examples" items={c.examples} />
                      <Sublist title="What makes it excellent" items={c.makesExcellent} />
                    </div>
                  </div>
                ))}
              </div>
            </SubBlock>

            <SubBlock title="Quality Indicators">
              <Lede>When describing activities, surface impact, leadership, commitment, and personal growth.</Lede>
              <div className="grid two" style={{ marginTop: "1rem" }}>
                {PORTFOLIO_GUIDE.qualityIndicators.blocks.map((b) => (
                  <Sublist key={b.name} title={b.name} items={b.items} />
                ))}
              </div>
            </SubBlock>

            <SubBlock title="Activity Categories (Common App)">
              <p className="muted" style={{ marginBottom: "0.75rem" }}>
                The Common App offers these official activity categories.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {PORTFOLIO_GUIDE.activityCategories.map((c) => (
                  <span key={c} className="badge">{c}</span>
                ))}
              </div>
            </SubBlock>

            <SubBlock title="Description Writing (150 characters each)">
              <Lede>{PORTFOLIO_GUIDE.activities.summary}</Lede>
              <BulletList items={PORTFOLIO_GUIDE.activities.bullets} />
              <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginTop: "1.5rem", marginBottom: "0.5rem" }}>
                Prioritization (10 slots — order matters)
              </div>
              <ul className="list">
                {PORTFOLIO_GUIDE.activities.prioritization.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </SubBlock>
          </Block>

          <Block id="essays" num="04" title="Essays">
            <SubBlock title="Common App Personal Statement (650 words)">
              <Lede>{PORTFOLIO_GUIDE.essays.summary}</Lede>
              <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginTop: "1.5rem", marginBottom: "0.75rem" }}>The 7 Prompts (choose one)</div>
              <ol style={{ paddingLeft: "1.5rem", display: "grid", gap: "0.65rem" }}>
                {PORTFOLIO_GUIDE.essays.prompts.map((p, i) => (
                  <li key={i} style={{ fontFamily: "var(--font-serif)", fontSize: "0.95rem", lineHeight: 1.55, color: "var(--ink-soft)" }}>{p}</li>
                ))}
              </ol>
              <DoDont doDont={PORTFOLIO_GUIDE.essays.doDont} />
            </SubBlock>

            <SubBlock title="Essay Structure (650 words total)">
              <div className="grid four">
                {PORTFOLIO_GUIDE.essays.structure.map((s) => (
                  <div key={s.part} className="card compact" style={{ background: "var(--surface-warm)" }}>
                    <div className="subtitle" style={{ fontSize: "1rem" }}>{s.part}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, color: "var(--gold-deep)", letterSpacing: "-0.01em" }}>
                      {s.words}<span style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}> words</span>
                    </div>
                    <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>{s.note}</p>
                  </div>
                ))}
              </div>
            </SubBlock>

            <SubBlock title="Overdone vs Unique Topics">
              <div className="grid two">
                <Sublist title="Overdone — proceed carefully" items={PORTFOLIO_GUIDE.essays.overdone} />
                <Sublist title="Unique and effective" items={PORTFOLIO_GUIDE.essays.unique} />
              </div>
            </SubBlock>

            <SubBlock title="Supplemental Essays">
              <p className="muted" style={{ marginBottom: "1rem" }}>
                Most top schools require 2–10 additional essays. Common types:
              </p>
              <div style={{ display: "grid", gap: "1rem" }}>
                {PORTFOLIO_GUIDE.supplementalEssays.map((e) => (
                  <div key={e.type} className="card" style={{ padding: "1.25rem" }}>
                    <div className="subtitle" style={{ fontSize: "1.05rem" }}>{e.type}</div>
                    {e.look && <Sublist title="What they look for" items={e.look} />}
                    {e.do && <Sublist title="Do" items={e.do} />}
                    {e.dont && <Sublist title="Don't" items={e.dont} />}
                    {e.avoid && <Sublist title="Avoid" items={e.avoid} />}
                  </div>
                ))}
              </div>
            </SubBlock>

            <SubBlock title="Essay Timeline">
              <div className="grid two">
                {PORTFOLIO_GUIDE.essayTimeline.map((t) => (
                  <div key={t.when} className="card compact" style={{ background: "var(--surface-warm)" }}>
                    <div className="eyebrow" style={{ paddingLeft: 0, display: "block" }}>{t.when}</div>
                    <ul className="list" style={{ marginTop: "0.5rem" }}>
                      {t.do.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ marginTop: "1rem", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>
                Start early. Good essays take 10–20+ drafts.
              </p>
            </SubBlock>
          </Block>

          <Block id="recs" num="05" title="Recommendation Letters">
            <Lede>{PORTFOLIO_GUIDE.recommendations.summary}</Lede>
            <SubBlock title="Choosing Recommenders">
              <div className="grid two">
                <Sublist title="Choose teachers who" items={PORTFOLIO_GUIDE.recommendations.choosing} />
                <Sublist title="Ideal combination" items={PORTFOLIO_GUIDE.recommendations.idealMix} />
              </div>
              <div style={{ marginTop: "1rem" }}>
                <Sublist title="Don't choose" items={PORTFOLIO_GUIDE.recommendations.avoid} />
              </div>
            </SubBlock>
            <SubBlock title="How to Request">
              <div className="grid two">
                <Sublist title="Timeline" items={PORTFOLIO_GUIDE.recommendations.timeline} />
                <Sublist title="How to ask" items={PORTFOLIO_GUIDE.recommendations.howToAsk} />
              </div>
              <div style={{ marginTop: "1rem" }}>
                <Sublist title="Brag sheet — provide to recommenders" items={PORTFOLIO_GUIDE.recommendations.bragSheet} />
              </div>
            </SubBlock>
            <SubBlock title="What Makes a Great Recommendation">
              <div className="grid two">
                <Sublist title="The best letters are" items={PORTFOLIO_GUIDE.recommendations.greatLetterTraits} />
                <Sublist title="Red flags in weak letters" items={PORTFOLIO_GUIDE.recommendations.weakLetterFlags} />
              </div>
            </SubBlock>
          </Block>

          <Block id="hooks" num="06" title="Hooks & Special Circumstances">
            <Lede>{PORTFOLIO_GUIDE.hooks.summary}</Lede>
            <SubBlock title="The Hooks">
              <div className="grid three">
                <Sublist title="Major hooks" items={PORTFOLIO_GUIDE.hooks.major} />
                <Sublist title="Minor hooks" items={PORTFOLIO_GUIDE.hooks.minor} />
                <Sublist title="NOT hooks" items={PORTFOLIO_GUIDE.hooks.notHooks} />
              </div>
            </SubBlock>
            <SubBlock title="First-Generation Students">
              <BulletList items={PORTFOLIO_GUIDE.hooks.firstGen} />
            </SubBlock>
            <SubBlock title="Low-Income Students">
              <BulletList items={PORTFOLIO_GUIDE.hooks.lowIncome} />
            </SubBlock>
            <SubBlock title="Recruited Athletes">
              <BulletList items={PORTFOLIO_GUIDE.hooks.athletes} />
            </SubBlock>
          </Block>

          <Block id="interest" num="07" title="Demonstrated Interest">
            <Lede>{PORTFOLIO_GUIDE.demonstratedInterest.summary}</Lede>
            <SubBlock title="Ways to show interest">
              <BulletList items={PORTFOLIO_GUIDE.demonstratedInterest.ways} />
            </SubBlock>
            <div className="grid two" style={{ marginTop: "1rem" }}>
              <Sublist title="Schools that DO track" items={PORTFOLIO_GUIDE.demonstratedInterest.tracksIt} />
              <Sublist title="Schools that DON'T track" items={PORTFOLIO_GUIDE.demonstratedInterest.doesNot} />
            </div>
          </Block>

          <Block id="examples" num="08" title="Portfolio Examples">
            <Lede>Three real portfolio profiles with admissions outcomes.</Lede>
            <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
              {PORTFOLIO_GUIDE.portfolioExamples.map((p) => (
                <article key={p.name} className="card" style={{ padding: "1.75rem" }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--ink)", letterSpacing: "-0.01em" }}>{p.name}</h3>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "0.75rem", marginBottom: "1.25rem" }}>
                    <Stat label="GPA" value={p.gpa} />
                    <Stat label="Rank" value={p.rank} />
                    {p.sat && <Stat label="SAT" value={p.sat} />}
                    {p.act && <Stat label="ACT" value={p.act} />}
                    <Stat label="AP" value={p.ap} />
                  </div>
                  <Sublist title="Activities" items={p.activities} />
                  <div style={{ marginTop: "1rem" }}>
                    <Sublist title="Honors" items={p.honors} />
                  </div>
                  <div style={{ marginTop: "1.25rem", padding: "0.75rem 1rem", background: "var(--gold-soft)", borderLeft: "2px solid var(--gold)" }}>
                    <span className="eyebrow" style={{ paddingLeft: 0, display: "inline" }}>Results · </span>
                    <span style={{ fontFamily: "var(--font-serif)", color: "var(--ink)", fontWeight: 600 }}>{p.results}</span>
                  </div>
                </article>
              ))}
            </div>
          </Block>

          <Block id="mistakes" num="09" title="Common Mistakes to Avoid">
            <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
              {PORTFOLIO_GUIDE.commonMistakes.map((m) => (
                <div key={m.area} className="card" style={{ padding: "1.75rem" }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", marginBottom: "1rem", color: "var(--ink)" }}>{m.area}</h3>
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {m.items.map((it, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div style={{ padding: "0.6rem 0.85rem", background: "var(--error-soft)", borderLeft: "2px solid var(--error)" }}>
                          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--error)", fontWeight: 700, marginRight: "0.5rem" }}>×</span>
                          <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>{it.dont}</span>
                        </div>
                        <div style={{ padding: "0.6rem 0.85rem", background: "var(--success-soft)", borderLeft: "2px solid var(--success)" }}>
                          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--success)", fontWeight: 700, marginRight: "0.5rem" }}>✓</span>
                          <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>{it.do}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block id="financial" num="10" title="Financial Considerations">
            <SubBlock title="Total Cost of Attendance (per year)">
              <div className="grid three">
                <div className="card compact" style={{ background: "var(--surface-warm)" }}>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block" }}>Private Universities</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.65rem", fontWeight: 700, color: "var(--ink)", marginTop: "0.5rem" }}>
                    {PORTFOLIO_GUIDE.financial.costs.private.total}
                  </div>
                  <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    Tuition: {PORTFOLIO_GUIDE.financial.costs.private.tuition}<br />
                    Room & Board: {PORTFOLIO_GUIDE.financial.costs.private.roomBoard}
                  </p>
                </div>
                <div className="card compact" style={{ background: "var(--surface-warm)" }}>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block" }}>Public · In-State</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.65rem", fontWeight: 700, color: "var(--ink)", marginTop: "0.5rem" }}>
                    {PORTFOLIO_GUIDE.financial.costs.publicIn.total}
                  </div>
                  <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    Tuition: {PORTFOLIO_GUIDE.financial.costs.publicIn.tuition}<br />
                    Room & Board: {PORTFOLIO_GUIDE.financial.costs.publicIn.roomBoard}
                  </p>
                </div>
                <div className="card compact" style={{ background: "var(--surface-warm)" }}>
                  <div className="eyebrow" style={{ paddingLeft: 0, display: "block" }}>Public · Out-of-State</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.65rem", fontWeight: 700, color: "var(--ink)", marginTop: "0.5rem" }}>
                    {PORTFOLIO_GUIDE.financial.costs.publicOut.total}
                  </div>
                </div>
              </div>
            </SubBlock>
            <SubBlock title="Financial Aid">
              <Sublist title="Schools that meet 100% of demonstrated need" items={PORTFOLIO_GUIDE.financial.aid.meetFullNeed} />
              <p className="muted" style={{ marginTop: "1rem", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
                {PORTFOLIO_GUIDE.financial.aid.needBlind}
              </p>
              <Sublist title="Merit-based aid" items={PORTFOLIO_GUIDE.financial.aid.merit} />
            </SubBlock>
            <SubBlock title="National Scholarships">
              <BulletList items={PORTFOLIO_GUIDE.financial.scholarships} />
            </SubBlock>
            <SubBlock title="Strategies to Make College Affordable">
              <BulletList items={PORTFOLIO_GUIDE.financial.strategies} />
            </SubBlock>
          </Block>

          <Block id="timeline" num="11" title="Year-by-Year Timeline">
            <div style={{ display: "grid", gap: "1.25rem", marginTop: "1.5rem" }}>
              {PORTFOLIO_GUIDE.yearTimeline.map((t, idx) => (
                <div key={t.year} className="card" style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "200px 1fr", gap: "1.5rem" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "0.85rem", color: "var(--gold-deep)", fontWeight: 600, letterSpacing: "0.08em" }}>
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--ink)", marginTop: "0.4rem" }}>{t.year}</h3>
                  </div>
                  <ul className="list">
                    {t.lines.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </Block>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .guide-layout { grid-template-columns: 1fr !important; gap: 2rem !important; }
        }
      `}</style>
    </div>
  );
}

function Block({ id, num, title, children }) {
  return (
    <section id={id} style={{ scrollMarginTop: "120px" }}>
      <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: "1rem", marginBottom: "1.5rem", display: "flex", alignItems: "baseline", gap: "1rem" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--gold-deep)", fontWeight: 600, letterSpacing: "0.05em" }}>{num}</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em" }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SubBlock({ title, children }) {
  return (
    <div style={{ marginTop: "2rem" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.75rem", letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Lede({ children }) {
  return (
    <p className="lede" style={{ marginBottom: "0.75rem", maxWidth: "64ch" }}>
      {children}
    </p>
  );
}

function BulletList({ items }) {
  return (
    <ul className="list">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

function Sublist({ title, items }) {
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div className="eyebrow" style={{ paddingLeft: 0, display: "block", marginBottom: "0.4rem" }}>{title}</div>
      <ul className="list">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

function DoDont({ doDont }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
      <div style={{ padding: "0.85rem 1rem", background: "var(--success-soft)", borderLeft: "2px solid var(--success)" }}>
        <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--success)", fontWeight: 700, marginBottom: "0.5rem" }}>Do</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {doDont.do.map((d, i) => (
            <li key={i} style={{ fontSize: "0.88rem", color: "var(--ink-soft)", padding: "0.2rem 0" }}>{d}</li>
          ))}
        </ul>
      </div>
      <div style={{ padding: "0.85rem 1rem", background: "var(--error-soft)", borderLeft: "2px solid var(--error)" }}>
        <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--error)", fontWeight: 700, marginBottom: "0.5rem" }}>Don't</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {doDont.dont.map((d, i) => (
            <li key={i} style={{ fontSize: "0.88rem", color: "var(--ink-soft)", padding: "0.2rem 0" }}>{d}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div className="mono" style={{ fontSize: "0.95rem", color: "var(--ink)", fontWeight: 600, marginTop: "0.15rem" }}>{value}</div>
    </div>
  );
}
