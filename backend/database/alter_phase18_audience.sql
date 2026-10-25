-- ============================================================
-- Phase 18 — Email Marketing → Audience management
--  email_contacts : external contacts (imported / added by admin) + tags for ANY email
--                   (system users get a row here only when tagged)
--  email_segments : saved dynamic filters, re-evaluated at send time
-- Idempotent.
-- ============================================================
USE myeduport;

CREATE TABLE IF NOT EXISTS email_contacts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL DEFAULT '',
  tags JSON NULL,
  source ENUM('user', 'manual', 'import') NOT NULL DEFAULT 'manual',
  consent TINYINT(1) NOT NULL DEFAULT 0,       -- admin confirmed this person agreed to receive email
  notes VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contact_email (email)
);

CREATE TABLE IF NOT EXISTS email_segments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  filters JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
