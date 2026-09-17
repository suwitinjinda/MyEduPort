-- Auto-generated from doc/MyEduPort_University_Database_202609.docx (Sept 2026, QS 2026 top list).
-- Phase 7: add QS rank column + insert the top universities missing from the dropdown.
-- Non-destructive & idempotent: each INSERT is guarded, re-running won't duplicate.

-- Run once (MySQL 8 has no IF NOT EXISTS for ADD COLUMN). Skip this line if qs_rank already exists.
ALTER TABLE universities ADD COLUMN qs_rank INT NULL AFTER selectivity_band;

INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Massachusetts Institute of Technology (MIT)','US','Cambridge, MA','Ivy+',1,'Engineering, CS, Physics, Math, Architecture, Business'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Massachusetts Institute of Technology (MIT)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'California Institute of Technology (Caltech)','US','Pasadena, CA','Ivy+',10,'Physics, Chemistry, Engineering, CS, Astronomy'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='California Institute of Technology (Caltech)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Chicago','US','Chicago, IL','T14',13,'Economics, Law, Business (MBA), Humanities, Social Sciences'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Chicago');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Pennsylvania','US','Philadelphia, PA','Ivy',15,'Business (Wharton), Medicine, Law, Engineering, Nursing'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Pennsylvania');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Yale University','US','New Haven, CT','Ivy',16,'Law, Medicine, Arts, Drama, Architecture, Humanities'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Yale University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Cornell University','US','Ithaca, NY','Ivy',16,'Engineering, Hotel Admin, Agriculture, Architecture, Veterinary'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Cornell University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Princeton University','US','Princeton, NJ','Ivy',21,'Engineering, Public Affairs, Physics, Mathematics, Humanities'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Princeton University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Johns Hopkins University','US','Baltimore, MD','T20',22,'Medicine, Public Health, Engineering, International Studies'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Johns Hopkins University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of California, Los Angeles (UCLA)','US','Los Angeles, CA','Public',29,'Medicine, Law, Film (TFT), Engineering, Business (Anderson)'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of California, Los Angeles (UCLA)');
-- 'University of Michigan' already exists in the base seed; enrich it in place
-- instead of adding a duplicate '... - Ann Arbor' row.
UPDATE universities SET city='Ann Arbor, MI', selectivity_band='Public', qs_rank=23,
  major_tags='Engineering, Business (Ross), Medicine, Law, Education'
  WHERE name='University of Michigan' AND qs_rank IS NULL;
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'New York University (NYU)','US','New York, NY','T30',47,'Business (Stern), Law, Medicine, Arts (Tisch), Social Work'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='New York University (NYU)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Duke University','US','Durham, NC','T15',54,'Medicine, Law, Business (Fuqua), Engineering, Environmental'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Duke University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Northwestern University','US','Evanston, IL','T15',42,'Business (Kellogg), Law, Journalism (Medill), Medicine, Engineering'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Northwestern University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Columbia University','US','New York, NY','Ivy',33,'Business (CBS), Law, Journalism, Medicine, Engineering, Arts'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Columbia University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Carnegie Mellon University (CMU)','US','Pittsburgh, PA','T25',69,'CS & AI, Engineering, Design, Business (Tepper), Drama'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Carnegie Mellon University (CMU)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University College London (UCL)','UK','London','Russell',9,'Architecture (Bartlett), Law, Medicine, Arts & Sciences, Engineering'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University College London (UCL)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Edinburgh','UK','Edinburgh','Russell',28,'Medicine, Engineering, Informatics, Law, Humanities, Business'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Edinburgh');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'King''s College London (KCL)','UK','London','Russell',40,'Medicine, Law (The Dickson Poon), Nursing, Arts, Social Sciences'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='King''s College London (KCL)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Warwick','UK','Coventry','Russell',69,'Business (WBS), Engineering, Mathematics, Economics, Law'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Warwick');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Bristol','UK','Bristol','Russell',55,'Engineering, Law, Medicine, Arts, Computer Science, Education'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Bristol');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Glasgow','UK','Glasgow','Russell',79,'Medicine, Law, Arts, Engineering, Business (Adam Smith)'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Glasgow');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Durham University','UK','Durham','Russell',78,'Business (Durham), Law, Physics, Archaeology, History'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Durham University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Birmingham','UK','Birmingham','Russell',88,'Medicine, Engineering, Business (Birmingham), Law, Arts & Science'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Birmingham');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Sheffield','UK','Sheffield','Russell',111,'Engineering, Medicine, Architecture, Business, Arts & Humanities'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Sheffield');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Nottingham','UK','Nottingham','Russell',103,'Medicine, Engineering, Business, Pharmacy, Arts, Education'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Nottingham');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Leeds','UK','Leeds','Russell',86,'Business (Leeds), Engineering, Medicine, Arts, Education'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Leeds');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Southampton','UK','Southampton','Russell',99,'Engineering, Medicine, Law, Oceanography, CS, Business'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Southampton');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Monash University','Australia','VIC','Go8',37,'Medicine, Engineering, Law (Monash Law), Business, Arts, Pharmacy'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Monash University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Western Australia (UWA)','Australia','WA','Go8',72,'Medicine, Engineering, Business, Law, Science, Arts'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Western Australia (UWA)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Adelaide','Australia','SA','Go8',89,'Medicine, Engineering, Business, Law, Science, Architecture'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Adelaide');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Technology Sydney (UTS)','Australia','NSW','ATN',133,'Engineering, IT, Business, Design, Communication, Science'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Technology Sydney (UTS)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'RMIT University','Australia','VIC','ATN',166,'Engineering, Business, Design, Architecture, Arts, Science'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='RMIT University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Macquarie University','Australia','NSW','Other',195,'Business, Law, Medicine, Arts & Humanities, Sciences'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Macquarie University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Deakin University','Australia','VIC','Other',290,'Education, Business, Engineering, Health Sciences, Arts'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Deakin University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Bond University','Australia','QLD','Other',NULL,'Business, Law, Health Sciences, IT, Humanities'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Bond University');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Queensland University of Technology (QUT)','Australia','QLD','ATN',327,'Engineering, Business, Law, Creative Industries, Education'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Queensland University of Technology (QUT)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Wollongong (UOW)','Australia','NSW','Other',196,'Engineering, IT, Business, Creative Arts, Education, Law'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Wollongong (UOW)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Science & Technology China (USTC)','China','Hefei','C9',94,'Physics, Chemistry, Mathematics, CS, Engineering, Life Sciences'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Science & Technology China (USTC)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Huazhong Univ. of Sci. & Tech. (HUST 华中科技大学)','China','Wuhan','985',230,'Medicine (MBBS), Engineering, CS, Architecture, Business'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Huazhong Univ. of Sci. & Tech. (HUST 华中科技大学)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Southeast University (东南大学)','China','Nanjing','985',238,'Architecture, Engineering, Electronic Engineering, Medicine, Art'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Southeast University (东南大学)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'University of Electronic Sci. & Tech. China (UESTC)','China','Chengdu','985',201,'Electronic Engineering, CS, AI, Automation, Business'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='University of Electronic Sci. & Tech. China (UESTC)');
INSERT INTO universities (name, country, city, selectivity_band, qs_rank, major_tags)
  SELECT 'Xiamen University (厦门大学)','China','Xiamen','985',331,'Economics, Law, Business, Chemistry, Marine Sciences, Journalism'
  WHERE NOT EXISTS (SELECT 1 FROM universities WHERE name='Xiamen University (厦门大学)');

-- Backfill qs_rank for doc universities already present in the base seed (Oxford, Harvard, etc.).
UPDATE universities SET qs_rank=3 WHERE name='Stanford University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=5 WHERE name='Harvard University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=30 WHERE name='University of California, Berkeley' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=36 WHERE name='University of California, San Diego' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=73 WHERE name='University of Washington' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=4 WHERE name='University of Oxford' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=6 WHERE name='University of Cambridge' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=2 WHERE name='Imperial College London' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=50 WHERE name='London School of Economics' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=34 WHERE name='University of Manchester' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=94 WHERE name='University of St Andrews' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=153 WHERE name='University of Exeter' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=143 WHERE name='Queen Mary University of London' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=19 WHERE name='University of Melbourne' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=20 WHERE name='University of New South Wales' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=18 WHERE name='University of Sydney' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=30 WHERE name='Australian National University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=40 WHERE name='University of Queensland' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=25 WHERE name='Tsinghua University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=27 WHERE name='Peking University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=39 WHERE name='Fudan University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=45 WHERE name='Shanghai Jiao Tong University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=47 WHERE name='Zhejiang University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=145 WHERE name='Nanjing University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=252 WHERE name='Harbin Institute of Technology' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=295 WHERE name='Xi''an Jiaotong University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=194 WHERE name='Wuhan University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=196 WHERE name='Sun Yat-sen University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=202 WHERE name='Tongji University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=234 WHERE name='Beijing Normal University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=471 WHERE name='Renmin University of China' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=453 WHERE name='Beihang University' AND qs_rank IS NULL;
UPDATE universities SET qs_rank=335 WHERE name='Beijing Institute of Technology' AND qs_rank IS NULL;

-- Normalize selectivity_band to the recommender's vocabulary (Very High/High/Medium),
-- derived from QS rank, so categorizeUniversities buckets Reach/Target/Safety correctly.
-- (These rows were inserted above with descriptive tiers like 'Ivy+'/'Russell'/'985'.)
UPDATE universities SET selectivity_band='Very High'
  WHERE selectivity_band NOT IN ('Very High','High','Medium') AND qs_rank<=35;
UPDATE universities SET selectivity_band='High'
  WHERE selectivity_band NOT IN ('Very High','High','Medium') AND qs_rank BETWEEN 36 AND 110;
UPDATE universities SET selectivity_band='Medium'
  WHERE selectivity_band NOT IN ('Very High','High','Medium') AND (qs_rank>110 OR qs_rank IS NULL);

-- Attribution + visibility. The doc's 75 (QS 2026) are the sourced, shown set;
-- legacy unsourced rows are hidden=1 (kept in DB, still visible to admin and to any
-- student who already saved one). Run the two ALTERs once (MySQL has no IF NOT EXISTS).
ALTER TABLE universities ADD COLUMN source VARCHAR(40) NULL AFTER major_tags;
ALTER TABLE universities ADD COLUMN hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER source;
UPDATE universities SET source='QS 2026', hidden=0 WHERE qs_rank IS NOT NULL OR name='Bond University';
UPDATE universities SET source='legacy', hidden=1 WHERE qs_rank IS NULL AND name<>'Bond University';

-- Align selectivity_band to QS rank across the whole sourced set (new + already-present),
-- so the authoritative ranking — not inconsistent legacy bands — drives Reach/Target/Safety.
UPDATE universities SET selectivity_band='Very High' WHERE source='QS 2026' AND qs_rank<=35;
UPDATE universities SET selectivity_band='High'      WHERE source='QS 2026' AND qs_rank BETWEEN 36 AND 110;
UPDATE universities SET selectivity_band='Medium'    WHERE source='QS 2026' AND qs_rank>110;
