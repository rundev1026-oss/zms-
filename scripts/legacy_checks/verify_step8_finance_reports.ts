import { initDb, getDb } from '../src/lib/db';
import { FinancialService } from '../src/services/financialService';

async function runStep8Verification() {
  console.log('=== STARTING STEP 8 VERIFICATION: FINANCE MODULE & REPORTING ===\n');
  await initDb();
  const db = getDb();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Transaction Query & Filter by 3 Tiers (Phase 7.1)
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Transaction Query & 3-Tier Linkage Filtering ---');
  const allTxns = await FinancialService.getTransactions();
  assert(Array.isArray(allTxns), 'getTransactions returned array of transactions');
  console.log(`Total transactions in DB: ${allTxns.length}`);

  const sf1Txns = await FinancialService.getTransactions({ specificFundId: 'subf-1' });
  assert(Array.isArray(sf1Txns), 'getTransactions with specificFundId subf-1 executed');

  // Verify fields on transactions
  for (const t of allTxns.slice(0, 10)) {
    assert(typeof t.amount === 'number' && !isNaN(t.amount), `Transaction ${t.transactionNo} has valid number amount`);
    assert(typeof t.fundId === 'string' && t.fundId.length > 0, `Transaction ${t.transactionNo} has fundId`);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Approved Assistance Applications with 3-Tier Metadata (Phase 7.1 & 7.2)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Approved Applications 3-Tier Metadata Retrieval ---');
  const approvedApps = await FinancialService.getApprovedAssistanceApplications();
  assert(Array.isArray(approvedApps), 'getApprovedAssistanceApplications returned array');
  console.log(`Approved/waiting applications count: ${approvedApps.length}`);

  if (approvedApps.length > 0) {
    const firstApp = approvedApps[0];
    assert(firstApp.id !== undefined, 'Approved app has id');
    assert(firstApp.approvedAmount > 0, 'Approved app has positive approvedAmount');
    console.log(`Sample approved application: ${firstApp.applicationNo} (${firstApp.beneficiaryName})`);
    console.log(`  - 3-Tier Info: Primary=${firstApp.primaryGroupCode || firstApp.asnafCategory}, SpecificFund=${firstApp.specificFundName || firstApp.specificFundId || 'None'}`);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Dashboard Summary with 3 Tiers & Risk Alerts (Phase 8.1)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Dashboard Summary with 3 Tiers & Risk Detection ---');
  const dashData = await FinancialService.getDashboardSummary({ zakatYear: '2569' });
  assert(dashData !== null && typeof dashData === 'object', 'Dashboard summary returned valid object');
  assert(dashData.kpi !== undefined, 'Dashboard has KPI section');
  assert(typeof dashData.kpi.totalIncome === 'number', 'KPI totalIncome is a valid number');
  assert(typeof dashData.kpi.totalExpense === 'number', 'KPI totalExpense is a valid number');
  assert(typeof dashData.kpi.netBalance === 'number', 'KPI netBalance is a valid number');

  // Verify charts section has allSpecificFunds & specificFundsAtRisk
  assert(Array.isArray(dashData.charts.allSpecificFunds), 'charts.allSpecificFunds is an array');
  assert(dashData.charts.allSpecificFunds.length >= 5, `charts.allSpecificFunds contains ${dashData.charts.allSpecificFunds.length} funds (>= 5)`);
  assert(Array.isArray(dashData.charts.specificFundsAtRisk), 'charts.specificFundsAtRisk is an array');

  console.log(`All specific funds in dashboard: ${dashData.charts.allSpecificFunds.length}`);
  console.log(`Specific funds at risk (>=90% utilized or exhausted): ${dashData.charts.specificFundsAtRisk.length}`);
  for (const sf of dashData.charts.allSpecificFunds) {
    assert(typeof sf.targetAmount === 'number', `Specific fund [${sf.fundCode}] has targetAmount number`);
    assert(typeof sf.remainingAmount === 'number', `Specific fund [${sf.fundCode}] has remainingAmount number`);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Reports Generator - 3-Tier Fund Summary Report (Phase 8.2)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Comprehensive 3-Tier Fund Summary Report ---');
  const threeTierReport = await FinancialService.getFinancialReports('three_tier_fund_summary', { year: '2569' });
  assert(threeTierReport !== null && typeof threeTierReport === 'object', 'three_tier_fund_summary report returned');
  assert(Array.isArray(threeTierReport.headers), 'three_tier_fund_summary has headers array');
  assert(Array.isArray(threeTierReport.rows), 'three_tier_fund_summary has rows array');
  assert(threeTierReport.headers.length === 10, 'three_tier_fund_summary has 10 columns');
  assert(threeTierReport.rows.length > 0, `three_tier_fund_summary contains ${threeTierReport.rows.length} rows`);

  // Verify level 1, 2, and 3 rows exist
  const level1Rows = threeTierReport.rows.filter((r: string[]) => r[0].includes('ระดับ 1'));
  const level2Rows = threeTierReport.rows.filter((r: string[]) => r[0].includes('ระดับ 2'));
  const level3Rows = threeTierReport.rows.filter((r: string[]) => r[0].includes('ระดับ 3'));

  assert(level1Rows.length >= 7, `Report has ${level1Rows.length} Level 1 Primary Group rows (>= 7)`);
  assert(level2Rows.length >= 10, `Report has ${level2Rows.length} Level 2 Specific Fund rows (>= 10)`);
  assert(level3Rows.length >= 10, `Report has ${level3Rows.length} Level 3 Assistance Type rows (>= 10)`);
  console.log(`Report Hierarchy Rows: Level 1=${level1Rows.length}, Level 2=${level2Rows.length}, Level 3=${level3Rows.length}`);

  // -------------------------------------------------------------------------
  // TEST 5: Reports Generator - Specific Fund Utilization Report (Phase 8.2)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Specific Funds Utilization Report ---');
  const sfReport = await FinancialService.getFinancialReports('faqir_miskin_subfunds', { year: '2569' });
  assert(sfReport !== null && typeof sfReport === 'object', 'faqir_miskin_subfunds report returned');
  assert(Array.isArray(sfReport.headers), 'faqir_miskin_subfunds has headers array');
  assert(sfReport.headers.includes('รหัสกองทุน'), 'Headers contain รหัสกองทุน');
  assert(sfReport.headers.includes('ยอดคงเหลือจัดสรรได้ (บาท)'), 'Headers contain ยอดคงเหลือจัดสรรได้');
  assert(sfReport.headers.includes('% ใช้จ่าย'), 'Headers contain % ใช้จ่าย');
  assert(sfReport.rows.length >= 5, `Report contains ${sfReport.rows.length} specific fund rows`);

  // -------------------------------------------------------------------------
  // TEST 6: CSV Export Verification (Excel Compatibility & UTF-8 BOM) (Phase 8.2)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: CSV Export & UTF-8 BOM Encoding ---');
  const csvReport = await FinancialService.exportReportCsv('three_tier_fund_summary', { year: '2569' });
  assert(typeof csvReport === 'string', 'exportReportCsv returned string');
  assert(csvReport.startsWith('\uFEFF'), 'CSV starts with UTF-8 BOM for Microsoft Excel Thai display');
  assert(csvReport.includes('ระดับโครงสร้าง'), 'CSV contains Thai header ระดับโครงสร้าง');

  const csvTxn = await FinancialService.exportTransactionsCsv();
  assert(typeof csvTxn === 'string', 'exportTransactionsCsv returned string');
  assert(csvTxn.startsWith('\uFEFF'), 'Transaction CSV starts with UTF-8 BOM');
  assert(csvTxn.includes('เลขที่ธุรกรรม'), 'Transaction CSV contains headers');

  // -------------------------------------------------------------------------
  // TEST 7: Mathematical Reconciliation (Penny Exactness Across 3 Tiers) (Phase 7.2)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Mathematical Reconciliation Across Tiers ---');
  const hierarchyCheck = await FinancialService.getThreeTierFundHierarchy('2569', { activeOnly: true });
  assert(hierarchyCheck.isPrimaryPoolReconciled, 'Primary Asnaf target amounts exactly equal Total Zakat Pool');
  assert(hierarchyCheck.integrityCheck.isHealthy, 'Hierarchy integrity is healthy (0 orphans, balanced pool)');

  console.log('\n======================================================');
  console.log(`ALL STEP 8 VERIFICATION TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('======================================================\n');
}

runStep8Verification().catch((err) => {
  console.error('Step 8 verification encountered an error:', err);
  process.exit(1);
});

