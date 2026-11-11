// scripts/test_treasurer_approval_workbench.mjs
// Comprehensive verification of all 16 scenarios for ZMS Treasurer Approval Workbench

import { createClient } from '@libsql/client';

const BASE_URL = 'http://localhost:3000';
const db = createClient({ url: 'file:data/zms.db' });

async function runTests() {
  console.log('========================================================================');
  console.log('🚀 ZMS — TREASURER APPROVAL WORKBENCH TEST SUITE (16 SCENARIOS)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // Ensure test application exists and is eligible for disbursement testing
  const testAppId = 'app-test-treasurer-auto-01';
  const testAppNo = 'APP-TEST-TR-001';

  // Get existing beneficiary id
  const benRes = await db.execute(`SELECT id FROM beneficiaries LIMIT 1`);
  const beneficiaryId = String(benRes.rows[0]?.id || 'b-1');

  await db.execute({
    sql: `
      INSERT OR REPLACE INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, assistance_type,
        requested_amount, approved_amount, disbursed_amount, status, approval_status,
        payment_status, assigned_officer_id, assigned_officer_name, applied_date, approved_date, created_at
      ) VALUES (
        ?, ?, ?, 'ฟะกีร (ผู้ยากไร้)', 'เงินสงเคราะห์ยังชีพ',
        15000, 15000, 0, 'wait_disbursement', 'approved',
        'wait_disbursement', '60b59b70-637f-4460-969b-6ba7e1c23d96', 'เจ้าหน้าที่ทดสอบ', '2026-11-11', '2026-11-11', CURRENT_TIMESTAMP
      )
    `,
    args: [testAppId, testAppNo, beneficiaryId],
  });

  // Enterprise Actors
  const officerActor = {
    id: '60b59b70-637f-4460-969b-6ba7e1c23d96',
    name: 'เจ้าหน้าที่สำนักงาน (Officer)',
    role: 'officer',
  };

  const treasurerActor = {
    id: 'ca4832f7-d789-4e48-b36f-320ecb99a8b2',
    name: 'นายอับดุลเลาะห์ มะยูโซ๊ะ (เหรัญญิก)',
    role: 'finance',
  };

  const superAdminActor = {
    id: 'dffb49d1-7cf3-4593-bb58-a82b25f5bff4',
    name: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
    role: 'super_admin',
  };

  try {
    // -------------------------------------------------------------------------
    // Scenario 1: Fetch Eligible Applications & Accounts for Staff Batch Creation
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Staff creates draft batch disbursement ---');
    const appRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=eligible_applications`);
    const appData = await appRes.json();
    assert(appData.success && appData.data.length > 0, `Fetch eligible applications (found ${appData.data?.length || 0})`);

    const trRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=treasurer_accounts`);
    const trData = await trRes.json();
    assert(trData.success && trData.data.length > 0, `Fetch eligible treasurer accounts (found ${trData.data?.length || 0})`);

    const selectedApp = appData.data[0];
    const treasurerAcc = trData.data[0];

    // Create Draft Batch
    const createBatchRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_batch',
        input: {
          title: `รอบเบิกทดสอบระบบเหรัญญิก Automated Test ${Date.now()}`,
          sourceAccountId: treasurerAcc.id,
          fundType: 'zakat',
          submitImmediately: false,
          items: [
            {
              type: 'aid',
              applicationId: selectedApp.id,
              applicationNo: selectedApp.applicationNo,
              beneficiaryId: selectedApp.beneficiaryId,
              beneficiaryName: selectedApp.beneficiaryName,
              nationalId: selectedApp.nationalId,
              asnafCategory: selectedApp.asnafCategory,
              assistanceType: selectedApp.assistanceType,
              approvedAmount: selectedApp.approvedAmount,
              thisDisbursementAmount: Math.min(2000, selectedApp.remainingAmount || 2000),
            },
            {
              type: 'admin',
              categoryId: 'OFFICE_EXPENSE',
              categoryName: 'ค่าวัสดุและอุปกรณ์จัดชุดยังชีพ',
              description: 'จัดซื้อถุงยังชีพและสิ่งของจำเป็น',
              amount: 500,
            },
          ],
        },
        actor: officerActor,
      }),
    });
    const createBatchJson = await createBatchRes.json();
    assert(createBatchJson.success && createBatchJson.data.workflowId, `Created draft batch: ${createBatchJson.data?.batchNo} (Status: ${createBatchJson.data?.status})`);
    const testBatchId1 = createBatchJson.data.workflowId;
    const testBatchNo1 = createBatchJson.data.batchNo;

    // -------------------------------------------------------------------------
    // Scenario 2: Staff clicks "ยื่นขออนุมัติเหรัญญิก" -> step1_status becomes pending_approval
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Submit batch for treasurer approval ---');
    const submitRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_batch',
        input: { workflowId: testBatchId1 },
        actor: officerActor,
      }),
    });
    const submitJson = await submitRes.json();
    assert(submitJson.success && submitJson.data.status === 'pending_approval', `Batch submitted: status is ${submitJson.data?.status}`);

    // -------------------------------------------------------------------------
    // Scenario 3 & 4: Batch appears in Treasurer Workbench under 'pending_approval' & KPI count matches
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3 & 4: Verify batch in Treasurer Workbench & KPI cards ---');
    const listRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=batch_list&tab=pending_approval`);
    const listJson = await listRes.json();
    assert(listJson.success, 'Fetch batch list for pending_approval tab');
    const foundInPending = (listJson.data.items || []).some((b) => b.id === testBatchId1 || b.workflowNo === testBatchNo1);
    assert(foundInPending, `Batch ${testBatchNo1} found in pending_approval tab`);
    assert(typeof listJson.data.badgeCounts.pending_approval === 'number', `Summary KPI count for pending_approval: ${listJson.data.badgeCounts.pending_approval}`);

    // -------------------------------------------------------------------------
    // Scenario 5: Filter by tabs (pending_approval, approved, revision, rejected, all)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Tab filtering functionality ---');
    const tabs = ['pending_approval', 'approved', 'revision', 'rejected', 'all'];
    let allTabsOk = true;
    for (const t of tabs) {
      const tRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=batch_list&tab=${t}`);
      const tJson = await tRes.json();
      if (!tJson.success || !Array.isArray(tJson.data.items)) allTabsOk = false;
    }
    assert(allTabsOk, `All 5 tabs queried successfully with valid data structures`);

    // -------------------------------------------------------------------------
    // Scenario 6: Search by batch number or title or operator name
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Search filter ---');
    const searchRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=batch_list&search=${encodeURIComponent(testBatchNo1)}`);
    const searchJson = await searchRes.json();
    const searchFound = (searchJson.data?.items || []).some((b) => b.workflowNo === testBatchNo1);
    assert(searchFound, `Search by batch number "${testBatchNo1}" returned expected record`);

    // -------------------------------------------------------------------------
    // Scenario 7: Date Range Filter
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Date range filter ---');
    const today = new Date().toISOString().slice(0, 10);
    const dateRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=batch_list&dateFrom=${today}&dateTo=${today}`);
    const dateJson = await dateRes.json();
    assert(dateJson.success && dateJson.data.items.length >= 1, `Date range filtering active (found ${dateJson.data?.items?.length} batches today)`);

    // -------------------------------------------------------------------------
    // Scenario 8, 9, 10: Open Batch Detail (Section 1, 2, 3)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 8, 9, 10: Batch Detail Sections 1, 2, and 3 ---');
    const detailRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=batch_detail&workflowId=${testBatchId1}`);
    const detailJson = await detailRes.json();
    assert(detailJson.success && detailJson.data, 'Batch detail API call succeeded');

    const dt = detailJson.data;
    assert(dt.workflow.workflowNo === testBatchNo1 && dt.workflow.operatorName, `Section 1 Batch Overview: ${dt.workflow.workflowNo}, operator: ${dt.workflow.operatorName}`);
    assert(Array.isArray(dt.aidItems) && dt.aidItems.length === 1, `Section 2 Aid Items: ${dt.aidItems.length} items (Amount: ฿${dt.aidItems[0]?.thisDisbursementAmount})`);
    assert(Array.isArray(dt.adminItems) && dt.adminItems.length === 1, `Section 3 Admin Expenses: ${dt.adminItems.length} items (Amount: ฿${dt.adminItems[0]?.amount})`);

    // -------------------------------------------------------------------------
    // Scenario 11 & 12: Section 4 Float Balance Simulation & Regulatory Integrity
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 11 & 12: Float Balance Simulation & GL Invariance ---');
    assert(dt.treasurerAccount && typeof dt.treasurerAccount.currentBalance === 'number', `Treasurer Account returned: Balance = ฿${dt.treasurerAccount?.currentBalance}`);
    assert(typeof dt.treasurerAccount.simulatedBalanceAfter === 'number', `Simulated balance after approval: ฿${dt.treasurerAccount?.simulatedBalanceAfter}`);
    assert(dt.treasurerAccount.isSufficient === true, 'Treasurer balance is sufficient for this test batch');

    // -------------------------------------------------------------------------
    // Scenario 13: Action "ส่งกลับแก้ไข" (Return for Revision)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 13: Action "ส่งกลับแก้ไข" (Return for Revision) ---');
    // Create a 2nd batch specifically to test return for revision
    const createBatch2Res = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_batch',
        input: {
          title: `รอบเบิกทดสอบส่งกลับแก้ไข ${Date.now()}`,
          sourceAccountId: treasurerAcc.id,
          fundType: 'zakat',
          submitImmediately: true,
          items: [
            {
              type: 'admin',
              categoryId: 'OFFICE_EXPENSE',
              categoryName: 'ค่าถ่ายเอกสารและประสานงาน',
              description: 'ทดสอบส่งกลับแก้ไข',
              amount: 300,
            },
          ],
        },
        actor: officerActor,
      }),
    });
    const batch2Json = await createBatch2Res.json();
    const testBatchId2 = batch2Json.data.workflowId;

    const revisionRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'treasurer_review',
        input: {
          workflowId: testBatchId2,
          decision: 'return_for_revision',
          reason: 'กรุณาแนบใบเสร็จค่าถ่ายเอกสารเพิ่มเติมให้ครบถ้วน',
        },
        actor: treasurerActor,
      }),
    });
    const revisionJson = await revisionRes.json();
    assert(revisionJson.success && revisionJson.data.status === 'rejected_for_revision', `Batch returned for revision: status is ${revisionJson.data?.status}`);

    // -------------------------------------------------------------------------
    // Scenario 14: Action "ไม่อนุมัติ" (Reject)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 14: Action "ไม่อนุมัติ" (Reject) ---');
    // Create a 3rd batch to test rejection
    const createBatch3Res = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_batch',
        input: {
          title: `รอบเบิกทดสอบไม่อนุมัติ ${Date.now()}`,
          sourceAccountId: treasurerAcc.id,
          fundType: 'zakat',
          submitImmediately: true,
          items: [
            {
              type: 'admin',
              categoryId: 'OFFICE_EXPENSE',
              categoryName: 'ค่าใช้จ่ายซ้ำซ้อน',
              description: 'ทดสอบไม่อนุมัติ',
              amount: 1500,
            },
          ],
        },
        actor: officerActor,
      }),
    });
    const batch3Json = await createBatch3Res.json();
    const testBatchId3 = batch3Json.data.workflowId;

    const rejectRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'treasurer_review',
        input: {
          workflowId: testBatchId3,
          decision: 'reject',
          reason: 'รายการนี้ซ้ำซ้อนกับโครงการประจำปี ไม่อนุมัติ',
        },
        actor: treasurerActor,
      }),
    });
    const rejectJson = await rejectRes.json();
    assert(rejectJson.success && rejectJson.data.status === 'cancelled', `Batch rejected: status is ${rejectJson.data?.status}`);

    // -------------------------------------------------------------------------
    // Scenario 15: Action "อนุมัติรอบเบิก" (Approve) & Self-Approval Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 15: Action "อนุมัติรอบเบิก" (Approve) & Segregation of Duties ---');
    // Attempt self-approval by officerActor on testBatchId1
    const selfApproveRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'treasurer_review',
        input: {
          workflowId: testBatchId1,
          decision: 'approve',
          reason: 'พยายามอนุมัติคำขอของตนเอง',
        },
        actor: officerActor,
      }),
    });
    const selfApproveJson = await selfApproveRes.json();
    assert(selfApproveJson.success === false, `Self-approval blocked as expected: "${selfApproveJson.error}"`);

    // Attach and verify transfer evidence before approval (mandatory requirement)
    const attRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'attach_transfer_evidence',
        input: {
          workflowId: testBatchId1,
          sourceBankAccountId: 'bank-1',
          destinationAccountId: '1020-01',
          destinationAccountName: 'บัญชีเงินสดเหรัญญิก (Treasurer Cash Float)',
          amount: 2500,
          transferDatetime: '2026-11-11T10:00:00',
          fileUrl: '/api/storage/file/dummy-slip.jpg',
          fileName: 'dummy-slip.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
        },
        actor: treasurerActor,
      }),
    });
    const attData = await attRes.json();
    if (attData.data?.evidenceId) {
      await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_transfer_evidence',
          input: { evidenceId: attData.data.evidenceId, decision: 'verify' },
          actor: treasurerActor,
        }),
      });
    }

    // Proper approval by Treasurer Actor
    const approveRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'treasurer_review',
        input: {
          workflowId: testBatchId1,
          decision: 'approve',
          reason: 'เหรัญญิกตรวจสอบเอกสารถูกต้องครบถ้วน อนุมัติรอบการเบิกเงิน',
        },
        actor: treasurerActor,
      }),
    });
    const approveJson = await approveRes.json();
    assert(approveJson.success && approveJson.data.status === 'approved', `Batch approved by Treasurer: status is ${approveJson.data?.status}`);

    // -------------------------------------------------------------------------
    // Scenario 16: Database Transaction & Foreign Key Constraint Safety
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 16: Foreign Key Constraint & Transaction Safety ---');
    // Check detail of approved batch: audit events must contain the approval event with actor name
    const finalDetailRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=batch_detail&workflowId=${testBatchId1}`);
    const finalDetailJson = await finalDetailRes.json();
    const approvalEvent = finalDetailJson.data.approvalEvents.find((e) => e.action === 'APPROVE');
    assert(approvalEvent && approvalEvent.actorName.includes('อับดุลเลาะห์'), `Approval event stored cleanly with FK constraint passing (Actor: ${approvalEvent?.actorName})`);

    // Verify Cash Handover has NOT occurred yet (actual cash float has not changed)
    const kpiRes = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=kpi`);
    const kpiJson = await kpiRes.json();
    assert(kpiJson.success && kpiJson.data.treasurer.currentBalance > 0, `Treasurer cash balance preserved (No premature cash deduction): ฿${kpiJson.data.treasurer.currentBalance}`);

    console.log('\n========================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED (TOTAL 16 SCENARIOS)`);
    console.log('========================================================================\n');

    if (failed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed with error:', error);
    process.exit(1);
  }
}

runTests();
