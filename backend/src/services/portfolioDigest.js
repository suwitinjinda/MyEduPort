const pool = require("../db");
const { academicGpa } = require("./gpa");

// mysql2 returns DATE columns as Date objects; take the year either way
const yearOf = (d) => { if (!d) return ""; const y = new Date(d).getUTCFullYear(); return Number.isFinite(y) ? String(y) : ""; };

// A compact, factual write-up of a student's actual portfolio for MEPAi assessments
// (Portfolio Score, Acceptance Prediction) — the real grades, tests, activities, awards and
// essays, not just how many of each. Kept short so it fits comfortably in a prompt.
async function portfolioDigest(userId) {
  const q = async (sql, params) => { try { const [r] = await pool.query(sql, params); return r; } catch { return []; } };
  const [st] = await q("SELECT id, grade_level, school, curriculum, intended_major, target_countries, intended_universities, class_rank FROM students WHERE user_id = ?", [userId]);
  if (!st) return "";
  const lines = [];
  const gpa = await academicGpa(userId);
  lines.push(`Grade: ${st.grade_level || "unknown"} · School: ${st.school || "unknown"} · Curriculum: ${st.curriculum || "unknown"}`);
  lines.push(`Intended major(s): ${st.intended_major || "unknown"} · Target countries: ${st.target_countries || "unknown"}`);
  const unis = String(st.intended_universities || "").split("|").map((x) => x.trim()).filter(Boolean);
  if (unis.length) lines.push(`Intended universities: ${unis.join(", ")}`);
  lines.push(`GPA (4.0 scale, from recorded grades): ${gpa ? `${gpa.value} over ${gpa.subjects} subjects` : "no grades recorded"} · Class rank: ${st.class_rank || "not given"}`);

  const acad = await q("SELECT year, course, grade FROM academic_records WHERE student_id = ? ORDER BY year, course LIMIT 40", [st.id]);
  if (acad.length) lines.push(`Subjects and grades: ${acad.map((a) => `${a.course || "?"} ${a.grade || "?"}${a.year ? ` (${a.year})` : ""}`).join("; ")}`);

  const tests = await q("SELECT test_type, score, superscore, test_date FROM test_scores WHERE student_id = ? LIMIT 10", [st.id]);
  lines.push(`Tests: ${tests.length ? tests.map((t) => `${t.test_type} ${t.superscore || t.score || "?"}`).join("; ") : "none recorded"}`);

  const acts = await q("SELECT title, role, category, hours_per_week, leadership, start_date, end_date, description, ai_score FROM activities WHERE student_id = ? LIMIT 10", [st.id]);
  lines.push(`Activities (${acts.length}):${acts.length ? "" : " none"}`);
  for (const a of acts) {
    const span = a.start_date ? ` ${yearOf(a.start_date)}–${a.end_date ? yearOf(a.end_date) : "now"}` : "";
    lines.push(`- ${a.title || "Untitled"}${a.role ? ` — ${a.role}` : ""}${a.category ? ` [${a.category}]` : ""}${a.hours_per_week ? `, ${a.hours_per_week} hrs/wk` : ""}${a.leadership ? ", leadership" : ""}${span}${a.description ? `: ${String(a.description).slice(0, 160)}` : ""}`);
  }

  const awards = await q("SELECT title, description, award_date FROM awards WHERE student_id = ? LIMIT 10", [st.id]);
  lines.push(`Awards (${awards.length}):${awards.length ? "" : " none"}`);
  for (const w of awards) lines.push(`- ${w.title || "Award"}${w.award_date ? ` (${yearOf(w.award_date)})` : ""}${w.description ? `: ${String(w.description).slice(0, 140)}` : ""}`);

  const essays = await q("SELECT title, status, word_count, ai_score FROM essays WHERE student_id = ? LIMIT 6", [st.id]);
  lines.push(`Essays (${essays.length}):${essays.length ? "" : " none"}`);
  for (const e of essays) lines.push(`- "${e.title || "Untitled"}" — ${e.word_count || 0} words, ${e.status || "draft"}${e.ai_score != null ? `, MEPAi essay score ${e.ai_score}/100` : ""}`);

  const docs = await q("SELECT category, COUNT(*) n FROM documents WHERE student_id = ? GROUP BY category", [st.id]);
  const rec = docs.find((d) => d.category === "recommendation");
  lines.push(`Recommendation letters uploaded: ${rec ? rec.n : 0}`);
  return lines.join("\n");
}

module.exports = { portfolioDigest };
