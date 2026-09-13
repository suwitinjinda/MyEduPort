// Lightweight no-sudo DB backup: dumps every table as gzipped JSON.
// Schema lives in git (database/schema.sql + alter_*.sql); this captures the DATA.
// Run:  cd /home/dev/MyEduPort/backend && node scripts/db-backup.mjs
// Cron: 0 3 * * *  (daily 03:00) — keeps the last 14 backups.
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.join(__dirname, "..");
const OUT_DIR = path.join(BACKEND, "..", "backups", "data");
const KEEP = 14;

const env = {};
fs.readFileSync(path.join(BACKEND, ".env"), "utf8").split("\n").forEach((l) => {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
});

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const c = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT || 3306),
    user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME
  });
  const [tbls] = await c.query("SHOW TABLES");
  const dump = { exported_at: new Date().toISOString(), database: env.DB_NAME, tables: {} };
  let rowCount = 0;
  for (const row of tbls) {
    const t = Object.values(row)[0];
    const [rows] = await c.query("SELECT * FROM `" + t + "`");
    dump.tables[t] = rows;
    rowCount += rows.length;
  }
  await c.end();

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const file = path.join(OUT_DIR, `myeduport-${ts}.json.gz`);
  fs.writeFileSync(file, zlib.gzipSync(Buffer.from(JSON.stringify(dump))));

  // prune to the newest KEEP files
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".json.gz")).sort();
  for (const old of files.slice(0, Math.max(0, files.length - KEEP))) fs.unlinkSync(path.join(OUT_DIR, old));

  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`[db-backup] ${path.basename(file)} — ${Object.keys(dump.tables).length} tables, ${rowCount} rows, ${kb} KB`);
})().catch((e) => { console.error("[db-backup] FAILED:", e.code || e.message); process.exit(1); });
