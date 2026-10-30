/**
 * Phase 9 Verification: Zakat Calculator Engine & Bank Reconciliations Audit
 *
 * Test Suite Coverage:
 * 1. Role Authentication & RBAC Tokens (Auditor, Finance Officer, Treasurer, Super Admin, Officer)
 * 2. Zakat Nisab Standards & Metal Prices (GET /zakat/nisab-config)
 * 3. Certified Sharia Formulas & 5 Categories (GET /zakat/formulas)
 * 4. Category 1: Financial Assets & Savings Calculation (Nisab, Hawl, Gold/Silver, Debts)
 * 5. Category 2: Income & Salary Calculation (Annual Salary, Deductions, Debts, 2.5% Rate)
 * 6. Category 3: Trade & Business Inventory Calculation (Assets, Inventory, Cash, Liabilities)
 * 7. Category 4: Agriculture & Harvest Calculation (653 kg Nisab, 10% Rain vs 5% Irrigated)
 * 8. Category 5: Livestock Brackets (Cattle 30/40 Nisab, Goat/Sheep 40/120 Nisab, In-kind Animals)
 * 9. Unified Calculation Dispatcher (POST /zakat/calculate, input validation)
 * 10. Live Gold Price Update & Nisab Propagation (PATCH /zakat/gold-price, RBAC, DB update, AuditLog)
 * 11. Bank Accounts & Balance Verification (GET /bank-accounts, GET /bank-accounts/:id)
 * 12. Bank Reconciliation Workflow (Balanced vs Discrepancy, difference calculation, GL updates, AuditLog)
 * 13. Reconciliations Listing & Pagination (GET /bank-accounts/reconciliations, filtering)
 * 14. Next.js BFF Proxy Endpoints Integration (/api/zakat/*, /api/finance/bank-accounts/reconcile)
 */

import pkg from '../apps/api/node_modules/@prisma/client/default.js';
const { PrismaClient, Prisma } = pkg;

const API_BASE = 'http://localhost:4000/api/v1';
const NEXT_BASE = 'http://localhost:3001/api';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] #${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] #${totalTests}: ${testName}`, details ?? '');
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function login(email: string, password = 'ZmsEnterprise2026!') {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.accessToken as string;
}

async function runVerification() {
  console.log('================================================================');
  console.log('   PHASE 9: ZAKAT CALCULATOR & BANK RECONCILIATIONS AUDIT       ');
  console.log('================================================================\n');

  const prisma = new PrismaClient();

  try {
    // -------------------------------------------------------------
    // SUITE 1: Role Authentication & RBAC Tokens
    // -------------------------------------------------------------
    console.log('--- SUITE 1: Role Authentication & RBAC Tokens ---');
    const auditorToken = await login('auditor@zms.local');
    assert(!!auditorToken, 'Auditor login successful & JWT token issued');

    const financeToken = await login('finance@zms.local');
    assert(!!financeToken, 'Finance Officer login successful & JWT token issued');

    const treasurerToken = await login('treasurer@zms.local');
    assert(!!treasurerToken, 'Treasurer login successful & JWT token issued');

    const adminToken = await login('admin@zms.local');
    assert(!!adminToken, 'Super Admin login successful & JWT token issued');

    const officerToken = await login('officer@zms.local');
    assert(!!officerToken, 'Officer login successful & JWT token issued');

    // -------------------------------------------------------------
    // SUITE 2: Zakat Nisab Standards & Metal Prices
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: Zakat Nisab Standards & Metal Prices ---');
    const nisabRes = await fetch(`${API_BASE}/zakat/nisab-config`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(nisabRes.ok, 'GET /zakat/nisab-config returns 200 OK');
    const nisabConfig = await nisabRes.json();
    assert(typeof nisabConfig.goldPricePerBaht === 'number' && nisabConfig.goldPricePerBaht > 0, 'Valid gold price per Baht');
    assert(typeof nisabConfig.goldPricePerGram === 'number' && nisabConfig.goldPricePerGram > 0, 'Valid gold price per Gram');
    assert(nisabConfig.goldNisabGrams === 85, 'Sharia gold Nisab standard is exactly 85 grams');
    assert(typeof nisabConfig.goldNisabValueThb === 'number', 'Gold Nisab THB value calculated');
    assert(nisabConfig.silverNisabGrams === 595, 'Sharia silver Nisab standard is exactly 595 grams');
    assert(nisabConfig.agriNisabKg === 653, 'Sharia agriculture Nisab standard is 653 kilograms (5 Wasq)');
    assert(typeof nisabConfig.certifiedBy === 'string', 'Certification body specified');

    // -------------------------------------------------------------
    // SUITE 3: Certified Sharia Formulas & 5 Categories
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Certified Sharia Formulas & 5 Categories ---');
    const formulasRes = await fetch(`${API_BASE}/zakat/formulas`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(formulasRes.ok, 'GET /zakat/formulas returns 200 OK');
    const formulas = await formulasRes.json();
    assert(Array.isArray(formulas) && formulas.length === 5, 'Exactly 5 official Sharia formula categories returned', { count: formulas.length });

    const categories = formulas.map((f: any) => f.category);
    assert(categories.includes('financial'), 'Contains "financial" category');
    assert(categories.includes('income'), 'Contains "income" category');
    assert(categories.includes('business'), 'Contains "business" category');
    assert(categories.includes('agri'), 'Contains "agri" category');
    assert(categories.includes('livestock'), 'Contains "livestock" category');

    const finFormula = formulas.find((f: any) => f.category === 'financial');
    assert(finFormula.ratePercentage === 2.5, 'Financial wealth Zakat rate is 2.5%');

    const agriFormula = formulas.find((f: any) => f.category === 'agri');
    assert(agriFormula.ratePercentage === 10, 'Agriculture baseline rate is 10%');

    // -------------------------------------------------------------
    // SUITE 4: Category 1: Financial Assets & Savings Calculation
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: Category 1: Financial Assets & Savings Calculation ---');
    // 4.1 Below Nisab
    const finBelowRes = await fetch(`${API_BASE}/zakat/calculate/financial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({ cash: 50000, bankSavings: 50000, shortTermDebts: 20000 }),
    });
    assert(finBelowRes.ok, 'Financial calc below Nisab returns 200 OK');
    const finBelow = await finBelowRes.json();
    assert(finBelow.netWealth === 80000, 'Calculates net wealth (100,000 - 20,000 = 80,000)');
    assert(finBelow.isEligible === false, 'Below Nisab is marked isEligible: false');
    assert(finBelow.zakatDue === 0, 'Below Nisab has zakatDue: 0');

    // 4.2 Above Nisab with Hawl incomplete
    const finNoHawlRes = await fetch(`${API_BASE}/zakat/calculate/financial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({ cash: 300000, bankSavings: 200000, isHawlComplete: false }),
    });
    const finNoHawl = await finNoHawlRes.json();
    assert(finNoHawl.isEligible === false, 'Above Nisab with isHawlComplete: false is marked isEligible: false');
    assert(finNoHawl.zakatDue === 0, 'Incomplete Hawl results in zakatDue: 0');

    // 4.3 Above Nisab with complete Hawl & Gold conversion
    const finEligibleRes = await fetch(`${API_BASE}/zakat/calculate/financial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({
        cash: 100000,
        bankSavings: 150000,
        goldBahtWeight: 2, // 2 baht of gold
        sharesInvestments: 50000,
        shortTermDebts: 30000,
        isHawlComplete: true,
      }),
    });
    const finEligible = await finEligibleRes.json();
    assert(finEligible.isEligible === true, 'Eligible financial wealth is marked isEligible: true');
    assert(finEligible.ratePercentage === 2.5, 'Rate percentage is 2.5%');
    assert(finEligible.zakatDue > 0, 'Calculates non-zero zakatDue', { zakatDue: finEligible.zakatDue });
    const expectedDue = Math.round(finEligible.netWealth * 0.025);
    assert(finEligible.zakatDue === expectedDue, 'Zakat due matches exact 2.5% formula', { expectedDue, actual: finEligible.zakatDue });

    // -------------------------------------------------------------
    // SUITE 5: Category 2: Income & Salary Calculation
    // -------------------------------------------------------------
    console.log('\n--- SUITE 5: Category 2: Income & Salary Calculation ---');
    // 5.1 High annual income above Nisab
    const incRes = await fetch(`${API_BASE}/zakat/calculate/income`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({
        annualSalary: 720000,
        bonusOtherIncome: 100000,
        personalDeductions: 240000,
        annualDebtPayments: 80000,
      }),
    });
    assert(incRes.ok, 'Income calc returns 200 OK');
    const incData = await incRes.json();
    const expectedNetIncome = (720000 + 100000) - (240000 + 80000); // 500,000
    assert(incData.netWealth === expectedNetIncome, 'Net income accurately deducted (500,000 THB)');
    assert(incData.isEligible === true, '500,000 THB net income is eligible');
    assert(incData.zakatDue === Math.round(500000 * 0.025), 'Income Zakat due is ฿12,500 (2.5% of 500,000)');

    // 5.2 Low income below Nisab
    const lowIncRes = await fetch(`${API_BASE}/zakat/calculate/income`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({
        annualSalary: 240000,
        bonusOtherIncome: 0,
        personalDeductions: 180000,
        annualDebtPayments: 0,
      }),
    });
    const lowIncData = await lowIncRes.json();
    assert(lowIncData.isEligible === false, 'Low net income (60,000 THB) is ineligible');
    assert(lowIncData.zakatDue === 0, 'Ineligible income has zakatDue: 0');

    // -------------------------------------------------------------
    // SUITE 6: Category 3: Trade & Business Inventory Calculation
    // -------------------------------------------------------------
    console.log('\n--- SUITE 6: Category 3: Trade & Business Inventory Calculation ---');
    const bizRes = await fetch(`${API_BASE}/zakat/calculate/business`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({
        currentAssets: 500000,
        inventoryValue: 350000,
        businessCash: 150000,
        businessDebts: 200000,
      }),
    });
    assert(bizRes.ok, 'Business calc returns 200 OK');
    const bizData = await bizRes.json();
    const expectedBizNet = (500000 + 350000 + 150000) - 200000; // 800,000
    assert(bizData.netWealth === expectedBizNet, 'Net business wealth accurately calculated (800,000 THB)');
    assert(bizData.isEligible === true, '800,000 THB business wealth exceeds Nisab');
    assert(bizData.zakatDue === Math.round(800000 * 0.025), 'Business Zakat due is ฿20,000 (2.5% of 800,000)');

    // -------------------------------------------------------------
    // SUITE 7: Category 4: Agriculture & Harvest Calculation
    // -------------------------------------------------------------
    console.log('\n--- SUITE 7: Category 4: Agriculture & Harvest Calculation ---');
    // 7.1 Below 653 kg Nisab
    const agriLowRes = await fetch(`${API_BASE}/zakat/calculate/agri`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({ cropKilos: 500, cropPricePerKg: 15, irrigationType: 'rain' }),
    });
    const agriLow = await agriLowRes.json();
    assert(agriLow.isEligible === false, 'Harvest of 500 kg is below 653 kg Nisab (ineligible)');
    assert(agriLow.zakatDue === 0, 'Ineligible harvest zakatDue: 0');

    // 7.2 Rain-fed irrigation (10%)
    const agriRainRes = await fetch(`${API_BASE}/zakat/calculate/agri`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({ cropKilos: 2000, cropPricePerKg: 15, irrigationType: 'rain' }),
    });
    const agriRain = await agriRainRes.json();
    assert(agriRain.isEligible === true, 'Harvest of 2,000 kg exceeds Nisab');
    assert(agriRain.ratePercentage === 10, 'Rain-fed irrigation rate is exactly 10%');
    assert(agriRain.zakatInKilos === 200, 'Zakat in kind is 200 kg (10% of 2,000 kg)');
    assert(agriRain.zakatDue === 3000, 'Zakat monetary value is ฿3,000 (200 kg * 15 THB/kg)');

    // 7.3 Artificially irrigated (5%)
    const agriIrrigRes = await fetch(`${API_BASE}/zakat/calculate/agri`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({ cropKilos: 2000, cropPricePerKg: 15, irrigationType: 'irrigated' }),
    });
    const agriIrrig = await agriIrrigRes.json();
    assert(agriIrrig.ratePercentage === 5, 'Irrigated crop rate is exactly 5%');
    assert(agriIrrig.zakatInKilos === 100, 'Zakat in kind is 100 kg (5% of 2,000 kg)');
    assert(agriIrrig.zakatDue === 1500, 'Zakat monetary value is ฿1,500 (100 kg * 15 THB/kg)');

    // -------------------------------------------------------------
    // SUITE 8: Category 5: Livestock Brackets (Cattle & Goats)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 8: Category 5: Livestock Brackets ---');
    // 8.1 Ineligible counts
    const liveLowRes = await fetch(`${API_BASE}/zakat/calculate/livestock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({ cattleCount: 25, goatCount: 30 }),
    });
    const liveLow = await liveLowRes.json();
    assert(liveLow.isEligible === false, '25 cattle & 30 goats below Nisabs is ineligible');
    assert(liveLow.zakatDue === 0, 'Ineligible livestock has zakatDue: 0');

    // 8.2 Cattle 35 (Bracket 30-39: 1 yearling calf "tabi'")
    const liveCattle35Res = await fetch(`${API_BASE}/zakat/calculate/livestock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({ cattleCount: 35, goatCount: 0 }),
    });
    const liveCattle35 = await liveCattle35Res.json();
    assert(liveCattle35.isEligible === true, '35 cattle is eligible');
    assert(liveCattle35.breakdown.cattleTabiCount === 1, 'Requires 1 yearling calf (tabi)');
    assert(liveCattle35.breakdown.cattleMusinnahCount === 0, 'Requires 0 musinnah');

    // 8.3 Cattle 45 (Bracket 40-59: 1 two-year-old heifer "musinnah")
    const liveCattle45Res = await fetch(`${API_BASE}/zakat/calculate/livestock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({ cattleCount: 45, goatCount: 0 }),
    });
    const liveCattle45 = await liveCattle45Res.json();
    assert(liveCattle45.breakdown.cattleMusinnahCount === 1, 'Requires 1 two-year-old heifer (musinnah)');

    // 8.4 Goats 80 (Bracket 40-120: 1 goat/sheep)
    const liveGoats80Res = await fetch(`${API_BASE}/zakat/calculate/livestock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({ cattleCount: 0, goatCount: 80 }),
    });
    const liveGoats80 = await liveGoats80Res.json();
    assert(liveGoats80.breakdown.goatDueCount === 1, '80 goats requires 1 goat/sheep');

    // 8.5 Goats 150 (Bracket 121-200: 2 goats/sheep)
    const liveGoats150Res = await fetch(`${API_BASE}/zakat/calculate/livestock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({ cattleCount: 0, goatCount: 150 }),
    });
    const liveGoats150 = await liveGoats150Res.json();
    assert(liveGoats150.breakdown.goatDueCount === 2, '150 goats requires 2 goats/sheep');

    // -------------------------------------------------------------
    // SUITE 9: Unified Calculation Dispatcher
    // -------------------------------------------------------------
    console.log('\n--- SUITE 9: Unified Calculation Dispatcher ---');
    const unifiedRes = await fetch(`${API_BASE}/zakat/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({
        category: 'financial',
        payload: { cash: 400000, bankSavings: 100000 },
      }),
    });
    assert(unifiedRes.ok, 'POST /zakat/calculate unified endpoint returns 200 OK');
    const unifiedData = await unifiedRes.json();
    assert(unifiedData.category === 'financial', 'Returns category "financial"');
    assert(unifiedData.isEligible === true, 'Calculates eligibility through unified endpoint');

    // -------------------------------------------------------------
    // SUITE 10: Live Gold Price Update & Nisab Propagation
    // -------------------------------------------------------------
    console.log('\n--- SUITE 10: Live Gold Price Update & Nisab Propagation ---');
    // 10.1 Officer cannot update gold price
    const officerPriceRes = await fetch(`${API_BASE}/zakat/gold-price`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${officerToken}` },
      body: JSON.stringify({ goldPricePerBaht: 43000 }),
    });
    assert(officerPriceRes.status === 403, 'Officer forbidden (403) from updating gold prices');

    // 10.2 Finance Officer updates gold price
    const updatedGoldPrice = 43500;
    const updateRes = await fetch(`${API_BASE}/zakat/gold-price`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${financeToken}` },
      body: JSON.stringify({
        goldPricePerBaht: updatedGoldPrice,
        sourceNotes: 'ราคาทองคำแท่ง 96.5% สมาคมค้าทองคำ',
      }),
    });
    assert(updateRes.ok, 'Finance Officer updates gold price successfully (HTTP 200)');
    const updateData = await updateRes.json();
    assert(updateData.success === true, 'Response contains success: true');
    assert(updateData.updatedConfig.goldPricePerBaht === updatedGoldPrice, 'Updated config reflects new gold price');

    // Verify DB update in ZakatFormulaVersion
    const updatedFinFormula = await prisma.zakatFormulaVersion.findFirst({
      where: { category: 'financial', isActive: true },
    });
    assert(
      Number(updatedFinFormula?.nisabValueThb) === updateData.updatedConfig.goldNisabValueThb,
      'PostgreSQL zakat_formula_versions nisab_value_thb updated with satang precision'
    );

    // Verify Audit Log
    const goldAudit = await prisma.auditLog.findFirst({
      where: { action: 'UPDATE_ZAKAT_NISAB_GOLD_PRICE' },
      orderBy: { createdAt: 'desc' },
    });
    assert(!!goldAudit, 'AuditLog recorded UPDATE_ZAKAT_NISAB_GOLD_PRICE action');

    // -------------------------------------------------------------
    // SUITE 11: Bank Accounts & Balance Verification
    // -------------------------------------------------------------
    console.log('\n--- SUITE 11: Bank Accounts & Balance Verification ---');
    const banksRes = await fetch(`${API_BASE}/bank-accounts`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(banksRes.ok, 'GET /bank-accounts returns 200 OK');
    const banks = await banksRes.json();
    assert(Array.isArray(banks) && banks.length > 0, 'Returns list of foundation bank accounts');

    const primaryBank = banks[0];
    assert(typeof primaryBank.currentBalance === 'number', 'Bank account currentBalance is parsed as number');
    assert(typeof primaryBank.reconciledBalance === 'number', 'Bank account reconciledBalance is parsed as number');

    // Single account detail
    const singleBankRes = await fetch(`${API_BASE}/bank-accounts/${primaryBank.id}`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(singleBankRes.ok, 'GET /bank-accounts/:id returns 200 OK');
    const singleBank = await singleBankRes.json();
    assert(singleBank.id === primaryBank.id, 'Single bank account details match requested ID');
    assert(Array.isArray(singleBank.reconciliations), 'Includes reconciliations history relation');

    // -------------------------------------------------------------
    // SUITE 12: Bank Reconciliation Workflow (Balanced vs Discrepancy)
    // -------------------------------------------------------------
    console.log('\n--- SUITE 12: Bank Reconciliation Workflow ---');
    // 12.1 Balanced Reconciliation: Statement balance exactly equals current GL balance
    const currentGlBalance = Number(primaryBank.currentBalance);
    const balancedPayload = {
      statementBalance: currentGlBalance,
      notes: 'กระทบยอดประจำงวดสิ้นเดือนตรงตาม Statement ทุกประการ',
      proofUrl: '/statements/ktb-oct-2026.pdf',
    };

    const balancedRes = await fetch(`${API_BASE}/bank-accounts/${primaryBank.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify(balancedPayload),
    });
    assert(balancedRes.ok, 'Balanced bank reconciliation executed successfully (HTTP 201/200)');
    const balancedData = await balancedRes.json();
    assert(balancedData.status === 'balanced', 'Reconciliation status is "balanced"');
    assert(balancedData.difference === 0, 'Calculated difference is exactly 0.00 THB');
    assert(balancedData.statementBalance === currentGlBalance, 'Statement balance recorded accurately');

    // 12.2 Discrepancy Reconciliation: Statement balance differs by ฿1,500.50
    const testDiscrepancyAmount = 1500.50;
    const statementWithDiff = currentGlBalance - testDiscrepancyAmount;
    const discrepancyPayload = {
      statementBalance: statementWithDiff,
      notes: 'พบเช็คจ่ายระหว่างเคลียริ่งยังไม่ขึ้นเงิน ฿1,500.50',
      proofUrl: '/statements/ktb-discrepancy-proof.pdf',
    };

    const discrepancyRes = await fetch(`${API_BASE}/bank-accounts/${primaryBank.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify(discrepancyPayload),
    });
    assert(discrepancyRes.ok, 'Discrepancy bank reconciliation executed successfully (HTTP 201/200)');
    const discrepancyData = await discrepancyRes.json();
    assert(discrepancyData.status === 'discrepancy', 'Reconciliation status is "discrepancy"');
    assert(
      Math.abs(discrepancyData.difference - testDiscrepancyAmount) < 0.01,
      'Exact difference recorded to the satang (1,500.50 THB)',
      { expected: testDiscrepancyAmount, actual: discrepancyData.difference }
    );

    // Verify DB update on BankAccount
    const updatedBank = await prisma.bankAccount.findUnique({ where: { id: primaryBank.id } });
    assert(
      Number(updatedBank?.reconciledBalance) === statementWithDiff,
      'BankAccount reconciledBalance updated to latest statement balance in Decimal(18,2)'
    );
    assert(!!updatedBank?.lastReconciledAt, 'BankAccount lastReconciledAt recorded');

    // Verify Audit Log
    const reconAudit = await prisma.auditLog.findFirst({
      where: {
        resourceType: 'bank_reconciliation',
        resourceId: discrepancyData.id,
        action: 'BANK_RECONCILIATION',
      },
    });
    assert(!!reconAudit, 'AuditLog recorded BANK_RECONCILIATION action');

    // -------------------------------------------------------------
    // SUITE 13: Reconciliations Listing & Pagination
    // -------------------------------------------------------------
    console.log('\n--- SUITE 13: Reconciliations Listing & Pagination ---');
    const reconListRes = await fetch(`${API_BASE}/bank-accounts/reconciliations?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(reconListRes.ok, 'GET /bank-accounts/reconciliations returns 200 OK');
    const reconListData = await reconListRes.json();
    assert(Array.isArray(reconListData.items) && reconListData.items.length > 0, 'Returns paginated items array');
    assert(typeof reconListData.total === 'number', 'Returns total count');
    assert(reconListData.page === 1, 'Pagination page is 1');
    assert(reconListData.limit === 5, 'Pagination limit is 5');

    // Filter by status=discrepancy
    const discFilterRes = await fetch(`${API_BASE}/bank-accounts/reconciliations?status=discrepancy`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    const discFilterData = await discFilterRes.json();
    assert(
      discFilterData.items.every((r: any) => r.status === 'discrepancy'),
      'Filtered results strictly contain only status "discrepancy"'
    );

    // -------------------------------------------------------------
    // SUITE 14: Next.js BFF Proxy Endpoints Integration
    // -------------------------------------------------------------
    console.log('\n--- SUITE 14: Next.js BFF Proxy Endpoints Integration ---');
    // 14.1 Next.js BFF Nisab config
    const nextNisabRes = await fetch(`${NEXT_BASE}/zakat/nisab`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(nextNisabRes.ok, 'Next.js BFF GET /api/zakat/nisab returns 200 OK');
    const nextNisabData = await nextNisabRes.json();
    assert(nextNisabData.success === true && nextNisabData.data.goldPricePerBaht !== undefined, 'Next.js BFF Nisab returns valid payload');

    // 14.2 Next.js BFF Formulas
    const nextFormulasRes = await fetch(`${NEXT_BASE}/zakat/formulas`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(nextFormulasRes.ok, 'Next.js BFF GET /api/zakat/formulas returns 200 OK');
    const nextFormulasData = await nextFormulasRes.json();
    assert(nextFormulasData.success === true && Array.isArray(nextFormulasData.data), 'Next.js BFF formulas returns list');

    // 14.3 Next.js BFF Calculate
    const nextCalcRes = await fetch(`${NEXT_BASE}/zakat/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({
        category: 'financial',
        payload: { cash: 500000, isHawlComplete: true },
      }),
    });
    assert(nextCalcRes.ok, 'Next.js BFF POST /api/zakat/calculate returns 200 OK');
    const nextCalcData = await nextCalcRes.json();
    assert(nextCalcData.success === true && nextCalcData.data.zakatDue > 0, 'Next.js BFF calculate returns calculated zakat');

    // 14.4 Next.js BFF Reconciliations GET
    const nextReconGetRes = await fetch(`${NEXT_BASE}/finance/bank-accounts/reconcile`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(nextReconGetRes.ok, 'Next.js BFF GET /api/finance/bank-accounts/reconcile returns 200 OK');
    const nextReconGetData = await nextReconGetRes.json();
    assert(nextReconGetData.success === true && Array.isArray(nextReconGetData.data), 'Next.js BFF reconciliations returns list');

    // 14.5 Next.js BFF Reconcile POST
    const nextReconPostRes = await fetch(`${NEXT_BASE}/finance/bank-accounts/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auditorToken}` },
      body: JSON.stringify({
        input: {
          bankAccountId: primaryBank.id,
          statementBalance: currentGlBalance,
          notes: 'กระทบยอดผ่าน Next.js BFF Proxy',
        },
      }),
    });
    assert(nextReconPostRes.ok, 'Next.js BFF POST /api/finance/bank-accounts/reconcile returns 200 OK');
    const nextReconPostData = await nextReconPostRes.json();
    assert(nextReconPostData.success === true && nextReconPostData.data.status !== undefined, 'Next.js BFF reconcile returns result');

    // Summary of Results
    console.log('\n================================================================');
    console.log(`   PHASE 9 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
    console.log('================================================================\n');

  } finally {
    await prisma.$disconnect();
  }
}

runVerification().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});

