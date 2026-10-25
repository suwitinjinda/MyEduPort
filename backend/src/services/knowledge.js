const fs = require("fs");
const path = require("path");
const pool = require("../db");

// Admin → Machine Learning: a knowledge base the AI reads as shared context (retrieval-
// augmented generation). Documents are split into chunks and FULLTEXT-indexed in MySQL;
// before an AI call, the chunks most relevant to the request are retrieved and added to
// the prompt. Nothing is "trained" — adding/removing a document takes effect immediately.

const CHUNK_SIZE = 1200;   // characters per chunk
const CHUNK_OVERLAP = 150; // carried over so a sentence split across chunks stays findable

async function extractText(filePath, originalName = "") {
  const ext = path.extname(originalName || filePath).toLowerCase();
  if (ext === ".pdf") {
    const pdfParse = require("pdf-parse/lib/pdf-parse.js"); // lib path skips the package's debug self-test
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text || "";
  }
  if (ext === ".docx") {
    const mammoth = require("mammoth");
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value || "";
  }
  if ([".txt", ".md", ".csv"].includes(ext)) return fs.readFileSync(filePath, "utf8");
  throw new Error("Unsupported file type — upload PDF, DOCX, TXT, MD or CSV.");
}

function chunkText(text) {
  const clean = String(text || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const paras = clean.split(/\n\s*\n/);
  const chunks = [];
  let cur = "";
  const push = () => { if (cur.trim().length > 40) chunks.push(cur.trim()); };
  for (const p of paras) {
    if ((cur + "\n\n" + p).length <= CHUNK_SIZE) { cur = cur ? `${cur}\n\n${p}` : p; continue; }
    push();
    if (p.length <= CHUNK_SIZE) { cur = (cur.slice(-CHUNK_OVERLAP) + "\n\n" + p).trim(); continue; }
    // very long paragraph: hard-split on sentence boundaries
    let rest = p;
    while (rest.length > CHUNK_SIZE) {
      let cut = rest.lastIndexOf(". ", CHUNK_SIZE);
      if (cut < CHUNK_SIZE * 0.5) cut = CHUNK_SIZE;
      chunks.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(Math.max(0, cut + 1 - CHUNK_OVERLAP));
    }
    cur = rest;
  }
  push();
  return chunks;
}

async function ingestText(docId, text) {
  const chunks = chunkText(text);
  if (!chunks.length) throw new Error("No readable text found (scanned PDFs need OCR first).");
  await pool.query("DELETE FROM kb_chunks WHERE doc_id = ?", [docId]);
  for (let i = 0; i < chunks.length; i += 200) {
    await pool.query("INSERT INTO kb_chunks (doc_id, idx, content) VALUES ?", [chunks.slice(i, i + 200).map((c, j) => [docId, i + j, c])]);
  }
  await pool.query("UPDATE kb_documents SET status = 'ready', chars = ?, chunk_count = ?, error = NULL WHERE id = ?", [text.length, chunks.length, docId]);
  return chunks.length;
}

// Natural-language FULLTEXT search over enabled documents → [{ doc_id, title, source, content, score }]
async function searchKb(query, k = 5) {
  const q = String(query || "")
    .replace(/[{}"<>\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 80)
    .join(" ");
  if (!q) return [];
  try {
    const [rows] = await pool.query(
      `SELECT c.doc_id, d.title, d.source, c.content, MATCH(c.content) AGAINST (? IN NATURAL LANGUAGE MODE) AS score
       FROM kb_chunks c JOIN kb_documents d ON d.id = c.doc_id
       WHERE d.enabled = 1 AND d.status = 'ready' AND MATCH(c.content) AGAINST (? IN NATURAL LANGUAGE MODE)
       ORDER BY score DESC LIMIT ?`,
      [q, q, k]
    );
    return rows;
  } catch (err) { return []; } // tables missing → no extra context
}

// Prompt block with the most relevant knowledge-base passages (empty string if none)
async function kbContextFor(query, { k = 4, maxChars = 3500 } = {}) {
  const hits = await searchKb(query, k);
  if (!hits.length) return "";
  let used = 0;
  const parts = [];
  for (const h of hits) {
    const text = h.content.slice(0, Math.max(0, maxChars - used));
    if (!text) break;
    used += text.length;
    parts.push(`[${parts.length + 1}] ${h.title}${h.source ? ` (${h.source})` : ""}\n${text}`);
  }
  return `\n\nREFERENCE MATERIAL from MyEduPort's knowledge base (curated by the MyEduPort team). Use it when it is relevant; prefer it over general knowledge if they conflict; never invent sources or statistics beyond it:\n${parts.join("\n\n")}`;
}

// Snapshot of a student's profile at the moment they report an application result
async function profileSnapshot(studentId) {
  const q = async (sql) => { try { const [r] = await pool.query(sql, [studentId]); return r; } catch { return []; } };
  const [st] = await q("SELECT grade_level, intended_major, curriculum, class_rank FROM students WHERE id = ?");
  const academics = await q("SELECT grade FROM academic_records WHERE student_id = ?");
  const gm = { "A+": 4, A: 4, "A-": 3.7, "B+": 3.3, B: 3, "B-": 2.7, "C+": 2.3, C: 2, "C-": 1.7, D: 1, F: 0 };
  const ib = { 7: 4, 6: 3.7, 5: 3.3, 4: 3, 3: 2, 2: 1, 1: 0 };
  const pts = academics.map((r) => gm[r.grade] ?? ib[parseInt(r.grade, 10)]).filter((v) => v != null);
  const tests = await q("SELECT test_type, score, superscore FROM test_scores WHERE student_id = ?");
  const [acts] = await q("SELECT COUNT(*) n, SUM(leadership) lead FROM activities WHERE student_id = ?");
  const [aw] = await q("SELECT COUNT(*) n FROM awards WHERE student_id = ?");
  return {
    grade_level: st?.grade_level || "",
    intended_major: st?.intended_major || "",
    curriculum: st?.curriculum || "",
    class_rank: st?.class_rank || "",
    gpa: pts.length ? Math.round((pts.reduce((a, b) => a + b, 0) / pts.length) * 100) / 100 : null,
    courses: academics.length,
    tests: tests.map((t) => `${t.test_type} ${t.superscore || t.score}`).slice(0, 8),
    activities: Number(acts?.n || 0),
    leadership_roles: Number(acts?.lead || 0),
    awards: Number(aw?.n || 0)
  };
}

// "Past MyEduPort applicants" evidence for the given universities (names), as prompt text
async function outcomesContextFor(universityNames = []) {
  const names = [...new Set(universityNames.filter(Boolean))].slice(0, 15);
  if (!names.length) return "";
  try {
    const [rows] = await pool.query(
      `SELECT university_name, result, profile_snapshot FROM admission_outcomes WHERE university_name IN (?)`,
      [names]
    );
    if (!rows.length) return "";
    const by = {};
    for (const r of rows) {
      const b = (by[r.university_name] = by[r.university_name] || { total: 0, admitted: 0, waitlisted: 0, rejected: 0, gpas: [], acts: [] });
      b.total++;
      if (r.result === "admitted" || r.result === "enrolled") b.admitted++;
      else if (r.result === "waitlisted" || r.result === "deferred") b.waitlisted++;
      else if (r.result === "rejected") b.rejected++;
      const snap = typeof r.profile_snapshot === "string" ? JSON.parse(r.profile_snapshot || "{}") : (r.profile_snapshot || {});
      if ((r.result === "admitted" || r.result === "enrolled") && snap.gpa) b.gpas.push(snap.gpa);
      if ((r.result === "admitted" || r.result === "enrolled") && snap.activities != null) b.acts.push(snap.activities);
    }
    const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : "n/a");
    const lines = Object.entries(by).map(([u, b]) =>
      `- ${u}: ${b.total} MyEduPort applicant(s) — ${b.admitted} admitted, ${b.waitlisted} waitlisted/deferred, ${b.rejected} rejected; admitted students' avg GPA ${avg(b.gpas)}, avg activities ${avg(b.acts)}`
    );
    return `\n\nPAST MYEDUPORT APPLICANT RESULTS (real outcomes reported on the platform; small samples — use as supporting evidence, not as a rule):\n${lines.join("\n")}`;
  } catch (err) { return ""; }
}

module.exports = { extractText, chunkText, ingestText, searchKb, kbContextFor, profileSnapshot, outcomesContextFor };
