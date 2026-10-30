import { FinancialService, round2 } from '../src/services/financialService';
import { getDb, initDb } from '../src/lib/db';

async function runPhase4Tests() {
  console.log('========================================================================');
  console.log('=== PHASE 4: AID DISBURSEMENTS, ADMIN EXPENSES & CASH LIMITS TESTS ===');
  console.log('========================================================================\n');

  await initDb();
  const db = getDb();

  const superAdminActor = { id: 'u-1', name: 'อิบรอฮีม มานะชัย', role: 'super_admin' };
  const financeActor = { id: 'u-5', name: 'ฟาติมะฮ์ หวังดี', role: 'finance' };
  const approverActor = { id: 'u-4', name: 'อิหม่ามฟารุก อาลี', role: 'approver' };

  let passed = 0;
  let failed = 0;

  // 1. Separation of Duties on Aid Disbursement
  console.log('--- TEST 1: Strict Separation of Duties (Approver != Disburser) ---');
  try {
    // Find or setup a test application with approverActor
    const testAppRes = await db.execute("SELECT id, application_no, approved_by_id, approved_by_name, status, approved_amount FROM assistance_applications WHERE status = 'wait_disbursement' LIMIT 1");
    if (testAppRes.rows.length === 0) {
      throw new Error('ไม่พบคำร้องในสถานะ wait_disbursement ในฐานข้อมูล');
    }

    const testApp = testAppRes.rows[0];
    const appId = String(testApp.id);

    // Set the approver to approverActor
    await db.execute({
      sql: 'UPDATE assistance_applications SET approved_by_id = ?, approved_by_name = ? WHERE id = ?',
      args: [approverActor.id, approverActor.name, appId],
    });

    // Try to disburse as approverActor -> MUST FAIL!
    let blockedAsExpected = false;
    try {
      await FinancialService.recordExpense(
        {
          fundId: 'fund-1',
          category: 'จ่ายเงินสวัสดิการช่วยเหลือ (ปัจจัยยังชีพ)',
          amount: 5000.0,
          payee: 'นายทดสอบ การเงิน',
          referenceNo: `SOD-FAIL-${Date.now()}`,
          applicationId: appId,
        },
        approverActor
      );
    } catch (e: any) {
      if (e.message.includes('การละเมิดหลักการแบ่งแยกหน้าที่') || e.message.includes('ไม่มีสิทธิ์')) {
        blockedAsExpected = true;
        console.log(`[PASS] สกัดกั้นสำเร็จ: ${e.message}`);
      }
    }

    if (!blockedAsExpected) {
      throw new Error('ระบบต้องปฏิเสธการเบิกจ่ายเมื่อผู้จ่ายเป็นผู้อนุมัติคำร้องคนเดียวกัน!');
    }
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 1:', err.message);
    failed++;
  }

  // 2. Successful Aid Disbursement by Finance Officer with Application Update
  console.log('\n--- TEST 2: Successful Aid Disbursement & Application Status Sync ---');
  try {
    const testAppRes = await db.execute("SELECT id, application_no, approved_amount FROM assistance_applications WHERE status = 'wait_disbursement' LIMIT 1");
    const testApp = testAppRes.rows[0];
    const appId = String(testApp.id);
    const approvedAmt = Number(testApp.approved_amount) || 5000;
    const refNo = `DISB-OK-${Date.now().toString().slice(-5)}`;

    const bankAccounts = await FinancialService.getBankAccounts();
    const sourceBank = bankAccounts[0];
    const initialBankBal = sourceBank.currentBalance;

    const disbResult = await FinancialService.recordExpense(
      {
        fundId: 'fund-1',
        category: 'จ่ายเงินสวัสดิการช่วยเหลือ (ปัจจัยยังชีพ)',
        amount: approvedAmt,
        payee: 'นายผู้รับการช่วยเหลือ ทดสอบระบบ',
        paymentMethod: 'bank_transfer',
        bankAccountId: sourceBank.id,
        referenceNo: refNo,
        notes: `จ่ายเงินสวัสดิการคำร้องเลขที่ ${testApp.application_no}`,
        applicationId: appId,
        asnafCategory: 'faqir_miskin',
      },
      financeActor
    );

    console.log(`[PASS] เบิกจ่ายสำเร็จ: เลขที่ธุรกรรม ${disbResult.transactionNo}`);

    // Verify application status updated to 'disbursed'
    const appAfterRes = await db.execute({
      sql: 'SELECT status, disbursed_amount, disbursement_ref FROM assistance_applications WHERE id = ?',
      args: [appId],
    });
    const appAfter = appAfterRes.rows[0];

    if (appAfter.status !== 'disbursed' || Number(appAfter.disbursed_amount) !== approvedAmt || appAfter.disbursement_ref !== refNo) {
      throw new Error(`สถานะคำร้องไม่ถูกอัปเดตอย่างถูกต้อง: ${JSON.stringify(appAfter)}`);
    }
    console.log(`[PASS] ตรวจสอบสถานะคำร้องในฐานข้อมูล: อัปเดตเป็น 'disbursed' เรียบร้อย (ยอดจ่าย: ฿${appAfter.disbursed_amount}, อ้างอิง: ${appAfter.disbursement_ref})`);

    // Verify bank account was deducted
    const banksAfter = await FinancialService.getBankAccounts();
    const bankAfter = banksAfter.find(b => b.id === sourceBank.id)!;
    if (round2(initialBankBal - bankAfter.currentBalance) !== approvedAmt) {
      throw new Error('ยอดเงินในบัญชีธนาคารไม่ถูกหักหลังโอนจ่ายเงินช่วยเหลือ');
    }
    console.log(`[PASS] ยอดเงินในบัญชีธนาคารถูกหักตรงตามจำนวนเบิกจ่าย ฿${approvedAmt.toLocaleString()} บาท`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 2:', err.message);
    failed++;
  }

  // 3. Shariah Anti-Zakat Leak Protection on Operating Expenses
  console.log('\n--- TEST 3: Anti-Zakat Leak (ห้ามเบิกค่าใช้จ่ายดำเนินงานจากกองทุนซะกาต) ---');
  try {
    let leakBlocked = false;
    try {
      await FinancialService.recordExpense(
        {
          fundId: 'fund-1', // Zakat Fund
          category: 'ค่าไฟฟ้าและสาธารณูปโภคสำนักงาน',
          amount: 4500.0,
          payee: 'การไฟฟ้านครหลวง',
          referenceNo: `ZKT-LEAK-${Date.now()}`,
          notes: 'ทดสอบการเบิกค่าไฟจากกองทุนซะกาตทั่วไป',
        },
        financeActor
      );
    } catch (e: any) {
      if (e.message.includes('การละเมิดหลักชะรีอะฮ์และวัตถุประสงค์กองทุน') || e.message.includes('เงินซะกาต')) {
        leakBlocked = true;
        console.log(`[PASS] ระบบป้องกันการรั่วไหลของซะกาตสำเร็จ: ${e.message}`);
      }
    }

    if (!leakBlocked) {
      throw new Error('ระบบต้องไม่อนุญาตให้นำเงินซะกาตมาจ่ายค่าใช้จ่ายสำนักงานทั่วไป!');
    }

    // Now record from Admin Fund (fund-6) -> MUST SUCCEED!
    const adminExp = await FinancialService.recordExpense(
      {
        fundId: 'fund-6', // Admin Fund
        category: 'ค่าไฟฟ้าและสาธารณูปโภคสำนักงาน',
        amount: 4500.0,
        payee: 'การไฟฟ้านครหลวง',
        referenceNo: `ADM-OK-${Date.now().toString().slice(-5)}`,
        notes: 'ชำระค่าไฟฟ้างวดประจำเดือน',
      },
      financeActor
    );
    console.log(`[PASS] บันทึกค่าใช้จ่ายดำเนินงานจากกองทุนบริหารจัดการสำเร็จ: ${adminExp.transactionNo}`);
    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 3:', err.message);
    failed++;
  }

  // 4. Enforce Cash Limits (Office Float <= 10,000, Field Advance <= 5,000, Initial Aid <= 500)
  console.log('\n--- TEST 4: Cash Limits Enforcement (10,000 / 5,000 / 500 THB) ---');
  try {
    // 4.1 Office Float > 10,000
    let officeFloatBlocked = false;
    try {
      await FinancialService.addCashFlowWithdrawal(
        {
          workflowId: 'dummy-wf-id',
          amount: 15000.0, // Exceeds 10,000 limit
          purpose: 'สำรองจ่ายสำนักงาน',
          targetAsnaf: 'amil',
          targetFundId: 'fund-6',
          approverId: approverActor.id,
          approverName: approverActor.name,
          voucherType: 'office_expense',
          sourceFundType: 'admin',
        },
        financeActor
      );
    } catch (e: any) {
      if (e.message.includes('วงเงินสำรองจ่ายประจำสำนักงาน') && e.message.includes('เกินกำหนด')) {
        officeFloatBlocked = true;
        console.log(`[PASS] สกัดกั้นวงเงินสำรองจ่ายสำนักงานเกิน 10,000 บาทสำเร็จ: ${e.message}`);
      }
    }
    if (!officeFloatBlocked) {
      throw new Error('ระบบต้องสกัดกั้นวงเงินสำรองจ่ายสำนักงานที่เกิน 10,000 บาท');
    }

    // 4.2 Field Mission Advance > 5,000
    let fieldAdvanceBlocked = false;
    try {
      await FinancialService.addCashFlowWithdrawal(
        {
          workflowId: 'dummy-wf-id',
          amount: 8000.0, // Exceeds 5,000 limit
          purpose: 'ทดรองจ่ายลงพื้นที่สำรวจผู้ประสบภัย',
          targetAsnaf: 'amil',
          targetFundId: 'fund-6',
          approverId: approverActor.id,
          approverName: approverActor.name,
        },
        financeActor
      );
    } catch (e: any) {
      if (e.message.includes('วงเงินทดรองจ่ายลงพื้นที่') && e.message.includes('เกินกำหนด')) {
        fieldAdvanceBlocked = true;
        console.log(`[PASS] สกัดกั้นวงเงินทดรองจ่ายลงพื้นที่เกิน 5,000 บาทสำเร็จ: ${e.message}`);
      }
    }
    if (!fieldAdvanceBlocked) {
      throw new Error('ระบบต้องสกัดกั้นวงเงินทดรองจ่ายลงพื้นที่ที่เกิน 5,000 บาท');
    }

    // 4.3 Initial Emergency Aid > 500
    let initialAidBlocked = false;
    try {
      await FinancialService.addCashFlowWithdrawal(
        {
          workflowId: 'dummy-wf-id',
          amount: 1500.0, // Exceeds 500 limit
          purpose: 'เงินช่วยเหลือเบื้องต้น ณ จุดเกิดเหตุ',
          targetAsnaf: 'faqir_miskin',
          targetFundId: 'fund-1',
          approverId: approverActor.id,
          approverName: approverActor.name,
        },
        financeActor
      );
    } catch (e: any) {
      if (e.message.includes('วงเงินช่วยเหลือเบื้องต้น') && e.message.includes('เกินกำหนด')) {
        initialAidBlocked = true;
        console.log(`[PASS] สกัดกั้นวงเงินช่วยเหลือเบื้องต้นเกิน 500 บาทสำเร็จ: ${e.message}`);
      }
    }
    if (!initialAidBlocked) {
      throw new Error('ระบบต้องสกัดกั้นวงเงินช่วยเหลือเบื้องต้นที่เกิน 500 บาท');
    }

    passed++;
  } catch (err: any) {
    console.error('[FAIL] Test 4:', err.message);
    failed++;
  }

  console.log('\n========================================================================');
  console.log(`=== PHASE 4 SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed}) ===`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch((e) => {
  console.error('Fatal phase 4 runner error:', e);
  process.exit(1);
});
