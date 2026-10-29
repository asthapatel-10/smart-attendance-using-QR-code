import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlFilePath = 'C:\\Users\\Windows\\Downloads\\students.sql';
const dbFilePath = path.join(__dirname, 'db', 'attendance_store.json');

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

console.log(`Parsed SQL Rows count: ${parsedStudents.length}`);
console.log(`Store Users count: ${store.users.length}`);
console.log(`Store Students count: ${store.students.length}`);
console.log(`Store Parents count: ${store.parents.length}`);
