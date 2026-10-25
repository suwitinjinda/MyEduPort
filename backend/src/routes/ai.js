const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { checkQuota, incrementUsage, isFeatureAllowed, getPlanFeatures } = require("../services/plan");
const { saveOutput, listOutputs, getOutput } = require("../services/aiSaved");
const crypto = require("crypto");

// Fingerprint of the student's portfolio data that MEPAi advice is based on. Saved with the
// advice; if it differs later, the saved advice is flagged stale (student can Refresh — no
// automatic regeneration, so no tokens are spent just by opening a page).
async function portfolioFingerprint(userId) {
  try {
    const [[st]] = await pool.query("SELECT id, grade_level, intended_major, target_countries, intended_universities, class_rank, curriculum FROM students WHERE user_id = ?", [userId]);
    if (!st) return "";
    const agg = async (table, cols) => {
      const [[r]] = await pool.query(`SELECT COUNT(*) n, COALESCE(SUM(CRC32(CONCAT_WS('|', ${cols}))), 0) h FROM ${table} WHERE student_id = ?`, [st.id]);
      return `${r.n}:${r.h}`;
    };
    const parts = [
      JSON.stringify([st.grade_level, st.intended_major, st.target_countries, st.intended_universities, st.class_rank, st.curriculum]),
      await agg("academic_records", "year, course, grade"),
      await agg("test_scores", "test_type, score, superscore"),
      await agg("activities", "title, role, description, hours_per_week"),
      await agg("awards", "title, description")
    ];
    return crypto.createHash("sha1").update(parts.join("#")).digest("hex").slice(0, 16);
  } catch (err) { return ""; }
}
const FINGERPRINTED = ["section_advisory", "test_advisory", "gap_analysis", "recommendation_advisory", "document_advisory", "activity_recommendations"];
const {
  buildProfileScore,
  buildGapAnalysis,
  buildGapAnalysisWithClaude,
  categorizeUniversities,
  buildChatResponseWithClaude,
  analyzeEssayWithClaude,
  estimateAcceptanceProbability,
  estimateAcceptanceAdvanced,
  buildStatementGuidance,
  buildActivityGuidance,
  correctGrammarWithClaude,
  buildAcademicYearAdvisory,
  buildTestAdvisory,
  buildActivityRecommendations,
  analyzeActivityWithClaude,
  writeActivityDescriptionWithClaude,
  writeAwardDescriptionWithClaude,
  buildRecommendationAdvisory,
  buildDocumentAdvisory,
  reviseEssayWithClaude,
  buildEssayAdvisory,
  buildSectionAdvisory,
  buildPersonalTest,
  buildCareerTest
} = require("../services/aiClient");

const router = express.Router();

async function getStudentSummary(userId) {
  const [[student]] = await pool.query(
    "SELECT id, grade_level, intended_major, target_countries, class_rank FROM students WHERE user_id = ?",
    [userId]
  );
  if (!student) return null;
  const [[academicCount]] = await pool.query("SELECT COUNT(*) AS count FROM academic_records WHERE student_id = ?", [student.id]);
  const [[activityCount]] = await pool.query("SELECT COUNT(*) AS count FROM activities WHERE student_id = ?", [student.id]);
  const [[awardCount]] = await pool.query("SELECT COUNT(*) AS count FROM awards WHERE student_id = ?", [student.id]);
  // essays table may not exist on older installations
  let essayCount = 0;
  try {
    const [[ec]] = await pool.query("SELECT COUNT(*) AS count FROM essays WHERE student_id = ?", [student.id]);
    essayCount = ec.count;
  } catch (err) { /* migration not run yet */ }
  return {
    studentId: student.id,
    gradeLevel: student.grade_level,
    intendedMajor: student.intended_major,
    targetCountries: student.target_countries,
    classRank: student.class_rank,
    academicCount: academicCount.count,
    activityCount: activityCount.count,
    awardCount: awardCount.count,
    essayCount
  };
}

router.get("/score", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const summary = await getStudentSummary(req.user.id);
  if (!summary) return res.status(404).json({ error: "Student profile missing" });
  const report = buildProfileScore(summary || {});
  await pool.query(
    "INSERT INTO ai_reports (student_id, report_type, payload_json) VALUES (?, ?, ?)",
    [summary.studentId, "profile_score", JSON.stringify(report)]
  );
  res.json(report);
});

router.get("/gap-analysis", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "gap"))) {
    return res.status(403).json({ error: "Gap analysis is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  if (!summary) return res.status(404).json({ error: "Student profile missing" });
  const report = await buildGapAnalysisWithClaude(summary || {});
  await pool.query(
    "INSERT INTO ai_reports (student_id, report_type, payload_json) VALUES (?, ?, ?)",
    [summary.studentId, "gap_analysis", JSON.stringify(report)]
  );
  await saveOutput(req.user.id, "gap_analysis", "", { ...{ items: report }, inputs: await portfolioFingerprint(req.user.id) });
  res.json(report);
});

router.post("/recommendations", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { country, major, gpa, sortBy } = req.body || {};

  // Get student's intended major if not provided
  const [[student]] = await pool.query(
    "SELECT intended_major FROM students WHERE user_id = ?",
    [req.user.id]
  );
  const studentMajor = major || student?.intended_major || "";

  // Build query - if country is "All" or not specified, get all countries
  let baseQuery = "SELECT id, name, country, city, selectivity_band, qs_rank, major_tags FROM universities WHERE hidden = 0";
  const baseParams = [];

  if (country && country !== "All") {
    baseQuery += " AND country = ?";
    baseParams.push(country);
  }

  // Smart major matching: try the full major first, then fall back to word-by-word.
  let universities = [];
  if (studentMajor) {
    // First attempt: full major substring match
    const [exact] = await pool.query(
      baseQuery + " AND major_tags LIKE ? LIMIT 30",
      [...baseParams, `%${studentMajor}%`]
    );
    universities = exact;

    // Fallback: if no exact match, split the major into significant words and try OR-match
    if (universities.length === 0) {
      const words = studentMajor
        .split(/\s+/)
        .filter((w) => w.length > 3 && !["the", "and", "for", "with"].includes(w.toLowerCase()));
      if (words.length > 0) {
        const placeholders = words.map(() => "major_tags LIKE ?").join(" OR ");
        const [byWord] = await pool.query(
          `${baseQuery} AND (${placeholders}) LIMIT 30`,
          [...baseParams, ...words.map((w) => `%${w}%`)]
        );
        universities = byWord;
      }
    }

    // Final fallback: just return universities without major filter (still respecting country)
    if (universities.length === 0) {
      const [all] = await pool.query(baseQuery + " LIMIT 30", baseParams);
      universities = all;
    }
  } else {
    const [all] = await pool.query(baseQuery + " LIMIT 30", baseParams);
    universities = all;
  }
  const allResults = categorizeUniversities(universities, Number(gpa || 3.4));

  // MEPAi University Match cap per plan (Free 3 / Essential 10 / Professional unlimited).
  // Pick round-robin across Reach → Target → Safety (best match first in each) so a
  // capped list is still a balanced college list, not just the easiest schools.
  const { my } = await getPlanFeatures(req.user.id);
  const matchLimit = Number.isFinite(Number(my.match)) ? Number(my.match) : 3;
  let results = allResults;
  if (matchLimit !== -1 && allResults.length > matchLimit) {
    const byCat = ["Reach", "Target", "Safety"].map((c) =>
      allResults.filter((r) => r.category === c).sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0))
    );
    results = [];
    for (let i = 0; results.length < Math.max(0, matchLimit); i++) {
      if (byCat.every((list) => i >= list.length)) break;
      for (const list of byCat) {
        if (list[i] && results.length < matchLimit) results.push(list[i]);
      }
    }
  }
  const locked = allResults.length - results.length;

  // Sort results if needed
  if (sortBy === "country") {
    results.sort((a, b) => a.country.localeCompare(b.country));
  } else if (sortBy === "match") {
    results.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
  } else if (sortBy === "name") {
    results.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  await pool.query(
    "INSERT INTO ai_reports (student_id, report_type, payload_json) VALUES ((SELECT id FROM students WHERE user_id = ?), ?, ?)",
    [req.user.id, "recommendations", JSON.stringify({ country, major: studentMajor, results })]
  );
  const matchOut = { country, major: studentMajor, results, limit: matchLimit, total: allResults.length, locked };
  await saveOutput(req.user.id, "university_match", "", { ...matchOut, gpa, sortBy });
  res.json(matchOut);
});

router.post("/chat", authRequired, async (req, res) => {
  const { message, sessionId } = req.body || {};
  if (!message) return res.status(400).json({ error: "Message required" });
  // EduBot quota (students only; parents/counselors are unlimited helpers)
  let edubotQuota = null;
  if (req.user.role === "student") {
    edubotQuota = await checkQuota(req.user.id, "edubot");
    if (!edubotQuota.allowed) {
      return res.status(429).json({
        error: `EduBot limit reached (${edubotQuota.limit} ${edubotQuota.plan === "free" ? "total on Free" : "per month"}). Upgrade your plan for more questions.`
      });
    }
  }
  let activeSessionId = sessionId;
  let history = [];
  let profileContext = "";
  if (activeSessionId) {
    const [rows] = await pool.query(
      "SELECT sender_role, message FROM ai_chat_messages WHERE session_id = ? ORDER BY id ASC",
      [activeSessionId]
    );
    history = rows.map((r) => ({ role: r.sender_role, text: r.message }));
  } else {
    const [sessionResult] = await pool.query("INSERT INTO ai_chat_sessions (user_id) VALUES (?)", [req.user.id]);
    activeSessionId = sessionResult.insertId;
  }
  if (req.user.role === "student") {
    const summary = await getStudentSummary(req.user.id);
    if (summary) {
      profileContext = `Grade: ${summary.gradeLevel || "N/A"}, Major: ${summary.intendedMajor || "N/A"}, Academics: ${summary.academicCount}, Activities: ${summary.activityCount}, Awards: ${summary.awardCount}`;
    }
  }
  const response = await buildChatResponseWithClaude(message, history, profileContext);
  await pool.query(
    "INSERT INTO ai_chat_messages (session_id, sender_role, message) VALUES (?, ?, ?)",
    [activeSessionId, "user", message]
  );
  await pool.query(
    "INSERT INTO ai_chat_messages (session_id, sender_role, message) VALUES (?, ?, ?)",
    [activeSessionId, "assistant", response.reply]
  );
  if (edubotQuota) await incrementUsage(req.user.id, "edubot", edubotQuota.period);
  res.json({ ...response, sessionId: activeSessionId });
});

// Acceptance Prediction — Free: none, Essential: basic (averages), Professional:
// advanced (per-university probability + factors to improve).
router.get("/acceptance-probability", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { plan, my } = await getPlanFeatures(req.user.id);
  const tier = ["basic", "advanced"].includes(my.prediction) ? my.prediction : "none";
  if (tier === "none") {
    return res.status(403).json({ error: "Acceptance predictions are a paid feature — upgrade to Essential or Professional.", plan, tier });
  }
  const summary = await getStudentSummary(req.user.id);
  if (!summary) return res.status(404).json({ error: "Student profile missing" });
  let saved = [];
  try {
    const [rows] = await pool.query(
      `SELECT su.bucket, su.university_id, u.name, u.country, u.selectivity_band
       FROM saved_universities su JOIN universities u ON su.university_id = u.id
       WHERE su.student_id = ?`,
      [summary.studentId]
    );
    saved = rows;
  } catch (err) { /* table missing — migration needed */ }
  const result = tier === "advanced"
    ? await estimateAcceptanceAdvanced(summary, saved)
    : await estimateAcceptanceProbability(summary, saved);
  await saveOutput(req.user.id, "acceptance", "", { ...result, tier });
  res.json({ ...result, tier });
});

router.post("/essay-feedback", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { essay } = req.body || {};
  if (!essay) return res.status(400).json({ error: "Essay content required" });

  const fbQuota = await checkQuota(req.user.id, "essay_feedback");
  if (!fbQuota.allowed) {
    return res.status(429).json({
      error: `MEPAi Feedback limit reached (${fbQuota.limit} ${fbQuota.plan === "free" ? "total on Free" : "per month"}). Upgrade your plan for more analyses.`
    });
  }

  const feedback = await analyzeEssayWithClaude(essay);
  if (feedback.fallback) {
    return res.status(502).json({ error: `${feedback.error} This attempt wasn't counted.` });
  }
  await incrementUsage(req.user.id, "essay_feedback", fbQuota.period);

  const [[student]] = await pool.query("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
  if (student) {
    await pool.query(
      "INSERT INTO ai_reports (student_id, report_type, payload_json) VALUES (?, ?, ?)",
      [student.id, "essay_feedback", JSON.stringify(feedback)]
    );
  }

  await saveOutput(req.user.id, "essay_feedback", String(req.body?.scope || ""), feedback);
  res.json(feedback);
});

// ============================================================
// Phase 2 — section-level AI endpoints
// ============================================================

// 02 Academics — advisory + score for one grade/year
router.post("/academic-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "MEPAi is a paid feature — upgrade to Essential or Professional." });
  }
  const { year, records } = req.body || {};
  if (!year) return res.status(400).json({ error: "year required" });
  const result = await buildAcademicYearAdvisory(year, Array.isArray(records) ? records : []);
  const [[student]] = await pool.query("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
  if (student) {
    await pool.query(
      "INSERT INTO ai_reports (student_id, report_type, payload_json) VALUES (?, ?, ?)",
      [student.id, "academic_advisory", JSON.stringify(result)]
    );
  }
  await saveOutput(req.user.id, "academic_advisory", year, result);
  res.json(result);
});

// 02 Academics — standardized test advisory + recommended tests
router.get("/test-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "MEPAi is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  if (!summary) return res.status(404).json({ error: "Student profile missing" });
  let tests = [];
  try {
    const [rows] = await pool.query("SELECT test_type, score, superscore FROM test_scores WHERE student_id = ?", [summary.studentId]);
    tests = rows;
  } catch (err) { /* ignore */ }
  const result = await buildTestAdvisory(summary, tests);
  await saveOutput(req.user.id, "test_advisory", "", { ...result, inputs: await portfolioFingerprint(req.user.id) });
  res.json(result);
});

// 03 Extracurricular — recommended activities (AI)
router.get("/activity-recommendations", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "MEPAi is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  if (!summary) return res.status(404).json({ error: "Student profile missing" });
  const result = await buildActivityRecommendations(summary);
  await saveOutput(req.user.id, "activity_recommendations", "", { ...result, inputs: await portfolioFingerprint(req.user.id) });
  res.json(result);
});

// 03 Extracurricular — topic + summary + score for one activity (AI)
router.post("/activity-analyze", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "MEPAi is a paid feature — upgrade to Essential or Professional." });
  }
  const { activity } = req.body || {};
  if (!activity) return res.status(400).json({ error: "activity required" });
  const result = await analyzeActivityWithClaude(activity);
  res.json(result);
});

// 03 Extracurricular — MEPAi writes the 150-char activity description.
// Uses the MEPAi allowance (Free 1 / Essential 5 per month / Professional unlimited),
// counted separately from essay scores and essay revisions.
router.post("/activity-description", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { activity } = req.body || {};
  if (!activity || !(activity.title || activity.description)) {
    return res.status(400).json({ error: "Add a title or a rough draft first." });
  }
  const quota = await checkQuota(req.user.id, "essai_activity", "essay_feedback");
  if (!quota.allowed) {
    return res.status(429).json({
      error: `MEPAi limit reached (${quota.limit} ${quota.plan === "free" ? "total on Free" : "per month"}). Upgrade your plan for more.`
    });
  }
  const result = await writeActivityDescriptionWithClaude(activity);
  // Template fallbacks (AI unavailable) don't use up the allowance
  if (quota.limit !== -1 && !result.fallback) await incrementUsage(req.user.id, "essai_activity", quota.period);
  if (!result.fallback) await saveOutput(req.user.id, "activity_description", String(req.body?.scope || "new"), result);
  res.json({ ...result, quota: { limit: quota.limit, used: quota.used + (result.fallback ? 0 : 1) } });
});

// 04 Awards — MEPAi writes the award description (same MEPAi allowance, own counter)
router.post("/award-description", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { award } = req.body || {};
  if (!award || !(award.title || award.description)) {
    return res.status(400).json({ error: "Add the award title first." });
  }
  const quota = await checkQuota(req.user.id, "essai_award", "essay_feedback");
  if (!quota.allowed) {
    return res.status(429).json({
      error: `MEPAi limit reached (${quota.limit} ${quota.plan === "free" ? "total on Free" : "per month"}). Upgrade your plan for more.`
    });
  }
  const summary = await getStudentSummary(req.user.id);
  const result = await writeAwardDescriptionWithClaude({ ...award, intended_major: summary?.intendedMajor || "" });
  if (quota.limit !== -1 && !result.fallback) await incrementUsage(req.user.id, "essai_award", quota.period);
  if (!result.fallback) await saveOutput(req.user.id, "award_description", "draft", result);
  res.json(result);
});

// MEPAi Essay workspace — actionable guidance (uses the MEPAi Essay Score allowance)
router.post("/statement-guidance", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { text, target } = req.body || {};
  if (!String(text || "").trim() || String(text).trim().split(/\s+/).length < 30) {
    return res.status(400).json({ error: "Write at least 30 words first so MEPAi has something to work with." });
  }
  const quota = await checkQuota(req.user.id, "essay_feedback");
  if (!quota.allowed) {
    return res.status(429).json({ error: `MEPAi limit reached (${quota.limit} ${quota.plan === "free" ? "total on Free" : "per month"}). Upgrade your plan for more.` });
  }
  const summary = await getStudentSummary(req.user.id);
  const result = await buildStatementGuidance(text, { target, major: summary?.intendedMajor || "" });
  if (result.fallback) return res.status(502).json({ error: `${result.error} This attempt wasn't counted.` });
  if (quota.limit !== -1) await incrementUsage(req.user.id, "essay_feedback", quota.period);
  await saveOutput(req.user.id, "statement_guidance", "", { ...result, done: [] });
  res.json(result);
});

// MEPAi workspace — activity description guidance (MEPAi allowance, activity counter)
router.post("/activity-guidance", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { activity } = req.body || {};
  if (!activity || !(activity.title || activity.description)) return res.status(400).json({ error: "Add a title or a description first." });
  const quota = await checkQuota(req.user.id, "essai_activity", "essay_feedback");
  if (!quota.allowed) {
    return res.status(429).json({ error: `MEPAi limit reached (${quota.limit} ${quota.plan === "free" ? "total on Free" : "per month"}). Upgrade your plan for more.` });
  }
  const result = await buildActivityGuidance(activity);
  if (result.fallback) return res.status(502).json({ error: `${result.error} This attempt wasn't counted.` });
  if (quota.limit !== -1) await incrementUsage(req.user.id, "essai_activity", quota.period);
  await saveOutput(req.user.id, "activity_guidance", String(req.body?.scope || "new"), { ...result, done: [] });
  res.json(result);
});

// MEPAi workspace — award description guidance (MEPAi allowance, award counter)
router.post("/award-guidance", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { award } = req.body || {};
  if (!award || !(award.title || award.description)) return res.status(400).json({ error: "Add the award title first." });
  const quota = await checkQuota(req.user.id, "essai_award", "essay_feedback");
  if (!quota.allowed) {
    return res.status(429).json({ error: `MEPAi limit reached (${quota.limit} ${quota.plan === "free" ? "total on Free" : "per month"}). Upgrade your plan for more.` });
  }
  const result = await buildActivityGuidance(award, "award");
  if (result.fallback) return res.status(502).json({ error: `${result.error} This attempt wasn't counted.` });
  if (quota.limit !== -1) await incrementUsage(req.user.id, "essai_award", quota.period);
  await saveOutput(req.user.id, "award_guidance", "new", { ...result, done: [] });
  res.json(result);
});

// MEPAi Essay workspace — grammar & spelling correction (shares the MEPAi allowance, own counter)
router.post("/grammar", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { text } = req.body || {};
  if (!String(text || "").trim()) return res.status(400).json({ error: "Nothing to check yet." });
  const quota = await checkQuota(req.user.id, "essay_revise", "essay_feedback");
  if (!quota.allowed) {
    return res.status(429).json({ error: `MEPAi limit reached (${quota.limit} ${quota.plan === "free" ? "total on Free" : "per month"}). Upgrade your plan for more.` });
  }
  const result = await correctGrammarWithClaude(text);
  if (result.fallback) return res.status(502).json({ error: `${result.error} This attempt wasn't counted.` });
  if (quota.limit !== -1) await incrementUsage(req.user.id, "essay_revise", quota.period);
  const gKind = { activity: "activity_grammar", award: "award_grammar" }[req.body?.workspace] || "statement_grammar";
  await saveOutput(req.user.id, gKind, String(req.body?.scope || ""), { changes: result.changes || [], done: [] });
  res.json(result);
});

// 05 Documents — recommendation-letter advisory (AI)
router.get("/recommendation-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "MEPAi is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  const result = await buildRecommendationAdvisory(summary || {});
  await saveOutput(req.user.id, "recommendation_advisory", "", { ...result, inputs: await portfolioFingerprint(req.user.id) });
  res.json(result);
});

// 05 Documents — additional-documents advisory (AI)
router.get("/document-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "MEPAi is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  const result = await buildDocumentAdvisory(summary || {});
  await saveOutput(req.user.id, "document_advisory", "", { ...result, inputs: await portfolioFingerprint(req.user.id) });
  res.json(result);
});

// 05 Documents — MEPAi: personalized essay advisory (PRO/paid plans)
router.post("/essay-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "MEPAi is a paid feature — upgrade to Essential or Professional." });
  }
  const { essay } = req.body || {};
  const summary = await getStudentSummary(req.user.id);
  const result = await buildEssayAdvisory(summary || {}, essay || "");
  await saveOutput(req.user.id, "essay_advisory", String(req.body?.scope || ""), result);
  res.json(result);
});

// 05 Documents — essay "Edit & Apply" AI revision
router.post("/essay-revise", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { essay } = req.body || {};
  if (!essay) return res.status(400).json({ error: "Essay content required" });
  // AI essay revision uses the MEPAi allowance (Free 1 time / Essential 5 per month /
  // Professional unlimited), counted separately from essay scores.
  const reviseQuota = await checkQuota(req.user.id, "essay_revise", "essay_feedback");
  if (!reviseQuota.allowed) {
    return res.status(429).json({
      error: `AI essay revision limit reached (${reviseQuota.limit} ${reviseQuota.plan === "free" ? "total on Free" : "per month"}). Upgrade your plan for more.`
    });
  }
  const result = await reviseEssayWithClaude(essay);
  if (reviseQuota.limit !== -1 && !result.fallback) await incrementUsage(req.user.id, "essay_revise", reviseQuota.period);
  res.json(result);
});

// Generic section MEPAi (academics / awards / extracurricular / documents) — paid
router.post("/section-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "MEPAi is a paid feature — upgrade to Essential or Professional." });
  }
  const { section } = req.body || {};
  const summary = await getStudentSummary(req.user.id);
  const result = await buildSectionAdvisory(section || "portfolio", summary || {});
  await saveOutput(req.user.id, "section_advisory", section || "portfolio", { ...result, inputs: await portfolioFingerprint(req.user.id) });
  res.json(result);
});

// Personal Character Test (MEPAi) — paid
router.get("/personal-test", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "MEPAi is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  res.json(await buildPersonalTest(summary || {}));
});

// Career Test (MEPAi) — paid
router.get("/career-test", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "MEPAi is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  res.json(await buildCareerTest(summary || {}));
});

// ---- Saved MEPAi results (reopen pages with the latest advice) ----
// GET /api/ai/saved?kinds=a,b → { [kind]: { [scope]: { ...payload, saved_at } } }
router.get("/saved", authRequired, async (req, res) => {
  const kinds = String(req.query.kinds || "").split(",").map((k) => k.trim()).filter(Boolean).slice(0, 30);
  const out = await listOutputs(req.user.id, kinds);
  // flag advice whose underlying portfolio data has changed since it was generated
  if (Object.keys(out).some((k) => FINGERPRINTED.includes(k))) {
    const fp = await portfolioFingerprint(req.user.id);
    for (const k of FINGERPRINTED) {
      for (const v of Object.values(out[k] || {})) v.stale = !!(v.inputs && fp && v.inputs !== fp);
    }
  }
  res.json(out);
});

const TICKABLE = ["statement_guidance", "statement_grammar", "activity_guidance", "activity_grammar", "award_guidance", "award_grammar"];
const DRAFTS = ["activity_draft", "award_draft", "export_prefs"]; // unsaved form drafts kept so the student can continue later

// Save a form draft (e.g. the activity editor before "Save activity")
router.put("/saved/:kind", authRequired, async (req, res) => {
  const { kind } = req.params;
  if (!DRAFTS.includes(kind)) return res.status(400).json({ error: "Not a draft" });
  const draft = req.body?.draft;
  if (!draft || typeof draft !== "object" || JSON.stringify(draft).length > 20000) return res.status(400).json({ error: "Invalid draft" });
  await saveOutput(req.user.id, kind, String(req.body?.scope || "new"), { draft });
  res.json({ status: "ok" });
});

// Clear a workspace once its item is saved (draft, guidance, grammar for a new activity)
router.delete("/saved/:kind", authRequired, async (req, res) => {
  const { kind } = req.params;
  if (![...TICKABLE, ...DRAFTS, "activity_description", "award_description"].includes(kind)) return res.status(400).json({ error: "Not removable" });
  await pool.query("DELETE FROM ai_saved_outputs WHERE user_id = ? AND kind = ? AND scope = ?", [req.user.id, kind, String(req.query.scope || "")]);
  res.json({ status: "deleted" });
});

// Save which checklist items the student has ticked off (guidance / grammar)
router.patch("/saved/:kind", authRequired, async (req, res) => {
  const { kind } = req.params;
  if (!TICKABLE.includes(kind)) return res.status(400).json({ error: "Not editable" });
  const scope = String(req.body?.scope || "");
  const cur = await getOutput(req.user.id, kind, scope);
  if (!cur) return res.status(404).json({ error: "Nothing saved yet" });
  const { saved_at, ...payload } = cur;
  payload.done = (Array.isArray(req.body?.done) ? req.body.done : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0).slice(0, 50);
  await saveOutput(req.user.id, kind, scope, payload);
  res.json({ status: "ok" });
});

// EduBot: reopen the most recent conversation
router.get("/chat/latest", authRequired, async (req, res) => {
  const [[session]] = await pool.query("SELECT id FROM ai_chat_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1", [req.user.id]);
  if (!session) return res.json({ sessionId: null, messages: [] });
  const [rows] = await pool.query("SELECT sender_role, message, created_at FROM ai_chat_messages WHERE session_id = ? ORDER BY id ASC LIMIT 200", [session.id]);
  res.json({ sessionId: session.id, messages: rows.map((r) => ({ role: r.sender_role, text: r.message, at: r.created_at })) });
});

module.exports = router;
