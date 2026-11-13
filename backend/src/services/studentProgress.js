const pool = require("../db");

// How far along a student is — shared by the Parent and Counsellor dashboards so both
// show the same completion %, recent activity and deadlines.

// SQL columns a row needs for completion(): profile fields + the five counts
const PROGRESS_COLUMNS = `s.grade_level, s.school, s.target_countries, s.intended_major,
  (SELECT COUNT(*) FROM academic_records ar WHERE ar.student_id = s.id) AS academics_count,
  (SELECT COUNT(*) FROM test_scores ts WHERE ts.student_id = s.id) AS tests_count,
  (SELECT COUNT(*) FROM activities ac WHERE ac.student_id = s.id) AS activities_count,
  (SELECT COUNT(*) FROM awards aw WHERE aw.student_id = s.id) AS awards_count,
  (SELECT COUNT(*) FROM documents d WHERE d.student_id = s.id) AS documents_count`;

function completion(row) {
  const profileFields = ["grade_level", "school", "target_countries", "intended_major"];
  const profileScore = profileFields.filter((f) => row[f]).length / profileFields.length;
  const dataScore =
    Math.min(1, row.academics_count / 4) * 0.3 +
    Math.min(1, row.tests_count / 2) * 0.2 +
    Math.min(1, row.activities_count / 4) * 0.3 +
    Math.min(1, row.awards_count / 2) * 0.1 +
    Math.min(1, row.documents_count / 3) * 0.1;
  return Math.round((profileScore * 0.4 + dataScore * 0.6) * 100);
}

const safe = async (sql, params) => { try { const [r] = await pool.query(sql, params); return r; } catch { return []; } };

// What the student did lately, plus their next open deadlines (newest first)
async function recentActivity(studentId) {
  const q = (sql) => safe(sql, [studentId]);
  const items = [
    ...(await q("SELECT title, created_at AS at FROM activities WHERE student_id = ? ORDER BY created_at DESC LIMIT 3")).map((r) => ({ kind: "activity", text: `Added an activity: ${r.title || "untitled"}`, at: r.at })),
    ...(await q("SELECT title, created_at AS at FROM awards WHERE student_id = ? ORDER BY created_at DESC LIMIT 3")).map((r) => ({ kind: "award", text: `Added an award: ${r.title || "untitled"}`, at: r.at })),
    ...(await q("SELECT title, last_edited_at AS at FROM essays WHERE student_id = ? ORDER BY last_edited_at DESC LIMIT 3")).map((r) => ({ kind: "essay", text: `Worked on an essay: ${r.title || "Untitled"}`, at: r.at })),
    ...(await q("SELECT course, grade, created_at AS at FROM academic_records WHERE student_id = ? ORDER BY created_at DESC LIMIT 2")).map((r) => ({ kind: "academic", text: `Added a grade: ${r.course || "subject"}${r.grade ? ` (${r.grade})` : ""}`, at: r.at })),
    ...(await q("SELECT test_type, score, created_at AS at FROM test_scores WHERE student_id = ? ORDER BY created_at DESC LIMIT 2")).map((r) => ({ kind: "test", text: `Added a test score: ${r.test_type}${r.score ? ` ${r.score}` : ""}`, at: r.at })),
    ...(await q("SELECT original_name, uploaded_at AS at FROM documents WHERE student_id = ? ORDER BY uploaded_at DESC LIMIT 2")).map((r) => ({ kind: "document", text: `Uploaded a document: ${r.original_name || "file"}`, at: r.at }))
  ].filter((x) => x.at);
  const upcoming = (await q("SELECT title, due_date FROM tasks WHERE student_id = ? AND status <> 'done' AND due_date >= CURDATE() ORDER BY due_date LIMIT 3"))
    .map((t) => ({ kind: "deadline", text: `Due: ${t.title}`, at: t.due_date, upcoming: true }));
  return [...upcoming, ...items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6)];
}

// The last time the student changed anything in their portfolio (null = never)
async function lastActive(studentId) {
  const rows = await safe(
    `SELECT GREATEST(
       COALESCE((SELECT MAX(created_at) FROM activities WHERE student_id = ?), '1970-01-01'),
       COALESCE((SELECT MAX(created_at) FROM awards WHERE student_id = ?), '1970-01-01'),
       COALESCE((SELECT MAX(last_edited_at) FROM essays WHERE student_id = ?), '1970-01-01'),
       COALESCE((SELECT MAX(created_at) FROM academic_records WHERE student_id = ?), '1970-01-01'),
       COALESCE((SELECT MAX(created_at) FROM test_scores WHERE student_id = ?), '1970-01-01'),
       COALESCE((SELECT MAX(uploaded_at) FROM documents WHERE student_id = ?), '1970-01-01'),
       COALESCE((SELECT MAX(created_at) FROM tasks WHERE student_id = ?), '1970-01-01'),
       COALESCE((SELECT created_at FROM students WHERE id = ?), '1970-01-01')
     ) AS at`,
    Array(8).fill(studentId)
  );
  const at = rows[0]?.at ? new Date(rows[0].at) : null;
  return at && at.getFullYear() > 1970 ? at : null;
}

// Open tasks and university deadlines still ahead (or overdue tasks)
async function deadlines(studentId) {
  const tasks = await safe("SELECT id, title, due_date, status FROM tasks WHERE student_id = ? AND status <> 'done' AND due_date IS NOT NULL ORDER BY due_date", [studentId]);
  const unis = await safe(
    `SELECT su.deadline, su.application_round, u.name FROM saved_universities su JOIN universities u ON u.id = su.university_id
     WHERE su.student_id = ? AND su.deadline IS NOT NULL AND su.deadline >= CURDATE() ORDER BY su.deadline`, [studentId]);
  return [
    ...tasks.map((t) => ({ kind: "task", title: t.title, date: t.due_date })),
    ...unis.map((u) => ({ kind: "university", title: `${u.name}${u.application_round ? ` — ${u.application_round}` : ""}`, date: u.deadline }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = { PROGRESS_COLUMNS, completion, recentActivity, lastActive, deadlines };
