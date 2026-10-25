const crypto = require("crypto");
const pool = require("../db");
const { isMailConfigured, sendMail } = require("./mailer");

const APP_URL = () => (process.env.APP_URL || "https://myeduport.ai").replace(/\/+$/, "");
const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;

// Built-in audience segments (system users; disabled/deleted accounts never included)
const SEGMENTS = {
  free_students: { label: "Free students", where: "u.role = 'student' AND u.plan = 'free'" },
  trial_students: { label: "Students in free trial", where: "u.role = 'student' AND u.plan = 'free' AND u.trial_ends_at > NOW()" },
  trial_ended_students: { label: "Students whose trial ended", where: "u.role = 'student' AND u.plan = 'free' AND u.trial_ends_at <= NOW()" },
  essential_students: { label: "Essential students", where: "u.role = 'student' AND u.plan = 'essential'" },
  professional_students: { label: "Professional students", where: "u.role = 'student' AND u.plan = 'professional'" },
  elite_students: { label: "Elite students", where: "u.role = 'student' AND u.plan = 'elite'" },
  parents: { label: "Parents", where: "u.role = 'parent'" },
  counselors: { label: "Counselors", where: "u.role = 'counselor'" },
  all_users: { label: "All users", where: "1 = 1" }
};
const ACTIVE_USER = "u.deleted_at IS NULL AND (u.is_disabled IS NULL OR u.is_disabled = 0)";

const normEmail = (e) => String(e || "").trim().toLowerCase();
const isEmail = (e) => EMAIL_RE.test(normEmail(e)) && normEmail(e).length <= 255;
const sign = (value) => crypto.createHmac("sha256", process.env.JWT_SECRET || "myeduport").update(String(value)).digest("hex").slice(0, 20);
const signOk = (value, sig) => {
  const a = Buffer.from(sign(value));
  const b = Buffer.from(String(sig || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// "a@x.com, Name <b@y.com>\nc@z.com" → [{ email, name }]
function parseEmailList(text) {
  if (Array.isArray(text)) return text.map((x) => (typeof x === "string" ? { email: x, name: "" } : x));
  return String(text || "")
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.*?)<([^>]+)>$/);
      return m ? { name: m[1].replace(/["']/g, "").trim(), email: m[2] } : { name: "", email: line };
    });
}

// audience: { segments:[key], segmentIds:[id], groupIds:[id], userIds:[id], external:[{email,name}] | "text" }
// → { recipients:[{ email, name, user_id, plan }], invalid:[email], unsubscribed:number }
async function resolveAudience(audience = {}) {
  const map = new Map();
  const add = (r) => {
    const email = normEmail(r.email);
    if (!isEmail(email)) return false;
    const prev = map.get(email);
    // Prefer the richer (system-user) record when the same address appears twice
    if (!prev || (!prev.user_id && r.user_id)) map.set(email, { email, name: String(r.name || prev?.name || "").slice(0, 150), user_id: r.user_id || null, plan: r.plan || null });
    return true;
  };

  const segs = (audience.segments || []).filter((k) => SEGMENTS[k]);
  if (segs.length) {
    const where = segs.map((k) => `(${SEGMENTS[k].where})`).join(" OR ");
    const [rows] = await pool.query(`SELECT u.id, u.email, u.name, u.plan FROM users u WHERE ${ACTIVE_USER} AND (${where})`);
    rows.forEach((u) => add({ email: u.email, name: u.name, user_id: u.id, plan: u.plan }));
  }
  const userIds = (audience.userIds || []).map(Number).filter(Boolean);
  if (userIds.length) {
    const [rows] = await pool.query(`SELECT u.id, u.email, u.name, u.plan FROM users u WHERE ${ACTIVE_USER} AND u.id IN (?)`, [userIds]);
    rows.forEach((u) => add({ email: u.email, name: u.name, user_id: u.id, plan: u.plan }));
  }
  const groupIds = (audience.groupIds || []).map(Number).filter(Boolean);
  if (groupIds.length) {
    const [rows] = await pool.query(
      `SELECT m.email, m.name, u.id AS user_id, u.plan FROM email_group_members m
       LEFT JOIN users u ON u.email = m.email AND u.deleted_at IS NULL
       WHERE m.group_id IN (?)`,
      [groupIds]
    );
    rows.forEach((r) => add(r));
  }
  // saved dynamic segments (Audience → Segments), evaluated now
  const segIds = (audience.segmentIds || []).map(Number).filter(Boolean);
  if (segIds.length) {
    const { segmentRecipients } = require("./audience");
    for (const c of await segmentRecipients(segIds)) add({ email: c.email, name: c.name, user_id: c.user_id, plan: c.plan });
  }
  const invalid = [];
  for (const r of parseEmailList(audience.external || [])) {
    if (!add({ email: r.email, name: r.name })) invalid.push(String(r.email).slice(0, 255));
  }

  let unsubscribed = 0;
  if (map.size) {
    const [rows] = await pool.query("SELECT email FROM email_unsubscribes WHERE email IN (?)", [[...map.keys()]]);
    rows.forEach((r) => { if (map.delete(normEmail(r.email))) unsubscribed++; });
  }
  return { recipients: [...map.values()], invalid, unsubscribed };
}

const escapeHtml = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Merge tags: {{first_name}} {{name}} {{email}} {{plan}}
function personalize(text, r, { html = true } = {}) {
  const first = (r.name || "").trim().split(/\s+/)[0] || "there";
  const vals = { first_name: first, name: r.name || "there", email: r.email, plan: r.plan ? r.plan[0].toUpperCase() + r.plan.slice(1) : "Free" };
  return String(text || "").replace(/\{\{\s*(first_name|name|email|plan)\s*\}\}/g, (_, k) => (html ? escapeHtml(vals[k]) : vals[k]));
}

// Rewrite http(s) links for click tracking (signed, so it can't be used as an open redirect)
function trackLinks(html, token) {
  return html.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (m, q, url) => {
    const raw = url.replace(/&amp;/g, "&");
    return `href="${APP_URL()}/api/email/c/${token}?u=${encodeURIComponent(raw)}&amp;s=${sign(token + raw)}"`;
  });
}

// Branded, email-client-safe wrapper around the campaign body
function wrapTemplate({ bodyHtml, preheader, unsubscribeUrl, pixelUrl }) {
  const app = APP_URL();
  const address = escapeHtml(process.env.MAIL_FOOTER_ADDRESS || "MyEduPort · myeduport.ai");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>MyEduPort</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader || "")}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td style="background:#1f3461;padding:20px 32px;">
      <a href="${app}" style="text-decoration:none;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">MyEdu<span style="color:#34d399;">Port</span></a>
    </td></tr>
    <tr><td style="padding:32px;font-size:16px;line-height:1.6;color:#334155;">
${bodyHtml}
    </td></tr>
    <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b;text-align:center;">
      ${address}<br>
      You're receiving this email because you have a MyEduPort account or asked to hear from us.<br>
      <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> · <a href="${app}" style="color:#64748b;text-decoration:underline;">Visit MyEduPort</a>
    </td></tr>
  </table>
</td></tr></table>
${pixelUrl ? `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;">` : ""}
</body></html>`;
}

const htmlToText = (html) => String(html || "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
  .replace(/<(br|\/p|\/h\d|\/tr|\/li|\/div)>/gi, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/\n{3,}/g, "\n\n").trim();

// Build the final message for one recipient. token = recipient token (null for test sends)
function renderEmail(campaign, r, token) {
  const app = APP_URL();
  const unsubscribeUrl = token
    ? `${app}/api/email/unsubscribe/${token}`
    : `${app}/api/email/unsubscribe/test`;
  let body = personalize(campaign.html, r);
  if (token) body = trackLinks(body, token);
  const html = wrapTemplate({
    bodyHtml: body,
    preheader: personalize(campaign.preheader, r, { html: false }),
    unsubscribeUrl,
    pixelUrl: token ? `${app}/api/email/o/${token}.gif` : null
  });
  return {
    subject: personalize(campaign.subject, r, { html: false }),
    html,
    text: htmlToText(personalize(campaign.html, r)) + `\n\n—\nUnsubscribe: ${unsubscribeUrl}`,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
    }
  };
}

// ---------------- Sending worker ----------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let working = false;

// Freeze the audience into recipient rows at send time (fresh at the scheduled moment)
async function materializeRecipients(campaign) {
  const audience = typeof campaign.audience === "string" ? JSON.parse(campaign.audience || "{}") : (campaign.audience || {});
  const { recipients } = await resolveAudience(audience);
  for (let i = 0; i < recipients.length; i += 200) {
    const chunk = recipients.slice(i, i + 200);
    await pool.query(
      "INSERT IGNORE INTO email_campaign_recipients (campaign_id, email, name, user_id, plan, token) VALUES ?",
      [chunk.map((r) => [campaign.id, r.email, r.name || "", r.user_id, r.plan, crypto.randomBytes(16).toString("hex")])]
    );
  }
  const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM email_campaign_recipients WHERE campaign_id = ?", [campaign.id]);
  await pool.query("UPDATE email_campaigns SET total = ? WHERE id = ?", [n, campaign.id]);
}

async function refreshCounts(campaignId) {
  await pool.query(
    `UPDATE email_campaigns c SET
       sent_count = (SELECT COUNT(*) FROM email_campaign_recipients r WHERE r.campaign_id = c.id AND r.status = 'sent'),
       failed_count = (SELECT COUNT(*) FROM email_campaign_recipients r WHERE r.campaign_id = c.id AND r.status = 'failed')
     WHERE c.id = ?`,
    [campaignId]
  );
}

async function failCampaign(campaignId, error) {
  await pool.query("UPDATE email_campaigns SET status = 'failed', last_error = ? WHERE id = ?", [String(error).slice(0, 1000), campaignId]);
}

async function processCampaign(campaignId) {
  const delay = Math.max(50, Math.round(1000 / Number(process.env.EMAIL_RATE_PER_SEC || 5)));
  const stillSending = async () => {
    const [[x]] = await pool.query("SELECT status FROM email_campaigns WHERE id = ?", [campaignId]);
    return x && x.status === "sending";
  };
  for (;;) {
    const [[campaign]] = await pool.query("SELECT * FROM email_campaigns WHERE id = ?", [campaignId]);
    if (!campaign || campaign.status !== "sending") return; // cancelled / edited
    const [batch] = await pool.query(
      "SELECT * FROM email_campaign_recipients WHERE campaign_id = ? AND status = 'pending' ORDER BY id LIMIT 25",
      [campaignId]
    );
    if (!batch.length) break;
    for (const r of batch) {
      if (!(await stillSending())) return; // cancel takes effect before the next email
      // Atomically claim the row so no other worker/process can send it too
      const [claim] = await pool.query("UPDATE email_campaign_recipients SET status = 'sending' WHERE id = ? AND status = 'pending'", [r.id]);
      if (!claim.affectedRows) continue;
      const [[unsub]] = await pool.query("SELECT email FROM email_unsubscribes WHERE email = ?", [r.email]);
      if (unsub) {
        await pool.query("UPDATE email_campaign_recipients SET status = 'skipped', error = 'unsubscribed' WHERE id = ?", [r.id]);
        continue;
      }
      let delivered = false;
      try {
        const msg = renderEmail(campaign, r, r.token);
        await sendMail({ to: r.name ? `"${r.name.replace(/"/g, "")}" <${r.email}>` : r.email, ...msg });
        delivered = true;
        await pool.query("UPDATE email_campaign_recipients SET status = 'sent', sent_at = NOW(), error = NULL WHERE id = ?", [r.id]);
      } catch (err) {
        if (!delivered) {
          await pool.query("UPDATE email_campaign_recipients SET status = 'failed', error = ? WHERE id = ?", [String(err.message || err).slice(0, 500), r.id]).catch(() => {});
          await pool.query("UPDATE email_campaigns SET last_error = ? WHERE id = ?", [String(err.message || err).slice(0, 1000), campaignId]).catch(() => {});
        }
        // delivered but the status write failed: the row stays 'sending' and is never re-sent
      }
      await sleep(delay);
    }
    await refreshCounts(campaignId);
  }
  await refreshCounts(campaignId);
  const [[c]] = await pool.query("SELECT status, sent_count, failed_count FROM email_campaigns WHERE id = ?", [campaignId]);
  if (c && c.status === "sending") {
    const final = c.sent_count === 0 ? "failed" : "sent";
    await pool.query(
      "UPDATE email_campaigns SET status = ?, sent_at = NOW(), last_error = IF(? = 'failed' AND last_error IS NULL, 'Nothing was delivered', last_error) WHERE id = ?",
      [final, final, campaignId]
    );
  }
}

// Runs every 30s: starts due scheduled campaigns and resumes any interrupted sends.
async function tick() {
  if (working) return;
  working = true;
  try {
    if (!isMailConfigured()) return;
    const [due] = await pool.query("SELECT id, scheduled_at FROM email_campaigns WHERE status = 'scheduled'");
    const now = Date.now();
    for (const c of due) {
      if (c.scheduled_at && new Date(c.scheduled_at).getTime() > now) continue;
      const [claim] = await pool.query(
        "UPDATE email_campaigns SET status = 'sending', started_at = NOW(), total = 0, last_error = NULL WHERE id = ? AND status = 'scheduled'",
        [c.id]
      );
      if (!claim.affectedRows) continue;
    }
    const [sending] = await pool.query("SELECT * FROM email_campaigns WHERE status = 'sending' ORDER BY id");
    for (const c of sending) {
      // total = 0 means the recipient list isn't complete yet (new, or interrupted mid-build).
      // Building is idempotent (INSERT IGNORE on campaign+email), so just run it again.
      if (!c.total) {
        try {
          await materializeRecipients(c);
        } catch (err) {
          await failCampaign(c.id, `Could not build the recipient list: ${err.message}`);
          continue;
        }
        const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM email_campaign_recipients WHERE campaign_id = ?", [c.id]);
        if (!n) { await failCampaign(c.id, "No recipients at send time (audience empty or everyone unsubscribed)"); continue; }
      }
      await processCampaign(c.id);
    }
  } catch (err) {
    console.error("[email-worker]", err.message);
  } finally {
    working = false;
  }
}

function startEmailWorker() {
  setInterval(tick, 30 * 1000).unref();
  setTimeout(tick, 5 * 1000).unref();
}

module.exports = {
  SEGMENTS,
  APP_URL,
  normEmail,
  isEmail,
  sign,
  signOk,
  parseEmailList,
  resolveAudience,
  renderEmail,
  tick,
  startEmailWorker
};
