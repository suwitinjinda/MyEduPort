-- Phase 28: consent form v2026-11 (MyEduPort_Consent_Form_202611.docx) and parent confirmation.
-- Students under 20 get full access only after a parent confirms through an emailed link.
-- Every consent row records who gave it (the student or a parent), the IP and the wording
-- version. Re-runnable: each step checks before changing.

-- Who gave a consent row and from where
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_consents' AND COLUMN_NAME = 'consented_by');
SET @s := IF(@c = 0, "ALTER TABLE user_consents ADD COLUMN consented_by ENUM('self','parent') NOT NULL DEFAULT 'self', ADD COLUMN actor_user_id INT NULL, ADD COLUMN ip VARCHAR(45) NULL", "SELECT 1");
PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

-- Date of birth (students), parent phone, and where the parent confirmation stands
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'birth_date');
SET @s := IF(@c = 0, "ALTER TABLE users ADD COLUMN birth_date DATE NULL, ADD COLUMN guardian_phone VARCHAR(40) NULL, ADD COLUMN parent_consent_status ENUM('not_required','pending','confirmed','declined') NULL", "SELECT 1");
PREPARE x FROM @s; EXECUTE x; DEALLOCATE PREPARE x;

-- One row per link sent to a parent. The token is stored hashed (for lookup) and encrypted
-- (so the student can copy the same link again). is_existing marks accounts from before the
-- consent form: they are restricted, never auto-deleted, if no parent confirms.
CREATE TABLE IF NOT EXISTS parent_consent_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  token_enc VARCHAR(255) NOT NULL,
  parent_email VARCHAR(190) NOT NULL,
  parent_phone VARCHAR(40) NULL,
  status ENUM('pending','confirmed','declined','expired','replaced') NOT NULL DEFAULT 'pending',
  is_existing TINYINT(1) NOT NULL DEFAULT 0,
  reminders_sent INT NOT NULL DEFAULT 0,
  last_sent_at DATETIME NULL,
  parent_name VARCHAR(150) NULL,
  relationship VARCHAR(30) NULL,
  parent_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  decided_at DATETIME NULL,
  KEY idx_pcr_student (student_user_id, status),
  KEY idx_pcr_status (status, expires_at),
  CONSTRAINT fk_pcr_student FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE
);
