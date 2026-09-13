/**
 * Idempotent Phase 2 migration runner (MySQL 8 safe).
 * Creates the essays table if missing, then adds each new column only
 * when it does not already exist. Re-runnable with no side effects.
 *
 * Usage (from backend/):  node database/run_phase2_migration.js
 * Reads DB_* from backend/.env (falls back to process.env).
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
    raw.split("\n").forEach((l) => {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    });
  } catch (e) { /* rely on process.env */ }
  return env;
}

const ESSAYS_TABLE = `CREATE TABLE IF NOT EXISTS essays (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  word_count INT DEFAULT 0,
  last_edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_student_id (student_id)
)`;

const COLUMNS = [
  ["activities", "topic", "VARCHAR(180) DEFAULT '' AFTER title"],
  ["activities", "summary", "TEXT AFTER description"],
  ["activities", "ai_score", "INT DEFAULT NULL"],
  ["essays", "topic", "VARCHAR(255) DEFAULT '' AFTER title"],
  ["essays", "summary", "TEXT AFTER content"],
  ["essays", "status", "ENUM('draft','revise','final') NOT NULL DEFAULT 'draft'"],
  ["essays", "ai_score", "INT DEFAULT NULL"]
];

(async () => {
  const env = loadEnv();
  const conn = await mysql.createConnection({
    host: env.DB_HOST, port: Number(env.DB_PORT || 3306),
    user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME
  });
  const db = env.DB_NAME;
  await conn.query(ESSAYS_TABLE);
  console.log("ensured: essays table");

  for (const [table, col, ddl] of COLUMNS) {
    const [[{ n }]] = await conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [db, table, col]
    );
    if (n > 0) { console.log(`skip: ${table}.${col} (exists)`); continue; }
    await conn.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`);
    console.log(`added: ${table}.${col}`);
  }
  await conn.end();
  console.log("Phase 2 migration complete.");
})().catch((e) => { console.error("FATAL:", e.code || e.message); process.exit(1); });
