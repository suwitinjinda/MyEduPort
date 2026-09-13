-- ============================================================
-- MyEduPort v2 schema expansion (May 2026)
-- Adds: activity category, class rank, tasks, share tokens,
-- saved universities, application deadlines.
-- ============================================================

USE myeduport;

-- 1. Activity Common App category
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS category VARCHAR(60) DEFAULT '' AFTER role;

-- 2. Class rank on student profile
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS class_rank VARCHAR(40) DEFAULT '' AFTER intended_major,
  ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS share_expires_at DATETIME NULL;

-- 3. Tasks tracker
CREATE TABLE IF NOT EXISTS tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  due_date DATE,
  category VARCHAR(40) DEFAULT 'general',
  status ENUM('open', 'in_progress', 'done') DEFAULT 'open',
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 4. Saved universities (a student's college list with reach/target/safety)
CREATE TABLE IF NOT EXISTS saved_universities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  university_id INT NOT NULL,
  bucket ENUM('reach', 'target', 'safety') DEFAULT 'target',
  application_round VARCHAR(40) DEFAULT '',
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_student_uni (student_id, university_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
);

-- 5. Index for tasks query performance
CREATE INDEX IF NOT EXISTS idx_tasks_student_due ON tasks (student_id, due_date);
CREATE INDEX IF NOT EXISTS idx_saved_uni_student ON saved_universities (student_id);
