import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';
import { OrganizationService } from '@/services/organizationService';
import { CENTRAL_ASNAF_GROUPS } from '@/lib/financeUtils';

function resolveStatusCode(message: string): number {
  if (message.includes('CANNOT_HARD_DELETE') || message.includes('ซ้ำกับ') || message.includes('มีอยู่แล้ว')) return 409;
  if (message.startsWith('ไม่อนุญาต:') || message.includes('สิทธิ์ไม่เพียงพอ') || message.includes('เฉพาะผู้ดูแลระบบ')) return 403;
  if (message.includes('ไม่พบ')) return 404;
  return 400;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fiscalYear = searchParams.get('fiscalYear') || searchParams.get('year') || '2569';
    const view = searchParams.get('view');
    const includeHierarchy = searchParams.get('includeHierarchy') === '1' || searchParams.get('includeHierarchy') === 'true';
    const activeOnly = searchParams.get('activeOnly') === '1' || searchParams.get('activeOnly') === 'true';

    if (view === 'central-registry') {
      return NextResponse.json({ success: true, data: CENTRAL_ASNAF_GROUPS });
    }

    if (view === 'history') {
      const history = await FinancialService.getAsnafAllocationHistory(fiscalYear);
      return NextResponse.json({ success: true, data: history });
    }

    if (view === 'adjustments') {
      const primaryGroupCode = searchParams.get('primaryGroupCode') || searchParams.get('asnafCode') || undefined;
      const adjustments = await FinancialService.getFundBudgetAdjustments({
        fiscalYear,
        primaryGroupCode,
      });
      return NextResponse.json({
        success: true,
        data: adjustments.filter((a) => a.targetLevel === 'primary'),
      });
    }

    if (view === 'hierarchy') {
      const hierarchy = await FinancialService.getThreeTierFundHierarchy(fiscalYear, { activeOnly });
      return NextResponse.json({ success: true, data: hierarchy });
    }

    const allocations = await FinancialService.getAsnafAllocations(fiscalYear, {
      includeHierarchy,
      includeInactive: !activeOnly,
    });
    return NextResponse.json({ success: true, data: allocations });
  } catch (error: any) {
    const msg = error?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลกลุ่มกองทุนหลัก';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
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
      const result = await FinancialService.recordFundBudgetAdjustment(
        {
          ...input,
          targetLevel: 'primary',
          fiscalYear: input.fiscalYear ? String(input.fiscalYear) : '2569',
        },
        actor
      );
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: 'กลุ่มกองทุนหลักอ้างอิงจากทะเบียนอัสนัฟกลาง กรุณาใช้ PUT เพื่อตั้งค่าหรือปรับสัดส่วน' },
      { status: 400 }
    );
  } catch (error: any) {
    const msg = error?.message || 'ไม่สามารถดำเนินการได้';
    return NextResponse.json({ success: false, error: msg }, { status: resolveStatusCode(msg) });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const actor = await OrganizationService.resolveActor(req, body.actor);
    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    // Mode 1: Update single Primary Fund Group metadata (description, fundAccountId, effectiveDate, sortOrder, isActive)
    const targetAsnafCode = body.asnafCode || body.primaryGroupCode || body.input?.asnafCode;
    if (targetAsnafCode && !Array.isArray(body.allocations)) {
      const input = body.input || body;
      const updated = await FinancialService.updatePrimaryFundGroup(
        String(targetAsnafCode),
        {
          ...input,
          fiscalYear: input.fiscalYear ? String(input.fiscalYear) : '2569',
        },
        actor
      );
      return NextResponse.json({ success: true, data: updated });
    }

    // Mode 2: Bulk Primary Fund Group proportion update
    const { allocations, fiscalYear, policyRef, reason, effectiveDate, approvedById, approvedByName, allowReserve } = body;

    if (!Array.isArray(allocations) || !policyRef || !reason) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุรายการอัสนัฟ, นโยบายอ้างอิง และเหตุผล)' },
        { status: 400 }
      );
    }

    const result = await FinancialService.updateAsnafAllocations(
      allocations,
      fiscalYear ? String(fiscalYear) : '2569',
      policyRef,
      reason,
      actor,
      {
        effectiveDate,
        approvedById,
        approvedByName,
        allowReserve: Boolean(allowReserve),
      }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const msg = error?.message || 'ไม่สามารถอัปเดตข้อมูลกลุ่มกองทุนหลักได้';
    return NextResponse.json({ success: false, error: msg }, { status: resolveStatusCode(msg) });
  }
}
