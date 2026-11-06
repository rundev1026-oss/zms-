import { getDb, initDb } from '../src/lib/db.ts';
import { FinancialService } from '../src/services/financialService.ts';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runDisbursementAndReconciliationTestSuite() {
  console.log('\n===============================================================');
  console.log(' ZMS PHASE 7: DISBURSEMENT & BANK RECONCILIATION TEST SUITE');
  console.log('===============================================================\n');

  await initDb();
  const db = getDb();

  // Ensure test bank account exists and is funded
  await db.execute("UPDATE bank_accounts SET status = 'active' WHERE id IN ('bank-1', 'bank-2', 'bank-3')");
  await db.execute("UPDATE bank_accounts SET current_balance = 500000 WHERE id = 'bank-1'");
  await db.execute("UPDATE fund_accounts SET available_amount = 500000 WHERE id = 'fund-1'");

  // Create test actors
  const officerActor = { id: 'usr-officer-ph7', name: 'นายเจ้าหน้าที่ ตรวจสอบ', role: 'officer' };
  const financeActor = { id: 'usr-finance-ph7', name: 'นางสาวการเงิน อนุมัติ', role: 'finance' };
  const executiveActor = { id: 'usr-exec-ph7', name: 'ดร.ผู้บริหาร สูงสุด', role: 'executive' };
  const superAdminActor = { id: 'usr-admin-ph7', name: 'ซูเปอร์ แอดมิน', role: 'super_admin' };

  // Setup test beneficiary and approved application
  const testBeneficiaryId = `ben-p7-${Date.now()}`;
  const testAppId = `app-p7-${Date.now()}`;
  const testAppNo = `APP-2569-${Date.now().toString().slice(-4)}`;

  const testHouseId = `house-p7-${Date.now()}`;
  await db.execute({
    sql: `INSERT INTO households (id, household_no, address, province, district, community) VALUES (?, ?, '123/45 กทม.', 'กรุงเทพมหานคร', 'บางรัก', 'ชุมชนทดสอบ')`,
    args: [testHouseId, `HH-${Date.now().toString().slice(-6)}`],
  });

  const testNationalId = '110' + Date.now().toString().slice(-10);
  await db.execute({
    sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category)
          VALUES (?, ?, 'นายสมชาย ผู้ยากไร้ทดสอบ', ?, '0819998877', 'fakir')`,
    args: [testBeneficiaryId, testHouseId, testNationalId],
  });

  async function createTestApp(id, appNo, benId, asnaf, reqAmt, appAmt) {
    await db.execute({
      sql: `INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, assistance_type, requested_amount, approved_amount,
        disbursed_amount, status, assigned_officer_id, assigned_officer_name, applied_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'เงินสงเคราะห์เพื่อการยังชีพ', ?, ?, 0, 'approved', 'usr-officer-ph7', 'เจ้าหน้าที่ทดสอบ', '2569-11-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [id, appNo, benId, asnaf, reqAmt, appAmt],
    });
  }

  await createTestApp(testAppId, testAppNo, testBeneficiaryId, 'fakir', 15000, 15000);

  // -------------------------------------------------------------
  // TEST GROUP 1: Disbursement Source & Voucher Creation
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: Disbursement Source & Voucher Creation ---');

  const voucher1 = await FinancialService.createPaymentVoucher(
    {
      applicationId: testAppId,
      amount: 15000,
      fundId: 'fund-1',
      bankAccountId: 'bank-1',
      paymentMethod: 'bank_transfer',
      recipientBankName: 'ธนาคารกรุงไทย',
      recipientAccountNumber: '123-4-56789-0',
      recipientAccountName: 'นายสมชาย ผู้ยากไร้ทดสอบ',
      notes: 'จ่ายเงินสงเคราะห์งวดที่ 1',
    },
    officerActor
  );

  assert(voucher1.id && voucher1.voucherNo.startsWith('VOU-DISB-2569-'), 'Voucher generated with standard numbering');
  assert(voucher1.applicationId === testAppId, 'Voucher correctly references assistance application ID');
  assert(voucher1.beneficiaryName === 'นายสมชาย ผู้ยากไร้ทดสอบ', 'Voucher references correct beneficiary name');
  assert(voucher1.amount === 15000, 'Voucher amount matches requested disbursement amount');
  assert(voucher1.status === 'pending_approval', 'Initial voucher status is pending_approval');
  assert(voucher1.createdById === officerActor.id, 'Creator ID matches recording actor');

  // -------------------------------------------------------------
  // TEST GROUP 2: Anti-Duplicate Controls (Prevent Double Disbursement)
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Anti-Duplicate Controls ---');

  let duplicateBlocked = false;
  try {
    await FinancialService.createPaymentVoucher(
      {
        applicationId: testAppId,
        amount: 15000,
        paymentMethod: 'bank_transfer',
      },
      officerActor
    );
  } catch (err) {
    duplicateBlocked = err.message.includes('มีใบสำคัญจ่าย');
  }
  assert(duplicateBlocked, 'Blocked duplicate payment voucher creation while previous voucher is active');

  // -------------------------------------------------------------
  // TEST GROUP 3: Budget & Over-Payment Protection
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Budget & Over-Payment Protection ---');

  const testAppId2 = `app-p7-budget-${Date.now()}`;
  await createTestApp(testAppId2, `APP-BUDGET-${Date.now()}`, testBeneficiaryId, 'fakir', 10000, 10000);

  let overBudgetBlocked = false;
  try {
    await FinancialService.createPaymentVoucher(
      {
        applicationId: testAppId2,
        amount: 25000, // Approved is only 10,000!
        paymentMethod: 'bank_transfer',
      },
      officerActor
    );
  } catch (err) {
    overBudgetBlocked = err.message.includes('เกินกว่ายอดที่ได้รับการอนุมัติ');
  }
  assert(overBudgetBlocked, 'Blocked disbursement amount exceeding approved assistance amount');

  // -------------------------------------------------------------
  // TEST GROUP 4: Server-Side Balance Checks (Fund & Bank Account)
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Server-Side Balance Validation ---');

  // Test Fund balance check
  const brokeFundId = `fund-broke-${Date.now()}`;
  await db.execute({
    sql: `INSERT INTO fund_accounts (id, code, name, category, description, total_received, committed_amount, disbursed_amount, available_amount)
          VALUES (?, ?, 'กองทุนงบหมด', 'zakat', 'กองทุนสำหรับทดสอบงบประมาณไม่พอ', 1000, 0, 1000, 500)`,
    args: [brokeFundId, `BROKE-${Date.now().toString().slice(-6)}`],
  });

  let fundDeficitBlocked = false;
  try {
    await FinancialService.createPaymentVoucher(
      {
        applicationId: testAppId2,
        amount: 5000, // Available in fund is only 500!
        fundId: brokeFundId,
        paymentMethod: 'cash',
      },
      officerActor
    );
  } catch (err) {
    fundDeficitBlocked = err.message.includes('ยอดเงินคงเหลือในกองทุน');
  }
  assert(fundDeficitBlocked, 'Blocked voucher creation exceeding available Fund balance');

  // -------------------------------------------------------------
  // TEST GROUP 5: Segregation of Duties (SoD) & Approval Limits
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Segregation of Duties & Approval Limits ---');

  // SoD Violation: Creator tries to approve their own voucher
  let sodBlocked = false;
  try {
    await FinancialService.approvePaymentVoucher(
      { voucherId: voucher1.id, action: 'approve' },
      officerActor // officerActor created it!
    );
  } catch (err) {
    sodBlocked = err.message.includes('Segregation of Duties');
  }
  assert(sodBlocked, 'Segregation of Duties enforced: Creator cannot approve their own payment voucher');

  // Officer Limit Check: Officer limit is <= 5,000 THB; voucher1 is 15,000 THB
  const diffOfficerActor = { id: 'usr-officer-2', name: 'นายเจ้าหน้าที่ อีกท่าน', role: 'officer' };
  let officerLimitBlocked = false;
  try {
    await FinancialService.approvePaymentVoucher(
      { voucherId: voucher1.id, action: 'approve' },
      diffOfficerActor
    );
  } catch (err) {
    officerLimitBlocked = err.message.includes('เกินสิทธิ์อนุมัติของเจ้าหน้าที่');
  }
  assert(officerLimitBlocked, 'Enforced officer approval threshold (limited to <= 5,000 THB)');

  // Finance Approval: 15,000 THB is <= 50,000 THB limit -> SUCCESS
  const approveRes = await FinancialService.approvePaymentVoucher(
    { voucherId: voucher1.id, action: 'approve', notes: 'อนุมัติตามเอกสารหลักฐานครบถ้วน' },
    financeActor
  );
  assert(approveRes.success && approveRes.status === 'approved', 'Finance role successfully approves voucher within 50,000 THB limit');

  // High Value Voucher (> 50,000 THB) Requires Executive
  const testAppHighId = `app-p7-high-${Date.now()}`;
  await createTestApp(testAppHighId, `APP-HIGH-${Date.now()}`, testBeneficiaryId, 'gharimin', 80000, 80000);

  const voucherHigh = await FinancialService.createPaymentVoucher(
    {
      applicationId: testAppHighId,
      amount: 80000,
      fundId: 'fund-1',
      bankAccountId: 'bank-1',
      paymentMethod: 'bank_transfer',
    },
    officerActor
  );

  let financeOverLimitBlocked = false;
  try {
    await FinancialService.approvePaymentVoucher(
      { voucherId: voucherHigh.id, action: 'approve' },
      financeActor
    );
  } catch (err) {
    financeOverLimitBlocked = err.message.includes('เกินสิทธิ์อนุมัติของฝ่ายการเงิน');
  }
  assert(financeOverLimitBlocked, 'Finance role blocked from approving vouchers > 50,000 THB');

  // Executive Approves High Value Voucher -> SUCCESS
  const execApproveRes = await FinancialService.approvePaymentVoucher(
    { voucherId: voucherHigh.id, action: 'approve', notes: 'ผู้บริหารอนุมัติเคสพิเศษปลดหนี้สิน' },
    executiveActor
  );
  assert(execApproveRes.success && execApproveRes.status === 'approved', 'Executive role successfully approves vouchers > 50,000 THB');

  // -------------------------------------------------------------
  // TEST GROUP 6: Payment Execution & Financial Ledger Posting
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Payment Execution & Financial Ledger Posting ---');

  // Fetch balances before execution
  const bankBeforeRes = await db.execute("SELECT current_balance FROM bank_accounts WHERE id = 'bank-1'");
  const fundBeforeRes = await db.execute("SELECT available_amount, disbursed_amount FROM fund_accounts WHERE id = 'fund-1'");
  const bankBalBefore = Number(bankBeforeRes.rows[0].current_balance);
  const fundAvailBefore = Number(fundBeforeRes.rows[0].available_amount);
  const fundDisbBefore = Number(fundBeforeRes.rows[0].disbursed_amount);

  // Execute disbursement
  const execResult = await FinancialService.executePaymentDisbursement(
    {
      voucherId: voucher1.id,
      proofUrl: '/proofs/slip-disb-p7-001.pdf',
      proofName: 'slip-disb-p7-001.pdf',
      notes: 'โอนสำเร็จผ่าน KTB Corporate Banking',
    },
    financeActor
  );

  assert(execResult.success && execResult.status === 'disbursed', 'Disbursement executed successfully');
  assert(execResult.transactionNo.startsWith('TXN-DISB-2569-'), 'Generated financial ledger transaction number');

  // Verify balances after execution
  const bankAfterRes = await db.execute("SELECT current_balance FROM bank_accounts WHERE id = 'bank-1'");
  const fundAfterRes = await db.execute("SELECT available_amount, disbursed_amount FROM fund_accounts WHERE id = 'fund-1'");
  const bankBalAfter = Number(bankAfterRes.rows[0].current_balance);
  const fundAvailAfter = Number(fundAfterRes.rows[0].available_amount);
  const fundDisbAfter = Number(fundAfterRes.rows[0].disbursed_amount);

  assert(bankBalAfter === bankBalBefore - 15000, 'Bank account balance deducted by exact disbursement amount');
  assert(fundAvailAfter === fundAvailBefore - 15000, 'Fund available amount deducted by exact disbursement amount');
  assert(fundDisbAfter === fundDisbBefore + 15000, 'Fund disbursed amount increased by exact disbursement amount');

  // Verify application status updated to disbursed
  const appCheck = await db.execute({
    sql: 'SELECT status, disbursed_amount, disbursement_ref FROM assistance_applications WHERE id = ?',
    args: [testAppId],
  });
  assert(appCheck.rows[0].status === 'disbursed', 'Assistance application status transitioned to "disbursed"');
  assert(Number(appCheck.rows[0].disbursed_amount) === 15000, 'Application disbursed_amount recorded correctly');
  assert(appCheck.rows[0].disbursement_ref === voucher1.voucherNo, 'Application disbursement_ref records voucher number');

  // Verify financial ledger record
  const txnCheck = await db.execute({
    sql: 'SELECT * FROM financial_transactions WHERE reference_no = ?',
    args: [voucher1.voucherNo],
  });
  assert(txnCheck.rows.length > 0, 'Posted disbursement entry to financial_transactions ledger');
  assert(Number(txnCheck.rows[0].amount) === -15000, 'Disbursement amount is recorded as negative in ledger');
  assert(txnCheck.rows[0].status === 'completed', 'Transaction ledger status is completed');
  assert(txnCheck.rows[0].payment_status === 'PAID', 'Payment status is marked PAID');

  // -------------------------------------------------------------
  // TEST GROUP 7: Cash and Cheque Payment Methods
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Cash and Cheque Payment Methods ---');

  // Cash Voucher
  const testAppCashId = `app-p7-cash-${Date.now()}`;
  await createTestApp(testAppCashId, `APP-CASH-${Date.now()}`, testBeneficiaryId, 'fakir', 3000, 3000);

  const cashVoucher = await FinancialService.createPaymentVoucher(
    {
      applicationId: testAppCashId,
      amount: 3000,
      fundId: 'fund-1',
      paymentMethod: 'cash',
      cashReceiverName: 'นายสมชาย ผู้ยากไร้ทดสอบ',
      cashReceiverPosition: 'ผู้รับเงินสงเคราะห์โดยตรง',
    },
    officerActor
  );

  assert(cashVoucher.paymentMethod === 'cash', 'Cash payment voucher created successfully');
  await FinancialService.approvePaymentVoucher({ voucherId: cashVoucher.id, action: 'approve' }, financeActor);
  const cashExec = await FinancialService.executePaymentDisbursement(
    { voucherId: cashVoucher.id, proofUrl: '/proofs/cash-receipt-p7.pdf', notes: 'จ่ายเงินสดพร้อมเซ็นรับ' },
    financeActor
  );
  assert(cashExec.success && cashExec.status === 'disbursed', 'Cash disbursement executed successfully');

  // Cheque Voucher
  const testAppChequeId = `app-p7-cheque-${Date.now()}`;
  await createTestApp(testAppChequeId, `APP-CHEQUE-${Date.now()}`, testBeneficiaryId, 'fisabilillah', 5000, 5000);

  const chequeVoucher = await FinancialService.createPaymentVoucher(
    {
      applicationId: testAppChequeId,
      amount: 5000,
      fundId: 'fund-1',
      bankAccountId: 'bank-1',
      paymentMethod: 'cheque',
      chequeNumber: 'CHQ-987654',
      chequeDate: '2569-11-06',
    },
    officerActor
  );
  assert(chequeVoucher.paymentMethod === 'cheque' && chequeVoucher.chequeNumber === 'CHQ-987654', 'Cheque payment voucher created with cheque details');

  // -------------------------------------------------------------
  // TEST GROUP 8: Cancellation & Integrity Safeguards
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Cancellation & Integrity Safeguards ---');

  // Cancel non-disbursed voucher -> SUCCESS
  const cancelRes = await FinancialService.cancelPaymentVoucher(
    chequeVoucher.id,
    'ผู้รับขอยกเลิกและเปลี่ยนเป็นโอนเงินธนาคารแทน',
    officerActor
  );
  assert(cancelRes.success && cancelRes.status === 'cancelled', 'Cancelled pending cheque voucher successfully');

  // Try to cancel already disbursed voucher -> MUST FAIL
  let cancelDisbursedBlocked = false;
  try {
    await FinancialService.cancelPaymentVoucher(
      voucher1.id,
      'ต้องการยกเลิกรายการที่โอนเงินไปแล้ว',
      superAdminActor
    );
  } catch (err) {
    cancelDisbursedBlocked = err.message.includes('ไม่สามารถยกเลิกใบสำคัญจ่ายที่โอนเงินจริงแล้วได้');
  }
  assert(cancelDisbursedBlocked, 'Blocked cancelling already disbursed voucher (mandates reversal/refund protocol)');

  // -------------------------------------------------------------
  // TEST GROUP 9: Comprehensive Bank Reconciliation Engine
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Comprehensive Bank Reconciliation Engine ---');

  // Get current book balance of bank-1
  const b1Res = await db.execute("SELECT current_balance FROM bank_accounts WHERE id = 'bank-1'");
  const currentBankBal = Number(b1Res.rows[0].current_balance);

  // Case 1: Balanced with In-Transit & Outstanding adjustments
  // Formula: Statement (480,000) + InTransit (10,000) - Outstanding (5,000) = 485,000
  // System Balance: 485,200 - BankFees (200) = 485,000
  // Difference = 0 -> Balanced!
  const statementBal = currentBankBal - 200 - 10000 + 5000;
  const recBalanced = await FinancialService.reconcileBankAccount(
    {
      bankAccountId: 'bank-1',
      reconciliationDate: '2569-10-31',
      statementBalance: statementBal,
      depositsInTransit: 10000,
      outstandingChecks: 5000,
      bankFees: 200,
      notes: 'กระทบยอดประจำเดือนตุลาคม 2569 พร้อมปรับปรุงค่าธรรมเนียมและเช็คค้างจ่าย',
      proofUrl: '/reconcile/statement-oct-2569.pdf',
    },
    financeActor
  );

  assert(recBalanced.status === 'balanced', 'Reconciliation engine accurately resolved balanced state with adjustments');
  assert(recBalanced.difference === 0, 'Calculated adjusted difference is exactly 0.00 THB');
  assert(recBalanced.bankFees === 200, 'Bank fees correctly captured in reconciliation');

  // Case 2: Discrepancy detection
  const recDiscrepancy = await FinancialService.reconcileBankAccount(
    {
      bankAccountId: 'bank-1',
      reconciliationDate: '2569-10-31',
      statementBalance: currentBankBal - 50000, // Deliberate mismatch
      depositsInTransit: 0,
      outstandingChecks: 0,
      bankFees: 0,
      notes: 'ตรวจพบยอดต่าง 50,000 บาท',
    },
    financeActor
  );

  assert(recDiscrepancy.status === 'discrepancy', 'Reconciliation engine correctly flags discrepancies');
  assert(recDiscrepancy.difference !== 0, 'Discrepancy difference matches variance');

  // -------------------------------------------------------------
  // TEST GROUP 10: 6 Financial & Disbursement Reporting Dimensions
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 10: 6 Financial & Disbursement Reporting Dimensions ---');

  const repAsnaf = await FinancialService.getFinancialReports('disbursements_by_asnaf');
  assert(repAsnaf.title.includes('8 อัสนัฟ') && repAsnaf.rows.length > 0, 'Report 1: disbursements_by_asnaf generated');

  const repFund = await FinancialService.getFinancialReports('disbursements_by_fund');
  assert(repFund.title.includes('กองทุน') && repFund.rows.length > 0, 'Report 2: disbursements_by_fund generated');

  const repBen = await FinancialService.getFinancialReports('disbursements_by_beneficiary');
  assert(repBen.title.includes('รายบุคคล') && repBen.rows.length > 0, 'Report 3: disbursements_by_beneficiary generated');

  const repBranch = await FinancialService.getFinancialReports('disbursements_by_branch');
  assert(repBranch.title.includes('สาขา') && repBranch.rows.length > 0, 'Report 4: disbursements_by_branch generated');

  const repVouchers = await FinancialService.getFinancialReports('payment_vouchers_register');
  assert(repVouchers.title.includes('ทะเบียนคุมใบสำคัญจ่าย') && repVouchers.rows.length > 0, 'Report 5: payment_vouchers_register generated');

  const repBankRec = await FinancialService.getFinancialReports('bank_reconciliation_statement');
  assert(repBankRec.title.includes('งบพิสูจน์ยอดเงินฝากธนาคาร') && repBankRec.rows.length > 0, 'Report 6: bank_reconciliation_statement generated');

  const csvExport = await FinancialService.exportReportCsv('payment_vouchers_register');
  assert(csvExport.startsWith('\uFEFF') && csvExport.includes('เลขที่ใบสำคัญจ่าย'), 'CSV export generates BOM and headers properly');

  // Clean up temporary test data
  await db.execute("DELETE FROM fund_accounts WHERE id LIKE 'fund-broke-%'");

  console.log('\n===============================================================');
  console.log(` PHASE 7 ALL TESTS PASSED! (${passedTests}/${totalTests})`);
  console.log('===============================================================\n');
}

runDisbursementAndReconciliationTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err);
  process.exit(1);
});
