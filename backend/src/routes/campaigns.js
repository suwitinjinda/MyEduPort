const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

// Campaign landing pages (/lp/<slug>). Admins create them in Admin → Campaigns; the page
// itself is one template in the frontend that takes its wording from here.
//   public: mounted at /api/campaigns       — read an active campaign, count a visit
//   admin:  mounted at /api/admin/campaigns — create / edit / pause, with per-campaign stats

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

// The wording an admin can change, with a length cap each. Anything left blank falls back
// to the base page's wording in the frontend.
const FIELDS = {
  title: 120, description: 300,
  badge: 80, headline: 160, subheadline: 300,
  trialNote: 120, ctaPrimary: 60, ctaSecondary: 60,
  previewEyebrow: 60, previewTitle: 120,
  closingHeadline: 120, closingSubtext: 240, closingCta: 60
};

const clientIp = (req) => String(req.headers["x-real-ip"] || req.ip || "").split(",")[0].trim();
const normSlug = (s) => String(s || "").trim().toLowerCase();

function cleanContent(input) {
  const out = {};
  for (const [k, max] of Object.entries(FIELDS)) {
    const v = typeof input?.[k] === "string" ? input[k].trim() : "";
    if (v) out[k] = v.slice(0, max);
  }
  return out;
}

const parseContent = (c) => (typeof c === "string" ? JSON.parse(c || "{}") : c || {});

async function activeBySlug(slug) {
  const [[row]] = await pool.query("SELECT id, slug, content FROM campaigns WHERE slug = ? AND status = 'active'", [normSlug(slug)]);
  return row || null;
}

// ------------------------------------------------------------------ public

const publicRouter = express.Router();

publicRouter.get("/:slug", async (req, res) => {
  const c = await activeBySlug(req.params.slug);
  // Not an error for the visitor: an unknown or paused link shows the standard page.
  if (!c) return res.json({ slug: null, content: null });
  res.json({ slug: c.slug, content: parseContent(c.content) });
});

// One visit per visitor per day. Only a day-salted hash of the IP is kept.
publicRouter.post("/:slug/visit", async (req, res) => {
  const c = await activeBySlug(req.params.slug);
  if (!c) return res.json({ ok: false });
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = crypto.createHash("sha256").update(`${process.env.JWT_SECRET || ""}|campaign|${day}|${clientIp(req)}`).digest("hex").slice(0, 16);
  await pool.query("INSERT IGNORE INTO campaign_visits (campaign_id, day, ip_hash) VALUES (?, ?, ?)", [c.id, day, ipHash]);
  res.json({ ok: true });
});

// ------------------------------------------------------------------ admin

const adminRouter = express.Router();
const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL || user.role === "admin";
adminRouter.use(authRequired, (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: "Admin only" })));

adminRouter.get("/", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.slug, c.name, c.status, c.content, c.created_at, c.updated_at,
            (SELECT COUNT(*) FROM campaign_visits v WHERE v.campaign_id = c.id) AS visits,
            (SELECT COUNT(*) FROM campaign_visits v WHERE v.campaign_id = c.id AND v.day >= CURDATE() - INTERVAL 29 DAY) AS visits_30d
       FROM campaigns c ORDER BY c.created_at DESC`
  );
  res.json({
    fields: Object.keys(FIELDS),
    campaigns: rows.map((r) => ({
      ...r,
      content: parseContent(r.content),
      visits: Number(r.visits), visits_30d: Number(r.visits_30d)
    }))
  });
});

function validate(body, { creating }) {
  const out = {};
  if (creating || body.slug !== undefined) {
    const slug = normSlug(body.slug);
    if (!SLUG_RE.test(slug)) return { error: "Link name: lowercase English letters, numbers and dashes only (e.g. facebook-oct)" };
    out.slug = slug;
  }
  if (creating || body.name !== undefined) {
    const name = String(body.name || "").trim().slice(0, 120);
    if (!name) return { error: "Give the campaign a name" };
    out.name = name;
  }
  if (body.status !== undefined) {
    if (!["active", "paused"].includes(body.status)) return { error: "Invalid status" };
    out.status = body.status;
  }
  if (creating || body.content !== undefined) out.content = JSON.stringify(cleanContent(body.content));
  return { out };
}

adminRouter.post("/", async (req, res) => {
  const { error, out } = validate(req.body || {}, { creating: true });
  if (error) return res.status(400).json({ error });
  try {
    const [r] = await pool.query(
      "INSERT INTO campaigns (slug, name, status, content, created_by) VALUES (?, ?, ?, ?, ?)",
      [out.slug, out.name, out.status || "active", out.content, req.user.id]
    );
    res.json({ id: r.insertId, slug: out.slug });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: `/lp/${out.slug} is already used by another campaign` });
    throw err;
  }
});

adminRouter.put("/:id", async (req, res) => {
  const { error, out } = validate(req.body || {}, { creating: false });
  if (error) return res.status(400).json({ error });
  const keys = Object.keys(out);
  if (!keys.length) return res.json({ ok: true });
  try {
    const [r] = await pool.query(`UPDATE campaigns SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`, [...keys.map((k) => out[k]), req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: `/lp/${out.slug} is already used by another campaign` });
    throw err;
  }
});

adminRouter.delete("/:id", async (req, res) => {
  const [r] = await pool.query("DELETE FROM campaigns WHERE id = ?", [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

module.exports = { publicRouter, adminRouter };
