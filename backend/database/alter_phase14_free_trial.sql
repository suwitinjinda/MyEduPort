-- ============================================================
-- Phase 14 — 14-day free trial for new accounts
-- New registrations get trial_ends_at = signup + 14 days. While it's in the future,
-- a Free account is treated as Professional (see services/plan.js getUserPlan).
-- Existing accounts are untouched (NULL = no trial). Run once.
-- ============================================================
USE myeduport;

ALTER TABLE users ADD COLUMN trial_ends_at DATETIME NULL;
