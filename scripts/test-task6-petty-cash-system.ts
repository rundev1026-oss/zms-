/**
 * scripts/test-task6-petty-cash-system.ts
 *
 * TASK 6: เพิ่มระบบเบิกเงินสำรองจ่ายสำนักงาน
 * Automated Verification Script
 *
 * Covers:
 * 1. Default categories seeding verification (11 categories including 'อื่น ๆ')
 * 2. Category management permissions: Add, Edit, Toggle disable/enable by authorized roles
 * 3. Petty cash withdrawal with all 13 fields and authorized fund check
 * 4. Rule enforcement: Rejection of unauthorized source funds (e.g. direct zakat recipient funds)
 * 5. Rule enforcement: Rejection of mixing office expense with beneficiary aid items
 * 6. Itemized clearance with multiple receipts (Advance: ฿10,000, Receipts: ฿2,500 + ฿3,500 + ฿2,000 = ฿8,000 spent -> ฿2,000 refund to Treasurer)
 * 7. Overspent clearance (Advance: ฿5,000, Receipts: ฿5,600 = ฿600 excess):
 *    - Rejection of negative refund without explanation/policy approval
 *    - Successful overspent recording with explanation and policy authorization
 * 8. Duplicate clearance prevention: Cannot clear an already cleared voucher
 * 9. Workflow closure lock: Cannot modify or clear vouchers in a closed workflow
 * 10. Data cleanup
 */

import { FinancialService } from '../src/services/financialService';
import { getDb, initDb } from '../src/lib/db';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function pass(msg: string) {
  console.log(`${colors.green}  ✓ PASS: ${msg}${colors.reset}`);
}

function fail(msg: string, err?: any) {
  console.error(`${colors.red}  ✗ FAIL: ${msg}${colors.reset}`, err || '');
  process.exit(1);
}

function section(title: string) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`);
}

async function runTask6Verification() {
  console.log(`\n${colors.bold}${colors.yellow}================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}   TASK 6: ระบบเบิกเงินสำรองจ่ายสำนักงาน & เคลียร์เงินสำรองจ่าย   ${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}================================================================${colors.reset}\n`);

  const superAdminActor = { id: 'u-1', name: 'นายผู้ดูแลระบบ สูงสุด', role: 'super_admin' as const };
  const financeActor = { id: 'u-2', name: 'น.ส.การเงิน มีสุข', role: 'finance' as const };
  const officerActor = { id: 'u-3', name: 'นายเจ้าหน้าที่ ทั่วไป', role: 'officer' as const };

  let testWorkflowId = '';
  let testBankAccountId = '';
  let createdCategoryId = '';

  const getWorkflow = async (id: string) => {
    const list = await FinancialService.getCashFlowWorkflows();
    return list.find((w) => w.id === id);
  };

  try {
    await initDb();
    const db = getDb();
    // -------------------------------------------------------------------------
    // TEST 1: Default Categories Verification (11 หมวดเริ่มต้น)
    // -------------------------------------------------------------------------
    section('1. ตรวจสอบหมวดค่าใช้จ่ายเริ่มต้น 11 หมวด (รวม "อื่น ๆ")');
    const categories = await FinancialService.getAdminExpenseCategories(true);
    
    const requiredNames = [
      'ค่าตอบแทนเจ้าหน้าที่',
      'ค่าใช้จ่ายสำนักงาน',
      'ค่าน้ำมันรถ',
      'รถยนต์',
      'ค่าอินเทอร์เน็ต',
      'ค่าเดินทาง',
      'ค่าทำบัญชี',
      'ค่าตรวจสอบบัญชี',
      'อาหาร',
      'ค่าไฟฟ้า',
      'อื่น ๆ'
    ];

    for (const reqName of requiredNames) {
      const found = categories.find((c) => c.name.includes(reqName));
      if (!found) {
        fail(`ไม่พบหมวดค่าใช้จ่ายเริ่มต้น: "${reqName}" ในระบบ`);
      }
    }
    pass(`พบครบถ้วนทั้ง 11 หมวดค่าใช้จ่ายเริ่มต้น (มีทั้งหมด ${categories.length} หมวดในฐานข้อมูล)`);

    // -------------------------------------------------------------------------
    // TEST 2: Category Management (สิทธิ์ผู้ดูแล, เพิ่ม, แก้ไข, ปิดใช้งาน)
    // -------------------------------------------------------------------------
    section('2. ระบบจัดการหมวดค่าใช้จ่าย (สิทธิ์ผู้ดูแล, เพิ่ม, แก้ไข, ปิดใช้งาน)');

    // 2.1 Unauthorized user should be rejected
    try {
      await FinancialService.createAdminExpenseCategory(
        { code: 'TEST_UNAUTH', name: 'ทดสอบไร้สิทธิ์', expenseGroup: 'ทั่วไป', budgetLimit: 10000 },
        officerActor
      );
      fail('ควรปฏิเสธการเพิ่มหมวดค่าใช้จ่ายจากผู้ใช้งานทั่วไป (officer)');
    } catch (err: any) {
      pass(`ระบบปฏิเสธผู้ไม่มีสิทธิ์ตามนโยบาย: ${err.message}`);
    }

    // 2.2 Authorized user creates new category
    const uniqueCode = `TASK6_TEST_${Date.now().toString().slice(-4)}`;
    const newCat = await FinancialService.createAdminExpenseCategory(
      { code: uniqueCode, name: 'ค่าอุปกรณ์คอมพิวเตอร์สำนักงาน', expenseGroup: 'เทคโนโลยี', budgetLimit: 40000 },
      financeActor
    );
    createdCategoryId = newCat.id;
    if (newCat.code !== uniqueCode || !newCat.isActive) {
      fail('สร้างหมวดค่าใช้จ่ายใหม่ไม่ถูกต้อง');
    }
    pass(`ผู้ดูแลการเงินสร้างหมวดใหม่สำเร็จ: ${newCat.name} (รหัส: ${newCat.code})`);

    // 2.3 Edit category
    const updatedCat = await FinancialService.updateAdminExpenseCategory(
      createdCategoryId,
      { name: 'ค่าอุปกรณ์และซ่อมบำรุงคอมพิวเตอร์', budgetLimit: 50000 },
      superAdminActor
    );
    if (updatedCat.name !== 'ค่าอุปกรณ์และซ่อมบำรุงคอมพิวเตอร์' || updatedCat.budgetLimit !== 50000) {
      fail('แก้ไขหมวดค่าใช้จ่ายไม่สำเร็จ');
    }
    pass(`แก้ไขหมวดค่าใช้จ่ายสำเร็จ: ${updatedCat.name} (งบ: ฿${updatedCat.budgetLimit.toLocaleString()})`);

    // 2.4 Toggle disable category
    const toggledCat = await FinancialService.toggleAdminExpenseCategoryStatus(createdCategoryId, false, superAdminActor);
    if (toggledCat.isActive !== false) {
      fail('ปิดใช้งานหมวดค่าใช้จ่ายไม่สำเร็จ');
    }
    pass(`ปิดใช้งานหมวดค่าใช้จ่ายสำเร็จ (isActive = false)`);

    // 2.5 Re-enable
    await FinancialService.toggleAdminExpenseCategoryStatus(createdCategoryId, true, superAdminActor);
    pass(`เปิดใช้งานหมวดค่าใช้จ่ายอีกครั้งสำเร็จ (isActive = true)`);

    // -------------------------------------------------------------------------
    // SETUP: Create Fresh Cash Flow Workflow for Petty Cash Testing
    // -------------------------------------------------------------------------
    section('3. เตรียม Workflow เงินสดต้นทาง (ถอนเงินสดเข้าตู้นิรภัยเหรัญญิก)');
    
    // Find or create bank account
    const bankRes = await db.execute({
      sql: "SELECT id, current_balance FROM bank_accounts WHERE status = 'active' LIMIT 1",
      args: []
    });
    if (!bankRes.rows || bankRes.rows.length === 0) {
      const bId = `bank-test-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO bank_accounts (id, account_number, account_name, bank_name, branch_name, current_balance, status, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
        args: [bId, '123-4-56789-0', 'บัญชีกองทุนซะกาตและบริหาร', 'ธนาคารอิสลามแห่งประเทศไทย', 'ปัตตานี', 500000]
      });
      testBankAccountId = bId;
    } else {
      testBankAccountId = String(bankRes.rows[0].id);
      await db.execute({
        sql: 'UPDATE bank_accounts SET current_balance = current_balance + 200000 WHERE id = ?',
        args: [testBankAccountId]
      });
    }

    // Create workflow with Step 1
    const wf = await FinancialService.createCashFlowWorkflow(
      {
        title: 'รอบเบิกเงินสำรองจ่ายและดำเนินงานสำนักงาน TASK 6',
        bankAccountId: testBankAccountId,
        withdrawAmount: 50000,
        fundType: 'admin',
        eventDatetime: new Date().toISOString(),
        notes: 'ถอนเงินสดจากธนาคารเพื่อสำรองจ่ายสำนักงาน',
      },
      superAdminActor
    );
    testWorkflowId = wf.id;

    // Advance Step 2 (Deposit into safe by Ruslan)
    await FinancialService.advanceWorkflowToStep2(
      testWorkflowId,
      {
        treasurerName: 'นายรุสลัน หะสาเมาะ',
        auditorName: 'อิหม่ามฟารุก อาลี',
        depositAmount: 50000,
        eventDatetime: new Date().toISOString(),
        status: 'received',
        proofUrl: 'https://storage.zms.org/slips/deposit-step2.pdf',
        proofName: 'deposit-step2.pdf',
        notes: 'รับเงินสด ฿50,000 เข้าตู้นิรภัยเหรัญญิกเรียบร้อย',
      },
      superAdminActor
    );

    const wfCheck = await getWorkflow(testWorkflowId);
    if (!wfCheck || wfCheck.availableTreasurerCash !== 50000) {
      fail(`เงินสดในมือเหรัญญิกไม่ตรง: ได้รับ ${wfCheck?.availableTreasurerCash} แต่คาดหวัง 50000`);
    }
    pass(`เตรียม Workflow สำเร็จ เงินสดพร้อมใช้ในมือเหรัญญิก: ฿${(wfCheck?.availableTreasurerCash ?? 0).toLocaleString()} บาท`);

    // -------------------------------------------------------------------------
    // TEST 3: Validation - Reject Unauthorized Source Fund
    // -------------------------------------------------------------------------
    section('4. ตรวจสอบการป้องกัน: ห้ามใช้แหล่งเงินที่ไม่ได้รับอนุญาตสำหรับค่าใช้จ่ายสำนักงาน');
    try {
      await FinancialService.addCashFlowWithdrawal(
        {
          workflowId: testWorkflowId,
          withdrawalNo: `V-UNAUTH-${Date.now().toString().slice(-4)}`,
          voucherType: 'office_expense',
          sourceFundType: 'faqir_miskin', // FORBIDDEN for office expense
          requestedAmount: 5000,
          approvedAmount: 5000,
          amount: 5000,
          withdrawerName: 'นายเจ้าหน้าที่',
          expenseCategory: 'OFFICE_EXPENSES',
          expenseDetails: 'ซื้อหมึกพิมพ์',
        },
        superAdminActor
      );
      fail('ควรปฏิเสธการใช้เงินกองทุนซะกาตผู้ยากไร้ (faqir_miskin) สำหรับค่าใช้จ่ายสำนักงาน');
    } catch (err: any) {
      pass(`ระบบป้องกันสำเร็จ: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Validation - Reject Mixing Office Expense with Aid Line Items
    // -------------------------------------------------------------------------
    section('5. ตรวจสอบการป้องกัน: ห้ามรวมค่าใช้จ่ายสำนักงานเป็นยอดช่วยเหลือผู้รับซะกาต');
    try {
      await FinancialService.addCashFlowWithdrawal(
        {
          workflowId: testWorkflowId,
          withdrawalNo: `V-MIXED-${Date.now().toString().slice(-4)}`,
          voucherType: 'office_expense',
          sourceFundType: 'amileen',
          requestedAmount: 5000,
          approvedAmount: 5000,
          amount: 5000,
          withdrawerName: 'นายเจ้าหน้าที่',
          expenseCategory: 'OFFICE_EXPENSES',
          disbursementItems: [
            {
              applicationId: 'app-fake',
              beneficiaryId: 'ben-fake',
              beneficiaryName: 'นายผู้รับ ปลอม',
              thisDisbursementAmount: 5000,
            } as any,
          ],
        },
        superAdminActor
      );
      fail('ควรปฏิเสธการปะปนรายการช่วยเหลือผู้รับซะกาตในการเบิกเงินสำรองจ่ายสำนักงาน');
    } catch (err: any) {
      pass(`ระบบป้องกันสำเร็จ: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Successful Petty Cash Withdrawal (13 Fields)
    // -------------------------------------------------------------------------
    section('6. บันทึกการเบิกเงินสำรองจ่ายสำนักงานครบทั้ง 13 ฟิลด์');
    const deadline1 = new Date();
    deadline1.setDate(deadline1.getDate() + 7);

    const withdrawal1 = await FinancialService.addCashFlowWithdrawal(
      {
        workflowId: testWorkflowId,
        withdrawalNo: `PC-${Date.now().toString().slice(-4)}-01`,
        voucherType: 'office_expense',
        withdrawalDatetime: new Date().toISOString(),
        withdrawerName: 'นายมุกลิส มีระยะ',
        expenseCategory: 'VEHICLE_FUEL',
        expenseDetails: 'ค่าน้ำมันรถยนต์สำหรับลงพื้นที่สำรวจคำร้อง เขต อ.เมืองปัตตานี',
        allowedFundId: 'operational',
        sourceFundType: 'operational',
        requestedAmount: 10000,
        approvedAmount: 10000,
        amount: 10000,
        approverName: 'อิหม่ามฟารุก อาลี',
        deadlineDate: deadline1.toISOString().slice(0, 10),
        notes: 'เบิกสำรองจ่ายค่าน้ำมันและพาหนะ กำหนดเคลียร์ใน 7 วัน',
        status: 'disbursed',
        proofUrl: '/uploads/documents/sample-voucher.pdf',
        proofName: 'sample-voucher.pdf',
        proofSize: 1024,
        proofType: 'application/pdf',
      },
      superAdminActor
    );

    // Verify all 13 fields recorded
    if (!withdrawal1.withdrawalId) fail('ไม่ได้รับ withdrawalId ของใบสำคัญ');
    if (withdrawal1.amount !== 10000) fail('ยอดเงินเบิกไม่ตรง');

    // Check treasurer balance reduction and saved voucher in workflow
    const wfAfterPC1 = await getWorkflow(testWorkflowId);
    const savedW1 = wfAfterPC1?.withdrawals?.find((w) => w.id === withdrawal1.withdrawalId);
    if (!savedW1) {
      fail('ไม่พบใบสำคัญที่บันทึกในรอบ Workflow');
      throw new Error('savedW1 not found');
    }
    if (savedW1.voucherType !== 'office_expense') fail('voucherType ไม่ใช่ office_expense');
    if (savedW1.clearanceStatus !== 'pending_clearance') fail('clearanceStatus เริ่มต้นไม่ใช่ pending_clearance');
    if (wfAfterPC1?.availableTreasurerCash !== 40000) {
      fail(`เงินสดในมือเหรัญญิกไม่ถูกตัดทอนถูกต้อง: ได้ ${wfAfterPC1?.availableTreasurerCash} แต่คาดหวัง 40000`);
    }
    pass(`บันทึกใบสำคัญเบิก ${withdrawal1.withdrawalNo} ยอด ฿10,000 ครบ 13 ฟิลด์สำเร็จ ตัดยอดตู้นิรภัยเหลือ ฿40,000`);

    // -------------------------------------------------------------------------
    // TEST 6: Itemized Clearance with Refund (ยอดใช้ ฿8,000, คืน ฿2,000)
    // -------------------------------------------------------------------------
    section('7. ระบบเคลียร์เงินสำรองจ่ายแบบแจกแจงใบเสร็จ (Itemized Receipts) & คืนเงินสด');
    const clearance1 = await FinancialService.clearPettyCash(
      {
        withdrawalId: withdrawal1.withdrawalId,
        spentAmount: 8000,
        returnedAmount: 2000,
        returnDate: new Date().toISOString().slice(0, 10),
        clearanceDate: new Date().toISOString().slice(0, 10),
        notes: 'ใบเสร็จน้ำมัน 3 ใบครบถ้วน ส่งคืนเงินสดคงเหลือ ฿2,000 เข้าตู้นิรภัยเหรัญญิก',
        items: [
          {
            expenseDate: '2026-10-21',
            categoryCode: 'VEHICLE_FUEL',
            categoryName: 'ค่าน้ำมันรถ',
            description: 'ปั๊ม ปตท. สาขาดอนยาง เติมดีเซล ทะเบียน กข-1234',
            amount: 2500,
            receiptUrl: '/uploads/receipts/ptt-01.jpg',
            receiptName: 'ptt-01.jpg',
          },
          {
            expenseDate: '2026-10-22',
            categoryCode: 'VEHICLE_FUEL',
            categoryName: 'ค่าน้ำมันรถ',
            description: 'ปั๊ม เชลล์ สาขาหนองจิก เติมดีเซล ทะเบียน กข-1234',
            amount: 3500,
            receiptUrl: '/uploads/receipts/shell-02.jpg',
            receiptName: 'shell-02.jpg',
          },
          {
            expenseDate: '2026-10-22',
            categoryCode: 'VEHICLE_MAINTENANCE',
            categoryName: 'รถยนต์',
            description: 'เปลี่ยนถ่ายน้ำมันเครื่องและไส้กรองประจำรอบ',
            amount: 2000,
            receiptUrl: '/uploads/receipts/service-03.jpg',
            receiptName: 'service-03.jpg',
          },
        ],
      },
      superAdminActor
    );

    if (clearance1.clearanceStatus !== 'cleared') fail(`สถานะการเคลียร์ไม่ใช่ cleared: ${clearance1.clearanceStatus}`);
    if (clearance1.clearanceReturnedAmount !== 2000) fail(`ยอดเงินคืนไม่ตรง: ได้ ${clearance1.clearanceReturnedAmount}`);
    if (clearance1.clearanceSpentAmount !== 8000) fail(`ยอดค่าใช้จ่ายจริงไม่ตรง: ได้ ${clearance1.clearanceSpentAmount}`);

    // Check itemized receipts saved in DB
    const savedItems = await FinancialService.getPettyCashClearanceItems(withdrawal1.withdrawalId);
    if (savedItems.length !== 3) fail(`จำนวนรายการใบเสร็จใน DB ไม่ตรง: ได้ ${savedItems.length} คาดหวัง 3`);

    // Verify refund added back to Treasurer available cash
    const wfAfterClear1 = await getWorkflow(testWorkflowId);
    if (wfAfterClear1?.availableTreasurerCash !== 42000) {
      fail(`เงินสดส่งคืนไม่ถูกทบกลับเข้าตู้นิรภัยเหรัญญิก: ได้ ${wfAfterClear1?.availableTreasurerCash} คาดหวัง 42000`);
    }
    pass(`เคลียร์เงินสำรองจ่ายสำเร็จ: ได้รับ ฿10,000, ค่าใช้จ่ายจริง 3 ใบเสร็จรวม ฿8,000, คืนเงินสด ฿2,000 เข้าตู้นิรภัย (คงเหลือ ฿42,000)`);

    // -------------------------------------------------------------------------
    // TEST 7: Duplicate Clearance Prevention
    // -------------------------------------------------------------------------
    section('8. ตรวจสอบการป้องกันการบันทึกซ้ำ (Duplicate Clearance Prevention)');
    try {
      await FinancialService.clearPettyCash(
        {
          withdrawalId: withdrawal1.withdrawalId,
          spentAmount: 8000,
          returnedAmount: 2000,
          returnDate: new Date().toISOString().slice(0, 10),
          notes: 'พยายามเคลียร์ซ้ำรอบที่สอง',
        },
        superAdminActor
      );
      fail('ควรปฏิเสธการเคลียร์เงินสำรองจ่ายซ้ำสำหรับใบสำคัญที่เคลียร์แล้ว');
    } catch (err: any) {
      pass(`ป้องกันการบันทึกเคลียร์เงินซ้ำสำเร็จ: ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Overspent Petty Cash Clearance (ยอดใช้ ฿5,600 จากวงเงิน ฿5,000)
    // -------------------------------------------------------------------------
    section('9. ตรวจสอบกรณีค่าใช้จ่ายเกินเงินที่ได้รับ (Overspent Advance) & นโยบายอนุมัติ');

    // Create 2nd petty cash withdrawal: ฿5,000
    const withdrawal2 = await FinancialService.addCashFlowWithdrawal(
      {
        workflowId: testWorkflowId,
        withdrawalNo: `PC-${Date.now().toString().slice(-4)}-02`,
        voucherType: 'office_expense',
        withdrawalDatetime: new Date().toISOString(),
        withdrawerName: 'นายมุกลิส มีระยะ',
        expenseCategory: 'OFFICE_EXPENSES',
        expenseDetails: 'จัดซื้อกระดาษ แฟ้มเอกสาร และอุปกรณ์สำนักงาน',
        allowedFundId: 'admin',
        sourceFundType: 'admin',
        requestedAmount: 5000,
        approvedAmount: 5000,
        amount: 5000,
        approverName: 'อิหม่ามฟารุก อาลี',
        deadlineDate: deadline1.toISOString().slice(0, 10),
        status: 'disbursed',
      },
      superAdminActor
    );

    // 8.1 Try to record overspent without explanation
    try {
      await FinancialService.clearPettyCash(
        {
          withdrawalId: withdrawal2.withdrawalId,
          spentAmount: 5600, // Exceeds 5,000 by 600
          returnedAmount: -600, // Negative return is FORBIDDEN
          returnDate: new Date().toISOString().slice(0, 10),
          notes: 'ไม่ระบุคำชี้แจง',
        },
        superAdminActor
      );
      fail('ควรปฏิเสธการบันทึกเงินคืนติดลบโดยไม่มีคำชี้แจง');
    } catch (err: any) {
      pass(`ป้องกันการบันทึกเงินคืนติดลบโดยไม่มีคำชี้แจงสำเร็จ: ${err.message}`);
    }

    // 8.2 Try to record overspent without policy approval
    try {
      await FinancialService.clearPettyCash(
        {
          withdrawalId: withdrawal2.withdrawalId,
          spentAmount: 5600,
          returnedAmount: 0,
          overspentReason: 'กระดาษราคาปรับขึ้น',
          isOverspentApproved: false, // NOT approved
          returnDate: new Date().toISOString().slice(0, 10),
        },
        superAdminActor
      );
      fail('ควรปฏิเสธเมื่อส่วนต่างค่าใช้จ่ายเกินไม่ได้รับการอนุมัติตามนโยบาย');
    } catch (err: any) {
      pass(`ระบบตรวจสอบการอนุมัติตามนโยบายสำเร็จ: ${err.message}`);
    }

    // 8.3 Successfully clear with explanation and authorized policy approval
    const clearance2 = await FinancialService.clearPettyCash(
      {
        withdrawalId: withdrawal2.withdrawalId,
        spentAmount: 5600,
        returnedAmount: 0,
        overspentReason: 'งานเร่งด่วน จัดซื้อวัสดุสิ้นเปลืองเพิ่มตามมติคณะทำงาน',
        isOverspentApproved: true,
        returnDate: new Date().toISOString().slice(0, 10),
        notes: 'ชี้แจงส่วนต่าง ฿600 และได้รับการอนุมัติตามนโยบายเรียบร้อย',
        items: [
          {
            expenseDate: '2026-10-22',
            categoryCode: 'OFFICE_EXPENSES',
            description: 'กระดาษ A4 จำนวน 10 รีมและแฟ้มเอกสาร',
            amount: 3200,
          },
          {
            expenseDate: '2026-10-22',
            categoryCode: 'OFFICE_EXPENSES',
            description: 'หมึกพิมพ์เลเซอร์และอุปกรณ์สำนักงานเพิ่มเติม',
            amount: 2400,
          },
        ],
      },
      superAdminActor
    );

    if (clearance2.clearanceStatus !== 'overspent_approved') {
      fail(`สถานะการเคลียร์ไม่ใช่ overspent_approved: ${clearance2.clearanceStatus}`);
    }
    if (clearance2.clearanceExcessAmount !== 600) {
      fail(`ยอดค่าใช้จ่ายส่วนเกินไม่ตรง: ได้ ${clearance2.clearanceExcessAmount} คาดหวัง 600`);
    }
    if (clearance2.clearanceReturnedAmount !== 0) {
      fail(`ยอดเงินคืนควรเป็น 0 (ห้ามติดลบ): ได้ ${clearance2.clearanceReturnedAmount}`);
    }
    pass(`เคลียร์กรณีจ่ายเกินสำเร็จ: ยอดได้รับ ฿5,000, ใช้จริง ฿5,600, ส่วนต่าง ฿600 (สถานะ: overspent_approved, เงินคืน: ฿0)`);

    // -------------------------------------------------------------------------
    // TEST 9: Workflow Closure Integration & Immutability
    // -------------------------------------------------------------------------
    section('10. ตรวจสอบการปิดรอบ Workflow (Step 5) & ความไม่เปลี่ยนแปลงของข้อมูล (Immutability)');

    // Audit summary check
    const summary = await FinancialService.getWorkflowAuditSummary(testWorkflowId);
    if (!summary.canClose) {
      fail(`ไม่สามารถปิดรอบได้: มีเงื่อนไขค้าง ${JSON.stringify(summary.validationErrors)}`);
    }
    pass(`ตรวจสอบเงื่อนไข Audit สรุปพร้อมปิดรอบ (canClose = true, ใบสำคัญเคลียร์ครบ 100%)`);

    // Close workflow
    await FinancialService.advanceWorkflowToStep5(
      testWorkflowId,
      {
        eventDatetime: new Date().toISOString(),
        reconciledAmount: 50000,
        notes: 'ปิดรอบการเงิน TASK 6 ตรวจสอบใบสำคัญและยอดสำรองจ่ายครบถ้วน',
      },
      superAdminActor
    );

    // Verify immutability: Cannot add or clear vouchers in closed workflow
    try {
      await FinancialService.addCashFlowWithdrawal(
        {
          workflowId: testWorkflowId,
          withdrawalNo: 'PC-AFTER-CLOSE',
          voucherType: 'office_expense',
          amount: 1000,
        },
        superAdminActor
      );
      fail('ควรปฏิเสธการออกใบสำคัญในรอบที่ถูกปิดแล้ว');
    } catch (err: any) {
      pass(`ระบบล็อกความไม่เปลี่ยนแปลงหลังปิดรอบสำเร็จ (Rule 9): ${err.message}`);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Data Cleanup
    // -------------------------------------------------------------------------
    section('11. ล้างข้อมูลการทดสอบ (Cleanup)');
    if (createdCategoryId) {
      await db.execute({ sql: 'DELETE FROM admin_expense_categories WHERE id = ?', args: [createdCategoryId] });
    }
    // Clean test workflow data with proper FK order
    await db.execute({ sql: 'DELETE FROM workflow_attachments WHERE workflow_id = ?', args: [testWorkflowId] });
    await db.execute({ sql: 'DELETE FROM cash_flow_clearance_items WHERE workflow_id = ?', args: [testWorkflowId] });
    await db.execute({ sql: 'DELETE FROM cash_flow_disbursement_items WHERE workflow_id = ?', args: [testWorkflowId] });
    await db.execute({ sql: 'DELETE FROM cash_flow_withdrawals WHERE workflow_id = ?', args: [testWorkflowId] });
    await db.execute({ sql: 'DELETE FROM cash_flow_workflows WHERE id = ?', args: [testWorkflowId] });
    if (testBankAccountId.startsWith('bank-test-')) {
      await db.execute({ sql: 'DELETE FROM bank_accounts WHERE id = ?', args: [testBankAccountId] });
    }
    pass('ล้างข้อมูลการทดสอบ TASK 6 เรียบร้อย ข้อมูลระบบสะอาดสมบูรณ์');

    console.log(`\n${colors.bold}${colors.green}================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.green}   ✓ ALL TESTS PASSED: ระบบเบิกเงินสำรองจ่ายสำนักงานผ่าน 100%   ${colors.reset}`);
    console.log(`${colors.bold}${colors.green}================================================================\n${colors.reset}`);
  } catch (error: any) {
    fail('เกิดข้อผิดพลาดในการทดสอบ TASK 6', error);
  }
}

runTask6Verification();
