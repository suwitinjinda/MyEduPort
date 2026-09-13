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

Always speak warmly, like a thoughtful admissions coach. Reference specific guidance from the framework. Avoid speculation.
`.trim();

async function callClaude(systemPrompt, userMessage, maxTokens = 1024) {
  if (!anthropicClient) return null;
  try {
    const msg = await anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
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

function buildGapAnalysis() {
  return [
    { priority: "High", action: "Add one long-term leadership activity with measurable impact" },
    { priority: "High", action: "Begin drafting your Common App personal statement" },
    { priority: "Medium", action: "Upload recent transcripts and test score reports" },
    { priority: "Medium", action: "Identify your spike — your strongest area of distinction" },
    { priority: "Low", action: "Save 8–12 universities and assign Reach / Target / Safety buckets" }
  ];
}

async function buildGapAnalysisWithClaude(summary) {
  const prompt = `Given this student profile, suggest 4-6 prioritized next steps to strengthen their application to top US universities. Apply the Excellent Portfolio Guide framework. Return ONLY a JSON array of objects with "priority" (High/Medium/Low) and "action" (string, <120 chars, specific and concrete). No other text, no markdown fences.

Profile: grade_level=${summary.gradeLevel || "unknown"}, intended_major=${summary.intendedMajor || "unknown"}, academic_records=${summary.academicCount || 0}, activities=${summary.activityCount || 0}, awards=${summary.awardCount || 0}, essays=${summary.essayCount || 0}, target_countries=${summary.targetCountries || "US"}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 600);
  if (json) {
    try {
      const parsed = JSON.parse(json.replace(/```json?\s*|\s*```/g, "").trim());
      return Array.isArray(parsed) ? parsed : buildGapAnalysis();
    } catch (e) {
      return buildGapAnalysis();
    }
  }
  return buildGapAnalysis();
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

  const prompt = `Estimate this student's average acceptance probability across the universities they've saved. Use the holistic review framework (Academic 40%, Extracurricular 30%, Essays 20%, Recommendations 10%) and selectivity bands (Very High = 3-10% admit; High = 10-25%; Medium = 25%+).

Student summary:
- Grade: ${summary.gradeLevel || "unknown"}
- Intended major: ${summary.intendedMajor || "unknown"}
- Academic records: ${summary.academicCount || 0}
- Activities: ${summary.activityCount || 0} (target 3-5 deep)
- Awards: ${summary.awardCount || 0}
- Essays drafted: ${summary.essayCount || 0}
- Class rank: ${summary.classRank || "not provided"}

Saved universities:
${savedUniversities.map((u) => `- ${u.name} (${u.country}, selectivity=${u.selectivity_band || "Unknown"}, bucket=${u.bucket || "target"})`).join("\n")}

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

function categorizeUniversities(universities, gpaScore) {
  const gpa = safeNumber(gpaScore, 3.4);
  let categorized = universities.map((uni, index) => {
    let category = "Target";
    let matchPercentage = 50 + Math.floor(Math.random() * 30);
    const selectivity = uni.selectivity_band || "";
    if (selectivity === "Very High") {
      category = "Reach";
      matchPercentage = 25 + Math.floor(Math.random() * 15);
    } else if (selectivity === "Medium") {
      category = "Safety";
      matchPercentage = 60 + Math.floor(Math.random() * 20);
    } else if (selectivity === "High") {
      if (index % 2 === 0) {
        category = "Target";
        matchPercentage = 50 + Math.floor(Math.random() * 30);
      } else {
        category = "Safety";
        matchPercentage = 60 + Math.floor(Math.random() * 20);
      }
    } else {
      if (index % 3 === 0) {
        category = "Reach";
        matchPercentage = 25 + Math.floor(Math.random() * 15);
      } else if (index % 3 === 1) {
        category = "Target";
        matchPercentage = 50 + Math.floor(Math.random() * 30);
      } else {
        category = "Safety";
        matchPercentage = 60 + Math.floor(Math.random() * 20);
      }
    }
    return { ...uni, category, matchPercentage, originalIndex: index };
  });
  const totalCount = categorized.length;
  const safetyCount = categorized.filter((u) => u.category === "Safety").length;
  const minSafetyCount = Math.max(2, Math.floor(totalCount * 0.2));
  if (safetyCount < minSafetyCount) {
    const highTargets = categorized
      .filter((u) => u.category === "Target" && u.selectivity_band === "High")
      .sort((a, b) => a.originalIndex - b.originalIndex);
    const needMore = minSafetyCount - safetyCount;
    const toConvertIndices = highTargets.slice(0, Math.min(needMore, highTargets.length)).map((tc) => tc.originalIndex);
    categorized = categorized.map((uni) => {
      if (toConvertIndices.includes(uni.originalIndex)) {
        return { ...uni, category: "Safety", matchPercentage: 60 + Math.floor(Math.random() * 20) };
      }
      return uni;
    });
  }
  categorized = categorized.map((uni) => ({
    ...uni,
    explanation:
      uni.category === "Reach"
        ? "Top-tier research, highly competitive"
        : uni.category === "Safety"
          ? "Good match, accessible admission"
          : "Strong match, competitive admission"
  }));
  return categorized;
}

async function buildChatResponseWithClaude(message, history = [], profileContext = "") {
  const systemPrompt = `${PORTFOLIO_GUIDE_CONTEXT}

You are EduBot, MyEduPort's AI admissions advisor for students in grades 9-13.
- Keep responses concise: 2-4 short paragraphs.
- Speak warmly, like a thoughtful admissions coach.
- Reference specific guidance from the Excellent Portfolio Guide above.
- Personalize advice using the student's profile context when available.
- Suggest concrete next actions, not vague encouragement.
${profileContext ? `\nStudent profile context:\n${profileContext}` : ""}`;

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

  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 1024);
  if (json) {
    try {
      const parsed = JSON.parse(json.replace(/```json?\s*|\s*```/g, "").trim());
      return parsed;
    } catch (e) {
      console.error("Essay feedback parse error:", e.message);
    }
  }

  return {
    grammar: { issues: 2, suggestions: ["Check grammar.", "Review punctuation."] },
    clarity: { suggestions: ["Improve clarity."] },
    structure: { suggestions: ["Strengthen structure."] },
    overall: { score: 70, feedback: "Unable to analyze. Please try again." }
  };
}

// ============================================================
// Phase 2 — section-level AI helpers (each Claude-backed with a
// deterministic heuristic fallback when ANTHROPIC_API_KEY is unset)
// ============================================================

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
  const prompt = `Recommend 4-6 high-impact extracurricular activities for this student, aligned to their intended major and the Spike Strategy. Return ONLY JSON:
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
  const prompt = `Advise this student on recommendation letters for top US universities. Return ONLY JSON:
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
  const prompt = `Advise this student on additional/supplementary application documents for top US universities. Return ONLY JSON:
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
    return { revised: plainText, note: "Set ANTHROPIC_API_KEY to enable AI revision. Original text returned unchanged." };
  }
  const prompt = `Revise this university application essay applying the Excellent Portfolio Guide (Hook/Story/Reflection/Conclusion; ~650 words; authentic 17-year-old voice; show don't tell; cut clichés). Keep the student's voice and core story. Return ONLY JSON:
{"revised":"<full revised essay as plain text>","note":"<one sentence on the main improvement>"}

Essay:
${plainText.slice(0, 4000)}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 2000);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.revised ? parsed : { revised: plainText, note: "Revision unavailable — original text returned." };
}

// --- 05 Documents: AdviAI — personalized essay advisory (PRO tier) ---
async function buildEssayAdvisory(summary, essayText) {
  const plain = (essayText || "").replace(/<[^>]*>/g, "").trim();
  const heuristic = () => ({
    advisory: "Center your statement on one specific story that reveals character and growth — in your authentic voice. Connect it to your intended field where it feels natural, not forced.",
    do: ["Open with a concrete, sensory moment", "Show vulnerability and what you learned", "Sound like a real 17-year-old, not a thesaurus"],
    dont: ["Summarize your résumé in prose", "Use clichéd topics (COVID, sports injury, service trip)", "Write what you think admissions want to hear"]
  });
  if (!anthropicClient || !plain) return heuristic();
  const prompt = `You are AdviAI, giving PERSONALIZED advice on THIS student's Common App personal statement draft (not generic tips). Return ONLY JSON:
{"advisory":"<2-3 sentence personalized assessment of this specific draft>","do":["<specific action for this essay>","<action>","<action>"],"dont":["<specific thing to avoid in this essay>","<avoid>","<avoid>"]}

Intended major: ${summary?.intendedMajor || "unknown"}
Grade: ${summary?.gradeLevel || "unknown"}
Essay draft:
${plain.slice(0, 3000)}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 800);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.advisory ? parsed : heuristic();
}

// --- Generic section AdviAI (Academics / Awards / Extracurricular / Documents) ---
async function buildSectionAdvisory(section, summary) {
  const focus = {
    academics: "academics (GPA, course rigor, standardized tests) — how to strengthen this student's academic profile for top universities",
    awards: "awards & honors — which competitions/recognitions this student should pursue and how to leverage existing ones",
    extracurricular: "extracurricular activities — how to build a stronger spike and higher-impact activities",
    documents: "application documents (essays, recommendation letters, additional docs) — how to make this student's document set compelling"
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
  const prompt = `You are AdviAI. Give PERSONALIZED, specific advice on ${focus}. Base it on this student's profile — not generic tips. Return ONLY JSON:
{"advisory":"<2-3 sentence personalized assessment>","tips":["<specific action>","<specific action>","<specific action>","<specific action>"]}

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

// --- Personal Character Test (AdviAI) — profile-based, no quiz ---
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
  const prompt = `You are AdviAI running a Personal Character assessment from a student's portfolio (no quiz — infer from data). Return ONLY JSON:
{"summary":"<2-3 sentence character read>","strengths":["<trait>","<trait>","<trait>"],"recommendations":["<action tied to a strength>","<action>","<action>"]}

Profile: major=${summary?.intendedMajor || "?"}, grade=${summary?.gradeLevel || "?"}, activities=${summary?.activityCount || 0}, awards=${summary?.awardCount || 0}, academics=${summary?.academicCount || 0}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 700);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.summary ? parsed : heuristic();
}

// --- Career Test (AdviAI) — recommends majors/careers from profile ---
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
  const prompt = `You are AdviAI running a Career assessment from a student's portfolio. Recommend fitting majors and careers with reasons. Return ONLY JSON:
{"summary":"<2-3 sentences>","majors":["<major>","<major>","<major>"],"careers":[{"name":"<career>","why":"<reason>"},{"name":"<career>","why":"<reason>"},{"name":"<career>","why":"<reason>"}]}

Profile: intended major=${summary?.intendedMajor || "?"}, grade=${summary?.gradeLevel || "?"}, target=${summary?.targetCountries || "US"}, activities=${summary?.activityCount || 0}, awards=${summary?.awardCount || 0}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 800);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.summary ? parsed : heuristic();
}

// --- IPIP-50 personality report narrative (AdviAI) ---
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
  const prompt = `You are AdviAI interpreting a student's IPIP-50 Big Five personality results for US university applications. Emotional Stability is the opposite pole of Neuroticism (higher = calmer). This is self-insight, NOT a clinical diagnosis — never pathologize. Return ONLY JSON:
{"summary":"<3-4 sentence warm, specific read of this profile and what it means for applications>","strengths":["<trait or quality>","<...>","<...>"],"recommendations":["<action tied to a score, e.g. essay/major/recommendation>","<...>","<...>"]}

Scores (1-5 average): ${line}
Intended major: ${summary?.intendedMajor || "unknown"}; Grade: ${summary?.gradeLevel || "unknown"}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 900);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.summary ? parsed : heuristic();
}

// --- RIASEC / Holland Code career-interest report narrative (AdviAI) ---
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
  const prompt = `You are AdviAI interpreting a student's RIASEC (Holland Code) career-interest results for US university and major planning. This measures INTERESTS (not ability) and is self-insight, not a guarantee of fit. Return ONLY JSON:
{"summary":"<3-4 sentence read of this interest profile and what it means for choosing a major/career>","majors":["<major>","<major>","<major>","<major>"],"careers":[{"name":"<career>","why":"<why it fits this code>"},{"name":"<career>","why":"<...>"},{"name":"<career>","why":"<...>"},{"name":"<career>","why":"<...>"}],"recommendations":["<concrete next step>","<...>","<...>"]}

Holland Code: ${hollandCode || "?"}
Interest scores (0-10): ${line}
Student's intended major (if any): ${summary?.intendedMajor || "unknown"}; Grade: ${summary?.gradeLevel || "unknown"}`;
  const json = await callClaude(PORTFOLIO_GUIDE_CONTEXT, prompt, 1000);
  const parsed = parseJsonLoose(json, null);
  return parsed && parsed.summary ? parsed : heuristic();
}

module.exports = {
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
  buildAcademicYearAdvisory,
  buildTestAdvisory,
  buildActivityRecommendations,
  analyzeActivityWithClaude,
  buildRecommendationAdvisory,
  buildDocumentAdvisory,
  reviseEssayWithClaude,
  PORTFOLIO_GUIDE_CONTEXT
};
