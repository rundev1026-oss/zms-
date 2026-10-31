const http = require('http');

const API_BASE = 'http://localhost:4000/api/v1';

function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(body);
        } catch {
          json = body;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

function generateValidThaiNationalId() {
  const digits = [];
  digits.push(Math.floor(Math.random() * 8) + 1); // 1-8
  for (let i = 1; i < 12; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  digits.push(checkDigit);
  return digits.join('');
}

async function run() {
  console.log('====================================================');
  console.log('  E2E TEST: SUPER ADMIN SOFT DELETE BENEFICIARY');
  console.log('====================================================\n');

  // 1. Login Officer & Admin
  console.log('[1] Logging in as Officer...');
  const officerLogin = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'officer@zms.local', password: 'ZmsEnterprise2026!' });
  const officerToken = officerLogin.body.accessToken;
  if (!officerToken) throw new Error('Officer login failed');
  console.log('  -> Officer logged in successfully.');

  console.log('[1b] Logging in as Super Admin...');
  const adminLogin = await request(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'admin@zms.local', password: 'ZmsEnterprise2026!' });
  const adminToken = adminLogin.body.accessToken;
  if (!adminToken) throw new Error('Admin login failed');
  console.log('  -> Super Admin logged in successfully.\n');

  // 2. Test RBAC security - Officer must be forbidden (403)
  console.log('[2] Testing RBAC Security Restrictions...');
  const officerListDel = await request(`${API_BASE}/beneficiaries/deleted`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  console.log(`  -> Officer GET /beneficiaries/deleted status: ${officerListDel.status} (Expected: 403)`);
  if (officerListDel.status !== 403) throw new Error('Security flaw: Officer accessed deleted list!');

  const dummyId = '00000000-0000-4000-8000-000000000000';
  const officerDel = await request(`${API_BASE}/beneficiaries/${dummyId}/soft-delete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${officerToken}`, 'Content-Type': 'application/json' },
  }, { reason: 'ทดสอบสิทธิ์' });
  console.log(`  -> Officer POST /soft-delete status: ${officerDel.status} (Expected: 403)`);
  if (officerDel.status !== 403) throw new Error('Security flaw: Officer can call soft-delete!');

  const officerRes = await request(`${API_BASE}/beneficiaries/${dummyId}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${officerToken}`, 'Content-Type': 'application/json' },
  }, { reason: 'ทดสอบสิทธิ์' });
  console.log(`  -> Officer POST /restore status: ${officerRes.status} (Expected: 403)`);
  if (officerRes.status !== 403) throw new Error('Security flaw: Officer can call restore!');
  console.log('  [PASS] RBAC properly enforces Super Admin role and beneficiaries.delete permission!\n');

  // 3. Create test beneficiary
  console.log('[3] Creating a test beneficiary...');
  const nationalId = generateValidThaiNationalId();
  const createRes = await request(`${API_BASE}/beneficiaries`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${officerToken}`, 'Content-Type': 'application/json' },
  }, {
    title: 'นาย',
    firstName: 'ทดสอบลบ',
    lastName: 'ซอฟท์ดีลีต',
    identityType: 'THAI_NATIONAL_ID',
    identityNumber: nationalId,
    phone: '0899998888',
    registrationNote: 'เคสทดสอบ Soft Delete และ Restore',
  });
  if (createRes.status !== 201) {
    console.error('Create failed:', createRes.body);
    throw new Error('Create beneficiary failed');
  }
  const ben = createRes.body;
  console.log(`  -> Beneficiary created: ID=${ben.id}, RegNo=${ben.registryNumber}, NationalId=${nationalId}\n`);

  // 4. Test Delete Preview without blockers
  console.log('[4] Checking Delete Preview for clean beneficiary...');
  const preview1 = await request(`${API_BASE}/beneficiaries/${ben.id}/delete-preview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`  -> Preview Status: ${preview1.status}, canDelete: ${preview1.body.canDelete}, blockers: ${preview1.body.blockers?.length}`);
  if (!preview1.body.canDelete) throw new Error('Clean beneficiary should be deletable');

  // 5. Add an active assistance application via Prisma to simulate blocker
  console.log('\n[5] Simulating active workflow blocker (Assistance Application in "under_review")...');
  const { PrismaClient } = require(require('path').resolve('apps/api/node_modules/@prisma/client'));
  const prisma = new PrismaClient();
  const app = await prisma.assistanceApplication.create({
    data: {
      applicationNo: `REQ-TEST-${Date.now().toString().slice(-6)}`,
      beneficiaryId: ben.id,
      asnafCategory: 'faqir_miskin',
      requestedAmount: 5000,
      status: 'under_review',
      appliedDate: '2026-10-31',
      hardshipReasons: 'ทดสอบความเดือดร้อนเพื่อตรวจเช็ค Blocker',
    },
  });
  console.log(`  -> Created active application ${app.applicationNo} (status: ${app.status})`);

  // Check preview again
  const preview2 = await request(`${API_BASE}/beneficiaries/${ben.id}/delete-preview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`  -> Preview Status: ${preview2.status}, canDelete: ${preview2.body.canDelete}`);
  console.log(`  -> Blockers: ${JSON.stringify(preview2.body.blockers)}`);
  if (preview2.body.canDelete) throw new Error('Active application should block deletion!');

  // Try to delete when blocked -> Expect 409 Conflict
  const blockedDel = await request(`${API_BASE}/beneficiaries/${ben.id}/soft-delete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
  }, { reason: 'พยายามลบขณะมีคำขอค้าง' });
  console.log(`  -> Attempt soft-delete with active blocker status: ${blockedDel.status} (Expected: 409)`);
  if (blockedDel.status !== 409) throw new Error('Backend should reject deletion with active blocker!');
  console.log('  [PASS] Active workflow blocker successfully prevented deletion!\n');

  // 6. Complete the application so it is no longer blocking
  console.log('[6] Updating application to "completed"...');
  await prisma.assistanceApplication.update({
    where: { id: app.id },
    data: { status: 'completed' },
  });
  const preview3 = await request(`${API_BASE}/beneficiaries/${ben.id}/delete-preview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`  -> Preview after completion: canDelete=${preview3.body.canDelete}, completedAid=${preview3.body.summary?.counts?.completedAid}`);
  if (!preview3.body.canDelete) throw new Error('Completed application should allow deletion');

  // 7. Test Validation on Soft Delete
  console.log('\n[7] Testing Soft Delete Input Validation...');
  const invalidDel = await request(`${API_BASE}/beneficiaries/${ben.id}/soft-delete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
  }, { reason: 'สั้น' }); // < 5 chars
  console.log(`  -> Soft delete with short reason status: ${invalidDel.status} (Expected: 400)`);
  if (invalidDel.status !== 400) throw new Error('Short reason should fail validation');

  // 8. Execute Soft Delete
  console.log('\n[8] Executing Super Admin Soft Delete...');
  const deleteReason = 'ย้ายถิ่นฐานออกนอกพื้นที่รับผิดชอบและขอยกเลิกสิทธิ์';
  const deleteRef = 'คำสั่งที่ สค.09/2569';
  const delRes = await request(`${API_BASE}/beneficiaries/${ben.id}/soft-delete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
  }, {
    reason: deleteReason,
    reference: deleteRef,
  });
  console.log(`  -> Soft delete status: ${delRes.status} (Expected: 201/200)`);
  if (delRes.status !== 200 && delRes.status !== 201) {
    console.error('Delete failed:', delRes.body);
    throw new Error('Soft delete failed');
  }
  console.log(`  -> DeletedAt: ${delRes.body.deletedAt}, Reason: ${delRes.body.deletionReason}`);
  console.log('  [PASS] Soft Delete executed successfully!\n');

  // 9. Verify in Normal List vs Deleted List vs DB
  console.log('[9] Verifying Lists and Database Integrity...');
  const normalList = await request(`${API_BASE}/beneficiaries?q=${ben.registryNumber}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const foundInNormal = (normalList.body.items || []).some((item) => item.id === ben.id);
  console.log(`  -> Beneficiary in normal active list: ${foundInNormal} (Expected: false)`);
  if (foundInNormal) throw new Error('Soft-deleted beneficiary still appears in normal list!');

  const deletedList = await request(`${API_BASE}/beneficiaries/deleted?q=${ben.registryNumber}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const foundInDeleted = (deletedList.body.items || []).some((item) => item.id === ben.id);
  console.log(`  -> Beneficiary in deleted list: ${foundInDeleted} (Expected: true)`);
  if (!foundInDeleted) throw new Error('Soft-deleted beneficiary not found in deleted list!');

  // Check DB directly
  const dbBen = await prisma.beneficiary.findUnique({
    where: { id: ben.id },
    include: { applications: true },
  });
  console.log(`  -> DB Beneficiary exists: ${dbBen !== null}, deletedAt: ${dbBen?.deletedAt}`);
  console.log(`  -> DB Application count: ${dbBen?.applications?.length} (Preserved in DB!)`);
  if (!dbBen || !dbBen.deletedAt) throw new Error('DB beneficiary should exist with deletedAt set');
  if (dbBen.applications.length === 0) throw new Error('DB application was deleted! Should be preserved!');
  console.log('  [PASS] Database integrity preserved, zero hard delete occurred!\n');

  // 10. Check Audit Log
  console.log('[10] Checking Audit Trail...');
  const auditRes = await request(`${API_BASE}/beneficiaries/${ben.id}/audit-history`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const auditLogs = auditRes.body;
  console.log(`  -> Total Audit entries for beneficiary: ${auditLogs.length}`);
  const deleteLog = auditLogs.find((l) => l.action === 'BENEFICIARY_SOFT_DELETE');
  console.log(`  -> Found BENEFICIARY_SOFT_DELETE log: ${deleteLog !== undefined}`);
  console.log(`     Actor: ${deleteLog?.actorName}, Reason: ${deleteLog?.metadata?.reason}`);
  if (!deleteLog) throw new Error('BENEFICIARY_SOFT_DELETE not found in audit trail!');
  console.log('  [PASS] Audit trail properly recorded!\n');

  // 11. Test Restore
  console.log('[11] Testing Super Admin Restore...');
  const restoreReason = 'ตรวจสอบพบเอกสารหลักฐานเพิ่มเติมและขอกลับมาใช้งานสิทธิ์';
  const restoreRef = 'คำสั่งที่ สค.14/2569';
  const restoreRes = await request(`${API_BASE}/beneficiaries/${ben.id}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
  }, {
    reason: restoreReason,
    reference: restoreRef,
  });
  console.log(`  -> Restore status: ${restoreRes.status} (Expected: 201/200)`);
  if (restoreRes.status !== 200 && restoreRes.status !== 201) {
    console.error('Restore failed:', restoreRes.body);
    throw new Error('Restore failed');
  }
  console.log(`  -> Restored Beneficiary deletedAt: ${restoreRes.body.deletedAt} (Expected: null)`);
  if (restoreRes.body.deletedAt !== null) throw new Error('Restored beneficiary deletedAt should be null');

  // 12. Verify Post-Restore
  console.log('\n[12] Verifying Post-Restore Status...');
  const normalList2 = await request(`${API_BASE}/beneficiaries?q=${ben.registryNumber}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const foundInNormal2 = (normalList2.body.items || []).some((item) => item.id === ben.id);
  console.log(`  -> Reappeared in normal list: ${foundInNormal2} (Expected: true)`);
  if (!foundInNormal2) throw new Error('Restored beneficiary should reappear in normal list!');

  const deletedList2 = await request(`${API_BASE}/beneficiaries/deleted?q=${ben.registryNumber}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const foundInDeleted2 = (deletedList2.body.items || []).some((item) => item.id === ben.id);
  console.log(`  -> Disappeared from deleted list: ${!foundInDeleted2} (Expected: true)`);
  if (foundInDeleted2) throw new Error('Restored beneficiary should no longer appear in deleted list!');

  // Check audit for restore
  const auditRes2 = await request(`${API_BASE}/beneficiaries/${ben.id}/audit-history`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const restoreLog = auditRes2.body.find((l) => l.action === 'BENEFICIARY_RESTORE');
  console.log(`  -> Found BENEFICIARY_RESTORE in audit log: ${restoreLog !== undefined}`);
  if (!restoreLog) throw new Error('BENEFICIARY_RESTORE not found in audit trail!');

  await prisma.$disconnect();

  console.log('\n====================================================');
  console.log('  ALL 12 TESTS PASSED PERFECTLY!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
