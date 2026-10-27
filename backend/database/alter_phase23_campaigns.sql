-- Phase 23: campaign landing pages managed from Admin → Campaigns.
-- A campaign is a slug (/lp/<slug>) plus the wording that differs from the base page.
-- Visits are counted once per visitor per day (salted IP hash, no raw IP stored).

CREATE TABLE IF NOT EXISTS campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  status ENUM('active','paused') NOT NULL DEFAULT 'active',
  content JSON NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_visits (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  day DATE NOT NULL,
  ip_hash CHAR(16) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_visit (campaign_id, day, ip_hash),
  KEY idx_campaign_day (campaign_id, day),
  CONSTRAINT fk_cv_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
