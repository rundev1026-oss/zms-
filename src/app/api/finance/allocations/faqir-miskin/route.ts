import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';
import { OrganizationService } from '@/services/organizationService';

function resolveStatusCode(message: string): number {
  if (message.includes('CANNOT_HARD_DELETE') || message.includes('มีอยู่ในระบบแล้ว') || message.includes('ซ้ำกับ') || message.includes('มีอยู่แล้ว')) return 409;
  if (message.startsWith('ไม่อนุญาต:') || message.includes('เฉพาะผู้ดูแลระบบ')) return 403;
  if (message.includes('ไม่พบข้อมูลกองทุน') || message.includes('ไม่พบบัญชีกองทุน')) return 404;
  return 400;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fiscalYear = searchParams.get('fiscalYear') || searchParams.get('year') || '2569';
    const view = searchParams.get('view');
    const primaryGroupCode = searchParams.get('primaryGroupCode') || searchParams.get('primaryGroup') || 'faqir_miskin';
    const fundId = searchParams.get('fundId');
    const includeInactiveParam = searchParams.get('includeInactive');
    const status = (
      searchParams.get('status') ||
      (searchParams.get('activeOnly') === '1' || searchParams.get('activeOnly') === 'true'
        ? 'active'
        : includeInactiveParam === '0' || includeInactiveParam === 'false'
          ? 'active'
          : 'all')
    ) as 'all' | 'active' | 'inactive';
    const effectiveFrom = searchParams.get('effectiveFrom') || undefined;
    const effectiveTo = searchParams.get('effectiveTo') || undefined;
    const search = searchParams.get('search') || undefined;

    if (view === 'history') {
      const history = await FinancialService.getSpecificFundHistory(fiscalYear, primaryGroupCode);
      return NextResponse.json({ success: true, data: history });
    }

    if (view === 'adjustments') {
      const adjustments = await FinancialService.getFundBudgetAdjustments({
        fiscalYear,
        primaryGroupCode,
        specificFundId: fundId || undefined,
      });
      return NextResponse.json({ success: true, data: adjustments });
    }

    if (view === 'detail' || fundId) {
      if (!fundId) {
        return NextResponse.json({ success: false, error: 'กรุณาระบุรหัสกองทุน (fundId)' }, { status: 400 });
      }
      const detail = await FinancialService.getSpecificFundById(fundId, fiscalYear);
      return NextResponse.json({ success: true, data: detail });
    }

    if (view === 'summary') {
      const [primaryGroups, subFunds, history, adjustments] = await Promise.all([
        FinancialService.getAsnafAllocations(fiscalYear),
        FinancialService.getSpecificFunds({
          fiscalYear,
          primaryGroupCode,
          status,
          effectiveFrom,
          effectiveTo,
          search,
          includeAssistanceTypes: true,
        }),
        FinancialService.getSpecificFundHistory(fiscalYear, primaryGroupCode),
        FinancialService.getFundBudgetAdjustments({ fiscalYear, primaryGroupCode }),
      ]);

      const activeFunds = subFunds.filter((f) => f.isActive);
      const totalActivePercentage = Number(
        activeFunds.reduce((sum, f) => sum + (Number(f.percentage) || 0), 0).toFixed(2)
      );
      const totalTargetAmount = Number(
        activeFunds.reduce((sum, f) => sum + (Number(f.targetAmount) || 0), 0).toFixed(2)
      );
      const totalAdjustedBudget = Number(
        activeFunds.reduce((sum, f) => sum + (Number(f.adjustedBudgetAmount) || 0), 0).toFixed(2)
      );
      const totalCommittedAmount = Number(
        subFunds.reduce((sum, f) => sum + (Number(f.committedAmount) || 0), 0).toFixed(2)
      );
      const totalDisbursedAmount = Number(
        subFunds.reduce((sum, f) => sum + (Number(f.disbursedAmount) || 0), 0).toFixed(2)
      );
      const totalRemainingAmount = Number(
        activeFunds.reduce((sum, f) => sum + (Number(f.remainingAmount) || 0), 0).toFixed(2)
      );

      return NextResponse.json({
        success: true,
        data: {
          fiscalYear,
          primaryGroupCode,
          totalFunds: subFunds.length,
          activeFundsCount: activeFunds.length,
          inactiveFundsCount: subFunds.length - activeFunds.length,
          totalActivePercentage,
          totalTargetAmount,
          totalAdjustedBudget,
          totalCommittedAmount,
          totalDisbursedAmount,
          totalRemainingAmount,
          primaryGroups,
          subFunds,
          history,
          adjustments,
        },
      });
    }

    const subFunds = await FinancialService.getSpecificFunds({
      fiscalYear,
      primaryGroupCode,
      status,
      effectiveFrom,
      effectiveTo,
      search,
      includeAssistanceTypes: true,
    });
    return NextResponse.json({ success: true, data: subFunds });
  } catch (error: any) {
    const msg = error?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลกองทุน';
    return NextResponse.json({ success: false, error: msg }, { status: resolveStatusCode(msg) === 404 ? 404 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const actor = await OrganizationService.resolveActor(req, body.actor);

    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    if (body.action === 'adjust_budget') {
      const input = body.input || body;
      const result = await FinancialService.recordFundBudgetAdjustment(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    const input = body.input || body;
    const created = await FinancialService.createSpecificFund(
      {
        ...input,
        fiscalYear: input.fiscalYear ? String(input.fiscalYear) : undefined,
      },
      actor
    );
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    const msg = error?.message || 'ไม่สามารถสร้างกองทุนได้';
    return NextResponse.json(
      { success: false, error: msg.replace('CANNOT_HARD_DELETE: ', '') },
      { status: resolveStatusCode(msg) }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const actor = await OrganizationService.resolveActor(req, body.actor);

    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    // Mode 1: Update single fund metadata (when fundId / id is provided without bulk subFunds array)
    const targetFundId = body.fundId || body.id || body.input?.id;
    if (targetFundId && !Array.isArray(body.subFunds)) {
      const input = body.input || body;
      const updated = await FinancialService.updateSpecificFund(
        String(targetFundId),
        {
          ...input,
          fiscalYear: input.fiscalYear ? String(input.fiscalYear) : undefined,
        },
        actor
      );
      return NextResponse.json({ success: true, data: updated });
    }

    // Mode 2: Bulk proportion adjustment
    const {
      subFunds,
      fiscalYear,
      primaryGroupCode,
      policyRef,
      reason,
      effectiveDate,
      approvedById,
      approvedByName,
      allowReserve,
    } = body;

    if (!Array.isArray(subFunds) || !policyRef || !reason) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุรายการสัดส่วนกองทุน, นโยบายอ้างอิง และเหตุผล)' },
        { status: 400 }
      );
    }

    const result = await FinancialService.updateSpecificFundProportions(
      {
        subFunds,
        fiscalYear: fiscalYear ? String(fiscalYear) : '2569',
        primaryGroupCode: primaryGroupCode || 'faqir_miskin',
        policyRef,
        reason,
        effectiveDate,
        approvedById,
        approvedByName,
        allowReserve: Boolean(allowReserve),
      },
      actor
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const msg = error?.message || 'ไม่สามารถอัปเดตข้อมูลกองทุนได้';
    return NextResponse.json(
      { success: false, error: msg.replace('CANNOT_HARD_DELETE: ', '') },
      { status: resolveStatusCode(msg) }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const actor = await OrganizationService.resolveActor(req, body.actor);
    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    const fundId = body.fundId || body.id || searchParams.get('fundId') || searchParams.get('id');
    if (!fundId) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรหัสกองทุนที่ต้องการลบหรือปิดใช้งาน' }, { status: 400 });
    }

    const mode = (body.mode || body.action || searchParams.get('mode') || searchParams.get('action') || 'delete') as
      | 'delete'
      | 'deactivate'
      | 'activate';
    const reason = body.reason || searchParams.get('reason') || undefined;
    const rebalanceProportions = body.rebalanceProportions;

    const result = await FinancialService.deleteOrDeactivateSpecificFund(
      String(fundId),
      { mode, reason, rebalanceProportions },
      actor
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const msg = error?.message || 'ไม่สามารถลบหรือปิดใช้งานกองทุนได้';
    const isHardDeleteBlocked = msg.includes('CANNOT_HARD_DELETE');
    return NextResponse.json(
      {
        success: false,
        canHardDelete: isHardDeleteBlocked ? false : undefined,
        requireDeactivate: isHardDeleteBlocked ? true : undefined,
        error: msg.replace('CANNOT_HARD_DELETE: ', ''),
      },
      { status: resolveStatusCode(msg) }
    );
  }
}
