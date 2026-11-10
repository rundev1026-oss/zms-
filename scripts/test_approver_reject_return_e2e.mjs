import { PrismaClient } from '../apps/api/node_modules/@prisma/client/index.js';
import { createClient } from '@libsql/client';
import path from 'path';

const prisma = new PrismaClient();
const dbPath = path.join(process.cwd(), 'data', 'zms.db');
const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
const db = createClient({ url: dbUrl });

async function run() {
  console.log('=== TEST REJECT & RETURN WORKFLOW SYNCHRONIZATION ===');

  const testBenId = 'b2000000-0000-4000-8000-000000000002';
  const testAppId1 = 'a2000000-0000-4000-8000-000000000002'; // For reject test
  const testAppId2 = 'a3000000-0000-4000-8000-000000000003'; // For return test
  const testIdNum = '1987654321099';

  // 1. Cleanup
  await prisma.applicationHistory.deleteMany({ where: { applicationId: { in: [testAppId1, testAppId2] } } }).catch(() => {});
  await prisma.assistanceApplication.deleteMany({ where: { id: { in: [testAppId1, testAppId2] } } }).catch(() => {});
  await prisma.beneficiary.deleteMany({ where: { id: testBenId } }).catch(() => {});

  await db.execute({ sql: 'DELETE FROM assistance_applications WHERE id IN (?, ?)', args: [testAppId1, testAppId2] });
  await db.execute({ sql: 'DELETE FROM beneficiaries WHERE id = ?', args: [testBenId] });
  await db.execute({ sql: 'DELETE FROM households WHERE id = ?', args: ['hh-test-reject-001'] });

  // 2. Create in PostgreSQL
  await prisma.beneficiary.create({
    data: {
      id: testBenId,
      registryNumber: 'REG-2569-TEST02',
      identityType: 'THAI_NATIONAL_ID',
      identityNumber: testIdNum,
      firstName: 'ยูซุฟ',
      lastName: 'สะมะแอ',
      phone: '0898765432',
      status: 'ELIGIBLE',
    },
  });

  await prisma.assistanceApplication.create({
    data: {
      id: testAppId1,
      applicationNo: 'APP-2569-REJ01',
      beneficiaryId: testBenId,
      asnafCategory: 'faqir_miskin',
      assistanceType: 'ปัจจัยยังชีพ',
      assistanceTypeId: 'subf-1',
      requestedAmount: 3000,
      status: 'pending_approval',
      assignedOfficerId: 'u-officer-99',
      assignedOfficerName: 'เจ้าหน้าที่สำรวจ',
    },
  });

  await prisma.assistanceApplication.create({
    data: {
      id: testAppId2,
      applicationNo: 'APP-2569-RET01',
      beneficiaryId: testBenId,
      asnafCategory: 'faqir_miskin',
      assistanceType: 'ปัจจัยยังชีพ',
      assistanceTypeId: 'subf-1',
      requestedAmount: 4000,
      status: 'pending_approval',
      assignedOfficerId: 'u-officer-99',
      assignedOfficerName: 'เจ้าหน้าที่สำรวจ',
    },
  });

  // 3. Create in SQLite
  await db.execute({
    sql: `INSERT INTO households (id, household_no, address, province, district, community, created_at, updated_at)
          VALUES ('hh-test-reject-001', 'HH-TEST-002', '456 ม.2', 'ปัตตานี', 'ยะหริ่ง', 'จะกว๊ะ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  });

  await db.execute({
    sql: `INSERT INTO beneficiaries (id, household_id, national_id, full_name, phone, asnaf_category, created_at, updated_at)
          VALUES (?, 'hh-test-reject-001', ?, 'นาย ยูซุฟ สะมะแอ', '0898765432', 'faqir_miskin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    args: [testBenId, testIdNum],
  });

  await db.execute({
    sql: `INSERT INTO assistance_applications (
            id, application_no, beneficiary_id,
            asnaf_category, assistance_type, assistance_type_id, specific_fund_id, requested_amount,
            status, assessment_status, approval_status, completion_status,
            assigned_officer_id, assigned_officer_name, applied_date,
            request_status, payment_status, delivery_status, followup_status,
            fiscal_year, created_at, updated_at
          ) VALUES (?, 'APP-2569-REJ01', ?, 'faqir_miskin', 'ปัจจัยยังชีพ', 'subf-1', 'subf-1', 3000,
                    'pending_approval', 'completed', 'pending', 'active', 'u-officer-99', 'เจ้าหน้าที่สำรวจ', '10/11/2569',
                    'submitted', 'pending', 'pending', 'pending', '2569', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    args: [testAppId1, testBenId],
  });

  await db.execute({
    sql: `INSERT INTO assistance_applications (
            id, application_no, beneficiary_id,
            asnaf_category, assistance_type, assistance_type_id, specific_fund_id, requested_amount,
            status, assessment_status, approval_status, completion_status,
            assigned_officer_id, assigned_officer_name, applied_date,
            request_status, payment_status, delivery_status, followup_status,
            fiscal_year, created_at, updated_at
          ) VALUES (?, 'APP-2569-RET01', ?, 'faqir_miskin', 'ปัจจัยยังชีพ', 'subf-1', 'subf-1', 4000,
                    'pending_approval', 'completed', 'pending', 'active', 'u-officer-99', 'เจ้าหน้าที่สำรวจ', '10/11/2569',
                    'submitted', 'pending', 'pending', 'pending', '2569', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    args: [testAppId2, testBenId],
  });

  // TEST REJECT
  console.log('\n--- TESTING REJECT APPLICATION ---');
  const rejRes = await fetch(`http://localhost:3000/api/beneficiaries/${testAppId1}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: 'คุณสมบัติไม่ตรงตามเกณฑ์อัสนัฟ',
      actor: { id: 'u-approver-01', name: 'ผู้อนุมัติ', role: 'approver' },
    }),
  }).then(r => r.json());

  console.log('Reject API result:', rejRes);
  if (!rejRes.success) throw new Error(`Reject failed: ${rejRes.error}`);

  const pgRej = await prisma.assistanceApplication.findUnique({ where: { id: testAppId1 } });
  const sqlRej = await db.execute({ sql: 'SELECT status, approval_status FROM assistance_applications WHERE id = ?', args: [testAppId1] });

  console.log('PostgreSQL status after reject:', pgRej.status);
  console.log('SQLite status after reject:', sqlRej.rows[0].status, sqlRej.rows[0].approval_status);

  if (pgRej.status !== 'rejected') throw new Error(`Expected PG status 'rejected', got ${pgRej.status}`);
  if (sqlRej.rows[0].status !== 'rejected') throw new Error(`Expected SQLite status 'rejected', got ${sqlRej.rows[0].status}`);

  // TEST RETURN
  console.log('\n--- TESTING RETURN APPLICATION ---');
  const retRes = await fetch(`http://localhost:3000/api/approvals/${testAppId2}/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notes: 'ขอเอกสารรับรองรายได้เพิ่มเติมจากผู้นำชุมชน',
      targetStatus: 'need_info',
      actor: { id: 'u-approver-01', name: 'ผู้อนุมัติ', role: 'approver' },
    }),
  }).then(r => r.json());

  console.log('Return API result:', retRes);
  if (!retRes.success) throw new Error(`Return failed: ${retRes.error}`);

  const pgRet = await prisma.assistanceApplication.findUnique({ where: { id: testAppId2 } });
  const sqlRet = await db.execute({ sql: 'SELECT status FROM assistance_applications WHERE id = ?', args: [testAppId2] });

  console.log('PostgreSQL status after return:', pgRet.status);
  console.log('SQLite status after return:', sqlRet.rows[0].status);

  if (pgRet.status !== 'need_info') throw new Error(`Expected PG status 'need_info', got ${pgRet.status}`);
  if (sqlRet.rows[0].status !== 'need_info') throw new Error(`Expected SQLite status 'need_info', got ${sqlRet.rows[0].status}`);

  // CLEANUP
  console.log('\n--- CLEANING UP ---');
  await prisma.applicationHistory.deleteMany({ where: { applicationId: { in: [testAppId1, testAppId2] } } }).catch(() => {});
  await prisma.assistanceApplication.deleteMany({ where: { id: { in: [testAppId1, testAppId2] } } }).catch(() => {});
  await prisma.beneficiary.deleteMany({ where: { id: testBenId } }).catch(() => {});

  await db.execute({ sql: 'DELETE FROM assistance_applications WHERE id IN (?, ?)', args: [testAppId1, testAppId2] });
  await db.execute({ sql: 'DELETE FROM beneficiaries WHERE id = ?', args: [testBenId] });
  await db.execute({ sql: 'DELETE FROM households WHERE id = ?', args: ['hh-test-reject-001'] });

  console.log('\n✓ REJECT & RETURN WORKFLOWS TESTED SUCCESSFULLY!\n');
}

run()
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
