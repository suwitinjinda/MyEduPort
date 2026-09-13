USE myeduport;

-- Add Google OAuth support to users table
-- google_id: stores Google's unique user ID for OAuth users
-- password_hash: allow NULL for users who sign in with Google only

ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE;
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL;
CREATE INDEX idx_users_google_id ON users(google_id);
