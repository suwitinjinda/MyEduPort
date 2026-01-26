USE myeduport;

-- Add consent and account status fields to users table
-- Note: If columns already exist, you'll see "Duplicate column name" errors which can be ignored

ALTER TABLE users 
ADD COLUMN data_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN is_disabled BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Add index for disabled users
-- Note: If indexes already exist, you'll see "Duplicate key name" errors which can be ignored
CREATE INDEX idx_users_disabled ON users(is_disabled);
CREATE INDEX idx_users_deleted ON users(deleted_at);
