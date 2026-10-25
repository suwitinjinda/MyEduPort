-- ============================================================
-- Phase 17 — Admin → Machine Learning
--  kb_documents / kb_chunks : admin-curated knowledge base (papers, guides). Text is
--                             extracted, split into chunks and FULLTEXT-indexed; MEPAi and
--                             EduBot retrieve the most relevant chunks as extra context (RAG).
--  admission_outcomes       : real application results (admitted / waitlisted / rejected /
--                             enrolled) with a snapshot of the applicant's profile, used by
--                             MEPAi as "students like you" evidence.
-- Idempotent.
-- ============================================================
USE myeduport;

CREATE TABLE IF NOT EXISTS kb_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  source VARCHAR(500) NOT NULL DEFAULT '',          -- citation / URL
  original_name VARCHAR(255) NOT NULL DEFAULT '',
  file_path VARCHAR(500) NULL,
  status ENUM('processing', 'ready', 'failed') NOT NULL DEFAULT 'processing',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  chars INT NOT NULL DEFAULT 0,
  chunk_count INT NOT NULL DEFAULT 0,
  error VARCHAR(500) NULL,
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kb_chunks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  doc_id INT NOT NULL,
  idx INT NOT NULL,
  content TEXT NOT NULL,
  FULLTEXT KEY ft_content (content),
  INDEX idx_doc (doc_id, idx),
  FOREIGN KEY (doc_id) REFERENCES kb_documents(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admission_outcomes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NULL,                                -- NULL = entered by admin (no account)
  university_id INT NULL,
  university_name VARCHAR(255) NOT NULL,
  country VARCHAR(80) NOT NULL DEFAULT '',
  cycle_year SMALLINT NULL,                           -- entry year, e.g. 2027
  application_round VARCHAR(40) NOT NULL DEFAULT '',  -- ED / EA / RD / UCAS …
  major VARCHAR(150) NOT NULL DEFAULT '',
  result ENUM('admitted', 'waitlisted', 'rejected', 'deferred', 'enrolled') NOT NULL,
  profile_snapshot JSON NULL,                         -- GPA, tests, activity/award counts at the time
  notes TEXT NULL,
  source ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_uni_cycle (student_id, university_id, cycle_year),
  INDEX idx_uni (university_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
);
