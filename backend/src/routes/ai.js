const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { checkQuota, incrementUsage, isFeatureAllowed } = require("../services/plan");
const {
  buildProfileScore,
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
  let baseQuery = "SELECT id, name, country, city, selectivity_band, major_tags FROM universities WHERE 1=1";
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
  const results = categorizeUniversities(universities, Number(gpa || 3.4));

  // Sort results if needed
  if (sortBy === "country") {
    results.sort((a, b) => a.country.localeCompare(b.country));
  } else if (sortBy === "match") {
    results.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
  }

  await pool.query(
    "INSERT INTO ai_reports (student_id, report_type, payload_json) VALUES ((SELECT id FROM students WHERE user_id = ?), ?, ?)",
    [req.user.id, "recommendations", JSON.stringify({ country, major: studentMajor, results })]
  );
  res.json({ country, major: studentMajor, results });
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

router.get("/acceptance-probability", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "predictions"))) {
    return res.status(403).json({ error: "Acceptance predictions are a paid feature — upgrade to unlock." });
  }
  const summary = await getStudentSummary(req.user.id);
  if (!summary) return res.status(404).json({ error: "Student profile missing" });
  let saved = [];
  try {
    const [rows] = await pool.query(
      `SELECT su.bucket, u.name, u.country, u.selectivity_band
       FROM saved_universities su JOIN universities u ON su.university_id = u.id
       WHERE su.student_id = ?`,
      [summary.studentId]
    );
    saved = rows;
  } catch (err) { /* table missing — migration needed */ }
  const result = await estimateAcceptanceProbability(summary, saved);
  res.json(result);
});

router.post("/essay-feedback", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { essay } = req.body || {};
  if (!essay) return res.status(400).json({ error: "Essay content required" });

  const fbQuota = await checkQuota(req.user.id, "essay_feedback");
  if (!fbQuota.allowed) {
    return res.status(429).json({
      error: `EssAI Feedback limit reached (${fbQuota.limit} ${fbQuota.plan === "free" ? "total on Free" : "per month"}). Upgrade your plan for more analyses.`
    });
  }

  const feedback = await analyzeEssayWithClaude(essay);
  await incrementUsage(req.user.id, "essay_feedback", fbQuota.period);

  const [[student]] = await pool.query("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
  if (student) {
    await pool.query(
      "INSERT INTO ai_reports (student_id, report_type, payload_json) VALUES (?, ?, ?)",
      [student.id, "essay_feedback", JSON.stringify(feedback)]
    );
  }

  res.json(feedback);
});

// ============================================================
// Phase 2 — section-level AI endpoints
// ============================================================

// 02 Academics — advisory + score for one grade/year
router.post("/academic-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "AdviAI is a paid feature — upgrade to Essential or Professional." });
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
  res.json(result);
});

// 02 Academics — standardized test advisory + recommended tests
router.get("/test-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "AdviAI is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  if (!summary) return res.status(404).json({ error: "Student profile missing" });
  let tests = [];
  try {
    const [rows] = await pool.query("SELECT test_type, score, superscore FROM test_scores WHERE student_id = ?", [summary.studentId]);
    tests = rows;
  } catch (err) { /* ignore */ }
  const result = await buildTestAdvisory(summary, tests);
  res.json(result);
});

// 03 Extracurricular — recommended activities (AI)
router.get("/activity-recommendations", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "AdviAI is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  if (!summary) return res.status(404).json({ error: "Student profile missing" });
  const result = await buildActivityRecommendations(summary);
  res.json(result);
});

// 03 Extracurricular — topic + summary + score for one activity (AI)
router.post("/activity-analyze", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "AdviAI is a paid feature — upgrade to Essential or Professional." });
  }
  const { activity } = req.body || {};
  if (!activity) return res.status(400).json({ error: "activity required" });
  const result = await analyzeActivityWithClaude(activity);
  res.json(result);
});

// 05 Documents — recommendation-letter advisory (AI)
router.get("/recommendation-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "AdviAI is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  const result = await buildRecommendationAdvisory(summary || {});
  res.json(result);
});

// 05 Documents — additional-documents advisory (AI)
router.get("/document-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "AdviAI is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  const result = await buildDocumentAdvisory(summary || {});
  res.json(result);
});

// 05 Documents — AdviAI: personalized essay advisory (PRO/paid plans)
router.post("/essay-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "AdviAI is a paid feature — upgrade to Essential or Professional." });
  }
  const { essay } = req.body || {};
  const summary = await getStudentSummary(req.user.id);
  const result = await buildEssayAdvisory(summary || {}, essay || "");
  res.json(result);
});

// 05 Documents — essay "Edit & Apply" AI revision
router.post("/essay-revise", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { essay } = req.body || {};
  if (!essay) return res.status(400).json({ error: "Essay content required" });
  const result = await reviseEssayWithClaude(essay);
  res.json(result);
});

// Generic section AdviAI (academics / awards / extracurricular / documents) — paid
router.post("/section-advisory", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "AdviAI is a paid feature — upgrade to Essential or Professional." });
  }
  const { section } = req.body || {};
  const summary = await getStudentSummary(req.user.id);
  const result = await buildSectionAdvisory(section || "portfolio", summary || {});
  res.json(result);
});

// Personal Character Test (AdviAI) — paid
router.get("/personal-test", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "AdviAI is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  res.json(await buildPersonalTest(summary || {}));
});

// Career Test (AdviAI) — paid
router.get("/career-test", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "AdviAI is a paid feature — upgrade to Essential or Professional." });
  }
  const summary = await getStudentSummary(req.user.id);
  res.json(await buildCareerTest(summary || {}));
});

module.exports = router;
