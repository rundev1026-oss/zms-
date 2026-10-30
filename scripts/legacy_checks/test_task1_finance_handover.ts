import { FinancialService } from '../src/services/financialService';
import { initDb, getDb } from '../src/lib/db';
import { ActorContext } from '../src/services/financialService';

async function runTask1HandoverTests() {
  console.log('========================================================================');
  console.log('🧪 TASK 1: TEST SUITE - FINANCE CASH HANDOVER TO CASE WORKER');
  console.log('========================================================================\n');

  await initDb();
  const db = getDb();

  const financeActor: ActorContext = {
    id: 'u-finance-test',
    name: 'นางสาวการเงิน มีวินัย',
    role: 'finance',
  };

  const adminActor: ActorContext = {
    id: 'u-admin-test',
    name: 'นายแอดมิน สูงสุด',
    role: 'super_admin',
  };

  const unauthorizedActor: ActorContext = {
    id: 'u-member-test',
    name: 'นายทั่วไป สมาชิก',
    role: 'member',
  };

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // -------------------------------------------------------------------------
  // Setup: Create test workflow and withdrawal voucher for isolation
  // -------------------------------------------------------------------------
  const testWfId = `wf-test-ho-${Date.now()}`;
  const testWfNo = `CFW-TEST-${Date.now().toString().slice(-4)}`;
  const testWithdrawalId = `cw-test-ho-${Date.now()}`;
  const testWithdrawalNo = `VOUCH-TEST-${Date.now().toString().slice(-4)}`;
  const voucherAmount = 10000;

  console.log(`📦 Setting up isolated test records...`);
  console.log(`   Workflow: ${testWfNo} (${testWfId})`);
  console.log(`   Voucher:  ${testWithdrawalNo} (${testWithdrawalId}) - ฿${voucherAmount.toLocaleString()} บาท\n`);

  await db.execute({
    sql: `INSERT INTO cash_flow_workflows (
      id, workflow_no, title, overall_status, step1_bank_account_id,
      step1_withdraw_amount, step1_date, step1_operator_id, step1_operator_name,
      step1_status, step2_treasurer_id, step2_treasurer_name, step2_deposit_amount,
      step2_date, step2_status
    ) VALUES (?, ?, ?, 'in_progress', 'bank-1', 50000, '2026-10-22', 'op-1', 'เจ้าหน้าที่การเงิน', 'completed', 'custodian-ruslan', 'นายรุสลัน หะสาเมาะ', 50000, '2026-10-22', 'received')`,
    args: [testWfId, testWfNo, `รอบทดสอบระบบส่งมอบเงิน ${testWfNo}`],
  });

  await db.execute({
    sql: `INSERT INTO cash_flow_withdrawals (
      id, workflow_id, withdrawal_no, voucher_type, source_fund_type,
      target_asnaf, requested_amount, approved_amount, amount, purpose, status,
      withdrawer_name, approver_name, withdrawal_datetime,
      recipient_case_worker_name, total_handed_over_amount, remaining_handover_amount, handover_status
    ) VALUES (?, ?, ?, 'aid_disbursement', 'zakat', 'faqir_miskin', ?, ?, ?, 'เบิกเงินสดช่วยเหลือผู้ยากไร้', 'disbursed', 'นายมุกลิส มีระยะ', 'อิหม่ามฟารุก อาลี', datetime('now'), 'อุสมาน เจริญสุข (ผู้ดูแลเคส)', 0, ?, 'not_handed_over')`,
    args: [testWithdrawalId, testWfId, testWithdrawalNo, voucherAmount, voucherAmount, voucherAmount, voucherAmount],
  });

  // -------------------------------------------------------------------------
  // TEST 1: Missing Proof Rejection (หลักฐานไม่ครบ)
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Missing Proof Rejection ---');
  try {
    await FinancialService.recordFinanceHandover({
      withdrawalId: testWithdrawalId,
      handoverDate: '2026-10-22',
      handoverTime: '10:00',
      handedOverByName: 'นางสาวการเงิน มีวินัย',
      receivedByName: 'อุสมาน เจริญสุข',
      amount: 5000,
      handoverMethod: 'cash',
      proofUrl: '', // MISSING PROOF
      proofName: '',
      isConfirmed: true,
    }, financeActor);
    assert(false, 'Missing proof should throw error');
  } catch (err: any) {
    assert(
      err.message.includes('หลักฐาน') || err.message.includes('proof'),
      'Missing proof rejected with clear message',
      err.message
    );
  }

  // -------------------------------------------------------------------------
  // TEST 2: Unchecked Confirmation Checkbox Rejection
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Unchecked Confirmation Checkbox Rejection ---');
  try {
    await FinancialService.recordFinanceHandover({
      withdrawalId: testWithdrawalId,
      handoverDate: '2026-10-22',
      handoverTime: '10:00',
      handedOverByName: 'นางสาวการเงิน มีวินัย',
      receivedByName: 'อุสมาน เจริญสุข',
      amount: 5000,
      handoverMethod: 'cash',
      proofUrl: 'https://storage.zms.org/proofs/test1.pdf',
      proofName: 'test1.pdf',
      isConfirmed: false, // NOT CONFIRMED
    }, financeActor);
    assert(false, 'Unconfirmed checkbox should throw error');
  } catch (err: any) {
    assert(
      err.message.includes('ยืนยัน') || err.message.includes('ตรวจสอบ'),
      'Unconfirmed checkbox rejected with error message',
      err.message
    );
  }

  // -------------------------------------------------------------------------
  // TEST 3: Unauthorized User Rejection (ผู้ใช้ไม่มีสิทธิ์)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Unauthorized User Rejection ---');
  try {
    await FinancialService.recordFinanceHandover({
      withdrawalId: testWithdrawalId,
      handoverDate: '2026-10-22',
      handoverTime: '10:00',
      handedOverByName: 'นายทั่วไป สมาชิก',
      receivedByName: 'อุสมาน เจริญสุข',
      amount: 5000,
      handoverMethod: 'cash',
      proofUrl: 'https://storage.zms.org/proofs/test1.pdf',
      proofName: 'test1.pdf',
      isConfirmed: true,
    }, unauthorizedActor);
    assert(false, 'Unauthorized member role should throw error');
  } catch (err: any) {
    assert(
      err.message.includes('สิทธิ์ไม่เพียงพอ') || err.message.includes('ไม่อนุญาต'),
      'Unauthorized role rejected with permission denied error',
      err.message
    );
  }

  // -------------------------------------------------------------------------
  // TEST 4: Over-amount Rejection (ยอดเกินยอดคงเหลือ)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Over-amount Rejection ---');
  try {
    await FinancialService.recordFinanceHandover({
      withdrawalId: testWithdrawalId,
      handoverDate: '2026-10-22',
      handoverTime: '10:00',
      handedOverByName: 'นางสาวการเงิน มีวินัย',
      receivedByName: 'อุสมาน เจริญสุข',
      amount: 15000, // EXCEEDS 10,000
      handoverMethod: 'cash',
      proofUrl: 'https://storage.zms.org/proofs/test1.pdf',
      proofName: 'test1.pdf',
      isConfirmed: true,
    }, financeActor);
    assert(false, 'Over-amount should throw error');
  } catch (err: any) {
    assert(
      err.message.includes('เกินยอด') || err.message.includes('ยอดเงิน'),
      'Over-amount rejected with balance limit error',
      err.message
    );
  }

  // -------------------------------------------------------------------------
  // TEST 5: Partial Handover (ส่งมอบบางส่วน 4,000 / 10,000)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Partial Handover (4,000 / 10,000) ---');
  const partialResult = await FinancialService.recordFinanceHandover({
    withdrawalId: testWithdrawalId,
    handoverDate: '2026-10-22',
    handoverTime: '10:30',
    handedOverByName: 'นางสาวการเงิน มีวินัย',
    receivedByName: 'อุสมาน เจริญสุข',
    receivedByPosition: 'ผู้ดูแลเคสพื้นที่ปัตตานี',
    amount: 4000,
    handoverMethod: 'cash',
    referenceNo: 'HO-REF-TEST-01',
    notes: 'ส่งมอบเงินสดก้อนแรกสำหรับเคสเร่งด่วน',
    proofUrl: 'https://storage.zms.org/proofs/handover_part1.pdf',
    proofName: 'handover_part1.pdf',
    proofSize: 204800,
    proofType: 'application/pdf',
    isConfirmed: true,
  }, financeActor);

  assert(partialResult.success === true, 'Partial handover recorded successfully');
  assert(partialResult.handoverAmount === 4000, 'Handover amount recorded as 4,000');
  assert(partialResult.totalHandedOver === 4000, 'Total handed over updated to 4,000');
  assert(partialResult.remainingHandover === 6000, 'Remaining unhanded updated to 6,000');
  assert(partialResult.status === 'partially_handed_over', 'Status correctly set to partially_handed_over');
  assert(partialResult.handoverNo.startsWith('HO-'), `Handover No generated in standard format (${partialResult.handoverNo})`);

  // Verify database record
  const checkPartial = await db.execute({
    sql: 'SELECT handover_status, total_handed_over_amount, remaining_handover_amount FROM cash_flow_withdrawals WHERE id = ?',
    args: [testWithdrawalId],
  });
  assert(Number(checkPartial.rows[0].total_handed_over_amount) === 4000, 'DB voucher total_handed_over_amount is 4000');
  assert(Number(checkPartial.rows[0].remaining_handover_amount) === 6000, 'DB voucher remaining_handover_amount is 6000');
  assert(checkPartial.rows[0].handover_status === 'partially_handed_over', 'DB voucher status is partially_handed_over');

  // Verify attachment record created
  const checkAtt = await db.execute({
    sql: 'SELECT * FROM workflow_attachments WHERE withdrawal_id = ?',
    args: [testWithdrawalId],
  });
  assert(checkAtt.rows.length >= 1, 'Workflow attachment logged for proof file');

  // -------------------------------------------------------------------------
  // TEST 6: Complete Remaining Handover (ส่งมอบส่วนที่เหลือ 6,000 / 6,000)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Complete Remaining Handover (6,000 / 6,000) ---');
  const fullResult = await FinancialService.recordFinanceHandover({
    withdrawalId: testWithdrawalId,
    handoverDate: '2026-10-22',
    handoverTime: '14:00',
    handedOverByName: 'นางสาวการเงิน มีวินัย',
    receivedByName: 'อุสมาน เจริญสุข',
    receivedByPosition: 'ผู้ดูแลเคสพื้นที่ปัตตานี',
    amount: 6000, // Remaining balance
    handoverMethod: 'cash',
    referenceNo: 'HO-REF-TEST-02',
    notes: 'ส่งมอบเงินสดส่วนที่เหลือครบถ้วน',
    proofUrl: 'https://storage.zms.org/proofs/handover_part2.jpg',
    proofName: 'handover_part2.jpg',
    proofSize: 512000,
    proofType: 'image/jpeg',
    isConfirmed: true,
  }, financeActor);

  assert(fullResult.success === true, 'Final handover recorded successfully');
  assert(fullResult.totalHandedOver === 10000, 'Total handed over reached 10,000');
  assert(fullResult.remainingHandover === 0, 'Remaining unhanded reached 0');
  assert(fullResult.status === 'fully_handed_over', 'Status correctly transitioned to fully_handed_over');

  // Verify database record
  const checkFull = await db.execute({
    sql: 'SELECT handover_status, total_handed_over_amount, remaining_handover_amount FROM cash_flow_withdrawals WHERE id = ?',
    args: [testWithdrawalId],
  });
  assert(Number(checkFull.rows[0].total_handed_over_amount) === 10000, 'DB voucher total_handed_over_amount is 10000');
  assert(Number(checkFull.rows[0].remaining_handover_amount) === 0, 'DB voucher remaining_handover_amount is 0');
  assert(checkFull.rows[0].handover_status === 'fully_handed_over', 'DB voucher status is fully_handed_over');

  // -------------------------------------------------------------------------
  // TEST 7: Attempt Additional Handover When Already Fully Handed Over
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Rejection When Fully Handed Over ---');
  try {
    await FinancialService.recordFinanceHandover({
      withdrawalId: testWithdrawalId,
      handoverDate: '2026-10-22',
      handoverTime: '15:00',
      handedOverByName: 'นางสาวการเงิน มีวินัย',
      receivedByName: 'อุสมาน เจริญสุข',
      amount: 100,
      handoverMethod: 'cash',
      proofUrl: 'https://storage.zms.org/proofs/extra.pdf',
      proofName: 'extra.pdf',
      isConfirmed: true,
    }, financeActor);
    assert(false, 'Additional handover when balance is 0 should throw error');
  } catch (err: any) {
    assert(
      err.message.includes('เกินยอด') || err.message.includes('0.00'),
      'Prevented handover exceeding remaining balance 0',
      err.message
    );
  }

  // -------------------------------------------------------------------------
  // TEST 8: Cancellation & Accurate Balance Rollback (ยกเลิกพร้อมเหตุผล)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Cancellation & Balance Rollback ---');
  const cancelResult = await FinancialService.cancelFinanceHandover(
    fullResult.handoverId,
    'ผู้ดูแลเคสแจ้งยอดนับซ้ำ ขอให้ปรับปรุงยอดใหม่',
    financeActor
  );

  assert(cancelResult.success === true, 'Cancellation executed successfully');
  assert(cancelResult.cancelledAmount === 6000, 'Cancelled amount correctly identified as 6,000');
  assert(cancelResult.totalHandedOver === 4000, 'Total handed over rolled back to 4,000');
  assert(cancelResult.remainingHandover === 6000, 'Remaining unhanded rolled back to 6,000');
  assert(cancelResult.status === 'partially_handed_over', 'Status reverted back to partially_handed_over');

  // Verify in database
  const checkRollback = await db.execute({
    sql: 'SELECT handover_status, total_handed_over_amount, remaining_handover_amount FROM cash_flow_withdrawals WHERE id = ?',
    args: [testWithdrawalId],
  });
  assert(Number(checkRollback.rows[0].total_handed_over_amount) === 4000, 'DB rolled back total to 4,000');
  assert(Number(checkRollback.rows[0].remaining_handover_amount) === 6000, 'DB rolled back remaining to 6,000');
  assert(checkRollback.rows[0].handover_status === 'partially_handed_over', 'DB status rolled back to partially_handed_over');

  // -------------------------------------------------------------------------
  // TEST 9: Financial Rule Verification: No Duplicate Vouchers & Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Financial Rules: No Duplicate Vouchers & ID Linking ---');
  const voucherCount = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM cash_flow_withdrawals WHERE workflow_id = ?',
    args: [testWfId],
  });
  assert(Number(voucherCount.rows[0].count) === 1, 'No duplicate vouchers created (Strict ID Linking)');

  // Verify that handover is linked to original voucher
  const linkedHandovers = await db.execute({
    sql: 'SELECT * FROM finance_handover_records WHERE withdrawal_id = ?',
    args: [testWithdrawalId],
  });
  assert(linkedHandovers.rows.length === 2, 'All handover records linked to original voucher ID');

  // Verify handover does NOT create financial_transactions disbursement prematurely
  const prematureTxns = await db.execute({
    sql: "SELECT * FROM financial_transactions WHERE workflow_id = ? AND payer_or_payee LIKE '%อุสมาน%'",
    args: [testWfId],
  });
  assert(prematureTxns.rows.length === 0, 'Internal custody transfer is NOT booked as beneficiary expenditure');

  // -------------------------------------------------------------------------
  // TEST 10: Query getVoucherHandovers for all 11 Required Fields
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 10: Query getVoucherHandovers API (11 Mandated Fields) ---');
  const summaries = await FinancialService.getVoucherHandovers(testWithdrawalNo);
  assert(summaries.length === 1, 'Found target voucher summary');

  const item = summaries[0];
  assert(Boolean(item.workflowNo), `Field 1 (Workflow No): ${item.workflowNo}`);
  assert(Boolean(item.withdrawalNo), `Field 2 (Voucher No): ${item.withdrawalNo}`);
  assert(Boolean(item.withdrawalDatetime), `Field 3 (Datetime): ${item.withdrawalDatetime}`);
  assert(item.amount === 10000, `Field 4 (Amount): ฿${item.amount}`);
  assert(Boolean(item.sourceFundType), `Field 5 (Source Fund): ${item.sourceFundType}`);
  assert(Boolean(item.targetAsnaf), `Field 6 (Asnaf/Type): ${item.targetAsnaf}`);
  assert(Boolean(item.withdrawerName), `Field 7 (Withdrawer): ${item.withdrawerName}`);
  assert(Boolean(item.recipientCaseWorkerName), `Field 8 (Case Worker): ${item.recipientCaseWorkerName}`);
  assert(item.totalHandedOverAmount === 4000, `Field 9 (Handed Over): ฿${item.totalHandedOverAmount}`);
  assert(item.remainingHandoverAmount === 6000, `Field 10 (Remaining): ฿${item.remainingHandoverAmount}`);
  assert(item.handoverStatus === 'partially_handed_over', `Field 11 (Status): ${item.handoverStatus}`);

  // Clean up isolated test data
  await db.execute({ sql: 'DELETE FROM finance_handover_records WHERE withdrawal_id = ?', args: [testWithdrawalId] });
  await db.execute({ sql: 'DELETE FROM workflow_attachments WHERE withdrawal_id = ?', args: [testWithdrawalId] });
  await db.execute({ sql: 'DELETE FROM cash_flow_withdrawals WHERE id = ?', args: [testWithdrawalId] });
  await db.execute({ sql: 'DELETE FROM cash_flow_workflows WHERE id = ?', args: [testWfId] });

  console.log('\n========================================================================');
  console.log(`🎉 ALL TESTS PASSED! (${passedTests}/${totalTests} assertions)`);
  console.log('========================================================================\n');
}

runTask1HandoverTests().catch((err) => {
  console.error('\n❌ TEST RUNNER ERROR:', err);
  process.exit(1);
});
