#!/usr/bin/env node
"use strict";

// Restore a MyEduPort backup taken by scripts/backup.js.
//
//   node scripts/restore.js ../backups/myeduport-2026-10-25_0300.sql.gz --into myeduport_check
//   node scripts/restore.js ../backups/myeduport-2026-10-25_0300.sql.gz --live --yes
//
// Restoring into a scratch database (--into) is the default shape on purpose: it lets you
// look inside a backup without touching anything real. Overwriting the live database needs
// --live AND --yes, and takes a safety dump of the current state first, because a restore
// replaces every table it contains.
//
// Uploaded files are a separate archive; restore them with:
//   tar -xzf ../backups/uploads-2026-10-25_0300.tar.gz -C /home/dev/MyEduPort/backend

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");
const mysql = require("mysql2/promise");

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };

const LIVE_DB = process.env.DB_NAME;

function die(msg) { console.error("\n✗ " + msg + "\n"); process.exit(1); }

if (!file) {
  die(`Which backup?\n\n  node scripts/restore.js <file.sql.gz> --into <scratch_db>\n  node scripts/restore.js <file.sql.gz> --live --yes\n`);
}
const abs = path.resolve(file);
if (!fs.existsSync(abs)) die(`No such file: ${abs}`);

const target = flag("live") ? LIVE_DB : (opt("into") || `${LIVE_DB}_restore`);
if (target === LIVE_DB && !flag("live")) die(`Refusing to write to the live database without --live.`);
if (flag("live") && !flag("yes")) {
  die(`This replaces every table in "${LIVE_DB}" on this server.\n` +
      `  Re-run with --live --yes if that is what you want.\n` +
      `  To look inside the backup instead:  --into ${LIVE_DB}_check`);
}

(async () => {
  let sql;
  try {
    sql = zlib.gunzipSync(fs.readFileSync(abs)).toString("utf8");
  } catch (e) {
    die(`That file isn't a readable gzip — the backup may be truncated. (${e.message})`);
  }

  const header = sql.slice(0, 600);
  if (!/^-- MyEduPort backup/.test(header)) die("That doesn't look like a MyEduPort backup.");
  const taken = (header.match(/-- taken: (.+)/) || [])[1] || "unknown";
  const tableCount = (header.match(/-- tables: (\d+)/) || [])[1] || "?";
  const objects = (header.match(/-- objects: (.+)/) || [])[1] || "";
  if (objects && !/views=0 triggers=0 routines=0/.test(objects)) {
    die(`This backup was taken from a database with ${objects}, which the dumper does not capture. Restoring it would silently lose them.`);
  }

  console.log(`\nBackup:   ${path.basename(abs)}`);
  console.log(`Taken:    ${taken}`);
  console.log(`Contains: ${tableCount} tables`);
  console.log(`Target:   ${target}${target === LIVE_DB ? "  ← THE LIVE DATABASE" : "  (scratch copy)"}\n`);

  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, multipleStatements: true
  });

  try {
    // Before overwriting anything real, keep an escape hatch
    if (target === LIVE_DB) {
      console.log("Taking a safety backup of the current live database first…");
      execFileSync(process.execPath, [path.join(__dirname, "backup.js")], { stdio: "inherit" });
      console.log("");
    }

    await c.query(`CREATE DATABASE IF NOT EXISTS \`${target}\` DEFAULT CHARACTER SET utf8mb4`);
    await c.query(`USE \`${target}\``);

    const started = Date.now();
    await c.query(sql);

    const [rows] = await c.query(
      "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'",
      [target]
    );
    let total = 0;
    for (const { t } of rows) {
      const [[{ n }]] = await c.query(`SELECT COUNT(*) AS n FROM \`${target}\`.\`${t}\``);
      total += Number(n);
    }
    console.log(`✓ Restored ${rows.length} tables, ${total} rows into "${target}" in ${((Date.now() - started) / 1000).toFixed(1)}s`);

    if (target !== LIVE_DB) {
      console.log(`\nNothing live was touched. Inspect it, then drop it when you're done:`);
      console.log(`  DROP DATABASE \`${target}\`;`);
    } else {
      console.log(`\nRestart the API so it picks up the restored data:`);
      console.log(`  pm2 restart myeduport-backend`);
      console.log(`Uploaded files are separate — restore them with:`);
      console.log(`  tar -xzf ${abs.replace(/myeduport-/, "uploads-").replace(/\.sql\.gz$/, ".tar.gz")} -C ${path.join(__dirname, "..")}`);
    }
  } catch (err) {
    die(`Restore failed: ${err.message}`);
  } finally {
    await c.end().catch(() => {});
  }
})();
