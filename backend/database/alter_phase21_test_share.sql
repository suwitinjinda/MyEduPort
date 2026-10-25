-- Phase 21 — shareable links for the Personal Character Test and Career Test results.
--
-- One row per (student, test). The link always resolves to that student's LATEST result
-- for that test, so retaking the test updates what the link shows rather than leaving a
-- stale snapshot behind. Deleting the row revokes the link immediately.
--
-- These links are meant to be posted publicly (Facebook, X, Instagram), so the public
-- endpoint deliberately returns only: first name, the scores, and the AI summary and
-- strengths. Never the school, grades, activities, email or the personal recommendations.

CREATE TABLE IF NOT EXISTS test_shares (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT          NOT NULL,
  kind          ENUM('personality','career') NOT NULL,
  token         VARCHAR(64)  NOT NULL,
  view_count    INT          NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_viewed_at TIMESTAMP   NULL DEFAULT NULL,
  UNIQUE KEY uniq_token (token),
  UNIQUE KEY uniq_student_kind (student_id, kind),
  CONSTRAINT fk_test_shares_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
