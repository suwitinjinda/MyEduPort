const pool = require("../db");

// The student's GPA on a 4.0 scale from the grades in Portfolio → Academics (letter grades,
// or IB 1–7), the same conversion the dashboard uses. null when no usable grades yet.
async function academicGpa(userId) {
  const [rows] = await pool.query(
    "SELECT a.grade FROM academic_records a JOIN students s ON s.id = a.student_id WHERE s.user_id = ?",
    [userId]
  );
  const LETTER = { "A+": 4.0, A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7, "C+": 2.3, C: 2.0, "C-": 1.7, "D+": 1.3, D: 1.0, "D-": 0.7, F: 0.0 };
  const IB = { 7: 4.0, 6: 3.7, 5: 3.3, 4: 3.0, 3: 2.0, 2: 1.0, 1: 0.0 };
  const points = [];
  for (const r of rows) {
    const g = String(r.grade || "").trim().toUpperCase();
    if (g in LETTER) points.push(LETTER[g]);
    else if (/^[1-7]$/.test(g)) points.push(IB[g]);
  }
  if (!points.length) return null;
  return { value: Math.round((points.reduce((a, b) => a + b, 0) / points.length) * 100) / 100, subjects: points.length };
}

module.exports = { academicGpa };
