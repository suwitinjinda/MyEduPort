const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");
const consents = require("../services/consents");

// Parent confirmation for students under 20.
//   /api/consent/me/request          — the student's own request (status, link, resend, change email)
//   /api/consent/parent/:token       — the page the parent opens from the email (no sign-in)
//   /api/admin/consents              — Admin overview and settings (adminRouter)

const router = express.Router();
// Same account helpers sign-up uses (routes/auth.js)
const { buildToken, startTrial } = require("./auth").helpers;
const fail = (res, err, fallback) => res.status(err.status || 500).json({ error: err.status ? err.message : fallback });

// ---- public: company details for the privacy summary ----
router.get("/legal", async (req, res) => res.json(await consents.getLegalInfo()));

// ---- the student ----
router.get("/me/request", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  res.json(await consents.myRequest(req.user.id));
});

router.post("/me/request/resend", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  try { res.json(await consents.resendRequest(req.user.id)); } catch (err) { fail(res, err, "Couldn't resend the email."); }
});

// Send to a different parent email (or the first time, if sign-up didn't manage to)
router.put("/me/request", authRequired, async (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const [[u]] = await pool.query("SELECT email, parent_consent_status FROM users WHERE id = ?", [req.user.id]);
  if (u?.parent_consent_status === "confirmed") return res.status(400).json({ error: "Your parent has already confirmed." });
  const p = consents.readParentContact(req.body, u?.email);
  if (p.error) return res.status(400).json({ error: p.error });
  const [[last]] = await pool.query("SELECT is_existing FROM parent_consent_requests WHERE student_user_id = ? ORDER BY id DESC LIMIT 1", [req.user.id]);
  await consents.startParentRequest(req.user.id, { parentEmail: p.parentEmail, parentPhone: p.parentPhone, isExisting: !!last?.is_existing });
  res.json(await consents.myRequest(req.user.id));
});

// ---- the parent (from the emailed link) ----
router.get("/parent/:token", async (req, res) => {
  const found = await consents.requestByToken(req.params.token);
  if (!found) return res.status(404).json({ error: "This link isn't valid. Ask your child to send it again from MyEduPort." });
  res.json(found.view);
});

router.post("/parent/:token/confirm", async (req, res) => {
  try {
    res.json(await consents.confirmRequest(req.params.token, req.body || {}, consents.clientIp(req), { bcrypt, buildToken, startTrial }));
  } catch (err) { fail(res, err, "Couldn't save your consent. Please try again."); }
});

router.post("/parent/:token/decline", async (req, res) => {
  try { res.json(await consents.declineRequest(req.params.token, consents.clientIp(req))); }
  catch (err) { fail(res, err, "Couldn't record your answer. Please try again."); }
});

// ---- Admin ----
const adminRouter = express.Router();
const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL || user.role === "admin";
adminRouter.use(authRequired, (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: "Admin only" })));
adminRouter.get("/", async (req, res) => res.json(await consents.adminOverview()));
adminRouter.put("/settings", async (req, res) => {
  try { res.json(await consents.setConsentSettings(req.body || {})); } catch (err) { fail(res, err, "Couldn't save."); }
});
adminRouter.put("/legal", async (req, res) => {
  try { res.json(await consents.setLegalInfo(req.body || {})); } catch (err) { fail(res, err, "Couldn't save."); }
});
adminRouter.post("/run", async (req, res) => res.json(await consents.runConsentJobs()));

module.exports = { router, adminRouter };
