const pool = require("../db");

// Email Marketing → Audience: one merged view of everyone we can email —
// system users (with plan / trial / grade / countries) + external contacts (imported,
// added by hand, or only in a group) — plus tags, groups and subscription status.

const parse = (v, fb) => { try { return typeof v === "string" ? JSON.parse(v) : (v ?? fb); } catch { return fb; } };
const norm = (e) => String(e || "").trim().toLowerCase();

async function listAudience() {
  const q = async (sql, p = []) => { try { const [r] = await pool.query(sql, p); return r; } catch { return []; } };
  const users = await q(
    `SELECT u.id, u.email, u.name, u.role, u.plan, u.trial_ends_at, u.created_at,
            s.grade_level, s.target_countries, s.school
     FROM users u LEFT JOIN students s ON s.user_id = u.id
     WHERE u.deleted_at IS NULL AND (u.is_disabled IS NULL OR u.is_disabled = 0)`
  );
  const contacts = await q("SELECT email, name, tags, source, consent, created_at FROM email_contacts");
  const members = await q("SELECT m.email, m.name, m.added_at, g.id AS group_id, g.name AS group_name FROM email_group_members m JOIN email_groups g ON g.id = m.group_id");
  const unsubs = new Set((await q("SELECT email FROM email_unsubscribes")).map((r) => norm(r.email)));

  const tagsBy = new Map(contacts.map((c) => [norm(c.email), parse(c.tags, []) || []]));
  const groupsBy = new Map();
  for (const m of members) {
    const k = norm(m.email);
    if (!groupsBy.has(k)) groupsBy.set(k, []);
    groupsBy.get(k).push({ id: m.group_id, name: m.group_name });
  }
  const now = Date.now();
  const out = new Map();
  for (const u of users) {
    const k = norm(u.email);
    const ends = u.trial_ends_at ? new Date(u.trial_ends_at).getTime() : null;
    out.set(k, {
      email: k, name: u.name || "", type: u.role, user_id: u.id, plan: u.plan || "free",
      trial: (u.plan || "free") !== "free" || !ends ? "none" : ends > now ? "active" : "ended",
      grade: u.grade_level || "", countries: (u.target_countries || "").split(",").map((x) => x.trim()).filter(Boolean),
      school: u.school || "", joined: u.created_at, source: "user"
    });
  }
  for (const c of contacts) {
    const k = norm(c.email);
    if (out.has(k)) continue; // a system user — the contact row only carries tags
    out.set(k, { email: k, name: c.name || "", type: "external", user_id: null, plan: null, trial: "none", grade: "", countries: [], school: "", joined: c.created_at, source: c.source, consent: !!c.consent });
  }
  for (const m of members) {
    const k = norm(m.email);
    if (out.has(k)) continue;
    out.set(k, { email: k, name: m.name || "", type: "external", user_id: null, plan: null, trial: "none", grade: "", countries: [], school: "", joined: m.added_at, source: "group" });
  }
  return [...out.values()].map((c) => ({
    ...c,
    tags: tagsBy.get(c.email) || [],
    groups: groupsBy.get(c.email) || [],
    subscribed: !unsubs.has(c.email)
  }));
}

// f = { q, types[], plans[], trial, grades[], countries[], tags[], status, joined_from, joined_to }
function applyFilters(list, f = {}) {
  const has = (arr) => Array.isArray(arr) && arr.length > 0;
  const q = String(f.q || "").trim().toLowerCase();
  const from = f.joined_from ? new Date(f.joined_from).getTime() : null;
  const to = f.joined_to ? new Date(f.joined_to).getTime() + 86400000 : null;
  return list.filter((c) => {
    if (q && !(`${c.email} ${c.name} ${c.school}`.toLowerCase().includes(q))) return false;
    if (has(f.types) && !f.types.includes(c.type)) return false;
    if (has(f.plans) && !f.plans.includes(c.plan)) return false;
    if (f.trial && c.trial !== f.trial) return false;
    if (has(f.grades) && !f.grades.includes(c.grade)) return false;
    if (has(f.countries) && !c.countries.some((x) => f.countries.includes(x))) return false;
    if (has(f.tags) && !c.tags.some((t) => f.tags.includes(t))) return false;
    if (f.status === "subscribed" && !c.subscribed) return false;
    if (f.status === "unsubscribed" && c.subscribed) return false;
    const j = c.joined ? new Date(c.joined).getTime() : null;
    if (from && (!j || j < from)) return false;
    if (to && (!j || j >= to)) return false;
    return true;
  });
}

function cleanFilters(f = {}) {
  const arr = (v) => (Array.isArray(v) ? v.map((x) => String(x).slice(0, 80)).filter(Boolean).slice(0, 50) : []);
  return {
    q: String(f.q || "").slice(0, 120),
    types: arr(f.types), plans: arr(f.plans), grades: arr(f.grades), countries: arr(f.countries), tags: arr(f.tags),
    trial: ["active", "ended", "none"].includes(f.trial) ? f.trial : "",
    status: ["subscribed", "unsubscribed"].includes(f.status) ? f.status : "",
    joined_from: f.joined_from ? String(f.joined_from).slice(0, 10) : "",
    joined_to: f.joined_to ? String(f.joined_to).slice(0, 10) : ""
  };
}

// Contacts matched by saved segments (for campaign audiences)
async function segmentRecipients(segmentIds = []) {
  const ids = segmentIds.map(Number).filter(Boolean);
  if (!ids.length) return [];
  const [segs] = await pool.query("SELECT filters FROM email_segments WHERE id IN (?)", [ids]);
  if (!segs.length) return [];
  const all = await listAudience();
  const hit = new Map();
  for (const s of segs) for (const c of applyFilters(all, parse(s.filters, {}))) hit.set(c.email, c);
  return [...hit.values()];
}

module.exports = { listAudience, applyFilters, cleanFilters, segmentRecipients, norm };
