import { PublicPortalService } from '../src/services/publicPortalService';
import { getDb, initDb } from '../src/lib/db';

async function runPublicPortalVerification() {
  console.log('========================================================================');
  console.log('🌐 ZAKAT MANAGEMENT SYSTEM (ZMS) - PUBLIC PORTAL VERIFICATION SUITE');
  console.log('========================================================================\n');

  let passedCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, desc: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✔ [PASS] ${desc}`);
      passedCount++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  await initDb();
  const db = getDb();

  // -------------------------------------------------------------------------
  // TEST SUITE 1: Public Statistics & Foundation Info
  // -------------------------------------------------------------------------
  console.log('[1/7] Testing Public Statistics & Foundation Overview...');
  const stats = await PublicPortalService.getPublicStatistics();
  assert(stats.totalZakatReceived > 0, `Total Zakat Received queried from DB: ฿${stats.totalZakatReceived.toLocaleString()} THB`);
  assert(stats.totalZakatDisbursed > 0, `Total Zakat Disbursed queried from DB: ฿${stats.totalZakatDisbursed.toLocaleString()} THB`);
  assert(stats.totalBeneficiaries >= 0, `Total Beneficiaries served: ${stats.totalBeneficiaries} persons`);
  assert(stats.totalHouseholds >= 0, `Total Households assisted: ${stats.totalHouseholds} households`);
  assert(stats.totalCampaigns >= 1, `Active public donation campaigns: ${stats.totalCampaigns}`);

  // -------------------------------------------------------------------------
  // TEST SUITE 2: Campaigns & Donation Projects
  // -------------------------------------------------------------------------
  console.log('\n[2/7] Testing Public Campaigns & Goals...');
  const campaigns = await PublicPortalService.getCampaigns();
  assert(campaigns.length >= 1, `Loaded ${campaigns.length} active campaigns from database`);
  const firstCamp = campaigns[0];
  assert(Boolean(firstCamp.title && firstCamp.targetAmount > 0), `Campaign "${firstCamp.title}" has valid target ฿${firstCamp.targetAmount.toLocaleString()} THB`);
  assert(firstCamp.progressPercent >= 0 && firstCamp.progressPercent <= 100, `Progress percentage calculated accurately: ${firstCamp.progressPercent}%`);

  // -------------------------------------------------------------------------
  // TEST SUITE 3: Zakat Formula Versions (Shariah Approved)
  // -------------------------------------------------------------------------
  console.log('\n[3/7] Testing Zakat Formula Versions & Shariah Standards...');
  const formulas = await PublicPortalService.getZakatFormulas();
  assert(formulas.length >= 4, `Active Shariah-approved formulas loaded: ${formulas.length} categories`);
  const finFormula = formulas.find((f) => f.category === 'financial');
  assert(Boolean(finFormula && finFormula.ratePercentage === 2.5), `Financial Zakat rate is 2.5% (Version: ${finFormula?.version})`);
  assert(Boolean(finFormula && finFormula.nisabValueThb > 200000), `Financial Nisab benchmark: ฿${finFormula?.nisabValueThb.toLocaleString()} THB (85g gold)`);

  // -------------------------------------------------------------------------
  // TEST SUITE 4: Public Donation, Payment Workflow & Idempotency
  // -------------------------------------------------------------------------
  console.log('\n[4/7] Testing Public Donation, QR Payment & Idempotency...');
  const initialFundRes = await db.execute(`SELECT total_received FROM fund_accounts WHERE id = 'fund-1'`);
  const initialFundTotal = Number(initialFundRes.rows[0].total_received);

  const testIdempotencyKey = `IDEMP-TEST-${Date.now()}`;
  const donationAmount = 15000;

  // First Payment
  const payResult1 = await PublicPortalService.processPublicDonation({
    fundId: 'fund-1',
    donationType: 'zakat',
    categoryTitle: 'ซะกาตทรัพย์สินทางการเงิน (ทดสอบ)',
    amount: donationAmount,
    donorName: 'นาย สมมุติ ผู้บริจาคใจบุญ',
    donorPhone: '081-999-8877',
    donorTaxId: '1100200998877',
    paymentMethod: 'promptpay_qr',
    idempotencyKey: testIdempotencyKey
  });

  assert(Boolean(payResult1.success && payResult1.transactionNo), `Donation processed successfully: Transaction ${payResult1.transactionNo}`);
  assert(Boolean(String(payResult1.receiptNo).startsWith('REC-')), `Official Digital Receipt issued: ${payResult1.receiptNo}`);


  // Verify Fund balance updated in DB
  const updatedFundRes = await db.execute(`SELECT total_received FROM fund_accounts WHERE id = 'fund-1'`);
  const updatedFundTotal = Number(updatedFundRes.rows[0].total_received);
  assert(updatedFundTotal === initialFundTotal + donationAmount, `Fund total increased exactly by ฿${donationAmount.toLocaleString()} THB (Now: ฿${updatedFundTotal.toLocaleString()})`);

  // Second Payment with same Idempotency Key (Simulate network retry or duplicate click)
  const payResult2 = await PublicPortalService.processPublicDonation({
    fundId: 'fund-1',
    donationType: 'zakat',
    categoryTitle: 'ซะกาตทรัพย์สินทางการเงิน (ทดสอบซ้ำ)',
    amount: donationAmount,
    donorName: 'นาย สมมุติ ผู้บริจาคใจบุญ',
    paymentMethod: 'promptpay_qr',
    idempotencyKey: testIdempotencyKey
  });

  assert(Boolean(payResult2.success && payResult2.isDuplicate), `Idempotency successfully intercepted duplicate request (isDuplicate: true)`);
  
  // Verify Fund balance was NOT duplicated
  const thirdFundRes = await db.execute(`SELECT total_received FROM fund_accounts WHERE id = 'fund-1'`);
  const thirdFundTotal = Number(thirdFundRes.rows[0].total_received);
  assert(thirdFundTotal === updatedFundTotal, `Fund balance protected against double counting (Still: ฿${thirdFundTotal.toLocaleString()})`);

  // -------------------------------------------------------------------------
  // TEST SUITE 5: Public Assistance Application Submission
  // -------------------------------------------------------------------------
  console.log('\n[5/7] Testing Public Assistance Application Submission...');
  const testCitizenId = `1940200${Date.now().toString().slice(-6)}`;
  
  const appResult = await PublicPortalService.submitPublicAssistance({
    fullName: 'นาย ซากีรีน หะยีสาและ (ข้อมูลจำลอง)',
    nationalId: testCitizenId,
    phone: '089-776-5544',
    address: '99/5 หมู่ 2 ต.รูสะมิแล',
    province: 'ปัตตานี',
    district: 'เมืองปัตตานี',
    community: 'ชุมชนริมทะเลสาบ',
    asnafCategory: 'faqir',
    requestedAmount: 8500,
    urgencyLevel: 'high',
    monthlyIncome: 3500,
    monthlyExpense: 6000,
    debtAmount: 20000,
    housingCondition: 'poor',
    householdMembers: [
      { fullName: 'นาง รอฮานา หะยีสาและ', relation: 'คู่สมรส', age: 42, occupation: 'ไม่มี', monthlyIncome: 0, healthStatus: 'healthy' },
      { fullName: 'ด.ช. ฟุรกอน หะยีสาและ', relation: 'บุตร', age: 9, occupation: 'นักเรียน', monthlyIncome: 0, healthStatus: 'healthy' }
    ],
    documents: [
      { name: 'สำเนาบัตรประชาชน', category: 'id_card', fileUrl: '/docs/test-id.pdf' },
      { name: 'สำเนาทะเบียนบ้าน', category: 'house_reg', fileUrl: '/docs/test-house.pdf' }
    ]
  });

  assert(Boolean(appResult.success && appResult.applicationNo.startsWith('APP-')), `Application submitted successfully: ${appResult.applicationNo}`);
  assert(Boolean(appResult.maskedId.includes('XXXXX')), `National ID masked on return: ${appResult.maskedId}`);

  // Test duplicate application block
  let duplicateBlocked = false;
  try {
    await PublicPortalService.submitPublicAssistance({
      fullName: 'นาย ซากีรีน หะยีสาและ (พยายามยื่นซ้ำ)',
      nationalId: testCitizenId,
      phone: '089-776-5544',
      address: '99/5',
      province: 'ปัตตานี',
      district: 'เมืองปัตตานี',
      community: 'ชุมชน',
      asnafCategory: 'faqir',
      requestedAmount: 5000,
      monthlyIncome: 3000,
      monthlyExpense: 5000,
      debtAmount: 0,
      housingCondition: 'poor',
      householdMembers: [],
      documents: []
    });
  } catch (err: any) {
    duplicateBlocked = err.message.includes('พบคำร้องขอรับความช่วยเหลือที่มีอยู่แล้วในระบบ');
  }
  assert(duplicateBlocked, `Duplicate active application blocked accurately`);

  // -------------------------------------------------------------------------
  // TEST SUITE 6: Public Assistance Status Tracking & Security Guard
  // -------------------------------------------------------------------------
  console.log('\n[6/7] Testing Assistance Status Tracking & Security Privacy...');
  const trackingKey = appResult.trackingKey; // last 4 digits

  // Valid Tracking Request
  const trackInfo = await PublicPortalService.trackPublicAssistance(appResult.applicationNo, trackingKey);
  assert(trackInfo.applicationNo === appResult.applicationNo, `Tracked application match: ${trackInfo.applicationNo}`);
  assert(trackInfo.status === 'submitted', `Current public status: ${trackInfo.status}`);
  assert(trackInfo.history.length >= 1, `Public timeline history loaded: ${trackInfo.history.length} events`);
  assert(!('livingScore' in trackInfo) && !('living_score' in trackInfo), `Confidential officer assessment score NOT exposed to public`);

  // Invalid Tracking Request (Wrong 4 digits)
  let invalidTrackingBlocked = false;
  try {
    await PublicPortalService.trackPublicAssistance(appResult.applicationNo, '0000');
  } catch (err: any) {
    invalidTrackingBlocked = err.message.includes('ไม่ตรงกับข้อมูลในคำร้อง');
  }
  assert(invalidTrackingBlocked, `Tracking with incorrect 4 digits properly rejected`);

  // -------------------------------------------------------------------------
  // TEST SUITE 7: Public Transparency Report & PDPA Privacy Sanitization
  // -------------------------------------------------------------------------
  console.log('\n[7/7] Testing Public Transparency Report & PDPA Sanitization...');
  const transparency = await PublicPortalService.getPublicTransparencyReport();
  assert(transparency.funds.length >= 6, `Transparency report contains all ${transparency.funds.length} fund accounts`);
  assert(transparency.recentTransactions.length > 0, `Recent transactions log contains entries`);

  // PDPA Check: Ensure no sensitive personal data exists in the public report
  const rawString = JSON.stringify(transparency);
  assert(!rawString.includes('password_hash'), `Zero password_hash leakage in transparency report`);
  assert(!rawString.includes('national_id'), `Zero national_id leakage in transparency report`);
  assert(!rawString.includes('living_score'), `Zero living_score leakage in transparency report`);
  assert(!rawString.includes('debt_purpose'), `Zero personal debt_purpose leakage in transparency report`);

  console.log('\n========================================================================');
  console.log(`🎯 PUBLIC PORTAL VERIFICATION SUMMARY: ${passedCount}/${totalTests} TESTS PASSED (100%)`);
  console.log('========================================================================');
}

runPublicPortalVerification().catch((err) => {
  console.error('\n❌ Verification failed with error:', err);
  process.exit(1);
});
