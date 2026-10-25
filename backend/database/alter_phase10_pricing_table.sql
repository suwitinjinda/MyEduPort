-- ============================================================
-- Phase 10 — Packages aligned to the pricing comparison table
--  advisor_sessions : Human Advisor Session requests (Professional, 1 / month),
--                     worked from the Admin → Advisor sessions queue
--  plan_limits      : reset to the new keys (match / prediction / parent_dashboard /
--                     advisor) and values. Overwrites any admin edits to plan limits.
-- Idempotent.
-- ============================================================
USE myeduport;

CREATE TABLE IF NOT EXISTS advisor_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  period CHAR(7) NOT NULL,                 -- 'YYYY-MM' the request counts against
  topic VARCHAR(200) NOT NULL,
  details TEXT,
  preferred_times VARCHAR(255),
  status ENUM('requested', 'scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'requested',
  scheduled_at DATETIME NULL,
  meeting_link VARCHAR(500) NULL,
  admin_note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_advisor_student_period (student_id, period),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

INSERT INTO app_settings (skey, sval) VALUES ('plan_limits', JSON_OBJECT(
  'free',         JSON_OBJECT('adviai', false, 'export', false, 'prediction', 'none',     'match', 3,  'parent_dashboard', false, 'advisor', 0, 'gap', false, 'edubot', 3,   'essay_feedback', 1),
  'essential',    JSON_OBJECT('adviai', true,  'export', true,  'prediction', 'basic',    'match', 10, 'parent_dashboard', false, 'advisor', 0, 'gap', true,  'edubot', 30,  'essay_feedback', 5),
  'professional', JSON_OBJECT('adviai', true,  'export', true,  'prediction', 'advanced', 'match', -1, 'parent_dashboard', true,  'advisor', 1, 'gap', true,  'edubot', 150, 'essay_feedback', -1)
))
ON DUPLICATE KEY UPDATE sval = VALUES(sval);
