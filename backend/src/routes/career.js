const express = require("express");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const { awardCoins } = require("../services/referrals");
const { authRequired } = require("../middleware/auth");
const { isFeatureAllowed } = require("../services/plan");
const { buildCareerNarrative } = require("../services/aiClient");

const router = express.Router();

const RIASEC = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "riasec_items.json"), "utf8"));
const TYPE_ORDER = ["R", "I", "A", "S", "E", "C"]; // canonical order (also the tiebreak)
const TYPE_NAMES = { R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional" };
// Verbatim worksheet instructions (DevSpec §2 — keep wording for validity)
const STEM = "Read the 60 work activities below. Place a check in the box by the activities you would like to do. Do not think about how much education/training is needed or how much money you will make!";

// COPPA heuristic — shared with the personality test
function isLikelyUnder13(gradeLevel) {
  if (!gradeLevel) return false;
  return /Grade 6\b|Grade 7\b|Year 7\b|Year 8\b/i.test(gradeLevel);
}

// Step 1: sum per type (0–10). Step 2: rank desc, tiebreak = canonical RIASEC order; top-3 = code.
function scoreRiasec(responses) {
  const totals = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const item of RIASEC.items) totals[item.type] += responses[item.id] ? 1 : 0;
  const ranked = TYPE_ORDER
    .map((t) => ({ type: t, score: totals[t] }))
    .sort((a, b) => (b.score - a.score) || (TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)));
  return { scores: totals, ranking: ranked.map((r) => r.type), code: ranked.slice(0, 3).map((r) => r.type).join("") };
}

async function studentIdOf(userId) {
  const [rows] = await pool.query("SELECT id FROM students WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].id : null;
}
async function summaryOf(studentId) {
  const [[s]] = await pool.query("SELECT grade_level, intended_major, target_countries FROM students WHERE id = ?", [studentId]);
  return { gradeLevel: s?.grade_level, intendedMajor: s?.intended_major, targetCountries: s?.target_countries };
}

router.get("/items", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "The Career Test is a paid feature — upgrade to Essential or Professional." });
  }
  res.json({
    instrument: RIASEC.instrument,
    stem: STEM,
    types: TYPE_NAMES,
    items: RIASEC.items.map((i) => ({ id: i.id, text: i.text, type: i.type, typeName: i.typeName }))
  });
});

router.post("/submit", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "The Career Test is a paid feature — upgrade to Essential or Professional." });
  }
  const { responses, started_at, parental_consent } = req.body || {};
  if (!responses || typeof responses !== "object") return res.status(400).json({ error: "responses required" });

  try {
    const studentId = await studentIdOf(req.user.id);
    if (!studentId) return res.status(403).json({ error: "Student only" });

    // COPPA gate
    const [[stu]] = await pool.query("SELECT grade_level FROM students WHERE id = ?", [studentId]);
    if (isLikelyUnder13(stu?.grade_level) && !parental_consent) {
      return res.status(403).json({ error: "A parent or guardian must consent before students under 13 take this assessment." });
    }

    // Validate all 60 present and binary (0/1)
    for (const item of RIASEC.items) {
      const v = responses[item.id];
      if (v !== 0 && v !== 1) {
        return res.status(400).json({ error: `Please complete all 60 activities (item ${item.id} missing or invalid).` });
      }
    }

    const { scores, ranking, code } = scoreRiasec(responses);
    const summary = await summaryOf(studentId);
    const narrative = await buildCareerNarrative(scores, ranking, code, summary);
    const startedAt = started_at && !isNaN(new Date(started_at).getTime()) ? new Date(started_at) : null;
    const [result] = await pool.query(
      "INSERT INTO interest_assessments (student_id, instrument, instrument_version, responses, scores, ranking, holland_code, narrative, started_at, parental_consent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [studentId, "ONET-IP-SF", "1.0", JSON.stringify(responses), JSON.stringify(scores), JSON.stringify(ranking), code, JSON.stringify(narrative), startedAt, Boolean(parental_consent)]
    );
    awardCoins(req.user.id, "career_test", `career:${result.insertId}`);
    res.json({ id: result.insertId, scores, ranking, holland_code: code, narrative, types: TYPE_NAMES, completed_at: new Date().toISOString() });
  } catch (err) {
    console.error("career submit error:", err.message);
    if (err.code === "ER_NO_SUCH_TABLE") return res.status(400).json({ error: "Run alter_phase6_interest.sql" });
    return res.status(500).json({ error: "Could not score the assessment. Please try again." });
  }
});

router.get("/latest", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  try {
    const [rows] = await pool.query(
      "SELECT id, scores, ranking, holland_code, narrative, completed_at FROM interest_assessments WHERE student_id = ? ORDER BY completed_at DESC LIMIT 1",
      [studentId]
    );
    if (!rows.length) return res.json(null);
    const r = rows[0]; const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
    res.json({ id: r.id, scores: parse(r.scores), ranking: parse(r.ranking), holland_code: r.holland_code, narrative: parse(r.narrative), types: TYPE_NAMES, completed_at: r.completed_at });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.json(null);
    console.error("career latest error:", err.message);
    return res.status(500).json({ error: "Could not load your assessment." });
  }
});

router.get("/history", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  try {
    const [rows] = await pool.query(
      "SELECT id, scores, holland_code, completed_at FROM interest_assessments WHERE student_id = ? ORDER BY completed_at ASC",
      [studentId]
    );
    const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
    res.json(rows.map((r) => ({ id: r.id, scores: parse(r.scores) || {}, holland_code: r.holland_code, completed_at: r.completed_at })));
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.json([]);
    console.error("career history error:", err.message);
    return res.status(500).json({ error: "Could not load history." });
  }
});

module.exports = router;
