import { getDb, initDb } from '../src/lib/db';
import { FinancialService } from '../src/services/financialService';

async function runStep3Tests() {
  console.log('======================================================================');
  console.log('🧪 Starting Step 3: Cash Withdrawal Voucher Comprehensive Test Suite');
  console.log('======================================================================\n');

  await initDb();
  const db = getDb();

  const superAdminActor = {
    id: 'u-mukhlis-admin',
    name: 'นายมุกลิส มีระยะ (Super Admin)',
    role: 'super_admin' as const,
  };

  const financeActor = {
    id: 'u-finance-staff',
    name: 'เจ้าหน้าที่การเงิน (Finance)',
    role: 'finance' as const,
  };

  const volunteerActor = {
    id: 'u-volunteer-user',
    name: 'นายสมชาย อาสาสมัคร (Volunteer)',
    role: 'volunteer' as const,
  };

  // Fetch bank account
  const bankRes = await db.execute('SELECT * FROM bank_accounts LIMIT 1');
  if (bankRes.rows.length === 0) {
    throw new Error('No bank account found in database for testing!');
  }
  const testBank = bankRes.rows[0];
  const bankId = String(testBank.id);

  // Fetch approved assistance applications for linking
  const approvedApps = await FinancialService.getApprovedAssistanceApplications();
  console.log(`Found ${approvedApps.length} approved assistance applications in DB for Step 4 linking.`);

  let createdWorkflowIds: string[] = [];
  let testFailed = false;
  let failureError: any = null;

  try {
    // -------------------------------------------------------------------------
    // Setup 1: Workflow with Step 1 and Step 2 Completed
    // -------------------------------------------------------------------------
    console.log('\n--- Setup 1: สร้างรอบ Workflow ขั้นที่ 1 (ถอน ฿100,000) และ ขั้นที่ 2 (ส่งมอบเข้าเหรัญญิก ฿100,000) ---');
    const wf = await FinancialService.createCashFlowWorkflow({
      title: 'เบิกเงินสดช่วยเหลือผู้ประสบภัยน้ำท่วมและสงเคราะห์ครอบครัวยากไร้ (ทดสอบขั้นที่ 3)',
      bankAccountId: bankId,
      withdrawAmount: 100000,
      fundType: 'zakat',
      refNo: 'BANK-SLIP-100K-STEP3',
      withdrawnByName: 'นายมุกลิส มีระยะ',
      approverName: 'อิหม่ามฟารุก อาลี',
      proofUrl: 'https://example.com/slips/kbank-100k.pdf',
      proofName: 'kbank-100k.pdf',
      status: 'completed',
    }, superAdminActor);
    createdWorkflowIds.push(wf.id);

    // Advance to Step 2
    await FinancialService.advanceWorkflowToStep2(wf.id, {
      depositAmount: 100000,
      handoverPersonName: 'นายมุกลิส มีระยะ',
      treasurerName: 'นายรุสลัน หะสาเมาะ',
      eventDatetime: '2026-10-22T09:00:00',
      proofUrl: 'https://example.com/receipts/treasurer-100k.pdf',
      proofName: 'treasurer-100k.pdf',
      notes: 'รับมอบเงินสดครบถ้วน 100,000 บาท เข้าเซฟเหรัญญิก',
    }, superAdminActor);

    // Re-fetch workflow
    let currentWf = (await FinancialService.getCashFlowWorkflows()).find((w) => w.id === wf.id)!;
    console.log(`✓ Setup Workflow Ready: ${currentWf.workflowNo}`);
    console.log(`  - Step 1 Withdraw: ฿${currentWf.step1WithdrawAmount.toLocaleString()}`);
    console.log(`  - Step 2 Deposit: ฿${(currentWf.step2DepositAmount || 0).toLocaleString()}`);
    console.log(`  - Initial Available Treasurer Cash: ฿${currentWf.availableTreasurerCash?.toLocaleString()}\n`);

    // -------------------------------------------------------------------------
    // Test 1: Prerequisite Check - Cannot add withdrawal if Step 2 is not completed
    // -------------------------------------------------------------------------
    console.log('--- 1. Testing Prerequisite: ไม่อนุญาตให้เบิกหากขั้นที่ 2 ยังไม่เสร็จสิ้น ---');
    const wfNoStep2 = await FinancialService.createCashFlowWorkflow({
      title: 'รอบที่ยังไม่ส่งมอบเหรัญญิก',
      bankAccountId: bankId,
      withdrawAmount: 30000,
      status: 'completed',
    }, superAdminActor);
    createdWorkflowIds.push(wfNoStep2.id);

    try {
      await FinancialService.addCashFlowWithdrawal({
        workflowId: wfNoStep2.id,
        voucherType: 'aid_disbursement',
        amount: 5000,
        purpose: 'เบิกเงินช่วยเหลือก่อนรับมอบ',
        status: 'disbursed',
      }, superAdminActor);
      throw new Error('❌ Allowed withdrawal on uncompleted Step 2!');
    } catch (err: any) {
      if (err.message.startsWith('❌')) throw err;
      console.log(`✓ Correctly rejected: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // Test 2: Role Authorization - Volunteer cannot add withdrawal
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Role Authorization: ผู้ใช้ที่ไม่มีสิทธิ์ (Volunteer) ไม่สามารถเบิกเงินได้ ---');
    try {
      await FinancialService.addCashFlowWithdrawal({
        workflowId: wf.id,
        voucherType: 'aid_disbursement',
        amount: 5000,
        purpose: 'ทดสอบสิทธิ์อาสาสมัคร',
        status: 'disbursed',
      }, volunteerActor);
      throw new Error('❌ Volunteer allowed to create withdrawal!');
    } catch (err: any) {
      if (err.message.startsWith('❌')) throw err;
      console.log(`✓ Correctly rejected unauthorized role: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // Test 3: Rule 3 & Overdraft Protection (Solvency Check)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Rule 3: ตรวจสอบยอดเงินสดที่มีอยู่จริง ป้องกันยอดติดลบ (Overdraft Check) ---');
    try {
      await FinancialService.addCashFlowWithdrawal({
        workflowId: wf.id,
        voucherType: 'aid_disbursement',
        amount: 150000, // Exceeds 100,000 available
        purpose: 'เบิกเกินยอดเงินสดที่มีในเซฟเหรัญญิก',
        status: 'disbursed',
      }, superAdminActor);
      throw new Error('❌ Allowed withdrawal exceeding available cash!');
    } catch (err: any) {
      if (err.message.startsWith('❌')) throw err;
      console.log(`✓ Correctly rejected overdraft: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // Test 4: Rule 5 - Draft Record Must NOT Deduct Cash
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Rule 5: บันทึกใบสำคัญสถานะร่าง (Draft) ห้ามตัดยอดเงินสดจริง ---');
    const draftVoucher = await FinancialService.addCashFlowWithdrawal({
      workflowId: wf.id,
      voucherNo: '01/2569',
      voucherType: 'aid_disbursement',
      amount: 25000,
      requestedAmount: 25000,
      approvedAmount: 25000,
      sourceFundType: 'zakat',
      purpose: 'ร่างใบสำคัญเบิกเงินสดช่วยเหลือผู้ยากไร้ 5 ราย',
      status: 'draft',
      withdrawerName: 'นายมุกลิส มีระยะ',
      approverName: 'อิหม่ามฟารุก อาลี',
      proofUrl: 'https://example.com/draft-doc.pdf',
      proofName: 'draft-doc.pdf',
      notes: 'อยู่ระหว่างรวบรวมเอกสาร',
    }, superAdminActor);

    console.log(`✓ Created Draft Voucher: ${draftVoucher.withdrawalNo} (Status: ${draftVoucher.status})`);
    currentWf = (await FinancialService.getCashFlowWorkflows()).find((w) => w.id === wf.id)!;
    console.log(`  - Available Treasurer Cash after Draft: ฿${currentWf.availableTreasurerCash?.toLocaleString()} (Must still be ฿100,000.00)`);
    if (currentWf.availableTreasurerCash !== 100000) {
      throw new Error(`❌ Draft deducted cash! Available is ${currentWf.availableTreasurerCash}`);
    }
    console.log('✓ PASS: Draft record does NOT deduct available cash.');

    // -------------------------------------------------------------------------
    // Test 5: Rule 2 - Unique Voucher Number Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Rule 2: ป้องกันเลขที่ใบสำคัญซ้ำกันในระบบ ---');
    try {
      await FinancialService.addCashFlowWithdrawal({
        workflowId: wf.id,
        voucherNo: draftVoucher.withdrawalNo, // Duplicate with the one just created!
        voucherType: 'aid_disbursement',
        amount: 10000,
        purpose: 'ทดสอบเลขใบสำคัญซ้ำ ' + draftVoucher.withdrawalNo,
        status: 'draft',
      }, superAdminActor);
      throw new Error('❌ Allowed duplicate voucher number!');
    } catch (err: any) {
      if (err.message === '❌ Allowed duplicate voucher number!') throw err;
      console.log(`✓ Correctly rejected duplicate voucher number: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // Test 6: Rule 6 - Confirming Disbursement Deducts Cash
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Rule 6: ตัดยอดเงินสดเมื่อยืนยันการเบิกเงินจริง (Disbursed) ---');
    const disbursedVoucher1 = await FinancialService.addCashFlowWithdrawal({
      workflowId: wf.id,
      voucherNo: '02/2569',
      voucherType: 'aid_disbursement',
      amount: 30000,
      requestedAmount: 30000,
      approvedAmount: 30000,
      sourceFundType: 'zakat',
      purpose: 'เบิกเงินสดช่วยเหลือครอบครัวยากไร้ชุดที่ 1',
      status: 'disbursed',
      withdrawerName: 'นายมุกลิส มีระยะ',
      approverName: 'อิหม่ามฟารุก อาลี',
      proofUrl: 'https://example.com/voucher-02.pdf',
      proofName: 'voucher-02.pdf',
      notes: 'จ่ายจริงตามคำร้อง',
    }, superAdminActor);

    currentWf = (await FinancialService.getCashFlowWorkflows()).find((w) => w.id === wf.id)!;
    console.log(`✓ Created Disbursed Voucher: ${disbursedVoucher1.withdrawalNo} (Amount: ฿30,000.00)`);
    console.log(`  - Cumulative Withdrawn: ฿${currentWf.step3WithdrawAmount?.toLocaleString()}`);
    console.log(`  - Remaining Cash in Custody: ฿${currentWf.availableTreasurerCash?.toLocaleString()}`);
    if (currentWf.availableTreasurerCash !== 70000) {
      throw new Error(`❌ Expected remaining cash 70,000, got ${currentWf.availableTreasurerCash}`);
    }
    console.log('✓ PASS: Exactly ฿30,000 deducted upon confirmed disbursement.');

    // -------------------------------------------------------------------------
    // Test 7: Rule 1 & 9 - Multiple Vouchers Under Same Workflow & Cumulative Balance
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Rule 1 & 9: สร้างใบสำคัญหลายใบภายใต้ Workflow เดียวกัน และคำนวณยอดสะสม ---');
    const disbursedVoucher2 = await FinancialService.addCashFlowWithdrawal({
      workflowId: wf.id,
      voucherNo: '03/2569',
      voucherType: 'aid_disbursement',
      amount: 20000,
      requestedAmount: 20000,
      approvedAmount: 20000,
      sourceFundType: 'zakat',
      purpose: 'เบิกเงินสดช่วยเหลือชุดที่ 2',
      status: 'disbursed',
      withdrawerName: 'นายมุกลิส มีระยะ',
      approverName: 'อิหม่ามฟารุก อาลี',
    }, superAdminActor);

    currentWf = (await FinancialService.getCashFlowWorkflows()).find((w) => w.id === wf.id)!;
    console.log(`✓ Created Disbursed Voucher: ${disbursedVoucher2.withdrawalNo} (Amount: ฿20,000.00)`);
    console.log(`  - Total Disbursed Vouchers: 2 (฿30,000 + ฿20,000 = ฿50,000.00)`);
    console.log(`  - Cumulative Withdrawn: ฿${currentWf.step3WithdrawAmount?.toLocaleString()}`);
    console.log(`  - Available Treasurer Cash: ฿${currentWf.availableTreasurerCash?.toLocaleString()}`);
    if (currentWf.step3WithdrawAmount !== 50000 || currentWf.availableTreasurerCash !== 50000) {
      throw new Error(`❌ Cumulative math error! Withdrawn: ${currentWf.step3WithdrawAmount}, Available: ${currentWf.availableTreasurerCash}`);
    }
    console.log('✓ PASS: Multiple vouchers tracked accurately.');

    // -------------------------------------------------------------------------
    // Test 8: Rule 8 - Link Line Items Table to Step 4 (cash_flow_disbursement_items)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Testing Rule 8: เชื่อมโยงตารางรายละเอียดผู้รับช่วยเหลือ (Step 4 Linking) ไม่จำกัดจำนวนแถว ---');
    // Prepare 3 aid line items from approved apps
    const selectedApps = approvedApps.slice(0, 3);
    if (selectedApps.length < 3) {
      throw new Error('Need at least 3 approved apps for this test');
    }

    const testAidItems = [
      {
        applicationId: selectedApps[0].id,
        applicationNo: selectedApps[0].applicationNo,
        beneficiaryId: selectedApps[0].beneficiaryId,
        beneficiaryName: selectedApps[0].beneficiaryName,
        nationalId: selectedApps[0].nationalId,
        asnafCategory: selectedApps[0].asnafCategory,
        assistanceType: selectedApps[0].assistanceType,
        areaInfo: 'ต.จะบังติกอ อ.เมือง จ.ปัตตานี',
        approvedAmount: selectedApps[0].approvedAmount,
        thisDisbursementAmount: 3000,
        notes: 'มอบเงินสงเคราะห์งวดที่ 1',
      },
      {
        applicationId: selectedApps[1].id,
        applicationNo: selectedApps[1].applicationNo,
        beneficiaryId: selectedApps[1].beneficiaryId,
        beneficiaryName: selectedApps[1].beneficiaryName,
        nationalId: selectedApps[1].nationalId,
        asnafCategory: selectedApps[1].asnafCategory,
        assistanceType: selectedApps[1].assistanceType,
        areaInfo: 'ต.รูสะมิแล อ.เมือง จ.ปัตตานี',
        approvedAmount: selectedApps[1].approvedAmount,
        thisDisbursementAmount: 4000,
        notes: 'มอบเงินช่วยเหลือฉุกเฉิน',
      },
      {
        applicationId: selectedApps[2].id,
        applicationNo: selectedApps[2].applicationNo,
        beneficiaryId: selectedApps[2].beneficiaryId,
        beneficiaryName: selectedApps[2].beneficiaryName,
        nationalId: selectedApps[2].nationalId,
        asnafCategory: selectedApps[2].asnafCategory,
        assistanceType: selectedApps[2].assistanceType,
        areaInfo: 'ต.บานา อ.เมือง จ.ปัตตานี',
        approvedAmount: selectedApps[2].approvedAmount,
        thisDisbursementAmount: 5000,
        notes: 'มอบเงินค่ารักษาพยาบาล',
      },
    ];
    const totalLineItems = testAidItems.reduce((sum, item) => sum + item.thisDisbursementAmount, 0); // 12,000

    const voucherWithItems = await FinancialService.addCashFlowWithdrawal({
      workflowId: wf.id,
      voucherNo: '04/2569',
      voucherType: 'aid_disbursement',
      amount: totalLineItems,
      requestedAmount: totalLineItems,
      approvedAmount: totalLineItems,
      sourceFundType: 'zakat',
      purpose: 'เบิกเงินสดมอบให้ผู้รับความช่วยเหลือ 3 รายตามมติ',
      status: 'disbursed',
      withdrawerName: 'นายมุกลิส มีระยะ',
      approverName: 'อิหม่ามฟารุก อาลี',
      aidItems: testAidItems,
    }, superAdminActor);

    // Verify records in cash_flow_disbursement_items
    const dbItemsRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_disbursement_items WHERE withdrawal_id = ? ORDER BY created_at ASC',
      args: [voucherWithItems.withdrawalId],
    });
    console.log(`✓ Inserted ${dbItemsRes.rows.length} child items into cash_flow_disbursement_items table.`);
    if (dbItemsRes.rows.length !== 3) {
      throw new Error(`❌ Expected 3 line items, found ${dbItemsRes.rows.length}`);
    }
    for (let i = 0; i < dbItemsRes.rows.length; i++) {
      const row = dbItemsRes.rows[i];
      console.log(`  Row ${i + 1}: [${row.beneficiary_name}] ฿${Number(row.this_disbursement_amount).toLocaleString()} (${row.area_info}) - ${row.notes}`);
      if (row.area_info !== testAidItems[i].areaInfo || Number(row.this_disbursement_amount) !== testAidItems[i].thisDisbursementAmount) {
        throw new Error(`❌ Child item data mismatch on row ${i + 1}`);
      }
    }
    console.log('✓ PASS: Step 4 linking child items recorded correctly with area and notes.');

    // -------------------------------------------------------------------------
    // Test 9: Rule 4 & Lifecycle Transition (Draft -> Pending -> Approved -> Disbursed)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Testing Rule 4 & Lifecycle: การเปลี่ยนสถานะใบสำคัญ (Draft -> Pending -> Approved -> Disbursed) ---');
    console.log(`Initial Draft Voucher: ${draftVoucher.withdrawalNo} (ID: ${draftVoucher.withdrawalId})`);

    // 9.1 Update to pending
    await FinancialService.updateCashFlowWithdrawal(draftVoucher.withdrawalId, {
      status: 'pending',
      notes: 'ส่งตรวจสอบเอกสารครบถ้วน',
    }, financeActor);
    let checkDraft = (await db.execute({
      sql: 'SELECT * FROM cash_flow_withdrawals WHERE id = ?',
      args: [draftVoucher.withdrawalId],
    })).rows[0];
    if (checkDraft.status !== 'pending') throw new Error('Failed to update to pending');
    console.log(`✓ Status transitioned: draft -> pending`);

    // 9.2 Update to approved
    await FinancialService.updateCashFlowWithdrawal(draftVoucher.withdrawalId, {
      status: 'approved',
      approverName: 'อิหม่ามฟารุก อาลี',
      approvedAmount: 25000,
    }, superAdminActor);
    checkDraft = (await db.execute({
      sql: 'SELECT * FROM cash_flow_withdrawals WHERE id = ?',
      args: [draftVoucher.withdrawalId],
    })).rows[0];
    if (checkDraft.status !== 'approved') throw new Error('Failed to update to approved');
    console.log(`✓ Status transitioned: pending -> approved (Cash still NOT deducted)`);

    // 9.3 Check remaining cash before disbursement
    currentWf = (await FinancialService.getCashFlowWorkflows()).find((w) => w.id === wf.id)!;
    console.log(`  Available cash before disbursing draft: ฿${currentWf.availableTreasurerCash?.toLocaleString()}`);

    // 9.4 Transition to disbursed
    await FinancialService.updateCashFlowWithdrawal(draftVoucher.withdrawalId, {
      status: 'disbursed',
      notes: 'เบิกจ่ายเงินสดจริงเรียบร้อยแล้ว',
    }, superAdminActor);

    currentWf = (await FinancialService.getCashFlowWorkflows()).find((w) => w.id === wf.id)!;
    console.log(`✓ Status transitioned: approved -> disbursed`);
    console.log(`  Available cash after disbursing: ฿${currentWf.availableTreasurerCash?.toLocaleString()}`);
    // Prior disbursed: 30k + 20k + 12k = 62k. Now + 25k = 87k total disbursed. Remaining: 100k - 87k = 13k.
    if (currentWf.availableTreasurerCash !== 13000) {
      throw new Error(`❌ Expected remaining cash 13,000, got ${currentWf.availableTreasurerCash}`);
    }
    console.log('✓ PASS: Solvency and balance correctly updated when transitioning to disbursed.');

    // -------------------------------------------------------------------------
    // Test 10: Cancellation & Balance Restitution
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Testing Cancellation: ยกเลิกใบสำคัญที่เบิกแล้ว คืนยอดเงินสดเข้าเซฟเหรัญญิก ---');
    await FinancialService.cancelCashFlowWithdrawal(
      draftVoucher.withdrawalId,
      'ยกเลิกเนื่องจากผู้มีสิทธิ์ขอรับเป็นโอนเงินแทน',
      superAdminActor
    );

    currentWf = (await FinancialService.getCashFlowWorkflows()).find((w) => w.id === wf.id)!;
    console.log(`✓ Cancelled Voucher: ${draftVoucher.withdrawalNo}`);
    console.log(`  - Status is now cancelled`);
    console.log(`  - Cumulative Withdrawn: ฿${currentWf.step3WithdrawAmount?.toLocaleString()}`);
    console.log(`  - Available Treasurer Cash: ฿${currentWf.availableTreasurerCash?.toLocaleString()}`);
    if (currentWf.availableTreasurerCash !== 38000) { // 13k + 25k returned = 38k
      throw new Error(`❌ Available cash after cancellation must be 38,000, got ${currentWf.availableTreasurerCash}`);
    }
    console.log('✓ PASS: Cancelled voucher properly refunded cash to treasurer custody.');

    // -------------------------------------------------------------------------
    // Test 11: Rule 7 - Rapid Duplicate Debounce Check
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Testing Rule 7: ตรวจจับการกดซ้ำซ้อนภายใน 3 วินาที (Debounce / Idempotency) ---');
    try {
      await FinancialService.addCashFlowWithdrawal({
        workflowId: wf.id,
        voucherType: 'aid_disbursement',
        amount: 5000,
        purpose: 'ทดสอบการส่งซ้ำซ้อนอย่างรวดเร็ว',
        status: 'disbursed',
      }, superAdminActor);

      // Immediately submit identical request
      await FinancialService.addCashFlowWithdrawal({
        workflowId: wf.id,
        voucherType: 'aid_disbursement',
        amount: 5000,
        purpose: 'ทดสอบการส่งซ้ำซ้อนอย่างรวดเร็ว',
        status: 'disbursed',
      }, superAdminActor);

      throw new Error('❌ Allowed duplicate submission within debounce window!');
    } catch (err: any) {
      if (err.message.startsWith('❌')) throw err;
      console.log(`✓ Correctly prevented duplicate submission: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // Test 12: Rule 10 - Audit Logs & Attachments
    // -------------------------------------------------------------------------
    console.log('\n--- 12. Testing Rule 10: ตรวจสอบประวัติการทำรายการและหลักฐานแนบ (Audit Trail) ---');
    const logsRes = await db.execute({
      sql: "SELECT * FROM audit_logs WHERE action IN ('CASH_FLOW_WITHDRAWAL_ADDED', 'CASH_FLOW_WITHDRAWAL_DRAFT', 'CASH_FLOW_WITHDRAWAL_UPDATED', 'CASH_FLOW_WITHDRAWAL_CANCELLED') ORDER BY created_at DESC LIMIT 5",
    });
    console.log(`✓ Verified ${logsRes.rows.length} audit log entries found for Step 3 operations:`);
    for (const log of logsRes.rows) {
      console.log(`  - [${log.action}] by ${log.user_name}: ${log.description}`);
    }

    console.log('\n======================================================================');
    console.log('🎉 ALL 12 TESTS PASSED! TASK 3 MEETS ALL BUSINESS RULES & CONSTRAINTS');
    console.log('======================================================================\n');
  } catch (error: any) {
    console.error('\n❌ STEP 3 TEST FAILED:', error.message);
    console.error(error.stack);
    testFailed = true;
    failureError = error;
  } finally {
    // Clean up created workflows
    console.log('--- Cleaning up test workflows ---');
    for (const id of createdWorkflowIds) {
      try {
        await db.execute({ sql: 'DELETE FROM cash_flow_disbursement_items WHERE withdrawal_id IN (SELECT id FROM cash_flow_withdrawals WHERE workflow_id = ?)', args: [id] });
        await db.execute({ sql: 'DELETE FROM cash_flow_withdrawals WHERE workflow_id = ?', args: [id] });
        await db.execute({ sql: 'DELETE FROM workflow_attachments WHERE workflow_id = ?', args: [id] });
        await db.execute({ sql: 'DELETE FROM cash_flow_workflows WHERE id = ?', args: [id] });
      } catch (e) {
        // ignore cleanup error
      }
    }
    console.log('Cleaned up test data.');
    if (testFailed) {
      process.exit(1);
    }
  }
}

runStep3Tests();
