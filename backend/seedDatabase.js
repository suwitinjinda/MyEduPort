#!/usr/bin/env node
/**
 * Seed database with universities and sample data.
 * Run: node seedDatabase.js
 */
require("dotenv").config();
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "myeduport"
};

async function seed() {
  const pool = await mysql.createPool(dbConfig);
  const conn = await pool.getConnection();

  try {
    console.log("Seeding database...\n");

    // Seed universities
    const seedPath = path.join(__dirname, "database", "seed.sql");
    const seedSql = fs.readFileSync(seedPath, "utf8");
    const statements = seedSql
      .replace(/--[^\n]*/g, "")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !/^USE\s+/i.test(s));

    for (const stmt of statements) {
      if (stmt) {
        await conn.query(stmt);
      }
    }
    console.log("Universities seeded.");

    const [[{ c }]] = await conn.query("SELECT COUNT(*) as c FROM universities");
    console.log(`Total universities: ${c}\n`);
    console.log("Seed complete.");
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

seed();
