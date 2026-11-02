-- Phase 27: sign-up consent form. Every consent choice is a new row (an audit trail —
-- never updated or deleted), recording which wording version was agreed to and where.
-- The current state of a consent is the newest row for that user and key.
CREATE TABLE IF NOT EXISTS user_consents (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  consent_key VARCHAR(40) NOT NULL,
  granted TINYINT(1) NOT NULL,
  version VARCHAR(40) NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'signup',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_key (user_id, consent_key, id),
  CONSTRAINT fk_consent_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Students say whether they're under 20 (Thailand's age of majority); under-20s give a
-- parent or guardian's email, who is sent a copy.
ALTER TABLE users ADD COLUMN age_group ENUM('adult','minor') NULL;
ALTER TABLE users ADD COLUMN guardian_email VARCHAR(190) NULL;
