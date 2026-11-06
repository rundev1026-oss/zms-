import crypto from 'crypto';
import {
  PaymentGatewayAdapter,
  canTransitionPaymentStatus,
  assertPaymentStatusTransition,
  VALID_PAYMENT_STATUS_TRANSITIONS
} from '../src/lib/paymentGatewayAdapter.ts';
import { getDb, initDb } from '../src/lib/db.ts';

async function runPhase5Tests() {
  console.log('================================================================');
  console.log('PHASE 5: Real Payment Gateway & Financial Reconciliation Test Suite');
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

  // ----------------------------------------------------------------
  // 1. Provider Selection Registry & Comparison Matrix
  // ----------------------------------------------------------------
  console.log('--- 1. Provider Selection Registry & Comparison Matrix ---');
  const matrix = PaymentGatewayAdapter.getProviderComparisonMatrix();
  assert(matrix.length >= 6, 'Matrix has at least 6 providers/banks listed', `Found: ${matrix.length}`);

  const gb = matrix.find((p) => p.provider === 'gbprimepay');
  assert(Boolean(gb && gb.supportsDynamicQrPromptPay && gb.supportsRealtimeWebhook), 'GB Prime Pay supports Dynamic PromptPay and Webhook');
  assert(Boolean(gb?.nonProfitRequirements.some((r) => r.includes('ม.น.3') || r.includes('ภ.ง.ด.55'))), 'GB Prime Pay lists foundation registration and tax compliance requirements');

  const ibank = matrix.find((p) => p.provider === 'ibank_direct');
  assert(Boolean(ibank && !ibank.supportsRealtimeWebhook), 'iBank explicitly noted as NOT offering open public developer real-time Webhook');
  assert(Boolean(ibank?.notes.includes('ยังไม่มี Open Developer API')), 'iBank notes clarify that foundation bank account alone does not imply open API');

  const ktb = matrix.find((p) => p.provider === 'ktb_direct');
  assert(Boolean(ktb && !ktb.supportsRealtimeWebhook), 'Krungthai Bank explicitly noted as requiring enterprise Corporate Host-to-Host');

  // ----------------------------------------------------------------
  // 2. Payment Status State Machine
  // ----------------------------------------------------------------
  console.log('\n--- 2. Payment Status State Machine ---');
  const allStatuses = Object.keys(VALID_PAYMENT_STATUS_TRANSITIONS);
  assert(allStatuses.length === 9, 'Exactly 9 canonical payment statuses defined', `Count: ${allStatuses.length}`);

  // Valid transitions
  assert(canTransitionPaymentStatus('PENDING_PAYMENT', 'PROCESSING'), 'Valid: PENDING_PAYMENT -> PROCESSING');
  assert(canTransitionPaymentStatus('PENDING_PAYMENT', 'PAID'), 'Valid: PENDING_PAYMENT -> PAID');
  assert(canTransitionPaymentStatus('PENDING_PAYMENT', 'FAILED'), 'Valid: PENDING_PAYMENT -> FAILED');
  assert(canTransitionPaymentStatus('PENDING_PAYMENT', 'EXPIRED'), 'Valid: PENDING_PAYMENT -> EXPIRED');
  assert(canTransitionPaymentStatus('PENDING_PAYMENT', 'CANCELLED'), 'Valid: PENDING_PAYMENT -> CANCELLED');
  assert(canTransitionPaymentStatus('PENDING_PAYMENT', 'REVIEW_REQUIRED'), 'Valid: PENDING_PAYMENT -> REVIEW_REQUIRED');
  assert(canTransitionPaymentStatus('PROCESSING', 'PAID'), 'Valid: PROCESSING -> PAID');
  assert(canTransitionPaymentStatus('PAID', 'REFUND_PENDING'), 'Valid: PAID -> REFUND_PENDING');
  assert(canTransitionPaymentStatus('REFUND_PENDING', 'REFUNDED'), 'Valid: REFUND_PENDING -> REFUNDED');
  assert(canTransitionPaymentStatus('REVIEW_REQUIRED', 'PAID'), 'Valid: REVIEW_REQUIRED -> PAID');

  // Invalid transitions (Strictly Forbidden)
  assert(!canTransitionPaymentStatus('FAILED', 'PAID'), 'Forbidden: FAILED -> PAID');
  assert(!canTransitionPaymentStatus('EXPIRED', 'PAID'), 'Forbidden: EXPIRED -> PAID');
  assert(!canTransitionPaymentStatus('CANCELLED', 'PAID'), 'Forbidden: CANCELLED -> PAID');
  assert(!canTransitionPaymentStatus('REFUNDED', 'PAID'), 'Forbidden: REFUNDED -> PAID');
  assert(!canTransitionPaymentStatus('PAID', 'PROCESSING'), 'Forbidden: PAID -> PROCESSING');

  let assertThrew = false;
  try {
    assertPaymentStatusTransition('REFUNDED', 'PAID');
  } catch {
    assertThrew = true;
  }
  assert(assertThrew, 'assertPaymentStatusTransition throws error on invalid transition');

  // ----------------------------------------------------------------
  // 3. Webhook Signature Verification (HMAC-SHA256 Timing-Safe)
  // ----------------------------------------------------------------
  console.log('\n--- 3. Webhook HMAC-SHA256 Signature Verification ---');
  const testSecret = 'whsec_prod_zms_test_key_998877';
  const testBody = JSON.stringify({ referenceNo: 'TEST-SIG-01', amount: 1500 });
  const validSig = crypto.createHmac('sha256', testSecret).update(testBody).digest('hex');

  assert(
    PaymentGatewayAdapter.verifyWebhookSignature(testBody, validSig, testSecret),
    'Valid HMAC signature verifies successfully'
  );
  assert(
    PaymentGatewayAdapter.verifyWebhookSignature(testBody, `sha256=${validSig}`, testSecret),
    'Valid HMAC signature with "sha256=" prefix verifies successfully'
  );
  assert(
    !PaymentGatewayAdapter.verifyWebhookSignature(testBody, 'tampered_signature_1234567890abcdef', testSecret),
    'Tampered signature rejected'
  );
  assert(
    !PaymentGatewayAdapter.verifyWebhookSignature(testBody + ' ', validSig, testSecret),
    'Modified payload with same signature rejected'
  );
  assert(
    !PaymentGatewayAdapter.verifyWebhookSignature(testBody, null, testSecret),
    'Missing signature rejected'
  );

  // ----------------------------------------------------------------
  // 4. Webhook Replay Attack Protection (Timestamp Skew)
  // ----------------------------------------------------------------
  console.log('\n--- 4. Webhook Replay Attack Protection ---');
  const nowMs = Date.now();
  const freshTimestamp = Math.floor(nowMs / 1000);
  const timeCheckFresh = PaymentGatewayAdapter.verifyWebhookTimestamp(freshTimestamp, 300);
  assert(timeCheckFresh.valid && timeCheckFresh.skewSeconds <= 5, 'Fresh timestamp within 300s accepted', `Skew: ${timeCheckFresh.skewSeconds}s`);

  const staleTimestamp = Math.floor((nowMs - 600 * 1000) / 1000); // 10 minutes ago
  const timeCheckStale = PaymentGatewayAdapter.verifyWebhookTimestamp(staleTimestamp, 300);
  assert(!timeCheckStale.valid, 'Stale timestamp (> 300s drift) rejected to defeat Replay Attacks');
  assert(Boolean(timeCheckStale.error?.includes('Replay Attack Protection')), 'Error message specifies Replay Attack Protection');

  // ----------------------------------------------------------------
  // 5. End-to-End Valid Webhook Processing
  // ----------------------------------------------------------------
  console.log('\n--- 5. End-to-End Valid Webhook Processing ---');
  // Configure test credentials
  process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET = testSecret;
  process.env.PAYMENT_GATEWAY_MERCHANT_ID = 'TEST_MERCHANT_01';
  process.env.PAYMENT_GATEWAY_SECRET_KEY = testSecret;
  PaymentGatewayAdapter.reloadConfig();

  // Create a pending donation transaction in DB
  const testRef1 = `DON-E2E-TEST-${Date.now()}`;
  const testTxnId1 = `txn-e2e-${Date.now()}`;
  const testAmount1 = 2500.0;
  const targetFundId = 'fund-1';
  const targetBankId = 'bank-1';

  // Record initial balances
  const initialFund = await db.execute({ sql: 'SELECT total_received, available_amount FROM fund_accounts WHERE id = ?', args: [targetFundId] });
  const initialFundRec = Number(initialFund.rows[0].total_received);
  const initialFundAvail = Number(initialFund.rows[0].available_amount);

  const initialBank = await db.execute({ sql: 'SELECT current_balance FROM bank_accounts WHERE id = ?', args: [targetBankId] });
  const initialBankBal = Number(initialBank.rows[0].current_balance);

  await db.execute({
    sql: `INSERT INTO financial_transactions (
      id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
      payer_or_payee, reference_no, status, payment_status, bank_account_id, recorded_by_id, recorded_by_name
    ) VALUES (?, ?, '06 พ.ย. 2569 12:00', 'income', ?, 'กองทุนซะกาตผู้ยากไร้และขัดสน', 'ซะกาตทั่วไป', ?, 'promptpay_qr', 'คุณทดสอบ ระบบจริง', ?, 'pending', 'PENDING_PAYMENT', ?, 'u-1', 'Admin')`,
    args: [testTxnId1, `TXN-${testRef1}`, targetFundId, testAmount1, testRef1, targetBankId],
  });

  const webhookPayload1 = {
    referenceNo: testRef1,
    providerTxId: `GBP-TX-${Date.now()}`,
    amount: testAmount1,
    status: 'PAID',
    timestamp: Math.floor(Date.now() / 1000),
  };
  const rawBody1 = JSON.stringify(webhookPayload1);
  const sig1 = crypto.createHmac('sha256', testSecret).update(rawBody1).digest('hex');

  const webhookResult1 = await PaymentGatewayAdapter.processWebhookEvent({
    rawBody: rawBody1,
    headers: {
      'x-signature': sig1,
      'x-timestamp': String(webhookPayload1.timestamp),
    },
    clientIp: '203.0.113.195',
  });

  assert(webhookResult1.statusCode === 200, 'Valid webhook returns HTTP 200', `Status: ${webhookResult1.statusCode}`);
  assert(webhookResult1.success === true, 'Webhook result success is true');
  assert(webhookResult1.paymentStatus === 'PAID', 'Payment status updated to PAID');

  // Verify DB state
  const updatedTxn1 = await db.execute({ sql: 'SELECT * FROM financial_transactions WHERE id = ?', args: [testTxnId1] });
  assert(updatedTxn1.rows[0].status === 'completed', 'Transaction status changed to "completed"');
  assert(updatedTxn1.rows[0].payment_status === 'PAID', 'Transaction payment_status changed to "PAID"');
  assert(updatedTxn1.rows[0].provider_tx_id === webhookPayload1.providerTxId, 'Provider TxID stored correctly');

  // Verify fund and bank credits
  const afterFund = await db.execute({ sql: 'SELECT total_received, available_amount FROM fund_accounts WHERE id = ?', args: [targetFundId] });
  assert(Number(afterFund.rows[0].total_received) === initialFundRec + testAmount1, 'Fund total_received credited correctly');
  assert(Number(afterFund.rows[0].available_amount) === initialFundAvail + testAmount1, 'Fund available_amount credited correctly');

  const afterBank = await db.execute({ sql: 'SELECT current_balance FROM bank_accounts WHERE id = ?', args: [targetBankId] });
  assert(Number(afterBank.rows[0].current_balance) === initialBankBal + testAmount1, 'Bank current_balance credited correctly');

  // ----------------------------------------------------------------
  // 6. Idempotent Duplicate Webhook Handling
  // ----------------------------------------------------------------
  console.log('\n--- 6. Idempotent Duplicate Webhook Handling ---');
  const duplicateResult = await PaymentGatewayAdapter.processWebhookEvent({
    rawBody: rawBody1,
    headers: {
      'x-signature': sig1,
      'x-timestamp': String(webhookPayload1.timestamp),
    },
    clientIp: '203.0.113.195',
  });

  assert(duplicateResult.statusCode === 200, 'Duplicate webhook returns HTTP 200');
  assert(Boolean(duplicateResult.message.includes('Duplicate webhook event received')), 'Duplicate acknowledged idempotently');

  // Verify fund was NOT double credited
  const afterDuplicateFund = await db.execute({ sql: 'SELECT total_received FROM fund_accounts WHERE id = ?', args: [targetFundId] });
  assert(Number(afterDuplicateFund.rows[0].total_received) === initialFundRec + testAmount1, 'Fund NOT double-credited on duplicate webhook');

  // ----------------------------------------------------------------
  // 7. Amount Mismatch Handling (Security & Flagging)
  // ----------------------------------------------------------------
  console.log('\n--- 7. Amount Mismatch Handling ---');
  const testRefMismatch = `DON-MISMATCH-${Date.now()}`;
  const testTxnMismatchId = `txn-mismatch-${Date.now()}`;
  const expectedAmount = 5000.0;
  const tamperedAmount = 2500.0; // Underpaid / Tampered amount

  await db.execute({
    sql: `INSERT INTO financial_transactions (
      id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
      payer_or_payee, reference_no, status, payment_status, bank_account_id, recorded_by_id, recorded_by_name
    ) VALUES (?, ?, '06 พ.ย. 2569 12:05', 'income', ?, 'กองทุนซะกาตผู้ยากไร้และขัดสน', 'ซะกาตทั่วไป', ?, 'promptpay_qr', 'คุณยอดเงินไม่ตรง', ?, 'pending', 'PENDING_PAYMENT', ?, 'u-1', 'Admin')`,
    args: [testTxnMismatchId, `TXN-${testRefMismatch}`, targetFundId, expectedAmount, testRefMismatch, targetBankId],
  });

  const mismatchPayload = {
    referenceNo: testRefMismatch,
    providerTxId: `GBP-MISMATCH-${Date.now()}`,
    amount: tamperedAmount,
    status: 'PAID',
    timestamp: Math.floor(Date.now() / 1000),
  };
  const rawMismatch = JSON.stringify(mismatchPayload);
  const sigMismatch = crypto.createHmac('sha256', testSecret).update(rawMismatch).digest('hex');

  const mismatchResult = await PaymentGatewayAdapter.processWebhookEvent({
    rawBody: rawMismatch,
    headers: {
      'x-signature': sigMismatch,
      'x-timestamp': String(mismatchPayload.timestamp),
    },
  });

  assert(mismatchResult.statusCode === 422, 'Amount mismatch returns HTTP 422 Unprocessable Entity', `Status: ${mismatchResult.statusCode}`);
  assert(mismatchResult.paymentStatus === 'REVIEW_REQUIRED', 'Payment status updated to REVIEW_REQUIRED');

  // Verify DB state for mismatch
  const checkMismatchTxn = await db.execute({ sql: 'SELECT * FROM financial_transactions WHERE id = ?', args: [testTxnMismatchId] });
  assert(checkMismatchTxn.rows[0].payment_status === 'REVIEW_REQUIRED', 'DB status set to REVIEW_REQUIRED for manual intervention');
  assert(checkMismatchTxn.rows[0].status === 'pending', 'Underlying accounting status remains pending (uncredited)');

  // ----------------------------------------------------------------
  // 8. Refund Process & Ledger Adjustment
  // ----------------------------------------------------------------
  console.log('\n--- 8. Refund Process & Ledger Adjustment ---');
  // Attempt unauthorized refund by general officer
  let officerThrew = false;
  try {
    await PaymentGatewayAdapter.processRefund({
      transactionIdOrRef: testTxnId1,
      refundAmount: testAmount1,
      reason: 'ผู้บริจาคระบุยอดผิด',
      auditor: { id: 'u-officer', name: 'Officer Somchai', role: 'officer' },
    });
  } catch {
    officerThrew = true;
  }
  assert(officerThrew, 'Unauthorized user (officer) blocked from issuing refund');

  // Valid refund by Super Admin
  const refundResult = await PaymentGatewayAdapter.processRefund({
    transactionIdOrRef: testTxnId1,
    refundAmount: testAmount1,
    reason: 'ผู้บริจาคขอยกเลิกและคืนเงินเนื่องจากโอนซ้ำ',
    auditor: { id: 'u-super-admin', name: 'Super Admin User', role: 'super_admin' },
  });

  assert(refundResult.success === true, 'Super Admin refund executed successfully');
  assert(refundResult.newStatus === 'REFUNDED', 'Transaction payment status is now REFUNDED');

  const refundedTxn = await db.execute({ sql: 'SELECT * FROM financial_transactions WHERE id = ?', args: [testTxnId1] });
  assert(refundedTxn.rows[0].payment_status === 'REFUNDED', 'DB payment_status updated to REFUNDED');
  assert(refundedTxn.rows[0].status === 'reversed', 'DB status updated to reversed');
  assert(Number(refundedTxn.rows[0].refund_amount) === testAmount1, 'DB refund_amount saved');

  // Verify fund balance deducted
  const fundAfterRefund = await db.execute({ sql: 'SELECT total_received FROM fund_accounts WHERE id = ?', args: [targetFundId] });
  assert(Number(fundAfterRefund.rows[0].total_received) === initialFundRec, 'Fund balance correctly reversed back to initial');

  // ----------------------------------------------------------------
  // 9. 3-Way Reconciliation Engine
  // ----------------------------------------------------------------
  console.log('\n--- 9. 3-Way Reconciliation Engine ---');
  // Create transactions for reconciliation test
  const recRef1 = `DON-REC-MATCH-${Date.now()}`;
  const recRef2 = `DON-REC-DIFF-${Date.now()}`;

  await db.execute({
    sql: `INSERT INTO financial_transactions (
      id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
      payer_or_payee, reference_no, status, payment_status, bank_account_id, recorded_by_id, recorded_by_name
    ) VALUES 
      ('txn-rec-1', 'TXN-REC-1', '06 พ.ย. 2569 10:00', 'income', 'fund-1', 'กองทุนซะกาต', 'ทั่วไป', 1000.0, 'promptpay_qr', 'นาย ก', ?, 'completed', 'PAID', 'bank-1', 'u-1', 'Admin'),
      ('txn-rec-2', 'TXN-REC-2', '06 พ.ย. 2569 10:30', 'income', 'fund-1', 'กองทุนซะกาต', 'ทั่วไป', 2000.0, 'promptpay_qr', 'นาย ข', ?, 'completed', 'PAID', 'bank-1', 'u-1', 'Admin')`,
    args: [recRef1, recRef2],
  });

  const settlementBatch = [
    { referenceNo: recRef1, providerTxId: 'GBP-REC-01', amount: 1000.0, settledAt: '2026-11-06T10:05:00Z' }, // Match
    { referenceNo: recRef2, providerTxId: 'GBP-REC-02', amount: 1950.0, settledAt: '2026-11-06T10:35:00Z' }, // Amount mismatch
    { referenceNo: 'DON-MISSING-ZMS-99', providerTxId: 'GBP-REC-03', amount: 300.0, settledAt: '2026-11-06T11:00:00Z' }, // Missing in ZMS
    { referenceNo: recRef1, providerTxId: 'GBP-REC-01', amount: 1000.0, settledAt: '2026-11-06T10:05:00Z' }, // Duplicate in batch
  ];

  const recReport = await PaymentGatewayAdapter.reconcileSettlementData({
    batchNo: `BATCH-TEST-${Date.now()}`,
    provider: 'gbprimepay',
    settlementItems: settlementBatch,
    auditor: { id: 'u-auditor', name: 'Internal Auditor' },
  });

  assert(recReport.matchedCount === 1, 'Reconciliation found exactly 1 match', `Matched: ${recReport.matchedCount}`);
  assert(recReport.mismatchCount === 1, 'Reconciliation found exactly 1 amount mismatch', `Mismatched: ${recReport.mismatchCount}`);
  assert(recReport.missingInZmsCount === 1, 'Reconciliation found 1 item missing in ZMS', `Missing in ZMS: ${recReport.missingInZmsCount}`);
  assert(recReport.duplicateCount === 1, 'Reconciliation detected 1 duplicate settlement item in batch');

  // Verify matched transaction received settled status
  const matchedTxnCheck = await db.execute({ sql: 'SELECT settlement_status FROM financial_transactions WHERE reference_no = ?', args: [recRef1] });
  assert(matchedTxnCheck.rows[0].settlement_status === 'settled', 'Matched transaction marked settlement_status = "settled"');

  // ----------------------------------------------------------------
  // 10. Clean up test records
  // ----------------------------------------------------------------
  await db.execute("DELETE FROM financial_transactions WHERE reference_no LIKE 'DON-E2E-%' OR reference_no LIKE 'DON-MISMATCH-%' OR reference_no LIKE 'DON-REC-%'");
  await db.execute("DELETE FROM payment_webhook_idempotency WHERE reference_no LIKE 'DON-E2E-%' OR reference_no LIKE 'DON-MISMATCH-%'");

  console.log('\n================================================================');
  console.log(`Phase 5 Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});

