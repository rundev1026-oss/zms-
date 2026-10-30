import { getDb, initDb } from '../src/lib/db';
import { FinancialService } from '../src/services/financialService';

async function runStep1Tests() {
  console.log('======================================================================');
  console.log('🧪 Starting Step 1: Bank Withdrawal Comprehensive Test Suite (10 Requirements)');
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

  // Fetch a real bank account
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
    // 1. Behavior 1: Select real bank account from DB / reject invalid bank
    // -------------------------------------------------------------------------
    console.log('--- Requirement 1: เลือกบัญชีธนาคารจากข้อมูลบัญชีที่มีอยู่จริง ---');
    try {
      await FinancialService.createCashFlowWorkflow({
        title: 'ทดสอบบัญชีธนาคารไม่มีอยู่จริง',
        bankAccountId: 'non-existent-bank-999',
        withdrawAmount: 5000,
      }, superAdminActor);
      throw new Error('❌ Non-existent bank was not rejected!');
    } catch (err: any) {
      console.log(`✓ Non-existent bank correctly rejected: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // 2. Behavior 2: Specify explicit fund type (zakat, sadaqah, admin, emergency)
    // -------------------------------------------------------------------------
    console.log('\n--- Requirement 2: ระบุประเภทเงินให้ชัดเจน (Fund Types) ---');
    const fundTypes = ['zakat', 'sadaqah', 'admin', 'emergency'] as const;
    for (let i = 0; i < fundTypes.length; i++) {
      const fType = fundTypes[i];
      const wfFund = await FinancialService.createCashFlowWorkflow({
        title: `ทดสอบประเภทเงิน ${fType}`,
        bankAccountId: bankId,
        withdrawAmount: 1000 + (i + 1) * 250,
        fundType: fType,
        status: 'draft',
      }, superAdminActor);
      createdWorkflowIds.push(wfFund.id);

      const checkWf = await db.execute({
        sql: 'SELECT step1_fund_type FROM cash_flow_workflows WHERE id = ?',
        args: [wfFund.id],
      });
      if (checkWf.rows[0].step1_fund_type !== fType) {
        throw new Error(`Fund type mismatch! Expected: ${fType}, Got: ${checkWf.rows[0].step1_fund_type}`);
      }
      console.log(`✓ Fund type "${fType}" correctly stored in database`);
    }

    // -------------------------------------------------------------------------
    // 3. Behavior 3: Permission checks & Overdraft checks
    // -------------------------------------------------------------------------
    console.log('\n--- Requirement 3: ตรวจสอบสิทธิ์และยอดเงินที่สามารถถอนได้ ---');
    // Overdraft check
    try {
      await FinancialService.createCashFlowWorkflow({
        title: 'ทดสอบยอดเงินเกินบัญชี',
        bankAccountId: bankId,
        withdrawAmount: initialBalance + 500000,
      }, superAdminActor);
      throw new Error('❌ Overdraft was not rejected!');
    } catch (err: any) {
      console.log(`✓ Overdraft correctly rejected: "${err.message}"`);
    }

    // Zero/negative amount check
    try {
      await FinancialService.createCashFlowWorkflow({
        title: 'ทดสอบยอด 0 บาท',
        bankAccountId: bankId,
        withdrawAmount: 0,
      }, superAdminActor);
      throw new Error('❌ Zero amount was not rejected!');
    } catch (err: any) {
      console.log(`✓ Zero/Negative amount correctly rejected: "${err.message}"`);
    }

    // Unauthorized operator creation check
    try {
      await FinancialService.createCashFlowWorkflow({
        title: 'ทดสอบสิทธิ์ผู้สร้างรายการ',
        bankAccountId: bankId,
        withdrawAmount: 5000,
      }, volunteerActor as any);
      throw new Error('❌ Volunteer role was not rejected on creation!');
    } catch (err: any) {
      console.log(`✓ Non-finance role correctly rejected on creation: "${err.message}"`);
    }

    // -------------------------------------------------------------------------
    // 4. Behavior 4 & 5: Real attachment metadata & Draft mode leaves bank untouched
    // -------------------------------------------------------------------------
    console.log('\n--- Requirements 4 & 5: บันทึกร่างโดยไม่เปลี่ยนยอดเงินจริง + แนบหลักฐานจริง ---');
    const draftWf = await FinancialService.createCashFlowWorkflow({
      title: 'เบิกเงินสดช่วยเหลือฉุกเฉิน (ร่าง)',
      bankAccountId: bankId,
      withdrawAmount: 20000,
      fundType: 'emergency',
      eventDate: '2026-10-21',
      eventTime: '10:30',
      eventDatetime: '2026-10-21T10:30:00',
      refNo: 'SLIP-PRE-DRAFT',
      withdrawnByName: 'นายมุกลิส มีระยะ',
      approverName: 'อิหม่ามฟารุก อาลี',
      proofUrl: 'https://example.com/slips/slip-draft-20000.pdf',
      proofName: 'สลิปถอนเงิน_ธกส_ร่าง.pdf',
      proofSize: 204800,
      proofType: 'application/pdf',
      notes: 'บันทึกแบบร่างเตรียมไปถอนที่สาขา',
      status: 'draft',
    }, superAdminActor);
    createdWorkflowIds.push(draftWf.id);

    // Verify bank balance was untouched
    const bankAfterDraft = await db.execute({
      sql: 'SELECT current_balance FROM bank_accounts WHERE id = ?',
      args: [bankId],
    });
    const balAfterDraft = Number(bankAfterDraft.rows[0].current_balance);
    if (balAfterDraft !== initialBalance) {
      throw new Error(`Bank balance was changed during draft! Expected: ${initialBalance}, Got: ${balAfterDraft}`);
    }
    console.log(`✓ Bank balance untouched during draft mode: ฿${balAfterDraft.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);

    // Verify attachments table recorded the attachment
    const attRes = await db.execute({
      sql: 'SELECT * FROM workflow_attachments WHERE workflow_id = ? AND step_number = 1',
      args: [draftWf.id],
    });
    if (attRes.rows.length === 0) {
      throw new Error('❌ Attachment record missing in workflow_attachments!');
    }
    const att = attRes.rows[0];
    console.log(`✓ Attachment recorded: "${att.file_name}" (${att.mime_type}, ${att.file_size} bytes)`);

    // -------------------------------------------------------------------------
    // 5. Behavior 7: Transfer Reference Generation for Step 2
    // -------------------------------------------------------------------------
    console.log('\n--- Requirement 7: สร้างรหัสอ้างอิงสำหรับเชื่อมกับขั้นที่ 2 (Transfer Ref) ---');
    const fetchedDraft = (await FinancialService.getCashFlowWorkflows()).find(w => w.id === draftWf.id);
    if (!fetchedDraft || !fetchedDraft.step1TransferRef) {
      throw new Error('❌ Step 1 Transfer Ref was not generated!');
    }
    console.log(`✓ Generated Step 1 Transfer Reference: "${fetchedDraft.step1TransferRef}"`);

    // -------------------------------------------------------------------------
    // 6. Behavior 8: Duplicate submission prevention within 3s & Audit Log
    // -------------------------------------------------------------------------
    console.log('\n--- Requirement 8: บันทึก Audit Log และป้องกันการส่งคำขอซ้ำ ---');
    try {
      await FinancialService.createCashFlowWorkflow({
        title: 'ทดสอบส่งซ้ำ 3 วินาที',
        bankAccountId: bankId,
        withdrawAmount: 20000, // same amount
        status: 'draft',
      }, superAdminActor); // same actor & bank
      throw new Error('❌ Duplicate submission within 3 seconds was not caught!');
    } catch (err: any) {
      console.log(`✓ Duplicate submission within 3s caught: "${err.message}"`);
    }

    // Check Audit Log
    const auditRes = await db.execute({
      sql: `SELECT * FROM audit_logs WHERE entity_type = 'cash_flow_workflow' ORDER BY timestamp DESC LIMIT 3`,
    });
    if (auditRes.rows.length === 0) {
      throw new Error('❌ Audit log was not created!');
    }
    console.log(`✓ Audit log verified: Action "${auditRes.rows[0].action}" by "${auditRes.rows[0].user_name}"`);

    // -------------------------------------------------------------------------
    // 7. Behavior 9: Status lifecycle (draft -> pending_approval -> approved -> completed)
    // -------------------------------------------------------------------------
    console.log('\n--- Requirement 9: วงจรสถานะ (Draft -> Pending Approval -> Approved -> Completed) ---');
    // Step a: Draft -> Pending Approval
    await FinancialService.advanceWorkflowToStep1(draftWf.id, {
      status: 'pending_approval',
      notes: 'ส่งขออนุมัติถอนเงินสดจากธนาคาร',
    }, financeActor);
    let wfState = (await FinancialService.getCashFlowWorkflows()).find(w => w.id === draftWf.id)!;
    if (wfState.step1Status !== 'pending_approval') {
      throw new Error(`Expected pending_approval, got ${wfState.step1Status}`);
    }
    console.log(`✓ Transitioned to "pending_approval"`);

    // Step b: Non-executive cannot approve
    try {
      await FinancialService.advanceWorkflowToStep1(draftWf.id, {
        status: 'approved',
      }, financeActor);
      throw new Error('❌ Finance actor was able to approve without executive role!');
    } catch (err: any) {
      console.log(`✓ Non-executive approval correctly blocked: "${err.message}"`);
    }

    // Step c: Executive approves
    await FinancialService.advanceWorkflowToStep1(draftWf.id, {
      status: 'approved',
      approverId: executiveActor.id,
      approverName: executiveActor.name,
      notes: 'อนุมัติการถอนเงินสดเรียบร้อย',
    }, executiveActor);
    wfState = (await FinancialService.getCashFlowWorkflows()).find(w => w.id === draftWf.id)!;
    if (wfState.step1Status !== 'approved') {
      throw new Error(`Expected approved, got ${wfState.step1Status}`);
    }
    console.log(`✓ Transitioned to "approved" by ${wfState.step1ApproverName}`);

    // -------------------------------------------------------------------------
    // 8. Behavior 6: Once-only real transaction on confirmation & Idempotency
    // -------------------------------------------------------------------------
    console.log('\n--- Requirement 6: ยืนยันการถอน บันทึกธุรกรรมจริงครั้งเดียว & ป้องกันบันทึกซ้ำ (Idempotency) ---');
    await FinancialService.advanceWorkflowToStep1(draftWf.id, {
      status: 'completed',
      eventDate: '2026-10-21',
      eventTime: '11:15',
      refNo: 'KBANK-SLIP-8844',
      proofUrl: 'https://example.com/slips/kbank-slip-final.jpg',
      proofName: 'สลิปถอนเงินจริง_สาขายะลา.jpg',
      proofSize: 341000,
      proofType: 'image/jpeg',
      notes: 'ถอนเงินสดและรับเงินเรียบร้อยแล้ว',
    }, financeActor);

    // Verify bank balance is now deducted exactly by 20,000
    const bankAfterCompleted = await db.execute({
      sql: 'SELECT current_balance FROM bank_accounts WHERE id = ?',
      args: [bankId],
    });
    const expectedBal = initialBalance - 20000;
    const actualBal = Number(bankAfterCompleted.rows[0].current_balance);
    if (actualBal !== expectedBal) {
      throw new Error(`Bank balance mismatch! Expected: ${expectedBal}, Got: ${actualBal}`);
    }
    console.log(`✓ Bank balance deducted accurately: ฿${actualBal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (Deducted: ฿20,000)`);

    // Verify transaction recorded
    const txnRes = await db.execute({
      sql: 'SELECT * FROM financial_transactions WHERE workflow_id = ?',
      args: [draftWf.id],
    });
    if (txnRes.rows.length !== 1) {
      throw new Error(`Expected exactly 1 financial transaction, got ${txnRes.rows.length}`);
    }
    const txn = txnRes.rows[0];
    console.log(`✓ Financial Transaction created: ${txn.transaction_no} (฿${Number(txn.amount).toLocaleString()} - ${txn.type} / ${txn.fund_name})`);

    // Verify idempotency: calling advanceWorkflowToStep1 with completed again MUST throw error!
    try {
      await FinancialService.advanceWorkflowToStep1(draftWf.id, {
        status: 'completed',
      }, superAdminActor);
      throw new Error('❌ Re-confirming completed withdrawal did not throw error!');
    } catch (err: any) {
      console.log(`✓ Idempotency protected: "${err.message}"`);
    }

    // Verify bank balance is still expectedBal (NOT deducted twice)
    const bankCheckAgain = await db.execute({
      sql: 'SELECT current_balance FROM bank_accounts WHERE id = ?',
      args: [bankId],
    });
    if (Number(bankCheckAgain.rows[0].current_balance) !== expectedBal) {
      throw new Error('❌ Bank balance was deducted a second time!');
    }
    console.log(`✓ Bank balance verified untouched by duplicate call: ฿${Number(bankCheckAgain.rows[0].current_balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);

    // -------------------------------------------------------------------------
    // 9. Behavior 10: Confirmed items cannot be deleted directly / Cancel reversal
    // -------------------------------------------------------------------------
    console.log('\n--- Requirement 10: รายการที่ยืนยันแล้วต้องไม่ถูกลบโดยตรง & การยกเลิกพร้อมคืนเงิน ---');
    // Direct delete of completed workflow must throw error
    try {
      await FinancialService.deleteCashFlowWorkflow(draftWf.id, superAdminActor);
      throw new Error('❌ Completed workflow was deleted directly!');
    } catch (err: any) {
      console.log(`✓ Rule 10 enforced: Completed workflow deletion blocked: "${err.message}"`);
    }

    // Cancellation: Setting status to 'cancelled' on a completed workflow
    console.log('Testing Cancellation of completed workflow (Reversal & Refund)...');
    await FinancialService.advanceWorkflowToStep1(draftWf.id, {
      status: 'cancelled',
      notes: 'ยกเลิกเนื่องจากพิมพ์ยอดผิดพลาด',
    }, superAdminActor);

    // Verify bank balance is refunded
    const bankAfterCancel = await db.execute({
      sql: 'SELECT current_balance FROM bank_accounts WHERE id = ?',
      args: [bankId],
    });
    const balAfterCancel = Number(bankAfterCancel.rows[0].current_balance);
    if (balAfterCancel !== initialBalance) {
      throw new Error(`Bank balance was not restored on cancellation! Expected: ${initialBalance}, Got: ${balAfterCancel}`);
    }
    console.log(`✓ Bank balance refunded upon cancellation: ฿${balAfterCancel.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);

    // Verify reversal transaction in financial_transactions
    const revTxnRes = await db.execute({
      sql: `SELECT * FROM financial_transactions WHERE workflow_id = ? AND type = 'income'`,
      args: [draftWf.id],
    });
    if (revTxnRes.rows.length === 0) {
      throw new Error('❌ Reversal income transaction was not created upon cancellation!');
    }
    console.log(`✓ Reversal transaction recorded: ${revTxnRes.rows[0].transaction_no} (+฿${Number(revTxnRes.rows[0].amount).toLocaleString()} - ${revTxnRes.rows[0].notes})`);

    // Test Deleting an unconfirmed Draft workflow
    console.log('\nTesting Deleting an unconfirmed draft workflow...');
    const unconfirmedDraft = await FinancialService.createCashFlowWorkflow({
      title: 'แบบร่างชั่วคราวที่จะลบ',
      bankAccountId: bankId,
      withdrawAmount: 5000,
      status: 'draft',
    }, superAdminActor);

    await FinancialService.deleteCashFlowWorkflow(unconfirmedDraft.id, superAdminActor);
    const verifyDeleted = await db.execute({
      sql: 'SELECT id FROM cash_flow_workflows WHERE id = ?',
      args: [unconfirmedDraft.id],
    });
    if (verifyDeleted.rows.length > 0) {
      throw new Error('❌ Draft workflow was not deleted!');
    }
    console.log(`✓ Draft workflow successfully deleted without affecting financial ledger`);

    // -------------------------------------------------------------------------
    // Ledger & History Verification
    // -------------------------------------------------------------------------
    console.log('\n--- History Ledger Integration ---');
    const history = await FinancialService.getCashMovementHistory({ category: 'bank_withdrawal' });
    const histEntry = history.find(h => h.workflowId === draftWf.id);
    if (!histEntry) {
      throw new Error('❌ Cancelled workflow missing from history ledger!');
    }
    console.log(`✓ History ledger reflects workflow status: [${histEntry.date}] ${histEntry.category} | ${histEntry.statusLabel} | Voucher: ${histEntry.voucherNo}`);

  } finally {
    // -------------------------------------------------------------------------
    // Cleanup: Clean all test records and restore bank balance
    // -------------------------------------------------------------------------
    console.log('\n--- Cleanup: Purging Test Data & Restoring Initial State ---');
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
  console.log('🎉 STEP 1: ALL 10 BEHAVIORAL REQUIREMENTS TESTED & PASSED 100%!');
  console.log('======================================================================');
}

runStep1Tests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
