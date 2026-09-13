-- MyEduPort — Universities expansion (May 2026)
-- Adds a comprehensive top-tier dataset across US, UK, China, plus key picks
-- from Canada, Australia, Hong Kong, Singapore, Japan, Germany.
--
-- Idempotent: uses INSERT...SELECT with NOT EXISTS so it can be re-run safely.

USE myeduport;

-- US — Ivies + top private + flagship publics + selective LACs
INSERT INTO universities (name, country, city, selectivity_band, major_tags)
SELECT * FROM (
  SELECT 'Dartmouth College' AS n, 'US' AS c, 'Hanover, NH' AS ct, 'Very High' AS s, 'Humanities,Engineering,Economics,Sciences' AS t UNION ALL
  SELECT 'Tufts University', 'US', 'Medford, MA', 'Very High', 'International Relations,Engineering,Medicine,Humanities' UNION ALL
  SELECT 'Emory University', 'US', 'Atlanta, GA', 'Very High', 'Medicine,Business,Public Health,Humanities' UNION ALL
  SELECT 'University of Notre Dame', 'US', 'Notre Dame, IN', 'Very High', 'Business,Engineering,Law,Humanities' UNION ALL
  SELECT 'University of Virginia', 'US', 'Charlottesville, VA', 'High', 'Business,Law,Engineering,Humanities' UNION ALL
  SELECT 'Georgia Institute of Technology', 'US', 'Atlanta, GA', 'High', 'Engineering,Computer Science,Business,Sciences' UNION ALL
  SELECT 'University of North Carolina at Chapel Hill', 'US', 'Chapel Hill, NC', 'High', 'Business,Medicine,Journalism,Humanities' UNION ALL
  SELECT 'University of Washington', 'US', 'Seattle, WA', 'High', 'Computer Science,Medicine,Engineering,Business' UNION ALL
  SELECT 'University of Wisconsin-Madison', 'US', 'Madison, WI', 'High', 'Engineering,Business,Sciences,Humanities' UNION ALL
  SELECT 'University of Illinois at Urbana-Champaign', 'US', 'Urbana, IL', 'High', 'Engineering,Computer Science,Business,Agriculture' UNION ALL
  SELECT 'Purdue University', 'US', 'West Lafayette, IN', 'High', 'Engineering,Computer Science,Agriculture,Business' UNION ALL
  SELECT 'Boston College', 'US', 'Chestnut Hill, MA', 'High', 'Business,Law,Humanities,Education' UNION ALL
  SELECT 'Boston University', 'US', 'Boston, MA', 'High', 'Business,Medicine,Engineering,Communications' UNION ALL
  SELECT 'Williams College', 'US', 'Williamstown, MA', 'Very High', 'Humanities,Sciences,Arts,Economics' UNION ALL
  SELECT 'Amherst College', 'US', 'Amherst, MA', 'Very High', 'Humanities,Sciences,Arts,Economics' UNION ALL
  SELECT 'Swarthmore College', 'US', 'Swarthmore, PA', 'Very High', 'Humanities,Engineering,Sciences,Economics' UNION ALL
  SELECT 'Pomona College', 'US', 'Claremont, CA', 'Very High', 'Humanities,Sciences,Arts,Economics' UNION ALL
  SELECT 'Wellesley College', 'US', 'Wellesley, MA', 'Very High', 'Humanities,Sciences,Economics,Arts' UNION ALL
  SELECT 'Bowdoin College', 'US', 'Brunswick, ME', 'Very High', 'Humanities,Sciences,Arts,Government' UNION ALL
  SELECT 'Middlebury College', 'US', 'Middlebury, VT', 'Very High', 'Humanities,Languages,Sciences,Environmental' UNION ALL
  SELECT 'Carleton College', 'US', 'Northfield, MN', 'Very High', 'Humanities,Sciences,Arts,Mathematics' UNION ALL
  SELECT 'Harvey Mudd College', 'US', 'Claremont, CA', 'Very High', 'Engineering,Computer Science,Sciences,Mathematics' UNION ALL
  SELECT 'University of California, San Diego', 'US', 'La Jolla, CA', 'High', 'Engineering,Medicine,Computer Science,Sciences' UNION ALL
  SELECT 'University of California, Davis', 'US', 'Davis, CA', 'High', 'Agriculture,Veterinary,Engineering,Biology' UNION ALL
  SELECT 'University of California, Irvine', 'US', 'Irvine, CA', 'High', 'Engineering,Computer Science,Business,Medicine' UNION ALL
  SELECT 'University of California, Santa Barbara', 'US', 'Santa Barbara, CA', 'High', 'Engineering,Sciences,Humanities,Arts' UNION ALL
  SELECT 'University of Florida', 'US', 'Gainesville, FL', 'High', 'Engineering,Business,Medicine,Agriculture' UNION ALL
  SELECT 'University of Maryland, College Park', 'US', 'College Park, MD', 'High', 'Engineering,Computer Science,Business,Public Policy' UNION ALL
  SELECT 'Penn State University', 'US', 'University Park, PA', 'High', 'Engineering,Business,Agriculture,Sciences' UNION ALL
  SELECT 'Ohio State University', 'US', 'Columbus, OH', 'High', 'Engineering,Business,Medicine,Agriculture' UNION ALL
  SELECT 'Rutgers University', 'US', 'New Brunswick, NJ', 'Medium', 'Business,Engineering,Pharmacy,Sciences' UNION ALL
  SELECT 'Arizona State University', 'US', 'Tempe, AZ', 'Medium', 'Engineering,Business,Sciences,Sustainability' UNION ALL
  SELECT 'Indiana University Bloomington', 'US', 'Bloomington, IN', 'Medium', 'Business,Music,Education,Public Health' UNION ALL
  SELECT 'Michigan State University', 'US', 'East Lansing, MI', 'Medium', 'Agriculture,Veterinary,Business,Education' UNION ALL
  SELECT 'University of Iowa', 'US', 'Iowa City, IA', 'Medium', 'Medicine,Writing,Business,Engineering'
) AS new_unis
WHERE NOT EXISTS (
  SELECT 1 FROM universities u WHERE u.name = new_unis.n AND u.country = new_unis.c
);

-- UK — Russell Group + selective non-RG
INSERT INTO universities (name, country, city, selectivity_band, major_tags)
SELECT * FROM (
  SELECT 'University of St Andrews' AS n, 'UK' AS c, 'St Andrews' AS ct, 'Very High' AS s, 'Humanities,International Relations,Sciences,Theology' AS t UNION ALL
  SELECT 'Queen Mary University of London', 'UK', 'London', 'High', 'Medicine,Law,Humanities,Engineering' UNION ALL
  SELECT 'University of Exeter', 'UK', 'Exeter', 'High', 'Business,Law,Engineering,Humanities' UNION ALL
  SELECT 'University of Bath', 'UK', 'Bath', 'High', 'Engineering,Business,Architecture,Sciences' UNION ALL
  SELECT 'University of Liverpool', 'UK', 'Liverpool', 'High', 'Medicine,Engineering,Architecture,Veterinary' UNION ALL
  SELECT 'Newcastle University', 'UK', 'Newcastle', 'High', 'Medicine,Engineering,Agriculture,Marine' UNION ALL
  SELECT 'Cardiff University', 'UK', 'Cardiff', 'High', 'Medicine,Journalism,Architecture,Engineering' UNION ALL
  SELECT 'Lancaster University', 'UK', 'Lancaster', 'High', 'Business,Linguistics,Sciences,Humanities' UNION ALL
  SELECT 'Loughborough University', 'UK', 'Loughborough', 'High', 'Sports Science,Engineering,Design,Business' UNION ALL
  SELECT 'University of East Anglia', 'UK', 'Norwich', 'Medium', 'Creative Writing,Environmental,Medicine,Humanities' UNION ALL
  SELECT 'University of Strathclyde', 'UK', 'Glasgow', 'High', 'Engineering,Business,Pharmacy,Sciences' UNION ALL
  SELECT 'University of Leicester', 'UK', 'Leicester', 'Medium', 'Medicine,Engineering,Genetics,Law' UNION ALL
  SELECT 'University of Sussex', 'UK', 'Brighton', 'Medium', 'International Development,Sciences,Humanities,Media' UNION ALL
  SELECT 'University of Reading', 'UK', 'Reading', 'Medium', 'Agriculture,Meteorology,Business,Real Estate' UNION ALL
  SELECT 'Queen''s University Belfast', 'UK', 'Belfast', 'Medium', 'Medicine,Law,Engineering,Humanities'
) AS new_unis
WHERE NOT EXISTS (
  SELECT 1 FROM universities u WHERE u.name = new_unis.n AND u.country = new_unis.c
);

-- China — 985 universities (top tier) + selective 211
INSERT INTO universities (name, country, city, selectivity_band, major_tags)
SELECT * FROM (
  SELECT 'Renmin University of China' AS n, 'China' AS c, 'Beijing' AS ct, 'Very High' AS s, 'Economics,Law,Humanities,Journalism' AS t UNION ALL
  SELECT 'Beijing Normal University', 'China', 'Beijing', 'Very High', 'Education,Psychology,Humanities,Sciences' UNION ALL
  SELECT 'Sun Yat-sen University', 'China', 'Guangzhou', 'Very High', 'Medicine,Sciences,Business,Engineering' UNION ALL
  SELECT 'Wuhan University', 'China', 'Wuhan', 'Very High', 'Humanities,Engineering,Medicine,Law' UNION ALL
  SELECT 'Sichuan University', 'China', 'Chengdu', 'High', 'Medicine,Engineering,Humanities,Sciences' UNION ALL
  SELECT 'Tianjin University', 'China', 'Tianjin', 'High', 'Engineering,Architecture,Chemistry,Management' UNION ALL
  SELECT 'Harbin Institute of Technology', 'China', 'Harbin', 'High', 'Engineering,Aerospace,Computer Science,Materials' UNION ALL
  SELECT 'Beihang University', 'China', 'Beijing', 'High', 'Aerospace,Engineering,Computer Science,Mathematics' UNION ALL
  SELECT 'Beijing Institute of Technology', 'China', 'Beijing', 'High', 'Engineering,Defense Technology,Computer Science,Optics' UNION ALL
  SELECT 'East China Normal University', 'China', 'Shanghai', 'High', 'Education,Geography,Humanities,Sciences' UNION ALL
  SELECT 'Tongji University', 'China', 'Shanghai', 'High', 'Architecture,Civil Engineering,Urban Planning,Medicine' UNION ALL
  SELECT 'Shanghai Jiao Tong University', 'China', 'Shanghai', 'Very High', 'Engineering,Medicine,Business,Computer Science' UNION ALL
  SELECT 'Nanjing University', 'China', 'Nanjing', 'Very High', 'Astronomy,Physics,Humanities,Sciences' UNION ALL
  SELECT 'Xi''an Jiaotong University', 'China', 'Xi''an', 'High', 'Engineering,Medicine,Management,Sciences' UNION ALL
  SELECT 'Central University of Finance and Economics', 'China', 'Beijing', 'High', 'Finance,Accounting,Economics,Business'
) AS new_unis
WHERE NOT EXISTS (
  SELECT 1 FROM universities u WHERE u.name = new_unis.n AND u.country = new_unis.c
);

-- Bonus: top picks from Canada, Australia, HK, Singapore, Japan, Germany
INSERT INTO universities (name, country, city, selectivity_band, major_tags)
SELECT * FROM (
  -- Canada
  SELECT 'University of Toronto' AS n, 'Canada' AS c, 'Toronto, ON' AS ct, 'Very High' AS s, 'Medicine,Engineering,Business,Computer Science' AS t UNION ALL
  SELECT 'McGill University', 'Canada', 'Montreal, QC', 'Very High', 'Medicine,Engineering,Law,Humanities' UNION ALL
  SELECT 'University of British Columbia', 'Canada', 'Vancouver, BC', 'Very High', 'Forestry,Medicine,Engineering,Business' UNION ALL
  SELECT 'University of Waterloo', 'Canada', 'Waterloo, ON', 'High', 'Computer Science,Engineering,Mathematics,Business' UNION ALL
  SELECT 'McMaster University', 'Canada', 'Hamilton, ON', 'High', 'Medicine,Engineering,Business,Health Sciences' UNION ALL
  -- Australia
  SELECT 'University of Melbourne', 'Australia', 'Melbourne, VIC', 'Very High', 'Medicine,Law,Business,Engineering' UNION ALL
  SELECT 'Australian National University', 'Australia', 'Canberra, ACT', 'Very High', 'International Relations,Sciences,Law,Humanities' UNION ALL
  SELECT 'University of Sydney', 'Australia', 'Sydney, NSW', 'Very High', 'Medicine,Law,Business,Engineering' UNION ALL
  SELECT 'University of New South Wales', 'Australia', 'Sydney, NSW', 'Very High', 'Engineering,Business,Computer Science,Medicine' UNION ALL
  SELECT 'University of Queensland', 'Australia', 'Brisbane, QLD', 'High', 'Medicine,Engineering,Mining,Sciences' UNION ALL
  -- Hong Kong
  SELECT 'University of Hong Kong', 'Hong Kong', 'Hong Kong', 'Very High', 'Medicine,Law,Business,Engineering' UNION ALL
  SELECT 'Hong Kong University of Science and Technology', 'Hong Kong', 'Hong Kong', 'Very High', 'Engineering,Business,Computer Science,Sciences' UNION ALL
  SELECT 'Chinese University of Hong Kong', 'Hong Kong', 'Hong Kong', 'Very High', 'Medicine,Business,Engineering,Humanities' UNION ALL
  -- Singapore
  SELECT 'National University of Singapore', 'Singapore', 'Singapore', 'Very High', 'Engineering,Business,Medicine,Computer Science' UNION ALL
  SELECT 'Nanyang Technological University', 'Singapore', 'Singapore', 'Very High', 'Engineering,Business,Computer Science,Communications' UNION ALL
  SELECT 'Singapore Management University', 'Singapore', 'Singapore', 'High', 'Business,Accountancy,Economics,Law' UNION ALL
  -- Japan
  SELECT 'University of Tokyo', 'Japan', 'Tokyo', 'Very High', 'Engineering,Sciences,Medicine,Humanities' UNION ALL
  SELECT 'Kyoto University', 'Japan', 'Kyoto', 'Very High', 'Sciences,Engineering,Medicine,Humanities' UNION ALL
  SELECT 'Tokyo Institute of Technology', 'Japan', 'Tokyo', 'Very High', 'Engineering,Sciences,Computer Science,Materials' UNION ALL
  -- Germany
  SELECT 'Technical University of Munich', 'Germany', 'Munich', 'Very High', 'Engineering,Computer Science,Sciences,Medicine' UNION ALL
  SELECT 'Heidelberg University', 'Germany', 'Heidelberg', 'Very High', 'Medicine,Sciences,Humanities,Law' UNION ALL
  SELECT 'Ludwig Maximilian University of Munich', 'Germany', 'Munich', 'Very High', 'Sciences,Humanities,Medicine,Economics'
) AS new_unis
WHERE NOT EXISTS (
  SELECT 1 FROM universities u WHERE u.name = new_unis.n AND u.country = new_unis.c
);
