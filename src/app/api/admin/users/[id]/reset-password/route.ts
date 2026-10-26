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

export async function POST(
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
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถสั่งรีเซ็ตรหัสผ่านได้' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await AuthService.sendPasswordResetByAdmin(userId, actor, ip);

    return NextResponse.json({
      success: true,
      message: result.message,
      resetUrl: result.resetUrl,
      rawToken: result.rawToken,
      emailStatus: result.emailStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถสั่งรีเซ็ตรหัสผ่านได้' },
      { status: 400 }
    );
  }
}
