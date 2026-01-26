const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  const { country, q } = req.query;
  const params = [];
  const filters = [];
  if (country) {
    filters.push("country = ?");
    params.push(country);
  }
  if (q) {
    filters.push("name LIKE ?");
    params.push(`%${q}%`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT id, name, country, city, selectivity_band, major_tags FROM universities ${where} ORDER BY name ASC LIMIT 200`,
    params
  );
  res.json(rows);
});

module.exports = router;
