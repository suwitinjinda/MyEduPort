const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const mammoth = require("mammoth");
const sanitizeHtml = require("sanitize-html");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

// Admission Resources blog. Admins write posts in Admin → Blog (or import a Word file);
// everyone can read published posts.
//   public: mounted at /api/blog        — list published posts, read one
//   admin:  mounted at /api/admin/blog  — create / edit / delete, images, .docx import

const CATEGORIES = ["articles", "university", "scholarship", "practice-tests", "ebooks"];
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/;

const uploadDir = path.join(__dirname, "..", "..", process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const newImageName = (ext) => `blog-${Date.now()}-${crypto.randomBytes(5).toString("hex")}${ext}`;
const IMAGE_EXT = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp" };

// Admin-written HTML is still cleaned before it is stored: posts are shown to every visitor,
// so a pasted script or tracking iframe must never make it onto the page.
const clean = (html) => sanitizeHtml(String(html || ""), {
  allowedTags: ["h2", "h3", "h4", "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li",
    "blockquote", "a", "img", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td", "hr", "span", "div"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    td: ["colspan", "rowspan"], th: ["colspan", "rowspan"],
    "*": ["style"]
  },
  allowedStyles: {
    "*": {
      "text-align": [/^(left|right|center|justify)$/],
      color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
      "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/]
    }
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  // Word headings start at h1, but the page title is already the h1.
  transformTags: {
    h1: "h2",
    a: (tag, attribs) => ({ tagName: "a", attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" } })
  },
  exclusiveFilter: (frame) => frame.tag === "img" && !/^(\/uploads\/blog-[\w.-]+|https:\/\/)/.test(frame.attribs.src || "")
});

// Plain text for titles and summaries. The sanitiser keeps entities (&amp;), which React
// would then show literally, so they're decoded here.
const decodeEntities = (s) => s
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");
const textOf = (html) => decodeEntities(sanitizeHtml(html || "", { allowedTags: [], allowedAttributes: {} })).replace(/\s+/g, " ").trim();
const makeExcerpt = (html) => {
  const t = textOf(html);
  return t.length > 220 ? `${t.slice(0, 217).replace(/\s+\S*$/, "")}…` : t;
};
const toSlug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
const firstImage = (html) => (String(html || "").match(/<img[^>]+src="([^"]+)"/) || [])[1] || null;

// ------------------------------------------------------------------ public

const publicRouter = express.Router();

publicRouter.get("/", async (req, res) => {
  const cat = CATEGORIES.includes(req.query.category) ? req.query.category : null;
  const [rows] = await pool.query(
    `SELECT id, category, slug, title, excerpt, cover_image, published_at
       FROM blog_posts WHERE status = 'published' ${cat ? "AND category = ?" : ""}
      ORDER BY published_at DESC, id DESC LIMIT 200`,
    cat ? [cat] : []
  );
  res.json({ categories: CATEGORIES, posts: rows });
});

publicRouter.get("/:slug", async (req, res) => {
  const [[post]] = await pool.query(
    "SELECT id, category, slug, title, excerpt, cover_image, body_html, published_at, updated_at FROM blog_posts WHERE slug = ? AND status = 'published'",
    [String(req.params.slug || "").toLowerCase()]
  );
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

// ------------------------------------------------------------------ admin

const adminRouter = express.Router();
const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL || user.role === "admin";
adminRouter.use(authRequired, (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: "Admin only" })));

adminRouter.get("/", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, category, slug, title, excerpt, cover_image, status, published_at, updated_at FROM blog_posts ORDER BY COALESCE(published_at, created_at) DESC, id DESC"
  );
  res.json({ categories: CATEGORIES, posts: rows });
});

adminRouter.get("/:id", async (req, res) => {
  const [[post]] = await pool.query("SELECT * FROM blog_posts WHERE id = ?", [req.params.id]);
  if (!post) return res.status(404).json({ error: "Not found" });
  res.json(post);
});

function validate(body) {
  const title = String(body.title || "").trim().slice(0, 200);
  if (!title) return { error: "Give the post a title" };
  if (!CATEGORIES.includes(body.category)) return { error: "Choose a section" };
  const slug = String(body.slug || "").trim().toLowerCase() || toSlug(title);
  if (!SLUG_RE.test(slug)) return { error: "Link name: lowercase English letters, numbers and dashes only (e.g. why-study-in-asia)" };
  const body_html = clean(body.body_html);
  if (!textOf(body_html) && !/<img/.test(body_html)) return { error: "The post is empty" };
  const status = body.status === "published" ? "published" : "draft";
  const cover = String(body.cover_image || "").trim();
  const cover_image = /^(\/uploads\/blog-[\w.-]+|https:\/\/\S+)$/.test(cover) ? cover.slice(0, 500) : firstImage(body_html);
  const excerpt = String(body.excerpt || "").trim().slice(0, 400) || makeExcerpt(body_html);
  return { out: { title, category: body.category, slug, body_html, status, cover_image, excerpt } };
}

const dupError = (res, slug) => res.status(409).json({ error: `Another post already uses the link name "${slug}"` });

adminRouter.post("/", async (req, res) => {
  const { error, out } = validate(req.body || {});
  if (error) return res.status(400).json({ error });
  try {
    const [r] = await pool.query(
      `INSERT INTO blog_posts (category, slug, title, excerpt, cover_image, body_html, status, published_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [out.category, out.slug, out.title, out.excerpt, out.cover_image, out.body_html, out.status, out.status === "published" ? new Date() : null, req.user.id]
    );
    res.json({ id: r.insertId, slug: out.slug });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return dupError(res, out.slug);
    throw err;
  }
});

adminRouter.put("/:id", async (req, res) => {
  const { error, out } = validate(req.body || {});
  if (error) return res.status(400).json({ error });
  try {
    // The publish date is set the first time a post goes live and kept after that.
    const [r] = await pool.query(
      `UPDATE blog_posts SET category = ?, slug = ?, title = ?, excerpt = ?, cover_image = ?, body_html = ?, status = ?,
              published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END
        WHERE id = ?`,
      [out.category, out.slug, out.title, out.excerpt, out.cover_image, out.body_html, out.status, out.status, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true, slug: out.slug });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return dupError(res, out.slug);
    throw err;
  }
});

adminRouter.delete("/:id", async (req, res) => {
  const [r] = await pool.query("DELETE FROM blog_posts WHERE id = ?", [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// Images placed in a post (or used as its cover)
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, newImageName(IMAGE_EXT[file.mimetype] || ".img"))
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, !!IMAGE_EXT[file.mimetype])
});
adminRouter.post("/images", imageUpload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Upload a PNG, JPG, GIF or WebP image (max 8MB)." });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Turn a Word document into a draft: headings, lists, bold/italic, links, tables and the
// pictures inside it. Nothing is saved here — the admin reviews it in the editor first.
const docxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /\.docx$/i.test(file.originalname))
});
adminRouter.post("/import-docx", docxUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose a Word file (.docx)" });
  let images = 0;
  let result;
  try {
    result = await mammoth.convertToHtml({ buffer: req.file.buffer }, {
      convertImage: mammoth.images.imgElement(async (image) => {
        const ext = IMAGE_EXT[image.contentType];
        if (!ext) return { src: "" }; // e.g. Windows metafiles — dropped by the cleaner
        const name = newImageName(ext);
        await fs.promises.writeFile(path.join(uploadDir, name), await image.read());
        images += 1;
        return { src: `/uploads/${name}` };
      })
    });
  } catch (err) {
    return res.status(400).json({ error: "That Word file couldn't be read. Open it in Word, save it again as .docx, and try once more." });
  }

  // Many Word files use a bold line instead of a Heading style. A short paragraph that is
  // bold from start to finish is treated as a heading.
  let html = result.value.replace(/<p><strong>([^<]{1,120})<\/strong><\/p>/g, "<h2>$1</h2>");

  // The document's first heading becomes the post title; failing that, the file name.
  // A fully bold paragraph straight after it is a standfirst: it becomes the summary.
  let lead = "";
  let title = "";
  const h = html.match(/^\s*<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
  if (h) {
    title = textOf(h[1]);
    html = html.slice(h[0].length + (h.index || 0));
  }
  const standfirst = html.match(/^\s*<p><strong>([^<]{1,400})<\/strong><\/p>/);
  if (title && standfirst) lead = standfirst[1].trim();
  if (!title) title = req.file.originalname.replace(/\.docx$/i, "").replace(/^\d+[_\-\s]+/, "").replace(/[_]+/g, " ").trim();

  const body_html = clean(html);
  res.json({
    title,
    // "Why Study in Asia? A World of…" → why-study-in-asia: keep links short when the title
    // has a natural break.
    slug: toSlug(title.split(/[?:—–|]/)[0].trim().split(/\s+/).length >= 2 ? title.split(/[?:—–|]/)[0] : title),
    body_html,
    excerpt: lead || makeExcerpt(body_html),
    cover_image: firstImage(body_html),
    images,
    warnings: result.messages.filter((m) => m.type === "warning").length
  });
});

module.exports = { publicRouter, adminRouter, CATEGORIES };
