import assert from 'assert';
import { getDb, initDb } from '../src/lib/db.ts';
import { BeneficiaryService } from '../src/services/beneficiaryService.ts';

async function runPhase7Tests() {
  console.log('================================================================');
  console.log('   PHASE 7 TEST SUITE: ASSISTANCE REQUEST WORKFLOW');
  console.log('================================================================');

  await initDb();
  const db = getDb();
  let passedCount = 0;

  // Clean up any previous Phase 7 test artifacts to ensure test idempotency
  await db.execute("DELETE FROM assistance_lifecycle_transitions WHERE application_id LIKE 'app-p7-%'");
  await db.execute("DELETE FROM assistance_applications WHERE id LIKE 'app-p7-%'");
  await db.execute("DELETE FROM beneficiaries WHERE id LIKE 'ben-p7-%' OR national_id LIKE '11002003004%'");
  await db.execute("DELETE FROM financial_transactions WHERE transaction_no LIKE 'TRX-P7-%'");

  // Replenish test fund balance for clean test execution
  await db.execute("UPDATE fund_accounts SET available_amount = 500000 WHERE id = 'fund-1'");
  await db.execute("UPDATE faqir_miskin_sub_funds SET remaining_amount = 500000 WHERE id IN ('subf-1', 'subf-2', 'subf-5')");

  const testActor = {
    id: 'officer-test-1',
    name: 'นายอดิศักดิ์ เจ้าหน้าที่สำรวจ',
    role: 'officer',
  };

  const approverActor = {
    id: 'approver-test-2',
    name: 'ดร.มูฮัมหมัด ประธานกรรมการอนุมัติ',
    role: 'approver',
  };

  const financeActor = {
    id: 'finance-test-3',
    name: 'นางสาวฟาติมะห์ เจ้าหน้าที่การเงิน',
    role: 'finance',
  };

  const superAdminActor = {
    id: 'admin-test-4',
    name: 'ผู้ดูแลระบบสูงสุด ZMS',
    role: 'super_admin',
  };

  const createTestApp = async (opts) => {
    return await BeneficiaryService.registerBeneficiary({
      address: '99/1 หมู่ 3 ซอยมัสยิด',
      province: 'กรุงเทพมหานคร',
      district: 'หนองจอก',
      subdistrict: 'คู้ฝั่งเหนือ',
      community: 'ชุมชนลำหิน',
      postcode: '10530',
      evaluatorChecklist: { idCardVerified: true },
      ...opts,
    }, testActor);
  };

  // -------------------------------------------------------------
  // Group 1: Database Schema & Migration Verification
  // -------------------------------------------------------------
  console.log('\n--- Group 1: Database Schema & Migration Verification ---');
  const colsRes = await db.execute("PRAGMA table_info(assistance_applications)");
  const colNames = colsRes.rows.map(r => r.name);

  const expectedStatuses = [
    'request_status',
    'assessment_status',
    'approval_status',
    'payment_status',
    'delivery_status',
    'followup_status',
    'completion_status',
  ];

  for (const st of expectedStatuses) {
    assert(colNames.includes(st), `Column "${st}" exists in assistance_applications`);
  }
  console.log('  [PASS] All 7 separated lifecycle status columns exist in assistance_applications');
  passedCount++;

  const altTableCheck = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='assistance_lifecycle_transitions'");
  assert(altTableCheck.rows.length === 1, 'Table assistance_lifecycle_transitions exists');
  console.log('  [PASS] Table assistance_lifecycle_transitions exists for audit trail');
  passedCount++;

  // -------------------------------------------------------------
  // Group 2: Step-by-Step Complete Happy Path Workflow Execution
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Step-by-Step Complete Happy Path Workflow ---');
  // Beneficiary setup
  const testBenId = `ben-p7-${Date.now()}`;
  const testAppId = `app-p7-${Date.now()}`;
  const testAppNo = `APP-2569-P7-${Date.now().toString().slice(-4)}`;

  const benReg = await createTestApp({
    applicationId: testAppId,
    applicationNo: testAppNo,
    id: testBenId,
    nationalId: '1100200300401',
    fullName: 'นายอิสมาแอล สมานใจ (ทดสอบ Phase 7)',
    phone: '0891234567',
    primaryGroupCode: 'faqir_miskin',
    asnafCategory: 'miskin',
    assistanceTypeCode: 'HOUSING_REPAIR_BUILD',
    assistanceFormatCode: 'materials',
    requestedAmount: 40000,
  });

  assert(benReg.applicationId === testAppId, 'Application created successfully');

  // Verify Initial 7 Statuses
  let state = await BeneficiaryService.getLifecycleState(testAppId);
  assert(state.statuses.request === 'submitted', '1. Request Status initialized to "submitted"');
  assert(state.statuses.assessment === 'pending', '2. Assessment Status initialized to "pending"');
  assert(state.statuses.approval === 'pending', '3. Approval Status initialized to "pending"');
  assert(state.statuses.payment === 'pending', '4. Payment Status initialized to "pending"');
  assert(state.statuses.delivery === 'pending', '5. Delivery Status initialized to "pending" (materials delivery)');
  assert(state.statuses.followup === 'pending_schedule', '6. Follow-up Status initialized to "pending_schedule"');
  assert(state.statuses.completion === 'active', '7. Completion Status initialized to "active"');
  console.log('  [PASS] Initial 7 lifecycle statuses correctly initialized upon request submission');
  passedCount++;

  // Step 5: Start Field Assessment
  await BeneficiaryService.startAssessment(testAppId, testActor);
  state = await BeneficiaryService.getLifecycleState(testAppId);
  assert(state.statuses.assessment === 'in_assessment', 'Assessment transitions to "in_assessment"');
  console.log('  [PASS] Assessment stage advances to "in_assessment"');
  passedCount++;

  // Step 6: Submit Field Assessment
  await BeneficiaryService.submitAssessment(testAppId, {
    livingScore: 82,
    housingCondition: 'poor',
    housingNotes: 'หลังคารั่วและเสาผุกร่อน ต้องจัดซื้อวัสดุซ่อมด่วน',
    debtBurdenSummary: 'ไม่มีหนี้นอกระบบ',
    primaryHardship: 'ยากจนและไร้ที่อยู่อาศัยมั่นคง',
    officerRecommendation: 'recommend_full',
    recommendedAmount: 40000,
    recommendedFundId: 'fund-1',
    recommendedSpecificFundId: 'subf-2',
    generalNotes: 'ผ่านการประเมินสิทธิ์ฟากีร-มิสคีนอย่างชัดเจน',
  }, testActor);

  state = await BeneficiaryService.getLifecycleState(testAppId);
  assert(state.statuses.assessment === 'completed', 'Assessment Status transitions to "completed"');
  assert(state.statuses.approval === 'pending', 'Approval Status remains "pending" after assessment');
  assert(state.permissions.canApprove === true, 'canApprove flag becomes TRUE after assessment completion');
  console.log('  [PASS] Field assessment completes and unlocks approval eligibility');
  passedCount++;

  // Step 7: Committee Approval
  await BeneficiaryService.approveApplication(
    testAppId,
    40000,
    'fund-1',
    'อนุมัติงบจัดซื้อวัสดุสร้าง/ซ่อมบ้านตามเสนอ',
    approverActor,
    'subf-2'
  );

  state = await BeneficiaryService.getLifecycleState(testAppId);
  assert(state.statuses.approval === 'approved', 'Approval Status transitions to "approved"');
  assert(state.statuses.payment === 'wait_disbursement', 'Payment Status transitions to "wait_disbursement"');
  assert(state.statuses.delivery === 'pending', 'Delivery Status remains "pending" (material delivery pending)');
  assert(state.permissions.canDisburse === true, 'canDisburse flag becomes TRUE after approval');
  console.log('  [PASS] Approval granted; payment placed in wait_disbursement and delivery remains pending');
  passedCount++;

  // Step 8: Finance Disbursement
  const disbRef = `REF-MAT-${Date.now()}`;
  await BeneficiaryService.recordDisbursement(
    testAppId,
    disbRef,
    '/proofs/slip-mat-001.pdf',
    'ชำระค่าวัสดุก่อสร้างให้ร้านค้าวัสดุพันธมิตรเรียบร้อย',
    financeActor
  );

  state = await BeneficiaryService.getLifecycleState(testAppId);
  assert(state.statuses.payment === 'paid', 'Payment Status transitions to "paid"');
  assert(state.statuses.delivery === 'pending', 'Delivery Status remains "pending" after payment (physical goods not yet delivered)');
  assert(state.permissions.canDeliver === true, 'canDeliver flag is TRUE for physical goods');
  console.log('  [PASS] Payment disbursed; material goods delivery remains pending independently');
  passedCount++;

  // Step 9: Delivery Execution (Materials delivered to site)
  const delivRef = `DELIV-MAT-${Date.now().toString().slice(-4)}`;
  await BeneficiaryService.recordDelivery(
    testAppId,
    {
      deliveryDate: '07/11/2569',
      deliveryRef: delivRef,
      proofUrl: '/proofs/delivery-receipt-mat.pdf',
      notes: 'ส่งมอบสังกะสี ปูน ไม้แปรรูป ถึงหน้างานเรียบร้อย ผู้รับตรวจรับครบถ้วน',
      deliveredByName: testActor.name,
    },
    testActor
  );

  state = await BeneficiaryService.getLifecycleState(testAppId);
  assert(state.statuses.delivery === 'delivered', 'Delivery Status transitions to "delivered"');
  assert(state.permissions.canScheduleFollowup === true, 'canScheduleFollowup is TRUE after fulfillment');
  console.log('  [PASS] Materials delivery recorded and verified independently from payment');
  passedCount++;

  // Step 10: Schedule Follow-up
  await BeneficiaryService.scheduleFollowup(
    testAppId,
    '20/12/2569',
    { id: testActor.id, name: testActor.name },
    testActor
  );

  state = await BeneficiaryService.getLifecycleState(testAppId);
  assert(state.statuses.followup === 'scheduled', 'Follow-up Status transitions to "scheduled"');
  console.log('  [PASS] Post-assistance follow-up visit successfully scheduled');
  passedCount++;

  // Step 11: Complete Follow-up
  await BeneficiaryService.recordFollowup(
    testAppId,
    'บ้านสร้างเสร็จสมบูรณ์ หลังคาไม่รั่วแล้ว ครอบครัวมีความเป็นอยู่ปลอดภัยขึ้นมาก',
    true,
    'ติดตามผลหลังการซ่อมแซม 30 วัน',
    testActor
  );

  state = await BeneficiaryService.getLifecycleState(testAppId);
  assert(state.statuses.followup === 'completed', 'Follow-up Status transitions to "completed"');
  assert(state.permissions.canClose === true, 'canClose flag becomes TRUE after follow-up completion');
  console.log('  [PASS] Post-assistance follow-up completed with living score improvement');
  passedCount++;

  // Step 12: Close Request
  await BeneficiaryService.closeAssistanceRequest(
    testAppId,
    'ปิดคำร้องเสร็จสิ้นสมบูรณ์ ตรวจรับครบถ้วนทั้งการเงิน การส่งมอบ และการติดตามผล',
    superAdminActor
  );

  state = await BeneficiaryService.getLifecycleState(testAppId);
  assert(state.statuses.completion === 'closed', 'Completion Status transitions to "closed"');
  assert(state.permissions.canDisburse === false, 'Cannot disburse a closed request');
  assert(state.permissions.canDeliver === false, 'Cannot deliver a closed request');
  console.log('  [PASS] Assistance request officially closed and locked');
  passedCount++;

  // -------------------------------------------------------------
  // Group 3: Strict Workflow Guardrails & Precondition Enforcement
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Strict Workflow Guardrails & Enforcement ---');

  // Guardrail A: Cannot approve an unassessed request
  const unassessedAppId = `app-unassessed-${Date.now()}`;
  await createTestApp({
    applicationId: unassessedAppId,
    applicationNo: `APP-2569-UNASS-${Date.now().toString().slice(-4)}`,
    id: `ben-unass-${Date.now()}`,
    nationalId: '1100200300402',
    fullName: 'นายทดสอบ การ์ดเรล',
    phone: '0812345678',
    primaryGroupCode: 'faqir_miskin',
    asnafCategory: 'miskin',
    assistanceTypeCode: 'LIVING_SUPPORT',
    assistanceFormatCode: 'bank_transfer',
    requestedAmount: 5000,
  });

  let unassessedError = null;
  try {
    await BeneficiaryService.approveApplication(
      unassessedAppId,
      5000,
      'fund-1',
      'พยายามอนุมัติคำร้องที่ยังไม่ประเมินสิทธิ์',
      approverActor
    );
  } catch (err) {
    unassessedError = err;
  }
  assert(unassessedError !== null, 'Server strictly rejects approval of unassessed request');
  assert(unassessedError?.message.includes('CANNOT_APPROVE_UNASSESSED'), 'Error code is CANNOT_APPROVE_UNASSESSED');
  console.log('  [PASS] Strict guardrail: Cannot approve request before assessment_status = "completed"');
  passedCount++;

  // Guardrail B: Cannot disburse an unapproved request
  let unapprovedDisbError = null;
  try {
    await BeneficiaryService.recordDisbursement(
      unassessedAppId,
      `REF-ERR-${Date.now()}`,
      '/proofs/slip.png',
      'พยายามจ่ายเงินคำร้องที่ยังไม่อนุมัติ',
      financeActor
    );
  } catch (err) {
    unapprovedDisbError = err;
  }
  assert(unapprovedDisbError !== null, 'Server strictly rejects disbursement of unapproved request');
  assert(unapprovedDisbError?.message.includes('CANNOT_DISBURSE_UNAPPROVED'), 'Error code is CANNOT_DISBURSE_UNAPPROVED');
  console.log('  [PASS] Strict guardrail: Cannot disburse request before approval_status = "approved"');
  passedCount++;

  // Guardrail C: Cannot pay twice (Duplicate Disbursement Prevention)
  let duplicateDisbError = null;
  try {
    await BeneficiaryService.recordDisbursement(
      testAppId, // already paid in Group 2
      `REF-DUP-${Date.now()}`,
      '/proofs/slip2.png',
      'พยายามจ่ายเงินซ้ำ',
      financeActor
    );
  } catch (err) {
    duplicateDisbError = err;
  }
  assert(duplicateDisbError !== null, 'Server strictly rejects duplicate payment on paid request');
  assert(duplicateDisbError?.message.includes('ALREADY_PAID') || duplicateDisbError?.message.includes('ห้ามจ่ายซ้ำ'),
    'Server returns ALREADY_PAID error');
  console.log('  [PASS] Strict guardrail: Prevents duplicate payment on already-paid request');
  passedCount++;

  // Guardrail D: Cannot close request when payment is pending
  const unpaidAppId = `app-unpaid-${Date.now()}`;
  await createTestApp({
    applicationId: unpaidAppId,
    applicationNo: `APP-2569-UNPAID-${Date.now().toString().slice(-4)}`,
    id: `ben-unpaid-${Date.now()}`,
    nationalId: '1100200300403',
    fullName: 'นายทดสอบ ค้างจ่าย',
    phone: '0812345679',
    primaryGroupCode: 'faqir_miskin',
    asnafCategory: 'miskin',
    assistanceTypeCode: 'LIVING_SUPPORT',
    assistanceFormatCode: 'bank_transfer',
    requestedAmount: 3000,
  });

  await BeneficiaryService.submitAssessment(unpaidAppId, {
    livingScore: 80,
    officerRecommendation: 'recommend_full',
    recommendedAmount: 3000,
  }, testActor);

  await BeneficiaryService.approveApplication(unpaidAppId, 3000, 'fund-1', 'อนุมัติ', approverActor);

  let closeUnpaidError = null;
  try {
    await BeneficiaryService.closeAssistanceRequest(unpaidAppId, 'พยายามปิดคำร้องที่ยังไม่จ่ายเงิน', superAdminActor);
  } catch (err) {
    closeUnpaidError = err;
  }
  assert(closeUnpaidError !== null, 'Server strictly rejects closing unpaid request');
  assert(closeUnpaidError?.message.includes('CANNOT_CLOSE_UNPAID'), 'Error code is CANNOT_CLOSE_UNPAID');
  console.log('  [PASS] Strict guardrail: Cannot close request while payment_status is pending');
  passedCount++;

  // -------------------------------------------------------------
  // Group 4: Non-Monetary In-Kind Delivery Workflow Variation
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Non-Monetary In-Kind Workflow Variation ---');
  const inKindAppId = `app-inkind-${Date.now()}`;
  await createTestApp({
    applicationId: inKindAppId,
    applicationNo: `APP-2569-INKIND-${Date.now().toString().slice(-4)}`,
    id: `ben-inkind-${Date.now()}`,
    nationalId: '1100200300404',
    fullName: 'นางสาวฟาตีฮะฮ์ ถุงยังชีพ',
    phone: '0823456789',
    primaryGroupCode: 'faqir_miskin',
    asnafCategory: 'faqir',
    assistanceTypeCode: 'EMERGENCY_AID',
    assistanceFormatCode: 'in_kind',
    requestedAmount: 2500,
  });

  let inKindState = await BeneficiaryService.getLifecycleState(inKindAppId);
  assert(inKindState.statuses.payment === 'not_applicable', 'In-Kind request has payment_status = "not_applicable"');
  assert(inKindState.statuses.delivery === 'pending', 'In-Kind request has delivery_status = "pending"');

  await BeneficiaryService.submitAssessment(inKindAppId, {
    livingScore: 90,
    officerRecommendation: 'recommend_full',
    recommendedAmount: 2500,
  }, testActor);

  await BeneficiaryService.approveApplication(inKindAppId, 2500, 'fund-1', 'อนุมัติถุงยังชีพฉุกเฉิน', approverActor);

  inKindState = await BeneficiaryService.getLifecycleState(inKindAppId);
  assert(inKindState.statuses.payment === 'not_applicable', 'Approved In-Kind request retains payment_status = "not_applicable"');

  // Record In-Kind Delivery
  await BeneficiaryService.recordDelivery(
    inKindAppId,
    {
      deliveryRef: `BOX-${Date.now().toString().slice(-4)}`,
      notes: 'มอบถุงยังชีพอาหารแห้ง ข้าวสาร น้ำมันพืช ยารักษาโรค ถึงบ้าน',
    },
    testActor
  );

  inKindState = await BeneficiaryService.getLifecycleState(inKindAppId);
  assert(inKindState.statuses.delivery === 'delivered', 'In-Kind delivery_status = "delivered"');

  // Close In-Kind Request (with waiveFollowup for emergency supply)
  await BeneficiaryService.closeAssistanceRequest(inKindAppId, 'ส่งมอบถุงยังชีพฉุกเฉินเรียบร้อย', superAdminActor, { waiveFollowup: true });
  inKindState = await BeneficiaryService.getLifecycleState(inKindAppId);
  assert(inKindState.statuses.completion === 'closed', 'In-Kind request successfully closed without cash payment');
  console.log('  [PASS] Non-monetary in-kind workflow operates with payment_status = "not_applicable"');
  passedCount++;

  // -------------------------------------------------------------
  // Group 5: Direct Cash / Bank Transfer Alignment
  // -------------------------------------------------------------
  console.log('\n--- Group 5: Direct Cash / Bank Transfer Alignment ---');
  const directTransferAppId = `app-trans-${Date.now()}`;
  await createTestApp({
    applicationId: directTransferAppId,
    applicationNo: `APP-2569-TRANS-${Date.now().toString().slice(-4)}`,
    id: `ben-trans-${Date.now()}`,
    nationalId: '1100200300405',
    fullName: 'นายโอนเงิน ทันใจ',
    phone: '0834567890',
    primaryGroupCode: 'faqir_miskin',
    asnafCategory: 'miskin',
    assistanceTypeCode: 'LIVING_SUPPORT',
    assistanceFormatCode: 'bank_transfer',
    requestedAmount: 3500,
  });

  await BeneficiaryService.submitAssessment(directTransferAppId, {
    livingScore: 75,
    officerRecommendation: 'recommend_full',
    recommendedAmount: 3500,
  }, testActor);

  await BeneficiaryService.approveApplication(directTransferAppId, 3500, 'fund-1', 'อนุมัติเงินโอนยังชีพ', approverActor);

  await BeneficiaryService.recordDisbursement(
    directTransferAppId,
    `REF-DIR-${Date.now()}`,
    '/proofs/slip-direct.pdf',
    'โอนเข้าบัญชีผู้ขอรับความช่วยเหลือโดยตรง',
    financeActor
  );

  const directState = await BeneficiaryService.getLifecycleState(directTransferAppId);
  assert(directState.statuses.payment === 'paid', 'Bank transfer sets payment_status = "paid"');
  assert(directState.statuses.delivery === 'delivered', 'Bank transfer satisfies delivery_status = "delivered" simultaneously');
  console.log('  [PASS] Direct bank transfer satisfies both payment and delivery stages simultaneously');
  passedCount++;

  // -------------------------------------------------------------
  // Group 6: Need Info & Resubmit Lifecycle
  // -------------------------------------------------------------
  console.log('\n--- Group 6: Request Information Clarification (need_info) & Resubmit ---');
  const infoAppId = `app-info-${Date.now()}`;
  await createTestApp({
    applicationId: infoAppId,
    applicationNo: `APP-2569-INFO-${Date.now().toString().slice(-4)}`,
    id: `ben-info-${Date.now()}`,
    nationalId: '1100200300406',
    fullName: 'นายเอกสาร ไม่ครบ',
    phone: '0845678901',
    primaryGroupCode: 'faqir_miskin',
    asnafCategory: 'miskin',
    assistanceTypeCode: 'LIVING_SUPPORT',
    assistanceFormatCode: 'bank_transfer',
    requestedAmount: 4000,
  });

  await BeneficiaryService.requestMoreInfo(infoAppId, 'ขาดสำเนาสมุดบัญชีธนาคารหน้าแรก', testActor);
  let infoState = await BeneficiaryService.getLifecycleState(infoAppId);
  assert(infoState.statuses.request === 'need_info', 'request_status transitions to "need_info"');

  await BeneficiaryService.resubmitRequest(infoAppId, 'แนบสำเนาหน้าสมุดบัญชีธนาคารเรียบร้อยแล้ว', testActor);
  infoState = await BeneficiaryService.getLifecycleState(infoAppId);
  assert(infoState.statuses.request === 'submitted', 'request_status transitions back to "submitted" upon resubmission');
  console.log('  [PASS] Request "need_info" clarification and "submitted" resubmission cycle verified');
  passedCount++;

  // -------------------------------------------------------------
  // Group 7: Cancellation Lifecycle
  // -------------------------------------------------------------
  console.log('\n--- Group 7: Cancellation & Termination Lifecycle ---');
  const cancelAppId = `app-cancel-${Date.now()}`;
  await createTestApp({
    applicationId: cancelAppId,
    applicationNo: `APP-2569-CANC-${Date.now().toString().slice(-4)}`,
    id: `ben-canc-${Date.now()}`,
    nationalId: '1100200300407',
    fullName: 'นายขอยกเลิก คำขอ',
    phone: '0856789012',
    primaryGroupCode: 'faqir_miskin',
    asnafCategory: 'miskin',
    assistanceTypeCode: 'LIVING_SUPPORT',
    assistanceFormatCode: 'bank_transfer',
    requestedAmount: 2000,
  });

  await BeneficiaryService.cancelRequest(cancelAppId, 'ผู้ยื่นคำร้องย้ายถิ่นฐานออกนอกพื้นที่', testActor);
  const cancelState = await BeneficiaryService.getLifecycleState(cancelAppId);
  assert(cancelState.statuses.request === 'canceled', 'request_status = "canceled"');
  assert(cancelState.statuses.completion === 'terminated', 'completion_status = "terminated"');

  let postCancelError = null;
  try {
    await BeneficiaryService.startAssessment(cancelAppId, testActor);
  } catch (err) {
    postCancelError = err;
  }
  assert(postCancelError !== null, 'Cannot assess a canceled request');
  console.log('  [PASS] Cancellation terminates request lifecycle and prevents further actions');
  passedCount++;

  // -------------------------------------------------------------
  // Group 8: Assessment Rejection
  // -------------------------------------------------------------
  console.log('\n--- Group 8: Assessment Rejection ---');
  const rejectAsmAppId = `app-rejasm-${Date.now()}`;
  await createTestApp({
    applicationId: rejectAsmAppId,
    applicationNo: `APP-2569-REJASM-${Date.now().toString().slice(-4)}`,
    id: `ben-rejasm-${Date.now()}`,
    nationalId: '1100200300408',
    fullName: 'นายประเมิน ไม่ผ่าน',
    phone: '0867890123',
    primaryGroupCode: 'faqir_miskin',
    asnafCategory: 'miskin',
    assistanceTypeCode: 'LIVING_SUPPORT',
    assistanceFormatCode: 'bank_transfer',
    requestedAmount: 3000,
  });

  await BeneficiaryService.rejectAssessment(rejectAsmAppId, 'รายได้ครอบครัวเกินเกณฑ์นิศอบ', testActor);
  const rejAsmState = await BeneficiaryService.getLifecycleState(rejectAsmAppId);
  assert(rejAsmState.statuses.assessment === 'rejected', 'assessment_status = "rejected"');
  assert(rejAsmState.statuses.completion === 'terminated', 'completion_status = "terminated"');
  console.log('  [PASS] Assessment rejection terminates request cleanly');
  passedCount++;

  // -------------------------------------------------------------
  // Group 9: Committee Approval Rejection
  // -------------------------------------------------------------
  console.log('\n--- Group 9: Committee Approval Rejection ---');
  const rejectAprAppId = `app-rejapr-${Date.now()}`;
  await createTestApp({
    applicationId: rejectAprAppId,
    applicationNo: `APP-2569-REJAPR-${Date.now().toString().slice(-4)}`,
    id: `ben-rejapr-${Date.now()}`,
    nationalId: '1100200300409',
    fullName: 'นายกรรมการ ไม่อนุมัติ',
    phone: '0878901234',
    primaryGroupCode: 'faqir_miskin',
    asnafCategory: 'miskin',
    assistanceTypeCode: 'LIVING_SUPPORT',
    assistanceFormatCode: 'bank_transfer',
    requestedAmount: 3000,
  });

  await BeneficiaryService.submitAssessment(rejectAprAppId, {
    livingScore: 60,
    officerRecommendation: 'recommend_partial',
    recommendedAmount: 2000,
  }, testActor);

  await BeneficiaryService.rejectApplication(rejectAprAppId, 'งบประมาณเฉพาะหมวดนี้จัดสรรเต็มโควต้าประจำไตรมาสแล้ว', approverActor);
  const rejAprState = await BeneficiaryService.getLifecycleState(rejectAprAppId);
  assert(rejAprState.statuses.approval === 'rejected', 'approval_status = "rejected"');
  assert(rejAprState.statuses.completion === 'terminated', 'completion_status = "terminated"');
  console.log('  [PASS] Committee rejection terminates request and sets approval_status = "rejected"');
  passedCount++;

  // -------------------------------------------------------------
  // Group 10: Lifecycle State Query Engine & Transition Audit Log
  // -------------------------------------------------------------
  console.log('\n--- Group 10: Lifecycle State Query Engine & Transition Audit Log ---');
  const auditState = await BeneficiaryService.getLifecycleState(testAppId);

  assert(auditState.transitions.length >= 7, 'Happy path recorded all 7+ lifecycle transitions');
  const transitionActions = auditState.transitions.map(t => t.action);
  assert(transitionActions.includes('SUBMIT_REQUEST'), 'Audit includes SUBMIT_REQUEST');
  assert(transitionActions.includes('START_ASSESSMENT'), 'Audit includes START_ASSESSMENT');
  assert(transitionActions.includes('COMPLETE_ASSESSMENT'), 'Audit includes COMPLETE_ASSESSMENT');
  assert(transitionActions.includes('APPROVE_REQUEST'), 'Audit includes APPROVE_REQUEST');
  assert(transitionActions.includes('DISBURSE_PAYMENT'), 'Audit includes DISBURSE_PAYMENT');
  assert(transitionActions.includes('DELIVER_ASSISTANCE'), 'Audit includes DELIVER_ASSISTANCE');
  assert(transitionActions.includes('SCHEDULE_FOLLOWUP'), 'Audit includes SCHEDULE_FOLLOWUP');
  assert(transitionActions.includes('COMPLETE_FOLLOWUP'), 'Audit includes COMPLETE_FOLLOWUP');
  assert(transitionActions.includes('CLOSE_REQUEST'), 'Audit includes CLOSE_REQUEST');

  console.log(`  [PASS] Comprehensive audit trail logged ${auditState.transitions.length} sequential transitions with actors & timestamps`);
  passedCount++;

  console.log('\n================================================================');
  console.log(`PHASE 7 TEST RESULTS: ${passedCount} / ${passedCount} PASSED`);
  console.log('STATUS: ALL TESTS PASSED SUCCESSFULLY (100%)');
  console.log('================================================================\n');
}

runPhase7Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
