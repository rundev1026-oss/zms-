import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';
import { initDb, getDb } from '@/lib/db';
import { BeneficiaryService } from '@/services/beneficiaryService';
import {
  matchCanonicalSubKey,
  matchCanonicalMainFundCode,
  CANONICAL_SUB_FUNDS,
  CANONICAL_MAIN_FUNDS,
  UNMAPPED_FUND_WARNING,
} from '@/lib/fundResolution';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const requestedApprovedParam = searchParams.get('approvedAmount');

    await initDb();
    const db = getDb();

    // Ensure application exists in SQLite (auto-sync from NestJS PostgreSQL if needed)
    let appRes = await db.execute({
      sql: `SELECT a.id, a.application_no, a.asnaf_category, a.assistance_type, a.assistance_type_id,
                   a.specific_fund_id, a.primary_group_code, a.requested_amount, a.approved_amount, a.status,
                   b.full_name, b.national_id,
                   ass.recommended_amount, ass.recommended_fund_id, ass.recommended_specific_fund_id
            FROM assistance_applications a
            LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
            LEFT JOIN beneficiary_assessments ass ON ass.application_id = a.id
            WHERE a.id = ? OR a.application_no = ? LIMIT 1`,
      args: [id, id],
    });

    if (appRes.rows.length === 0) {
      try {
        const { ensureApplicationInSqlite } = await import('@/lib/syncAssistanceRequest');
        const synced = await ensureApplicationInSqlite(id);
        if (synced) {
          appRes = await db.execute({
            sql: `SELECT a.id, a.application_no, a.asnaf_category, a.assistance_type, a.assistance_type_id,
                         a.specific_fund_id, a.primary_group_code, a.requested_amount, a.approved_amount, a.status,
                         b.full_name, b.national_id,
                         ass.recommended_amount, ass.recommended_fund_id, ass.recommended_specific_fund_id
                  FROM assistance_applications a
                  LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
                  LEFT JOIN beneficiary_assessments ass ON ass.application_id = a.id
                  WHERE a.id = ? OR a.application_no = ? LIMIT 1`,
            args: [id, id],
          });
        }
      } catch {}
    }

    if (appRes.rows.length === 0) {
      // Fallback to NestJS if still not found
      try {
        const nestRes = await proxyToNest(`/approvals/${id}/budget-status`, request, {
          method: 'GET',
        });
        if (nestRes.ok) {
          const nestData = await nestRes.json();
          return NextResponse.json({ success: true, data: nestData });
        }
      } catch {}
      return NextResponse.json(
        { success: false, error: `ไม่พบคำร้องรหัส ${id}` },
        { status: 404 }
      );
    }

    const app = appRes.rows[0];
    const requestedAmount = Number(app.requested_amount || 0);
    const recommendedAmount = app.recommended_amount ? Number(app.recommended_amount) : requestedAmount;
    const targetApproveAmt =
      requestedApprovedParam !== null && requestedApprovedParam !== ''
        ? Number(requestedApprovedParam)
        : Number(app.approved_amount || recommendedAmount || requestedAmount || 0);

    // Run authoritative 3-tier solvency check against FinancialService
    const solvency = await BeneficiaryService.checkFundSolvencyForApproval({
      applicationId: String(app.id),
      approvedAmount: targetApproveAmt,
    });

    const asnafLabels: Record<string, string> = {
      faqir_miskin: 'ฟากีร–มิสกิน (Faqir & Miskin)',
      faqir: 'ฟากีร (The Destitute)',
      miskin: 'มิสกิน (The Needy)',
      amil: 'อามีลีน (Amil / Zakat Admin)',
      muallaf: 'มุอัลลัฟ (Muallaf)',
      gharimin: 'อัลฆอรีมีน (Gharimin / Debtors)',
      fisabilillah: 'ฟีสาบิลิลละฮ์ (Fi Sabilillah)',
      ibnsabil: 'อิบนุสสะบีล (Ibn Sabil / Wayfarer)',
      humanitarian: 'มนุษยธรรมและบรรเทาทุกข์',
    };

    const asnafCode = String(solvency.asnafAllocation?.asnafCode || app.asnaf_category || 'faqir_miskin');
    const asnafDisplayName = asnafLabels[asnafCode] || solvency.asnafAllocation?.asnafName || asnafCode;
    const fullName = String(app.full_name || '');

    return NextResponse.json({
      success: true,
      data: {
        applicationId: String(app.id),
        applicationNo: String(app.application_no),
        status: String(app.status),
        requestInfo: {
          beneficiaryName: fullName,
          beneficiaryRegistryNo: String(app.registry_number || ''),
          asnafCategory: asnafCode,
          asnafDisplayName,
          assistanceType: String(app.assistance_type || 'ปัจจัยยังชีพ'),
          assistanceTypeId: app.assistance_type_id ? String(app.assistance_type_id) : undefined,
          assistanceFormat: 'โอนเงินเข้าบัญชี (Bank Transfer)',
          requestedAmount,
          recommendedAmount,
        },
        resolvedFunds: {
          moneyType: solvency.moneyTypePool || null,
          asnafAllocation: solvency.asnafAllocation || null,
          mainFund: {
            id: solvency.fundAccount.id,
            code: solvency.fundAccount.code,
            name: solvency.fundAccount.name,
            category: solvency.fundAccount.category || 'zakat',
            isActive: true,
            isAutoResolved: true,
          },
          subFund: {
            id: solvency.specificSubFund.id,
            code: solvency.specificSubFund.code,
            name: solvency.specificSubFund.name,
            primaryGroupCode: asnafCode,
            isActive: true,
            isAutoResolved: true,
          },
        },
        budgetStatus: {
          moneyType: solvency.moneyTypePool
            ? {
                code: solvency.moneyTypePool.code,
                name: solvency.moneyTypePool.name,
                allocated: solvency.moneyTypePool.totalReceived,
                disbursed: solvency.moneyTypePool.disbursedAmount,
                committed: solvency.moneyTypePool.committedAmount,
                availableBeforeApproval: solvency.moneyTypePool.availableBeforeApproval,
                remainingAfterApproval: solvency.moneyTypePool.remainingAfterApproval,
                isSolvent: solvency.moneyTypePool.isSolvent,
              }
            : null,
          asnafAllocation: solvency.asnafAllocation
            ? {
                asnafCode: solvency.asnafAllocation.asnafCode,
                asnafName: solvency.asnafAllocation.asnafName,
                allocated: solvency.asnafAllocation.allocatedAmount ?? 0,
                disbursed: solvency.asnafAllocation.disbursedAmount ?? 0,
                committed: solvency.asnafAllocation.committedAmount ?? 0,
                availableBeforeApproval:
                  solvency.asnafAllocation.availableBeforeApproval ?? solvency.asnafAllocation.remainingAmount,
                remainingAfterApproval:
                  solvency.asnafAllocation.remainingAfterApproval ??
                  (solvency.asnafAllocation.remainingAmount - targetApproveAmt),
                isSolvent: solvency.asnafAllocation.isSolvent ?? true,
              }
            : null,
          mainFund: {
            allocated: solvency.fundAccount.totalReceived ?? 0,
            disbursed: solvency.fundAccount.disbursedAmount ?? 0,
            committed: solvency.fundAccount.committedAmount,
            availableBeforeApproval:
              solvency.fundAccount.availableBeforeApproval ?? solvency.fundAccount.availableAmount,
            remainingAfterApproval:
              solvency.fundAccount.remainingAfterApproval ??
              (solvency.fundAccount.availableAmount - targetApproveAmt),
          },
          subFund: {
            allocated: solvency.specificSubFund.allocatedAmount ?? 0,
            disbursed: solvency.specificSubFund.disbursedAmount ?? 0,
            committed: solvency.specificSubFund.committedAmount,
            availableBeforeApproval:
              solvency.specificSubFund.availableBeforeApproval ?? solvency.specificSubFund.remainingAmount,
            remainingAfterApproval:
              solvency.specificSubFund.remainingAfterApproval ??
              (solvency.specificSubFund.remainingAmount - targetApproveAmt),
            isSolvent: solvency.specificSubFund.isSolvent ?? true,
          },
        },
        isSolvent: solvency.isSolvent,
        reason: solvency.reason || null,
        isResolvable: true,
        isMapped: true,
        unmappedWarning: null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะงบประมาณ' },
      { status: 500 }
    );
  }
}
