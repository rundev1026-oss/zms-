import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';

    // Call NestJS logout
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-zms-csrf': '1',
          Cookie: cookieHeader,
        },
      });
    } catch {
      // Ignore network errors on logout
    }

    const response = NextResponse.json({
      success: true,
      message: 'ออกจากระบบสำเร็จเรียบร้อย',
    });

    // Clear session cookies
    response.cookies.set({
      name: 'zms_session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    response.cookies.set({
      name: 'zms_refresh',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
