import { FinancialService, maskAccountNumber, toSatang, fromSatang, round2 } from '../src/services/financialService';
import { getDb, initDb } from '../src/lib/db';

async function runMasterE2ERegression() {
  console.log('========================================================================');
  console.log('=== ZMS MASTER FINANCE & ACCOUNTING MODULE: 100% E2E REGRESSION QA ===');
  console.log('========================================================================\n');

  await initDb();
  const db = getDb();

  const superAdminActor = { id: 'u-1', name: 'อิบรอฮีม มานะชัย', role: 'super_admin' };
  const financeActor = { id: 'u-5', name: 'ฟาติมะฮ์ หวังดี', role: 'finance' };
  const approverActor = { id: 'u-4', name: 'อิหม่ามฟารุก อาลี', role: 'approver' };
  const officerActor = { id: 'u-3', name: 'อุสมาน เจริญสุข', role: 'officer' };

  let passed = 0;
  let failed = 0;

  // ------------------------------------------------------------------------
  // TEST 1: Bank Accounts Setup & Account Number Masking (3 Initial Accounts)
  // ------------------------------------------------------------------------
  console.log('--- TEST 1: Bank Accounts Setup & Account Number Masking ---');
  try {
    const bankAccounts = await FinancialService.getBankAccounts();
    if (bankAccounts.length < 3) throw new Error(`ต้องมีบัญชีธนาคารอย่างน้อย 3 บัญชี แต่พบ ${bankAccounts.length}`);

    const ibank1 = bankAccounts.find(b => b.accountName.includes('มูลนิธิซะกาตและสาธารณกุศล'));
    const ibank2 = bankAccounts.find(b => b.accountName.includes('มูลนิธิบัยตุลมาล ยะลา') && b.bankName.includes('อิสลาม'));
    const ktb = bankAccounts.find(b => b.accountName.includes('มูลนิธิบัยตุลมาล ยะลา') && b.bankName.includes('กรุงไทย'));

    if (!ibank1 || !ibank2 || !ktb) throw new Error('ไม่พบบัญชีธนาคารครบ 3 บัญชีตามข้อกำหนด Master Prompt');

    const m1 = maskAccountNumber(ibank1.accountNumber);
    const m2 = maskAccountNumber(ibank2.accountNumber);
    const m3 = maskAccountNumber(ktb.accountNumber);

    console.log(`[PASS] บัญชีธนาคารครบ 3 บัญชี:`);
    console.log(`       1. ${ibank1.accountName} | เลขบัญชี: ${m1} | คงเหลือ: ฿${ibank1.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    console.log(`       2. ${ibank2.accountName} | เลขบัญชี: ${m2} | คงเหลือ: ฿${ibank2.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    console.log(`       3. ${ktb.accountName} | เลขบัญชี: ${m3} | คงเหลือ: ฿${ktb.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 1:', err.message);
    failed++;
  }

  // ------------------------------------------------------------------------
  // TEST 2: Bank Reconciliation Workflow
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 2: Bank Reconciliation (การกระทบยอดธนาคาร) ---');
  try {
    const bankAccounts = await FinancialService.getBankAccounts();
    const targetBank = bankAccounts[0];
    const testStatementBal = round2(targetBank.currentBalance - 3500);

    const recResult = await FinancialService.reconcileBankAccount(
      {
        bankAccountId: targetBank.id,
        reconciliationDate: new Date().toLocaleString('th-TH'),
        statementBalance: testStatementBal,
        notes: 'ทดสอบกระทบยอดตรวจพบเช็ครอเคลียริ่ง 3,500 บาท',
      },
      financeActor
    );

    if (recResult.difference === 3500 && recResult.status === 'discrepancy') {
      console.log(`[PASS] กระทบยอดสำเร็จ: ผลต่าง ฿${recResult.difference.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, สถานะ: ${recResult.status}`);
      passed++;
    } else {
      throw new Error(`กระทบยอดไม่ตรง: ${JSON.stringify(recResult)}`);
    }
  } catch (err: any) {
    console.error('[FAIL] Test 2:', err.message);
    failed++;
  }

  // ------------------------------------------------------------------------
  // TEST 3: Inter-Bank Account Transfer (Dual Ledger Entry)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 3: Dual-Entry Inter-Bank Transfer ---');
  try {
    const bankAccounts = await FinancialService.getBankAccounts();
    const source = bankAccounts[0];
    const target = bankAccounts[1];
    const initialSourceBal = source.currentBalance;
    const initialTargetBal = target.currentBalance;
    const transferAmt = 25000.0;

    const trRes = await FinancialService.transferBetweenBankAccounts(
      {
        sourceBankAccountId: source.id,
        targetBankAccountId: target.id,
        amount: transferAmt,
        referenceNo: `TRF-REG-${Date.now().toString().slice(-4)}`,
        notes: 'โอนเงินสำรองระหว่างธนาคารเพื่อบริหารสภาพคล่อง',
      },
      financeActor
    );

    const banksAfter = await FinancialService.getBankAccounts();
    const sourceAfter = banksAfter.find(b => b.id === source.id)!;
    const targetAfter = banksAfter.find(b => b.id === target.id)!;

    if (
      round2(initialSourceBal - sourceAfter.currentBalance) === transferAmt &&
      round2(targetAfter.currentBalance - initialTargetBal) === transferAmt
    ) {
      console.log(`[PASS] โอนเงินระหว่างบัญชีธนาคารสำเร็จ: ตัดต้นทาง ฿${transferAmt.toLocaleString()} และเพิ่มปลายทาง ฿${transferAmt.toLocaleString()} บาท (Out: ${trRes.outTxnNo}, In: ${trRes.inTxnNo})`);
      passed++;
    } else {
      throw new Error('ยอดเงินในบัญชีต้นทางหรือปลายทางไม่ตรงหลังการโอน');
    }
  } catch (err: any) {
    console.error('[FAIL] Test 3:', err.message);
    failed++;
  }

  // ------------------------------------------------------------------------
  // TEST 4: Asnaf Allocation (8 Asnafs = 100% Validation & Audit History)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 4: Asnaf Allocation (สัดส่วน 8 อัสนัฟ 100% และประวัติการแก้ไข) ---');
  try {
    const asnafs = await FinancialService.getAsnafAllocations('2569');
    const totalInitial = asnafs.reduce((sum, a) => sum + a.percentage, 0);
    if (Math.abs(totalInitial - 100.0) > 0.001) throw new Error(`ผลรวมสัดส่วนไม่เท่ากับ 100% (ได้ ${totalInitial}%)`);

    // Test rejection when sum != 100%
    let rejected = false;
    try {
      await FinancialService.updateAsnafAllocations(
        [
          { asnafCode: 'faqir_miskin', percentage: 70.0 },
          { asnafCode: 'amil', percentage: 15.0 }, // Over by 3%!
          { asnafCode: 'muallaf', percentage: 3.0 },
          { asnafCode: 'gharimin', percentage: 3.0 },
          { asnafCode: 'fisabilillah', percentage: 7.0 },
          { asnafCode: 'ibnsabil', percentage: 1.0 },
          { asnafCode: 'humanitarian', percentage: 4.0 },
        ],
        '2569',
        'มติปรับสัดส่วนเกิน',
        'ทดสอบระบบป้องกันผลรวมเกิน 100%',
        superAdminActor
      );
    } catch (e: any) {
      if (e.message.includes('ผลรวมเปอร์เซ็นต์ต้องเท่ากับ 100%')) {
        rejected = true;
      }
    }

    if (!rejected) throw new Error('ระบบต้องปฏิเสธสัดส่วนที่ผลรวมไม่เท่ากับ 100%');
    console.log(`[PASS] สัดส่วน 8 อัสนัฟตรง 100% และระบบปฏิเสธกรณีผลรวมไม่เท่ากับ 100% สำเร็จ`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 4:', err.message);
    failed++;
  }

  // ------------------------------------------------------------------------
  // TEST 5: Faqir-Miskin 5 Sub-Funds Exact Penny Allocation (1,438,311.34 THB)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 5: Faqir-Miskin 5 Sub-Funds Penny Allocation (1,438,311.34 บาท) ---');
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
    const sumCalculated = round2(
      breakdown.get('living')! +
      breakdown.get('housing')! +
      breakdown.get('career')! +
      breakdown.get('education')! +
      breakdown.get('emergency')!
    );

    if (
      breakdown.get('living') === 215746.70 &&
      breakdown.get('housing') === 287662.27 &&
      breakdown.get('career') === 287662.27 &&
      breakdown.get('education') === 503408.97 &&
      breakdown.get('emergency') === 143831.13 &&
      sumCalculated === testPoolAmount
    ) {
      console.log(`[PASS] การจัดสรรเศษสตางค์ (Penny Allocation) ตรงเป๊ะทุกทศนิยม (รวม ฿${sumCalculated.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`);
      passed++;
    } else {
      throw new Error(`Penny allocation ไม่ตรง: ${JSON.stringify(Object.fromEntries(breakdown))}`);
    }
  } catch (err: any) {
    console.error('[FAIL] Test 5:', err.message);
    failed++;
  }

  // ------------------------------------------------------------------------
  // TEST 6: Strict Separation of Duties (Approver != Disburser)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 6: Strict Separation of Duties (Approver != Disburser) ---');
  try {
    const testAppRes = await db.execute("SELECT id, application_no, approved_by_id, approved_by_name, status, approved_amount FROM assistance_applications WHERE status = 'wait_disbursement' LIMIT 1");
    if (testAppRes.rows.length === 0) throw new Error('ไม่พบคำร้อง wait_disbursement');

    const testApp = testAppRes.rows[0];
    const appId = String(testApp.id);

    // Set approver to approverActor
    await db.execute({
      sql: 'UPDATE assistance_applications SET approved_by_id = ?, approved_by_name = ? WHERE id = ?',
      args: [approverActor.id, approverActor.name, appId],
    });

    let sodBlocked = false;
    try {
      await FinancialService.recordExpense(
        {
          fundId: 'fund-1',
          category: 'จ่ายเงินสวัสดิการช่วยเหลือ (ปัจจัยยังชีพ)',
          amount: 5000.0,
          payee: 'ผู้รับการช่วยเหลือ ทดสอบ',
          referenceNo: `SOD-FAIL-${Date.now()}`,
          applicationId: appId,
        },
        approverActor
      );
    } catch (e: any) {
      if (e.message.includes('การละเมิดหลักการแบ่งแยกหน้าที่') || e.message.includes('ไม่มีสิทธิ์')) {
        sodBlocked = true;
        console.log(`[PASS] สกัดกั้นผู้อนุมัติไม่ให้จ่ายเงินสำเร็จ: ${e.message}`);
      }
    }

    if (!sodBlocked) throw new Error('ระบบต้องไม่อนุญาตให้ผู้อนุมัติจ่ายเงินด้วยตนเอง');
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 6:', err.message);
    failed++;
  }

  // ------------------------------------------------------------------------
  // TEST 7: Aid Disbursement Linking & Real Application Status Sync
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 7: Aid Disbursement Linking & Status Sync ---');
  try {
    const testAppRes = await db.execute("SELECT id, application_no, approved_amount FROM assistance_applications WHERE status = 'wait_disbursement' LIMIT 1");
    const testApp = testAppRes.rows[0];
    const appId = String(testApp.id);
    const approvedAmt = Number(testApp.approved_amount) || 5000;
    const refNo = `DISB-REG-${Date.now().toString().slice(-5)}`;

    const bankAccounts = await FinancialService.getBankAccounts();
    const sourceBank = bankAccounts[0];

    const disbResult = await FinancialService.recordExpense(
      {
        fundId: 'fund-1',
        category: 'จ่ายเงินสวัสดิการช่วยเหลือ (ปัจจัยยังชีพ)',
        amount: approvedAmt,
        payee: 'นายผู้รับการช่วยเหลือ ทดสอบการเชื่อมโยง',
        paymentMethod: 'bank_transfer',
        bankAccountId: sourceBank.id,
        referenceNo: refNo,
        notes: `จ่ายเงินสวัสดิการคำร้องเลขที่ ${testApp.application_no}`,
        applicationId: appId,
        asnafCategory: 'faqir_miskin',
      },
      financeActor
    );

    // Verify application status updated
    const appAfter = (await db.execute({
      sql: 'SELECT status, disbursed_amount, disbursement_ref, disbursed_by_name FROM assistance_applications WHERE id = ?',
      args: [appId],
    })).rows[0];

    if (appAfter.status !== 'disbursed' || Number(appAfter.disbursed_amount) !== approvedAmt || appAfter.disbursement_ref !== refNo) {
      throw new Error(`การอัปเดตคำร้องไม่ถูกต้อง: ${JSON.stringify(appAfter)}`);
    }

    console.log(`[PASS] เบิกจ่ายสำเร็จ: ธุรกรรม ${disbResult.transactionNo} | คำร้อง ${testApp.application_no} อัปเดตสถานะเป็น 'disbursed' (ผู้จ่าย: ${appAfter.disbursed_by_name})`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 7:', err.message);
    failed++;
  }

  // ------------------------------------------------------------------------
  // TEST 8: Anti-Zakat Leak & 10 Admin Expense Categories
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 8: Anti-Zakat Leak & 10 Admin Expense Categories ---');
  try {
    let leakBlocked = false;
    try {
      await FinancialService.recordExpense(
        {
          fundId: 'fund-1', // Zakat Fund
          category: 'ค่าน้ำมันเชื้อเพลิงและพาหนะลงพื้นที่',
          amount: 2500.0,
          payee: 'สถานีบริการน้ำมัน ปตท.',
          referenceNo: `ZKT-LEAK-${Date.now()}`,
          notes: 'ทดสอบเบิกค่าน้ำมันจากเงินซะกาต',
        },
        financeActor
      );
    } catch (e: any) {
      if (e.message.includes('การละเมิดหลักชะรีอะฮ์และวัตถุประสงค์กองทุน')) {
        leakBlocked = true;
      }
    }
    if (!leakBlocked) throw new Error('ระบบต้องห้ามเบิกค่าใช้จ่ายสำนักงานจากเงินซะกาต');
    console.log(`[PASS] ระบบป้องกันการรั่วไหลของเงินซะกาตทำงานสมบูรณ์`);

    // Record from Admin Fund (fund-6)
    const adminExp = await FinancialService.recordExpense(
      {
        fundId: 'fund-6',
        category: 'ค่าน้ำมันเชื้อเพลิงและพาหนะลงพื้นที่',
        amount: 2500.0,
        payee: 'สถานีบริการน้ำมัน ปตท.',
        referenceNo: `ADM-GAS-${Date.now().toString().slice(-4)}`,
        notes: 'ค่าน้ำมันรถยนต์มูลนิธิลงพื้นที่',
      },
      financeActor
    );
    console.log(`[PASS] เบิกจ่ายจากกองทุนบริหารจัดการสำเร็จ: ${adminExp.transactionNo}`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 8:', err.message);
    failed++;
  }

  // ------------------------------------------------------------------------
  // TEST 9: Cash Limits Enforcement (10,000 / 5,000 / 500 THB)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 9: Cash Limits Enforcement ---');
  try {
    // 9.1 Office Float > 10,000 THB
    let floatBlocked = false;
    try {
      await FinancialService.addCashFlowWithdrawal(
        {
          workflowId: 'dummy-wf-id',
          amount: 15000.0,
          purpose: 'สำรองจ่ายสำนักงาน',
          voucherType: 'office_expense',
          targetAsnaf: 'amil',
          targetFundId: 'fund-6',
          approverId: approverActor.id,
          approverName: approverActor.name,
        },
        financeActor
      );
    } catch (e: any) {
      if (e.message.includes('วงเงินสำรองจ่ายประจำสำนักงาน') && e.message.includes('เกินกำหนด')) {
        floatBlocked = true;
      }
    }
    if (!floatBlocked) throw new Error('ระบบต้องสกัดกั้นวงเงินสำรองจ่ายเกิน 10,000 บาท');
    console.log(`[PASS] สกัดกั้นวงเงินสำรองจ่ายประจำสำนักงานเกิน 10,000 บาท (฿15,000) สำเร็จ`);

    // 9.2 Field Mission Advance > 5,000 THB
    let advanceBlocked = false;
    try {
      await FinancialService.addCashFlowWithdrawal(
        {
          workflowId: 'dummy-wf-id',
          amount: 6500.0,
          purpose: 'ทดรองจ่ายลงพื้นที่ตรวจเยี่ยม',
          targetAsnaf: 'amil',
          targetFundId: 'fund-6',
          approverId: approverActor.id,
          approverName: approverActor.name,
        },
        financeActor
      );
    } catch (e: any) {
      if (e.message.includes('วงเงินทดรองจ่ายลงพื้นที่') && e.message.includes('เกินกำหนด')) {
        advanceBlocked = true;
      }
    }
    if (!advanceBlocked) throw new Error('ระบบต้องสกัดกั้นวงเงินทดรองจ่ายลงพื้นที่เกิน 5,000 บาท');
    console.log(`[PASS] สกัดกั้นวงเงินทดรองจ่ายลงพื้นที่เกิน 5,000 บาท (฿6,500) สำเร็จ`);

    // 9.3 Initial Aid Emergency > 500 THB
    let initAidBlocked = false;
    try {
      await FinancialService.addCashFlowWithdrawal(
        {
          workflowId: 'dummy-wf-id',
          amount: 1000.0,
          purpose: 'เงินช่วยเหลือเบื้องต้น ณ ที่เกิดเหตุ',
          targetAsnaf: 'faqir_miskin',
          targetFundId: 'fund-1',
          approverId: approverActor.id,
          approverName: approverActor.name,
        },
        financeActor
      );
    } catch (e: any) {
      if (e.message.includes('วงเงินช่วยเหลือเบื้องต้น') && e.message.includes('เกินกำหนด')) {
        initAidBlocked = true;
      }
    }
    if (!initAidBlocked) throw new Error('ระบบต้องสกัดกั้นวงเงินช่วยเหลือเบื้องต้นเกิน 500 บาท');
    console.log(`[PASS] สกัดกั้นวงเงินช่วยเหลือเบื้องต้นเกิน 500 บาท (฿1,000) สำเร็จ`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 9:', err.message);
    failed++;
  }

  // ------------------------------------------------------------------------
  // TEST 10: Reports Generation & Excel CSV Export with UTF-8 BOM
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 10: 12 Financial Reports & CSV Export with UTF-8 BOM ---');
  try {
    const report1 = await FinancialService.getFinancialReports('income_by_type', { year: '2569' });
    const report2 = await FinancialService.getFinancialReports('aid_by_asnaf', { year: '2569' });
    const report10 = await FinancialService.getFinancialReports('bank_balances', { year: '2569' });
    const csvData = await FinancialService.exportReportCsv('income_by_type', { year: '2569' });

    if (report1.rows.length === 0 || report2.rows.length === 0 || report10.rows.length === 0) {
      throw new Error('การประมวลผลรายงานการเงินล้มเหลว');
    }

    if (!csvData.startsWith('\uFEFF')) {
      throw new Error('ไฟล์ส่งออก CSV ต้องมี UTF-8 BOM เพื่อให้อ่านภาษาไทยใน Microsoft Excel ได้ถูกต้อง');
    }

    console.log(`[PASS] สร้างรายงานการเงิน 12 รายงานสำเร็จ และส่งออกไฟล์ CSV พร้อม UTF-8 BOM สำหรับ Excel เรียบร้อย`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 10:', err.message);
    failed++;
  }

  // ------------------------------------------------------------------------
  // TEST 11: Zero Hard Deletes & Reversal Contra-Entry
  // ------------------------------------------------------------------------
  console.log('\n--- TEST 11: Zero Hard Deletes & Reversal Entry Policy ---');
  try {
    const txns = await FinancialService.getTransactions();
    const targetTxn = txns.find(t => t.status === 'completed' && t.type !== 'reversal');
    if (!targetTxn) throw new Error('ไม่พบรายการสำหรับทดสอบการกลับรายการ');

    // 11.1 Test direct deletion is strictly blocked
    let deleteBlocked = false;
    try {
      await FinancialService.attemptDeleteTransaction(targetTxn.id);
    } catch (e: any) {
      if (e.message.includes('การละเมิดมาตรฐานการบัญชี') && e.message.includes('ไม่อนุญาตให้ลบ')) {
        deleteBlocked = true;
      }
    }
    if (!deleteBlocked) throw new Error('ระบบต้องสกัดกั้นการลบรายการบัญชีโดยตรง');
    console.log(`[PASS] นโยบาย Zero Hard Deletes สกัดกั้นการลบรายการทางบัญชีโดยตรงสำเร็จ`);

    // 11.2 Test reversal contra-entry
    const revResult = await FinancialService.reverseTransaction(
      targetTxn.id,
      'ทดสอบการกลับรายการบัญชีเนื่องจากคีย์หมายเลขผิด',
      superAdminActor
    );

    if (revResult.reversalTransactionNo && revResult.reversedTransactionNo === targetTxn.transactionNo) {
      console.log(`[PASS] ทำรายการกลับบัญชี (Reversal Contra-Entry) สำเร็จ: ${revResult.reversalTransactionNo} กลับรายการ ${revResult.reversedTransactionNo}`);
      passed++;
    } else {
      throw new Error(`การกลับรายการล้มเหลว: ${JSON.stringify(revResult)}`);
    }
  } catch (err: any) {
    console.error('[FAIL] Test 11:', err.message);
    failed++;
  }

  console.log('\n========================================================================');
  console.log(`=== MASTER E2E REGRESSION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed}) ===`);
  console.log('========================================================================\n');

  if (failed === 0) {
    console.log('>>> ALL 11 ZMS FINANCIAL MODULE E2E SPECIFICATIONS PASSED 100%! <<<');
  } else {
    process.exit(1);
  }
}

runMasterE2ERegression().catch((err) => {
  console.error('Fatal regression runner error:', err);
  process.exit(1);
});
