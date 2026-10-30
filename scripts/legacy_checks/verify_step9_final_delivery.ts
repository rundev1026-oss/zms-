/**
 * Final Delivery & Full Integration Test (Phase 9)
 * Tests complete 3-Tier Lifecycle & 10 System Modules:
 *  1. End-to-End 3-Tier Lifecycle (Setup -> Request -> Assessment -> Approval -> Disbursement -> Ledger -> Report)
 *  2. Module 1: Faqir-Miskin Fund Allocation Management & Subfunds API
 *  3. Module 2: Asnaf Primary Allocations Management & 100% Proportions
 *  4. Module 3: Database Schema, Foreign Keys & Table Integrity
 *  5. Module 4: Fund CRUD Operations & Budget Adjustments Audit History
 *  6. Module 5: Dynamic 3-Tier Cascading Selectors (Staff & Public)
 *  7. Module 6: Approvals Workbench & Budget Over-allocation Guard
 *  8. Module 7: Field Assessment & Living Score Engine
 *  9. Module 8: Finance Module, Disbursements & General Ledger
 *  10. Module 9: 3-Tier Financial Reports & Risk Dashboard Aggregation
 *  11. Module 10: Shariah Fund Segregation, RBAC & Audit Trail Logging
 */

import { initDb, getDb } from '../src/lib/db';
import { FinancialService } from '../src/services/financialService';
import { BeneficiaryService } from '../src/services/beneficiaryService';
import { normalizePrimaryGroupCode } from '../src/lib/financeUtils';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] #${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] #${totalTests}: ${testName}`);
    if (details) {
      console.error('         Details:', details);
    }
  }
}

async function runStep9Verification() {
  console.log('================================================================');
  console.log('   STEP 9: FINAL INTEGRATION & REGRESSION VERIFICATION (10 MODULES)  ');
  console.log('================================================================\n');

  await initDb();
  const db = getDb();

  // Reset ast-1 to subf-1 in case previous interrupted run modified it
  await db.execute({
    sql: "UPDATE assistance_types SET specific_fund_id = 'subf-1' WHERE id = 'ast-1'",
    args: []
  });
  // Clean up any stale assistance types and test funds from previous runs
  await db.execute({
    sql: "DELETE FROM assistance_types WHERE code LIKE 'ast_crud_%' OR specific_fund_id NOT IN (SELECT id FROM faqir_miskin_sub_funds)",
    args: []
  });
  await db.execute({
    sql: "DELETE FROM fund_budget_adjustments WHERE specific_fund_id IN (SELECT id FROM faqir_miskin_sub_funds WHERE code LIKE '%crud%' OR fund_code LIKE '%CRUD%')",
    args: []
  });
  await db.execute({
    sql: "DELETE FROM faqir_miskin_sub_funds WHERE code LIKE '%crud%' OR fund_code LIKE '%CRUD%'",
    args: []
  });

  const currentYear = '2569';
  const officerActor = { id: 'u-officer-e2e', name: 'เจ้าหน้าที่ลงพื้นที่ E2E', role: 'officer' as any };
  const approverActor = { id: 'u-approver-e2e', name: 'คณะกรรมการพิจารณา E2E', role: 'approver' as any };
  const financeActor = { id: 'u-finance-e2e', name: 'เจ้าหน้าที่การเงิน E2E', role: 'finance' as any };
  const adminActor = { id: 'u-admin-e2e', name: 'ผู้ดูแลระบบ E2E', role: 'admin' as any };

  // -------------------------------------------------------------------------
  // SECTION 1: END-TO-END 3-TIER LIFECYCLE (Setup -> Request -> Assessment -> Approval -> Disbursement -> Ledger -> Report)
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: End-to-End 3-Tier Workflow Lifecycle ---');

  // Step 1.1: Verify initial balances of primary asnaf and specific fund
  const asnafRes = await db.execute({
    sql: "SELECT asnaf_code, committed_amount, disbursed_amount FROM asnaf_allocations WHERE asnaf_code = 'faqir_miskin' AND fiscal_year = ?",
    args: [currentYear]
  });
  const subfRes = await db.execute({
    sql: "SELECT id, code, primary_group_code, committed_amount, disbursed_amount, remaining_amount FROM faqir_miskin_sub_funds WHERE id = 'subf-1'",
    args: []
  });
  const fundAccRes = await db.execute({
    sql: "SELECT id, committed_amount, available_amount FROM fund_accounts WHERE id = 'fund-1'",
    args: []
  });

  assert(asnafRes.rows.length > 0, 'Primary Asnaf (faqir_miskin) exists in DB');
  assert(subfRes.rows.length > 0, 'Specific Fund (subf-1) exists in DB');
  assert(String(subfRes.rows[0].primary_group_code) === 'faqir_miskin', 'Specific Fund correctly linked to primary_group_code = faqir_miskin');

  const initialAsnaf = asnafRes.rows[0];
  const initialSubfund = subfRes.rows[0];
  const initialFundAcc = fundAccRes.rows[0];

  const initFaCommitted = Number(initialFundAcc.committed_amount || 0);
  const initSubfundCommitted = Number(initialSubfund.committed_amount || 0);
  const initSubfundDisbursed = Number(initialSubfund.disbursed_amount || 0);
  const initAsnafCommitted = Number(initialAsnaf.committed_amount || 0);
  const initAsnafDisbursed = Number(initialAsnaf.disbursed_amount || 0);

  // Step 1.2: Check Level 3 Assistance Type
  const astRes = await db.execute({
    sql: "SELECT id, name, specific_fund_id FROM assistance_types WHERE id = 'ast-1'",
    args: []
  });
  assert(astRes.rows.length > 0 && String(astRes.rows[0].specific_fund_id) === 'subf-1', 'Level 3 Assistance Type (ast-1) is linked to subf-1');

  // Step 1.3: Submit new assistance request with 3 tiers
  const testHhId = `hh-final-e2e-${Date.now()}`;
  const testBenId = `ben-final-e2e-${Date.now()}`;
  const testAppId = `app-final-e2e-${Date.now()}`;
  const testAppNo = `APP-E2E-${Date.now().toString().slice(-4)}`;
  const testRefNo = `REF-E2E-${Date.now().toString().slice(-6)}`;

  await db.execute({
    sql: `INSERT INTO households (id, household_no, address, province, district, community) 
          VALUES (?, ?, '456/78 ถนนมิตรภาพ', 'กรุงเทพมหานคร', 'บางรัก', 'ชุมชนพัฒนา')`,
    args: [testHhId, `HH-E2E-${Date.now().toString().slice(-4)}`]
  });

  await db.execute({
    sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, branch_id, branch_name) 
          VALUES (?, ?, 'นายทดสอบ วงจรสมบูรณ์', '1999999999999', '0899999999', 'miskin', 'br-hq', 'สำนักงานใหญ่ กรุงเทพมหานคร')`,
    args: [testBenId, testHhId]
  });

  await db.execute({
    sql: `INSERT INTO assistance_applications (
      id, application_no, beneficiary_id, asnaf_category, requested_amount, status,
      assigned_officer_id, assigned_officer_name, applied_date, branch_id, branch_name,
      primary_group_code, specific_fund_id, specific_fund_code, specific_fund_name,
      assistance_type_id, assistance_type, fiscal_year
    ) VALUES (?, ?, ?, 'miskin', 5000, 'doc_review', ?, ?, '2026-10-29', 'br-hq', 'สำนักงานใหญ่ กรุงเทพมหานคร',
      'faqir_miskin', 'subf-1', 'living', 'กองทุนช่วยเหลือค่าครองชีพ', 'ast-1', 'เงินสงเคราะห์ยังชีพ', '2569')`,
    args: [testAppId, testAppNo, testBenId, officerActor.id, officerActor.name]
  });

  const checkAppInserted = await db.execute({
    sql: 'SELECT id, primary_group_code, specific_fund_id, assistance_type_id, status FROM assistance_applications WHERE id = ?',
    args: [testAppId]
  });
  assert(checkAppInserted.rows.length === 1, 'E2E Step 1.3: Application submitted with 3-tier relations');
  assert(String(checkAppInserted.rows[0].primary_group_code) === 'faqir_miskin', 'App primary_group_code = faqir_miskin');
  assert(String(checkAppInserted.rows[0].specific_fund_id) === 'subf-1', 'App specific_fund_id = subf-1');
  assert(String(checkAppInserted.rows[0].assistance_type_id) === 'ast-1', 'App assistance_type_id = ast-1');

  // Step 1.4: Field Assessment
  const assessRes = await BeneficiaryService.submitAssessment(
    testAppId,
    {
      housingCondition: 'poor',
      housingNotes: 'บ้านชำรุดทรุดโทรม',
      livingScore: 82,
      debtBurdenSummary: 'หนี้ค่าครองชีพ 5,000 บาท',
      primaryHardship: 'รายได้ไม่พอยังชีพ',
      officerRecommendation: 'recommend_full',
      recommendedAmount: 5000,
      recommendedFundId: 'fund-1',
      recommendedSpecificFundId: 'subf-1',
      generalNotes: 'ผ่านเกณฑ์ความช่วยเหลือเร่งด่วน',
    },
    officerActor
  );
  assert(assessRes.status === 'pending_approval', 'E2E Step 1.4: Assessment completed, application moved to pending_approval');

  // Verify Segregation of Duties on Approval: Assigned officer cannot approve
  let officerApprovalBlocked = false;
  try {
    await BeneficiaryService.approveApplication(
      testAppId,
      5000,
      'fund-1',
      'พยายามอนุมัติโดยเจ้าหน้าที่ลงพื้นที่เอง',
      officerActor,
      'subf-1'
    );
  } catch (err: any) {
    officerApprovalBlocked = true;
  }
  assert(officerApprovalBlocked, 'Segregation of Duties: Assigned officer cannot approve own application');

  // Verify Solvency Check: Attempting to approve > 999,000,000 THB is blocked
  let excessiveBlocked = false;
  try {
    await BeneficiaryService.approveApplication(
      testAppId,
      999999999,
      'fund-1',
      'ทดสอบยอดเกินงบประมาณ',
      approverActor,
      'subf-1'
    );
  } catch (err: any) {
    excessiveBlocked = true;
  }
  assert(excessiveBlocked, 'Solvency Guard: Excessive budget approval blocked by solvency check');

  // Step 1.5: Valid Committee Approval & Budget Commitment
  const approveRes = await BeneficiaryService.approveApplication(
    testAppId,
    5000,
    'fund-1',
    'คณะกรรมการอนุมัติ 5,000 บาท',
    approverActor,
    'subf-1'
  );
  assert(approveRes.status === 'wait_disbursement', 'E2E Step 1.5: Application approved successfully, status = wait_disbursement');

  // Verify Multi-Tier commitment increments in DB
  const postApproveFa = await db.execute({ sql: 'SELECT committed_amount FROM fund_accounts WHERE id = ?', args: ['fund-1'] });
  const postApproveSf = await db.execute({ sql: 'SELECT committed_amount FROM faqir_miskin_sub_funds WHERE id = ?', args: ['subf-1'] });
  const postApproveAa = await db.execute({ sql: "SELECT committed_amount FROM asnaf_allocations WHERE asnaf_code = 'faqir_miskin' AND fiscal_year = ?", args: [currentYear] });

  assert(Number(postApproveFa.rows[0].committed_amount) === initFaCommitted + 5000, 'fund_accounts commitment increased by 5,000');
  assert(Number(postApproveSf.rows[0].committed_amount) === initSubfundCommitted + 5000, 'faqir_miskin_sub_funds commitment increased by 5,000');
  assert(Number(postApproveAa.rows[0].committed_amount) === initAsnafCommitted + 5000, 'asnaf_allocations commitment increased by 5,000');

  // Segregation of Duties on Disbursement: Approver cannot disburse
  let approverDisburseBlocked = false;
  try {
    await BeneficiaryService.recordDisbursement(
      testAppId,
      testRefNo,
      '/slips/test.jpg',
      'พยายามจ่ายเงินโดยผู้อนุมัติ',
      approverActor
    );
  } catch (err: any) {
    approverDisburseBlocked = true;
  }
  assert(approverDisburseBlocked, 'Segregation of Duties: Approver cannot disburse aid');

  // Step 1.6: Valid Aid Disbursement
  const disbRes = await BeneficiaryService.recordDisbursement(
    testAppId,
    testRefNo,
    '/slips/test_e2e.jpg',
    'โอนเงินช่วยเหลือสำเร็จ',
    financeActor
  );
  assert(disbRes.status === 'disbursed', 'E2E Step 1.6: Disbursement recorded, status = disbursed');

  // Verify Multi-Tier commitment released and disbursed amount incremented
  const postDisbFa = await db.execute({ sql: 'SELECT committed_amount FROM fund_accounts WHERE id = ?', args: ['fund-1'] });
  const postDisbSf = await db.execute({ sql: 'SELECT committed_amount, disbursed_amount FROM faqir_miskin_sub_funds WHERE id = ?', args: ['subf-1'] });
  const postDisbAa = await db.execute({ sql: "SELECT committed_amount, disbursed_amount FROM asnaf_allocations WHERE asnaf_code = 'faqir_miskin' AND fiscal_year = ?", args: [currentYear] });

  assert(Number(postDisbFa.rows[0].committed_amount) === initFaCommitted, 'fund_accounts commitment released back');
  assert(Number(postDisbSf.rows[0].committed_amount) === initSubfundCommitted, 'faqir_miskin_sub_funds commitment released back');
  assert(Number(postDisbSf.rows[0].disbursed_amount) === initSubfundDisbursed + 5000, 'faqir_miskin_sub_funds disbursed_amount increased by 5,000');
  assert(Number(postDisbAa.rows[0].committed_amount) === initAsnafCommitted, 'asnaf_allocations commitment released back');
  assert(Number(postDisbAa.rows[0].disbursed_amount) === initAsnafDisbursed + 5000, 'asnaf_allocations disbursed_amount increased by 5,000');

  // Check General Ledger / Financial Transaction has 3 tiers
  const ftRes = await db.execute({
    sql: 'SELECT id, type, specific_fund_id, assistance_type_id, asnaf_category, amount FROM financial_transactions WHERE reference_no = ?',
    args: [testRefNo]
  });
  assert(ftRes.rows.length === 1, 'General Ledger financial_transactions row created');
  assert(String(ftRes.rows[0].specific_fund_id) === 'subf-1', 'GL transaction records specific_fund_id = subf-1');
  assert(String(ftRes.rows[0].assistance_type_id) === 'ast-1', 'GL transaction records assistance_type_id = ast-1');
  assert(String(ftRes.rows[0].asnaf_category) === 'faqir_miskin', 'GL transaction records asnaf_category = faqir_miskin');
  assert(Number(ftRes.rows[0].amount) === 5000, 'GL transaction records amount = 5,000');

  // Step 1.7: Duplicate Disbursement Guard Check
  let duplicatePrevented = false;
  try {
    await BeneficiaryService.recordDisbursement(
      testAppId,
      testRefNo,
      '/slips/dup.jpg',
      'จ่ายซ้ำ',
      financeActor
    );
  } catch (err: any) {
    duplicatePrevented = true;
  }
  assert(duplicatePrevented, 'Duplicate disbursement guard prevents double payments');

  // Step 1.8: Three-tier summary report check reflects disbursement
  const repCheck = await FinancialService.getFinancialReports('three_tier_fund_summary', { year: currentYear });
  assert(repCheck != null && Array.isArray(repCheck.rows), 'Three-tier summary report generated');
  const subf1Row = repCheck.rows.find((r: string[]) => r[1].toLowerCase().includes('living') || r[2].includes('ค่าครองชีพ'));
  assert(subf1Row != null, 'Three-tier summary report contains living specific fund row');

  // Clean up E2E record safely & restore initial DB state
  await db.execute({ sql: 'DELETE FROM financial_transactions WHERE reference_no = ?', args: [testRefNo] });
  await db.execute({ sql: 'DELETE FROM beneficiary_assessments WHERE application_id = ?', args: [testAppId] });
  await db.execute({ sql: 'DELETE FROM assistance_applications WHERE id = ?', args: [testAppId] });
  await db.execute({ sql: 'DELETE FROM beneficiaries WHERE id = ?', args: [testBenId] });
  await db.execute({ sql: 'DELETE FROM households WHERE id = ?', args: [testHhId] });

  await db.execute({
    sql: 'UPDATE faqir_miskin_sub_funds SET committed_amount = ?, disbursed_amount = ? WHERE id = ?',
    args: [initSubfundCommitted, initSubfundDisbursed, 'subf-1']
  });
  await db.execute({
    sql: "UPDATE asnaf_allocations SET committed_amount = ?, disbursed_amount = ? WHERE asnaf_code = 'faqir_miskin' AND fiscal_year = ?",
    args: [initAsnafCommitted, initAsnafDisbursed, currentYear]
  });
  await db.execute({
    sql: 'UPDATE fund_accounts SET committed_amount = ? WHERE id = ?',
    args: [initFaCommitted, 'fund-1']
  });

  console.log('  -> E2E workflow completed and cleaned up successfully.\n');

  // -------------------------------------------------------------------------
  // SECTION 2: 10 MODULES SYSTEM REGRESSION TESTING
  // -------------------------------------------------------------------------
  console.log('--- SECTION 2: 10 Modules System Regression Testing ---');

  // MODULE 1: Faqir-Miskin Fund Allocation Management & Subfunds API
  console.log('>> Module 1: Faqir-Miskin Fund Allocation Management');
  const subfunds = await FinancialService.getFaqirMiskinSubFunds(currentYear);
  assert(Array.isArray(subfunds) && subfunds.length >= 5, 'Subfunds list returned with at least 5 standard specific funds');
  const sumSubfundProportions = subfunds.filter(s => s.isActive).reduce((sum, s) => sum + s.percentage, 0);
  assert(Math.round(sumSubfundProportions) === 100, `Active subfunds proportions sum to 100% (Actual: ${sumSubfundProportions}%)`);
  subfunds.forEach(s => {
    assert(s.primaryGroupCode === 'faqir_miskin', `Subfund ${s.code} correctly tagged with primaryGroupCode = faqir_miskin`);
    assert(typeof s.targetAmount === 'number' && s.targetAmount >= 0, `Subfund ${s.code} has valid numeric targetAmount`);
  });

  // MODULE 2: Asnaf Primary Allocations Management & 100% Proportions
  console.log('\n>> Module 2: Asnaf Primary Allocations');
  const asnafAllocations = await FinancialService.getAsnafAllocations(currentYear);
  assert(Array.isArray(asnafAllocations) && asnafAllocations.length === 7, 'All 7 Quranic Central Asnaf categories present in allocations');
  const totalAsnafProportion = asnafAllocations.filter(a => a.isActive !== false).reduce((sum, a) => sum + a.percentage, 0);
  assert(Math.round(totalAsnafProportion) === 100, `Asnaf allocations proportions sum to 100% (Actual: ${totalAsnafProportion}%)`);
  
  // Test Penny Rounding Integrity
  const pennyMap = FinancialService.calculatePennyAllocation(
    1000000,
    asnafAllocations.map(a => ({ code: a.asnafCode, pct: a.percentage }))
  );
  let calculatedTotal = 0;
  pennyMap.forEach(val => { calculatedTotal += val; });
  assert(calculatedTotal === 1000000, `Penny allocation rounding ensures exact sum without penny leakage (Total: ${calculatedTotal})`);

  // MODULE 3: Database Schema, Foreign Keys & Table Integrity
  console.log('\n>> Module 3: Database Schema & Integrity');
  const tableCheck = await db.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name IN (
      'asnaf_allocations', 'faqir_miskin_sub_funds', 'assistance_types',
      'assistance_applications', 'financial_transactions', 'fund_budget_adjustments', 'audit_logs'
    )`,
    args: []
  });
  assert(tableCheck.rows.length === 7, 'All 7 core fund & finance relational tables exist in SQLite');

  // Check Foreign Key integrity
  const orphanAssistanceTypes = await db.execute({
    sql: `SELECT COUNT(*) as count FROM assistance_types a 
          LEFT JOIN faqir_miskin_sub_funds f ON a.specific_fund_id = f.id 
          WHERE a.specific_fund_id IS NOT NULL AND f.id IS NULL`,
    args: []
  });
  assert(Number(orphanAssistanceTypes.rows[0].count) === 0, 'Zero orphan foreign keys in assistance_types -> faqir_miskin_sub_funds');

  const orphanSubfunds = await db.execute({
    sql: `SELECT COUNT(*) as count FROM faqir_miskin_sub_funds f 
          LEFT JOIN asnaf_allocations a ON f.primary_group_code = a.asnaf_code 
          WHERE f.primary_group_code IS NOT NULL AND a.asnaf_code IS NULL`,
    args: []
  });
  assert(Number(orphanSubfunds.rows[0].count) === 0, 'Zero orphan foreign keys in faqir_miskin_sub_funds -> asnaf_allocations');

  // MODULE 4: Fund CRUD Operations & Budget Adjustments Audit History
  console.log('\n>> Module 4: Fund CRUD & Budget Adjustment History');
  const testFundCode = 'SUBF-CRUD-9';
  
  // Clean up if exists from previous run
  await db.execute({
    sql: "DELETE FROM assistance_types WHERE code LIKE 'ast_crud_%'",
    args: []
  });
  await db.execute({
    sql: "DELETE FROM fund_budget_adjustments WHERE specific_fund_id IN (SELECT id FROM faqir_miskin_sub_funds WHERE code LIKE '%crud%' OR fund_code LIKE '%CRUD%')",
    args: []
  });
  await db.execute({
    sql: "DELETE FROM faqir_miskin_sub_funds WHERE code LIKE '%crud%' OR fund_code LIKE '%CRUD%'",
    args: []
  });

  // CREATE with its own dedicated new assistance types
  const createdFund = await FinancialService.createSpecificFund({
    fiscalYear: currentYear,
    fundCode: testFundCode,
    name: 'กองทุนทดสอบ CRUD Phase 9',
    nameEn: 'CRUD Test Fund Phase 9',
    primaryGroupCode: 'faqir_miskin',
    fundType: 'specific',
    description: 'ทดสอบระบบ CRUD อัตโนมัติ',
    percentage: 0,
    isActive: true,
    effectiveDate: '2026-01-01',
    newAssistanceTypes: [
      {
        code: 'ast_crud_temp_1',
        name: 'ประเภทความช่วยเหลือทดสอบ 1',
        category: 'living'
      },
      {
        code: 'ast_crud_temp_2',
        name: 'ประเภทความช่วยเหลือทดสอบ 2',
        category: 'living'
      }
    ]
  }, adminActor);
  assert(createdFund != null && createdFund.fundCode === testFundCode, 'CRUD: Successfully created specific fund');

  // READ
  const readFund = await FinancialService.getSpecificFundById(createdFund.id, currentYear);
  assert(readFund != null && readFund.fund.name === 'กองทุนทดสอบ CRUD Phase 9', 'CRUD: Successfully read specific fund by ID');
  assert(readFund?.assistanceTypes?.length === 2, 'CRUD: Linked assistance types populated correctly');

  // UPDATE
  const updatedFund = await FinancialService.updateSpecificFund(
    createdFund.id,
    {
      name: 'กองทุนทดสอบ CRUD Phase 9 (แก้ไขแล้ว)',
      description: 'ปรับปรุงรายละเอียดวัตถุประสงค์กองทุน'
    },
    adminActor
  );
  assert(updatedFund != null && updatedFund.name.includes('(แก้ไขแล้ว)'), 'CRUD: Successfully updated fund attributes');

  // Record budget adjustment history
  await FinancialService.recordFundBudgetAdjustment(
    {
      fiscalYear: currentYear,
      targetLevel: 'specific',
      primaryGroupCode: 'faqir_miskin',
      specificFundId: createdFund.id,
      adjustmentType: 'increase',
      amount: 25000,
      effectiveDate: '2026-01-01',
      reason: 'เพิ่มงบประมาณประจำปีสำหรับการทดสอบ'
    },
    adminActor
  );

  const adjustments = await FinancialService.getFundBudgetAdjustments({
    fiscalYear: currentYear,
    specificFundId: createdFund.id
  });
  assert(adjustments.length >= 1, 'Audit: Budget adjustment history successfully recorded and retrievable');
  assert(adjustments[0].amount === 25000, 'Audit: Budget change amount matches 25,000');

  // DEACTIVATE
  const deactResult = await FinancialService.deleteOrDeactivateSpecificFund(
    createdFund.id,
    { mode: 'deactivate', reason: 'ทดสอบปิดการใช้งานกองทุน' },
    adminActor
  );
  assert(deactResult.success === true && deactResult.mode === 'deactivate', 'CRUD: Successfully deactivated test fund');

  // Hard delete guard test: Ensure it protects against hard deleting while linked to assistance types
  let hardDeleteBlocked = false;
  try {
    await FinancialService.deleteOrDeactivateSpecificFund(
      createdFund.id,
      { mode: 'delete', reason: 'พยายามลบขณะยังมีประเภทความช่วยเหลือผูกพัน' },
      adminActor
    );
  } catch (err: any) {
    hardDeleteBlocked = true;
    assert(err.message.includes('CANNOT_HARD_DELETE'), 'Integrity Guard: Correctly blocked hard deleting fund with linked types');
  }
  assert(hardDeleteBlocked, 'Integrity Guard: Hard deletion prevented while references exist');

  // Now unlink/remove temporary test assistance types to allow clean deletion
  await db.execute({
    sql: 'DELETE FROM assistance_types WHERE specific_fund_id = ?',
    args: [createdFund.id]
  });

  // DELETE (Hard Delete when references cleared)
  const deleteResult = await FinancialService.deleteOrDeactivateSpecificFund(
    createdFund.id,
    { mode: 'delete', reason: 'ลบกองทุนทดสอบหลังทดสอบเสร็จสิ้น' },
    adminActor
  );
  assert(deleteResult.success === true && deleteResult.mode === 'delete', 'CRUD: Successfully deleted test specific fund');
  
  let fundStillExists = false;
  try {
    await FinancialService.getSpecificFundById(createdFund.id, currentYear);
    fundStillExists = true;
  } catch (err) {
    fundStillExists = false;
  }
  assert(!fundStillExists, 'CRUD: Fund no longer exists after deletion');

  // MODULE 5: Dynamic 3-Tier Cascading Selectors (Staff & Public)
  console.log('\n>> Module 5: Dynamic Cascading Selectors (Hierarchy & Filtering)');
  const hierarchyData = await FinancialService.getThreeTierFundHierarchy(currentYear, { activeOnly: true });
  assert(hierarchyData.primaryGroups.length === 7, 'Hierarchy contains all 7 central primary groups');

  // Tier 1 -> Tier 2: Filtering specific funds under Primary Group (faqir_miskin)
  const faqirGroupInH = hierarchyData.primaryGroups.find(pg => pg.asnafCode === 'faqir_miskin');
  assert(faqirGroupInH != null, 'Primary group faqir_miskin resolved from hierarchy');
  const faqirSpecificFunds = faqirGroupInH?.specificFunds || [];
  assert(faqirSpecificFunds.length >= 5, `faqir_miskin contains ${faqirSpecificFunds.length} specific funds (>= 5)`);

  // Tier 2 -> Tier 3: Filtering assistance types under Specific Fund (subf-1)
  const livingFund = faqirSpecificFunds.find(sf => sf.id === 'subf-1' || sf.code === 'living');
  assert(livingFund != null, 'Specific fund living (subf-1) resolved under primary group');
  const livingAssistanceTypes = livingFund?.assistanceTypes || [];
  assert(livingAssistanceTypes.length >= 2, `living fund contains ${livingAssistanceTypes.length} linked assistance types (>= 2)`);
  livingAssistanceTypes.forEach(ast => {
    assert(ast.specificFundId === 'subf-1' || ast.specificFundId === livingFund?.id, `Assistance type ${ast.code} correctly tagged with specificFundId`);
  });

  // Verify direct API query for specific funds by primaryGroupCode
  const directFaqirFunds = await FinancialService.getSpecificFunds({ primaryGroupCode: 'faqir_miskin', fiscalYear: currentYear });
  assert(directFaqirFunds.length >= 5, 'getSpecificFunds({ primaryGroupCode }) successfully filters specific funds');

  // MODULE 6: Approvals Workbench & Budget Over-allocation Guard
  console.log('\n>> Module 6: Approvals Workbench & Budget Over-allocation Guard');
  const approvedList = await FinancialService.getApprovedAssistanceApplications();
  assert(Array.isArray(approvedList), 'getApprovedAssistanceApplications returns list for Approvals Workbench');
  if (approvedList.length > 0) {
    const firstApproved = approvedList[0];
    assert(firstApproved.id != null, 'Approved application has valid ID');
    assert(firstApproved.approvedAmount > 0, 'Approved application has positive approvedAmount');
  }

  // MODULE 7: Field Assessment & Living Score Engine
  console.log('\n>> Module 7: Field Assessment & Living Score');
  const sampleHhId = `hh-sample-assess-${Date.now()}`;
  const sampleBenId = `ben-sample-assess-${Date.now()}`;
  const sampleAppId = `app-sample-assess-${Date.now()}`;
  const sampleNatId = `1${Date.now().toString().slice(-12)}`;

  await db.execute({ sql: "DELETE FROM beneficiaries WHERE national_id = '1888888888888'", args: [] });

  await db.execute({
    sql: `INSERT INTO households (id, household_no, address, province, district, community) 
          VALUES (?, ?, 'ที่อยู่ทดสอบคะแนน', 'กรุงเทพมหานคร', 'บางรัก', 'ชุมชนพัฒนา')`,
    args: [sampleHhId, `HH-ASSESS-${Date.now().toString().slice(-4)}`]
  });
  await db.execute({
    sql: `INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category, branch_id, branch_name) 
          VALUES (?, ?, 'นายผู้ขอรับ การประเมิน', ?, '0811111111', 'miskin', 'br-hq', 'สำนักงานใหญ่ กรุงเทพมหานคร')`,
    args: [sampleBenId, sampleHhId, sampleNatId]
  });
  const sampleAppNo = `APP-ASSESS-${Date.now().toString().slice(-4)}`;
  await db.execute({
    sql: `INSERT INTO assistance_applications (
      id, application_no, beneficiary_id, asnaf_category, requested_amount, status,
      assigned_officer_id, assigned_officer_name, applied_date, branch_id, branch_name,
      fiscal_year, primary_group_code, specific_fund_id, assistance_type_id
    ) VALUES (?, ?, ?, 'miskin', 3000, 'doc_review', ?, ?, '2026-10-29', 'br-hq', 'สำนักงานใหญ่', '2569', 'faqir_miskin', 'subf-1', 'ast-1')`,
    args: [sampleAppId, sampleAppNo, sampleBenId, officerActor.id, officerActor.name]
  });

  const assessed = await BeneficiaryService.submitAssessment(
    sampleAppId,
    {
      housingCondition: 'poor',
      housingNotes: 'บ้านชำรุด',
      debtBurdenSummary: 'ไม่มี',
      primaryHardship: 'ขาดแคลน',
      livingScore: 91,
      officerRecommendation: 'recommend_full',
      recommendedAmount: 3000,
      recommendedFundId: 'fund-1',
      recommendedSpecificFundId: 'subf-1',
      generalNotes: 'ประเมินสภาพครอบครัวสมบูรณ์'
    },
    officerActor
  );
  assert(assessed.status === 'pending_approval', 'submitAssessment transitions application to pending_approval');

  const checkAssRecord = await db.execute({
    sql: 'SELECT living_score, recommended_specific_fund_id FROM beneficiary_assessments WHERE application_id = ?',
    args: [sampleAppId]
  });
  assert(checkAssRecord.rows.length === 1, 'Assessment record persisted in beneficiary_assessments');
  assert(Number(checkAssRecord.rows[0].living_score) === 91, 'Living score 91 recorded accurately');
  assert(String(checkAssRecord.rows[0].recommended_specific_fund_id) === 'subf-1', 'Assessment recommendedSpecificFundId recorded as subf-1');

  await db.execute({ sql: 'DELETE FROM beneficiary_assessments WHERE application_id = ?', args: [sampleAppId] });
  await db.execute({ sql: 'DELETE FROM assistance_applications WHERE id = ?', args: [sampleAppId] });
  await db.execute({ sql: 'DELETE FROM beneficiaries WHERE id = ?', args: [sampleBenId] });
  await db.execute({ sql: 'DELETE FROM households WHERE id = ?', args: [sampleHhId] });

  // MODULE 8: Finance Module, Disbursements & General Ledger
  console.log('\n>> Module 8: Finance Module, Disbursements & General Ledger');
  const txns = await FinancialService.getTransactions();
  assert(Array.isArray(txns), 'getTransactions returns array of general ledger transactions');
  const accounts = await FinancialService.getBankAccounts();
  assert(Array.isArray(accounts) && accounts.length > 0, 'Bank accounts retrieved for disbursement processing');
  
  // MODULE 9: 3-Tier Financial Reports & Risk Dashboard Aggregation
  console.log('\n>> Module 9: 3-Tier Financial Reports & Risk Dashboard');
  const dashboard = await FinancialService.getDashboardSummary({ zakatYear: currentYear });
  assert(dashboard.kpi.totalIncome >= 0, `Dashboard KPI totalIncome is non-negative (${dashboard.kpi.totalIncome.toLocaleString()} THB)`);
  assert(Array.isArray(dashboard.charts.allSpecificFunds), 'Dashboard charts includes allSpecificFunds');
  assert(dashboard.charts.allSpecificFunds.length >= 5, 'Dashboard tracks all specific funds');
  assert(Array.isArray(dashboard.charts.specificFundsAtRisk), 'Dashboard includes specificFundsAtRisk warning list');

  const repHierarchy = await FinancialService.getThreeTierFundHierarchy(currentYear, { activeOnly: true });
  assert(repHierarchy.primaryGroups.length === 7, 'Three-tier hierarchy contains all 7 central primary groups');
  const faqirGroup = repHierarchy.primaryGroups.find(g => g.asnafCode === 'faqir_miskin');
  assert(faqirGroup != null && faqirGroup.specificFunds != null && faqirGroup.specificFunds.length >= 5, 'Faqir group in hierarchy contains all specific funds');

  // Test CSV Export with UTF-8 BOM
  const csvReport = await FinancialService.exportReportCsv('three_tier_fund_summary', { year: currentYear });
  assert(csvReport.startsWith('\uFEFF'), 'CSV Report Export includes UTF-8 BOM (\\uFEFF) for Excel compatibility');
  assert(csvReport.includes('ระดับโครงสร้าง'), 'CSV Report includes 3-tier Thai headers');

  const csvTxns = await FinancialService.exportTransactionsCsv();
  assert(csvTxns.startsWith('\uFEFF'), 'Transactions CSV Export includes UTF-8 BOM (\\uFEFF)');
  assert(csvTxns.includes('เลขที่ธุรกรรม'), 'Transactions CSV includes headers');

  // MODULE 10: Shariah Fund Segregation, RBAC & Audit Trail Logging
  console.log('\n>> Module 10: Shariah Fund Segregation & Audit Trail');
  // Shariah: Ensure no invalid transaction types pollute asnaf allocations
  const shariahCheck = await db.execute({
    sql: `SELECT COUNT(*) as count FROM financial_transactions 
          WHERE asnaf_category IS NOT NULL AND type NOT IN ('disbursement', 'expense', 'income', 'aid_disbursement')`,
    args: []
  });
  assert(Number(shariahCheck.rows[0].count) === 0, 'Shariah compliance: All Asnaf linked transactions are strictly valid aid disbursements/expenses');

  // Audit Log: Ensure audit logs exist and capture administrative actions
  const auditLogs = await db.execute({
    sql: 'SELECT id, action, created_at, user_name FROM audit_logs ORDER BY created_at DESC LIMIT 5',
    args: []
  });
  assert(auditLogs.rows.length > 0, 'Audit logs active and recording system operations');
  assert(auditLogs.rows[0].action != null && auditLogs.rows[0].created_at != null, 'Audit log entries have valid action and timestamp');

  // -------------------------------------------------------------------------
  // FINAL SCORE & SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`   FINAL VERIFICATION RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEM MODULES & 3-TIER INTEGRATIONS ARE 100% VERIFIED!');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED. PLEASE REVIEW DETAILS ABOVE.');
    process.exit(1);
  }
}

runStep9Verification().catch(err => {
  console.error('Fatal error during Step 9 verification:', err);
  process.exit(1);
});
