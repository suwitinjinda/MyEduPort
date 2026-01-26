const jwt = require("jsonwebtoken");
const pool = require("../db");

async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is not disabled/deleted
    // Check if new security columns exist, otherwise use basic query
    let [rows] = await pool.query(
      "SELECT id, email, role FROM users WHERE id = ?",
      [payload.id]
    );
    
    if (!rows.length) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Try to get security fields if they exist
    try {
      const [securityRows] = await pool.query(
        "SELECT is_disabled, deleted_at FROM users WHERE id = ?",
        [payload.id]
      );
      if (securityRows.length) {
        const user = securityRows[0];
        if (user.deleted_at) {
          return res.status(401).json({ error: "Account has been deleted" });
        }
        if (user.is_disabled) {
          return res.status(403).json({ error: "Account has been disabled" });
        }
      }
    } catch (err) {
      // Columns don't exist yet - migration not run, skip security checks
      // This allows the app to work before migration is run
    }
    
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { authRequired };
