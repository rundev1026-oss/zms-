import { RegistryService } from '../src/services/registryService';
import { BeneficiaryService } from '../src/services/beneficiaryService';
import { getDb, initDb } from '../src/lib/db';
import { RegistrationStatus, ApplicationStatus } from '../src/types';

async function runTests() {
  console.log('========================================================================');
  console.log('   ZMS - TEST SEPARATION: BENEFICIARY REGISTRY vs ASSISTANCE REQUESTS   ');
  console.log('         (Strict Isolation, Linked Person IDs, Real DB Audit)           ');
  console.log('========================================================================\n');

  await initDb();
  const db = getDb();

  const officerActor = { id: 'u-3', name: 'อุสมาน เจริญสุข', role: 'officer' };
  const approverActor = { id: 'u-4', name: 'อิหม่ามฟารุก อาลี', role: 'approver' };
  const financeActor = { id: 'u-5', name: 'ฟาติมะฮ์ หวังดี', role: 'finance' };

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] Test ${total}: ${msg}`);
    } else {
      console.error(`  [FAIL] Test ${total}: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. Initial State Check
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Registration Profile Isolation (No Auto-Request) ---');
  const initialAppRes = await db.execute('SELECT COUNT(*) as cnt FROM assistance_applications');
  const initialAppCount = Number(initialAppRes.rows[0].cnt);
  const initialBenRes = await db.execute('SELECT COUNT(*) as cnt FROM beneficiaries');
  const initialBeneficiaryCount = Number(initialBenRes.rows[0].cnt);

  const testNationalId = `1100300${Date.now().toString().slice(-6)}`;
  const regProfile = await RegistryService.registerBeneficiaryProfile(
    {
      fullName: 'นาย มะฮ์มูด อิสลามิกา',
      titlePrefix: 'นาย',
      nationalId: testNationalId,
      birthDate: '1984-05-12',
      phone: '089-123-4567',
      address: '77/12 หมู่ 3 ซอยมัสยิด',
      province: 'กรุงเทพมหานคร',
      district: 'มีนบุรี',
      subdistrict: 'แสนแสบ',
      postcode: '10510',
      community: 'ชุมชนนูรุ้ลฮูดา',
      asnafCategory: 'faqir',
      maritalStatus: 'married',
      occupation: 'รับจ้างทั่วไป',
      housingType: 'rent',
      housingCondition: 'ชำรุดทรุดโทรม',
      housingNotes: 'หลังคาสังกะสีผุ เสาบ้านเริ่มเอียง',
      landTitleType: 'permission_granted',
      hardshipReasons: {
        poverty: true,
        debt: true,
        debtType: 'นอกระบบ',
        debtAmount: 25000,
        illness: true,
        illnessDetails: 'โรคไตระยะเริ่มต้น ต้องฟอกไตเดือนละ 2 ครั้ง'
      },
      pastAssistance: [
        {
          id: 'past-1',
          hasReceived: true,
          agency: 'กระทรวงการพัฒนาสังคมและความมั่นคงของมนุษย์ (พม.)',
          assistanceType: 'เงินสงเคราะห์ครอบครัวผู้มีรายได้น้อย',
          amountOrItems: '3,000 บาท',
          yearReceived: '2568'
        }
      ],
      monthlyIncome: 4500,
      monthlyExpense: 8000,
      debtAmount: 25000,
      debtPurpose: 'กู้ยืมเป็นค่ารักษาพยาบาลและค่าเทอมบุตร',
      disabilityNotes: 'ไม่มี',
      illnessNotes: 'โรคไตเรื้อรัง ต้องฟอกไต',
      livingLimitations: 'ไม่สามารถทำงานหนักหรือยกของหนักได้',
      hardshipReasonsText: 'รายได้ไม่พอกับค่าใช้จ่ายและภาระหนี้สินนอกระบบ',
      householdMembers: [
        {
          fullName: 'นาง อามีนะฮ์ อิสลามิกา',
          relation: 'คู่สมรส',
          age: 38,
          occupation: 'แม่บ้าน',
          monthlyIncome: 0,
          healthStatus: 'healthy',
        },
        {
          fullName: 'ด.ช. อิบรอฮีม อิสลามิกา',
          relation: 'บุตร',
          age: 10,
          occupation: 'นักเรียน',
          monthlyIncome: 0,
          healthStatus: 'healthy',
        }
      ],
      coordinator: {
        name: 'นายอดุลย์ โต๊ะครู',
        phone: '081-111-2222',
        relationship: 'ประธานชุมชนนูรุ้ลฮูดา'
      },
      certifier: {
        name: 'อิหม่ามมูฮัมหมัด ซอและห์',
        position: 'อิหม่ามประจำมัสยิดนูรุ้ลฮูดา',
        phone: '082-333-4444'
      },
      checklist: {
        isFaqirOrMiskin: true,
        hasResidenceEvidence: true,
        isCommunityLeaderCertified: true,
        hasNationalIdCopy: true,
        hasHouseRegistrationCopy: true,
        hasIncomeExpenseRecord: true
      }
    },
    officerActor
  );

  assert(Boolean(regProfile.id), 'Registry record created successfully with unique ID');
  assert(regProfile.registrationNo.startsWith('REG-2569-'), `Registry number generated in format REG-2569-XXXX (${regProfile.registrationNo})`);
  assert(regProfile.registrationStatus === 'pending_verification', 'Default registration status is pending_verification');

  // Verify DB Isolation: NO row created in assistance_applications
  const currentAppRes = await db.execute('SELECT COUNT(*) as cnt FROM assistance_applications');
  const currentAppCount = Number(currentAppRes.rows[0].cnt);
  assert(currentAppCount === initialAppCount, 'Strict Isolation: Registering beneficiary profile did NOT create any assistance application');

  // Verify Audit History in beneficiary_registration_history
  const historyRes = await db.execute({
    sql: 'SELECT * FROM beneficiary_registration_history WHERE beneficiary_id = ?',
    args: [regProfile.id]
  });
  const historyEntries = historyRes.rows;
  assert(historyEntries.length === 1, 'Initial registration recorded in beneficiary_registration_history table');
  assert(historyEntries[0].status === 'pending_verification', 'History entry logs status as pending_verification');

  // -------------------------------------------------------------------------
  // 2. Testing 8 Registry Statuses Transitions
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing 8 Registry Statuses Lifecycle & Audit Log ---');
  
  const statusCycle: RegistrationStatus[] = [
    'pending_survey',
    'pending_qualification',
    'need_more_info',
    'pending_survey',
    'pending_qualification',
    'qualified',
    'suspended'
  ];

  for (const nextStatus of statusCycle) {
    const updated = await RegistryService.transitionRegistryStatus(
      regProfile.id,
      nextStatus,
      `เปลี่ยนสถานะเป็น ${nextStatus} โดยระบบทดสอบอัตโนมัติ`,
      approverActor
    );
    assert(updated.registrationStatus === nextStatus, `Beneficiary successfully transitioned to '${nextStatus}'`);
  }

  // Check audit count in beneficiary_registration_history
  const allHistoryRes = await db.execute({
    sql: 'SELECT * FROM beneficiary_registration_history WHERE beneficiary_id = ? ORDER BY created_at ASC',
    args: [regProfile.id]
  });
  const allHistory = allHistoryRes.rows;
  assert(allHistory.length === 1 + statusCycle.length, `Audit trail recorded all ${1 + statusCycle.length} status events in history`);

  // Transition back to 'qualified'
  const qualifiedBeneficiary = await RegistryService.transitionRegistryStatus(
    regProfile.id,
    'qualified',
    'ผ่านการพิจารณาคุณสมบัติอย่างสมบูรณ์',
    approverActor
  );
  assert(qualifiedBeneficiary.registrationStatus === 'qualified', 'Beneficiary set to qualified status');

  // -------------------------------------------------------------------------
  // 3. Testing Assistance Request Submission (Does NOT Change Registry Status)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Assistance Request Submission & Decoupling ---');

  const appRequest1 = await RegistryService.createAssistanceRequest(
    {
      beneficiaryId: regProfile.id,
      asnafCategory: 'faqir',
      assistanceType: 'ค่ารักษาพยาบาลและค่าครองชีพเร่งด่วน',
      requestedAmount: 12000,
      urgencyLevel: 'urgent',
      necessityDetails: 'ต้องการค่าเดินทางและค่ายาฟอกไตสำหรับเดือนนี้อย่างเร่งด่วน',
      reasons: 'ภาระหนี้นอกระบบและค่ารักษาพยาบาลสูง'
    },
    officerActor
  );

  assert(Boolean(appRequest1.id), 'Assistance request 1 created successfully');
  assert(appRequest1.applicationNo.startsWith('APP-2569-'), `Application number generated in format APP-2569-XXXX (${appRequest1.applicationNo})`);
  assert(appRequest1.beneficiaryId === regProfile.id, 'Application correctly references master Beneficiary ID');
  assert(appRequest1.registrationNo === regProfile.registrationNo, 'Application carries master Registration No reference');

  // CRITICAL CHECK: Beneficiary status must NOT change when request is submitted
  const beneficiaryAfterApp1 = await RegistryService.getBeneficiaryRegistryById(regProfile.id);
  assert(beneficiaryAfterApp1?.registrationStatus === 'qualified', 'Assistance request submission did NOT modify beneficiary registration status');

  // Create Request 2 for the same person (1 Person = Multiple Assistance Requests)
  const appRequest2 = await RegistryService.createAssistanceRequest(
    {
      beneficiaryId: regProfile.id,
      asnafCategory: 'faqir',
      assistanceType: 'ทุนการศึกษาบุตร',
      requestedAmount: 5000,
      urgencyLevel: 'normal',
      necessityDetails: 'ค่าอุปกรณ์การเรียนและชุดนักเรียนเปิดเทอม',
      reasons: 'บุตรเปิดภาคเรียนใหม่'
    },
    officerActor
  );

  assert(Boolean(appRequest2.id), 'Assistance request 2 created successfully for the SAME beneficiary');
  assert(appRequest2.applicationNo !== appRequest1.applicationNo, 'Request 2 has separate unique Application No');

  // Fetch updated registry and verify linked applications
  const beneficiaryWithApps = await RegistryService.getBeneficiaryRegistryById(regProfile.id);
  assert(beneficiaryWithApps?.linkedApplicationsCount === 2, `Registry correctly aggregates linkedApplicationsCount = 2 (Found: ${beneficiaryWithApps?.linkedApplicationsCount})`);
  assert(beneficiaryWithApps?.linkedApplications?.length === 2, 'Linked applications array contains both requests');

  // -------------------------------------------------------------------------
  // 4. Testing 7-Step Workflow of Assistance Request
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing 7-Step Application Workflow to Disbursement ---');

  const workflowSteps: { status: ApplicationStatus; expectedStatus: ApplicationStatus; actor: any; notes: string; payload?: any }[] = [
    { status: 'doc_review', expectedStatus: 'doc_review', actor: officerActor, notes: 'ตรวจสอบเอกสารครบถ้วน' },
    { status: 'assessing', expectedStatus: 'assessing', actor: officerActor, notes: 'ลงพื้นที่เยี่ยมบ้านและตรวจสภาพความเป็นอยู่' },
    { status: 'pending_approval', expectedStatus: 'pending_approval', actor: officerActor, notes: 'เสนอคณะกรรมการอนุมัติ 10,000 บาท' },
    { 
      status: 'approved',
      expectedStatus: 'wait_disbursement',
      actor: approverActor, 
      notes: 'คณะกรรมการอนุมัติช่วยเหลือ 10,000 บาท',
      payload: { approvedAmount: 10000, approvedNotes: 'อนุมัติตามหลักเกณฑ์ซะกาตผู้ยากไร้' }
    },
    {
      status: 'disbursed',
      expectedStatus: 'disbursed',
      actor: financeActor,
      notes: 'โอนเงินเข้าบัญชีเรียบร้อยแล้ว',
      payload: {
        disbursedAmount: 10000,
        paymentRef: `TXN-2569-${Date.now().toString().slice(-6)}`,
        proofUrl: '/slips/slip-8899.pdf',
        accountName: 'กองทุนช่วยเหลือผู้ยากไร้'
      }
    }
  ];

  for (const step of workflowSteps) {
    if (step.status === 'approved') {
      await BeneficiaryService.approveApplication(
        appRequest1.id,
        step.payload.approvedAmount,
        'fund-1',
        step.payload.approvedNotes,
        step.actor
      );
    } else if (step.status === 'disbursed') {
      await BeneficiaryService.recordDisbursement(
        appRequest1.id,
        step.payload.paymentRef,
        step.payload.proofUrl,
        step.notes,
        step.actor
      );
    } else {
      await BeneficiaryService.updateApplicationStatus(
        appRequest1.id,
        step.status,
        step.notes,
        step.actor
      );
    }

    const currentApp = await BeneficiaryService.getApplicationById(appRequest1.id);
    assert(currentApp?.status === step.expectedStatus, `Application progressed to status: '${step.expectedStatus}'`);
  }

  // Close the application
  await BeneficiaryService.updateApplicationStatus(
    appRequest1.id,
    'closed',
    'ปิดคำร้องหลังจากติดตามผล 30 วัน',
    officerActor
  );
  const closedApp = await BeneficiaryService.getApplicationById(appRequest1.id);
  assert(closedApp?.status === 'closed', 'Application completed full workflow to closed status');

  // Verify total assistance received aggregated on beneficiary registry
  const registryAfterDisbursed = await RegistryService.getBeneficiaryRegistryById(regProfile.id);
  assert(registryAfterDisbursed?.totalAssistanceReceived === 10000, `Registry aggregates totalAssistanceReceived = 10,000 บาท (Found: ${registryAfterDisbursed?.totalAssistanceReceived})`);

  // -------------------------------------------------------------------------
  // 5. Testing Dashboard Separated Stats (Real Database Aggregation)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Dashboard Real Database Stats Queries ---');

  const stats = await RegistryService.getSeparatedDashboardStats();

  const dbTotalRegistries = Number((await db.execute('SELECT COUNT(*) as c FROM beneficiaries')).rows[0].c);
  const dbPendingVerification = Number((await db.execute(`
    SELECT COUNT(*) as c FROM beneficiaries 
    WHERE registration_status IN ('draft', 'pending_verification', 'pending_survey', 'pending_qualification', 'need_more_info')
       OR registration_status IS NULL
  `)).rows[0].c);
  const dbQualifiedRegistries = Number((await db.execute("SELECT COUNT(*) as c FROM beneficiaries WHERE registration_status = 'qualified'")).rows[0].c);
  const dbPendingRequests = Number((await db.execute(`
    SELECT COUNT(*) as c FROM assistance_applications 
    WHERE status IN ('submitted', 'doc_review', 'assessing', 'assessment', 'pending_approval', 'need_info')
  `)).rows[0].c);
  const dbApprovedRequests = Number((await db.execute("SELECT COUNT(*) as c FROM assistance_applications WHERE status IN ('approved', 'wait_disbursement')")).rows[0].c);
  const dbCompletedAssistance = Number((await db.execute("SELECT COUNT(*) as c FROM assistance_applications WHERE status IN ('disbursed', 'closed')")).rows[0].c);

  assert(stats.totalRegistries === dbTotalRegistries, `totalRegistries (${stats.totalRegistries}) matches exact database count (${dbTotalRegistries})`);
  assert(stats.pendingVerificationRegistries === dbPendingVerification, `pendingVerificationRegistries (${stats.pendingVerificationRegistries}) matches DB count (${dbPendingVerification})`);
  assert(stats.qualifiedRegistries === dbQualifiedRegistries, `qualifiedRegistries (${stats.qualifiedRegistries}) matches DB count (${dbQualifiedRegistries})`);
  assert(stats.pendingRequests === dbPendingRequests, `pendingRequests (${stats.pendingRequests}) matches DB count (${dbPendingRequests})`);
  assert(stats.approvedRequests === dbApprovedRequests, `approvedRequests (${stats.approvedRequests}) matches DB count (${dbApprovedRequests})`);
  assert(stats.completedAssistance === dbCompletedAssistance, `completedAssistance (${stats.completedAssistance}) matches DB count (${dbCompletedAssistance})`);

  console.log('\n========================================================================');
  console.log(`  ALL ${passed}/${total} INTEGRATION TESTS PASSED WITH 100% SUCCESS! `);
  console.log('========================================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FATAL ERROR IN TESTS]:', err);
  process.exit(1);
});
