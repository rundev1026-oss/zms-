const http = require('http');
const crypto = require('crypto');
const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../apps/api/node_modules/.prisma/client'));
const prisma = new PrismaClient();

function signHs256Jwt(payload, secret, expiresInSeconds = 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + expiresInSeconds };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const bodyB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${bodyB64}`)
    .digest('base64url');
  return `${headerB64}.${bodyB64}.${sig}`;
}

async function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('========================================================================');
  console.log('TEST: Optional Assessment & Auto Registration Year Reference');
  console.log('Verifying all 8 Requirements in Section 6');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 8;

  // Setup Auth Token
  const adminUser = await prisma.user.findFirst({ where: { isActive: true } });
  if (!adminUser) throw new Error('No user in DB');

  const token = signHs256Jwt(
    {
      sub: adminUser.id,
      email: adminUser.email,
      role: 'super_admin',
      permissions: [
        'beneficiaries.read',
        'beneficiaries.read.sensitive',
        'beneficiaries.write',
        'assistance.create',
        'assistance.read',
        'assistance.manage',
      ],
    },
    process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-change-me-zms-enterprise-2026',
    3600
  );

  const initialAssessmentCount = await prisma.beneficiaryAsnafAssessment.count();
  const initialBeneficiaryCount = await prisma.beneficiary.count();
  console.log(`Initial DB State:`);
  console.log(`  - Real Beneficiaries Count: ${initialBeneficiaryCount}`);
  console.log(`  - Real Assessments Count:   ${initialAssessmentCount}\n`);

  // Target real beneficiary with assessment in matching year: MB-2026-000002
  const benWithAsm = await prisma.beneficiary.findFirst({
    where: { memberId: 'MB-2026-000002' },
    include: { assessments: { include: { category: true } } },
  });

  // Create temporary beneficiary WITHOUT any assessment
  const tempBenNoAsm = await prisma.beneficiary.create({
    data: {
      registryNumber: `ZMS-2026-${Date.now().toString().slice(-6)}`,
      memberId: `MB-2026-${Date.now().toString().slice(-6)}`,
      memberStatus: 'ACTIVE',
      status: 'ELIGIBLE',
      title: 'นาย',
      firstName: 'สมบูรณ์_ทดสอบ',
      lastName: 'ไม่มีผลประเมิน',
      identityType: 'THAI_NATIONAL_ID',
      identityNumber: '1999988887776',
      identityNumberNormalized: '1999988887776',
      createdAt: new Date('2026-11-01T00:00:00Z'),
    },
  });

  console.log(`Test Subjects:`);
  console.log(`  - Ben WITH Assessment:    [${benWithAsm.memberId}] ${benWithAsm.firstName} (${benWithAsm.assessments.length} assessment in year 2569)`);
  console.log(`  - Ben WITHOUT Assessment: [${tempBenNoAsm.memberId}] ${tempBenNoAsm.firstName} (0 assessments)\n`);

  try {
    // ========================================================================
    // Test 1: บุคคลมี Assessment Record ในปีที่อ้างอิง ระบบต้องเชื่อมโยงอัตโนมัติ
    // ========================================================================
    console.log('[Test 1] Beneficiary WITH Assessment in matching year -> Auto-links Assessment');
    const checkWithRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/assistance-requests/check-beneficiary',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      },
      { beneficiaryId: benWithAsm.id }
    );

    const benWithData = checkWithRes.data?.beneficiary;
    const autoMatchedAsm = benWithData?.matchingAssessment;
    console.log(`  Check response matchingAssessment: ${autoMatchedAsm ? autoMatchedAsm.assessmentNumber : 'none'}`);
    console.log(`  Registration Year (BE): ${benWithData?.registrationYearBe}`);

    if (autoMatchedAsm && autoMatchedAsm.id) {
      // Submit request WITHOUT passing assessmentId explicitly -> backend must auto-link!
      const testKey1 = `auto-asm-test-${Date.now()}`;
      const submit1 = await makeRequest(
        {
          hostname: 'localhost',
          port: 3000,
          path: '/api/assistance-requests',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        },
        {
          beneficiaryId: benWithAsm.id,
          // assessmentId omitted!
          asnafCategory: 'faqir_miskin',
          requestedAmount: 5000,
          necessityDetails: 'ทดสอบการเชื่อมโยง Assessment อัตโนมัติตามปีทะเบียน',
          status: 'submitted',
          idempotencyKey: testKey1,
        }
      );

      const app1 = submit1.data?.data || submit1.data?.application;
      if (app1 && app1.assessmentId === autoMatchedAsm.id) {
        console.log(`  ✓ Passed: Request ${app1.applicationNo} auto-linked assessmentId: ${app1.assessmentId}`);
        passed++;
        // Clean up test app
        await prisma.assistanceApplication.delete({ where: { id: app1.id } });
      } else {
        console.error('  ✗ Failed to auto-link matching assessmentId:', submit1.raw);
      }
    } else {
      console.error('  ✗ Failed: No matchingAssessment returned for ben with assessment.');
    }

    // ========================================================================
    // Test 2 & 3: บุคคลไม่มี Assessment Record ระบบต้องยื่นคำร้องได้ & ไม่มี Validation Error
    // ========================================================================
    console.log('\n[Test 2 & 3] Beneficiary WITHOUT Assessment -> Submits cleanly with assessmentId: null (Zero Validation Errors)');
    const checkNoRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/assistance-requests/check-beneficiary',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      },
      { beneficiaryId: tempBenNoAsm.id }
    );

    const benNoData = checkNoRes.data?.beneficiary;
    console.log(`  Check response for ben without assessment: matchingAssessment is ${benNoData?.matchingAssessment}`);

    const testKey2 = `no-asm-test-${Date.now()}`;
    const submit2 = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/assistance-requests',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      },
      {
        beneficiaryId: tempBenNoAsm.id,
        assessmentId: undefined, // no assessment id!
        asnafCategory: 'faqir_miskin',
        requestedAmount: 6000,
        necessityDetails: 'ทดสอบยื่นคำร้องสำหรับผู้ที่ไม่มี Assessment Record ประจำปี',
        status: 'submitted',
        idempotencyKey: testKey2,
      }
    );

    const app2 = submit2.data?.data || submit2.data?.application;
    if ((submit2.status === 200 || submit2.status === 201) && app2 && app2.assessmentId === null) {
      console.log(`  ✓ Passed Test 2: Request ${app2.applicationNo} created successfully with assessmentId: null`);
      console.log(`  ✓ Passed Test 3: No validation error thrown for missing assessmentId`);
      passed += 2;
      // Clean up test app
      await prisma.assistanceApplication.delete({ where: { id: app2.id } });
    } else {
      console.error('  ✗ Failed to create request for beneficiary without assessment:', submit2.raw);
    }

    // ========================================================================
    // Test 4: ระบบต้องไม่สร้าง Assessment ใหม่อัตโนมัติ
    // ========================================================================
    console.log('\n[Test 4] Verify NO new/fake Assessment Records are created');
    const postAssessmentCount = await prisma.beneficiaryAsnafAssessment.count();
    console.log(`  Assessment Count Before: ${initialAssessmentCount}`);
    console.log(`  Assessment Count After:  ${postAssessmentCount}`);
    if (postAssessmentCount === initialAssessmentCount) {
      console.log('  ✓ Passed: Assessment count remains 100% UNCHANGED. Zero fake assessments created!');
      passed++;
    } else {
      console.error('  ✗ Failed: An unexpected assessment was created in DB!');
    }

    // ========================================================================
    // Test 5: ระบบต้องไม่เชื่อมโยง Assessment ข้ามบุคคล
    // ========================================================================
    console.log('\n[Test 5] Verify Cross-Person Assessment linking is strictly rejected');
    // Attempt to pass benWithAsm's assessmentId for tempBenNoAsm
    const crossPersonAsmId = benWithAsm.assessments[0]?.id;
    const testKey5 = `cross-person-${Date.now()}`;
    const submit5 = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/assistance-requests',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      },
      {
        beneficiaryId: tempBenNoAsm.id, // person A
        assessmentId: crossPersonAsmId, // assessment of person B!
        asnafCategory: 'faqir_miskin',
        requestedAmount: 4000,
        necessityDetails: 'ทดสอบการส่ง assessmentId ข้ามบุคคล',
        status: 'submitted',
        idempotencyKey: testKey5,
      }
    );

    console.log(`  Response status for cross-person attempt: ${submit5.status}`);
    if (submit5.status === 400 && (submit5.raw.includes('INVALID_ASSESSMENT') || submit5.raw.includes('ไม่พบรอบการประเมินสิทธิ์'))) {
      console.log('  ✓ Passed: Backend properly caught and rejected cross-person assessment linking!');
      passed++;
    } else {
      console.error('  ✗ Failed: Backend did not reject cross-person assessment linking:', submit5.raw);
    }

    // ========================================================================
    // Test 6: ระบบต้องไม่เชื่อมโยง Assessment ข้ามปี
    // ========================================================================
    console.log('\n[Test 6] Verify Cross-Year Assessment linking is strictly rejected');
    // Create a temporary old assessment from year 2024 (BE 2567) for benWithAsm
    const oldAssessment = await prisma.beneficiaryAsnafAssessment.create({
      data: {
        assessmentNumber: `ASM-2024-${Date.now().toString().slice(-6)}`,
        beneficiaryId: benWithAsm.id,
        categoryId: benWithAsm.assessments[0]?.categoryId || (await prisma.asnafCategory.findFirst()).id,
        assessmentPeriod: 'ประจำปี 2567',
        assessmentType: 'ANNUAL_REVIEW',
        rationale: 'ประเมินรอบปีเก่า 2567',
        status: 'APPROVED',
        assessedAt: new Date('2024-05-15T10:00:00Z'),
        createdAt: new Date('2024-05-15T10:00:00Z'),
      },
    });

    const testKey6 = `cross-year-${Date.now()}`;
    const submit6 = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/assistance-requests',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      },
      {
        beneficiaryId: benWithAsm.id,
        assessmentId: oldAssessment.id, // Assessment from 2567 (not 2569)!
        asnafCategory: 'faqir_miskin',
        requestedAmount: 4500,
        necessityDetails: 'ทดสอบการส่ง assessmentId ข้ามปี',
        status: 'submitted',
        idempotencyKey: testKey6,
      }
    );

    console.log(`  Response status for cross-year attempt: ${submit6.status}`);
    if (submit6.status === 400 && (submit6.raw.includes('ASSESSMENT_YEAR_MISMATCH') || submit6.raw.includes('ไม่ตรงกับปีที่อ้างอิง'))) {
      console.log('  ✓ Passed: Backend properly caught and rejected cross-year assessment linking!');
      passed++;
    } else {
      console.error('  ✗ Failed: Backend did not reject cross-year assessment linking:', submit6.raw);
      // Clean up app if created accidentally
      const accidentalApp = submit6.data?.data || submit6.data?.application;
      if (accidentalApp?.id) {
        await prisma.assistanceApplication.delete({ where: { id: accidentalApp.id } });
      }
    }

    // Clean up temporary old assessment
    await prisma.beneficiaryAsnafAssessment.delete({ where: { id: oldAssessment.id } });

    // ========================================================================
    // Test 7: สามารถบันทึก Draft และส่งคำร้องได้จริง
    // ========================================================================
    console.log('\n[Test 7] Verify Draft (status: draft) and Submitted (status: submitted) workflows');
    const testKeyDraft = `draft-flow-${Date.now()}`;
    const draftRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/assistance-requests',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      },
      {
        beneficiaryId: benWithAsm.id,
        asnafCategory: 'faqir_miskin',
        requestedAmount: 7500,
        necessityDetails: 'บันทึกฉบับร่างคำร้องขอความช่วยเหลือ',
        status: 'draft',
        idempotencyKey: testKeyDraft,
      }
    );

    const draftApp = draftRes.data?.data || draftRes.data?.application;
    console.log(`  Draft result status: ${draftApp?.status}`);

    const testKeySub = `sub-flow-${Date.now()}`;
    const subRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/assistance-requests',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      },
      {
        beneficiaryId: benWithAsm.id,
        asnafCategory: 'faqir_miskin',
        requestedAmount: 8500,
        necessityDetails: 'ส่งคำร้องขอความช่วยเหลือเพื่อเข้าสู่กระบวนการพิจารณา',
        status: 'submitted',
        idempotencyKey: testKeySub,
      }
    );

    const subApp = subRes.data?.data || subRes.data?.application;
    console.log(`  Submitted result status: ${subApp?.status}`);

    if (draftApp?.status === 'draft' && subApp?.status === 'submitted') {
      console.log('  ✓ Passed: Both Draft and Submitted workflows save correctly with proper status!');
      passed++;
      // Clean up
      await prisma.assistanceApplication.delete({ where: { id: draftApp.id } });
      await prisma.assistanceApplication.delete({ where: { id: subApp.id } });
    } else {
      console.error('  ✗ Failed Draft/Submitted verification');
    }

    // ========================================================================
    // Test 8: ข้อมูลคำร้องต้องบันทึกลงฐานข้อมูลได้ครบถ้วน
    // ========================================================================
    console.log('\n[Test 8] Verify Full Database Persistence and Integrity');
    const testKey8 = `db-integrity-${Date.now()}`;
    const submit8 = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/assistance-requests',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      },
      {
        beneficiaryId: benWithAsm.id,
        asnafCategory: 'faqir_miskin',
        primaryGroupCode: 'faqir_miskin',
        specificFundId: 'fund-living',
        specificFundCode: 'living',
        specificFundName: 'กองทุนปัจจัยยังชีพขั้นพื้นฐาน',
        assistanceType: 'ปัจจัยยังชีพรายเดือน',
        requestedAmount: 12000,
        necessityDetails: 'ตรวจสอบความครบถ้วนของข้อมูลใน PostgreSQL',
        urgencyLevel: 'urgent',
        status: 'submitted',
        idempotencyKey: testKey8,
        documents: [
          {
            name: 'เอกสารทดสอบ_พย2569.pdf',
            category: 'medical',
            fileUrl: '/uploads/test_med.pdf',
            mimeType: 'application/pdf',
            fileSize: 102400,
          },
        ],
      }
    );

    const app8 = submit8.data?.data || submit8.data?.application;
    if (app8?.id) {
      // Read directly from DB
      const dbApp = await prisma.assistanceApplication.findUnique({
        where: { id: app8.id },
        include: { documents: true, beneficiary: true },
      });

      const isComplete =
        dbApp &&
        dbApp.applicationNo?.startsWith('APP-2569-') &&
        dbApp.beneficiaryId === benWithAsm.id &&
        Number(dbApp.requestedAmount) === 12000 &&
        dbApp.urgencyLevel === 'urgent' &&
        dbApp.documents.length === 1;

      if (isComplete) {
        console.log('  ✓ Passed: Record verified in PostgreSQL:');
        console.log(`    - Application No: ${dbApp.applicationNo}`);
        console.log(`    - Beneficiary:    ${dbApp.beneficiary.firstName} ${dbApp.beneficiary.lastName}`);
        console.log(`    - Amount:         ฿${Number(dbApp.requestedAmount).toLocaleString()}`);
        console.log(`    - Urgency:        ${dbApp.urgencyLevel}`);
        console.log(`    - Documents:      ${dbApp.documents.length} attached`);
        passed++;
        // Clean up
        await prisma.applicationDocument.deleteMany({ where: { applicationId: dbApp.id } });
        await prisma.assistanceApplication.delete({ where: { id: dbApp.id } });
      } else {
        console.error('  ✗ Failed DB verification');
      }
    } else {
      console.error('  ✗ Failed to create test 8 app:', submit8.raw);
    }
  } finally {
    // Delete temporary test beneficiary
    await prisma.beneficiary.delete({ where: { id: tempBenNoAsm.id } });
    console.log(`\nCleaned up temporary test beneficiary: [${tempBenNoAsm.memberId}]`);
  }

  // Final check: Real Beneficiary Count remains unchanged
  const finalBeneficiaryCount = await prisma.beneficiary.count();
  console.log(`Final Real Beneficiary count in DB: ${finalBeneficiaryCount} (Matches initial: ${finalBeneficiaryCount === initialBeneficiaryCount})`);

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================');

  await prisma.$disconnect();

  if (passed === total && finalBeneficiaryCount === initialBeneficiaryCount) {
    console.log('>>> ALL 8 SPECIFICATION REQUIREMENTS SUCCESSFULLY VERIFIED! <<<');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Error during test:', err);
  prisma.$disconnect();
  process.exit(1);
});
