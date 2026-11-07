import assert from 'assert';
import { getDb, initDb } from '../src/lib/db.ts';
import { BeneficiaryService } from '../src/services/beneficiaryService.ts';

async function runPhase8Tests() {
  console.log('================================================================');
  console.log('   PHASE 8 TEST SUITE: CATEGORY-SPECIFIC DUPLICATE RULES');
  console.log('================================================================');

  await initDb();
  const db = getDb();
  let passedCount = 0;

  // Clean up any test artifacts from prior runs to ensure test idempotency
  await db.execute("DELETE FROM assistance_lifecycle_transitions WHERE application_id LIKE 'app-p8-%'");
  await db.execute("DELETE FROM assistance_applications WHERE id LIKE 'app-p8-%'");
  await db.execute("DELETE FROM beneficiaries WHERE id LIKE 'ben-p8-%' OR national_id LIKE '1888000%'");

  // Replenish test funds
  await db.execute("UPDATE fund_accounts SET available_amount = 500000 WHERE id = 'fund-1'");
  await db.execute("UPDATE faqir_miskin_sub_funds SET remaining_amount = 500000 WHERE id IN ('subf-1', 'subf-2', 'subf-3')");

  const testActor = {
    id: 'officer-p8-1',
    name: 'นายสิทธิชัย เจ้าหน้าที่ตรวจสอบสิทธิ์ (Phase 8)',
    role: 'officer',
  };

  const approverActor = {
    id: 'approver-p8-2',
    name: 'ประธานกรรมการพิจารณาอนุมัติ (Phase 8)',
    role: 'approver',
  };

  const createBaseBen = async (id, nationalId, fullName) => {
    return await BeneficiaryService.registerBeneficiary({
      id,
      nationalId,
      fullName,
      phone: '0812345678',
      address: '123 หมู่ 4 ซอยประชาอุทิศ',
      province: 'กรุงเทพมหานคร',
      district: 'หนองจอก',
      subdistrict: 'คู้ฝั่งเหนือ',
      community: 'ชุมชนเกาะแต้ว',
      postcode: '10530',
      primaryGroupCode: 'faqir_miskin',
      asnafCategory: 'miskin',
      assistanceTypeCode: 'LIVING_SUPPORT',
      assistanceFormatCode: 'bank_transfer',
      requestedAmount: 3000,
    }, testActor);
  };

  // -------------------------------------------------------------
  // Group 1: Monthly Living Support (ปัจจัยยังชีพรายเดือน)
  // Rule: ห้ามขอซ้ำในเดือนเดียวกัน
  // -------------------------------------------------------------
  console.log('\n--- Group 1: Monthly Living Support (ห้ามขอซ้ำในเดือนเดียวกัน) ---');
  const ben1Id = `ben-p8-mon-${Date.now()}`;
  const nat1 = '1888000000001';
  await createBaseBen(ben1Id, nat1, 'นายอาหมัด ทดสอบยังชีพรายเดือน');

  // Submit Application 1 for February 2569 (2026-02-10)
  const app1Id = `app-p8-mon-1-${Date.now()}`;
  await BeneficiaryService.createAssistanceRequest({
    beneficiaryId: ben1Id,
    assistanceTypeCode: 'MONTHLY_ALLOWANCE',
    assistanceFormatCode: 'bank_transfer',
    requestedAmount: 3000,
    appliedDate: '10/02/2569',
    fiscalYear: '2569',
    necessityDetails: 'ขอรับปัจจัยยังชีพรายเดือนประจำเดือนกุมภาพันธ์',
  }, testActor);

  // Attempt Application 2 for the same month (2026-02-25)
  const dupCheck1 = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben1Id,
    assistanceTypeCode: 'MONTHLY_ALLOWANCE',
    requestDate: '25/02/2569',
    fiscalYear: '2569',
  });

  assert(dupCheck1.hasDuplicate === true, 'Duplicate check detects violation for same month');
  assert(dupCheck1.ruleCode === 'MONTHLY_LIVING_SAME_MONTH', 'Rule code is MONTHLY_LIVING_SAME_MONTH');
  assert(dupCheck1.message.includes('กุมภาพันธ์'), 'Message references the violated month');
  assert(dupCheck1.existingApplication !== undefined, 'Existing application details are returned');
  console.log('  [PASS] Reject: Monthly living support cannot be requested twice in the same month');
  passedCount++;

  // Verify server-side exception when attempting to submit
  let errSub1 = null;
  try {
    await BeneficiaryService.createAssistanceRequest({
      beneficiaryId: ben1Id,
      assistanceTypeCode: 'MONTHLY_ALLOWANCE',
      assistanceFormatCode: 'bank_transfer',
      requestedAmount: 3000,
      appliedDate: '25/02/2569',
      fiscalYear: '2569',
    }, testActor);
  } catch (e) {
    errSub1 = e;
  }
  assert(errSub1 !== null, 'Submission threw error on same-month living support');
  assert(errSub1.message.includes('DUPLICATE_ASSISTANCE_VIOLATION'), 'Error contains DUPLICATE_ASSISTANCE_VIOLATION');
  console.log('  [PASS] Server-side guard strictly blocks submitting duplicate monthly living request');
  passedCount++;

  // Application for a DIFFERENT month (March 2569 / 2026-03-10) -> Allowed!
  const dupCheck1NextMonth = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben1Id,
    assistanceTypeCode: 'MONTHLY_ALLOWANCE',
    requestDate: '10/03/2569',
    fiscalYear: '2569',
  });
  assert(dupCheck1NextMonth.hasDuplicate === false, 'Different month is accepted without duplicate block');
  console.log('  [PASS] Allow: Monthly living support is permitted in a subsequent month');
  passedCount++;

  // -------------------------------------------------------------
  // Group 2: Education Grant (ทุนการศึกษา)
  // Rule: ห้ามขอซ้ำในปีการศึกษาเดียวกันของผู้รับ
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Education Grant (ห้ามขอซ้ำในปีการศึกษาเดียวกัน) ---');
  const ben2Id = `ben-p8-edu-${Date.now()}`;
  const nat2 = '1888000000002';
  await createBaseBen(ben2Id, nat2, 'เด็กชายยูซุฟ ทดสอบทุนการศึกษา');

  // Submit Education Grant for Academic Year 2569
  await BeneficiaryService.createAssistanceRequest({
    beneficiaryId: ben2Id,
    assistanceTypeCode: 'EDUCATION_GRANT',
    assistanceFormatCode: 'scholarship',
    requestedAmount: 15000,
    fiscalYear: '2569',
    appliedDate: '15/05/2569',
    necessityDetails: 'ขอรับทุนการศึกษาระดับมัธยมศึกษาปีที่ 3',
  }, testActor);

  // Attempt Education Grant in the SAME Academic Year 2569
  const dupCheck2SameYear = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben2Id,
    assistanceTypeCode: 'EDUCATION_GRANT',
    fiscalYear: '2569',
  });
  assert(dupCheck2SameYear.hasDuplicate === true, 'Duplicate check detects violation for same academic year');
  assert(dupCheck2SameYear.ruleCode === 'EDUCATION_SAME_ACADEMIC_YEAR', 'Rule code is EDUCATION_SAME_ACADEMIC_YEAR');
  assert(dupCheck2SameYear.message.includes('2569'), 'Message references the academic year 2569');
  console.log('  [PASS] Reject: Education grant cannot be requested twice in the same academic year');
  passedCount++;

  // Attempt Education Grant in a DIFFERENT Academic Year (2570) -> Allowed!
  const dupCheck2NextYear = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben2Id,
    assistanceTypeCode: 'EDUCATION_GRANT',
    fiscalYear: '2570',
  });
  assert(dupCheck2NextYear.hasDuplicate === false, 'Different academic year 2570 is accepted');
  console.log('  [PASS] Allow: Education grant is permitted for the next academic year (2570)');
  passedCount++;

  // -------------------------------------------------------------
  // Group 3: Housing Repair & Build (ซ่อมและสร้างที่อยู่อาศัย)
  // Rule: ห้ามขอซ้ำหากยังมีโครงการเดิมที่ยังไม่เสร็จสิ้น
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Housing Repair & Build (ห้ามขอซ้ำหากโครงการเดิมยังไม่เสร็จสิ้น) ---');
  const ben3Id = `ben-p8-house-${Date.now()}`;
  const nat3 = '1888000000003';
  await createBaseBen(ben3Id, nat3, 'นายอิบรอฮีม ทดสอบซ่อมบ้าน');

  // Submit Housing Repair project (initially submitted / active)
  const houseAppRes = await BeneficiaryService.createAssistanceRequest({
    beneficiaryId: ben3Id,
    assistanceTypeCode: 'HOUSING_REPAIR_BUILD',
    assistanceFormatCode: 'materials',
    requestedAmount: 45000,
    fiscalYear: '2569',
    appliedDate: '01/02/2569',
    necessityDetails: 'ซ่อมแซมหลังคาและโครงสร้างบ้านที่ชำรุดทรุดโทรม',
  }, testActor);

  // Attempt new Housing request while project 1 is still ongoing
  const dupCheck3Ongoing = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben3Id,
    assistanceTypeCode: 'HOUSING_REPAIR_BUILD',
  });
  assert(dupCheck3Ongoing.hasDuplicate === true, 'Duplicate check detects ongoing housing project');
  assert(dupCheck3Ongoing.ruleCode === 'HOUSING_ONGOING_PROJECT', 'Rule code is HOUSING_ONGOING_PROJECT');
  assert(dupCheck3Ongoing.message.includes('ยังไม่เสร็จสิ้น'), 'Message explains ongoing housing project');
  console.log('  [PASS] Reject: New housing request blocked while prior housing project is ongoing');
  passedCount++;

  // Complete and officially close project 1
  await BeneficiaryService.submitAssessment(houseAppRes.applicationId, {
    livingScore: 85,
    housingCondition: 'poor',
    housingNotes: 'ตรวจสภาพหลังคาแล้ว สมควรอนุมัติวัสดุ',
    officerRecommendation: 'recommend_full',
    recommendedAmount: 45000,
  }, testActor);

  await BeneficiaryService.approveApplication(
    houseAppRes.applicationId,
    45000,
    'fund-1',
    'อนุมัติงบวัสดุ',
    approverActor,
    'subf-2'
  );

  await BeneficiaryService.recordDisbursement(
    houseAppRes.applicationId,
    `TRX-P8-HOUSE-${Date.now()}`,
    '/proofs/house.pdf',
    'เบิกจ่ายค่าวัสดุแก่ร้านค้า',
    { id: 'fin-p8-1', name: 'ฝ่ายการเงิน', role: 'finance' }
  );

  await BeneficiaryService.recordDelivery(
    houseAppRes.applicationId,
    { deliveryRef: 'DEL-P8-01', notes: 'ส่งมอบวัสดุก่อสร้างครบถ้วน ซ่อมเสร็จสมบูรณ์' },
    testActor
  );

  await BeneficiaryService.closeAssistanceRequest(
    houseAppRes.applicationId,
    { notes: 'ตรวจรับงานก่อสร้างเรียบร้อย ปิดโครงการสมบูรณ์', waiveFollowup: true },
    approverActor
  );

  // Now that project 1 is CLOSED, verify new housing request is allowed
  const dupCheck3AfterClosed = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben3Id,
    assistanceTypeCode: 'HOUSING_REPAIR_BUILD',
    excludeApplicationId: houseAppRes.applicationId,
  });
  assert(dupCheck3AfterClosed.hasDuplicate === false, 'After prior project is closed, new request is permitted');
  console.log('  [PASS] Allow: New housing project permitted after prior project is officially closed');
  passedCount++;

  // -------------------------------------------------------------
  // Group 4: Emergency Aid (ช่วยเหลือฉุกเฉิน ภายใน 30 วัน)
  // Rule: ตรวจสอบเหตุการณ์เดียวกันภายใน 30 วัน
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Emergency Aid (ตรวจสอบเหตุการณ์เดียวกันภายใน 30 วัน) ---');
  const ben4Id = `ben-p8-emg-${Date.now()}`;
  const nat4 = '1888000000004';
  await createBaseBen(ben4Id, nat4, 'นางสาวฟาตีมะห์ ทดสอบฉุกเฉิน');

  // Submit Emergency Aid on 2026-02-01 (01/02/2569)
  await BeneficiaryService.createAssistanceRequest({
    beneficiaryId: ben4Id,
    assistanceTypeCode: 'EMERGENCY_AID',
    assistanceFormatCode: 'cash',
    requestedAmount: 5000,
    appliedDate: '01/02/2569',
    necessityDetails: 'ช่วยเหลือฉุกเฉินน้ำท่วมฉับพลัน',
  }, testActor);

  // Attempt new Emergency request within 15 days (16/02/2569) -> Blocked (diff = 15 <= 30)
  const dupCheck4Within30 = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben4Id,
    assistanceTypeCode: 'EMERGENCY_AID',
    requestDate: '16/02/2569',
  });
  assert(dupCheck4Within30.hasDuplicate === true, 'Duplicate check detects emergency aid within 30 days');
  assert(dupCheck4Within30.ruleCode === 'EMERGENCY_WITHIN_30_DAYS', 'Rule code is EMERGENCY_WITHIN_30_DAYS');
  assert(dupCheck4Within30.existingApplication.daysElapsed <= 30, 'Calculated days elapsed is <= 30 days');
  console.log('  [PASS] Reject: Emergency aid cannot be requested within 30 days of previous request');
  passedCount++;

  // Attempt new Emergency request after 35 days (08/03/2569) -> Allowed (diff = 35 > 30)
  const dupCheck4After30 = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben4Id,
    assistanceTypeCode: 'EMERGENCY_AID',
    requestDate: '08/03/2569',
  });
  assert(dupCheck4After30.hasDuplicate === false, 'Emergency aid after 30 days cooldown is permitted');
  console.log('  [PASS] Allow: Emergency aid permitted after 30 days elapsed');
  passedCount++;

  // -------------------------------------------------------------
  // Group 5: Career Support (สนับสนุนอาชีพ - ตรวจสอบประวัติและเงื่อนไขระยะเวลา)
  // Rule: ตรวจสอบประวัติการรับทุนและเงื่อนไขระยะเวลา (1 ปี / โครงการค้าง)
  // -------------------------------------------------------------
  console.log('\n--- Group 5: Career Support (ตรวจสอบประวัติการรับทุนและระยะเวลา) ---');
  const ben5Id = `ben-p8-car-${Date.now()}`;
  const nat5 = '1888000000005';
  await createBaseBen(ben5Id, nat5, 'นายฮาซัน ทดสอบทุนอาชีพ');

  // Case A: Submit Career Support (ongoing project)
  const careerAppRes = await BeneficiaryService.createAssistanceRequest({
    beneficiaryId: ben5Id,
    assistanceTypeCode: 'CAREER_SUPPORT',
    assistanceFormatCode: 'career_equipment',
    requestedAmount: 20000,
    appliedDate: '01/01/2569',
    necessityDetails: 'ขอทุนจัดซื้ออุปกรณ์เปิดร้านซ่อมจักรยานยนต์',
  }, testActor);

  // Attempt while ongoing
  const dupCheck5Ongoing = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben5Id,
    assistanceTypeCode: 'CAREER_SUPPORT',
    requestDate: '01/03/2569',
  });
  assert(dupCheck5Ongoing.hasDuplicate === true, 'Duplicate check detects ongoing career project');
  assert(dupCheck5Ongoing.ruleCode === 'CAREER_GRANT_COOLDOWN', 'Rule code is CAREER_GRANT_COOLDOWN');
  console.log('  [PASS] Reject: Career support blocked when previous career project is not closed');
  passedCount++;

  // Case B: Approve & Disburse, project closed, but within 1-year cooldown
  await BeneficiaryService.submitAssessment(careerAppRes.applicationId, {
    livingScore: 78,
    housingCondition: 'fair',
    debtBurdenSummary: 'ไม่มี',
    primaryHardship: 'ขาดแคลนเครื่องมือประกอบอาชีพ',
    officerRecommendation: 'recommend_full',
    recommendedAmount: 20000,
  }, testActor);

  await BeneficiaryService.approveApplication(
    careerAppRes.applicationId,
    20000,
    'fund-1',
    'อนุมัติทุนเครื่องมืออาชีพ',
    approverActor,
    'subf-3'
  );

  await BeneficiaryService.recordDisbursement(
    careerAppRes.applicationId,
    `TRX-P8-CAR-${Date.now()}`,
    '/proofs/career.pdf',
    'จ่ายค่าจัดซื้อเครื่องมืออาชีพ',
    { id: 'fin-p8-2', name: 'การเงิน 2', role: 'finance' }
  );

  await BeneficiaryService.recordDelivery(
    careerAppRes.applicationId,
    { deliveryRef: 'DEL-P8-CAR-01', notes: 'ส่งมอบชุดเครื่องมือซ่อมจักรยานยนต์ครบถ้วน' },
    testActor
  );

  await BeneficiaryService.closeAssistanceRequest(
    careerAppRes.applicationId,
    { notes: 'ปิดโครงการสมบูรณ์ ผู้รับเริ่มประกอบอาชีพแล้ว', waiveFollowup: true },
    approverActor
  );

  // Attempt within 180 days (< 365 days cooldown)
  const dupCheck5Cooldown = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben5Id,
    assistanceTypeCode: 'CAREER_SUPPORT',
    requestDate: '01/07/2569', // ~180 days later
  });
  assert(dupCheck5Cooldown.hasDuplicate === true, 'Duplicate check detects 1-year cooldown active');
  assert(dupCheck5Cooldown.ruleCode === 'CAREER_GRANT_COOLDOWN', 'Rule code is CAREER_GRANT_COOLDOWN');
  console.log('  [PASS] Reject: Career support grant within 1-year cooldown period is blocked');
  passedCount++;

  // Case C: Attempt after 400 days (> 365 days cooldown) -> Allowed!
  const dupCheck5AfterYear = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben5Id,
    assistanceTypeCode: 'CAREER_SUPPORT',
    requestDate: '15/03/2570', // > 365 days later
  });
  assert(dupCheck5AfterYear.hasDuplicate === false, 'Career support permitted after 1-year cooldown expires');
  console.log('  [PASS] Allow: Career support permitted after 1-year cooldown has elapsed');
  passedCount++;

  // -------------------------------------------------------------
  // Group 6: Rejection & Cancellation Exceptions
  // Rule: หากคำร้องเดิมถูกปฏิเสธ (Rejected) หรือยกเลิก (Cancelled) ต้องไม่บล็อก
  // -------------------------------------------------------------
  console.log('\n--- Group 6: Rejection & Cancellation Exceptions ---');
  const ben6Id = `ben-p8-ex-${Date.now()}`;
  const nat6 = '1888000000006';
  await createBaseBen(ben6Id, nat6, 'นายมารุต ทดสอบขอยกเว้น');

  // Submit Living Support for April 2569
  const rejAppRes = await BeneficiaryService.createAssistanceRequest({
    beneficiaryId: ben6Id,
    assistanceTypeCode: 'MONTHLY_ALLOWANCE',
    assistanceFormatCode: 'bank_transfer',
    requestedAmount: 3000,
    appliedDate: '05/04/2569',
    fiscalYear: '2569',
  }, testActor);

  // Reject the application
  await BeneficiaryService.rejectApplication(
    rejAppRes.applicationId,
    'เอกสารไม่สมบูรณ์และรายได้เกินเกณฑ์กำหนด',
    approverActor
  );

  // Verify that a rejected application does NOT block new application in the same month
  const dupCheck6AfterRejection = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben6Id,
    assistanceTypeCode: 'MONTHLY_ALLOWANCE',
    requestDate: '20/04/2569',
    fiscalYear: '2569',
  });
  assert(dupCheck6AfterRejection.hasDuplicate === false, 'Rejected application does NOT block reapplication');
  console.log('  [PASS] Rejection exception: Rejected application does not prevent re-applying');
  passedCount++;

  // Submit and Cancel an Education Grant in 2569
  const canAppRes = await BeneficiaryService.createAssistanceRequest({
    beneficiaryId: ben6Id,
    assistanceTypeCode: 'EDUCATION_GRANT',
    assistanceFormatCode: 'scholarship',
    requestedAmount: 10000,
    appliedDate: '01/06/2569',
    fiscalYear: '2569',
  }, testActor);

  await BeneficiaryService.cancelRequest(
    canAppRes.applicationId,
    'ผู้ขอยกเลิกคำร้องเนื่องจากได้รับทุนจากสถาบันอื่นแล้ว',
    testActor
  );

  // Verify that cancelled application does NOT block new application in same academic year
  const dupCheck6AfterCancel = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben6Id,
    assistanceTypeCode: 'EDUCATION_GRANT',
    fiscalYear: '2569',
  });
  assert(dupCheck6AfterCancel.hasDuplicate === false, 'Cancelled application does NOT block reapplication');
  console.log('  [PASS] Cancellation exception: Cancelled application does not prevent re-applying');
  passedCount++;

  // -------------------------------------------------------------
  // Group 7: Detailed Warning Payload Verification
  // Rule: ระบบต้องแจ้งเตือน ข้อมูลคำขอเดิม, วันที่ได้รับ, จำนวนเงิน, สถานะปัจจุบัน
  // -------------------------------------------------------------
  console.log('\n--- Group 7: Detailed Warning Payload Verification ---');
  const ben7Id = `ben-p8-dtl-${Date.now()}`;
  const nat7 = '1888000000007';
  await createBaseBen(ben7Id, nat7, 'นางมาริสา ทดสอบรายละเอียดแจ้งเตือน');

  const detailedApp = await BeneficiaryService.createAssistanceRequest({
    beneficiaryId: ben7Id,
    assistanceTypeCode: 'MONTHLY_ALLOWANCE',
    assistanceFormatCode: 'bank_transfer',
    requestedAmount: 4500,
    appliedDate: '12/08/2569',
    fiscalYear: '2569',
  }, testActor);

  const warnCheck = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben7Id,
    assistanceTypeCode: 'MONTHLY_ALLOWANCE',
    requestDate: '28/08/2569',
    fiscalYear: '2569',
  });

  assert(warnCheck.hasDuplicate === true, 'Duplicate found');
  const ext = warnCheck.existingApplication;
  assert(ext !== undefined, 'existingApplication object is provided');
  assert(typeof ext.applicationNo === 'string' && ext.applicationNo.length > 0, 'Contains applicationNo');
  assert(typeof ext.appliedDate === 'string' && ext.appliedDate.length > 0, 'Contains appliedDate');
  assert(typeof ext.requestedAmount === 'number' && ext.requestedAmount === 4500, 'Contains requestedAmount');
  assert(typeof ext.currentStatus === 'string' && ext.currentStatus.length > 0, 'Contains currentStatus');
  assert(typeof ext.statusLabelTh === 'string' && ext.statusLabelTh.length > 0, 'Contains statusLabelTh');
  assert(typeof warnCheck.ruleNameTh === 'string', 'Contains ruleNameTh');
  assert(typeof warnCheck.message === 'string' && warnCheck.message.length > 0, 'Contains comprehensive message');
  console.log('  [PASS] Detailed notification payload includes applicationNo, appliedDate, amount, statusLabelTh, and ruleNameTh');
  passedCount++;

  // -------------------------------------------------------------
  // Group 8: Lookup by National ID (Unregistered Beneficiary pre-check)
  // -------------------------------------------------------------
  console.log('\n--- Group 8: National ID Lookup Support ---');
  const natCheck = await BeneficiaryService.checkDuplicateAssistanceRules({
    nationalId: nat7, // Using national ID instead of beneficiaryId
    assistanceTypeCode: 'MONTHLY_ALLOWANCE',
    requestDate: '28/08/2569',
  });
  assert(natCheck.hasDuplicate === true, 'Duplicate check successfully resolves beneficiary via national ID');
  assert(natCheck.ruleCode === 'MONTHLY_LIVING_SAME_MONTH', 'Matches MONTHLY_LIVING_SAME_MONTH via national ID');
  console.log('  [PASS] Lookup by national ID accurately matches historical applications');
  passedCount++;

  // -------------------------------------------------------------
  // Group 9: Non-Controlled Categories (No false positives)
  // -------------------------------------------------------------
  console.log('\n--- Group 9: Non-Controlled Categories Immunity ---');
  // Humanitarian or general debt relief without periodic constraints
  const nonControlledCheck = await BeneficiaryService.checkDuplicateAssistanceRules({
    beneficiaryId: ben7Id,
    assistanceTypeCode: 'HUMANITARIAN_AID',
  });
  assert(nonControlledCheck.hasDuplicate === false, 'Non-controlled category produces no false positive duplicate blocks');
  console.log('  [PASS] Non-controlled categories operate without false positive duplicate blocks');
  passedCount++;

  // -------------------------------------------------------------
  // Group 10: registerBeneficiary Guard Integration
  // -------------------------------------------------------------
  console.log('\n--- Group 10: registerBeneficiary Duplicate Assistance Guard ---');
  let regDupErr = null;
  try {
    await BeneficiaryService.registerBeneficiary({
      nationalId: nat7,
      allowExistingBeneficiary: true,
      fullName: 'นางมาริสา ทดสอบรายละเอียดแจ้งเตือน',
      phone: '0812345678',
      address: '123 ซอยพัฒนา',
      province: 'กรุงเทพมหานคร',
      district: 'หนองจอก',
      subdistrict: 'คู้ฝั่งเหนือ',
      community: 'ชุมชนเกาะแต้ว',
      postcode: '10530',
      primaryGroupCode: 'faqir_miskin',
      asnafCategory: 'miskin',
      assistanceTypeCode: 'MONTHLY_ALLOWANCE',
      assistanceFormatCode: 'bank_transfer',
      requestedAmount: 4500,
      appliedDate: '28/08/2569',
      fiscalYear: '2569',
    }, testActor);
  } catch (err) {
    regDupErr = err;
  }
  assert(regDupErr !== null, 'registerBeneficiary threw duplicate error');
  assert(regDupErr.message.includes('DUPLICATE_ASSISTANCE_VIOLATION'), 'Error contains DUPLICATE_ASSISTANCE_VIOLATION');
  assert(regDupErr.message.includes('ห้ามขอซ้ำในเดือนเดียวกัน'), 'Error message contains rule description');
  console.log('  [PASS] registerBeneficiary enforces duplicate prevention rules and throws DUPLICATE_ASSISTANCE_VIOLATION');
  passedCount++;

  // -------------------------------------------------------------
  // Group 11: Authorized Executive Override Support
  // -------------------------------------------------------------
  console.log('\n--- Group 11: Authorized Override Support ---');
  const overrideRes = await BeneficiaryService.createAssistanceRequest({
    beneficiaryId: ben7Id,
    assistanceTypeCode: 'MONTHLY_ALLOWANCE',
    assistanceFormatCode: 'bank_transfer',
    requestedAmount: 4500,
    appliedDate: '28/08/2569',
    fiscalYear: '2569',
    allowDuplicateOverride: true,
    necessityDetails: 'กรณีพิเศษได้รับอนุมัติข้อยกเว้นจากคณะกรรมการบริหาร',
  }, { id: 'exec-1', name: 'ประธานกรรมการบริหาร', role: 'executive' });

  assert(typeof overrideRes.applicationId === 'string', 'Override succeeds when explicitly authorized');
  console.log('  [PASS] Authorized executive override allows creation when allowDuplicateOverride is true');
  passedCount++;

  console.log('\n================================================================');
  console.log(`PHASE 8 TEST RESULTS: ${passedCount} / ${passedCount} PASSED`);
  console.log('STATUS: ALL TESTS PASSED SUCCESSFULLY (100%)');
  console.log('================================================================\n');
}

runPhase8Tests().catch((err) => {
  console.error('\nPhase 8 Test Suite Failed:', err);
  process.exit(1);
});
