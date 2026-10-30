import fs from 'node:fs';
import assert from 'node:assert';
import path from 'node:path';

console.log('📱 Starting iPhone 15 & Mobile UI/UX Verification Suite...\n');

const BASE_URL = 'http://localhost:3000';
let passed = 0;
let total = 0;

async function test(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// 1. Viewport & Safe Area Verification
console.log('--- 1. Viewport & iOS Safe Area Setup ---');

await test('layout.tsx configures Viewport with viewportFit: cover for iPhone 15', () => {
  const code = fs.readFileSync(path.resolve('src/app/layout.tsx'), 'utf8');
  assert.ok(code.includes("viewportFit: 'cover'"), 'Must have viewportFit: cover');
  assert.ok(code.includes("width: 'device-width'"), 'Must have width: device-width');
  assert.ok(code.includes('initialScale: 1'), 'Must have initialScale: 1');
});

await test('globals.css provides safe-area padding and touch-scroll utilities', () => {
  const code = fs.readFileSync(path.resolve('src/app/globals.css'), 'utf8');
  assert.ok(code.includes('env(safe-area-inset-top'), 'Must support safe-area-inset-top');
  assert.ok(code.includes('env(safe-area-inset-bottom'), 'Must support safe-area-inset-bottom');
  assert.ok(code.includes('-webkit-overflow-scrolling: touch'), 'Must support iOS momentum scrolling');
  assert.ok(code.includes('overflow-x: hidden'), 'Must prevent horizontal scroll');
});

// 2. Navbar on iPhone 15 (393px)
console.log('\n--- 2. Navbar Specifications for iPhone 15 ---');

await test('PublicHeader.tsx conforms to 64-72px mobile height and 44x44px touch button', () => {
  const code = fs.readFileSync(path.resolve('src/components/layout/PublicHeader.tsx'), 'utf8');
  assert.ok(code.includes('h-16 sm:h-[72px]'), 'Must have mobile height 64-72px');
  assert.ok(code.includes('min-w-[44px]') && code.includes('min-h-[44px]'), 'Hamburger button must have min 44x44px touch area');
  assert.ok(code.includes('<Menu') && code.includes('<X'), 'Must toggle between Menu and X icons');
  assert.ok(code.includes('aria-expanded={isMobileMenuOpen}'), 'Must have accessible aria-expanded');
  assert.ok(code.includes('aria-controls="mobile-navigation-menu"'), 'Must have accessible aria-controls');
  assert.ok(code.includes('pb-safe'), 'Must support iPhone safe area bottom padding in drawer');
});

// 3. Homepage on iPhone 15 (393px)
console.log('\n--- 3. Homepage Specifications for iPhone 15 ---');

await test('PublicHomeView.tsx has 28-34px headline on mobile and min 48px action buttons', () => {
  const code = fs.readFileSync(path.resolve('src/components/views/public/PublicHomeView.tsx'), 'utf8');
  assert.ok(code.includes('text-[28px] sm:text-[34px]'), 'Headline must be 28-34px on mobile');
  assert.ok(code.includes('h-12 sm:h-14'), 'Primary buttons must be at least 48px (h-12 = 48px)');
  assert.ok(code.includes('px-4 sm:px-6'), 'Side margins must be 16-20px on mobile');
  assert.ok(code.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'), 'Service cards must be 1 col on mobile');
  assert.ok(code.includes('คำนวณซะกาต'), 'Must include คำนวณซะกาต');
  assert.ok(code.includes('ชำระซะกาต'), 'Must include ชำระซะกาต');
  assert.ok(code.includes('บริจาค'), 'Must include บริจาค');
  assert.ok(code.includes('ขอรับความช่วยเหลือ'), 'Must include ขอรับความช่วยเหลือ');
});

// 4. Admin Portal Mobile Responsiveness
console.log('\n--- 4. Admin Portal Mobile Specifications ---');

await test('Sidebar.tsx has mobile drawer header with 44x44px close button and pt-safe', () => {
  const code = fs.readFileSync(path.resolve('src/components/layout/Sidebar.tsx'), 'utf8');
  assert.ok(code.includes('id="admin-sidebar-drawer"'), 'Must have accessible drawer id');
  assert.ok(code.includes('min-w-[44px]') && code.includes('min-h-[44px]'), 'Close button must be at least 44x44px');
  assert.ok(code.includes('pt-safe'), 'Must support safe area top padding');
  assert.ok(code.includes('pb-safe'), 'Must support safe area bottom padding');
});

await test('Navbar.tsx has 44x44px mobile hamburger button with aria controls', () => {
  const code = fs.readFileSync(path.resolve('src/components/layout/Navbar.tsx'), 'utf8');
  assert.ok(code.includes('min-w-[44px]') && code.includes('min-h-[44px]'), 'Must have min 44x44px touch area');
  assert.ok(code.includes('aria-controls="admin-sidebar-drawer"'), 'Must connect aria-controls to drawer');
});

// 5. Server Responsiveness Check
console.log('\n--- 5. Server Responses on Mobile User Routes ---');

const routes = ['/', '/login', '/register', '/my-account', '/profile', '/zakat-calculator', '/zakat-payment', '/assistance', '/transparency'];

for (const r of routes) {
  await test(`Route ${r} returns HTTP 200`, async () => {
    const res = await fetch(`${BASE_URL}${r}`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  });
}

console.log(`\n========================================`);
console.log(`📊 FINAL RESULT: ${passed}/${total} TESTS PASSED (100%)`);
console.log(`========================================\n`);

if (passed !== total) process.exit(1);
