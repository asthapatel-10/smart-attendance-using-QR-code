import XLSX from 'xlsx';
import { query, queryOne } from '../config/db.js';

export async function getDashboardMetrics(req, res) {
  try {
    const userRole = req.user.role;
    let metrics = {};

    if (userRole === 'admin') {
      const totalStudents = await queryOne('SELECT COUNT(*) as count FROM users WHERE role = "student"');
      const totalFaculty = await queryOne('SELECT COUNT(*) as count FROM users WHERE role = "faculty"');
      const totalSubjects = await queryOne('SELECT COUNT(*) as count FROM subjects');
      const totalAttendance = await queryOne('SELECT COUNT(*) as count FROM attendance');

      metrics = {
        totalStudents: totalStudents ? totalStudents.count : 0,
        totalFaculty: totalFaculty ? totalFaculty.count : 0,
        totalSubjects: totalSubjects ? totalSubjects.count : 0,
        totalAttendance: totalAttendance ? totalAttendance.count : 0
      };
    } else if (userRole === 'faculty') {
      const mySubjects = await query('SELECT COUNT(*) as count FROM subjects WHERE faculty_id = ?', [req.user.id]);
      const mySessions = await query('SELECT COUNT(*) as count FROM qr_codes WHERE faculty_id = ?', [req.user.id]);

      metrics = {
        totalSubjects: mySubjects ? mySubjects[0].count : 0,
        totalQRSessions: mySessions ? mySessions[0].count : 0
      };
    } else if (userRole === 'mentor') {
      const mentees = await query('SELECT u.id, u.name, s.roll_number FROM users u JOIN students s ON u.id = s.user_id WHERE s.mentor_id = ?', [req.user.id]);
      metrics = {
        totalMentees: mentees.length,
        mentees
      };
    } else if (userRole === 'hod') {
      const deptStudents = await queryOne('SELECT COUNT(*) as count FROM students WHERE department = "Computer Science"');
      const deptFaculty = await queryOne('SELECT COUNT(*) as count FROM faculty WHERE department = "Computer Science"');

      metrics = {
        department: 'Computer Science',
        totalStudents: deptStudents ? deptStudents.count : 0,
        totalFaculty: deptFaculty ? deptFaculty.count : 0
      };
    }

    res.json({ success: true, metrics });
  } catch (err) {
    console.error('getDashboardMetrics error:', err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard metrics.' });
  }
}

export async function exportExcelReport(req, res) {
  try {
    const { report_type = 'monthly', subject_id, department } = req.query;

    let sql = `
      SELECT a.date, a.status, a.marked_by,
             u.name as student_name, s.roll_number, s.department, s.section,
             sub.code as subject_code, sub.name as subject_name
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      JOIN students s ON u.id = s.user_id
      JOIN subjects sub ON a.subject_id = sub.id
      WHERE 1=1
    `;
    const params = [];

    if (subject_id) {
      sql += ` AND a.subject_id = ?`;
      params.push(subject_id);
    }
    if (department) {
      sql += ` AND s.department = ?`;
      params.push(department);
    }

    sql += ` ORDER BY a.date DESC`;

    const records = await query(sql, params);

    const sheetData = records.map(r => ({
      'Date': r.date,
      'Roll Number': r.roll_number,
      'Student Name': r.student_name,
      'Department': r.department,
      'Subject Code': r.subject_code,
      'Subject Name': r.subject_name,
      'Status': r.status,
      'Marked Via': r.marked_by
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${Date.now()}.xlsx`);
    res.send(buf);
  } catch (err) {
    console.error('exportExcelReport error:', err);
    res.status(500).json({ success: false, message: 'Failed to export Excel report.' });
  }
}

export async function getNotifications(req, res) {
  try {
    const notifications = await query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [req.user.id]
    );
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
}
