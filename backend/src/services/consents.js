const pool = require("../db");
const { isMailConfigured, sendMail } = require("./mailer");

// The sign-up consent form. Required: terms + AI processing (+ a guardian's agreement for
// students under 20). Optional: sharing admission results anonymously, marketing email.
// Bump CONSENT_VERSION whenever the wording on the form changes, so each record says which
// text the person agreed to.
const CONSENT_VERSION = "2026-11-draft-1";
const REQUIRED = ["terms", "ai_processing"];
const OPTIONAL = ["outcomes_sharing", "marketing_email"];
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ""));

// Checks what the sign-up form sent → { error } or { rows, ageGroup, guardianEmail }
function readSignupConsents(body, role) {
  const c = body?.consents || {};
  if (!REQUIRED.every((k) => c[k] === true)) return { error: "Please agree to the Terms and the use of your information by MEPAi to create an account." };
  let ageGroup = "adult";
  let guardianEmail = null;
  if (role === "student") {
    if (!["adult", "minor"].includes(body?.age_group)) return { error: "Tell us whether you're 20 or older." };
    ageGroup = body.age_group;
    if (ageGroup === "minor") {
      if (c.guardian !== true) return { error: "Your parent or guardian needs to agree before you can sign up." };
      guardianEmail = String(body?.guardian_email || "").trim().toLowerCase().slice(0, 190);
      if (!isEmail(guardianEmail)) return { error: "Enter your parent or guardian's email." };
      if (guardianEmail === String(body?.email || "").trim().toLowerCase()) return { error: "Use your parent or guardian's own email, not yours." };
    }
  }
  const rows = [...REQUIRED.map((k) => [k, 1]), ...OPTIONAL.map((k) => [k, c[k] === true ? 1 : 0])];
  if (ageGroup === "minor") rows.push(["guardian", 1]);
  return { rows, ageGroup, guardianEmail };
}

async function recordConsents(userId, rows, source = "signup") {
  if (!rows?.length) return;
  await pool.query(
    "INSERT INTO user_consents (user_id, consent_key, granted, version, source) VALUES ?",
    [rows.map(([k, g]) => [userId, k, g ? 1 : 0, CONSENT_VERSION, source])]
  );
}

// Latest choice per key → { key: { granted, version, at } }
async function currentConsents(userId) {
  const [rows] = await pool.query(
    `SELECT c.consent_key, c.granted, c.version, c.created_at FROM user_consents c
     JOIN (SELECT consent_key, MAX(id) id FROM user_consents WHERE user_id = ? GROUP BY consent_key) l ON l.id = c.id`,
    [userId]
  );
  return Object.fromEntries(rows.map((r) => [r.consent_key, { granted: !!r.granted, version: r.version, at: r.created_at }]));
}

// Marketing email uses the existing unsubscribe list, which every campaign already honours
async function applyMarketingChoice(email, granted) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return;
  if (granted) await pool.query("DELETE FROM email_unsubscribes WHERE email = ?", [e]);
  else await pool.query("INSERT IGNORE INTO email_unsubscribes (email, source) VALUES (?, 'consent')", [e]);
}

// Change an optional consent from Settings
async function setOptionalConsent(user, key, granted) {
  if (!OPTIONAL.includes(key)) throw Object.assign(new Error("That choice can't be changed here."), { status: 400 });
  await recordConsents(user.id, [[key, granted]], "settings");
  if (key === "marketing_email") await applyMarketingChoice(user.email, granted);
}

// Student ids whose admission results must stay out of MEPAi's statistics. Accounts from
// before the consent form have no record and keep the notice they reported results under.
async function outcomesOptedOut() {
  try {
    const [rows] = await pool.query(
      `SELECT s.id FROM students s
       JOIN user_consents c ON c.user_id = s.user_id AND c.consent_key = 'outcomes_sharing'
       JOIN (SELECT user_id, MAX(id) id FROM user_consents WHERE consent_key = 'outcomes_sharing' GROUP BY user_id) l ON l.id = c.id
       WHERE c.granted = 0`
    );
    return rows.map((r) => r.id);
  } catch { return []; }
}

// A copy for the parent or guardian of a student under 20. Never blocks sign-up.
async function notifyGuardian({ guardianEmail, studentName, rows }) {
  if (!guardianEmail || !isMailConfigured()) return;
  const app = process.env.APP_URL || "https://myeduport.ai";
  const on = (k) => rows.some(([key, g]) => key === k && g);
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#334155;max-width:560px">
<p>Hello,</p>
<p><strong>${esc(studentName)}</strong> has created a MyEduPort account to plan their university applications and listed you as their parent or guardian. They confirmed that you know about it and agree.</p>
<p>What they agreed to:</p>
<ul>
<li>MyEduPort's Terms of Service and <a href="${app}/privacy">Privacy Policy</a></li>
<li>MyEduPort and its AI advisor, MEPAi, may use what they add — grades, activities, essays and uploaded files — to give them advice</li>
<li>Use their admission results, without their name, to help future students: <strong>${on("outcomes_sharing") ? "yes" : "no"}</strong></li>
<li>Tips, deadline reminders and offers by email: <strong>${on("marketing_email") ? "yes" : "no"}</strong></li>
</ul>
<p>You can follow their portfolio with a free parent account: <a href="${app}/login">sign up as a parent</a> and enter the invite code they can create in their Portfolio. If you did not agree to this, reply to this email and we'll help.</p>
<p>— The MyEduPort team</p></div>`;
  try {
    await sendMail({ to: guardianEmail, subject: `${studentName} joined MyEduPort`, html, text: html.replace(/<[^>]+>/g, "") });
  } catch (err) {
    console.error("Guardian email failed:", err.message);
  }
}

module.exports = { CONSENT_VERSION, REQUIRED, OPTIONAL, readSignupConsents, recordConsents, currentConsents, setOptionalConsent, applyMarketingChoice, outcomesOptedOut, notifyGuardian };
