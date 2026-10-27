const express = require("express");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const { awardCoins } = require("../services/referrals");
const { authRequired } = require("../middleware/auth");
const { isFeatureAllowed } = require("../services/plan");
const { buildPersonalityNarrative } = require("../services/aiClient");

const router = express.Router();

// IPIP-50 items + scoring metadata (public-domain instrument)
const IPIP = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "ipip50_items.json"), "utf8"));
const FACTOR_NAMES = { E: "Extraversion", A: "Agreeableness", C: "Conscientiousness", ES: "Emotional Stability", I: "Intellect/Imagination" };

// COPPA heuristic: Grade 6/7 (Year 7/8) students are typically 11–12 (under 13)
function isLikelyUnder13(gradeLevel) {
  if (!gradeLevel) return false;
  return /Grade 6\b|Grade 7\b|Year 7\b|Year 8\b/i.test(gradeLevel);
}

function bandFor(avg) {
  if (avg <= 2.0) return "Low";
  if (avg <= 3.0) return "Below average";
  if (avg < 4.0) return "Above average"; // 3.1–3.9
  return "High";                         // 4.0–5.0
}

// Server-side scoring per DevSpec §4 (reverse-score negatively keyed items)
function scoreIPIP50(responses) {
  const raw = { E: 0, A: 0, C: 0, ES: 0, I: 0 };
  for (const item of IPIP.items) {
    const r = Number(responses[item.id]);
    const scored = item.keyed === "+" ? r : (6 - r);
    raw[item.factorCode] += scored;
  }
  const average = {}, bands = {};
  for (const k of Object.keys(raw)) {
    average[k] = +(raw[k] / 10).toFixed(2);
    bands[k] = bandFor(average[k]);
  }
  return { raw, average, bands };
}

async function studentIdOf(userId) {
  const [rows] = await pool.query("SELECT id FROM students WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].id : null;
}
async function summaryOf(studentId) {
  const [[s]] = await pool.query("SELECT grade_level, intended_major, target_countries, class_rank FROM students WHERE id = ?", [studentId]);
  return { gradeLevel: s?.grade_level, intendedMajor: s?.intended_major, targetCountries: s?.target_countries, classRank: s?.class_rank };
}

// Items + scale + stem for the questionnaire UI (no keying exposed)
router.get("/items", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "The Personality Test is a paid feature — upgrade to Essential or Professional." });
  }
  res.json({
    instrument: IPIP.instrument,
    stem: IPIP.stem,
    scale: IPIP.responseScale,
    factors: FACTOR_NAMES,
    items: IPIP.items.map((i) => ({ id: i.id, text: i.text, factor: i.factor }))
  });
});

// Submit all 50 responses -> score, MEPAi narrative, save (append-only), return report
router.post("/submit", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "adviai"))) {
    return res.status(403).json({ error: "The Personality Test is a paid feature — upgrade to Essential or Professional." });
  }
  const { responses, started_at, parental_consent } = req.body || {};
  if (!responses || typeof responses !== "object") return res.status(400).json({ error: "responses required" });

  try {
    const studentId = await studentIdOf(req.user.id);
    if (!studentId) return res.status(403).json({ error: "Student only" });

    // COPPA: students who may be under 13 must confirm parental consent
    const [[stu]] = await pool.query("SELECT grade_level FROM students WHERE id = ?", [studentId]);
    if (isLikelyUnder13(stu?.grade_level) && !parental_consent) {
      return res.status(403).json({ error: "A parent or guardian must consent before students under 13 take this assessment." });
    }

    // Validate all 50 present and 1–5
    for (const item of IPIP.items) {
      const v = Number(responses[item.id]);
      if (!Number.isInteger(v) || v < 1 || v > 5) {
        return res.status(400).json({ error: `Please answer all 50 questions (item ${item.id} missing or invalid).` });
      }
    }

    const { raw, average, bands } = scoreIPIP50(responses);
    const summary = await summaryOf(studentId);
    const narrative = await buildPersonalityNarrative(average, bands, summary);

    const startedAt = started_at && !isNaN(new Date(started_at).getTime()) ? new Date(started_at) : null;
    const [result] = await pool.query(
      "INSERT INTO personality_assessments (student_id, instrument, instrument_version, responses, scores, bands, narrative, started_at, parental_consent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [studentId, "IPIP-50", "1.0", JSON.stringify(responses), JSON.stringify({ raw, average }), JSON.stringify(bands), JSON.stringify(narrative), startedAt, Boolean(parental_consent)]
    );
    awardCoins(req.user.id, "personality_test", `personality:${result.insertId}`);
    res.json({ id: result.insertId, scores: { raw, average }, bands, narrative, factors: FACTOR_NAMES, completed_at: new Date().toISOString() });
  } catch (err) {
    console.error("personality submit error:", err.message);
    if (err.code === "ER_NO_SUCH_TABLE") return res.status(400).json({ error: "Run alter_phase5_personality.sql" });
    return res.status(500).json({ error: "Could not score the assessment. Please try again." });
  }
});

// Latest completed assessment (for showing the existing report)
router.get("/latest", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  try {
    const [rows] = await pool.query(
      "SELECT id, scores, bands, narrative, completed_at FROM personality_assessments WHERE student_id = ? ORDER BY completed_at DESC LIMIT 1",
      [studentId]
    );
    if (!rows.length) return res.json(null);
    const r = rows[0];
    const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
    res.json({ id: r.id, scores: parse(r.scores), bands: parse(r.bands), narrative: parse(r.narrative), factors: FACTOR_NAMES, completed_at: r.completed_at });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.json(null);
    console.error("personality latest error:", err.message);
    return res.status(500).json({ error: "Could not load your assessment." });
  }
});

// Trend: all completed attempts (oldest → newest) for progress over time
router.get("/history", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  try {
    const [rows] = await pool.query(
      "SELECT id, scores, bands, completed_at FROM personality_assessments WHERE student_id = ? ORDER BY completed_at ASC",
      [studentId]
    );
    const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
    res.json(rows.map((r) => ({
      id: r.id,
      average: parse(r.scores)?.average || {},
      bands: parse(r.bands) || {},
      completed_at: r.completed_at
    })));
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.json([]);
    console.error("personality history error:", err.message);
    return res.status(500).json({ error: "Could not load history." });
  }
});

module.exports = router;
