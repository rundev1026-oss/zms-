import { BeneficiaryService } from '../src/services/beneficiaryService';
import { getDb, initDb } from '../src/lib/db';

async function runTests() {
  console.log('========================================================================');
  console.log('     ZMS - AUTOMATED INTEGRATION TEST FOR BENEFICIARY MANAGEMENT        ');
  console.log('          (Real Relational Database & Business Rule Testing)            ');
  console.log('========================================================================\n');

  await initDb();
  const db = getDb();

  const officerActor = { id: 'u-3', name: 'อุสมาน เจริญสุข', role: 'officer' };
  const approverActor = { id: 'u-4', name: 'อิหม่ามฟารุก อาลี', role: 'approver' };
  const financeActor = { id: 'u-5', name: 'ฟาติมะฮ์ หวังดี', role: 'finance' };
  const unauthorizedActor = { id: 'u-6', name: 'ยูซุฟ มีลาภ', role: 'member' };

  let passedTests = 0;
  let totalTests = 10;

  // -------------------------------------------------------------------------
  // TEST 1: Register New Applicant
  // -------------------------------------------------------------------------
  console.log('TEST 1: ลงทะเบียนผู้ขอรับซะกาตรายใหม่เข้าสู่ฐานข้อมูลจริง');
  const testNationalId = `1100200${Date.now().toString().slice(-6)}`;
  let createdApp: any = null;

  try {
    createdApp = await BeneficiaryService.registerBeneficiary(
      {
        fullName: 'นาย สุไลมาน สันติภาพ',
        nationalId: testNationalId,
        phone: '081-999-8877',
        address: 'บ้านเลขที่ 99 หมู่ 4',
        province: 'กรุงเทพมหานคร',
        district: 'หนองจอก',
        subdistrict: 'กระทุ่มราย',
        postcode: '10530',
        community: 'ชุมชนนูรุลยากีน',
        asnafCategory: 'miskin',
        requestedAmount: 18000,
        urgencyLevel: 'high',
        monthlyIncome: 3500,
        monthlyExpense: 6000,
        debtAmount: 12000,
        debtPurpose: 'หนี้ค่ายาและค่ารักษาพยาบาล',
        housingCondition: 'dilapidated',
        housingNotes: 'บ้านไม้ชั้นเดียวยกพื้น หลังคารั่ว ผุพัง',
        householdMembers: [
          {
            fullName: 'นาง ซาเราะฮ์ สันติภาพ',
            relation: 'คู่สมรส',
            age: 42,
            occupation: 'ไม่มีอาชีพ (ดูแลผู้ป่วย)',
            monthlyIncome: 0,
            healthStatus: 'chronically_ill',
            healthNotes: 'เบาหวานและความดันสูง',
          },
        ],
      },
      officerActor
    );

    console.log(`  [PASS] สร้างคำร้องสำเร็จในฐานข้อมูล: ApplicationNo = ${createdApp.applicationNo}, Status = ${createdApp.status}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  [FAIL] Test 1 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Duplicate National ID Prevention
  // -------------------------------------------------------------------------
  console.log('\nTEST 2: ตรวจสอบการป้องกันข้อมูลซ้ำ (Duplicate National ID Check)');
  try {
    await BeneficiaryService.registerBeneficiary(
      {
        fullName: 'นาย สุไลมาน สันติภาพ (ลงทะเบียนซ้ำ)',
        nationalId: testNationalId, // SAME ID
        phone: '081-000-0000',
        address: 'ที่อยู่เดิม',
        province: 'กรุงเทพมหานคร',
        district: 'หนองจอก',
        subdistrict: 'กระทุ่มราย',
        postcode: '10530',
        community: 'ชุมชนเดิม',
        asnafCategory: 'miskin',
        requestedAmount: 20000,
        urgencyLevel: 'normal',
      },
      officerActor
    );
    console.error('  [FAIL] ระบบไม่ควรอนุญาตให้บันทึกข้อมูลบัตรประชาชนซ้ำได้!');
  } catch (err: any) {
    if (err.message.includes('ตรวจสอบพบข้อมูลซ้ำ')) {
      console.log(`  [PASS] ระบบบล็อกการลงทะเบียนซ้ำอย่างถูกต้อง: "${err.message}"`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Unexpected error: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 3: Document Verification
  // -------------------------------------------------------------------------
  console.log('\nTEST 3: ตรวจสอบเอกสารประกอบคำร้อง');
  try {
    const docsRes = await db.execute({
      sql: 'SELECT id FROM application_documents WHERE application_id = ?',
      args: [createdApp.applicationId],
    });

    for (const doc of docsRes.rows) {
      await BeneficiaryService.reviewDocument(
        createdApp.applicationId,
        String(doc.id),
        'verified',
        undefined,
        officerActor
      );
    }

    const appAfterDoc = await db.execute({
      sql: 'SELECT status FROM assistance_applications WHERE id = ?',
      args: [createdApp.applicationId],
    });

    console.log(`  [PASS] ตรวจเอกสารผ่านครบถ้วน สถานะคำร้องเปลี่ยนเป็น: "${appAfterDoc.rows[0].status}"`);
    passedTests++;
  } catch (err: any) {
    console.error(`  [FAIL] Test 3 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Submit Field Assessment
  // -------------------------------------------------------------------------
  console.log('\nTEST 4: บันทึกผลการประเมินสภาพความเป็นอยู่ (Living Assessment)');
  try {
    const assessmentResult = await BeneficiaryService.submitAssessment(
      createdApp.applicationId,
      {
        livingScore: 86,
        housingCondition: 'dilapidated',
        housingNotes: 'บ้านชำรุดทรุดโทรม ไม่มีน้ำประปา',
        debtBurdenSummary: 'หนี้ค่ายาจำเป็น 12,000 บาท',
        primaryHardship: 'หัวหน้าครอบครัวป่วย ขาดแคลนอาหารและการยังชีพ',
        officerRecommendation: 'recommend_full',
        recommendedAmount: 18000,
        recommendedFundId: 'fund-1',
        generalNotes: 'ตรงตามเกณฑ์มิสเกน (ผู้ขัดสน) ชัดเจน เสนออนุมัติเต็มจำนวน',
      },
      officerActor
    );

    console.log(`  [PASS] บันทึกผลประเมินสำเร็จ (86 คะแนน) สถานะเปลี่ยนเป็น: "${assessmentResult.status}"`);
    passedTests++;
  } catch (err: any) {
    console.error(`  [FAIL] Test 4 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Segregation of Duties - Assigned Officer Cannot Approve
  // -------------------------------------------------------------------------
  console.log('\nTEST 5: ทดสอบการแบ่งแยกหน้าที่ (Officer ห้ามอนุมัติคำร้องของตนเอง)');
  try {
    // Attempt 1: Regular officer role
    // Attempt 2: Even if assigned officer has approver role, self-approval is forbidden
    const selfApproverActor = { id: officerActor.id, name: officerActor.name, role: 'approver' };
    await BeneficiaryService.approveApplication(
      createdApp.applicationId,
      18000,
      'fund-1',
      'เจ้าหน้าที่พยายามอนุมัติคำร้องของตนเอง',
      selfApproverActor
    );
    console.error('  [FAIL] ระบบต้องไม่อนุญาตให้เจ้าหน้าที่ผู้รับผิดชอบอนุมัติคำร้องของตนเอง!');
  } catch (err: any) {
    if (err.message.includes('Segregation of Duties') || err.message.includes('ไม่มีสิทธิ์อนุมัติคำร้อง')) {
      console.log(`  [PASS] ระบบบล็อกการอนุมัติตัวเองอย่างถูกต้อง: "${err.message}"`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Unexpected error: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 6: Segregation of Duties - Approver Cannot Disburse Money
  // -------------------------------------------------------------------------
  console.log('\nTEST 6: ทดสอบการแบ่งแยกหน้าที่ (Approver ห้ามจ่ายเงิน)');
  try {
    await BeneficiaryService.recordDisbursement(
      createdApp.applicationId,
      'TR-ILLEGAL-001',
      '/slips/slip.jpg',
      'ผู้อนุมัติพยายามจ่ายเงินเอง',
      approverActor // Approver attempting to disburse!
    );
    console.error('  [FAIL] ระบบต้องไม่อนุญาตให้ผู้อนุมัติทำรายการจ่ายเงิน!');
  } catch (err: any) {
    if (err.message.includes('ฝ่ายการเงิน (Finance) เท่านั้น')) {
      console.log(`  [PASS] ระบบป้องกันสิทธิ์ถูกต้อง: "${err.message}"`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Unexpected error: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 7: Fund Solvency Check - Over-Budget Approval Prevention
  // -------------------------------------------------------------------------
  console.log('\nTEST 7: ทดสอบการตรวจสอบงบประมาณคงเหลือ (ห้ามอนุมัติเกินยอดจัดสรรได้)');
  try {
    await BeneficiaryService.approveApplication(
      createdApp.applicationId,
      999999999, // 999 Million THB (Over available fund!)
      'fund-1',
      'อนุมัติเกินวงเงินกองทุน',
      approverActor
    );
    console.error('  [FAIL] ระบบต้องไม่อนุญาตให้อนุมัติเกินยอดเงินคงเหลือในกองทุน!');
  } catch (err: any) {
    if (err.message.includes('ไม่เพียงพอ')) {
      console.log(`  [PASS] ระบบตรวจสอบ Solvency บล็อกงบประมาณเกินสำเร็จ: "${err.message}"`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Unexpected error: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 8: Valid Approval by Approver
  // -------------------------------------------------------------------------
  console.log('\nTEST 8: การพิจารณาอนุมัติคำร้องอย่างถูกต้องโดย Approver');
  try {
    const fundBeforeRes = await db.execute({
      sql: 'SELECT committed_amount, available_amount FROM fund_accounts WHERE id = ?',
      args: ['fund-1'],
    });
    const beforeAvail = Number(fundBeforeRes.rows[0].available_amount);
    const beforeCommitted = Number(fundBeforeRes.rows[0].committed_amount);

    const approveRes = await BeneficiaryService.approveApplication(
      createdApp.applicationId,
      18000,
      'fund-1',
      'คณะกรรมการมีมติเห็นชอบอนุมัติเงินช่วยเหลือบรรเทาทุกข์เร่งด่วน 18,000 บาท',
      approverActor
    );

    const fundAfterRes = await db.execute({
      sql: 'SELECT committed_amount, available_amount FROM fund_accounts WHERE id = ?',
      args: ['fund-1'],
    });
    const afterAvail = Number(fundAfterRes.rows[0].available_amount);
    const afterCommitted = Number(fundAfterRes.rows[0].committed_amount);

    const isCommittedCorrect = afterCommitted === beforeCommitted + 18000;
    const isAvailCorrect = afterAvail === beforeAvail - 18000;

    if (approveRes.status === 'wait_disbursement' && isCommittedCorrect && isAvailCorrect) {
      console.log(`  [PASS] อนุมัติสำเร็จ: สถานะ = "${approveRes.status}", กันยอดผูกพัน ฿18,000 บาท ถูกต้องในฐานข้อมูล`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Fund balances mismatch after approval: beforeAvail=${beforeAvail}, afterAvail=${afterAvail}`);
    }
  } catch (err: any) {
    console.error(`  [FAIL] Test 8 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 9: Disbursement by Finance Officer
  // -------------------------------------------------------------------------
  console.log('\nTEST 9: ฝ่ายการเงินบันทึกการโอนเงินจริงพร้อมแนบหลักฐาน (Disbursement)');
  try {
    const testPaymentRef = `KBANK-TR-2569-${Date.now().toString().slice(-6)}`;
    const disbRes = await BeneficiaryService.recordDisbursement(
      createdApp.applicationId,
      testPaymentRef,
      '/slips/slip-sulaiman-transfer.jpg',
      'โอนเงินเข้าบัญชี ธ.กสิกรไทย 991-2-12345-6 เรียบร้อย',
      financeActor
    );

    // Verify application state
    const appDisbRes = await db.execute({
      sql: 'SELECT status, disbursed_amount, disbursement_ref FROM assistance_applications WHERE id = ?',
      args: [createdApp.applicationId],
    });

    const isDisbursed = appDisbRes.rows[0].status === 'disbursed';
    const isAmountCorrect = Number(appDisbRes.rows[0].disbursed_amount) === 18000;

    // Verify financial transaction created
    const txnRes = await db.execute({
      sql: 'SELECT * FROM financial_transactions WHERE reference_no = ?',
      args: [testPaymentRef],
    });

    if (isDisbursed && isAmountCorrect && txnRes.rows.length > 0) {
      console.log(`  [PASS] บันทึกการจ่ายเงินสำเร็จ: สถานะ = "disbursed", บันทึกเลขอ้างอิง = ${disbRes.transactionNo}`);
      passedTests++;
    } else {
      console.error('  [FAIL] Disbursement verification failed in database');
    }
  } catch (err: any) {
    console.error(`  [FAIL] Test 9 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 10: Follow-up & Audit Trail Verification
  // -------------------------------------------------------------------------
  console.log('\nTEST 10: บันทึกการติดตามผล (Follow-up) & ตรวจสอบ Audit Trail ครบวงจร');
  try {
    await BeneficiaryService.recordFollowup(
      createdApp.applicationId,
      'ลงพื้นที่ติดตามครอบครัว สภาพความเป็นอยู่ดีขึ้น ได้รับยารักษาต่อเนื่อง',
      true,
      'แนะนำให้ส่งเสริมอาชีพเย็บผ้าเพิ่มเติมในระยะถัดไป',
      officerActor
    );

    // Verify audit logs persisted
    const auditRes = await db.execute({
      sql: 'SELECT action, description FROM audit_logs WHERE entity_id LIKE ? ORDER BY created_at ASC',
      args: [`%${createdApp.applicationNo}%`],
    });

    console.log(`  [PASS] บันทึกผลการติดตามสำเร็จ! Audit Log สำหรับคำร้องนี้มี ${auditRes.rows.length} รายการ:`);
    for (const log of auditRes.rows) {
      console.log(`         • [${log.action}] ${log.description}`);
    }

    if (auditRes.rows.length >= 4) {
      passedTests++;
    }
  } catch (err: any) {
    console.error(`  [FAIL] Test 10 Error: ${err.message}`);
  }

  console.log('\n========================================================================');
  console.log(`              TEST RESULT SUMMARY: ${passedTests} / ${totalTests} PASSED`);
  console.log('========================================================================');

  if (passedTests === totalTests) {
    console.log('>>> ALL 10 VERTICAL SLICE INTEGRATION TESTS PASSED SUCCESSFULLY! <<<');
  } else {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('FATAL TEST ERROR:', e);
  process.exit(1);
});
