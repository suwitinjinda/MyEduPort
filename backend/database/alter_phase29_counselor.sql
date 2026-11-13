-- Phase 29: counsellor workspace
--   counselor_notes          private notes a counsellor keeps on each advised student
--   recommendation_requests  a student asks a linked counsellor for a recommendation letter;
--                            the counsellor moves it through requested → in_progress → sent
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS counselor_notes (
  counselor_id INT NOT NULL,
  student_id INT NOT NULL,
  note TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (counselor_id, student_id),
  CONSTRAINT fk_cnote_counselor FOREIGN KEY (counselor_id) REFERENCES counselors(id) ON DELETE CASCADE,
  CONSTRAINT fk_cnote_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendation_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  counselor_id INT NOT NULL,
  purpose VARCHAR(200) NOT NULL,
  due_date DATE NULL,
  student_note TEXT,
  status ENUM('requested','in_progress','sent','declined','cancelled') NOT NULL DEFAULT 'requested',
  counselor_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_rec_counselor (counselor_id, status),
  KEY idx_rec_student (student_id),
  CONSTRAINT fk_rec_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_counselor FOREIGN KEY (counselor_id) REFERENCES counselors(id) ON DELETE CASCADE
);
