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

    // Check if it already exists in SQLite and has completed assessment
    const existing = await db.execute({
      sql: 'SELECT id, application_no, assessment_status FROM assistance_applications WHERE id = ?',
      args: [applicationId],
    });
    if (existing.rows.length > 0 && existing.rows[0].assessment_status === 'completed') {
      return true;
    }

    // Try syncing assessment from NestJS if not completed
    if (existing.rows.length > 0) {
      await syncAssessmentFromNest(applicationId).catch(() => null);
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
    let resolvedBeneficiaryId = String(app.beneficiaryId || `ben-${String(app.id).slice(0, 12)}`);
    const ben = app.beneficiary || {};
    const benNationalId = String(
      app.nationalId || ben.identityNumber || ben.nationalId || ben.thaiNationalId || `99${Date.now().toString().slice(-11)}`
    );

    const benCheck = await db.execute({
      sql: 'SELECT id FROM beneficiaries WHERE id = ? OR national_id = ? LIMIT 1',
      args: [resolvedBeneficiaryId, benNationalId],
    });

    if (benCheck.rows.length > 0) {
      resolvedBeneficiaryId = String(benCheck.rows[0].id);
    } else {
      const hhId = `hh-${resolvedBeneficiaryId.slice(0, 18)}`;

      await db.execute({
        sql: `INSERT OR IGNORE INTO households (id, household_no, address, district, province, community)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          hhId,
          `HH-${ben.memberId || ben.id?.slice?.(0, 8) || Date.now().toString().slice(-6)}`,
          String(app.address || ben.address || 'ตามทะเบียน'),
          String(app.district || ben.district || 'เมืองยะลา'),
          String(app.province || ben.province || 'ยะลา'),
          String(app.community || ben.community || 'สำนักงานกลาง'),
        ],
      });

      await db.execute({
        sql: `INSERT OR IGNORE INTO beneficiaries (
          id, household_id, full_name, national_id, phone, asnaf_category,
          title_prefix, registration_no, branch_id, branch_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          resolvedBeneficiaryId,
          hhId,
          String(
            app.fullName ||
              ben.fullName ||
              `${ben.firstName || ''} ${ben.lastName || ''}`.trim() ||
              'ผู้ขอรับความช่วยเหลือ'
          ),
          benNationalId,
          String(app.phone || ben.phone || '0000000000'),
          String(app.asnafCategory || 'faqir_miskin'),
          String(app.title || ben.title || 'นาย'),
          String(app.registrationNo || ben.memberId || ben.registryNumber || `REG-${Date.now().toString().slice(-6)}`),
          String(app.branchId || 'br-hq'),
          String(app.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร'),
        ],
      });
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
        String(app.id),
        String(app.applicationNo || app.id),
        resolvedBeneficiaryId,
        String(app.asnafCategory || 'faqir_miskin'),
        Number(app.requestedAmount || 0),
        app.approvedAmount !== undefined && app.approvedAmount !== null ? Number(app.approvedAmount) : null,
        app.disbursedAmount !== undefined && app.disbursedAmount !== null ? Number(app.disbursedAmount) : null,
        String(app.status || 'submitted'),
        String(app.urgencyLevel || 'normal'),
        String(app.assignedOfficerId || 'u-officer-1'),
        String(app.assignedOfficerName || 'เจ้าหน้าที่สำรวจภาคสนาม'),
        app.appliedDate ? String(app.appliedDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
        String(app.branchId || 'br-hq'),
        String(app.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร'),
        typeof app.hardshipReasons === 'string'
          ? app.hardshipReasons
          : JSON.stringify(app.hardshipReasons || {}),
        String(app.assistanceType || 'ปัจจัยยังชีพ'),
        typeof app.assistanceTypeDetails === 'string'
          ? app.assistanceTypeDetails
          : JSON.stringify(app.assistanceTypeDetails || ''),
        String(app.necessityDetails || ''),
        String(app.memberId || ''),
        String(app.registrationNo || ''),
        app.assistanceTypeId ? String(app.assistanceTypeId) : null,
        String(app.assistanceGroup || app.assistanceTypeGroup || 'core'),
        String(app.primaryGroupCode || 'faqir_miskin'),
        app.specificFundId ? String(app.specificFundId) : null,
        app.specificFundCode ? String(app.specificFundCode) : null,
        app.specificFundName ? String(app.specificFundName) : null,
        String(app.fiscalYear || '2569'),
        app.assistanceFormatId ? String(app.assistanceFormatId) : null,
        app.assistanceFormatCode ? String(app.assistanceFormatCode) : null,
        app.assistanceFormatName ? String(app.assistanceFormatName) : null,
        app.deliveryMethod ? String(app.deliveryMethod) : null,
        String(app.requestStatus || app.status || 'submitted'),
        String(
          app.assessmentStatus ||
            (['pending_approval', 'wait_disbursement', 'approved', 'disbursed'].includes(String(app.status || '')) ||
            app.assessment ||
            app.legacyAssessment
              ? 'completed'
              : 'pending')
        ),
        String(
          app.approvalStatus ||
            (['wait_disbursement', 'approved', 'disbursed'].includes(String(app.status || ''))
              ? 'approved'
              : 'pending')
        ),
        String(app.paymentStatus || 'unpaid'),
        String(app.deliveryStatus || 'pending'),
        String(app.followupStatus || 'pending'),
        ['closed', 'terminated'].includes(String(app.completionStatus || '').toLowerCase())
          ? String(app.completionStatus)
          : 'active',
      ],
    });

    const asm = app.assessment || app.legacyAssessment;
    if (asm) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO beneficiary_assessments (
          id, application_id, assessed_by_id, assessed_by_name, assessed_date,
          living_score, housing_condition, housing_notes, debt_burden_summary,
          primary_hardship, officer_recommendation, recommended_amount, recommended_fund_id, recommended_specific_fund_id, general_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          String(asm.id || `asm-${app.id}`),
          String(app.id),
          String(asm.assessedById || 'u-1'),
          String(asm.assessedByName || 'เจ้าหน้าที่ผู้ประเมิน'),
          String(asm.assessedDate || new Date().toISOString().slice(0, 10)),
          Number(asm.livingScore || 0),
          String(asm.housingCondition || 'moderate'),
          String(asm.housingNotes || ''),
          String(asm.debtBurdenSummary || ''),
          String(asm.primaryHardship || ''),
          String(asm.officerRecommendation || 'recommend_full'),
          Number(asm.recommendedAmount || app.requestedAmount || 0),
          String(asm.recommendedFundId || 'fund-1'),
          asm.recommendedSpecificFundId ? String(asm.recommendedSpecificFundId) : null,
          String(asm.generalNotes || ''),
        ],
      }).catch(() => {});
    }

    return true;
  } catch (err) {
    console.error('upsertApplicationIntoSqlite error:', err);
    return false;
  }
}

/**
 * Syncs assessment details from PostgreSQL (NestJS) into SQLite beneficiary_assessments
 */
export async function syncAssessmentFromNest(applicationId: string): Promise<boolean> {
  if (!applicationId) return false;
  try {
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
    const token = createServiceToken();
    const res = await fetch(`${API_BASE}/assessments/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const asm = await res.json();
    if (!asm || !asm.id) return false;

    await initDb();
    const db = getDb();

    await db.execute({
      sql: `INSERT OR REPLACE INTO beneficiary_assessments (
        id, application_id, assessed_by_id, assessed_by_name, assessed_date,
        living_score, housing_condition, housing_notes, debt_burden_summary,
        primary_hardship, officer_recommendation, recommended_amount, recommended_fund_id, recommended_specific_fund_id, general_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        asm.id,
        applicationId,
        asm.assessedById || 'u-1',
        asm.assessedByName || 'เจ้าหน้าที่ผู้ประเมิน',
        asm.assessedDate || new Date().toLocaleString('th-TH', { hour12: false }),
        asm.livingScore || 0,
        asm.housingCondition || 'moderate',
        asm.housingNotes || '',
        asm.debtBurdenSummary || '',
        asm.primaryHardship || '',
        asm.officerRecommendation || 'recommend_full',
        asm.recommendedAmount || 0,
        asm.recommendedFundId || 'faqir_miskin',
        asm.recommendedSpecificFundId || null,
        asm.generalNotes || '',
      ],
    });

    await db.execute({
      sql: `UPDATE assistance_applications 
            SET status = CASE WHEN status = 'submitted' THEN 'pending_approval' ELSE status END,
                assessment_status = 'completed',
                assessment_id = ?,
                assessment_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [asm.id, asm.assessedDate || new Date().toLocaleString('th-TH', { hour12: false }), applicationId],
    });

    return true;
  } catch (err) {
    console.error('syncAssessmentFromNest error:', err);
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
