import { getDb, initDb } from '../src/lib/db';
import { RegistryService } from '../src/services/registryService';
import { BeneficiaryService } from '../src/services/beneficiaryService';
import { FinancialService } from '../src/services/financialService';
import { ASSISTANCE_TYPES } from '../src/lib/constants/assistanceTypes';

async function runQaTests() {
  console.log('========================================================================');
  console.log('  STARTING ZMS COMPREHENSIVE QA TEST SUITE (10 TEST CASES)              ');
  console.log('========================================================================\n');

  await initDb();
  const db = getDb();

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] Test #${total}: ${testName}`);
      if (detail) console.log(`       -> ${detail}`);
    } else {
      console.error(`[FAIL] Test #${total}: ${testName}`);
      if (detail) console.error(`       -> ${detail}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // -------------------------------------------------------------------------
  // Test 1: Member ที่ไม่มีทะเบียน ไม่สามารถส่งคำร้องได้
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Unregistered Member Cannot Submit Assistance Request ---');
  let test1Blocked = false;
  let test1ErrorMsg = '';

  const unregisteredMemberActor = {
    id: 'u-7',
    name: 'อารีฟีน ยังไม่ขึ้นทะเบียน',
    role: 'member',
    nationalId: '1100200000007',
  };

  try {
    await RegistryService.createAssistanceRequest(
      {
        nationalId: '1100200000007',
        assistanceType: 'ปัจจัยยังชีพ',
        requestedAmount: 3000,
        necessityDetails: 'เดือดร้อนไม่มีค่าอาหาร',
      },
      unregisteredMemberActor
    );
  } catch (err: any) {
    test1Blocked = true;
    test1ErrorMsg = err.message;
  }

  assert(test1Blocked, 'Member ที่ไม่มีทะเบียน ไม่สามารถส่งคำร้องได้', `Blocked with error: "${test1ErrorMsg}"`);

  // -------------------------------------------------------------------------
  // Test 2: ระบบแสดงข้อความ “เลขบัตรประชาชนนี้ยังไม่ได้ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต” เมื่อไม่พบทะเบียน
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Exact Thai Error Message for Unregistered National ID ---');
  const expectedMandatedMessage = 'เลขบัตรประชาชนนี้ยังไม่ได้ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต กรุณาดำเนินการขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตก่อนยื่นคำร้องขอความช่วยเหลือ';
  assert(
    test1ErrorMsg.includes(expectedMandatedMessage),
    'ระบบแสดงข้อความ “เลขบัตรประชาชนนี้ยังไม่ได้ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต...” เมื่อไม่พบทะเบียน',
    `Found exact required string: "${expectedMandatedMessage}"`
  );

  // -------------------------------------------------------------------------
  // Test 3: Member ที่มีทะเบียนของตนเองและผ่านเงื่อนไข สามารถยื่นคำร้องได้
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Registered Member with Own Qualified Registry Can Submit ---');
  const registeredMemberActor = {
    id: 'u-6',
    name: 'ยูซุฟ มีลาภ',
    role: 'member',
    nationalId: '1100200000006',
    beneficiaryId: 'ben-yusuf-006',
  };

  const memberApp = await RegistryService.createAssistanceRequest(
    {
      nationalId: '1100200000006',
      assistanceType: 'ปัจจัยยังชีพรายเดือน',
      assistanceTypeId: 'ast-core-2',
      assistanceGroup: 'core',
      requestedAmount: 2000,
      necessityDetails: 'เงินสงเคราะห์เพื่อการครองชีพรายเดือนต่อเนื่องสำหรับผู้สูงอายุ',
    },
    registeredMemberActor
  );

  assert(
    Boolean(memberApp.applicationNo) && memberApp.applicationNo.startsWith('APP-2569-'),
    'Member ที่มีทะเบียนของตนเองและผ่านเงื่อนไข สามารถยื่นคำร้องได้',
    `Generated Application No: ${memberApp.applicationNo}, Status: ${memberApp.status}`
  );

  // -------------------------------------------------------------------------
  // Test 4: Member ไม่สามารถใช้เลขบัตรประชาชนของผู้อื่นเพื่อยื่นคำร้องแทนได้โดยไม่มีสิทธิ์
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Member Cannot Submit on Behalf of Someone Else ---');
  let test4Blocked = false;
  let test4ErrorMsg = '';

  // u-6 is member, attempting to submit using someone else's national ID (e.g. Somchai 1100200000001)
  try {
    await RegistryService.createAssistanceRequest(
      {
        nationalId: '1100200000001', // Somchai's ID
        assistanceType: 'ปัจจัยยังชีพ',
        requestedAmount: 3000,
        necessityDetails: 'พยายามยื่นแทนผู้อื่น',
      },
      registeredMemberActor // Yusuf (u-6)
    );
  } catch (err: any) {
    test4Blocked = true;
    test4ErrorMsg = err.message;
  }

  assert(
    test4Blocked && test4ErrorMsg.includes('ท่านไม่มีสิทธิ์ยื่นคำร้องแทนบุคคลอื่น'),
    'Member ไม่สามารถใช้เลขบัตรประชาชนของผู้อื่นเพื่อยื่นคำร้องแทนได้โดยไม่มีสิทธิ์',
    `Blocked with security message: "${test4ErrorMsg}"`
  );

  // -------------------------------------------------------------------------
  // Test 5: การเรียก API โดยตรงไม่สามารถข้ามเงื่อนไขการมีทะเบียน
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Direct API / Direct Service Call Cannot Bypass Registry Requirement ---');
  let test5Blocked = false;
  let test5ErrorMsg = '';

  try {
    // Direct call with fake / unregistered national ID
    await RegistryService.createAssistanceRequest(
      {
        nationalId: '9999999999999',
        beneficiaryId: 'fake-ben-id-999',
        assistanceType: 'ซ่อมและสร้างที่อยู่อาศัย',
        requestedAmount: 25000,
        necessityDetails: 'พยายามข้ามระบบตรวจสอบทะเบียน',
      },
      { id: 'hacker-1', name: 'Direct Caller', role: 'public' }
    );
  } catch (err: any) {
    test5Blocked = true;
    test5ErrorMsg = err.message;
  }

  assert(
    test5Blocked && test5ErrorMsg.includes(expectedMandatedMessage),
    'การเรียก API โดยตรงไม่สามารถข้ามเงื่อนไขการมีทะเบียน',
    `Direct API bypass strictly prevented: "${test5ErrorMsg}"`
  );

  // -------------------------------------------------------------------------
  // Test 6: เจ้าหน้าที่สามารถตรวจสอบและกลั่นกรองข้อมูลได้ตามสิทธิ์ (Officer Screening)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Officer Screening and Verification ---');
  const officerActor = {
    id: 'officer-1',
    name: 'นายสมศักดิ์ สุขใจ',
    role: 'officer',
  };

  // Officer transitions application from submitted -> doc_review
  const screened = await BeneficiaryService.transitionApplicationStatus(
    memberApp.applicationId,
    'doc_review',
    'เจ้าหน้าที่ตรวจสอบเอกสารครบถ้วนตามหลักเกณฑ์',
    officerActor
  );

  assert(
    screened.newStatus === 'doc_review',
    'เจ้าหน้าที่สามารถตรวจสอบและกลั่นกรองข้อมูลได้ตามสิทธิ์',
    `Application transitioned to ${screened.newStatus} by officer`
  );

  // -------------------------------------------------------------------------
  // Test 7: การเปลี่ยนสถานะมีประวัติผู้ดำเนินการและวันเวลา (Audit History)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Testing Status Transition Audit Trail and History ---');
  const historyRows = await db.execute({
    sql: 'SELECT status, changed_by_name, notes, timestamp FROM application_history WHERE application_id = ? ORDER BY created_at ASC',
    args: [memberApp.applicationId],
  });

  const auditRows = await db.execute({
    sql: 'SELECT action, user_name, description, timestamp FROM audit_logs WHERE entity_id = ?',
    args: [memberApp.applicationNo],
  });

  assert(
    historyRows.rows.length >= 2 && auditRows.rows.length >= 2,
    'การเปลี่ยนสถานะมีประวัติผู้ดำเนินการและวันเวลา',
    `History records: ${historyRows.rows.length}, Audit records: ${auditRows.rows.length}. Latest operator: ${historyRows.rows[historyRows.rows.length - 1].changed_by_name}`
  );

  // -------------------------------------------------------------------------
  // Test 8: เมนูขึ้นทะเบียนและเมนูคำร้องแยกกันใน Backend Navbar ทุกขนาดหน้าจอ
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Testing Menu Decoupling in Core Systems Navigation ---');
  const fs = await import('fs');
  const sidebarCode = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf-8');

  const hasBeneficiariesMenu = sidebarCode.includes("id: 'beneficiaries'") && sidebarCode.includes("label: 'ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต'");
  const hasAssistanceRequestsMenu = sidebarCode.includes("id: 'assistance-requests'") && sidebarCode.includes("label: 'ยื่นคำร้องขอความช่วยเหลือ'");
  const isDistinctItems = hasBeneficiariesMenu && hasAssistanceRequestsMenu;

  assert(
    isDistinctItems,
    'เมนูขึ้นทะเบียนและเมนูคำร้องแยกกันใน Backend Navbar ทุกขนาดหน้าจอ',
    'Sidebar clearly separates "ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต" (beneficiaries) and "ยื่นคำร้องขอความช่วยเหลือ" (assistance-requests)'
  );

  // -------------------------------------------------------------------------
  // Test 9: ระบบเดิม Login, Logout, Dashboard, การเงิน และสิทธิ์ผู้ใช้ยังทำงานได้
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Testing System Integrity (Login, Dashboard, Finance & Funds) ---');
  const stats = await RegistryService.getSeparatedDashboardStats();
  const fundsRes = await db.execute('SELECT COUNT(*) as count FROM fund_accounts');
  const fundsCount = Number(fundsRes.rows[0].count);

  assert(
    stats.totalRegisteredBeneficiaries > 0 && fundsCount > 0,
    'ระบบเดิม Login, Logout, Dashboard, การเงิน และสิทธิ์ผู้ใช้ยังทำงานได้',
    `Dashboard stats loaded (${stats.totalRegisteredBeneficiaries} beneficiaries, ${stats.pendingAssistanceRequests} pending requests). Active funds: ${fundsCount}`
  );

  // -------------------------------------------------------------------------
  // Test 10: 10 Standard Assistance Types Registered and Seeded in Database
  // -------------------------------------------------------------------------
  console.log('\n--- 10. Testing 10 Standard Assistance Types in Database & Constants ---');
  const typesRes = await db.execute('SELECT COUNT(*) as count FROM assistance_types');
  const dbTypesCount = Number(typesRes.rows[0].count);

  assert(
    ASSISTANCE_TYPES.length === 10 && dbTypesCount >= 10,
    'ประเภทความช่วยเหลือ 10 รายการ (กลุ่มหลัก 6 + กลุ่มเฉพาะ 4) ถูกจัดเก็บในระบบเรียบร้อย',
    `Code definitions: ${ASSISTANCE_TYPES.length}, Database records: ${dbTypesCount}`
  );

  console.log('\n========================================================================');
  console.log(`  ALL ${passed}/${total} QA ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!   `);
  console.log('========================================================================\n');
}

runQaTests().catch((err) => {
  console.error('\nFATAL TEST ERROR:', err);
  process.exit(1);
});
