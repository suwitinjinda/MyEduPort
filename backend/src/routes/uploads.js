const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "..", process.env.UPLOAD_DIR || "uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File size exceeds 10MB limit" });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message || "Upload failed" });
  }
  next();
};

router.post("/me", authRequired, upload.single("file"), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const [studentRows] = await pool.query("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
    const studentId = studentRows[0]?.id;
    if (!studentId) {
      // Clean up uploaded file if student not found
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path).catch(() => {});
      }
      return res.status(403).json({ error: "Student only" });
    }

    const category = req.body?.category || "general";
    const filePath = `/uploads/${req.file.filename}`;
    
    const [result] = await pool.query(
      "INSERT INTO documents (student_id, file_path, category, original_name) VALUES (?, ?, ?, ?)",
      [studentId, filePath, category, req.file.originalname]
    );
    
    res.json({ 
      id: result.insertId, 
      file_path: filePath,
      filename: req.file.filename,
      original_name: req.file.originalname,
      category: category
    });
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path).catch(() => {});
    }
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload document" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  const [studentRows] = await pool.query("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
  const studentId = studentRows[0]?.id;
  if (!studentId) {
    return res.status(403).json({ error: "Student only" });
  }
  const [rows] = await pool.query("SELECT * FROM documents WHERE student_id = ? ORDER BY uploaded_at DESC", [studentId]);
  res.json(rows);
});

router.delete("/me/:id", authRequired, async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const [studentRows] = await pool.query("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
    const studentId = studentRows[0]?.id;
    if (!studentId) {
      return res.status(403).json({ error: "Student only" });
    }

    // Get document info before deleting
    const [docRows] = await pool.query(
      "SELECT file_path FROM documents WHERE id = ? AND student_id = ?",
      [documentId, studentId]
    );
    
    if (!docRows.length) {
      return res.status(404).json({ error: "Document not found" });
    }

    const filePath = docRows[0].file_path;
    // Extract filename from file_path (e.g., "/uploads/filename.pdf" -> "filename.pdf")
    const filename = filePath.replace("/uploads/", "");
    const fullFilePath = path.join(uploadDir, filename);

    // Delete from database
    await pool.query("DELETE FROM documents WHERE id = ? AND student_id = ?", [documentId, studentId]);

    // Delete physical file
    if (fs.existsSync(fullFilePath)) {
      fs.unlinkSync(fullFilePath);
    }

    res.json({ status: "Document deleted successfully" });
  } catch (err) {
    console.error("Delete document error:", err);
    res.status(500).json({ error: err.message || "Failed to delete document" });
  }
});

module.exports = router;
