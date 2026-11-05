const crypto = require('crypto');
const http = require('http');

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-change-me-zms-enterprise-2026';
const SYSTEM_ADMIN_ID = process.env.SYSTEM_ADMIN_ID || '0b4b3ae1-b1d6-49cb-a947-3ce94ff24516';

function createServiceToken(userId = SYSTEM_ADMIN_ID) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: now + 3600, iat: now }),
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

const token = createServiceToken();
const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/admin/roles',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response with service token:', res.statusCode, data.substring(0, 300)));
});
req.on('error', (e) => console.error(e));
req.end();

