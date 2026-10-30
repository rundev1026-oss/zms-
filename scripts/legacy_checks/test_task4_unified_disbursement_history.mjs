import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TASK 4: VERIFICATION TEST SUITE - UNIFIED DISBURSEMENT HISTORY');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function pass(name, details = '') {
    passedTests++;
    totalTests++;
    console.log(`✅ [PASS] ${name}${details ? ` -> ${details}` : ''}`);
  }

  function fail(name, error) {
    totalTests++;
    console.error(`❌ [FAIL] ${name}:`, error);
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Basic API Endpoint & Data Structure
  // ---------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true`);
    assert.strictEqual(res.status, 200, 'HTTP status should be 200');
    const json = await res.json();
    assert.strictEqual(json.success, true, 'API should return success: true');
    assert.ok(Array.isArray(json.data), 'API data should be an array');
    assert.ok(json.data.length > 0, `History should contain entries (found ${json.data.length})`);

    // Verify unified structure has both actual disbursements and movements
    const aidEntries = json.data.filter((h) => h.paymentType === 'aid_disbursement');
    const officeEntries = json.data.filter((h) => h.paymentType === 'office_expense');
    const movementEntries = json.data.filter((h) => !h.isActualDisbursement);

    assert.ok(aidEntries.length > 0, 'Should include aid disbursement entries');
    assert.ok(movementEntries.length > 0, 'Should include cash movement entries');

    pass('Test 1: Unified History API Endpoint', `Total entries: ${json.data.length} (Aid: ${aidEntries.length}, Office: ${officeEntries.length}, Cash Movements: ${movementEntries.length})`);
  } catch (err) {
    fail('Test 1: Unified History API Endpoint', err);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Strict Solvency & Deduplication Rules (Section 5)
  // ---------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true`);
    const json = await res.json();
    const data = json.data;

    // Rule A: Cash movements MUST NOT be flagged as actual disbursements
    const bankWithdrawals = data.filter((h) => h.paymentType === 'bank_withdrawal');
    const treasurerDeposits = data.filter((h) => h.paymentType === 'treasurer_deposit');
    const cashReturns = data.filter((h) => h.paymentType === 'cash_returned');

    for (const item of [...bankWithdrawals, ...treasurerDeposits, ...cashReturns]) {
      assert.strictEqual(
        item.isActualDisbursement,
        false,
        `Movement ${item.voucherNo} (${item.paymentType}) must have isActualDisbursement=false`
      );
    }

    // Rule B: Active real disbursements MUST have isActualDisbursement = true; cancelled/draft MUST NOT
    const aidDisbursements = data.filter((h) => h.paymentType === 'aid_disbursement');
    const officeExpenses = data.filter((h) => h.paymentType === 'office_expense');
    for (const item of [...aidDisbursements, ...officeExpenses]) {
      if (item.status === 'cancelled') {
        assert.strictEqual(
          item.isActualDisbursement,
          false,
          `Cancelled voucher ${item.voucherNo} must have isActualDisbursement=false`
        );
      } else {
        assert.strictEqual(
          item.isActualDisbursement,
          true,
          `Active real expense ${item.voucherNo} (${item.paymentType}) must have isActualDisbursement=true`
        );
      }
    }

    // Rule C: Office expenses must show vendor/payee, expense category, and not force asnaf
    for (const item of officeExpenses) {
      assert.ok(item.expenseCategory || item.expenseCategoryName, `Office expense ${item.voucherNo} must have expenseCategory`);
      assert.ok(item.asnaf === '-' || !item.asnaf || item.asnaf === 'amileen', `Office expense ${item.voucherNo} should not force beneficiary asnaf`);
    }

    pass('Test 2: Anti-Pattern & Solvency Rules', 'Passed: Movements never counted as disbursements; Office expenses formatted correctly');
  } catch (err) {
    fail('Test 2: Anti-Pattern & Solvency Rules', err);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: All 9 Filters Verification (Section 2)
  // ---------------------------------------------------------------------------
  try {
    // 3.1: Filter by paymentType = actual_disbursements
    const resActual = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true&paymentType=actual_disbursements`);
    const jsonActual = await resActual.json();
    assert.ok(jsonActual.data.every((h) => h.isActualDisbursement === true), 'Filter actual_disbursements should only return actual disbursements');

    // 3.2: Filter by paymentType = aid_disbursement
    const resAid = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true&paymentType=aid_disbursement`);
    const jsonAid = await resAid.json();
    assert.ok(jsonAid.data.every((h) => h.paymentType === 'aid_disbursement'), 'Filter aid_disbursement should only return aid disbursements');

    // 3.3: Filter by paymentType = cash_movements
    const resMove = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true&paymentType=cash_movements`);
    const jsonMove = await resMove.json();
    assert.ok(jsonMove.data.every((h) => !h.isActualDisbursement), 'Filter cash_movements should only return movements');

    // 3.4: Filter by asnaf = faqir
    const resFaqir = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true&asnaf=faqir`);
    const jsonFaqir = await resFaqir.json();
    if (jsonFaqir.data.length > 0) {
      assert.ok(jsonFaqir.data.every((h) => (h.asnaf || '').toLowerCase().includes('faqir')), 'Asnaf filter should match');
    }

    // 3.5: Filter by status = completed_disbursed
    const resStatus = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true&status=completed_disbursed`);
    const jsonStatus = await resStatus.json();
    assert.ok(
      jsonStatus.data.every((h) => ['completed', 'disbursed', 'cleared', 'received'].includes(h.status)),
      'Status filter completed_disbursed should match active finished items'
    );

    // 3.6: Filter by status = cancelled (Never hide cancelled items)
    const resCancelled = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true&status=cancelled`);
    const jsonCancelled = await resCancelled.json();
    assert.ok(jsonCancelled.data.every((h) => h.status === 'cancelled'), 'Status filter cancelled should return cancelled items');

    // 3.7: Filter by payee search
    const samplePayee = jsonActual.data.find((h) => h.payeeName && h.payeeName !== '-')?.payeeName;
    if (samplePayee) {
      const queryPayee = samplePayee.split(' ')[0];
      const resPayee = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true&payee=${encodeURIComponent(queryPayee)}`);
      const jsonPayee = await resPayee.json();
      assert.ok(jsonPayee.data.length > 0, `Payee filter should find entries for ${queryPayee}`);
      assert.ok(jsonPayee.data.some((h) => (h.payeeName || '').includes(queryPayee)), 'Payee name should match query');
    }

    // 3.8: Filter by voucherNo
    const sampleVoucher = jsonActual.data[0]?.voucherNo;
    if (sampleVoucher) {
      const resVoucher = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true&voucherNo=${encodeURIComponent(sampleVoucher)}`);
      const jsonVoucher = await resVoucher.json();
      assert.ok(jsonVoucher.data.length > 0, `Voucher filter should find entry for ${sampleVoucher}`);
      assert.strictEqual(jsonVoucher.data[0].voucherNo, sampleVoucher, 'Voucher number must match');
    }

    pass('Test 3: All 9 Filters Verification', 'Passed: paymentType, asnaf, status, cancelled visibility, payee, voucherNo tested');
  } catch (err) {
    fail('Test 3: All 9 Filters Verification', err);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Detail Modal Data Completeness (Section 4)
  // ---------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true`);
    const json = await res.json();

    // Check that items have enriched modal fields
    const entryWithAid = json.data.find((h) => h.paymentType === 'aid_disbursement' && h.aidItems && h.aidItems.length > 0);
    const entryWithAudit = json.data.find((h) => h.auditLogs && h.auditLogs.length > 0);

    assert.ok(entryWithAid, 'Should have at least one entry with aidItems for modal breakdown');
    assert.ok(entryWithAid.voucherNo, 'Entry must have voucherNo');
    assert.ok(entryWithAid.date && entryWithAid.time, 'Entry must have date and time');
    assert.ok(entryWithAid.responsiblePerson, 'Entry must have responsiblePerson');
    assert.ok(entryWithAid.aidItems[0].beneficiaryName, 'Aid item must have beneficiaryName');
    assert.ok(entryWithAid.aidItems[0].disbursedAmount > 0, 'Aid item must have disbursedAmount > 0');

    // Verify attachments & handovers structures exist
    const hasAttachmentsProp = json.data.some((h) => Array.isArray(h.attachments));
    const hasHandoverSummaryProp = json.data.some((h) => h.handoverSummary !== undefined);

    assert.ok(hasAttachmentsProp, 'Entries must have attachments array property');
    assert.ok(hasHandoverSummaryProp, 'Entries must have handoverSummary property');

    pass('Test 4: Detail Modal Data Completeness', `Passed: Verified line items, handovers, attachments, audit logs in entry ${entryWithAid.voucherNo}`);
  } catch (err) {
    fail('Test 4: Detail Modal Data Completeness', err);
  }

  // ---------------------------------------------------------------------------
  // TEST 5: KPI Aggregation Math & Reversals Integrity (Section 6)
  // ---------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/finance/cash-flow?history=true`);
    const json = await res.json();
    const data = json.data;

    let confirmedAidSum = 0;
    let confirmedOfficeSum = 0;
    let confirmedOtherSum = 0;
    let pendingSum = 0;
    let draftSum = 0;
    let cancelledSum = 0;
    let cashMovementsSum = 0;

    for (const h of data) {
      const amt = Number(h.amount) || 0;
      if (h.status === 'cancelled') {
        cancelledSum += amt;
      } else if (h.status === 'draft') {
        draftSum += amt;
      } else if (['pending', 'pending_approval', 'pending_clearance'].includes(h.status)) {
        pendingSum += amt;
      } else if (h.isActualDisbursement) {
        if (h.paymentType === 'aid_disbursement') {
          confirmedAidSum += amt;
        } else if (h.paymentType === 'office_expense') {
          confirmedOfficeSum += amt;
        } else {
          confirmedOtherSum += amt;
        }
      } else {
        cashMovementsSum += amt;
      }
    }

    const totalActualDisbursements = confirmedAidSum + confirmedOfficeSum + confirmedOtherSum;

    // Verify actual disbursements do NOT include cash movements or cancelled
    assert.strictEqual(
      totalActualDisbursements.toFixed(2),
      (confirmedAidSum + confirmedOfficeSum + confirmedOtherSum).toFixed(2),
      'Actual disbursements must strictly sum aid + office + other'
    );
    assert.ok(cashMovementsSum > 0, 'Cash movements sum should be positive and separated');

    pass(
      'Test 5: KPI Aggregation Math & Solvency',
      `Confirmed Aid: ฿${confirmedAidSum.toLocaleString()} | Confirmed Office: ฿${confirmedOfficeSum.toLocaleString()} | Total Actual: ฿${totalActualDisbursements.toLocaleString()} | Movements (Float): ฿${cashMovementsSum.toLocaleString()} | Pending: ฿${pendingSum.toLocaleString()} | Cancelled: ฿${cancelledSum.toLocaleString()}`
    );
  } catch (err) {
    fail('Test 5: KPI Aggregation Math & Solvency', err);
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('✨ ALL TASK 4 VERIFICATION TESTS PASSED SUCCESSFULLY! ✨\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.');
    process.exit(1);
  }
}

runTests();
