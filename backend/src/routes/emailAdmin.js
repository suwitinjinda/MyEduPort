const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const { isMailConfigured, sendMail } = require("../services/mailer");
const { SEGMENTS, APP_URL, normEmail, isEmail, parseEmailList, resolveAudience, renderEmail, tick } = require("../services/emailMarketing");
const { draftMarketingEmailWithClaude } = require("../services/aiClient");
const { listAudience, applyFilters, cleanFilters } = require("../services/audience");

// Admin → Email Marketing
const router = express.Router();

function isAdmin(user) {
  return user.email === process.env.ADMIN_EMAIL || user.role === "admin";
}
router.use(authRequired, (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: "Admin only" })));

const parseJson = (v, fb) => { try { return typeof v === "string" ? JSON.parse(v) : (v ?? fb); } catch { return fb; } };
const cleanAudience = (a = {}) => ({
  segments: (Array.isArray(a.segments) ? a.segments : []).filter((k) => SEGMENTS[k]),
  groupIds: (Array.isArray(a.groupIds) ? a.groupIds : []).map(Number).filter(Boolean),
  segmentIds: (Array.isArray(a.segmentIds) ? a.segmentIds : []).map(Number).filter(Boolean),
  userIds: (Array.isArray(a.userIds) ? a.userIds : []).map(Number).filter(Boolean),
  external: parseEmailList(a.external || []).filter((r) => r.email).slice(0, 5000).map((r) => ({ email: normEmail(r.email), name: String(r.name || "").slice(0, 150) }))
});

// ---- Status / audience ----
router.get("/status", async (req, res) => {
  res.json({
    configured: isMailConfigured(),
    from: process.env.MAIL_FROM || null,
    segments: Object.entries(SEGMENTS).map(([key, s]) => ({ key, label: s.label }))
  });
});

// System users to pick from (defaults to Free students)
router.get("/users", async (req, res) => {
  const { plan = "free", role = "student", q = "" } = req.query;
  const where = ["u.deleted_at IS NULL", "(u.is_disabled IS NULL OR u.is_disabled = 0)"];
  const params = [];
  if (plan && plan !== "all") { where.push("u.plan = ?"); params.push(plan); }
  if (role && role !== "all") { where.push("u.role = ?"); params.push(role); }
  if (q) { where.push("(u.email LIKE ? OR u.name LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.plan, u.role, u.created_at, (x.email IS NOT NULL) AS unsubscribed
     FROM users u LEFT JOIN email_unsubscribes x ON x.email = u.email
     WHERE ${where.join(" AND ")} ORDER BY u.created_at DESC LIMIT 1000`,
    params
  );
  res.json(rows.map((r) => ({ ...r, unsubscribed: !!r.unsubscribed })));
});

router.post("/audience/preview", async (req, res) => {
  const { recipients, invalid, unsubscribed } = await resolveAudience(cleanAudience(req.body?.audience));
  res.json({ count: recipients.length, sample: recipients.slice(0, 12), invalid, unsubscribed });
});

// ---- Audience (everyone we can email) ----
// GET /audience?f=<json filters> → { contacts, total, matched, summary, facets }
router.get("/audience", async (req, res) => {
  const all = await listAudience();
  const f = cleanFilters(parseJson(req.query.f, {}));
  const matched = applyFilters(all, f);
  const count = (pred) => all.filter(pred).length;
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
  res.json({
    total: all.length,
    matched: matched.length,
    contacts: matched.sort((a, b) => new Date(b.joined || 0) - new Date(a.joined || 0)).slice(0, 2000),
    summary: {
      subscribed: count((c) => c.subscribed), unsubscribed: count((c) => !c.subscribed),
      students: count((c) => c.type === "student"), parents: count((c) => c.type === "parent"),
      external: count((c) => c.type === "external"), trial: count((c) => c.trial === "active")
    },
    facets: {
      grades: uniq(all.map((c) => c.grade)),
      countries: uniq(all.flatMap((c) => c.countries)),
      tags: uniq(all.flatMap((c) => c.tags))
    }
  });
});

const cleanTags = (tags) => [...new Set((Array.isArray(tags) ? tags : String(tags || "").split(/[,;]/)).map((t) => String(t).trim().toLowerCase().slice(0, 40)).filter(Boolean))].slice(0, 20);

// Add one external contact (or tag an existing address)
router.post("/contacts", async (req, res) => {
  const email = normEmail(req.body?.email);
  if (!isEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (!req.body?.consent) return res.status(400).json({ error: "Confirm this person agreed to receive emails from MyEduPort." });
  const [[u]] = await pool.query("SELECT id FROM users WHERE email = ? AND deleted_at IS NULL", [email]);
  await pool.query(
    `INSERT INTO email_contacts (email, name, tags, source, consent, notes) VALUES (?, ?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE name = IF(VALUES(name) = '', name, VALUES(name)), tags = VALUES(tags), consent = 1, notes = VALUES(notes)`,
    [email, String(req.body?.name || "").slice(0, 150), JSON.stringify(cleanTags(req.body?.tags)), u ? "user" : "manual", String(req.body?.notes || "").slice(0, 500) || null]
  );
  res.json({ status: "ok" });
});

// CSV import (parsed in the browser): rows [{ email, name, tags }]
router.post("/contacts/import", async (req, res) => {
  if (!req.body?.consent) return res.status(400).json({ error: "Confirm these people agreed to receive emails from MyEduPort." });
  const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 10000) : [];
  const extraTags = cleanTags(req.body?.tags);
  const groupId = Number(req.body?.groupId) || null;
  let added = 0; const invalid = [];
  for (const r of rows) {
    const email = normEmail(r.email);
    if (!isEmail(email)) { if (r.email) invalid.push(String(r.email).slice(0, 120)); continue; }
    // keep any tags the address already had
    const [[existing]] = await pool.query("SELECT tags FROM email_contacts WHERE email = ?", [email]);
    const tags = cleanTags([...(parseJson(existing?.tags, []) || []), ...cleanTags(r.tags), ...extraTags]);
    await pool.query(
      `INSERT INTO email_contacts (email, name, tags, source, consent) VALUES (?, ?, ?, 'import', 1)
       ON DUPLICATE KEY UPDATE name = IF(VALUES(name) = '', name, VALUES(name)), tags = VALUES(tags), consent = 1`,
      [email, String(r.name || "").slice(0, 150), JSON.stringify(tags)]
    );
    if (groupId) await pool.query("INSERT IGNORE INTO email_group_members (group_id, email, name) VALUES (?, ?, ?)", [groupId, email, String(r.name || "").slice(0, 150)]);
    added++;
  }
  res.json({ added, invalid });
});

// Bulk actions on selected emails
router.post("/audience/bulk", async (req, res) => {
  const emails = [...new Set((req.body?.emails || []).map(normEmail).filter(isEmail))].slice(0, 5000);
  const { action } = req.body || {};
  if (!emails.length) return res.status(400).json({ error: "Select at least one contact." });
  const tag = cleanTags([req.body?.tag])[0];
  if (action === "add_tag" || action === "remove_tag") {
    if (!tag) return res.status(400).json({ error: "Enter a tag." });
    for (const email of emails) {
      const [[row]] = await pool.query("SELECT tags FROM email_contacts WHERE email = ?", [email]);
      let tags = parseJson(row?.tags, []) || [];
      tags = action === "add_tag" ? cleanTags([...tags, tag]) : tags.filter((t) => t !== tag);
      if (row) await pool.query("UPDATE email_contacts SET tags = ? WHERE email = ?", [JSON.stringify(tags), email]);
      else if (action === "add_tag") {
        const [[u]] = await pool.query("SELECT name FROM users WHERE email = ?", [email]);
        await pool.query("INSERT INTO email_contacts (email, name, tags, source, consent) VALUES (?, ?, ?, ?, 0)", [email, u?.name || "", JSON.stringify(tags), u ? "user" : "manual"]);
      }
    }
  } else if (action === "add_to_group") {
    const groupId = Number(req.body?.groupId);
    const [[g]] = await pool.query("SELECT id FROM email_groups WHERE id = ?", [groupId]);
    if (!g) return res.status(400).json({ error: "Choose a group." });
    await pool.query("INSERT IGNORE INTO email_group_members (group_id, email) VALUES ?", [emails.map((e) => [g.id, e])]);
  } else if (action === "unsubscribe") {
    await pool.query("INSERT IGNORE INTO email_unsubscribes (email, source) VALUES ?", [emails.map((e) => [e, "admin"])]);
  } else if (action === "resubscribe") {
    await pool.query("DELETE FROM email_unsubscribes WHERE email IN (?)", [emails]);
  } else if (action === "delete_external") {
    // removes imported/manual contacts (and their group memberships); system users are never deleted here
    const [users] = await pool.query("SELECT email FROM users WHERE email IN (?)", [emails]);
    const userSet = new Set(users.map((u) => normEmail(u.email)));
    const ext = emails.filter((e) => !userSet.has(e));
    if (ext.length) {
      await pool.query("DELETE FROM email_contacts WHERE email IN (?)", [ext]);
      await pool.query("DELETE FROM email_group_members WHERE email IN (?)", [ext]);
    }
    return res.json({ status: "ok", affected: ext.length, skipped_users: emails.length - ext.length });
  } else {
    return res.status(400).json({ error: "Unknown action" });
  }
  res.json({ status: "ok", affected: emails.length });
});

// ---- Saved segments (dynamic filters, re-evaluated at send time) ----
router.get("/segments", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM email_segments ORDER BY name");
  const all = await listAudience();
  res.json(rows.map((s) => {
    const filters = parseJson(s.filters, {});
    return { ...s, filters, count: applyFilters(all, filters).filter((c) => c.subscribed).length };
  }));
});
router.post("/segments", async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: "Name the segment." });
  const [r] = await pool.query("INSERT INTO email_segments (name, description, filters) VALUES (?, ?, ?)",
    [name, String(req.body?.description || "").slice(0, 255), JSON.stringify(cleanFilters(req.body?.filters))]);
  res.json({ id: r.insertId });
});
router.put("/segments/:id", async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: "Name the segment." });
  await pool.query("UPDATE email_segments SET name = ?, description = ?, filters = ? WHERE id = ?",
    [name, String(req.body?.description || "").slice(0, 255), JSON.stringify(cleanFilters(req.body?.filters)), req.params.id]);
  res.json({ status: "ok" });
});
router.delete("/segments/:id", async (req, res) => {
  await pool.query("DELETE FROM email_segments WHERE id = ?", [req.params.id]);
  res.json({ status: "deleted" });
});

// ---- Groups ----
router.get("/groups", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT g.*, (SELECT COUNT(*) FROM email_group_members m WHERE m.group_id = g.id) AS member_count
     FROM email_groups g ORDER BY g.name`
  );
  res.json(rows);
});
router.post("/groups", async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: "Group name required" });
  const [r] = await pool.query("INSERT INTO email_groups (name, description) VALUES (?, ?)", [name, String(req.body?.description || "").slice(0, 255)]);
  res.json({ id: r.insertId });
});
router.put("/groups/:id", async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: "Group name required" });
  await pool.query("UPDATE email_groups SET name = ?, description = ? WHERE id = ?", [name, String(req.body?.description || "").slice(0, 255), req.params.id]);
  res.json({ status: "ok" });
});
router.delete("/groups/:id", async (req, res) => {
  await pool.query("DELETE FROM email_groups WHERE id = ?", [req.params.id]);
  res.json({ status: "deleted" });
});
router.get("/groups/:id/members", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT m.email, m.name, m.added_at, u.id AS user_id, u.plan, u.role, (x.email IS NOT NULL) AS unsubscribed
     FROM email_group_members m
     LEFT JOIN users u ON u.email = m.email AND u.deleted_at IS NULL
     LEFT JOIN email_unsubscribes x ON x.email = m.email
     WHERE m.group_id = ? ORDER BY m.added_at DESC`,
    [req.params.id]
  );
  res.json(rows.map((r) => ({ ...r, unsubscribed: !!r.unsubscribed })));
});
// body: { emails: "text" | [{email,name}], userIds: [id] }
router.post("/groups/:id/members", async (req, res) => {
  const [[g]] = await pool.query("SELECT id FROM email_groups WHERE id = ?", [req.params.id]);
  if (!g) return res.status(404).json({ error: "Group not found" });
  const rows = [];
  const invalid = [];
  for (const r of parseEmailList(req.body?.emails || [])) {
    if (isEmail(r.email)) rows.push([g.id, normEmail(r.email), String(r.name || "").slice(0, 150)]);
    else invalid.push(r.email);
  }
  const userIds = (req.body?.userIds || []).map(Number).filter(Boolean);
  if (userIds.length) {
    const [us] = await pool.query("SELECT email, name FROM users WHERE id IN (?) AND deleted_at IS NULL", [userIds]);
    us.forEach((u) => rows.push([g.id, normEmail(u.email), u.name || ""]));
  }
  if (rows.length) {
    await pool.query("INSERT INTO email_group_members (group_id, email, name) VALUES ? ON DUPLICATE KEY UPDATE name = IF(VALUES(name) = '', name, VALUES(name))", [rows]);
  }
  res.json({ added: rows.length, invalid });
});
router.delete("/groups/:id/members", async (req, res) => {
  await pool.query("DELETE FROM email_group_members WHERE group_id = ? AND email = ?", [req.params.id, normEmail(req.body?.email)]);
  res.json({ status: "deleted" });
});

// ---- Campaigns ----
const campaignOut = (c) => ({ ...c, audience: parseJson(c.audience, {}) });

router.get("/campaigns", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.subject, c.status, c.scheduled_at, c.started_at, c.sent_at, c.total, c.sent_count, c.failed_count, c.last_error, c.created_at, c.updated_at,
       (SELECT COUNT(*) FROM email_campaign_recipients r WHERE r.campaign_id = c.id AND r.opened_at IS NOT NULL) AS opened,
       (SELECT COUNT(*) FROM email_campaign_recipients r WHERE r.campaign_id = c.id AND r.clicked_at IS NOT NULL) AS clicked
     FROM email_campaigns c ORDER BY c.created_at DESC LIMIT 200`
  );
  res.json(rows);
});
router.get("/campaigns/:id", async (req, res) => {
  const [[c]] = await pool.query("SELECT * FROM email_campaigns WHERE id = ?", [req.params.id]);
  if (!c) return res.status(404).json({ error: "Not found" });
  const [[stats]] = await pool.query(
    `SELECT SUM(opened_at IS NOT NULL) AS opened, SUM(clicked_at IS NOT NULL) AS clicked,
            SUM(status = 'skipped') AS skipped, SUM(status = 'pending') AS pending
     FROM email_campaign_recipients WHERE campaign_id = ?`,
    [c.id]
  );
  res.json({ ...campaignOut(c), stats: { opened: Number(stats.opened || 0), clicked: Number(stats.clicked || 0), skipped: Number(stats.skipped || 0), pending: Number(stats.pending || 0) } });
});
router.get("/campaigns/:id/recipients", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT email, name, plan, status, error, sent_at, opened_at, clicked_at FROM email_campaign_recipients WHERE campaign_id = ? ORDER BY id LIMIT 5000",
    [req.params.id]
  );
  res.json(rows);
});

const editable = (c) => c && ["draft", "scheduled", "cancelled", "failed"].includes(c.status);
function campaignFields(body = {}) {
  return {
    name: String(body.name || "Untitled campaign").trim().slice(0, 150) || "Untitled campaign",
    subject: String(body.subject || "").slice(0, 255),
    preheader: String(body.preheader || "").slice(0, 255),
    html: String(body.html || "").replace(/<script[\s\S]*?<\/script>/gi, ""),
    audience: JSON.stringify(cleanAudience(body.audience))
  };
}

router.post("/campaigns", async (req, res) => {
  const f = campaignFields(req.body);
  const [r] = await pool.query(
    "INSERT INTO email_campaigns (name, subject, preheader, html, audience, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [f.name, f.subject, f.preheader, f.html, f.audience, req.user.id]
  );
  res.json({ id: r.insertId });
});
router.put("/campaigns/:id", async (req, res) => {
  const [[c]] = await pool.query("SELECT status FROM email_campaigns WHERE id = ?", [req.params.id]);
  if (!c) return res.status(404).json({ error: "Not found" });
  if (!editable(c)) return res.status(400).json({ error: `A ${c.status} campaign can't be edited — duplicate it instead.` });
  const f = campaignFields(req.body);
  // Editing a scheduled campaign keeps it scheduled; a cancelled/failed one goes back to draft
  // Status filter guards against the worker starting the send between the check and this update
  const [r] = await pool.query(
    `UPDATE email_campaigns SET name = ?, subject = ?, preheader = ?, html = ?, audience = ?, status = IF(status = 'scheduled', 'scheduled', 'draft')
     WHERE id = ? AND status IN ('draft', 'scheduled', 'cancelled', 'failed')`,
    [f.name, f.subject, f.preheader, f.html, f.audience, req.params.id]
  );
  if (!r.affectedRows) return res.status(409).json({ error: "This campaign just started sending and can no longer be edited." });
  res.json({ status: "ok" });
});
router.delete("/campaigns/:id", async (req, res) => {
  const [[c]] = await pool.query("SELECT status FROM email_campaigns WHERE id = ?", [req.params.id]);
  if (c && c.status === "sending") return res.status(400).json({ error: "Cancel the send first." });
  await pool.query("DELETE FROM email_campaigns WHERE id = ?", [req.params.id]);
  res.json({ status: "deleted" });
});
router.post("/campaigns/:id/duplicate", async (req, res) => {
  const [[c]] = await pool.query("SELECT * FROM email_campaigns WHERE id = ?", [req.params.id]);
  if (!c) return res.status(404).json({ error: "Not found" });
  const [r] = await pool.query(
    "INSERT INTO email_campaigns (name, subject, preheader, html, audience, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [`${c.name} (copy)`.slice(0, 150), c.subject, c.preheader, c.html, typeof c.audience === "string" ? c.audience : JSON.stringify(c.audience || {}), req.user.id]
  );
  res.json({ id: r.insertId });
});

// Test send to the admin (or a given address) — not tracked, not counted
router.post("/campaigns/:id/test", async (req, res) => {
  if (!isMailConfigured()) return res.status(400).json({ error: "Email sending isn't configured yet (SMTP settings missing in backend/.env)." });
  const [[c]] = await pool.query("SELECT * FROM email_campaigns WHERE id = ?", [req.params.id]);
  if (!c) return res.status(404).json({ error: "Not found" });
  const to = normEmail(req.body?.to || req.user.email);
  if (!isEmail(to)) return res.status(400).json({ error: "Invalid test address" });
  const [[u]] = await pool.query("SELECT name, plan FROM users WHERE email = ?", [to]);
  const msg = renderEmail(c, { email: to, name: u?.name || "", plan: u?.plan || "free" }, null);
  try {
    await sendMail({ to, ...msg, subject: `[TEST] ${msg.subject}` });
    res.json({ status: "sent", to });
  } catch (err) {
    res.status(502).json({ error: `Send failed: ${err.message}` });
  }
});

// Send now (scheduled_at omitted/past) or schedule for later
router.post("/campaigns/:id/send", async (req, res) => {
  if (!isMailConfigured()) return res.status(400).json({ error: "Email sending isn't configured yet (SMTP settings missing in backend/.env)." });
  const [[c]] = await pool.query("SELECT * FROM email_campaigns WHERE id = ?", [req.params.id]);
  if (!c) return res.status(404).json({ error: "Not found" });
  if (!["draft", "scheduled", "cancelled", "failed"].includes(c.status)) return res.status(400).json({ error: `Campaign is already ${c.status}.` });
  if (!c.subject.trim() || !String(c.html || "").trim()) return res.status(400).json({ error: "Add a subject and content first." });
  const { count } = await resolveAudience(parseJson(c.audience, {})).then((a) => ({ count: a.recipients.length }));
  if (!count) return res.status(400).json({ error: "No recipients — choose an audience first." });
  let when = req.body?.scheduled_at ? new Date(req.body.scheduled_at) : new Date();
  if (Number.isNaN(when.getTime())) return res.status(400).json({ error: "Invalid schedule time" });
  const later = when.getTime() > Date.now() + 60 * 1000;
  if (!later) when = new Date();
  // Re-sending a cancelled/failed campaign: clear old recipient rows so everyone is re-evaluated
  if (["cancelled", "failed"].includes(c.status)) {
    // Keep 'sent' and 'sending' (delivery unknown) rows so those people are never mailed twice
    await pool.query("DELETE FROM email_campaign_recipients WHERE campaign_id = ? AND status IN ('pending', 'failed', 'skipped')", [c.id]);
  }
  const [upd] = await pool.query(
    "UPDATE email_campaigns SET status = 'scheduled', scheduled_at = ?, total = 0, last_error = NULL WHERE id = ? AND status IN ('draft', 'scheduled', 'cancelled', 'failed')",
    [when, c.id]
  );
  if (!upd.affectedRows) return res.status(409).json({ error: "Campaign status changed — refresh and try again." });
  if (!later) tick(); // start right away (runs in the background)
  res.json({ status: later ? "scheduled" : "sending", scheduled_at: when, recipients: count });
});

router.post("/campaigns/:id/cancel", async (req, res) => {
  const [r] = await pool.query("UPDATE email_campaigns SET status = 'cancelled' WHERE id = ? AND status IN ('scheduled', 'sending')", [req.params.id]);
  if (!r.affectedRows) return res.status(400).json({ error: "Only scheduled or sending campaigns can be cancelled." });
  res.json({ status: "cancelled" });
});

// ---- AI draft ----
router.post("/ai-draft", async (req, res) => {
  const { goal, audience, tone, language, offer, notes } = req.body || {};
  res.json(await draftMarketingEmailWithClaude({ goal, audience, tone, language, offer, notes }));
});

// ---- Images for the editor (hosted, absolute URL so they load in mail clients) ----
const uploadDir = path.join(__dirname, "..", "..", process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `email-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "")}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype))
});
router.post("/image", imageUpload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Upload a PNG, JPG, GIF or WebP image (max 5MB)." });
  res.json({ url: `${APP_URL()}/uploads/${req.file.filename}` });
});

// ---- Unsubscribes ----
router.get("/unsubscribes", async (req, res) => {
  const [rows] = await pool.query("SELECT email, source, created_at FROM email_unsubscribes ORDER BY created_at DESC LIMIT 2000");
  res.json(rows);
});
router.delete("/unsubscribes", async (req, res) => {
  await pool.query("DELETE FROM email_unsubscribes WHERE email = ?", [normEmail(req.body?.email)]);
  res.json({ status: "deleted" });
});

module.exports = router;
