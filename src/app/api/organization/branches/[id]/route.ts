import { NextResponse } from 'next/server';
import { OrganizationService } from '@/services/organizationService';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolved = await Promise.resolve(params);
    const branchId = resolved.id;

    const actor = await OrganizationService.resolveActor(req);
    if (!actor || !['super_admin', 'executive', 'officer', 'approver', 'finance'].includes(actor.role)) {
      return NextResponse.json(
        { success: false, error: 'ท่านไม่มีสิทธิ์เข้าถึงรายละเอียดโครงสร้างสาขา' },
        { status: 403 }
      );
    }

    const structure = await OrganizationService.getOrganizationStructure();
    const branch = structure.branches.find((b) => b.id === branchId);
    if (!branch) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลสาขาที่ระบุ' },
        { status: 404 }
      );
    }

    const impact = await OrganizationService.getBranchImpactSummary(branchId);
    const departments = structure.departments.filter((d) => d.branchId === branchId);
    const personnel = await OrganizationService.getOrganizationPersonnel({ branchId });

    return NextResponse.json({
      success: true,
      data: {
        branch,
        impact,
        departments,
        personnel,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถดึงรายละเอียดสาขาได้' },
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
    const branchId = resolved.id;
    const body = await req.json();
    const actor = await OrganizationService.resolveActor(req, body.actor);

    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }
    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์แก้ไขสาขา' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const input = body.input || body;
    const result = await OrganizationService.updateBranch(branchId, input, actor, ip);

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.branch,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถแก้ไขข้อมูลสาขาได้' },
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
    const branchId = resolved.id;
    const body = await req.json();
    const actor = await OrganizationService.resolveActor(req, body.actor);

    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }
    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์เปลี่ยนสถานะสาขา' },
        { status: 403 }
      );
    }

    const action = body.action === 'activate' ? 'activate' : 'deactivate';
    const reason = body.reason || '';
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const result = await OrganizationService.changeBranchStatusOrDelete(branchId, action, reason, actor, ip);
    return NextResponse.json({
      success: true,
      message: result.message,
      impact: result.impact,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถเปลี่ยนสถานะสาขาได้' },
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
    const branchId = resolved.id;
    const body = await req.json().catch(() => ({}));
    const actor = await OrganizationService.resolveActor(req, body.actor);

    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }
    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์ลบสาขา' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await OrganizationService.changeBranchStatusOrDelete(
      branchId,
      'delete',
      body.reason || 'ลบสาขาที่ไม่มีข้อมูลอ้างอิง',
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
      { success: false, error: error.message || 'ไม่สามารถลบสาขาได้' },
      { status: 400 }
    );
  }
}

