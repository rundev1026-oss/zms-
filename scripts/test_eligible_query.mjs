import { createClient } from '@libsql/client';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'zms.db');
const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;
const c = createClient({ url: dbUrl });

async function main() {
  const q = await c.execute(`
    SELECT 
      a.id,
      a.application_no,
      a.beneficiary_id,
      COALESCE(b.full_name, a.assigned_officer_name, 'ผู้ขอรับความช่วยเหลือ') as beneficiary_name,
      COALESCE(b.national_id, '-') as national_id,
      COALESCE(b.registration_no, a.registration_no, '-') as registration_no,
      a.asnaf_category,
      COALESCE(a.assistance_type, 'ปัจจัยยังชีพ') as assistance_type,
      a.assistance_type_id,
      COALESCE(a.approved_specific_fund_id, a.specific_fund_id, a.assistance_type_id) as specific_fund_id,
      COALESCE(sf.name, a.specific_fund_name, 'กองทุนเฉพาะเจาะจง') as specific_fund_name,
      COALESCE(a.approved_fund_id, sf.fund_account_id, 'fund-1') as fund_account_id,
      COALESCE(fa.name, 'กองทุนซะกาตหลัก') as fund_account_name,
      COALESCE(a.approved_amount, 0) as approved_amount,
      COALESCE(a.disbursed_amount, 0) as disbursed_amount,
      COALESCE(held.held_amount, 0) as pending_batch_amount,
      COALESCE(held.batch_numbers, '') as active_batch_numbers,
      a.status,
      a.approval_status,
      a.payment_status,
      COALESCE(a.approval_notes, a.necessity_details, a.hardship_reasons, '') as notes
    FROM assistance_applications a
    LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
    LEFT JOIN faqir_miskin_sub_funds sf ON (sf.id = a.approved_specific_fund_id OR sf.id = a.specific_fund_id OR sf.code = a.specific_fund_id)
    LEFT JOIN fund_accounts fa ON (fa.id = a.approved_fund_id OR fa.id = sf.fund_account_id)
    LEFT JOIN (
      SELECT 
        di.application_id,
        SUM(di.this_disbursement_amount) as held_amount,
        GROUP_CONCAT(cw.workflow_no) as batch_numbers
      FROM cash_flow_disbursement_items di
      JOIN cash_flow_workflows cw ON cw.id = di.workflow_id
      WHERE cw.overall_status NOT IN ('completed', 'closed', 'rejected', 'cancelled')
        AND cw.step1_status NOT IN ('rejected_for_revision', 'cancelled')
        AND di.status NOT IN ('cancelled', 'rejected')
      GROUP BY di.application_id
    ) held ON held.application_id = a.id
    WHERE 
      (a.status IN ('wait_disbursement', 'approved') OR a.approval_status = 'approved')
      AND a.status NOT IN ('pending_approval', 'submitted', 'doc_review', 'assessment', 'need_info', 'rejected', 'cancelled', 'disbursed', 'closed', 'terminated')
      AND COALESCE(a.payment_status, 'wait_disbursement') NOT IN ('completed', 'disbursed', 'not_applicable')
      AND COALESCE(a.completion_status, 'active') NOT IN ('cancelled', 'terminated', 'closed')
      AND COALESCE(a.approved_amount, 0) > 0
      AND COALESCE(a.disbursed_amount, 0) < a.approved_amount
    ORDER BY a.created_at DESC
  `);

  console.log('Filtered Eligible Applications count:', q.rows.length);
  q.rows.forEach(r => {
    const remaining = Math.max(0, Number(r.approved_amount) - Number(r.disbursed_amount) - Number(r.pending_batch_amount));
    console.log({
      id: r.id,
      appNo: r.application_no,
      name: r.beneficiary_name,
      asnaf: r.asnaf_category,
      type: r.assistance_type,
      approvedAmount: r.approved_amount,
      disbursedAmount: r.disbursed_amount,
      pendingBatchAmount: r.pending_batch_amount,
      remainingAmount: remaining,
      status: r.status,
      notes: r.notes,
    });
  });
}

main().catch(console.error);
