/**
 * Phase 9 Test Suite: Master Data Management UI & Relationship Matrix
 */

import { getDb, initDb } from '../src/lib/db.ts';

const BASE_URL = 'http://localhost:3000';

async function runPhase9Tests() {
  console.log('========================================================');
  console.log('🧪 PHASE 9 TEST SUITE: MASTER DATA MANAGEMENT & MATRIX');
  console.log('========================================================\n');

  await initDb();
  const db = getDb();

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  const superAdminActor = {
    id: 'u-1',
    name: 'อิบรอฮีม มานะชัย',
    role: 'super_admin',
  };

  try {
    // ---------------------------------------------------------
    // TEST SUITE 1: Asnaf Master Data (Level 1)
    // ---------------------------------------------------------
    console.log('📋 1. Testing Asnaf Master Data API (Level 1)...');

    const asnafRes = await fetch(`${BASE_URL}/api/admin/asnaf`);
    assert(asnafRes.ok, 'GET /api/admin/asnaf returns 200 OK');
    const asnafJson = await asnafRes.json();
    assert(asnafJson.success === true, 'Asnaf response success is true');
    assert(Array.isArray(asnafJson.data) && asnafJson.data.length >= 8, 'Returns at least 8 canonical Asnaf categories');

    const faqir = asnafJson.data.find(a => a.code === 'faqir');
    assert(Boolean(faqir), 'Faqir category exists in Asnaf master list');
    assert(typeof faqir?.linkedTypeCount === 'number', 'Faqir has linkedTypeCount number');

    // Test PUT Asnaf metadata with isActive and sortOrder
    const updateAsnafRes = await fetch(`${BASE_URL}/api/admin/asnaf`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'ibnsabil',
        nameTh: 'อิบนุสสะบีล (ผู้เดินทางตกยาก)',
        description: 'ผู้เดินทางตกยากที่ขาดแคลนทุนทรัพย์ในการเดินทางกลับภูมิลำเนา (ทดสอบ Phase 9)',
        sortOrder: 8,
        isActive: true,
        actor: superAdminActor,
      }),
    });
    const updateAsnafJson = await updateAsnafRes.json();
    assert(updateAsnafRes.ok, 'PUT /api/admin/asnaf returns 200 OK', JSON.stringify(updateAsnafJson));
    assert(updateAsnafJson.success === true, 'PUT /api/admin/asnaf succeeds');

    // ---------------------------------------------------------
    // TEST SUITE 2: Assistance Formats Master Data (Level 3)
    // ---------------------------------------------------------
    console.log('\n📦 2. Testing Assistance Formats Master Data API (Level 3)...');

    const formatsRes = await fetch(`${BASE_URL}/api/admin/assistance-formats`);
    assert(formatsRes.ok, 'GET /api/admin/assistance-formats returns 200 OK');
    const formatsJson = await formatsRes.json();
    assert(formatsJson.success === true, 'Formats response success is true');
    assert(Array.isArray(formatsJson.data) && formatsJson.data.length >= 9, 'Returns all 9 Level 3 assistance delivery formats');

    const bankTransfer = formatsJson.data.find(f => f.code === 'bank_transfer' || f.id === 'fmt-bank-transfer');
    assert(Boolean(bankTransfer), 'Bank transfer format exists in Level 3 formats');
    assert(typeof bankTransfer?.linkedTypeCount === 'number', 'Format has linkedTypeCount calculated');

    // Test PUT format attributes
    const updateFormatRes = await fetch(`${BASE_URL}/api/admin/assistance-formats`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'fmt-bank-transfer',
        name: 'โอนเงินเข้าบัญชีธนาคาร (ทดสอบ Phase 9)',
        deliveryMethod: 'direct_transfer',
        deliveryMethodLabelTh: 'โอนผ่านระบบธนาคาร/พร้อมเพย์',
        requiresReceipt: true,
        requiresInspection: false,
        isActive: true,
        sortOrder: 1,
        actor: superAdminActor,
      }),
    });
    const updateFormatJson = await updateFormatRes.json();
    assert(updateFormatRes.ok, 'PUT /api/admin/assistance-formats returns 200 OK', JSON.stringify(updateFormatJson));
    assert(updateFormatJson.success === true, 'Format update succeeds');

    // ---------------------------------------------------------
    // TEST SUITE 3: Assistance Type Master Data (Level 2)
    // ---------------------------------------------------------
    console.log('\n🎯 3. Testing Assistance Types Creation & Syncing (Level 2)...');

    const testTypeCode = `TEST_TYPE_P9_${Date.now().toString().slice(-4)}`;
    const createTypeRes = await fetch(`${BASE_URL}/api/beneficiaries/assistance-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: testTypeCode,
        name: `โครงการสนับสนุนเยาวชน Phase 9 (${testTypeCode})`,
        category: 'education',
        specificFundId: 'subf-1',
        description: 'ประเภทความช่วยเหลือสร้างขึ้นเพื่อทดสอบ Phase 9 Master Data UI',
        conditionsText: 'ต้องเป็นเยาวชนในครัวเรือนยากจน',
        defaultMinAmount: 3000,
        defaultMaxAmount: 12000,
        allowedAsnafCodes: ['faqir', 'miskin', 'muallaf'],
        allowedFormatIds: ['fmt-bank-transfer', 'fmt-scholarship'],
        actor: superAdminActor,
      }),
    });

    const createTypeJson = await createTypeRes.json();
    assert(createTypeRes.ok, 'POST /api/beneficiaries/assistance-types returns 201 Created', JSON.stringify(createTypeJson));
    assert(createTypeJson.success === true, 'Type creation succeeds');
    const createdTypeId = createTypeJson.data.id;

    // Verify links in asnaf_assistance_types
    const aatRows = await db.execute({
      sql: 'SELECT asnaf_code, is_active FROM asnaf_assistance_types WHERE assistance_type_id = ? AND is_active = 1',
      args: [createdTypeId],
    });
    const createdAsnafCodes = aatRows.rows.map(r => r.asnaf_code);
    assert(createdAsnafCodes.includes('faqir') && createdAsnafCodes.includes('miskin') && createdAsnafCodes.includes('muallaf'),
      'asnaf_assistance_types links created for faqir, miskin, and muallaf'
    );

    // Verify links in assistance_type_formats
    const atfRows = await db.execute({
      sql: 'SELECT format_id, is_active FROM assistance_type_formats WHERE assistance_type_id = ? AND is_active = 1',
      args: [createdTypeId],
    });
    const createdFormatIds = atfRows.rows.map(r => r.format_id);
    assert(createdFormatIds.includes('fmt-bank-transfer') && createdFormatIds.includes('fmt-scholarship'),
      'assistance_type_formats links created for fmt-bank-transfer and fmt-scholarship'
    );

    // Test PUT updating allowed Asnafs
    const updateTypeRes = await fetch(`${BASE_URL}/api/beneficiaries/assistance-types`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: createdTypeId,
        name: `โครงการสนับสนุนเยาวชน Phase 9 (แก้ไขแล้ว)`,
        allowedAsnafCodes: ['faqir', 'fisabilillah'], // Removed miskin & muallaf, added fisabilillah
        allowedFormatIds: ['fmt-bank-transfer'],
        actor: superAdminActor,
      }),
    });
    assert(updateTypeRes.ok, 'PUT /api/beneficiaries/assistance-types returns 200 OK');

    const syncedAatRows = await db.execute({
      sql: 'SELECT asnaf_code, is_active FROM asnaf_assistance_types WHERE assistance_type_id = ? AND is_active = 1',
      args: [createdTypeId],
    });
    const syncedAsnafCodes = syncedAatRows.rows.map(r => r.asnaf_code);
    assert(syncedAsnafCodes.includes('faqir') && syncedAsnafCodes.includes('fisabilillah') && !syncedAsnafCodes.includes('muallaf'),
      'asnaf_assistance_types successfully synchronized on PUT (muallaf deactivated, fisabilillah activated)'
    );

    // ---------------------------------------------------------
    // TEST SUITE 4: Interactive Relationship Matrix API
    // ---------------------------------------------------------
    console.log('\n📊 4. Testing 3-Tier Relationship Matrix API & Toggle...');

    const matrixRes = await fetch(`${BASE_URL}/api/admin/relationship-matrix`);
    assert(matrixRes.ok, 'GET /api/admin/relationship-matrix returns 200 OK');
    const matrixJson = await matrixRes.json();
    assert(matrixJson.success === true, 'Matrix response success is true');
    assert(matrixJson.data.asnafs && matrixJson.data.types && matrixJson.data.formats,
      'Matrix returns asnafs, types, and formats'
    );
    assert(Array.isArray(matrixJson.data.asnafTypeLinks), 'Matrix returns asnafTypeLinks array');
    assert(typeof matrixJson.data.summary.activeLinks === 'number', 'Matrix returns activeLinks summary count');

    // Test POST Toggle Cell (e.g. toggle muallaf ON for createdTypeId)
    const toggleOnRes = await fetch(`${BASE_URL}/api/admin/relationship-matrix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asnafCode: 'muallaf',
        assistanceTypeId: createdTypeId,
        isActive: true,
        actor: superAdminActor,
      }),
    });
    assert(toggleOnRes.ok, 'POST /api/admin/relationship-matrix (Toggle ON) returns 200 OK');
    const toggleOnJson = await toggleOnRes.json();
    assert(toggleOnJson.link.isActive === true, 'Toggled link isActive is now true');

    // Test POST Toggle Cell OFF
    const toggleOffRes = await fetch(`${BASE_URL}/api/admin/relationship-matrix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asnafCode: 'muallaf',
        assistanceTypeId: createdTypeId,
        isActive: false,
        actor: superAdminActor,
      }),
    });
    assert(toggleOffRes.ok, 'POST /api/admin/relationship-matrix (Toggle OFF) returns 200 OK');
    const toggleOffJson = await toggleOffRes.json();
    assert(toggleOffJson.link.isActive === false, 'Toggled link isActive is now false');

    // Test POST Toggle Format Link and Set Default
    const toggleFormatRes = await fetch(`${BASE_URL}/api/admin/relationship-matrix/toggle-format`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assistanceTypeId: createdTypeId,
        formatId: 'fmt-scholarship',
        isActive: true,
        isDefault: true,
        actor: superAdminActor,
      }),
    });
    assert(toggleFormatRes.ok, 'POST /api/admin/relationship-matrix/toggle-format returns 200 OK');
    const toggleFormatJson = await toggleFormatRes.json();
    assert(toggleFormatJson.link.isDefault === true, 'Format set as default successfully');

    // ---------------------------------------------------------
    // TEST SUITE 5: Audit Log History
    // ---------------------------------------------------------
    console.log('\n📜 5. Testing Relationship Audit Log History...');

    const auditRes = await fetch(`${BASE_URL}/api/admin/relationship-matrix/audit-logs?limit=10`);
    assert(auditRes.ok, 'GET /api/admin/relationship-matrix/audit-logs returns 200 OK');
    const auditJson = await auditRes.json();
    assert(auditJson.success === true, 'Audit logs response success is true');
    assert(Array.isArray(auditJson.data) && auditJson.data.length > 0, 'Returns relationship audit logs');

    const latestLog = auditJson.data[0];
    assert(Boolean(latestLog.changesSummary), 'Latest log contains changesSummary text');
    assert(Boolean(latestLog.actorName), 'Latest log contains actorName');
    assert(Boolean(latestLog.action), 'Latest log contains action identifier');

    // Clean up created test type
    await db.execute({
      sql: 'DELETE FROM asnaf_assistance_types WHERE assistance_type_id = ?',
      args: [createdTypeId],
    });
    await db.execute({
      sql: 'DELETE FROM assistance_type_formats WHERE assistance_type_id = ?',
      args: [createdTypeId],
    });
    await db.execute({
      sql: 'DELETE FROM assistance_types WHERE id = ?',
      args: [createdTypeId],
    });

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`🏁 Phase 9 Test Suite Completed: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase9Tests();
