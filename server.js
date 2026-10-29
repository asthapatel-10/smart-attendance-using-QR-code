import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleApiRequest } from './apiHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

const server = http.createServer(async (req, res) => {
  // 1. CORS Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathName = parsedUrl.pathname;
  const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());

  // 2. REST API Request
  if (pathName.startsWith('/api/')) {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', async () => {
      let body = {};
      try {
        if (bodyData) body = JSON.parse(bodyData);
      } catch (e) {
        body = {};
      }
      try {
        await handleApiRequest(req, res, pathName, queryParams, body);
      } catch (err) {
        console.error('⚠️ Unhandled API Error:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        }
        res.end(JSON.stringify({ success: false, message: 'Server internal error: ' + err.message }));
      }
    });
    return;
  }

  // 3. Serve Frontend Web Dashboard
  const frontendPath = path.join(__dirname, '../frontend/index.html');
  if (fs.existsSync(frontendPath)) {
    const htmlContent = fs.readFileSync(frontendPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(htmlContent);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`<h1>Smart Attendance System Backend API</h1><p>API status: Online on port ${PORT}</p>`);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Smart Attendance System Server listening on http://localhost:${PORT}`);
});
