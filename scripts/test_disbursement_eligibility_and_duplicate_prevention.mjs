import { createClient } from '@libsql/client';
import path from 'path';

const API_BASE = 'http://localhost:3000';
const dbPath = path.join(process.cwd(), 'data', 'zms.db');
const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
const client = createClient({ url: dbUrl });

const TEST_ACTOR = {
  id: 'u-3',
  name: 'อุสมาน เจริญสุข',
  role: 'officer',
};

async function postAction(action, input) {
  const res = await fetch(`${API_BASE}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, input, actor: TEST_ACTOR }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function getView(view, params = {}) {
  const p = new URLSearchParams({ view, ...params });
  const res = await fetch(`${API_BASE}/api/finance/workflow-actions?${p.toString()}`);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('  ZMS — TEST SUITE: DISBURSEMENT ELIGIBILITY & DUPLICATE PREVENTION');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Set up mock test records with clean IDs
  const TEST_RUN = Date.now().toString().slice(-6);
  const TEST_BEN_ID = '9115f11f-5efd-49f2-b6fc-0a0c0ebb8dc4';
  const TEST_APP_APPROVED = `app-test-apprv-${TEST_RUN}`;
  const TEST_APP_PENDING = `app-test-pend-${TEST_RUN}`;
  const TEST_APP_REJECTED = `app-test-rej-${TEST_RUN}`;
  const TEST_APP_DISBURSED = `app-test-disb-${TEST_RUN}`;
  const TEST_APP_PARTIAL = `app-test-part-${TEST_RUN}`;

  const APP_NO_APPRV = `APP-TEST-APPRV-${TEST_RUN}`;
  const APP_NO_PEND = `APP-TEST-PEND-${TEST_RUN}`;
  const APP_NO_REJ = `APP-TEST-REJ-${TEST_RUN}`;
  const APP_NO_DISB = `APP-TEST-DISB-${TEST_RUN}`;
  const APP_NO_PART = `APP-TEST-PART-${TEST_RUN}`;

  let batch1Id = null;
  let batch2Id = null;
  let multiBatchId = null;

  try {
    // 0. Clean up any leftover test data in foreign-key dependency order
    await client.execute("DELETE FROM cash_flow_disbursement_items WHERE application_id LIKE 'app-test-%'");
    await client.execute("DELETE FROM assistance_applications WHERE application_no LIKE 'APP-TEST-%' OR id LIKE 'app-test-%'");

    console.log('[SETUP] Seeding controlled test applications for beneficiary...');

    const baseFields = `
      id, application_no, beneficiary_id, asnaf_category, assistance_type,
      requested_amount, approved_amount, disbursed_amount, status,
      assigned_officer_id, assigned_officer_name, applied_date,
      request_status, assessment_status, approval_status, payment_status,
      delivery_status, followup_status, completion_status,
      branch_id, branch_name
    `;
    const today = new Date().toISOString().slice(0, 10);

    // 1. Approved application (8,000 THB, ready to disburse)
    await client.execute({
      sql: `INSERT INTO assistance_applications (${baseFields})
            VALUES (?, ?, ?, 'ยากจน/ขัดสน', 'ปัจจัยยังชีพ',
                    8000, 8000, 0, 'wait_disbursement',
                    'u-1', 'ผู้ดูแลระบบ', ?,
                    'approved', 'completed', 'approved', 'wait_disbursement',
                    'pending', 'pending', 'active',
                    'br-hq', 'สำนักงานใหญ่')`,
      args: [TEST_APP_APPROVED, APP_NO_APPRV, TEST_BEN_ID, today],
    });

    // 2. Pending approval application (5,000 THB, unapproved)
    await client.execute({
      sql: `INSERT INTO assistance_applications (${baseFields})
            VALUES (?, ?, ?, 'ยากจน/ขัดสน', 'ปัจจัยยังชีพ',
                    5000, 0, 0, 'pending_approval',
                    'u-1', 'ผู้ดูแลระบบ', ?,
                    'pending', 'pending', 'pending', 'wait_disbursement',
                    'pending', 'pending', 'active',
                    'br-hq', 'สำนักงานใหญ่')`,
      args: [TEST_APP_PENDING, APP_NO_PEND, TEST_BEN_ID, today],
    });

    // 3. Rejected application
    await client.execute({
      sql: `INSERT INTO assistance_applications (${baseFields})
            VALUES (?, ?, ?, 'ยากจน/ขัดสน', 'ปัจจัยยังชีพ',
                    6000, 0, 0, 'rejected',
                    'u-1', 'ผู้ดูแลระบบ', ?,
                    'rejected', 'completed', 'rejected', 'not_applicable',
                    'not_applicable', 'not_applicable', 'active',
                    'br-hq', 'สำนักงานใหญ่')`,
      args: [TEST_APP_REJECTED, APP_NO_REJ, TEST_BEN_ID, today],
    });

    // 4. Fully disbursed application (already paid 10,000 THB)
    await client.execute({
      sql: `INSERT INTO assistance_applications (${baseFields})
            VALUES (?, ?, ?, 'ยากจน/ขัดสน', 'ปัจจัยยังชีพ',
                    10000, 10000, 10000, 'disbursed',
                    'u-1', 'ผู้ดูแลระบบ', ?,
                    'approved', 'completed', 'approved', 'completed',
                    'completed', 'completed', 'active',
                    'br-hq', 'สำนักงานใหญ่')`,
      args: [TEST_APP_DISBURSED, APP_NO_DISB, TEST_BEN_ID, today],
    });

    // 5. Partially disbursed application (Approved 10,000 THB, disbursed 4,000 THB, remaining 6,000 THB)
    await client.execute({
      sql: `INSERT INTO assistance_applications (${baseFields})
            VALUES (?, ?, ?, 'ยากจน/ขัดสน', 'ทุนการศึกษา',
                    10000, 10000, 4000, 'wait_disbursement',
                    'u-1', 'ผู้ดูแลระบบ', ?,
                    'approved', 'completed', 'approved', 'partial',
                    'partial', 'pending', 'active',
                    'br-hq', 'สำนักงานใหญ่')`,
      args: [TEST_APP_PARTIAL, APP_NO_PART, TEST_BEN_ID, today],
    });

    console.log('[SETUP] Test applications seeded successfully.\n');

    // TEST 1: Query eligible applications returns approved and partial, excludes unapproved and disbursed
    console.log('[SCENARIO 1, 2 & 3] Testing GET view=eligible_applications filter...');
    const eligibleRes = await getView('eligible_applications', { search: 'APP-TEST-' });
    assert(eligibleRes.ok && eligibleRes.data.success, 'GET view=eligible_applications returns HTTP 200');

    const eligibleList = eligibleRes.data.data;
    const eligibleAppNos = eligibleList.map((a) => a.applicationNo);

    assert(eligibleAppNos.includes(APP_NO_APPRV), `Approved application (${APP_NO_APPRV}) is included in eligible list`);
    assert(eligibleAppNos.includes(APP_NO_PART), `Partially disbursed application (${APP_NO_PART}) is included in eligible list`);
    assert(!eligibleAppNos.includes(APP_NO_PEND), `Unapproved application (${APP_NO_PEND}) is strictly excluded`);
    assert(!eligibleAppNos.includes(APP_NO_REJ), `Rejected application (${APP_NO_REJ}) is strictly excluded`);
    assert(!eligibleAppNos.includes(APP_NO_DISB), `Fully disbursed application (${APP_NO_DISB}) is strictly excluded`);

    const appApprv = eligibleList.find((a) => a.applicationNo === APP_NO_APPRV);
    assert(appApprv?.remainingAmount === 8000, `${APP_NO_APPRV} remaining amount equals 8,000 THB`);

    const appPart = eligibleList.find((a) => a.applicationNo === APP_NO_PART);
    assert(appPart?.remainingAmount === 6000, `${APP_NO_PART} remaining amount correctly equals 6,000 THB (10,000 - 4,000)`);

    // TEST 4: Backend rejects invalid applications during batch creation
    console.log('\n[SCENARIO 4] Testing Backend rejection of unapproved, rejected, or disbursed applications...');
    const trRes = await getView('treasurer_accounts');
    assert(trRes.ok && trRes.data.data.length > 0, 'Fetched eligible treasurer account');
    const activeTreasurer = trRes.data.data[0];

    // Attempt to create batch with unapproved application
    const unapprvBatchRes = await postAction('create_batch', {
      title: 'พยายามเบิกคำร้องที่ยังไม่อนุมัติ',
      fundType: 'zakat',
      sourceAccountId: activeTreasurer.id,
      items: [
        {
          type: 'aid',
          applicationId: TEST_APP_PENDING,
          applicationNo: APP_NO_PEND,
          thisDisbursementAmount: 5000,
        },
      ],
    });
    assert(!unapprvBatchRes.ok && unapprvBatchRes.data.error.includes('ยังไม่ผ่านการอนุมัติ'), 
      `Backend rejected unapproved application: "${unapprvBatchRes.data?.error}"`);

    // Attempt to create batch with rejected application
    const rejBatchRes = await postAction('create_batch', {
      title: 'พยายามเบิกคำร้องที่ถูกปฏิเสธ',
      fundType: 'zakat',
      sourceAccountId: activeTreasurer.id,
      items: [
        {
          type: 'aid',
          applicationId: TEST_APP_REJECTED,
          applicationNo: APP_NO_REJ,
          thisDisbursementAmount: 6000,
        },
      ],
    });
    assert(!rejBatchRes.ok && rejBatchRes.data.error.includes('ไม่อนุมัติ'), 
      `Backend rejected rejected application: "${rejBatchRes.data?.error}"`);

    // Attempt to create batch with disbursed application
    const disbBatchRes = await postAction('create_batch', {
      title: 'พยายามเบิกคำร้องที่เบิกแล้ว',
      fundType: 'zakat',
      sourceAccountId: activeTreasurer.id,
      items: [
        {
          type: 'aid',
          applicationId: TEST_APP_DISBURSED,
          applicationNo: APP_NO_DISB,
          thisDisbursementAmount: 10000,
        },
      ],
    });
    assert(!disbBatchRes.ok && (disbBatchRes.data.error.includes('ครบถ้วน') || disbBatchRes.data.error.includes('ซ้ำ')), 
      `Backend rejected disbursed application: "${disbBatchRes.data?.error}"`);

    // TEST 5 & 6 & 7: Active Batch Hold & Exceeding Amount Prevention
    console.log('\n[SCENARIO 5, 6 & 7] Testing Active Batch Hold and Available Balance calculation...');

    // Requesting more than remaining should fail
    const exceedBatchRes = await postAction('create_batch', {
      title: 'พยายามเบิกเกินวงเงินคงเหลือ',
      fundType: 'zakat',
      sourceAccountId: activeTreasurer.id,
      items: [
        {
          type: 'aid',
          applicationId: TEST_APP_APPROVED,
          applicationNo: APP_NO_APPRV,
          thisDisbursementAmount: 9000, // Approved is 8,000
        },
      ],
    });
    assert(!exceedBatchRes.ok && exceedBatchRes.data.error.includes('เกินกว่าวงเงินคงเหลือ'), 
      `Backend blocked amount exceeding remaining balance: "${exceedBatchRes.data?.error}"`);

    // Create an active batch holding 5,000 THB of TEST_APP_APPROVED
    const batch1Res = await postAction('create_batch', {
      title: 'รอบเบิกเงินทดสอบระบบ #1 (ถือยอด 5,000 บาท)',
      fundType: 'zakat',
      sourceAccountId: activeTreasurer.id,
      submitImmediately: false,
      items: [
        {
          type: 'aid',
          applicationId: TEST_APP_APPROVED,
          applicationNo: APP_NO_APPRV,
          thisDisbursementAmount: 5000,
        },
      ],
    });
    assert(batch1Res.ok && batch1Res.data.success, `Successfully created active batch holding 5,000 THB (Workflow ID: ${batch1Res.data.data.workflowId})`);
    batch1Id = batch1Res.data.data.workflowId;

    // Now query eligible applications again
    const postBatch1Eligible = await getView('eligible_applications', { search: APP_NO_APPRV });
    const appPostBatch1 = postBatch1Eligible.data.data.find((a) => a.applicationNo === APP_NO_APPRV);
    assert(appPostBatch1?.pendingBatchAmount === 5000, 'pendingBatchAmount reflects 5,000 THB held in active batch');
    assert(appPostBatch1?.remainingAmount === 3000, 'Available remaining balance correctly reduced to 3,000 THB');

    // Create second batch taking the remaining 3,000 THB
    const batch2Res = await postAction('create_batch', {
      title: 'รอบเบิกเงินทดสอบระบบ #2 (ถือยอดที่เหลือ 3,000 บาท)',
      fundType: 'zakat',
      sourceAccountId: activeTreasurer.id,
      submitImmediately: false,
      items: [
        {
          type: 'aid',
          applicationId: TEST_APP_APPROVED,
          applicationNo: APP_NO_APPRV,
          thisDisbursementAmount: 3000,
        },
      ],
    });
    assert(batch2Res.ok && batch2Res.data.success, 'Successfully created second batch taking remaining 3,000 THB');
    batch2Id = batch2Res.data.data.workflowId;

    // Now TEST_APP_APPROVED has 0 remaining (5,000 in batch1, 3,000 in batch2)
    // It must NOT appear in getEligibleAssistanceApplications
    const refreshedEligible = await getView('eligible_applications', { search: APP_NO_APPRV });
    assert(refreshedEligible.data.data.length === 0, 'Fully committed application is hidden from eligible list');

    // Attempting to create a third batch with this application must throw duplicate hold error
    const thirdBatchRes = await postAction('create_batch', {
      title: 'พยายามเบิกซ้ำรอบที่ 3',
      fundType: 'zakat',
      sourceAccountId: activeTreasurer.id,
      items: [
        {
          type: 'aid',
          applicationId: TEST_APP_APPROVED,
          applicationNo: APP_NO_APPRV,
          thisDisbursementAmount: 1000,
        },
      ],
    });
    assert(!thirdBatchRes.ok && thirdBatchRes.data.error.includes('อยู่ระหว่างการเบิกจ่ายในรอบอื่นแล้ว'), 
      `Backend blocked duplicate addition when fully committed in other active batches: "${thirdBatchRes.data?.error}"`);

    // TEST 8: Intra-batch duplicate prevention
    console.log('\n[SCENARIO 8] Testing intra-batch duplicate prevention...');
    const intraDupRes = await postAction('create_batch', {
      title: 'รอบเบิกที่มีคำร้องซ้ำในตัวเอง',
      fundType: 'zakat',
      sourceAccountId: activeTreasurer.id,
      items: [
        {
          type: 'aid',
          applicationId: TEST_APP_PARTIAL,
          applicationNo: APP_NO_PART,
          thisDisbursementAmount: 2000,
        },
        {
          type: 'aid',
          applicationId: TEST_APP_PARTIAL,
          applicationNo: APP_NO_PART,
          thisDisbursementAmount: 2000,
        },
      ],
    });
    assert(!intraDupRes.ok && intraDupRes.data.error.includes('ถูกระบุซ้ำในรอบการเบิกเดียวกัน'), 
      `Backend blocked duplicate applicationId in single batch payload: "${intraDupRes.data?.error}"`);

    // TEST 9: Batch cancellation releases held amount
    console.log('\n[SCENARIO 9] Testing batch cancellation hold release...');
    // Cancel batch2 (which held 3,000 THB)
    await client.execute({
      sql: `UPDATE cash_flow_workflows SET overall_status = 'cancelled', step1_status = 'cancelled' WHERE id = ?`,
      args: [batch2Id],
    });
    await client.execute({
      sql: `UPDATE cash_flow_disbursement_items SET status = 'cancelled' WHERE workflow_id = ?`,
      args: [batch2Id],
    });

    const postCancelEligible = await getView('eligible_applications', { search: APP_NO_APPRV });
    const appPostCancel = postCancelEligible.data.data.find((a) => a.applicationNo === APP_NO_APPRV);
    assert(appPostCancel?.remainingAmount === 3000, 'Cancelling batch restored held amount: remaining balance is 3,000 THB again');

    // TEST 10: Multi-item batch with Aid and Admin items & Audit Log verification
    console.log('\n[SCENARIO 10] Testing multi-item batch creation with Aid + Admin and Audit Log...');
    const multiBatchRes = await postAction('create_batch', {
      title: 'รอบเบิกรวมความช่วยเหลือและค่าบริหาร',
      fundType: 'zakat',
      sourceAccountId: activeTreasurer.id,
      submitImmediately: true,
      items: [
        {
          type: 'aid',
          applicationId: TEST_APP_APPROVED,
          applicationNo: APP_NO_APPRV,
          thisDisbursementAmount: 3000,
          notes: 'เบิกจ่ายงวดที่ 2 ให้ครบถ้วน',
        },
        {
          type: 'aid',
          applicationId: TEST_APP_PARTIAL,
          applicationNo: APP_NO_PART,
          thisDisbursementAmount: 2500,
          notes: 'ทุนการศึกษางวดที่ 2',
        },
        {
          type: 'admin',
          categoryId: 'aec-3',
          categoryName: 'ค่าน้ำมันรถ',
          description: 'ค่าน้ำมันรถยนต์ลงพื้นที่สำรวจ',
          amount: 1500,
          payeeName: 'ปตท. ยะลา',
        },
      ],
    });
    if (!multiBatchRes.ok) {
      console.log('multiBatchRes error details:', multiBatchRes.data);
    }
    assert(multiBatchRes.ok && multiBatchRes.data.success, `Successfully created multi-item batch (Workflow ID: ${multiBatchRes.data?.data?.workflowId})`);
    multiBatchId = multiBatchRes.data?.data?.workflowId;

    // Verify Audit Log in database
    if (multiBatchId) {
      const auditRes = await client.execute({
        sql: `SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp DESC`,
        args: [multiBatchId],
      });
      assert(auditRes.rows.length > 0, `Audit log entry verified in database for multi-item batch: "${auditRes.rows[0]?.description}"`);
    }

    // TEST 11: Concurrency Protection — Two simultaneous requests claiming the same application
    console.log('\n[SCENARIO 11] Testing concurrency protection with simultaneous requests...');
    const TEST_APP_CONC = `app-test-conc-${TEST_RUN}`;
    const APP_NO_CONC = `APP-TEST-CONC-${TEST_RUN}`;
    await client.execute({
      sql: `INSERT INTO assistance_applications (${baseFields})
            VALUES (?, ?, ?, 'ยากจน/ขัดสน', 'ปัจจัยยังชีพ',
                    5000, 5000, 0, 'wait_disbursement',
                    'u-1', 'ผู้ดูแลระบบ', ?,
                    'approved', 'completed', 'approved', 'wait_disbursement',
                    'pending', 'pending', 'active',
                    'br-hq', 'สำนักงานใหญ่')`,
      args: [TEST_APP_CONC, APP_NO_CONC, TEST_BEN_ID, today],
    });

    const [concRes1, concRes2] = await Promise.all([
      postAction('create_batch', {
        title: 'รอบเบิกพร้อมกัน รายการที่ 1',
        fundType: 'zakat',
        sourceAccountId: activeTreasurer.id,
        items: [{ type: 'aid', applicationId: TEST_APP_CONC, applicationNo: APP_NO_CONC, thisDisbursementAmount: 5000 }],
      }),
      postAction('create_batch', {
        title: 'รอบเบิกพร้อมกัน รายการที่ 2',
        fundType: 'zakat',
        sourceAccountId: activeTreasurer.id,
        items: [{ type: 'aid', applicationId: TEST_APP_CONC, applicationNo: APP_NO_CONC, thisDisbursementAmount: 5000 }],
      }),
    ]);

    const concSuccesses = [concRes1, concRes2].filter((r) => r.ok && r.data.success);
    const concFailures = [concRes1, concRes2].filter((r) => !r.ok || !r.data.success);

    assert(concSuccesses.length === 1, `Exactly 1 concurrent request succeeded (success count: ${concSuccesses.length})`);
    assert(concFailures.length === 1, `The conflicting concurrent request was rejected: "${concFailures[0]?.data?.error}"`);

    const concBatchId = concSuccesses[0]?.data?.data?.workflowId;

    // Clean up test batches & applications
    console.log('\n[TEARDOWN] Cleaning up test records...');
    const deleteIds = [batch1Id, batch2Id, multiBatchId, concBatchId].filter(Boolean);
    if (deleteIds.length > 0) {
      const placeholders = deleteIds.map(() => '?').join(',');
      await client.execute({ sql: `DELETE FROM cash_flow_disbursement_items WHERE workflow_id IN (${placeholders})`, args: deleteIds });
      await client.execute({ sql: `DELETE FROM cash_flow_clearance_items WHERE workflow_id IN (${placeholders})`, args: deleteIds });
      await client.execute({ sql: `DELETE FROM cash_flow_withdrawals WHERE workflow_id IN (${placeholders})`, args: deleteIds });
      await client.execute({ sql: `DELETE FROM cash_flow_workflows WHERE id IN (${placeholders})`, args: deleteIds });
    }
    const testAppIds = [TEST_APP_APPROVED, TEST_APP_PENDING, TEST_APP_REJECTED, TEST_APP_DISBURSED, TEST_APP_PARTIAL, TEST_APP_CONC];
    const appPlaceholders = testAppIds.map(() => '?').join(',');
    await client.execute({ sql: `DELETE FROM assistance_applications WHERE id IN (${appPlaceholders})`, args: testAppIds });
    console.log('[TEARDOWN] Cleaned up test records.');

  } catch (error) {
    console.error('Unexpected error during test suite:', error);
    failed++;
  }

  console.log('\n========================================================================');
  console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(console.error);
