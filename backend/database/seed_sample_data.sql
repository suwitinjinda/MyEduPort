USE myeduport;

-- Get user_id and student_id for admin@gmail.com
SET @user_id = (SELECT id FROM users WHERE email = 'admin@gmail.com' LIMIT 1);
SET @student_id = (SELECT id FROM students WHERE user_id = @user_id LIMIT 1);

-- Update student profile
UPDATE students 
SET grade_level = 'Grade 11',
    school = 'International School Bangkok',
    target_countries = 'US,UK',
    intended_major = 'Computer Science',
    bio = 'Passionate about technology and software development. Active in robotics and coding competitions.'
WHERE user_id = @user_id;

-- Insert academic records
INSERT INTO academic_records (student_id, year, course, level, grade, school_system) VALUES
(@student_id, '2023-2024', 'Mathematics', 'AP', 'A', 'AP'),
(@student_id, '2023-2024', 'Computer Science', 'AP', 'A', 'AP'),
(@student_id, '2023-2024', 'Physics', 'AP', 'B+', 'AP'),
(@student_id, '2022-2023', 'Mathematics', 'IB HL', '7', 'IB'),
(@student_id, '2022-2023', 'English Literature', 'IB HL', '6', 'IB'),
(@student_id, '2021-2022', 'Mathematics', 'Standard', 'A', 'Standard');

-- Insert test scores
INSERT INTO test_scores (student_id, test_type, test_date, score, superscore) VALUES
(@student_id, 'SAT', '2024-03-15', '1450', '1480'),
(@student_id, 'SAT Math', '2024-03-15', '780', '800'),
(@student_id, 'IELTS', '2024-02-10', '7.5', ''),
(@student_id, 'TOEFL', '2023-11-20', '110', '');

-- Insert activities
INSERT INTO activities (student_id, title, description, role, hours_per_week, leadership, start_date, end_date) VALUES
(@student_id, 'Robotics Club', 'Led team to regional championship. Designed and programmed autonomous robots for competition.', 'Team Captain', 8, TRUE, '2022-09-01', NULL),
(@student_id, 'Coding Bootcamp Volunteer', 'Taught Python programming to middle school students every Saturday.', 'Instructor', 4, TRUE, '2023-01-15', NULL),
(@student_id, 'Math Olympiad', 'Competed in regional and national math competitions. Placed 3rd in regional round.', 'Participant', 5, FALSE, '2022-10-01', '2024-05-31'),
(@student_id, 'School Newspaper', 'Wrote technology column and managed online publication platform.', 'Tech Editor', 3, TRUE, '2023-09-01', NULL),
(@student_id, 'Community Service', 'Organized coding workshops for underprivileged youth in local community center.', 'Organizer', 6, TRUE, '2023-06-01', NULL);

-- Insert awards
INSERT INTO awards (student_id, title, description, award_date) VALUES
(@student_id, 'Regional Robotics Championship', 'First place in autonomous robot design category', '2024-04-20'),
(@student_id, 'Outstanding Student in Computer Science', 'Awarded by school for excellence in CS coursework', '2024-05-15'),
(@student_id, 'Math Olympiad Regional Bronze', 'Third place in regional mathematics competition', '2024-03-10'),
(@student_id, 'Best Tech Article', 'Awarded by school newspaper for best technology column', '2024-01-20');
