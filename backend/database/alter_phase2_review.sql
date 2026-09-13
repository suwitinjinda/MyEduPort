-- ============================================================
-- Phase 2 review changes (REV00 For PSuwit) — MySQL 8 compatible
-- Adds: activity topic/summary/AI score, essay topic/summary/status/AI score.
-- NOTE: MySQL 8 does not support "ADD COLUMN IF NOT EXISTS".
-- Run via: node database/run_phase2_migration.js  (idempotent — checks
-- information_schema and only adds missing columns). This .sql documents
-- the target schema and works as-is on a fresh database.
-- ============================================================
USE myeduport;

-- Essays table (created here in case alter_add_essays.sql was never run)
CREATE TABLE IF NOT EXISTS essays (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  word_count INT DEFAULT 0,
  last_edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_student_id (student_id)
);

-- 03 Extracurricular Activities: topic, AI summary, AI score
ALTER TABLE activities ADD COLUMN topic VARCHAR(180) DEFAULT '' AFTER title;
ALTER TABLE activities ADD COLUMN summary TEXT AFTER description;
ALTER TABLE activities ADD COLUMN ai_score INT DEFAULT NULL;

-- 05 Documents / Essays: topic, AI summary, workflow status, AI score
ALTER TABLE essays ADD COLUMN topic VARCHAR(255) DEFAULT '' AFTER title;
ALTER TABLE essays ADD COLUMN summary TEXT AFTER content;
ALTER TABLE essays ADD COLUMN status ENUM('draft','revise','final') NOT NULL DEFAULT 'draft';
ALTER TABLE essays ADD COLUMN ai_score INT DEFAULT NULL;
