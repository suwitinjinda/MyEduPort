-- Personal section: student's ranked intended universities (up to 3 picks + 1 custom),
-- stored pipe-delimited (names contain commas). Custom (typed) universities are added to `universities`
-- as source='user', hidden=1. Run once.
ALTER TABLE students ADD COLUMN intended_universities VARCHAR(500) NULL;
