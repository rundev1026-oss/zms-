import { createClient } from '@libsql/client';

async function main() {
  const client = createClient({ url: 'file:data/zms.db' });
  const nestRes = await fetch('http://localhost:3000/api/assistance-requests/a9d6e5c1-c480-4a10-ab41-a3a2d0e723b4');
  const nestJson = await nestRes.json();
  console.log('Nest app data:', nestJson.success, nestJson.data?.applicationNo);
  const app = nestJson.data;

  // Insert into SQLite assistance_applications
  await client.execute({
    sql: `INSERT OR REPLACE INTO assistance_applications (
      id, application_no, beneficiary_id, asnaf_category, requested_amount,
      approved_amount, disbursed_amount, status, urgency_level,
      assigned_officer_id, assigned_officer_name, applied_date,
      branch_id, branch_name, hardship_reasons, assistance_type,
      assistance_type_details, necessity_details, member_id, registration_no,
      assistance_type_id, assistance_group, primary_group_code,
      specific_fund_id, specific_fund_code, specific_fund_name,
      fiscal_year, assistance_format_id, assistance_format_code,
      assistance_format_name, delivery_method, request_status,
      assessment_status, approval_status, payment_status, delivery_status,
      followup_status, completion_status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )`,
    args: [
      app.id,
      app.applicationNo,
      app.beneficiaryId,
      app.asnafCategory || 'faqir_miskin',
      Number(app.requestedAmount || 0),
      app.approvedAmount ? Number(app.approvedAmount) : null,
      app.disbursedAmount ? Number(app.disbursedAmount) : null,
      app.status || 'submitted',
      app.urgencyLevel || 'normal',
      app.assignedOfficerId || 'u-1',
      app.assignedOfficerName || 'ผู้ดูแลระบบ',
      app.appliedDate ? app.appliedDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      app.branchId || 'br-hq',
      app.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร',
      app.hardshipReasons || '',
      app.assistanceType || 'ปัจจัยยังชีพ',
      app.assistanceTypeDetails || '',
      app.necessityDetails || '',
      app.memberId || '',
      app.registrationNo || '',
      app.assistanceTypeId || null,
      app.assistanceGroup || 'core',
      app.primaryGroupCode || 'faqir_miskin',
      app.specificFundId || null,
      app.specificFundCode || null,
      app.specificFundName || null,
      app.fiscalYear || '2569',
      app.assistanceFormatId || null,
      app.assistanceFormatCode || null,
      app.assistanceFormatName || null,
      app.deliveryMethod || null,
      app.requestStatus || 'submitted',
      app.assessmentStatus || 'pending',
      app.approvalStatus || 'pending',
      app.paymentStatus || 'unpaid',
      app.deliveryStatus || 'pending',
      app.followupStatus || 'pending',
      app.completionStatus || 'in_progress'
    ]
  });

  console.log('Inserted into SQLite assistance_applications successfully!');

  // Test financial-ledger endpoint
  const flRes = await fetch('http://localhost:3000/api/assistance-requests/a9d6e5c1-c480-4a10-ab41-a3a2d0e723b4/financial-ledger');
  const flJson = await flRes.json();
  console.log('financial-ledger status:', flRes.status, 'data:', flJson);

  // Test assistance-link endpoint
  const alRes = await fetch('http://localhost:3000/api/finance/assistance-link?applicationId=a9d6e5c1-c480-4a10-ab41-a3a2d0e723b4&actorId=dffb49d1-7cf3-4593-bb58-a82b25f5bff4&actorName=Admin&actorRole=super_admin');
  const alJson = await alRes.json();
  console.log('assistance-link status:', alRes.status, 'success:', alJson.success);
}

main().catch(console.error);
