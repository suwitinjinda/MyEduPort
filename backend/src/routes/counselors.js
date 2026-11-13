const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { estimateAcceptanceProbability } = require("../services/aiClient");
const { PROGRESS_COLUMNS, completion, lastActive, deadlines } = require("../services/studentProgress");

const router = express.Router();

async function getCounselorIdByUser(userId) {
  const [rows] = await pool.query("SELECT id FROM counselors WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].id : null;
}

router.get("/me", authRequired, async (req, res) => {
  if (req.user.role !== "counselor") return res.status(403).json({ error: "Counselor only" });
  const [rows] = await pool.query(
    "SELECT c.*, u.email, u.name FROM counselors c JOIN users u ON c.user_id = u.id WHERE u.id = ?",
    [req.user.id]
  );
  return res.json(rows[0] || null);
});

router.put("/me", authRequired, async (req, res) => {
  if (req.user.role !== "counselor") return res.status(403).json({ error: "Counselor only" });
  const { organization, title } = req.body || {};
  await pool.query(
    "UPDATE counselors SET organization = ?, title = ? WHERE user_id = ?",
    [organization || "", title || "", req.user.id]
  );
  return res.json({ status: "ok" });
});

// ---- The cohort: every advised student with progress, deadlines and what needs attention ----
const DAY = 86400000;
const INACTIVE_DAYS = 14;
const SOON_DAYS = 14;
const LOW_COMPLETION = 40;

const counselorOnly = async (req, res) => {
  if (req.user.role !== "counselor") { res.status(403).json({ error: "Counselor only" }); return null; }
  const id = await getCounselorIdByUser(req.user.id);
  if (!id) { res.status(403).json({ error: "Counselor profile missing" }); return null; }
  return id;
};
const isLinked = async (counselorId, studentId) => {
  const [[link]] = await pool.query("SELECT 1 FROM counselor_student_links WHERE counselor_id = ? AND student_id = ?", [counselorId, studentId]);
  return !!link;
};
const openRecs = async (counselorId) => {
  try {
    const [r] = await pool.query("SELECT student_id, COUNT(*) n FROM recommendation_requests WHERE counselor_id = ? AND status IN ('requested','in_progress') GROUP BY student_id", [counselorId]);
    return Object.fromEntries(r.map((x) => [x.student_id, Number(x.n)]));
  } catch { return {}; }
};

router.get("/me/students", authRequired, async (req, res) => {
  const counselorId = await counselorOnly(req, res);
  if (!counselorId) return;
  const [rows] = await pool.query(
    `SELECT csl.student_id, csl.created_at AS linked_at, u.name, u.email, s.curriculum,
            (SELECT COUNT(*) FROM essays e WHERE e.student_id = s.id) AS essays_count,
            (SELECT COUNT(*) FROM saved_universities su WHERE su.student_id = s.id) AS universities_count,
            ${PROGRESS_COLUMNS}
     FROM counselor_student_links csl
     JOIN students s ON csl.student_id = s.id
     JOIN users u ON s.user_id = u.id
     WHERE csl.counselor_id = ? AND u.deleted_at IS NULL
     ORDER BY u.name`,
    [counselorId]
  );
  const recs = await openRecs(counselorId);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const out = await Promise.all(rows.map(async (r) => {
    const pct = completion(r);
    const last = await lastActive(r.student_id);
    const dl = await deadlines(r.student_id);
    const overdue = dl.filter((d) => d.kind === "task" && new Date(d.date) < today);
    const upcoming = dl.filter((d) => new Date(d.date) >= today);
    const next = upcoming[0] || null;
    const daysInactive = last ? Math.floor((Date.now() - last.getTime()) / DAY) : null;
    const flags = [];
    if (overdue.length) flags.push({ key: "overdue", label: `${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}`, level: "high" });
    if (daysInactive === null || daysInactive >= INACTIVE_DAYS) flags.push({ key: "inactive", label: daysInactive === null ? "Hasn't started" : `Inactive ${daysInactive} days`, level: "medium" });
    if (next && (new Date(next.date) - today) / DAY <= SOON_DAYS) flags.push({ key: "soon", label: "Deadline within 2 weeks", level: "medium" });
    if (pct < LOW_COMPLETION) flags.push({ key: "low", label: "Portfolio under 40%", level: "low" });
    if (recs[r.student_id]) flags.push({ key: "rec", label: `${recs[r.student_id]} letter request${recs[r.student_id] > 1 ? "s" : ""}`, level: "info" });
    return {
      student_id: r.student_id, name: r.name, email: r.email, grade_level: r.grade_level, school: r.school,
      curriculum: r.curriculum, intended_major: r.intended_major, target_countries: r.target_countries,
      completion: pct, last_active: last, days_inactive: daysInactive,
      counts: { academics: r.academics_count, tests: r.tests_count, activities: r.activities_count, awards: r.awards_count, documents: r.documents_count, essays: r.essays_count, universities: r.universities_count },
      overdue: overdue.length, next_deadline: next, upcoming: upcoming.slice(0, 5),
      open_recommendations: recs[r.student_id] || 0,
      flags, needs_attention: flags.some((f) => f.level === "high" || f.level === "medium")
    };
  }));
  return res.json(out);
});

// Private notes the counsellor keeps on a student (the student never sees them)
router.get("/me/students/:studentId/note", authRequired, async (req, res) => {
  const counselorId = await counselorOnly(req, res);
  if (!counselorId) return;
  if (!(await isLinked(counselorId, req.params.studentId))) return res.status(403).json({ error: "Not linked" });
  const [[row]] = await pool.query("SELECT note, updated_at FROM counselor_notes WHERE counselor_id = ? AND student_id = ?", [counselorId, req.params.studentId]);
  res.json(row || { note: "", updated_at: null });
});
router.put("/me/students/:studentId/note", authRequired, async (req, res) => {
  const counselorId = await counselorOnly(req, res);
  if (!counselorId) return;
  if (!(await isLinked(counselorId, req.params.studentId))) return res.status(403).json({ error: "Not linked" });
  const note = String(req.body?.note || "").slice(0, 10000);
  await pool.query(
    "INSERT INTO counselor_notes (counselor_id, student_id, note) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE note = VALUES(note)",
    [counselorId, req.params.studentId, note]
  );
  const [[row]] = await pool.query("SELECT note, updated_at FROM counselor_notes WHERE counselor_id = ? AND student_id = ?", [counselorId, req.params.studentId]);
  res.json(row);
});

// Recommendation letter requests from advised students
const REC_STATUSES = ["requested", "in_progress", "sent", "declined"];
router.get("/me/recommendations", authRequired, async (req, res) => {
  const counselorId = await counselorOnly(req, res);
  if (!counselorId) return;
  const [rows] = await pool.query(
    `SELECT r.id, r.student_id, r.purpose, r.due_date, r.student_note, r.status, r.counselor_note, r.created_at, r.updated_at, u.name AS student_name
     FROM recommendation_requests r JOIN students s ON s.id = r.student_id JOIN users u ON u.id = s.user_id
     WHERE r.counselor_id = ? AND r.status <> 'cancelled'
     ORDER BY FIELD(r.status, 'requested', 'in_progress', 'sent', 'declined'), r.due_date IS NULL, r.due_date, r.id DESC`,
    [counselorId]
  );
  res.json(rows);
});
router.put("/me/recommendations/:id", authRequired, async (req, res) => {
  const counselorId = await counselorOnly(req, res);
  if (!counselorId) return;
  const { status, counselor_note } = req.body || {};
  if (status !== undefined && !REC_STATUSES.includes(status)) return res.status(400).json({ error: "Unknown status" });
  const [r] = await pool.query(
    `UPDATE recommendation_requests SET status = COALESCE(?, status), counselor_note = COALESCE(?, counselor_note)
     WHERE id = ? AND counselor_id = ? AND status <> 'cancelled'`,
    [status ?? null, counselor_note === undefined ? null : String(counselor_note).slice(0, 2000), req.params.id, counselorId]
  );
  if (!r.affectedRows) return res.status(404).json({ error: "Request not found" });
  res.json({ ok: true });
});

// Link a student via their invite code
router.post("/me/link", authRequired, async (req, res) => {
  if (req.user.role !== "counselor") return res.status(403).json({ error: "Counselor only" });
  const { invite_code } = req.body || {};
  if (!invite_code) return res.status(400).json({ error: "invite_code required" });

  const counselorId = await getCounselorIdByUser(req.user.id);
  if (!counselorId) return res.status(403).json({ error: "Counselor profile missing" });

  const [[student]] = await pool.query("SELECT id FROM students WHERE invite_code = ?", [invite_code]);
  if (!student) return res.status(404).json({ error: "Invalid invite code" });

  try {
    await pool.query(
      "INSERT INTO counselor_student_links (counselor_id, student_id, invite_code) VALUES (?, ?, ?)",
      [counselorId, student.id, invite_code]
    );
    return res.json({ status: "linked", student_id: student.id });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Already linked" });
    throw e;
  }
});

router.delete("/me/students/:studentId", authRequired, async (req, res) => {
  if (req.user.role !== "counselor") return res.status(403).json({ error: "Counselor only" });
  const counselorId = await getCounselorIdByUser(req.user.id);
  if (!counselorId) return res.status(403).json({ error: "Counselor profile missing" });
  await pool.query(
    "DELETE FROM counselor_student_links WHERE counselor_id = ? AND student_id = ?",
    [counselorId, req.params.studentId]
  );
  return res.json({ status: "unlinked" });
});

// Read-only portfolio view (mirrors parent route)
router.get("/me/students/:studentId", authRequired, async (req, res) => {
  if (req.user.role !== "counselor") return res.status(403).json({ error: "Counselor only" });
  const counselorId = await getCounselorIdByUser(req.user.id);
  if (!counselorId) return res.status(403).json({ error: "Counselor profile missing" });

  const sid = req.params.studentId;
  const [[link]] = await pool.query(
    "SELECT 1 FROM counselor_student_links WHERE counselor_id = ? AND student_id = ?",
    [counselorId, sid]
  );
  if (!link) return res.status(403).json({ error: "Not linked" });

  const [[student]] = await pool.query(
    "SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?",
    [sid]
  );
  if (!student) return res.status(404).json({ error: "Student not found" });

  const [academics] = await pool.query("SELECT * FROM academic_records WHERE student_id = ? ORDER BY year DESC", [sid]);
  const [tests] = await pool.query("SELECT * FROM test_scores WHERE student_id = ? ORDER BY test_date DESC", [sid]);
  const [activities] = await pool.query("SELECT * FROM activities WHERE student_id = ? ORDER BY start_date DESC", [sid]);
  const [awards] = await pool.query("SELECT * FROM awards WHERE student_id = ? ORDER BY award_date DESC", [sid]);
  const [documents] = await pool.query("SELECT * FROM documents WHERE student_id = ? ORDER BY uploaded_at DESC", [sid]);

  let tasks = [];
  try {
    const [t] = await pool.query(
      "SELECT * FROM tasks WHERE student_id = ? ORDER BY FIELD(status, 'open','in_progress','done'), due_date, id",
      [sid]
    );
    tasks = t;
  } catch (err) { /* migration not yet run */ }

  let savedUniversities = [];
  try {
    const [su] = await pool.query(
      `SELECT su.*, u.name, u.country, u.city, u.selectivity_band
       FROM saved_universities su JOIN universities u ON su.university_id = u.id
       WHERE su.student_id = ?
       ORDER BY FIELD(bucket, 'reach','target','safety'), deadline, u.name`,
      [sid]
    );
    savedUniversities = su;
  } catch (err) { /* migration not yet run */ }

  let essays = [];
  try {
    const [e] = await pool.query(
      "SELECT id, title, word_count, last_edited_at, created_at FROM essays WHERE student_id = ? ORDER BY last_edited_at DESC",
      [sid]
    );
    essays = e;
  } catch (err) { /* essays table missing */ }

  const summary = {
    gradeLevel: student.grade_level,
    intendedMajor: student.intended_major,
    targetCountries: student.target_countries,
    classRank: student.class_rank,
    academicCount: academics.length,
    activityCount: activities.length,
    awardCount: awards.length,
    essayCount: essays.length
  };
  const acceptance = await estimateAcceptanceProbability(summary, savedUniversities);

  return res.json({
    profile: student,
    academics,
    tests,
    activities,
    awards,
    documents,
    tasks,
    savedUniversities,
    essays,
    acceptance
  });
});

module.exports = router;
