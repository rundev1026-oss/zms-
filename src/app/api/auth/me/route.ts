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
      return NextResponse.json({ success: false, error: 'ไม่พบ Session Token' }, { status: 401 });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Session หมดอายุหรือไม่ถูกต้อง' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      data: user,
      user 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
