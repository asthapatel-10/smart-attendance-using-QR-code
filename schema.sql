-- MySQL Schema for Smart Attendance System

CREATE DATABASE IF NOT EXISTS smart_attendance_db;
USE smart_attendance_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  username VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'faculty', 'student') NOT NULL,
  phone VARCHAR(20),
  avatar_url VARCHAR(255),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  roll_number VARCHAR(50) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  semester INT NOT NULL DEFAULT 1,
  section VARCHAR(10) DEFAULT 'A',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Faculty Table
CREATE TABLE IF NOT EXISTS faculty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  designation VARCHAR(100) DEFAULT 'Professor',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. QR Codes Session Table
CREATE TABLE IF NOT EXISTS qr_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  faculty_id INT NOT NULL,
  valid_until DATETIME NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  student_name VARCHAR(100),
  roll_number VARCHAR(50),
  date DATE NOT NULL,
  time VARCHAR(20),
  status ENUM('PRESENT', 'ABSENT') DEFAULT 'PRESENT',
  qr_status VARCHAR(50) DEFAULT 'QR Scanned',
  marked_by VARCHAR(50) DEFAULT 'QR_SCAN',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_date (student_id, date),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('INFO', 'ALERT', 'WARNING') DEFAULT 'INFO',
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
