const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { extractText } = require("./knowledge");

// Turns a student's uploaded documents into Claude content blocks so MEPAi can read the
// actual files (a recommendation letter, a portfolio PDF, a photo of a certificate)
// instead of advising from the file names. PDFs go in as documents and pictures as
// images, so Claude sees scanned pages and layout too; Word and text files go in as text.

const UPLOAD_DIR = path.join(__dirname, "..", "..", process.env.UPLOAD_DIR || "uploads");
const MAX_FILES = 6;
// Files go to the API base64-encoded, which is 4/3 the size on disk; the limits below are
// on the encoded size. The API takes 5MB per image and 32MB per request.
const b64 = (bytes) => Math.ceil(bytes / 3) * 4;
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 22 * 1024 * 1024;
const MAX_TEXT_CHARS = 20000;
const IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };

const diskPath = (filePath) => path.join(UPLOAD_DIR, path.basename(String(filePath || "")));

// → { blocks: [content blocks], included: [names], skipped: [{ name, reason }] }
async function fileBlocksFor(studentId, category) {
  const [docs] = await pool.query(
    "SELECT id, file_path, original_name FROM documents WHERE student_id = ? AND category = ? ORDER BY uploaded_at DESC",
    [studentId, category]
  );
  const blocks = [];
  const included = [];
  const skipped = [];
  let total = 0;

  for (const d of docs) {
    const name = d.original_name || path.basename(d.file_path);
    if (included.length >= MAX_FILES) { skipped.push({ name, reason: `only the ${MAX_FILES} newest files are read` }); continue; }
    const file = diskPath(d.file_path);
    let size;
    try { size = fs.statSync(file).size; } catch { skipped.push({ name, reason: "file is missing" }); continue; }
    const ext = path.extname(name || file).toLowerCase();

    try {
      if (ext === ".pdf") {
        if (b64(size) > MAX_PDF_BYTES || total + b64(size) > MAX_TOTAL_BYTES) { skipped.push({ name, reason: "too large to read" }); continue; }
        blocks.push({ type: "document", title: name, source: { type: "base64", media_type: "application/pdf", data: fs.readFileSync(file).toString("base64") } });
        total += b64(size);
      } else if (IMAGE_TYPES[ext]) {
        if (b64(size) > MAX_IMAGE_BYTES || total + b64(size) > MAX_TOTAL_BYTES) { skipped.push({ name, reason: "image is larger than 3.7MB" }); continue; }
        blocks.push({ type: "text", text: `Image file: ${name}` });
        blocks.push({ type: "image", source: { type: "base64", media_type: IMAGE_TYPES[ext], data: fs.readFileSync(file).toString("base64") } });
        total += b64(size);
      } else if ([".docx", ".txt", ".md"].includes(ext)) {
        const text = String(await extractText(file, name) || "").trim();
        if (!text) { skipped.push({ name, reason: "no readable text" }); continue; }
        blocks.push({ type: "document", title: name, source: { type: "text", media_type: "text/plain", data: text.slice(0, MAX_TEXT_CHARS) } });
        total += Math.min(text.length, MAX_TEXT_CHARS);
      } else {
        skipped.push({ name, reason: "file type can't be read (use PDF, Word, or an image)" });
        continue;
      }
      included.push(name);
    } catch (err) {
      skipped.push({ name, reason: "couldn't be opened" });
    }
  }
  return { blocks, included, skipped };
}

// Plain-text excerpts of a student's documents, for advice that covers many files at once
// (Documents overview) and so shouldn't send every PDF in full.
async function documentExcerpts(studentId, categories, perFile = 1500) {
  const [docs] = await pool.query(
    `SELECT category, file_path, original_name FROM documents WHERE student_id = ? AND category IN (?) ORDER BY uploaded_at DESC LIMIT 12`,
    [studentId, categories]
  );
  const out = [];
  for (const d of docs) {
    const name = d.original_name || path.basename(d.file_path);
    let text = "";
    try {
      if (/\.(pdf|docx|txt|md)$/i.test(name)) text = String(await extractText(diskPath(d.file_path), name) || "").replace(/\s+/g, " ").trim();
    } catch { /* unreadable — listed by name only */ }
    out.push({ category: d.category, name, excerpt: text.slice(0, perFile) });
  }
  return out;
}

module.exports = { fileBlocksFor, documentExcerpts };
