const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { isMailConfigured, sendMail } = require("./mailer");
const { seal, open } = require("./secretBox");

// Consent at registration and parent confirmation, following
// MyEduPort_Consent_Form_202611.docx:
//   - Everyone ticks their own boxes (terms_privacy, cross_border required; marketing,
//     ai_improvement optional), every box starting unticked.
//   - Students under 20 (Thailand's PDPA age) give a parent's email. Their account is
//     limited until the parent confirms through an emailed link; the parent ticks
//     parent_consent + cross_border (required) and marketing, ai_improvement,
//     parent_dashboard (optional).
//   - Not confirmed within N days (Admin setting, default 14) → the new student's data is
//     deleted. Accounts from before the form are restricted instead, never deleted.
//   - Every choice is a new row in user_consents: who, which box, value, wording version,
//     time, IP, and whether the student or a parent gave it.
// Bump CONSENT_VERSION whenever the wording changes materially: everyone is asked again at
// their next sign-in.

const CONSENT_VERSION = "2026-11-v1";
const ADULT_AGE = 20;
const SELF_REQUIRED = ["terms_privacy", "cross_border"];
const OPTIONAL = ["marketing", "ai_improvement"];
const PARENT_REQUIRED = ["parent_consent", "cross_border"];
const PARENT_OPTIONAL = ["marketing", "ai_improvement", "parent_dashboard"];
const RELATIONSHIPS = ["father", "mother", "legal_guardian"];
const DAY = 86400000;

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
const clean = (s, n) => String(s || "").trim().slice(0, n);
const appUrl = () => (process.env.APP_URL || "https://myeduport.ai").replace(/\/$/, "");
const hash = (t) => crypto.createHash("sha256").update(t).digest("hex");
const esc = (s) => String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const clientIp = (req) => clean(String(req?.headers?.["x-real-ip"] || req?.ip || "").split(",")[0], 45) || null;

// ---------------------------------------------------------------- settings

async function getConsentSettings() {
  try {
    const [[row]] = await pool.query("SELECT sval FROM app_settings WHERE skey = 'consent_settings'");
    const v = row ? (typeof row.sval === "string" ? JSON.parse(row.sval) : row.sval) : {};
    const num = (x, d) => (x === undefined || x === null || x === "" || !Number.isFinite(Number(x)) ? d : Number(x));
    return { parent_days: num(v.parent_days, 14), closed_account_days: num(v.closed_account_days, 30) };
  } catch { return { parent_days: 14, closed_account_days: 30 }; }
}

async function setConsentSettings(input) {
  const parent_days = Math.round(Number(input.parent_days));
  const closed_account_days = Math.round(Number(input.closed_account_days));
  if (!(parent_days >= 1 && parent_days <= 90)) throw Object.assign(new Error("Days to wait for a parent: 1–90."), { status: 400 });
  if (!(closed_account_days >= 0 && closed_account_days <= 365)) throw Object.assign(new Error("Days before deleting a closed account: 0–365."), { status: 400 });
  await pool.query("INSERT INTO app_settings (skey, sval) VALUES ('consent_settings', ?) ON DUPLICATE KEY UPDATE sval = VALUES(sval)", [JSON.stringify({ parent_days, closed_account_days })]);
  return getConsentSettings();
}

// Company details shown in the privacy summary and consent pages (Admin → Consents).
// Empty fields stay as highlighted placeholders on the site until an admin fills them.
async function getLegalInfo() {
  let v = {};
  try {
    const [[row]] = await pool.query("SELECT sval FROM app_settings WHERE skey = 'legal_info'");
    if (row) v = typeof row.sval === "string" ? JSON.parse(row.sval) : row.sval;
  } catch { /* defaults */ }
  const { closed_account_days } = await getConsentSettings();
  return {
    entity_name: v.entity_name || "",
    countries: v.countries || "",
    dpo_email: v.dpo_email || "",
    backup_days: v.backup_days ?? null,
    delete_days: closed_account_days
  };
}

async function setLegalInfo(input) {
  const out = {
    entity_name: clean(input.entity_name, 160) || "",
    countries: clean(input.countries, 200) || "",
    dpo_email: clean(input.dpo_email, 190) || "",
    backup_days: input.backup_days === "" || input.backup_days == null ? null : Math.round(Number(input.backup_days))
  };
  if (out.dpo_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.dpo_email)) throw Object.assign(new Error("DPO email doesn't look right."), { status: 400 });
  if (out.backup_days !== null && !(out.backup_days >= 0 && out.backup_days <= 730)) throw Object.assign(new Error("Backup deletion days: 0–730."), { status: 400 });
  await pool.query("INSERT INTO app_settings (skey, sval) VALUES ('legal_info', ?) ON DUPLICATE KEY UPDATE sval = VALUES(sval)", [JSON.stringify(out)]);
  return getLegalInfo();
}

// ---------------------------------------------------------------- age

function ageOn(birthDate, today = new Date()) {
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const m = today.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

function readBirthDate(value) {
  const s = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { error: "Enter your date of birth." };
  const age = ageOn(s);
  if (age == null || age < 8 || age > 100) return { error: "Check your date of birth." };
  return { birthDate: s, age, minor: age < ADULT_AGE };
}

// ---------------------------------------------------------------- the student's own boxes

// What the registration form sent → { error } or { rows, birthDate, minor, parentEmail, parentPhone }
function readSignupConsents(body, role) {
  const c = body?.consents || {};
  if (!SELF_REQUIRED.every((k) => c[k] === true)) return { error: "Tick the two required boxes to create your account." };
  const out = { rows: [...SELF_REQUIRED.map((k) => [k, 1]), ...OPTIONAL.map((k) => [k, c[k] === true ? 1 : 0])], birthDate: null, minor: false, parentEmail: null, parentPhone: null };
  if (role !== "student") return out;
  const bd = readBirthDate(body?.birth_date);
  if (bd.error) return bd;
  Object.assign(out, { birthDate: bd.birthDate, minor: bd.minor });
  if (bd.minor) {
    const p = readParentContact(body, body?.email);
    if (p.error) return p;
    Object.assign(out, p);
  }
  return out;
}

function readParentContact(body, ownEmail) {
  const parentEmail = clean(body?.parent_email, 190).toLowerCase();
  const parentPhone = clean(body?.parent_phone, 40) || null;
  if (!isEmail(parentEmail)) return { error: "Enter your parent or guardian's email." };
  if (parentEmail === String(ownEmail || "").trim().toLowerCase()) return { error: "Use your parent or guardian's own email, not yours." };
  if (parentPhone && !/^[+()\d\s-]{6,40}$/.test(parentPhone)) return { error: "Check the phone number." };
  return { parentEmail, parentPhone };
}

async function recordConsents(userId, rows, { source = "signup", by = "self", actorUserId = null, ip = null } = {}) {
  if (!rows?.length) return;
  await pool.query(
    "INSERT INTO user_consents (user_id, consent_key, granted, version, source, consented_by, actor_user_id, ip) VALUES ?",
    [rows.map(([k, g]) => [userId, k, g ? 1 : 0, CONSENT_VERSION, source, by, actorUserId, ip])]
  );
}

// Latest choice per box → { key: { granted, version, at, by } }
async function currentConsents(userId) {
  const [rows] = await pool.query(
    `SELECT c.consent_key, c.granted, c.version, c.created_at, c.consented_by FROM user_consents c
     JOIN (SELECT consent_key, MAX(id) id FROM user_consents WHERE user_id = ? GROUP BY consent_key) l ON l.id = c.id`,
    [userId]
  );
  return Object.fromEntries(rows.map((r) => [r.consent_key, { granted: !!r.granted, version: r.version, at: r.created_at, by: r.consented_by }]));
}

// True when the required boxes haven't been agreed to with the current wording
async function needsReconsent(userId) {
  const cur = await currentConsents(userId).catch(() => ({}));
  return !SELF_REQUIRED.every((k) => cur[k]?.granted && cur[k]?.version === CONSENT_VERSION);
}

// Marketing email uses the unsubscribe list every campaign already honours
async function applyMarketingChoice(email, granted) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return;
  if (granted) await pool.query("DELETE FROM email_unsubscribes WHERE email = ?", [e]);
  else await pool.query("INSERT IGNORE INTO email_unsubscribes (email, source) VALUES (?, 'consent')", [e]);
}

// Change an optional box from Privacy settings (the student) or the Parent Dashboard (a parent)
async function setOptionalConsent(targetUser, key, granted, { by = "self", actorUserId = null, ip = null } = {}) {
  if (!OPTIONAL.includes(key)) throw Object.assign(new Error("That choice can't be changed here."), { status: 400 });
  await recordConsents(targetUser.id, [[key, granted]], { source: "settings", by, actorUserId, ip });
  if (key === "marketing") await applyMarketingChoice(targetUser.email, granted);
}

// Students whose de-identified data (incl. admission results) must stay out of MEPAi's
// statistics: the latest ai_improvement (or the earlier outcomes_sharing) choice is "no".
// Accounts with no record yet keep the notice they reported results under.
async function outcomesOptedOut() {
  try {
    const [rows] = await pool.query(
      `SELECT s.id FROM students s
       JOIN user_consents c ON c.user_id = s.user_id AND c.consent_key IN ('ai_improvement','outcomes_sharing')
       JOIN (SELECT user_id, MAX(id) id FROM user_consents WHERE consent_key IN ('ai_improvement','outcomes_sharing') GROUP BY user_id) l ON l.id = c.id
       WHERE c.granted = 0`
    );
    return rows.map((r) => r.id);
  } catch { return []; }
}

// ---------------------------------------------------------------- parent requests

const linkFor = (token) => `${appUrl()}/parent-consent/${token}`;

async function sendParentEmail(reqRow, studentName, token, kind = "first") {
  if (!isMailConfigured()) return false;
  const link = linkFor(token);
  const days = Math.max(0, Math.ceil((new Date(reqRow.expires_at).getTime() - Date.now() - 60000) / DAY));
  const first = kind === "first";
  const name = esc(studentName || "Your child");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#334155;font-size:15px;line-height:1.6">
<div style="background:#1f3461;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:20px;font-weight:800">MyEdu<span style="color:#34d399">Port</span></div>
<div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
<p style="font-size:18px;font-weight:bold;color:#1f3461;margin:0 0 12px">${first ? `${name} would like to use MyEduPort` : `Reminder: ${name} is waiting for your consent`}</p>
<p>${name} has registered for MyEduPort, an AI platform that helps students build their portfolio and plan university applications. Because they are under 20, we need a parent or guardian's consent before we collect and use their data.</p>
<p style="margin:20px 0"><a href="${link}" style="display:inline-block;background:#0f9d6e;color:#fff;padding:14px 26px;border-radius:10px;text-decoration:none;font-weight:bold">Review and give consent</a></p>
<p>On that page you can see exactly what data we use and why, choose what you agree to, and create a free parent account to follow ${name}'s progress.</p>
<p style="background:#fef3c7;border-radius:8px;padding:10px 14px;color:#92400e">${days > 0 ? `If we don't hear from you within <strong>${days} day${days === 1 ? "" : "s"}</strong>, the information ${name} entered will be deleted.` : "This request has expired."}</p>
<p style="color:#64748b;font-size:13px">Didn't expect this? You can ignore the email, or open the link and choose “I don't agree” to delete the account now. Questions: reply to this email.</p>
<p style="color:#94a3b8;font-size:12px;word-break:break-all">If the button doesn't work, copy this link: ${link}</p>
</div></div>`;
  try {
    await sendMail({
      to: reqRow.parent_email,
      subject: first ? `${studentName || "Your child"} would like to use MyEduPort — your consent is needed` : `Reminder: ${studentName || "your child"} is waiting for your consent`,
      html,
      text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    });
    await pool.query("UPDATE parent_consent_requests SET last_sent_at = NOW() WHERE id = ?", [reqRow.id]);
    return true;
  } catch (err) {
    console.error("[parent-consent] email failed:", err.message);
    return false;
  }
}

// Start (or restart) the parent confirmation for a student. Older open requests are replaced.
async function startParentRequest(studentUserId, { parentEmail, parentPhone, isExisting = false }) {
  const { parent_days } = await getConsentSettings();
  const token = crypto.randomBytes(24).toString("base64url");
  await pool.query("UPDATE parent_consent_requests SET status = 'replaced', decided_at = NOW() WHERE student_user_id = ? AND status = 'pending'", [studentUserId]);
  const expires = new Date(Date.now() + parent_days * DAY);
  const [r] = await pool.query(
    "INSERT INTO parent_consent_requests (student_user_id, token_hash, token_enc, parent_email, parent_phone, is_existing, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [studentUserId, hash(token), seal("parent-consent", token), parentEmail, parentPhone || null, isExisting ? 1 : 0, expires]
  );
  await pool.query("UPDATE users SET parent_consent_status = 'pending', guardian_email = ?, guardian_phone = ? WHERE id = ?", [parentEmail, parentPhone || null, studentUserId]);
  const [[student]] = await pool.query("SELECT name FROM users WHERE id = ?", [studentUserId]);
  const reqRow = { id: r.insertId, parent_email: parentEmail, expires_at: expires };
  const emailed = await sendParentEmail(reqRow, student?.name, token, "first");
  return { id: r.insertId, emailed, link: linkFor(token), expires_at: expires };
}

// The student's open request, with the link so they can share it themselves
async function myRequest(studentUserId) {
  const [[r]] = await pool.query(
    "SELECT * FROM parent_consent_requests WHERE student_user_id = ? ORDER BY id DESC LIMIT 1", [studentUserId]
  );
  const [[u]] = await pool.query("SELECT parent_consent_status, guardian_email, created_at FROM users WHERE id = ?", [studentUserId]);
  if (!r) return { status: u?.parent_consent_status || "not_required" };
  const token = r.status === "pending" ? open("parent-consent", r.token_enc) : null;
  return {
    status: u?.parent_consent_status || r.status,
    request_status: r.status,
    parent_email: r.parent_email,
    parent_phone: r.parent_phone,
    is_existing: !!r.is_existing,
    created_at: r.created_at,
    expires_at: r.expires_at,
    days_left: Math.max(0, Math.ceil((new Date(r.expires_at).getTime() - Date.now() - 60000) / DAY)),
    last_sent_at: r.last_sent_at,
    email_enabled: isMailConfigured(),
    link: token ? linkFor(token) : null
  };
}

async function resendRequest(studentUserId) {
  const [[r]] = await pool.query("SELECT * FROM parent_consent_requests WHERE student_user_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1", [studentUserId]);
  if (!r) throw Object.assign(new Error("There's no open request. Enter your parent's email to send one."), { status: 400 });
  if (r.last_sent_at && Date.now() - new Date(r.last_sent_at).getTime() < 2 * 60 * 1000) {
    throw Object.assign(new Error("We just sent it — wait a couple of minutes before sending again."), { status: 429 });
  }
  if (!isMailConfigured()) throw Object.assign(new Error("Email isn't available right now. Copy the link and send it to your parent on LINE instead."), { status: 503 });
  const [[student]] = await pool.query("SELECT name FROM users WHERE id = ?", [studentUserId]);
  const ok = await sendParentEmail(r, student?.name, open("parent-consent", r.token_enc), "first");
  if (!ok) throw Object.assign(new Error("The email couldn't be sent. Copy the link and send it to your parent instead."), { status: 502 });
  return myRequest(studentUserId);
}

// What the parent sees when they open the link
async function requestByToken(token) {
  const [[r]] = await pool.query("SELECT * FROM parent_consent_requests WHERE token_hash = ?", [hash(String(token || ""))]);
  if (!r) return null;
  const [[student]] = await pool.query("SELECT id, name, email FROM users WHERE id = ? AND deleted_at IS NULL", [r.student_user_id]);
  if (!student) return null;
  const [[parentAcct]] = await pool.query("SELECT id, role FROM users WHERE email = ? AND deleted_at IS NULL", [r.parent_email]);
  const expired = r.status === "pending" && new Date(r.expires_at).getTime() < Date.now();
  return {
    row: r,
    view: {
      status: expired ? "expired" : r.status,
      student_name: student.name,
      parent_email: r.parent_email,
      parent_phone: r.parent_phone,
      expires_at: r.expires_at,
      version: CONSENT_VERSION,
      existing_account: parentAcct ? (parentAcct.role === "parent" ? "parent" : "other") : null
    },
    student
  };
}

// The parent agrees. Optionally creates (or links) their parent account → returns { token? }
async function confirmRequest(token, body, ip, { bcrypt, buildToken, startTrial }) {
  const found = await requestByToken(token);
  if (!found || found.view.status !== "pending") throw Object.assign(new Error("This link has already been used or has expired. Ask your child to send a new one."), { status: 410 });
  const { row, student } = found;
  const c = body?.consents || {};
  if (!PARENT_REQUIRED.every((k) => c[k] === true)) throw Object.assign(new Error("Tick the two required boxes to give consent."), { status: 400 });
  const parentName = clean(body?.parent_name, 150);
  const relationship = RELATIONSHIPS.includes(body?.relationship) ? body.relationship : null;
  const phone = clean(body?.parent_phone, 40) || row.parent_phone || null;
  if (!parentName) throw Object.assign(new Error("Enter your full name."), { status: 400 });
  if (!relationship) throw Object.assign(new Error("Choose your relationship to the student."), { status: 400 });
  const wantsDashboard = c.parent_dashboard === true;
  const password = String(body?.password || "");

  // Parent account: link an existing parent account (password checked) or create one
  let parentUser = null;
  if (wantsDashboard) {
    const [[existing]] = await pool.query("SELECT id, role, password_hash, name, email FROM users WHERE email = ? AND deleted_at IS NULL", [row.parent_email]);
    if (existing) {
      if (existing.role !== "parent") throw Object.assign(new Error("This email already belongs to a non-parent account. Untick “Parent Dashboard”, or use a different email."), { status: 409 });
      if (!existing.password_hash || !(await bcrypt.compare(password, existing.password_hash))) {
        throw Object.assign(new Error("Enter the password of your existing MyEduPort parent account to link it."), { status: 401 });
      }
      parentUser = existing;
    } else {
      if (password.length < 8) throw Object.assign(new Error("Choose a password of at least 8 characters for your parent account."), { status: 400 });
      const [r] = await pool.query(
        "INSERT INTO users (email, password_hash, role, name, data_consent, age_group) VALUES (?, ?, 'parent', ?, TRUE, 'adult')",
        [row.parent_email, await bcrypt.hash(password, 10), parentName]
      );
      await pool.query("INSERT INTO parents (user_id) VALUES (?)", [r.insertId]);
      await startTrial(r.insertId).catch(() => {});
      parentUser = { id: r.insertId, role: "parent", email: row.parent_email, name: parentName };
      // the parent's own boxes for their own account
      await recordConsents(parentUser.id, [["terms_privacy", 1], ["cross_border", 1], ["marketing", c.marketing === true ? 1 : 0], ["ai_improvement", 0]], { source: "parent_form", by: "self", ip });
      await applyMarketingChoice(row.parent_email, c.marketing === true);
    }
    const [[parentRow]] = await pool.query("SELECT id FROM parents WHERE user_id = ?", [parentUser.id]);
    const [[studentRow]] = await pool.query("SELECT id FROM students WHERE user_id = ?", [student.id]);
    if (parentRow && studentRow) {
      await pool.query("INSERT IGNORE INTO parent_student_links (parent_id, student_id, invite_code) VALUES (?, ?, 'consent')", [parentRow.id, studentRow.id]);
    }
  }

  // The parent's choices about the student's data
  await recordConsents(student.id, [
    ["parent_consent", 1], ["cross_border", 1],
    ["marketing", c.marketing === true ? 1 : 0], ["ai_improvement", c.ai_improvement === true ? 1 : 0],
    ["parent_dashboard", wantsDashboard ? 1 : 0]
  ], { source: "parent_form", by: "parent", actorUserId: parentUser?.id || null, ip });
  await applyMarketingChoice(student.email, c.marketing === true);
  await pool.query(
    "UPDATE parent_consent_requests SET status = 'confirmed', decided_at = NOW(), parent_name = ?, relationship = ?, parent_phone = ?, parent_user_id = ? WHERE id = ?",
    [parentName, relationship, phone, parentUser?.id || null, row.id]
  );
  await pool.query("UPDATE users SET parent_consent_status = 'confirmed', guardian_phone = ? WHERE id = ?", [phone, student.id]);
  return { student_name: student.name, token: parentUser ? buildToken({ id: parentUser.id, role: "parent", email: parentUser.email }) : null };
}

// The parent says no → the student's account and data are deleted now
async function declineRequest(token, ip) {
  const found = await requestByToken(token);
  if (!found || !["pending", "expired"].includes(found.view.status)) throw Object.assign(new Error("This link has already been used."), { status: 410 });
  await pool.query("UPDATE parent_consent_requests SET status = 'declined', decided_at = NOW() WHERE id = ?", [found.row.id]);
  console.log(`[parent-consent] declined by parent (ip ${ip || "?"}) — deleting student user ${found.student.id}`);
  await hardDeleteUser(found.student.id);
  return { student_name: found.student.name };
}

// True while a student under 20 is waiting for their parent and has no access to AI,
// uploads and portfolio changes. Accounts from before the consent form keep full access
// until their request expires.
async function isLimited(userId) {
  const [[u]] = await pool.query(
    `SELECT u.parent_consent_status,
            (SELECT CONCAT(r.is_existing, ':', r.status, ':', UNIX_TIMESTAMP(r.expires_at)) FROM parent_consent_requests r
              WHERE r.student_user_id = u.id ORDER BY r.id DESC LIMIT 1) AS req
     FROM users u WHERE u.id = ?`,
    [userId]
  );
  if (!u || u.parent_consent_status !== "pending") return false;
  const [existing, status, expiresAt] = String(u.req || "").split(":");
  return !(existing === "1" && status === "pending" && Number(expiresAt) * 1000 > Date.now());
}

// ---------------------------------------------------------------- deletion

// Permanently remove a user, everything linked to them (database cascades), and their files
async function hardDeleteUser(userId) {
  const [[st]] = await pool.query("SELECT id FROM students WHERE user_id = ?", [userId]);
  if (st) {
    const [docs] = await pool.query("SELECT file_path FROM documents WHERE student_id = ?", [st.id]);
    const dir = path.join(__dirname, "..", "..", process.env.UPLOAD_DIR || "uploads");
    for (const d of docs) fs.unlink(path.join(dir, path.basename(String(d.file_path || ""))), () => {});
  }
  await pool.query("DELETE FROM users WHERE id = ?", [userId]);
}

// Hourly: reminders, expiry, and purging closed accounts. Safe to run more than once.
async function runConsentJobs() {
  const { parent_days, closed_account_days } = await getConsentSettings();
  const out = { reminded: 0, deleted: 0, restricted: 0, purged: 0 };
  // Reminders on day 3 and 4 days before the deadline (for the default 14: day 3 and day 10)
  const [open_] = await pool.query("SELECT r.*, u.name FROM parent_consent_requests r JOIN users u ON u.id = r.student_user_id WHERE r.status = 'pending' AND r.expires_at > NOW()");
  for (const r of open_) {
    const ageDays = (Date.now() - new Date(r.created_at).getTime()) / DAY;
    const due = (r.reminders_sent === 0 && ageDays >= 3) || (r.reminders_sent === 1 && ageDays >= Math.max(4, parent_days - 4));
    if (!due || r.reminders_sent >= 2) continue;
    if (await sendParentEmail(r, r.name, open("parent-consent", r.token_enc), "reminder")) {
      await pool.query("UPDATE parent_consent_requests SET reminders_sent = reminders_sent + 1 WHERE id = ?", [r.id]);
      out.reminded++;
    }
  }
  // Expired: new accounts are deleted; accounts from before the form stay restricted
  const [expired] = await pool.query("SELECT * FROM parent_consent_requests WHERE status = 'pending' AND expires_at <= NOW()");
  for (const r of expired) {
    await pool.query("UPDATE parent_consent_requests SET status = 'expired', decided_at = NOW() WHERE id = ?", [r.id]);
    if (r.is_existing) { out.restricted++; continue; }
    const [[u]] = await pool.query("SELECT parent_consent_status FROM users WHERE id = ?", [r.student_user_id]);
    if (u && u.parent_consent_status === "pending") { await hardDeleteUser(r.student_user_id); out.deleted++; }
  }
  // Closed accounts: deleted after the retention period
  const [closed] = await pool.query("SELECT id FROM users WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL ? DAY", [closed_account_days]);
  for (const u of closed) { await hardDeleteUser(u.id); out.purged++; }
  if (out.reminded || out.deleted || out.restricted || out.purged) console.log("[consent-jobs]", JSON.stringify(out));
  return out;
}

// For the Admin view
async function adminOverview() {
  const [rows] = await pool.query(
    `SELECT r.id, r.status, r.parent_email, r.created_at, r.expires_at, r.reminders_sent, r.last_sent_at, r.is_existing, r.decided_at,
            u.name AS student_name, u.email AS student_email
     FROM parent_consent_requests r JOIN users u ON u.id = r.student_user_id
     ORDER BY r.id DESC LIMIT 200`
  );
  const [[counts]] = await pool.query(
    `SELECT SUM(parent_consent_status = 'pending') pending, SUM(parent_consent_status = 'confirmed') confirmed,
            SUM(deleted_at IS NOT NULL) closed FROM users`
  );
  return { settings: await getConsentSettings(), legal: await getLegalInfo(), version: CONSENT_VERSION, email_enabled: isMailConfigured(), counts, requests: rows };
}

module.exports = {
  CONSENT_VERSION, SELF_REQUIRED, OPTIONAL, PARENT_REQUIRED, PARENT_OPTIONAL, ADULT_AGE,
  clientIp, ageOn, readBirthDate, readParentContact, readSignupConsents, recordConsents, currentConsents, needsReconsent,
  applyMarketingChoice, setOptionalConsent, outcomesOptedOut,
  getConsentSettings, setConsentSettings, getLegalInfo, setLegalInfo,
  startParentRequest, myRequest, resendRequest, requestByToken, confirmRequest, declineRequest,
  isLimited, hardDeleteUser, runConsentJobs, adminOverview
};
