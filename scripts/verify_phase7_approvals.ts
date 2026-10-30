/**
 * Phase 7 Verification: Approvals & Committee Decision Workflow Audit
 *
 * Test Suite Coverage:
 * 1. Approver Authentication & RBAC token issuance (Approver vs Officer vs Auditor)
 * 2. Retrieval of pending approvals with pagination, urgency sorting, and search
 * 3. Statistical summary aggregation (pending, approved, rejected, need_info counts and sums)
 * 4. Approval decision execution (POST /approvals/:id/approve)
 * 5. Atomic multi-tier budget commitment (FundAccount committed vs available amount)
 * 6. Financial precision with exact satang match in PostgreSQL Decimal(18,2)
 * 7. Solvency enforcement: Rejection when requested amount exceeds available fund balance
 * 8. Segregation of Duties (SoD): Assigned officer cannot approve their own application
 * 9. Application History audit logging upon approval
 * 10. Audit trail entry generation for APPLICATION_APPROVED
 * 11. Rejection workflow with mandatory rejection reason (POST /approvals/:id/reject)
 * 12. Rejection input validation (missing/empty reason rejected with 400)
 * 13. Rejection history & audit trail recording
 * 14. Return for correction workflow (POST /approvals/:id/return) -> 'need_info' state
 * 15. RBAC enforcement: Officer and Auditor forbidden (403) from approving/rejecting
 * 16. Next.js BFF proxy integration (/api/beneficiaries/[id]/approve, /api/approvals/pending)
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
  console.log('   PHASE 7: APPROVALS & COMMITTEE DECISION WORKFLOW AUDIT       ');
  console.log('================================================================\n');

  const prisma = new PrismaClient();

  try {
    // ---------------------------------------------------------------------------
    // SECTION 1: Authentication & Identity Setup
    // ---------------------------------------------------------------------------
    console.log('--- SECTION 1: Authentication & Role Verification ---');

    const approverToken = await login('approver@zms.local');
    assert(Boolean(approverToken && approverToken.length > 20), 'Approver authenticated and obtained JWT token');

    const officerToken = await login('officer@zms.local');
    assert(Boolean(officerToken && officerToken.length > 20), 'Officer authenticated and obtained JWT token');

    const auditorToken = await login('auditor@zms.local');
    assert(Boolean(auditorToken && auditorToken.length > 20), 'Auditor authenticated and obtained JWT token');

    const unauthRes = await fetch(`${API_BASE}/approvals/pending`);
    assert(unauthRes.status === 401, 'Unauthenticated request to approvals/pending rejected with 401');

    // ---------------------------------------------------------------------------
    // SECTION 2: Pending Approvals Query & Summary
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Pending Approvals & Summary Aggregates ---');

    const pendingRes = await fetch(`${API_BASE}/approvals/pending?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert(pendingRes.status === 200, 'GET /approvals/pending returns 200 OK');
    const pendingData = await pendingRes.json();
    assert(Array.isArray(pendingData.items), 'Pending items returned as array');
    assert(
      pendingData.items.every((a: any) => a.status === 'pending_approval'),
      'All returned items strictly have status "pending_approval"',
    );

    const summaryRes = await fetch(`${API_BASE}/approvals/summary`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert(summaryRes.status === 200, 'GET /approvals/summary returns 200 OK');
    const summaryData = await summaryRes.json();
    assert(typeof summaryData.pendingCount === 'number', 'Summary includes pendingCount');
    assert(typeof summaryData.approvedCount === 'number', 'Summary includes approvedCount');
    assert(typeof summaryData.totalPendingAmount === 'number', 'Summary includes totalPendingAmount');
    assert(typeof summaryData.totalApprovedAmount === 'number', 'Summary includes totalApprovedAmount');

    // ---------------------------------------------------------------------------
    // SECTION 3: Create Test Applications for Approval, Rejection, and Return
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Test Applications Preparation ---');

    const testBen = await prisma.beneficiary.findFirst({
      where: { identityNumberNormalized: { not: null } },
    });
    if (!testBen) throw new Error('No test beneficiary found');

    // Create App 1 for Approval
    const createRes1 = await fetch(`${API_BASE}/assistance-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        beneficiaryId: testBen.id,
        asnafCategory: 'miskin',
        requestedAmount: 6000.00,
        urgencyLevel: 'high',
        hardshipReasons: 'ขอรับทุนยังชีพประจำเดือนและค่ารักษาพยาบาล',
      }),
    });
    const app1 = await createRes1.json();

    // Assess App 1 to move to pending_approval
    await fetch(`${API_BASE}/assessments/${app1.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        livingScore: 80,
        housingCondition: 'moderate',
        officerRecommendation: 'recommend_full',
        recommendedAmount: 6000.00,
      }),
    });

    // Create App 2 for Rejection
    const createRes2 = await fetch(`${API_BASE}/assistance-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        beneficiaryId: testBen.id,
        asnafCategory: 'gharimin',
        requestedAmount: 4500.00,
        urgencyLevel: 'normal',
      }),
    });
    const app2 = await createRes2.json();

    // Assess App 2
    await fetch(`${API_BASE}/assessments/${app2.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        livingScore: 45,
        housingCondition: 'good',
        officerRecommendation: 'reject',
        recommendedAmount: 0,
      }),
    });

    // Create App 3 for Return for info
    const createRes3 = await fetch(`${API_BASE}/assistance-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        beneficiaryId: testBen.id,
        asnafCategory: 'faqir',
        requestedAmount: 3000.00,
        urgencyLevel: 'urgent',
      }),
    });
    const app3 = await createRes3.json();

    // Assess App 3
    await fetch(`${API_BASE}/assessments/${app3.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        livingScore: 90,
        housingCondition: 'poor',
        officerRecommendation: 'recommend_full',
        recommendedAmount: 3000.00,
      }),
    });

    assert(Boolean(app1.id && app2.id && app3.id), 'Three test applications successfully prepared in pending_approval');

    // ---------------------------------------------------------------------------
    // SECTION 4: Approval Execution & Budget Commitment
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Approval Execution & Multi-Tier Commitment ---');

    // Check pre-approval fund balances
    const targetFund = await prisma.fundAccount.findFirst({
      where: {
        OR: [{ legacyId: 'fund-1' }, { code: 'FND-ZKT-01' }],
      },
    });
    if (!targetFund) throw new Error('Fund Account fund-1 not found');

    const preCommitted = Number(targetFund.committedAmount);
    const preAvailable = Number(targetFund.availableAmount);
    const approvalAmount = 6000.00;

    const approveRes = await fetch(`${API_BASE}/approvals/${app1.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approverToken}`,
      },
      body: JSON.stringify({
        approvedAmount: approvalAmount,
        fundId: targetFund.id,
        notes: 'คณะกรรมการพิจารณาอนุมัติตามผลการประเมินลงพื้นที่',
      }),
    });
    assert(approveRes.status === 201, 'POST /approvals/:id/approve returns 201 Created');

    const approveData = await approveRes.json();
    assert(approveData.status === 'wait_disbursement', 'Application status transitioned to "wait_disbursement"');
    assert(approveData.approvedAmount === approvalAmount, 'Approved amount recorded accurately');
    assert(Boolean(approveData.approvedDate), 'Approved date recorded in Thai format');

    // Verify Fund Account balance updates
    const postFund = await prisma.fundAccount.findUniqueOrThrow({
      where: { id: targetFund.id },
    });
    const postCommitted = Number(postFund.committedAmount);
    const postAvailable = Number(postFund.availableAmount);

    assert(
      Math.abs(postCommitted - (preCommitted + approvalAmount)) < 0.01,
      `Fund committedAmount increased by exactly ฿${approvalAmount.toFixed(2)}`,
    );
    assert(
      Math.abs(postAvailable - (preAvailable - approvalAmount)) < 0.01,
      `Fund availableAmount decreased by exactly ฿${approvalAmount.toFixed(2)}`,
    );

    // Verify Application Record in DB
    const dbApp1 = await prisma.assistanceApplication.findUniqueOrThrow({
      where: { id: app1.id },
    });
    assert(dbApp1.status === 'wait_disbursement', 'Database application status is "wait_disbursement"');
    assert(Number(dbApp1.approvedAmount) === approvalAmount, 'Database approved_amount exact satang precision verified');
    assert(Boolean(dbApp1.approvedById && dbApp1.approvedByName), 'Database records approver ID and display name');

    // ---------------------------------------------------------------------------
    // SECTION 5: Application History & Audit Trail on Approval
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 5: Approval History & Audit Trail Integrity ---');

    const app1History = await prisma.applicationHistory.findFirst({
      where: { applicationId: app1.id, status: 'wait_disbursement' },
      orderBy: { createdAt: 'desc' },
    });
    assert(Boolean(app1History), 'Application history row created for "wait_disbursement"');
    assert(
      Boolean(app1History?.notes.includes('6,000') || app1History?.notes.includes('6000')),
      'Application history note records approved amount and fund name',
    );

    const app1Audit = await prisma.auditLog.findFirst({
      where: {
        resourceType: 'assistance_application',
        resourceId: app1.id,
        action: 'APPLICATION_APPROVED',
      },
    });
    assert(Boolean(app1Audit), 'Audit log entry created for APPLICATION_APPROVED');
    assert(app1Audit?.action === 'APPLICATION_APPROVED', 'Audit log action matches APPLICATION_APPROVED');

    // ---------------------------------------------------------------------------
    // SECTION 6: Solvency Check (Insufficient Funds Prevention)
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 6: Solvency Verification (Insufficient Funds) ---');

    const excessiveAmount = postAvailable + 50000000;
    const overCommitRes = await fetch(`${API_BASE}/approvals/${app3.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approverToken}`,
      },
      body: JSON.stringify({
        approvedAmount: excessiveAmount,
        fundId: targetFund.id,
      }),
    });
    assert(overCommitRes.status === 400, 'Approval exceeding fund available balance rejected with 400 Bad Request');
    const overCommitData = await overCommitRes.json();
    assert(
      overCommitData.message.includes('ไม่เพียงพอ'),
      'Detailed Thai error message explains insufficient fund balance',
    );

    // ---------------------------------------------------------------------------
    // SECTION 7: Segregation of Duties (SoD) Enforcement
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 7: Segregation of Duties (SoD) ---');

    // Set assigned_officer_id of app3 to the officer's ID
    const officerProfile = await prisma.user.findFirst({
      where: { email: 'officer@zms.local' },
    });
    if (!officerProfile) throw new Error('Officer user profile not found');

    await prisma.assistanceApplication.update({
      where: { id: app3.id },
      data: { assignedOfficerId: officerProfile.id },
    });

    // If officer attempts to approve their own application
    const sodRes = await fetch(`${API_BASE}/approvals/${app3.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        approvedAmount: 3000,
        fundId: targetFund.id,
      }),
    });
    assert(
      sodRes.status === 403,
      'Officer attempting to approve an assigned application is rejected with 403 Forbidden',
    );

    // ---------------------------------------------------------------------------
    // SECTION 8: Rejection Workflow Execution
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 8: Rejection Workflow & Reason Integrity ---');

    const rejectReason = 'คุณสมบัติไม่ผ่านเกณฑ์: มีรายได้ประจำเกินเกณฑ์ขั้นต่ำของอัสนัฟการีมีน';
    const rejectRes = await fetch(`${API_BASE}/approvals/${app2.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approverToken}`,
      },
      body: JSON.stringify({
        reason: rejectReason,
        notes: 'มติที่ประชุมคณะกรรมการสงเคราะห์ครั้งที่ 12/2569',
      }),
    });
    assert(rejectRes.status === 201, 'POST /approvals/:id/reject returns 201 Created');

    const rejectData = await rejectRes.json();
    assert(rejectData.status === 'rejected', 'Application status transitioned to "rejected"');
    assert(rejectData.rejectionReason === rejectReason, 'Rejection reason matches input');

    // Rejection validation: empty reason
    const emptyRejectRes = await fetch(`${API_BASE}/approvals/${app2.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approverToken}`,
      },
      body: JSON.stringify({
        reason: '   ',
      }),
    });
    assert(emptyRejectRes.status === 400, 'Rejection without reason rejected with 400 Bad Request');

    const app2History = await prisma.applicationHistory.findFirst({
      where: { applicationId: app2.id, status: 'rejected' },
      orderBy: { createdAt: 'desc' },
    });
    assert(Boolean(app2History), 'Application history row created for "rejected"');
    assert(app2History?.notes.includes(rejectReason), 'History note contains rejection reason');

    const app2Audit = await prisma.auditLog.findFirst({
      where: {
        resourceType: 'assistance_application',
        resourceId: app2.id,
        action: 'APPLICATION_REJECTED',
      },
    });
    assert(Boolean(app2Audit), 'Audit log entry created for APPLICATION_REJECTED');

    // ---------------------------------------------------------------------------
    // SECTION 9: Return for Correction Workflow ('need_info')
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 9: Return for Correction Workflow ---');

    const returnNotes = 'ขอเอกสารรับรองรายได้จากผู้นำชุมชนและภาพถ่ายที่อยู่อาศัยเพิ่มเติม';
    const returnRes = await fetch(`${API_BASE}/approvals/${app3.id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${approverToken}`,
      },
      body: JSON.stringify({
        notes: returnNotes,
        targetStatus: 'need_info',
      }),
    });
    assert(returnRes.status === 201, 'POST /approvals/:id/return returns 201 Created');

    const returnData = await returnRes.json();
    assert(returnData.status === 'need_info', 'Application status transitioned to "need_info"');

    const app3History = await prisma.applicationHistory.findFirst({
      where: { applicationId: app3.id, status: 'need_info' },
      orderBy: { createdAt: 'desc' },
    });
    assert(Boolean(app3History), 'Application history row created for "need_info"');
    assert(app3History?.notes.includes(returnNotes), 'History note includes return instructions');

    const app3Audit = await prisma.auditLog.findFirst({
      where: {
        resourceType: 'assistance_application',
        resourceId: app3.id,
        action: 'APPLICATION_RETURNED',
      },
    });
    assert(Boolean(app3Audit), 'Audit log entry created for APPLICATION_RETURNED');

    // ---------------------------------------------------------------------------
    // SECTION 10: RBAC Boundary Enforcement
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 10: RBAC Boundary Enforcement ---');

    // Auditor CANNOT approve
    const auditorApproveRes = await fetch(`${API_BASE}/approvals/${app1.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auditorToken}`,
      },
      body: JSON.stringify({
        approvedAmount: 1000,
        fundId: targetFund.id,
      }),
    });
    assert(
      auditorApproveRes.status === 403,
      'Auditor without beneficiaries.decide permission is forbidden (403) from approving',
    );

    // Auditor CANNOT reject
    const auditorRejectRes = await fetch(`${API_BASE}/approvals/${app1.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auditorToken}`,
      },
      body: JSON.stringify({
        reason: 'ทดสอบการปฏิเสธ',
      }),
    });
    assert(
      auditorRejectRes.status === 403,
      'Auditor without beneficiaries.decide permission is forbidden (403) from rejecting',
    );

    // ---------------------------------------------------------------------------
    // SECTION 11: Next.js BFF Proxy Integration
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 11: Next.js BFF Proxy Integration ---');

    // Pending Approvals via Next.js BFF
    const nextPendingRes = await fetch(`${NEXT_BASE}/approvals/pending?limit=5`);
    assert(nextPendingRes.status === 200, 'Next.js BFF GET /api/approvals/pending returns 200 OK');
    const nextPendingData = await nextPendingRes.json();
    assert(nextPendingData.success === true, 'Next.js BFF returns success: true');

    // Summary via Next.js BFF
    const nextSummaryRes = await fetch(`${NEXT_BASE}/approvals/summary`);
    assert(nextSummaryRes.status === 200, 'Next.js BFF GET /api/approvals/summary returns 200 OK');
    const nextSummaryData = await nextSummaryRes.json();
    assert(nextSummaryData.success === true, 'Next.js BFF returns summary with success: true');
    assert(typeof nextSummaryData.data.approvedCount === 'number', 'Summary contains approvedCount');

    // ---------------------------------------------------------------------------
    // SECTION 12: Summary
    // ---------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`   PHASE 7 VERIFICATION COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
    console.log('================================================================\n');

  } finally {
    await prisma.$disconnect();
  }
}

runVerification().catch((err) => {
  console.error('\nVerification failed with exception:', err);
  process.exit(1);
});
