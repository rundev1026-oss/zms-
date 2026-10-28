import { NextResponse } from 'next/server';
import { OrganizationService } from '@/services/organizationService';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolved = await Promise.resolve(params);
    const deptId = resolved.id;

    const actor = await OrganizationService.resolveActor(req);
    if (!actor || !['super_admin', 'executive', 'officer', 'approver', 'finance'].includes(actor.role)) {
      return NextResponse.json(
        { success: false, error: 'ท่านไม่มีสิทธิ์เข้าถึงรายละเอียดแผนกปฏิบัติงาน' },
        { status: 403 }
      );
    }

    const structure = await OrganizationService.getOrganizationStructure();
    const department = structure.departments.find((d) => d.id === deptId);
    if (!department) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลแผนกที่ระบุ' },
        { status: 404 }
      );
    }

    const impact = await OrganizationService.getDepartmentImpactSummary(deptId);
    const personnel = await OrganizationService.getOrganizationPersonnel({ departmentId: deptId });

    return NextResponse.json({
      success: true,
      data: {
        department,
        impact,
        personnel,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถดึงรายละเอียดแผนกได้' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolved = await Promise.resolve(params);
    const deptId = resolved.id;
    const body = await req.json();
    const actor = await OrganizationService.resolveActor(req, body.actor);

    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }
    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์แก้ไขแผนก' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const input = body.input || body;
    const result = await OrganizationService.updateDepartment(deptId, input, actor, ip);

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.department,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถแก้ไขข้อมูลแผนกได้' },
      { status: 400 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolved = await Promise.resolve(params);
    const deptId = resolved.id;
    const body = await req.json();
    const actor = await OrganizationService.resolveActor(req, body.actor);

    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }
    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์เปลี่ยนสถานะแผนก' },
        { status: 403 }
      );
    }

    const action = body.action === 'activate' ? 'activate' : 'deactivate';
    const reason = body.reason || '';
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const result = await OrganizationService.changeDepartmentStatusOrDelete(deptId, action, reason, actor, ip);
    return NextResponse.json({
      success: true,
      message: result.message,
      impact: result.impact,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถเปลี่ยนสถานะแผนกได้' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolved = await Promise.resolve(params);
    const deptId = resolved.id;
    const body = await req.json().catch(() => ({}));
    const actor = await OrganizationService.resolveActor(req, body.actor);

    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }
    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์ลบแผนก' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await OrganizationService.changeDepartmentStatusOrDelete(
      deptId,
      'delete',
      body.reason || 'ลบแผนกที่ไม่มีบุคลากรสังกัด',
      actor,
      ip
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      impact: result.impact,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถลบแผนกได้' },
      { status: 400 }
    );
  }
}

