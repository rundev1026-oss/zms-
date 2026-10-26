import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';

function extractToken(req: Request): string {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/zms_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.id;

    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const actor = await AuthService.validateSession(token);
    if (!actor || actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถแก้ไขสถานะผู้ใช้ได้' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status } = body;
    if (!status) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุสถานะใหม่' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await AuthService.updateUserStatus(userId, status, actor, ip);

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถแก้ไขสถานะผู้ใช้ได้' },
      { status: 400 }
    );
  }
}
