const nodemailer = require("nodemailer");

// Outgoing email over SMTP — works with any provider (Amazon SES, Resend, SendGrid,
// Brevo, Google Workspace…). Configure in backend/.env:
//   SMTP_HOST, SMTP_PORT (587 or 465), SMTP_USER, SMTP_PASS
//   MAIL_FROM      e.g. "MyEduPort <hello@myeduport.ai>"
//   MAIL_REPLY_TO  optional
let transporter = null;

function isMailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 3
    });
  }
  return transporter;
}

// { to, subject, html, text, headers } → nodemailer info. Throws if not configured or on SMTP error.
async function sendMail({ to, subject, html, text, headers }) {
  const t = getTransporter();
  if (!t) throw new Error("Email is not configured (set SMTP_HOST / SMTP_USER / SMTP_PASS / MAIL_FROM)");
  return t.sendMail({
    from: process.env.MAIL_FROM,
    replyTo: process.env.MAIL_REPLY_TO || undefined,
    to,
    subject,
    html,
    text,
    headers
  });
}

module.exports = { isMailConfigured, sendMail };
