import { NextResponse } from 'next/server';
import { OrganizationService } from '@/services/organizationService';

export async function GET(req: Request) {
  try {
    const actor = await OrganizationService.resolveActor(req);
    if (!actor || !['super_admin', 'executive', 'officer', 'approver', 'finance'].includes(actor.role)) {
      return NextResponse.json(
        { success: false, error: 'ท่านไม่มีสิทธิ์ดูรายชื่อบุคลากรในองค์กร' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const search = searchParams.get('search') || undefined;
    const onlyInvalidAffiliation = searchParams.get('onlyInvalidAffiliation') === 'true';

    const personnel = await OrganizationService.getOrganizationPersonnel({
      branchId,
      departmentId,
      search,
      onlyInvalidAffiliation,
    });

    return NextResponse.json({
      success: true,
      data: personnel,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถดึงรายชื่อบุคลากรได้' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const actor = await OrganizationService.resolveActor(req, body.actor);

    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }
    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์เปลี่ยนสังกัดผู้ใช้งาน' },
        { status: 403 }
      );
    }

    const { userId, branchId, departmentId, reason } = body;
    if (!userId || !branchId || !departmentId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรหัสผู้ใช้งาน สาขา และแผนกปลายทางให้ครบถ้วน' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await OrganizationService.reassignUserAffiliation(
      userId,
      branchId,
      departmentId,
      reason || 'ย้ายสังกัดผ่านระบบโครงสร้างสาขาและแผนก',
      actor,
      ip
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถเปลี่ยนสังกัดผู้ใช้งานได้' },
      { status: 400 }
    );
  }
}

