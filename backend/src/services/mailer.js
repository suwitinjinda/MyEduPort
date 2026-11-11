const nodemailer = require("nodemailer");
const { seal, open } = require("./secretBox");
const pool = require("../db");

// Outgoing email over SMTP — works with any provider (Amazon SES, Resend, SendGrid,
// Brevo, Google Workspace…). Set it up in Admin → Email Settings; the values are kept in
// app_settings ('smtp_settings', password encrypted). Values in backend/.env
// (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_REPLY_TO) are the fallback
// when nothing is saved in Admin.
//
// Settings are cached in memory so isMailConfigured() stays synchronous for callers;
// loadMailSettings() runs at startup and again whenever Admin saves.

const SETTINGS_KEY = "smtp_settings";
let settings = null;      // from Admin (decrypted), or null
let transporter = null;

// The SMTP password is kept encrypted (services/secretBox.js)
const encrypt = (text) => seal("smtp", text);
const decrypt = (blob) => open("smtp", blob);

const fromEnv = () => ({
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  from: process.env.MAIL_FROM || "",
  reply_to: process.env.MAIL_REPLY_TO || ""
});

// The settings in use: Admin's if saved, otherwise .env
function current() {
  return settings && settings.host ? settings : fromEnv();
}

async function loadMailSettings() {
  try {
    const [[row]] = await pool.query("SELECT sval FROM app_settings WHERE skey = ?", [SETTINGS_KEY]);
    const v = row ? (typeof row.sval === "string" ? JSON.parse(row.sval) : row.sval) : null;
    settings = v ? { ...v, pass: v.pass_enc ? decrypt(v.pass_enc) : "" } : null;
  } catch (err) {
    console.error("[mailer] could not load email settings:", err.message);
    settings = null;
  }
  if (transporter) transporter.close?.();
  transporter = null;
  return settings;
}

function isMailConfigured() {
  const s = current();
  return !!(s.host && s.user && s.pass && s.from);
}

function buildTransport(s) {
  const port = Number(s.port || 587);
  return nodemailer.createTransport({
    host: s.host,
    port,
    secure: port === 465,
    auth: { user: s.user, pass: s.pass },
    pool: true,
    maxConnections: 3
  });
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (!transporter) transporter = buildTransport(current());
  return transporter;
}

// { to, subject, html, text, headers } → nodemailer info. Throws if not configured or on SMTP error.
async function sendMail({ to, subject, html, text, headers }) {
  const t = getTransporter();
  if (!t) throw new Error("Email isn't set up yet — add the SMTP settings in Admin → Email Settings.");
  const s = current();
  return t.sendMail({ from: s.from, replyTo: s.reply_to || undefined, to, subject, html, text, headers });
}

// ---- Admin → Email Settings ----

// What Admin sees: everything except the password itself
function publicSettings() {
  const s = current();
  return {
    source: settings && settings.host ? "admin" : (fromEnv().host ? "env" : "none"),
    host: s.host, port: Number(s.port || 587), user: s.user, from: s.from, reply_to: s.reply_to || "",
    has_password: !!s.pass,
    configured: isMailConfigured(),
    updated_at: settings?.updated_at || null
  };
}

// Validate and save. A blank password keeps the saved one.
async function saveMailSettings(input, adminId) {
  const host = String(input.host || "").trim();
  const port = Number(input.port || 587);
  const user = String(input.user || "").trim();
  const from = String(input.from || "").trim();
  const reply_to = String(input.reply_to || "").trim();
  if (!host || /\s/.test(host)) throw Object.assign(new Error("Enter the SMTP server, e.g. smtp.gmail.com"), { status: 400 });
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Object.assign(new Error("Port must be a number, usually 587 or 465."), { status: 400 });
  if (!user) throw Object.assign(new Error("Enter the SMTP username."), { status: 400 });
  if (!/@/.test(from)) throw Object.assign(new Error('Enter the From address, e.g. MyEduPort <hello@myeduport.ai>'), { status: 400 });
  const pass = String(input.pass || "") || settings?.pass || "";
  if (!pass) throw Object.assign(new Error("Enter the SMTP password."), { status: 400 });
  const stored = { host, port, user, from, reply_to, pass_enc: encrypt(pass), updated_at: new Date().toISOString(), updated_by: adminId };
  await pool.query(
    "INSERT INTO app_settings (skey, sval) VALUES (?, ?) ON DUPLICATE KEY UPDATE sval = VALUES(sval)",
    [SETTINGS_KEY, JSON.stringify(stored)]
  );
  await loadMailSettings();
  return publicSettings();
}

async function clearMailSettings() {
  await pool.query("DELETE FROM app_settings WHERE skey = ?", [SETTINGS_KEY]);
  await loadMailSettings();
  return publicSettings();
}

// Check the connection with the given (unsaved) values, or the saved ones; optionally send a test
async function testMailSettings(input, sendTo) {
  const base = current();
  const s = input && input.host ? { ...base, ...input, pass: input.pass || (input.host === base.host && input.user === base.user ? base.pass : "") } : base;
  if (!s.host || !s.user || !s.pass) throw Object.assign(new Error("Fill in the server, username and password first."), { status: 400 });
  const t = buildTransport({ ...s, pool: false });
  try {
    await t.verify();
    if (sendTo) {
      await t.sendMail({
        from: s.from, replyTo: s.reply_to || undefined, to: sendTo,
        subject: "MyEduPort test email",
        text: "Email from MyEduPort is working. This is a test sent from Admin → Email Settings.",
        html: "<p>Email from <strong>MyEduPort</strong> is working.</p><p>This is a test sent from Admin → Email Settings.</p>"
      });
    }
    return { ok: true, sent: !!sendTo };
  } finally {
    t.close();
  }
}

module.exports = { isMailConfigured, sendMail, loadMailSettings, publicSettings, saveMailSettings, clearMailSettings, testMailSettings };
