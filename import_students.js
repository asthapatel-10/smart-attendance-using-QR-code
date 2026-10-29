import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from './utils/authHash.js';
import { normalizeStudentId } from './utils/normalize.js';
import { ensureAllDynamicParentAccounts } from './db/dbStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.join(__dirname, 'db', 'attendance_store.json');

// Find SQL file location
const possibleSqlPaths = [
  path.join(__dirname, '..', '..', 'students.sql'),
  path.join(__dirname, '..', '..', 'students (1).sql'),
  path.join(__dirname, '..', '..', 'students (2).sql'),
  'C:\\Users\\Windows\\Downloads\\students.sql',
  'C:\\Users\\Windows\\Downloads\\students (1).sql',
  'C:\\Users\\Windows\\Downloads\\students (2).sql'
];

let sqlFilePath = null;
for (const p of possibleSqlPaths) {
  if (fs.existsSync(p)) {
    sqlFilePath = p;
    break;
  }
}

if (!sqlFilePath) {
  console.error('❌ SQL file not found in expected locations!');
  process.exit(1);
}

console.log(`📄 Found SQL file at: ${sqlFilePath}`);
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

function parseStudentSql(content) {
  const students = [];
  // Match rows in INSERT INTO `students` ... VALUES (...)
  // Pattern matches tuple (id, 'term', 'enrollmentNo', 'name', 'sem', 'class', 'labBatch', 'tutBatch', status)
  const tupleRegex = /\(\s*(\d+)\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*(\d+)\s*\)/g;

  let match;
  while ((match = tupleRegex.exec(content)) !== null) {
    students.push({
      sql_id: parseInt(match[1]),
      term: match[2],
      enrollmentNo: match[3].trim(),
      name: match[4].trim(),
      sem: match[5].trim(),
      class: match[6].trim(),
      labBatch: match[7].trim(),
      tutBatch: match[8].trim(),
      status: parseInt(match[9])
    });
  }
  return students;
}

const parsedStudents = parseStudentSql(sqlContent);
console.log(`🔍 Total student records parsed from SQL file: ${parsedStudents.length}`);

// Load existing DB store
if (!fs.existsSync(dbFilePath)) {
  console.error(`❌ DB file not found at ${dbFilePath}`);
  process.exit(1);
}

const store = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));

if (!store.users) store.users = [];
if (!store.students) store.students = [];
if (!store.parents) store.parents = [];

// Prepare lookup sets for duplicate detection
const existingRollNumbers = new Set(
  store.students.map(s => normalizeStudentId(s.roll_number)).filter(Boolean)
);
const existingUsernames = new Set(
  store.users.map(u => normalizeStudentId(u.username)).filter(Boolean)
);

let importedCount = 0;
let duplicateCount = 0;

const defaultPasswordHash = hashPassword('password123');

parsedStudents.forEach(item => {
  const normEnrollment = normalizeStudentId(item.enrollmentNo);

  // Check if duplicate
  if (existingRollNumbers.has(normEnrollment) || existingUsernames.has(normEnrollment)) {
    duplicateCount++;
    return;
  }

  // Create User Record
  const newUserId = store.users.length > 0 ? Math.max(...store.users.map(u => u.id)) + 1 : 1;
  const userRecord = {
    id: newUserId,
    name: item.name,
    email: `${normEnrollment}@attendance.com`,
    username: normEnrollment,
    password_hash: defaultPasswordHash,
    role: 'student',
    phone: '+91 9876543210',
    status: item.status === 1 ? 'active' : 'inactive'
  };
  store.users.push(userRecord);
  existingUsernames.add(normEnrollment);

  // Create Student Record
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

  importedCount++;
});

// Run dynamic parent account generation and linking
ensureAllDynamicParentAccounts(store);

// Save updated store
fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), 'utf8');

console.log('--------------------------------------------------');
console.log(`✅ Import Complete!`);
console.log(`📥 Total records in SQL file: ${parsedStudents.length}`);
console.log(`✨ Newly imported students: ${importedCount}`);
console.log(`⚠️ Duplicate records skipped: ${duplicateCount}`);
console.log(`👥 Total users in DB store now: ${store.users.length}`);
console.log(`🎓 Total students in DB store now: ${store.students.length}`);
console.log(`👨‍👩‍👧 Total parents in DB store now: ${store.parents.length}`);
console.log('--------------------------------------------------');
