const express = require("express");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFile } = require("child_process");
const { authRequired } = require("../middleware/auth");

// Admin → Backups. Shows whether the nightly job is actually running, lets an admin take
// one on demand, download it off this server, and rehearse a restore.
//
// Everything here is admin-only and deliberately narrow: a database dump is every user's
// data in one file, so the download route validates the file name against a strict
// pattern and resolves it inside the backup directory rather than trusting the request.
const router = express.Router();
const isAdmin = (user) => user.email === process.env.ADMIN_EMAIL || user.role === "admin";
router.use(authRequired, (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: "Admin only" })));

const BACKEND = path.join(__dirname, "..", "..");
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(BACKEND, "..", "backups");
const LOG = path.join(BACKUP_DIR, "backup.log");

// Only names this job produces are ever accepted
const DB_FILE = /^myeduport-(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})\.sql\.gz$/;
const UP_FILE = /^uploads-\d{4}-\d{2}-\d{2}_\d{4}\.tar\.gz$/;

// Resolve a requested name to a real path inside BACKUP_DIR, or null.
function resolveBackup(name) {
  const base = path.basename(String(name || ""));
  if (!DB_FILE.test(base) && !UP_FILE.test(base)) return null;
  const full = path.resolve(BACKUP_DIR, base);
  if (!full.startsWith(path.resolve(BACKUP_DIR) + path.sep)) return null;
  return fs.existsSync(full) ? full : null;
}

const whenOf = (name) => {
  const m = name.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
};

// The log line a run writes tells us the row/table counts without opening the dump
function logFacts() {
  let lines = [];
  try { lines = fs.readFileSync(LOG, "utf8").trim().split("\n").slice(-400); } catch { return { byTag: {}, recent: [] }; }
  const byTag = {};
  for (const l of lines) {
    const m = l.match(/\] (OK|FAILED) (\S+) — (.*)$/);
    if (!m) continue;
    byTag[m[2]] = { ok: m[1] === "OK", detail: m[3], at: (l.match(/^\[([^\]]+)\]/) || [])[1] };
  }
  return { byTag, recent: lines.slice(-12) };
}

function listBackups() {
  let names = [];
  try { names = fs.readdirSync(BACKUP_DIR); } catch { return []; }
  const { byTag } = logFacts();
  return names
    .filter((n) => DB_FILE.test(n))
    .sort()
    .reverse()
    .map((n) => {
      const tag = n.replace(/^myeduport-|\.sql\.gz$/g, "");
      const uploads = `uploads-${tag}.tar.gz`;
      const hasUploads = fs.existsSync(path.join(BACKUP_DIR, uploads));
      const stat = fs.statSync(path.join(BACKUP_DIR, n));
      const log = byTag[tag] || null;
      const rows = log?.detail?.match(/(\d+) rows/);
      const tables = log?.detail?.match(/(\d+) tables/);
      return {
        name: n,
        tag,
        taken_at: (whenOf(n) || stat.mtime).toISOString(),
        db_bytes: stat.size,
        uploads_name: hasUploads ? uploads : null,
        uploads_bytes: hasUploads ? fs.statSync(path.join(BACKUP_DIR, uploads)).size : null,
        rows: rows ? Number(rows[1]) : null,
        tables: tables ? Number(tables[1]) : null,
        verified: /verified|restored into a scratch/.test(log?.detail || "") || null
      };
    });
}

router.get("/", (req, res) => {
  const backups = listBackups();
  const { recent } = logFacts();
  const newest = backups[0] ? new Date(backups[0].taken_at) : null;
  const ageHours = newest ? (Date.now() - newest.getTime()) / 3600000 : null;

  // A backup system that quietly stopped is the common failure, so say so plainly
  let health = "none";
  if (ageHours != null) health = ageHours <= 30 ? "ok" : ageHours <= 24 * 3 ? "late" : "stale";

  const failures = recent.filter((l) => / FAILED /.test(l)).length;
  let freeMb = null;
  try {
    const { execFileSync } = require("child_process");
    freeMb = Number(execFileSync("df", ["-Pm", BACKUP_DIR], { encoding: "utf8" }).trim().split("\n").pop().split(/\s+/)[3]) || null;
  } catch { /* not critical */ }

  res.json({
    health,
    newest_at: newest ? newest.toISOString() : null,
    hours_since: ageHours == null ? null : Math.round(ageHours),
    count: backups.length,
    total_bytes: backups.reduce((n, b) => n + b.db_bytes + (b.uploads_bytes || 0), 0),
    free_mb: freeMb,
    recent_failures: failures,
    dir: BACKUP_DIR,
    backups,
    log_tail: recent
  });
});

// Run the same script the nightly job runs, so this tests the real thing
router.post("/run", (req, res) => {
  const args = [path.join(BACKEND, "scripts", "backup.js")];
  if (req.body?.verify !== false) args.push("--verify");
  execFile(process.execPath, args, { cwd: BACKEND, timeout: 10 * 60 * 1000 }, (err, stdout, stderr) => {
    const output = `${stdout || ""}${stderr || ""}`.trim();
    if (err) {
      console.error("[backup-admin] run failed:", err.message);
      return res.status(500).json({ ok: false, error: output || err.message });
    }
    res.json({ ok: true, output });
  });
});

// Rehearse a restore into a throwaway database. Never touches the live one: restore.js
// requires --live for that, and this route does not pass it.
router.post("/drill", (req, res) => {
  const file = resolveBackup(req.body?.name);
  if (!file) return res.status(400).json({ error: "Unknown backup file." });
  const scratch = `${process.env.DB_NAME}_drill_${Date.now()}`;
  execFile(
    process.execPath,
    [path.join(BACKEND, "scripts", "restore.js"), file, "--into", scratch],
    { cwd: BACKEND, timeout: 10 * 60 * 1000 },
    async (err, stdout, stderr) => {
      const output = `${stdout || ""}${stderr || ""}`.trim();
      // Always clean up the scratch database, successful or not
      try {
        const mysql = require("mysql2/promise");
        const c = await mysql.createConnection({
          host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
          user: process.env.DB_USER, password: process.env.DB_PASSWORD
        });
        await c.query(`DROP DATABASE IF EXISTS \`${scratch}\``);
        await c.end();
      } catch (e) { console.error("[backup-admin] could not drop drill db:", e.message); }

      if (err) return res.status(500).json({ ok: false, error: output || err.message });
      res.json({ ok: true, output });
    }
  );
});

// Restore the LIVE database from a backup. This replaces every table in it, for every
// user, and cannot be undone except from another backup — so:
//   - the admin has to type the exact phrase, not just click
//   - restore.js takes a fresh safety backup of the current state before overwriting
//   - who did it and from which file is written to the server log
// The API keeps serving while this runs, so anything written during the restore is lost.
// The response tells the admin to restart the backend, which is the clean way to finish.
const RESTORE_PHRASE = "RESTORE LIVE DATABASE";

router.post("/restore-live", (req, res) => {
  const file = resolveBackup(req.body?.name);
  if (!file) return res.status(400).json({ error: "Unknown backup file." });
  if (String(req.body?.confirm || "") !== RESTORE_PHRASE) {
    return res.status(400).json({ error: `Type exactly "${RESTORE_PHRASE}" to confirm.` });
  }
  console.warn(`[backup-admin] LIVE RESTORE by ${req.user.email} from ${path.basename(file)}`);
  execFile(
    process.execPath,
    [path.join(BACKEND, "scripts", "restore.js"), file, "--live", "--yes"],
    { cwd: BACKEND, timeout: 20 * 60 * 1000 },
    (err, stdout, stderr) => {
      const output = `${stdout || ""}${stderr || ""}`.trim();
      if (err) {
        console.error("[backup-admin] live restore FAILED:", err.message);
        return res.status(500).json({ ok: false, error: output || err.message });
      }
      console.warn(`[backup-admin] live restore finished by ${req.user.email}`);
      res.json({
        ok: true,
        output,
        next: "Restart the API so it reconnects cleanly: pm2 restart myeduport-backend"
      });
    }
  );
});

// Download a backup so it also lives somewhere other than this server
router.get("/download", (req, res) => {
  const file = resolveBackup(req.query?.name);
  if (!file) return res.status(404).json({ error: "Unknown backup file." });
  console.log(`[backup-admin] ${req.user.email} downloaded ${path.basename(file)}`);
  res.download(file, path.basename(file));
});

// Confirm a dump is readable and really contains what it claims, without restoring it
router.get("/inspect", (req, res) => {
  const file = resolveBackup(req.query?.name);
  if (!file) return res.status(404).json({ error: "Unknown backup file." });
  if (!/\.sql\.gz$/.test(file)) return res.status(400).json({ error: "Only database dumps can be inspected." });
  try {
    const sql = zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");
    const header = sql.slice(0, 600);
    res.json({
      readable: true,
      taken: (header.match(/-- taken: (.+)/) || [])[1] || null,
      tables_declared: Number((header.match(/-- tables: (\d+)/) || [])[1]) || null,
      create_statements: (sql.match(/^CREATE TABLE /gm) || []).length,
      insert_statements: (sql.match(/^INSERT INTO /gm) || []).length,
      ends_cleanly: /-- end of backup\s*$/.test(sql.trim()),
      uncompressed_bytes: sql.length
    });
  } catch (e) {
    res.status(500).json({ readable: false, error: `Could not read this dump: ${e.message}` });
  }
});

module.exports = router;
