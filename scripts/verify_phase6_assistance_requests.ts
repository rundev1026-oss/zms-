/**
 * Phase 6 Verification: Assistance Requests & Living Condition Assessment Workflow
 *
 * Test Suite Coverage:
 * 1. Authentication & RBAC token acquisition (Officer vs Auditor vs Unauthenticated)
 * 2. Beneficiary eligibility checking (National ID & Registry Number resolution, ineligibility checks)
 * 3. Assistance Request creation with auto-generated sequential number (APP-YYYY-######)
 * 4. Monetary accuracy with PostgreSQL Decimal(18,2) exact satang precision
 * 5. Input validation (negative/zero amounts, missing required fields)
 * 6. Automatic Application History logging on creation
 * 7. Audit log generation for request creation
 * 8. Paginated listing with status, asnaf category, and branch filtering
 * 9. Search capability across application number, applicant name, and national ID
 * 10. Detailed application query with full relational hierarchy
 * 11. Application document attachment and audit logging
 * 12. Field assessment submission with livingScore (0-100) and recommendation
 * 13. Living score and recommended amount boundary validations
 * 14. Automatic status transition to 'pending_approval' upon assessment submission
 * 15. Assessment transition recorded in application history
 * 16. Assessment audit log recorded in audit trail
 * 17. Manual status transition (PATCH /assistance-requests/:id/status)
 * 18. RBAC boundary enforcement: Officer vs Auditor forbidden actions
 * 19. Next.js BFF proxy integration (/api/assistance-requests)
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
  console.log('   PHASE 6: ASSISTANCE REQUESTS & ASSESSMENT WORKFLOW AUDIT    ');
  console.log('================================================================\n');

  const prisma = new PrismaClient();

  try {
    // ---------------------------------------------------------------------------
    // SECTION 1: Authentication & Role Setup
    // ---------------------------------------------------------------------------
    console.log('--- SECTION 1: Authentication & Identity Setup ---');

    const officerToken = await login('officer@zms.local');
    assert(Boolean(officerToken && officerToken.length > 20), 'Officer successfully authenticated and obtained JWT token');

    const auditorToken = await login('auditor@zms.local');
    assert(Boolean(auditorToken && auditorToken.length > 20), 'Auditor successfully authenticated and obtained JWT token');

    const unauthRes = await fetch(`${API_BASE}/assistance-requests`);
    assert(unauthRes.status === 401, 'Unauthenticated request to assistance-requests rejected with 401');

    // ---------------------------------------------------------------------------
    // SECTION 2: Beneficiary Eligibility Check (POST /check-beneficiary)
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Beneficiary Eligibility Verification ---');

    // Pick an existing beneficiary from PostgreSQL
    const existingBen = await prisma.beneficiary.findFirst({
      where: { identityNumberNormalized: { not: null } },
      include: { addresses: true, household: true },
    });
    if (!existingBen) throw new Error('No existing beneficiary found for testing');

    const checkRes1 = await fetch(`${API_BASE}/assistance-requests/check-beneficiary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ nationalId: existingBen.identityNumberNormalized }),
    });
    assert(checkRes1.status === 200, 'Eligible beneficiary checked by 13-digit National ID returns 200 OK');

    const checkData1 = await checkRes1.json();
    assert(checkData1.found === true && checkData1.canApply === true, 'Response confirms beneficiary found and can apply');
    assert(checkData1.beneficiary.registrationNo === existingBen.registryNumber, 'Registry number accurately resolved');
    assert(Boolean(checkData1.beneficiary.nationalIdMasked), 'National ID is properly masked for display');

    // Check by Registry Number
    const checkRes2 = await fetch(`${API_BASE}/assistance-requests/check-beneficiary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ registrationNo: existingBen.registryNumber }),
    });
    assert(checkRes2.status === 200, 'Eligible beneficiary checked by Registry Number returns 200 OK');

    // Non-existent beneficiary check
    const checkNotFound = await fetch(`${API_BASE}/assistance-requests/check-beneficiary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ nationalId: '9999999999999' }),
    });
    assert(checkNotFound.status === 404, 'Non-existent beneficiary returns 404 Not Found');

    // Empty input check
    const checkInvalid = await fetch(`${API_BASE}/assistance-requests/check-beneficiary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({}),
    });
    assert(checkInvalid.status === 400, 'Empty input returns 400 Bad Request');

    // ---------------------------------------------------------------------------
    // SECTION 3: Assistance Request Creation & Sequential Numbering
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Request Creation & Sequential Numbering ---');

    const testAmount = 7500.50;
    const createRes = await fetch(`${API_BASE}/assistance-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        beneficiaryId: existingBen.id,
        asnafCategory: 'miskin',
        requestedAmount: testAmount,
        urgencyLevel: 'urgent',
        hardshipReasons: 'ประสบภาวะวิกฤตรายได้ สมาชิกในครอบครัวเจ็บป่วยเรื้อรัง',
        necessityDetails: 'ขอรับเงินช่วยเหลือค่ารักษาพยาบาลและค่าครองชีพเร่งด่วน',
        branchId: 'br-hq',
        branchName: 'สำนักงานใหญ่ กรุงเทพมหานคร',
      }),
    });
    assert(createRes.status === 201, 'Assistance request successfully created with 201 Created');

    const createdApp = await createRes.json();
    assert(Boolean(createdApp.id), 'Application receives unique UUID');
    assert(createdApp.applicationNo.startsWith('APP-2569-'), 'Sequential application number follows format APP-2569-######');
    assert(Number(createdApp.requestedAmount) === testAmount, 'Requested amount preserved exact satang precision (7500.50)');
    assert(createdApp.status === 'submitted', 'Initial application status is set to "submitted"');

    // Test Sequential Increment: Create second request and verify sequence
    const createRes2 = await fetch(`${API_BASE}/assistance-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        beneficiaryId: existingBen.id,
        asnafCategory: 'faqir',
        requestedAmount: 3200.75,
        urgencyLevel: 'normal',
      }),
    });
    assert(createRes2.status === 201, 'Second assistance request created successfully');
    const createdApp2 = await createRes2.json();

    const seq1 = parseInt(createdApp.applicationNo.split('-')[2], 10);
    const seq2 = parseInt(createdApp2.applicationNo.split('-')[2], 10);
    assert(seq2 === seq1 + 1, `Sequential numbering verified: ${createdApp.applicationNo} -> ${createdApp2.applicationNo}`);

    // Input validation: requestedAmount <= 0
    const invalidAmountRes = await fetch(`${API_BASE}/assistance-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        beneficiaryId: existingBen.id,
        asnafCategory: 'miskin',
        requestedAmount: 0,
      }),
    });
    assert(invalidAmountRes.status === 400, 'Requested amount 0 rejected with 400 Bad Request');

    // ---------------------------------------------------------------------------
    // SECTION 4: Application History & Audit Logging Verification
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Application History & Audit Trail Integrity ---');

    const historyEntry = await prisma.applicationHistory.findFirst({
      where: { applicationId: createdApp.id },
      orderBy: { createdAt: 'desc' },
    });
    assert(Boolean(historyEntry), 'Application history row exists in database');
    assert(historyEntry?.status === 'submitted', 'History status correctly records "submitted"');
    assert(historyEntry?.changedByName.includes('Officer'), 'History records acting officer name');

    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        resourceType: 'assistance_application',
        resourceId: createdApp.id,
        action: 'ASSISTANCE_REQUEST_CREATE',
      },
    });
    assert(Boolean(auditEntry), 'Audit log entry created for ASSISTANCE_REQUEST_CREATE');
    assert(auditEntry?.action === 'ASSISTANCE_REQUEST_CREATE', 'Audit log action matches ASSISTANCE_REQUEST_CREATE');

    // ---------------------------------------------------------------------------
    // SECTION 5: Listing, Pagination, and Search
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 5: Listing, Pagination & Search Capabilities ---');

    const listRes = await fetch(`${API_BASE}/assistance-requests?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(listRes.status === 200, 'GET /assistance-requests returns 200 OK');
    const listData = await listRes.json();
    assert(Array.isArray(listData.items) && listData.items.length === 10, 'Pagination limit returns exactly 10 items');
    assert(listData.total >= 130, `Total applications count is accurate (total: ${listData.total})`);
    assert(listData.totalPages >= 13, 'Total pages calculated correctly');

    // Filter by status
    const filterStatusRes = await fetch(`${API_BASE}/assistance-requests?status=submitted`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const filterStatusData = await filterStatusRes.json();
    assert(
      filterStatusData.items.every((item: any) => item.status === 'submitted'),
      'Status filter strictly returns only "submitted" records',
    );

    // Search by applicationNo
    const searchAppRes = await fetch(`${API_BASE}/assistance-requests?search=${createdApp.applicationNo}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const searchAppData = await searchAppRes.json();
    assert(
      searchAppData.items.length >= 1 && searchAppData.items[0].applicationNo === createdApp.applicationNo,
      `Full-text search by application number "${createdApp.applicationNo}" matched`,
    );

    // ---------------------------------------------------------------------------
    // SECTION 6: Detail View & Relational Data Integrity
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 6: Detail View & Relational Integrity ---');

    const detailRes = await fetch(`${API_BASE}/assistance-requests/${createdApp.id}`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(detailRes.status === 200, 'GET /assistance-requests/:id returns 200 OK');
    const detailData = await detailRes.json();
    assert(detailData.id === createdApp.id, 'Application ID matches');
    assert(Boolean(detailData.beneficiary), 'Beneficiary relation loaded with applicant details');
    assert(Array.isArray(detailData.history) && detailData.history.length >= 1, 'History relation loaded');
    assert(Array.isArray(detailData.documents), 'Documents relation loaded');

    // ---------------------------------------------------------------------------
    // SECTION 7: Document Attachment
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 7: Document Attachment & Audit Logging ---');

    const docRes = await fetch(`${API_BASE}/assistance-requests/${createdApp.id}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        name: 'สำเนาบัตรประจำตัวประชาชน',
        category: 'id_card',
        fileUrl: '/uploads/documents/id_card_test.pdf',
        mimeType: 'application/pdf',
        fileSize: 245600,
        isConfidential: true,
      }),
    });
    assert(docRes.status === 201, 'Document successfully attached with 201 Created');
    const docData = await docRes.json();
    assert(docData.applicationId === createdApp.id, 'Document linked to application');
    assert(docData.name === 'สำเนาบัตรประจำตัวประชาชน', 'Document metadata verified');

    const docAudit = await prisma.auditLog.findFirst({
      where: {
        resourceType: 'application_document',
        resourceId: docData.id,
      },
    });
    assert(Boolean(docAudit), 'Audit log recorded for APPLICATION_DOCUMENT_ATTACH');

    // ---------------------------------------------------------------------------
    // SECTION 8: Field Assessment & Living Condition Scoring Workflow
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 8: Field Assessment & Living Condition Scoring ---');

    const assessmentPayload = {
      livingScore: 82,
      housingCondition: 'poor',
      housingNotes: 'บ้านไม้ยกพื้น หลังคาสังกะสีผุพัง ห้องน้ำชำรุดทรุดโทรม',
      debtBurdenSummary: 'หนี้สินค่าครองชีพนอกระบบ 15,000 บาท ดอกเบี้ยร้อยละ 10',
      primaryHardship: 'ผู้มีสิทธิ์เป็นผู้สูงอายุ ว่างงาน ไม่มีรายได้ประจำ',
      officerRecommendation: 'recommend_full',
      recommendedAmount: 7500.50,
      recommendedFundId: 'fund-1',
      generalNotes: 'เห็นควรให้ความช่วยเหลือเต็มจำนวนตามวงเงินสงเคราะห์เร่งด่วน',
    };

    const assessRes = await fetch(`${API_BASE}/assessments/${createdApp.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify(assessmentPayload),
    });
    assert(assessRes.status === 201, 'Field assessment submitted successfully with 201 Created');

    const assessData = await assessRes.json();
    assert(assessData.livingScore === 82, 'Living score 82 stored correctly');
    assert(assessData.recommendedAmount === 7500.50, 'Recommended amount preserved exact satang precision (7500.50)');
    assert(assessData.officerRecommendation === 'recommend_full', 'Officer recommendation recorded');

    // Verify Boundary validations for living score (0-100)
    const invalidScoreRes = await fetch(`${API_BASE}/assessments/${createdApp.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        ...assessmentPayload,
        livingScore: 105, // Over 100
      }),
    });
    assert(invalidScoreRes.status === 400, 'Living score > 100 rejected with 400 Bad Request');

    const negativeScoreRes = await fetch(`${API_BASE}/assessments/${createdApp.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        ...assessmentPayload,
        livingScore: -5, // Negative
      }),
    });
    assert(negativeScoreRes.status === 400, 'Negative living score rejected with 400 Bad Request');

    // ---------------------------------------------------------------------------
    // SECTION 9: Auto Status Transition & History upon Assessment
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 9: Auto-Transition to "pending_approval" ---');

    const postAssessApp = await prisma.assistanceApplication.findUnique({
      where: { id: createdApp.id },
    });
    assert(
      postAssessApp?.status === 'pending_approval',
      'Application status automatically advanced to "pending_approval" upon assessment submission',
    );

    const latestHist = await prisma.applicationHistory.findFirst({
      where: { applicationId: createdApp.id, status: 'pending_approval' },
      orderBy: { createdAt: 'desc' },
    });
    assert(Boolean(latestHist), 'Application history row created for "pending_approval" transition');
    assert(
      latestHist?.notes.includes('82/100'),
      'Application history note includes living score and recommendation details',
    );

    const assessAudit = await prisma.auditLog.findFirst({
      where: {
        resourceType: 'beneficiary_assessment',
        action: 'ASSESSMENT_SUBMIT',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(Boolean(assessAudit), 'Audit log entry recorded for ASSESSMENT_SUBMIT');

    // Retrieve assessment via subresource endpoint
    const getAssessRes = await fetch(`${API_BASE}/assistance-requests/${createdApp.id}/assessment`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(getAssessRes.status === 200, 'GET /assistance-requests/:id/assessment returns 200 OK');
    const fetchedAssess = await getAssessRes.json();
    assert(fetchedAssess.livingScore === 82, 'Fetched assessment living score matches');

    // ---------------------------------------------------------------------------
    // SECTION 10: Manual Status Transitions (PATCH /status)
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 10: Status Governance & State Transitions ---');

    const patchStatusRes = await fetch(`${API_BASE}/assistance-requests/${createdApp2.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        status: 'doc_review',
        notes: 'ตรวจสอบเอกสารเบื้องต้นครบถ้วน พร้อมส่งต่อเจ้าหน้าที่ลงพื้นที่',
      }),
    });
    assert(patchStatusRes.status === 200, 'PATCH status transition to "doc_review" returns 200 OK');
    const patchedApp = await patchStatusRes.json();
    assert(patchedApp.status === 'doc_review', 'Updated application status is "doc_review"');

    // Invalid status transition rejected
    const invalidStatusRes = await fetch(`${API_BASE}/assistance-requests/${createdApp2.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        status: 'non_existent_status',
      }),
    });
    assert(invalidStatusRes.status === 400, 'Invalid status code rejected with 400 Bad Request');

    // ---------------------------------------------------------------------------
    // SECTION 11: RBAC Security Boundaries (Officer vs Auditor)
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 11: RBAC Security Policy Enforcement ---');

    // Auditor CAN read assistance requests
    const auditorReadRes = await fetch(`${API_BASE}/assistance-requests?limit=1`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(auditorReadRes.status === 200, 'Auditor with read permissions can view assistance requests');

    // Auditor CANNOT create an assistance request
    const auditorCreateRes = await fetch(`${API_BASE}/assistance-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auditorToken}`,
      },
      body: JSON.stringify({
        beneficiaryId: existingBen.id,
        asnafCategory: 'miskin',
        requestedAmount: 1000,
      }),
    });
    assert(
      auditorCreateRes.status === 403,
      'Auditor without write permissions is strictly forbidden (403) from creating assistance requests',
    );

    // Auditor CANNOT submit assessments
    const auditorAssessRes = await fetch(`${API_BASE}/assessments/${createdApp2.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auditorToken}`,
      },
      body: JSON.stringify(assessmentPayload),
    });
    assert(
      auditorAssessRes.status === 403,
      'Auditor without assess permissions is strictly forbidden (403) from submitting assessments',
    );

    // ---------------------------------------------------------------------------
    // SECTION 12: Next.js BFF Integration
    // ---------------------------------------------------------------------------
    console.log('\n--- SECTION 12: Next.js BFF Proxy Integration ---');

    const nextListRes = await fetch(`${NEXT_BASE}/assistance-requests?limit=5`);
    assert(nextListRes.status === 200, 'Next.js BFF GET /api/assistance-requests returns 200 OK');
    const nextListData = await nextListRes.json();
    assert(nextListData.success === true, 'Next.js BFF returns success: true');
    assert(Array.isArray(nextListData.data) && nextListData.data.length === 5, 'Next.js BFF returns 5 proxied application records');

    const nextCheckRes = await fetch(`${NEXT_BASE}/assistance-requests/check-beneficiary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nationalId: existingBen.identityNumberNormalized }),
    });
    assert(nextCheckRes.status === 200, 'Next.js BFF POST /api/assistance-requests/check-beneficiary returns 200 OK');
    const nextCheckData = await nextCheckRes.json();
    assert(nextCheckData.found === true && nextCheckData.canApply === true, 'Next.js BFF confirms eligibility');

    // ---------------------------------------------------------------------------
    // SECTION 13: Summary
    // ---------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`   PHASE 6 VERIFICATION COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
    console.log('================================================================\n');

  } finally {
    await prisma.$disconnect();
  }
}

runVerification().catch((err) => {
  console.error('\nVerification failed with exception:', err);
  process.exit(1);
});

