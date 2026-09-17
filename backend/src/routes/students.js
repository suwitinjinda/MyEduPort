const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { getUserPlan, getPlanLimits, getUsage, periodFor, isFeatureAllowed } = require("../services/plan");

const router = express.Router();

async function getStudentIdByUser(userId) {
  const [rows] = await pool.query("SELECT id FROM students WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].id : null;
}

router.get("/me", authRequired, async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ error: "Student only" });
  }
  const [rows] = await pool.query(
    "SELECT s.*, u.email, u.name FROM students s JOIN users u ON s.user_id = u.id WHERE u.id = ?",
    [req.user.id]
  );
  return res.json(rows[0] || null);
});

router.put("/me", authRequired, async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ error: "Student only" });
  }
  const {
    grade_level,
    school,
    target_countries,
    intended_major,
    intended_universities,
    class_rank,
    bio
  } = req.body || {};
  await pool.query(
    "UPDATE students SET grade_level = ?, school = ?, target_countries = ?, intended_major = ?, intended_universities = ?, class_rank = ?, bio = ? WHERE user_id = ?",
    [grade_level || "", school || "", target_countries || "", intended_major || "", intended_universities || "", class_rank || "", bio || "", req.user.id]
  );
  return res.json({ status: "ok" });
});

// Current student's plan, feature flags, and remaining monthly/lifetime quota
router.get("/me/plan", authRequired, async (req, res) => {
  const plan = await getUserPlan(req.user.id);
  const limits = await getPlanLimits();
  const my = limits[plan] || {};
  const period = periodFor(plan);
  const edubotUsed = await getUsage(req.user.id, "edubot", period);
  const feedbackUsed = await getUsage(req.user.id, "essay_feedback", period);
  return res.json({
    plan,
    features: { adviai: !!my.adviai, export: !!my.export, gap: !!my.gap, predictions: my.predictions },
    quota: {
      edubot: { limit: my.edubot, used: edubotUsed, period },
      essay_feedback: { limit: my.essay_feedback, used: feedbackUsed, period }
    }
  });
});

// Full personal-data export (privacy right) — everything we hold on this student, incl. personality
router.get("/me/data-export", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const q = async (sql, params, fb = []) => { try { const [r] = await pool.query(sql, params); return r; } catch { return fb; } };
  const parseJson = (v) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
  const parseCols = (rows, cols) => rows.map((r) => { const o = { ...r }; cols.forEach((c) => { if (c in o) o[c] = parseJson(o[c]); }); return o; });
  try {
  const [[profile]] = await pool.query(
    "SELECT s.*, u.email, u.name, u.plan, u.created_at AS account_created FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?",
    [studentId]
  );
  const data = {
    exported_at: new Date().toISOString(),
    account: { email: profile?.email, name: profile?.name, plan: profile?.plan, created_at: profile?.account_created },
    profile: profile ? { grade_level: profile.grade_level, school: profile.school, target_countries: profile.target_countries, intended_major: profile.intended_major, class_rank: profile.class_rank, bio: profile.bio } : null,
    academics: await q("SELECT year, course, level, grade FROM academic_records WHERE student_id = ?", [studentId]),
    tests: await q("SELECT test_type, test_date, score, superscore FROM test_scores WHERE student_id = ?", [studentId]),
    activities: await q("SELECT title, topic, role, category, description, summary, hours_per_week, leadership, ai_score FROM activities WHERE student_id = ?", [studentId]),
    awards: await q("SELECT title, description, award_date FROM awards WHERE student_id = ?", [studentId]),
    essays: await q("SELECT title, topic, status, word_count, ai_score, summary FROM essays WHERE student_id = ?", [studentId]),
    documents: await q("SELECT original_name, category, uploaded_at FROM documents WHERE student_id = ?", [studentId]),
    tasks: await q("SELECT title, due_date, category, status FROM tasks WHERE student_id = ?", [studentId]),
    personality_assessments: parseCols(await q("SELECT instrument, instrument_version, scores, bands, narrative, started_at, completed_at FROM personality_assessments WHERE student_id = ? ORDER BY completed_at", [studentId]), ["scores", "bands", "narrative"]),
    interest_assessments: parseCols(await q("SELECT instrument, instrument_version, scores, ranking, holland_code, narrative, started_at, completed_at FROM interest_assessments WHERE student_id = ? ORDER BY completed_at", [studentId]), ["scores", "ranking", "narrative"])
  };
  res.setHeader("Content-Disposition", `attachment; filename="myeduport-data-${studentId}.json"`);
  res.json(data);
  } catch (err) {
    console.error("data-export error:", err.message);
    return res.status(500).json({ error: "Could not export your data. Please try again." });
  }
});

// Portfolio export bundle — PAID (export feature). Blocking here enforces the export
// gate server-side, not just by disabling the frontend button. Returns the same row
// shapes as the individual /me/* endpoints so the PDF renders identically.
router.get("/me/export", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  if (!(await isFeatureAllowed(req.user.id, "export"))) {
    return res.status(403).json({ error: "PDF export is a paid feature — upgrade to Essential or Professional." });
  }
  const q = async (sql) => { try { const [r] = await pool.query(sql, [studentId]); return r; } catch { return []; } };
  const [[profile]] = await pool.query(
    "SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?",
    [studentId]
  );
  return res.json({
    user: { name: profile?.name || "", email: profile?.email || "" },
    profile: profile || null,
    academics: await q("SELECT * FROM academic_records WHERE student_id = ? ORDER BY year DESC"),
    tests: await q("SELECT * FROM test_scores WHERE student_id = ? ORDER BY test_date DESC"),
    activities: await q("SELECT * FROM activities WHERE student_id = ? ORDER BY start_date DESC"),
    awards: await q("SELECT * FROM awards WHERE student_id = ? ORDER BY award_date DESC"),
    documents: await q("SELECT * FROM documents WHERE student_id = ? ORDER BY uploaded_at DESC"),
    essays: await q("SELECT * FROM essays WHERE student_id = ? ORDER BY last_edited_at DESC")
  });
});

router.get("/me/summary", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [[student]] = await pool.query(
    "SELECT grade_level, school, target_countries, intended_major FROM students WHERE id = ?",
    [studentId]
  );
  const [[academics]] = await pool.query("SELECT COUNT(*) AS count FROM academic_records WHERE student_id = ?", [studentId]);
  const [[tests]] = await pool.query("SELECT COUNT(*) AS count FROM test_scores WHERE student_id = ?", [studentId]);
  const [[activities]] = await pool.query("SELECT COUNT(*) AS count FROM activities WHERE student_id = ?", [studentId]);
  const [[awards]] = await pool.query("SELECT COUNT(*) AS count FROM awards WHERE student_id = ?", [studentId]);
  const [[documents]] = await pool.query("SELECT COUNT(*) AS count FROM documents WHERE student_id = ?", [studentId]);

  const profileFields = ["grade_level", "school", "target_countries", "intended_major"];
  const filledProfile = profileFields.filter((field) => student?.[field]).length;
  const profileScore = filledProfile / profileFields.length;
  const dataScore =
    Math.min(1, academics.count / 4) * 0.3 +
    Math.min(1, tests.count / 2) * 0.2 +
    Math.min(1, activities.count / 4) * 0.3 +
    Math.min(1, awards.count / 2) * 0.1 +
    Math.min(1, documents.count / 3) * 0.1;

  const completion = Math.round((profileScore * 0.4 + dataScore * 0.6) * 100);
  return res.json({
    completion,
    counts: {
      academics: academics.count,
      tests: tests.count,
      activities: activities.count,
      awards: awards.count,
      documents: documents.count
    }
  });
});

router.get("/me/invite", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [[student]] = await pool.query("SELECT invite_code FROM students WHERE id = ?", [studentId]);
  if (student?.invite_code) {
    return res.json({ invite_code: student.invite_code });
  }
  const inviteCode = crypto.randomBytes(6).toString("hex");
  await pool.query("UPDATE students SET invite_code = ? WHERE id = ?", [inviteCode, studentId]);
  return res.json({ invite_code: inviteCode });
});

router.get("/me/academics", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [rows] = await pool.query("SELECT * FROM academic_records WHERE student_id = ? ORDER BY year DESC", [studentId]);
  return res.json(rows);
});

router.post("/me/academics", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { year, course, level, grade, school_system } = req.body || {};
  const [result] = await pool.query(
    "INSERT INTO academic_records (student_id, year, course, level, grade, school_system) VALUES (?, ?, ?, ?, ?, ?)",
    [studentId, year || "", course || "", level || "", grade || "", school_system || ""]
  );
  return res.json({ id: result.insertId });
});

router.delete("/me/academics/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  await pool.query("DELETE FROM academic_records WHERE id = ? AND student_id = ?", [id, studentId]);
  return res.json({ status: "deleted" });
});

router.get("/me/tests", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [rows] = await pool.query("SELECT * FROM test_scores WHERE student_id = ? ORDER BY test_date DESC", [studentId]);
  return res.json(rows);
});

router.post("/me/tests", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { test_type, test_date, score, superscore } = req.body || {};
  const [result] = await pool.query(
    "INSERT INTO test_scores (student_id, test_type, test_date, score, superscore) VALUES (?, ?, ?, ?, ?)",
    [studentId, test_type || "", test_date || null, score || "", superscore || ""]
  );
  return res.json({ id: result.insertId });
});

router.delete("/me/tests/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  await pool.query("DELETE FROM test_scores WHERE id = ? AND student_id = ?", [id, studentId]);
  return res.json({ status: "deleted" });
});

router.get("/me/activities", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [rows] = await pool.query("SELECT * FROM activities WHERE student_id = ? ORDER BY start_date DESC", [studentId]);
  return res.json(rows);
});

router.post("/me/activities", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { title, topic, description, summary, role, category, hours_per_week, leadership, start_date, end_date, ai_score } = req.body || {};
  const [result] = await pool.query(
    "INSERT INTO activities (student_id, title, topic, description, summary, role, category, hours_per_week, leadership, start_date, end_date, ai_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [studentId, title || "", topic || "", description || "", summary || null, role || "", category || "", Number(hours_per_week || 0), Boolean(leadership), start_date || null, end_date || null, ai_score ?? null]
  );
  return res.json({ id: result.insertId });
});

router.put("/me/activities/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  const { topic, summary, ai_score } = req.body || {};
  await pool.query(
    "UPDATE activities SET topic = COALESCE(?, topic), summary = COALESCE(?, summary), ai_score = COALESCE(?, ai_score) WHERE id = ? AND student_id = ?",
    [topic ?? null, summary ?? null, ai_score ?? null, id, studentId]
  );
  return res.json({ status: "ok" });
});

router.delete("/me/activities/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  await pool.query("DELETE FROM activities WHERE id = ? AND student_id = ?", [id, studentId]);
  return res.json({ status: "deleted" });
});

router.get("/me/awards", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [rows] = await pool.query("SELECT * FROM awards WHERE student_id = ? ORDER BY award_date DESC", [studentId]);
  return res.json(rows);
});

router.post("/me/awards", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { title, description, award_date } = req.body || {};
  const [result] = await pool.query(
    "INSERT INTO awards (student_id, title, description, award_date) VALUES (?, ?, ?, ?)",
    [studentId, title || "", description || "", award_date || null]
  );
  return res.json({ id: result.insertId });
});

router.delete("/me/awards/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  await pool.query("DELETE FROM awards WHERE id = ? AND student_id = ?", [id, studentId]);
  return res.json({ status: "deleted" });
});

// Essay endpoints
router.get("/me/essays", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  try {
    const [rows] = await pool.query("SELECT * FROM essays WHERE student_id = ? ORDER BY last_edited_at DESC", [studentId]);
    return res.json(rows);
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.json([]); // Return empty array if table doesn't exist yet
    }
    throw err;
  }
});

router.get("/me/essays/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM essays WHERE id = ? AND student_id = ?", [id, studentId]);
    if (!rows.length) return res.status(404).json({ error: "Essay not found" });
    return res.json(rows[0]);
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(404).json({ error: "Essay not found" });
    }
    throw err;
  }
});

router.post("/me/essays", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { title, topic, content, summary } = req.body || {};
  try {
    // Cap: at most 5 essays per student (review requirement)
    const [[{ count }]] = await pool.query("SELECT COUNT(*) AS count FROM essays WHERE student_id = ?", [studentId]);
    if (count >= 5) {
      return res.status(400).json({ error: "Essay limit reached (max 5). Delete an essay before adding a new one." });
    }
    const wordCount = content ? content.replace(/<[^>]*>/g, "").split(/\s+/).filter(w => w.length > 0).length : 0;
    const [result] = await pool.query(
      "INSERT INTO essays (student_id, title, topic, content, summary, word_count) VALUES (?, ?, ?, ?, ?, ?)",
      [studentId, title || "Untitled Essay", topic || "", content || "", summary || null, wordCount]
    );
    return res.json({ id: result.insertId, word_count: wordCount });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({ error: "Database migration required. Please run alter_add_essays.sql" });
    }
    throw err;
  }
});

router.put("/me/essays/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  const { title, topic, content, summary, status, ai_score } = req.body || {};
  try {
    const wordCount = content ? content.replace(/<[^>]*>/g, "").split(/\s+/).filter(w => w.length > 0).length : 0;
    await pool.query(
      `UPDATE essays SET
         title = COALESCE(?, title),
         topic = COALESCE(?, topic),
         content = COALESCE(?, content),
         summary = COALESCE(?, summary),
         status = COALESCE(?, status),
         ai_score = COALESCE(?, ai_score),
         word_count = CASE WHEN ? IS NULL THEN word_count ELSE ? END
       WHERE id = ? AND student_id = ?`,
      [title ?? null, topic ?? null, content ?? null, summary ?? null, status ?? null, ai_score ?? null, content ?? null, wordCount, id, studentId]
    );
    return res.json({ status: "ok", word_count: wordCount });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({ error: "Database migration required. Please run alter_add_essays.sql" });
    }
    throw err;
  }
});

router.delete("/me/essays/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM essays WHERE id = ? AND student_id = ?", [id, studentId]);
    return res.json({ status: "deleted" });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({ error: "Database migration required. Please run alter_add_essays.sql" });
    }
    throw err;
  }
});

// -----------------------------------------------------
// Essay draft versions (Draft 1, 2, 3, …) — point-in-time snapshots
// -----------------------------------------------------
router.get("/me/essays/:id/drafts", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  try {
    const [[essay]] = await pool.query("SELECT id FROM essays WHERE id = ? AND student_id = ?", [id, studentId]);
    if (!essay) return res.status(404).json({ error: "Essay not found" });
    const [rows] = await pool.query(
      "SELECT id, draft_no, content, word_count, created_at FROM essay_drafts WHERE essay_id = ? AND student_id = ? ORDER BY draft_no ASC",
      [id, studentId]
    );
    return res.json(rows);
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return res.json([]);
    throw err;
  }
});

router.post("/me/essays/:id/drafts", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  const { content } = req.body || {};
  try {
    const [[essay]] = await pool.query("SELECT id FROM essays WHERE id = ? AND student_id = ?", [id, studentId]);
    if (!essay) return res.status(404).json({ error: "Essay not found" });
    const [[{ maxNo }]] = await pool.query("SELECT COALESCE(MAX(draft_no), 0) AS maxNo FROM essay_drafts WHERE essay_id = ?", [id]);
    const draftNo = maxNo + 1;
    const wordCount = content ? content.replace(/<[^>]*>/g, "").split(/\s+/).filter((w) => w.length > 0).length : 0;
    const [result] = await pool.query(
      "INSERT INTO essay_drafts (essay_id, student_id, draft_no, content, word_count) VALUES (?, ?, ?, ?, ?)",
      [id, studentId, draftNo, content || "", wordCount]
    );
    return res.json({ id: result.insertId, draft_no: draftNo, word_count: wordCount });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({ error: "Database migration required. Run alter_phase3_drafts.sql" });
    }
    throw err;
  }
});

router.delete("/me/essays/:id/drafts/:draftId", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id, draftId } = req.params;
  await pool.query("DELETE FROM essay_drafts WHERE id = ? AND essay_id = ? AND student_id = ?", [draftId, id, studentId]);
  return res.json({ status: "deleted" });
});

// =====================================================
// Tasks (application checklist / deadlines)
// =====================================================
router.get("/me/tasks", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  try {
    const [rows] = await pool.query(
      "SELECT * FROM tasks WHERE student_id = ? ORDER BY status, due_date, sort_order, id",
      [studentId]
    );
    return res.json(rows);
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({ error: "Database migration required. Run alter_full_expansion.sql" });
    }
    throw err;
  }
});

router.post("/me/tasks", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { title, due_date, category, notes } = req.body || {};
  if (!title) return res.status(400).json({ error: "title required" });
  try {
    const [r] = await pool.query(
      "INSERT INTO tasks (student_id, title, due_date, category, notes) VALUES (?, ?, ?, ?, ?)",
      [studentId, title, due_date || null, category || "general", notes || null]
    );
    return res.json({ id: r.insertId });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({ error: "Database migration required. Run alter_full_expansion.sql" });
    }
    throw err;
  }
});

router.put("/me/tasks/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  const { title, due_date, category, status, notes } = req.body || {};
  await pool.query(
    "UPDATE tasks SET title = COALESCE(?, title), due_date = ?, category = COALESCE(?, category), status = COALESCE(?, status), notes = ? WHERE id = ? AND student_id = ?",
    [title || null, due_date || null, category || null, status || null, notes || null, id, studentId]
  );
  return res.json({ status: "ok" });
});

router.delete("/me/tasks/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  await pool.query("DELETE FROM tasks WHERE id = ? AND student_id = ?", [req.params.id, studentId]);
  return res.json({ status: "deleted" });
});

// =====================================================
// Saved universities (the student's college list)
// =====================================================
router.get("/me/saved-universities", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  try {
    const [rows] = await pool.query(
      `SELECT su.*, u.name, u.country, u.city, u.selectivity_band, u.major_tags
       FROM saved_universities su
       JOIN universities u ON su.university_id = u.id
       WHERE su.student_id = ?
       ORDER BY FIELD(bucket, 'reach', 'target', 'safety'), su.deadline, u.name`,
      [studentId]
    );
    return res.json(rows);
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({ error: "Database migration required. Run alter_full_expansion.sql" });
    }
    throw err;
  }
});

router.post("/me/saved-universities", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { university_id, bucket, application_round, deadline, notes } = req.body || {};
  if (!university_id) return res.status(400).json({ error: "university_id required" });
  try {
    const [r] = await pool.query(
      `INSERT INTO saved_universities (student_id, university_id, bucket, application_round, deadline, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE bucket = VALUES(bucket), application_round = VALUES(application_round), deadline = VALUES(deadline), notes = VALUES(notes)`,
      [studentId, university_id, bucket || "target", application_round || "", deadline || null, notes || null]
    );
    return res.json({ id: r.insertId, status: "ok" });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.status(400).json({ error: "Database migration required. Run alter_full_expansion.sql" });
    }
    throw err;
  }
});

router.put("/me/saved-universities/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const { id } = req.params;
  const { bucket, application_round, deadline, notes } = req.body || {};
  await pool.query(
    "UPDATE saved_universities SET bucket = COALESCE(?, bucket), application_round = ?, deadline = ?, notes = ? WHERE id = ? AND student_id = ?",
    [bucket || null, application_round || "", deadline || null, notes || null, id, studentId]
  );
  return res.json({ status: "ok" });
});

router.delete("/me/saved-universities/:id", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  await pool.query("DELETE FROM saved_universities WHERE id = ? AND student_id = ?", [req.params.id, studentId]);
  return res.json({ status: "deleted" });
});

// =====================================================
// Portfolio share token (read-only public link)
// =====================================================
router.post("/me/share-token", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const token = crypto.randomBytes(24).toString("hex");
  const expiresInDays = Number(req.body?.expires_in_days || 30);
  const expiresAt = new Date(Date.now() + expiresInDays * 86400000);
  try {
    await pool.query(
      "UPDATE students SET share_token = ?, share_expires_at = ? WHERE id = ?",
      [token, expiresAt, studentId]
    );
    return res.json({ token, expires_at: expiresAt });
  } catch (err) {
    if (err.code === "ER_BAD_FIELD_ERROR") {
      return res.status(400).json({ error: "Database migration required. Run alter_full_expansion.sql" });
    }
    throw err;
  }
});

router.delete("/me/share-token", authRequired, async (req, res) => {
  const studentId = await getStudentIdByUser(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  await pool.query("UPDATE students SET share_token = NULL, share_expires_at = NULL WHERE id = ?", [studentId]);
  return res.json({ status: "revoked" });
});

// Public read-only portfolio (NO auth)
router.get("/public/:token", async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 16) return res.status(404).json({ error: "Not found" });
  try {
    const [[student]] = await pool.query(
      `SELECT s.id, s.grade_level, s.school, s.target_countries, s.intended_major, s.class_rank, s.bio,
              u.name, s.share_expires_at
       FROM students s JOIN users u ON s.user_id = u.id
       WHERE s.share_token = ? AND (s.share_expires_at IS NULL OR s.share_expires_at > NOW())`,
      [token]
    );
    if (!student) return res.status(404).json({ error: "Not found or expired" });
    const sid = student.id;
    const [[academics], [tests], [activities], [awards]] = await Promise.all([
      pool.query("SELECT * FROM academic_records WHERE student_id = ? ORDER BY year DESC", [sid]),
      pool.query("SELECT * FROM test_scores WHERE student_id = ? ORDER BY test_date DESC", [sid]),
      pool.query("SELECT * FROM activities WHERE student_id = ? ORDER BY start_date DESC", [sid]),
      pool.query("SELECT * FROM awards WHERE student_id = ? ORDER BY award_date DESC", [sid])
    ]);
    delete student.id;
    return res.json({
      profile: student,
      academics,
      tests,
      activities,
      awards
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load shared portfolio" });
  }
});

module.exports = router;
