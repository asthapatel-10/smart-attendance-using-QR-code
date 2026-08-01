import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db.js';

export async function getStudents(req, res) {
  try {
    const { search, department, semester } = req.query;
    let sql = `
      SELECT u.id as user_id, u.name, u.email, u.phone, u.status, u.avatar_url,
             s.id as student_id, s.roll_number, s.department, s.semester, s.section,
             m.name as mentor_name, p.name as parent_name
      FROM users u
      JOIN students s ON u.id = s.user_id
      LEFT JOIN users m ON s.mentor_id = m.id
      LEFT JOIN users p ON s.parent_id = p.id
      WHERE u.role = 'student'
    `;
    const params = [];

    if (search) {
      sql += ` AND (u.name LIKE ? OR s.roll_number LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (department) {
      sql += ` AND s.department = ?`;
      params.push(department);
    }

    if (semester) {
      sql += ` AND s.semester = ?`;
      params.push(semester);
    }

    sql += ` ORDER BY s.roll_number ASC`;

    const students = await query(sql, params);
    res.json({ success: true, students });
  } catch (err) {
    console.error('getStudents error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch students list.' });
  }
}

export async function addStudent(req, res) {
  try {
    const { name, email, password, phone, roll_number, department, semester, section, mentor_id, parent_id } = req.body;

    if (!name || !email || !roll_number || !department) {
      return res.status(400).json({ success: false, message: 'Name, Email, Roll Number and Department are required.' });
    }

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email address already registered.' });
    }

    const passwordHash = await bcrypt.hash(password || 'password123', 10);

    const userRes = await query(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, 'student', phone || null]
    );

    const userId = userRes.insertId;

    await query(
      'INSERT INTO students (user_id, roll_number, department, semester, section, mentor_id, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, roll_number, department, semester || 1, section || 'A', mentor_id || null, parent_id || null]
    );

    res.status(201).json({ success: true, message: 'Student created successfully.', userId });
  } catch (err) {
    console.error('addStudent error:', err);
    res.status(500).json({ success: false, message: 'Failed to add student.' });
  }
}

export async function updateStudent(req, res) {
  try {
    const { userId } = req.params;
    const { name, email, phone, roll_number, department, semester, section, status } = req.body;

    const student = await queryOne('SELECT id FROM students WHERE user_id = ?', [userId]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    await query(
      'UPDATE users SET name = ?, email = ?, phone = ?, status = ? WHERE id = ?',
      [name, email, phone || null, status || 'active', userId]
    );

    await query(
      'UPDATE students SET roll_number = ?, department = ?, semester = ?, section = ? WHERE user_id = ?',
      [roll_number, department, semester, section, userId]
    );

    res.json({ success: true, message: 'Student updated successfully.' });
  } catch (err) {
    console.error('updateStudent error:', err);
    res.status(500).json({ success: false, message: 'Failed to update student.' });
  }
}

export async function deleteStudent(req, res) {
  try {
    const { userId } = req.params;

    await query('DELETE FROM users WHERE id = ? AND role = "student"', [userId]);
    res.json({ success: true, message: 'Student record deleted successfully.' });
  } catch (err) {
    console.error('deleteStudent error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete student.' });
  }
}
