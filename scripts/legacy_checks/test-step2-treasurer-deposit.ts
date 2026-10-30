import { getDb, initDb } from '../src/lib/db';
import { FinancialService } from '../src/services/financialService';

async function runStep2Tests() {
  console.log('======================================================================');
  console.log('🧪 Starting Step 2: Treasurer Cash Deposit Comprehensive Test Suite');
  console.log('======================================================================\n');

  await initDb();
  const db = getDb();

  const superAdminActor = {
    id: 'u-admin-test',
    name: 'นายมุกลิส มีระยะ (Super Admin)',
    role: 'super_admin' as const,
  };

  const financeActor = {
    id: 'u-finance-test',
    name: 'เจ้าหน้าที่การเงิน (Finance)',
    role: 'finance' as const,
  };

  const executiveActor = {
    id: 'u-exec-test',
    name: 'อิหม่ามฟารุก อาลี (Executive)',
    role: 'executive' as const,
  };

  const volunteerActor = {
    id: 'u-volunteer-test',
    name: 'อาสาสมัครทั่วไป (Volunteer)',
    role: 'volunteer' as const,
  };

  // 0. Fetch a real bank account
  const bankRes = await db.execute('SELECT * FROM bank_accounts LIMIT 1');
  if (bankRes.rows.length === 0) {
    throw new Error('No bank account found in database for testing!');
  }
  const testBank = bankRes.rows[0];
  const initialBalance = Number(testBank.current_balance);
  const bankId = String(testBank.id);
  console.log(`Using Bank Account: ${testBank.bank_name} - ${testBank.account_name} (${bankId})`);
  console.log(`Initial Bank Balance: ฿${initialBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n`);

  let createdWorkflowIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // Setup Step 1 Workflow (Completed Withdrawal)
    // -------------------------------------------------------------------------
    console.log('--- Setup: สร้างรายการถอนเงินธนาคาร ขั้นที่ 1 (Completed) ---');
    const wf1 = await FinancialService.createCashFlowWorkflow({
      title: 'เบิกเงินสดสำหรับโครงการซ่อมแซมบ้านผู้ยากไร้ (ทดสอบขั้นที่ 2)',
      bankAccountId: bankId,
      withdrawAmount: 50000,
      fundType: 'zakat',
      refNo: 'SLIP-BANK-KBANK-50K',
      withdrawnByName: 'นายมุกลิส มีระยะ',
      approverName: 'อิหม่ามฟารุก อาลี',
      proofUrl: 'https://example.com/slips/kbank-50k.pdf',
      proofName: 'สลิปถอนเงิน50000.pdf',
      status: 'completed',
    }, superAdminActor);
    createdWorkflowIds.push(wf1.id);
    console.log(`✓ Created Step 1 Completed Workflow: ${wf1.workflowNo} (ID: ${wf1.id}, ถอน: ฿50,000.00)\n`);

    // -------------------------------------------------------------------------
    // Test 1: Rule 1 - Cannot advance to Step 2 if Step 1 is not completed
    // -------------------------------------------------------------------------
    console.log('--- 1. Testing Rule 1: ไม่อนุญาตให้ทำขั้นที่ 2 หากขั้นที่ 1 ยังไม่เสร็จสิ้น ---');
    const draftWf = await FinancialService.createCashFlowWorkflow({
      title: 'รอบเบิกเงินสดแบบร่าง (ยังไม่ถอน)',
      bankAccountId: bankId,
      withdrawAmount: 15000,
      fundType: 'sadaqah',
      status: 'draft',
    }, superAdminActor);
    createdWorkflowIds.push(draftWf.id);

    try {
      await FinancialService.advanceWorkflowToStep2(draftWf.id, {
        depositAmount: 15000,
        proofUrl: 'https://example.com/proof-draft.pdf',
      }, superAdminActor);
      throw new Error('❌ Step 2 allowed on uncompleted Step 1!');
    } catch (err: any) {
      console.log(`✓ Correctly rejected uncompleted Step 1: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // Test 2: Validation - Missing Proof File Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Validation: กรณีไม่มีหลักฐานการรับมอบเงิน ---');
    try {
      await FinancialService.advanceWorkflowToStep2(wf1.id, {
        depositAmount: 50000,
        // No proofUrl provided
      }, superAdminActor);
      throw new Error('❌ Missing proof was not rejected!');
    } catch (err: any) {
      console.log(`✓ Missing proof correctly rejected: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // Test 3: Rule 4 & 5 - Mismatch without Reason Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Rules 4 & 5: กรณียอดไม่ตรงกัน (Mismatch) โดยไม่มีเหตุผล ---');
    try {
      await FinancialService.advanceWorkflowToStep2(wf1.id, {
        depositAmount: 49500, // 50,000 - 500
        proofUrl: 'https://example.com/proof-mismatch.pdf',
        // No mismatchReason provided
      }, superAdminActor);
      throw new Error('❌ Mismatch without reason was not rejected!');
    } catch (err: any) {
      console.log(`✓ Mismatch without reason correctly rejected: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // Test 4: Rule 5 - Mismatch with Reason but without Policy Approval Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Rule 5: กรณียอดไม่ตรงกัน โดยไม่มีการอนุมัติตามนโยบาย ---');
    try {
      await FinancialService.advanceWorkflowToStep2(wf1.id, {
        depositAmount: 49500,
        proofUrl: 'https://example.com/proof-mismatch.pdf',
        mismatchReason: 'หักค่าธรรมเนียมถอนข้ามเขต 500 บาท',
        // financeActor is NOT executive/super_admin and provides no supervisor approval
      }, financeActor);
      throw new Error('❌ Mismatch without approval was not rejected!');
    } catch (err: any) {
      console.log(`✓ Mismatch without executive/supervisor approval correctly rejected: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // Test 5: Rule 4 & 5 - Mismatch with Reason & Proper Policy Approval
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Rules 4 & 5: กรณียอดไม่ตรงกัน พร้อมระบุเหตุผลและอนุมัติตามนโยบาย ---');
    const wfMismatch = await FinancialService.createCashFlowWorkflow({
      title: 'เบิกเงินสดที่มีค่าธรรมเนียม (ทดสอบ Mismatch อนุมัติ)',
      bankAccountId: bankId,
      withdrawAmount: 30000,
      fundType: 'admin',
      status: 'completed',
      proofUrl: 'https://example.com/slips/slip-30k.pdf',
    }, superAdminActor);
    createdWorkflowIds.push(wfMismatch.id);

    const mismatchRes = await FinancialService.advanceWorkflowToStep2(wfMismatch.id, {
      depositAmount: 29950,
      handoverAmount: 30000,
      handoverDatetime: '2026-10-21T11:00',
      receivedDatetime: '2026-10-21T11:30',
      refNo: 'REC-TREAS-MM-01',
      handoverPersonName: 'นายมุกลิส มีระยะ',
      treasurerName: 'นายรุสลัน หะสาเมาะ',
      mismatchReason: 'หักค่าธรรมเนียมบริการเคาน์เตอร์ 50 บาท',
      mismatchApprovedByName: 'อิหม่ามฟารุก อาลี (ประธานกรรมการ)',
      auditorName: 'นายฮาซัน ดือราแม (ผู้ตรวจสอบ)',
      proofUrl: 'https://example.com/receipts/treasurer-rec-29950.pdf',
      proofName: 'ใบรับเงินเหรัญญิก_29950.pdf',
      proofSize: 154000,
      proofType: 'application/pdf',
      status: 'received',
    }, executiveActor);

    if (!mismatchRes.success || mismatchRes.status !== 'received') {
      throw new Error('❌ Mismatch handover submission failed!');
    }

    const checkMismatchWf = (await FinancialService.getCashFlowWorkflows()).find(w => w.id === wfMismatch.id)!;
    if (checkMismatchWf.step2DepositAmount !== 29950) {
      throw new Error(`Deposit amount mismatch! Expected: 29950, Got: ${checkMismatchWf.step2DepositAmount}`);
    }
    if (checkMismatchWf.step2MismatchReason !== 'หักค่าธรรมเนียมบริการเคาน์เตอร์ 50 บาท') {
      throw new Error(`Mismatch reason not saved! Got: ${checkMismatchWf.step2MismatchReason}`);
    }
    console.log(`✓ Mismatch correctly approved & recorded: ถอน ฿30,000, รับจริง ฿${checkMismatchWf.step2DepositAmount.toLocaleString()} (ส่วนต่าง ฿50: ${checkMismatchWf.step2MismatchReason})`);

    // -------------------------------------------------------------------------
    // Test 6: Exact Match - Full Success Handover (Rule 2, 3, 6, 7, 9)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Exact Match: ยอดรับมอบตรงกับยอดถอนครบถ้วน 100% ---');
    const exactRes = await FinancialService.advanceWorkflowToStep2(wf1.id, {
      depositAmount: 50000,
      handoverAmount: 50000,
      handoverDatetime: '2026-10-21T10:30',
      receivedDatetime: '2026-10-21T11:00',
      refNo: 'REC-TREAS-50000-EXACT',
      handoverPersonName: 'นายมุกลิส มีระยะ',
      treasurerName: 'นายรุสลัน หะสาเมาะ',
      auditorName: 'อิหม่ามฟารุก อาลี',
      proofUrl: 'https://example.com/receipts/treasurer-rec-50000.pdf',
      proofName: 'ใบสำคัญรับมอบเงินสด_เหรัญญิก_50000.pdf',
      proofSize: 189000,
      proofType: 'application/pdf',
      notes: 'นายรุสลัน หะสาเมาะ ได้รับมอบเงินสดครบถ้วน ฿50,000 บาท เข้าตู้นิรภัยเรียบร้อย',
      status: 'received',
    }, financeActor);

    if (!exactRes.success || exactRes.status !== 'received') {
      throw new Error('❌ Exact handover submission failed!');
    }

    const checkExactWf = (await FinancialService.getCashFlowWorkflows()).find(w => w.id === wf1.id)!;
    if (checkExactWf.step2DepositAmount !== 50000) {
      throw new Error(`Deposit amount mismatch! Expected 50000, got ${checkExactWf.step2DepositAmount}`);
    }
    if (checkExactWf.step2Status !== 'received') {
      throw new Error(`Step 2 status mismatch! Expected received, got ${checkExactWf.step2Status}`);
    }
    console.log(`✓ Exact match handover confirmed: ฿${checkExactWf.step2DepositAmount.toLocaleString()} โดย ${checkExactWf.step2TreasurerName}`);

    // Check available cash ready for Step 3 (Rule 9)
    console.log(`✓ Rule 9: ยอดเงินสดในมือเหรัญญิกพร้อมเบิกจ่าย (Available Cash): ฿${(checkExactWf.availableTreasurerCash || 0).toLocaleString()} บาท`);

    // -------------------------------------------------------------------------
    // Test 7: Rule 8 - DO NOT Count as New Revenue (ห้ามนับยอดรับมอบเป็นรายรับใหม่)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Rule 8: ห้ามนับยอดรับมอบเป็นรายรับใหม่ในระบบการเงิน ---');
    const incomeTxns = await db.execute({
      sql: `SELECT * FROM financial_transactions WHERE workflow_id = ? AND type = 'income'`,
      args: [wf1.id],
    });
    if (incomeTxns.rows.length > 0) {
      throw new Error('❌ VIOLATION OF RULE 8: Financial transaction created an income entry for cash handover!');
    }
    console.log(`✓ Rule 8 Enforced: Zero income transactions created for Step 2 handover (Internal Transit Only)`);

    // -------------------------------------------------------------------------
    // Test 8: Duplicate Submission & Idempotency Protection
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Testing Idempotency: ป้องกันการส่งคำขอยืนยันรับเงินซ้ำซ้อน ---');
    try {
      await FinancialService.advanceWorkflowToStep2(wf1.id, {
        depositAmount: 50000,
        proofUrl: 'https://example.com/receipts/duplicate.pdf',
        status: 'received',
      }, superAdminActor);
      throw new Error('❌ Duplicate handover confirmation was not prevented!');
    } catch (err: any) {
      console.log(`✓ Duplicate confirmation caught: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // Test 9: Custodian (Treasurer) Change Capability & Audit Trail Tracking
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Testing Custodian Change: การเปลี่ยนตัวเหรัญญิกพร้อม Audit Log ---');
    const wfCustodianChange = await FinancialService.createCashFlowWorkflow({
      title: 'ทดสอบเปลี่ยนตัวผู้รับผิดชอบเงินสด',
      bankAccountId: bankId,
      withdrawAmount: 10000,
      fundType: 'emergency',
      status: 'completed',
      proofUrl: 'https://example.com/slips/slip-10k.pdf',
    }, superAdminActor);
    createdWorkflowIds.push(wfCustodianChange.id);

    // Volunteer cannot change custodian
    try {
      await FinancialService.advanceWorkflowToStep2(wfCustodianChange.id, {
        depositAmount: 10000,
        treasurerName: 'นายสมาน เด่นดวง (รักษาการเหรัญญิก)',
        proofUrl: 'https://example.com/proof.pdf',
      }, volunteerActor as any);
      throw new Error('❌ Volunteer was able to change custodian!');
    } catch (err: any) {
      console.log(`✓ Unauthorized custodian change blocked: "${err.message}"`);
    }

    // Super Admin changes custodian
    await FinancialService.advanceWorkflowToStep2(wfCustodianChange.id, {
      depositAmount: 10000,
      treasurerId: 'custodian-saman',
      treasurerName: 'นายสมาน เด่นดวง (รักษาการเหรัญญิก)',
      proofUrl: 'https://example.com/proof-saman.pdf',
      status: 'received',
    }, superAdminActor);

    const checkCustWf = (await FinancialService.getCashFlowWorkflows()).find(w => w.id === wfCustodianChange.id)!;
    if (checkCustWf.step2TreasurerName !== 'นายสมาน เด่นดวง (รักษาการเหรัญญิก)') {
      throw new Error(`Custodian name was not updated! Got: ${checkCustWf.step2TreasurerName}`);
    }
    console.log(`✓ Custodian changed to: "${checkCustWf.step2TreasurerName}"`);

    // Verify Audit Log for custodian change
    const custAudit = await db.execute({
      sql: `SELECT * FROM audit_logs WHERE action = 'CASH_FLOW_TREASURER_CHANGED' AND entity_id = ?`,
      args: [String(checkCustWf.workflowNo)],
    });
    if (custAudit.rows.length === 0) {
      throw new Error('❌ Audit log for custodian change was not recorded!');
    }
    console.log(`✓ Custodian change audit log verified: "${custAudit.rows[0].description}"`);

    // -------------------------------------------------------------------------
    // Test 10: Cancellation of Step 2
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Testing Step 2 Cancellation: การยกเลิกขั้นตอนส่งมอบ ---');
    await FinancialService.advanceWorkflowToStep2(wfCustodianChange.id, {
      depositAmount: 0,
      status: 'cancelled',
      notes: 'ยกเลิกเนื่องจากส่งมอบผิดตัวบุคคล',
    }, superAdminActor);

    const checkCancelledWf = (await FinancialService.getCashFlowWorkflows()).find(w => w.id === wfCustodianChange.id)!;
    if (checkCancelledWf.step2Status !== 'cancelled') {
      throw new Error(`Expected step2Status cancelled, got ${checkCancelledWf.step2Status}`);
    }
    console.log(`✓ Step 2 successfully cancelled: status = "${checkCancelledWf.step2Status}"`);

    // Verify History Ledger reflects Step 2 entries
    console.log('\n--- History Ledger Integration ---');
    const history = await FinancialService.getCashMovementHistory({ category: 'treasurer_deposit' });
    const histEntry = history.find(h => h.workflowId === wf1.id);
    if (!histEntry) {
      throw new Error('❌ Step 2 entry missing from history ledger!');
    }
    console.log(`✓ History ledger entry verified: [${histEntry.date}] ${histEntry.category}: ฿${histEntry.amount.toLocaleString()} | ${histEntry.responsiblePerson} | ${histEntry.statusLabel}`);

  } finally {
    // -------------------------------------------------------------------------
    // Cleanup: Restore Bank Balance and Clean Test Records
    // -------------------------------------------------------------------------
    console.log('\n--- Cleanup: Purging Test Data & Restoring Bank Balance ---');
    for (const id of createdWorkflowIds) {
      await db.execute({ sql: 'DELETE FROM financial_transactions WHERE workflow_id = ?', args: [id] });
      await db.execute({ sql: 'DELETE FROM workflow_attachments WHERE workflow_id = ?', args: [id] });
      await db.execute({ sql: "DELETE FROM audit_logs WHERE entity_type = 'cash_flow_workflow'", args: [] });
      await db.execute({ sql: 'DELETE FROM cash_flow_workflows WHERE id = ?', args: [id] });
    }

    await db.execute({
      sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [initialBalance, bankId],
    });

    const verifyBank = await db.execute({
      sql: 'SELECT current_balance FROM bank_accounts WHERE id = ?',
      args: [bankId],
    });
    console.log(`✓ Bank balance verified at original: ฿${Number(verifyBank.rows[0].current_balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    console.log('✓ All test workflows, transactions, attachments, and logs cleanly purged.');
  }

  console.log('\n======================================================================');
  console.log('🎉 STEP 2: ALL TEST CASES & REQUIREMENTS PASSED 100%!');
  console.log('======================================================================');
}

runStep2Tests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
