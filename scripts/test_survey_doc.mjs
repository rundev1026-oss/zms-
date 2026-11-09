import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-change-me';
const SYSTEM_ADMIN_ID = process.env.SYSTEM_ADMIN_ID || 'dffb49d1-7cf3-4593-bb58-a82b25f5bff4';

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

async function testSurveyDoc() {
  const token = createServiceToken();
  const id = '9115f11f-5efd-49f2-b6fc-0a0c0ebb8dc4';
  const res = await fetch(`http://localhost:3000/api/registry/${id}/survey-document`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  console.log('Survey document response:', json.success, json.error || { name: json.fullName, reg: json.registryNumber });
  if (json.html) {
    console.log('HTML length:', json.html.length);
    if (json.html.includes('นาย นาย') || json.html.includes('นางสาว นางสาว')) {
      console.log('[ALERT] Found duplicate prefix in rendered HTML!');
    } else {
      console.log('[OK] No duplicate prefix in rendered HTML.');
    }
  }
}

testSurveyDoc().catch(console.error);
