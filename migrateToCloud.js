import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'attendance_store.json');
const backupPath = path.join(__dirname, 'attendance_store.backup.json');

console.log('========================================================');
console.log('☁️ SMART ATTENDANCE SYSTEM — SAFE CLOUD DATABASE MIGRATION');
console.log('========================================================');

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set in environment or .env file.');
    console.log('\nTo migrate your data to free MongoDB Atlas:');
    console.log('1. Create your free cluster at https://www.mongodb.com/cloud/atlas');
    console.log('2. Copy your connection string into .env:');
    console.log('   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/smart_attendance?retryWrites=true&w=majority');
    console.log('3. Re-run: npm run migrate:cloud\n');
    process.exit(1);
  }

  // 1. Verify source and backup
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Source database file not found at: ${dbPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(backupPath)) {
    console.log('⚠️ Primary backup not found. Creating backup before migration...');
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Backup created at: ${backupPath}`);
  }

  const rawLocal = fs.readFileSync(dbPath, 'utf8');
  let localData;
  try {
    localData = JSON.parse(rawLocal);
  } catch (e) {
    console.error('❌ Could not parse local database as valid JSON:', e.message);
    process.exit(1);
  }

  console.log('📁 Local database loaded.');
  console.log(`• Local Users: ${(localData.users || []).length}`);
  console.log(`• Local Students: ${(localData.students || []).length}`);
  console.log(`• Local Attendance Records: ${(localData.attendance || []).length}`);

  // 2. Dynamically import mongodb driver
  let MongoClient;
  try {
    const mongoModule = await import('mongodb');
    MongoClient = mongoModule.MongoClient;
  } catch (err) {
    console.error('❌ mongodb package is not installed. Please run: npm install mongodb');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB_NAME || 'smart_attendance';
  const collName = process.env.MONGODB_COLLECTION || 'system_store';

  console.log(`\n⏳ Connecting to MongoDB Atlas cluster...`);
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    await client.connect();
    console.log('✅ Connected successfully to MongoDB Atlas.');

    const db = client.db(dbName);
    const collection = db.collection(collName);

    // Check if cloud data already exists
    const existingDoc = await collection.findOne({ _id: 'store_data' });
    if (existingDoc && existingDoc.data) {
      console.log('ℹ️ Cloud database already contains existing data.');
      console.log(`• Existing Cloud Users: ${(existingDoc.data.users || []).length}`);
      console.log(`• Existing Cloud Attendance: ${(existingDoc.data.attendance || []).length}`);
    }

    console.log('⏳ Uploading local records to MongoDB Atlas...');
    const now = new Date().toISOString();
    const updateResult = await collection.updateOne(
      { _id: 'store_data' },
      {
        $set: {
          data: localData,
          migrated_at: now,
          version: '2.0.0'
        }
      },
      { upsert: true }
    );

    console.log('✅ Upload complete. Verifying cloud record integrity...');

    // Read back from cloud and verify
    const verifiedDoc = await collection.findOne({ _id: 'store_data' });
    if (!verifiedDoc || !verifiedDoc.data) {
      throw new Error('Verification failed: Could not retrieve uploaded document from MongoDB Atlas.');
    }

    const cloudData = verifiedDoc.data;
    console.log('\n--- CLOUD VERIFICATION REPORT ---');
    console.log(`• Cloud Users:           ${(cloudData.users || []).length}`);
    console.log(`• Cloud Students:        ${(cloudData.students || []).length}`);
    console.log(`• Cloud Faculty:         ${(cloudData.faculty || []).length}`);
    console.log(`• Cloud Mentors:         ${(cloudData.mentors || []).length}`);
    console.log(`• Cloud Parents:         ${(cloudData.parents || []).length}`);
    console.log(`• Cloud HODs:            ${(cloudData.hods || []).length}`);
    console.log(`• Cloud Timetable Slots: ${(cloudData.timetable || []).length}`);
    console.log(`• Cloud Attendance Logs: ${(cloudData.attendance || []).length}`);
    console.log('---------------------------------');

    if ((cloudData.users || []).length === (localData.users || []).length &&
        (cloudData.attendance || []).length === (localData.attendance || []).length) {
      console.log('🎉 SUCCESS: All records successfully persisted to MongoDB Atlas!');
      console.log('Your Render deployment will now persist data across restarts and sleep cycles.');
    } else {
      console.warn('⚠️ Warning: Record counts between local and cloud differ. Please check manually.');
    }
  } catch (err) {
    console.error('❌ Cloud migration error:', err.message);
  } finally {
    await client.close();
  }
}

runMigration();
