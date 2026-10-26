import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    let token = authHeader.replace('Bearer ', '').trim();

    // If not in header, check cookie
    if (!token) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/zms_session=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (token) {
      await AuthService.logout(token, ip);
    }

    const response = NextResponse.json({ 
      success: true, 
      message: 'ออกจากระบบสำเร็จเรียบร้อย' 
    });
    
    // Clear session cookie completely
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

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
