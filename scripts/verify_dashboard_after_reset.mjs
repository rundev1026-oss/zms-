const API_BASE = 'http://localhost:3000';

async function verify() {
  console.log('========================================================================');
  console.log('  ZMS — VERIFICATION: DASHBOARDS, METRICS & WORKFLOWS POST-RESET');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Finance KPI Balances
  console.log('[TEST 1] Testing Finance KPI Balances API...');
  const kpiRes = await fetch(`${API_BASE}/api/finance/workflow-actions?view=kpi`);
  const kpi = await kpiRes.json();
  assert(kpiRes.ok && kpi.success, 'Finance KPI API returns HTTP 200');
  assert(kpi.data.treasurer.currentBalance === 0, `Treasurer cash balance is 0 THB (got: ${kpi.data.treasurer.currentBalance})`);
  assert(kpi.data.treasurer.receivedFromBank === 0, `Treasurer received from bank is 0 THB (got: ${kpi.data.treasurer.receivedFromBank})`);
  assert(kpi.data.treasurer.paidToStaff === 0, `Treasurer paid to staff is 0 THB (got: ${kpi.data.treasurer.paidToStaff})`);
  assert(kpi.data.staff.currentBalance === 0, `Staff cash balance is 0 THB (got: ${kpi.data.staff.currentBalance})`);
  assert(kpi.data.staff.reservedCash === 0, `Staff reserved amount is 0 THB (got: ${kpi.data.staff.reservedCash})`);
  assert(kpi.data.staff.actualDisbursed === 0, `Staff actual disbursed is 0 THB (got: ${kpi.data.staff.actualDisbursed})`);
  assert(kpi.data.bank.incomingAmount === 0, `Bank incoming transaction amount is 0 THB (got: ${kpi.data.bank.incomingAmount})`);
  assert(kpi.data.bank.outgoingAmount === 0, `Bank outgoing transaction amount is 0 THB (got: ${kpi.data.bank.outgoingAmount})`);
  assert(kpi.data.bank.currentBalance === 9250000, `Bank current balance equals opening balance 9,250,000 THB (got: ${kpi.data.bank.currentBalance})`);

  // 2. Finance Batch List & Pending Approvals
  console.log('\n[TEST 2] Testing Finance Batch List & Pending Batches...');
  const batchRes = await fetch(`${API_BASE}/api/finance/workflow-actions?view=batch_list&tab=all`);
  const batchData = await batchRes.json();
  assert(batchRes.ok && batchData.success, 'Finance Batch List API returns HTTP 200');
  assert(batchData.data.items.length === 0, `Total batch count is 0 (got: ${batchData.data.items.length})`);
  assert(batchData.data.counts.pending_approval === 0, `Pending treasurer approvals count is 0 (got: ${batchData.data.counts.pending_approval})`);
  assert(batchData.data.counts.approved === 0, `Approved batches count is 0 (got: ${batchData.data.counts.approved})`);

  // 3. Eligible Applications for Disbursement
  console.log('\n[TEST 3] Testing Eligible Applications for Disbursement...');
  const eligibleRes = await fetch(`${API_BASE}/api/finance/workflow-actions?view=eligible_applications`);
  const eligibleData = await eligibleRes.json();
  assert(eligibleRes.ok && eligibleData.success, 'Eligible Applications API returns HTTP 200');
  assert(eligibleData.data.length === 0, `Eligible applications count is 0 (got: ${eligibleData.data.length})`);

  // 4. Three-Way Reconciliation
  console.log('\n[TEST 4] Testing Three-Way Financial Reconciliation...');
  const recRes = await fetch(`${API_BASE}/api/finance/workflow-actions?view=reconciliation`);
  const recData = await recRes.json();
  assert(recRes.ok && recData.success, 'Three-Way Reconciliation API returns HTTP 200');
  assert(recData.data.isBalanced === true, 'Financial Reconciliation isBalanced is TRUE');
  assert(recData.data.discrepancy === 0, `Discrepancy is 0 THB (got: ${recData.data.discrepancy})`);
  assert(recData.data.checks.every((c) => c.passed === true), 'All 4 reconciliation checks PASSED');

  // 5. Public / Dashboard Stats
  console.log('\n[TEST 5] Testing Public Stats API...');
  const pubRes = await fetch(`${API_BASE}/api/public/stats`);
  const pubData = await pubRes.json();
  assert(pubRes.ok && pubData.success, 'Public Stats API returns HTTP 200');
  assert(Number(pubData.data.totalZakatDisbursed || 0) === 0, `Public disbursed amount is 0 THB (got: ${pubData.data.totalZakatDisbursed})`);
  assert(Number(pubData.data.totalCampaigns || 0) >= 0, `Public active campaigns/projects available: ${pubData.data.totalCampaigns}`);

  // 6. Follow-up plans & Badge Counts
  console.log('\n[TEST 6] Testing Follow-up Plans & Badges...');
  const fuRes = await fetch(`${API_BASE}/api/follow-ups`);
  const fuData = await fuRes.json();
  assert(fuRes.ok && fuData.success, 'Follow-up Plans API returns HTTP 200');
  assert(Array.isArray(fuData.data) && fuData.data.length === 0, `Follow-up plans list count is 0 (got: ${fuData?.data?.length})`);
  assert(fuData.stats.totalPlans === 0, `Follow-up total plans is 0 (got: ${fuData.stats.totalPlans})`);
  assert(fuData.stats.navbarBadgeCount === 0, `Follow-up navbar badge count is 0 (got: ${fuData.stats.navbarBadgeCount})`);

  console.log('\n========================================================================');
  console.log(`  VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

verify().catch(console.error);
