-- ============================================================
-- Phase 16 — Photos & videos on extracurricular activities
-- Files are stored as documents (category 'activities') and linked here, so they
-- also show in Documents. Idempotent.
-- ============================================================
USE myeduport;

CREATE TABLE IF NOT EXISTS activity_media (
  activity_id INT NOT NULL,
  document_id INT NOT NULL,
  media_type ENUM('image', 'video') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (activity_id, document_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
