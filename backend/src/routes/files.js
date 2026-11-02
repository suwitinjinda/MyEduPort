const express = require("express");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

// Students' uploaded files (certificates, exported portfolios, activity photos). These are
// private: only the student, a parent or counselor linked to them, or an admin may read one.
// Stored paths stay "/uploads/<name>"; the frontend fetches them here with its token.
// Blog and email images (blog-*, email-*) are the only files still served openly at /uploads.

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "..", process.env.UPLOAD_DIR || "uploads");
const PUBLIC_FILE = /^(blog|email)-[\w.-]+$/;

// Types a browser may show inline. Anything else (.html, .svg, .xml …) is sent as an opaque
// download, so a file a student uploaded can never run script for whoever opens it.
const INLINE_TYPES = {
  ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".mp4": "video/mp4", ".mov": "video/quicktime",
  ".webm": "video/webm", ".txt": "text/plain; charset=utf-8"
};

const isAdmin = (user) => user.role === "admin" || (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL);

async function canRead(user, studentId) {
  if (isAdmin(user)) return true;
  const [[row]] = await pool.query(
    `SELECT 1 FROM students s WHERE s.id = ? AND (
       s.user_id = ?
       OR EXISTS (SELECT 1 FROM parent_student_links l JOIN parents p ON p.id = l.parent_id
                  WHERE l.student_id = s.id AND p.user_id = ?)
       OR EXISTS (SELECT 1 FROM counselor_student_links l JOIN counselors c ON c.id = l.counselor_id
                  WHERE l.student_id = s.id AND c.user_id = ?)
     )`,
    [studentId, user.id, user.id, user.id]
  );
  return !!row;
}

router.get("/:name", authRequired, async (req, res) => {
  const name = path.basename(String(req.params.name || ""));
  const full = path.join(uploadDir, name);
  const notFound = () => res.status(404).json({ error: "File not found" });
  if (!name || name.startsWith(".") || !fs.existsSync(full)) return notFound();

  let original = name;
  if (!PUBLIC_FILE.test(name)) {
    const [docs] = await pool.query("SELECT student_id, original_name FROM documents WHERE file_path = ?", [`/uploads/${name}`]);
    let allowed = docs.length === 0 ? isAdmin(req.user) : false; // a file no row points at: admins only
    for (const d of docs) {
      if (await canRead(req.user, d.student_id)) { allowed = true; original = d.original_name || name; break; }
    }
    if (!allowed) return notFound(); // 404, not 403: don't confirm the file exists
  }

  const type = INLINE_TYPES[path.extname(name).toLowerCase()];
  res.set("Cache-Control", "private, no-store");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox");
  res.set("Content-Type", type || "application/octet-stream");
  res.set("Content-Disposition", `${type ? "inline" : "attachment"}; filename="${original.replace(/[^\w.\- ]+/g, "_")}"; filename*=UTF-8''${encodeURIComponent(original)}`);
  res.sendFile(full, { headers: { "Content-Type": type || "application/octet-stream" } });
});

module.exports = router;
module.exports.PUBLIC_FILE = PUBLIC_FILE;
