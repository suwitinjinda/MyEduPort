const pool = require("../db");

// Latest saved result of each MEPAi generation, per user + kind + scope.
// Pages load these on open (so advice survives reloads) and regenerate only on request.
async function saveOutput(userId, kind, scope, payload) {
  try {
    await pool.query(
      `INSERT INTO ai_saved_outputs (user_id, kind, scope, payload) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [userId, kind, String(scope || "").slice(0, 190), JSON.stringify(payload)]
    );
  } catch (err) {
    console.error("[ai-saved] save failed:", err.message); // never break the AI response itself
  }
}

// → { [kind]: { [scope]: { ...payload, saved_at } } }
async function listOutputs(userId, kinds) {
  const params = [userId];
  let where = "user_id = ?";
  if (kinds && kinds.length) { where += " AND kind IN (?)"; params.push(kinds); }
  const out = {};
  try {
    const [rows] = await pool.query(`SELECT kind, scope, payload, updated_at FROM ai_saved_outputs WHERE ${where}`, params);
    for (const r of rows) {
      const p = typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload;
      (out[r.kind] = out[r.kind] || {})[r.scope] = { ...p, saved_at: r.updated_at };
    }
  } catch (err) { /* table missing → nothing saved yet */ }
  return out;
}

async function getOutput(userId, kind, scope = "") {
  const all = await listOutputs(userId, [kind]);
  return all[kind]?.[scope] || null;
}

module.exports = { saveOutput, listOutputs, getOutput };
