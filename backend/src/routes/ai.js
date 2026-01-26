const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const {
  buildProfileScore,
  buildGapAnalysis,
  categorizeUniversities,
  buildChatResponse,
  analyzeEssay
} = require("../services/aiClient");

const router = express.Router();

async function getStudentSummary(userId) {
  const [[student]] = await pool.query("SELECT id, grade_level, intended_major FROM students WHERE user_id = ?", [userId]);
  if (!student) return null;
  const [[academicCount]] = await pool.query("SELECT COUNT(*) AS count FROM academic_records WHERE student_id = ?", [student.id]);
  const [[activityCount]] = await pool.query("SELECT COUNT(*) AS count FROM activities WHERE student_id = ?", [student.id]);
  const [[awardCount]] = await pool.query("SELECT COUNT(*) AS count FROM awards WHERE student_id = ?", [student.id]);
  return {
    studentId: student.id,
    gradeLevel: student.grade_level,
    intendedMajor: student.intended_major,
    academicCount: academicCount.count,
    activityCount: activityCount.count,
    awardCount: awardCount.count
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
  const summary = await getStudentSummary(req.user.id);
  if (!summary) return res.status(404).json({ error: "Student profile missing" });
  const report = buildGapAnalysis(summary || {});
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
  let query = "SELECT id, name, country, city, selectivity_band, major_tags FROM universities WHERE 1=1";
  const params = [];
  
  if (country && country !== "All") {
    query += " AND country = ?";
    params.push(country);
  }
  
  // If major filter is provided, check if it matches major_tags
  if (studentMajor) {
    query += " AND (major_tags LIKE ? OR major_tags IS NULL)";
    params.push(`%${studentMajor}%`);
  }
  
  query += " LIMIT 30";
  
  const [universities] = await pool.query(query, params);
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
  const response = buildChatResponse(message);
  let activeSessionId = sessionId;
  if (!activeSessionId) {
    const [sessionResult] = await pool.query("INSERT INTO ai_chat_sessions (user_id) VALUES (?)", [req.user.id]);
    activeSessionId = sessionResult.insertId;
  }
  await pool.query(
    "INSERT INTO ai_chat_messages (session_id, sender_role, message) VALUES (?, ?, ?)",
    [activeSessionId, "user", message]
  );
  await pool.query(
    "INSERT INTO ai_chat_messages (session_id, sender_role, message) VALUES (?, ?, ?)",
    [activeSessionId, "assistant", response.reply]
  );
  res.json({ ...response, sessionId: activeSessionId });
});

router.post("/essay-feedback", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const { essay } = req.body || {};
  if (!essay) return res.status(400).json({ error: "Essay content required" });
  
  const feedback = analyzeEssay(essay);
  
  // Store feedback in ai_reports
  const [[student]] = await pool.query("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
  if (student) {
    await pool.query(
      "INSERT INTO ai_reports (student_id, report_type, payload_json) VALUES (?, ?, ?)",
      [student.id, "essay_feedback", JSON.stringify(feedback)]
    );
  }
  
  res.json(feedback);
});

module.exports = router;
