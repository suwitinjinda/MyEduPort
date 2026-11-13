-- Phase 30: accounts an admin creates
--   role 'admin'   — a second (third…) admin; until now only ADMIN_EMAIL could be admin
--   role 'consult' — consultants; what they can do is designed in a later phase
-- Safe to re-run (MODIFY just restates the full list).
ALTER TABLE users MODIFY role ENUM('student','parent','counselor','affiliate','admin','consult') NOT NULL;
