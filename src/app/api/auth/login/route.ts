import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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
    const userAgent = req.headers.get('user-agent') || 'NextClient';

    const nestRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip,
        'user-agent': userAgent,
      },
      body: JSON.stringify({ email: identifier, password }),
    });

    const data = await nestRes.json();

    if (!nestRes.ok) {
      const status = nestRes.status === 429 ? 429 : 401;
      return NextResponse.json(
        { success: false, error: data.message || 'การเข้าสู่ระบบล้มเหลว' },
        { status }
      );
    }

    if (data.mfaRequired) {
      return NextResponse.json({
        success: true,
        mfaRequired: true,
        tempToken: data.tempToken,
        expiresIn: data.expiresIn,
        userId: data.userId,
        email: data.email,
      });
    }

    const primaryRole = data.user.roles[0]?.code || 'PUBLIC';
    let role = 'public';
    if (primaryRole === 'SUPER_ADMIN') role = 'super_admin';
    else if (primaryRole === 'ADMIN') role = 'executive';
    else if (primaryRole === 'ASSISTANCE_OFFICER') role = 'officer';
    else if (primaryRole === 'FINANCE_OFFICER' || primaryRole === 'TREASURER') role = 'finance';
    else if (primaryRole === 'APPROVER') role = 'approver';
    else if (primaryRole === 'AUDITOR') role = 'approver';

    const mappedUser = {
      id: data.user.id,
      name: data.user.displayName,
      email: data.user.email,
      role,
      roleTitleTh: data.user.roles[0]?.name || 'เจ้าหน้าที่',
      phone: '',
      branch: 'สำนักงานใหญ่',
      status: 'active',
    };

    let redirectUrl = '/my-account';
    if (['super_admin', 'executive', 'officer', 'approver', 'finance'].includes(role)) {
      redirectUrl = '/#admin';
    }

    const response = NextResponse.json({
      success: true,
      mfaRequired: false,
      data: { token: data.accessToken, user: mappedUser },
      user: mappedUser,
      token: data.accessToken,
      redirectUrl,
      message: 'เข้าสู่ระบบสำเร็จ',
    });

    // Forward Set-Cookie header from NestJS
    const setCookie = nestRes.headers.get('set-cookie');
    if (setCookie) {
      response.headers.set('Set-Cookie', setCookie);
    }

    // Set zms_session cookie for Next.js legacy compatibility
    response.cookies.set({
      name: 'zms_session',
      value: data.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'การเข้าสู่ระบบล้มเหลว' },
      { status: 500 }
    );
  }
}
