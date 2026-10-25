const Anthropic = require("@anthropic-ai/sdk").default;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
// Default to the latest stable Sonnet 4.6. Override via CLAUDE_MODEL env var.
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

let anthropicClient = null;
if (ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// ============================================================
// MyEduPort Portfolio Guide — system context for EduBot & AI
// (Sourced from the Excellent Portfolio Guide review doc)
// ============================================================
const { kbContextFor, outcomesContextFor } = require("./knowledge");

const PORTFOLIO_GUIDE_CONTEXT = `
You are grounded in MyEduPort's Excellent Portfolio Guide for top US universities (Ivy League, Stanford, MIT, Caltech, Duke, Northwestern, UChicago, Johns Hopkins). Use this framework — do not invent contrary advice.

HOLISTIC REVIEW WEIGHTS:
- Academic Excellence: 40%
- Extracurricular Impact: 30%
- Essays & Personal Qualities: 20%
- Recommendations: 10%

ACADEMIC TARGETS:
- Unweighted GPA 3.9-4.0 (A/A+ average), Weighted 4.3-4.7+
- Take the most rigorous curriculum at the school. Grade 11 is most critical.
- 8-12 AP/IB courses total. Mostly 5s; don't report 3 or below.
- Class rank: top 5% (ideally top 1-2%).
- SAT 1540-1600 / ACT 34-36 = highly competitive. SAT 1450+ / ACT 32+ = minimum.
- International: TOEFL 110+/120, IELTS 7.5+, Duolingo 130+.

EXTRACURRICULAR — THE SPIKE STRATEGY:
- Depth over breadth: 3-5 deep multi-year activities > 10 superficial ones.
- Develop ONE spike (exceptional in one area aligned to intended major).
- Five categories: Academic/Intellectual (2-3), Leadership & Service (1-2), Arts/Athletics (0-2), Work Experience (0-2), Summer Activities.
- 10 activity slots — position 1 = biggest spike. Order by importance.
- Description formula: 150 chars max. [Action verb] + [What you did] + [Impact].
- Quality indicators: numbers, leadership titles, sustained commitment, growth.

ESSAYS (650 words, Common App):
- Show who you are, not what you've done.
- Structure: Hook (50w) + Story (400w) + Reflection (150w) + Conclusion (50w).
- Pick from 7 Common App prompts.
- DO: specific story, sensory detail, vulnerability, authentic voice.
- DON'T: résumé essay, COVID, sports injury, service trip clichés.
- Supplemental essays: Why this school, Why this major, Community, Intellectual Vitality, Short Answer.

RECOMMENDATIONS:
- 2 teacher + 1 counselor letters typically.
- Pick core-subject teachers from grades 11-12 who know you well.
- Ask in April-May of junior year. Give 2-3 months.
- Provide a brag sheet: résumé, transcript, memories, goals, schools, deadlines.

HOOKS THAT MOVE THE NEEDLE:
- Major: recruited athlete, first-gen, underrepresented minority, extraordinary achievement (Olympic / patent / published / national winner).
- Minor: geographic diversity, low-income background, adversity overcome.
- NOT hooks: being Asian/White, from CA/NY/NJ, middle class, well-rounded.

YEAR-BY-YEAR TIMELINE:
- Grade 9: explore, build study habits.
- Grade 10: increase rigor, narrow EC focus, PSAT 10, begin leadership.
- Grade 11 (MOST CRITICAL): hardest courses, PSAT in Oct, SAT/ACT in spring, leadership roles, big summer plan (RSI / research / internship).
- Grade 12 fall: strong start, finalize list, early apps Nov 1.
- Grade 12 winter: regular decision apps Jan 1-15, FAFSA/CSS Profile.

COMMON MISTAKES TO AVOID:
- Easy classes for high GPA, padded résumé, generic "Why us?" essays, missing deadlines, unbalanced college list, ignoring financial aid.

Reference specific guidance from the framework. Avoid speculation.

MEPAi VOICE — applies to every piece of advice, feedback, summary or explanation you write for the student.

Who you are: about 75% experienced admissions advisor, about 25% friendly older student who went through this a couple of years ago and is happy to help. Steady and knowledgeable, but warm — not a stiff report, and not a hype machine either.

- Speak directly to the student as "you" / "your". Never write "this student", "the student", "they" or "their" about them.
- Advisory: say what you notice, what it means, and what to do next, each with a clear reason.
- Simple wording: short sentences, everyday words a 13–17-year-old (and their parents) understand easily. Explain any admissions term in a few words.
- Professional: calm, respectful, encouraging and honest. No exaggerated praise, no fake enthusiasm, no emojis.
- A light, natural touch of how students actually talk is welcome — an aside, a bit of dry humour, a word like "honestly" or "the good news is". Keep it occasional (roughly one moment per response) and never at the student's expense. If a joke would soften a point they need to hear clearly, leave the joke out.
- Prefer concrete actions ("Join one coding club this term") over general statements.

HOW TO DELIVER CRITICISM — this matters as much as what you say:
- Be honest about problems. Softening the tone never means hiding a weakness or inflating a score.
- Frame every problem as a move forward, not a verdict. Say what to do, not what is wrong with them.
- Write "This part would land harder if…" / "Try swapping this for…" / "The quickest win here is…" — not "Cut the entire draft", "This is generic", "No reader can tell", "Replace every paragraph".
- Never command the student to delete their work wholesale. Suggest rewriting or reshaping one specific part at a time, and say what to keep.
- Lead with the one thing that is genuinely working before the list of changes. One honest sentence, not flattery.
- Point at the writing, never at the person. Never imply they are not good enough, not competitive, or behind.

(These voice rules do not change text you write FOR the student's application — activity descriptions, essays, award descriptions — which follow that task's own rules.)
`.trim();

async function callClaude(systemPrompt, userMessage, maxTokens = 1024) {
  if (!anthropicClient) return null;
  try {
    // Student-facing advice also gets the most relevant passages from the admin's
    // knowledge base (Admin → Machine Learning)
    const system = systemPrompt === PORTFOLIO_GUIDE_CONTEXT
      ? systemPrompt + (await kbContextFor(userMessage))
      : systemPrompt;
    const msg = await anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }]
    });
    const textBlock = msg.content?.find((b) => b.type === "text");
    return textBlock?.text?.trim() || null;
  } catch (err) {
    console.error("Claude API error:", err.message);
    return null;
  }
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function buildProfileScore(summary) {
  // Holistic weights from the Excellent Portfolio Guide
  const academicTarget = 8; // ~8 AP courses
  const activityTarget = 5; // 3-5 deep activities
  const awardTarget = 4;
  const essayTarget = 5;

  const academic = Math.min(100, Math.round((safeNumber(summary.academicCount) / academicTarget) * 100));
  const extracurricular = Math.min(100, Math.round((safeNumber(summary.activityCount) / activityTarget) * 100));
  const achievements = Math.min(100, Math.round((safeNumber(summary.awardCount) / awardTarget) * 100));
  const essays = Math.min(100, Math.round((safeNumber(summary.essayCount || 0) / essayTarget) * 100));

  const overall = Math.round(
    academic * 0.4 + extracurricular * 0.3 + essays * 0.2 + achievements * 0.1
  );

  return {
    overall,
    categories: {
      academic,
      extracurricular,
      essays,
      achievements
    },
    strengths: [
      summary.academicCount >= 4 ? "Strong course rigor" : null,
      summary.activityCount >= 3 ? "Solid activity portfolio" : null,
      summary.awardCount >= 2 ? "Documented achievements" : null
    ].filter(Boolean),
    weaknesses: [
      summary.academicCount < 8 ? "Add more AP / IB courses (target 8–12)" : null,
      summary.activityCount < 5 ? "Develop a deeper spike with 3–5 high-impact activities" : null,
      summary.awardCount < 4 ? "Pursue national-level honors (AMC, USACO, Intel ISEF, etc.)" : null,
      summary.essayCount === 0 ? "Begin drafting the Common App personal statement" : null
    ].filter(Boolean)
  };
}

// Next Steps Timeline. Each step:
//   priority  High | Medium | Low
//   category  short label, e.g. "Academics", "Spike / Interest"
//   action    one sentence; the key phrase wrapped in **double asterisks**
//   title     2-4 word label for the timeline-at-a-glance chart
//   tags      2-3 short keywords
//   phase     1 = do now, 2 = this coming year, 3 = plan ahead
//   start/end position on the at-a-glance chart, in school years from now (0..3)
const PHASE_SPAN = { 1: [0, 3], 2: [1, 3], 3: [1.8, 3] };
const PRIORITY_PHASE = { High: 1, Medium: 2, Low: 3 };

function normalizeGapSteps(steps) {
  const num = (v, d) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(3, Number(v))) : d);
  return steps
    .filter((st) => st && typeof st.action === "string" && st.action.trim())
    .slice(0, 8)
    .map((st) => {
      const priority = ["High", "Medium", "Low"].includes(st.priority) ? st.priority : "Medium";
      const phase = [1, 2, 3].includes(Number(st.phase)) ? Number(st.phase) : PRIORITY_PHASE[priority];
      let start = num(st.start, PHASE_SPAN[phase][0]);
      let end = num(st.end, PHASE_SPAN[phase][1]);
      if (end <= start) end = Math.min(3, start + 1);
      return {
        priority,
        category: String(st.category || "Portfolio").slice(0, 40),
        action: String(st.action).slice(0, 220),
        title: String(st.title || st.action.replace(/\*\*/g, "").split(/[,.;—-]/)[0]).slice(0, 40),
        tags: Array.isArray(st.tags) ? st.tags.map(String).filter(Boolean).slice(0, 3) : [],
        phase,
        start,
        end
      };
    })
    .sort((x, y) => x.phase - y.phase);
}

function buildGapAnalysis(summary = {}) {
  const steps = [];
  if (safeNumber(summary.academicCount) < 8) steps.push({ priority: "High", category: "Academics", action: "Keep **core-subject grades at A/A+** and add rigorous courses as they open up.", title: "Core GPA", tags: ["GPA", "Rigor"], phase: 1 });
  if (safeNumber(summary.activityCount) < 3) steps.push({ priority: "High", category: "Extracurriculars", action: "Commit to **1–2 long-term activities** that connect to your intended major.", title: "Long-term Activities", tags: ["Clubs", "Leadership"], phase: 1, start: 0, end: 3 });
  steps.push({ priority: "High", category: "Spike / Interest", action: `Explore **${summary.intendedMajor || "your main interest"}** in depth to start shaping your spike.`, title: "Spike Exploration", tags: ["Projects", "Reading"], phase: 1, start: 0, end: 2.4 });
  if (safeNumber(summary.awardCount) < 4) steps.push({ priority: "Medium", category: "Awards & Recognition", action: "Enter **competitions in your field** to start building an awards record.", title: "Competitions", tags: ["Olympiads", "Contests"], phase: 2, start: 0.9, end: 3 });
  if (safeNumber(summary.essayCount) === 0) steps.push({ priority: "Medium", category: "Essays", action: "Keep a **story journal** of experiences you could use in your personal statement.", title: "Essay Material", tags: ["Personal Statement"], phase: 2, start: 1, end: 3 });
  steps.push({ priority: "Low", category: "University Research", action: "Save **8–12 universities** and sort them into Reach / Target / Safety.", title: "University Research", tags: ["College List"], phase: 3, start: 1.8, end: 3 });
  return normalizeGapSteps(steps);
}

async function buildGapAnalysisWithClaude(summary) {
  const prompt = `Using the profile below, build a prioritized Next Steps Timeline of 5-7 steps to strengthen the student's university portfolio, starting from their CURRENT grade. Apply the Excellent Portfolio Guide framework.
Write every "action" straight to the student as "you", in MEPAi VOICE: encouraging, concrete, never a scolding.

Return ONLY a JSON array, no other text, no markdown fences. Each element:
{
  "priority": "High" | "Medium" | "Low",
  "category": "<2-3 word area, e.g. Academics, Spike / Interest, Extracurriculars, Awards & Recognition, Essays, University Research>",
  "action": "<one concrete sentence, under 150 chars, with the key phrase wrapped in **double asterisks**>",
  "title": "<2-4 word label for a timeline chart>",
  "tags": ["<2-3 short keywords: platforms, competitions, subjects>"],
  "phase": 1 | 2 | 3,       // 1 = do now (current grade), 2 = this coming year (next grade), 3 = plan ahead
  "start": <number 0-3>,    // when to start, in school years from now (0 = now)
  "end": <number 0-3>       // when it ends; 3 = ongoing through the next 3 years
}
High priority steps belong in phase 1, Medium in phase 2, Low in phase 3. Order by phase.

Profile: grade_level=${summary.gradeLevel || "unknown"}, intended_major=${summary.intendedMajor || "unknown"}, academic_records=${summary.academicCount || 0}, activities=${summary.activityCount || 0}, awards=${summary.awardCount || 0}, essays=${summary.essayCount || 0}, target_countries=${summary.targetCountries || "US"}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 1400);
  if (json) {
    try {
      const parsed = JSON.parse(json.replace(/```json?\s*|\s*```/g, "").trim());
      const steps = Array.isArray(parsed) ? normalizeGapSteps(parsed) : [];
      if (steps.length) return steps;
    } catch (e) { /* fall through */ }
  }
  return buildGapAnalysis(summary);
}

/**
 * Estimate acceptance probability across a student's saved universities.
 * Uses Claude when available; falls back to a heuristic.
 */
async function estimateAcceptanceProbability(summary, savedUniversities = []) {
  // Heuristic fallback — based on the guide's selectivity bands
  const heuristic = () => {
    if (!savedUniversities.length) return { average: 0, by_bucket: { reach: 0, target: 0, safety: 0 } };
    const score = (Math.min(1, safeNumber(summary.academicCount) / 8) * 0.4
      + Math.min(1, safeNumber(summary.activityCount) / 5) * 0.3
      + Math.min(1, safeNumber(summary.essayCount) / 3) * 0.2
      + Math.min(1, safeNumber(summary.awardCount) / 4) * 0.1);
    const buckets = { reach: [], target: [], safety: [] };
    savedUniversities.forEach((u) => {
      const b = (u.bucket || "target").toLowerCase();
      const baseline = b === "reach" ? 8 : b === "safety" ? 65 : 32;
      const range = b === "reach" ? 12 : b === "safety" ? 20 : 25;
      buckets[b]?.push(Math.round(baseline + score * range));
    });
    const avg = (arr) => arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0;
    const by_bucket = {
      reach: avg(buckets.reach),
      target: avg(buckets.target),
      safety: avg(buckets.safety)
    };
    const allProbs = [...buckets.reach, ...buckets.target, ...buckets.safety];
    return {
      average: avg(allProbs),
      by_bucket,
      note: "Heuristic estimate — set ANTHROPIC_API_KEY for Claude-driven analysis"
    };
  };

  if (!anthropicClient || !savedUniversities.length) return heuristic();

  const prompt = `Estimate the student's average acceptance probability across the universities they've saved. Any "note" you write is shown to them, so address them as "you" in MEPAi VOICE. Use the holistic review framework (Academic 40%, Extracurricular 30%, Essays 20%, Recommendations 10%) and selectivity bands (Very High = 3-10% admit; High = 10-25%; Medium = 25%+).

Student summary:
- Grade: ${summary.gradeLevel || "unknown"}
- Intended major: ${summary.intendedMajor || "unknown"}
- Academic records: ${summary.academicCount || 0}
- Activities: ${summary.activityCount || 0} (target 3-5 deep)
- Awards: ${summary.awardCount || 0}
- Essays drafted: ${summary.essayCount || 0}
- Class rank: ${summary.classRank || "not provided"}

Saved universities:
${savedUniversities.map((u) => `- ${u.name} (${u.country}, selectivity=${u.selectivity_band || "Unknown"}, bucket=${u.bucket || "target"})`).join("\n")}${await outcomesContextFor(savedUniversities.map((u) => u.name))}

Return ONLY valid JSON, no markdown:
{
  "average": <integer 0-100>,
  "by_bucket": { "reach": <int>, "target": <int>, "safety": <int> },
  "note": "<one-sentence rationale>"
}`;

  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 400);
  if (json) {
    try {
      const parsed = JSON.parse(json.replace(/```json?\s*|\s*```/g, "").trim());
      if (typeof parsed.average === "number") return parsed;
    } catch (e) {}
  }
  return heuristic();
}

// Advanced (Professional) prediction: the basic averages plus a probability for each
// saved university and the factors most likely to move it.
async function estimateAcceptanceAdvanced(summary, savedUniversities = []) {
  const avg = (arr) => arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0;
  const rollUp = (perUni) => {
    const b = { reach: [], target: [], safety: [] };
    perUni.forEach((u) => b[u.bucket]?.push(u.probability));
    return {
      average: avg(perUni.map((u) => u.probability)),
      by_bucket: { reach: avg(b.reach), target: avg(b.target), safety: avg(b.safety) }
    };
  };
  const base = (u) => ({
    university_id: u.university_id,
    name: u.name,
    country: u.country,
    bucket: (u.bucket || "target").toLowerCase()
  });

  const heuristic = () => {
    const strength = (Math.min(1, safeNumber(summary.academicCount) / 8) * 0.4
      + Math.min(1, safeNumber(summary.activityCount) / 5) * 0.3
      + Math.min(1, safeNumber(summary.essayCount) / 3) * 0.2
      + Math.min(1, safeNumber(summary.awardCount) / 4) * 0.1);
    const SEL = { "Very High": { floor: 4, range: 12 }, High: { floor: 15, range: 25 }, Medium: { floor: 35, range: 35 } };
    const per_university = savedUniversities.map((u) => {
      const sel = SEL[u.selectivity_band] || SEL.High;
      return {
        ...base(u),
        probability: Math.round(sel.floor + strength * sel.range),
        note: `${u.selectivity_band || "Unknown"} selectivity — estimate scales with how complete your portfolio is.`
      };
    });
    const factors = [];
    if (safeNumber(summary.academicCount) < 8) factors.push("Add more academic records / rigorous courses (Academic = 40% of review).");
    if (safeNumber(summary.activityCount) < 3) factors.push("Build 3–5 deep extracurriculars with clear impact (30%).");
    if (safeNumber(summary.essayCount) < 1) factors.push("Draft your personal statement — essays are 20% of review.");
    if (safeNumber(summary.awardCount) < 2) factors.push("Add awards or recognitions that support your spike.");
    if (!factors.length) factors.push("Portfolio is well covered — focus on depth and leadership in your top activity.");
    return { ...rollUp(per_university), per_university, factors, note: "Heuristic estimate — set ANTHROPIC_API_KEY for Claude-driven analysis" };
  };

  if (!savedUniversities.length) return { average: 0, by_bucket: { reach: 0, target: 0, safety: 0 }, per_university: [], factors: [] };
  if (!anthropicClient) return heuristic();

  const prompt = `Estimate the student's acceptance probability for EACH university they've saved. Every "note" you write is shown to them, so address them as "you" in MEPAi VOICE — honest about the odds, never discouraging. Use the holistic review framework (Academic 40%, Extracurricular 30%, Essays 20%, Recommendations 10%) and selectivity bands (Very High = 3-10% admit; High = 10-25%; Medium = 25%+).

Student summary:
- Grade: ${summary.gradeLevel || "unknown"}
- Intended major: ${summary.intendedMajor || "unknown"}
- Academic records: ${summary.academicCount || 0}
- Activities: ${summary.activityCount || 0} (target 3-5 deep)
- Awards: ${summary.awardCount || 0}
- Essays drafted: ${summary.essayCount || 0}
- Class rank: ${summary.classRank || "not provided"}

Saved universities (index. name):
${savedUniversities.map((u, i) => `${i}. ${u.name} (${u.country}, selectivity=${u.selectivity_band || "Unknown"}, bucket=${u.bucket || "target"})`).join("\n")}${await outcomesContextFor(savedUniversities.map((u) => u.name))}

Return ONLY valid JSON, no markdown:
{
  "per_university": [ { "index": <int>, "probability": <integer 0-100>, "note": "<one short sentence specific to this school>" } ],
  "factors": [ "<3-5 concrete actions that would most raise these chances>" ],
  "note": "<one-sentence overall rationale>"
}`;

  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 1500);
  if (json) {
    try {
      const parsed = JSON.parse(json.replace(/```json?\s*|\s*```/g, "").trim());
      if (Array.isArray(parsed.per_university)) {
        const per_university = savedUniversities.map((u, i) => {
          const hit = parsed.per_university.find((p) => Number(p.index) === i);
          if (!hit || typeof hit.probability !== "number") return null;
          return { ...base(u), probability: Math.max(0, Math.min(100, Math.round(hit.probability))), note: hit.note || "" };
        });
        if (per_university.every(Boolean)) {
          return {
            ...rollUp(per_university),
            per_university,
            factors: Array.isArray(parsed.factors) ? parsed.factors.slice(0, 5) : [],
            note: parsed.note || ""
          };
        }
      }
    } catch (e) {}
  }
  return heuristic();
}

// Deterministic Reach/Target/Safety classification driven by the student's GPA
// vs. each school's selectivity (and QS rank as a finer signal). No randomness —
// the same student + school always yields the same match %, so results are stable
// across reloads and actually reflect academic fit.
function categorizeUniversities(universities, gpaScore) {
  const gpa = safeNumber(gpaScore, 3.4);
  const gpaNorm = Math.max(0, Math.min(1, gpa / 4)); // 0..1 student strength
  // Approx. admission difficulty (higher = harder) by selectivity band.
  const DIFFICULTY = { "Very High": 0.9, High: 0.66, Medium: 0.45 };

  return universities.map((uni, index) => {
    const band = uni.selectivity_band || "High";
    let difficulty = DIFFICULTY[band] != null ? DIFFICULTY[band] : 0.66;
    // Within a band, a stronger QS rank (closer to #1) is a bit harder to get into.
    if (uni.qs_rank) {
      const rankBump = Math.max(0, Math.min(0.06, (60 - Number(uni.qs_rank)) / 1000));
      difficulty = Math.min(0.97, difficulty + rankBump);
    }
    const gap = gpaNorm - difficulty; // >0 => student stronger than the school's bar
    let category;
    if (gap <= -0.08) category = "Reach";
    else if (gap >= 0.1) category = "Safety";
    else category = "Target";
    // Deterministic match %: centered ~55, moves with the gap, clamped to a sane range.
    const matchPercentage = Math.round(Math.max(8, Math.min(97, 55 + gap * 130)));
    const explanation =
      category === "Reach"
        ? "Top-tier research, highly competitive"
        : category === "Safety"
          ? "Good match, accessible admission"
          : "Strong match, competitive admission";
    return { ...uni, category, matchPercentage, explanation, originalIndex: index };
  });
}

async function buildChatResponseWithClaude(message, history = [], profileContext = "") {
  const systemPrompt = `${PORTFOLIO_GUIDE_CONTEXT}

You are EduBot, MyEduPort's AI admissions advisor for students in grades 9-13.
- Keep responses concise: 2-4 short paragraphs.
- Talk to the student as "you" in simple, professional, advisory wording. Follow MEPAi VOICE above in full, including how to deliver criticism.
- This is a conversation, so the friendly-older-student side of the voice can show a little more here than in written reports — but stay the advisor first.
- Reference specific guidance from the Excellent Portfolio Guide above.
- Personalize advice using the student's profile context when available.
- Suggest concrete next actions, not vague encouragement.
- If they are worried about their chances, be straight with them about where they stand and give them the next move. Do not catastrophize, and do not falsely reassure.
${profileContext ? `\nStudent profile context:\n${profileContext}` : ""}${await kbContextFor(message)}`;

  const messages = [
    ...history.slice(-10).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text || m.content
    })),
    { role: "user", content: message }
  ];

  if (!anthropicClient) {
    return {
      reply: `Thanks for your question! Based on the Excellent Portfolio Guide, here's a starting point: ${message.slice(0, 120)}. I can tailor guidance once your profile is more complete. Add ANTHROPIC_API_KEY to enable Claude-powered responses.`,
      sources: ["MyEduPort Portfolio Guide", "Profile data"]
    };
  }

  try {
    const msg = await anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : [{ type: "text", text: m.content }]
      }))
    });
    const textBlock = msg.content?.find((b) => b.type === "text");
    const reply = textBlock?.text?.trim() || "I couldn't generate a response. Please try again.";
    return { reply, sources: ["Excellent Portfolio Guide", "Claude AI", "Your profile"] };
  } catch (err) {
    console.error("Claude chat error:", err.message);
    return { reply: "Sorry, I encountered an error. Please try again.", sources: [] };
  }
}

async function analyzeEssayWithClaude(essayText) {
  const plainText = essayText.replace(/<[^>]*>/g, "").trim();
  const wordCount = plainText.split(/\s+/).filter((w) => w.length > 0).length;

  const prompt = `Analyze this essay for a university application. Apply the Excellent Portfolio Guide essay framework (Hook 50w / Story 400w / Reflection 150w / Conclusion 50w; target 650 words; avoid résumé essays, trauma without growth, generic 'sounds smart' vocabulary). Return ONLY valid JSON:
{
  "grammar": { "issues": number, "suggestions": string[] },
  "clarity": { "suggestions": string[] },
  "structure": { "suggestions": string[] },
  "overall": { "score": number (0-100), "feedback": string }
}
Keep it tight: at most 4 suggestions per list, each under 30 words.

Essay (${wordCount} words):
${plainText.slice(0, 4000)}`;

  if (!anthropicClient) {
    return {
      grammar: { issues: 2, suggestions: ["Check subject-verb agreement.", "Consider using a comma before the conjunction."] },
      clarity: { suggestions: ["Consider rephrasing for better impact.", "Add a transition to improve flow."] },
      structure: { suggestions: ["Good introduction. Strengthen topic sentences in body paragraphs."] },
      overall: { score: 75, feedback: "Your essay shows potential. Set ANTHROPIC_API_KEY for AI-powered analysis." }
    };
  }

  // 1024 tokens used to cut the JSON off mid-string ("Unterminated string") → fake fallback
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 2500);
  const parsed = extractJson(json);
  if (parsed && parsed.overall) return parsed;
  if (json) console.error("Essay feedback parse error: could not parse model output");
  // No made-up score: the route reports the failure and doesn't charge the allowance
  return { fallback: true, error: "MEPAi couldn't analyze this right now — please try again." };
}

// ============================================================
// Phase 2 — section-level AI helpers (each Claude-backed with a
// deterministic heuristic fallback when ANTHROPIC_API_KEY is unset)
// ============================================================

// Pull the JSON object out of a model reply (tolerates code fences / text around it)
function extractJson(text) {
  if (!text) return null;
  const t = text.replace(/```json?\s*|\s*```/g, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

function parseJsonLoose(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text.replace(/```json?\s*|\s*```/g, "").trim());
  } catch (e) {
    return fallback;
  }
}

// --- 02 Academics: per-year advisory + score ---------------------
async function buildAcademicYearAdvisory(year, records = []) {
  const gm = { "A+": 4.0, A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7, "C+": 2.3, C: 2.0, "C-": 1.7, D: 1.0, F: 0.0 };
  const ib = (s) => ({ 7: 4.0, 6: 3.7, 5: 3.3, 4: 3.0, 3: 2.0, 2: 1.0, 1: 0.0 })[s] || 0;
  const rigorous = records.filter((r) => /AP|IB|A-Level|Honors/i.test(r.level || "")).length;
  let pts = 0, n = 0;
  records.forEach((r) => {
    const p = gm[r.grade] ?? (!isNaN(r.grade) ? ib(parseInt(r.grade)) : 0);
    if (p > 0) { pts += p; n++; }
  });
  const gpa = n ? pts / n : 0;
  const heuristic = () => ({
    year,
    score: Math.min(100, Math.round((gpa / 4) * 70 + Math.min(rigorous, 4) / 4 * 30)),
    advisory: n === 0
      ? `No graded courses recorded for ${year} yet. Add your courses and grades to get tailored guidance.`
      : `For ${year}, you have ${n} graded course(s) with ~${gpa.toFixed(1)} GPA and ${rigorous} rigorous (AP/IB/Honors) course(s). Top universities want the most rigorous load you can handle — aim to raise rigor while keeping grades in the A range.`,
    recommendations: [
      rigorous < 2 ? "Add 1–2 more AP/IB/Honors courses aligned to your intended major." : "Maintain rigor; keep grades in the A range.",
      gpa < 3.7 ? "Prioritize raising grades in core subjects (Math, English, Science)." : "Strong GPA — protect it while deepening your spike."
    ]
  });
  if (!anthropicClient || records.length === 0) return heuristic();
  const prompt = `Give admissions guidance for ONE academic year of a student applying to top US universities. Return ONLY JSON:
{"year":"${year}","score":<0-100 integer for this year's academic strength>,"advisory":"<2-3 sentence assessment>","recommendations":["<action>","<action>"]}

Year: ${year}
Courses:
${records.map((r) => `- ${r.course || "?"} (${r.level || "Standard"}): grade ${r.grade || "?"}`).join("\n") || "- none"}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 500);
  const parsed = parseJsonLoose(json, null);
  return parsed && typeof parsed.score === "number" ? parsed : heuristic();
}

// --- 02 Academics: standardized test advisory + recommended tests ---
async function buildTestAdvisory(summary, tests = []) {
  const has = (t) => tests.some((x) => (x.test_type || "").toUpperCase().includes(t));
  const heuristic = () => {
    const recommended = [];
    if (!has("SAT") && !has("ACT")) recommended.push({ test: "SAT or ACT", why: "Core admissions test — aim SAT 1500+/ACT 34+." });
    const intl = /uk|united kingdom|canada|australia|singapore|hong kong|europe|netherlands|germany|switzerland|japan|china/i.test(summary?.targetCountries || "");
    if (intl && !has("IELTS") && !has("TOEFL") && !has("DUOLINGO")) recommended.push({ test: "TOEFL / IELTS", why: "English proficiency required for international applicants (TOEFL 110+, IELTS 7.5+)." });
    if (!has("AP") && !has("IB")) recommended.push({ test: "2–4 AP exams", why: "Demonstrates college-level rigor in your intended major." });
    return {
      advisory: tests.length
        ? `You have ${tests.length} test(s) on record. Superscore where possible and retake if below the competitive band (SAT 1500+/ACT 34+).`
        : "No standardized tests recorded yet. Register for the SAT/ACT and, for international programs, an English proficiency test.",
      recommended_tests: recommended.length ? recommended : [{ test: "Maintain", why: "Your test coverage looks solid — focus on superscoring." }]
    };
  };
  if (!anthropicClient) return heuristic();
  const prompt = `Advise a student on standardized testing for top US universities. Return ONLY JSON:
{"advisory":"<2-3 sentences>","recommended_tests":[{"test":"<name>","why":"<reason>"}]}

Intended major: ${summary?.intendedMajor || "unknown"}
Target countries: ${summary?.targetCountries || "US"}
Existing tests: ${tests.map((t) => `${t.test_type} ${t.superscore || t.score || ""}`).join(", ") || "none"}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 500);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.advisory ? parsed : heuristic();
}

// --- 03 Extracurricular: recommended activities ------------------
async function buildActivityRecommendations(summary) {
  const heuristic = () => ({
    recommendations: [
      { title: "Found or lead a project tied to your intended major", category: "Academic / Intellectual", why: "Builds your spike with measurable, sustained impact." },
      { title: "Original research or a mentored capstone", category: "Academic / Intellectual", why: "Publications/competitions differentiate at top schools." },
      { title: "Community initiative solving a real local problem", category: "Leadership & Service", why: "Shows leadership and quantifiable impact." },
      { title: "Selective summer program or internship", category: "Summer Activities", why: "Signals initiative during the critical Grade 11 summer." }
    ]
  });
  if (!anthropicClient) return heuristic();
  const prompt = `Recommend 4-6 high-impact extracurricular activities for the student (write to them as "you"), aligned to their intended major and the Spike Strategy. Return ONLY JSON:
{"recommendations":[{"title":"<activity>","category":"<one of the five EC categories>","why":"<reason>"}]}

Intended major: ${summary?.intendedMajor || "unknown"}
Grade: ${summary?.gradeLevel || "unknown"}
Current activity count: ${summary?.activityCount || 0}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 700);
  const parsed = parseJsonLoose(json, null);
  return parsed && Array.isArray(parsed.recommendations) ? parsed : heuristic();
}

// --- 03 Extracurricular: topic + summary + score for one activity ---
async function analyzeActivityWithClaude(activity = {}) {
  const heuristic = () => {
    let score = 40;
    if (activity.leadership) score += 20;
    if (Number(activity.hours_per_week) >= 5) score += 15;
    if ((activity.description || "").length > 60) score += 15;
    if (activity.category) score += 10;
    return {
      topic: activity.category || activity.role || "Extracurricular Activity",
      summary: `${activity.role ? activity.role + " — " : ""}${activity.title || "Activity"}. ${activity.description || ""}`.trim().slice(0, 220),
      score: Math.min(100, score)
    };
  };
  if (!anthropicClient) return heuristic();
  const prompt = `Summarize and score ONE extracurricular activity for a top-university application. Return ONLY JSON:
{"topic":"<3-6 word theme>","summary":"<1-2 sentence impact-focused summary, <220 chars>","score":<0-100 integer>}

Activity: ${activity.title || ""}
Role: ${activity.role || ""}
Category: ${activity.category || ""}
Hours/week: ${activity.hours_per_week || 0}
Leadership: ${activity.leadership ? "yes" : "no"}
Description: ${activity.description || ""}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 400);
  const parsed = parseJsonLoose(json, null);
  return parsed && typeof parsed.score === "number" ? parsed : heuristic();
}

// --- 03 Extracurricular: MEPAi help writing the 150-char Common App description ---
async function writeActivityDescriptionWithClaude(activity = {}) {
  const LIMIT = 150;
  const clip = (t) => {
    const str = String(t || "").replace(/\s+/g, " ").trim();
    if (str.length <= LIMIT) return str;
    const cut = str.slice(0, LIMIT);
    return cut.slice(0, Math.max(cut.lastIndexOf(" "), LIMIT - 20)).replace(/[,;:\-–—\s]+$/, "") + ".";
  };
  const heuristic = () => {
    const what = activity.title || "the activity";
    const role = activity.role ? `${activity.role}: ` : "";
    const hrs = Number(activity.hours_per_week) ? ` ${activity.hours_per_week} hrs/wk.` : "";
    return {
      suggestions: [
        clip(`${role}Led ${what}; organized weekly sessions and grew participation.${hrs}`),
        clip(`${role}Built and ran ${what}, delivering measurable results for members.${hrs}`),
        clip(`${role}Founded initiative within ${what}; recruited peers and tracked impact.${hrs}`)
      ],
      tips: [
        "Start with a strong action verb (Founded, Led, Built, Organized).",
        "Add one number — people reached, money raised, ranking, or growth.",
        "End with the impact or result, not the task."
      ],
      fallback: true,
      note: "Template suggestions — set ANTHROPIC_API_KEY for MEPAi-written options"
    };
  };
  if (!anthropicClient) return heuristic();
  const prompt = `You are MEPAi, helping a student write the Common App activity description (hard limit ${LIMIT} characters including spaces).
Formula: [Action verb] + [What you did] + [Impact / Result]. Use specific numbers from the student's details when given; never invent numbers — if none are given, use a clear placeholder like [#] the student can fill in. Use the concise Common App style (fragments OK, no "I").

Activity: ${activity.title || ""}
Role: ${activity.role || ""}
Category: ${activity.category || ""}
Topic: ${activity.topic || ""}
Hours/week: ${activity.hours_per_week || ""}
Leadership: ${activity.leadership ? "yes" : "no"}
Student's current draft: ${activity.description || "(none)"}

Return ONLY JSON:
{"suggestions":["<option 1, <= ${LIMIT} chars>","<option 2>","<option 3>"],"tips":["<2-3 short tips specific to this draft>"]}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 600);
  const parsed = parseJsonLoose(json, null);
  if (!parsed || !Array.isArray(parsed.suggestions) || !parsed.suggestions.length) return heuristic();
  return {
    suggestions: parsed.suggestions.slice(0, 3).map(clip).filter(Boolean),
    tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3) : []
  };
}

// --- 04 Awards: MEPAi help writing an award description ---
async function writeAwardDescriptionWithClaude(award = {}) {
  const LIMIT = 250;
  const clip = (t) => {
    const str = String(t || "").replace(/\s+/g, " ").trim();
    return str.length <= LIMIT ? str : str.slice(0, str.lastIndexOf(" ", LIMIT)).replace(/[,;:\s]+$/, "") + ".";
  };
  const heuristic = () => {
    const t = award.title || "this award";
    return {
      suggestions: [
        clip(`Awarded ${t} — selected from [#] participants at the [school / regional / national] level for [what you achieved].`),
        clip(`${t}: ranked [top #% / place] among [#] entrants; recognizes [skill or work] in [field].`),
        clip(`Earned ${t} for [project / performance]; one of [#] recipients [this year / nationally].`)
      ],
      tips: [
        "Say the level (school, regional, national, international) — it's what readers weigh most.",
        "Add selectivity: how many entrants or winners.",
        "Link it to your spike or intended major."
      ],
      fallback: true,
      note: "Template suggestions — set ANTHROPIC_API_KEY for MEPAi-written options"
    };
  };
  if (!anthropicClient) return heuristic();
  const prompt = `You are MEPAi, helping a student describe an award/honor for a university application (max ${LIMIT} characters each).
Cover: the level (school / regional / national / international), selectivity (ranking, # of entrants or winners), and what it signals about the student. Use numbers the student gave; never invent numbers — use placeholders like [#] or [national] instead. Concise, no "I".

Award title: ${award.title || ""}
Date: ${award.award_date || ""}
Student's intended major: ${award.intended_major || ""}
Student's current draft: ${award.description || "(none)"}

Return ONLY JSON:
{"suggestions":["<option 1>","<option 2>","<option 3>"],"tips":["<2-3 short tips specific to this award>"]}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 600);
  const parsed = parseJsonLoose(json, null);
  if (!parsed || !Array.isArray(parsed.suggestions) || !parsed.suggestions.length) return heuristic();
  return {
    suggestions: parsed.suggestions.slice(0, 3).map(clip).filter(Boolean),
    tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3) : []
  };
}

// --- 05 Documents: recommendation-letter advisory ---------------
async function buildRecommendationAdvisory(summary) {
  const heuristic = () => ({
    advisory: "Ask 2 core-subject teachers from Grade 11–12 who know you well, plus your counselor. Give each a brag sheet (résumé, transcript, goals, schools, deadlines) and 2–3 months' notice.",
    suggestions: [
      "Choose teachers who can speak to growth and intellectual curiosity, not just grades.",
      "Prepare a one-page brag sheet for each recommender.",
      "Waive your FERPA right to view the letters — it signals confidence."
    ],
    timeline: [
      { when: "Grade 11 · Apr–May", task: "Ask teachers in person; provide your brag sheet." },
      { when: "Grade 11 · Summer", task: "Send a gentle reminder and share your college list." },
      { when: "Grade 12 · Sep–Oct", task: "Confirm submission before early-application deadlines." }
    ]
  });
  if (!anthropicClient) return heuristic();
  const prompt = `Advise the student (write to them as "you") on recommendation letters for top US universities. Return ONLY JSON:
{"advisory":"<2-3 sentences>","suggestions":["<tip>","<tip>","<tip>"],"timeline":[{"when":"<period>","task":"<action>"}]}

Grade: ${summary?.gradeLevel || "unknown"}
Intended major: ${summary?.intendedMajor || "unknown"}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 600);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.advisory ? parsed : heuristic();
}

// --- 05 Documents: additional-documents advisory ----------------
async function buildDocumentAdvisory(summary) {
  const heuristic = () => ({
    advisory: "Additional documents (portfolio, research abstract, résumé, media) should reinforce your spike — only submit what strengthens your narrative. Follow each school's submission format.",
    suggestions: [
      "Attach an academic/arts portfolio only if it demonstrates exceptional quality.",
      "Keep a one-page résumé consistent with your activities list.",
      "Name files clearly and export to PDF for reliable formatting."
    ],
    timeline: [
      { when: "Grade 11 · Summer", task: "Assemble portfolio pieces and a research abstract if applicable." },
      { when: "Grade 12 · Fall", task: "Finalize résumé and confirm each school's supplementary upload rules." }
    ]
  });
  if (!anthropicClient) return heuristic();
  const prompt = `Advise the student (write to them as "you") on additional/supplementary application documents for top US universities. Return ONLY JSON:
{"advisory":"<2-3 sentences>","suggestions":["<tip>","<tip>","<tip>"],"timeline":[{"when":"<period>","task":"<action>"}]}

Intended major: ${summary?.intendedMajor || "unknown"}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 600);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.advisory ? parsed : heuristic();
}

// --- 05 Documents: essay "Edit & Apply" revision ----------------
async function reviseEssayWithClaude(essayText) {
  const plainText = (essayText || "").replace(/<[^>]*>/g, "").trim();
  if (!anthropicClient) {
    return { revised: plainText, fallback: true, note: "Set ANTHROPIC_API_KEY to enable AI revision. Original text returned unchanged." };
  }
  const prompt = `Revise this university application essay applying the Excellent Portfolio Guide (Hook/Story/Reflection/Conclusion; ~650 words; authentic 17-year-old voice; show don't tell; cut clichés). Keep the student's voice and core story. Return ONLY JSON:
{"revised":"<full revised essay as plain text>","note":"<one sentence on the main improvement>"}

Essay:
${plainText.slice(0, 4000)}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 2000);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.revised ? parsed : { revised: plainText, fallback: true, note: "Revision unavailable — original text returned." };
}

// --- 05 Documents: MEPAi — personalized essay advisory (PRO tier) ---
async function buildEssayAdvisory(summary, essayText) {
  const plain = (essayText || "").replace(/<[^>]*>/g, "").trim();
  const heuristic = () => ({
    advisory: "Center your statement on one specific story that reveals character and growth — in your authentic voice. Connect it to your intended field where it feels natural, not forced.",
    do: ["Open with a concrete, sensory moment", "Show vulnerability and what you learned", "Sound like a real 17-year-old, not a thesaurus"],
    dont: ["Summarize your résumé in prose", "Use clichéd topics (COVID, sports injury, service trip)", "Write what you think admissions want to hear"]
  });
  if (!anthropicClient || !plain) return heuristic();
  const prompt = `You are MEPAi, giving PERSONALIZED advice on THIS student's Common App personal statement draft (not generic tips). Return ONLY JSON:
{"advisory":"<2-3 sentence personalized assessment of this specific draft>","do":["<specific action for this essay>","<action>","<action>"],"dont":["<specific thing to avoid in this essay>","<avoid>","<avoid>"]}

Intended major: ${summary?.intendedMajor || "unknown"}
Grade: ${summary?.gradeLevel || "unknown"}
Essay draft:
${plain.slice(0, 3000)}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 800);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.advisory ? parsed : heuristic();
}

// --- Generic section MEPAi (Academics / Awards / Extracurricular / Documents) ---
async function buildSectionAdvisory(section, summary) {
  const focus = {
    academics: "academics (GPA, course rigor, standardized tests) — how to strengthen your academic profile for top universities",
    awards: "awards & honors — which competitions/recognitions you should pursue and how to leverage existing ones",
    extracurricular: "extracurricular activities — how to build a stronger spike and higher-impact activities",
    documents: "application documents (essays, recommendation letters, additional docs) — how to make your document set compelling"
  }[section] || "this portfolio section";
  const heuristic = () => ({
    advisory: `Personalized ${section} guidance will appear here. Focus on the highest-leverage actions for your intended major and target schools.`,
    tips: [
      "Prioritize depth and measurable impact over breadth.",
      "Align this section with your intended major and hook.",
      "Address the biggest gap first for maximum return."
    ]
  });
  if (!anthropicClient) return heuristic();
  const prompt = `You are MEPAi. Give PERSONALIZED, specific advice on ${focus}. Base it on the profile below — not generic tips.
This goes straight to the student, so write it to them as "you" in MEPAi VOICE: start with what is already working, then the opportunities, each phrased as a next move.
Return ONLY JSON:
{"advisory":"<2-3 sentence personalized assessment: what is working, then the biggest opportunity>","tips":["<specific, encouraging action>","<action>","<action>","<action>"]}

Student profile:
- Intended major: ${summary?.intendedMajor || "unknown"}
- Grade: ${summary?.gradeLevel || "unknown"}
- Target countries: ${summary?.targetCountries || "US"}
- Class rank: ${summary?.classRank || "not provided"}
- Academic records: ${summary?.academicCount || 0}, Activities: ${summary?.activityCount || 0}, Awards: ${summary?.awardCount || 0}, Essays: ${summary?.essayCount || 0}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 700);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.advisory ? parsed : heuristic();
}

// --- Personal Character Test (MEPAi) — profile-based, no quiz ---
async function buildPersonalTest(summary) {
  const heuristic = () => ({
    summary: "Based on your portfolio, your emerging strengths center on curiosity and follow-through. Lean into these in essays and interviews.",
    strengths: ["Intellectual curiosity", "Perseverance / grit", "Initiative"],
    recommendations: [
      "Frame your personal statement around a moment that shows one core strength in action.",
      "Seek a leadership role that stretches a strength you want admissions to see.",
      "Ask a recommender who has witnessed this strength first-hand."
    ]
  });
  if (!anthropicClient) return heuristic();
  const prompt = `You are MEPAi running a Personal Character assessment from a student's portfolio (no quiz — infer from data). Return ONLY JSON:
{"summary":"<2-3 sentence character read>","strengths":["<trait>","<trait>","<trait>"],"recommendations":["<action tied to a strength>","<action>","<action>"]}

Profile: major=${summary?.intendedMajor || "?"}, grade=${summary?.gradeLevel || "?"}, activities=${summary?.activityCount || 0}, awards=${summary?.awardCount || 0}, academics=${summary?.academicCount || 0}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 700);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.summary ? parsed : heuristic();
}

// --- Career Test (MEPAi) — recommends majors/careers from profile ---
async function buildCareerTest(summary) {
  const heuristic = () => ({
    summary: "Your profile points toward analytical, build-oriented fields. Explore majors that combine your intended area with real-world application.",
    majors: ["Computer Science", "Data Science", "Cognitive Science"],
    careers: [
      { name: "Software / AI Engineer", why: "Matches analytical strengths and building interest." },
      { name: "Research Scientist", why: "Fits curiosity and depth in your spike." },
      { name: "Product Manager", why: "Blends technical and leadership skills." }
    ]
  });
  if (!anthropicClient) return heuristic();
  const prompt = `You are MEPAi running a Career assessment from a student's portfolio. Recommend fitting majors and careers with reasons. Return ONLY JSON:
{"summary":"<2-3 sentences>","majors":["<major>","<major>","<major>"],"careers":[{"name":"<career>","why":"<reason>"},{"name":"<career>","why":"<reason>"},{"name":"<career>","why":"<reason>"}]}

Profile: intended major=${summary?.intendedMajor || "?"}, grade=${summary?.gradeLevel || "?"}, target=${summary?.targetCountries || "US"}, activities=${summary?.activityCount || 0}, awards=${summary?.awardCount || 0}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 800);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.summary ? parsed : heuristic();
}

// --- IPIP-50 personality report narrative (MEPAi) ---
async function buildPersonalityNarrative(scoresAvg, bands, summary) {
  const FACTORS = { E: "Extraversion", A: "Agreeableness", C: "Conscientiousness", ES: "Emotional Stability", I: "Intellect/Imagination" };
  const line = Object.keys(FACTORS).map((k) => `${FACTORS[k]}: ${scoresAvg?.[k] ?? "?"}/5 (${bands?.[k] || "?"})`).join(", ");
  const heuristic = () => ({
    summary: `Your Big Five profile is a useful lens for your application. Lean on your higher traits in essays and recommendation letters, and frame lower traits honestly as areas of growth. This is self-insight, not a verdict.`,
    strengths: Object.entries(bands || {}).filter(([, b]) => b === "High" || b === "Above average").map(([k]) => FACTORS[k]).slice(0, 3),
    recommendations: [
      "Anchor your personal statement in a moment that shows your strongest trait in action.",
      "Explore majors and careers that reward your top two traits — see your Career Test.",
      "Ask a recommender who has seen your strengths first-hand."
    ]
  });
  if (!anthropicClient) return heuristic();
  const prompt = `You are MEPAi interpreting a student's IPIP-50 Big Five personality results for US university applications. Emotional Stability is the opposite pole of Neuroticism (higher = calmer). This is self-insight, NOT a clinical diagnosis — never pathologize. Return ONLY JSON:
{"summary":"<3-4 short sentences written to the student as \"you\": what this profile says about you and what it means for your applications>","strengths":["<trait or quality>","<...>","<...>"],"recommendations":["<action tied to a score, e.g. essay/major/recommendation>","<...>","<...>"]}

Scores (1-5 average): ${line}
Intended major: ${summary?.intendedMajor || "unknown"}; Grade: ${summary?.gradeLevel || "unknown"}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 900);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.summary ? parsed : heuristic();
}

// --- RIASEC / Holland Code career-interest report narrative (MEPAi) ---
async function buildCareerNarrative(scores, ranking, hollandCode, summary) {
  const NAMES = { R: "Realistic (Doers)", I: "Investigative (Thinkers)", A: "Artistic (Creators)", S: "Social (Helpers)", E: "Enterprising (Persuaders)", C: "Conventional (Organizers)" };
  const line = (ranking || []).map((t) => `${NAMES[t]}: ${scores?.[t] ?? "?"}/10`).join(", ");
  const heuristic = () => ({
    summary: `Your Holland Code ${hollandCode || ""} describes your strongest work interests. Use it to explore majors and careers that fit — a strong interest match makes study and work more engaging. This is self-insight, not a guarantee of fit.`,
    majors: ["(sign in with an AI key for tailored majors)"],
    careers: [{ name: "Explore O*NET careers matching your code", why: "O*NET links each Holland Code to matching occupations." }],
    recommendations: [
      "Shadow or research one career from your top type this term.",
      "Pick electives and activities that let you try your top two interests.",
      "Cross-check with your Personality Test — strengths + interests together sharpen direction."
    ]
  });
  if (!anthropicClient) return heuristic();
  const prompt = `You are MEPAi interpreting a student's RIASEC (Holland Code) career-interest results for US university and major planning. This measures INTERESTS (not ability) and is self-insight, not a guarantee of fit. Return ONLY JSON:
{"summary":"<3-4 short sentences written to the student as \"you\": what your interests mean for choosing a major/career>","majors":["<major>","<major>","<major>","<major>"],"careers":[{"name":"<career>","why":"<why it fits this code>"},{"name":"<career>","why":"<...>"},{"name":"<career>","why":"<...>"},{"name":"<career>","why":"<...>"}],"recommendations":["<concrete next step>","<...>","<...>"]}

Holland Code: ${hollandCode || "?"}
Interest scores (0-10): ${line}
Student's intended major (if any): ${summary?.intendedMajor || "unknown"}; Grade: ${summary?.gradeLevel || "unknown"}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 1000);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.summary ? parsed : heuristic();
}

// --- MEPAi Essay workspace: actionable guidance for a personal statement ---
// Returns { score, summary, suggestions:[8 short, specific actions] } or { fallback:true, error }
async function buildStatementGuidance(text, { target = "", major = "", limit = 500 } = {}) {
  const plain = String(text || "").replace(/<[^>]*>/g, "").trim();
  const words = plain.split(/\s+/).filter(Boolean).length;
  if (!anthropicClient) return { fallback: true, error: "MEPAi isn't configured (ANTHROPIC_API_KEY missing)." };
  const prompt = `You are MEPAi, an admissions essay mentor. Review this personal statement draft and give ACTIONABLE guidance.
Target: ${target || "selective universities"}${major ? `, intended major: ${major}` : ""}. Word limit: ${limit} (current: ${words}).
Use the Excellent Portfolio Guide framework (strong hook, one specific story, reflection/growth, forward-looking close; show don't tell; no résumé lists).

Follow MEPAi VOICE, and in particular:
- Open the summary with the one thing that genuinely works in this draft, then name the biggest opportunity. Keep it to one or two sentences.
- Every suggestion is a next move the student can make, phrased as an invitation ("Try…", "Swap…", "Add…"), never an order to scrap their work.
- Do not tell them to cut the whole draft, start over, or replace every paragraph. Point at one specific part per suggestion and say what to put there instead.
- Keep the score honest. Encouraging wording, accurate number.

Return ONLY JSON:
{"score": <0-100 integer>,
 "summary": "<one or two sentences: what is working, then the single biggest opportunity>",
 "suggestions": ["<6-8 numbered-list items, each a concrete, encouraging action under 20 words, specific to THIS draft (quote or name the part to change)>"]}

Draft:
${plain.slice(0, 6000)}`;
  const parsed = extractJson(await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 1500));
  if (!parsed || !Array.isArray(parsed.suggestions) || !parsed.suggestions.length) {
    return { fallback: true, error: "MEPAi couldn't analyze this right now — please try again." };
  }
  return {
    score: Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.score)))) : null,
    summary: String(parsed.summary || ""),
    suggestions: parsed.suggestions.slice(0, 8).map((x) => String(x).replace(/^\s*\d+[.)]\s*/, "")) // UI numbers them
  };
}

// --- MEPAi workspace: actionable guidance for an extracurricular activity description ---
// Returns { score, summary, suggestions } or { fallback:true, error }
async function buildActivityGuidance(activity = {}, type = "activity") {
  if (!anthropicClient) return { fallback: true, error: "MEPAi isn't configured (ANTHROPIC_API_KEY missing)." };
  const prompt = type === "award"
    ? `You are MEPAi reviewing ONE award/honor entry for a university application (description max 250 characters; it should state the level — school/regional/national/international — the selectivity, and what it says about the student).

Award: ${activity.title || ""}
Date: ${activity.award_date || ""}
Description draft (${String(activity.description || "").length} chars): ${activity.description || "(empty)"}
`
    : `You are MEPAi reviewing ONE extracurricular activity entry for a university application (Common App style: description max 150 characters; formula [Action verb] + [What you did] + [Impact / Result]).

Activity: ${activity.title || ""}
Role: ${activity.role || ""}
Category: ${activity.category || ""}
Hours/week: ${activity.hours_per_week || ""}; Leadership: ${activity.leadership ? "yes" : "no"}
Description draft (${String(activity.description || "").length} chars): ${activity.description || "(empty)"}
`;
  const promptTail = `
Follow MEPAi VOICE: lead with what already works, phrase each suggestion as a next move ("Try…", "Swap…", "Add…"),
and never tell the student to scrap the entry. Encouraging wording, honest score.

Return ONLY JSON:
{"score": <0-100 integer, how strong this entry reads to admissions>,
 "summary": "<one or two sentences: what is working, then the single biggest opportunity>",
 "suggestions": ["<5-7 concrete, encouraging actions under 20 words each, specific to THIS entry: metrics to add, stronger verbs, the result to show, what to tighten>"]}`;
  const parsed = extractJson(await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt + promptTail, 1200));
  if (!parsed || !Array.isArray(parsed.suggestions) || !parsed.suggestions.length) {
    return { fallback: true, error: "MEPAi couldn't analyze this right now — please try again." };
  }
  return {
    score: Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.score)))) : null,
    summary: String(parsed.summary || ""),
    suggestions: parsed.suggestions.slice(0, 7).map((x) => String(x).replace(/^\s*\d+[.)]\s*/, ""))
  };
}

// --- MEPAi Essay workspace: grammar & spelling correction (meaning and voice unchanged) ---
// Returns { corrected, changes:[{from,to,why}] } or { fallback:true, error }
async function correctGrammarWithClaude(text) {
  const plain = String(text || "").trim();
  if (!anthropicClient) return { fallback: true, error: "MEPAi isn't configured (ANTHROPIC_API_KEY missing)." };
  const prompt = `Correct ONLY grammar, spelling, punctuation and obvious word-usage errors in this student's personal statement. Do NOT rewrite style, add content, or change meaning or voice. Keep paragraph breaks exactly.

Reply in EXACTLY this plain format (no JSON, no markdown):
CHANGES:
- <original phrase> => <corrected phrase> | <reason, under 8 words>
(one line per change; write "- none" if nothing needs fixing)
CORRECTED:
<the full corrected text>

Text:
${plain.slice(0, 8000)}`;
  const out = String((await callClaude("You are a meticulous copy editor for student application essays.", prompt, 4000)) || "");
  const ci = out.search(/^\s*CORRECTED:\s*$/mi);
  if (ci < 0) return { fallback: true, error: "MEPAi couldn't check grammar right now — please try again." };
  const corrected = out.slice(ci).replace(/^\s*CORRECTED:\s*\n/i, "").trim();
  const changes = (out.slice(0, ci).match(/^\s*-\s*(.+?)\s*=>\s*(.+?)(?:\s*\|\s*(.+))?$/gm) || [])
    .map((line) => {
      const m = line.match(/^\s*-\s*(.+?)\s*=>\s*(.+?)(?:\s*\|\s*(.+))?$/);
      return m ? { from: m[1].trim(), to: m[2].trim(), why: (m[3] || "").trim() } : null;
    })
    .filter(Boolean);
  if (!corrected) return { fallback: true, error: "MEPAi couldn't check grammar right now — please try again." };
  return { corrected, changes };
}

// --- Admin: AI first draft of a marketing email ---------------------------------
// Returns { subject, preheader, html }. html is the BODY only (the send pipeline wraps
// it in the branded template with header, footer and unsubscribe link), email-safe:
// inline styles, tables for layout, no scripts/external CSS.
async function draftMarketingEmailWithClaude({ goal, audience, tone, language, offer, notes } = {}) {
  const app = process.env.APP_URL || "https://myeduport.ai";
  const lang = language === "th" ? "Thai" : "English";
  const fallback = () => ({
    subject: language === "th" ? "{{first_name}} พร้อมยกระดับพอร์ตสู่มหาวิทยาลัยในฝันหรือยัง?" : "{{first_name}}, ready to see your real admission chances?",
    preheader: language === "th" ? "ปลดล็อก AI ที่ช่วยวางแผนพอร์ตของคุณทุกขั้นตอน" : "Unlock AI guidance for every step of your portfolio.",
    html: `<h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;color:#1f3461;">Hi {{first_name}}, your portfolio deserves a real plan.</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">You've started building your MyEduPort portfolio on the Free plan. Upgrade to see where you really stand — and exactly what to do next.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:15px;color:#334155;">✅ Acceptance prediction for your saved universities</td></tr>
<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:15px;color:#334155;">✅ MEPAi university match — 10 schools on Essential, unlimited on Professional</td></tr>
<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:15px;color:#334155;">✅ MEPAi essay scores every month + PDF portfolio export</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="background:#0f9d6e;border-radius:8px;">
<a href="${app}/pricing" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">See plans &amp; upgrade →</a>
</td></tr></table>
<p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">Questions? Just reply to this email — we read every message.</p>`
  });
  if (!anthropicClient) return { ...fallback(), note: "Template draft — set ANTHROPIC_API_KEY for an AI-written draft" };

  const prompt = `Write a professional marketing email for MyEduPort (${app}), an AI university-admissions portfolio platform for secondary-school students (and their parents).

Goal: ${goal || "Convert Free-plan users into paid subscribers (Essential or Professional)."}
Audience: ${audience || "Free-plan students who created an account but haven't upgraded"}
Language: ${lang}
Tone: ${tone || "warm, encouraging, credible — not pushy"}
Offer / promotion: ${offer || "none — do not invent discounts"}
Extra notes from the marketer: ${notes || "none"}

Plans (use these facts only; never invent prices or features):
- Free $0: basic portfolio builder, MEPAi essay score 1 time, MEPAi university match (view 3 universities).
- Essential $29/month ($290/yr): AI-assisted portfolio builder, MEPAi 5 essays/month, MEPAi match 10 universities, basic acceptance prediction, PDF portfolio export, gap analysis, 30 EduBot queries/month.
- Professional $49/month ($490/yr): full AI portfolio builder, unlimited MEPAi, unlimited MEPAi matches, advanced per-university acceptance prediction, parent dashboard, 1 human advisor session/month, 150 EduBot queries/month.

Email best practice: a curiosity/benefit-driven subject line under 60 characters, a preheader under 100 characters, one clear primary call-to-action button linking to ${app}/pricing, short scannable paragraphs, a small benefits table or list, social-proof-style framing without fake statistics or fake testimonials, and a friendly sign-off from "The MyEduPort Team". Use the merge tag {{first_name}} for personalization.

HTML rules: BODY CONTENT ONLY (no <html>, <head>, <body>, header, logo, footer or unsubscribe link — those are added automatically). Email-safe: inline styles only, tables for layout (role="presentation"), max width 600px content, web-safe fonts, brand colors navy #1f3461 and green #0f9d6e, text #334155. The CTA is a table-based button: <table role="presentation"><tr><td style="background:#0f9d6e;border-radius:8px;"><a href="..." style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;text-decoration:none;">…</a></td></tr></table>. No images, no scripts, no external CSS.

Reply in EXACTLY this plain format (no JSON, no markdown fences — HTML inside JSON breaks too easily):
SUBJECT: <subject line>
PREHEADER: <preheader>
HTML:
<the body HTML>`;
  const out = await callClaude("You are a senior lifecycle email marketer for an education technology company. You write high-converting, honest, compliant marketing emails.", prompt, 4000);
  const text = String(out || "").replace(/^```(?:html)?\s*|\s*```$/gm, "");
  const subject = (text.match(/^\s*SUBJECT:\s*(.+)$/mi) || [])[1];
  const preheader = (text.match(/^\s*PREHEADER:\s*(.+)$/mi) || [])[1];
  const htmlStart = text.search(/^\s*HTML:\s*$/mi);
  const html = htmlStart >= 0 ? text.slice(htmlStart).replace(/^\s*HTML:\s*\n/i, "").trim() : "";
  if (!subject || !/<[a-z][\s\S]*>/i.test(html)) return { ...fallback(), note: "AI draft failed — showing a template draft instead" };
  return {
    subject: subject.trim().slice(0, 255),
    preheader: String(preheader || "").trim().slice(0, 255),
    html: html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<\/?(html|head|body)[^>]*>/gi, "")
  };
}

module.exports = {
  buildActivityGuidance,
  buildStatementGuidance,
  correctGrammarWithClaude,
  draftMarketingEmailWithClaude,
  buildProfileScore,
  buildEssayAdvisory,
  buildSectionAdvisory,
  buildPersonalTest,
  buildCareerTest,
  buildPersonalityNarrative,
  buildCareerNarrative,
  buildGapAnalysis,
  buildGapAnalysisWithClaude,
  categorizeUniversities,
  buildChatResponseWithClaude,
  analyzeEssayWithClaude,
  estimateAcceptanceProbability,
  estimateAcceptanceAdvanced,
  buildAcademicYearAdvisory,
  buildTestAdvisory,
  buildActivityRecommendations,
  analyzeActivityWithClaude,
  writeActivityDescriptionWithClaude,
  writeAwardDescriptionWithClaude,
  buildRecommendationAdvisory,
  buildDocumentAdvisory,
  reviseEssayWithClaude,
  PORTFOLIO_GUIDE_CONTEXT
};
