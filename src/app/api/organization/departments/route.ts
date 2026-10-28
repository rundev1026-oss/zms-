import { NextResponse } from 'next/server';
import { OrganizationService } from '@/services/organizationService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const actor = await OrganizationService.resolveActor(req, body.actor);

    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' },
        { status: 401 }
      );
    }

    if (actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่มีสิทธิ์เพิ่มแผนกใหม่' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const input = body.input || body;
    const result = await OrganizationService.createDepartment(input, actor, ip);

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: result.department,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถเพิ่มแผนกได้' },
      { status: 400 }
    );
  }
}

