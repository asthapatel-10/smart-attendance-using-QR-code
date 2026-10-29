import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from '../utils/authHash.js';
import { normalizeStudentId } from '../utils/normalize.js';

// ── Cached slow hashes (computed once at startup) ────────────────────────────
let _cachedDefaultParentHash = null;
let _cachedParent2Hash = null;
function getCachedParentHash() {
  if (!_cachedDefaultParentHash) _cachedDefaultParentHash = hashPassword('parent123');
  return _cachedDefaultParentHash;
}
function getCachedParent2Hash() {
  if (!_cachedParent2Hash) _cachedParent2Hash = hashPassword('parent456');
  return _cachedParent2Hash;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.join(__dirname, 'attendance_store.json');

let store = {
  users: [],
  students: [],
  faculty: [],
  parents: [],
  mentors: [],
  hods: [],
  departments: [],
  semesters: [],
  sections: [],
  qr_codes: [],
  attendance: [],
  notifications: [],
  mentor_assignments: [],
  mentor_capacity_warning: null
};

export function getInitialSeedData() {
  const defaultPass = hashPassword('password123');
  const adminPass = hashPassword('admin123');
  const parent1Pass = hashPassword('parent123');
  const parent2Pass = hashPassword('parent456');

  const users = [
    { id: 1, name: 'System Administrator', email: 'admin@attendance.com', username: 'admin', password_hash: adminPass, role: 'admin', phone: '+91 9876543210', status: 'active' },
    { id: 2, name: 'Prof. Rajesh Patel', email: 'rajesh@attendance.com', username: 'rajesh', password_hash: defaultPass, role: 'faculty', phone: '+91 9876543211', status: 'active' },
    { id: 3, name: 'Rahul Sharma', email: 'rahul@attendance.com', username: '101', password_hash: defaultPass, role: 'student', phone: '+91 9876543212', status: 'active' },
    { id: 4, name: 'Priya Patel', email: 'priya@attendance.com', username: '102', password_hash: defaultPass, role: 'student', phone: '+91 9876543213', status: 'active' },
    { id: 5, name: 'Amit Kumar', email: 'amit@attendance.com', username: '103', password_hash: defaultPass, role: 'student', phone: '+91 9876543214', status: 'active' },
    { id: 6, name: 'Parent of Rahul Sharma', email: 'parent101@attendance.com', username: 'parent101', password_hash: parent1Pass, role: 'parent', phone: '+91 9876543215', status: 'active' },
    { id: 7, name: 'Dr. Vikram Singh', email: 'vikram@attendance.com', username: 'vikram', password_hash: defaultPass, role: 'mentor', phone: '+91 9876543216', status: 'active' },
    { id: 8, name: 'Dr. Suresh Kumar', email: 'suresh@attendance.com', username: 'suresh', password_hash: defaultPass, role: 'hod', phone: '+91 9876543217', status: 'active' },
    { id: 10, name: 'Parent of Priya Patel', email: 'parent102@attendance.com', username: 'parent102', password_hash: parent2Pass, role: 'parent', phone: '+91 9876543218', status: 'active' }
  ];

  const students = [
    { id: 1, user_id: 3, roll_number: '101', department: 'Computer Science', semester: 6, section: 'A', mentor_id: 7, parent_id: 1 },
    { id: 2, user_id: 4, roll_number: '102', department: 'Computer Science', semester: 6, section: 'A', mentor_id: 7, parent_id: 2 }
  ];

  const faculty = [
    { id: 1, user_id: 2, employee_code: 'FAC101', department: 'Computer Science', designation: 'Professor' }
  ];

  const parents = [
    { id: 1, user_id: 6, student_user_id: 3, relationship: 'Parent' },
    { id: 2, user_id: 10, student_user_id: 4, relationship: 'Parent' }
  ];

  const mentors = [
    { id: 1, user_id: 7, department: 'Computer Science' }
  ];

  const hods = [
    { id: 1, user_id: 8, department: 'Computer Science' }
  ];

  const departments = [
    { id: 1, name: 'Computer Science', code: 'CS' },
    { id: 2, name: 'Information Technology', code: 'IT' },
    { id: 3, name: 'Electrical Engineering', code: 'EE' },
    { id: 4, name: 'Mechanical Engineering', code: 'ME' }
  ];

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
  const sections = ['A', 'B', 'C'];

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const attendance = [
    {
      id: 1,
      student_id: 3,
      student_name: 'Rahul Sharma',
      roll_number: '101',
      department: 'Computer Science',
      semester: 6,
      date: yesterday,
      time: '09:30 AM',
      status: 'PRESENT',
      qr_status: 'QR Scanned',
      marked_by: 'QR_SCAN',
      timestamp: `${yesterday} 09:30:00`
    },
    {
      id: 2,
      student_id: 4,
      student_name: 'Priya Patel',
      roll_number: '102',
      department: 'Computer Science',
      semester: 6,
      date: yesterday,
      time: '09:32 AM',
      status: 'PRESENT',
      qr_status: 'QR Scanned',
      marked_by: 'QR_SCAN',
      timestamp: `${yesterday} 09:32:00`
    }
  ];

  const notifications = [
    { id: 1, user_id: 3, title: 'Attendance Marked', message: 'Your attendance for yesterday was marked PRESENT.', type: 'INFO', is_read: 0, created_at: yesterday },
    { id: 2, user_id: 6, title: 'Child Attendance Alert', message: 'Notice: Rahul Sharma was marked PRESENT yesterday.', type: 'INFO', is_read: 0, created_at: yesterday }
  ];

  return { users, students, faculty, parents, mentors, hods, departments, semesters, sections, qr_codes: [], attendance, notifications };
}

export function loadStore() {
  const backupFilePath = path.join(__dirname, 'attendance_store.backup.json');
  const projectRoot = path.resolve(__dirname, '../..');
  const separateBackupDir = path.join(projectRoot, 'backups');
  if (!fs.existsSync(separateBackupDir)) {
    try { fs.mkdirSync(separateBackupDir, { recursive: true }); } catch (e) {}
  }
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const timestampedBackupPath = path.join(separateBackupDir, `attendance_store_backup_${timestamp}.json`);

  // ALWAYS create and verify backup first before reading or modifying anything
  try {
    if (fs.existsSync(dbFilePath)) {
      if (!fs.existsSync(backupFilePath)) {
        fs.copyFileSync(dbFilePath, backupFilePath);
      }
      fs.copyFileSync(dbFilePath, timestampedBackupPath);
      const bStats = fs.statSync(timestampedBackupPath);
      console.log(`✅ [SAFETY BACKUP] Verified separate backup created at ${timestampedBackupPath} (${bStats.size} bytes)`);
    }
  } catch (backupErr) {
    console.error('❌ Failed to create initial database backup:', backupErr);
  }

  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      store = JSON.parse(raw);
      if (!store.users || store.users.length === 0 || !store.users.some(u => u.username === 'admin')) {
        store = getInitialSeedData();
      }
    } else {
      store = getInitialSeedData();
    }
  } catch (err) {
    store = getInitialSeedData();
  }

  if (!store.subjects) {
    store.subjects = [
      { id: 1, name: 'Data Structures', code: 'CS301', department: 'Computer Science' },
      { id: 2, name: 'Database Systems', code: 'CS302', department: 'Computer Science' },
      { id: 3, name: 'Operating Systems', code: 'CS303', department: 'Computer Science' },
      { id: 4, name: 'Web Technologies', code: 'CS304', department: 'Computer Science' },
      { id: 5, name: 'Computer Networks', code: 'CS305', department: 'Computer Science' }
    ];
  }
  if (!store.alerts) store.alerts = [];
  if (!store.notifications) store.notifications = [];
  if (!store.simulated_emails) store.simulated_emails = [];
  if (!store.timetable) store.timetable = [];
  if (!store.mentor_assignments) store.mentor_assignments = [];
  if (store.mentor_capacity_warning === undefined) store.mentor_capacity_warning = null;

  let dirty = false;
  if (ensureSeededAccounts(store)) dirty = true;
  const sqlRes = autoImportSqlStudents(store);
  if (sqlRes && sqlRes.dirty) dirty = true;
  if (ensureAllDynamicParentAccounts(store)) dirty = true;
  if (applyOneTimeMigration(store)) dirty = true;
  if (dirty) saveStore();

  // Initialize cloud persistent database if MONGODB_URI is provided
  initCloudDatabase().catch(() => {});
}

export function applyOneTimeMigration(storeData) {
  const backupFilePath = path.join(__dirname, 'attendance_store.backup.json');

  // 1. Create and verify backup if not already created
  if (!fs.existsSync(backupFilePath) && fs.existsSync(dbFilePath)) {
    try {
      fs.copyFileSync(dbFilePath, backupFilePath);
      const bStats = fs.statSync(backupFilePath);
      console.log(`✅ Verified database backup created at ${backupFilePath} (${bStats.size} bytes)`);
    } catch (err) {
      console.error('❌ Failed to create database backup:', err);
    }
  }

  // 2. One-time reset and password setup
  if (!storeData.system_update_v2_applied) {
    console.log('⚡ Applying One-Time System Update & 0% Attendance Reset...');

    // A. Reset attendance to 0%
    const previousAttendanceCount = (storeData.attendance || []).length;
    storeData.attendance = [];
    storeData.alerts = [];
    storeData.simulated_emails = [];
    storeData.notifications = (storeData.notifications || []).filter(n =>
      n.type !== 'ALERT' &&
      !String(n.title || '').toLowerCase().includes('attendance marked')
    );

    // B. Temporary Initial Password based on last 3 characters of enrollment number
    const studentUserMap = new Map((storeData.students || []).map(s => [s.user_id, s]));
    let passwordsUpdated = 0;
    const accountsNeedingSetup = [];

    (storeData.users || []).forEach(u => {
      if (u.role === 'student') {
        const st = studentUserMap.get(u.id);
        const rawRoll = (st && st.roll_number) ? String(st.roll_number).trim() : String(u.username || '').trim();
        const normRoll = normalizeStudentId(rawRoll) || rawRoll;

        if (normRoll && normRoll.length >= 3) {
          const last3 = normRoll.slice(-3);
          u.password_hash = hashPassword(last3);
          u.must_change_password = true;
          u.initial_password_set = true;
          passwordsUpdated++;
          accountsNeedingSetup.push({
            user_id: u.id,
            name: u.name,
            roll_number: normRoll,
            username: u.username
          });
        }
      }
    });

    // C. Fix timetable: complete weekly schedule for all 6 working days
    const defaultSchedule = [
      { day: 'MONDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Data Structures', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },
      { day: 'MONDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Database Systems', faculty_name: 'Prof. Amit Shah', room: 'Room 202' },
      { day: 'MONDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
      { day: 'MONDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Computer Networks', faculty_name: 'Prof. Vikram Singh', room: 'Room 301' },
      { day: 'MONDAY', start_time: '12:00 PM', end_time: '01:00 PM', subject: 'Operating Systems', faculty_name: 'Prof. Sunita Sharma', room: 'Room 105' },

      { day: 'TUESDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Operating Systems', faculty_name: 'Prof. Sunita Sharma', room: 'Room 105' },
      { day: 'TUESDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Web Technologies', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },
      { day: 'TUESDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
      { day: 'TUESDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Database Systems', faculty_name: 'Prof. Amit Shah', room: 'Room 202' },

      { day: 'WEDNESDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Computer Networks', faculty_name: 'Prof. Vikram Singh', room: 'Room 301' },
      { day: 'WEDNESDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Data Structures', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },
      { day: 'WEDNESDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
      { day: 'WEDNESDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Web Technologies', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },

      { day: 'THURSDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Database Systems', faculty_name: 'Prof. Amit Shah', room: 'Room 202' },
      { day: 'THURSDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Operating Systems', faculty_name: 'Prof. Sunita Sharma', room: 'Room 105' },
      { day: 'THURSDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
      { day: 'THURSDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Data Structures', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },

      { day: 'FRIDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Web Technologies', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },
      { day: 'FRIDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Computer Networks', faculty_name: 'Prof. Vikram Singh', room: 'Room 301' },
      { day: 'FRIDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
      { day: 'FRIDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Operating Systems', faculty_name: 'Prof. Sunita Sharma', room: 'Room 105' },

      { day: 'SATURDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Data Structures Lab', faculty_name: 'Prof. Rajesh Patel', room: 'Lab 1' },
      { day: 'SATURDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Database Systems Lab', faculty_name: 'Prof. Amit Shah', room: 'Lab 2' },
      { day: 'SATURDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
      { day: 'SATURDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Seminar / Project', faculty_name: 'Prof. Vikram Singh', room: 'Auditorium' }
    ];

    let ttId = 1;
    const cleanTimetable = [];

    // General Department schedule (Computer Science Sem 6 Div A)
    defaultSchedule.forEach(slot => {
      cleanTimetable.push({
        id: ttId++,
        department: 'Computer Science',
        semester: 6,
        division: 'A',
        ...slot
      });
    });

    // Student-specific linked schedule for student 101 and 102
    const stu101 = (storeData.students || []).find(s => normalizeStudentId(s.roll_number) === '101');
    const stu102 = (storeData.students || []).find(s => normalizeStudentId(s.roll_number) === '102');

    [stu101, stu102].forEach(stu => {
      if (!stu) return;
      defaultSchedule.forEach(slot => {
        cleanTimetable.push({
          id: ttId++,
          student_id: stu.user_id,
          department: stu.department || 'Computer Science',
          semester: stu.semester || 6,
          division: stu.section || 'A',
          ...slot
        });
      });
    });

    storeData.timetable = cleanTimetable;

    // D. Mentor Allocation - keep existing assignments, disable auto-allocation
    storeData.mentor_capacity_warning = null;

    // Mark as completed
    storeData.system_update_v2_applied = true;
    storeData.reset_timestamp = new Date().toISOString();

    const statusReport = {
      backupFilePath,
      backupCreated: fs.existsSync(backupFilePath),
      previousAttendanceCount,
      currentAttendanceCount: storeData.attendance.length,
      studentPasswordsInitialized: passwordsUpdated,
      accountsNeedingSetupCount: accountsNeedingSetup.length,
      timetableEntriesConfigured: cleanTimetable.length,
      timetableDaysCovered: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      autoMentorAllocationDisabled: true,
      timestamp: new Date().toISOString()
    };

    try {
      fs.writeFileSync(path.join(__dirname, 'migration_status.json'), JSON.stringify(statusReport, null, 2), 'utf8');
    } catch (e) {}

    console.log(`✅ System Update applied: Attendance reset to 0%, ${passwordsUpdated} student passwords initialized, timetable updated for 6 days.`);
    return true;
  }

  return false;
}

export function ensureSeededAccounts(storeData) {
  if (!storeData.users) storeData.users = [];
  if (!storeData.faculty) storeData.faculty = [];
  if (!storeData.mentors) storeData.mentors = [];
  if (!storeData.hods) storeData.hods = [];
  if (!storeData.students) storeData.students = [];
  if (!storeData.parents) storeData.parents = [];

  let dirty = false;
  const defaultPass = hashPassword('password123');
  const adminPass = hashPassword('adminpassword');

  let _nextIdSeed = storeData.users.length > 0 ? Math.max(...storeData.users.map(u => u.id)) : 0;
  const nextUserId = () => ++_nextIdSeed;

  // 1. Admin
  let adminUser = storeData.users.find(u => u.role === 'admin' || u.username === 'admin');
  if (!adminUser) {
    adminUser = { id: nextUserId(), name: 'System Administrator', email: 'admin@attendance.com', username: 'admin', password_hash: adminPass, role: 'admin', phone: '+91 9876543210', status: 'active' };
    storeData.users.push(adminUser);
    dirty = true;
  }

  // 2. Faculty: rajesh
  let rajeshUser = storeData.users.find(u => u.username === 'rajesh' || (u.role === 'faculty' && u.email && u.email.startsWith('rajesh')));
  if (!rajeshUser) {
    const fUser = storeData.users.find(u => u.role === 'faculty' && u.username === 'rajeshpatel');
    if (fUser) {
      fUser.username = 'rajesh';
      rajeshUser = fUser;
      dirty = true;
    } else {
      const uId = nextUserId();
      rajeshUser = { id: uId, name: 'Prof. Rajesh Patel', email: 'rajesh@attendance.com', username: 'rajesh', password_hash: defaultPass, role: 'faculty', phone: '+91 9876543211', status: 'active' };
      storeData.users.push(rajeshUser);
      dirty = true;
    }
  }
  if (rajeshUser && !storeData.faculty.some(f => f.user_id === rajeshUser.id)) {
    const nextFId = storeData.faculty.length > 0 ? Math.max(...storeData.faculty.map(f => f.id)) + 1 : 1;
    storeData.faculty.push({ id: nextFId, user_id: rajeshUser.id, employee_code: 'FAC101', department: 'Computer Science', designation: 'Professor' });
    dirty = true;
  }

  // 3. Student: 101
  let stu101User = storeData.users.find(u => u.username === '101' && u.role === 'student');
  if (!stu101User) {
    const uId = nextUserId();
    stu101User = { id: uId, name: 'Rahul Sharma', email: 'rahul@attendance.com', username: '101', password_hash: defaultPass, role: 'student', phone: '+91 9876543212', status: 'active' };
    storeData.users.push(stu101User);
    dirty = true;
  }
  let stu101Rec = storeData.students.find(s => s.user_id === stu101User.id || s.roll_number === '101');
  if (!stu101Rec) {
    const nextSId = storeData.students.length > 0 ? Math.max(...storeData.students.map(s => s.id)) + 1 : 1;
    stu101Rec = { id: nextSId, user_id: stu101User.id, roll_number: '101', department: 'Computer Science', semester: 6, section: 'A' };
    storeData.students.push(stu101Rec);
    dirty = true;
  }

  // 4. Mentor: vikram
  let vikramUser = storeData.users.find(u => u.username === 'vikram' || (u.role === 'mentor' && u.name.toLowerCase().includes('vikram')));
  if (!vikramUser) {
    const uId = nextUserId();
    vikramUser = { id: uId, name: 'Dr. Vikram Singh', email: 'vikram@attendance.com', username: 'vikram', password_hash: defaultPass, role: 'mentor', phone: '+91 9876543216', status: 'active' };
    storeData.users.push(vikramUser);
    dirty = true;
  }
  if (vikramUser && !storeData.mentors.some(m => m.user_id === vikramUser.id)) {
    const nextMId = storeData.mentors.length > 0 ? Math.max(...storeData.mentors.map(m => m.id)) + 1 : 1;
    storeData.mentors.push({ id: nextMId, user_id: vikramUser.id, department: 'Computer Science' });
    dirty = true;
  }

  // 5. HOD: suresh
  let sureshUser = storeData.users.find(u => u.username === 'suresh' || (u.role === 'hod' && u.name.toLowerCase().includes('suresh')));
  if (!sureshUser) {
    const uId = nextUserId();
    sureshUser = { id: uId, name: 'Dr. Suresh Kumar', email: 'suresh@attendance.com', username: 'suresh', password_hash: defaultPass, role: 'hod', phone: '+91 9876543217', status: 'active' };
    storeData.users.push(sureshUser);
    dirty = true;
  }
  if (sureshUser && !storeData.hods.some(h => h.user_id === sureshUser.id)) {
    const nextHId = storeData.hods.length > 0 ? Math.max(...storeData.hods.map(h => h.id)) + 1 : 1;
    storeData.hods.push({ id: nextHId, user_id: sureshUser.id, department: 'Computer Science' });
    dirty = true;
  }

  return dirty;
}

export function autoImportSqlStudents(storeData) {
  if (!storeData.users) storeData.users = [];
  if (!storeData.students) storeData.students = [];
  if (!storeData.parents) storeData.parents = [];

  // Skip if already imported or database already populated (prevents re-parsing SQL)
  if (storeData.sql_already_imported || storeData.system_update_v2_applied || storeData.students.length > 2) {
    storeData.sql_already_imported = true;
    return { imported: 0, skipped: 0, total: 0, dirty: false };
  }

  const possibleSqlPaths = [
    'c:/Users/Windows/Downloads/students.sql',
    'C:\\Users\\Windows\\Downloads\\students.sql',
    'C:\\Users\\Windows\\Downloads\\students (1).sql',
    'C:\\Users\\Windows\\Downloads\\students (2).sql',
    'C:\\Users\\Windows\\Downloads\\students (3)(1).sql',
    'C:\\Users\\Windows\\Downloads\\students(3)(1).sql',
    path.join(__dirname, '..', '..', 'students.sql'),
    path.join(__dirname, '..', 'students.sql'),
    path.join(__dirname, 'students.sql')
  ];

  let sqlFilePath = null;
  for (const p of possibleSqlPaths) {
    if (fs.existsSync(p)) {
      sqlFilePath = p;
      break;
    }
  }

  if (!sqlFilePath) {
    console.log('⚠️ autoImportSqlStudents: SQL file not found in paths.');
    return { imported: 0, skipped: 0, total: 0 };
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  const sqlLines = sqlContent.split(/\r?\n/);
  const parsed = [];

  for (let line of sqlLines) {
    line = line.trim();
    if (!line.startsWith('(')) continue;
    const startIdx = line.indexOf('(');
    const endIdx = line.lastIndexOf(')');
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) continue;

    const rawTuple = line.substring(startIdx + 1, endIdx);
    const parts = rawTuple.split(',').map(p => p.trim().replace(/^['"]|['"]$/g, ''));
    if (parts.length >= 9) {
      const sql_id = parseInt(parts[0]);
      const term = parts[1];
      const enrollmentNo = parts[2] ? parts[2].trim() : '';
      const name = parts[3] ? parts[3].trim() : '';
      const sem = parts[4] ? parts[4].trim() : '';
      const cls = parts[5] ? parts[5].trim() : '';
      const labBatch = parts[6] ? parts[6].trim() : '';
      const tutBatch = parts[7] ? parts[7].trim() : '';
      const status = parseInt(parts[8]);

      if (enrollmentNo && !isNaN(sql_id)) {
        parsed.push({
          sql_id,
          term,
          enrollmentNo,
          name,
          sem,
          class: cls,
          labBatch,
          tutBatch,
          status
        });
      }
    }
  }

  const existingRollNumbers = new Set(
    storeData.students.map(s => normalizeStudentId(s.roll_number)).filter(Boolean)
  );
  const existingUsernames = new Set(
    storeData.users.map(u => normalizeStudentId(u.username)).filter(Boolean)
  );

  let importedCount = 0;
  let skippedCount = 0;
  let dirty = false;

  const defaultStudentPassHash = hashPassword('password123');
  const defaultParentPassHash = hashPassword('parent123');

  let _nextUserId = storeData.users.length > 0 ? Math.max(...storeData.users.map(u => u.id)) : 0;
  let _nextStudentId = storeData.students.length > 0 ? Math.max(...storeData.students.map(s => s.id)) : 0;
  let _nextParentId = storeData.parents.length > 0 ? Math.max(...storeData.parents.map(p => p.id)) : 0;

  parsed.forEach(item => {
    const normEnrollment = normalizeStudentId(item.enrollmentNo);
    if (!normEnrollment) {
      skippedCount++;
      return;
    }

    if (existingRollNumbers.has(normEnrollment) || existingUsernames.has(normEnrollment)) {
      skippedCount++;
      return;
    }

    // 1. Create Student User account
    const newUserId = ++_nextUserId;
    const userRecord = {
      id: newUserId,
      name: item.name,
      email: `${normEnrollment}@attendance.com`,
      username: normEnrollment,
      password_hash: defaultStudentPassHash,
      role: 'student',
      phone: '+91 9876543210',
      status: item.status === 1 ? 'active' : 'inactive'
    };
    storeData.users.push(userRecord);
    existingUsernames.add(normEnrollment);

    // 2. Create Student Record
    const newStudentId = ++_nextStudentId;
    const studentRecord = {
      id: newStudentId,
      user_id: newUserId,
      roll_number: normEnrollment,
      department: 'Computer Science',
      semester: parseInt(item.sem) || 4,
      section: item.class || 'A',
      labBatch: item.labBatch,
      tutBatch: item.tutBatch,
      term: item.term,
      sql_id: item.sql_id,
      status: item.status
    };
    storeData.students.push(studentRecord);
    existingRollNumbers.add(normEnrollment);

    // 3. Create Linked Parent Account
    const parentUserId = ++_nextUserId;
    const parentUserRecord = {
      id: parentUserId,
      name: `Parent of ${item.name}`,
      email: `parent_${normEnrollment}@attendance.com`,
      username: `parent_${normEnrollment}`,
      password_hash: defaultParentPassHash,
      role: 'parent',
      phone: '+91 9876543215',
      status: 'active'
    };
    storeData.users.push(parentUserRecord);

    const parentRecId = ++_nextParentId;
    storeData.parents.push({
      id: parentRecId,
      user_id: parentUserId,
      student_user_id: newUserId,
      relationship: 'Parent'
    });

    studentRecord.parent_id = parentRecId;
    importedCount++;
    dirty = true;
  });

  storeData.lastImportStats = {
    totalInSql: parsed.length,
    imported: importedCount,
    skipped: skippedCount
  };

  if (dirty) {
    storeData.sql_already_imported = true;  // Mark as imported so we skip on next restart
    try {
      fs.writeFileSync(dbFilePath, JSON.stringify(storeData, null, 2), 'utf8');
      console.log(`✅ autoImportSqlStudents: Successfully imported ${importedCount} students & saved to ${dbFilePath}`);
    } catch (e) {
      console.error('Error saving imported store:', e);
    }
  }

  return { dirty, imported: importedCount, skipped: skippedCount, total: parsed.length };
}

export function ensureAllDynamicParentAccounts(storeData) {
  if (!storeData.users) storeData.users = [];
  if (!storeData.students) storeData.students = [];
  if (!storeData.parents) storeData.parents = [];

  const defaultParentHash = getCachedParentHash();
  const parent2Hash = getCachedParent2Hash();
  let dirty = false;

  // Collect all student user IDs from both storeData.students and storeData.users
  const studentUserIdsSet = new Set();
  storeData.students.forEach(s => { if (s.user_id) studentUserIdsSet.add(s.user_id); });
  storeData.users.filter(u => u.role === 'student').forEach(u => studentUserIdsSet.add(u.id));

  // Build O(1) lookup maps
  const userById = new Map(storeData.users.map(u => [u.id, u]));
  const studentByUserId = new Map(storeData.students.map(s => [s.user_id, s]));
  const parentByStudentUserId = new Map(storeData.parents.map(p => [p.student_user_id, p]));

  let _dynNextStuId = storeData.students.length > 0 ? Math.max(...storeData.students.map(s => s.id)) : 0;
  let _dynNextUserId = storeData.users.length > 0 ? Math.max(...storeData.users.map(u => u.id)) : 0;
  let _dynNextParentId = storeData.parents.length > 0 ? Math.max(...storeData.parents.map(p => p.id)) : 0;

  studentUserIdsSet.forEach(studentUserId => {
    let sUser = userById.get(studentUserId);
    let sRecord = studentByUserId.get(studentUserId);

    if (!sUser && sRecord) {
      sUser = {
        id: studentUserId,
        name: `Student ${sRecord.roll_number || studentUserId}`,
        email: `student${sRecord.roll_number || studentUserId}@attendance.com`,
        username: sRecord.roll_number || `STU${studentUserId}`,
        password_hash: hashPassword('password123'),
        role: 'student',
        phone: '1234567890',
        status: 'active'
      };
      storeData.users.push(sUser);
      userById.set(studentUserId, sUser);
      dirty = true;
    }

    if (!sRecord && sUser) {
      const nextStuId = ++_dynNextStuId;
      sRecord = {
        id: nextStuId,
        user_id: sUser.id,
        roll_number: normalizeStudentId(sUser.username) || `STU${sUser.id}`,
        department: 'Computer Science',
        semester: 6,
        section: 'A'
      };
      storeData.students.push(sRecord);
      studentByUserId.set(sUser.id, sRecord);
      dirty = true;
    }

    const normRoll = normalizeStudentId(sRecord?.roll_number || sUser?.username || `STU${studentUserId}`);

    // Find linked Parent record in storeData.parents
    let parentObj = parentByStudentUserId.get(studentUserId);
    let parentUser;

    if (parentObj) {
      parentUser = userById.get(parentObj.user_id);
    }

    if (!parentUser) {
      parentUser = storeData.users.find(u => u.role === 'parent' && (
        u.username === `parent${normRoll}` ||
        u.username === `parent_${normRoll}` ||
        (u.email && u.email.includes(normRoll)) ||
        (u.name && sUser && sUser.name && u.name.includes(sUser.name))
      ));
    }

    if (!parentUser) {
      const nextId = ++_dynNextUserId;
      const passHash = (normRoll === '102') ? parent2Hash : defaultParentHash;
      parentUser = {
        id: nextId,
        name: `Parent of ${sUser ? sUser.name : 'Student ' + normRoll}`,
        email: `parent_${normRoll}@attendance.com`,
        username: `parent_${normRoll}`,
        password_hash: passHash,
        role: 'parent',
        phone: sUser ? sUser.phone : '+91 9876543215',
        status: 'active'
      };
      storeData.users.push(parentUser);
      userById.set(nextId, parentUser);
      dirty = true;
    } else {
      if (!parentUser.password_hash) {
        parentUser.password_hash = (normRoll === '102') ? parent2Hash : defaultParentHash;
        dirty = true;
      }
      parentUser.role = 'parent';
      parentUser.status = 'active';
    }

    if (!parentObj) {
      const nextPId = ++_dynNextParentId;
      parentObj = { id: nextPId, user_id: parentUser.id, student_user_id: studentUserId, relationship: 'Parent' };
      storeData.parents.push(parentObj);
      parentByStudentUserId.set(studentUserId, parentObj);
      dirty = true;
    } else {
      if (parentObj.user_id !== parentUser.id || parentObj.student_user_id !== studentUserId) {
        parentObj.user_id = parentUser.id;
        parentObj.student_user_id = studentUserId;
        dirty = true;
      }
    }

    if (sRecord && sRecord.parent_id !== parentObj.id) {
      sRecord.parent_id = parentObj.id;
      dirty = true;
    }
  });

  return dirty;
}

function ensureTimetableData(storeData) {
  if (!storeData.timetable) storeData.timetable = [];

  const stu101 = storeData.students.find(s => normalizeStudentId(s.roll_number) === '101');
  const stu102 = storeData.students.find(s => normalizeStudentId(s.roll_number) === '102');

  const defaultSchedule = [
    { day: 'MONDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Data Structures', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },
    { day: 'MONDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Database Systems', faculty_name: 'Prof. Amit Shah', room: 'Room 202' },
    { day: 'MONDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
    { day: 'MONDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Computer Networks', faculty_name: 'Prof. Vikram Singh', room: 'Room 301' },
    { day: 'MONDAY', start_time: '12:00 PM', end_time: '01:00 PM', subject: 'Operating Systems', faculty_name: 'Prof. Sunita Sharma', room: 'Room 105' },

    { day: 'TUESDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Operating Systems', faculty_name: 'Prof. Sunita Sharma', room: 'Room 105' },
    { day: 'TUESDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Web Technologies', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },
    { day: 'TUESDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
    { day: 'TUESDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Database Systems', faculty_name: 'Prof. Amit Shah', room: 'Room 202' },

    { day: 'WEDNESDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Computer Networks', faculty_name: 'Prof. Vikram Singh', room: 'Room 301' },
    { day: 'WEDNESDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Data Structures', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },
    { day: 'WEDNESDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
    { day: 'WEDNESDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Web Technologies', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },

    { day: 'THURSDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Database Systems', faculty_name: 'Prof. Amit Shah', room: 'Room 202' },
    { day: 'THURSDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Operating Systems', faculty_name: 'Prof. Sunita Sharma', room: 'Room 105' },
    { day: 'THURSDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
    { day: 'THURSDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Data Structures', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },

    { day: 'FRIDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Web Technologies', faculty_name: 'Prof. Rajesh Patel', room: 'Room 204' },
    { day: 'FRIDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Computer Networks', faculty_name: 'Prof. Vikram Singh', room: 'Room 301' },
    { day: 'FRIDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
    { day: 'FRIDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Operating Systems', faculty_name: 'Prof. Sunita Sharma', room: 'Room 105' },

    { day: 'SATURDAY', start_time: '08:00 AM', end_time: '09:00 AM', subject: 'Data Structures Lab', faculty_name: 'Prof. Rajesh Patel', room: 'Lab 1' },
    { day: 'SATURDAY', start_time: '09:00 AM', end_time: '10:00 AM', subject: 'Database Systems Lab', faculty_name: 'Prof. Amit Shah', room: 'Lab 2' },
    { day: 'SATURDAY', start_time: '10:00 AM', end_time: '11:00 AM', subject: 'Break', faculty_name: '-', room: '-' },
    { day: 'SATURDAY', start_time: '11:00 AM', end_time: '12:00 PM', subject: 'Seminar / Project', faculty_name: 'Prof. Vikram Singh', room: 'Auditorium' }
  ];

  [stu101, stu102].forEach(stu => {
    if (!stu) return;
    const existing = storeData.timetable.filter(t => t.student_id === stu.user_id);
    if (existing.length === 0) {
      defaultSchedule.forEach(item => {
        const nextId = Math.max(...storeData.timetable.map(t => t.id), 0) + 1;
        storeData.timetable.push({
          id: nextId,
          student_id: stu.user_id,
          ...item
        });
      });
    }
  });
}

function ensureSubjectAttendanceData(storeData) {
  // Disabled: Attendance is never seeded automatically. Reset to 0%.
}

/**
 * Mentor Allocation
 * Automatic allocation is disabled. Allocations are managed manually via HOD portal.
 */
export function ensureMentorAllocations(storeData) {
  // Automatic mentor allocation is disabled per requirements.
  // Mentor allocations are managed manually via HOD portal.
}

// ── Cloud Database Persistence (MongoDB Atlas Free Tier) ─────────────────────
let _mongoClient = null;
let _mongoCollection = null;
let _isCloudConnected = false;

export async function initCloudDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log('ℹ️ [Database] Running in local JSON storage mode (MONGODB_URI not provided).');
    return;
  }

  try {
    const mongoModule = await import('mongodb');
    const { MongoClient } = mongoModule;
    const dbName = process.env.MONGODB_DB_NAME || 'smart_attendance';
    const collName = process.env.MONGODB_COLLECTION || 'system_store';

    console.log('⏳ [Cloud Database] Connecting to MongoDB Atlas...');
    _mongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });
    await _mongoClient.connect();
    const db = _mongoClient.db(dbName);
    _mongoCollection = db.collection(collName);
    _isCloudConnected = true;
    console.log('✅ [Cloud Database] Connected to MongoDB Atlas successfully.');

    // Fetch persistent cloud document
    const cloudDoc = await _mongoCollection.findOne({ _id: 'store_data' });
    if (cloudDoc && cloudDoc.data && cloudDoc.data.users && cloudDoc.data.users.length > 0) {
      console.log(`✅ [Cloud Database] Synchronized in-memory store with MongoDB Atlas (${cloudDoc.data.users.length} users, ${cloudDoc.data.attendance?.length || 0} attendance logs).`);
      Object.assign(store, cloudDoc.data);
    } else {
      console.log('ℹ️ [Cloud Database] Initializing MongoDB Atlas with current verified local store...');
      await _mongoCollection.updateOne(
        { _id: 'store_data' },
        { $set: { data: store, initialized_at: new Date().toISOString() } },
        { upsert: true }
      );
      console.log('✅ [Cloud Database] Initialized MongoDB Atlas with local store.');
    }
  } catch (err) {
    console.warn('⚠️ [Cloud Database] MongoDB Atlas connection error; continuing with local storage:', err.message);
    _isCloudConnected = false;
  }
}

export function saveStore() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    // Disk write might be read-only or ephemeral on cloud hosts
  }

  // Persist to MongoDB Atlas asynchronously if connected
  if (_isCloudConnected && _mongoCollection) {
    _mongoCollection.updateOne(
      { _id: 'store_data' },
      { $set: { data: store, updated_at: new Date().toISOString() } },
      { upsert: true }
    ).catch(err => {
      console.warn('⚠️ [Cloud Database] Background sync to MongoDB Atlas failed:', err.message);
    });
  }
}

export function getStore() {
  return store;
}

export function getMentorAssignments(storeData) {
  if (!storeData.mentor_assignments) storeData.mentor_assignments = [];
  return storeData.mentor_assignments;
}

loadStore();
