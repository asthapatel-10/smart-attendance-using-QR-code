import { loadStore, getStore } from './db/dbStore.js';

loadStore();
const store = getStore();

console.log('==================================================');
console.log('📊 DATABASE STORE IMPORT SUMMARY');
console.log('==================================================');

const stats = store.lastImportStats || {};
console.log(`📥 Total student records in SQL file: ${stats.totalInSql || 0}`);
console.log(`✨ Total newly imported students:     ${stats.imported || 0}`);
console.log(`⚠️ Total duplicate records skipped:   ${stats.skipped || 0}`);
console.log('--------------------------------------------------');
console.log(`🎓 Total students in DB store:        ${store.students.length}`);
console.log(`👥 Total users in DB store:           ${store.users.length}`);
console.log(`👨‍👩‍👧 Total parents in DB store:         ${store.parents.length}`);
console.log('==================================================\n');

// Sample test students
const testEnrollmentNumbers = ['226310307007', '246310307003', '246310307006'];

console.log('🔍 Testing Sample Imported Students:');
testEnrollmentNumbers.forEach(roll => {
  const stu = store.students.find(s => s.roll_number === roll);
  const usr = store.users.find(u => u.username === roll && u.role === 'student');
  const parentRec = store.parents.find(p => p.student_user_id === (usr ? usr.id : null));
  const parentUsr = parentRec ? store.users.find(u => u.id === parentRec.user_id) : null;

  console.log(`\n📌 Student Enrollment No: ${roll}`);
  console.log(`   - Student Name:   ${usr ? usr.name : 'NOT FOUND'}`);
  console.log(`   - Semester:       ${stu ? stu.semester : 'N/A'}`);
  console.log(`   - Class/Section:  ${stu ? stu.section : 'N/A'}`);
  console.log(`   - Lab Batch:      ${stu ? stu.labBatch : 'N/A'}`);
  console.log(`   - Tut Batch:      ${stu ? stu.tutBatch : 'N/A'}`);
  console.log(`   - Term:           ${stu ? stu.term : 'N/A'}`);
  console.log(`   - Student Login:  Username=${usr?.username}, Role=${usr?.role}, Status=${usr?.status}`);
  console.log(`   - Linked Parent:  Username=${parentUsr?.username}, ID=${parentUsr?.id}, Linked Student User ID=${parentRec?.student_user_id}`);
});
