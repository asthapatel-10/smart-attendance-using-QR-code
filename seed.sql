-- Seed Data for Smart Attendance System (Indian Demo Data)

USE smart_attendance_db;

-- 1. Insert Users (Admin, Faculty, 3 Indian Students)
INSERT INTO users (id, name, email, username, password_hash, role, phone, status) VALUES
(1, 'System Administrator', 'admin@attendance.com', 'admin', '$2a$10$wT8K8U1nL8tWqP1c1O1e1e.0123456789abcdefghijklmnopqrstuv', 'admin', '+91 9876543210', 'active'),
(2, 'Prof. Rajesh Patel', 'rajesh@attendance.com', 'rajesh', '$2a$10$wT8K8U1nL8tWqP1c1O1e1e.0123456789abcdefghijklmnopqrstuv', 'faculty', '+91 9876543211', 'active'),
(3, 'Rahul Sharma', 'rahul@attendance.com', 'rahul', '$2a$10$wT8K8U1nL8tWqP1c1O1e1e.0123456789abcdefghijklmnopqrstuv', 'student', '+91 9876543212', 'active'),
(4, 'Priya Patel', 'priya@attendance.com', 'priya', '$2a$10$wT8K8U1nL8tWqP1c1O1e1e.0123456789abcdefghijklmnopqrstuv', 'student', '+91 9876543213', 'active'),
(5, 'Amit Kumar', 'amit@attendance.com', 'amit', '$2a$10$wT8K8U1nL8tWqP1c1O1e1e.0123456789abcdefghijklmnopqrstuv', 'student', '+91 9876543214', 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Insert Students
INSERT INTO students (id, user_id, roll_number, department, semester, section) VALUES
(1, 3, 'STU101', 'Computer Science', 6, 'A'),
(2, 4, 'STU102', 'Computer Science', 6, 'A'),
(3, 5, 'STU103', 'Computer Science', 6, 'B')
ON DUPLICATE KEY UPDATE roll_number=VALUES(roll_number);

-- 3. Insert Faculty
INSERT INTO faculty (id, user_id, employee_code, department, designation) VALUES
(1, 2, 'FAC101', 'Computer Science', 'Professor')
ON DUPLICATE KEY UPDATE employee_code=VALUES(employee_code);

-- 4. Insert Demo Attendance (3 records)
INSERT INTO attendance (id, student_id, student_name, roll_number, date, time, status, qr_status, marked_by) VALUES
(1, 3, 'Rahul Sharma', 'STU101', '2026-07-28', '09:30 AM', 'PRESENT', 'QR Scanned', 'QR_SCAN'),
(2, 4, 'Priya Patel', 'STU102', '2026-07-28', '09:32 AM', 'PRESENT', 'QR Scanned', 'QR_SCAN'),
(3, 5, 'Amit Kumar', 'STU103', '2026-07-28', '09:35 AM', 'ABSENT', 'Manual', 'FACULTY_MANUAL')
ON DUPLICATE KEY UPDATE status=VALUES(status);
