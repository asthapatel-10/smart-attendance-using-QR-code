import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from '../utils/authHash.js';

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
  notifications: []
};

export function getInitialSeedData() {
  const defaultPass = hashPassword('password123');
  const adminPass = hashPassword('admin123');

  const users = [
    { id: 1, name: 'System Administrator', email: 'admin@attendance.com', username: 'admin', password_hash: adminPass, role: 'admin', phone: '+91 9876543210', status: 'active' },
    { id: 2, name: 'Prof. Rajesh Patel', email: 'rajesh@attendance.com', username: 'rajesh', password_hash: defaultPass, role: 'faculty', phone: '+91 9876543211', status: 'active' },
    { id: 3, name: 'Rahul Sharma', email: 'rahul@attendance.com', username: 'rahul', password_hash: defaultPass, role: 'student', phone: '+91 9876543212', status: 'active' },
    { id: 4, name: 'Priya Patel', email: 'priya@attendance.com', username: 'priya', password_hash: defaultPass, role: 'student', phone: '+91 9876543213', status: 'active' },
    { id: 5, name: 'Amit Kumar', email: 'amit@attendance.com', username: 'amit', password_hash: defaultPass, role: 'student', phone: '+91 9876543214', status: 'active' },
    { id: 6, name: 'Sunita Sharma', email: 'sunita@attendance.com', username: 'sunita', password_hash: defaultPass, role: 'parent', phone: '+91 9876543215', status: 'active' },
    { id: 7, name: 'Dr. Vikram Singh', email: 'vikram@attendance.com', username: 'vikram', password_hash: defaultPass, role: 'mentor', phone: '+91 9876543216', status: 'active' },
    { id: 8, name: 'Dr. Suresh Kumar', email: 'suresh@attendance.com', username: 'suresh', password_hash: defaultPass, role: 'hod', phone: '+91 9876543217', status: 'active' },
    { id: 9, name: 'mahi', email: 'mahi123@gmail.com', username: 'mahi', password_hash: defaultPass, role: 'student', phone: '1234567890', status: 'active' }
  ];

  const students = [
    { id: 1, user_id: 3, roll_number: 'STU101', department: 'Computer Science', semester: 6, section: 'A', mentor_id: 7, parent_id: 6 },
    { id: 2, user_id: 4, roll_number: 'STU102', department: 'Computer Science', semester: 6, section: 'A', mentor_id: 7, parent_id: null },
    { id: 3, user_id: 5, roll_number: 'STU103', department: 'Computer Science', semester: 6, section: 'B', mentor_id: 7, parent_id: null },
    { id: 4, user_id: 9, roll_number: '105', department: 'Computer Science', semester: 1, section: 'A', mentor_id: 7, parent_id: null }
  ];

  const faculty = [
    { id: 1, user_id: 2, employee_code: 'FAC101', department: 'Computer Science', designation: 'Professor' }
  ];

  const parents = [
    { id: 1, user_id: 6, student_user_id: 3, relationship: 'Mother', address: '12 College Road, Ahmedabad' }
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
      roll_number: 'STU101',
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
      roll_number: 'STU102',
      department: 'Computer Science',
      semester: 6,
      date: yesterday,
      time: '09:32 AM',
      status: 'PRESENT',
      qr_status: 'QR Scanned',
      marked_by: 'QR_SCAN',
      timestamp: `${yesterday} 09:32:00`
    },
    {
      id: 3,
      student_id: 5,
      student_name: 'Amit Kumar',
      roll_number: 'STU103',
      department: 'Computer Science',
      semester: 6,
      date: yesterday,
      time: '09:35 AM',
      status: 'ABSENT',
      qr_status: 'Manual',
      marked_by: 'FACULTY_MANUAL',
      timestamp: `${yesterday} 09:35:00`
    }
  ];

  const notifications = [
    { id: 1, user_id: 3, title: 'Attendance Marked', message: 'Your attendance for yesterday was marked PRESENT.', type: 'INFO', is_read: 0, created_at: yesterday },
    { id: 2, user_id: 6, title: 'Child Attendance Alert', message: 'Notice: Rahul Sharma was marked PRESENT yesterday.', type: 'INFO', is_read: 0, created_at: yesterday }
  ];

  return { users, students, faculty, parents, mentors, hods, departments, semesters, sections, qr_codes: [], attendance, notifications };
}

export function loadStore() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      store = JSON.parse(raw);
      if (!store.users || store.users.length === 0 || !store.users.some(u => u.username === 'admin')) {
        store = getInitialSeedData();
        saveStore();
      }
    } else {
      store = getInitialSeedData();
      saveStore();
    }
  } catch (err) {
    store = getInitialSeedData();
    saveStore();
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
}

export function saveStore() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving DB store:', err);
  }
}

export function getStore() {
  return store;
}

loadStore();
