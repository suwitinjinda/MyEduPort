const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

// Shareable links for the Personal Character Test (IPIP-50 Big Five) and the Career Test
// (RIASEC / Holland Code), so a student can post their result to Facebook, X or Instagram.
//
// These links are PUBLIC — anyone with the URL sees them, and social networks cache them.
// So the public page shows only: first name, the scores, and the AI summary and strengths.
// Never the school, grade level, GPA, activities, email, or the personal recommendations.
//
// The page is rendered here as plain HTML rather than by the React app on purpose:
// Facebook's and X's crawlers do not run JavaScript, so a link into the SPA would always
// preview as the generic site description. Serving real HTML gives a proper preview card.
const router = express.Router();   // mounted at /api/test-share  (signed-in student)
const publicRouter = express.Router(); // mounted at /api/share    (no auth)

const KINDS = ["personality", "career"];
const FACTOR_NAMES = { E: "Extraversion", A: "Agreeableness", C: "Conscientiousness", ES: "Emotional Stability", I: "Intellect/Imagination" };
const TYPE_NAMES = { R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional" };
const TYPE_BLURB = { R: "Doers", I: "Thinkers", A: "Creators", S: "Helpers", E: "Persuaders", C: "Organizers" };

const appUrl = () => (process.env.APP_URL || "https://myeduport.ai").replace(/\/+$/, "");
// Links are handed out at /api/share/t/<token>, which works with the stock nginx config.
// Set SHARE_PATH=/t/ once nginx proxies that prefix (see deploy/nginx-short-share-links.md)
// to hand out the tidier URL instead; both paths keep serving, so links already posted
// to social media never break.
const sharePath = () => {
  const p = String(process.env.SHARE_PATH || "/api/share/t/").trim();
  return `/${p.replace(/^\/+|\/+$/g, "")}/`;
};
const shareUrl = (token) => `${appUrl()}${sharePath()}${token}`;

async function studentIdOf(userId) {
  const [rows] = await pool.query("SELECT id FROM students WHERE user_id = ?", [userId]);
  return rows.length ? rows[0].id : null;
}
const parse = (v) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };
const firstNameOf = (full) => String(full || "").trim().split(/\s+/)[0] || "A MyEduPort student";

// --- signed-in student: create / read / revoke the link -------------------------------

router.get("/:kind", authRequired, async (req, res) => {
  const kind = String(req.params.kind);
  if (!KINDS.includes(kind)) return res.status(400).json({ error: "Unknown test." });
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  const [[row]] = await pool.query("SELECT token, view_count FROM test_shares WHERE student_id = ? AND kind = ?", [studentId, kind]);
  res.json(row ? { shared: true, url: shareUrl(row.token), views: row.view_count } : { shared: false });
});

router.post("/:kind", authRequired, async (req, res) => {
  const kind = String(req.params.kind);
  if (!KINDS.includes(kind)) return res.status(400).json({ error: "Unknown test." });
  if (req.user.role !== "student") return res.status(403).json({ error: "Student only" });
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });

  // Nothing to share until the test has actually been taken
  const table = kind === "personality" ? "personality_assessments" : "interest_assessments";
  const [[done]] = await pool.query(`SELECT id FROM ${table} WHERE student_id = ? LIMIT 1`, [studentId]);
  if (!done) return res.status(400).json({ error: "Take the test first, then you can share your result." });

  const [[existing]] = await pool.query("SELECT token FROM test_shares WHERE student_id = ? AND kind = ?", [studentId, kind]);
  if (existing) return res.json({ shared: true, url: shareUrl(existing.token) });

  const token = crypto.randomBytes(16).toString("hex");
  await pool.query("INSERT INTO test_shares (student_id, kind, token) VALUES (?, ?, ?)", [studentId, kind, token]);
  res.json({ shared: true, url: shareUrl(token) });
});

router.delete("/:kind", authRequired, async (req, res) => {
  const kind = String(req.params.kind);
  if (!KINDS.includes(kind)) return res.status(400).json({ error: "Unknown test." });
  const studentId = await studentIdOf(req.user.id);
  if (!studentId) return res.status(403).json({ error: "Student only" });
  await pool.query("DELETE FROM test_shares WHERE student_id = ? AND kind = ?", [studentId, kind]);
  res.json({ shared: false });
});

// --- public: the shared page ----------------------------------------------------------

// Everything the public page is allowed to know about a share token.
async function publicResult(token) {
  const [[share]] = await pool.query(
    `SELECT ts.id, ts.student_id, ts.kind, u.name
       FROM test_shares ts
       JOIN students s ON s.id = ts.student_id
       JOIN users u    ON u.id = s.user_id
      WHERE ts.token = ?`,
    [token]
  );
  if (!share) return null;
  const firstName = firstNameOf(share.name);

  if (share.kind === "personality") {
    const [[r]] = await pool.query(
      "SELECT scores, bands, narrative, completed_at FROM personality_assessments WHERE student_id = ? ORDER BY completed_at DESC LIMIT 1",
      [share.student_id]
    );
    if (!r) return null;
    const avg = parse(r.scores)?.average || {};
    const bands = parse(r.bands) || {};
    const narrative = parse(r.narrative) || {};
    return {
      shareId: share.id,
      kind: "personality",
      firstName,
      title: "Big Five personality profile",
      instrument: "IPIP-50 · 50 questions",
      headline: "",
      completedAt: r.completed_at,
      // scores are 1–5 averages; show them out of 5
      rows: Object.keys(FACTOR_NAMES).map((k) => ({
        key: k, label: FACTOR_NAMES[k], blurb: bands[k] || "",
        value: Number(avg[k] || 0), max: 5
      })),
      summary: narrative.summary || "",
      strengths: Array.isArray(narrative.strengths) ? narrative.strengths : []
    };
  }

  const [[r]] = await pool.query(
    "SELECT scores, ranking, holland_code, narrative, completed_at FROM interest_assessments WHERE student_id = ? ORDER BY completed_at DESC LIMIT 1",
    [share.student_id]
  );
  if (!r) return null;
  const scores = parse(r.scores) || {};
  const narrative = parse(r.narrative) || {};
  const order = (parse(r.ranking) || Object.keys(TYPE_NAMES)).filter((k) => TYPE_NAMES[k]);
  return {
    shareId: share.id,
    kind: "career",
    firstName,
    title: "Holland Code",
    instrument: "O*NET® IP-SF · 60 activities",
    headline: String(r.holland_code || "").toUpperCase(),
    completedAt: r.completed_at,
    rows: order.map((k) => ({ key: k, label: TYPE_NAMES[k], blurb: TYPE_BLURB[k] || "", value: Number(scores[k] || 0), max: 10 })),
    summary: narrative.summary || "",
    strengths: Array.isArray(narrative.majors) ? narrative.majors.map(String) : []
  };
}

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function renderPage(d, token) {
  const url = shareUrl(token);
  const heading = d.kind === "career"
    ? `${d.firstName}'s Holland Code: ${d.headline}`
    : `${d.firstName}'s Big Five personality profile`;
  const top = d.rows.slice().sort((a, b) => b.value - a.value).slice(0, 3).map((r) => r.label).join(" · ");
  const preview = d.summary ? String(d.summary).slice(0, 180) : `Strongest areas: ${top}.`;
  const bars = d.rows.map((r) => {
    const pct = Math.max(0, Math.min(100, (r.value / r.max) * 100));
    return `<div class="row">
      <div class="lbl"><strong>${esc(r.label)}</strong><span>${esc(r.blurb)}</span></div>
      <div class="track"><span style="width:${pct.toFixed(1)}%"></span></div>
      <div class="val">${r.value % 1 === 0 ? r.value : r.value.toFixed(1)}<small>/${r.max}</small></div>
    </div>`;
  }).join("");
  const strengths = d.strengths.length
    ? `<h2>${d.kind === "career" ? "Majors that fit" : "Strengths"}</h2><ul>${d.strengths.slice(0, 5).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(heading)} · MyEduPort</title>
<meta name="description" content="${esc(preview)}" />
<link rel="canonical" href="${esc(url)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="MyEduPort" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:title" content="${esc(heading)}" />
<meta property="og:description" content="${esc(preview)}" />
<meta property="og:image" content="${appUrl()}/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(heading)}" />
<meta name="twitter:description" content="${esc(preview)}" />
<meta name="twitter:image" content="${appUrl()}/og-image.png" />
<link rel="icon" href="${appUrl()}/favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet" />
<style>
  :root { --navy:#1f3461; --teal:#047857; --ink:#16233d; --soft:#4b5a77; --rule:#e3e8f0; --paper:#f5f8fb; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:Outfit,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.55}
  .wrap{max-width:680px;margin:0 auto;padding:2rem 1rem 3rem}
  .card{background:#fff;border:1px solid var(--rule);border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(31,52,97,.08)}
  .hero{background:linear-gradient(135deg,var(--navy) 0%,var(--teal) 100%);color:#fff;padding:1.75rem 1.5rem}
  .eyebrow{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;opacity:.85;font-weight:700}
  .hero h1{margin:.5rem 0 .25rem;font-size:1.75rem;font-weight:800;letter-spacing:-.02em}
  .code{font-size:3rem;font-weight:800;letter-spacing:.1em;margin:.25rem 0 0}
  .hero p{margin:.35rem 0 0;opacity:.9;font-size:.9rem}
  .body{padding:1.5rem}
  .row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr) auto;gap:.75rem;align-items:center;padding:.6rem 0;border-top:1px solid var(--rule)}
  .row:first-child{border-top:none}
  .lbl{display:flex;flex-direction:column;min-width:0}
  .lbl span{font-size:.75rem;color:var(--soft)}
  .track{height:10px;background:#eef2f7;border-radius:999px;overflow:hidden}
  .track span{display:block;height:100%;background:linear-gradient(90deg,var(--navy),var(--teal));border-radius:999px}
  .val{font-weight:700;white-space:nowrap}
  .val small{color:var(--soft);font-weight:500}
  h2{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:var(--teal);margin:1.5rem 0 .5rem}
  /* MEPAi writes its summary TO the student ("you"), but this page is read by other
     people — so it is presented as a quoted note rather than as page copy. */
  .summary{font-size:.98rem;color:var(--ink);margin:0;padding:.75rem 1rem;border-left:3px solid var(--teal);background:rgba(4,120,87,.06);border-radius:0 8px 8px 0}
  ul{margin:0;padding-left:1.1rem;color:var(--soft)}
  li{margin:.2rem 0}
  .cta{margin-top:1.5rem;text-align:center}
  .cta a{display:inline-block;background:var(--teal);color:#fff;text-decoration:none;font-weight:700;padding:.8rem 1.6rem;border-radius:10px}
  .foot{margin-top:1rem;text-align:center;font-size:.76rem;color:var(--soft)}
  .foot a{color:var(--soft)}
  @media (max-width:520px){ .row{grid-template-columns:minmax(0,1fr) auto;gap:.5rem} .track{grid-column:1 / -1;order:3} }
  @media (prefers-color-scheme:dark){ :root{--paper:#0f172a;--ink:#e8eefb;--soft:#9fb0cc;--rule:#24324d} .card{background:#15203a} .track{background:#24324d} }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="hero">
      <div class="eyebrow">${d.kind === "career" ? "Career Test" : "Personal Character Test"} · MyEduPort.ai</div>
      ${d.headline ? `<div class="code">${esc(d.headline)}</div><h1 style="font-size:1.1rem;font-weight:600;opacity:.95">${esc(d.firstName)} · ${esc(d.rows.slice(0, 3).map((r) => r.label).join(" · "))}</h1>`
                   : `<h1>${esc(d.firstName)}'s Big Five profile</h1>`}
      <p>${esc(d.instrument)}</p>
    </div>
    <div class="body">
      ${bars}
      ${d.summary
        ? `<h2>MEPAi's note to ${esc(d.firstName)}</h2><blockquote class="summary">${esc(d.summary)}</blockquote>`
        : ""}
      ${strengths}
      <div class="cta"><a href="${appUrl()}/login">Take the test yourself →</a></div>
    </div>
  </div>
  <p class="foot">
    Shared from <a href="${appUrl()}">MyEduPort.ai</a> · A self-insight tool for exploring strengths and interests — not a clinical or diagnostic assessment.
  </p>
</div>
</body>
</html>`;
}

function notFoundPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Link unavailable · MyEduPort</title>
<meta name="robots" content="noindex" />
<style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#f5f8fb;color:#16233d;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;padding:1rem}
a{color:#047857}</style></head>
<body><div><h1 style="font-size:1.4rem">This link isn't available.</h1>
<p style="color:#4b5a77">It may have been turned off by the person who shared it.</p>
<p><a href="${appUrl()}">Go to MyEduPort.ai</a></p></div></body></html>`;
}

publicRouter.get("/t/:token", async (req, res) => {
  try {
    const d = await publicResult(String(req.params.token || ""));
    if (!d) return res.status(404).type("html").send(notFoundPage());
    // Social crawlers refetch often; count real views but don't let the tally block the page
    pool.query("UPDATE test_shares SET view_count = view_count + 1, last_viewed_at = NOW() WHERE id = ?", [d.shareId]).catch(() => {});
    res.type("html").send(renderPage(d, String(req.params.token)));
  } catch (err) {
    console.error("[test-share] public page:", err.message);
    res.status(500).type("html").send(notFoundPage());
  }
});

module.exports = { router, publicRouter };
