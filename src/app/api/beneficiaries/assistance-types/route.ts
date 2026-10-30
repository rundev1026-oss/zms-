import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';
import { OrganizationService } from '@/services/organizationService';

function resolveStatusCode(message: string): number {
  if (message.includes('CANNOT_HARD_DELETE') || message.includes('ซ้ำกับ') || message.includes('มีอยู่ในกองทุนนี้แล้ว')) return 409;
  if (message.startsWith('ไม่อนุญาต:') || message.includes('เฉพาะผู้ดูแลระบบ')) return 403;
  if (message.includes('ไม่พบ')) return 404;
  return 400;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === '1' || searchParams.get('includeInactive') === 'true';
    const activeFundOnly = searchParams.get('activeFundOnly') === '1' || searchParams.get('activeFundOnly') === 'true';
    const primaryGroupCode = searchParams.get('primaryGroupCode') || searchParams.get('primaryGroup') || undefined;
    const specificFundId = searchParams.get('specificFundId') || undefined;
    const search = searchParams.get('search') || undefined;

    const types = await BeneficiaryService.getAssistanceTypes({
      includeInactive,
      activeFundOnly,
      primaryGroupCode,
      specificFundId,
      search,
    });
    return NextResponse.json({ success: true, data: types });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงประเภทความช่วยเหลือ' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actor = await OrganizationService.resolveActor(request, body.actor);

    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    const input = body.input || body;
    const resolvedName = (input.name || input.nameTh || '').trim();
    const resolvedCategory = input.category || 'cash';
    if (!resolvedName) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุชื่อประเภทความช่วยเหลือ)' },
        { status: 400 }
      );
    }

    const result = await BeneficiaryService.addAssistanceType(
      {
        code: input.code,
        name: resolvedName,
        category: resolvedCategory,
        specificFundId: input.specificFundId || 'subf-1',
        description: input.description || '',
        conditionsText: input.conditionsText || '',
        assistanceFormat: input.assistanceFormat || 'one_time',
        requiredDocuments: input.requiredDocuments || [],
        defaultMinAmount: input.defaultMinAmount,
        defaultMaxAmount: input.defaultMaxAmount,
        orderIndex: input.orderIndex,
      },
      undefined,
      undefined,
      actor
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    const msg = error?.message || 'เกิดข้อผิดพลาดในการเพิ่มประเภทความช่วยเหลือ';
    return NextResponse.json({ success: false, error: msg }, { status: resolveStatusCode(msg) });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const actor = await OrganizationService.resolveActor(request, body.actor);

    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    const id = body.id || body.assistanceTypeId || body.input?.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรหัสประเภทความช่วยเหลือ (id)' }, { status: 400 });
    }

    const input = body.input || body;
    const normalizedInput = {
      ...input,
      name: input.name !== undefined ? input.name : input.nameTh,
    };
    const result = await BeneficiaryService.updateAssistanceType(String(id), normalizedInput, actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const msg = error?.message || 'เกิดข้อผิดพลาดในการแก้ไขประเภทความช่วยเหลือ';
    return NextResponse.json({ success: false, error: msg }, { status: resolveStatusCode(msg) });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const actor = await OrganizationService.resolveActor(request, body.actor);

    if (!actor || !actor.role) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    const id = body.id || searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรหัสประเภทความช่วยเหลือ (id)' }, { status: 400 });
    }

    const mode = (body.mode || body.action || searchParams.get('mode') || searchParams.get('action') || 'delete') as
      | 'delete'
      | 'deactivate'
      | 'activate';
    const reason = body.reason || searchParams.get('reason') || undefined;

    const result = await BeneficiaryService.deleteOrDeactivateAssistanceType(String(id), { mode, reason }, actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const msg = error?.message || 'ไม่สามารถลบหรือปิดใช้งานประเภทความช่วยเหลือได้';
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
