import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from './utils/authHash.js';
import { normalizeStudentId } from './utils/normalize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.join(__dirname, 'db', 'attendance_store.json');

console.log('Target DB path:', dbFilePath);

const sqlFilePath = 'C:\\Users\\Windows\\Downloads\\students.sql';
if (!fs.existsSync(sqlFilePath)) {
  console.error('SQL file not found at:', sqlFilePath);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
const tupleRegex = /\(\s*(\d+)\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*(\d+)\s*\)/g;

const parsedStudents = [];
let match;
while ((match = tupleRegex.exec(sqlContent)) !== null) {
  const enrollmentNo = match[3].trim();
  if (enrollmentNo) {
    parsedStudents.push({
      sql_id: parseInt(match[1]),
      term: match[2],
      enrollmentNo: enrollmentNo,
      name: match[4].trim(),
      sem: match[5].trim(),
      class: match[6].trim(),
      labBatch: match[7].trim(),
      tutBatch: match[8].trim(),
      status: parseInt(match[9])
    });
  }
}

const store = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));

if (!store.users) store.users = [];
if (!store.students) store.students = [];
if (!store.parents) store.parents = [];

const existingRollNumbers = new Set(
  store.students.map(s => normalizeStudentId(s.roll_number)).filter(Boolean)
);
const existingUsernames = new Set(
  store.users.map(u => normalizeStudentId(u.username)).filter(Boolean)
);

let importedCount = 0;
let skippedCount = 0;

const defaultStudentPassHash = hashPassword('password123');
const defaultParentPassHash = hashPassword('parent123');

parsedStudents.forEach(item => {
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
  const newUserId = store.users.length > 0 ? Math.max(...store.users.map(u => u.id)) + 1 : 1;
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
  store.users.push(userRecord);
  existingUsernames.add(normEnrollment);

  // 2. Create Student Record
  const newStudentId = store.students.length > 0 ? Math.max(...store.students.map(s => s.id)) + 1 : 1;
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
  store.students.push(studentRecord);
  existingRollNumbers.add(normEnrollment);

  // 3. Create Linked Parent Account
  const parentUserId = store.users.length > 0 ? Math.max(...store.users.map(u => u.id)) + 1 : 1;
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
  store.users.push(parentUserRecord);

  const parentRecId = store.parents.length > 0 ? Math.max(...store.parents.map(p => p.id)) + 1 : 1;
  store.parents.push({
    id: parentRecId,
    user_id: parentUserId,
    student_user_id: newUserId,
    relationship: 'Parent'
  });

  studentRecord.parent_id = parentRecId;
  importedCount++;
});

// Write directly to disk
fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), 'utf8');

console.log('Done importing. Store stats:');
console.log('Users:', store.users.length);
console.log('Students:', store.students.length);
console.log('Parents:', store.parents.length);
