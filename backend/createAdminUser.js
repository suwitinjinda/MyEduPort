#!/usr/bin/env node
/**
 * Create or reset admin user for login.
 * Run: node createAdminUser.js
 * Uses ADMIN_EMAIL from .env (default: admin@gmail.com)
 */
require("dotenv").config();
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = "Admin@123";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "myeduport"
};

async function createAdminUser() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to database.\n");

    const [users] = await connection.execute(
      "SELECT id, email, name, role FROM users WHERE email = ?",
      [ADMIN_EMAIL]
    );

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    if (users.length === 0) {
      // Create admin user
      const [result] = await connection.execute(
        "INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)",
        [ADMIN_EMAIL, passwordHash, "student", "Admin"]
      );
      const userId = result.insertId;
      await connection.execute(
        "INSERT INTO students (user_id, grade_level) VALUES (?, ?)",
        [userId, ""]
      );
      console.log("Admin user created.\n");
    } else {
      // Reset password
      await connection.execute(
        "UPDATE users SET password_hash = ? WHERE email = ?",
        [passwordHash, ADMIN_EMAIL]
      );
      console.log("Admin password reset.\n");
    }

    console.log("=== Login Credentials ===");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log("\nMake sure ADMIN_EMAIL in backend/.env matches:", ADMIN_EMAIL);
    console.log("Restart backend after changing .env\n");

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

createAdminUser();
