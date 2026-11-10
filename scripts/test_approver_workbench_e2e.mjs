import { PrismaClient } from '../apps/api/node_modules/@prisma/client/index.js';
import { createClient } from '@libsql/client';
import path from 'path';

const prisma = new PrismaClient();
const dbPath = path.join(process.cwd(), 'data', 'zms.db');
const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
const db = createClient({ url: dbUrl });

async function run() {
  console.log('=== TEST APPROVER WORKBENCH WORKFLOW & SYNCHRONIZATION ===');

  // Step 1: Create a test beneficiary in SQLite & PostgreSQL
  const testBenId = 'b1000000-0000-4000-8000-000000000001';
  const testAppId = 'a1000000-0000-4000-8000-000000000001';
  const testAsmId = 'c1000000-0000-4000-8000-000000000001';
  const testAppNo = 'APP-2569-TEST01';
  const testIdNum = '1987654321098';

  console.log('\n1. Creating test application in pending_approval with completed assessment...');

  // In PostgreSQL via Prisma
  // Clean up if existed
  await prisma.applicationHistory.deleteMany({ where: { applicationId: testAppId } }).catch(() => {});
  await prisma.beneficiaryAssessmentLegacy.deleteMany({ where: { applicationId: testAppId } }).catch(() => {});
  await prisma.assistanceApplication.deleteMany({ where: { id: testAppId } }).catch(() => {});
  await prisma.beneficiary.deleteMany({ where: { id: testBenId } }).catch(() => {});

  // SQLite cleanup
  await db.execute({ sql: 'DELETE FROM beneficiary_assessments WHERE application_id = ?', args: [testAppId] });
  await db.execute({ sql: 'DELETE FROM assistance_applications WHERE id = ?', args: [testAppId] });
  await db.execute({ sql: 'DELETE FROM beneficiaries WHERE id = ?', args: [testBenId] });
  await db.execute({ sql: 'DELETE FROM households WHERE id = ?', args: ['hh-test-workbench-001'] });
  await db.execute({ sql: 'DELETE FROM households WHERE id = ?', args: ['hh-test-workbench-001'] });

  // Create Beneficiary in PostgreSQL
  const pgBen = await prisma.beneficiary.create({
    data: {
      id: testBenId,
      registryNumber: 'REG-2569-TEST01',
      identityType: 'THAI_NATIONAL_ID',
      identityNumber: testIdNum,
      firstName: 'อิบราฮิม',
      lastName: 'โต๊ะมีนา',
      phone: '0812345678',
      status: 'ELIGIBLE',
    },
  });

  // Create Application in PostgreSQL
  const pgApp = await prisma.assistanceApplication.create({
    data: {
      id: testAppId,
      applicationNo: testAppNo,
      beneficiaryId: testBenId,
      asnafCategory: 'faqir_miskin',
      assistanceType: 'ปัจจัยยังชีพ',
      assistanceTypeId: 'subf-1',
      requestedAmount: 5000,
      status: 'pending_approval',
      urgencyLevel: 'urgent',
      assignedOfficerId: 'u-officer-99',
      assignedOfficerName: 'เจ้าหน้าที่สำรวจ',
    },
  });

  // Create Assessment in PostgreSQL
  await prisma.beneficiaryAssessmentLegacy.create({
    data: {
      id: testAsmId,
      applicationId: testAppId,
      assessedById: 'u-officer-99',
      assessedByName: 'เจ้าหน้าที่สำรวจ',
      assessedDate: '10/11/2569',
      livingScore: 82,
      housingCondition: 'ทรุดโทรม',
      housingNotes: 'หลังคารั่ว',
      debtBurdenSummary: 'ไม่มีหนี้สินผูกพัน',
      primaryHardship: 'ขาดแคลนค่าครองชีพ',
      officerRecommendation: 'สมควรได้รับการช่วยเหลือ',
      recommendedAmount: 5000,
      recommendedFundId: 'fund-1',
      recommendedSpecificFundId: 'subf-1',
      generalNotes: 'ผ่านเกณฑ์ความยากจน',
    },
  });

  // Create Household in SQLite
  await db.execute({
    sql: `INSERT INTO households (id, household_no, address, province, district, community, created_at, updated_at)
          VALUES (?, ?, '123 ม.1', 'ปัตตานี', 'เมือง', 'จะบังติกอ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    args: ['hh-test-workbench-001', 'HH-TEST-001'],
  });

  // Create Beneficiary in SQLite
  await db.execute({
    sql: `INSERT INTO beneficiaries (id, household_id, national_id, full_name, phone, asnaf_category, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    args: [testBenId, 'hh-test-workbench-001', testIdNum, 'นาย อิบราฮิม โต๊ะมีนา', '0812345678', 'faqir_miskin'],
  });

  // Create Application in SQLite
  await db.execute({
    sql: `INSERT INTO assistance_applications (
            id, application_no, beneficiary_id,
            asnaf_category, assistance_type, assistance_type_id, specific_fund_id, requested_amount,
            status, assessment_status, approval_status, completion_status,
            assigned_officer_id, assigned_officer_name, applied_date,
            request_status, payment_status, delivery_status, followup_status,
            fiscal_year, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', 'completed', 'pending', 'active', 'u-officer-99', 'เจ้าหน้าที่สำรวจ', '10/11/2569', 'submitted', 'pending', 'pending', 'pending', '2569', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    args: [testAppId, testAppNo, testBenId, 'faqir_miskin', 'ปัจจัยยังชีพ', 'subf-1', 'subf-1', 5000],
  });

  // Create Assessment in SQLite
  await db.execute({
    sql: `INSERT INTO beneficiary_assessments (
            id, application_id, living_score, recommended_amount, assessed_by_id, assessed_by_name,
            assessed_date, housing_condition, housing_notes, debt_burden_summary, primary_hardship,
            officer_recommendation, recommended_fund_id, recommended_specific_fund_id, general_notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [
      testAsmId, testAppId, 82, 5000, 'u-officer-99', 'เจ้าหน้าที่สำรวจ',
      '10/11/2569', 'ทรุดโทรม', 'หลังคารั่ว', 'ไม่มีหนี้สิน', 'ขาดแคลนค่าครองชีพ',
      'สมควรได้รับการช่วยเหลือ', 'fund-1', 'subf-1', 'ผ่านเกณฑ์ความยากจน'
    ],
  });

  console.log('✓ Created test pending application successfully!');

  // Step 2: Verify Initial Summary API
  console.log('\n2. Verifying summary API before approval...');
  const sumRes1 = await fetch('http://localhost:3000/api/approvals/summary').then(r => r.json());
  console.log('Summary before:', sumRes1.data);
  if (sumRes1.data.pendingCount < 1) {
    throw new Error(`Expected pendingCount >= 1, got ${sumRes1.data.pendingCount}`);
  }
  const initialPendingCount = sumRes1.data.pendingCount;
  const initialApprovedCount = sumRes1.data.approvedCount;
  const initialApprovedAmount = sumRes1.data.totalApprovedAmount;

  // Step 3: Approve via Next.js API
  console.log('\n3. Executing approval via POST /api/beneficiaries/[id]/approve ...');
  const approveRes = await fetch(`http://localhost:3000/api/beneficiaries/${testAppId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      approvedAmount: 5000,
      notes: 'อนุมัติตามผลการประเมิน 82 คะแนน',
      actor: {
        id: 'u-approver-01',
        name: 'ประธานกรรมการพิจารณาอนุมัติ',
        role: 'approver',
      },
    }),
  }).then(r => r.json());

  console.log('Approve response:', approveRes);
  if (!approveRes.success) {
    throw new Error(`Approve API failed: ${approveRes.error}`);
  }

  // Step 4: Verify Post-Approval Status in Both Databases
  console.log('\n4. Verifying status in PostgreSQL & SQLite...');
  const appInPg = await prisma.assistanceApplication.findUnique({ where: { id: testAppId } });
  console.log('PostgreSQL Application status:', appInPg.status, 'approvedAmount:', appInPg.approvedAmount?.toString());

  const appInSqlite = await db.execute({
    sql: 'SELECT id, application_no, status, approval_status, approved_amount FROM assistance_applications WHERE id = ?',
    args: [testAppId],
  });
  console.log('SQLite Application status:', appInSqlite.rows[0].status, 'approval_status:', appInSqlite.rows[0].approval_status, 'approved_amount:', appInSqlite.rows[0].approved_amount);

  if (appInPg.status !== 'wait_disbursement') {
    throw new Error(`Expected PostgreSQL status 'wait_disbursement', got '${appInPg.status}'`);
  }
  if (appInSqlite.rows[0].status !== 'wait_disbursement') {
    throw new Error(`Expected SQLite status 'wait_disbursement', got '${appInSqlite.rows[0].status}'`);
  }

  // Step 5: Verify Updated Summary API
  console.log('\n5. Verifying summary API after approval...');
  const sumRes2 = await fetch('http://localhost:3000/api/approvals/summary').then(r => r.json());
  console.log('Summary after:', sumRes2.data);

  if (sumRes2.data.pendingCount !== initialPendingCount - 1) {
    throw new Error(`Expected pendingCount to decrease by 1 from ${initialPendingCount} to ${initialPendingCount - 1}, got ${sumRes2.data.pendingCount}`);
  }
  if (sumRes2.data.approvedCount !== initialApprovedCount + 1) {
    throw new Error(`Expected approvedCount to increase by 1 from ${initialApprovedCount} to ${initialApprovedCount + 1}, got ${sumRes2.data.approvedCount}`);
  }
  if (sumRes2.data.totalApprovedAmount !== initialApprovedAmount + 5000) {
    throw new Error(`Expected totalApprovedAmount to increase by 5000 from ${initialApprovedAmount} to ${initialApprovedAmount + 5000}, got ${sumRes2.data.totalApprovedAmount}`);
  }

  // Step 6: Test Double-Approval Guard (Phase 7)
  console.log('\n6. Testing duplicate approval guard (Phase 7)...');
  const duplicateApproveRes = await fetch(`http://localhost:3000/api/beneficiaries/${testAppId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      approvedAmount: 5000,
      notes: 'พยายามอนุมัติซ้ำรอบสอง',
      actor: {
        id: 'u-approver-01',
        name: 'ประธานกรรมการพิจารณาอนุมัติ',
        role: 'approver',
      },
    }),
  }).then(r => r.json());

  console.log('Duplicate approve response:', duplicateApproveRes);
  if (duplicateApproveRes.success) {
    throw new Error('Duplicate approval SHOULD HAVE BEEN BLOCKED, but it succeeded!');
  }
  console.log('✓ Duplicate approval correctly rejected with error:', duplicateApproveRes.error);

  // Step 7: Clean up test record
  console.log('\n7. Cleaning up test records...');
  // Release budget hold for test
  await prisma.fundAccount.updateMany({
    data: { committedAmount: { decrement: 5000 }, availableAmount: { increment: 5000 } },
    where: { code: 'FUND-01' },
  }).catch(() => {});
  await prisma.faqirMiskinSubFund.updateMany({
    data: { committedAmount: { decrement: 5000 }, remainingAmount: { increment: 5000 } },
    where: { code: 'living' },
  }).catch(() => {});
  await db.execute({
    sql: 'UPDATE fund_accounts SET committed_amount = MAX(0, committed_amount - 5000), available_amount = available_amount + 5000 WHERE id = "fund-1"',
  }).catch(() => {});
  await db.execute({
    sql: 'UPDATE faqir_miskin_sub_funds SET committed_amount = MAX(0, committed_amount - 5000), remaining_amount = remaining_amount + 5000 WHERE id = "subf-1"',
  }).catch(() => {});

  await prisma.applicationHistory.deleteMany({ where: { applicationId: testAppId } }).catch(() => {});
  await prisma.beneficiaryAssessmentLegacy.deleteMany({ where: { applicationId: testAppId } }).catch(() => {});
  await prisma.assistanceApplication.deleteMany({ where: { id: testAppId } }).catch(() => {});
  await prisma.beneficiary.deleteMany({ where: { id: testBenId } }).catch(() => {});

  await db.execute({ sql: 'DELETE FROM beneficiary_assessments WHERE application_id = ?', args: [testAppId] });
  await db.execute({ sql: 'DELETE FROM assistance_applications WHERE id = ?', args: [testAppId] });
  await db.execute({ sql: 'DELETE FROM beneficiaries WHERE id = ?', args: [testBenId] });
  await db.execute({ sql: 'DELETE FROM households WHERE id = ?', args: ['hh-test-workbench-001'] });

  console.log('\n====================================================');
  console.log('ALL WORKBENCH VERIFICATION STEPS PASSED PERFECTLY!');
  console.log('====================================================\n');
}

run()
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
