-- Phase 22 — affiliate program and referral (coin) program.
-- Design: doc/affiliate-referral-design.md
--
-- Affiliates are external partners with their own login (new `affiliate` role). Their terms
-- (commission and new-student discount) are set per partner by an admin, and are copied
-- onto each referral at sign-up so later edits never change what an existing referral pays.

ALTER TABLE users MODIFY role ENUM('student','parent','counselor','affiliate') NOT NULL;

-- A student's personal invite code for the referral program, created the first time they
-- open their Rewards page.
ALTER TABLE users ADD COLUMN referral_code VARCHAR(24) NULL UNIQUE;

CREATE TABLE IF NOT EXISTS affiliates (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL UNIQUE,
  code              VARCHAR(24) NULL UNIQUE,            -- assigned by the admin on approval
  status            ENUM('pending','active','paused','rejected') NOT NULL DEFAULT 'pending',

  -- what they told us when applying
  organisation      VARCHAR(150) NULL,
  phone             VARCHAR(40)  NULL,
  website           VARCHAR(255) NULL,
  audience          TEXT NULL,

  -- terms, editable per partner by an admin
  commission_type   ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  commission_value  DECIMAL(8,2) NOT NULL DEFAULT 20,
  commission_scope  ENUM('first','months','forever') NOT NULL DEFAULT 'first',
  commission_months SMALLINT NOT NULL DEFAULT 12,
  earned_on         ENUM('payment','signup') NOT NULL DEFAULT 'payment',
  hold_days         SMALLINT NOT NULL DEFAULT 30,
  discount_percent  DECIMAL(5,2) NOT NULL DEFAULT 5,
  discount_duration ENUM('once','repeating','forever') NOT NULL DEFAULT 'once',
  discount_months   SMALLINT NOT NULL DEFAULT 12,
  min_payout        DECIMAL(10,2) NOT NULL DEFAULT 15,

  -- how they get paid
  payout_method     VARCHAR(30)  NULL,
  payout_details    VARCHAR(255) NULL,
  tax_id            VARCHAR(30)  NULL,

  admin_notes       TEXT NULL,
  approved_at       DATETIME NULL,
  approved_by       INT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_aff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Link visits, de-duplicated per visitor per day (see services/referrals.js)
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  affiliate_id  INT NOT NULL,
  ip_hash       CHAR(16) NULL,
  path          VARCHAR(255) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aff_time (affiliate_id, created_at),
  CONSTRAINT fk_click_aff FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Who brought each new account in. One row per user: first touch wins.
CREATE TABLE IF NOT EXISTS referral_attributions (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL UNIQUE,
  source            ENUM('affiliate','referral') NOT NULL,
  affiliate_id      INT NULL,
  referrer_user_id  INT NULL,
  code              VARCHAR(24) NOT NULL,
  terms             JSON NOT NULL,                       -- snapshot of the terms at sign-up
  first_paid_at     DATETIME NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attr_aff (affiliate_id),
  INDEX idx_attr_ref (referrer_user_id),
  CONSTRAINT fk_attr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attr_aff  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE SET NULL,
  CONSTRAINT fk_attr_refr FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  affiliate_id  INT NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  currency      CHAR(3) NOT NULL DEFAULT 'usd',
  method        VARCHAR(30)  NULL,
  reference     VARCHAR(120) NULL,
  paid_at       DATETIME NOT NULL,
  recorded_by   INT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payout_aff FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per commission event. `event_key` makes each one idempotent: a Stripe invoice id,
-- or "signup:<userId>" for sign-up commissions — Stripe retries webhooks, and a retry must
-- never pay a partner twice.
CREATE TABLE IF NOT EXISTS commissions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  affiliate_id  INT NOT NULL,
  user_id       INT NULL,
  kind          ENUM('payment','signup') NOT NULL DEFAULT 'payment',
  event_key     VARCHAR(80) NOT NULL UNIQUE,
  stripe_charge_id VARCHAR(64) NULL,
  amount_paid   DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount        DECIMAL(10,2) NOT NULL,
  currency      CHAR(3) NOT NULL DEFAULT 'usd',
  status        ENUM('pending','approved','paid','reversed') NOT NULL DEFAULT 'pending',
  available_at  DATETIME NOT NULL,
  payout_id     INT NULL,
  note          VARCHAR(255) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comm_aff (affiliate_id, status),
  INDEX idx_comm_charge (stripe_charge_id),
  CONSTRAINT fk_comm_aff    FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  CONSTRAINT fk_comm_user   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_comm_payout FOREIGN KEY (payout_id) REFERENCES affiliate_payouts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coins. Append-only: a balance is the sum of a user's rows and is never stored or edited.
-- `ref_key` stops the same event being rewarded twice (UNIQUE with user_id; NULL for
-- manual admin adjustments, which may repeat).
CREATE TABLE IF NOT EXISTS coin_ledger (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  amount      INT NOT NULL,
  reason      VARCHAR(40) NOT NULL,
  ref_key     VARCHAR(80) NULL,
  note        VARCHAR(255) NULL,
  created_by  INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_coin_event (user_id, ref_key),
  INDEX idx_coin_user (user_id, created_at),
  CONSTRAINT fk_coin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
