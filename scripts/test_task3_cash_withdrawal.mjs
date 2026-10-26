/**
 * Test Suite for TASK 3: Cash Withdrawal from Treasurer
 * Run with: node scripts/test_task3_cash_withdrawal.mjs
 */

const BASE_URL = 'http://localhost:3000';

const actor = {
  id: 'u-admin-test',
  name: 'นายทดสอบ การเงิน',
  role: 'super_admin',
};

async function runTests() {
  console.log('====================================================');
  console.log('🧪 STARTING TASK 3 AUTOMATED TESTS: CASH WITHDRAWAL');
  console.log('====================================================\n');

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

  try {
    // ----------------------------------------------------
    // 1. Fetch current cash flow workflows
    // ----------------------------------------------------
    console.log('📌 Test 1: Fetching workflows and verifying Section 1 Summary Metrics...');
    const wfRes = await fetch(`${BASE_URL}/api/finance/cash-flow`);
    const wfJson = await wfRes.json();
    assert(wfRes.ok && wfJson.success, 'GET /api/finance/cash-flow returned 200 OK');

    const workflows = wfJson.data || [];
    assert(workflows.length > 0, `Found ${workflows.length} workflow(s) in system`);

    // Pick or create an active workflow where Step 2 is completed/received
    let activeWf = workflows.find((w) => (w.step2Status === 'received' || w.step2Status === 'completed') && (w.availableTreasurerCash || 0) >= 5000);

    if (!activeWf) {
      console.log('Creating a test workflow with Step 1 & Step 2 for testing...');
      // Fetch bank accounts
      const bankRes = await fetch(`${BASE_URL}/api/finance/bank-accounts`);
      const bankJson = await bankRes.json();
      const bank = (bankJson.data || bankJson.accounts || [])[0];

      const createRes = await fetch(`${BASE_URL}/api/finance/cash-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_workflow',
          input: {
            bankAccountId: bank.id,
            withdrawAmount: 50000,
            title: 'รอบเบิกเงินสดทดสอบ TASK 3',
            fundType: 'zakat',
            withdrawnByName: actor.name,
            notes: 'สร้างเพื่อทดสอบ TASK 3',
          },
          actor,
        }),
      });
      const createJson = await createRes.json();
      assert(createRes.ok && createJson.success, 'Created test workflow Step 1');
      const testWfId = createJson.data.workflowId;

      // Complete Step 2 (Deposit to Treasurer)
      const s2Res = await fetch(`${BASE_URL}/api/finance/cash-flow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 2,
          workflowId: testWfId,
          input: {
            depositAmount: 50000,
            status: 'received',
            proofUrl: 'https://example.com/receipt-step2.pdf',
            treasurerName: 'นายรุสลัน หะสาเมาะ',
            notes: 'เหรัญญิกรับมอบเงินสดครบถ้วนสำหรับทดสอบ',
          },
          actor,
        }),
      });
      const s2Json = await s2Res.json();
      assert(s2Res.ok && s2Json.success, 'Step 2 completed: Treasurer received ฿50,000');

      // Refresh workflows
      const refreshedRes = await fetch(`${BASE_URL}/api/finance/cash-flow`);
      const refreshedJson = await refreshedRes.json();
      activeWf = refreshedJson.data.find((w) => w.id === testWfId);
    }

    console.log(`Using workflow: ${activeWf.id} (${activeWf.workflowNo})`);
    console.log(`Current Available Treasurer Cash: ฿${activeWf.availableTreasurerCash}`);
    console.log(`Total Confirmed Disbursed: ฿${activeWf.totalConfirmedDisbursed}`);
    console.log(`Total In-Progress Withdrawals: ฿${activeWf.totalInProgressWithdrawals}`);
    console.log(`Pending Voucher Count: ${activeWf.pendingVoucherCount}`);

    assert(typeof activeWf.step2DepositAmount === 'number', 'step2DepositAmount is a valid number');
    assert(typeof activeWf.availableTreasurerCash === 'number', 'availableTreasurerCash is a valid number');
    assert(typeof activeWf.totalConfirmedDisbursed === 'number', 'totalConfirmedDisbursed is a valid number');
    assert(typeof activeWf.totalInProgressWithdrawals === 'number', 'totalInProgressWithdrawals is a valid number');
    assert(typeof activeWf.pendingVoucherCount === 'number', 'pendingVoucherCount is a valid number');

    const initialAvailable = activeWf.availableTreasurerCash;
    const initialConfirmed = activeWf.totalConfirmedDisbursed;
    const initialInProgress = activeWf.totalInProgressWithdrawals;
    const initialPendingCount = activeWf.pendingVoucherCount;

    // ----------------------------------------------------
    // 2. Test Section 2: Automatic Voucher Numbering
    // ----------------------------------------------------
    console.log('\n📌 Test 2: Auto-generation of Unique Voucher Number...');
    const nextNoRes = await fetch(`${BASE_URL}/api/finance/cash-flow?next_voucher_no=true`);
    const nextNoJson = await nextNoRes.json();
    assert(nextNoRes.ok && nextNoJson.success, 'GET next_voucher_no returned 200');
    assert(typeof nextNoJson.data === 'string' && nextNoJson.data.includes('/'), `Generated valid voucher number format: "${nextNoJson.data}"`);

    // ----------------------------------------------------
    // 3. Test Section 3: Purpose Separation & Restrictions
    // ----------------------------------------------------
    console.log('\n📌 Test 3: Purpose Selection & Strict Separation Rules...');

    // 3a. Reject mixing office expense with aid line items
    console.log('  Testing rejection: office_expense with aid items...');
    const invalidOfficeRes = await fetch(`${BASE_URL}/api/finance/cash-flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_withdrawal',
        input: {
          workflowId: activeWf.id,
          amount: 1500,
          voucherType: 'office_expense',
          expenseCategory: 'office_supplies',
          purpose: 'ซื้อเครื่องเขียนสำนักงาน',
          aidItems: [
            {
              beneficiaryName: 'ผู้รับจำลอง',
              approvedAmount: 1500,
              thisDisbursementAmount: 1500,
            },
          ],
        },
        actor,
      }),
    });
    const invalidOfficeJson = await invalidOfficeRes.json();
    assert(!invalidOfficeRes.ok && invalidOfficeJson.error?.includes('ห้ามรวมค่าใช้จ่ายสำนักงานเป็นยอดช่วยเหลือผู้รับซะกาต'),
      'Strictly rejected office_expense containing beneficiary aid items');

    // 3b. Reject mixing aid_disbursement with office category
    console.log('  Testing rejection: aid_disbursement with expenseCategory...');
    const invalidAidRes = await fetch(`${BASE_URL}/api/finance/cash-flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_withdrawal',
        input: {
          workflowId: activeWf.id,
          amount: 2000,
          voucherType: 'aid_disbursement',
          expenseCategory: 'office_supplies',
          purpose: 'ช่วยเหลือผู้ยากไร้แต่มีหมวดสำนักงาน',
        },
        actor,
      }),
    });
    const invalidAidJson = await invalidAidRes.json();
    assert(!invalidAidRes.ok && invalidAidJson.error?.includes('ห้ามรวมหมวดค่าใช้จ่ายสำนักงานเข้ากับใบสำคัญเบิกเงินสดช่วยเหลือ'),
      'Strictly rejected aid_disbursement containing office expense category');

    // 3c. Reject mixing other_approved with aid items
    console.log('  Testing rejection: other_approved with aid items...');
    const invalidOtherRes = await fetch(`${BASE_URL}/api/finance/cash-flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_withdrawal',
        input: {
          workflowId: activeWf.id,
          amount: 3000,
          voucherType: 'other_approved',
          purpose: 'เบิกจ่ายตามมติบอร์ด',
          aidItems: [
            {
              beneficiaryName: 'ผู้รับจำลอง',
              approvedAmount: 3000,
              thisDisbursementAmount: 3000,
            },
          ],
        },
        actor,
      }),
    });
    const invalidOtherJson = await invalidOtherRes.json();
    assert(!invalidOtherRes.ok && invalidOtherJson.error?.includes('ห้ามรวมรายจ่ายอื่นที่ได้รับอนุมัติเข้ากับตารางช่วยเหลือ'),
      'Strictly rejected other_approved containing beneficiary aid items');

    // ----------------------------------------------------
    // 4. Test Section 4: Workflow Stages (Draft -> Pending -> Approved -> Disbursed)
    // ----------------------------------------------------
    console.log('\n📌 Test 4: Workflow Stages & Solvency Preservation...');

    // 4a. Create Draft Voucher
    console.log('  Creating Draft Voucher (฿1,000)...');
    const draftRes = await fetch(`${BASE_URL}/api/finance/cash-flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_withdrawal',
        input: {
          workflowId: activeWf.id,
          amount: 1000,
          status: 'draft',
          voucherType: 'office_expense',
          expenseCategory: 'office_supplies',
          purpose: 'ค่าอุปกรณ์สำนักงาน (แบบร่าง)',
          sourceFundType: 'admin',
          proofUrl: 'https://example.com/quotation-draft.pdf',
        },
        actor,
      }),
    });
    const draftJson = await draftRes.json();
    assert(draftRes.ok && draftJson.success, `Created Draft Voucher ${draftJson.data.withdrawalNo}`);
    const draftWithdrawalId = draftJson.data.withdrawalId;

    // Verify Available Cash is NOT deducted on Draft
    const afterDraftRes = await fetch(`${BASE_URL}/api/finance/cash-flow`);
    const afterDraftJson = await afterDraftRes.json();
    const wfAfterDraft = afterDraftJson.data.find((w) => w.id === activeWf.id);

    assert(wfAfterDraft.availableTreasurerCash === initialAvailable,
      `Available cash remained ฿${wfAfterDraft.availableTreasurerCash} (DRAFT DID NOT DEDUCT CASH)`);
    assert(wfAfterDraft.totalInProgressWithdrawals === initialInProgress + 1000,
      `In-progress withdrawals correctly increased by ฿1,000 (Now: ฿${wfAfterDraft.totalInProgressWithdrawals})`);
    assert(wfAfterDraft.pendingVoucherCount === initialPendingCount + 1,
      `Pending voucher count incremented by 1 (Now: ${wfAfterDraft.pendingVoucherCount})`);

    // 4b. Update Draft to Pending (Submit Approval)
    console.log('  Transitioning Draft to Pending...');
    const pendingRes = await fetch(`${BASE_URL}/api/finance/cash-flow`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_withdrawal',
        withdrawalId: draftWithdrawalId,
        input: {
          status: 'pending',
          notes: 'ส่งขออนุมัติต่อเหรัญญิก',
        },
        actor,
      }),
    });
    const pendingJson = await pendingRes.json();
    assert(pendingRes.ok && pendingJson.success, 'Transitioned to Pending successfully');

    // Verify Available Cash is STILL NOT deducted
    const afterPendingRes = await fetch(`${BASE_URL}/api/finance/cash-flow`);
    const afterPendingJson = await afterPendingRes.json();
    const wfAfterPending = afterPendingJson.data.find((w) => w.id === activeWf.id);
    assert(wfAfterPending.availableTreasurerCash === initialAvailable,
      `Available cash remained ฿${wfAfterPending.availableTreasurerCash} (PENDING DID NOT DEDUCT CASH)`);

    // 4c. Update Pending to Approved
    console.log('  Transitioning Pending to Approved...');
    const approvedRes = await fetch(`${BASE_URL}/api/finance/cash-flow`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_withdrawal',
        withdrawalId: draftWithdrawalId,
        input: {
          status: 'approved',
          approverName: 'อิหม่ามฟารุก อาลี',
          notes: 'อนุมัติเรียบร้อย รอเบิกจ่ายจริง',
        },
        actor,
      }),
    });
    const approvedJson = await approvedRes.json();
    assert(approvedRes.ok && approvedJson.success, 'Transitioned to Approved successfully');

    // 4d. Confirm Actual Disbursement (Disbursed) -> Cash MUST now be deducted
    console.log('  Confirming Actual Disbursement (Disbursed)...');
    const disburseRes = await fetch(`${BASE_URL}/api/finance/cash-flow`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_withdrawal',
        withdrawalId: draftWithdrawalId,
        input: {
          status: 'disbursed',
          notes: 'รับเงินสดจากเหรัญญิกจริงเรียบร้อยแล้ว',
        },
        actor,
      }),
    });
    const disburseJson = await disburseRes.json();
    assert(disburseRes.ok && disburseJson.success, 'Disbursed voucher successfully');

    // Verify Available Cash IS now deducted!
    const afterDisbursedRes = await fetch(`${BASE_URL}/api/finance/cash-flow`);
    const afterDisbursedJson = await afterDisbursedRes.json();
    const wfAfterDisbursed = afterDisbursedJson.data.find((w) => w.id === activeWf.id);
    assert(wfAfterDisbursed.availableTreasurerCash === initialAvailable - 1000,
      `Available cash correctly deducted by ฿1,000 (Now: ฿${wfAfterDisbursed.availableTreasurerCash})`);
    assert(wfAfterDisbursed.totalConfirmedDisbursed === initialConfirmed + 1000,
      `Confirmed disbursed increased by ฿1,000 (Now: ฿${wfAfterDisbursed.totalConfirmedDisbursed})`);
    assert(wfAfterDisbursed.totalInProgressWithdrawals === initialInProgress,
      `In-progress withdrawals cleared back down to ฿${wfAfterDisbursed.totalInProgressWithdrawals}`);
    assert(wfAfterDisbursed.pendingVoucherCount === initialPendingCount,
      `Pending voucher count decremented back to ${wfAfterDisbursed.pendingVoucherCount}`);

    // ----------------------------------------------------
    // 5. Test Overdraft Protection
    // ----------------------------------------------------
    console.log('\n📌 Test 5: Overdraft Protection...');
    const excessiveAmount = wfAfterDisbursed.availableTreasurerCash + 50000;
    console.log(`  Attempting to disburse ฿${excessiveAmount} when available is ฿${wfAfterDisbursed.availableTreasurerCash}...`);
    const overdraftRes = await fetch(`${BASE_URL}/api/finance/cash-flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_withdrawal',
        input: {
          workflowId: activeWf.id,
          amount: excessiveAmount,
          status: 'disbursed',
          voucherType: 'other_approved',
          purpose: 'พยายามเบิกเกินวงเงินคงเหลือ',
        },
        actor,
      }),
    });
    const overdraftJson = await overdraftRes.json();
    assert(!overdraftRes.ok && overdraftJson.error?.includes('ยอดเงินสดคงเหลือในมือเหรัญญิกไม่เพียงพอ'),
      'Strictly rejected overdraft exceeding available treasurer cash');

    // ----------------------------------------------------
    // 6. Test Purpose 3: Other Approved Purpose
    // ----------------------------------------------------
    console.log('\n📌 Test 6: Creating Voucher for "Other Approved Purpose"...');
    const otherRes = await fetch(`${BASE_URL}/api/finance/cash-flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_withdrawal',
        input: {
          workflowId: activeWf.id,
          amount: 500,
          status: 'draft',
          voucherType: 'other_approved',
          purpose: 'ค่าบำรุงรักษาสถานที่จัดกิจกรรมซะกาตตามมติคณะกรรมการ 04/2569',
          proofUrl: 'https://example.com/board-approval.pdf',
          proofName: 'มติคณะกรรมการ-04-2569.pdf',
        },
        actor,
      }),
    });
    const otherJson = await otherRes.json();
    assert(otherRes.ok && otherJson.success, `Successfully created Other Approved Voucher: ${otherJson.data.withdrawalNo}`);

    // ----------------------------------------------------
    // 7. Verify Proof & Attachments Persistence
    // ----------------------------------------------------
    console.log('\n📌 Test 7: Verifying Attachments & Audit Proof Persistence...');
    const wfCheckRes = await fetch(`${BASE_URL}/api/finance/cash-flow`);
    const wfCheckJson = await wfCheckRes.json();
    const currentWf = wfCheckJson.data?.find((w) => w.id === activeWf.id);
    assert(currentWf && Array.isArray(currentWf.attachments), 'Workflow attachments array is present');
    const attachments = currentWf?.attachments || [];
    console.log(`  Found ${attachments.length} attachment(s) for workflow`);
    const step3Attachments = attachments.filter((a) => a.stepNumber === 3);
    console.log(`  Found ${step3Attachments.length} Step 3 withdrawal attachment(s)`);
    assert(step3Attachments.length >= 2, 'Step 3 withdrawal attachments correctly persisted in database');

    console.log('\n====================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Unhandled test exception:', error);
    process.exit(1);
  }
}

runTests();
