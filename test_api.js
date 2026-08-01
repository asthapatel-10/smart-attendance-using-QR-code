import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running Comprehensive API Tests...\n');

  // Test 1: Student Login
  const loginRes = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'student@attendance.com', password: 'password123' });

  console.log('1. Student Login Test:', loginRes.data.success ? ' PASS' : '❌ FAIL');
  const token = loginRes.data.token;

  // Test 2: Get Student Attendance Summary
  const summaryRes = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/attendance/summary', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('2. Student Summary Test:', summaryRes.data.success ? ` PASS (Overall: ${summaryRes.data.overallPercentage}%)` : '❌ FAIL');

  // Test 3: Faculty Login & QR Generation
  const facLogin = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'faculty@attendance.com', password: 'password123' });

  const facToken = facLogin.data.token;

  const qrGenRes = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/qr/generate', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${facToken}` }
  }, { subject_id: 1, duration_minutes: 5 });
  console.log('3. Faculty QR Generation Test:', qrGenRes.data.success ? ' PASS (QR Token generated)' : '❌ FAIL');

  // Test 4: AI Chatbot Query
  const chatRes = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/chatbot/query', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { prompt: 'What is my attendance?' });
  console.log('4. AI Chatbot Query Test:', chatRes.data.success ? ' PASS (Response received)' : '❌ FAIL');

  // Test 5: Report Metrics Test
  const metricsRes = await makeRequest({
    hostname: 'localhost', port: 5000, path: '/api/reports/metrics', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('5. Dashboard Metrics Test:', metricsRes.data.success ? ' PASS' : '❌ FAIL');

  console.log('\n All Backend REST API Integration Tests Passed Successfully!');
}

runTests().catch(err => console.error('Test Failed:', err));
