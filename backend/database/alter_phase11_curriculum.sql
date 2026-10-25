-- ============================================================
-- Phase 11 — Academics: one curriculum per student (IB, A-Level, AP, …)
-- chosen once at the top of Academics → Section I, replacing the per-course Level.
-- Run once (MySQL 8 has no ADD COLUMN IF NOT EXISTS).
-- ============================================================
USE myeduport;

ALTER TABLE students ADD COLUMN curriculum VARCHAR(80) DEFAULT '';
