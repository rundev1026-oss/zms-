import assert from 'assert';
import { getDb, initDb } from '../src/lib/db.ts';

let passed = 0;
let total = 0;

async function itAsync(desc, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         ${err.message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  TEST SUITE: PHASE 4 - BENEFICIARY REGISTRY ASNAF INTEGRATION');
  console.log('================================================================\n');

  await initDb();
  const db = getDb();

  console.log('--- 1. SINGLE-ASNAF BENEFICIARY INTEGRATION ---');
  await itAsync('should correctly read and lock Asnaf for single-Asnaf beneficiary', async () => {
    // ben-1792149156818 has a single Asnaf in beneficiary_asnaf
    const res = await fetch('http://localhost:3000/api/assistance-requests/check-beneficiary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beneficiaryId: 'ben-1792149156818' }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.found, true);
    assert.strictEqual(json.canApply, true);

    const ben = json.beneficiary;
    assert.strictEqual(ben.hasSingleAsnaf, true);
    assert.strictEqual(ben.hasMultipleAsnafs, false);
    assert.strictEqual(ben.asnafStatus, 'SINGLE_ASNAF');
    assert.strictEqual(ben.asnafCategory, 'faqir_miskin');
    assert.strictEqual(ben.asnafNameTh, 'ฟากีร–มิสกิน');
    assert(Array.isArray(ben.eligibleAsnafs));
    assert.strictEqual(ben.eligibleAsnafs.length, 1);
  });

  console.log('\n--- 2. MULTI-ASNAF BENEFICIARY INTEGRATION ---');
  await itAsync('should return only qualified Asnafs for multi-Asnaf beneficiary', async () => {
    // ben-1792149119947 has faqir_miskin (primary) and gharimin (secondary)
    const res = await fetch('http://localhost:3000/api/assistance-requests/check-beneficiary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beneficiaryId: 'ben-1792149119947' }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.found, true);
    assert.strictEqual(json.canApply, true);

    const ben = json.beneficiary;
    assert.strictEqual(ben.hasSingleAsnaf, false);
    assert.strictEqual(ben.hasMultipleAsnafs, true);
    assert.strictEqual(ben.asnafStatus, 'MULTI_ASNAF');
    assert(Array.isArray(ben.eligibleAsnafs));
    assert(ben.eligibleAsnafs.length >= 2);

    const asnafCodes = ben.eligibleAsnafs.map((a) => a.asnafCode);
    assert(asnafCodes.includes('faqir_miskin'));
    assert(asnafCodes.includes('gharimin'));

    // Check primary flag
    const primary = ben.eligibleAsnafs.find((a) => a.isPrimary);
    assert(primary !== undefined);
    assert.strictEqual(primary.asnafCode, 'faqir_miskin');
  });

  console.log('\n--- 3. BENEFICIARY WITHOUT ASNAF INTEGRATION ---');
  await itAsync('should reject application creation when beneficiary has NO Asnaf', async () => {
    // Insert a dummy beneficiary with no Asnaf using existing household
    const hhRes = await db.execute("SELECT id FROM households LIMIT 1");
    const validHhId = hhRes.rows.length > 0 ? String(hhRes.rows[0].id) : 'hh-test';

    const testBenId = `test-no-asnaf-${Date.now()}`;
    await db.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category)
            VALUES (?, ?, 'นายทดสอบ ไม่มีอัสนัฟ', '9999999999999', '0810000000', '')`,
      args: [testBenId, validHhId],
    });

    try {
      const res = await fetch('http://localhost:3000/api/assistance-requests/check-beneficiary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beneficiaryId: testBenId }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 422);
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.canApply, false);
      assert.strictEqual(json.asnafStatus, 'NO_ASNAF');
      assert(json.error.includes('ไม่ได้รับการรับรองหมวดหมู่อัสนัฟ'));
    } finally {
      // Clean up test row
      await db.execute({ sql: `DELETE FROM beneficiaries WHERE id = ?`, args: [testBenId] });
    }
  });

  console.log('\n--- 4. MASTER REGISTRY DATA INTEGRITY & IMMUTABILITY ---');
  await itAsync('querying and checking beneficiary should NEVER alter master beneficiaries table', async () => {
    const beforeRow = await db.execute({
      sql: `SELECT id, asnaf_category, full_name FROM beneficiaries WHERE id = 'ben-1792149119947'`,
    });
    assert(beforeRow.rows.length > 0);
    const originalAsnaf = String(beforeRow.rows[0].asnaf_category);

    // Call check-beneficiary
    await fetch('http://localhost:3000/api/assistance-requests/check-beneficiary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beneficiaryId: 'ben-1792149119947' }),
    });

    const afterRow = await db.execute({
      sql: `SELECT id, asnaf_category, full_name FROM beneficiaries WHERE id = 'ben-1792149119947'`,
    });
    const finalAsnaf = String(afterRow.rows[0].asnaf_category);

    assert.strictEqual(finalAsnaf, originalAsnaf, 'Beneficiary master record was unexpectedly modified!');
  });

  await itAsync('national ID lookup should correctly resolve member and Asnaf', async () => {
    const res = await fetch('http://localhost:3000/api/assistance-requests/check-beneficiary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nationalId: '1100200119922' }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.beneficiary.nationalId, '1100200119922');
    assert.strictEqual(json.beneficiary.hasMultipleAsnafs, true);
  });

  console.log('\n================================================================');
  console.log(`  PHASE 4 BENEFICIARY INTEGRATION TEST RESULTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Fatal Test Suite Error:', e);
  process.exit(1);
});
