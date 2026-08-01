import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbPool = null;
let dbType = 'mysql'; // 'mysql' or 'sqlite'
let sqliteDb = null;

export async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'smart_attendance_db';

  try {
    // Attempt MySQL connection
    const tempPool = mysql.createPool({
      host,
      user,
      password,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 2000
    });
    
    // Check if database exists or create it
    await tempPool.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await tempPool.end();

    dbPool = mysql.createPool({
      host,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10
    });

    // Test connection
    const [rows] = await dbPool.query('SELECT 1 + 1 AS result');
    dbType = 'mysql';
    console.log(' Connected to MySQL database:', database);
    await setupMySQLTables();
  } catch (err) {
    console.warn(' MySQL not reachable, switching seamlessly to embedded SQLite engine...');
    dbType = 'sqlite';
    await initSQLite();
  }
}

async function setupMySQLTables() {
  try {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));
      
      for (const stmt of statements) {
        await dbPool.query(stmt);
      }
      
      // Check if users exist, if not seed
      const [users] = await dbPool.query('SELECT COUNT(*) as count FROM users');
      if (users[0].count === 0) {
        await seedMySQLData();
      }
    }
  } catch (e) {
    console.error('Error initializing MySQL tables:', e.message);
  }
}

async function seedMySQLData() {
  try {
    const defaultPasswordHash = await bcrypt.hash('password123', 10);
    
    // Seed Users
    await dbPool.query(`
      INSERT INTO users (id, name, email, password_hash, role, phone) VALUES
      (1, 'System Administrator', 'admin@attendance.com', ?, 'admin', '+19876543210'),
      (2, 'Prof. Robert Langdon', 'faculty@attendance.com', ?, 'faculty', '+19876543211'),
      (3, 'Alex Johnson', 'student@attendance.com', ?, 'student', '+19876543212'),
      (4, 'Eleanor Johnson', 'parent@attendance.com', ?, 'parent', '+19876543213'),
      (5, 'Dr. Sarah Connor', 'mentor@attendance.com', ?, 'mentor', '+19876543214'),
      (6, 'Dr. Alan Turing', 'hod@attendance.com', ?, 'hod', '+19876543215'),
      (7, 'Emma Watson', 'emma.student@attendance.com', ?, 'student', '+19876543216'),
      (8, 'David Miller', 'david.student@attendance.com', ?, 'student', '+19876543217')
    `, [defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash]);

    await dbPool.query(`
      INSERT INTO students (id, user_id, roll_number, department, semester, section, mentor_id, parent_id) VALUES
      (1, 3, 'CS2024-001', 'Computer Science', 6, 'A', 5, 4),
      (2, 7, 'CS2024-002', 'Computer Science', 6, 'A', 5, NULL),
      (3, 8, 'CS2024-003', 'Computer Science', 6, 'B', 5, NULL)
    `);

    await dbPool.query(`
      INSERT INTO faculty (id, user_id, employee_code, department, designation) VALUES
      (1, 2, 'EMP-1001', 'Computer Science', 'Senior Professor')
    `);

    await dbPool.query(`
      INSERT INTO parents (id, user_id, student_user_id, relationship, address) VALUES
      (1, 4, 3, 'Mother', '124 Innovation Way, Tech District')
    `);

    await dbPool.query(`
      INSERT INTO mentors (id, user_id, department) VALUES
      (1, 5, 'Computer Science')
    `);

    await dbPool.query(`
      INSERT INTO hods (id, user_id, department) VALUES
      (1, 6, 'Computer Science')
    `);

    await dbPool.query(`
      INSERT INTO subjects (id, code, name, department, semester, faculty_id, total_lectures) VALUES
      (1, 'CS601', 'Data Structures & Algorithms', 'Computer Science', 6, 2, 30),
      (2, 'CS602', 'Database Management Systems', 'Computer Science', 6, 2, 28),
      (3, 'CS603', 'Artificial Intelligence & ML', 'Computer Science', 6, 2, 25),
      (4, 'CS604', 'Computer Networks', 'Computer Science', 6, 2, 26)
    `);

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const dayBefore = new Date(Date.now() - 172800000).toISOString().split('T')[0];

    await dbPool.query(`
      INSERT INTO attendance (student_id, subject_id, status, date, marked_by) VALUES
      (3, 1, 'PRESENT', ?, 'QR_SCAN'),
      (3, 1, 'PRESENT', ?, 'QR_SCAN'),
      (3, 2, 'ABSENT', ?, 'FACULTY_MANUAL'),
      (3, 3, 'PRESENT', ?, 'QR_SCAN'),
      (3, 4, 'ABSENT', ?, 'FACULTY_MANUAL'),
      (7, 1, 'PRESENT', ?, 'QR_SCAN'),
      (8, 1, 'ABSENT', ?, 'FACULTY_MANUAL')
    `, [yesterday, dayBefore, yesterday, yesterday, yesterday, yesterday, yesterday]);

    await dbPool.query(`
      INSERT INTO notifications (user_id, title, message, type) VALUES
      (3, 'Attendance Marked', 'Your attendance for CS601 was marked PRESENT.', 'INFO'),
      (4, 'Low Attendance Alert', 'Notice: Alex Johnson attendance in DBMS is below 75%.', 'WARNING'),
      (5, 'Mentee Alert', 'Student David Miller has attendance under 60%. Please contact parent.', 'ALERT')
    `);

    console.log(' Seed data inserted into MySQL successfully!');
  } catch (e) {
    console.error('Error seeding MySQL:', e.message);
  }
}

async function initSQLite() {
  const dbPath = path.join(__dirname, '../db/attendance.sqlite');
  sqliteDb = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      avatar_url TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      roll_number TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      semester INTEGER NOT NULL DEFAULT 1,
      section TEXT DEFAULT 'A',
      mentor_id INTEGER,
      parent_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      employee_code TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      designation TEXT DEFAULT 'Assistant Professor'
    );

    CREATE TABLE IF NOT EXISTS parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      student_user_id INTEGER NOT NULL,
      relationship TEXT DEFAULT 'Parent',
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS mentors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      department TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      department TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      semester INTEGER NOT NULL,
      faculty_id INTEGER,
      total_lectures INTEGER DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS qr_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      subject_id INTEGER NOT NULL,
      faculty_id INTEGER NOT NULL,
      valid_until DATETIME NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      qr_code_id INTEGER,
      status TEXT DEFAULT 'PRESENT',
      date TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      marked_by TEXT DEFAULT 'QR_SCAN',
      UNIQUE(student_id, subject_id, date)
    );

    CREATE TABLE IF NOT EXISTS chatbot_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      intent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'INFO',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const countRow = await sqliteDb.get('SELECT COUNT(*) as count FROM users');
  if (countRow.count === 0) {
    const defaultPasswordHash = await bcrypt.hash('password123', 10);
    
    await sqliteDb.run(`
      INSERT INTO users (id, name, email, password_hash, role, phone) VALUES
      (1, 'System Administrator', 'admin@attendance.com', ?, 'admin', '+19876543210'),
      (2, 'Prof. Robert Langdon', 'faculty@attendance.com', ?, 'faculty', '+19876543211'),
      (3, 'Alex Johnson', 'student@attendance.com', ?, 'student', '+19876543212'),
      (4, 'Eleanor Johnson', 'parent@attendance.com', ?, 'parent', '+19876543213'),
      (5, 'Dr. Sarah Connor', 'mentor@attendance.com', ?, 'mentor', '+19876543214'),
      (6, 'Dr. Alan Turing', 'hod@attendance.com', ?, 'hod', '+19876543215'),
      (7, 'Emma Watson', 'emma.student@attendance.com', ?, 'student', '+19876543216'),
      (8, 'David Miller', 'david.student@attendance.com', ?, 'student', '+19876543217')
    `, [defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash, defaultPasswordHash]);

    await sqliteDb.run(`
      INSERT INTO students (id, user_id, roll_number, department, semester, section, mentor_id, parent_id) VALUES
      (1, 3, 'CS2024-001', 'Computer Science', 6, 'A', 5, 4),
      (2, 7, 'CS2024-002', 'Computer Science', 6, 'A', 5, NULL),
      (3, 8, 'CS2024-003', 'Computer Science', 6, 'B', 5, NULL)
    `);

    await sqliteDb.run(`
      INSERT INTO faculty (id, user_id, employee_code, department, designation) VALUES
      (1, 2, 'EMP-1001', 'Computer Science', 'Senior Professor')
    `);

    await sqliteDb.run(`
      INSERT INTO parents (id, user_id, student_user_id, relationship, address) VALUES
      (1, 4, 3, 'Mother', '124 Innovation Way, Tech District')
    `);

    await sqliteDb.run(`
      INSERT INTO mentors (id, user_id, department) VALUES
      (1, 5, 'Computer Science')
    `);

    await sqliteDb.run(`
      INSERT INTO hods (id, user_id, department) VALUES
      (1, 6, 'Computer Science')
    `);

    await sqliteDb.run(`
      INSERT INTO subjects (id, code, name, department, semester, faculty_id, total_lectures) VALUES
      (1, 'CS601', 'Data Structures & Algorithms', 'Computer Science', 6, 2, 30),
      (2, 'CS602', 'Database Management Systems', 'Computer Science', 6, 2, 28),
      (3, 'CS603', 'Artificial Intelligence & ML', 'Computer Science', 6, 2, 25),
      (4, 'CS604', 'Computer Networks', 'Computer Science', 6, 2, 26)
    `);

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const dayBefore = new Date(Date.now() - 172800000).toISOString().split('T')[0];

    await sqliteDb.run(`
      INSERT INTO attendance (student_id, subject_id, status, date, marked_by) VALUES
      (3, 1, 'PRESENT', ?, 'QR_SCAN'),
      (3, 1, 'PRESENT', ?, 'QR_SCAN'),
      (3, 2, 'ABSENT', ?, 'FACULTY_MANUAL'),
      (3, 3, 'PRESENT', ?, 'QR_SCAN'),
      (3, 4, 'ABSENT', ?, 'FACULTY_MANUAL'),
      (7, 1, 'PRESENT', ?, 'QR_SCAN'),
      (8, 1, 'ABSENT', ?, 'FACULTY_MANUAL')
    `, [yesterday, dayBefore, yesterday, yesterday, yesterday, yesterday, yesterday]);

    await sqliteDb.run(`
      INSERT INTO notifications (user_id, title, message, type) VALUES
      (3, 'Attendance Marked', 'Your attendance for CS601 was marked PRESENT.', 'INFO'),
      (4, 'Low Attendance Alert', 'Notice: Alex Johnson attendance in DBMS is below 75%.', 'WARNING'),
      (5, 'Mentee Alert', 'Student David Miller has attendance under 60%. Please contact parent.', 'ALERT')
    `);

    console.log(' SQLite embedded database initialized and seeded!');
  }
}

// Unified Database Access Layer
export async function query(sql, params = []) {
  if (dbType === 'mysql') {
    const [rows] = await dbPool.query(sql, params);
    return rows;
  } else {
    // SQLite conversion: replace `?` or handle SELECT vs INSERT/UPDATE
    const trimmed = sql.trim().toLowerCase();
    if (trimmed.startsWith('select') || trimmed.startsWith('pragma') || trimmed.startsWith('show')) {
      return await sqliteDb.all(sql, params);
    } else {
      const result = await sqliteDb.run(sql, params);
      return { insertId: result.lastID, affectedRows: result.changes };
    }
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}
