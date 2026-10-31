const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const secretFile = path.join(root, 'backups', 'bootstrap-super-admin.txt');
const secret = fs.readFileSync(secretFile, 'utf8');
const password = (secret.match(/^password=(.*)$/m) || [])[1];
if (!password) {
  console.error('missing-secret');
  process.exit(1);
}

async function main() {
  const login = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@zms.local', password }),
  });
  const loginBody = await login.json();
  if (!login.ok || !loginBody.accessToken) {
    console.error('login-failed', login.status);
    process.exit(1);
  }
  const headers = { Authorization: `Bearer ${loginBody.accessToken}` };
  const listRes = await fetch('http://localhost:4000/api/v1/beneficiaries?page=1&pageSize=50', { headers });
  const list = await listRes.json();
  const items = Array.isArray(list.items) ? list.items : Array.isArray(list.data) ? list.data : Array.isArray(list) ? list : [];
  if (!items.length) {
    console.error('empty-list', listRes.status, Object.keys(list || {}));
    process.exit(1);
  }
  const preferred = items.find((item) => item.registryNumber === 'ZMS-2026-000012') || items[0];
  if (!preferred?.id) {
    console.error('no-registry', listRes.status);
    process.exit(1);
  }
  const pdfRes = await fetch(`http://localhost:3000/api/registry/${preferred.id}/survey-document/pdf`, { headers });
  if (!pdfRes.ok) {
    const text = await pdfRes.text();
    console.error('pdf-failed', pdfRes.status, text.slice(0, 400));
    process.exit(1);
  }
  const bytes = Buffer.from(await pdfRes.arrayBuffer());
  const out = path.join(__dirname, `${preferred.registryNumber}.pdf`);
  fs.writeFileSync(out, bytes);
  console.log(JSON.stringify({
    registryNumber: preferred.registryNumber,
    bytes: bytes.length,
    pdf: bytes.slice(0, 5).toString() === '%PDF-',
    pagesHeader: pdfRes.headers.get('x-registry-number'),
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
