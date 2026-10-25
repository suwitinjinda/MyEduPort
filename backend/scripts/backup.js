#!/usr/bin/env node
"use strict";

// Nightly backup of the MyEduPort database and uploaded files, written to local disk on
// this server.
//
//   node scripts/backup.js            # take a backup, then prune old ones
//   node scripts/backup.js --verify   # also restore it into a scratch database and
//                                     # compare row counts before keeping it
//
// mysqldump is not installed on this machine and there is no sudo to install it, so the
// dump is produced here: SHOW CREATE TABLE for the schema, batched INSERTs for the rows.
// The database has no views, triggers or stored routines, so tables are the whole story —
// scripts/restore.js refuses to run against a dump whose header says otherwise.
//
// Output (BACKUP_DIR, default ../backups):
//   myeduport-YYYY-MM-DD_HHMM.sql.gz     schema + data
//   uploads-YYYY-MM-DD_HHMM.tar.gz       backend/uploads
//   backup.log                           one line per run, success or failure

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const mysql = require("mysql2/promise");
const SqlString = require("sqlstring");

const ROOT = path.join(__dirname, "..");
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(ROOT, "..", "backups");
const UPLOADS_DIR = path.join(ROOT, "uploads");
const LOCK = path.join(BACKUP_DIR, ".running.lock");

// Retention: every backup for a fortnight, then one per week for three months.
const KEEP_DAILY = Number(process.env.BACKUP_KEEP_DAILY || 14);
const KEEP_WEEKLY = Number(process.env.BACKUP_KEEP_WEEKLY || 12);
const MIN_FREE_MB = Number(process.env.BACKUP_MIN_FREE_MB || 500);

const DB = process.env.DB_NAME;
const conn = () => mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: DB,
  multipleStatements: true,
  // Dump the values as MySQL stored them, not as JavaScript would re-render them
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true
});

const stamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

function log(line) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  console.log(msg);
  try { fs.appendFileSync(path.join(BACKUP_DIR, "backup.log"), msg + "\n"); } catch { /* disk may be the problem */ }
}

// A value exactly as MySQL will accept it back
function literal(v) {
  if (v === null || v === undefined) return "NULL";
  if (Buffer.isBuffer(v)) return "0x" + v.toString("hex");
  if (typeof v === "object") return SqlString.escape(JSON.stringify(v)); // JSON columns
  if (typeof v === "number" || typeof v === "boolean") return SqlString.escape(v);
  return SqlString.escape(String(v));
}

function freeMb(dir) {
  try {
    const out = execFileSync("df", ["-Pm", dir], { encoding: "utf8" }).trim().split("\n").pop();
    return Number(out.split(/\s+/)[3]) || 0;
  } catch { return Infinity; }
}

async function dumpDatabase(outPath) {
  const c = await conn();
  const gz = zlib.createGzip({ level: 9 });
  const out = fs.createWriteStream(outPath);
  gz.pipe(out);
  const write = (s) => new Promise((res, rej) => gz.write(s, (e) => (e ? rej(e) : res())));

  // Refuse to produce a dump that silently drops objects it cannot represent
  const [[extras]] = await c.query(
    `SELECT (SELECT COUNT(*) FROM information_schema.views     WHERE table_schema = ?) v,
            (SELECT COUNT(*) FROM information_schema.triggers  WHERE trigger_schema = ?) t,
            (SELECT COUNT(*) FROM information_schema.routines  WHERE routine_schema = ?) r`,
    [DB, DB, DB]
  );
  // bigNumberStrings makes COUNT(*) a string, and "0" is truthy — compare as numbers
  const nViews = Number(extras.v), nTrig = Number(extras.t), nRout = Number(extras.r);
  if (nViews || nTrig || nRout) {
    await c.end();
    throw new Error(
      `This database now has ${nViews} view(s), ${nTrig} trigger(s) and ${nRout} routine(s), ` +
      `which this dumper does not capture. Update scripts/backup.js before relying on it again.`
    );
  }

  const [tables] = await c.query(
    "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
    [DB]
  );

  await write(
    `-- MyEduPort backup\n-- database: ${DB}\n-- taken: ${new Date().toISOString()}\n` +
    `-- host: ${os.hostname()}\n-- tables: ${tables.length}\n-- objects: views=0 triggers=0 routines=0\n` +
    `-- restore with: node scripts/restore.js <this file>\n\n` +
    `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSET UNIQUE_CHECKS=0;\nSET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n\n`
  );

  const counts = {};
  for (const { t } of tables) {
    const [[create]] = await c.query(`SHOW CREATE TABLE \`${t}\``);
    await write(`--\n-- ${t}\n--\nDROP TABLE IF EXISTS \`${t}\`;\n${create["Create Table"]};\n\n`);

    const [[{ n }]] = await c.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    counts[t] = n;
    if (!n) continue;

    // Stream the rows so a table that grows later can't blow up memory
    const stream = c.connection.query(`SELECT * FROM \`${t}\``).stream();
    let batch = [];
    let cols = null;
    const flush = async () => {
      if (!batch.length) return;
      await write(`INSERT INTO \`${t}\` (${cols}) VALUES\n${batch.join(",\n")};\n`);
      batch = [];
    };
    for await (const row of stream) {
      if (!cols) cols = Object.keys(row).map((k) => `\`${k}\``).join(", ");
      batch.push("(" + Object.values(row).map(literal).join(", ") + ")");
      if (batch.length >= 200) await flush();
    }
    await flush();
    await write("\n");
  }

  await write("SET FOREIGN_KEY_CHECKS=1;\nSET UNIQUE_CHECKS=1;\n-- end of backup\n");
  await c.end();

  await new Promise((res, rej) => { gz.end(); out.on("finish", res); out.on("error", rej); });
  return { tables: tables.length, counts };
}

function archiveUploads(outPath) {
  if (!fs.existsSync(UPLOADS_DIR)) return null;
  execFileSync("tar", ["-czf", outPath, "-C", ROOT, "uploads"], { stdio: "pipe" });
  return fs.statSync(outPath).size;
}

// A backup nobody has opened is a guess. Check the gzip actually decompresses.
function gzipIsReadable(file) {
  try {
    let bytes = 0;
    zlib.gunzipSync(fs.readFileSync(file)).length && (bytes = 1);
    return bytes === 1;
  } catch { return false; }
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 16);
}

// Restore the dump into a scratch database and compare row counts with the live one.
async function verifyRestore(sqlGz, counts) {
  const scratch = `${DB}_verify_${Date.now()}`;
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, multipleStatements: true
  });
  try {
    await admin.query(`CREATE DATABASE \`${scratch}\` DEFAULT CHARACTER SET utf8mb4`);
    await admin.query(`USE \`${scratch}\``);
    await admin.query(zlib.gunzipSync(fs.readFileSync(sqlGz)).toString("utf8"));

    const mismatches = [];
    for (const [t, expected] of Object.entries(counts)) {
      const [[{ n }]] = await admin.query(`SELECT COUNT(*) AS n FROM \`${scratch}\`.\`${t}\``);
      if (Number(n) !== Number(expected)) mismatches.push(`${t}: ${n} restored vs ${expected} live`);
    }
    return mismatches;
  } finally {
    await admin.query(`DROP DATABASE IF EXISTS \`${scratch}\``).catch(() => {});
    await admin.end().catch(() => {});
  }
}

// Keep every backup for KEEP_DAILY days, then one per ISO week for KEEP_WEEKLY weeks.
function prune() {
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => /^myeduport-.*\.sql\.gz$/.test(f)).sort().reverse();
  const now = Date.now();
  const weekSeen = new Set();
  const removed = [];
  for (const f of files) {
    const m = f.match(/^myeduport-(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})\.sql\.gz$/);
    if (!m) continue;
    const when = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    const ageDays = (now - when.getTime()) / 86400000;
    if (ageDays <= KEEP_DAILY) continue;

    const week = `${when.getFullYear()}-${Math.floor((when - new Date(when.getFullYear(), 0, 1)) / 604800000)}`;
    const keepAsWeekly = ageDays <= KEEP_DAILY + KEEP_WEEKLY * 7 && !weekSeen.has(week);
    if (keepAsWeekly) { weekSeen.add(week); continue; }

    for (const victim of [f, f.replace(/^myeduport-/, "uploads-").replace(/\.sql\.gz$/, ".tar.gz")]) {
      const p = path.join(BACKUP_DIR, victim);
      if (fs.existsSync(p)) { fs.unlinkSync(p); removed.push(victim); }
    }
  }
  return removed;
}

(async () => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // One run at a time — a slow backup must not overlap the next cron tick
  if (fs.existsSync(LOCK)) {
    const age = (Date.now() - fs.statSync(LOCK).mtimeMs) / 60000;
    if (age < 120) { log(`SKIPPED: another backup started ${Math.round(age)} min ago`); process.exit(0); }
    log(`WARNING: stale lock from ${Math.round(age)} min ago — taking over`);
  }
  fs.writeFileSync(LOCK, String(process.pid));

  const tag = stamp();
  const sqlGz = path.join(BACKUP_DIR, `myeduport-${tag}.sql.gz`);
  const tarGz = path.join(BACKUP_DIR, `uploads-${tag}.tar.gz`);

  try {
    const free = freeMb(BACKUP_DIR);
    if (free < MIN_FREE_MB) throw new Error(`only ${free} MB free on disk (need ${MIN_FREE_MB} MB)`);

    const { tables, counts } = await dumpDatabase(sqlGz);
    if (!gzipIsReadable(sqlGz)) throw new Error("the dump did not gzip cleanly");
    const sqlSize = fs.statSync(sqlGz).size;

    let uploadSize = null;
    try { uploadSize = archiveUploads(tarGz); } catch (e) { log(`WARNING: uploads archive failed — ${e.message}`); }

    if (process.argv.includes("--verify")) {
      const mismatches = await verifyRestore(sqlGz, counts);
      if (mismatches.length) throw new Error(`restore check failed — ${mismatches.join("; ")}`);
      log(`verified: restored into a scratch database, all ${tables} tables match row for row`);
    }

    const removed = prune();
    log(
      `OK ${tag} — db ${(sqlSize / 1024).toFixed(0)} KB (${tables} tables, ${Object.values(counts).reduce((a, b) => a + Number(b), 0)} rows, sha ${sha256(sqlGz)})` +
      (uploadSize === null ? ", uploads skipped" : `, uploads ${(uploadSize / 1024).toFixed(0)} KB`) +
      (removed.length ? `, pruned ${removed.length} old file(s)` : "") +
      `, ${freeMb(BACKUP_DIR)} MB free`
    );
    process.exitCode = 0;
  } catch (err) {
    // A half-written backup is worse than none — it looks like a good one in the listing
    for (const f of [sqlGz, tarGz]) { try { fs.existsSync(f) && fs.unlinkSync(f); } catch { /* ignore */ } }
    log(`FAILED ${tag} — ${err.message}`);
    process.exitCode = 1;
  } finally {
    try { fs.unlinkSync(LOCK); } catch { /* ignore */ }
  }
})();
