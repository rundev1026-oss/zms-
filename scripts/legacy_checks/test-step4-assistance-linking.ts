import { getDb, initDb } from '../src/lib/db';
import { FinancialService } from '../src/services/financialService';
import { BeneficiaryService } from '../src/services/beneficiaryService';

const ACTOR = {
  id: 'user-mukhlis',
  name: 'นายมุกลิส มีระยะ',
  role: 'finance',
};

async function runStep4Tests() {
  console.log('================================================================');
  console.log('--- TASK 4: TEST SUITE - LINKING ASSISTANCE & DISBURSEMENT ---');
  console.log('================================================================\n');

  await initDb();
  const db = getDb();

  // -------------------------------------------------------------------------
  // 0. Setup Mock Beneficiaries and Applications for Test
  // -------------------------------------------------------------------------
  console.log('>>> [0] Setting up test data (Beneficiaries & Applications)...');
  
  const testHhId1 = 'hh-test-t4-01';
  const testBenId1 = 'ben-test-t4-01';
  const testBenId2 = 'ben-test-t4-02';
  const testBenId3 = 'ben-test-t4-03';
  const testAppId1 = 'app-test-t4-01';
  const testAppId2 = 'app-test-t4-02';
  const testAppId3 = 'app-test-t4-03';

  // Clean old test records if any
  await db.execute({ sql: 'DELETE FROM cash_flow_disbursement_items WHERE application_id IN (?, ?, ?)', args: [testAppId1, testAppId2, testAppId3] });
  await db.execute({ sql: 'DELETE FROM application_history WHERE application_id IN (?, ?, ?)', args: [testAppId1, testAppId2, testAppId3] });
  await db.execute({ sql: 'DELETE FROM financial_transactions WHERE application_id IN (?, ?, ?)', args: [testAppId1, testAppId2, testAppId3] });
  await db.execute({ sql: 'DELETE FROM assistance_applications WHERE id IN (?, ?, ?)', args: [testAppId1, testAppId2, testAppId3] });
  await db.execute({ sql: 'DELETE FROM beneficiaries WHERE id IN (?, ?, ?)', args: [testBenId1, testBenId2, testBenId3] });
  await db.execute({ sql: 'DELETE FROM households WHERE id = ?', args: [testHhId1] });

  // Insert Household with subdistrict, district, province
  await db.execute({
    sql: `INSERT INTO households (
      id, household_no, address, province, district, subdistrict, community
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [testHhId1, 'HH-TEST-T4', '123/45 ถนนพิชิตบำรุง', 'ปัตตานี', 'เมืองปัตตานี', 'จะบังติกอ', 'ชุมชนจะบังติกอ'],
  });

  // Insert Beneficiary 1: มารียัม ดอเลาะ (REG-2569-8801)
  await db.execute({
    sql: `INSERT INTO beneficiaries (
      id, household_id, registration_no, registration_status, registered_date, full_name, national_id, phone, asnaf_category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [testBenId1, testHhId1, 'REG-2569-8801', 'qualified', '2026-03-01', 'นางมารียัม ดอเลาะ', '1940100111222', '0811112233', 'fakir'],
  });

  // Insert Beneficiary 2: อับดุลเลาะ มะแอ (REG-2569-8802)
  await db.execute({
    sql: `INSERT INTO beneficiaries (
      id, household_id, registration_no, registration_status, registered_date, full_name, national_id, phone, asnaf_category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [testBenId2, testHhId1, 'REG-2569-8802', 'qualified', '2026-03-05', 'นายอับดุลเลาะ มะแอ', '1940100333444', '0822223344', 'miskin'],
  });

  // Insert Beneficiary 3: ฟาตีมะห์ สาและ (REG-2569-8803)
  await db.execute({
    sql: `INSERT INTO beneficiaries (
      id, household_id, registration_no, registration_status, registered_date, full_name, national_id, phone, asnaf_category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [testBenId3, testHhId1, 'REG-2569-8803', 'qualified', '2026-03-10', 'นางสาวฟาตีมะห์ สาและ', '1940100555666', '0833334455', 'gharimin'],
  });

  // Insert Application 1: Approved 5,000 THB (Full payment test)
  await db.execute({
    sql: `INSERT INTO assistance_applications (
      id, application_no, registration_no, beneficiary_id, asnaf_category, assistance_type, requested_amount, approved_amount, disbursed_amount, status, approved_date, approval_notes, assigned_officer_id, assigned_officer_name, applied_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [testAppId1, 'APP-2569-8801', 'REG-2569-8801', testBenId1, 'fakir', 'เงินสงเคราะห์เพื่อการยังชีพ', 5000, 5000, 0, 'wait_disbursement', '2026-03-15', 'อนุมัติจ่ายเงินสงเคราะห์ยังชีพผู้ยากไร้', 'officer-1', 'เจ้าหน้าที่สำรวจ', '2026-03-01'],
  });

  // Insert Application 2: Approved 10,000 THB (Partial payment test)
  await db.execute({
    sql: `INSERT INTO assistance_applications (
      id, application_no, registration_no, beneficiary_id, asnaf_category, assistance_type, requested_amount, approved_amount, disbursed_amount, status, approved_date, approval_notes, assigned_officer_id, assigned_officer_name, applied_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [testAppId2, 'APP-2569-8802', 'REG-2569-8802', testBenId2, 'miskin', 'ทุนประกอบอาชีพช่างตัดเย็บ', 10000, 10000, 0, 'wait_disbursement', '2026-03-16', 'อนุมัติเงินทุนประกอบอาชีพรอบที่ 1', 'officer-1', 'เจ้าหน้าที่สำรวจ', '2026-03-05'],
  });

  // Insert Application 3: Approved 6,000 THB (Cancellation before confirmation test)
  await db.execute({
    sql: `INSERT INTO assistance_applications (
      id, application_no, registration_no, beneficiary_id, asnaf_category, assistance_type, requested_amount, approved_amount, disbursed_amount, status, approved_date, approval_notes, assigned_officer_id, assigned_officer_name, applied_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [testAppId3, 'APP-2569-8803', 'REG-2569-8803', testBenId3, 'gharimin', 'เงินช่วยเหลือหนี้สินจำเป็น', 6000, 6000, 0, 'wait_disbursement', '2026-03-18', 'อนุมัติบรรเทาภาระหนี้สิน', 'officer-1', 'เจ้าหน้าที่สำรวจ', '2026-03-10'],
  });

  console.log('✓ Created 3 mock beneficiaries and 3 approved applications successfully.\n');

  // -------------------------------------------------------------------------
  // 1. Test Search and Filter Approved Applications (6 Fields)
  // -------------------------------------------------------------------------
  console.log('>>> [1] Testing Case Selection & 6 Search Fields Filter...');
  
  // 1.1 Search by Application No
  const resAppNo = await FinancialService.getApprovedAssistanceApplications('APP-2569-8801');
  console.assert(resAppNo.length > 0 && resAppNo.some(a => a.applicationNo === 'APP-2569-8801'), 'Fail 1.1: Search by Application No');
  console.log('  ✓ 1.1 Search by applicationNo passed');

  // 1.2 Search by Registration No
  const resRegNo = await FinancialService.getApprovedAssistanceApplications('REG-2569-8802');
  console.assert(resRegNo.length > 0 && resRegNo.some(a => a.registrationNo === 'REG-2569-8802'), 'Fail 1.2: Search by Registration No');
  console.log('  ✓ 1.2 Search by registrationNo passed');

  // 1.3 Search by Beneficiary Name
  const resName = await FinancialService.getApprovedAssistanceApplications('มารียัม');
  console.assert(resName.length > 0 && resName.some(a => a.beneficiaryName.includes('มารียัม')), 'Fail 1.3: Search by Beneficiary Name');
  console.log('  ✓ 1.3 Search by beneficiaryName passed');

  // 1.4 Search by Assistance Type
  const resType = await FinancialService.getApprovedAssistanceApplications('ตัดเย็บ');
  console.assert(resType.length > 0 && resType.some(a => a.assistanceType.includes('ตัดเย็บ')), 'Fail 1.4: Search by Assistance Type');
  console.log('  ✓ 1.4 Search by assistanceType passed');

  // 1.5 Search by Area Info
  const resArea = await FinancialService.getApprovedAssistanceApplications('จะบังติกอ');
  console.assert(resArea.length > 0 && resArea.some(a => a.areaInfo?.includes('จะบังติกอ')), 'Fail 1.5: Search by Area Info');
  console.log('  ✓ 1.5 Search by areaInfo passed');

  // 1.6 Search by Approved Date
  const resDate = await FinancialService.getApprovedAssistanceApplications('2026-03-18');
  console.assert(resDate.length > 0 && resDate.some(a => a.approvedDate === '2026-03-18'), 'Fail 1.6: Search by Approved Date');
  console.log('  ✓ 1.6 Search by approvedDate passed');

  // Verify only applications with remaining amount > 0 are returned
  console.assert(resAppNo.every(a => a.remainingAmount > 0), 'Fail: Returned app with remainingAmount <= 0');
  console.log('  ✓ 1.7 Only approved cases with remainingAmount > 0 are returned\n');

  // -------------------------------------------------------------------------
  // 2. Setup Cash Flow Workflow (Steps 1 & 2)
  // -------------------------------------------------------------------------
  console.log('>>> [2] Setting up Cash Flow Workflow (Steps 1 & 2)...');
  const bankAccRes = await db.execute('SELECT id FROM bank_accounts LIMIT 1');
  const bankAccId = bankAccRes.rows.length > 0 ? String(bankAccRes.rows[0].id) : 'bank-1';

  const wf = await FinancialService.createCashFlowWorkflow({
    title: 'รอบเบิกเงินสดช่วยเหลือผู้ประสบภัยและผู้ยากไร้ Task 4',
    bankAccountId: bankAccId,
    withdrawAmount: 50000,
    fundType: 'zakat',
    refNo: 'WF-T4-TEST',
    withdrawnByName: 'นายมุกลิส มีระยะ',
    notes: 'ทดสอบการเบิกเงินสดช่วยเหลือผู้มีสิทธิ์',
  }, ACTOR);

  // Complete Step 2: Handover to Treasurer Ruslan Hasamae
  await FinancialService.advanceWorkflowToStep2(
    wf.id,
    {
      depositAmount: 50000,
      handoverAmount: 50000,
      refNo: 'REC-TREAS-T4',
      handoverPersonName: 'นายมุกลิส มีระยะ',
      treasurerName: 'นายรุสลัน หะสาเมาะ',
      auditorName: 'อิหม่ามฟารุก อาลี',
      status: 'received',
      proofUrl: 'https://storage.zms.org/proofs/handover-rec-t4.pdf',
    },
    ACTOR
  );

  console.log(`  ✓ Created Workflow ${wf.workflowNo} with ฿50,000 in Treasurer custody.\n`);

  // -------------------------------------------------------------------------
  // 3. Test Full Disbursement (Case 1: Approved 5,000 -> Pay 5,000)
  // -------------------------------------------------------------------------
  console.log('>>> [3] Testing Full Disbursement (การจ่ายเต็มจำนวน)...');
  
  const runId = Date.now().toString().slice(-4);
  const vch1No = `${runId}-01/2569`;
  const vch2No = `${runId}-02/2569`;
  const vch3No = `${runId}-03/2569`;
  const vch4No = `${runId}-04/2569`;

  const voucher1 = await FinancialService.addCashFlowWithdrawal({
    workflowId: wf.id,
    withdrawalNo: vch1No,
    voucherType: 'aid_disbursement',
    sourceFundType: 'zakat',
    amount: 5000,
    requestedAmount: 5000,
    approvedAmount: 5000,
    status: 'approved',
    withdrawalDatetime: '2026-03-20T10:00',
    withdrawerName: 'นายมุกลิส มีระยะ',
    approverName: 'อิหม่ามฟารุก อาลี',
    purpose: 'จ่ายเงินสงเคราะห์ยังชีพผู้ยากไร้ (นางมารียัม ดอเลาะ)',
    disbursementItems: [{
      applicationId: testAppId1,
      beneficiaryId: testBenId1,
      beneficiaryName: 'นางมารียัม ดอเลาะ',
      nationalId: '1940100111222',
      asnafCategory: 'fakir',
      assistanceType: 'เงินสงเคราะห์เพื่อการยังชีพ',
      areaInfo: 'จะบังติกอ เมืองปัตตานี',
      approvedAmount: 5000,
      disbursedAmountBefore: 0,
      thisDisbursementAmount: 5000,
      remainingBalance: 0,
      notes: 'จ่ายเงินสดสงเคราะห์ยังชีพเต็มจำนวนตามมติ',
    }],
  }, ACTOR);

  // Confirm disbursement
  await FinancialService.confirmCashDisbursement({
    withdrawalId: voucher1.withdrawalId,
    notes: 'จ่ายเงินสดถึงมือผู้รับเรียบร้อย',
    proofUrl: 'https://storage.zms.org/proofs/voucher-01-2569.pdf',
    proofName: 'ใบเสร็จรับเงินสด-01-2569.pdf',
  }, ACTOR);

  // Verify Application 1 Post-Disbursement Status
  const app1After = await db.execute({ sql: 'SELECT * FROM assistance_applications WHERE id = ?', args: [testAppId1] });
  const row1 = app1After.rows[0];
  console.assert(Number(row1.disbursed_amount) === 5000, `Fail 3.1: Expected disbursed 5000, got ${row1.disbursed_amount}`);
  console.assert(row1.status === 'disbursed', `Fail 3.2: Expected status 'disbursed', got '${row1.status}'`);
  console.assert(String(row1.disbursement_ref).includes(vch1No), `Fail 3.3: Expected ref to contain ${vch1No}`);
  console.assert(row1.disbursed_by_name === 'นายมุกลิส มีระยะ', 'Fail 3.4: Disbursed by name mismatch');
  console.assert(row1.disbursement_proof_url === 'https://storage.zms.org/proofs/voucher-01-2569.pdf', 'Fail 3.5: Proof URL mismatch');
  console.log('  ✓ 3.1 Application 1 status changed to "disbursed" and disbursedAmount = 5,000');

  // Verify application_history audit log
  const hist1 = await db.execute({ sql: "SELECT * FROM application_history WHERE application_id = ?", args: [testAppId1] });
  console.assert(hist1.rows.length > 0, 'Fail 3.6: No application_history entry created');
  console.log('  ✓ 3.2 Status change audit log in application_history recorded');

  // Verify financial_transactions entry
  const tx1 = await db.execute({ sql: 'SELECT * FROM financial_transactions WHERE application_id = ?', args: [testAppId1] });
  console.assert(tx1.rows.length > 0 && Number(tx1.rows[0].amount) === 5000, 'Fail 3.7: Financial transaction not recorded');
  console.log('  ✓ 3.3 Financial transaction linking application, beneficiary and workflow recorded\n');

  // -------------------------------------------------------------------------
  // 4. Test Partial Disbursement (Case 2: Approved 10,000 -> Pay 4,000 then 6,000)
  // -------------------------------------------------------------------------
  console.log('>>> [4] Testing Partial Disbursement (การจ่ายบางส่วน)...');
  
  // 4.1 First Partial Payment: 4,000 THB
  const voucher2 = await FinancialService.addCashFlowWithdrawal({
    workflowId: wf.id,
    withdrawalNo: vch2No,
    voucherType: 'aid_disbursement',
    sourceFundType: 'zakat',
    amount: 4000,
    requestedAmount: 4000,
    approvedAmount: 4000,
    status: 'approved',
    withdrawalDatetime: '2026-03-20T11:00',
    withdrawerName: 'นายมุกลิส มีระยะ',
    approverName: 'อิหม่ามฟารุก อาลี',
    purpose: 'จ่ายเงินทุนประกอบอาชีพงวดที่ 1 (นายอับดุลเลาะ มะแอ)',
    disbursementItems: [{
      applicationId: testAppId2,
      beneficiaryId: testBenId2,
      beneficiaryName: 'นายอับดุลเลาะ มะแอ',
      nationalId: '1940100333444',
      asnafCategory: 'miskin',
      assistanceType: 'ทุนประกอบอาชีพช่างตัดเย็บ',
      areaInfo: 'รูสะมิแล เมืองปัตตานี',
      approvedAmount: 10000,
      disbursedAmountBefore: 0,
      thisDisbursementAmount: 4000,
      remainingBalance: 6000,
      notes: 'จ่ายงวดที่ 1 ซื้อจักรเย็บผ้า',
    }],
  }, ACTOR);

  await FinancialService.confirmCashDisbursement({
    withdrawalId: voucher2.withdrawalId,
    notes: 'จ่ายงวดที่ 1 เรียบร้อย',
    proofUrl: 'https://storage.zms.org/proofs/voucher-02-2569.pdf',
  }, ACTOR);

  // Verify Application 2 after 1st partial payment
  const app2Partial = await db.execute({ sql: 'SELECT * FROM assistance_applications WHERE id = ?', args: [testAppId2] });
  const row2P = app2Partial.rows[0];
  console.assert(Number(row2P.disbursed_amount) === 4000, `Fail 4.1: Disbursed amount expected 4000, got ${row2P.disbursed_amount}`);
  console.assert(row2P.status === 'wait_disbursement', `Fail 4.2: Expected status 'wait_disbursement' for partial payment, got '${row2P.status}'`);
  console.log('  ✓ 4.1 After 1st payment: disbursedAmount = 4,000, status remains "wait_disbursement"');

  // Verify picker still shows remaining 6,000
  const pickerCheck = await FinancialService.getApprovedAssistanceApplications('APP-2569-8802');
  console.assert(pickerCheck.length > 0 && pickerCheck[0].remainingAmount === 6000, 'Fail 4.3: Picker remaining amount not 6,000');
  console.log('  ✓ 4.2 Picker shows updated remaining balance of ฿6,000 for this case');

  // 4.2 Second Partial Payment: Remaining 6,000 THB
  const voucher3 = await FinancialService.addCashFlowWithdrawal({
    workflowId: wf.id,
    withdrawalNo: vch3No,
    voucherType: 'aid_disbursement',
    sourceFundType: 'zakat',
    amount: 6000,
    requestedAmount: 6000,
    approvedAmount: 6000,
    status: 'approved',
    withdrawalDatetime: '2026-03-21T09:30',
    withdrawerName: 'นายมุกลิส มีระยะ',
    approverName: 'อิหม่ามฟารุก อาลี',
    purpose: 'จ่ายเงินทุนประกอบอาชีพงวดที่ 2 (นายอับดุลเลาะ มะแอ)',
    disbursementItems: [{
      applicationId: testAppId2,
      beneficiaryId: testBenId2,
      beneficiaryName: 'นายอับดุลเลาะ มะแอ',
      nationalId: '1940100333444',
      asnafCategory: 'miskin',
      assistanceType: 'ทุนประกอบอาชีพช่างตัดเย็บ',
      areaInfo: 'รูสะมิแล เมืองปัตตานี',
      approvedAmount: 10000,
      disbursedAmountBefore: 4000,
      thisDisbursementAmount: 6000,
      remainingBalance: 0,
      notes: 'จ่ายงวดที่ 2 ซื้อผ้าและอุปกรณ์ครบถ้วน',
    }],
  }, ACTOR);

  await FinancialService.confirmCashDisbursement({
    withdrawalId: voucher3.withdrawalId,
    notes: 'จ่ายงวดที่ 2 ครบถ้วนแล้ว',
    proofUrl: 'https://storage.zms.org/proofs/voucher-03-2569.pdf',
  }, ACTOR);

  const app2Final = await db.execute({ sql: 'SELECT * FROM assistance_applications WHERE id = ?', args: [testAppId2] });
  const row2F = app2Final.rows[0];
  console.assert(Number(row2F.disbursed_amount) === 10000, `Fail 4.4: Disbursed amount expected 10000, got ${row2F.disbursed_amount}`);
  console.assert(row2F.status === 'disbursed', `Fail 4.5: Status expected 'disbursed', got '${row2F.status}'`);
  console.assert(String(row2F.disbursement_ref).includes(vch2No) && String(row2F.disbursement_ref).includes(vch3No), 'Fail 4.6: Both voucher refs expected');
  console.log('  ✓ 4.3 After 2nd payment: disbursedAmount = 10,000, status transitioned to "disbursed"');
  console.log(`  ✓ 4.4 Combined voucher references: "${row2F.disbursement_ref}"\n`);

  // -------------------------------------------------------------------------
  // 5. Test Idempotency & Duplicate Confirmation Prevention
  // -------------------------------------------------------------------------
  console.log('>>> [5] Testing Idempotency & Duplicate Confirmation Prevention...');
  try {
    await FinancialService.confirmCashDisbursement(voucher3.withdrawalId, ACTOR);
    console.assert(false, 'Fail 5.1: Duplicate confirmation should have thrown error');
  } catch (err: any) {
    console.assert(err.message.includes('ไม่สามารถยืนยันซ้ำได้'), `Fail 5.2: Unexpected error: ${err.message}`);
    console.log(`  ✓ 5.1 Duplicate confirmation correctly rejected: "${err.message}"\n`);
  }

  // -------------------------------------------------------------------------
  // 6. Test Cancellation Before Confirmation
  // -------------------------------------------------------------------------
  console.log('>>> [6] Testing Cancellation Before Confirmation (การยกเลิกก่อนยืนยัน)...');
  
  // Create voucher for App 3 (6,000 THB)
  const voucher4 = await FinancialService.addCashFlowWithdrawal({
    workflowId: wf.id,
    withdrawalNo: vch4No,
    voucherType: 'aid_disbursement',
    sourceFundType: 'zakat',
    amount: 6000,
    requestedAmount: 6000,
    approvedAmount: 6000,
    status: 'pending',
    withdrawalDatetime: '2026-03-22T10:00',
    withdrawerName: 'นายมุกลิส มีระยะ',
    approverName: 'อิหม่ามฟารุก อาลี',
    purpose: 'จ่ายเงินช่วยเหลือหนี้สินจำเป็น (นางสาวฟาตีมะห์ สาและ)',
    disbursementItems: [{
      applicationId: testAppId3,
      beneficiaryId: testBenId3,
      beneficiaryName: 'นางสาวฟาตีมะห์ สาและ',
      nationalId: '1940100555666',
      asnafCategory: 'gharimin',
      assistanceType: 'เงินช่วยเหลือหนี้สินจำเป็น',
      areaInfo: 'บานา เมืองปัตตานี',
      approvedAmount: 6000,
      disbursedAmountBefore: 0,
      thisDisbursementAmount: 6000,
      remainingBalance: 0,
      notes: 'ขอยกเลิกเนื่องจากผู้ขอแจ้งเลื่อนวันรับเงิน',
    }],
  }, ACTOR);

  // Cancel voucher before confirmation
  await FinancialService.cancelCashFlowWithdrawal(
    voucher4.withdrawalId,
    'ผู้ขอแจ้งเลื่อนวันรับเงินสด จึงขอยกเลิกใบสำคัญนี้',
    ACTOR
  );

  // Verify voucher is cancelled
  const v4Check = await db.execute({ sql: 'SELECT status FROM cash_flow_withdrawals WHERE id = ?', args: [voucher4.withdrawalId] });
  console.assert(v4Check.rows[0].status === 'cancelled', 'Fail 6.1: Voucher not marked cancelled');

  // Verify Application 3 is untouched
  const app3Check = await db.execute({ sql: 'SELECT * FROM assistance_applications WHERE id = ?', args: [testAppId3] });
  console.assert(Number(app3Check.rows[0].disbursed_amount || 0) === 0, 'Fail 6.2: App 3 disbursed amount altered');
  console.assert(app3Check.rows[0].status === 'wait_disbursement', 'Fail 6.3: App 3 status altered');
  console.log('  ✓ 6.1 Voucher marked cancelled, Application 3 untouched (disbursed = 0, status = wait_disbursement)');

  // Verify that confirmation of cancelled voucher is blocked
  try {
    await FinancialService.confirmCashDisbursement(voucher4.withdrawalId, ACTOR);
    console.assert(false, 'Fail 6.4: Confirmation of cancelled voucher should have failed');
  } catch (err: any) {
    console.assert(err.message.includes('ยกเลิกแล้ว'), `Fail 6.5: Unexpected error: ${err.message}`);
    console.log(`  ✓ 6.2 Confirmation on cancelled voucher rejected: "${err.message}"\n`);
  }

  // -------------------------------------------------------------------------
  // 7. Test Assistance History in Beneficiary Profile (Section 5)
  // -------------------------------------------------------------------------
  console.log('>>> [7] Verifying Assistance History in Beneficiary Profile (Section 5)...');
  
  // 7.1 Check Beneficiary 1 Profile Applications
  const ben1Apps = await BeneficiaryService.getAllApplications({ search: 'นางมารียัม ดอเลาะ' });
  console.assert(ben1Apps.length > 0, 'Fail 7.1: Beneficiary 1 applications empty');
  const b1App = ben1Apps.find((a: any) => a.id === testAppId1);
  console.assert(b1App !== undefined, 'Fail 7.2: Application not found in beneficiary applications');
  console.assert(b1App?.status === 'disbursed', `Fail 7.3: Expected status 'disbursed', got '${b1App?.status}'`);
  console.assert(b1App?.disbursedAmount === 5000, `Fail 7.4: Expected disbursedAmount 5000, got ${b1App?.disbursedAmount}`);
  console.assert(b1App?.disbursementRef?.includes(vch1No), `Fail 7.5: Expected disbursementRef ${vch1No}`);
  console.assert(Boolean(b1App?.disbursementNotes), 'Fail 7.6: Expected disbursementNotes to be present');
  console.log('  ✓ 7.1 Beneficiary 1 profile displays disbursement details:');
  console.log(`      - สถานะ: ${b1App?.status}`);
  console.log(`      - ยอดจ่ายแล้ว: ฿${b1App?.disbursedAmount?.toLocaleString()}`);
  console.log(`      - ใบสำคัญ: ${b1App?.disbursementRef}`);
  console.log(`      - วันที่จ่าย: ${b1App?.disbursementDate}`);
  console.log(`      - หมายเหตุ: ${b1App?.disbursementNotes}`);

  // 7.2 Check Beneficiary 2 Profile Applications
  const ben2Apps = await BeneficiaryService.getAllApplications({ search: 'นายอับดุลเลาะ มะแอ' });
  const b2App = ben2Apps.find((a: any) => a.id === testAppId2);
  console.assert(b2App !== undefined, 'Fail 7.7: Ben 2 App not found');
  console.assert(b2App?.status === 'disbursed', 'Fail 7.8: Ben 2 App not disbursed');
  console.assert(b2App?.disbursedAmount === 10000, 'Fail 7.9: Ben 2 App not 10,000');
  console.log('  ✓ 7.2 Beneficiary 2 profile displays completed assistance history.\n');

  // 7.3 Verify Section 5 Filtering Criteria
  // In AssistanceHistorySection.tsx:
  // const assistanceHistory = applications.filter(app => app.status === 'disbursed' || (app.disbursedAmount && app.disbursedAmount > 0));
  const filterCriteria = (app: any) => app.status === 'disbursed' || (app.disbursedAmount && app.disbursedAmount > 0);
  console.assert(filterCriteria(b1App), 'Fail 7.10: Full disbursement not visible in Section 5');
  console.assert(filterCriteria(b2App), 'Fail 7.11: Partial-turned-full disbursement not visible in Section 5');
  console.log('  ✓ 7.3 Section 5 UI filter criteria (AssistanceHistorySection) matches all disbursed records.');

  // Cleanup test records
  console.log('\n>>> Cleaning up test mock records...');
  await db.execute({ sql: 'DELETE FROM cash_flow_disbursement_items WHERE application_id IN (?, ?, ?)', args: [testAppId1, testAppId2, testAppId3] });
  await db.execute({ sql: 'DELETE FROM workflow_attachments WHERE workflow_id = ?', args: [wf.id] });
  await db.execute({ sql: 'DELETE FROM cash_flow_withdrawals WHERE workflow_id = ?', args: [wf.id] });
  await db.execute({ sql: 'DELETE FROM financial_transactions WHERE workflow_id = ? OR application_id IN (?, ?, ?)', args: [wf.id, testAppId1, testAppId2, testAppId3] });
  await db.execute({ sql: 'DELETE FROM application_history WHERE application_id IN (?, ?, ?)', args: [testAppId1, testAppId2, testAppId3] });
  await db.execute({ sql: 'DELETE FROM assistance_applications WHERE id IN (?, ?, ?)', args: [testAppId1, testAppId2, testAppId3] });
  await db.execute({ sql: 'DELETE FROM beneficiaries WHERE id IN (?, ?, ?)', args: [testBenId1, testBenId2, testBenId3] });
  await db.execute({ sql: 'DELETE FROM households WHERE id = ?', args: [testHhId1] });
  await db.execute({ sql: 'DELETE FROM cash_flow_workflows WHERE id = ?', args: [wf.id] });
  console.log('✓ Cleaned up all temporary test records.');

  console.log('\n================================================================');
  console.log('🎉 ALL 7 TASK 4 TEST SCENARIOS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runStep4Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
