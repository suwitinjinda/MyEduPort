-- Password reset via one-time token (hashed at rest, 1-hour expiry). Run once.
ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL;

-- Columns the app assumes exist (soft-delete, account disable, consent tracking).
-- Their absence silently breaks change-password / account-delete / admin-disable.
ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL;
ALTER TABLE users ADD COLUMN is_disabled TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN data_consent TINYINT(1) NOT NULL DEFAULT 0;
