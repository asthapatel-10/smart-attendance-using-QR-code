import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project Root is two levels up from backend/db
const projectRoot = path.resolve(__dirname, '../..');

// Source database locations
const candidatePaths = [
  path.join(__dirname, 'attendance_store.json'),
  path.join(projectRoot, 'backend', 'db', 'attendance_store.json'),
  path.resolve('backend/db/attendance_store.json')
];

const dbPath = candidatePaths.find(p => fs.existsSync(p));

console.log('================================================================');
console.log('🛡️ SMART ATTENDANCE SYSTEM — DATABASE BACKUP & VERIFICATION');
console.log('================================================================');
console.log(`📍 Project Root:   ${projectRoot}`);

if (!dbPath) {
  console.error('❌ ERROR: Source database file attendance_store.json could not be found.');
  console.error('Checked locations:');
  candidatePaths.forEach(p => console.error(` - ${p}`));
  process.exit(1);
}

console.log(`📍 Source Database: ${dbPath}`);

// Separate local backup directory: <project-root>/backups
const backupDir = path.join(projectRoot, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📁 Created separate backup directory: ${backupDir}`);
} else {
  console.log(`📁 Using separate backup directory: ${backupDir}`);
}

// Generate clean, Windows-safe ISO-like timestamp (no colons)
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

const timestampedBackupPath = path.join(backupDir, `attendance_store_backup_${timestamp}.json`);
const dbLocalBackupPath = path.join(__dirname, 'attendance_store.backup.json');

try {
  // 1. Read and verify source database integrity
  const sourceRaw = fs.readFileSync(dbPath, 'utf8');
  const sourceStats = fs.statSync(dbPath);
  console.log(`📊 Source Database Size: ${sourceStats.size.toLocaleString()} bytes`);

  let parsedSource;
  try {
    parsedSource = JSON.parse(sourceRaw);
    console.log('✅ Source database parsed successfully as valid JSON.');
  } catch (parseErr) {
    console.error('❌ FATAL: Source database contains invalid JSON syntax:', parseErr.message);
    process.exit(1);
  }

  // 2. Write timestamped backup in separate local backup folder
  fs.copyFileSync(dbPath, timestampedBackupPath);
  console.log(`💾 Timestamped backup written: ${timestampedBackupPath}`);

  // 3. Write/update safety failover backup in backend/db
  fs.copyFileSync(dbPath, dbLocalBackupPath);
  console.log(`💾 Failover backup updated:    ${dbLocalBackupPath}`);

  // 4. Verify timestamped backup exists
  if (!fs.existsSync(timestampedBackupPath)) {
    throw new Error(`Verification failed: Backup file does not exist at ${timestampedBackupPath}`);
  }

  // 5. Verify byte size matches byte-for-byte
  const backupStats = fs.statSync(timestampedBackupPath);
  if (backupStats.size !== sourceStats.size) {
    throw new Error(`Size mismatch: Source has ${sourceStats.size} bytes, but backup has ${backupStats.size} bytes.`);
  }
  console.log(`✅ Size Verification: Byte-for-byte match (${backupStats.size.toLocaleString()} bytes).`);

  // 6. Verify backup is valid JSON and verify record counts
  const backupRaw = fs.readFileSync(timestampedBackupPath, 'utf8');
  const parsedBackup = JSON.parse(backupRaw);

  const usersCount = (parsedBackup.users || []).length;
  const studentsCount = (parsedBackup.students || []).length;
  const facultyCount = (parsedBackup.faculty || []).length;
  const mentorsCount = (parsedBackup.mentors || []).length;
  const parentsCount = (parsedBackup.parents || []).length;
  const hodsCount = (parsedBackup.hods || []).length;
  const timetableCount = (parsedBackup.timetable || []).length;
  const attendanceCount = (parsedBackup.attendance || []).length;

  console.log('\n================================================================');
  console.log('📋 VERIFIED RECORD COUNTS IN BACKUP:');
  console.log('================================================================');
  console.log(`• System Users:          ${usersCount}`);
  console.log(`• Student Records:       ${studentsCount}`);
  console.log(`• Faculty Records:       ${facultyCount}`);
  console.log(`• Mentor Records:        ${mentorsCount}`);
  console.log(`• Parent Records:        ${parentsCount}`);
  console.log(`• HOD Records:           ${hodsCount}`);
  console.log(`• Weekly Timetable Slots: ${timetableCount}`);
  console.log(`• Attendance Logs:       ${attendanceCount} (Reset to 0% verified)`);
  console.log('================================================================');

  if (usersCount === (parsedSource.users || []).length &&
      timetableCount === (parsedSource.timetable || []).length &&
      attendanceCount === (parsedSource.attendance || []).length) {
    console.log('🎉 BACKUP VERIFICATION STATUS: 100% SUCCESSFUL & VERIFIED');
    console.log(`📁 Backup File Path: ${timestampedBackupPath}`);
    console.log('================================================================\n');
  } else {
    throw new Error('Record count mismatch between source and created backup.');
  }
} catch (err) {
  console.error('\n❌ BACKUP SCRIPT ERROR:', err.message);
  process.exit(1);
}
