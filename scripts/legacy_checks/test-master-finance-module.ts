import { FinancialService, maskAccountNumber, toSatang, fromSatang, round2 } from '../src/services/financialService';
import { getDb, initDb } from '../src/lib/db';

async function runMasterFinanceTests() {
  console.log('========================================================================');
  console.log('=== MASTER PROMPT FINANCE & ACCOUNTING MODULE VERIFICATION TESTS ===');
  console.log('========================================================================\n');

  await initDb();
  const db = getDb();

  const superAdminActor = { id: 'u-1', name: 'อิบรอฮีม มานะชัย', role: 'super_admin' };
  const financeActor = { id: 'u-5', name: 'ฟาติมะฮ์ หวังดี', role: 'finance' };
  const approverActor = { id: 'u-4', name: 'อิหม่ามฟารุก อาลี', role: 'approver' };
  const officerActor = { id: 'u-3', name: 'อุสมาน เจริญสุข', role: 'officer' };

  let passed = 0;
  let failed = 0;

  // TEST 1: Bank Accounts Management (3 Initial Accounts & Masking)
  console.log('--- TEST 1: Bank Accounts Setup & Account Number Masking ---');
  try {
    const bankAccounts = await FinancialService.getBankAccounts();
    if (bankAccounts.length < 3) {
      throw new Error(`คาดหวังบัญชีธนาคารตั้งต้นอย่างน้อย 3 บัญชี แต่พบ ${bankAccounts.length}`);
    }

    const ibank1 = bankAccounts.find((b) => b.accountName.includes('มูลนิธิซะกาตและสาธารณกุศล'));
    const ibank2 = bankAccounts.find((b) => b.accountName.includes('มูลนิธิบัยตุลมาล ยะลา') && b.bankName.includes('อิสลาม'));
    const ktb = bankAccounts.find((b) => b.accountName.includes('มูลนิธิบัยตุลมาล ยะลา') && b.bankName.includes('กรุงไทย'));

    if (!ibank1 || !ibank2 || !ktb) {
      throw new Error('ไม่พบบัญชีธนาคารครบ 3 บัญชีตามข้อกำหนด Master Prompt');
    }

    const masked1 = maskAccountNumber(ibank1.accountNumber);
    console.log(`[PASS] ตรวจพบบัญชีธนาคาร 3 บัญชีตั้งต้นครบถ้วน`);
    console.log(`       1. ${ibank1.accountName} | เลขบัญชีปกปิด: ${masked1} | คงเหลือ: ฿${ibank1.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    console.log(`       2. ${ibank2.accountName} | เลขบัญชีปกปิด: ${maskAccountNumber(ibank2.accountNumber)} | คงเหลือ: ฿${ibank2.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    console.log(`       3. ${ktb.accountName} | เลขบัญชีปกปิด: ${maskAccountNumber(ktb.accountNumber)} | คงเหลือ: ฿${ktb.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 1:', err.message);
    failed++;
  }

  // TEST 2: Bank Reconciliation Workflow
  console.log('\n--- TEST 2: Bank Reconciliation (การกระทบยอดธนาคาร) ---');
  try {
    const bankAccounts = await FinancialService.getBankAccounts();
    const targetBank = bankAccounts[0];
    const testStatementBal = round2(targetBank.currentBalance - 5000); // simulate 5,000 difference

    const recResult = await FinancialService.reconcileBankAccount(
      {
        bankAccountId: targetBank.id,
        reconciliationDate: '21 ต.ค. 2569 20:00',
        statementBalance: testStatementBal,
        notes: 'ทดสอบการกระทบยอดพบเช็คระหว่างเคลียริ่ง 5,000 บาท',
      },
      financeActor
    );

    if (recResult.difference === 5000 && recResult.status === 'discrepancy') {
      console.log(`[PASS] กระทบยอดธนาคารสำเร็จ: คำนวณผลต่างได้ตรงเป๊ะ (ผลต่าง: ฿${recResult.difference.toLocaleString('th-TH', { minimumFractionDigits: 2 })}, สถานะ: ${recResult.status})`);
      passed++;
    } else {
      throw new Error(`ผลต่างหรือสถานะไม่ถูกต้อง: ${JSON.stringify(recResult)}`);
    }
  } catch (err: any) {
    console.error('[FAIL] Test 2:', err.message);
    failed++;
  }

  // TEST 3: 5-Step Cash Movement Workflow
  console.log('\n--- TEST 3: 5-Step Deposit-Withdrawal Workflow (การเคลื่อนย้ายเงินสด 5 ขั้นตอน) ---');
  try {
    const bankAccounts = await FinancialService.getBankAccounts();
    const bank = bankAccounts[0];
    const initialBankBal = bank.currentBalance;

    // Step 1: Withdraw from bank
    const wfRes = await FinancialService.createCashFlowWorkflow(
      {
        title: 'โครงการจัดหาถุงยังชีพฉุกเฉินและสุขาเคลื่อนที่ช่วยผู้ประสบอุทกภัย',
        bankAccountId: bank.id,
        withdrawAmount: 50000.0,
        notes: 'เบิกเงินสดเพื่อมอบหมายให้เหรัญญิกดูแล',
      },
      financeActor
    );
    console.log(`[PASS] ขั้นตอนที่ 1 เบิกเงินจากธนาคารสำเร็จ: คำขอเลขที่ ${wfRes.workflowNo}`);

    // Check bank balance deducted
    const banksAfter = await FinancialService.getBankAccounts();
    const bankAfter = banksAfter.find((b) => b.id === bank.id)!;
    if (round2(initialBankBal - bankAfter.currentBalance) !== 50000.0) {
      throw new Error('ยอดเงินในบัญชีธนาคารไม่ถูกหักหลังเบิกเงินสด');
    }

    // Step 2: Deposit to Treasurer (Ruslan Hasamae)
    await FinancialService.advanceWorkflowToStep2(
      wfRes.id,
      {
        depositAmount: 50000.0,
        refNo: `TREAS-REC-${Date.now().toString().slice(-4)}`,
        notes: 'นายรุสลัน หะสาเมาะ ได้รับมอบเงินสดครบถ้วน 50,000 บาท',
        proofUrl: 'https://zms-storage.local/proofs/treasurer-receipt-50000.pdf',
        proofName: 'treasurer-receipt-50000.pdf',
      },
      financeActor
    );
    console.log(`[PASS] ขั้นตอนที่ 2 ฝากเข้าบัญชีเหรัญญิก (นายรุสลัน หะสาเมาะ) สำเร็จ`);

    // Step 3: Cash withdrawal by Mukhlis Meeraya
    await FinancialService.advanceWorkflowToStep3(
      wfRes.id,
      {
        withdrawAmount: 50000.0,
        purpose: 'จัดซื้อถุงยังชีพและมอบทุนยังชีพฉุกเฉิน',
        targetAsnaf: 'faqir_miskin',
        targetFundId: 'fund-1',
        approverId: approverActor.id,
        approverName: approverActor.name,
      },
      financeActor
    );
    console.log(`[PASS] ขั้นตอนที่ 3 เบิกเงินสดเพื่อจัดสรรช่วยเหลือ (นายมุกลิส มีระยะ) สำเร็จ`);

    // Step 4: Aid allocated
    await FinancialService.advanceWorkflowToStep4(
      wfRes.id,
      {
        allocatedAmount: 48500.0,
        distributionSummary: 'จัดซื้อถุงยังชีพ 40 ชุด (฿40,000) และมอบเงินสดฉุกเฉิน 17 ราย (฿8,500)',
      },
      financeActor
    );
    console.log(`[PASS] ขั้นตอนที่ 4 จัดสรรเงินช่วยเหลือจริง ฿48,500 บาท สำเร็จ`);

    // Step 5: Audit & Close with cash return
    await FinancialService.advanceWorkflowToStep5(
      wfRes.id,
      {
        reconciledAmount: 50000.0,
        remainingCash: 1500.0, // 50,000 - 48,500 = 1,500
        notes: 'ตรวจสอบใบเสร็จและรายชื่อผู้รับเงินครบถ้วน เงินสดคงเหลือ 1,500 บาท ส่งคืนเหรัญญิกเรียบร้อย',
      },
      financeActor
    );
    console.log(`[PASS] ขั้นตอนที่ 5 ตรวจสอบ กระทบยอด และปิดรายการสำเร็จ (เงินสดคงเหลือส่งคืน: ฿1,500)`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 3:', err.message);
    failed++;
  }

  // TEST 4: Asnaf Allocation (8 Asnafs, 100% Validation & Audit History)
  console.log('\n--- TEST 4: Asnaf Allocation (สัดส่วน 8 อัสนัฟ 100% และระบบประวัติ) ---');
  try {
    const initialAsnafs = await FinancialService.getAsnafAllocations('2569');
    const totalInitialPct = initialAsnafs.reduce((acc, a) => acc + a.percentage, 0);
    if (Math.abs(totalInitialPct - 100.0) > 0.001) {
      throw new Error(`สัดส่วนอัสนัฟตั้งต้นรวมไม่เท่ากับ 100% (ได้ ${totalInitialPct}%)`);
    }

    const faqir = initialAsnafs.find((a) => a.asnafCode === 'faqir_miskin');
    const amil = initialAsnafs.find((a) => a.asnafCode === 'amil');
    if (faqir?.percentage !== 70.0 || amil?.percentage !== 12.0) {
      throw new Error('สัดส่วนตั้งต้น ฟากีร-มิสกิน (70%) หรือ อามีลีน (12%) ไม่ตรงตาม Master Prompt');
    }
    console.log(`[PASS] สัดส่วน 8 อัสนัฟตั้งต้นครบ 100%: ฟากีร-มิสกิน 70%, อามีลีน 12%, อื่นๆ 18%`);

    // Test rejection when sum != 100%
    let rejectedAsExpected = false;
    try {
      await FinancialService.updateAsnafAllocations(
        [
          { asnafCode: 'faqir_miskin', percentage: 75.0 },
          { asnafCode: 'amil', percentage: 12.0 },
          { asnafCode: 'muallaf', percentage: 3.0 },
          { asnafCode: 'gharimin', percentage: 3.0 },
          { asnafCode: 'fisabilillah', percentage: 7.0 },
          { asnafCode: 'ibnsabil', percentage: 1.0 },
          { asnafCode: 'humanitarian', percentage: 4.0 },
        ], // Sum = 105% !
        '2569',
        'มติทดสอบ',
        'ทดสอบผลรวมเกิน',
        superAdminActor
      );
    } catch (e: any) {
      if (e.message.includes('ผลรวมเปอร์เซ็นต์ต้องเท่ากับ 100%')) {
        rejectedAsExpected = true;
      }
    }

    if (!rejectedAsExpected) {
      throw new Error('ระบบต้องปฏิเสธการบันทึกสัดส่วนอัสนัฟที่รวมกันไม่เท่ากับ 100%');
    }
    console.log(`[PASS] ระบบป้องกันและแจ้งเตือนเมื่อผลรวมเปอร์เซ็นต์ไม่เท่ากับ 100% สำเร็จ`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 4:', err.message);
    failed++;
  }

  // TEST 5: Faqir-Miskin Sub-Fund Exact Penny Allocation (1,438,311.34 THB Example)
  console.log('\n--- TEST 5: Faqir-Miskin 5 Sub-Funds Penny Allocation (ตัวอย่าง 1,438,311.34 บาท) ---');
  try {
    const testPoolAmount = 1438311.34;
    const subFundSpecs = [
      { code: 'living', pct: 15.0 },
      { code: 'housing', pct: 20.0 },
      { code: 'career', pct: 20.0 },
      { code: 'education', pct: 35.0 },
      { code: 'emergency', pct: 10.0 },
    ];

    const breakdown = FinancialService.calculatePennyAllocation(testPoolAmount, subFundSpecs);

    const living = breakdown.get('living')!;
    const housing = breakdown.get('housing')!;
    const career = breakdown.get('career')!;
    const education = breakdown.get('education')!;
    const emergency = breakdown.get('emergency')!;

    console.log(`       ยอดจัดสรรต้นทาง: ฿${testPoolAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    console.log(`       1. ปัจจัยยังชีพ (15%): ฿${living.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (คาดหวัง 215,746.70)`);
    console.log(`       2. ซ่อมและสร้างที่อยู่อาศัย (20%): ฿${housing.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (คาดหวัง 287,662.27)`);
    console.log(`       3. ต่อยอดอาชีพ (20%): ฿${career.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (คาดหวัง 287,662.27)`);
    console.log(`       4. ทุนการศึกษา (35%): ฿${education.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (คาดหวัง 503,408.97)`);
    console.log(`       5. ช่วยเหลือฉุกเฉิน (10%): ฿${emergency.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (คาดหวัง 143,831.13)`);

    const sumCalculated = round2(living + housing + career + education + emergency);
    console.log(`       รวมยอดทั้ง 5 กองทุนย่อย: ฿${sumCalculated.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);

    if (
      living === 215746.70 &&
      housing === 287662.27 &&
      career === 287662.27 &&
      education === 503408.97 &&
      emergency === 143831.13 &&
      sumCalculated === testPoolAmount
    ) {
      console.log(`[PASS] อัลกอริทึมจัดการเศษสตางค์ (Penny Allocation) ให้ผลลัพธ์ตรงกับตัวอย่างใน Master Prompt 100% ทุกทศนิยม`);
      passed++;
    } else {
      throw new Error(`ยอดจัดสรรไม่ตรงกับค่าเป้าหมาย: ได้ผลรวม ${sumCalculated} (คาดหวัง ${testPoolAmount})`);
    }
  } catch (err: any) {
    console.error('[FAIL] Test 5:', err.message);
    failed++;
  }

  // TEST 6: Categorized Incomes & Administrative Expense Categories
  console.log('\n--- TEST 6: 3 Income Categories & 10 Admin Expense Categories ---');
  try {
    // 1. Zakat Income
    const zakatInc = await FinancialService.recordIncome(
      {
        fundId: 'fund-1',
        category: 'ซะกาตเงินฝากและทองคำ',
        amount: 85000.0,
        payer: 'ผู้ไม่ประสงค์ออกนาม',
        paymentMethod: 'bank_transfer',
        referenceNo: `ZKT-DEP-${Date.now()}`,
        moneyType: 'zakat',
        zakatYear: '2569',
        isAnonymous: true,
      },
      financeActor
    );
    console.log(`[PASS] บันทึกรายรับซะกาต (ไม่ประสงค์ออกนาม): ${zakatInc.transactionNo} (ใบรับเงิน: ${zakatInc.receiptNo})`);

    // 2. Administrative Donation
    const adminInc = await FinancialService.recordIncome(
      {
        fundId: 'fund-6',
        category: 'เงินบริจาคสมทบค่าใช้จ่ายดำเนินงานมูลนิธิ',
        amount: 30000.0,
        payer: 'ห้างหุ้นส่วนจำกัด มิตรอารี',
        paymentMethod: 'bank_transfer',
        referenceNo: `ADM-DEP-${Date.now()}`,
        moneyType: 'operational_admin',
        zakatYear: '2569',
      },
      financeActor
    );
    console.log(`[PASS] บันทึกรายรับสำหรับบริหาร: ${adminInc.transactionNo}`);

    // 3. 10 Admin Expense Categories
    const adminCats = await FinancialService.getAdminExpenseCategories();
    if (adminCats.length < 10) {
      throw new Error(`หมวดค่าใช้จ่ายบริหารตั้งต้นต้องมีอย่างน้อย 10 หมวด แต่พบ ${adminCats.length}`);
    }
    console.log(`[PASS] ตรวจพบหมวดค่าใช้จ่ายบริหาร 10 หมวดตั้งต้นครบถ้วน (เช่น ค่าตอบแทน, สำนักงาน, น้ำมัน, รถยนต์, เน็ต, เดินทาง, บัญชี, ตรวจสอบ, อาหาร, ไฟฟ้า)`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 6:', err.message);
    failed++;
  }

  // TEST 7: Dashboard Aggregator & Financial Reports Generation
  console.log('\n--- TEST 7: Financial Dashboard & Reporting Aggregator ---');
  try {
    const dashboard = await FinancialService.getDashboardSummary();
    if (
      typeof dashboard.kpi.totalIncome !== 'number' ||
      typeof dashboard.kpi.totalBankBalance !== 'number' ||
      typeof dashboard.kpi.totalCashOnHand !== 'number' ||
      !Array.isArray(dashboard.charts.incomeVsExpense) ||
      !Array.isArray(dashboard.charts.asnafAllocations)
    ) {
      throw new Error('โครงสร้างข้อมูล Dashboard ไม่สมบูรณ์');
    }

    console.log(`[PASS] Dashboard Aggregator ทำงานสมบูรณ์:`);
    console.log(`       - รายรับรวม: ฿${dashboard.kpi.totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    console.log(`       - เงินคงเหลือในบัญชีธนาคาร: ฿${dashboard.kpi.totalBankBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    console.log(`       - เงินสดคงเหลือตรวจนับแล้ว: ฿${dashboard.kpi.totalCashOnHand.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    console.log(`       - จำนวนอัสนัฟในกราฟ: ${dashboard.charts.asnafAllocations.length} หมวด`);

    const incomeReport = await FinancialService.getFinancialReports('income_by_type');
    const asnafReport = await FinancialService.getFinancialReports('aid_by_asnaf');
    const bankReport = await FinancialService.getFinancialReports('bank_balances');
    const csvExport = await FinancialService.exportReportCsv('bank_balances');

    if (incomeReport.rows.length === 0 || asnafReport.rows.length === 0 || bankReport.rows.length === 0 || !csvExport.startsWith('\uFEFF')) {
      throw new Error('การสร้างรายงานทางการเงินล้มเหลว');
    }
    console.log(`[PASS] สร้างรายงานการเงินสำเร็จ (ส่งออก CSV สำหรับ Excel มี UTF-8 BOM ถูกต้อง)`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 7:', err.message);
    failed++;
  }

  console.log('\n========================================================================');
  console.log(`=== MASTER FINANCE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed}) ===`);
  console.log('========================================================================\n');

  if (failed === 0) {
    console.log('>>> ALL MASTER PROMPT FINANCE VERIFICATION TESTS PASSED 100%! <<<');
  } else {
    process.exit(1);
  }
}

runMasterFinanceTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
