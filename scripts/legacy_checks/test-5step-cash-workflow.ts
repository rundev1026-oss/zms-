import { FinancialService } from '../src/services/financialService';
import { getDb, initDb } from '../src/lib/db';

async function run5StepCashWorkflowTests() {
  console.log('=== Starting 5-Step Cash Movement Workflow Test Suite ===');
  await initDb();
  const db = getDb();

  const testActor = {
    id: 'test-admin',
    name: 'นายทดสอบ ระบบการเงิน',
    role: 'super_admin' as const,
  };

  let testWorkflowId: string | null = null;

  try {
    // -------------------------------------------------------------
    // Test 1: ถอนเงินจากธนาคาร 100,000 บาท (ขั้นตอนที่ 1)
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Bank Withdrawal 100,000 THB ---');
    const bankAccounts = await FinancialService.getBankAccounts();
    if (!bankAccounts || bankAccounts.length === 0) {
      throw new Error('No active bank account found in database for testing');
    }
    const targetBankAccount = bankAccounts[0];
    console.log(`Using Bank Account: ${targetBankAccount.bankName} - ${targetBankAccount.accountName} (${targetBankAccount.id})`);

    const step1Input = {
      title: 'โครงการทดสอบระบบฝาก-เบิกเงินสดฉุกเฉิน (Automated Test)',
      bankAccountId: targetBankAccount.id,
      withdrawAmount: 100000,
      eventDatetime: '2026-10-21T09:30:00+07:00',
      refNo: 'WD-TEST-2569-001',
      notes: 'ทดสอบการถอนเงินสดจากธนาคาร 100,000 บาท',
      proofUrl: '/slips/test-bank-slip.pdf',
      proofName: 'สลิปถอนเงิน_ธกส_100k.pdf',
      proofSize: 245120,
      proofType: 'application/pdf',
    };

    const wfResult = await FinancialService.createCashFlowWorkflow(step1Input, testActor);
    testWorkflowId = wfResult.id;
    console.log(`✓ Created Workflow: ${wfResult.workflowNo} (ID: ${testWorkflowId})`);

    // Verify workflow record
    let allWfs = await FinancialService.getCashFlowWorkflows();
    let currentWf = allWfs.find((w) => w.id === testWorkflowId);
    if (!currentWf) throw new Error('Workflow not found after creation');
    if (currentWf.step1WithdrawAmount !== 100000) {
      throw new Error(`Expected Step 1 amount 100000, got ${currentWf.step1WithdrawAmount}`);
    }
    console.log(`✓ Step 1 Withdrawal Amount: ฿${currentWf.step1WithdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    console.log(`✓ Step 1 Event Datetime: ${currentWf.step1EventDatetime}`);

    // -------------------------------------------------------------
    // Test 2: เหรัญญิกรับมอบเงิน 100,000 บาท (ขั้นตอนที่ 2)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Treasurer Deposit 100,000 THB ---');
    const step2Input = {
      depositAmount: 100000,
      eventDatetime: '2026-10-21T10:15:00+07:00',
      refNo: 'DEP-TREAS-TEST-01',
      notes: 'เหรัญญิก นายรุสลัน หะสาเมาะ ได้รับมอบเงินสดครบถ้วน 100,000 บาท',
      proofUrl: '/slips/test-treasurer-receipt.jpg',
      proofName: 'ใบเสร็จรับมอบเงิน_เหรัญญิก.jpg',
      proofSize: 184500,
      proofType: 'image/jpeg',
    };

    await FinancialService.advanceWorkflowToStep2(testWorkflowId, step2Input, testActor);
    allWfs = await FinancialService.getCashFlowWorkflows();
    currentWf = allWfs.find((w) => w.id === testWorkflowId)!;

    if (currentWf.totalTreasurerReceived !== 100000) {
      throw new Error(`Expected Treasurer Received 100000, got ${currentWf.totalTreasurerReceived}`);
    }
    if (currentWf.availableTreasurerCash !== 100000) {
      throw new Error(`Expected Available Cash 100000, got ${currentWf.availableTreasurerCash}`);
    }
    console.log(`✓ Treasurer (นายรุสลัน) Received: ฿${currentWf.totalTreasurerReceived.toLocaleString()}`);
    console.log(`✓ Initial Available Cash: ฿${currentWf.availableTreasurerCash.toLocaleString()}`);

    // -------------------------------------------------------------
    // Test 3: เบิกเงินสดครั้งแรก 30,000 บาท -> เหลือ 70,000 บาท
    // -------------------------------------------------------------
    console.log('\n--- Test 3: First Cash Withdrawal 30,000 THB ---');
    const withdrawal1 = await FinancialService.addCashFlowWithdrawal({
      workflowId: testWorkflowId,
      amount: 30000,
      withdrawalDatetime: '2026-10-21T11:00:00+07:00',
      withdrawerId: 'u-mukhlis',
      withdrawerName: 'นายมุกลิส มีระยะ',
      targetAsnaf: 'faqir_miskin',
      targetFundId: 'fund-1',
      purpose: 'เบิกเงินสดช่วยเหลือฉุกเฉินชุดที่ 1',
      approverName: 'อิหม่ามฟารุก อาลี',
      proofUrl: '/slips/withdrawal-1.pdf',
      proofName: 'ใบสำคัญจ่าย_งวด1.pdf',
      proofSize: 102400,
      proofType: 'application/pdf',
    }, testActor);

    allWfs = await FinancialService.getCashFlowWorkflows();
    currentWf = allWfs.find((w) => w.id === testWorkflowId)!;
    console.log(`✓ Withdrawal 1 ID: ${withdrawal1.withdrawalNo}, Amount: ฿30,000.00`);
    console.log(`✓ Cumulative Withdrawn: ฿${currentWf.totalCashWithdrawn?.toLocaleString()}`);
    console.log(`✓ Available Treasurer Cash: ฿${currentWf.availableTreasurerCash?.toLocaleString()}`);

    if (currentWf.totalCashWithdrawn !== 30000) {
      throw new Error(`Expected total cash withdrawn 30000, got ${currentWf.totalCashWithdrawn}`);
    }
    if (currentWf.availableTreasurerCash !== 70000) {
      throw new Error(`Expected available cash 70000, got ${currentWf.availableTreasurerCash}`);
    }

    // -------------------------------------------------------------
    // Test 4: เบิกเงินสดครั้งที่สอง 20,000 บาท -> เหลือ 50,000 บาท
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Second Cash Withdrawal 20,000 THB ---');
    const withdrawal2 = await FinancialService.addCashFlowWithdrawal({
      workflowId: testWorkflowId,
      amount: 20000,
      withdrawalDatetime: '2026-10-21T13:30:00+07:00',
      withdrawerId: 'u-mukhlis',
      withdrawerName: 'นายมุกลิส มีระยะ',
      targetAsnaf: 'faqir_miskin',
      targetFundId: 'fund-1',
      purpose: 'เบิกเงินสดช่วยเหลือฉุกเฉินชุดที่ 2',
      approverName: 'อิหม่ามฟารุก อาลี',
      proofUrl: '/slips/withdrawal-2.pdf',
      proofName: 'ใบสำคัญจ่าย_งวด2.pdf',
      proofSize: 98500,
      proofType: 'application/pdf',
    }, testActor);

    allWfs = await FinancialService.getCashFlowWorkflows();
    currentWf = allWfs.find((w) => w.id === testWorkflowId)!;
    console.log(`✓ Withdrawal 2 ID: ${withdrawal2.withdrawalNo}, Amount: ฿20,000.00`);
    console.log(`✓ Cumulative Withdrawn: ฿${currentWf.totalCashWithdrawn?.toLocaleString()}`);
    console.log(`✓ Available Treasurer Cash: ฿${currentWf.availableTreasurerCash?.toLocaleString()}`);

    if (currentWf.totalCashWithdrawn !== 50000) {
      throw new Error(`Expected total cash withdrawn 50000, got ${currentWf.totalCashWithdrawn}`);
    }
    if (currentWf.availableTreasurerCash !== 50000) {
      throw new Error(`Expected available cash 50000, got ${currentWf.availableTreasurerCash}`);
    }

    // -------------------------------------------------------------
    // Test 5: เบิกเงินสดครั้งที่สาม 10,000 บาท -> เหลือ 40,000 บาท
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Third Cash Withdrawal 10,000 THB ---');
    const withdrawal3 = await FinancialService.addCashFlowWithdrawal({
      workflowId: testWorkflowId,
      amount: 10000,
      withdrawalDatetime: '2026-10-21T15:00:00+07:00',
      withdrawerId: 'u-mukhlis',
      withdrawerName: 'นายมุกลิส มีระยะ',
      targetAsnaf: 'gharimin',
      targetFundId: 'fund-1',
      purpose: 'เบิกเงินสดช่วยเหลือค่าเดินทางและหนี้สินเร่งด่วน',
      approverName: 'อิหม่ามฟารุก อาลี',
      proofUrl: '/slips/withdrawal-3.png',
      proofName: 'สลิปจ่ายเงิน_งวด3.png',
      proofSize: 112300,
      proofType: 'image/png',
    }, testActor);

    allWfs = await FinancialService.getCashFlowWorkflows();
    currentWf = allWfs.find((w) => w.id === testWorkflowId)!;
    console.log(`✓ Withdrawal 3 ID: ${withdrawal3.withdrawalNo}, Amount: ฿10,000.00`);
    console.log(`✓ Cumulative Withdrawn: ฿${currentWf.totalCashWithdrawn?.toLocaleString()}`);
    console.log(`✓ Available Treasurer Cash: ฿${currentWf.availableTreasurerCash?.toLocaleString()}`);

    if (currentWf.totalCashWithdrawn !== 60000) {
      throw new Error(`Expected total cash withdrawn 60000, got ${currentWf.totalCashWithdrawn}`);
    }
    if (currentWf.availableTreasurerCash !== 40000) {
      throw new Error(`Expected available cash 40000, got ${currentWf.availableTreasurerCash}`);
    }

    // -------------------------------------------------------------
    // Test 6: ทดสอบการเบิกเกินยอดคงเหลือ (ยอดเหลือ 40,000 ขอเบิก 50,000) -> ต้องปฏิเสธ
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Overdraft Protection (Attempt 50,000 THB with 40,000 THB remaining) ---');
    let overdraftRejected = false;
    try {
      await FinancialService.addCashFlowWithdrawal({
        workflowId: testWorkflowId,
        amount: 50000,
        withdrawalDatetime: '2026-10-21T16:00:00+07:00',
        withdrawerId: 'u-mukhlis',
        withdrawerName: 'นายมุกลิส มีระยะ',
        targetAsnaf: 'faqir_miskin',
        purpose: 'เบิกเกินยอดคงเหลือ',
      }, testActor);
    } catch (err: any) {
      overdraftRejected = true;
      console.log(`✓ Correctly rejected overdraft with message: "${err.message}"`);
    }

    if (!overdraftRejected) {
      throw new Error('System allowed overdraft! Expected rejection.');
    }

    // Verify balance is untouched
    allWfs = await FinancialService.getCashFlowWorkflows();
    currentWf = allWfs.find((w) => w.id === testWorkflowId)!;
    if (currentWf.availableTreasurerCash !== 40000) {
      throw new Error(`Available cash corrupted after rejected attempt: ${currentWf.availableTreasurerCash}`);
    }
    console.log(`✓ Balance preserved at exactly: ฿${currentWf.availableTreasurerCash.toLocaleString()}`);

    // -------------------------------------------------------------
    // Test 7: ทดสอบการยกเลิกรายการเบิก (Cancel Withdrawal) เพื่อคืนยอด
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Cancellation and Balance Restoration ---');
    await FinancialService.cancelCashFlowWithdrawal(
      withdrawal3.withdrawalId,
      'ผู้รับขอยกเลิกและเปลี่ยนไปรับของแทนเงินสด',
      testActor
    );

    allWfs = await FinancialService.getCashFlowWorkflows();
    currentWf = allWfs.find((w) => w.id === testWorkflowId)!;
    console.log(`✓ Successfully cancelled ${withdrawal3.withdrawalNo}`);
    console.log(`✓ Cumulative Withdrawn after cancel: ฿${currentWf.totalCashWithdrawn?.toLocaleString()}`);
    console.log(`✓ Restored Available Cash: ฿${currentWf.availableTreasurerCash?.toLocaleString()}`);

    if (currentWf.totalCashWithdrawn !== 50000) {
      throw new Error(`Expected total cash withdrawn 50000, got ${currentWf.totalCashWithdrawn}`);
    }
    if (currentWf.availableTreasurerCash !== 50000) {
      throw new Error(`Expected available cash restored to 50000, got ${currentWf.availableTreasurerCash}`);
    }

    // -------------------------------------------------------------
    // Test 8: ตรวจสอบการแนบและเมตาดาตาของหลักฐาน (Attachments Check)
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Attachments Verification ---');
    const attachments = currentWf.attachments || [];
    console.log(`✓ Found ${attachments.length} attachments for workflow ${testWorkflowId}`);
    for (const att of attachments) {
      console.log(`   - Step ${att.stepNumber}: ${att.fileName} (${att.fileSize} bytes, ${att.mimeType})`);
    }
    if (attachments.length < 3) {
      throw new Error(`Expected at least 3 attachments, found ${attachments.length}`);
    }

    // -------------------------------------------------------------
    // Test 9: ขั้นตอนที่ 4 และ 5 (ส่งมอบช่วยเหลือ และ ตรวจสอบปิดรอบ)
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Advancing Steps 4 and 5 ---');
    await FinancialService.advanceWorkflowToStep4(testWorkflowId, {
      allocatedAmount: 50000,
      distributionSummary: 'ส่งมอบเงินสดช่วยเหลือผู้ประสบอุทกภัยครบถ้วนตามงวด 1 และ 2',
      eventDatetime: '2026-10-21T17:00:00+07:00',
      proofUrl: '/slips/step4-aid-delivery.pdf',
      proofName: 'ใบสำคัญรับเงิน_ผู้รับมอบ.pdf',
      proofSize: 312000,
      proofType: 'application/pdf',
    }, testActor);

    await FinancialService.advanceWorkflowToStep5(testWorkflowId, {
      reconciledAmount: 50000,
      remainingCash: 0,
      eventDatetime: '2026-10-21T18:00:00+07:00',
      notes: 'ตรวจสอบเอกสารครบถ้วน เงินสดที่เบิก 50,000 บาท จ่ายช่วยเหลือครบ 50,000 บาท',
      proofUrl: '/slips/step5-reconciliation.pdf',
      proofName: 'เอกสารกระทบยอดและปิดรอบ.pdf',
      proofSize: 220000,
      proofType: 'application/pdf',
    }, testActor);

    allWfs = await FinancialService.getCashFlowWorkflows();
    currentWf = allWfs.find((w) => w.id === testWorkflowId)!;
    console.log(`✓ Overall Status: ${currentWf.overallStatus}`);
    if (currentWf.overallStatus !== 'completed') {
      throw new Error(`Expected overallStatus 'completed', got ${currentWf.overallStatus}`);
    }

    // -------------------------------------------------------------
    // Test 10: Clean up test data (ห้ามบันทึกเป็นธุรกรรมจริงในฐานข้อมูลการใช้งาน)
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Clean Up Test Workflow ---');
    await db.execute({
      sql: 'DELETE FROM workflow_attachments WHERE workflow_id = ?',
      args: [testWorkflowId],
    });
    await db.execute({
      sql: 'DELETE FROM cash_flow_withdrawals WHERE workflow_id = ?',
      args: [testWorkflowId],
    });
    await db.execute({
      sql: 'DELETE FROM audit_logs WHERE entity_id = ? OR entity_id LIKE ?',
      args: [testWorkflowId, `%${testWorkflowId}%`],
    });
    await db.execute({
      sql: 'DELETE FROM cash_flow_workflows WHERE id = ?',
      args: [testWorkflowId],
    });
    console.log(`✓ Test data cleaned up successfully. No permanent records left in production.`);

    console.log('\n======================================================');
    console.log('🎉 ALL 10 TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('\n❌ Test Suite Failed:', error);
    // Cleanup if failed
    if (testWorkflowId) {
      try {
        await db.execute({ sql: 'DELETE FROM workflow_attachments WHERE workflow_id = ?', args: [testWorkflowId] });
        await db.execute({ sql: 'DELETE FROM cash_flow_withdrawals WHERE workflow_id = ?', args: [testWorkflowId] });
        await db.execute({ sql: 'DELETE FROM cash_flow_workflows WHERE id = ?', args: [testWorkflowId] });
      } catch (cleanErr) {
        console.error('Failed to cleanup test data:', cleanErr);
      }
    }
    process.exit(1);
  }
}

run5StepCashWorkflowTests();
