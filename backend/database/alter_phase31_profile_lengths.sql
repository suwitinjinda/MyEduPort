-- Phase 31: room for three typed-in ("Other") countries or majors. At 120 characters,
-- three long custom entries made the whole Personal page fail to save.
-- Safe to re-run.
ALTER TABLE students MODIFY target_countries VARCHAR(255) NULL, MODIFY intended_major VARCHAR(255) NULL;
