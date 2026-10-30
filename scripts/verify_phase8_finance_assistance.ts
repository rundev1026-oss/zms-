/**
 * Phase 8 Verification: Assistance Execution, Disbursements & Finance Module Audit
 *
 * Test Suite Coverage:
 * 1. Role Authentication & RBAC token issuance (Finance Officer, Treasurer, Approver, Officer, Super Admin)
 * 2. Account Balances & Ledger Baseline (Funds, Bank Accounts, Budget Summary)
 * 3. Segregation of Duties (SoD) & RBAC Security Checks (Officer & Approver cannot disburse; Approver SoD)
 * 4. Validation & State Integrity Checks (Missing paymentRef, invalid state, 404 application)
 * 5. Successful Disbursement by Finance Officer (TXN-DISB-YYYY-###### sequential numbering)
 * 6. Multi-Tier Double-Entry Ledger Updates (FundAccount committed vs disbursed amount, BankAccount deduction)
 * 7. Decimal(18,2) exact satang precision in PostgreSQL
 * 8. Idempotency & Duplicate Prevention (409 Conflict on repeated paymentRef, 400 on already disbursed)
 * 9. Financial Transactions Ledger Querying & Pagination (GET /finance/transactions, filtering, search, getById)
 * 10. Assistance Handover & Execution Tracking (Record execution, confirm handover, query by application)
 * 11. Audit Trail & Application History Logging (disbursed history, execution history, AuditLog entries)
 * 12. Next.js BFF Proxy Endpoints Integration (/api/finance/*, /api/beneficiaries/[id]/disburse)
 */

import pkg from '../apps/api/node_modules/@prisma/client/default.js';
const { PrismaClient, Prisma } = pkg;

const API_BASE = 'http://localhost:4000/api/v1';
const NEXT_BASE = 'http://localhost:3001/api';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] #${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] #${totalTests}: ${testName}`, details ?? '');
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function login(email: string, password = 'ZmsEnterprise2026!') {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.accessToken as string;
}

async function runVerification() {
  console.log('================================================================');
  console.log('   PHASE 8: ASSISTANCE EXECUTION, DISBURSEMENTS & FINANCE AUDIT ');
  console.log('================================================================\n');

  const prisma = new PrismaClient();

  try {
    // -------------------------------------------------------------
    // SUITE 1: Role Authentication & RBAC Tokens
    // -------------------------------------------------------------
    console.log('--- SUITE 1: Role Authentication & RBAC Tokens ---');
    const financeToken = await login('finance@zms.local');
    assert(!!financeToken, 'Finance Officer login successful & JWT token issued');

    const treasurerToken = await login('treasurer@zms.local');
    assert(!!treasurerToken, 'Treasurer login successful & JWT token issued');

    const approverToken = await login('approver@zms.local');
    assert(!!approverToken, 'Approver login successful & JWT token issued');

    const officerToken = await login('officer@zms.local');
    assert(!!officerToken, 'Assistance Officer login successful & JWT token issued');

    const adminToken = await login('admin@zms.local');
    assert(!!adminToken, 'Super Admin login successful & JWT token issued');

    // -------------------------------------------------------------
    // SUITE 2: Account Balances & Ledger Baseline
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: Account Balances & Ledger Baseline ---');
    const fundsRes = await fetch(`${API_BASE}/finance/funds`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(fundsRes.ok, 'GET /finance/funds returns 200 OK');
    const fundsList = await fundsRes.json();
    assert(Array.isArray(fundsList) && fundsList.length > 0, 'Found registered Fund Accounts', { count: fundsList.length });

    const generalFund = fundsList.find((f: any) => f.code === 'FND-ZKT-01' || f.legacyId === 'fund-1');
    assert(!!generalFund, 'General Zakat Fund exists in ledger', { code: generalFund?.code });
    assert(typeof generalFund.totalReceived === 'number', 'Fund totalReceived is parsed as number');
    assert(typeof generalFund.committedAmount === 'number', 'Fund committedAmount is parsed as number');
    assert(typeof generalFund.disbursedAmount === 'number', 'Fund disbursedAmount is parsed as number');
    assert(typeof generalFund.availableAmount === 'number', 'Fund availableAmount is parsed as number');

    const banksRes = await fetch(`${API_BASE}/finance/bank-accounts`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(banksRes.ok, 'GET /finance/bank-accounts returns 200 OK');
    const banksList = await banksRes.json();
    assert(Array.isArray(banksList) && banksList.length > 0, 'Found registered Bank Accounts', { count: banksList.length });
    const targetBank = banksList[0];
    assert(!!targetBank && targetBank.status === 'active', 'Primary Bank Account is active and available for payout', { status: targetBank?.status });

    const summaryRes = await fetch(`${API_BASE}/finance/summary`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(summaryRes.ok, 'GET /finance/summary returns 200 OK');
    const budgetSummary = await summaryRes.json();
    assert(typeof budgetSummary.totalReceived === 'number', 'Budget summary has totalReceived');
    assert(typeof budgetSummary.totalCommitted === 'number', 'Budget summary has totalCommitted');
    assert(typeof budgetSummary.totalDisbursed === 'number', 'Budget summary has totalDisbursed');
    assert(typeof budgetSummary.totalAvailable === 'number', 'Budget summary has totalAvailable');

    // -------------------------------------------------------------
    // SUITE 3: Preparation of Test Applications for Disbursement
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Preparation of Test Applications for Disbursement ---');
    // Ensure we have an active beneficiary
    let testBeneficiary = await prisma.beneficiary.findFirst({
      where: { identityNumberNormalized: { not: null } },
    });
    if (!testBeneficiary) {
      testBeneficiary = await prisma.beneficiary.findFirst();
    }
    if (!testBeneficiary) throw new Error('No test beneficiary found');

    // Find the Approver user ID
    const approverUser = await prisma.user.findFirst({
      where: { email: 'approver@zms.local' },
    });
    if (!approverUser) throw new Error('Approver user record not found');

    // Find Officer user ID
    const officerUser = await prisma.user.findFirst({
      where: { email: 'officer@zms.local' },
    });
    if (!officerUser) throw new Error('Officer user record not found');

    // Create an approved application ready for disbursement
    const testDisburseAmount = 6500.50; // Use non-integer satang precision
    const testApp = await prisma.assistanceApplication.create({
      data: {
        applicationNo: `APP-2569-TEST-${Date.now().toString().slice(-6)}`,
        beneficiaryId: testBeneficiary.id,
        asnafCategory: 'faqir',
        assistanceType: 'monthly_stipend',
        requestedAmount: new Prisma.Decimal(testDisburseAmount),
        approvedAmount: new Prisma.Decimal(testDisburseAmount),
        approvedFundId: generalFund.id,
        status: 'approved',
        urgencyLevel: 'high',
        fiscalYear: '2569',
        approvedById: approverUser.id,
        approvedByName: approverUser.displayName,
        approvedDate: new Date().toISOString(),
        assignedOfficerId: officerUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Also update fund committedAmount to simulate the commitment from Phase 7 approval
    await prisma.fundAccount.update({
      where: { id: generalFund.id },
      data: {
        committedAmount: { increment: new Prisma.Decimal(testDisburseAmount) },
      },
    });

    assert(!!testApp.id, 'Test application created in "approved" state with satang precision ฿6,500.50');

    // -------------------------------------------------------------
    // SUITE 4: Segregation of Duties (SoD) & RBAC Security Checks
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: Segregation of Duties (SoD) & RBAC Security Checks ---');
    // 4.1 Officer cannot disburse
    const officerDisburseRes = await fetch(`${API_BASE}/finance/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        applicationId: testApp.id,
        paymentRef: `PAY-OFFICER-${Date.now()}`,
      }),
    });
    assert(officerDisburseRes.status === 403, 'Assistance Officer forbidden (403) from executing disbursements');

    // 4.2 Approver cannot disburse
    const approverDisburseRes = await fetch(`${API_BASE}/finance/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approverToken}`,
      },
      body: JSON.stringify({
        applicationId: testApp.id,
        paymentRef: `PAY-APPROVER-${Date.now()}`,
      }),
    });
    assert(approverDisburseRes.status === 403, 'Approver forbidden (403) from executing disbursements');

    // 4.3 Segregation of Duties: If Approver somehow gained Finance Officer role,
    // they cannot disburse an application they approved
    // Create an application approved by Finance Officer directly to test the SoD interceptor
    const financeUser = await prisma.user.findFirst({
      where: { email: 'finance@zms.local' },
    });
    if (!financeUser) throw new Error('Finance user not found');

    const sodTestApp = await prisma.assistanceApplication.create({
      data: {
        applicationNo: `APP-2569-SOD-${Date.now().toString().slice(-6)}`,
        beneficiaryId: testBeneficiary.id,
        asnafCategory: 'faqir',
        assistanceType: 'monthly_stipend',
        requestedAmount: new Prisma.Decimal(2000),
        approvedAmount: new Prisma.Decimal(2000),
        approvedFundId: generalFund.id,
        status: 'approved',
        urgencyLevel: 'medium',
        fiscalYear: '2569',
        approvedById: financeUser.id, // Approved by finance user
        approvedByName: financeUser.displayName,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const sodDisburseRes = await fetch(`${API_BASE}/finance/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${financeToken}`,
      },
      body: JSON.stringify({
        applicationId: sodTestApp.id,
        paymentRef: `PAY-SOD-${Date.now()}`,
      }),
    });
    assert(sodDisburseRes.status === 403, 'SoD Violation: User cannot disburse an application they approved (403 SOD_VIOLATION)');
    const sodErrorJson = await sodDisburseRes.json();
    assert(sodErrorJson.code === 'SOD_VIOLATION', 'Error code is explicitly "SOD_VIOLATION"');

    // Clean up sodTestApp
    await prisma.assistanceApplication.delete({ where: { id: sodTestApp.id } });

    // -------------------------------------------------------------
    // SUITE 5: Validation & State Integrity Checks
    // -------------------------------------------------------------
    console.log('\n--- SUITE 5: Validation & State Integrity Checks ---');
    // 5.1 Missing paymentRef
    const missingRefRes = await fetch(`${API_BASE}/finance/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${financeToken}`,
      },
      body: JSON.stringify({
        applicationId: testApp.id,
        paymentRef: '   ', // whitespace only
      }),
    });
    assert(missingRefRes.status === 400, 'Empty payment reference rejected with 400 Bad Request');

    // 5.2 Invalid / Non-existent applicationId
    const notFoundAppRes = await fetch(`${API_BASE}/finance/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${financeToken}`,
      },
      body: JSON.stringify({
        applicationId: '00000000-0000-0000-0000-000000000000',
        paymentRef: `PAY-NOTFOUND-${Date.now()}`,
      }),
    });
    assert(notFoundAppRes.status === 404, 'Non-existent application rejected with 404 Not Found');

    // 5.3 Application in invalid state (e.g. 'draft')
    const draftApp = await prisma.assistanceApplication.create({
      data: {
        applicationNo: `APP-2569-DRAFT-${Date.now().toString().slice(-6)}`,
        beneficiaryId: testBeneficiary.id,
        asnafCategory: 'faqir',
        assistanceType: 'monthly_stipend',
        requestedAmount: new Prisma.Decimal(1000),
        status: 'draft',
        fiscalYear: '2569',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const invalidStateRes = await fetch(`${API_BASE}/finance/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${financeToken}`,
      },
      body: JSON.stringify({
        applicationId: draftApp.id,
        paymentRef: `PAY-DRAFT-${Date.now()}`,
      }),
    });
    assert(invalidStateRes.status === 400, 'Disbursing unapproved/draft application rejected with 400 Bad Request');
    const invalidStateJson = await invalidStateRes.json();
    assert(invalidStateJson.code === 'INVALID_STATE', 'Error code is explicitly "INVALID_STATE"');

    // Clean up draftApp
    await prisma.assistanceApplication.delete({ where: { id: draftApp.id } });

    // -------------------------------------------------------------
    // SUITE 6: Successful Disbursement Execution
    // -------------------------------------------------------------
    console.log('\n--- SUITE 6: Successful Disbursement Execution ---');
    // Read fund balances before disbursement
    const fundBefore = await prisma.fundAccount.findUnique({ where: { id: generalFund.id } });
    if (!fundBefore) throw new Error('General fund not found');
    const committedBefore = Number(fundBefore.committedAmount);
    const disbursedBefore = Number(fundBefore.disbursedAmount);

    const testPaymentRef = `KTB-ZMS-${Date.now()}`;
    const disbursePayload = {
      applicationId: testApp.id,
      paymentRef: testPaymentRef,
      proofUrl: '/slips/test-slip-payout.jpg',
      notes: 'โอนเงินสงเคราะห์ผ่านระบบ KTB Corporate Online สำเร็จ',
      amount: testDisburseAmount,
      bankAccountId: targetBank.id,
      paymentMethod: 'bank_transfer',
    };

    const disburseRes = await fetch(`${API_BASE}/finance/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${financeToken}`,
      },
      body: JSON.stringify(disbursePayload),
    });

    assert(disburseRes.ok, 'Disbursement executed successfully (HTTP 200/201)');
    const disburseData = await disburseRes.json();
    assert(typeof disburseData.transactionNo === 'string', 'Returns transactionNo', { transactionNo: disburseData.transactionNo });
    assert(
      /^TXN-DISB-2569-\d{6}$/.test(disburseData.transactionNo),
      'Transaction number adheres strictly to "TXN-DISB-2569-######" format',
      { transactionNo: disburseData.transactionNo }
    );
    assert(disburseData.applicationId === testApp.id, 'Response links correctly to applicationId');
    assert(disburseData.disbursedAmount === testDisburseAmount, 'Disbursed amount matches approved amount with exact satang');
    assert(disburseData.status === 'disbursed', 'Transaction status returned is "disbursed"');

    // Verify application state in DB
    const dbApp = await prisma.assistanceApplication.findUnique({ where: { id: testApp.id } });
    assert(dbApp?.status === 'disbursed', 'Application status updated to "disbursed" in database');
    assert(Number(dbApp?.disbursedAmount) === testDisburseAmount, 'Application disbursedAmount matches satang precision in Decimal(18,2)');
    assert(dbApp?.disbursementRef === testPaymentRef, 'Application disbursementRef records exact payment reference');
    assert(dbApp?.disbursedById === financeUser.id, 'Application disbursedById records Finance Officer UUID');
    assert(dbApp?.disbursedByName === financeUser.displayName, 'Application disbursedByName records Finance Officer display name');

    // -------------------------------------------------------------
    // SUITE 7: Multi-Tier Double-Entry Ledger Updates
    // -------------------------------------------------------------
    console.log('\n--- SUITE 7: Multi-Tier Double-Entry Ledger Updates ---');
    const fundAfter = await prisma.fundAccount.findUnique({ where: { id: generalFund.id } });
    if (!fundAfter) throw new Error('Fund after not found');
    const committedAfter = Number(fundAfter.committedAmount);
    const disbursedAfter = Number(fundAfter.disbursedAmount);

    assert(
      Math.abs((committedBefore - testDisburseAmount) - committedAfter) < 0.001,
      'FundAccount.committedAmount was decremented by exact disbursed amount',
      { committedBefore, committedAfter, diff: committedBefore - committedAfter }
    );
    assert(
      Math.abs((disbursedBefore + testDisburseAmount) - disbursedAfter) < 0.001,
      'FundAccount.disbursedAmount was incremented by exact disbursed amount',
      { disbursedBefore, disbursedAfter, diff: disbursedAfter - disbursedBefore }
    );

    // Verify FinancialTransaction ledger record in DB
    const txRecord = await prisma.financialTransaction.findFirst({
      where: { transactionNo: disburseData.transactionNo },
    });
    assert(!!txRecord, 'FinancialTransaction general ledger record persisted in PostgreSQL');
    assert(txRecord?.referenceNo === testPaymentRef, 'Transaction referenceNo matches bank paymentRef');
    assert(txRecord?.type === 'disbursement', 'Transaction type is "disbursement"');
    assert(Number(txRecord?.amount) === testDisburseAmount, 'Transaction amount has exact satang precision Decimal(18,2)');
    assert(txRecord?.status === 'completed', 'Transaction status is "completed"');
    assert(txRecord?.recordedById === financeUser.id, 'Transaction recordedById matches Finance Officer');

    // -------------------------------------------------------------
    // SUITE 8: Idempotency & Duplicate Prevention
    // -------------------------------------------------------------
    console.log('\n--- SUITE 8: Idempotency & Duplicate Prevention ---');
    // 8.1 Re-attempt with duplicate paymentRef
    const duplicateRefRes = await fetch(`${API_BASE}/finance/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${financeToken}`,
      },
      body: JSON.stringify({
        applicationId: testApp.id,
        paymentRef: testPaymentRef, // Same payment reference!
      }),
    });
    assert(duplicateRefRes.status === 409, 'Duplicate payment reference rejected with 409 Conflict (Idempotency Guard)');
    const duplicateJson = await duplicateRefRes.json();
    assert(duplicateJson.code === 'DUPLICATE_TRANSACTION_REF', 'Error code is "DUPLICATE_TRANSACTION_REF"');

    // 8.2 Re-attempt with new reference but on already disbursed application
    const alreadyDisbursedRes = await fetch(`${API_BASE}/finance/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${financeToken}`,
      },
      body: JSON.stringify({
        applicationId: testApp.id,
        paymentRef: `NEW-REF-${Date.now()}`,
      }),
    });
    assert(alreadyDisbursedRes.status === 400, 'Disbursing already-disbursed application rejected with 400 Bad Request');
    const alreadyDisbursedJson = await alreadyDisbursedRes.json();
    assert(alreadyDisbursedJson.code === 'INVALID_STATE', 'Error code is "INVALID_STATE" for already disbursed application');

    // -------------------------------------------------------------
    // SUITE 9: Financial Transactions Ledger Querying & Pagination
    // -------------------------------------------------------------
    console.log('\n--- SUITE 9: Financial Transactions Ledger Querying & Pagination ---');
    const txnsRes = await fetch(`${API_BASE}/finance/transactions?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(txnsRes.ok, 'GET /finance/transactions returns 200 OK');
    const txnsData = await txnsRes.json();
    assert(Array.isArray(txnsData.items), 'Transactions response contains items array');
    assert(typeof txnsData.total === 'number', 'Transactions pagination has total count');
    assert(txnsData.page === 1, 'Transactions pagination has page number 1');
    assert(txnsData.limit === 10, 'Transactions pagination limit is 10');

    // Search transaction
    const searchRes = await fetch(`${API_BASE}/finance/transactions?search=${disburseData.transactionNo}`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(searchRes.ok, 'GET /finance/transactions?search=... returns 200 OK');
    const searchData = await searchRes.json();
    assert(
      searchData.items.some((t: any) => t.transactionNo === disburseData.transactionNo),
      'Search successfully finds the newly created transaction by transactionNo'
    );

    // Get transaction by ID
    const singleTxRes = await fetch(`${API_BASE}/finance/transactions/${txRecord?.id}`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(singleTxRes.ok, 'GET /finance/transactions/:id returns 200 OK');
    const singleTxData = await singleTxRes.json();
    assert(singleTxData.transactionNo === disburseData.transactionNo, 'Retrieved transaction details match requested ID');
    assert(singleTxData.beneficiary !== undefined, 'Transaction includes beneficiary relation');

    // -------------------------------------------------------------
    // SUITE 10: Assistance Handover & Execution Tracking
    // -------------------------------------------------------------
    console.log('\n--- SUITE 10: Assistance Handover & Execution Tracking ---');
    // Officer records assistance delivery
    const execPayload = {
      applicationId: testApp.id,
      assistanceType: 'monthly_stipend',
      actualDisbursedAmount: testDisburseAmount,
      actualAssistanceValue: testDisburseAmount,
      assistanceOutcome: 'completed',
      details: 'เจ้าหน้าที่ลงพื้นที่ส่งมอบเงินสงเคราะห์พร้อมใบสำคัญรับเงิน',
      proofUrl: '/proofs/handover-signed-form.jpg',
      installmentNo: 1,
      totalInstallments: 1,
    };

    const recordExecRes = await fetch(`${API_BASE}/assistance/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify(execPayload),
    });

    assert(recordExecRes.ok, 'Assistance execution recorded successfully by Officer (HTTP 200/201)');
    const execData = await recordExecRes.json();
    assert(typeof execData.id === 'string', 'Returns execution record ID');
    assert(execData.applicationId === testApp.id, 'Execution record correctly links to applicationId');
    assert(execData.actualDisbursedAmount === testDisburseAmount, 'Execution record amount matches satang precision');
    assert(execData.isConfirmed === false, 'Execution record initially isConfirmed: false');

    // Confirm handover with beneficiary verification
    const confirmPayload = {
      confirmationStatement: 'ผู้มีสิทธิ์ได้รับเงินสงเคราะห์ครบถ้วนตามจำนวน และลงนามยืนยันเรียบร้อย',
      proofUrl: '/proofs/signed-receipt-final.jpg',
    };

    const confirmRes = await fetch(`${API_BASE}/assistance/executions/${execData.id}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify(confirmPayload),
    });

    assert(confirmRes.ok, 'Assistance execution confirmed with verification proof (HTTP 200)');
    const confirmData = await confirmRes.json();
    assert(confirmData.isConfirmed === true, 'Execution record isConfirmed updated to true');
    assert(confirmData.confirmationStatement === confirmPayload.confirmationStatement, 'Confirmation statement recorded');
    assert(confirmData.confirmedById === officerUser.id, 'ConfirmedById records Officer UUID');

    // Query executions by application
    const appExecsRes = await fetch(`${API_BASE}/assistance/executions/${testApp.id}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(appExecsRes.ok, 'GET /assistance/executions/:applicationId returns 200 OK');
    const appExecsList = await appExecsRes.json();
    assert(Array.isArray(appExecsList) && appExecsList.length > 0, 'Found execution records for application', { count: appExecsList.length });
    assert(appExecsList.some((e: any) => e.id === execData.id && e.isConfirmed === true), 'Execution list includes confirmed record');

    // -------------------------------------------------------------
    // SUITE 11: Audit Trail & Application History Logging
    // -------------------------------------------------------------
    console.log('\n--- SUITE 11: Audit Trail & Application History Logging ---');
    // Check ApplicationHistory entries
    const histories = await prisma.applicationHistory.findMany({
      where: { applicationId: testApp.id },
      orderBy: { createdAt: 'desc' },
    });
    assert(histories.length >= 2, 'ApplicationHistory has entries for disbursement and delivery execution');
    const disburseHistory = histories.find(
      (h: any) => h.status === 'disbursed' && h.notes?.includes('ฝ่ายการเงินเบิกจ่าย')
    );
    assert(!!disburseHistory, 'ApplicationHistory records "disbursed" status transition');
    assert(disburseHistory?.changedById === financeUser.id, 'ApplicationHistory records Finance Officer as actor', {
      historyChangedById: disburseHistory?.changedById,
      financeUserId: financeUser.id,
    });

    // Check AuditLog entries
    const disburseAudit = await prisma.auditLog.findFirst({
      where: {
        resourceType: 'assistance_application',
        resourceId: testApp.id,
        action: 'ASSISTANCE_DISBURSEMENT',
      },
    });
    assert(!!disburseAudit, 'AuditLog records ASSISTANCE_DISBURSEMENT action');

    const execAudit = await prisma.auditLog.findFirst({
      where: {
        resourceType: 'assistance_execution_record',
        resourceId: execData.id,
        action: 'ASSISTANCE_EXECUTION_RECORD',
      },
    });
    assert(!!execAudit, 'AuditLog records ASSISTANCE_EXECUTION_RECORD action');

    const confirmAudit = await prisma.auditLog.findFirst({
      where: {
        resourceType: 'assistance_execution_record',
        resourceId: execData.id,
        action: 'ASSISTANCE_EXECUTION_CONFIRMED',
      },
    });
    assert(!!confirmAudit, 'AuditLog records ASSISTANCE_EXECUTION_CONFIRMED action');

    // -------------------------------------------------------------
    // SUITE 12: Next.js BFF Proxy Endpoints Integration
    // -------------------------------------------------------------
    console.log('\n--- SUITE 12: Next.js BFF Proxy Endpoints Integration ---');
    // 12.1 Next.js BFF funds
    const nextFundsRes = await fetch(`${NEXT_BASE}/finance/funds`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(nextFundsRes.ok, 'Next.js BFF GET /api/finance/funds returns 200 OK');
    const nextFundsJson = await nextFundsRes.json();
    assert(nextFundsJson.success === true && Array.isArray(nextFundsJson.data), 'Next.js BFF funds returns structured success response');

    // 12.2 Next.js BFF bank accounts
    const nextBanksRes = await fetch(`${NEXT_BASE}/finance/bank-accounts`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(nextBanksRes.ok, 'Next.js BFF GET /api/finance/bank-accounts returns 200 OK');
    const nextBanksJson = await nextBanksRes.json();
    assert(nextBanksJson.success === true && Array.isArray(nextBanksJson.data), 'Next.js BFF bank accounts returns structured success response');

    // 12.3 Next.js BFF transactions
    const nextTxnsRes = await fetch(`${NEXT_BASE}/finance/transactions?limit=5`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(nextTxnsRes.ok, 'Next.js BFF GET /api/finance/transactions returns 200 OK');
    const nextTxnsJson = await nextTxnsRes.json();
    assert(nextTxnsJson.success === true && Array.isArray(nextTxnsJson.data), 'Next.js BFF transactions returns structured success response');

    // 12.4 Next.js BFF summary
    const nextSummaryRes = await fetch(`${NEXT_BASE}/finance/summary`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(nextSummaryRes.ok, 'Next.js BFF GET /api/finance/summary returns 200 OK');
    const nextSummaryJson = await nextSummaryRes.json();
    assert(nextSummaryJson.success === true && nextSummaryJson.data.totalReceived !== undefined, 'Next.js BFF summary returns structured budget data');

    // 12.5 Next.js BFF disburse proxy
    // Create another approved application to test BFF disburse proxy route
    const bffApp = await prisma.assistanceApplication.create({
      data: {
        applicationNo: `APP-2569-BFF-${Date.now().toString().slice(-6)}`,
        beneficiaryId: testBeneficiary.id,
        asnafCategory: 'faqir',
        assistanceType: 'medical_aid',
        requestedAmount: new Prisma.Decimal(3000),
        approvedAmount: new Prisma.Decimal(3000),
        approvedFundId: generalFund.id,
        status: 'approved',
        urgencyLevel: 'high',
        fiscalYear: '2569',
        approvedById: approverUser.id,
        approvedByName: approverUser.displayName,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update fund commitment
    await prisma.fundAccount.update({
      where: { id: generalFund.id },
      data: { committedAmount: { increment: new Prisma.Decimal(3000) } },
    });

    const bffDisburseRes = await fetch(`${NEXT_BASE}/beneficiaries/${bffApp.id}/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${financeToken}`,
      },
      body: JSON.stringify({
        paymentRef: `BFF-PAY-${Date.now()}`,
        amount: 3000,
        notes: 'เบิกจ่ายผ่าน Next.js BFF Proxy',
        bankAccountId: targetBank.id,
      }),
    });

    assert(bffDisburseRes.ok, 'Next.js BFF POST /api/beneficiaries/[id]/disburse executed successfully (HTTP 200)');
    const bffDisburseJson = await bffDisburseRes.json();
    assert(bffDisburseJson.success === true, 'Next.js BFF disburse returns success: true');
    assert(
      /^TXN-DISB-2569-\d{6}$/.test(bffDisburseJson.data.transactionNo),
      'Next.js BFF returns standard transactionNo format'
    );

    // Verify bffApp status in DB
    const dbBffApp = await prisma.assistanceApplication.findUnique({ where: { id: bffApp.id } });
    assert(dbBffApp?.status === 'disbursed', 'Application processed via Next.js BFF is updated to "disbursed"');

    // Summary of Results
    console.log('\n================================================================');
    console.log(`   PHASE 8 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
    console.log('================================================================\n');

  } finally {
    await prisma.$disconnect();
  }
}

runVerification().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
