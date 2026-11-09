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

    // 1. Try proxying to NestJS API
    try {
      const nestRes = await proxyToNest(`/approvals/${id}/budget-status`, request, {
        method: 'GET',
      });
      if (nestRes.ok) {
        const nestData = await nestRes.json();
        return NextResponse.json({ success: true, data: nestData });
      }
    } catch {}

    // 2. Fallback to SQLite
    await initDb();
    const db = getDb();

    const appRes = await db.execute({
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
      return NextResponse.json(
        { success: false, error: `ไม่พบคำร้องรหัส ${id}` },
        { status: 404 }
      );
    }

    const app = appRes.rows[0];

    const asnafRaw = String(app.asnaf_category || 'faqir_miskin');
    const assistanceTypeStr = String(app.assistance_type || '');
    const assistanceTypeIdStr = app.assistance_type_id ? String(app.assistance_type_id) : undefined;

    // Strict Assistance Type-driven Sub-Fund Resolution (No random default!)
    const subKey = matchCanonicalSubKey(assistanceTypeStr, assistanceTypeIdStr, undefined, asnafRaw);
    let sf: any = null;

    if (subKey) {
      const canonicalSub = CANONICAL_SUB_FUNDS[subKey];
      const sfRes = await db.execute({
        sql: `SELECT id, code, fund_code, name, primary_group_code, fund_account_id,
                     allocated_amount, committed_amount, disbursed_amount, remaining_amount, is_active
              FROM faqir_miskin_sub_funds
              WHERE id = ? OR code = ? OR fund_code = ? LIMIT 1`,
        args: [canonicalSub.id, canonicalSub.code, canonicalSub.fundCode],
      });
      sf = sfRes.rows.length > 0 ? sfRes.rows[0] : canonicalSub;
    }

    // Auto-resolve main fund from Asnaf & sub-fund
    const mainCode = matchCanonicalMainFundCode(asnafRaw, subKey);
    let fund: any = null;
    if (mainCode) {
      const canonicalMain = CANONICAL_MAIN_FUNDS[mainCode];
      const fundRes = await db.execute({
        sql: `SELECT id, code, name, category, total_received, committed_amount, disbursed_amount, available_amount, is_active
              FROM fund_accounts
              WHERE id = ? OR code = ? LIMIT 1`,
        args: [canonicalMain.id, canonicalMain.code],
      });
      fund = fundRes.rows.length > 0 ? fundRes.rows[0] : canonicalMain;
    }

    const asnafLabels: Record<string, string> = {
      faqir_miskin: 'ฟากีร–มิสกิน (Faqir & Miskin)',
      faqir: 'ฟากีร (The Destitute)',
      miskin: 'มิสกิน (The Needy)',
      amil: 'อามิลีน (Amil / Zakat Admin)',
      muallaf: 'มุอัลลัฟ (Muallaf)',
      gharimin: 'อัล-ฆอรีมีน (Gharimin / Debtors)',
      fisabilillah: 'ฟีสะบีลิลลาฮ์ (Fi Sabilillah)',
      ibnsabil: 'อิบนุสสะบีล (Ibn Sabil / Wayfarer)',
      humanitarian: 'มนุษยธรรมและบรรเทาทุกข์',
    };

    const asnafCode = String(app.asnaf_category || 'faqir_miskin');
    const asnafDisplayName = asnafLabels[asnafCode] || asnafCode;
    const requestedAmount = Number(app.requested_amount || 0);
    const recommendedAmount = app.recommended_amount ? Number(app.recommended_amount) : requestedAmount;

    const mainAllocated = fund ? Number(fund.total_received || 0) : 0;
    const mainDisbursed = fund ? Number(fund.disbursed_amount || 0) : 0;
    const mainCommitted = fund ? Number(fund.committed_amount || 0) : 0;
    const mainAvailable = fund ? Number(fund.available_amount || 0) : 0;

    let subAllocated = sf ? Number(sf.allocated_amount || 0) : 0;
    let subDisbursed = sf ? Number(sf.disbursed_amount || 0) : 0;
    let subCommitted = sf ? Number(sf.committed_amount || 0) : 0;
    let subAvailable = sf ? Number(sf.remaining_amount || 0) : 0;

    try {
      const { FinancialService } = await import('@/services/financialService');
      const sfList = await FinancialService.getSpecificFunds({
        fiscalYear: '2569',
        primaryGroupCode: String(sf?.primary_group_code || 'faqir_miskin'),
        status: 'all',
      });
      const liveSf = sfList.find((s) => s.id === sf?.id || s.code === sf?.code || s.fundCode === sf?.fund_code);
      if (liveSf) {
        subAllocated = Number(liveSf.allocatedAmount ?? subAllocated);
        subDisbursed = Number(liveSf.disbursedAmount ?? subDisbursed);
        subCommitted = Number(liveSf.committedAmount ?? subCommitted);
        subAvailable = Number(liveSf.remainingAmount ?? subAvailable);
      }
    } catch {}

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
          mainFund: fund
            ? {
                id: String(fund.id),
                code: String(fund.code || ''),
                name: String(fund.name),
                category: String(fund.category || ''),
                isActive: Number(fund.is_active ?? 1) === 1,
                isAutoResolved: true,
              }
            : null,
          subFund: sf
            ? {
                id: String(sf.id),
                code: String(sf.code || sf.fund_code || ''),
                fundCode: sf.fund_code ? String(sf.fund_code) : undefined,
                name: String(sf.name),
                primaryGroupCode: String(sf.primary_group_code || 'faqir_miskin'),
                isActive: Number(sf.is_active ?? 1) === 1,
                isAutoResolved: true,
              }
            : null,
        },
        budgetStatus: {
          mainFund: {
            allocated: mainAllocated,
            disbursed: mainDisbursed,
            committed: mainCommitted,
            availableBeforeApproval: mainAvailable,
          },
          subFund: {
            allocated: subAllocated,
            disbursed: subDisbursed,
            committed: subCommitted,
            availableBeforeApproval: subAvailable,
          },
        },
        isResolvable: Boolean(fund && sf),
        isMapped: Boolean(fund && sf),
        unmappedWarning: (fund && sf) ? null : UNMAPPED_FUND_WARNING,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะงบประมาณ' },
      { status: 500 }
    );
  }
}
