import { BeneficiaryService } from '../src/services/beneficiaryService';
import { getDb, initDb } from '../src/lib/db';

async function runSurveyTests() {
  console.log('========================================================================');
  console.log('     ZMS - BENEFICIARY SURVEY FORM (A-I) & WORKFLOW VERIFICATION        ');
  console.log('       (Testing Revised Survey Form, 9-Stage Workflow, & Checklist)     ');
  console.log('========================================================================\n');

  await initDb();

  const officerActor = { id: 'u-3', name: 'อุสมาน เจริญสุข', role: 'officer' };
  const approverActor = { id: 'u-4', name: 'อิหม่ามฟารุก อาลี', role: 'approver' };
  const financeActor = { id: 'u-5', name: 'ฟาติมะฮ์ หวังดี', role: 'finance' };

  let passedTests = 0;
  const totalTests = 8;

  // -------------------------------------------------------------------------
  // TEST 1: Retrieve Assistance Types (Section C Configuration)
  // -------------------------------------------------------------------------
  console.log('TEST 1: ตรวจสอบรายการประเภทความช่วยเหลือที่ระบบกำหนด (Section C)');
  try {
    const types = await BeneficiaryService.getAssistanceTypes();
    console.log(`  [PASS] พบประเภทความช่วยเหลือ ${types.length} รายการ:`);
    types.slice(0, 4).forEach((t: any) => console.log(`         - [${t.code}] ${t.name} (หมวดหมู่: ${t.category})`));
    if (types.length >= 6) {
      passedTests++;
    } else {
      throw new Error(`Expected at least 6 assistance types, found ${types.length}`);
    }
  } catch (err: any) {
    console.error(`  [FAIL] Test 1: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Register Beneficiary with Full Sections A through I
  // -------------------------------------------------------------------------
  console.log('\nTEST 2: บันทึกข้อมูลผู้ขอรับความช่วยเหลือครบทุกส่วน (Sections A-I)');
  const uniqueNationalId = `3949900${Date.now().toString().slice(-6)}`;
  let registeredApp: any = null;

  try {
    registeredApp = await BeneficiaryService.registerBeneficiary(
      {
        // ส่วน A
        titlePrefix: 'นาย',
        fullName: 'อับดุลเลาะห์ สุมาลี',
        birthDate: '1982-05-14',
        age: 44,
        phone: '089-123-4567',
        nationalId: uniqueNationalId,
        address: '142/5 หมู่ 3 ซอยมัสยิดดารุ้ลนาอีม',
        province: 'ปัตตานี',
        district: 'เมืองปัตตานี',
        subdistrict: 'จะบังติกอ',
        community: 'ชุมชนจะบังติกอเหนือ',
        occupation: 'รับจ้างทั่วไปและประมงพื้นบ้าน',
        maritalStatus: 'married',
        housingType: 'own',
        landTitleType: 'title_deed',
        landTitleNotes: 'โฉนดที่ดินเลขที่ 12455 เนื้อที่ 35 ตร.ว. ปลอดภาระผูกพัน',

        // ส่วน B
        asnafCategory: 'miskin',
        hardshipReasons: {
          poverty: true,
          debt: true,
          debtType: 'หนี้นอกระบบกู้รักษาพยาบาลบุตร และหนี้ค่าอุปกรณ์ประมง',
          debtAmount: 28000,
          unemployed: true,
          illness: true,
          other: true,
          otherDetails: 'ช่วงมรสุมออกเรือไม่ได้ ไม่มีรายได้เข้ามาจุนเจือครอบครัว',
        },
        debtType: 'หนี้นอกระบบกู้รักษาพยาบาลบุตร และหนี้ค่าอุปกรณ์ประมง',
        debtAmount: 28000,

        // ส่วน C
        assistanceType: 'asst-housing',
        requestedAmount: 45000,
        assistanceTypeDetails: 'กระเบื้องมุงหลังคา 120 แผ่น, ไม้ฝาเชอร่า, ปูนซีเมนต์ 20 ถุง และค่าแรงช่างท้องถิ่น',
        necessityDetails: 'หลังคาผุพังรั่วซึมรุนแรงในฤดูมรสุม มีบุตรวัยเรียนและมารดาชราวัย 78 ปีอาศัยอยู่ด้วย',

        // ส่วน D
        pastAssistance: [
          {
            id: 'past-1',
            hasReceived: true,
            agency: 'เทศบาลเมืองปัตตานี',
            assistanceType: 'ถุงยังชีพน้ำท่วม',
            amountOrItems: 'ข้าวสาร อาหารแห้ง มูลค่า 1,000 บาท',
            yearReceived: '2567',
          },
        ],

        // ส่วน E
        monthlyIncome: 6500,
        monthlyExpense: 11200,
        incomeBreakdown: {
          salary: 4500,
          familySupport: 1000,
          agriculture: 0,
          trading: 0,
          assetIncome: 0,
          freelance: 0,
          welfare: 1000,
          otherIncome: 0,
        },
        expenseBreakdown: {
          living: 5500,
          education: 1500,
          healthcare: 1200,
          utilities: 800,
          rent: 0,
          debtPayment: 1500,
          otherExpense: 700,
        },

        // ส่วน F
        householdMembers: [
          {
            fullName: 'นาง มาเรียม สุมาลี',
            relation: 'ภรรยา',
            age: 41,
            educationStatus: 'มัธยมศึกษาตอนต้น',
            occupation: 'แม่บ้าน / เย็บผ้ารับจ้าง',
            monthlyIncome: 1000,
            healthStatus: 'healthy',
            notes: 'ช่วยตัดเย็บเสื้อผ้าตามสั่ง',
          },
          {
            fullName: 'ด.ช. อานัส สุมาลี',
            relation: 'บุตร',
            age: 12,
            educationStatus: 'ประถมศึกษาปีที่ 6 โรงเรียนเทศบาล',
            occupation: 'นักเรียน',
            monthlyIncome: 0,
            healthStatus: 'healthy',
            notes: 'เรียนดีแต่ขาดแคลนทุนการศึกษา',
          },
        ],

        // ส่วน G
        familySituationSummary: 'ครอบครัวยากจน หัวหน้าครอบครัวมีอาการปวดหลังจากงานหนัก ภาระค่าครองชีพสูงกว่ารายรับสุทธิต่อเดือน',
        urgentNeeds: 'ซ่อมแซมหลังคาบ้านที่ชำรุดทรุดโทรม และทุนบรรเทาหนี้สินเร่งด่วน',
        dependentBurdens: 'มีมารดาชราอายุ 78 ปี ติดบ้าน และบุตรวัยเรียน 1 คน',

        // ส่วน H
        coordinator: {
          fullName: 'นาย มะฮ์มูด สาแล',
          phone: '081-443-2211',
          occupation: 'ครูสอนศาสนา',
          age: 52,
          address: 'หมู่ 3 ต.จะบังติกอ อ.เมือง จ.ปัตตานี',
        },
        certifier: {
          certifierType: 'imam',
          fullName: 'อิหม่าม รอซีดี เจ๊ะหะ',
          roleTitle: 'อิหม่ามประจำมัสยิด',
          phone: '089-876-5432',
          organization: 'มัสยิดดารุ้ลนาอีม ต.จะบังติกอ อ.เมือง จ.ปัตตานี',
          comments: 'ให้การรับรองว่าเป็นผู้มีความจำเป็นเร่งด่วนและประพฤติตนดี',
        },

        // ส่วน I
        documents: [
          { name: 'สำเนาบัตรประชาชน', category: 'id_card', fileUrl: '/uploads/docs/id_card_abdulloh.pdf' },
          { name: 'ภาพถ่ายสภาพหลังคาชำรุด', category: 'housing_exterior', fileUrl: '/uploads/docs/roof_damage_photo.jpg' },
        ],
      },
      officerActor
    );

    console.log(`  [PASS] บันทึกข้อมูลครบถ้วน: ApplicationNo = ${registeredApp.applicationNo}`);
    console.log(`         - ผู้ขอรับ: ${registeredApp.fullName} (Application ID = ${registeredApp.applicationId})`);
    passedTests++;
  } catch (err: any) {
    console.error(`  [FAIL] Test 2: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Retrieve and Validate Sections A-I Data via getApplicationById
  // -------------------------------------------------------------------------
  console.log('\nTEST 3: ดึงข้อมูลคำร้องเพื่อตรวจสอบความถูกต้องของข้อมูลทุกส่วน (Sections A-I)');
  try {
    const fetched = await BeneficiaryService.getApplicationById(registeredApp.applicationId);
    if (!fetched) throw new Error('Application not found');

    if (
      fetched.housingType === 'own' &&
      fetched.hardshipReasons?.poverty === true &&
      fetched.hardshipReasons?.debt === true &&
      fetched.incomeBreakdown?.salary === 4500 &&
      fetched.expenseBreakdown?.living === 5500 &&
      fetched.householdMembers?.length === 2 &&
      fetched.coordinator?.fullName === 'นาย มะฮ์มูด สาแล' &&
      fetched.certifier?.certifierType === 'imam'
    ) {
      console.log(`  [PASS] ตรวจสอบข้อมูลในฐานข้อมูลพบโครงสร้างครบถ้วนสมบูรณ์:`);
      console.log(`         - ลักษณะที่อยู่อาศัย: ${fetched.housingType} (${fetched.landTitleType})`);
      console.log(`         - สมาชิกครัวเรือน: ${fetched.householdMembers.length} คน`);
      console.log(`         - ผู้รับรอง: ${fetched.certifier.fullName} (${fetched.certifier.certifierType})`);
      console.log(`         - รายรับสุทธิต่อเดือน: ฿${(fetched.monthlyIncome - fetched.monthlyExpense).toLocaleString()} บาท`);
      passedTests++;
    } else {
      throw new Error('Some survey fields failed to retrieve or parse properly from SQLite JSON columns');
    }
  } catch (err: any) {
    console.error(`  [FAIL] Test 3: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Evaluator Checklist Persistence & Integrity
  // -------------------------------------------------------------------------
  console.log('\nTEST 4: บันทึกและดึงผลตรวจสอบตามหลักเกณฑ์ (Evaluator Checklist)');
  try {
    const checklistPayload = {
      amalIbadah: true,
      amalIbadahNotes: 'ปฏิบัติตามหลักการอิสลาม ละหมาดวันศุกร์สม่ำเสมอ',
      landRights: true,
      landRightsNotes: 'มีโฉนดที่ดินถูกต้องในชื่อบิดาผู้สืบสันดานและได้รับความยินยอม',
      housingCondition: true,
      housingConditionNotes: 'ลงพื้นที่ตรวจพบหลังคาผุพังจริง ต้องเปลี่ยนโครงและกระเบื้อง',
      economicStatus: true,
      economicStatusNotes: 'รายได้ขาดดุลชัดเจน มีหนี้ค่ายาจริง',
      communityParticipation: true,
      communityParticipationNotes: 'ร่วมกิจกรรมทำความสะอาดกุโบร์และงานมัสยิด',
      leaderEndorsement: true,
      leaderEndorsementNotes: 'อิหม่ามและผู้ใหญ่บ้านให้การรับรองเป็นลายลักษณ์อักษร',
      asnafVulnerability: true,
      asnafVulnerabilityNotes: 'เข้าข่ายหมวดมิสกีนและฆอริมูน',
      dependentBurdens: true,
      dependentBurdensNotes: 'มีมารดาวัยชรา 78 ปีที่ต้องการการดูแล',
      committeeNotes: 'เห็นควรพิจารณาให้ความช่วยเหลือซ่อมแซมบ้านตามโครงการเร่งด่วน',
    };

    const updatedWithChecklist = await BeneficiaryService.updateChecklist(
      registeredApp.applicationId,
      checklistPayload,
      officerActor
    );

    if (
      updatedWithChecklist.checklist?.amalIbadah === true &&
      updatedWithChecklist.checklist?.landRights === true &&
      updatedWithChecklist.checklist?.leaderEndorsement === true
    ) {
      console.log(`  [PASS] บันทึก Checklist สำเร็จ: ตรวจสอบอามั้ล=${updatedWithChecklist.checklist.amalIbadah}, เอกสารสิทธิ์=${updatedWithChecklist.checklist.landRights}, ผู้รับรอง=${updatedWithChecklist.checklist.leaderEndorsement}`);
      passedTests++;
    } else {
      throw new Error('Checklist fields mismatch');
    }
  } catch (err: any) {
    console.error(`  [FAIL] Test 4: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Full 9-Stage Workflow Transitions (Happy Path)
  // -------------------------------------------------------------------------
  console.log('\nTEST 5: ทดสอบการเปลี่ยนสถานะตามขั้นตอน Workflow 9 ลำดับ (Happy Path)');
  try {
    console.log(`  - สถานะเริ่มต้น: ${registeredApp.status}`);

    // Transition 1: submitted -> doc_review
    let res = await BeneficiaryService.transitionApplicationStatus(
      registeredApp.applicationId,
      'doc_review',
      'เอกสารประกอบคำร้องครบถ้วน ผ่านการตรวจสอบขั้นต้น',
      officerActor
    );
    console.log(`  - เปลี่ยนเป็น: ${res.newStatus} [PASS]`);

    // Transition 2: doc_review -> field_inspection
    res = await BeneficiaryService.transitionApplicationStatus(
      registeredApp.applicationId,
      'field_inspection',
      'มอบหมายเจ้าหน้าที่ลงพื้นที่สำรวจสภาพที่อยู่อาศัยจริง ณ จะบังติกอ',
      officerActor
    );
    console.log(`  - เปลี่ยนเป็น: ${res.newStatus} [PASS]`);

    // Transition 3: field_inspection -> pending_approval
    res = await BeneficiaryService.transitionApplicationStatus(
      registeredApp.applicationId,
      'pending_approval',
      'ลงพื้นที่เรียบร้อย พร้อมเสนอคณะกรรมการพิจารณา',
      officerActor
    );
    console.log(`  - เปลี่ยนเป็น: ${res.newStatus} [PASS]`);

    // Transition 4: pending_approval -> approved (by Approver)
    res = await BeneficiaryService.transitionApplicationStatus(
      registeredApp.applicationId,
      'approved',
      'คณะกรรมการมีมติอนุมัติความช่วยเหลือวงเงิน 45,000 บาท',
      approverActor
    );
    console.log(`  - เปลี่ยนเป็น: ${res.newStatus} [PASS]`);

    // Transition 5: approved -> disbursed (by Finance)
    res = await BeneficiaryService.transitionApplicationStatus(
      registeredApp.applicationId,
      'disbursed',
      'โอนเงินจัดซื้อวัสดุซ่อมแซมบ้านเรียบร้อย อ้างอิงสลิปธนาคารอิสลาม',
      financeActor
    );
    console.log(`  - เปลี่ยนเป็น: ${res.newStatus} [PASS]`);

    // Transition 6: disbursed -> closed
    res = await BeneficiaryService.transitionApplicationStatus(
      registeredApp.applicationId,
      'closed',
      'ซ่อมแซมหลังคาบ้านเสร็จสิ้นและส่งมอบเรียบร้อย ปิดคำร้อง',
      officerActor
    );
    console.log(`  - เปลี่ยนเป็น: ${res.newStatus} [PASS]`);

    passedTests++;
  } catch (err: any) {
    console.error(`  [FAIL] Test 5: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Workflow Rejection Branch (Testing 'rejected' with reason)
  // -------------------------------------------------------------------------
  console.log('\nTEST 6: ทดสอบการไม่อนุมัติคำร้องพร้อมระบุเหตุผล (Rejection with reason)');
  try {
    const rejectNationalId = `3949901${Date.now().toString().slice(-6)}`;
    const rejectApp = await BeneficiaryService.registerBeneficiary(
      {
        fullName: 'นาย ทดสอบ ไม่อนุมัติ',
        nationalId: rejectNationalId,
        phone: '081-111-2222',
        address: '99/9 หมู่ 1',
        province: 'ปัตตานี',
        district: 'เมืองปัตตานี',
        community: 'ชุมชนทดสอบ',
        asnafCategory: 'miskin',
        requestedAmount: 50000,
        monthlyIncome: 30000, // รายได้เกินเกณฑ์
        monthlyExpense: 15000,
      },
      officerActor
    );

    // Change to pending_approval
    await BeneficiaryService.transitionApplicationStatus(
      rejectApp.applicationId,
      'pending_approval',
      'ส่งพิจารณา',
      officerActor
    );

    // Reject with reason by Approver
    const rejectionReason = 'ตรวจสอบพบว่ารายได้ต่อเดือนของครัวเรือน (30,000 บาท) เกินเกณฑ์คุณสมบัติผู้มีสิทธิ์รับซะกาตตามระเบียบมูลนิธิ';
    const rejectedResult = await BeneficiaryService.rejectApplication(
      rejectApp.applicationId,
      rejectionReason,
      approverActor
    );

    if (rejectedResult.status === 'rejected' && rejectedResult.rejectionReason === rejectionReason) {
      console.log(`  [PASS] ปฏิเสธคำร้องถูกต้อง: Status = ${rejectedResult.status}`);
      console.log(`         - เหตุผลการไม่อนุมัติ: "${rejectedResult.rejectionReason}"`);
      passedTests++;
    } else {
      throw new Error(`Rejection status or reason did not match`);
    }
  } catch (err: any) {
    console.error(`  [FAIL] Test 6: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Search, Filter, and Pagination via getAllApplications
  // -------------------------------------------------------------------------
  console.log('\nTEST 7: ค้นหา กรอง และแบ่งหน้า (Search, Filter, Pagination)');
  try {
    // 1. Search by name
    const searchRes: any = await BeneficiaryService.getAllApplications({
      search: 'อับดุลเลาะห์',
      page: 1,
      limit: 10,
    });
    console.log(`  - ค้นหาคำว่า "อับดุลเลาะห์": พบ ${searchRes.total} รายการ`);

    // 2. Filter by status 'closed'
    const statusRes: any = await BeneficiaryService.getAllApplications({
      status: 'closed',
      page: 1,
      limit: 10,
    });
    console.log(`  - กรองสถานะ "closed": พบ ${statusRes.total} รายการ`);

    // 3. Filter by province 'ปัตตานี'
    const provinceRes: any = await BeneficiaryService.getAllApplications({
      search: 'ปัตตานี',
      page: 1,
      limit: 10,
    });
    console.log(`  - ค้นหาจังหวัด "ปัตตานี": พบ ${provinceRes.total} รายการ`);

    if (searchRes.total >= 1 && statusRes.total >= 1) {
      console.log(`  [PASS] ระบบ Search & Filter ทำงานเชื่อมต่อฐานข้อมูลจริงได้อย่างแม่นยำ`);
      passedTests++;
    } else {
      throw new Error('Search or filter returned 0 results');
    }
  } catch (err: any) {
    console.error(`  [FAIL] Test 7: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Segregation of Duties & Workflow Enforcements
  // -------------------------------------------------------------------------
  console.log('\nTEST 8: ตรวจสอบการป้องกันการเปลี่ยนสถานะที่ไม่ถูกต้อง (Validation & Constraints)');
  try {
    // Officer trying to approve
    const testApp = await BeneficiaryService.registerBeneficiary(
      {
        fullName: 'นาย สิทธิ์ ทดสอบ',
        nationalId: `3949902${Date.now().toString().slice(-6)}`,
        phone: '082-222-3333',
        address: '11/1 หมู่ 2',
        province: 'ปัตตานี',
        district: 'เมืองปัตตานี',
        community: 'ชุมชนทดสอบ 2',
        asnafCategory: 'miskin',
        requestedAmount: 10000,
      },
      officerActor
    );

    let caughtError = false;
    try {
      await BeneficiaryService.transitionApplicationStatus(
        testApp.applicationId,
        'approved',
        'เจ้าหน้าที่พยายามอนุมัติเอง',
        officerActor
      );
    } catch (err: any) {
      caughtError = true;
      console.log(`  [PASS] ระบบบล็อกเจ้าหน้าที่จากการอนุมัติคำร้อง: "${err.message}"`);
    }

    if (caughtError) {
      passedTests++;
    } else {
      throw new Error('System allowed officer to approve without proper role!');
    }
  } catch (err: any) {
    console.error(`  [FAIL] Test 8: ${err.message}`);
  }

  console.log('\n========================================================================');
  console.log(`              TEST RESULT SUMMARY: ${passedTests} / ${totalTests} PASSED`);
  console.log('========================================================================');
  if (passedTests === totalTests) {
    console.log('>>> ALL SURVEY FORM SECTIONS A-I & WORKFLOW TESTS PASSED 100%! <<<\n');
  } else {
    process.exit(1);
  }
}

runSurveyTests().catch((e) => {
  console.error('Test script crashed:', e);
  process.exit(1);
});
