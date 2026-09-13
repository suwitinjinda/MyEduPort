-- ============================================================
-- Phase 3 — User subscription plan (for FREE vs PRO feature gating)
-- No payment integration yet: plan is assigned manually by an admin.
-- MySQL 8: run via the idempotent node runner (information_schema check).
-- ============================================================
USE myeduport;

ALTER TABLE users
  ADD COLUMN plan ENUM('free','essential','professional') NOT NULL DEFAULT 'free';
