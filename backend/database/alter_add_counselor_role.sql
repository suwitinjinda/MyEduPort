-- MyEduPort — Add counselor role (May 2026)
-- A counselor can view (read-only) multiple students linked via invite codes.

USE myeduport;

-- Expand role enum to include 'counselor'
ALTER TABLE users
  MODIFY COLUMN role ENUM('student', 'parent', 'counselor') NOT NULL;

-- Counselor profile (analog of parents table)
CREATE TABLE IF NOT EXISTS counselors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  organization VARCHAR(180) DEFAULT '',
  title VARCHAR(120) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Many-to-many: a counselor can advise multiple students; a student can have multiple counselors
CREATE TABLE IF NOT EXISTS counselor_student_links (
  id INT PRIMARY KEY AUTO_INCREMENT,
  counselor_id INT NOT NULL,
  student_id INT NOT NULL,
  invite_code VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_counselor_student (counselor_id, student_id),
  FOREIGN KEY (counselor_id) REFERENCES counselors(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
