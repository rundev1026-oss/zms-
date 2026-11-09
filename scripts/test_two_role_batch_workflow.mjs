import { createClient } from '@libsql/client';
import path from 'path';

const API_BASE = 'http://localhost:3000';
const dbPath = path.join(process.cwd(), 'data', 'zms.db');
const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
const client = createClient({ url: dbUrl });

// Two distinct roles:
// Staff (Officer): อุสมาน เจริญสุข
const staffActor = {
  id: 'u-3',
  name: 'อุสมาน เจริญสุข',
  role: 'officer',
};

// Treasurer (Finance): ฟาติมะฮ์ หวังดี
const treasurerActor = {
  id: 'u-5',
  name: 'ฟาติมะฮ์ หวังดี',
  role: 'finance',
};

async function postAction(action, input, actor) {
  const res = await fetch(`${API_BASE}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, input, actor }),
  });
  const json = await res.json();
  return { status: res.status, ok: res.ok, json };
}

async function getAction(view, params = '') {
  const res = await fetch(`${API_BASE}/api/finance/workflow-actions?view=${view}&${params}`);
  const json = await res.json();
  return { status: res.status, ok: res.ok, json };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function runTwoRoleWorkflowTest() {
  console.log('====================================================');
  console.log('STARTING TWO-ROLE BATCH DISBURSEMENT TEST (13 STEPS)');
  console.log('====================================================\n');

  // STEP 0: Fetch Master Data (Eligible Applications & Admin Categories)
  const appRes = await getAction('eligible_applications');
  assert(appRes.ok && Array.isArray(appRes.json.data), 'Step 0: Fetch eligible applications for staff selection');
  const eligibleApps = appRes.json.data;
  console.log(`Found ${eligibleApps.length} eligible applications`);

  const catRes = await getAction('admin_categories');
  assert(catRes.ok && Array.isArray(catRes.json.data), 'Step 0: Fetch admin expense categories');
  const adminCategories = catRes.json.data;
  console.log(`Found ${adminCategories.length} admin categories`);

  const sampleApp1 = eligibleApps[0] || {
    id: 'app-demo-1',
    applicationNo: 'APP-2569-DEMO1',
    beneficiaryId: 'ben-demo-1',
    beneficiaryName: 'นางคอดีเยาะห์ ดาโอ๊ะ',
    nationalId: '1940100888991',
    asnafCategory: 'faqir_miskin',
    approvedAmount: 20000,
  };
  const sampleApp2 = eligibleApps[1] || {
    id: 'app-demo-2',
    applicationNo: 'APP-2569-DEMO2',
    beneficiaryId: 'ben-demo-2',
    beneficiaryName: 'นายมะหะมะ สะมะแอ',
    nationalId: '1940100888992',
    asnafCategory: 'faqir_miskin',
    approvedAmount: 15000,
  };
  const sampleCat = adminCategories[0] || {
    id: 'OFFICE_SUPPLIES',
    name: 'เครื่องเขียนและอุปกรณ์สำนักงาน',
  };

  // STEP 1: Staff creates new Batch with 3 items (2 Aid, 1 Admin) as Draft
  console.log('\n--- Step 1: Staff creates multi-item batch disbursement ---');
  const createRes = await postAction(
    'create_batch',
    {
      title: 'โครงการจ่ายเงินสงเคราะห์ผู้ประสบภัยและค่าบริหารลงพื้นที่ งวด 1/2569',
      fundType: 'zakat',
      bankAccountId: 'bank-1',
      submitImmediately: false, // Save as draft first
      items: [
        {
          type: 'aid',
          applicationId: sampleApp1.id,
          beneficiaryId: sampleApp1.beneficiaryId,
          beneficiaryName: sampleApp1.beneficiaryName,
          nationalId: sampleApp1.nationalId,
          asnafCategory: sampleApp1.asnafCategory,
          assistanceType: 'เงินสงเคราะห์เพื่อการยังชีพ',
          approvedAmount: 10000,
          thisDisbursementAmount: 10000,
          notes: 'จ่ายสงเคราะห์ครอบครัวที่ 1',
        },
        {
          type: 'aid',
          applicationId: sampleApp2.id,
          beneficiaryId: sampleApp2.beneficiaryId,
          beneficiaryName: sampleApp2.beneficiaryName,
          nationalId: sampleApp2.nationalId,
          asnafCategory: sampleApp2.asnafCategory,
          assistanceType: 'เงินสงเคราะห์เพื่อการยังชีพ',
          approvedAmount: 8000,
          thisDisbursementAmount: 8000,
          notes: 'จ่ายสงเคราะห์ครอบครัวที่ 2',
        },
        {
          type: 'admin',
          categoryId: sampleCat.id,
          categoryName: sampleCat.name,
          description: 'ค่าพาหนะและค่าน้ำมันเชื้อเพลิงลงพื้นที่สำรวจ',
          amount: 2500,
          payeeName: 'สถานีบริการน้ำมัน ปตท.',
          notes: 'ค่าน้ำมันรถยนต์ส่วนกลาง',
        },
      ],
    },
    staffActor
  );

  assert(createRes.ok, `Step 1: Batch created successfully (${createRes.json?.data?.batchNo})`);
  const workflowId = createRes.json.data.workflowId;
  const batchNo = createRes.json.data.batchNo;
  const totalAmount = createRes.json.data.totalAmount;
  assert(totalAmount === 20500, `Step 1: Total amount calculated automatically: ฿${totalAmount} (expected 20500)`);
  assert(createRes.json.data.status === 'draft', 'Step 1: Status is draft');

  // STEP 2: Staff Submits Batch for Approval
  console.log('\n--- Step 2: Staff submits batch for approval ---');
  const submitRes = await postAction('submit_batch', { workflowId }, staffActor);
  assert(submitRes.ok && submitRes.json.data.status === 'pending_approval', 'Step 2: Batch status changed to pending_approval');

  // STEP 3: Treasurer Inbox receives batch in 'pending_approval' tab
  console.log('\n--- Step 3: Check Treasurer Inbox ---');
  const inboxRes = await getAction('batch_list', 'tab=pending_approval');
  assert(inboxRes.ok, 'Step 3: Treasurer inbox fetched');
  const foundInInbox = inboxRes.json.data.items.find((it) => it.id === workflowId);
  assert(Boolean(foundInInbox), 'Step 3: Newly submitted batch appears in Treasurer pending_approval tab');
  assert(inboxRes.json.data.badgeCounts.pending_approval >= 1, 'Step 3: Badge count for pending_approval is updated');

  // STEP 4: Staff cannot approve own batch (Segregation of Duties)
  console.log('\n--- Step 4: Security Check: Staff cannot approve own batch ---');
  const selfApproveRes = await postAction('treasurer_review', { workflowId, decision: 'approve' }, staffActor);
  assert(!selfApproveRes.ok, 'Step 4: Self-approval correctly blocked with 400 error');

  // STEP 5: Treasurer returns batch for revision with note
  console.log('\n--- Step 5: Treasurer returns for revision ---');
  const revisionRes = await postAction(
    'treasurer_review',
    {
      workflowId,
      decision: 'return_for_revision',
      reason: 'กรุณาแนบรายละเอียดเส้นทางลงพื้นที่และตรวจสอบวงเงินค่าน้ำมัน',
    },
    treasurerActor
  );
  assert(revisionRes.ok && revisionRes.json.data.status === 'rejected_for_revision', 'Step 5: Treasurer returns batch for revision');

  // STEP 6: Check batch in 'revision' tab
  const revTabRes = await getAction('batch_list', 'tab=revision');
  assert(revTabRes.ok && revTabRes.json.data.items.some((it) => it.id === workflowId), 'Step 6: Batch is in revision tab');

  // STEP 7: Staff re-submits batch for approval
  console.log('\n--- Step 7: Staff re-submits batch ---');
  const resubmitRes = await postAction('submit_batch', { workflowId }, staffActor);
  assert(resubmitRes.ok && resubmitRes.json.data.status === 'pending_approval', 'Step 7: Batch re-submitted to pending_approval');

  // STEP 8: Treasurer Approves Batch
  console.log('\n--- Step 8: Treasurer Approves Batch ---');
  const approveRes = await postAction(
    'treasurer_review',
    {
      workflowId,
      decision: 'approve',
      reason: 'ตรวจสอบข้อมูลและเอกสารครบถ้วน อนุมัติเบิกจ่ายได้',
    },
    treasurerActor
  );
  assert(approveRes.ok && approveRes.json.data.status === 'approved', 'Step 8: Treasurer approves batch');

  // STEP 9: Treasurer Records Cash Handover to Staff
  console.log('\n--- Step 9: Treasurer records cash handover ---');
  const handoverRes = await postAction(
    'handover_cash',
    {
      workflowId,
      actualAmount: 20500,
      handoverDate: new Date().toISOString().slice(0, 10),
      proofUrl: 'https://storage.zms.org/proofs/handover-20500.pdf',
      notes: 'ส่งมอบเงินสดธนบัตร 1,000 บาท จำนวน 20 ฉบับ และ 500 บาท 1 ฉบับ',
    },
    treasurerActor
  );
  assert(handoverRes.ok, `Step 9: Handover recorded (${handoverRes.json?.data?.handoverNo})`);
  const handoverId = handoverRes.json.data.handoverId;

  // STEP 10: Staff Confirms Cash Receipt -> Double-Entry GL Posted
  console.log('\n--- Step 10: Staff confirms cash receipt & GL posting ---');
  const confirmReceiptRes = await postAction('confirm_receipt', { workflowId, handoverId }, staffActor);
  assert(confirmReceiptRes.ok && confirmReceiptRes.json.data.status === 'disbursed', 'Step 10: Staff confirmed cash receipt');

  // Verify GL Posting for Handover (Debit Staff 1030-01, Credit Treasurer 1020-01)
  const glHandoverRes = await client.execute(`
    SELECT account_code, entry_type, amount 
    FROM general_ledger_entries 
    WHERE journal_no = '${confirmReceiptRes.json.data.journalNo}'
  `);
  assert(glHandoverRes.rows.length === 2, 'Step 10: GL Double-entry recorded for handover');
  const debitHandover = glHandoverRes.rows.find((r) => r.entry_type === 'debit');
  const creditHandover = glHandoverRes.rows.find((r) => r.entry_type === 'credit');
  assert(debitHandover.account_code === '1030-01' && Number(debitHandover.amount) === 20500, 'Step 10: GL Debit 1030-01 Staff Cash Float correct');
  assert(creditHandover.account_code === '1020-01' && Number(creditHandover.amount) === 20500, 'Step 10: GL Credit 1020-01 Treasurer Cash Float correct');

  // STEP 11: Staff Settles Aid Item & Admin Item
  console.log('\n--- Step 11: Staff settles line items with actual spending ---');
  const detailRes = await getAction('batch_detail', `workflowId=${workflowId}`);
  assert(detailRes.ok, 'Step 11: Fetch batch details');
  const batchDetail = detailRes.json.data;
  assert(batchDetail.aidItems.length === 2, 'Step 11: Has 2 aid items');
  assert(batchDetail.adminItems.length === 1, 'Step 11: Has 1 admin item');

  // Settle Aid Item 1 (Full 10,000)
  const aidItem1 = batchDetail.aidItems[0];
  const settleAidRes = await postAction(
    'settle_item',
    {
      workflowId,
      itemId: aidItem1.id,
      itemType: 'aid',
      actualPaidAmount: 10000,
      paidDate: new Date().toISOString().slice(0, 10),
      proofUrl: 'https://storage.zms.org/proofs/aid-sign-1.pdf',
      notes: 'ส่งมอบเงินสดแก่ผู้รับความช่วยเหลือถึงบ้านเรียบร้อย',
    },
    staffActor
  );
  assert(settleAidRes.ok, 'Step 11: Aid item 1 settled');

  // Settle Aid Item 2 (Full 8,000)
  const aidItem2 = batchDetail.aidItems[1];
  const settleAid2Res = await postAction(
    'settle_item',
    {
      workflowId,
      itemId: aidItem2.id,
      itemType: 'aid',
      actualPaidAmount: 8000,
      paidDate: new Date().toISOString().slice(0, 10),
      proofUrl: 'https://storage.zms.org/proofs/aid-sign-2.pdf',
      notes: 'ส่งมอบเงินสดแก่ผู้รับความช่วยเหลือเรียบร้อย',
    },
    staffActor
  );
  assert(settleAid2Res.ok, 'Step 11: Aid item 2 settled');

  // Settle Admin Item (Spent 2,000 out of 2,500 advance!)
  const adminItem1 = batchDetail.adminItems[0];
  const settleAdminRes = await postAction(
    'settle_item',
    {
      workflowId,
      itemId: adminItem1.id,
      itemType: 'admin',
      actualPaidAmount: 2000,
      paidDate: new Date().toISOString().slice(0, 10),
      proofUrl: 'https://storage.zms.org/receipts/fuel-receipt-2000.pdf',
      notes: 'เติมน้ำมันจริง 2,000 บาท มีเงินสดคงเหลือ 500 บาท',
    },
    staffActor
  );
  assert(settleAdminRes.ok, 'Step 11: Admin item settled (2,000 THB spent)');

  // Verify GL Posting for Aid (Debit 5010-01, Credit 1030-01)
  const glAidRes = await client.execute(`
    SELECT account_code, entry_type, amount 
    FROM general_ledger_entries 
    WHERE journal_no = '${settleAidRes.json.data.journalNo}'
  `);
  assert(glAidRes.rows.find((r) => r.entry_type === 'debit').account_code === '5010-01', 'Step 11: GL Debit 5010-01 Aid Expense correct');
  assert(glAidRes.rows.find((r) => r.entry_type === 'credit').account_code === '1030-01', 'Step 11: GL Credit 1030-01 Staff Cash Float correct');

  // STEP 12: Staff Refunds Unused Cash (500 THB) back to Treasurer
  console.log('\n--- Step 12: Staff refunds unused cash (500 THB) ---');
  const refundRes = await postAction(
    'record_refund',
    {
      workflowId,
      refundAmount: 500,
      refundDate: new Date().toISOString().slice(0, 10),
      reason: 'ส่งคืนเงินสดคงเหลือจากค่าน้ำมันเชื้อเพลิง 500 บาท',
      proofUrl: 'https://storage.zms.org/receipts/refund-slip-500.pdf',
    },
    staffActor
  );
  assert(refundRes.ok, `Step 12: Cash refund recorded (${refundRes.json?.data?.refundNo})`);

  // Verify GL Posting for Refund (Debit 1020-01, Credit 1030-01)
  const glRefundRes = await client.execute(`
    SELECT account_code, entry_type, amount 
    FROM general_ledger_entries 
    WHERE journal_no = '${refundRes.json.data.journalNo}'
  `);
  assert(glRefundRes.rows.find((r) => r.entry_type === 'debit').account_code === '1020-01', 'Step 12: GL Debit 1020-01 Treasurer Cash Float correct');
  assert(glRefundRes.rows.find((r) => r.entry_type === 'credit').account_code === '1030-01', 'Step 12: GL Credit 1030-01 Staff Cash Float correct');

  // STEP 13: Treasurer inspects equation & Closes Round
  console.log('\n--- Step 13: Treasurer closes round ---');
  // Equation check: Handed Over (20,500) == Paid (10000+8000+2000=20000) + Refund (500) + Remaining (0)
  const closeRes = await postAction(
    'close_round',
    {
      workflowId,
      notes: 'ตรวจสอบยอดส่งมอบ ฿20,500 = จ่ายจริง ฿20,000 + คืนเงิน ฿500 สมบูรณ์ 100% ปิดรอบเรียบร้อย',
    },
    treasurerActor
  );
  assert(closeRes.ok && closeRes.json.data.status === 'completed', 'Step 13: Round closed successfully');
  assert(closeRes.json.data.isBalanced === true, 'Step 13: Round closing equation is perfectly balanced (discrepancy = 0)');
  assert(closeRes.json.data.remainingFloat === 0, 'Step 13: Remaining staff float is exactly 0.00 THB');

  // Verify batch appears in closed tab
  const closedTabRes = await getAction('batch_list', 'tab=closed');
  assert(closedTabRes.ok && closedTabRes.json.data.items.some((it) => it.id === workflowId), 'Step 13: Batch is now in closed tab');

  console.log('\n====================================================');
  console.log('ALL 13 LIFECYCLE STEPS PASSED WITH 100% ACCURACY!');
  console.log('====================================================\n');
}

runTwoRoleWorkflowTest().catch(console.error);
