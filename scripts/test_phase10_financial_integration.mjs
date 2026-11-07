/**
 * Phase 10 Test Suite: Financial & Accounting Integration
 * - Sub-fund budget solvency validation (blocking approval on budget deficit)
 * - Multi-tier fund balance hold (committed amount reservation)
 * - Release of fund hold on cancellation
 * - Chart of accounts mapping (Debit Zakat Expense by Asnaf, Credit by Assistance Format)
 * - Automated double-entry general ledger entries on disbursement
 * - Financial ledger details API & balance verification
 */

import { getDb, initDb } from '../src/lib/db.ts';
import { BeneficiaryService } from '../src/services/beneficiaryService.ts';

const BASE_URL = 'http://localhost:3000';

async function runPhase10Tests() {
  console.log('========================================================');
  console.log('🧪 PHASE 10 TEST SUITE: FINANCIAL INTEGRATION & GL');
  console.log('========================================================\n');

  await initDb();
  const db = getDb();

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  const superAdminActor = {
    id: 'u-1',
    name: 'อิบรอฮีม มานะชัย',
    role: 'super_admin',
  };

  const approverActor = {
    id: 'u-approver-p10',
    name: 'ดร. อับดุลลอฮ์ ผู้ทรงคุณวุฒิ',
    role: 'approver',
  };

  const financeActor = {
    id: 'u-finance-p10',
    name: 'ฮาซัน การเงิน',
    role: 'finance',
  };

  const officerActor = {
    id: 'u-officer-p10',
    name: 'สิทธิชัย เจ้าหน้าที่พัฒนาสังคม',
    role: 'officer',
  };

  const createTestApp = async (opts = {}) => {
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    const reg = await BeneficiaryService.registerBeneficiary({
      nationalId: `1100099${timestamp.toString().slice(-6)}`,
      fullName: `นายมุฮัมมัด ทดสอบการเงิน ${timestamp.toString().slice(-4)}`,
      phone: '0812345678',
      address: '123 หมู่ 4 ซอยประชาอุทิศ',
      province: 'กรุงเทพมหานคร',
      district: 'หนองจอก',
      subdistrict: 'คู้ฝั่งเหนือ',
      community: 'ชุมชนเกาะแต้ว',
      postcode: '10530',
      primaryGroupCode: 'faqir_miskin',
      asnafCategory: 'faqir_miskin',
      assistanceTypeCode: 'LIVING_SUPPORT',
      assistanceFormatCode: 'bank_transfer',
      requestedAmount: 15000,
      ...opts,
    }, officerActor);

    const appRes = await db.execute({
      sql: 'SELECT id, application_no, beneficiary_id FROM assistance_applications WHERE beneficiary_id = ? ORDER BY created_at DESC LIMIT 1',
      args: [reg.beneficiaryId],
    });

    return {
      beneficiaryId: reg.beneficiaryId,
      applicationId: appRes.rows[0].id,
      applicationNo: appRes.rows[0].application_no,
    };
  };

  try {
    // ---------------------------------------------------------
    // PREPARATION: Reset fund budget test balances
    // ---------------------------------------------------------
    console.log('🔧 0. Preparing Test Budgets & Sub-Funds...');
    await db.execute("UPDATE fund_accounts SET available_amount = 500000 WHERE id = 'fund-1'");
    await db.execute("UPDATE faqir_miskin_sub_funds SET remaining_amount = 500000 WHERE id = 'subf-1'");
    await db.execute("UPDATE faqir_miskin_sub_funds SET remaining_amount = 0 WHERE id = 'subf-4'");

    const solventSubFundId = 'subf-1';
    const zeroSubFundId = 'subf-4';

    // ---------------------------------------------------------
    // TEST SUITE 1: Fund Solvency Pre-check API
    // ---------------------------------------------------------
    console.log('\n📊 1. Testing Fund Solvency Pre-check API (POST /api/assistance-requests/check-fund-solvency)...');

    const app1 = await createTestApp({ specificFundId: solventSubFundId });
    const appSolventId = app1.applicationId;

    // Assess app1 so it can be approved
    await BeneficiaryService.startAssessment(appSolventId, officerActor);
    await BeneficiaryService.submitAssessment(appSolventId, {
      livingScore: 80,
      officerRecommendation: 'recommend_full',
      recommendedAmount: 15000,
      recommendedFundId: 'fund-1',
      recommendedSpecificFundId: solventSubFundId,
    }, officerActor);

    const solvencyRes1 = await fetch(`${BASE_URL}/api/assistance-requests/check-fund-solvency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: appSolventId,
        approvedAmount: 15000,
        fundId: 'fund-1',
        specificFundId: solventSubFundId,
      }),
    });

    const solvJson1 = await solvencyRes1.json().catch((e) => ({ error: e.message }));
    if (!solvencyRes1.ok) {
      console.error('DEBUG solvencyRes1 error:', solvencyRes1.status, solvJson1);
    }
    assert(solvencyRes1.ok, 'POST /api/assistance-requests/check-fund-solvency returns 200 OK');
    assert(solvJson1.success === true, 'Solvency check returns success: true');
    assert(solvJson1.data.isSolvent === true, 'Sufficient budget returns isSolvent: true');
    assert(solvJson1.data.fundAccount.availableAmount > 0, 'Returns fund account available amount');
    assert(solvJson1.data.specificSubFund.remainingAmount >= 15000, 'Returns specific sub-fund remaining amount');
    assert(Boolean(solvJson1.data.chartOfAccountsPreview.debit.code), 'Returns debit chart of account (5101-FAQIR-MISKIN)');
    assert(Boolean(solvJson1.data.chartOfAccountsPreview.credit.code), 'Returns credit chart of account (1102-BANK)');

    // Deficit Check
    const solvencyRes2 = await fetch(`${BASE_URL}/api/assistance-requests/check-fund-solvency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: appSolventId,
        approvedAmount: 999999999, // Exceeds budget
        fundId: 'fund-1',
        specificFundId: solventSubFundId,
      }),
    });
    const solvJson2 = await solvencyRes2.json();
    assert(solvJson2.success === true, 'Excessive amount check returns success: true');
    assert(solvJson2.data.isSolvent === false, 'Excessive amount correctly marked isSolvent: false');
    assert(typeof solvJson2.data.reason === 'string' && solvJson2.data.reason.length > 0, 'Returns descriptive insufficiency reason');

    // ---------------------------------------------------------
    // TEST SUITE 2: Strict Sub-Fund Solvency Enforcement on Approval
    // ---------------------------------------------------------
    console.log('\n🚫 2. Testing Strict Sub-Fund Solvency Enforcement on Approval...');

    const app2 = await createTestApp({
      specificFundId: zeroSubFundId,
      assistanceTypeCode: 'EDUCATION_GRANT',
      assistanceFormatCode: 'scholarship',
      requestedAmount: 50000,
    });
    const appDeficitId = app2.applicationId;

    // Assess app2 so it reaches pending_approval status
    await BeneficiaryService.startAssessment(appDeficitId, officerActor);
    await BeneficiaryService.submitAssessment(appDeficitId, {
      livingScore: 85,
      officerRecommendation: 'recommend_full',
      recommendedAmount: 50000,
      recommendedFundId: 'fund-1',
      recommendedSpecificFundId: zeroSubFundId,
    }, officerActor);

    // Attempt approve via Lifecycle API
    const approveFailRes = await fetch(`${BASE_URL}/api/assistance-requests/${appDeficitId}/lifecycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'APPROVE',
        approvedAmount: 50000,
        fundId: 'fund-1',
        specificFundId: zeroSubFundId,
        actorRole: 'approver',
        actorId: approverActor.id,
        actorName: approverActor.name,
      }),
    });

    const failJson = await approveFailRes.json().catch((e) => ({ error: e.message }));
    console.log('DEBUG approveFailRes:', approveFailRes.status, failJson);

    assert(approveFailRes.status === 422, 'Approval of depleted sub-fund returns 422 Unprocessable Entity');
    assert(failJson.success === false, 'Approval rejected with success: false');
    assert(
      Boolean(failJson.error && (failJson.error.includes('INSUFFICIENT_SUB_FUND_BALANCE') || failJson.error.includes('ไม่เพียงพอ'))),
      'Returns INSUFFICIENT_SUB_FUND_BALANCE error message'
    );

    // Verify application status remained unapproved
    const checkAppDef = await db.execute({
      sql: 'SELECT status, approval_status FROM assistance_applications WHERE id = ?',
      args: [appDeficitId],
    });
    assert(checkAppDef.rows[0].approval_status !== 'approved', 'Application was NOT approved in database');

    // ---------------------------------------------------------
    // TEST SUITE 3: Fund Balance Hold on Valid Approval
    // ---------------------------------------------------------
    console.log('\n🔒 3. Testing Fund Balance Hold on Valid Approval...');

    const initialFund1 = await db.execute("SELECT committed_amount, available_amount FROM fund_accounts WHERE id = 'fund-1'");
    const initialSf1 = await db.execute("SELECT committed_amount, remaining_amount FROM faqir_miskin_sub_funds WHERE id = 'subf-1'");
    const initFundCommit = Number(initialFund1.rows[0].committed_amount);
    const initFundAvail = Number(initialFund1.rows[0].available_amount);
    const initSfCommit = Number(initialSf1.rows[0].committed_amount);
    const initSfRemain = Number(initialSf1.rows[0].remaining_amount);

    const approveAmount = 12000;
    const approveOkRes = await fetch(`${BASE_URL}/api/assistance-requests/${appSolventId}/lifecycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'APPROVE',
        approvedAmount: approveAmount,
        fundId: 'fund-1',
        specificFundId: solventSubFundId,
        notes: 'อนุมัติวงเงินช่วยเหลือค่าครองชีพ',
        actorRole: 'approver',
        actorId: approverActor.id,
        actorName: approverActor.name,
      }),
    });

    assert(approveOkRes.ok, 'Approval of solvent sub-fund returns 200 OK');
    const approveJson = await approveOkRes.json();
    assert(approveJson.success === true, 'Approval succeeds');

    // Verify Fund Account Hold
    const afterFund1 = await db.execute("SELECT committed_amount, available_amount FROM fund_accounts WHERE id = 'fund-1'");
    const afterFundCommit = Number(afterFund1.rows[0].committed_amount);
    const afterFundAvail = Number(afterFund1.rows[0].available_amount);

    assert(afterFundCommit === initFundCommit + approveAmount, 'Fund committed_amount incremented by approved amount');
    assert(afterFundAvail === initFundAvail - approveAmount, 'Fund available_amount decremented by approved amount');

    // Verify Sub-Fund Hold
    const afterSf1 = await db.execute("SELECT committed_amount, remaining_amount FROM faqir_miskin_sub_funds WHERE id = 'subf-1'");
    const afterSfCommit = Number(afterSf1.rows[0].committed_amount);
    const afterSfRemain = Number(afterSf1.rows[0].remaining_amount);

    assert(afterSfCommit === initSfCommit + approveAmount, 'Sub-Fund committed_amount incremented by approved amount');
    assert(afterSfRemain === initSfRemain - approveAmount, 'Sub-Fund remaining_amount decremented by approved amount');

    // Verify Lifecycle Transition Recorded HOLD_FUND_BALANCE
    const transHold = await db.execute({
      sql: "SELECT action, notes, metadata FROM assistance_lifecycle_transitions WHERE application_id = ? AND action = 'APPROVE_REQUEST'",
      args: [appSolventId],
    });
    assert(transHold.rows.length > 0, 'APPROVE_REQUEST transition recorded');
    assert(transHold.rows[0].metadata?.includes('HOLD_FUND_BALANCE'), 'Transition metadata includes HOLD_FUND_BALANCE flag');

    // ---------------------------------------------------------
    // TEST SUITE 4: Release of Fund Hold on Cancellation
    // ---------------------------------------------------------
    console.log('\n🔓 4. Testing Release of Fund Hold on Cancellation...');

    const cancelRes = await fetch(`${BASE_URL}/api/assistance-requests/${appSolventId}/lifecycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CANCEL',
        reason: 'ผู้ขอความช่วยเหลือขอยกเลิกคำร้อง',
        actorRole: 'super_admin',
        actorId: superAdminActor.id,
        actorName: superAdminActor.name,
      }),
    });

    assert(cancelRes.ok, 'Cancel approved request returns 200 OK');
    const cancelJson = await cancelRes.json();
    assert(cancelJson.success === true, 'Cancellation succeeds');

    // Verify Fund Account Released
    const relFund1 = await db.execute("SELECT committed_amount, available_amount FROM fund_accounts WHERE id = 'fund-1'");
    assert(Number(relFund1.rows[0].committed_amount) === initFundCommit, 'Fund committed_amount restored back');
    assert(Number(relFund1.rows[0].available_amount) === initFundAvail, 'Fund available_amount restored back');

    // Verify Sub-Fund Released
    const relSf1 = await db.execute("SELECT committed_amount, remaining_amount FROM faqir_miskin_sub_funds WHERE id = 'subf-1'");
    assert(Number(relSf1.rows[0].committed_amount) === initSfCommit, 'Sub-Fund committed_amount restored back');
    assert(Number(relSf1.rows[0].remaining_amount) === initSfRemain, 'Sub-Fund remaining_amount restored back');

    // Verify RELEASE_FUND_HOLD transition recorded
    const transRel = await db.execute({
      sql: "SELECT action, notes, metadata FROM assistance_lifecycle_transitions WHERE application_id = ? AND action = 'RELEASE_FUND_HOLD'",
      args: [appSolventId],
    });
    assert(transRel.rows.length > 0, 'RELEASE_FUND_HOLD transition recorded in audit history');

    // ---------------------------------------------------------
    // TEST SUITE 5: Automated Double-Entry General Ledger on Disbursement
    // ---------------------------------------------------------
    console.log('\n📒 5. Testing Automated Double-Entry GL on Disbursement...');

    const app3 = await createTestApp({ specificFundId: solventSubFundId, requestedAmount: 18000 });
    const appDisbId = app3.applicationId;

    // Assess app3
    await BeneficiaryService.startAssessment(appDisbId, officerActor);
    await BeneficiaryService.submitAssessment(appDisbId, {
      livingScore: 88,
      officerRecommendation: 'recommend_full',
      recommendedAmount: 18000,
      recommendedFundId: 'fund-1',
      recommendedSpecificFundId: solventSubFundId,
    }, officerActor);

    // Approve appDisbId
    const disbApprove = await fetch(`${BASE_URL}/api/assistance-requests/${appDisbId}/lifecycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'APPROVE',
        approvedAmount: 18000,
        fundId: 'fund-1',
        specificFundId: solventSubFundId,
        actorRole: 'approver',
        actorId: approverActor.id,
        actorName: approverActor.name,
      }),
    });
    assert(disbApprove.ok, 'Approve for disbursement succeeds');

    // Disburse appDisbId
    const paymentRef = `TR-P10-${Date.now().toString().slice(-6)}`;
    const disbRes = await fetch(`${BASE_URL}/api/assistance-requests/${appDisbId}/lifecycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DISBURSE',
        paymentRef,
        proofUrl: '/slips/bank-transfer-p10.pdf',
        notes: 'โอนเงินสวัสดิการซะกาตผ่านธนาคาร',
        actorRole: 'finance',
        actorId: financeActor.id,
        actorName: financeActor.name,
      }),
    });

    assert(disbRes.ok, 'Disbursement request returns 200 OK');
    const disbJson = await disbRes.json();
    assert(disbJson.success === true, 'Disbursement succeeds');
    assert(disbJson.actionResult.status === 'disbursed', 'Status updated to disbursed');
    assert(Boolean(disbJson.actionResult.journalNo), `Generated Journal Voucher: ${disbJson.actionResult.journalNo}`);

    const journalNo = disbJson.actionResult.journalNo;

    // Verify general_ledger_entries rows in SQLite
    const glRows = await db.execute({
      sql: 'SELECT id, journal_no, account_code, account_name, account_category, entry_type, amount FROM general_ledger_entries WHERE journal_no = ? ORDER BY entry_type DESC',
      args: [journalNo],
    });

    assert(glRows.rows.length === 2, 'Exactly 2 double-entry rows created in general_ledger_entries');

    const debitRow = glRows.rows.find((r) => r.entry_type === 'debit');
    const creditRow = glRows.rows.find((r) => r.entry_type === 'credit');

    assert(Boolean(debitRow), 'Debit entry exists');
    assert(debitRow?.account_code === '5101-FAQIR-MISKIN', 'Debit account is 5101-FAQIR-MISKIN (Zakat Expense)');
    assert(debitRow?.account_category === 'expense', 'Debit category is expense');
    assert(Number(debitRow?.amount) === 18000, 'Debit amount is ฿18,000');

    assert(Boolean(creditRow), 'Credit entry exists');
    assert(creditRow?.account_code === '1102-BANK', 'Credit account is 1102-BANK (Bank Asset)');
    assert(creditRow?.account_category === 'asset', 'Credit category is asset');
    assert(Number(creditRow?.amount) === 18000, 'Credit amount is ฿18,000');
    assert(Number(debitRow?.amount) === Number(creditRow?.amount), 'Double-entry is perfectly balanced (Total Debit == Total Credit)');

    // Verify financial_transactions link
    const ftRow = await db.execute({
      sql: 'SELECT id, transaction_no, journal_no, assistance_format_code, delivery_method, amount FROM financial_transactions WHERE reference_no = ?',
      args: [paymentRef],
    });
    assert(ftRow.rows.length > 0, 'Financial transaction recorded in financial_transactions');
    assert(ftRow.rows[0].journal_no === journalNo, 'Financial transaction contains linked journal_no');

    // ---------------------------------------------------------
    // TEST SUITE 6: Financial Ledger API (GET /api/assistance-requests/[id]/financial-ledger)
    // ---------------------------------------------------------
    console.log('\n🔍 6. Testing Financial Ledger Details API (GET /api/assistance-requests/[id]/financial-ledger)...');

    const ledgerRes = await fetch(`${BASE_URL}/api/assistance-requests/${appDisbId}/financial-ledger`);
    assert(ledgerRes.ok, 'GET /api/assistance-requests/[id]/financial-ledger returns 200 OK');
    const ledgerJson = await ledgerRes.json();
    assert(ledgerJson.success === true, 'Financial ledger API returns success: true');
    assert(ledgerJson.data.journalNo === journalNo, 'Returns correct journal voucher number');
    assert(ledgerJson.data.isBalanced === true, 'API confirms isBalanced: true');
    assert(ledgerJson.data.totalDebit === 18000, 'Returns totalDebit: ฿18,000');
    assert(ledgerJson.data.totalCredit === 18000, 'Returns totalCredit: ฿18,000');
    assert(Array.isArray(ledgerJson.data.glEntries) && ledgerJson.data.glEntries.length === 2, 'Returns both GL entries');
    assert(Array.isArray(ledgerJson.data.holdHistory) && ledgerJson.data.holdHistory.length >= 2, 'Returns fund hold and disbursement lifecycle history');

  } catch (err) {
    console.error('Test Suite Exception:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`🏁 Phase 10 Test Suite Completed: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
}

runPhase10Tests();
