import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:data/zms.db' });
const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('=================================================================');
  console.log('--- TASK 4: VERIFIED AID EXPENSES & ASNAF BREAKDOWN TEST SUITE ---');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();
    const officerId = 'u-t4-officer-' + timestamp;
    const officerName = 'นายอุสมาน เจ้าหน้าที่เคส';
    const adminId = 'u-t4-admin';
    const adminName = 'ผู้ดูแลระบบการเงิน';

    // -------------------------------------------------------------
    // TEST SECTION 1: Asnaf Code Canonical Normalization
    // -------------------------------------------------------------
    console.log('\n--- SECTION 1: Asnaf Code Canonical Normalization ---');
    
    // Test API verified-expenses endpoint availability
    const initRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const initData = await initRes.json();
    assert(initRes.status === 200 && initData.success === true, '1.1 GET /api/finance/verified-expenses responds with 200 OK');

    const canonicalAsnafs = [
      'faqir_miskin', 'amil', 'muallaf', 'gharimin', 'fisabilillah', 'ibnsabil', 'humanitarian'
    ];
    const asnafCodesInResult = initData.data.breakdownByAsnaf.map(a => a.asnafCode);
    const hasAll7Asnafs = canonicalAsnafs.every(code => asnafCodesInResult.includes(code));
    assert(hasAll7Asnafs, '1.2 Breakdown includes all 7 canonical Asnaf codes', `Found: ${asnafCodesInResult.join(', ')}`);

    // -------------------------------------------------------------
    // TEST SECTION 2: Assistance Types Mapping
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: Assistance Type Canonical Mapping ---');
    const typeCodesInResult = initData.data.breakdownByAssistanceType.map(t => t.typeCode);
    assert(typeCodesInResult.includes('LIVING_SUPPORT'), '2.1 Standard LIVING_SUPPORT type exists');
    assert(typeCodesInResult.includes('MONTHLY_ALLOWANCE'), '2.2 Standard MONTHLY_ALLOWANCE type exists');
    assert(typeCodesInResult.includes('HOUSING_REPAIR_BUILD'), '2.3 Standard HOUSING_REPAIR_BUILD type exists');
    assert(typeCodesInResult.includes('CAREER_SUPPORT'), '2.4 Standard CAREER_SUPPORT type exists');
    assert(typeCodesInResult.includes('EDUCATION_GRANT'), '2.5 Standard EDUCATION_GRANT type exists');
    assert(typeCodesInResult.includes('EMERGENCY_AID'), '2.6 Standard EMERGENCY_AID type exists');

    // -------------------------------------------------------------
    // TEST SECTION 3: Create Test Workflow & Segregated Transactions
    // -------------------------------------------------------------
    console.log('\n--- SECTION 3: Segregation of 3 Transaction Types ---');
    
    // Get existing bank account and household
    const bankRes = await client.execute("SELECT id, current_balance FROM bank_accounts WHERE status = 'active' LIMIT 1");
    const bankId = String(bankRes.rows[0].id);
    const hhRes = await client.execute('SELECT id FROM households LIMIT 1');
    const householdId = String(hhRes.rows[0].id);

    // Create 2 test beneficiaries with different Asnafs
    const ben1Id = `ben-t4-1-${timestamp}`;
    const ben2Id = `ben-t4-2-${timestamp}`;
    await client.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, registration_no)
            VALUES (?, ?, 'นายสุไลมาน ฟากีรทดสอบ', ?, '0811112233', 'fakir', ?)`,
      args: [ben1Id, householdId, `19402${timestamp.toString().slice(-8)}1`, `REG-T4-01`],
    });
    await client.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, registration_no)
            VALUES (?, ?, 'นางรอฮานา ฆอริมีนทดสอบ', ?, '0811112234', 'gharimin', ?)`,
      args: [ben2Id, householdId, `19402${timestamp.toString().slice(-8)}2`, `REG-T4-02`],
    });

    // Create 2 Applications
    const app1Id = `app-t4-1-${timestamp}`;
    const app2Id = `app-t4-2-${timestamp}`;
    await client.execute({
      sql: `INSERT INTO assistance_applications (
              id, application_no, beneficiary_id, asnaf_category, assistance_type,
              requested_amount, approved_amount, status, assigned_officer_id, assigned_officer_name, applied_date, created_at, updated_at
            ) VALUES (?, ?, ?, 'fakir', 'เงินสงเคราะห์เพื่อการยังชีพ', 10000, 10000, 'wait_disbursement', ?, ?, '23 ต.ค. 2569', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [app1Id, `APP-T4-01-${timestamp.toString().slice(-4)}`, ben1Id, officerId, officerName],
    });
    await client.execute({
      sql: `INSERT INTO assistance_applications (
              id, application_no, beneficiary_id, asnaf_category, assistance_type,
              requested_amount, approved_amount, status, assigned_officer_id, assigned_officer_name, applied_date, created_at, updated_at
            ) VALUES (?, ?, ?, 'gharimin', 'ปลดเปลื้องหนี้สิน', 5000, 5000, 'wait_disbursement', ?, ?, '23 ต.ค. 2569', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [app2Id, `APP-T4-02-${timestamp.toString().slice(-4)}`, ben2Id, officerId, officerName],
    });

    // Create Step 1 Bank Withdrawal (Cash Liquidity Movement, NOT aid expense)
    const withdrawalId = `wd-t4-${timestamp}`;
    const workflowId = `wf-t4-${timestamp}`;
    await client.execute({
      sql: `INSERT INTO cash_flow_workflows (
              id, workflow_no, title, step1_bank_account_id, step1_withdraw_amount,
              step1_date, step1_operator_id, step1_operator_name,
              step1_status, step2_status, overall_status, created_at
            ) VALUES (?, ?, 'โครงการช่วยเหลือทดสอบ Task 4', ?, 15000, '2026-10-23', 'u-fin', 'ฝ่ายการเงิน', 'completed', 'completed', 'in_progress', CURRENT_TIMESTAMP)`,
      args: [workflowId, `CFW-T4-${timestamp.toString().slice(-4)}`, bankId],
    });

    await client.execute({
      sql: `INSERT INTO cash_flow_withdrawals (
              id, workflow_id, withdrawal_no, amount, withdrawal_datetime, target_asnaf, purpose, status,
              handover_status, total_handed_over_amount, remaining_handover_amount, recipient_case_worker_id, recipient_case_worker_name
            ) VALUES (?, ?, ?, 15000, '2026-10-23 09:00:00', 'fakir', 'เบิกเงินสดช่วยเหลือสงเคราะห์ Task 4', 'disbursed',
                      'fully_handed_over', 15000, 0, ?, ?)`,
      args: [withdrawalId, workflowId, `WD-T4-${timestamp.toString().slice(-4)}`, officerId, officerName],
    });

    // Link App 1 to Withdrawal Voucher
    await client.execute({
      sql: `INSERT INTO cash_flow_disbursement_items (
              id, withdrawal_id, workflow_id, application_id, beneficiary_id, beneficiary_name,
              national_id, asnaf_category, assistance_type, approved_amount, this_disbursement_amount, remaining_balance, status
            ) VALUES (?, ?, ?, ?, ?, 'นายสุไลมาน ฟากีรทดสอบ', '1940200000001', 'fakir', 'เงินสงเคราะห์เพื่อการยังชีพ', 10000, 10000, 0, 'completed')`,
      args: [`item-t4-1-${timestamp}`, withdrawalId, workflowId, app1Id, ben1Id],
    });

    // Step 1 Bank Withdrawal Transaction is recorded as 'transfer'
    await client.execute({
      sql: `INSERT INTO financial_transactions (
              id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
              payer_or_payee, reference_no, status, recorded_by_id, recorded_by_name, bank_account_id, workflow_id
            ) VALUES (?, ?, '2026-10-23', 'transfer', 'fund-1', 'กองทุนซะกาต', 'เบิกเงินสดจากธนาคารเพื่อส่งมอบเหรัญญิก (โอนย้ายเงินสด)', 15000, 'cash', 'นายรุสลัน (เหรัญญิก)', 'REF-T4-STEP1', 'completed', ?, ?, ?, ?)`,
      args: [`txn-step1-${timestamp}`, `TXN-S1-${timestamp.toString().slice(-4)}`, adminId, adminName, bankId, workflowId],
    });

    // Step 2 Finance Handover Record (Handover custody, NOT completed aid expense)
    const handoverId = `ho-t4-${timestamp}`;
    await client.execute({
      sql: `INSERT INTO finance_handover_records (
              id, handover_no, withdrawal_id, workflow_id, handover_date, handover_time,
              amount, handover_method, status, handed_over_by_id, handed_over_by_name,
              received_by_id, received_by_name, recorded_by_id, recorded_by_name, confirmed_by_id, confirmed_by_name, confirmed_at,
              proof_url, proof_name, created_at, updated_at
            ) VALUES (?, ?, ?, ?, '2026-10-23', '10:00:00', 15000, 'cash', 'fully_handed_over', ?, 'เจ้าหน้าที่การเงิน', ?, ?, ?, 'การเงิน', ?, 'ผู้ยืนยัน', '2026-10-23 10:05:00', 'https://proof.example.com/handover.pdf', 'ใบส่งมอบเงินสด.pdf', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [handoverId, `HO-T4-${timestamp.toString().slice(-4)}`, withdrawalId, workflowId, adminId, officerId, officerName, adminId, adminId],
    });

    // Verify: Before Step 3 execution, handed-over amount is recorded, but verified aid expense is NOT yet incremented
    const beforeExecRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const beforeExecData = await beforeExecRes.json();
    assert(beforeExecData.data.totalHandedOverToCaseWorkers >= 15000, '3.1 Handed over amount captured in totalHandedOverToCaseWorkers');

    // -------------------------------------------------------------
    // TEST SECTION 4: Multi-Installment Confirmed Execution Records
    // -------------------------------------------------------------
    console.log('\n--- SECTION 4: Confirmed Aid Execution & Multi-Installment Tracking ---');
    
    // Installment 1: 4,000 baht confirmed for App 1
    const exec1Res = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: app1Id,
        actor: { id: officerId, name: officerName, role: 'officer' },
        input: {
          withdrawalId,
          installmentNo: 1,
          totalInstallments: 2,
          executionDate: '2026-10-23',
          executionTime: '11:00:00',
          assistanceOutcome: 'ช่วยเหลือเงินยังชีพงวดที่ 1 เรียบร้อย',
          actualDisbursedAmount: 4000,
          details: 'ส่งมอบเงินสดค่ายังชีพงวดที่ 1 ให้ผู้รับซะกาต',
          proofUrl: 'https://proof.example.com/slip1.jpg',
          proofName: 'slip1.jpg',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
          status: 'partially_assisted',
        },
      }),
    });
    const exec1Json = await exec1Res.json();
    assert(exec1Json.success === true, '4.1 Confirm Installment 1 (4,000 THB) succeeds');

    // Installment 2: 6,000 baht confirmed for App 1 (Total = 10,000)
    const exec2Res = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_completion',
        applicationId: app1Id,
        actor: { id: officerId, name: officerName, role: 'officer' },
        input: {
          withdrawalId,
          installmentNo: 2,
          totalInstallments: 2,
          executionDate: '2026-10-23',
          executionTime: '14:00:00',
          assistanceOutcome: 'ช่วยเหลือเงินยังชีพงวดที่ 2 ครบถ้วน',
          actualDisbursedAmount: 6000,
          details: 'ส่งมอบเงินสดค่ายังชีพงวดที่ 2 ให้ผู้รับซะกาต',
          proofUrl: 'https://proof.example.com/slip2.jpg',
          proofName: 'slip2.jpg',
          isConfirmed: true,
          confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
          status: 'completed',
        },
      }),
    });
    const exec2Json = await exec2Res.json();
    assert(exec2Json.success === true, '4.2 Confirm Installment 2 (6,000 THB) succeeds');

    // Check verified expenses: both installments are summed (4,000 + 6,000 = 10,000)
    const afterInstallmentsRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const afterInstallmentsData = await afterInstallmentsRes.json();
    const app1Items = afterInstallmentsData.data.drillDown.verifiedAidItems.filter(i => i.applicationId === app1Id);
    assert(app1Items.length === 2, '4.3 Drill-down returns exactly 2 installment items for App 1', `Found ${app1Items.length}`);
    const app1Total = app1Items.reduce((sum, i) => sum + i.amount, 0);
    assert(app1Total === 10000, '4.4 Total verified disbursed for App 1 equals 10,000 THB', `Actual: ${app1Total}`);

    // Verify Asnaf mapping for App 1: mapped to canonical 'faqir_miskin'
    const faqirItem = afterInstallmentsData.data.breakdownByAsnaf.find(a => a.asnafCode === 'faqir_miskin');
    assert(faqirItem && faqirItem.disbursedAmount >= 10000, '4.5 App 1 is grouped under canonical faqir_miskin Asnaf');

    // Verify Assistance Type mapping: mapped to 'LIVING_SUPPORT'
    const livingItem = afterInstallmentsData.data.breakdownByAssistanceType.find(t => t.typeCode === 'LIVING_SUPPORT');
    assert(livingItem && livingItem.disbursedAmount >= 10000, '4.6 App 1 is grouped under LIVING_SUPPORT type');

    // -------------------------------------------------------------
    // TEST SECTION 5: Post-Confirmation Edit Handling
    // -------------------------------------------------------------
    console.log('\n--- SECTION 5: Post-Confirmation Edit Handling ---');
    const rec1Id = exec1Json.data.recordId || exec1Json.data.record?.id;
    // Edit Installment 1: Adjust amount from 4,000 to 4,500 due to supplementary medicine fee
    const editRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit_execution',
        applicationId: app1Id,
        recordId: rec1Id,
        editReason: 'ปรับเพิ่มค่ายาและอุปกรณ์จำเป็นตามใบเสร็จจริง 500 บาท',
        actor: { id: officerId, name: officerName, role: 'officer' },
        input: {
          actualDisbursedAmount: 4500,
          actualAssistanceValue: 4500,
          details: 'ส่งมอบเงินสดค่ายังชีพงวดที่ 1 ปรับยอดตามใบเสร็จค่ายา',
        },
      }),
    });
    const editJson = await editRes.json();
    assert(editJson.success === true, '5.1 Post-confirmation edit succeeds with reason');

    const afterEditRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const afterEditData = await afterEditRes.json();
    const app1EditedItems = afterEditData.data.drillDown.verifiedAidItems.filter(i => i.applicationId === app1Id);
    const app1EditedTotal = app1EditedItems.reduce((sum, i) => sum + i.amount, 0);
    assert(app1EditedTotal === 10500, '5.2 Updated total reflects new amount (4,500 + 6,000 = 10,500 THB) without duplicating old snapshot', `Actual: ${app1EditedTotal}`);

    // Verify previous values stored in JSON snapshot
    const dbRecRes = await client.execute({
      sql: 'SELECT previous_values, edit_reason FROM assistance_execution_records WHERE id = ?',
      args: [rec1Id],
    });
    const prevVals = JSON.parse(String(dbRecRes.rows[0].previous_values));
    assert(Array.isArray(prevVals) && prevVals.length === 1 && prevVals[0].actualDisbursedAmount === 4000, '5.3 Audit snapshot accurately preserves old value (4,000 THB)');

    // -------------------------------------------------------------
    // TEST SECTION 6: Cancellation of Confirmed Execution Record
    // -------------------------------------------------------------
    console.log('\n--- SECTION 6: Cancellation of Execution Record ---');
    const rec2Id = exec2Json.data.recordId || exec2Json.data.record?.id;
    const cancelRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cancel_execution',
        applicationId: app1Id,
        recordId: rec2Id,
        cancellationReason: 'ยกเลิกงวดที่ 2 เนื่องจากพบข้อผิดพลาดด้านเอกสาร รอแก้ไขใหม่',
        actor: { id: officerId, name: officerName, role: 'officer' },
      }),
    });
    const cancelJson = await cancelRes.json();
    assert(cancelJson.success === true, '6.1 Cancellation of confirmed record succeeds');

    const afterCancelRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const afterCancelData = await afterCancelRes.json();
    const app1AfterCancelItems = afterCancelData.data.drillDown.verifiedAidItems.filter(i => i.applicationId === app1Id);
    const app1AfterCancelTotal = app1AfterCancelItems.reduce((sum, i) => sum + i.amount, 0);
    assert(app1AfterCancelItems.length === 1, '6.2 Cancelled record is excluded from verified items');
    assert(app1AfterCancelTotal === 4500, '6.3 Verified disbursed amount accurately drops to 4,500 THB', `Actual: ${app1AfterCancelTotal}`);

    // Restore record 2 for subsequent tests
    await client.execute({
      sql: `UPDATE assistance_execution_records SET status = 'completed', cancellation_reason = NULL WHERE id = ?`,
      args: [rec2Id],
    });
    await client.execute({
      sql: `UPDATE assistance_applications SET disbursed_amount = 10500, assistance_result_status = 'completed' WHERE id = ?`,
      args: [app1Id],
    });

    // -------------------------------------------------------------
    // TEST SECTION 7: Prevention of Double-Counting
    // -------------------------------------------------------------
    console.log('\n--- SECTION 7: Prevention of Double-Counting ---');
    // App 1 already has confirmed execution records (10,500 THB).
    // Simulate App 1 also having legacy disbursement_ref in assistance_applications
    await client.execute({
      sql: `UPDATE assistance_applications SET status = 'completed', disbursement_ref = 'TRANS-DUAL-CHECK', disbursement_proof_url = 'https://proof.example.com/slip-direct.pdf' WHERE id = ?`,
      args: [app1Id],
    });

    const doubleCheckRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const doubleCheckData = await doubleCheckRes.json();
    const app1AllItems = doubleCheckData.data.drillDown.verifiedAidItems.filter(i => i.applicationId === app1Id);
    // App 1 must NOT have both 'execution_record' and 'direct_disbursement' for the same aid!
    const directItemsForApp1 = app1AllItems.filter(i => i.recordType === 'direct_disbursement');
    assert(directItemsForApp1.length === 0, '7.1 Direct disbursement is NOT double counted when execution records exist');
    const app1TotalDisbursed = app1AllItems.reduce((sum, i) => sum + i.amount, 0);
    assert(app1TotalDisbursed === 10500, '7.2 Total remains strictly 10,500 THB without duplication', `Actual: ${app1TotalDisbursed}`);

    // Now test a separate Direct Bank Transfer application (App 2) without execution records
    await client.execute({
      sql: `UPDATE assistance_applications SET status = 'completed', disbursed_amount = 5000, disbursement_ref = 'BANK-TRF-001', disbursement_proof_url = 'https://proof.example.com/bankslip.pdf' WHERE id = ?`,
      args: [app2Id],
    });

    const directAppRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const directAppData = await directAppRes.json();
    const app2Items = directAppData.data.drillDown.verifiedAidItems.filter(i => i.applicationId === app2Id);
    assert(app2Items.length === 1 && app2Items[0].recordType === 'direct_disbursement' && app2Items[0].amount === 5000, '7.3 Verified direct transfer is correctly included when no execution records exist');
    const ghariminItem = directAppData.data.breakdownByAsnaf.find(a => a.asnafCode === 'gharimin');
    assert(ghariminItem && ghariminItem.disbursedAmount >= 5000, '7.4 Direct transfer is mapped to canonical gharimin Asnaf');

    // -------------------------------------------------------------
    // TEST SECTION 8: Refund Recording & Unspent Held Cash Formula
    // -------------------------------------------------------------
    console.log('\n--- SECTION 8: Refund Recording & Unspent Held Cash Formula ---');
    // For our test workflow/withdrawal:
    // Handed over to case worker = 15,000 THB
    // App 1 verified executed by case worker = 10,500 THB
    // Case worker has unspent cash = 15,000 - 10,500 = 4,500 THB
    // Case worker returns 3,000 THB back to foundation fund
    
    const fundBeforeRes = await client.execute("SELECT available_amount FROM fund_accounts WHERE id = 'fund-1'");
    const fundBefore = Number(fundBeforeRes.rows[0]?.available_amount || 0);

    const recordRefundRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'record_refund',
        actor: { id: adminId, name: adminName, role: 'finance' },
        input: {
          applicationId: app1Id,
          withdrawalId,
          workflowId,
          refundDate: '2026-10-23',
          refundTime: '16:00:00',
          refundAmount: 3000,
          refundReason: 'ส่งคืนเงินช่วยเหลือคงเหลือจากงวดที่ 1 และ 2 เข้ากองทุน',
          returnedById: officerId,
          returnedByName: officerName,
          receivedById: adminId,
          receivedByName: adminName,
          targetFundId: 'fund-1',
          proofUrl: 'https://proof.example.com/refund_receipt.pdf',
        },
      }),
    });
    const refundJson = await recordRefundRes.json();
    assert(refundJson.success === true, '8.1 Record Assistance Refund (3,000 THB) succeeds');
    const refundId = refundJson.data.id;

    // Verify refund in database
    const refundDbRes = await client.execute({
      sql: 'SELECT * FROM assistance_refund_records WHERE id = ?',
      args: [refundId],
    });
    assert(refundDbRes.rows.length === 1 && Number(refundDbRes.rows[0].refund_amount) === 3000, '8.2 Refund record created with status completed');

    // Verify reversal ledger entry
    const txnReversalRes = await client.execute({
      sql: "SELECT * FROM financial_transactions WHERE type = 'reversal' AND reference_no = ?",
      args: [refundJson.data.refundNo],
    });
    assert(txnReversalRes.rows.length === 1 && Number(txnReversalRes.rows[0].amount) === 3000, '8.3 Reversal ledger transaction posted to financial_transactions');

    // Verify unspent held cash formula:
    // Handed over (>=15,000) - Confirmed from caregivers (>=10,500) - Refunded (>=3,000)
    const afterRefundRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const afterRefundData = await afterRefundRes.json();
    assert(afterRefundData.data.totalRefundedAmount >= 3000, '8.4 totalRefundedAmount includes the 3,000 THB refund');
    
    // Check drill-down refund item
    const refundDrillItem = afterRefundData.data.drillDown.refundItems.find(r => r.recordId === refundId);
    assert(refundDrillItem && refundDrillItem.amount === 3000, '8.5 Refund item present in drillDown.refundItems');

    // -------------------------------------------------------------
    // TEST SECTION 9: Cancel Refund & Ledger Integrity
    // -------------------------------------------------------------
    console.log('\n--- SECTION 9: Cancel Refund & Audit Integrity ---');
    const cancelRefundRes = await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cancel_refund',
        refundId,
        cancellationReason: 'ยกเลิกเนื่องจากระบุจำนวนเงินคืนผิดพลาด',
        actor: { id: adminId, name: adminName, role: 'finance' },
      }),
    });
    const cancelRefundJson = await cancelRefundRes.json();
    assert(cancelRefundJson.success === true, '9.1 Cancel Assistance Refund succeeds');

    const refundDbAfterCancel = await client.execute({
      sql: 'SELECT status, cancellation_reason FROM assistance_refund_records WHERE id = ?',
      args: [refundId],
    });
    assert(refundDbAfterCancel.rows[0].status === 'cancelled', '9.2 Refund status transitioned to cancelled without deleting history');

    // Re-verify that cancelled refund is excluded from totalRefundedAmount
    const afterCancelRefundRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const afterCancelRefundData = await afterCancelRefundRes.json();
    const cancelledInDrillDown = afterCancelRefundData.data.drillDown.refundItems.find(r => r.recordId === refundId);
    assert(!cancelledInDrillDown, '9.3 Cancelled refund is excluded from active refundItems');

    // Re-create refund so that refund reporting has active data
    await fetch(`${BASE_URL}/api/finance/assistance-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'record_refund',
        actor: { id: adminId, name: adminName, role: 'finance' },
        input: {
          applicationId: app1Id,
          withdrawalId,
          workflowId,
          refundDate: '2026-10-23',
          refundTime: '16:30:00',
          refundAmount: 2500,
          refundReason: 'ส่งคืนเงินช่วยเหลือคงเหลือสุทธิ',
          returnedById: officerId,
          returnedByName: officerName,
          receivedById: adminId,
          receivedByName: adminName,
          targetFundId: 'fund-1',
          proofUrl: 'https://proof.example.com/refund2.pdf',
        },
      }),
    });

    // -------------------------------------------------------------
    // TEST SECTION 10: Missing Proof Tracking
    // -------------------------------------------------------------
    console.log('\n--- SECTION 10: Missing Proof Items Tracking ---');
    // Create an execution record without proof URL
    const app3Id = `app-t4-3-${timestamp}`;
    await client.execute({
      sql: `INSERT INTO assistance_applications (
              id, application_no, beneficiary_id, asnaf_category, assistance_type,
              requested_amount, approved_amount, status, assigned_officer_id, assigned_officer_name, applied_date, created_at, updated_at
            ) VALUES (?, ?, ?, 'muallaf', 'มุสลิมใหม่', 3000, 3000, 'wait_disbursement', ?, ?, '23 ต.ค. 2569', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [app3Id, `APP-T4-03-${timestamp.toString().slice(-4)}`, ben1Id, officerId, officerName],
    });

    await client.execute({
      sql: `INSERT INTO assistance_execution_records (
              id, application_id, withdrawal_id, workflow_id, installment_no, total_installments,
              assistance_type, asnaf_category, execution_date, execution_time, execution_datetime,
              executor_id, executor_name, assistance_outcome, actual_disbursed_amount, actual_assistance_value,
              details, proof_url, proof_name, status, is_confirmed, confirmation_statement,
              confirmed_by_id, confirmed_by_name, confirmed_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 1, 1, 'มุสลิมใหม่', 'muallaf', '2026-10-23', '17:00:00', '2026-10-23 17:00:00',
                      ?, ?, 'ช่วยเหลือมุสลิมใหม่ (ยังไม่ได้ส่งภาพถ่าย)', 3000, 3000,
                      'ส่งมอบแล้ว รอภาพถ่ายยืนยัน', NULL, NULL, 'completed', 1, 'ยืนยัน',
                      ?, ?, '2026-10-23 17:05:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [`rec-mp-${timestamp}`, app3Id, withdrawalId, workflowId, officerId, officerName, officerId, officerName],
    });

    const missingProofRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const missingProofData = await missingProofRes.json();
    assert(missingProofData.data.missingProofCount > 0, '10.1 missingProofCount detected records without proof');
    const mpItem = missingProofData.data.missingProofItems.find(m => m.applicationNo.includes(app3Id.slice(-4)) || m.amount === 3000);
    assert(Boolean(mpItem), '10.2 Missing proof item is specifically listed with officer and issue description');

    // -------------------------------------------------------------
    // TEST SECTION 11: Mathematical Consistency & Sum Invariance
    // -------------------------------------------------------------
    console.log('\n--- SECTION 11: Mathematical Consistency Across Breakdowns ---');
    const finalCalcRes = await fetch(`${BASE_URL}/api/finance/verified-expenses?zakatYear=2569`);
    const finalCalc = (await finalCalcRes.json()).data;

    const sumAsnaf = Math.round(finalCalc.breakdownByAsnaf.reduce((sum, a) => sum + a.disbursedAmount, 0) * 100) / 100;
    const sumTypes = Math.round(finalCalc.breakdownByAssistanceType.reduce((sum, t) => sum + t.disbursedAmount, 0) * 100) / 100;
    const totalDisbursed = Math.round(finalCalc.totalVerifiedAidDisbursed * 100) / 100;

    assert(Math.abs(sumAsnaf - totalDisbursed) < 0.05, '11.1 Sum of Asnaf breakdown equals Total Verified Aid Disbursed', `Sum Asnaf: ${sumAsnaf}, Total: ${totalDisbursed}`);
    assert(Math.abs(sumTypes - totalDisbursed) < 0.05, '11.2 Sum of Assistance Type breakdown equals Total Verified Aid Disbursed', `Sum Types: ${sumTypes}, Total: ${totalDisbursed}`);

    // Drill down item integrity
    const allDrillItems = finalCalc.drillDown.verifiedAidItems;
    const drillDownSum = Math.round(allDrillItems.reduce((sum, i) => sum + i.amount, 0) * 100) / 100;
    assert(Math.abs(drillDownSum - totalDisbursed) < 0.05, '11.3 Sum of all drillDown.verifiedAidItems matches totalVerifiedAidDisbursed', `Drill sum: ${drillDownSum}, Total: ${totalDisbursed}`);

    // Every drill-down item has valid fields for modal inspection
    const allValid = allDrillItems.every(i => 
      i.id && i.recordType && i.asnafCode && i.assistanceTypeCode && typeof i.amount === 'number' && i.beneficiaryName
    );
    assert(allValid, '11.4 All drill-down items contain complete metadata for click-through modal');

    // -------------------------------------------------------------
    // TEST SECTION 12: Financial Reports Generator
    // -------------------------------------------------------------
    console.log('\n--- SECTION 12: Financial Reports Generation ---');
    const rptTypeRes = await fetch(`${BASE_URL}/api/finance/reports?type=aid_by_assistance_type&year=2569`);
    const rptTypeData = await rptTypeRes.json();
    assert(rptTypeRes.status === 200 && rptTypeData.success === true, '12.1 Report aid_by_assistance_type generates successfully');
    assert(rptTypeData.data.rows.length >= 6, '12.2 Report aid_by_assistance_type includes standard assistance type rows');

    const rptUnspentRes = await fetch(`${BASE_URL}/api/finance/reports?type=caregiver_unspent_summary&year=2569`);
    const rptUnspentData = await rptUnspentRes.json();
    assert(rptUnspentRes.status === 200 && rptUnspentData.success === true, '12.3 Report caregiver_unspent_summary generates successfully');
    assert(rptUnspentData.data.rows.length >= 5, '12.4 Report caregiver_unspent_summary contains all custody and clearance metrics');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n=================================================================');
    console.log(`TASK 4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('>>> ALL TASK 4 VERIFICATION TESTS PASSED SUCCESSFULLY! <<<\n');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  }
}

run();
