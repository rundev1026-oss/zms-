import { initDb, getDb } from '@/lib/db';
import { createServiceToken } from '@/lib/apiProxy';

/**
 * Ensures an assistance application from PostgreSQL (NestJS) is synced into SQLite
 * so that all financial ledger, disbursement, and workflow operations succeed seamlessly.
 */
export async function ensureApplicationInSqlite(applicationId: string): Promise<boolean> {
  if (!applicationId) return false;
  try {
    await initDb();
    const db = getDb();

    // Check if it already exists in SQLite
    const existing = await db.execute({
      sql: 'SELECT id, application_no FROM assistance_applications WHERE id = ?',
      args: [applicationId],
    });
    if (existing.rows.length > 0) {
      return true;
    }

    // Fetch full application from NestJS API
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
    const token = createServiceToken();
    const res = await fetch(`${API_BASE}/assistance-requests/${applicationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return false;
    }

    const json = await res.json();
    const app = json.data || json;
    if (!app || !app.id) {
      return false;
    }

    return await upsertApplicationIntoSqlite(app);
  } catch (err) {
    console.error('ensureApplicationInSqlite error:', err);
    return false;
  }
}

/**
 * Upserts an application object into SQLite assistance_applications and ensures
 * linked beneficiary and household records exist in SQLite.
 */
export async function upsertApplicationIntoSqlite(app: any): Promise<boolean> {
  if (!app || !app.id) return false;
  try {
    await initDb();
    const db = getDb();

    // 1. Ensure linked Beneficiary and Household exist
    if (app.beneficiaryId) {
      const benCheck = await db.execute({
        sql: 'SELECT id FROM beneficiaries WHERE id = ?',
        args: [app.beneficiaryId],
      });

      if (benCheck.rows.length === 0) {
        const ben = app.beneficiary || {};
        const hhId = `hh-${String(app.beneficiaryId).slice(0, 18)}`;
        
        await db.execute({
          sql: `INSERT OR IGNORE INTO households (id, household_no, address, district, province, community)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            hhId,
            `HH-${ben.memberId || ben.id?.slice?.(0, 8) || Date.now().toString().slice(-6)}`,
            app.address || ben.address || 'ตามทะเบียน',
            app.district || ben.district || 'เมืองยะลา',
            app.province || ben.province || 'ยะลา',
            app.community || ben.community || 'สำนักงานกลาง',
          ],
        });

        await db.execute({
          sql: `INSERT OR IGNORE INTO beneficiaries (
            id, household_id, full_name, national_id, phone, asnaf_category,
            title_prefix, registration_no, branch_id, branch_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            app.beneficiaryId,
            hhId,
            ben.fullName || `${ben.firstName || ''} ${ben.lastName || ''}`.trim() || 'ผู้ขอรับความช่วยเหลือ',
            ben.identityNumber || ben.nationalId || ben.thaiNationalId || '0000000000000',
            ben.phone || '0000000000',
            app.asnafCategory || 'faqir_miskin',
            ben.title || 'นาย',
            ben.memberId || ben.registryNumber || 'REG-2569-0001',
            app.branchId || 'br-hq',
            app.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร',
          ],
        });
      }
    }

    // 2. Upsert application into SQLite
    await db.execute({
      sql: `INSERT INTO assistance_applications (
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
      )
      ON CONFLICT(id) DO UPDATE SET
        application_no = excluded.application_no,
        status = excluded.status,
        requested_amount = excluded.requested_amount,
        approved_amount = COALESCE(excluded.approved_amount, assistance_applications.approved_amount),
        disbursed_amount = COALESCE(excluded.disbursed_amount, assistance_applications.disbursed_amount),
        assistance_format_id = COALESCE(excluded.assistance_format_id, assistance_applications.assistance_format_id),
        assistance_format_code = COALESCE(excluded.assistance_format_code, assistance_applications.assistance_format_code),
        assistance_format_name = COALESCE(excluded.assistance_format_name, assistance_applications.assistance_format_name),
        delivery_method = COALESCE(excluded.delivery_method, assistance_applications.delivery_method),
        updated_at = CURRENT_TIMESTAMP`,
      args: [
        app.id,
        app.applicationNo || app.id,
        app.beneficiaryId,
        app.asnafCategory || 'faqir_miskin',
        Number(app.requestedAmount || 0),
        app.approvedAmount ? Number(app.approvedAmount) : null,
        app.disbursedAmount ? Number(app.disbursedAmount) : null,
        app.status || 'submitted',
        app.urgencyLevel || 'normal',
        app.assignedOfficerId || 'u-1',
        app.assignedOfficerName || 'ผู้ดูแลระบบ',
        app.appliedDate ? String(app.appliedDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
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
        app.requestStatus || app.status || 'submitted',
        app.assessmentStatus || 'pending',
        app.approvalStatus || 'pending',
        app.paymentStatus || 'unpaid',
        app.deliveryStatus || 'pending',
        app.followupStatus || 'pending',
        app.completionStatus || 'in_progress',
      ],
    });

    return true;
  } catch (err) {
    console.error('upsertApplicationIntoSqlite error:', err);
    return false;
  }
}

/**
 * Syncs status update from SQLite / Next.js back to NestJS / PostgreSQL
 */
export async function syncStatusToNest(applicationId: string, status: string, notes?: string): Promise<boolean> {
  if (!applicationId) return false;
  try {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
    const token = createServiceToken();
    const res = await fetch(`${API_BASE}/assistance-requests/${applicationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, notes: notes || '' }),
    });
    return res.ok;
  } catch (err) {
    console.error('syncStatusToNest error:', err);
    return false;
  }
}
