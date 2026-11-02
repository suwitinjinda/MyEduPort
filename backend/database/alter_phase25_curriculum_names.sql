-- Phase 25: curriculum names updated (Portfolio → Academics → Curriculums).
-- Students who picked an old name are moved to its new name so their choice still shows
-- as selected. "AP / US High School" was one option and is now split; AP is the closest.
UPDATE students SET curriculum = 'IB Diploma Programme (IBDP)'     WHERE curriculum = 'IB Diploma (IBDP)';
UPDATE students SET curriculum = 'IB Middle Years Programme (MYP)' WHERE curriculum = 'IB Middle Years (MYP)';
UPDATE students SET curriculum = 'A-Level / AS-Level'              WHERE curriculum = 'A-Level';
UPDATE students SET curriculum = 'AP (Advanced Placement)'         WHERE curriculum = 'AP / US High School';
UPDATE students SET curriculum = 'US Honors Program'               WHERE curriculum = 'US Honors';
UPDATE students SET curriculum = 'Other (please specify)'          WHERE curriculum = 'Other';
