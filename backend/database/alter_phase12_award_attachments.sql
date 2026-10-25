-- ============================================================
-- Phase 12 — Awards: optional file attachment (certificate, result letter…)
-- The file is stored as a normal document (category 'awards') and linked here,
-- so it also shows in Documents. Run once.
-- ============================================================
USE myeduport;

ALTER TABLE awards ADD COLUMN document_id INT NULL,
  ADD CONSTRAINT fk_awards_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
