-- ============================================================
-- Phase 13 — Email marketing (Admin → Email Marketing)
--  email_campaigns            : one email blast (content, audience, schedule, stats)
--  email_campaign_recipients  : per-recipient delivery status + open/click tracking
--  email_groups / _members    : saved audiences (system users and/or external emails)
--  email_unsubscribes         : global opt-out list, always excluded from sends
-- Idempotent.
-- ============================================================
USE myeduport;

CREATE TABLE IF NOT EXISTS email_campaigns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  subject VARCHAR(255) NOT NULL DEFAULT '',
  preheader VARCHAR(255) NOT NULL DEFAULT '',
  html MEDIUMTEXT,
  audience JSON NULL,                       -- { segments:[], groupIds:[], userIds:[], external:[] }
  status ENUM('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'draft',
  scheduled_at DATETIME NULL,
  started_at DATETIME NULL,
  sent_at DATETIME NULL,
  total INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_campaign_status (status, scheduled_at)
);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL DEFAULT '',
  user_id INT NULL,
  plan VARCHAR(20) NULL,
  token CHAR(32) NOT NULL,                  -- used in open/click tracking URLs
  status ENUM('pending', 'sending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending', -- 'sending' = claimed by the worker
  error VARCHAR(500) NULL,
  sent_at DATETIME NULL,
  opened_at DATETIME NULL,
  clicked_at DATETIME NULL,
  UNIQUE KEY uq_campaign_email (campaign_id, email),
  UNIQUE KEY uq_recipient_token (token),
  INDEX idx_recipient_status (campaign_id, status),
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_group_members (
  group_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(150) NOT NULL DEFAULT '',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, email),
  FOREIGN KEY (group_id) REFERENCES email_groups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_unsubscribes (
  email VARCHAR(255) PRIMARY KEY,
  source VARCHAR(40) NOT NULL DEFAULT 'link',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
