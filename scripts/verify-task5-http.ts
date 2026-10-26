async function testHttpEndpoints() {
  console.log('Testing HTTP Endpoints for Task 5: Audit & History...\n');

  // 1. Test History endpoint
  const histRes = await fetch('http://localhost:3000/api/finance/cash-flow?history=true');
  if (!histRes.ok) {
    throw new Error(`Failed to fetch history: ${histRes.status} ${histRes.statusText}`);
  }
  const histData = await histRes.json();
  const movements = histData.data || [];
  console.log('✓ Successfully called GET /api/finance/cash-flow?history=true');
  console.log(`  Received ${movements.length} movement records.`);
  if (movements.length > 0) {
    const first = movements[0];
    console.log('  First entry structure:', {
      date: first.date,
      time: first.time,
      currency: first.currency,
      amount: first.amount,
      category: first.category,
      voucherNo: first.voucherNo,
      responsiblePerson: first.responsiblePerson,
      status: first.status,
      hasEvidence: !!first.proofUrl
    });
  }

  // 2. Test Workflows list endpoint
  const wfRes = await fetch('http://localhost:3000/api/finance/cash-flow');
  if (!wfRes.ok) {
    throw new Error(`Failed to fetch workflows: ${wfRes.status} ${wfRes.statusText}`);
  }
  const wfData = await wfRes.json();
  const workflows = wfData.data || [];
  console.log(`✓ Successfully called GET /api/finance/cash-flow (Found ${workflows.length} workflows)`);

  if (workflows.length > 0) {
    const wf = workflows[0];
    console.log(`\nTesting GET /api/finance/cash-flow?audit_summary=true&workflowId=${wf.id}...`);
    const auditRes = await fetch(`http://localhost:3000/api/finance/cash-flow?audit_summary=true&workflowId=${wf.id}`);
    if (!auditRes.ok) {
      throw new Error(`Failed to fetch audit summary: ${auditRes.status}`);
    }
    const auditData = await auditRes.json();
    const auditSummary = auditData.data;
    console.log('✓ Successfully received audit summary:');
    console.log('  Workflow No:', auditSummary?.workflowNo);
    console.log('  Bank Withdraw:', auditSummary?.bankWithdrawAmount);
    console.log('  Treasurer Received:', auditSummary?.treasurerReceivedAmount);
    console.log('  Actual Withdrawn:', auditSummary?.actualWithdrawnAmount);
    console.log('  Confirmed Aid:', auditSummary?.confirmedAidAmount);
    console.log('  Confirmed Other Expense:', auditSummary?.confirmedOtherExpenseAmount);
    console.log('  Remaining Cash:', auditSummary?.remainingCashAmount);
    console.log('  Unallocated Amount:', auditSummary?.unallocatedAmount);
    console.log('  Voucher Count:', auditSummary?.voucherCount);
    console.log('  Assistance Case Count:', auditSummary?.assistanceCaseCount);
    console.log('  Pending Items Count:', auditSummary?.pendingItemCount);
    console.log('  Missing Proofs Count:', auditSummary?.missingProofCount);
    console.log('  Can Close:', auditSummary?.canClose);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL HTTP API CHECKS PASSED WITH 100% SUCCESS!');
  console.log('======================================================');
}

testHttpEndpoints().catch(err => {
  console.error('HTTP Test Failed:', err);
  process.exit(1);
});
