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

export async function GET(req: Request) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Session หมดอายุหรือไม่ถูกต้อง' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Session หมดอายุหรือไม่ถูกต้อง' }, { status: 401 });
    }

    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const updatedUser = await AuthService.updateProfile(user.id, body, ip);

    return NextResponse.json({
      success: true,
      message: 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว',
      data: updatedUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถอัปเดตข้อมูลโปรไฟล์ได้' },
      { status: 400 }
    );
  }
}
