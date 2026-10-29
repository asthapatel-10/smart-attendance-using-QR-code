import http from 'http';
import { handleApiRequest } from './apiHandler.js';
import { loadStore, getStore } from './db/dbStore.js';

loadStore();
const store = getStore();

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathName = parsedUrl.pathname;
  const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());

  let bodyData = '';
  req.on('data', chunk => bodyData += chunk);
  req.on('end', () => {
    let body = {};
    try {
      if (bodyData) body = JSON.parse(bodyData);
    } catch (e) {
      body = {};
    }
    handleApiRequest(req, res, pathName, queryParams, body);
  });
});

function makeRequest(port, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ ...options, port }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

export async function runVerification() {
  const PORT = 5035;
  await new Promise(resolve => server.listen(PORT, '0.0.0.0', resolve));

  console.log('==================================================');
  console.log('📊 IMPORTED STUDENT & PARENT VERIFICATION SUITE');
  console.log('==================================================\n');

  const stats = store.lastImportStats || {};
  console.log(`📥 Total records in SQL file: ${stats.totalInSql || 'N/A'}`);
  console.log(`✨ Total newly imported students: ${stats.imported || 0}`);
  console.log(`⚠️ Total duplicate records skipped: ${stats.skipped || 0}`);
  console.log(`🎓 Total students currently in store: ${store.students.length}`);
  console.log(`👥 Total users currently in store: ${store.users.length}`);
  console.log(`👨‍👩‍👧 Total parents currently in store: ${store.parents.length}`);
  console.log('\n--------------------------------------------------\n');

  const testStudents = [
    { enrollmentNo: '226310307007', expectedName: 'BHATT DHAIRYA MUKESHKUMAR' },
    { enrollmentNo: '246310307003', expectedName: 'BELIM MAHAMMADHAMZA IBRAHIMBHAI' },
    { enrollmentNo: '246310307006', expectedName: 'CHAUDHARY JAYESHKUMAR BABUBHAI' }
  ];

  let testResults = [];

  // 1. Test Student Logins & Parent Logins
  for (const s of testStudents) {
    console.log(`🔍 Testing Student: ${s.enrollmentNo} (${s.expectedName})`);

    // Student Login
    const sLogin = await makeRequest(PORT, {
      hostname: 'localhost', path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: s.enrollmentNo, password: 'password123', role: 'student' });

    const sPass = sLogin.status === 200 && sLogin.data.success && sLogin.data.user.name.includes(s.expectedName.split(' ')[0]);
    console.log(`   - Student Login: ${sPass ? '✅ PASS' : '❌ FAIL'}`);

    // Parent Login using Student ID
    const pLogin = await makeRequest(PORT, {
      hostname: 'localhost', path: '/api/parent/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { student_id: s.enrollmentNo, password: 'parent123' });

    const pPass = pLogin.status === 200 && pLogin.data.success && pLogin.data.token;
    console.log(`   - Parent Login:  ${pPass ? '✅ PASS' : '❌ FAIL'}`);

    testResults.push({
      enrollmentNo: s.enrollmentNo,
      name: s.expectedName,
      studentLogin: sPass,
      parentLogin: pPass,
      parentToken: pLogin.data ? pLogin.data.token : null
    });
  }

  console.log('\n--------------------------------------------------');
  console.log('🔒 Testing Parent Data Isolation');
  console.log('--------------------------------------------------');

  const token1 = testResults[0].parentToken;
  const token2 = testResults[1].parentToken;

  if (token1 && token2) {
    // Parent 1 fetches profile
    const prof1 = await makeRequest(PORT, {
      hostname: 'localhost', path: '/api/parent/profile', method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });

    // Parent 2 fetches profile
    const prof2 = await makeRequest(PORT, {
      hostname: 'localhost', path: '/api/parent/profile', method: 'GET',
      headers: { 'Authorization': `Bearer ${token2}` }
    });

    const name1 = prof1.data?.student?.name;
    const name2 = prof2.data?.student?.name;

    console.log(`Parent 1 sees student name: "${name1}"`);
    console.log(`Parent 2 sees student name: "${name2}"`);

    const isolated = name1 !== name2 && name1.includes('BHATT') && name2.includes('BELIM');
    console.log(`Data Isolation Status: ${isolated ? '✅ VERIFIED STRICTLY ISOLATED' : '❌ ISOLATION FAILED'}`);
  }

  console.log('\n--------------------------------------------------');
  console.log('👨‍💼 Verifying Admin Student List API');
  console.log('--------------------------------------------------');

  const adminLog = await makeRequest(PORT, {
    hostname: 'localhost', path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'admin123', role: 'admin' });

  if (adminLog.data?.token) {
    const listRes = await makeRequest(PORT, {
      hostname: 'localhost', path: '/api/students', method: 'GET',
      headers: { 'Authorization': `Bearer ${adminLog.data.token}` }
    });
    console.log(`Admin list returned ${listRes.data?.students?.length || 0} total students.`);
    const foundAllTest = testStudents.every(ts => listRes.data?.students?.some(st => st.roll_number === ts.enrollmentNo));
    console.log(`Admin List Contains Imported Students: ${foundAllTest ? '✅ VERIFIED' : '❌ FAILED'}`);
  }

  server.close();
  return { stats, testResults };
}

runVerification().catch(console.error);
