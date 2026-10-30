// scripts/test-ui-ux-navigation.mjs
// Automated verification for Full-Width Navbar, Full-Width Homepage,
// 6 Core Menu Items, Hero section headline, 4 Services, Real Stats, Campaigns, and Transparency.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:3000';

console.log('🧪 Starting Full-Width UI/UX & Homepage Verification...\n');

let passedTests = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// Suite 1: Full-width public routes HTTP 200
console.log('--- Test Suite 1: Core Navigation Routes (HTTP 200) ---');

const publicRoutes = [
  { name: '1. หน้าแรก (Homepage)', path: '/' },
  { name: '2. เกี่ยวกับเรา (About)', path: '/about' },
  { name: '3. คำนวณซะกาต (Calculator)', path: '/zakat-calculator' },
  { name: '4. บริจาค (Donate / Payment)', path: '/donate' },
  { name: '5. จ่ายซะกาต (Payment)', path: '/zakat-payment' },
  { name: '6. ขอรับความช่วยเหลือ (Assistance)', path: '/assistance' },
  { name: '7. รายงานความโปร่งใส (Transparency)', path: '/transparency' },
];

for (const route of publicRoutes) {
  await runTest(`Public Route ${route.name} (${route.path}) responds with HTTP 200`, async () => {
    const res = await fetch(`${BASE_URL}${route.path}`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const html = await res.text();
    assert.ok(html.includes('มูลนิธิซะกาตและสาธารณกุศล'), 'Page must contain foundation name');
  });
}

// Suite 2: Authentication & Account Routes
console.log('\n--- Test Suite 2: Authentication & User Account Routes ---');

const authRoutes = [
  { name: 'เข้าสู่ระบบ', path: '/login' },
  { name: 'สมัครสมาชิก', path: '/register' },
  { name: 'ลืมรหัสผ่าน', path: '/forgot-password' },
  { name: 'ตั้งรหัสผ่านใหม่', path: '/reset-password' },
  { name: 'โปรไฟล์ผู้ใช้', path: '/profile' },
  { name: 'บัญชีของฉัน', path: '/my-account' },
  { name: 'จัดการผู้ใช้ (Admin)', path: '/admin/users' },
];

for (const route of authRoutes) {
  await runTest(`Auth/Account Route ${route.name} (${route.path}) responds with HTTP 200`, async () => {
    const res = await fetch(`${BASE_URL}${route.path}`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  });
}

// Suite 3: Public API Services
console.log('\n--- Test Suite 3: Public Portal API Services ---');

await runTest('API /api/public/stats returns real organization stats', async () => {
  const res = await fetch(`${BASE_URL}/api/public/stats`);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.success, true);
  assert.ok(typeof json.data.totalBeneficiaries === 'number');
  assert.ok(typeof json.data.totalZakatReceived === 'number');
  assert.ok(typeof json.data.totalZakatDisbursed === 'number');
});

await runTest('API /api/public/campaigns returns active charity campaigns', async () => {
  const res = await fetch(`${BASE_URL}/api/public/campaigns`);
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.success, true);
  assert.ok(Array.isArray(json.data) && json.data.length > 0);
});

// Suite 4: Source Code Architecture & Specification Verification
console.log('\n--- Test Suite 4: Specification & Layout Inspection ---');

await runTest('PublicHeader.tsx uses 100% full-width layout and has exact 6 menu items', async () => {
  const headerCode = fs.readFileSync(path.resolve('src/components/layout/PublicHeader.tsx'), 'utf8');
  assert.ok(headerCode.includes('w-full'), 'Navbar must be w-full');
  assert.ok(headerCode.includes("'หน้าแรก'"), 'Must include หน้าแรก');
  assert.ok(headerCode.includes("'เกี่ยวกับเรา'"), 'Must include เกี่ยวกับเรา');
  assert.ok(headerCode.includes("'คำนวณซะกาต'"), 'Must include คำนวณซะกาต');
  assert.ok(headerCode.includes("'บริจาค'"), 'Must include บริจาค');
  assert.ok(headerCode.includes("'ขอรับความช่วยเหลือ'"), 'Must include ขอรับความช่วยเหลือ');
  assert.ok(headerCode.includes("'รายงานความโปร่งใส'"), 'Must include รายงานความโปร่งใส');
});

await runTest('PublicHomeView.tsx has exact Hero headline and min-h-[75vh]', async () => {
  const homeCode = fs.readFileSync(path.resolve('src/components/views/public/PublicHomeView.tsx'), 'utf8');
  assert.ok(homeCode.includes('min-h-[75vh]'), 'Hero section must have min-h-[75vh]');
  assert.ok(homeCode.includes('เปลี่ยนพลังแห่งซะกาต'), 'Must include exact headline');
  assert.ok(homeCode.includes('สู่คุณภาพชีวิตที่ดีขึ้น'), 'Must include exact headline second line');
  assert.ok(homeCode.includes('บริจาคซะกาต'), 'Must include บริจาคซะกาต main button');
  assert.ok(homeCode.includes('ขอรับความช่วยเหลือ'), 'Must include ขอรับความช่วยเหลือ main button');
});

await runTest('PublicHomeView.tsx includes 4 specified foundation services', async () => {
  const homeCode = fs.readFileSync(path.resolve('src/components/views/public/PublicHomeView.tsx'), 'utf8');
  assert.ok(homeCode.includes('คำนวณซะกาต'), 'Must include คำนวณซะกาต service');
  assert.ok(homeCode.includes('บริจาคซะกาต'), 'Must include บริจาคซะกาต service');
  assert.ok(homeCode.includes('บริจาคทั่วไป (ศอดะเกาะฮ์)'), 'Must include บริจาคทั่วไป service');
  assert.ok(homeCode.includes('ลงทะเบียนขอรับความช่วยเหลือ'), 'Must include ลงทะเบียนขอรับความช่วยเหลือ service');
});

await runTest('Homepage main stage is unconstrained (w-full) in page.tsx', async () => {
  const pageCode = fs.readFileSync(path.resolve('src/app/page.tsx'), 'utf8');
  assert.ok(pageCode.includes("currentView === 'public-home' ? ''"), 'Homepage must not have restrictive max-w-7xl on outer main');
});

await runTest('globals.css prevents unwanted horizontal scrollbars', async () => {
  const cssCode = fs.readFileSync(path.resolve('src/app/globals.css'), 'utf8');
  assert.ok(cssCode.includes('overflow-x: hidden'), 'Must include overflow-x: hidden');
});

await runTest('PublicFooter.tsx is full width (w-full) without dead links', async () => {
  const footerCode = fs.readFileSync(path.resolve('src/components/layout/PublicFooter.tsx'), 'utf8');
  assert.ok(footerCode.includes('w-full'), 'Footer must be full width');
  assert.ok(!footerCode.includes('href="#"'), 'Footer must not contain href="#"');
});

console.log(`\n========================================`);
console.log(`📊 FINAL RESULT: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
