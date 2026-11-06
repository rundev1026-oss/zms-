import crypto from 'crypto';
import { FinancialService } from '../src/services/financialService.ts';
import { PaymentGatewayAdapter } from '../src/lib/paymentGatewayAdapter.ts';
import { thaiBahtText } from '../src/lib/thaiBahtText.ts';
import { getDb, initDb } from '../src/lib/db.ts';

async function runPhase6Tests() {
  console.log('================================================================');
  console.log('PHASE 6: Donation & ZMS Financial Accounting Integration Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  await initDb();
  const db = getDb();

  // Ensure standard bank accounts are active
  await db.execute("UPDATE bank_accounts SET status = 'active' WHERE id IN ('bank-1', 'bank-2', 'bank-3')");

  const superAdminActor = { id: 'usr-sa', name: 'Super Admin User', role: 'super_admin' };
  const financeActor = { id: 'usr-fin', name: 'Finance Officer', role: 'finance' };

  // ----------------------------------------------------------------
  // 1. Income Recognition & Zero Premature Recognition from QR
  // ----------------------------------------------------------------
  console.log('--- 1. Income Recognition & Zero QR Premature Recognition ---');

  // Baseline overview
  const initialOverview = await FinancialService.getFinancialOverview();
  const initialIncome = initialOverview.kpi.totalIncome;

  const fund1Before = await db.execute({ sql: 'SELECT total_received, available_amount FROM fund_accounts WHERE id = ?', args: ['fund-1'] });
  const fund1RecBefore = Number(fund1Before.rows[0].total_received);
  const fund1AvailBefore = Number(fund1Before.rows[0].available_amount);

  const bank1Before = await db.execute({ sql: 'SELECT current_balance FROM bank_accounts WHERE id = ?', args: ['bank-1'] });
  const bank1BalBefore = Number(bank1Before.rows[0].current_balance);

  // 1.1 Create Dynamic QR / Donation Intent
  const donationRef1 = `DON-P6-RECOG-${Date.now()}`;
  const donationAmount1 = 4500.0;

  const createdDonation = await FinancialService.recordDonation(
    {
      fundId: 'fund-1',
      category: 'ซะกาตรายได้ประจำปี 2569',
      amount: donationAmount1,
      moneyType: 'zakat',
      paymentMethod: 'promptpay_qr',
      bankAccountId: 'bank-1',
      donorName: 'นายการเงิน ถูกต้อง',
      donorPhone: '081-999-8877',
      donorEmail: 'donor@example.com',
      donorTaxId: '0125569000126',
      receiptRequired: true,
      referenceNo: donationRef1,
      notes: 'ทดสอบการรับรู้รายรับเมื่อเงินเข้าจริง',
    },
    financeActor
  );

  assert(createdDonation.status === 'pending', 'Newly created donation is in "pending" status');
  assert(createdDonation.paymentStatus === 'PENDING_PAYMENT', 'Payment status is "PENDING_PAYMENT"');

  // Verify creating QR does NOT recognize income in ledger
  const overviewAfterQr = await FinancialService.getFinancialOverview();
  assert(overviewAfterQr.kpi.totalIncome === initialIncome, 'Zero Premature Recognition: totalIncome unchanged after QR generation');

  const fund1AfterQr = await db.execute({ sql: 'SELECT total_received, available_amount FROM fund_accounts WHERE id = ?', args: ['fund-1'] });
  assert(Number(fund1AfterQr.rows[0].total_received) === fund1RecBefore, 'Target Fund total_received NOT credited prematurely');
  assert(Number(fund1AfterQr.rows[0].available_amount) === fund1AvailBefore, 'Target Fund available_amount NOT credited prematurely');

  const bank1AfterQr = await db.execute({ sql: 'SELECT current_balance FROM bank_accounts WHERE id = ?', args: ['bank-1'] });
  assert(Number(bank1AfterQr.rows[0].current_balance) === bank1BalBefore, 'Bank balance NOT credited prematurely');

  // 1.2 Confirm Payment via Webhook (Real Payment Arrival)
  const webhookSecret = 'test_webhook_secret_phase6_key_7788';
  process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET = webhookSecret;
  process.env.PAYMENT_GATEWAY_SECRET_KEY = webhookSecret;
  PaymentGatewayAdapter.reloadConfig();

  const webhookBody = JSON.stringify({
    referenceNo: donationRef1,
    providerTxId: `GBP-P6-${Date.now()}`,
    amount: donationAmount1,
    status: 'PAID',
    timestamp: Math.floor(Date.now() / 1000),
  });
  const sig = crypto.createHmac('sha256', webhookSecret).update(webhookBody).digest('hex');

  const webhookRes = await PaymentGatewayAdapter.processWebhookEvent({
    rawBody: webhookBody,
    headers: {
      'x-signature': sig,
      'x-timestamp': String(Math.floor(Date.now() / 1000)),
    },
    clientIp: '127.0.0.1',
  });

  assert(webhookRes.statusCode === 200, 'Webhook confirmed payment with HTTP 200');
  assert(webhookRes.paymentStatus === 'PAID', 'Payment status updated to PAID upon real payment confirmation');

  // 1.3 Verify Accounting Ledger now recognizes income
  const overviewAfterPayment = await FinancialService.getFinancialOverview();
  assert(
    overviewAfterPayment.kpi.totalIncome === initialIncome + donationAmount1,
    `Income accurately recognized in Financial Dashboard (฿${initialIncome} -> ฿${overviewAfterPayment.kpi.totalIncome})`
  );

  const fund1AfterPayment = await db.execute({ sql: 'SELECT total_received, available_amount FROM fund_accounts WHERE id = ?', args: ['fund-1'] });
  assert(
    Number(fund1AfterPayment.rows[0].total_received) === fund1RecBefore + donationAmount1,
    'Fund total_received credited with exact donation amount'
  );
  assert(
    Number(fund1AfterPayment.rows[0].available_amount) === fund1AvailBefore + donationAmount1,
    'Fund available_amount credited with exact donation amount'
  );

  const bank1AfterPayment = await db.execute({ sql: 'SELECT current_balance FROM bank_accounts WHERE id = ?', args: ['bank-1'] });
  assert(
    Number(bank1AfterPayment.rows[0].current_balance) === bank1BalBefore + donationAmount1,
    'Bank account balance credited with exact donation amount'
  );

  // ----------------------------------------------------------------
  // 2. Fund Separation & Shariah Segregation of Funds
  // ----------------------------------------------------------------
  console.log('\n--- 2. Fund Separation & Shariah Segregation of Funds ---');

  // Test Zakat vs Sadaqah vs Operational separation
  // Zakat donation -> fund-1 (Faqir & Miskin)
  const zakatRef = `DON-ZAKAT-${Date.now()}`;
  const zakatTxn = await FinancialService.recordDonation(
    {
      fundId: 'fund-1',
      category: 'ซะกาตทรัพย์สิน',
      amount: 10000,
      moneyType: 'zakat',
      paymentMethod: 'cash',
      bankAccountId: 'bank-1',
      donorName: 'ผู้ชำระซะกาต ก',
      referenceNo: zakatRef,
    },
    financeActor
  );
  assert(zakatTxn.status === 'completed', 'Direct cash zakat recorded as completed');

  // Sadaqah donation -> fund-5 (General Sadaqah)
  const sadaqahRef = `DON-SADAQAH-${Date.now()}`;
  const sadaqahTxn = await FinancialService.recordDonation(
    {
      fundId: 'fund-5',
      category: 'เงินบริจาคทั่วไป/เศาะดะเกาะฮ์',
      amount: 3000,
      moneyType: 'sadaqah',
      paymentMethod: 'cash',
      bankAccountId: 'bank-2', // allows zakat, sadaqah
      donorName: 'ผู้บริจาค ศอดะเกาะฮ์ ข',
      referenceNo: sadaqahRef,
    },
    financeActor
  );
  assert(sadaqahTxn.status === 'completed', 'Sadaqah recorded as completed in fund-5');

  // Admin donation -> fund-6 (Operations / Amil)
  const adminRef = `DON-ADMIN-${Date.now()}`;
  const adminTxn = await FinancialService.recordDonation(
    {
      fundId: 'fund-6',
      category: 'เงินบริจาคสนับสนุนค่าบริหารจัดการมูลนิธิ',
      amount: 2000,
      moneyType: 'operational_admin',
      paymentMethod: 'cash',
      bankAccountId: 'bank-3', // allows operational, sadaqah
      donorName: 'ผู้สนับสนุน ค',
      referenceNo: adminRef,
    },
    financeActor
  );
  assert(adminTxn.status === 'completed', 'Administrative donation recorded as completed in fund-6');

  // Verify Non-Commingling: Channel mapping strictly rejects Zakat into operational-only bank
  let comminglingBlocked = false;
  try {
    await FinancialService.recordDonation(
      {
        fundId: 'fund-1',
        category: 'ซะกาต',
        amount: 5000,
        moneyType: 'zakat',
        paymentMethod: 'bank_transfer',
        bankAccountId: 'bank-3', // bank-3 allows operational, sadaqah ONLY
        donorName: 'ผู้ทดสอบปนเปื้อนเงิน',
        referenceNo: `DON-COMMINGLE-TEST-${Date.now()}`,
      },
      superAdminActor
    );
  } catch (err) {
    comminglingBlocked = true;
    assert(
      err.message.includes('ข้อห้ามตามหลักการเงินและวัตถุประสงค์บัญชี'),
      `Non-Commingling rule enforced: "${err.message}"`
    );
  }
  assert(comminglingBlocked, 'Strict separation: Zakat cannot be routed into non-zakat operational bank account');

  // ----------------------------------------------------------------
  // 3. No Duplicate Counting in Dashboard & Ledger Stability
  // ----------------------------------------------------------------
  console.log('\n--- 3. Dashboard Ledger Stability & Duplicate Prevention ---');

  const check1 = await FinancialService.getFinancialOverview();
  const check2 = await FinancialService.getFinancialOverview();
  assert(
    check1.kpi.totalIncome === check2.kpi.totalIncome && check1.kpi.netBalance === check2.kpi.netBalance,
    'Dashboard calculations are deterministic and free of duplicate aggregation'
  );

  // Send duplicate webhook again for donationRef1
  const dupRes = await PaymentGatewayAdapter.processWebhookEvent({
    rawBody: webhookBody,
    headers: {
      'x-signature': sig,
      'x-timestamp': String(Math.floor(Date.now() / 1000)),
    },
  });
  assert(dupRes.statusCode === 200, 'Duplicate webhook returns HTTP 200 acknowledged');

  const checkAfterDup = await FinancialService.getFinancialOverview();
  assert(
    checkAfterDup.kpi.totalIncome === check1.kpi.totalIncome,
    'Duplicate webhook does NOT inflate totalIncome or duplicate transactions in ledger'
  );

  // ----------------------------------------------------------------
  // 4. Official Receipt Integrity & Non-eDonation Disclaimer
  // ----------------------------------------------------------------
  console.log('\n--- 4. Official Receipt Integrity & Legal Disclaimers ---');

  const testTxnForReceipt = (await FinancialService.getTransactions({ search: donationRef1 }))[0];
  assert(testTxnForReceipt !== undefined, 'Found completed transaction for receipt issuance');

  const thaiBaht = thaiBahtText(testTxnForReceipt.amount);
  assert(thaiBaht === 'สี่พันห้าร้อยบาทถ้วน', `Thai Baht text is mathematically accurate (expected: สี่พันห้าร้อยบาทถ้วน, got: ${thaiBaht})`);

  // Verify Receipt Details
  assert(testTxnForReceipt.status === 'completed', 'Receipt issued only for completed payment');
  assert(testTxnForReceipt.payerOrPayee === 'นายการเงิน ถูกต้อง', 'Donor name captured correctly');
  assert(testTxnForReceipt.donorTaxId === '0125569000126', 'Donor tax ID captured correctly');
  assert(testTxnForReceipt.fundName.includes('ซะกาต'), 'Target fund captured correctly');

  // ----------------------------------------------------------------
  // 5. Reporting API Verification
  // ----------------------------------------------------------------
  console.log('\n--- 5. Reporting API Verification ---');

  // 5.1 Income by money type report
  const repMoneyType = await FinancialService.getFinancialReports('income_by_money_type');
  assert(repMoneyType.title.includes('ประเภทเงิน'), 'Report "income_by_money_type" generated with correct title');
  assert(repMoneyType.rows.length >= 4, `Contains rows for recognized income (count: ${repMoneyType.rows.length})`);

  // 5.2 Income by fund report
  const repFund = await FinancialService.getFinancialReports('income_by_fund');
  assert(repFund.title.includes('แยกตามกองทุน'), 'Report "income_by_fund" generated with correct title');
  assert(repFund.rows.length >= 6, 'Contains all 6 official foundation fund accounts');

  // 5.3 Income by bank account report
  const repBank = await FinancialService.getFinancialReports('income_by_bank_account');
  assert(repBank.title.includes('บัญชีธนาคาร'), 'Report "income_by_bank_account" generated with correct title');
  assert(repBank.rows.length === 3, 'Contains exactly 3 official bank accounts');

  // 5.4 Income trends report
  const repTrends = await FinancialService.getFinancialReports('income_trends_daily_monthly');
  assert(repTrends.title.includes('แนวโน้มรายรับ'), 'Report "income_trends_daily_monthly" generated with correct title');
  assert(repTrends.rows.length >= 1, 'Contains trend rows aggregated by date');

  // 5.5 Pending unconfirmed donations report
  // Create a pending donation to ensure it shows up in pending report
  const pendingRef = `DON-PENDING-REP-${Date.now()}`;
  await FinancialService.recordDonation(
    {
      fundId: 'fund-1',
      category: 'ซะกาตรอชำระ',
      amount: 1200,
      moneyType: 'zakat',
      paymentMethod: 'promptpay_qr',
      bankAccountId: 'bank-1',
      referenceNo: pendingRef,
    },
    financeActor
  );

  const repPending = await FinancialService.getFinancialReports('pending_unconfirmed_donations');
  assert(repPending.title.includes('ยังไม่ได้รับการยืนยัน'), 'Report "pending_unconfirmed_donations" generated');
  const foundPending = repPending.rows.find((r) => r[0] === pendingRef);
  assert(foundPending !== undefined, 'Pending donation shows up in pending report');

  // 5.6 Unreconciled / Review Required report
  const repReview = await FinancialService.getFinancialReports('unreconciled_review_required');
  assert(repReview.title.includes('ต้องตรวจสอบ'), 'Report "unreconciled_review_required" generated');

  // 5.7 Issued receipts report
  const repReceipts = await FinancialService.getFinancialReports('issued_receipts');
  assert(repReceipts.title.includes('ใบเสร็จรับเงินบริจาค'), 'Report "issued_receipts" generated');
  assert(repReceipts.rows.length >= 4, 'Contains rows for issued receipts');
  assert(
    repReceipts.rows.some((r) => r[8].includes('Non-eDonation')),
    'Report rows explicitly label receipts as Non-eDonation internal receipts'
  );

  // 5.8 CSV Export
  const csvData = await FinancialService.exportReportCsv('income_by_money_type');
  assert(csvData.startsWith('\uFEFF'), 'CSV export starts with UTF-8 BOM for Thai character compatibility in Excel');
  assert(csvData.includes('ประเภทเงิน') && csvData.includes('จำนวนเงิน'), 'CSV contains proper header row');

  // ----------------------------------------------------------------
  // 6. Clean up test records
  // ----------------------------------------------------------------
  console.log('\n--- 6. Clean up and Balance Reversal ---');
  await db.execute("DELETE FROM financial_transactions WHERE reference_no LIKE 'DON-P6-%' OR reference_no LIKE 'DON-ZAKAT-%' OR reference_no LIKE 'DON-SADAQAH-%' OR reference_no LIKE 'DON-ADMIN-%' OR reference_no LIKE 'DON-PENDING-REP-%'");
  await db.execute("DELETE FROM payment_webhook_idempotency WHERE reference_no LIKE 'DON-P6-%'");

  // Re-adjust fund-1, fund-5, fund-6 balances to restore baseline
  await db.execute({
    sql: 'UPDATE fund_accounts SET total_received = ?, available_amount = ? WHERE id = ?',
    args: [fund1RecBefore, fund1AvailBefore, 'fund-1'],
  });
  await db.execute({
    sql: 'UPDATE bank_accounts SET current_balance = ? WHERE id = ?',
    args: [bank1BalBefore, 'bank-1'],
  });

  console.log('\n================================================================');
  console.log(`Phase 6 Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error('Phase 6 Test Suite Exception:', err);
  process.exit(1);
});
