-- ============================================================
-- Phase 4 — Admin-configurable plan limits + usage quotas
--  app_settings   : key/JSON store (holds 'plan_limits')
--  usage_counters : per-user, per-feature, per-period counters (quota enforcement)
-- Idempotent: CREATE TABLE IF NOT EXISTS.
-- ============================================================
USE myeduport;

CREATE TABLE IF NOT EXISTS app_settings (
  skey VARCHAR(64) PRIMARY KEY,
  sval JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_counters (
  user_id INT NOT NULL,
  feature VARCHAR(40) NOT NULL,
  period  VARCHAR(16) NOT NULL,     -- 'lifetime' or 'YYYY-MM'
  count   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, feature, period),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
