-- ============================================================
-- Phase 20 — Stripe subscriptions. Run once.
-- ============================================================
USE myeduport;

ALTER TABLE users
  ADD COLUMN stripe_customer_id VARCHAR(64) NULL,
  ADD COLUMN stripe_subscription_id VARCHAR(64) NULL,
  ADD COLUMN plan_cycle ENUM('monthly', 'annual') NULL,
  ADD COLUMN plan_renews_at DATETIME NULL,
  ADD COLUMN subscription_status VARCHAR(30) NULL;
