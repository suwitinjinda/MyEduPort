const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { profileSnapshot } = require("../services/knowledge");

// Where a student records how their applications actually turned out.
//
// Rows land in the same `admission_outcomes` table the admin already fills by hand
// (source = 'student' instead of 'admin'), so they show up in Admin → Machine Learning →
// Admission outcomes straight away, and `outcomesContextFor()` starts feeding them to the
// acceptance-probability prompts as real evidence from past applicants.
//
// A profile snapshot (GPA, tests, activity and award counts at the time of the result) is
// stored alongside, because the result is only useful to the AI next to the profile that
// produced it. The student's name is never part of that snapshot.
const router = express.Router();

const RESULTS = ["admitted", "waitlisted", "rejected", "deferred", "enrolled"];
const ROUNDS = ["", "ED", "ED II", "EA", "REA", "RD", "Rolling", "UCAS", "Direct", "Other"];

async function studentIdOf(userId) {
  const [rows] = await pool.query("SELECT id FROM students WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].id : null;
}

const clean = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

function validate(body) {
  const universityName = clean(body.university_name, 255);
  if (!universityName) return { error: "Choose or type the university." };
  const result = clean(body.result, 20).toLowerCase();
  if (!RESULTS.includes(result)) return { error: `Result must be one of: ${RESULTS.join(", ")}.` };

  const year = body.cycle_year === "" || body.cycle_year == null ? null : Number(body.cycle_year);
  if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
    return { error: "Entry year looks wrong — use a full year such as 2027." };
  }
  const round = clean(body.application_round, 40);
  if (round && !ROUNDS.includes(round)) return { error: "Unknown application round." };

  return {
    value: {
      universityId: Number.isInteger(Number(body.university_id)) && Number(body.university_id) > 0 ? Number(body.university_id) : null,
      universityName,
      country: clean(body.country, 80),
      cycleYear: year,
      round,
      major: clean(body.major, 150),
      result,
      notes: clean(body.notes, 2000) || null
    }
  };
}

// What the student can pick from, so the form doesn't have to hard-code it
router.get("/options", authRequired, (req, res) => {
  res.json({ results: RESULTS, rounds: ROUNDS.filter(Boolean) });
});

router.get("/", authRequired, async (req, res) => {
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [rows] = await pool.query(
    `SELECT id, university_id, university_name, country, cycle_year, application_round, major, result, notes, created_at
       FROM admission_outcomes
      WHERE student_id = ? AND source = 'student'
      ORDER BY cycle_year DESC, FIELD(result,'enrolled','admitted','waitlisted','deferred','rejected'), university_name`,
    [studentId]
  );
  res.json(rows);
});

router.post("/", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });

  const { error, value: v } = validate(req.body || {});
  if (error) return res.status(400).json({ error });

  // Snapshot the profile as it stands now — that is what makes the result useful later
  let snapshot = null;
  try { snapshot = JSON.stringify(await profileSnapshot(studentId)); } catch { /* result still worth keeping */ }

  try {
    const [r] = await pool.query(
      `INSERT INTO admission_outcomes
         (student_id, university_id, university_name, country, cycle_year, application_round, major, result, profile_snapshot, notes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'student')`,
      [studentId, v.universityId, v.universityName, v.country, v.cycleYear, v.round, v.major, v.result, snapshot, v.notes]
    );
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "You've already recorded a result for that university and year — edit that one instead." });
    }
    throw err;
  }
});

router.put("/:id", authRequired, async (req, res) => {
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { error, value: v } = validate(req.body || {});
  if (error) return res.status(400).json({ error });

  const [r] = await pool.query(
    `UPDATE admission_outcomes
        SET university_id = ?, university_name = ?, country = ?, cycle_year = ?,
            application_round = ?, major = ?, result = ?, notes = ?
      WHERE id = ? AND student_id = ? AND source = 'student'`,
    [v.universityId, v.universityName, v.country, v.cycleYear, v.round, v.major, v.result, v.notes, req.params.id, studentId]
  );
  if (!r.affectedRows) return res.status(404).json({ error: "Not found." });
  res.json({ ok: true });
});

router.delete("/:id", authRequired, async (req, res) => {
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [r] = await pool.query(
    "DELETE FROM admission_outcomes WHERE id = ? AND student_id = ? AND source = 'student'",
    [req.params.id, studentId]
  );
  if (!r.affectedRows) return res.status(404).json({ error: "Not found." });
  res.json({ ok: true });
});

module.exports = router;
