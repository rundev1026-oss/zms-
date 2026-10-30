import { getDb, initDb } from '../src/lib/db';
import { FinancialService } from '../src/services/financialService';

async function seedDemoWorkflows() {
  await initDb();
  const db = getDb();

  console.log('Seeding Realistic Demo Workflows for Task 5 UI...');

  // Find a bank account
  const bankAccRes = await db.execute('SELECT id FROM bank_accounts LIMIT 1');
  let bankAccountId = 'bank-1';
  if (bankAccRes.rows.length > 0) {
    bankAccountId = String(bankAccRes.rows[0].id);
  }

  // 1. Seed Active Workflow (CFW-2569-0001)
  const wfId1 = 'cfw-demo-active-2569';
  const wfNo1 = 'CFW-2569-0001';

  // Check if exists
  await db.execute({ sql: 'DELETE FROM workflow_attachments WHERE workflow_id = ?', args: [wfId1] });
  await db.execute({ sql: 'DELETE FROM cash_flow_disbursement_items WHERE workflow_id = ?', args: [wfId1] });
  await db.execute({ sql: 'DELETE FROM cash_flow_withdrawals WHERE workflow_id = ?', args: [wfId1] });
  await db.execute({ sql: 'DELETE FROM cash_flow_workflows WHERE id = ?', args: [wfId1] });

  await db.execute({
    sql: `INSERT INTO cash_flow_workflows (
      id, workflow_no, title, step1_bank_account_id, step1_withdraw_amount, step1_date,
      step1_event_datetime, step1_operator_id, step1_operator_name, step1_status, step1_proof_url,
      step2_treasurer_id, step2_treasurer_name, step2_deposit_amount, step2_handover_amount,
      step2_status, step2_proof_url, step2_event_datetime, overall_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      wfId1,
      wfNo1,
      'งวดที่ 1/2569 โครงการสงเคราะห์ผู้ประสบภัยฉุกเฉินและฟื้นฟูอาชีพ',
      bankAccountId,
      100000,
      '2026-10-21',
      '2026-10-21T09:00:00',
      'u-1',
      'อิบรอฮีม มานะชัย (ผู้ดูแลระบบสูงสุด)',
      'completed',
      'https://storage.zms.org/slips/bank-step1-sample.pdf',
      'custodian-ruslan',
      'นายรุสลัน หะสาเมาะ (เหรัญญิกมูลนิธิ)',
      100000,
      100000,
      'received',
      'https://storage.zms.org/slips/treasurer-receipt-sample.pdf',
      '2026-10-21T10:00:00',
      'in_progress'
    ]
  });

  // Seed Voucher 1: Aid cash
  const vId1 = 'cw-demo-aid-01';
  await db.execute({
    sql: `INSERT INTO cash_flow_withdrawals (
      id, workflow_id, withdrawal_no, voucher_type, amount, requested_amount, approved_amount,
      withdrawal_datetime, withdrawer_id, withdrawer_name, target_asnaf, purpose, status, proof_url
    ) VALUES (?, ?, '01/2569', 'aid_disbursement', 45000, 45000, 45000, '2026-10-21T11:30:00', 'u-5', 'ฟาติมะฮ์ หวังดี (เจ้าหน้าที่การเงิน)', 'faqir_miskin', 'เบิกเงินสดจ่ายสงเคราะห์ยังชีพฉุกเฉิน', 'completed', 'https://storage.zms.org/slips/voucher-01-aid.pdf')`,
    args: [vId1, wfId1]
  });

  // Seed household & beneficiaries & applications if needed
  const hhId = 'hh-demo-active';
  const benId1 = 'ben-demo-1';
  const benId2 = 'ben-demo-2';
  const appId1 = 'app-demo-1';
  const appId2 = 'app-demo-2';

  await db.execute({
    sql: `INSERT OR IGNORE INTO households (id, household_no, address, province, district, subdistrict, community)
          VALUES (?, 'HH-DEMO-2569', '45/1 หมู่ 2', 'ปัตตานี', 'เมืองปัตตานี', 'รูสะมิแล', 'ชุมชนรูสะมิแล')`,
    args: [hhId]
  });

  await db.execute({
    sql: `INSERT OR IGNORE INTO beneficiaries (id, household_id, registration_no, registration_status, registered_date, full_name, national_id, phone, asnaf_category)
          VALUES 
          (?, ?, 'REG-2569-0101', 'qualified', '2026-03-01', 'นางคอดีเยาะห์ ดาโอ๊ะ', '1940100888991', '0819998877', 'fakir'),
          (?, ?, 'REG-2569-0102', 'qualified', '2026-03-01', 'นายมะหะมะ สะมะแอ', '1940100888992', '0829998877', 'miskin')`,
    args: [benId1, hhId, benId2, hhId]
  });

  await db.execute({
    sql: `INSERT OR IGNORE INTO assistance_applications (
      id, application_no, beneficiary_id, asnaf_category, requested_amount, approved_amount, disbursed_amount, status, assigned_officer_id, assigned_officer_name, applied_date
    ) VALUES 
    (?, 'APP-2569-0101', ?, 'fakir', 25000, 25000, 25000, 'disbursed', 'u-3', 'อุสมาน เจริญสุข', '2026-03-01'),
    (?, 'APP-2569-0102', ?, 'miskin', 20000, 20000, 20000, 'disbursed', 'u-3', 'อุสมาน เจริญสุข', '2026-03-01')`,
    args: [appId1, benId1, appId2, benId2]
  });

  await db.execute({
    sql: `INSERT INTO cash_flow_disbursement_items (
      id, withdrawal_id, workflow_id, application_id, beneficiary_id, beneficiary_name,
      national_id, asnaf_category, assistance_type, approved_amount, this_disbursement_amount,
      remaining_balance, status
    ) VALUES 
    ('di-demo-1', ?, ?, ?, ?, 'นางคอดีเยาะห์ ดาโอ๊ะ', '1940100888991', 'fakir', 'เงินสงเคราะห์เพื่อการยังชีพ', 25000, 25000, 0, 'confirmed'),
    ('di-demo-2', ?, ?, ?, ?, 'นายมะหะมะ สะมะแอ', '1940100888992', 'miskin', 'เงินสงเคราะห์เพื่อการยังชีพ', 20000, 20000, 0, 'confirmed')`,
    args: [vId1, wfId1, appId1, benId1, vId1, wfId1, appId2, benId2]
  });

  // Seed Voucher 2: Office Petty Cash - Cleared
  const vId2 = 'cw-demo-petty-02';
  await db.execute({
    sql: `INSERT INTO cash_flow_withdrawals (
      id, workflow_id, withdrawal_no, voucher_type, amount, requested_amount, approved_amount,
      withdrawal_datetime, withdrawer_id, withdrawer_name, target_asnaf, purpose, status,
      clearance_status, expense_category, clearance_spent_amount, clearance_returned_amount, clearance_proof_url, clearance_notes, clearance_date
    ) VALUES (?, ?, '02/2569', 'office_expense', 10000, 10000, 10000, '2026-10-21T14:00:00', 'u-5', 'ฟาติมะฮ์ หวังดี (เจ้าหน้าที่การเงิน)', 'amileen', 'ค่าใช้จ่ายและค่าจัดประชุมจัดซื้อเวชภัณฑ์', 'completed', 'cleared', 'OFFICE_EXPENSES', 8500, 1500, 'https://storage.zms.org/receipts/petty-clearance-02.pdf', 'จัดซื้อเวชภัณฑ์ฉุกเฉิน 8,500 บาท นำเงินสดคงเหลือ 1,500 บาท คืนให้เหรัญญิกเรียบร้อย', '2026-10-21')`,
    args: [vId2, wfId1]
  });

  console.log('✓ Seeded active workflow CFW-2569-0001 (Ready for Step 5 Review/Close)');

  // 2. Seed Completed Workflow (CFW-2569-0002)
  const wfId2 = 'cfw-demo-closed-2569';
  const wfNo2 = 'CFW-2569-0002';

  await db.execute({ sql: 'DELETE FROM workflow_attachments WHERE workflow_id = ?', args: [wfId2] });
  await db.execute({ sql: 'DELETE FROM cash_flow_disbursement_items WHERE workflow_id = ?', args: [wfId2] });
  await db.execute({ sql: 'DELETE FROM cash_flow_withdrawals WHERE workflow_id = ?', args: [wfId2] });
  await db.execute({ sql: 'DELETE FROM cash_flow_workflows WHERE id = ?', args: [wfId2] });

  await db.execute({
    sql: `INSERT INTO cash_flow_workflows (
      id, workflow_no, title, step1_bank_account_id, step1_withdraw_amount, step1_date,
      step1_event_datetime, step1_operator_id, step1_operator_name, step1_status, step1_proof_url,
      step2_treasurer_id, step2_treasurer_name, step2_deposit_amount, step2_handover_amount,
      step2_status, step2_proof_url, step2_event_datetime,
      step5_reconciled_amount, step5_remaining_cash, step5_auditor_id, step5_auditor_name,
      step5_closed_at, step5_proof_url, step5_notes, step5_status,
      step5_unallocated_amount, step5_confirmed_aid_amount, step5_confirmed_other_expense_amount,
      step5_voucher_count, step5_assistance_case_count, step5_pending_items_count, step5_missing_proof_count,
      step5_discrepancy_amount, step5_discrepancy_reason,
      overall_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      wfId2,
      wfNo2,
      'งวดพิเศษ โครงการรอมฎอนสัมพันธ์และแจกถุงยังชีพประจำปี',
      bankAccountId,
      50000,
      '2026-10-15',
      '2026-10-15T09:00:00',
      'u-1',
      'อิบรอฮีม มานะชัย (ผู้ดูแลระบบสูงสุด)',
      'completed',
      'https://storage.zms.org/slips/bank-step1-wf2.pdf',
      'custodian-ruslan',
      'นายรุสลัน หะสาเมาะ (เหรัญญิกมูลนิธิ)',
      50000,
      50000,
      'received',
      'https://storage.zms.org/slips/treasurer-receipt-wf2.pdf',
      '2026-10-15T10:00:00',
      50000,
      0,
      'u-1',
      'อิบรอฮีม มานะชัย (ผู้ดูแลระบบสูงสุด)',
      '2026-10-16T16:30:00',
      'https://storage.zms.org/audit/audit-signoff-wf2.pdf',
      'ตรวจสอบยอดเงินสดครบถ้วนตรงตามหลักฐานและใบสำคัญจ่ายทั้งหมด ปิดรอบการเบิกจ่ายตามระเบียบมูลนิธิ',
      'completed',
      0,
      50000,
      0,
      1,
      2,
      0,
      0,
      0,
      'ตรงตามยอดถอนและรับมอบทุกประการ',
      'completed'
    ]
  });

  const vIdClosed = 'cw-demo-closed-01';
  await db.execute({
    sql: `INSERT INTO cash_flow_withdrawals (
      id, workflow_id, withdrawal_no, voucher_type, amount, requested_amount, approved_amount,
      withdrawal_datetime, withdrawer_id, withdrawer_name, target_asnaf, purpose, status, proof_url
    ) VALUES (?, ?, '01/2569-WF2', 'aid_disbursement', 50000, 50000, 50000, '2026-10-15T11:00:00', 'u-5', 'ฟาติมะฮ์ หวังดี (เจ้าหน้าที่การเงิน)', 'faqir_miskin', 'เบิกเงินสดแจกจ่ายสงเคราะห์ครอบครัวยากจน', 'completed', 'https://storage.zms.org/slips/voucher-wf2.pdf')`,
    args: [vIdClosed, wfId2]
  });

  await db.execute({
    sql: `INSERT INTO cash_flow_disbursement_items (
      id, withdrawal_id, workflow_id, application_id, beneficiary_id, beneficiary_name,
      national_id, asnaf_category, assistance_type, approved_amount, this_disbursement_amount,
      remaining_balance, status
    ) VALUES 
    ('di-closed-1', ?, ?, ?, ?, 'นางคอดีเยาะห์ ดาโอ๊ะ', '1940100888991', 'fakir', 'เงินสงเคราะห์เพื่อการยังชีพ', 25000, 25000, 0, 'confirmed'),
    ('di-closed-2', ?, ?, ?, ?, 'นายมะหะมะ สะมะแอ', '1940100888992', 'miskin', 'เงินสงเคราะห์เพื่อการยังชีพ', 25000, 25000, 0, 'confirmed')`,
    args: [vIdClosed, wfId2, appId1, benId1, vIdClosed, wfId2, appId2, benId2]
  });

  console.log('✓ Seeded completed and locked workflow CFW-2569-0002');
  console.log('Seeding demo workflows finished successfully!');
}

seedDemoWorkflows().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
