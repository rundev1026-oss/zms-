const { createClient } = require('@libsql/client');
const client = createClient({ url: 'file:data/zms.db' });

async function seed() {
  await client.execute(`
    INSERT INTO households (id, household_no, address, district, province, community)
    VALUES ('hh-system', 'HH-SYS', 'สำนักงานมูลนิธิซะกาต', 'เมือง', 'ยะลา', 'สำนักงานกลาง')
    ON CONFLICT(id) DO NOTHING;
  `);
  await client.execute(`
    INSERT INTO beneficiaries (id, household_id, full_name, national_id, phone, asnaf_category)
    VALUES ('ben-system-internal', 'hh-system', 'ระบบการเงินภายในมูลนิธิ (ZMS Internal Finance)', '0000000000000', '0000000000', 'operational')
    ON CONFLICT(id) DO NOTHING;
  `);
  await client.execute(`
    INSERT INTO assistance_applications (
      id, application_no, beneficiary_id, asnaf_category, requested_amount,
      assigned_officer_id, assigned_officer_name, applied_date,
      request_status, assessment_status, approval_status, payment_status,
      delivery_status, followup_status, completion_status
    ) VALUES (
      'app-system-internal', 'SYS-INTERNAL-TXN', 'ben-system-internal', 'operational', 0,
      'u-1', 'ผู้ดูแลระบบ', '2026-01-01',
      'completed', 'completed', 'approved', 'completed',
      'delivered', 'not_required', 'completed'
    ) ON CONFLICT(id) DO NOTHING;
  `);
  await client.execute(`
    INSERT INTO cash_flow_workflows (
      id, workflow_no, title, step1_bank_account_id, step1_withdraw_amount, step1_date,
      step1_operator_id, step1_operator_name, step1_status, step2_status, overall_status
    ) VALUES (
      'wf-internal-float', 'WF-FLOAT-SYS', 'วงเงินสดสำรองทดรองจ่ายปฏิบัติการสำนักงาน', 'bank-1', 0, '2026-01-01',
      'u-1', 'ผู้ดูแลระบบ', 'completed', 'received', 'in_progress'
    ) ON CONFLICT(id) DO NOTHING;
  `);
  await client.execute(`
    INSERT INTO cash_flow_withdrawals (
      id, workflow_id, withdrawal_no, amount, withdrawal_datetime, withdrawer_id, withdrawer_name,
      purpose, target_asnaf, status, voucher_type, clearance_status
    ) VALUES (
      'wth-aid-direct', 'wf-internal-float', 'VOU-AID-DIRECT', 0, '2026-01-01 00:00:00', 'u-1', 'ผู้ดูแลระบบ',
      'จ่ายเงินสดช่วยเหลือผู้ขอรับ', 'faqir_miskin', 'disbursed', 'aid_disbursement', 'cleared'
    ) ON CONFLICT(id) DO NOTHING;
  `);
  await client.execute(`
    INSERT INTO cash_flow_withdrawals (
      id, workflow_id, withdrawal_no, amount, withdrawal_datetime, withdrawer_id, withdrawer_name,
      purpose, target_asnaf, status, voucher_type, clearance_status
    ) VALUES (
      'wth-admin-direct', 'wf-internal-float', 'VOU-ADM-DIRECT', 0, '2026-01-01 00:00:00', 'u-1', 'ผู้ดูแลระบบ',
      'จ่ายเงินสดค่าใช้จ่ายบริหารสำนักงาน', 'operational', 'disbursed', 'office_expense', 'cleared'
    ) ON CONFLICT(id) DO NOTHING;
  `);
  console.log('Seeded system placeholder and internal cash workflows successfully!');
}

seed().catch(console.error);
