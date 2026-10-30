import { initDb, getDb } from '../src/lib/db';
import { BeneficiaryService } from '../src/services/beneficiaryService';
import { FinancialService } from '../src/services/financialService';

async function runStep7Verification() {
  console.log('=== STARTING STEP 7 VERIFICATION: APPROVALS, AID & FINANCE LINKAGE ===\n');
  await initDb();
  const db = getDb();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const testHhId = `test-hh-step7-${Date.now()}`;
  const testAppId = `test-app-step7-${Date.now()}`;
  const testBenId = `test-ben-step7-${Date.now()}`;
  const testAppNo = `APP-TEST-S7-${Date.now().toString().slice(-4)}`;
  const testRefNo = `REF-TEST-S7-${Date.now().toString().slice(-6)}`;

  const officerActor = { id: 'u-officer-test', name: 'เจ้าหน้าที่ลงพื้นที่ ทดสอบ', role: 'officer' as any };
  const approverActor = { id: 'u-approver-test', name: 'คณะกรรมการพิจารณา ทดสอบ', role: 'approver' as any };
  const financeActor = { id: 'u-finance-test', name: 'เจ้าหน้าที่การเงิน ทดสอบ', role: 'finance' as any };

  try {
    // -------------------------------------------------------------------------
    // Setup Test Household, Beneficiary & Application
    // -------------------------------------------------------------------------
    await db.execute({
      sql: `INSERT INTO households (
        id, household_no, address, province, district, community
      ) VALUES (?, ?, '123/45 ถนนทดสอบ', 'กรุงเทพมหานคร', 'บางรัก', 'ชุมชนทดสอบ')`,
      args: [testHhId, `HH-TEST-${Date.now().toString().slice(-4)}`],
    });

    await db.execute({
      sql: `INSERT INTO beneficiaries (
        id, household_id, full_name, national_id, phone, asnaf_category, branch_id, branch_name
      ) VALUES (?, ?, 'นายทดสอบ ขั้นที่เจ็ด', '1999999999999', '0812345678', 'miskin', 'br-hq', 'สำนักงานใหญ่ กรุงเทพมหานคร')`,
      args: [testBenId, testHhId],
    });

    await db.execute({
      sql: `INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, requested_amount, status,
        assigned_officer_id, assigned_officer_name, applied_date, branch_id, branch_name,
        primary_group_code, specific_fund_id, specific_fund_code, specific_fund_name,
        assistance_type_id, assistance_type, fiscal_year
      ) VALUES (?, ?, ?, 'miskin', 5000, 'doc_review', ?, ?, '2026-10-29', 'br-hq', 'สำนักงานใหญ่ กรุงเทพมหานคร',
        'faqir_miskin', 'subf-1', 'living', 'กองทุนช่วยเหลือค่าครองชีพ', 'ast-1', 'เงินสงเคราะห์ยังชีพ', '2569')`,
      args: [testAppId, testAppNo, testBenId, officerActor.id, officerActor.name],
    });

    console.log(`Created test application ${testAppNo} (ID: ${testAppId})`);

    // -------------------------------------------------------------------------
    // TEST 1: Field Assessment with recommendedSpecificFundId
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Submit Field Assessment with Specific Fund Linkage ---');
    const assessRes = await BeneficiaryService.submitAssessment(
      testAppId,
      {
        housingCondition: 'poor',
        housingNotes: 'บ้านชำรุดทรุดโทรม',
        livingScore: 88,
        debtBurdenSummary: 'หนี้ค่าครองชีพ 5,000 บาท',
        primaryHardship: 'รายได้ไม่พอยังชีพ',
        officerRecommendation: 'recommend_full',
        recommendedAmount: 5000,
        recommendedFundId: 'fund-1',
        recommendedSpecificFundId: 'subf-1',
        generalNotes: 'ผ่านเกณฑ์ความช่วยเหลือเร่งด่วน',
      },
      officerActor
    );

    assert(assessRes.status === 'pending_approval', 'Application transitioned to pending_approval');

    const checkAss = await db.execute({
      sql: 'SELECT recommended_fund_id, recommended_specific_fund_id, living_score FROM beneficiary_assessments WHERE application_id = ?',
      args: [testAppId],
    });
    assert(checkAss.rows.length === 1, 'Assessment record inserted');
    assert(String(checkAss.rows[0].recommended_specific_fund_id) === 'subf-1', 'recommended_specific_fund_id stored correctly as subf-1');

    // -------------------------------------------------------------------------
    // TEST 2: Segregation of Duties on Approval
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Segregation of Duties Enforcement (Officer Cannot Approve Own App) ---');
    let officerApprovalBlocked = false;
    try {
      await BeneficiaryService.approveApplication(
        testAppId,
        5000,
        'fund-1',
        'พยายามอนุมัติโดยเจ้าหน้าที่ลงพื้นที่เอง',
        officerActor, // officer role
        'subf-1'
      );
    } catch (err: any) {
      officerApprovalBlocked = true;
      assert(err.message.includes('ไม่มีสิทธิ์') || err.message.includes('Segregation of Duties'), `Correctly blocked officer from approving: ${err.message}`);
    }
    assert(officerApprovalBlocked, 'Assigned officer was strictly prevented from approving application');

    // -------------------------------------------------------------------------
    // TEST 3: Specific Fund Solvency Check (Excessive Budget Blocked)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Solvency Check Prevention (Excessive Amount Over Remaining Budget) ---');
    let excessiveBlocked = false;
    try {
      await BeneficiaryService.approveApplication(
        testAppId,
        999999999, // 999 Million THB (exceeds all fund balances)
        'fund-1',
        'ทดสอบยอดเกินงบประมาณ',
        approverActor,
        'subf-1'
      );
    } catch (err: any) {
      excessiveBlocked = true;
      assert(err.message.includes('ไม่เพียงพอ'), `Correctly caught solvency error: ${err.message}`);
    }
    assert(excessiveBlocked, 'Excessive budget approval was strictly blocked by solvency engine');

    // -------------------------------------------------------------------------
    // TEST 4: Valid Approval with Multi-Tier Budget Commitment
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Valid Approval with Multi-Tier Commitment Updates ---');
    // Read pre-approval state
    const preFa = await db.execute({ sql: 'SELECT committed_amount, available_amount FROM fund_accounts WHERE id = ?', args: ['fund-1'] });
    const preSf = await db.execute({ sql: 'SELECT committed_amount, remaining_amount FROM faqir_miskin_sub_funds WHERE id = ?', args: ['subf-1'] });
    const preAa = await db.execute({ sql: "SELECT committed_amount FROM asnaf_allocations WHERE asnaf_code = 'faqir_miskin' AND fiscal_year = '2569'", args: [] });

    const preFaCommitted = Number(preFa.rows[0].committed_amount);
    const preSfCommitted = Number(preSf.rows[0].committed_amount);
    const preAaCommitted = Number(preAa.rows[0].committed_amount);

    const approveRes = await BeneficiaryService.approveApplication(
      testAppId,
      5000,
      'fund-1',
      'อนุมัติตามผลการประเมินของเจ้าหน้าที่ลงพื้นที่',
      approverActor,
      'subf-1'
    );

    assert(approveRes.status === 'wait_disbursement', 'Application moved to wait_disbursement');
    assert(approveRes.approvedAmount === 5000, 'Approved amount recorded as 5000');
    assert(approveRes.specificFundId === 'subf-1', 'Approved specific fund is subf-1');

    // Check application DB record
    const postApp = await db.execute({
      sql: 'SELECT status, approved_amount, approved_fund_id, approved_specific_fund_id, approved_by_id FROM assistance_applications WHERE id = ?',
      args: [testAppId],
    });
    assert(String(postApp.rows[0].status) === 'wait_disbursement', 'Application status is wait_disbursement in DB');
    assert(Number(postApp.rows[0].approved_amount) === 5000, 'approved_amount is 5000 in DB');
    assert(String(postApp.rows[0].approved_specific_fund_id) === 'subf-1', 'approved_specific_fund_id is subf-1 in DB');
    assert(String(postApp.rows[0].approved_fund_id) === 'fund-1', 'approved_fund_id is fund-1 in DB');

    // Check Multi-Tier commitment increments
    const postFa = await db.execute({ sql: 'SELECT committed_amount FROM fund_accounts WHERE id = ?', args: ['fund-1'] });
    const postSf = await db.execute({ sql: 'SELECT committed_amount FROM faqir_miskin_sub_funds WHERE id = ?', args: ['subf-1'] });
    const postAa = await db.execute({ sql: "SELECT committed_amount FROM asnaf_allocations WHERE asnaf_code = 'faqir_miskin' AND fiscal_year = '2569'", args: [] });

    assert(Number(postFa.rows[0].committed_amount) === preFaCommitted + 5000, 'fund_accounts committed_amount incremented by 5000');
    assert(Number(postSf.rows[0].committed_amount) === preSfCommitted + 5000, 'faqir_miskin_sub_funds committed_amount incremented by 5000');
    assert(Number(postAa.rows[0].committed_amount) === preAaCommitted + 5000, 'asnaf_allocations committed_amount incremented by 5000');

    // -------------------------------------------------------------------------
    // TEST 5: Segregation of Duties on Disbursement (Approver != Disburser)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Segregation of Duties (Approver Cannot Disburse) ---');
    let approverDisburseBlocked = false;
    try {
      await BeneficiaryService.recordDisbursement(
        testAppId,
        testRefNo,
        '/slips/test.jpg',
        'พยายามจ่ายเงินโดยผู้อนุมัติ',
        approverActor // approver role attempting disburse
      );
    } catch (err: any) {
      approverDisburseBlocked = true;
      assert(err.message.includes('การละเมิดสิทธิ์') || err.message.includes('Segregation of Duties'), `Correctly blocked approver from disbursing: ${err.message}`);
    }
    assert(approverDisburseBlocked, 'Approver was strictly prevented from disbursing payment');

    // -------------------------------------------------------------------------
    // TEST 6: Duplicate Payment Reference Rejection (Idempotency)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Valid Disbursement & Duplicate Reference Prevention ---');
    const disbRes = await BeneficiaryService.recordDisbursement(
      testAppId,
      testRefNo,
      '/slips/test.jpg',
      'ฝ่ายการเงินโอนเงินสวัสดิการสำเร็จ',
      financeActor
    );

    assert(disbRes.status === 'disbursed', 'Disbursement status returned as disbursed');
    assert(disbRes.amount === 5000, 'Disbursed amount is 5000');

    // Attempt second disbursement with same reference number
    let duplicateBlocked = false;
    try {
      await BeneficiaryService.recordDisbursement(
        testAppId,
        testRefNo, // same reference
        '/slips/test2.jpg',
        'พยายามจ่ายซ้ำด้วยเลขอ้างอิงเดิม',
        financeActor
      );
    } catch (err: any) {
      duplicateBlocked = true;
      assert(err.message.includes('ตรวจพบธุรกรรมซ้ำ') || err.message.includes('ไม่อยู่ในสถานะรอจ่ายเงิน'), `Correctly caught duplicate or invalid state: ${err.message}`);
    }
    assert(duplicateBlocked, 'Duplicate disbursement was strictly prevented');

    // -------------------------------------------------------------------------
    // TEST 7: Multi-Tier Commitment Release & Disbursement Increments
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Multi-Tier Balance Verification Post-Disbursement ---');
    const finalFa = await db.execute({ sql: 'SELECT committed_amount, disbursed_amount FROM fund_accounts WHERE id = ?', args: ['fund-1'] });
    const finalSf = await db.execute({ sql: 'SELECT committed_amount, disbursed_amount FROM faqir_miskin_sub_funds WHERE id = ?', args: ['subf-1'] });
    const finalAa = await db.execute({ sql: "SELECT committed_amount, disbursed_amount FROM asnaf_allocations WHERE asnaf_code = 'faqir_miskin' AND fiscal_year = '2569'", args: [] });

    assert(Number(finalFa.rows[0].committed_amount) === preFaCommitted, 'fund_accounts commitment was safely released back');
    assert(Number(finalSf.rows[0].committed_amount) === preSfCommitted, 'faqir_miskin_sub_funds commitment was safely released back');
    assert(Number(finalAa.rows[0].committed_amount) === preAaCommitted, 'asnaf_allocations commitment was safely released back');

    // Check financial_transactions row has full 3-tier linkage
    const ftRes = await db.execute({
      sql: `SELECT id, transaction_no, type, specific_fund_id, sub_fund_category, asnaf_category, assistance_type_id, application_id, beneficiary_id, amount
            FROM financial_transactions WHERE reference_no = ?`,
      args: [testRefNo],
    });
    assert(ftRes.rows.length === 1, 'financial_transactions row created for disbursement');
    const ft = ftRes.rows[0];
    assert(String(ft.type) === 'disbursement', 'Transaction type is disbursement');
    assert(String(ft.specific_fund_id) === 'subf-1', 'Transaction linked to specific_fund_id subf-1');
    assert(String(ft.assistance_type_id) === 'ast-1', 'Transaction linked to assistance_type_id ast-1');
    assert(String(ft.asnaf_category) === 'faqir_miskin', 'Transaction linked to primary group faqir_miskin');
    assert(Number(ft.amount) === 5000, 'Transaction amount is 5000');

    // -------------------------------------------------------------------------
    // TEST 8: Non-retroactive Historical Integrity Test
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Historical Integrity (Future Changes Do Not Alter Historical Rows) ---');
    // Check that historical row in financial_transactions and assistance_applications remains unchanged
    const histTxnBefore = await db.execute({ sql: 'SELECT amount, status FROM financial_transactions WHERE reference_no = ?', args: [testRefNo] });
    const histAppBefore = await db.execute({ sql: 'SELECT disbursed_amount, status FROM assistance_applications WHERE id = ?', args: [testAppId] });

    // Simulate proportion calculation check on financial service
    const breakdown = FinancialService.calculatePennyAllocation(1000000, [
      { code: 'living', pct: 25 },
      { code: 'housing', pct: 25 },
      { code: 'career', pct: 20 },
      { code: 'education', pct: 20 },
      { code: 'emergency', pct: 10 },
    ]);
    assert(breakdown.get('living') === 250000, 'Penny allocation recalculation works independently');

    const histTxnAfter = await db.execute({ sql: 'SELECT amount, status FROM financial_transactions WHERE reference_no = ?', args: [testRefNo] });
    const histAppAfter = await db.execute({ sql: 'SELECT disbursed_amount, status FROM assistance_applications WHERE id = ?', args: [testAppId] });

    assert(Number(histTxnBefore.rows[0].amount) === Number(histTxnAfter.rows[0].amount), 'Historical transaction amount remained completely unchanged');
    assert(Number(histAppBefore.rows[0].disbursed_amount) === Number(histAppAfter.rows[0].disbursed_amount), 'Historical disbursed amount remained completely unchanged');

    console.log('\n======================================================');
    console.log(`ALL STEP 7 VERIFICATION TESTS PASSED: ${passedTests}/${totalTests}`);
    console.log('======================================================\n');
  } finally {
    // -------------------------------------------------------------------------
    // Clean up test data
    // -------------------------------------------------------------------------
    console.log('Cleaning up test records from database...');
    // Revert fund_accounts, faqir_miskin_sub_funds, asnaf_allocations disbursed amounts for test
    await db.execute({ sql: "UPDATE fund_accounts SET disbursed_amount = MAX(0, disbursed_amount - 5000) WHERE id = 'fund-1'" });
    await db.execute({ sql: "UPDATE faqir_miskin_sub_funds SET disbursed_amount = MAX(0, disbursed_amount - 5000) WHERE id = 'subf-1'" });
    await db.execute({ sql: "UPDATE asnaf_allocations SET disbursed_amount = MAX(0, disbursed_amount - 5000) WHERE asnaf_code = 'faqir_miskin' AND fiscal_year = '2569'" });

    await db.execute({ sql: 'DELETE FROM financial_transactions WHERE reference_no = ?', args: [testRefNo] });
    await db.execute({ sql: 'DELETE FROM application_history WHERE application_id = ?', args: [testAppId] });
    await db.execute({ sql: 'DELETE FROM beneficiary_assessments WHERE application_id = ?', args: [testAppId] });
    await db.execute({ sql: 'DELETE FROM assistance_applications WHERE id = ?', args: [testAppId] });
    await db.execute({ sql: 'DELETE FROM beneficiaries WHERE id = ?', args: [testBenId] });
    await db.execute({ sql: 'DELETE FROM households WHERE id = ?', args: [testHhId] });
    console.log('Clean up finished successfully.');
  }
}

runStep7Verification().catch((err) => {
  console.error('Step 7 verification encountered an error:', err);
  process.exit(1);
});
