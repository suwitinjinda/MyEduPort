const express = require("express");
const { authRequired } = require("../middleware/auth");
const { getOptionLists } = require("../services/options");
const { getPlanLimits, getPlanDisplay, PLAN_TIERS } = require("../services/plan");

const router = express.Router();

// Dropdown lists for the Portfolio pages (majors, curriculums, subjects, tests) — edited in Admin
router.get("/", authRequired, async (req, res) => {
  res.json(await getOptionLists());
});

// Public: plans for the Pricing page (visible ones only), straight from Admin → Plan Settings
router.get("/plans", async (req, res) => {
  const [limits, display] = await Promise.all([getPlanLimits(), getPlanDisplay()]);
  res.json(PLAN_TIERS.filter((t) => display[t].visible).map((t) => ({ key: t, ...display[t], limits: limits[t] })));
});

module.exports = router;
