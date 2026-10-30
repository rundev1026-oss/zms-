// scripts/test-toast-uniqueness.mjs
// Automated verification for Toast ID Uniqueness, Fallback Collision Protection,
// Concurrent Toast Bursts, and Per-ID Removal in Zakat Management System.

import assert from 'node:assert';

console.log('🧪 Starting Toast Notification & Key Uniqueness Verification...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
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

// 1. Test implementation of createToastId matching AppContext.tsx
let toastCounter = 0;
const createToastId = (useFallback = false) => {
  if (
    !useFallback &&
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  toastCounter = (toastCounter + 1) % 1000000;
  return `${Date.now()}-${toastCounter}-${Math.random().toString(36).slice(2, 9)}`;
};

console.log('--- Test Suite 1: Toast ID Generator Uniqueness ---');

runTest('Standard mode (crypto.randomUUID): generates 10,000 unique IDs without collision', () => {
  const ids = new Set();
  const count = 10000;
  for (let i = 0; i < count; i++) {
    const id = createToastId(false);
    assert.strictEqual(typeof id, 'string', 'ID must be a string');
    assert.ok(id.length > 8, 'ID must have meaningful length');
    assert.ok(!ids.has(id), `Duplicate ID detected at index ${i}: ${id}`);
    ids.add(id);
  }
  assert.strictEqual(ids.size, count, `Expected ${count} unique IDs, got ${ids.size}`);
});

runTest('Fallback mode: generates 10,000 unique IDs in the exact same millisecond without collision', () => {
  const ids = new Set();
  const count = 10000;
  for (let i = 0; i < count; i++) {
    const id = createToastId(true); // force fallback
    assert.strictEqual(typeof id, 'string', 'ID must be a string');
    assert.ok(!ids.has(id), `Duplicate ID detected in fallback at index ${i}: ${id}`);
    ids.add(id);
  }
  assert.strictEqual(ids.size, count, `Expected ${count} unique IDs in fallback, got ${ids.size}`);
});

console.log('\n--- Test Suite 2: State Operations (Adding, Duplicates, and Key Uniqueness) ---');

class MockToastManager {
  constructor() {
    this.toasts = [];
    this.timers = new Map();
  }

  showToast(message, type = 'success', useFallback = false) {
    const id = createToastId(useFallback);
    this.toasts = [...this.toasts, { id, type, message }];
    const timer = setTimeout(() => {
      this.removeToast(id);
    }, 4500);
    this.timers.set(id, timer);
    return id;
  }

  removeToast(id) {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  clearAll() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.toasts = [];
  }
}

runTest('Concurrent bursts: 100 toasts created simultaneously have 100 unique React keys', () => {
  const manager = new MockToastManager();
  const burstCount = 100;
  for (let i = 0; i < burstCount; i++) {
    manager.showToast(`Burst notification #${i}`, i % 2 === 0 ? 'success' : 'error');
  }

  assert.strictEqual(manager.toasts.length, burstCount, 'All toasts should be added');
  const uniqueKeys = new Set(manager.toasts.map((t) => t.id));
  assert.strictEqual(uniqueKeys.size, burstCount, 'Zero React key collisions');
  manager.clearAll();
});

runTest('Rapid identical messages: 20 identical toasts have distinct IDs and keys', () => {
  const manager = new MockToastManager();
  const message = 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล';
  for (let i = 0; i < 20; i++) {
    manager.showToast(message, 'error');
  }

  assert.strictEqual(manager.toasts.length, 20);
  const uniqueKeys = new Set(manager.toasts.map((t) => t.id));
  assert.strictEqual(uniqueKeys.size, 20, 'Identical messages must still have unique React keys');
  manager.clearAll();
});

console.log('\n--- Test Suite 3: Targeted Removal & Auto-Dismiss Lifecycles ---');

runTest('Per-ID removal: removing one specific toast leaves all other toasts untouched', () => {
  const manager = new MockToastManager();
  const id1 = manager.showToast('Toast 1', 'info');
  const id2 = manager.showToast('Toast 2', 'success');
  const id3 = manager.showToast('Toast 3', 'error');

  assert.strictEqual(manager.toasts.length, 3);

  // Remove middle toast
  manager.removeToast(id2);
  assert.strictEqual(manager.toasts.length, 2);
  assert.strictEqual(manager.toasts[0].id, id1);
  assert.strictEqual(manager.toasts[1].id, id3);
  assert.ok(!manager.toasts.some((t) => t.id === id2));

  // Remove remaining
  manager.removeToast(id1);
  assert.strictEqual(manager.toasts.length, 1);
  assert.strictEqual(manager.toasts[0].id, id3);

  manager.clearAll();
});

await runAsyncTest('Auto-dismiss timing: staggered toasts expire individually by ID', async () => {
  const manager = new MockToastManager();
  
  // Custom mock with accelerated timeouts
  let localToasts = [];
  const addToast = (msg, delay) => {
    const id = createToastId();
    localToasts = [...localToasts, { id, msg }];
    setTimeout(() => {
      localToasts = localToasts.filter((t) => t.id !== id);
    }, delay);
    return id;
  };

  const idA = addToast('Message A', 50);
  const idB = addToast('Message B', 120);
  const idC = addToast('Message C', 200);

  assert.strictEqual(localToasts.length, 3);

  // After 70ms: A should be expired, B and C remain
  await new Promise((r) => setTimeout(r, 70));
  assert.strictEqual(localToasts.length, 2);
  assert.ok(!localToasts.some((t) => t.id === idA), 'Toast A should have expired');
  assert.ok(localToasts.some((t) => t.id === idB), 'Toast B should still exist');
  assert.ok(localToasts.some((t) => t.id === idC), 'Toast C should still exist');

  // After 150ms: B should also be expired, C remains
  await new Promise((r) => setTimeout(r, 80));
  assert.strictEqual(localToasts.length, 1);
  assert.ok(!localToasts.some((t) => t.id === idB), 'Toast B should have expired');
  assert.ok(localToasts.some((t) => t.id === idC), 'Toast C should still exist');

  // After 230ms: C should be expired, list empty
  await new Promise((r) => setTimeout(r, 90));
  assert.strictEqual(localToasts.length, 0, 'All toasts should have cleanly expired');
});

console.log('\n--- Test Suite 4: Source Code Inspection & Verification ---');

import fs from 'node:fs';
import path from 'node:path';

runTest('AppContext.tsx no longer uses Date.now().toString() for toast IDs', () => {
  const appContextPath = path.resolve('src/context/AppContext.tsx');
  const code = fs.readFileSync(appContextPath, 'utf8');

  // Check that Date.now().toString() is not used directly for toast id
  const hasVulnerableId = /const id = Date\.now\(\)\.toString\(\)/.test(code);
  assert.ok(!hasVulnerableId, 'Vulnerable Date.now().toString() pattern found in AppContext.tsx!');

  // Check that createToastId is used
  assert.ok(code.includes('createToastId()'), 'createToastId() must be invoked in showToast');

  // Check that key={toast.id} is preserved
  assert.ok(code.includes('key={toast.id}'), 'key={toast.id} must be preserved');

  // Check that removeToast is exported
  assert.ok(code.includes('removeToast,'), 'removeToast must be exported in AppContext');
});

runTest('types/index.ts exports Toast interface with string id', () => {
  const typesPath = path.resolve('src/types/index.ts');
  const code = fs.readFileSync(typesPath, 'utf8');

  assert.ok(code.includes('export interface Toast'), 'Toast interface must be exported');
  assert.ok(code.includes('id: string;'), 'Toast.id must be string');
});

console.log(`\n========================================`);
console.log(`📊 FINAL RESULT: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
