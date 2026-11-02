-- Phase 26: Compare starts from the student's Intended Universities (Portfolio → Personal).
-- source marks rows added that way; a student who removes one is remembered so it isn't
-- added back on their next visit.
-- The table comes first so a re-run (where the column already exists and that line errors)
-- still has created it.
CREATE TABLE IF NOT EXISTS saved_university_dismissals (
  student_id INT NOT NULL,
  university_id INT NOT NULL,
  dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, university_id),
  CONSTRAINT fk_sud_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_sud_uni FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
);

ALTER TABLE saved_universities ADD COLUMN source ENUM('manual','intended') NOT NULL DEFAULT 'manual';
