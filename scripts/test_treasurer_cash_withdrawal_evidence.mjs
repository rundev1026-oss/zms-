/**
 * Automated Verification Script for ZMS Treasurer Cash Withdrawal & Transfer Evidence
 * 
 * Verifies:
 * 1. Strict source account enforcement (1020-01 only, bank accounts rejected)
 * 2. Multi-file upload across document types (transfer_slip, bank_withdrawal_slip, payment_voucher_receipt, cash_handover_slip, other_document)
 * 3. File preview & download via storage service
 * 4. Record transfer & handover (Treasurer -> Staff Cash Float)
 * 5. Asset-to-asset balance sheet rules (No GL on transfer, GL posts strictly on staff confirmation)
 * 6. Automated 6-metric financial summary & discrepancy detection
 * 7. Full receipt (fully_received) with Debit 1030-01 / Credit 1020-01
 * 8. Partial receipt (partially_received) with discrepancy reason & partial GL
 * 9. Return for review (returned_for_review) without GL
 * 10. Duplicate transaction prevention (Idempotency)
 * 11. Complete audit trail in audit_logs
 */

import { initDb, getDb } from '../src/lib/db.ts';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 STARTING VERIFICATION: TREASURER CASH WITHDRAWAL EVIDENCE');
  console.log('================================================================\n');

  await initDb();
  const db = getDb();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // Define actors
  const treasurerActor = {
    id: 'ca4832f7-d789-4e48-b36f-320ecb99a8b2',
    name: 'นายอับดุลเลาะห์ มะยูโซ๊ะ (เหรัญญิก)',
    role: 'finance',
  };

  const staffActor = {
    id: 'staff-officer-test-01',
    name: 'นายฟารุก เจ้าหน้าที่การเงิน',
    role: 'staff',
  };

  // Ensure staff actor exists in SQLite users table
  await db.execute({
    sql: `
      INSERT OR IGNORE INTO users (id, email, name, role, role_title_th, phone, branch, status)
      VALUES (?, ?, ?, 'staff', 'เจ้าหน้าที่สำนักงาน', '081-111-2222', 'สำนักงานใหญ่', 'active')
    `,
    args: [staffActor.id, `${staffActor.id}@zms.local`, staffActor.name],
  });

  // Authenticate to get valid token for storage preview
  let authToken = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@zms.local', password: 'ZmsEnterprise2026!' }),
    });
    const loginData = await loginRes.json();
    if (loginData.token) {
      authToken = loginData.token;
      console.log('🔑 Authenticated successfully for file access tests');
    }
  } catch (err) {
    console.warn('⚠️ Login warning:', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SCENARIO 1: Create a Batch Disbursement for Testing
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 1: Create Approved Batch Disbursement ---');

  // Create test application
  const testAppId = `app-cash-test-${Date.now()}`;
  const benRes = await db.execute(`SELECT id FROM beneficiaries LIMIT 1`);
  const benId = String(benRes.rows[0]?.id || 'b-1');

  await db.execute({
    sql: `
      INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, assistance_type,
        requested_amount, approved_amount, disbursed_amount, status, approval_status,
        payment_status, assigned_officer_id, assigned_officer_name, applied_date, approved_date, created_at
      ) VALUES (
        ?, ?, ?, 'ฟะกีร (ผู้ยากไร้)', 'เงินสงเคราะห์ยังชีพ',
        15000, 15000, 0, 'approved', 'approved',
        'pending', ?, ?, date('now'), date('now'), CURRENT_TIMESTAMP
      )
    `,
    args: [
      testAppId,
      `APP-TCW-${Date.now()}`,
      benId,
      staffActor.id,
      staffActor.name,
    ],
  });

  // Create batch via API
  const createBatchRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_batch',
      input: {
        title: `รอบเบิกเงินสดทดสอบ-${Date.now()}`,
        fundType: 'zakat',
        sourceAccountId: '1020-01',
        notes: 'ทดสอบระบบบันทึกการส่งมอบเงินสดและแนบหลักฐาน',
        items: [
          {
            type: 'aid',
            applicationId: testAppId,
            beneficiaryId: benId,
            beneficiaryName: 'ผู้รับความช่วยเหลือทดสอบ',
            asnafCategory: 'ฟะกีร (ผู้ยากไร้)',
            approvedAmount: 15000,
            thisDisbursementAmount: 12000,
            notes: 'เงินสงเคราะห์ยังชีพผู้ยากไร้',
          },
          {
            type: 'admin',
            description: 'ค่าเดินทางและเบี้ยเลี้ยงลงพื้นที่',
            amount: 3000,
            categoryId: '5020-03',
            categoryName: 'ค่าเบี้ยเลี้ยงและพาหนะ',
          },
        ],
      },
      actor: staffActor,
    }),
  });
  const createBatchData = await createBatchRes.json();
  if (!createBatchData.success) {
    console.error('Create Batch Error:', createBatchData);
  }
  assert(createBatchData.success === true, 'Batch disbursement created successfully');
  const workflowId = createBatchData.data.workflowId;
  const totalAmount = createBatchData.data.totalAmount;
  assert(totalAmount === 15000, `Batch total amount is ฿15,000 (actual: ฿${totalAmount})`);

  // Submit batch for approval
  const submitRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'submit_batch',
      input: { workflowId },
      actor: staffActor,
    }),
  });
  const submitData = await submitRes.json();
  assert(submitData.success === true, 'Batch submitted for approval');

  // --------------------------------------------------------------------------
  // TEST SCENARIO 2: Enforce Source Account Rules (Must be 1020-01)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 2: Enforce Source Account Validation ---');

  // Try recording transfer with commercial bank account as source -> MUST FAIL
  const failBankSourceRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'record_treasurer_transfer',
      input: {
        workflowId,
        sourceAccountId: 'bank-1', // ILLEGAL SOURCE
        destinationAccountId: '1030-01',
        amount: 15000,
        files: [{ fileUrl: 'https://example.com/test.pdf', fileName: 'test.pdf', documentType: 'transfer_slip' }],
      },
      actor: treasurerActor,
    }),
  });
  const failBankSourceData = await failBankSourceRes.json();
  assert(
    failBankSourceData.success === false,
    'Selecting commercial bank account (bank-1) as source is rejected'
  );
  assert(
    failBankSourceData.error && failBankSourceData.error.includes('1020-01'),
    `Error message mentions 1020-01 restriction: "${failBankSourceData.error}"`
  );

  // --------------------------------------------------------------------------
  // TEST SCENARIO 3: Multi-File Upload Across 5 Document Types
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 3: Multi-File Upload & Document Types ---');

  // We test all 5 document types:
  // 1. transfer_slip (สลิปการโอนเงิน)
  // 2. bank_withdrawal_slip (ใบถอนเงินจากธนาคาร)
  // 3. payment_voucher_receipt (ใบสำคัญรับเงิน)
  // 4. cash_handover_slip (ใบส่งมอบเงินสด)
  // 5. other_document (เอกสารอื่น ๆ)
  const docTypes = [
    { type: 'transfer_slip', name: 'สลิปโอนเงินโมบายแบงก์กิ้ง.pdf' },
    { type: 'bank_withdrawal_slip', name: 'ใบถอนเงินสดสาขาธนาคาร.png' },
    { type: 'payment_voucher_receipt', name: 'ใบสำคัญรับเงินสด.pdf' },
    { type: 'cash_handover_slip', name: 'ใบส่งมอบเงินสดเหรัญญิก.pdf' },
    { type: 'other_document', name: 'บันทึกข้อความขออนุมัติ.pdf' },
  ];

  const uploadedFiles = [];
  for (const doc of docTypes) {
    const isPng = doc.name.endsWith('.png');
    // Create dummy buffer (PDF header or PNG header)
    const buffer = isPng
      ? Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52])
      : Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

    const form = new FormData();
    const blob = new Blob([buffer], { type: isPng ? 'image/png' : 'application/pdf' });
    form.append('file', blob, doc.name);
    form.append('category', doc.type);
    form.append('entityType', 'cash_flow_workflow');
    form.append('entityId', workflowId);

    const upRes = await fetch(`${BASE_URL}/api/storage/upload`, {
      method: 'POST',
      body: form,
    });
    const upData = await upRes.json();
    assert(upData.success === true, `Uploaded ${doc.name} as ${doc.type}`);
    assert(!!upData.fileUrl, `Storage returned permanent URL for ${doc.name}: ${upData.fileUrl}`);

    uploadedFiles.push({
      fileUrl: upData.fileUrl,
      fileName: doc.name,
      fileSize: buffer.length,
      mimeType: isPng ? 'image/png' : 'application/pdf',
      documentType: doc.type,
      notes: `เอกสารประเภท ${doc.type}`,
    });
  }

  // --------------------------------------------------------------------------
  // TEST SCENARIO 4: Verify File Preview & File Download
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 4: File Preview & Download Endpoints ---');

  const sampleFile = uploadedFiles[0];
  const fileId = sampleFile.fileUrl.split('/').pop();
  const previewRes = await fetch(
    `${BASE_URL}/api/storage/file/${encodeURIComponent(fileId)}?action=preview`,
    {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    }
  );
  assert(previewRes.status === 200, `Preview endpoint returned 200 OK for ${sampleFile.fileName}`);
  assert(
    previewRes.headers.get('content-type')?.includes('pdf') || previewRes.headers.get('content-type')?.includes('image'),
    `Preview Content-Type is valid: ${previewRes.headers.get('content-type')}`
  );

  // Test download endpoint
  const downloadRes = await fetch(
    `${BASE_URL}/api/storage/download?docId=${encodeURIComponent(sampleFile.fileUrl)}`
  );
  assert(downloadRes.status === 200, `Download endpoint returned 200 OK for ${sampleFile.fileName}`);
  const downloadedBuf = await downloadRes.arrayBuffer();
  assert(downloadedBuf.byteLength > 0, `Downloaded file size > 0 (${downloadedBuf.byteLength} bytes)`);

  // --------------------------------------------------------------------------
  // TEST SCENARIO 5: Record Treasurer Transfer and Handover
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 5: Record Treasurer Transfer & Handover ---');

  // Check initial GL count
  const initialGl = await db.execute(`SELECT count(*) as count FROM general_ledger_entries`);
  const initialGlCount = Number(initialGl.rows[0].count);

  const transferDatetime = new Date().toISOString();
  const recordRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'record_treasurer_transfer',
      input: {
        workflowId,
        sourceAccountId: '1020-01',
        destinationAccountId: '1030-01',
        amount: 15000,
        transferDatetime,
        notes: 'เหรัญญิกบันทึกการส่งมอบเงินสดและแนบเอกสาร 5 รายการ',
        recipientUserId: staffActor.id,
        recipientUserName: staffActor.name,
        files: uploadedFiles,
      },
      actor: treasurerActor,
    }),
  });
  const recordData = await recordRes.json();
  assert(recordData.success === true, 'Treasurer transfer & handover recorded successfully');
  assert(recordData.data.status === 'pending_staff_confirm', 'Status is "pending_staff_confirm"');
  assert(recordData.data.evidenceCount === 5, 'All 5 evidence items attached');

  // Verify DB state after transfer record
  const checkHandover = await db.execute({
    sql: `SELECT * FROM finance_handover_records WHERE workflow_id = ?`,
    args: [workflowId],
  });
  assert(checkHandover.rows.length > 0, 'finance_handover_records row created');
  const handoverRow = checkHandover.rows[0];
  assert(Number(handoverRow.amount) === 15000, 'Handover amount is 15000');
  assert(String(handoverRow.source_account_id) === '1020-01', 'Source account in DB is 1020-01');
  assert(String(handoverRow.destination_account_id) === '1030-01', 'Destination account in DB is 1030-01');

  // Verify all 5 evidence items in treasurer_transfer_evidence
  const checkEvidence = await db.execute({
    sql: `SELECT * FROM treasurer_transfer_evidence WHERE workflow_id = ?`,
    args: [workflowId],
  });
  assert(checkEvidence.rows.length === 5, `5 evidence rows in DB (found: ${checkEvidence.rows.length})`);
  for (const row of checkEvidence.rows) {
    assert(!!row.document_type, `Document type stored in DB: ${row.document_type}`);
    assert(String(row.source_account_id) === '1020-01', 'source_account_id is 1020-01');
    assert(String(row.destination_account_id) === '1030-01', 'destination_account_id is 1030-01');
  }

  // STRICT FINANCIAL CHECK: GL MUST NOT BE POSTED AT THIS STEP!
  const postTransferGl = await db.execute(`SELECT count(*) as count FROM general_ledger_entries`);
  const postTransferGlCount = Number(postTransferGl.rows[0].count);
  assert(
    postTransferGlCount === initialGlCount,
    `GL entries count untouched before staff confirmation (initial: ${initialGlCount}, current: ${postTransferGlCount})`
  );

  // --------------------------------------------------------------------------
  // TEST SCENARIO 6: Financial Summary 6-Metric Automated Engine
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 6: Financial Summary 6-Metric Calculation ---');

  const detailRes = await fetch(
    `${BASE_URL}/api/finance/workflow-actions?view=batch_detail&workflowId=${encodeURIComponent(workflowId)}`
  );
  const detailData = await detailRes.json();
  assert(detailData.success === true, 'Loaded batch detail');
  const summary = detailData.data.financialSummary;
  assert(!!summary, 'financialSummary object returned in batch detail');
  assert(summary.totalRequested === 15000, `Metric 1: totalRequested is 15,000 (actual: ${summary.totalRequested})`);
  assert(summary.totalTransferred === 15000, `Metric 2: totalTransferred is 15,000 (actual: ${summary.totalTransferred})`);
  assert(summary.confirmedReceived === 0, `Metric 3: confirmedReceived is 0 before staff confirm (actual: ${summary.confirmedReceived})`);
  assert(summary.remainingToTransfer === 0, `Metric 4: remainingToTransfer is 0 (actual: ${summary.remainingToTransfer})`);
  assert(summary.treasurerBalance > 0, `Metric 5: treasurerBalance is available (฿${summary.treasurerBalance.toLocaleString()})`);
  assert(summary.staffCashBalance >= 0, `Metric 6: staffCashBalance is available (฿${summary.staffCashBalance.toLocaleString()})`);
  assert(summary.isMatched === true, 'Discrepancy check: isMatched is true');
  assert(summary.mismatchDiff === 0, 'Discrepancy check: mismatchDiff is 0');
  assert(summary.status === 'pending_staff_confirm', `Summary status is pending_staff_confirm (actual: ${summary.status})`);

  // --------------------------------------------------------------------------
  // TEST SCENARIO 7: Staff Confirms Full Receipt -> GL POSTS ASSET-TO-ASSET
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 7: Staff Confirms Full Receipt & GL Posting ---');

  const kpiBefore = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=kpi`).then((r) => r.json());
  const treasurerBalBefore = kpiBefore.data.treasurer.currentBalance;
  const staffBalBefore = kpiBefore.data.staff.currentBalance;

  const confirmRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'confirm_transfer_receipt',
      input: {
        workflowId,
        handoverId: handoverRow.id,
        decision: 'fully_received',
      },
      actor: staffActor,
    }),
  });
  const confirmData = await confirmRes.json();
  assert(confirmData.success === true, 'Staff confirmed cash receipt successfully');
  assert(confirmData.data.status === 'disbursed' || confirmData.data.handoverStatus === 'fully_received', 'Status updated to disbursed / fully_received');
  assert(confirmData.data.amount === 15000, 'Confirmed amount is 15000');

  // Verify Double-Entry GL
  const newGlRes = await db.execute({
    sql: `SELECT * FROM general_ledger_entries WHERE transaction_id LIKE 'TXN-HND-%' ORDER BY created_at DESC LIMIT 2`,
  });
  assert(newGlRes.rows.length === 2, 'Exactly 2 GL entries created for the cash float transfer');

  const debitEntry = newGlRes.rows.find((r) => r.entry_type === 'debit');
  const creditEntry = newGlRes.rows.find((r) => r.entry_type === 'credit');

  assert(!!debitEntry, 'Debit GL entry exists');
  assert(String(debitEntry.account_code) === '1030-01', `Debit account is 1030-01 Staff Cash Float (actual: ${debitEntry.account_code})`);
  assert(Number(debitEntry.amount) === 15000, 'Debit amount is ฿15,000');
  assert(String(debitEntry.account_category) === 'asset', 'Debit account category is asset');

  assert(!!creditEntry, 'Credit GL entry exists');
  assert(String(creditEntry.account_code) === '1020-01', `Credit account is 1020-01 Treasurer Cash Float (actual: ${creditEntry.account_code})`);
  assert(Number(creditEntry.amount) === 15000, 'Credit amount is ฿15,000');
  assert(String(creditEntry.account_category) === 'asset', 'Credit account category is asset');

  // STRICT COMPLIANCE: NEVER DEBIT AID OR ADMIN EXPENSES AT THIS STEP
  const expenseGl = await db.execute({
    sql: `SELECT * FROM general_ledger_entries WHERE transaction_id LIKE 'TXN-HND-%' AND (account_code LIKE '5010%' OR account_code LIKE '5020%')`,
  });
  assert(expenseGl.rows.length === 0, 'No expense accounts (5010-xx, 5020-xx) debited at cash float transfer step');

  // Check updated KPI balances
  const kpiAfter = await fetch(`${BASE_URL}/api/finance/workflow-actions?view=kpi`).then((r) => r.json());
  const treasurerBalAfter = kpiAfter.data.treasurer.currentBalance;
  const staffBalAfter = kpiAfter.data.staff.currentBalance;

  assert(
    treasurerBalAfter === treasurerBalBefore - 15000,
    `Treasurer balance decreased by ฿15,000 (from ฿${treasurerBalBefore.toLocaleString()} to ฿${treasurerBalAfter.toLocaleString()})`
  );
  assert(
    staffBalAfter === staffBalBefore + 15000,
    `Staff cash balance increased by ฿15,000 (from ฿${staffBalBefore.toLocaleString()} to ฿${staffBalAfter.toLocaleString()})`
  );

  // --------------------------------------------------------------------------
  // TEST SCENARIO 8: Prevent Duplicate Transfer (Idempotency)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 8: Duplicate Transfer Prevention ---');

  const dupRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'record_treasurer_transfer',
      input: {
        workflowId,
        sourceAccountId: '1020-01',
        destinationAccountId: '1030-01',
        amount: 15000,
        files: uploadedFiles,
      },
      actor: treasurerActor,
    }),
  });
  const dupData = await dupRes.json();
  assert(dupData.success === false, 'Duplicate transfer recording is strictly blocked');
  assert(
    dupData.error && dupData.error.includes('เสร็จสิ้นแล้ว'),
    `Duplicate rejection error: "${dupData.error}"`
  );

  // --------------------------------------------------------------------------
  // TEST SCENARIO 9: Partial Receipt Scenario (partially_received)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 9: Partial Receipt & Discrepancy Reason ---');

  // Create another batch of 10,000
  const app2Id = `app-cash-test-2-${Date.now()}`;
  await db.execute({
    sql: `
      INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, assistance_type,
        requested_amount, approved_amount, disbursed_amount, status, approval_status,
        payment_status, assigned_officer_id, assigned_officer_name, applied_date, approved_date, created_at
      ) VALUES (
        ?, ?, ?, 'มิสวีน (ผู้มีรายได้น้อย)', 'เงินสงเคราะห์เพื่อการศึกษา',
        10000, 10000, 0, 'approved', 'approved',
        'pending', ?, ?, date('now'), date('now'), CURRENT_TIMESTAMP
      )
    `,
    args: [app2Id, `APP-TCW-2-${Date.now()}`, benId, staffActor.id, staffActor.name],
  });

  const b2Res = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_batch',
      input: {
        title: `รอบเบิกทดสอบรับไม่ครบ-${Date.now()}`,
        fundType: 'zakat',
        sourceAccountId: '1020-01',
        items: [
          {
            type: 'aid',
            applicationId: app2Id,
            beneficiaryId: benId,
            beneficiaryName: 'ผู้รับทุนการศึกษา',
            asnafCategory: 'มิสวีน (ผู้มีรายได้น้อย)',
            approvedAmount: 10000,
            thisDisbursementAmount: 10000,
          },
        ],
      },
      actor: staffActor,
    }),
  });
  const b2Data = await b2Res.json();
  const wf2Id = b2Data.data.workflowId;

  // Submit and Record Transfer
  await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'submit_batch',
      input: { workflowId: wf2Id },
      actor: staffActor,
    }),
  });

  await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'record_treasurer_transfer',
      input: {
        workflowId: wf2Id,
        sourceAccountId: '1020-01',
        destinationAccountId: '1030-01',
        amount: 10000,
        files: [uploadedFiles[0]],
      },
      actor: treasurerActor,
    }),
  });

  // Staff confirms partial receipt of 9,500 (500 fee discrepancy)
  const partialRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'confirm_transfer_receipt',
      input: {
        workflowId: wf2Id,
        decision: 'partially_received',
        actualReceivedAmount: 9500,
        discrepancyReason: 'หักค่าธรรมเนียมถอนเงินสดต่างสาขา ฿500',
      },
      actor: staffActor,
    }),
  });
  const partialData = await partialRes.json();
  assert(partialData.success === true, 'Partial receipt recorded successfully');
  assert(partialData.data.status === 'partially_received', 'Status is partially_received');
  assert(partialData.data.amount === 9500, 'Actual received amount is 9,500');
  assert(partialData.data.discrepancy === 500, 'Discrepancy is 500');

  // Verify DB recorded discrepancy reason
  const hnd2Res = await db.execute({
    sql: `SELECT * FROM finance_handover_records WHERE workflow_id = ?`,
    args: [wf2Id],
  });
  assert(hnd2Res.rows[0].status === 'partially_received', 'DB handover status is partially_received');
  assert(Number(hnd2Res.rows[0].actual_received_amount) === 9500, 'DB actual_received_amount is 9500');
  assert(
    hnd2Res.rows[0].discrepancy_reason.includes('ค่าธรรมเนียม'),
    `DB stores discrepancy reason: "${hnd2Res.rows[0].discrepancy_reason}"`
  );

  // Verify GL posted exactly for the actual received amount (9,500)
  const gl2Res = await db.execute({
    sql: `SELECT * FROM general_ledger_entries WHERE transaction_id LIKE 'TXN-HND-%' ORDER BY rowid DESC LIMIT 2`,
  });
  const deb2 = gl2Res.rows.find((r) => r.entry_type === 'debit');
  assert(Number(deb2.amount) === 9500, `GL Debit amount equals actual received amount ฿9,500 (actual: ${deb2.amount})`);

  // --------------------------------------------------------------------------
  // TEST SCENARIO 10: Return for Review Scenario (returned_for_review)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 10: Return for Review (Without GL) ---');

  // Create another batch of 5,000
  const app3Id = `app-cash-test-3-${Date.now()}`;
  await db.execute({
    sql: `
      INSERT INTO assistance_applications (
        id, application_no, beneficiary_id, asnaf_category, assistance_type,
        requested_amount, approved_amount, disbursed_amount, status, approval_status,
        payment_status, assigned_officer_id, assigned_officer_name, applied_date, approved_date, created_at
      ) VALUES (
        ?, ?, ?, 'มุอัลลัฟ (ผู้เข้ารับอิสลามใหม่)', 'เงินสงเคราะห์เพื่อการดำรงชีพ',
        5000, 5000, 0, 'approved', 'approved',
        'pending', ?, ?, date('now'), date('now'), CURRENT_TIMESTAMP
      )
    `,
    args: [app3Id, `APP-TCW-3-${Date.now()}`, benId, staffActor.id, staffActor.name],
  });

  const b3Res = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_batch',
      input: {
        title: `รอบเบิกทดสอบส่งกลับ-${Date.now()}`,
        fundType: 'zakat',
        sourceAccountId: '1020-01',
        items: [
          {
            type: 'aid',
            applicationId: app3Id,
            beneficiaryId: benId,
            beneficiaryName: 'ผู้รับสงเคราะห์มุอัลลัฟ',
            asnafCategory: 'มุอัลลัฟ (ผู้เข้ารับอิสลามใหม่)',
            approvedAmount: 5000,
            thisDisbursementAmount: 5000,
          },
        ],
      },
      actor: staffActor,
    }),
  });
  const b3Data = await b3Res.json();
  const wf3Id = b3Data.data.workflowId;

  await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'submit_batch',
      input: { workflowId: wf3Id },
      actor: staffActor,
    }),
  });

  await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'record_treasurer_transfer',
      input: {
        workflowId: wf3Id,
        sourceAccountId: '1020-01',
        destinationAccountId: '1030-01',
        amount: 5000,
        files: [uploadedFiles[0]],
      },
      actor: treasurerActor,
    }),
  });

  const glBeforeReturn = await db.execute(`SELECT count(*) as count FROM general_ledger_entries`);
  const glCountBeforeReturn = Number(glBeforeReturn.rows[0].count);

  // Staff returns for review
  const returnRes = await fetch(`${BASE_URL}/api/finance/workflow-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'confirm_transfer_receipt',
      input: {
        workflowId: wf3Id,
        decision: 'returned_for_review',
        discrepancyReason: 'สลิปไม่ชัดเจนและยอดเงินไม่ตรงกับข้อตกลง',
      },
      actor: staffActor,
    }),
  });
  const returnData = await returnRes.json();
  assert(returnData.success === true, 'Return for review action succeeded');
  assert(returnData.data.status === 'returned_for_review', 'Status updated to returned_for_review');

  const glAfterReturn = await db.execute(`SELECT count(*) as count FROM general_ledger_entries`);
  const glCountAfterReturn = Number(glAfterReturn.rows[0].count);
  assert(
    glCountAfterReturn === glCountBeforeReturn,
    'No GL posted when batch is returned for review'
  );

  // --------------------------------------------------------------------------
  // TEST SCENARIO 11: Audit Logs Verification
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 11: Audit Trail Verification ---');

  const auditRes = await db.execute({
    sql: `
      SELECT action, entity_id, description FROM audit_logs 
      WHERE entity_id IN (?, ?, ?)
      ORDER BY timestamp DESC
    `,
    args: [workflowId, wf2Id, wf3Id],
  });
  const actions = auditRes.rows.map((r) => r.action);
  assert(actions.includes('RECORD_TREASURER_TRANSFER'), 'Audit log includes RECORD_TREASURER_TRANSFER');
  assert(actions.includes('CONFIRM_CASH_RECEIPT'), 'Audit log includes CONFIRM_CASH_RECEIPT');
  assert(actions.includes('PARTIAL_CASH_RECEIPT'), 'Audit log includes PARTIAL_CASH_RECEIPT');
  assert(actions.includes('RETURN_TRANSFER_FOR_REVIEW'), 'Audit log includes RETURN_TRANSFER_FOR_REVIEW');

  console.log('\n================================================================');
  console.log(`🎉 ALL TESTS PASSED SUCCESSFULLY! (${passedTests}/${totalTests} assertions)`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
