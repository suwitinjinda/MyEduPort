const express = require("express");
const pool = require("../db");
const { signOk, APP_URL } = require("../services/emailMarketing");

// Public (no login) endpoints linked from marketing emails: unsubscribe, open pixel, click redirect
const router = express.Router();

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const validToken = (t) => /^[a-f0-9]{32}$/.test(String(t || ""));

function page(title, message) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f1f5f9;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:480px;margin:64px auto;background:#fff;border-radius:12px;padding:32px;text-align:center;">
<div style="font-size:22px;font-weight:800;color:#1f3461;margin-bottom:16px;">MyEdu<span style="color:#0f9d6e;">Port</span></div>
<h1 style="font-size:20px;color:#1f3461;margin:0 0 12px;">${title}</h1>
<p style="color:#475569;line-height:1.6;margin:0 0 20px;">${message}</p>
<a href="${APP_URL()}" style="color:#0f9d6e;font-weight:600;">Go to MyEduPort →</a>
</div></body></html>`;
}

async function unsubscribe(token) {
  const [[r]] = await pool.query("SELECT email FROM email_campaign_recipients WHERE token = ?", [token]);
  if (!r) return null;
  await pool.query("INSERT IGNORE INTO email_unsubscribes (email, source) VALUES (?, 'link')", [r.email]);
  return r.email;
}

// GET only shows a confirm button: link-scanning mail filters prefetch URLs and must not
// unsubscribe people by accident. The button (and RFC 8058 one-click) POSTs.
router.get("/unsubscribe/:token", async (req, res) => {
  const { token } = req.params;
  if (token === "test") return res.send(page("This is a test email", "Unsubscribe links work in real sends — nothing was changed."));
  if (!validToken(token)) return res.status(400).send(page("Invalid link", "This unsubscribe link is not valid."));
  const [[r]] = await pool.query("SELECT email FROM email_campaign_recipients WHERE token = ?", [token]);
  if (!r) return res.status(404).send(page("Link expired", "We couldn't find this subscription."));
  const masked = r.email.replace(/^(.).*(@.*)$/, "$1•••$2");
  return res.send(page("Unsubscribe from MyEduPort emails?", `${masked} will stop receiving marketing emails. Account emails (like password resets) are not affected.</p>
<form method="post" action="${APP_URL()}/api/email/unsubscribe/${token}" style="margin:0 0 20px;"><button type="submit" style="background:#1f3461;color:#fff;border:0;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:700;cursor:pointer;">Unsubscribe</button></form><p style="display:none">`));
});

router.post("/unsubscribe/:token", async (req, res) => {
  const { token } = req.params;
  const email = validToken(token) ? await unsubscribe(token) : null;
  if (!email) return res.status(404).send(page("Link expired", "We couldn't find this subscription."));
  const masked = email.replace(/^(.).*(@.*)$/, "$1•••$2");
  return res.send(page("You're unsubscribed", `${masked} won't receive marketing emails from MyEduPort anymore.`));
});

router.get("/o/:file", async (req, res) => {
  const token = String(req.params.file).replace(/\.gif$/, "");
  if (validToken(token)) {
    pool.query("UPDATE email_campaign_recipients SET opened_at = COALESCE(opened_at, NOW()) WHERE token = ?", [token]).catch(() => {});
  }
  res.set({ "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, private" });
  res.send(PIXEL);
});

router.get("/c/:token", async (req, res) => {
  const { token } = req.params;
  const url = String(req.query.u || "");
  if (!validToken(token) || !/^https?:\/\//i.test(url) || !signOk(token + url, req.query.s)) {
    return res.redirect(302, APP_URL());
  }
  pool.query(
    "UPDATE email_campaign_recipients SET clicked_at = COALESCE(clicked_at, NOW()), opened_at = COALESCE(opened_at, NOW()) WHERE token = ?",
    [token]
  ).catch(() => {});
  return res.redirect(302, url);
});

module.exports = router;
