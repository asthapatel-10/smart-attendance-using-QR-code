import { query, queryOne } from '../config/db.js';

export async function getAttendanceList(req, res) {
  try {
    const { subject_id, date, student_id, department } = req.query;
    let sql = `
      SELECT a.id, a.student_id, a.subject_id, a.status, a.date, a.timestamp, a.marked_by,
             u.name as student_name, s.roll_number, s.department, s.section,
             sub.name as subject_name, sub.code as subject_code
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      JOIN students s ON u.id = s.user_id
      JOIN subjects sub ON a.subject_id = sub.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'student') {
      sql += ` AND a.student_id = ?`;
      params.push(req.user.id);
    } else if (req.user.role === 'parent') {
      const parent = await queryOne('SELECT student_user_id FROM parents WHERE user_id = ?', [req.user.id]);
      sql += ` AND a.student_id = ?`;
      params.push(parent ? parent.student_user_id : 0);
    }

    if (student_id) {
      sql += ` AND a.student_id = ?`;
      params.push(student_id);
    }

    if (subject_id) {
      sql += ` AND a.subject_id = ?`;
      params.push(subject_id);
    }

    if (date) {
      sql += ` AND a.date = ?`;
      params.push(date);
    }

    if (department) {
      sql += ` AND s.department = ?`;
      params.push(department);
    }

    sql += ` ORDER BY a.date DESC, a.timestamp DESC`;

    const records = await query(sql, params);
    res.json({ success: true, attendance: records });
  } catch (err) {
    console.error('getAttendanceList error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance records.' });
  }
}

export async function markManualAttendance(req, res) {
  try {
    const { student_id, subject_id, status, date } = req.body;

    if (!student_id || !subject_id || !status || !date) {
      return res.status(400).json({ success: false, message: 'Student, Subject, Status, and Date are required.' });
    }

    const existing = await queryOne(
      'SELECT id FROM attendance WHERE student_id = ? AND subject_id = ? AND date = ?',
      [student_id, subject_id, date]
    );

    if (existing) {
      await query('UPDATE attendance SET status = ?, marked_by = "FACULTY_MANUAL" WHERE id = ?', [status, existing.id]);
    } else {
      await query(
        'INSERT INTO attendance (student_id, subject_id, status, date, marked_by) VALUES (?, ?, ?, ?, "FACULTY_MANUAL")',
        [student_id, subject_id, status, date]
      );
    }

    res.json({ success: true, message: 'Attendance status updated successfully.' });
  } catch (err) {
    console.error('markManualAttendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to update attendance.' });
  }
}

export async function deleteAttendance(req, res) {
  try {
    const { id } = req.params;
    await query('DELETE FROM attendance WHERE id = ?', [id]);
    res.json({ success: true, message: 'Attendance record deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete attendance.' });
  }
}

export async function getStudentAttendanceSummary(req, res) {
  try {
    let studentUserId = req.user.id;
    if (req.user.role === 'parent') {
      const parent = await queryOne('SELECT student_user_id FROM parents WHERE user_id = ?', [req.user.id]);
      studentUserId = parent ? parent.student_user_id : 0;
    } else if (req.query.student_id) {
      studentUserId = req.query.student_id;
    }

    const subjects = await query('SELECT id, code, name, total_lectures FROM subjects');
    const summary = [];

    for (let sub of subjects) {
      const attendedRow = await queryOne(
        'SELECT COUNT(*) as count FROM attendance WHERE student_id = ? AND subject_id = ? AND status = "PRESENT"',
        [studentUserId, sub.id]
      );
      const absentRow = await queryOne(
        'SELECT COUNT(*) as count FROM attendance WHERE student_id = ? AND subject_id = ? AND status = "ABSENT"',
        [studentUserId, sub.id]
      );

      const attended = attendedRow ? attendedRow.count : 0;
      const absent = absentRow ? absentRow.count : 0;
      const totalConducted = attended + absent;
      const percentage = totalConducted > 0 ? ((attended / totalConducted) * 100).toFixed(1) : 100.0;

      summary.push({
        subject_id: sub.id,
        code: sub.code,
        name: sub.name,
        total_conducted: totalConducted,
        attended,
        absent,
        percentage: parseFloat(percentage)
      });
    }

    // Overall aggregate percentage
    const totalAttendedAll = summary.reduce((acc, curr) => acc + curr.attended, 0);
    const totalConductedAll = summary.reduce((acc, curr) => acc + curr.total_conducted, 0);
    const overallPercentage = totalConductedAll > 0 ? ((totalAttendedAll / totalConductedAll) * 100).toFixed(1) : 100.0;

    res.json({
      success: true,
      overallPercentage: parseFloat(overallPercentage),
      totalAttended: totalAttendedAll,
      totalConducted: totalConductedAll,
      subjectBreakdown: summary
    });
  } catch (err) {
    console.error('getStudentAttendanceSummary error:', err);
    res.status(500).json({ success: false, message: 'Failed to calculate attendance summary.' });
  }
}
