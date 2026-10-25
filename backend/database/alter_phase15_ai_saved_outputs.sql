-- ============================================================
-- Phase 15 — Keep the latest result of every MEPAi generation
-- so pages reopen with the last advice instead of regenerating (and losing) it.
-- One row per user + kind + scope (e.g. academic_advisory / "Grade 9 / Year 10").
-- Idempotent.
-- ============================================================
USE myeduport;

CREATE TABLE IF NOT EXISTS ai_saved_outputs (
  user_id INT NOT NULL,
  kind VARCHAR(60) NOT NULL,
  scope VARCHAR(190) NOT NULL DEFAULT '',
  payload JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, kind, scope),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
