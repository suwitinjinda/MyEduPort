-- ============================================================
-- Phase 19 — Elite plan (4th tier). Limits/prices/visibility live in app_settings
-- ('plan_limits', 'plan_display') and are edited in Admin → Plan Settings. Run once.
-- ============================================================
USE myeduport;

ALTER TABLE users MODIFY plan ENUM('free', 'essential', 'professional', 'elite') NOT NULL DEFAULT 'free';
