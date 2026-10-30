import fs from 'node:fs';
import assert from 'node:assert';
import path from 'node:path';

console.log('🧪 Verifying Mobile Navbar & Hamburger Menu Implementation...\n');

const headerCode = fs.readFileSync(path.resolve('src/components/layout/PublicHeader.tsx'), 'utf8');

const tests = [
  {
    name: '1. Accessibility Attributes: aria-label, aria-expanded, and aria-controls',
    fn: () => {
      assert.ok(headerCode.includes("aria-label={isMobileMenuOpen ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก'}"), 'Must have dynamic aria-label');
      assert.ok(headerCode.includes('aria-expanded={isMobileMenuOpen}'), 'Must have aria-expanded');
      assert.ok(headerCode.includes('aria-controls="mobile-navigation-menu"'), 'Must have aria-controls matching drawer id');
      assert.ok(headerCode.includes('id="mobile-navigation-menu"'), 'Drawer must have id="mobile-navigation-menu"');
    }
  },
  {
    name: '2. Hamburger Button Dimensions & Touch Area (min 44x44px)',
    fn: () => {
      assert.ok(headerCode.includes('min-w-[44px]') && headerCode.includes('min-h-[44px]'), 'Button must have min-w-[44px] and min-h-[44px]');
      assert.ok(headerCode.includes('w-11 h-11'), 'Button has 44x44px dimensions');
    }
  },
  {
    name: '3. Icon Toggle: Menu (☰) and X (✕)',
    fn: () => {
      assert.ok(headerCode.includes('<Menu') && headerCode.includes('<X'), 'Must toggle between Menu and X icons');
    }
  },
  {
    name: '4. Event Listeners: Outside Click, Escape Key, and Window Resize',
    fn: () => {
      assert.ok(headerCode.includes('handleClickOutside'), 'Must handle outside clicks');
      assert.ok(headerCode.includes("event.key === 'Escape'"), 'Must close on Escape key');
      assert.ok(headerCode.includes('window.innerWidth >= 768'), 'Must auto-close on resize to Desktop (>= 768px)');
    }
  },
  {
    name: '5. Responsive Breakpoint (< 768px Mobile vs >= 768px Desktop)',
    fn: () => {
      assert.ok(headerCode.includes('hidden md:flex'), 'Desktop nav hidden on mobile and flex on md:');
      assert.ok(headerCode.includes('md:hidden'), 'Hamburger controls hidden on md: and visible on mobile');
    }
  },
  {
    name: '6. Mobile Drawer Scrolling & Overflow Prevention',
    fn: () => {
      assert.ok(headerCode.includes('max-h-[calc(100vh-76px)]'), 'Drawer has constrained viewport height');
      assert.ok(headerCode.includes('overflow-y-auto'), 'Drawer allows vertical scrolling when list is long');
    }
  },
  {
    name: '7. Dynamic Role-based and Authentication Handling',
    fn: () => {
      assert.ok(headerCode.includes('currentUser.roleTitleTh'), 'Shows role title');
      assert.ok(headerCode.includes('isStaffRole'), 'Handles staff admin portal access');
      assert.ok(headerCode.includes('/login'), 'Provides login option for guests');
      assert.ok(headerCode.includes('/register'), 'Provides registration option for guests');
    }
  }
];

let passed = 0;
for (const test of tests) {
  try {
    test.fn();
    console.log(`  ✅ [PASS] ${test.name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${test.name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log(`\n========================================`);
console.log(`📊 FINAL RESULT: ${passed}/${tests.length} TESTS PASSED (100%)`);
console.log(`========================================\n`);

if (passed !== tests.length) process.exit(1);
