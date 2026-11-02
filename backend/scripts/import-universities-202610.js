// Imports MyEduPort_University_Database_202610.docx (parsed to database/data/universities_202610.json).
//   node scripts/import-universities-202610.js            → dry run: prints what would change
//   node scripts/import-universities-202610.js --apply    → writes it
//
// Universities already in the database keep their name (students' Intended Universities are
// stored by name, so renaming would unlink them); their QS rank, selectivity and programs are
// refreshed and they're made visible. New ones are added. Nothing is deleted.
require("dotenv").config();
const path = require("path");
const mysql = require("mysql2/promise");

const APPLY = process.argv.includes("--apply");
const SOURCE = "MEP DB 2026-10";
const COUNTRY = {
  "United States": "US", "United Kingdom": "UK", Australia: "Australia", China: "China", Japan: "Japan",
  Germany: "Germany", France: "France", Canada: "Canada", Netherlands: "Netherlands", Switzerland: "Switzerland",
  Thailand: "Thailand", "New Zealand": "New Zealand", Singapore: "Singapore", "Hong Kong": "Hong Kong", Taiwan: "Taiwan"
};
// Same university, spelled differently in the file and the database
const ALIASES = {
  "University of Michigan — Ann Arbor": "University of Michigan",
  "University of Illinois Urbana-Champaign (UIUC)": "University of Illinois at Urbana-Champaign",
  "University of North Carolina, Chapel Hill": "University of North Carolina at Chapel Hill",
  "Ludwig-Maximilians-Universität München (LMU)": "Ludwig Maximilian University of Munich",
  "UESTC (电子科技大学)": "University of Electronic Sci. & Tech. China (UESTC)"
};
// Full names so a student's intended major ("Computer Science") finds the school
const TAG_NAMES = { CS: ["Computer Science"], "CS & AI": ["Computer Science", "Artificial Intelligence"], AI: ["Artificial Intelligence"], Math: ["Mathematics"], IT: ["Information Technology"] };

const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/^the /, "").replace(/[^a-z0-9]/g, "");
const rankOf = (q) => { const m = String(q || "").match(/\d+/); return m ? Number(m[0]) : null; };
function bandOf(rank, tier) {
  if (rank != null) return rank <= 35 ? "Very High" : rank <= 105 ? "High" : "Medium";
  return /ivy|grand|federal/i.test(tier || "") ? "High" : "Medium"; // unranked: prestige schools stay High
}
function tagsOf(programs) {
  const out = [];
  for (const raw of String(programs || "").split(",")) {
    const t = raw.replace(/\(.*?\)/g, "").trim();
    if (!t) continue;
    for (const x of TAG_NAMES[t] || [t]) if (!out.includes(x)) out.push(x);
  }
  let s = out.join(",");
  while (s.length > 255) { out.pop(); s = out.join(","); }
  return s;
}

(async () => {
  const data = require(path.join(__dirname, "..", "database", "data", "universities_202610.json"));
  const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  const [existing] = await c.query("SELECT id, name, country, city, qs_rank, selectivity_band, major_tags, hidden FROM universities");

  const plan = { update: [], insert: [] };
  for (const r of data.rows) {
    const country = Object.entries(COUNTRY).find(([k]) => r.section.includes(k))?.[1];
    if (!country) throw new Error(`No country for section: ${r.section}`);
    const name = r.cols.University;
    const city = r.cols.Location || r.cols["City / Location"] || "";
    const tier = r.cols.Tier || r.cols["Tier / Group"] || "";
    const rank = rankOf(r.cols["QS 2026"]);
    const row = { name, country, city, qs_rank: rank, selectivity_band: bandOf(rank, tier), major_tags: tagsOf(r.cols["Popular Programs (Faculties)"]) };
    const target = ALIASES[name] || name;
    const hit = existing.find((u) => u.country === country && (u.name.toLowerCase() === target.toLowerCase() || norm(u.name) === norm(target)));
    if (hit) {
      const merged = [...new Set([...String(hit.major_tags || "").split(","), ...row.major_tags.split(",")].map((t) => t.trim()).filter(Boolean))];
      let tags = merged.join(",");
      while (tags.length > 255) { merged.pop(); tags = merged.join(","); }
      plan.update.push({ id: hit.id, name: hit.name, fileName: name, city: hit.city || city, qs_rank: rank ?? hit.qs_rank, selectivity_band: row.selectivity_band, major_tags: tags, unhide: !!hit.hidden });
    } else {
      plan.insert.push(row);
    }
  }

  const byCountry = {};
  for (const r of plan.insert) byCountry[r.country] = (byCountry[r.country] || 0) + 1;
  console.log(`${APPLY ? "APPLYING" : "DRY RUN"} — ${data.rows.length} rows in file`);
  console.log(`  update existing: ${plan.update.length} (${plan.update.filter((u) => u.unhide).length} hidden ones made visible)`);
  console.log(`  add new: ${plan.insert.length}`, byCountry);

  if (APPLY) {
    await c.beginTransaction();
    try {
      for (const u of plan.update) {
        await c.query("UPDATE universities SET city = ?, qs_rank = ?, selectivity_band = ?, major_tags = ?, source = ?, hidden = 0 WHERE id = ?",
          [u.city, u.qs_rank, u.selectivity_band, u.major_tags, SOURCE, u.id]);
      }
      for (const r of plan.insert) {
        await c.query("INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags, source, hidden) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
          [r.name, r.country, r.city, r.selectivity_band, r.qs_rank, r.major_tags, SOURCE]);
      }
      await c.commit();
      console.log("Done.");
    } catch (err) {
      await c.rollback();
      console.error("Rolled back:", err.message);
      process.exitCode = 1;
    }
  }
  await c.end();
})();
