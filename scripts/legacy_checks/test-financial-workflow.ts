import { FinancialService, toSatang, fromSatang, round2 } from '../src/services/financialService';
import { BeneficiaryService } from '../src/services/beneficiaryService';
import { getDb, initDb } from '../src/lib/db';

async function runFinancialTests() {
  console.log('========================================================================');
  console.log('=== ZMS FINANCIAL MANAGEMENT MODULE: REAL DATABASE VERIFICATION TEST ===');
  console.log('========================================================================\n');

  await initDb();
  const db = getDb();

  const financeActor = {
    id: 'u-5',
    name: 'ฟาติมะฮ์ หวังดี',
    role: 'finance',
  };

  const approverActor = {
    id: 'u-4',
    name: 'อิหม่ามฟารุก อาลี',
    role: 'approver',
  };

  const officerActor = {
    id: 'u-3',
    name: 'อุสมาน เจริญสุข',
    role: 'officer',
  };

  let passed = 0;
  let failed = 0;

  // Reconcile database balances from journal transactions
  await FinancialService.reconcileBalances();

  // TEST 1: Record Income with Decimal/Satang Precision
  console.log('--- TEST 1: Record Zakat Income with Decimal/Satang Precision ---');
  const testRefNo1 = `BBL-DEP-${Date.now()}-01`;
  try {
    const fundsBefore = await FinancialService.getFunds();
    const fund1Before = fundsBefore.find((f) => f.id === 'fund-1')!;

    const incomeRes = await FinancialService.recordIncome(
      {
        fundId: 'fund-1',
        category: 'ซะกาตทรัพย์สินทางการเงิน',
        amount: 150000.75, // Testing 2-decimal satang precision
        payer: 'นายการัณย์ ทรัพย์มั่นคง',
        paymentMethod: 'bank_transfer',
        referenceNo: testRefNo1,
        notes: 'ซะกาตประจำปีครบนิฮอบ 2569',
      },
      financeActor
    );

    const fundsAfter = await FinancialService.getFunds();
    const fund1After = fundsAfter.find((f) => f.id === 'fund-1')!;

    const diff = round2(fund1After.totalReceived - fund1Before.totalReceived);
    if (diff === 150000.75) {
      console.log(`[PASS] บันทึกรายรับสำเร็จ: ${incomeRes.transactionNo}`);
      console.log(`       ยอดรับเพิ่มขึ้นตรงเผง: ฿${diff} (Satang แม่นยำ 100%)`);
      passed++;
    } else {
      throw new Error(`ยอดเงินไม่ตรง: คาดหวัง 150000.75 แต่ได้ ${diff}`);
    }
  } catch (err: any) {
    console.error(`[FAIL] Test 1:`, err.message);
    failed++;
  }

  // TEST 2: Duplicate Transaction Prevention (Idempotency Key / Reference Check)
  console.log('\n--- TEST 2: Duplicate Transaction Prevention (Replay Reference) ---');
  try {
    // Attempting to record with the EXACT same reference number
    await FinancialService.recordIncome(
      {
        fundId: 'fund-1',
        category: 'ซะกาตทรัพย์สินทางการเงิน',
        amount: 50000.0,
        payer: 'นายการัณย์ ทรัพย์มั่นคง',
        paymentMethod: 'bank_transfer',
        referenceNo: testRefNo1, // REPLAY!
        notes: 'พยายามบันทึกซ้ำ',
      },
      financeActor
    );
    console.error(`[FAIL] ระบบไม่ควรอนุญาตให้บันทึกรายการที่มีหมายเลขอ้างอิงซ้ำ`);
    failed++;
  } catch (err: any) {
    if (err.message.includes('ตรวจพบธุรกรรมซ้ำ')) {
      console.log(`[PASS] ป้องกันธุรกรรมซ้ำสำเร็จ:`);
      console.log(`       ข้อความเตือน: "${err.message}"`);
      passed++;
    } else {
      console.error(`[FAIL] Test 2: Error ผิดประเภท:`, err.message);
      failed++;
    }
  }

  // TEST 3: Fund Solvency / Over-Budget Check
  console.log('\n--- TEST 3: Fund Solvency Check (Over-Budget Prevention) ---');
  try {
    const hugeAmount = 999999999.0;
    await FinancialService.recordExpense(
      {
        fundId: 'fund-6', // Operational fund
        category: 'ค่าระบบคอมพิวเตอร์',
        amount: hugeAmount,
        payee: 'บริษัท คลาวด์ เทคโนโลยี จำกัด',
        referenceNo: `EXP-OVER-${Date.now()}`,
      },
      financeActor
    );
    console.error(`[FAIL] ระบบไม่ควรอนุญาตให้จ่ายเงินเกินยอดคงเหลือในกองทุน`);
    failed++;
  } catch (err: any) {
    if (err.message.includes('ยอดเงินคงเหลือในกองทุนไม่เพียงพอ')) {
      console.log(`[PASS] ป้องกันการจ่ายเกินวงเงิน (Over-Budget) สำเร็จ:`);
      console.log(`       ข้อความเตือน: "${err.message}"`);
      passed++;
    } else {
      console.error(`[FAIL] Test 3: Error ผิดประเภท:`, err.message);
      failed++;
    }
  }

  // TEST 4: Fund Purpose & Shariah Compliance (Misuse of Zakat Fund for Operating Expense)
  console.log('\n--- TEST 4: Fund Purpose & Shariah Compliance (Zakat vs Operating Expense) ---');
  try {
    // Attempting to charge Foundation operating expense to Zakat Fund (fund-1)
    await FinancialService.recordExpense(
      {
        fundId: 'fund-1', // Zakat fund! STRICTLY FORBIDDEN FOR OPERATING EXPENSE
        category: 'ค่าเช่าสำนักงานและสาธารณูปโภคประจำเดือน',
        amount: 25000.0,
        payee: 'เจ้าของอาคารสำนักงาน',
        referenceNo: `EXP-SHARIAH-TEST-${Date.now()}`,
      },
      financeActor
    );
    console.error(`[FAIL] ผิดหลักชะรีอะฮ์! ระบบต้องไม่อนุญาตให้นำเงินซะกาตไปใช้จ่ายดำเนินงานทั่วไป`);
    failed++;
  } catch (err: any) {
    if (err.message.includes('การละเมิดหลักชะรีอะฮ์และวัตถุประสงค์กองทุน')) {
      console.log(`[PASS] ป้องกันการใช้เงินผิดกองทุนตามหลักชะรีอะฮ์สำเร็จ:`);
      console.log(`       ข้อความเตือน: "${err.message}"`);
      passed++;
    } else {
      console.error(`[FAIL] Test 4: Error ผิดประเภท:`, err.message);
      failed++;
    }
  }

  // TEST 5: Assistance Application Budget Commitment & Disbursement Integration
  console.log('\n--- TEST 5: Assistance Application Disbursement & Double-Payout Prevention ---');
  try {
    const testHhId = `hh-fin-${Date.now()}`;
    const testAppNo = `APP-TEST-FIN-${Date.now().toString().slice(-4)}`;
    const testBenId = `ben-fin-${Date.now()}`;
    const testAppId = `app-fin-${Date.now()}`;
    const testPaymentRef = `TRF-DISB-${Date.now()}`;

    // Insert dummy household first
    await db.execute({
      sql: `INSERT INTO households (id, household_no, address, province, district, community)
            VALUES (?, ?, '123/45 ซอยมิตรไมตรี', 'กรุงเทพมหานคร', 'หนองจอก', 'ชุมชนมิตรสัมพันธ์')`,
      args: [testHhId, `HH-FIN-${Date.now().toString().slice(-4)}`],
    });

    // Insert dummy beneficiary
    await db.execute({
      sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category)
            VALUES (?, ?, 'นายทดสอบ การเงิน', ?, '089-111-2233', 'miskin')`,
      args: [testBenId, testHhId, `1100200${Date.now().toString().slice(-6)}`],
    });

    await db.execute({
      sql: `INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, requested_amount, approved_amount, status,
        assigned_officer_id, assigned_officer_name, applied_date
      ) VALUES (?, ?, ?, 'miskin', 10000, 10000, 'wait_disbursement', 'u-3', 'อุสมาน เจริญสุข', '16 ต.ค. 2569')`,
      args: [testAppId, testAppNo, testBenId],
    });

    // 1. Finance executes disbursement
    const disbRes = await BeneficiaryService.recordDisbursement(
      testAppId,
      testPaymentRef,
      '/slips/test-slip.jpg',
      'โอนเงินช่วยเหลือยังชีพสำเร็จ',
      financeActor
    );

    console.log(`[PASS] จ่ายเงินสวัสดิการสำเร็จ: ${disbRes.transactionNo} (฿${disbRes.amount})`);

    // 2. Attempt duplicate disbursement with same application
    try {
      await BeneficiaryService.recordDisbursement(
        testAppId,
        `TRF-NEW-${Date.now()}`,
        '/slips/slip2.jpg',
        'พยายามจ่ายซ้ำ',
        financeActor
      );
      console.error(`[FAIL] ไม่ควรอนุญาตให้จ่ายเงินซ้ำในคำร้องเดิม`);
      failed++;
    } catch (dupAppErr: any) {
      console.log(`[PASS] ป้องกันการจ่ายซ้ำในคำร้องเดิมสำเร็จ: "${dupAppErr.message}"`);
      passed++;
    }

    // 3. Attempt duplicate disbursement with same payment reference
    try {
      // Create another dummy app in wait_disbursement
      const testAppId2 = `app-fin2-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO assistance_applications (
          id, application_no, beneficiary_id, asnaf_category, requested_amount, approved_amount, status,
          assigned_officer_id, assigned_officer_name, applied_date
        ) VALUES (?, ?, ?, 'miskin', 5000, 5000, 'wait_disbursement', 'u-3', 'อุสมาน เจริญสุข', '16 ต.ค. 2569')`,
        args: [testAppId2, `APP-TEST-2-${Date.now().toString().slice(-4)}`, testBenId],
      });

      await BeneficiaryService.recordDisbursement(
        testAppId2,
        testPaymentRef, // REUSED PAYMENT REF!
        '/slips/slip.jpg',
        'พยายามใช้เลขอ้างอิงซ้ำ',
        financeActor
      );
      console.error(`[FAIL] ไม่ควรอนุญาตให้ใช้ paymentRef ซ้ำ`);
      failed++;
    } catch (dupRefErr: any) {
      console.log(`[PASS] ป้องกันการใช้หมายเลขอ้างอิงสลิปซ้ำสำเร็จ: "${dupRefErr.message}"`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] Test 5:`, err.message);
    failed++;
  }

  // TEST 6: Strict Non-Deletion Policy (Accounting Standards Violation)
  console.log('\n--- TEST 6: Strict Non-Deletion Policy (Accounting Standards Violation) ---');
  try {
    await FinancialService.attemptDeleteTransaction('txn-seed-1');
    console.error(`[FAIL] ระบบไม่ควรอนุญาตให้ลบรายการบัญชีโดยตรง`);
    failed++;
  } catch (err: any) {
    if (err.message.includes('การละเมิดมาตรฐานการบัญชีและการตรวจสอบ')) {
      console.log(`[PASS] นโยบายห้ามลบรายการบัญชี (Audit Trail Integrity) ทำงานถูกต้อง:`);
      console.log(`       ข้อความปฏิเสธ: "${err.message.slice(0, 85)}..."`);
      passed++;
    } else {
      console.error(`[FAIL] Test 6: Error ผิดประเภท:`, err.message);
      failed++;
    }
  }

  // TEST 7: Reversal / Adjustment Entry Engine
  console.log('\n--- TEST 7: Transaction Reversal Entry Engine ---');
  try {
    // 1. Record an operating expense first
    const expRef = `EXP-FOR-REV-${Date.now()}`;
    const expRes = await FinancialService.recordExpense(
      {
        fundId: 'fund-6',
        category: 'ค่าอุปกรณ์สำนักงานชั่วคราว',
        amount: 4500.0,
        payee: 'ร้านเครื่องเขียนมีนบุรี',
        referenceNo: expRef,
        notes: 'ซื้อแฟ้มเอกสารและตลับหมึก',
      },
      financeActor
    );

    const fundsBeforeRev = await FinancialService.getFunds();
    const fund6Before = fundsBeforeRev.find((f) => f.id === 'fund-6')!;

    // 2. Reverse the transaction
    const revRes = await FinancialService.reverseTransaction(
      expRes.transactionId,
      'ร้านค้ายกเลิกคำสั่งซื้อและโอนเงินคืนมูลนิธิเต็มจำนวน',
      financeActor
    );

    const fundsAfterRev = await FinancialService.getFunds();
    const fund6After = fundsAfterRev.find((f) => f.id === 'fund-6')!;

    // Verify fund balance restored
    const availableDiff = round2(fund6After.availableAmount - fund6Before.availableAmount);
    if (availableDiff === 4500.0) {
      console.log(`[PASS] กลับรายการบัญชีสำเร็จ: ${revRes.reversalTransactionNo}`);
      console.log(`       ยอดคงเหลือกองทุนถูกปรับคืนเรียบร้อย (+฿${availableDiff})`);
      passed++;
    } else {
      throw new Error(`ยอดคงเหลือหลังกลับรายการไม่ตรง: ได้ส่วนต่าง ${availableDiff}`);
    }

    // 3. Attempting to reverse an already reversed transaction must fail
    try {
      await FinancialService.reverseTransaction(
        expRes.transactionId,
        'พยายามกลับรายการซ้ำอีกครั้ง',
        financeActor
      );
      console.error(`[FAIL] ไม่ควรอนุญาตให้กลับรายการซ้ำ`);
      failed++;
    } catch (reRevErr: any) {
      console.log(`[PASS] ป้องกันการกลับรายการซ้ำสองสำเร็จ: "${reRevErr.message}"`);
      passed++;
    }
  } catch (err: any) {
    console.error(`[FAIL] Test 7:`, err.message);
    failed++;
  }

  // TEST 8: Reconcile Fund Balances & Excel/CSV Export
  console.log('\n--- TEST 8: Balance Reconciliation & Excel/CSV Export Check ---');
  try {
    // 1. Reconcile
    const report = await FinancialService.reconcileBalances();
    console.log(`[PASS] ปรับเทียบยอดคงเหลือ 6 กองทุนกับสมุดรายวันเสร็จสมบูรณ์ (${report.length} กองทุน)`);

    // 2. CSV Export
    const csvContent = await FinancialService.exportTransactionsCsv();
    const hasBom = csvContent.charCodeAt(0) === 0xFEFF;
    const hasHeaders = csvContent.includes('เลขที่ธุรกรรม') && csvContent.includes('จำนวนเงิน (บาท)');

    if (hasBom && hasHeaders) {
      console.log(`[PASS] ส่งออกรายงาน CSV สำหรับ Excel สำเร็จ (มี UTF-8 BOM และหัวตารางภาษาไทยสมบูรณ์)`);
      console.log(`       ขนาดไฟล์: ${csvContent.length} bytes`);
      passed++;
    } else {
      throw new Error(`รูปแบบ CSV ไม่ถูกต้อง (hasBom: ${hasBom}, hasHeaders: ${hasHeaders})`);
    }
  } catch (err: any) {
    console.error(`[FAIL] Test 8:`, err.message);
    failed++;
  }

  // SUMMARY
  console.log('\n========================================================================');
  console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed}) ===`);
  console.log('========================================================================\n');

  if (failed === 0) {
    console.log('>>> ALL FINANCIAL MODULE TESTS PASSED WITH 100% SUCCESS! <<<');
  } else {
    process.exit(1);
  }
}

runFinancialTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
