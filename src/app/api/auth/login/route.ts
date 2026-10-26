import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = body.identifier || body.email || body.phone;
    const password = body.password;
    const rememberMe = Boolean(body.rememberMe);

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกอีเมลหรือเบอร์โทรศัพท์ และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const session = await AuthService.login(identifier, password, ip);

    // Determine safe redirect URL based on verified role
    let redirectUrl = '/my-account';
    if (['super_admin', 'executive', 'officer', 'approver', 'finance'].includes(session.user.role)) {
      redirectUrl = '/#admin';
    }

    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days vs 1 day

    const response = NextResponse.json({
      success: true,
      data: session,
      user: session.user,
      token: session.token,
      redirectUrl,
      message: 'เข้าสู่ระบบสำเร็จ',
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'zms_session',
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error: any) {
    const status = error.message && error.message.includes('ถูกระงับชั่วคราว') ? 423 : 401;
    return NextResponse.json(
      { success: false, error: error.message || 'การเข้าสู่ระบบล้มเหลว' },
      { status }
    );
  }
}
