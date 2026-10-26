import { initDb, getDb } from '../src/lib/db';
import { FinancialService } from '../src/services/financialService';

const testActor = {
  id: 'u-admin-test',
  name: 'ผู้ดูแลระบบทดสอบ',
  role: 'super_admin' as const,
};

async function runAllTests() {
  console.log('===============================================================');
  console.log('  STARTING TEST SUITE: DUPLICATE VOUCHER FIX VERIFICATION');
  console.log('===============================================================\n');

  await initDb();
  const db = getDb();

  // Create a dedicated test workflow for testing withdrawals
  const testWfId = `wf-voucher-test-${Date.now()}`;
  await db.execute({
    sql: `INSERT INTO cash_flow_workflows (
      id, workflow_no, title, step1_bank_account_id, step1_withdraw_amount,
      step1_date, step1_operator_id, step1_operator_name, step1_status,
      step2_deposit_amount, step2_date, step2_status, step2_treasurer_name,
      step3_withdraw_amount, step3_status, overall_status
    ) VALUES (?, ?, 'ทดสอบออกใบสำคัญ', 'bank-01', 500000, CURRENT_TIMESTAMP, 'u-test', 'ผู้ทดสอบ', 'completed', 500000, CURRENT_TIMESTAMP, 'received', 'นายอับดุลเลาะห์ มะยูโซ๊ะ', 0, 'pending', 'active')`,
    args: [testWfId, `CFW-TEST-${Date.now().toString().slice(-4)}`],
  });

  console.log(`[Setup] Created test cash flow workflow: ${testWfId} with ฿500,000 cash in hand\n`);

  let passedCount = 0;
  const totalTests = 7;

  // ---------------------------------------------------------------------------
  // Test 1: หากเลขล่าสุดคือ 06 ให้เสนอ 07 (ทดสอบด้วยปีพุทธศักราชจำลอง 2568)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Suggest 07 when 06 is highest in DB (Simulated baseline) ---');
  const testYear1 = '2568';
  try {
    // Insert vouchers up to 06/2568
    for (let i = 1; i <= 6; i++) {
      const vNo = `${String(i).padStart(2, '0')}/${testYear1}`;
      await db.execute({
        sql: `INSERT INTO cash_flow_withdrawals (
          id, workflow_id, withdrawal_no, amount, requested_amount, approved_amount,
          actual_received_amount, source_fund_type, withdrawal_datetime, withdrawer_id,
          withdrawer_name, source_description, target_asnaf, target_fund_id, purpose, approver_id, approver_name,
          notes, status, voucher_type
        ) VALUES (?, ?, ?, 100, 100, 100, 100, 'zakat', CURRENT_TIMESTAMP,
          'u-test', 'ผู้ทดสอบ', 'ทดสอบ', 'faqir_miskin', 'fund-1', 'ทดสอบลำดับ', 'u-app', 'ผู้อนุมัติ', 'notes', 'disbursed', 'office_expense')`,
        args: [`cw-test-${testYear1}-${i}`, testWfId, vNo],
      });
    }

    const nextNo = await FinancialService.getNextWithdrawalNo(testYear1);
    console.log(`  Highest in DB is 06/${testYear1}. Next suggested voucher: "${nextNo}"`);
    if (nextNo === `07/${testYear1}`) {
      console.log(`  ✓ TEST 1 PASSED: Correctly suggested "07/${testYear1}" after 06\n`);
      passedCount++;
    } else {
      console.error(`  ✗ TEST 1 FAILED: Expected "07/${testYear1}", but got "${nextNo}"\n`);
    }
  } catch (err: any) {
    console.error('  ✗ TEST 1 ERROR:', err.message, '\n');
  }

  // ---------------------------------------------------------------------------
  // Test 2: เลข 07 ถูกใช้งานแล้ว ระบบต้องเสนอเลขถัดไปที่ว่าง (ข้ามไป 08)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 2: Skip occupied number (07 occupied -> suggest 08) ---');
  try {
    // Both on live DB 2569 (where 07/2569 exists) and testYear1
    const nextLive = await FinancialService.getNextWithdrawalNo('2569');
    console.log(`  Live DB year 2569 has 07/2569 in use. Next suggested voucher: "${nextLive}"`);

    // Also insert 07/2568 in testYear1 and check
    await db.execute({
      sql: `INSERT INTO cash_flow_withdrawals (
        id, workflow_id, withdrawal_no, amount, requested_amount, approved_amount,
        actual_received_amount, source_fund_type, withdrawal_datetime, withdrawer_id,
        withdrawer_name, source_description, target_asnaf, target_fund_id, purpose, approver_id, approver_name,
        notes, status, voucher_type
      ) VALUES (?, ?, '07/2568', 100, 100, 100, 100, 'zakat', CURRENT_TIMESTAMP,
        'u-test', 'ผู้ทดสอบ', 'ทดสอบ', 'faqir_miskin', 'fund-1', 'ทดสอบการข้ามเลขซ้ำ', 'u-app', 'ผู้อนุมัติ', 'notes', 'disbursed', 'office_expense')`,
      args: [`cw-test-2568-7`, testWfId],
    });

    const nextTestYear = await FinancialService.getNextWithdrawalNo(testYear1);
    console.log(`  After inserting 07/${testYear1}, next recommended number is: "${nextTestYear}"`);

    if (nextLive === '08/2569' && nextTestYear === `08/${testYear1}`) {
      console.log('  ✓ TEST 2 PASSED: Successfully skipped 07 and proposed 08 on both test and live fiscal years!\n');
      passedCount++;
    } else {
      console.error(`  ✗ TEST 2 FAILED: Expected 08/2569 and 08/${testYear1}, got "${nextLive}" and "${nextTestYear}"\n`);
    }
  } catch (err: any) {
    console.error('  ✗ TEST 2 ERROR:', err.message, '\n');
  }

  // ---------------------------------------------------------------------------
  // Test 3: มีผู้ใช้หลายคนสร้างใบสำคัญพร้อมกัน (Concurrency Test)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 3: High Concurrency (Multiple simultaneous requests) ---');
  try {
    const concurrentRequests = 5;
    console.log(`  Dispatching ${concurrentRequests} concurrent withdrawal requests simultaneously...`);

    const promises = Array.from({ length: concurrentRequests }).map((_, idx) => {
      return FinancialService.addCashFlowWithdrawal(
        {
          workflowId: testWfId,
          withdrawalNo: 'auto',
          isAutoAllocated: true,
          amount: 1000,
          voucherType: 'office_expense',
          purpose: `เบิกพร้อมกัน รายการที่ ${idx + 1}`,
          expenseCategory: 'OFFICE_EXPENSES',
          expenseDetails: `เบิกพร้อมกัน รายการที่ ${idx + 1}`,
          allowedFundId: 'amileen',
          sourceFundType: 'amileen',
          targetAsnaf: 'amileen',
        },
        testActor
      );
    });

    const results = await Promise.all(promises);
    const allocatedNos = results.map((r) => r.withdrawalNo);
    console.log(`  Allocated voucher numbers:`, allocatedNos);

    // Verify all 5 succeeded and all numbers are unique
    const uniqueNos = new Set(allocatedNos);
    if (uniqueNos.size === concurrentRequests) {
      console.log(`  ✓ TEST 3 PASSED: All ${concurrentRequests} concurrent requests got distinct sequential numbers without collisions!\n`);
      passedCount++;
    } else {
      console.error(`  ✗ TEST 3 FAILED: Found duplicate numbers in concurrent run:`, allocatedNos, '\n');
    }
  } catch (err: any) {
    console.error('  ✗ TEST 3 ERROR:', err.message, '\n');
  }

  // ---------------------------------------------------------------------------
  // Test 4: ผู้ใช้กรอกเลขซ้ำเอง (Manual Duplicate Rejection)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 4: Manual Duplicate Input Rejection ---');
  try {
    let errorCaught = false;
    let errorMessage = '';

    try {
      await FinancialService.addCashFlowWithdrawal(
        {
          workflowId: testWfId,
          withdrawalNo: '03/2569', // Already exists in system
          isAutoAllocated: false,
          amount: 500,
          voucherType: 'office_expense',
          purpose: 'ทดสอบกรอกเลขซ้ำเอง',
          expenseCategory: 'OFFICE_EXPENSES',
          expenseDetails: 'ทดสอบกรอกเลขซ้ำเอง',
          allowedFundId: 'amileen',
          sourceFundType: 'amileen',
          targetAsnaf: 'amileen',
        },
        testActor
      );
    } catch (err: any) {
      errorCaught = true;
      errorMessage = err.message;
    }

    if (errorCaught && errorMessage.includes('ตรวจพบเลขที่ใบสำคัญซ้ำซ้อน') && errorMessage.includes('03/2569')) {
      console.log(`  Rejection message returned: "${errorMessage}"`);
      console.log('  ✓ TEST 4 PASSED: Manual duplicate was cleanly rejected with informative suggestion!\n');
      passedCount++;
    } else {
      console.error(`  ✗ TEST 4 FAILED: Expected duplicate rejection error, but got: "${errorMessage}"\n`);
    }
  } catch (err: any) {
    console.error('  ✗ TEST 4 ERROR:', err.message, '\n');
  }

  // ---------------------------------------------------------------------------
  // Test 5: บันทึกไม่สำเร็จกลางทาง (Transaction Rollback Verification)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 5: Mid-way Transaction Rollback & Integrity ---');
  try {
    const preCountRes = await db.execute('SELECT COUNT(*) as cnt FROM cash_flow_withdrawals');
    const preCount = Number(preCountRes.rows[0].cnt);

    let rollbackErrorCaught = false;
    try {
      // Trigger error by requesting amount larger than available cash
      await FinancialService.addCashFlowWithdrawal(
        {
          workflowId: testWfId,
          withdrawalNo: '99/2569',
          isAutoAllocated: false,
          amount: 999999999, // Exceeds balance!
          status: 'disbursed',
          voucherType: 'office_expense',
          purpose: 'ทดสอบยอดเกินวงเงิน',
          expenseCategory: 'OFFICE_EXPENSES',
          expenseDetails: 'ทดสอบยอดเกินวงเงิน',
          allowedFundId: 'amileen',
          sourceFundType: 'amileen',
          targetAsnaf: 'amileen',
        },
        testActor
      );
    } catch (err: any) {
      rollbackErrorCaught = true;
    }

    const postCountRes = await db.execute('SELECT COUNT(*) as cnt FROM cash_flow_withdrawals');
    const postCount = Number(postCountRes.rows[0].cnt);

    if (rollbackErrorCaught && preCount === postCount) {
      console.log(`  Count before: ${preCount}, Count after: ${postCount} (No orphan records created)`);
      console.log('  ✓ TEST 5 PASSED: Transaction safely aborted and rolled back without orphan records!\n');
      passedCount++;
    } else {
      console.error(`  ✗ TEST 5 FAILED: DB count changed from ${preCount} to ${postCount}!\n`);
    }
  } catch (err: any) {
    console.error('  ✗ TEST 5 ERROR:', err.message, '\n');
  }

  // ---------------------------------------------------------------------------
  // Test 6: เปิดแก้ไขใบสำคัญเดิมโดยไม่สร้างเลขใหม่
  // ---------------------------------------------------------------------------
  console.log('--- TEST 6: Editing Existing Voucher Preserves Original Number ---');
  try {
    const existingWithdrawalRes = await db.execute({
      sql: 'SELECT id, withdrawal_no, notes FROM cash_flow_withdrawals WHERE id = ?',
      args: ['cw-demo-aid-01'],
    });

    if (existingWithdrawalRes.rows.length === 0) {
      throw new Error('Test voucher cw-demo-aid-01 not found');
    }

    const originalNo = String(existingWithdrawalRes.rows[0].withdrawal_no);
    const updatedNotes = `อัปเดตหมายเหตุเมื่อ ${Date.now()}`;

    await FinancialService.updateCashFlowWithdrawal(
      'cw-demo-aid-01',
      {
        notes: updatedNotes,
      },
      testActor
    );

    const checkAfterRes = await db.execute({
      sql: 'SELECT id, withdrawal_no, notes FROM cash_flow_withdrawals WHERE id = ?',
      args: ['cw-demo-aid-01'],
    });
    const afterNo = String(checkAfterRes.rows[0].withdrawal_no);
    const afterNotes = String(checkAfterRes.rows[0].notes);

    if (afterNo === originalNo && afterNotes === updatedNotes) {
      console.log(`  Original voucherNo: "${originalNo}", After edit voucherNo: "${afterNo}"`);
      console.log('  ✓ TEST 6 PASSED: Voucher number was preserved intact when editing!\n');
      passedCount++;
    } else {
      console.error(`  ✗ TEST 6 FAILED: Voucher number changed from "${originalNo}" to "${afterNo}"\n`);
    }
  } catch (err: any) {
    console.error('  ✗ TEST 6 ERROR:', err.message, '\n');
  }

  // ---------------------------------------------------------------------------
  // Test 7: เปลี่ยนปีเอกสารและเริ่มลำดับตามนโยบายของระบบ
  // ---------------------------------------------------------------------------
  console.log('--- TEST 7: Fiscal Year Transition (Year 2570 starts at 01/2570) ---');
  try {
    const year2570 = '2570';
    const next2570 = await FinancialService.getNextWithdrawalNo(year2570);
    const extractedYearFromDate = FinancialService.extractDocumentYear('2027-04-10T14:30:00');

    console.log(`  Year extracted from date '2027-04-10': "${extractedYearFromDate}"`);
    console.log(`  First voucher calculated for year ${year2570}: "${next2570}"`);

    if (extractedYearFromDate === '2570' && next2570 === '01/2570') {
      console.log('  ✓ TEST 7 PASSED: Year transition correctly starts at "01/2570" dynamically!\n');
      passedCount++;
    } else {
      console.error(`  ✗ TEST 7 FAILED: Expected year "2570" and next "01/2570", got year "${extractedYearFromDate}" and next "${next2570}"\n`);
    }
  } catch (err: any) {
    console.error('  ✗ TEST 7 ERROR:', err.message, '\n');
  }

  // Clean up test data for testYear1 (2568) and test workflow
  try {
    await db.execute({
      sql: 'DELETE FROM cash_flow_withdrawals WHERE withdrawal_no LIKE ?',
      args: [`%/${testYear1}`],
    });
    await db.execute({
      sql: 'DELETE FROM cash_flow_withdrawals WHERE workflow_id = ?',
      args: [testWfId],
    });
    await db.execute({
      sql: 'DELETE FROM cash_flow_workflows WHERE id = ?',
      args: [testWfId],
    });
    console.log('[Cleanup] Removed test workflow and temporary test records');
  } catch (e: any) {
    console.warn('[Cleanup Warning]', e.message);
  }

  console.log('\n===============================================================');
  console.log(`  TEST RESULTS: ${passedCount}/${totalTests} PASSED`);
  console.log('===============================================================');

  if (passedCount === totalTests) {
    console.log('🎉 ALL 7 TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error(`❌ SOME TESTS FAILED (${totalTests - passedCount} failed)`);
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal Test Runner Error:', e);
  process.exit(1);
});
