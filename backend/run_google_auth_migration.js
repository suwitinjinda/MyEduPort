#!/usr/bin/env node
require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  // Ensure users table exists (run schema if needed)
  const [rows] = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users'",
    [process.env.DB_NAME]
  );
  if (!rows.length) {
    console.log("Users table not found. Running initial schema...");
    const schemaPath = path.join(__dirname, "database", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    await pool.query(schema);
    console.log("Schema applied.");
  }

  const sqlPath = path.join(__dirname, "database", "alter_add_google_auth.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log("Running Google auth migration...");
  try {
    // Run statements one by one (split by ;, strip comments)
    const statements = sql
      .replace(/--[^\n]*/g, "")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !/^USE\s+/i.test(s));
    for (const stmt of statements) {
      if (stmt) {
        try {
          await pool.query(stmt);
          console.log("OK:", stmt.substring(0, 60) + "...");
        } catch (e) {
          if (e.code === "ER_DUP_FIELDNAME" || e.code === "ER_DUP_KEYNAME") {
            console.log("Skip (already exists):", e.message);
          } else {
            console.error("Failed:", stmt.substring(0, 80));
            throw e;
          }
        }
      }
    }
    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
