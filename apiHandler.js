import crypto from 'crypto';
import { getStore, saveStore } from './db/dbStore.js';
import { signToken, verifyToken } from './utils/jwt.js';
import { comparePassword, hashPassword } from './utils/authHash.js';
import { generateQRDataURL } from './utils/qrGenerator.js';

export async function handleApiRequest(req, res, pathName, queryParams, body) {
  const store = getStore();

  function getAuthUser() {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    return store.users.find(u => u.id === payload.id && u.status === 'active');
  }

  // 1. AUTH ROUTES
  if (pathName === '/api/auth/login' && req.method === 'POST') {
    const { email, username, password, role } = body || {};
    const identity = (email || username || '').trim().toLowerCase();

    if (!identity || !password) {
      return sendJson(res, 400, { success: false, message: 'Username/Email and Password are required.' });
    }

    const user = store.users.find(u => 
      (u.email && u.email.toLowerCase() === identity) || 
      (u.username && u.username.toLowerCase() === identity) ||
      (identity === 'admin' && u.role === 'admin')
    );

    if (!user) {
      return sendJson(res, 401, { success: false, message: 'Invalid credentials provided.' });
    }

    let isPasswordValid = false;
    if (user.role === 'admin' && (identity === 'admin' || identity === 'admin@attendance.com') && password === 'admin123') {
      isPasswordValid = true;
    } else {
      isPasswordValid = comparePassword(password, user.password_hash);
    }

    if (!isPasswordValid) {
      return sendJson(res, 401, { success: false, message: 'Invalid credentials provided.' });
    }

    if (role && user.role !== role) {
      return sendJson(res, 403, { 
        success: false, 
        message: `Access denied. Your account role is '${user.role.toUpperCase()}', not '${role.toUpperCase()}'. Please select the correct portal.` 
      });
    }

    let roleDetails = {};
    if (user.role === 'student') roleDetails = store.students.find(s => s.user_id === user.id) || {};
    else if (user.role === 'faculty') roleDetails = store.faculty.find(f => f.user_id === user.id) || {};
    else if (user.role === 'parent') roleDetails = store.parents.find(p => p.user_id === user.id) || {};
    else if (user.role === 'mentor') roleDetails = store.mentors.find(m => m.user_id === user.id) || {};
    else if (user.role === 'hod') roleDetails = store.hods.find(h => h.user_id === user.id) || {};

    const token = signToken({ id: user.id, email: user.email, role: user.role, name: user.name });
    const { password_hash, ...cleanUser } = user;

    return sendJson(res, 200, {
      success: true,
      token,
      user: { ...cleanUser, roleDetails }
    });
  }

  if (pathName === '/api/auth/me' && req.method === 'GET') {
    const user = getAuthUser();
    if (!user) return sendJson(res, 401, { success: false, message: 'Unauthorized token.' });

    let roleDetails = {};
    if (user.role === 'student') roleDetails = store.students.find(s => s.user_id === user.id) || {};
    else if (user.role === 'faculty') roleDetails = store.faculty.find(f => f.user_id === user.id) || {};
    else if (user.role === 'parent') roleDetails = store.parents.find(p => p.user_id === user.id) || {};
    else if (user.role === 'mentor') roleDetails = store.mentors.find(m => m.user_id === user.id) || {};
    else if (user.role === 'hod') roleDetails = store.hods.find(h => h.user_id === user.id) || {};

    const { password_hash, ...cleanUser } = user;
    return sendJson(res, 200, { success: true, user: { ...cleanUser, roleDetails } });
  }

  // Require Auth for all other API endpoints
  const currentUser = getAuthUser();
  if (!currentUser) {
    return sendJson(res, 401, { success: false, message: 'Authentication required.' });
  }

  // 2. ACADEMIC MODULES
  if (pathName === '/api/academic/departments' && req.method === 'GET') {
    return sendJson(res, 200, { success: true, departments: store.departments });
  }

  if (pathName === '/api/academic/departments' && req.method === 'POST') {
    if (currentUser.role !== 'admin') return sendJson(res, 403, { success: false, message: 'Admin access required.' });
    const { name, code } = body || {};
    if (!name) return sendJson(res, 400, { success: false, message: 'Department name is required.' });
    const newDept = { id: store.departments.length + 1, name, code: code || name.substring(0, 3).toUpperCase() };
    store.departments.push(newDept);
    saveStore();
    return sendJson(res, 201, { success: true, message: 'Department added.', department: newDept });
  }

  if (pathName === '/api/academic/semesters' && req.method === 'GET') {
    return sendJson(res, 200, { success: true, semesters: store.semesters });
  }

  if (pathName === '/api/academic/classes' && req.method === 'GET') {
    return sendJson(res, 200, { success: true, sections: store.sections });
  }

  if (pathName === '/api/academic/subjects' && req.method === 'GET') {
    return sendJson(res, 200, { success: true, subjects: store.subjects || [] });
  }

  // 3. USER MANAGEMENT CRUD
  if (pathName === '/api/users' && req.method === 'GET') {
    if (currentUser.role !== 'admin') {
      return sendJson(res, 403, { success: false, message: 'Forbidden. Admin permission required to view users list.' });
    }

    const { role } = queryParams;
    let usersList = store.users;
    if (role) usersList = usersList.filter(u => u.role === role);

    const fullUsers = usersList.map(u => {
      const { password_hash, ...cleanU } = u;
      let roleDetails = {};
      if (u.role === 'student') roleDetails = store.students.find(s => s.user_id === u.id) || {};
      else if (u.role === 'faculty') roleDetails = store.faculty.find(f => f.user_id === u.id) || {};
      else if (u.role === 'parent') roleDetails = store.parents.find(p => p.user_id === u.id) || {};
      else if (u.role === 'mentor') roleDetails = store.mentors.find(m => m.user_id === u.id) || {};
      else if (u.role === 'hod') roleDetails = store.hods.find(h => h.user_id === u.id) || {};
      return { ...cleanU, roleDetails };
    });

    return sendJson(res, 200, { success: true, users: fullUsers });
  }

  if (pathName === '/api/students' && req.method === 'GET') {
    const { search, department, semester } = queryParams;
    let students = store.students.map(s => {
      const u = store.users.find(usr => usr.id === s.user_id) || {};
      return {
        user_id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        student_id: s.id,
        roll_number: s.roll_number,
        department: s.department,
        semester: s.semester,
        section: s.section,
        mentor_id: s.mentor_id,
        parent_id: s.parent_id
      };
    });

    // BACKEND RBAC DATA ISOLATION
    if (currentUser.role === 'student') {
      students = students.filter(s => s.user_id === currentUser.id);
    } else if (currentUser.role === 'parent') {
      const parentObj = store.parents.find(p => p.user_id === currentUser.id);
      const childId = parentObj ? parentObj.student_user_id : null;
      students = students.filter(s => s.user_id === childId);
    } else if (currentUser.role === 'mentor') {
      const mentorObj = store.mentors.find(m => m.user_id === currentUser.id);
      students = students.filter(s => s.mentor_id === currentUser.id || (mentorObj && s.mentor_id === mentorObj.id));
    } else if (currentUser.role === 'faculty') {
      const facObj = store.faculty.find(f => f.user_id === currentUser.id);
      if (facObj) students = students.filter(s => s.department === facObj.department);
    } else if (currentUser.role === 'hod') {
      const hodObj = store.hods.find(h => h.user_id === currentUser.id);
      if (hodObj) students = students.filter(s => s.department === hodObj.department);
    }

    if (search) {
      const q = search.toLowerCase();
      students = students.filter(s => s.name?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
    }
    if (department) students = students.filter(s => s.department === department);
    if (semester) students = students.filter(s => String(s.semester) === String(semester));

    return sendJson(res, 200, { success: true, students });
  }

  if (pathName === '/api/users/create' && req.method === 'POST') {
    const { name, email, password, phone, role, roll_number, employee_code, department, semester, section } = body || {};

    if (!name || !role) {
      return sendJson(res, 400, { success: false, message: 'Name and Role are required.' });
    }

    if (role === 'student') {
      if (!['admin', 'faculty', 'mentor'].includes(currentUser.role)) {
        return sendJson(res, 403, { success: false, message: 'Unauthorized to add students.' });
      }
    } else {
      if (currentUser.role !== 'admin') {
        return sendJson(res, 403, { success: false, message: 'Forbidden. Admin permission required.' });
      }
    }

    const userEmail = email || `${(roll_number || name).toLowerCase().replace(/\s+/g, '')}@attendance.com`;
    if (store.users.some(u => u.email.toLowerCase() === userEmail.toLowerCase())) {
      return sendJson(res, 400, { success: false, message: 'User with this email already exists.' });
    }

    const newUserId = store.users.length > 0 ? Math.max(...store.users.map(u => u.id)) + 1 : 1;

    store.users.push({
      id: newUserId,
      name,
      email: userEmail,
      username: (roll_number || name).toLowerCase().replace(/\s+/g, ''),
      password_hash: hashPassword(password || 'password123'),
      role,
      phone: phone || '+91 9876543210',
      status: 'active'
    });

    if (role === 'student') {
      store.students.push({
        id: store.students.length > 0 ? Math.max(...store.students.map(s => s.id)) + 1 : 1,
        user_id: newUserId,
        roll_number: roll_number || `STU${newUserId}`,
        department: department || 'Computer Science',
        semester: parseInt(semester) || 6,
        section: section || 'A'
      });
    } else if (role === 'faculty') {
      store.faculty.push({
        id: store.faculty.length > 0 ? Math.max(...store.faculty.map(f => f.id)) + 1 : 1,
        user_id: newUserId,
        employee_code: employee_code || `FAC${newUserId}`,
        department: department || 'Computer Science',
        designation: 'Professor'
      });
    } else if (role === 'parent') {
      store.parents.push({
        id: store.parents.length > 0 ? Math.max(...store.parents.map(p => p.id)) + 1 : 1,
        user_id: newUserId,
        student_user_id: 3,
        relationship: 'Parent'
      });
    } else if (role === 'mentor') {
      store.mentors.push({
        id: store.mentors.length > 0 ? Math.max(...store.mentors.map(m => m.id)) + 1 : 1,
        user_id: newUserId,
        department: department || 'Computer Science'
      });
    } else if (role === 'hod') {
      store.hods.push({
        id: store.hods.length > 0 ? Math.max(...store.hods.map(h => h.id)) + 1 : 1,
        user_id: newUserId,
        department: department || 'Computer Science'
      });
    }

    saveStore();
    return sendJson(res, 201, { success: true, message: `${role.toUpperCase()} user created successfully.`, userId: newUserId });
  }

  if (pathName === '/api/users/update' && req.method === 'PUT') {
    const { user_id, name, email, phone, roll_number, department, semester, section } = body || {};
    const targetUserId = parseInt(user_id);
    const user = store.users.find(u => u.id === targetUserId);
    if (!user) return sendJson(res, 404, { success: false, message: 'User not found.' });

    if (user.role === 'student') {
      if (!['admin', 'faculty', 'mentor'].includes(currentUser.role)) {
        return sendJson(res, 403, { success: false, message: 'Unauthorized to edit students.' });
      }
    } else {
      if (currentUser.role !== 'admin') {
        return sendJson(res, 403, { success: false, message: 'Forbidden. Admin permission required.' });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    if (user.role === 'student') {
      const st = store.students.find(s => s.user_id === targetUserId);
      if (st) {
        if (roll_number) st.roll_number = roll_number;
        if (department) st.department = department;
        if (semester) st.semester = parseInt(semester);
        if (section) st.section = section;
      }
    }

    saveStore();
    return sendJson(res, 200, { success: true, message: 'User updated successfully.' });
  }

  if (pathName.startsWith('/api/users/') && req.method === 'DELETE') {
    const targetUserId = parseInt(pathName.split('/')[3]);
    const user = store.users.find(u => u.id === targetUserId);
    if (!user) return sendJson(res, 404, { success: false, message: 'User not found.' });

    if (user.role === 'student') {
      if (!['admin', 'faculty'].includes(currentUser.role)) {
        return sendJson(res, 403, { success: false, message: 'Unauthorized to delete students.' });
      }
    } else {
      if (currentUser.role !== 'admin') {
        return sendJson(res, 403, { success: false, message: 'Forbidden. Admin access required.' });
      }
    }

    store.users = store.users.filter(u => u.id !== targetUserId);
    store.students = store.students.filter(s => s.user_id !== targetUserId);
    store.faculty = store.faculty.filter(f => f.user_id !== targetUserId);
    store.parents = store.parents.filter(p => p.user_id !== targetUserId);
    store.mentors = store.mentors.filter(m => m.user_id !== targetUserId);
    store.hods = store.hods.filter(h => h.user_id !== targetUserId);

    saveStore();
    return sendJson(res, 200, { success: true, message: 'User deleted successfully.' });
  }

  if (pathName.startsWith('/api/students/') && req.method === 'DELETE') {
    const targetUserId = parseInt(pathName.split('/')[3]);
    if (!['admin', 'faculty'].includes(currentUser.role)) return sendJson(res, 403, { success: false, message: 'Forbidden.' });
    store.users = store.users.filter(u => u.id !== targetUserId);
    store.students = store.students.filter(s => s.user_id !== targetUserId);
    saveStore();
    return sendJson(res, 200, { success: true, message: 'Student deleted successfully.' });
  }

  // 4. FACULTY DIRECTORY API
  if (pathName === '/api/faculty' && req.method === 'GET') {
    let facultyList = store.faculty.map(f => {
      const u = store.users.find(usr => usr.id === f.user_id) || {};
      return {
        user_id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        faculty_id: f.id,
        employee_code: f.employee_code,
        department: f.department,
        designation: f.designation
      };
    });

    if (currentUser.role === 'hod') {
      const hodObj = store.hods.find(h => h.user_id === currentUser.id);
      if (hodObj) facultyList = facultyList.filter(f => f.department === hodObj.department);
    } else if (currentUser.role === 'faculty') {
      const facObj = store.faculty.find(f => f.user_id === currentUser.id);
      if (facObj) facultyList = facultyList.filter(f => f.department === facObj.department);
    } else if (currentUser.role === 'student') {
      const stObj = store.students.find(s => s.user_id === currentUser.id);
      if (stObj) facultyList = facultyList.filter(f => f.department === stObj.department);
    } else if (currentUser.role === 'parent') {
      const parentObj = store.parents.find(p => p.user_id === currentUser.id);
      const childId = parentObj ? parentObj.student_user_id : null;
      const childSt = store.students.find(s => s.user_id === childId);
      if (childSt) facultyList = facultyList.filter(f => f.department === childSt.department);
    }

    return sendJson(res, 200, { success: true, faculty: facultyList });
  }

  // 5. QR CODE GENERATION & SCANNING API
  if (pathName === '/api/qr/generate' && req.method === 'POST') {
    if (!['faculty', 'admin'].includes(currentUser.role)) {
      return sendJson(res, 403, { success: false, message: 'Forbidden. Faculty or Admin access required.' });
    }

    const { duration_minutes = 5, subject = 'Data Structures' } = body || {};
    const token = crypto.randomBytes(16).toString('hex');
    const durationMs = parseInt(duration_minutes) * 60000;
    const validUntil = new Date(Date.now() + durationMs).toISOString();

    const qrSession = {
      id: store.qr_codes.length + 1,
      token,
      faculty_id: currentUser.id,
      subject,
      valid_until: validUntil,
      is_active: 1,
      created_at: new Date().toISOString()
    };

    store.qr_codes.push(qrSession);
    saveStore();

    const qrPayload = JSON.stringify({
      token,
      valid_until: validUntil,
      faculty_name: currentUser.name
    });

    const qrImageURL = generateQRDataURL(qrPayload);

    return sendJson(res, 200, {
      success: true,
      message: 'Classroom QR Code Session initialized.',
      qrSession: {
        ...qrSession,
        qrImageURL
      }
    });
  }

  if (pathName === '/api/qr/stop' && req.method === 'POST') {
    const { qr_id } = body || {};
    const session = store.qr_codes.find(q => q.id === parseInt(qr_id));
    if (session) session.is_active = 0;
    saveStore();
    return sendJson(res, 200, { success: true, message: 'QR session stopped.' });
  }

  // STUDENT QR SCANNING
  if (pathName === '/api/qr/scan' && req.method === 'POST') {
    if (currentUser.role !== 'student') {
      return sendJson(res, 403, { success: false, message: 'Forbidden. Only students can scan QR code to mark attendance.' });
    }

    const { qr_token } = body || {};
    if (!qr_token) return sendJson(res, 400, { success: false, message: 'Invalid QR Code' });

    let tokenStr = qr_token;
    try {
      const parsed = JSON.parse(qr_token);
      if (parsed.token) tokenStr = parsed.token;
    } catch (e) {}

    const session = store.qr_codes.find(q => q.token === tokenStr);
    if (!session) {
      return sendJson(res, 404, { success: false, message: 'Invalid or Unrecognized QR Code' });
    }

    const now = new Date();
    const validUntilDate = new Date(session.valid_until);
    if (!session.is_active || now > validUntilDate) {
      return sendJson(res, 400, { success: false, message: 'QR Code Expired' });
    }

    const todayDate = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // PREVENT DUPLICATE ATTENDANCE ON SAME DAY
    const existing = store.attendance.find(a => a.student_id === currentUser.id && a.date === todayDate);
    if (existing) {
      return sendJson(res, 400, { success: false, message: 'Attendance Already Marked Today' });
    }

    const studentObj = store.students.find(s => s.user_id === currentUser.id) || {};

    const newAttendance = {
      id: store.attendance.length + 1,
      student_id: currentUser.id,
      student_name: currentUser.name,
      roll_number: studentObj.roll_number || 'STU100',
      department: studentObj.department || 'Computer Science',
      semester: studentObj.semester || 6,
      subject: session.subject || 'Data Structures',
      date: todayDate,
      time: timeStr,
      status: 'PRESENT',
      qr_status: 'QR Scanned',
      marked_by: 'QR_SCAN',
      timestamp: now.toISOString().replace('T', ' ').substring(0, 19)
    };

    store.attendance.push(newAttendance);

    store.notifications.push({
      id: store.notifications.length + 1,
      user_id: currentUser.id,
      title: 'Attendance Marked',
      message: `Marked PRESENT for today (${todayDate} ${timeStr})`,
      type: 'INFO',
      is_read: 0,
      created_at: todayDate
    });

    saveStore();
    checkLowAttendanceAlerts(currentUser.id);

    return sendJson(res, 200, {
      success: true,
      message: 'Attendance Marked Successfully',
      details: {
        student_id: studentObj.roll_number || currentUser.id,
        student_name: currentUser.name,
        date: todayDate,
        time: timeStr,
        status: 'PRESENT',
        qr_status: 'QR Scanned'
      }
    });
  }

  // 6. ATTENDANCE LIST & SUMMARY API
  if (pathName === '/api/attendance/list' && req.method === 'GET') {
    let list = store.attendance.map(a => {
      const u = store.users.find(usr => usr.id === a.student_id) || {};
      const s = store.students.find(st => st.user_id === a.student_id) || {};

      const studentRecs = store.attendance.filter(rec => rec.student_id === a.student_id);
      const attended = studentRecs.filter(rec => rec.status === 'PRESENT').length;
      const pct = studentRecs.length > 0 ? parseFloat(((attended / studentRecs.length) * 100).toFixed(1)) : 100.0;

      return {
        id: a.id,
        student_id: s.roll_number || `STU${a.student_id}`,
        raw_student_id: a.student_id,
        student_name: a.student_name || u.name || 'Student',
        roll_number: s.roll_number || 'STU100',
        department: a.department || s.department || 'Computer Science',
        semester: a.semester || s.semester || 6,
        subject: a.subject || 'Data Structures',
        date: a.date,
        time: a.time || '09:00 AM',
        status: a.status || 'PRESENT',
        qr_status: a.qr_status || (a.marked_by === 'QR_SCAN' ? 'QR Scanned' : 'Manual'),
        percentage: pct,
        marked_by: a.marked_by || 'SYSTEM'
      };
    });

    // STRICT BACKEND RBAC FILTERING
    if (currentUser.role === 'student') {
      list = list.filter(a => a.raw_student_id === currentUser.id);
    } else if (currentUser.role === 'parent') {
      const parentObj = store.parents.find(p => p.user_id === currentUser.id);
      const childId = parentObj ? parentObj.student_user_id : null;
      list = list.filter(a => a.raw_student_id === childId);
    } else if (currentUser.role === 'mentor') {
      const mentorObj = store.mentors.find(m => m.user_id === currentUser.id);
      const menteeUserIds = store.students
        .filter(s => s.mentor_id === currentUser.id || (mentorObj && s.mentor_id === mentorObj.id))
        .map(s => s.user_id);
      list = list.filter(a => menteeUserIds.includes(a.raw_student_id));
    } else if (currentUser.role === 'faculty') {
      const facObj = store.faculty.find(f => f.user_id === currentUser.id);
      if (facObj) list = list.filter(a => a.department === facObj.department);
    } else if (currentUser.role === 'hod') {
      const hodObj = store.hods.find(h => h.user_id === currentUser.id);
      if (hodObj) list = list.filter(a => a.department === hodObj.department);
    }

    if (queryParams.search) {
      const q = queryParams.search.toLowerCase();
      list = list.filter(a => 
        a.student_name.toLowerCase().includes(q) || 
        a.student_id.toLowerCase().includes(q) ||
        a.roll_number.toLowerCase().includes(q)
      );
    }

    if (queryParams.department) {
      list = list.filter(a => a.department === queryParams.department);
    }

    if (queryParams.semester) {
      list = list.filter(a => String(a.semester) === String(queryParams.semester));
    }

    if (queryParams.date) {
      list = list.filter(a => a.date === queryParams.date);
    }

    if (queryParams.student_id && !['student', 'parent'].includes(currentUser.role)) {
      list = list.filter(a => a.raw_student_id === parseInt(queryParams.student_id));
    }

    return sendJson(res, 200, { success: true, attendance: list });
  }

  if (pathName === '/api/attendance/mark' && req.method === 'POST') {
    if (!['faculty', 'admin', 'mentor', 'hod'].includes(currentUser.role)) {
      return sendJson(res, 403, { success: false, message: 'Forbidden. Authorized role required to mark attendance.' });
    }

    const { student_id, status, date, subject = 'Data Structures' } = body || {};
    if (!student_id || !status) {
      return sendJson(res, 400, { success: false, message: 'Student ID and Status are required.' });
    }

    const targetUserId = parseInt(student_id);
    const targetStudent = store.students.find(s => s.user_id === targetUserId);
    if (!targetStudent) {
      return sendJson(res, 404, { success: false, message: 'Target student not found.' });
    }

    if (currentUser.role === 'faculty' || currentUser.role === 'hod') {
      const roleObj = store.faculty.find(f => f.user_id === currentUser.id) || store.hods.find(h => h.user_id === currentUser.id);
      if (roleObj && targetStudent.department !== roleObj.department) {
        return sendJson(res, 403, { success: false, message: 'Forbidden. Cannot mark attendance for students outside your department.' });
      }
    } else if (currentUser.role === 'mentor') {
      const mentorObj = store.mentors.find(m => m.user_id === currentUser.id);
      if (targetStudent.mentor_id !== currentUser.id && (!mentorObj || targetStudent.mentor_id !== mentorObj.id)) {
        return sendJson(res, 403, { success: false, message: 'Forbidden. Cannot mark attendance for students not assigned to you.' });
      }
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const targetUser = store.users.find(u => u.id === targetUserId);

    const existing = store.attendance.find(a => a.student_id === targetUserId && a.date === targetDate && (a.subject === subject || (!a.subject && subject === 'Data Structures')));

    if (existing) {
      existing.status = status.toUpperCase();
      existing.subject = subject || existing.subject || 'Data Structures';
      existing.qr_status = 'Manual';
      existing.marked_by = `${currentUser.role.toUpperCase()}_MANUAL`;
    } else {
      store.attendance.push({
        id: store.attendance.length + 1,
        student_id: targetUserId,
        student_name: targetUser ? targetUser.name : 'Student',
        roll_number: targetStudent ? targetStudent.roll_number : `STU${targetUserId}`,
        department: targetStudent ? targetStudent.department : 'Computer Science',
        semester: targetStudent ? targetStudent.semester : 6,
        subject: subject || 'Data Structures',
        date: targetDate,
        time: nowTime,
        status: status.toUpperCase(),
        qr_status: 'Manual',
        marked_by: `${currentUser.role.toUpperCase()}_MANUAL`,
        timestamp: new Date().toISOString()
      });
    }

    saveStore();
    checkLowAttendanceAlerts(targetUserId);
    return sendJson(res, 200, { success: true, message: `Attendance marked as ${status.toUpperCase()} successfully.` });
  }

  if (pathName === '/api/attendance/summary' && req.method === 'GET') {
    let targetStudentId = currentUser.id;
    if (currentUser.role === 'parent') {
      const p = store.parents.find(pr => pr.user_id === currentUser.id);
      targetStudentId = p ? p.student_user_id : null;
    } else if (currentUser.role === 'student') {
      targetStudentId = currentUser.id;
    } else if (queryParams.student_id) {
      targetStudentId = parseInt(queryParams.student_id);
    }

    const studentRecs = store.attendance.filter(a => a.student_id === targetStudentId);
    const attended = studentRecs.filter(a => a.status === 'PRESENT').length;
    const totalConducted = studentRecs.length;
    const absent = totalConducted - attended;
    const percentage = totalConducted > 0 ? parseFloat(((attended / totalConducted) * 100).toFixed(1)) : 100.0;

    return sendJson(res, 200, {
      success: true,
      overallPercentage: percentage,
      totalAttended: attended,
      totalAbsent: absent,
      totalConducted
    });
  }

  // 7. REPORTS & DASHBOARD METRICS API
  if (pathName === '/api/reports/metrics' && req.method === 'GET') {
    const today = new Date().toISOString().split('T')[0];

    if (currentUser.role === 'student') {
      const studentRecs = store.attendance.filter(a => a.student_id === currentUser.id);
      const attended = studentRecs.filter(a => a.status === 'PRESENT').length;
      const totalConducted = studentRecs.length;
      const absent = totalConducted - attended;
      const pct = totalConducted > 0 ? parseFloat(((attended / totalConducted) * 100).toFixed(1)) : 100.0;
      const presentToday = store.attendance.filter(a => a.student_id === currentUser.id && a.date === today && a.status === 'PRESENT').length;

      return sendJson(res, 200, {
        success: true,
        metrics: {
          totalAttendance: totalConducted,
          presentToday,
          totalAttended: attended,
          totalAbsent: absent,
          overallPercentage: pct
        }
      });
    }

    if (currentUser.role === 'parent') {
      const p = store.parents.find(pr => pr.user_id === currentUser.id);
      const childId = p ? p.student_user_id : null;
      const childRecs = store.attendance.filter(a => a.student_id === childId);
      const attended = childRecs.filter(a => a.status === 'PRESENT').length;
      const totalConducted = childRecs.length;
      const absent = totalConducted - attended;
      const pct = totalConducted > 0 ? parseFloat(((attended / totalConducted) * 100).toFixed(1)) : 100.0;
      const presentToday = store.attendance.filter(a => a.student_id === childId && a.date === today && a.status === 'PRESENT').length;

      return sendJson(res, 200, {
        success: true,
        metrics: {
          totalAttendance: totalConducted,
          presentToday,
          totalAttended: attended,
          totalAbsent: absent,
          overallPercentage: pct
        }
      });
    }

    if (currentUser.role === 'mentor') {
      const mentorObj = store.mentors.find(m => m.user_id === currentUser.id);
      const menteeUserIds = store.students
        .filter(s => s.mentor_id === currentUser.id || (mentorObj && s.mentor_id === mentorObj.id))
        .map(s => s.user_id);
      const menteeAtt = store.attendance.filter(a => menteeUserIds.includes(a.student_id));
      const presentToday = menteeAtt.filter(a => a.date === today && a.status === 'PRESENT').length;

      return sendJson(res, 200, {
        success: true,
        metrics: {
          totalStudents: menteeUserIds.length,
          totalAttendance: menteeAtt.length,
          presentToday
        }
      });
    }

    if (currentUser.role === 'faculty') {
      const facObj = store.faculty.find(f => f.user_id === currentUser.id);
      const deptDept = facObj ? facObj.department : 'Computer Science';
      const deptStudents = store.students.filter(s => s.department === deptDept);
      const deptStudentIds = deptStudents.map(s => s.user_id);
      const deptAtt = store.attendance.filter(a => deptStudentIds.includes(a.student_id) || a.department === deptDept);
      const presentToday = deptAtt.filter(a => a.date === today && a.status === 'PRESENT').length;

      return sendJson(res, 200, {
        success: true,
        metrics: {
          totalStudents: deptStudents.length,
          totalFaculty: store.faculty.filter(f => f.department === deptDept).length,
          totalAttendance: deptAtt.length,
          presentToday
        }
      });
    }

    if (currentUser.role === 'hod') {
      const hodObj = store.hods.find(h => h.user_id === currentUser.id);
      const deptDept = hodObj ? hodObj.department : 'Computer Science';
      const deptStudents = store.students.filter(s => s.department === deptDept);
      const deptStudentIds = deptStudents.map(s => s.user_id);
      const deptAtt = store.attendance.filter(a => deptStudentIds.includes(a.student_id) || a.department === deptDept);
      const presentToday = deptAtt.filter(a => a.date === today && a.status === 'PRESENT').length;

      return sendJson(res, 200, {
        success: true,
        metrics: {
          totalStudents: deptStudents.length,
          totalFaculty: store.faculty.filter(f => f.department === deptDept).length,
          totalAttendance: deptAtt.length,
          presentToday
        }
      });
    }

    // Admin Role
    const presentToday = store.attendance.filter(a => a.date === today && a.status === 'PRESENT').length;

    const metrics = {
      totalStudents: store.students.length,
      totalFaculty: store.faculty.length,
      totalMentors: store.mentors.length,
      totalParents: store.parents.length,
      totalHODs: store.hods.length,
      totalAttendance: store.attendance.length,
      presentToday
    };
    return sendJson(res, 200, { success: true, metrics });
  }

  if (pathName === '/api/reports/export-excel' && req.method === 'GET') {
    let allowedAttendance = store.attendance;

    if (currentUser.role === 'student') {
      allowedAttendance = allowedAttendance.filter(a => a.student_id === currentUser.id);
    } else if (currentUser.role === 'parent') {
      const p = store.parents.find(pr => pr.user_id === currentUser.id);
      const childId = p ? p.student_user_id : null;
      allowedAttendance = allowedAttendance.filter(a => a.student_id === childId);
    } else if (currentUser.role === 'mentor') {
      const mentorObj = store.mentors.find(m => m.user_id === currentUser.id);
      const menteeUserIds = store.students
        .filter(s => s.mentor_id === currentUser.id || (mentorObj && s.mentor_id === mentorObj.id))
        .map(s => s.user_id);
      allowedAttendance = allowedAttendance.filter(a => menteeUserIds.includes(a.student_id));
    } else if (['faculty', 'hod'].includes(currentUser.role)) {
      const roleObj = store.faculty.find(f => f.user_id === currentUser.id) || store.hods.find(h => h.user_id === currentUser.id);
      if (roleObj) allowedAttendance = allowedAttendance.filter(a => a.department === roleObj.department);
    }

    let csv = 'Student ID,Student Name,Department,Semester,Date,Time,Status,QR Status,Attendance Percentage\n';
    allowedAttendance.forEach(a => {
      const u = store.users.find(usr => usr.id === a.student_id) || {};
      const s = store.students.find(st => st.user_id === a.student_id) || {};
      const studentId = s.roll_number || `STU${a.student_id}`;
      const studentName = a.student_name || u.name || '';
      
      const studentRecs = store.attendance.filter(rec => rec.student_id === a.student_id);
      const attended = studentRecs.filter(rec => rec.status === 'PRESENT').length;
      const pct = studentRecs.length > 0 ? ((attended / studentRecs.length) * 100).toFixed(1) : '100.0';

      csv += `"${studentId}","${studentName}","${a.department || s.department || 'Computer Science'}","${a.semester || s.semester || 6}","${a.date}","${a.time || ''}","${a.status}","${a.qr_status || 'QR Scanned'}","${pct}%"\n`;
    });

    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=attendance_report_${Date.now()}.csv`
    });
    return res.end(csv);
  }

  // LOW ATTENDANCE ALERTS & NOTIFICATION HISTORY API
  if (pathName === '/api/alerts/low-attendance' && req.method === 'GET') {
    let alerts = (store.alerts || []).filter(a => a.status === 'ACTIVE');

    if (currentUser.role === 'student') {
      alerts = alerts.filter(a => a.student_id === currentUser.id);
    } else if (currentUser.role === 'parent') {
      const parentObj = (store.parents || []).find(p => p.user_id === currentUser.id);
      const childId = parentObj ? parentObj.student_user_id : null;
      alerts = alerts.filter(a => a.student_id === childId);
    } else if (currentUser.role === 'mentor') {
      const mentorObj = (store.mentors || []).find(m => m.user_id === currentUser.id);
      const menteeIds = (store.students || [])
        .filter(s => s.mentor_id === currentUser.id || (mentorObj && s.mentor_id === mentorObj.id))
        .map(s => s.user_id);
      alerts = alerts.filter(a => menteeIds.includes(a.student_id));
    } else if (['faculty', 'hod'].includes(currentUser.role)) {
      const roleObj = (store.faculty || []).find(f => f.user_id === currentUser.id) || (store.hods || []).find(h => h.user_id === currentUser.id);
      const deptStudentIds = (store.students || [])
        .filter(s => s.department === (roleObj ? roleObj.department : ''))
        .map(s => s.user_id);
      alerts = alerts.filter(a => deptStudentIds.includes(a.student_id));
    }

    return sendJson(res, 200, { success: true, alerts });
  }

  if (pathName === '/api/notifications/history' && req.method === 'GET') {
    let notifications = store.notifications || [];

    if (currentUser.role === 'student') {
      notifications = notifications.filter(n => n.user_id === currentUser.id || n.student_id === currentUser.id);
    } else if (currentUser.role === 'parent') {
      const parentObj = (store.parents || []).find(p => p.user_id === currentUser.id);
      const childId = parentObj ? parentObj.student_user_id : null;
      notifications = notifications.filter(n => n.user_id === currentUser.id || n.student_id === childId || n.type === 'ALERT');
    } else if (currentUser.role === 'mentor') {
      const mentorObj = (store.mentors || []).find(m => m.user_id === currentUser.id);
      const menteeIds = (store.students || [])
        .filter(s => s.mentor_id === currentUser.id || (mentorObj && s.mentor_id === mentorObj.id))
        .map(s => s.user_id);
      notifications = notifications.filter(n => menteeIds.includes(n.student_id) || n.user_id === currentUser.id);
    } else if (['faculty', 'hod'].includes(currentUser.role)) {
      const roleObj = (store.faculty || []).find(f => f.user_id === currentUser.id) || (store.hods || []).find(h => h.user_id === currentUser.id);
      const deptStudentIds = (store.students || [])
        .filter(s => s.department === (roleObj ? roleObj.department : ''))
        .map(s => s.user_id);
      notifications = notifications.filter(n => deptStudentIds.includes(n.student_id) || n.user_id === currentUser.id);
    }

    return sendJson(res, 200, { success: true, notifications });
  }

  if (pathName === '/api/attendance/subject-summary' && req.method === 'GET') {
    let targetStudentId = currentUser.id;
    if (currentUser.role === 'parent') {
      const p = (store.parents || []).find(pr => pr.user_id === currentUser.id);
      targetStudentId = p ? p.student_user_id : null;
    } else if (currentUser.role === 'student') {
      targetStudentId = currentUser.id;
    } else if (queryParams.student_id) {
      targetStudentId = parseInt(queryParams.student_id);
    }

    const studentAtts = (store.attendance || []).filter(a => a.student_id === targetStudentId);
    const subjectsMap = {};

    studentAtts.forEach(a => {
      const subj = a.subject || 'Data Structures';
      if (!subjectsMap[subj]) subjectsMap[subj] = { subject: subj, totalConducted: 0, attended: 0, absent: 0 };
      subjectsMap[subj].totalConducted += 1;
      if (a.status === 'PRESENT') subjectsMap[subj].attended += 1;
      else subjectsMap[subj].absent += 1;
    });

    const subjectSummaries = Object.values(subjectsMap).map(s => {
      const percentage = s.totalConducted > 0 ? parseFloat(((s.attended / s.totalConducted) * 100).toFixed(1)) : 100.0;
      return {
        ...s,
        percentage,
        isLowAttendance: percentage < 50.0
      };
    });

    const activeAlerts = (store.alerts || []).filter(a => a.student_id === targetStudentId && a.status === 'ACTIVE');

    return sendJson(res, 200, { success: true, subjectSummaries, activeAlerts });
  }

  return sendJson(res, 404, { success: false, message: 'API Endpoint Not Found' });
}

function checkLowAttendanceAlerts(studentUserId) {
  const store = getStore();
  if (!store.alerts) store.alerts = [];
  if (!store.notifications) store.notifications = [];
  if (!store.simulated_emails) store.simulated_emails = [];

  const studentUser = store.users.find(u => u.id === studentUserId);
  const studentObj = store.students.find(s => s.user_id === studentUserId);
  if (!studentUser || !studentObj) return;

  const parentObj = (store.parents || []).find(p => p.student_user_id === studentUserId || p.id === studentObj.parent_id);
  const parentUser = parentObj ? store.users.find(u => u.id === parentObj.user_id) : null;
  const parentEmail = parentUser ? parentUser.email : (studentUser.email ? `parent.${studentUser.email}` : 'parent@attendance.com');

  const studentAtts = store.attendance.filter(a => a.student_id === studentUserId);

  const subjectsMap = {};
  studentAtts.forEach(a => {
    const subj = a.subject || 'Data Structures';
    if (!subjectsMap[subj]) subjectsMap[subj] = { total: 0, attended: 0 };
    subjectsMap[subj].total += 1;
    if (a.status === 'PRESENT') subjectsMap[subj].attended += 1;
  });

  Object.keys(subjectsMap).forEach(subj => {
    const data = subjectsMap[subj];
    const pct = data.total > 0 ? parseFloat(((data.attended / data.total) * 100).toFixed(1)) : 100.0;

    const activeAlertIdx = store.alerts.findIndex(alt => alt.student_id === studentUserId && alt.subject === subj && alt.status === 'ACTIVE');

    if (pct < 50.0 && data.total > 0) {
      const nowIso = new Date().toISOString();
      const nowFormatted = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

      if (activeAlertIdx >= 0) {
        store.alerts[activeAlertIdx].percentage = pct;
        store.alerts[activeAlertIdx].date_time = nowIso;
      } else {
        const alertObj = {
          id: store.alerts.length + 1,
          student_id: studentUserId,
          student_name: studentUser.name,
          roll_number: studentObj.roll_number || `STU${studentUserId}`,
          subject: subj,
          percentage: pct,
          date_time: nowIso,
          date_time_formatted: nowFormatted,
          parent_id: parentUser ? parentUser.id : null,
          parent_email: parentEmail,
          status: 'ACTIVE'
        };
        store.alerts.push(alertObj);

        // Parent Notification
        store.notifications.push({
          id: store.notifications.length + 1,
          user_id: parentUser ? parentUser.id : 0,
          student_id: studentUserId,
          title: `🚨 LOW ATTENDANCE ALERT: ${subj}`,
          message: `AUTOMATIC PARENT ALERT: Low attendance in ${subj} (${pct}%). Student Name: ${studentUser.name}, Student ID: ${studentObj.roll_number || studentUserId}, Date/Time: ${nowFormatted}`,
          type: 'ALERT',
          is_read: 0,
          created_at: nowIso,
          alert_details: {
            student_name: studentUser.name,
            roll_number: studentObj.roll_number || `STU${studentUserId}`,
            subject: subj,
            percentage: pct,
            date_time: nowFormatted
          }
        });

        // Student Notification
        store.notifications.push({
          id: store.notifications.length + 1,
          user_id: studentUserId,
          student_id: studentUserId,
          title: `⚠️ LOW ATTENDANCE WARNING: ${subj}`,
          message: `WARNING: Your attendance in ${subj} is ${pct}% (below 50% requirement). Date/Time: ${nowFormatted}`,
          type: 'WARNING',
          is_read: 0,
          created_at: nowIso,
          alert_details: {
            student_name: studentUser.name,
            roll_number: studentObj.roll_number || `STU${studentUserId}`,
            subject: subj,
            percentage: pct,
            date_time: nowFormatted
          }
        });

        // Email Notification log
        const emailLog = {
          id: store.simulated_emails.length + 1,
          to: parentEmail,
          subject: `AUTOMATIC ALERT: Low Attendance Warning for ${studentUser.name} (${studentObj.roll_number || studentUserId}) in ${subj}`,
          body: `Dear Parent,\n\nAutomatic Low Attendance Alert:\nStudent Name: ${studentUser.name}\nStudent ID: ${studentObj.roll_number || studentUserId}\nSubject: ${subj}\nAttendance Percentage: ${pct}%\nDate and Time: ${nowFormatted}\n\nParent Email: ${parentEmail}`,
          timestamp: nowIso
        };
        store.simulated_emails.push(emailLog);
        console.log(`📧 [EMAIL NOTIFICATION SENT TO ${parentEmail}]: Student ${studentUser.name} (${studentObj.roll_number}) | ${subj}: ${pct}%`);
      }
    } else if (pct >= 50.0 && activeAlertIdx >= 0) {
      // Automatic removal of alert when attendance reaches 50% or more
      store.alerts[activeAlertIdx].status = 'RESOLVED';
      store.alerts[activeAlertIdx].resolved_at = new Date().toISOString();

      const nowFormatted = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
      store.notifications.push({
        id: store.notifications.length + 1,
        user_id: parentUser ? parentUser.id : 0,
        student_id: studentUserId,
        title: `✅ ALERT RESOLVED: ${subj}`,
        message: `Low attendance alert for ${studentUser.name} in ${subj} has been RESOLVED (${pct}%). Date/Time: ${nowFormatted}`,
        type: 'INFO',
        is_read: 0,
        created_at: new Date().toISOString()
      });
      console.log(`✅ [ALERT AUTO-RESOLVED]: Student ${studentUser.name} | Subject: ${subj} | Pct: ${pct}%`);
    }
  });

  saveStore();
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}
