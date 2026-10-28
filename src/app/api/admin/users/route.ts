import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import { OrganizationService } from '@/services/organizationService';

export async function GET(req: Request) {
  try {
    const actor = await OrganizationService.resolveActor(req);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถดูรายชื่อผู้ใช้งานทั้งหมดได้' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const role = (searchParams.get('role') as any) || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const passwordSetupStatus = (searchParams.get('passwordSetupStatus') as any) || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await AuthService.getAllUsers({
      branchId,
      departmentId,
      role,
      status,
      passwordSetupStatus,
      search,
    });

    return NextResponse.json({
      success: true,
      data: result.users,
      total: result.total,
      pendingSetupCount: result.pendingSetupCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await OrganizationService.resolveActor(req);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถเพิ่มผู้ใช้งานได้' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const result = await AuthService.createUserByAdmin(body, actor as any, ip);

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: result.user,
        setupToken: result.setupToken,
        setupUrl: result.setupUrl,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'ไม่สามารถเพิ่มผู้ใช้งานได้' }, { status: 400 });
  }
}
