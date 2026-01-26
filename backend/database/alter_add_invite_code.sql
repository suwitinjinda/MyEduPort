USE myeduport;

ALTER TABLE students
  ADD COLUMN invite_code VARCHAR(32) UNIQUE;
