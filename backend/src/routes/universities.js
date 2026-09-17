const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  try {
    const { country, q } = req.query;
    const params = [];
    // Only show the sourced, visible set (legacy unsourced universities are hidden=1).
    const filters = ["hidden = 0"];
    if (country && country !== "All") {
      filters.push("country = ?");
      params.push(country);
    }
    if (q) {
      filters.push("name LIKE ?");
      params.push(`%${q}%`);
    }
    const where = `WHERE ${filters.join(" AND ")}`;
    const [rows] = await pool.query(
      `SELECT id, name, country, city, selectivity_band, qs_rank, major_tags, source FROM universities ${where} ORDER BY (qs_rank IS NULL), qs_rank ASC, name ASC LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /universities:", err && err.message ? err.message : err);
    res.status(500).json({ error: "Failed to load universities" });
  }
});

// A student typed a university not in the curated list (Personal → Intended Universities,
// item 4). Capture it in the DB as source='user', hidden=1 so it's stored but does not
// pollute everyone's dropdown; admins can review/unhide later. Deduped by name.
router.post("/suggest", authRequired, async (req, res) => {
  try {
    const name = String((req.body && req.body.name) || "").trim();
    if (!name) return res.status(400).json({ error: "University name is required" });
    if (name.length > 200) return res.status(400).json({ error: "University name is too long" });
    const country = String((req.body && req.body.country) || "").trim();
    const [[existing]] = await pool.query("SELECT id, name FROM universities WHERE name = ? LIMIT 1", [name]);
    if (existing) return res.json({ id: existing.id, name: existing.name, existed: true });
    const [result] = await pool.query(
      "INSERT INTO universities (name, country, city, selectivity_band, major_tags, source, hidden) VALUES (?, ?, '', '', '', 'user', 1)",
      [name, country]
    );
    return res.json({ id: result.insertId, name, existed: false });
  } catch (err) {
    console.error("POST /universities/suggest:", err && err.message ? err.message : err);
    return res.status(500).json({ error: "Could not save that university" });
  }
});

module.exports = router;
