-- ============================================================
-- Phase 3 — Essay draft versioning (Draft 1, 2, 3, …)
-- Stores point-in-time snapshots of an essay the student can switch between.
-- Idempotent: CREATE TABLE IF NOT EXISTS.
-- ============================================================
USE myeduport;

CREATE TABLE IF NOT EXISTS essay_drafts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  essay_id INT NOT NULL,
  student_id INT NOT NULL,
  draft_no INT NOT NULL,
  content TEXT,
  word_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (essay_id) REFERENCES essays(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_essay_draft (essay_id, draft_no)
);
