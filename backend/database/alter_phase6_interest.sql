-- ============================================================
-- Phase 6 — RIASEC / Holland Code Career-Interest Test (O*NET IP-SF)
-- Companion to personality_assessments. Append-only (every attempt kept).
-- Binary checklist (0/1) per item; score = sum per type (0–10); top-3 = code.
-- ============================================================
USE myeduport;

CREATE TABLE IF NOT EXISTS interest_assessments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  instrument VARCHAR(20) NOT NULL DEFAULT 'ONET-IP-SF',
  instrument_version VARCHAR(10) NOT NULL DEFAULT '1.0',
  responses JSON,               -- { "R1": 1, "R2": 0, ... "C10": 1 }
  scores JSON,                  -- { R, I, A, S, E, C } counts 0–10
  ranking JSON,                 -- ["A","I","S","C","R","E"] (desc, tiebreak RIASEC order)
  holland_code VARCHAR(6),      -- e.g. "AIS"
  narrative JSON,               -- AdviAI { summary, majors, careers, recommendations }
  started_at TIMESTAMP NULL,
  parental_consent BOOLEAN NOT NULL DEFAULT FALSE, -- COPPA: under-13
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_student_completed (student_id, completed_at)
);
