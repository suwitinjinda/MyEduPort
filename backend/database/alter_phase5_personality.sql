-- ============================================================
-- Phase 5 — IPIP-50 Personality Assessment (Portfolio → Personal, PRO)
-- Append-only: every completed attempt is one row (growth over time).
-- ============================================================
USE myeduport;

CREATE TABLE IF NOT EXISTS personality_assessments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  instrument VARCHAR(20) NOT NULL DEFAULT 'IPIP-50',
  instrument_version VARCHAR(10) NOT NULL DEFAULT '1.0',
  responses JSON,            -- { "1": 4, "2": 2, ... "50": 3 }
  scores JSON,               -- { raw: {E,A,C,ES,I}, average: {E,A,C,ES,I} }
  bands JSON,                -- { E: "Above average", ... }
  narrative JSON,            -- AdviAI { summary, strengths, recommendations }
  started_at TIMESTAMP NULL,  -- when the student began this attempt
  parental_consent BOOLEAN NOT NULL DEFAULT FALSE, -- COPPA: consent for under-13
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_student_completed (student_id, completed_at)
);
