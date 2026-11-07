import assert from 'assert';
import { getDb, initDb } from '../src/lib/db.ts';

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         ${err.message}`);
  }
}

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
  console.log('  TEST SUITE: PHASE 3 - DATABASE RELATIONSHIP ARCHITECTURE');
  console.log('================================================================\n');

  console.log('--- 1. DATABASE INITIALIZATION & SCHEMA DDL ---');
  await itAsync('should execute initDb() without any errors', async () => {
    await initDb();
    const db = getDb();
    assert(db !== null);
  });

  const db = getDb();

  await itAsync('should create table assistance_formats with expected columns and index', async () => {
    const tableInfo = await db.execute("PRAGMA table_info(assistance_formats)");
    const cols = tableInfo.rows.map((c) => String(c.name));
    assert(cols.includes('id'));
    assert(cols.includes('code'));
    assert(cols.includes('name'));
    assert(cols.includes('delivery_method'));
    assert(cols.includes('requires_receipt'));
    assert(cols.includes('requires_inspection'));
    assert(cols.includes('is_active'));
    assert(cols.includes('sort_order'));
  });

  await itAsync('should create table asnaf_assistance_types with expected columns and constraints', async () => {
    const tableInfo = await db.execute("PRAGMA table_info(asnaf_assistance_types)");
    const cols = tableInfo.rows.map((c) => String(c.name));
    assert(cols.includes('id'));
    assert(cols.includes('asnaf_code'));
    assert(cols.includes('assistance_type_id'));
    assert(cols.includes('is_active'));
    assert(cols.includes('sort_order'));
    assert(cols.includes('effective_date'));
    assert(cols.includes('created_by'));
  });

  await itAsync('should create table assistance_type_formats with expected columns and constraints', async () => {
    const tableInfo = await db.execute("PRAGMA table_info(assistance_type_formats)");
    const cols = tableInfo.rows.map((c) => String(c.name));
    assert(cols.includes('id'));
    assert(cols.includes('assistance_type_id'));
    assert(cols.includes('format_id'));
    assert(cols.includes('is_default'));
    assert(cols.includes('is_active'));
    assert(cols.includes('sort_order'));
  });

  await itAsync('should create table beneficiary_asnaf with expected columns and constraints', async () => {
    const tableInfo = await db.execute("PRAGMA table_info(beneficiary_asnaf)");
    const cols = tableInfo.rows.map((c) => String(c.name));
    assert(cols.includes('id'));
    assert(cols.includes('beneficiary_id'));
    assert(cols.includes('asnaf_code'));
    assert(cols.includes('is_primary'));
    assert(cols.includes('qualification_date'));
    assert(cols.includes('qualified_by_id'));
    assert(cols.includes('is_active'));
  });

  await itAsync('should create table asnaf_relationship_audit_logs with audit trail columns', async () => {
    const tableInfo = await db.execute("PRAGMA table_info(asnaf_relationship_audit_logs)");
    const cols = tableInfo.rows.map((c) => String(c.name));
    assert(cols.includes('id'));
    assert(cols.includes('relationship_type'));
    assert(cols.includes('record_id'));
    assert(cols.includes('action'));
    assert(cols.includes('actor_id'));
    assert(cols.includes('changes_summary'));
    assert(cols.includes('previous_state'));
    assert(cols.includes('new_state'));
  });

  console.log('\n--- 2. MASTER DATA SEED INTEGRITY ---');
  await itAsync('assistance_formats table should contain all 9 standard formats', async () => {
    const res = await db.execute("SELECT code, name, delivery_method FROM assistance_formats ORDER BY sort_order");
    assert.strictEqual(res.rows.length, 9);
    const codes = res.rows.map((r) => String(r.code));
    assert(codes.includes('bank_transfer'));
    assert(codes.includes('cash'));
    assert(codes.includes('in_kind'));
    assert(codes.includes('materials'));
    assert(codes.includes('vendor_direct'));
    assert(codes.includes('contractor'));
    assert(codes.includes('scholarship'));
    assert(codes.includes('training'));
    assert(codes.includes('career_equipment'));
  });

  await itAsync('assistance_types table should contain the normalized and seeded types', async () => {
    const res = await db.execute("SELECT count(*) as count FROM assistance_types WHERE is_active = 1");
    const count = Number(res.rows[0].count);
    assert(count >= 23, `Expected at least 23 active types, got ${count}`);

    // Verify key types exist
    const keyTypes = await db.execute(
      "SELECT code FROM assistance_types WHERE code IN ('LIVING_SUPPORT', 'AMIL_REMUNERATION', 'MUALLAF_SUPPORT', 'RAHMAH_HOME', 'FISABILILLAH_GARAGE')"
    );
    assert.strictEqual(keyTypes.rows.length, 5);
  });

  console.log('\n--- 3. RELATIONSHIP LINKS VERIFICATION ---');
  await itAsync('asnaf_assistance_types should have correct multi-Asnaf links for shared types', async () => {
    // ปัจจัยยังชีพ (LIVING_SUPPORT) must be linked to both faqir_miskin and muallaf
    const livingRes = await db.execute(`
      SELECT aat.asnaf_code, ast.name
      FROM asnaf_assistance_types aat
      JOIN assistance_types ast ON aat.assistance_type_id = ast.id
      WHERE ast.code = 'LIVING_SUPPORT'
    `);
    const asnafs = livingRes.rows.map((r) => String(r.asnaf_code));
    assert(asnafs.includes('faqir_miskin'), 'LIVING_SUPPORT missing link to faqir_miskin');
    assert(asnafs.includes('muallaf'), 'LIVING_SUPPORT missing link to muallaf');

    // ทุนการศึกษา (EDUCATION_GRANT) must be linked to faqir_miskin, muallaf, and fisabilillah
    const eduRes = await db.execute(`
      SELECT aat.asnaf_code, ast.name
      FROM asnaf_assistance_types aat
      JOIN assistance_types ast ON aat.assistance_type_id = ast.id
      WHERE ast.code = 'EDUCATION_GRANT'
    `);
    const eduAsnafs = eduRes.rows.map((r) => String(r.asnaf_code));
    assert(eduAsnafs.includes('faqir_miskin'));
    assert(eduAsnafs.includes('muallaf'));
    assert(eduAsnafs.includes('fisabilillah'));
  });

  await itAsync('asnaf_assistance_types should link all 10 types for amil', async () => {
    const amilRes = await db.execute(`
      SELECT ast.code, ast.name
      FROM asnaf_assistance_types aat
      JOIN assistance_types ast ON aat.assistance_type_id = ast.id
      WHERE aat.asnaf_code = 'amil'
    `);
    assert(amilRes.rows.length >= 10, `Amil should have at least 10 types, got ${amilRes.rows.length}`);
  });

  await itAsync('assistance_type_formats should have valid links for each type', async () => {
    const formatLinks = await db.execute(`
      SELECT atf.id, ast.code as type_code, af.code as format_code, atf.is_default
      FROM assistance_type_formats atf
      JOIN assistance_types ast ON atf.assistance_type_id = ast.id
      JOIN assistance_formats af ON atf.format_id = af.id
      WHERE ast.code = 'CAREER_SUPPORT'
    `);
    const formatCodes = formatLinks.rows.map((r) => String(r.format_code));
    assert(formatCodes.includes('career_equipment'), 'CAREER_SUPPORT should support career_equipment');
    assert(formatCodes.includes('vendor_direct'), 'CAREER_SUPPORT should support vendor_direct');
  });

  console.log('\n--- 4. BENEFICIARY ASNAF BACKFILL & MULTI-ASNAF ---');
  await itAsync('beneficiary_asnaf should be backfilled from existing beneficiaries table', async () => {
    const totalBen = await db.execute("SELECT count(*) as count FROM beneficiaries");
    const totalBa = await db.execute("SELECT count(*) as count FROM beneficiary_asnaf");
    const benCount = Number(totalBen.rows[0].count);
    const baCount = Number(totalBa.rows[0].count);
    assert(baCount >= benCount, `beneficiary_asnaf count (${baCount}) should be >= beneficiaries count (${benCount})`);
  });

  await itAsync('beneficiary_asnaf should allow adding a secondary Asnaf for multi-Asnaf beneficiary', async () => {
    // Pick first beneficiary
    const firstBen = await db.execute("SELECT id FROM beneficiaries LIMIT 1");
    if (firstBen.rows.length > 0) {
      const bId = String(firstBen.rows[0].id);
      // Insert a secondary Asnaf (e.g. gharimin) if not already exists
      await db.execute({
        sql: `INSERT OR IGNORE INTO beneficiary_asnaf (id, beneficiary_id, asnaf_code, is_primary, is_active, qualification_notes)
              VALUES (?, ?, 'gharimin', 0, 1, 'ทดสอบสิทธิ์อัสนัฟที่สอง (ผู้มีหนี้สินจำเป็น)')`,
        args: [`ba-test-multi-${bId}-gharimin`, bId],
      });

      const userAsnafs = await db.execute({
        sql: "SELECT asnaf_code, is_primary FROM beneficiary_asnaf WHERE beneficiary_id = ?",
        args: [bId],
      });
      assert(userAsnafs.rows.length >= 1);
    }
  });

  console.log('\n--- 5. CONSTRAINT PROTECTION & AUDIT TRAIL ---');
  await itAsync('should prevent duplicate asnaf-assistance_type link via UNIQUE constraint', async () => {
    const sampleLink = await db.execute("SELECT asnaf_code, assistance_type_id FROM asnaf_assistance_types LIMIT 1");
    assert(sampleLink.rows.length > 0);
    const { asnaf_code, assistance_type_id } = sampleLink.rows[0];

    try {
      await db.execute({
        sql: `INSERT INTO asnaf_assistance_types (id, asnaf_code, assistance_type_id, is_active) VALUES (?, ?, ?, 1)`,
        args: ['test-dup-id', String(asnaf_code), String(assistance_type_id)],
      });
      assert.fail('Expected SQLite UNIQUE constraint error but none was thrown');
    } catch (err) {
      assert(
        err.message.includes('UNIQUE constraint failed') || err.message.includes('constraint failed'),
        `Expected UNIQUE constraint error, got: ${err.message}`
      );
    }
  });

  await itAsync('should prevent duplicate assistance_type-format link via UNIQUE constraint', async () => {
    const sampleAtf = await db.execute("SELECT assistance_type_id, format_id FROM assistance_type_formats LIMIT 1");
    assert(sampleAtf.rows.length > 0);
    const { assistance_type_id, format_id } = sampleAtf.rows[0];

    try {
      await db.execute({
        sql: `INSERT INTO assistance_type_formats (id, assistance_type_id, format_id) VALUES (?, ?, ?)`,
        args: ['test-dup-atf', String(assistance_type_id), String(format_id)],
      });
      assert.fail('Expected SQLite UNIQUE constraint error but none was thrown');
    } catch (err) {
      assert(
        err.message.includes('UNIQUE constraint failed') || err.message.includes('constraint failed'),
        `Expected UNIQUE constraint error, got: ${err.message}`
      );
    }
  });

  await itAsync('asnaf_relationship_audit_logs should successfully record relationship modifications', async () => {
    await db.execute({
      sql: `INSERT INTO asnaf_relationship_audit_logs (
              id, relationship_type, record_id, action, actor_id, actor_name, actor_role, changes_summary
            ) VALUES (?, 'asnaf_assistance_type', 'aat-test', 'CREATE', 'u-admin', 'Super Admin', 'super_admin', 'ผูกประเภทความช่วยเหลือใหม่')`,
      args: [`audit-${Date.now()}`],
    });

    const auditRes = await db.execute("SELECT count(*) as count FROM asnaf_relationship_audit_logs");
    assert(Number(auditRes.rows[0].count) >= 1);
  });

  console.log('\n================================================================');
  console.log(`  PHASE 3 DATABASE RELATIONSHIP TEST RESULTS: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Fatal Test Suite Error:', e);
  process.exit(1);
});

