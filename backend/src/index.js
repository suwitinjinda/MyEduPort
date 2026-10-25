require("dotenv").config();
const express = require("express");
// Patches Express so a rejected promise in an async route reaches the error
// handler below instead of hanging the request until the proxy times out.
require("express-async-errors");
const cors = require("cors");
const path = require("path");

const pool = require("./db");

const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const parentRoutes = require("./routes/parents");
const counselorRoutes = require("./routes/counselors");
const aiRoutes = require("./routes/ai");
const universityRoutes = require("./routes/universities");
const uploadRoutes = require("./routes/uploads");
const adminRoutes = require("./routes/admin");
const personalityRoutes = require("./routes/personality");
const careerRoutes = require("./routes/career");
const optionRoutes = require("./routes/options");
const emailAdminRoutes = require("./routes/emailAdmin");
const knowledgeAdminRoutes = require("./routes/knowledgeAdmin");
const billing = require("./routes/billing");
const emailPublicRoutes = require("./routes/emailPublic");
const testShare = require("./routes/testShare");
const admissionResults = require("./routes/admissionResults");
const myBackup = require("./routes/myBackup");
const myRestore = require("./routes/myRestore");
const backupAdmin = require("./routes/backupAdmin");
const { readOnlyGuard } = require("./middleware/readOnly");
const { startEmailWorker } = require("./services/emailMarketing");

const app = express();

// Security: In production, enforce HTTPS via reverse proxy (Nginx, etc.)
// For local development, HTTP is acceptable
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_HTTP) {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      return res.redirect(`https://${req.header("host")}${req.url}`);
    }
    next();
  });
}

app.use(cors({ origin: true, credentials: true }));
// Stripe webhook needs the raw body for signature verification — before express.json
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), billing.webhook);
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", process.env.UPLOAD_DIR || "uploads")));

async function healthHandler(req, res) {
  const checks = {
    api: "ok",
    db: "unknown",
    ai: process.env.ANTHROPIC_API_KEY ? "configured" : "not configured",
    time: new Date().toISOString(),
    uptime: process.uptime()
  };
  try {
    await pool.query("SELECT 1");
    checks.db = "ok";
  } catch (e) {
    checks.db = "error";
  }
  const status = checks.db === "ok" ? 200 : 503;
  res.status(status).json(checks);
}

app.get("/api/health", healthHandler);
app.get("/health", healthHandler);

// Lapsed accounts (trial over / subscription cancelled) can read and export, not write
app.use(readOnlyGuard);

app.use("/api/auth", authRoutes);
app.use("/api/students/me/backup", myBackup);
app.use("/api/students/me/restore", myRestore);
app.use("/api/students/me/admission-results", admissionResults);
app.use("/api/students", studentRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/counselors", counselorRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/universities", universityRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/personality", personalityRoutes);
app.use("/api/career", careerRoutes);
app.use("/api/options", optionRoutes);
app.use("/api/admin/email", emailAdminRoutes);
app.use("/api/admin/ml", knowledgeAdminRoutes);
app.use("/api/admin/backup", backupAdmin);
app.use("/api/billing", billing.router);
app.use("/api/email", emailPublicRoutes);
app.use("/api/test-share", testShare.router);
// Public, server-rendered share pages — plain HTML so Facebook/X previews work
app.use("/api/share", testShare.publicRouter);

// Central error handler — any error thrown/rejected in a route lands here and
// returns a clean 500 instead of leaving the request hanging (504 at the proxy).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("API error:", err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: "Something went wrong. Please try again." });
});

// Safety net: never let a stray async rejection take the whole API process down.
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason && reason.message ? reason.message : reason);
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err && err.message ? err.message : err);
});

const port = Number(process.env.PORT || 4000);
// Bind to localhost only — the API is reached exclusively through the nginx
// reverse proxy (proxy_pass http://127.0.0.1:4000). Override with HOST if a
// deployment ever needs a different bind address.
const host = process.env.HOST || "127.0.0.1";
app.listen(port, host, () => {
  startEmailWorker(); // scheduled / in-progress marketing email sends
  // eslint-disable-next-line no-console
  console.log(`MyEduPort API listening on ${host}:${port}`);
});
