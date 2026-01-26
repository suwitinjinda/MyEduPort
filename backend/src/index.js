require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const parentRoutes = require("./routes/parents");
const aiRoutes = require("./routes/ai");
const universityRoutes = require("./routes/universities");
const uploadRoutes = require("./routes/uploads");
const adminRoutes = require("./routes/admin");

const app = express();

// Security: In production, enforce HTTPS via reverse proxy (Nginx, etc.)
// For local development, HTTP is acceptable
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_HTTP) {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      return res.redirect(`https://${req.header("host")}${req.url}`);
    }
    next();
  });
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", process.env.UPLOAD_DIR || "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/parents", parentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/universities", universityRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`MyEduPort API listening on port ${port}`);
});
