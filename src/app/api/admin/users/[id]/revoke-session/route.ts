import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import { resolveServerToken } from '@/lib/server-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.id;

    const token = resolveServerToken(req);

    // 1. First attempt enterprise NestJS backend
    if (token) {
      try {
        const nestRes = await fetch(`${API_BASE_URL}/users/${userId}/reset-password`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-zms-csrf': '1',
          },
          body: JSON.stringify({}),
        });

        const data = await nestRes.json();
        if (nestRes.ok) {
          return NextResponse.json({
            success: true,
            message: 'ยกเลิก Session ทั้งหมดของผู้ใช้สำเร็จ',
          });
        }
      } catch (err) {
        console.error('NestJS revoke-session proxy error:', err);
      }
    }

    // 2. Fallback to local AuthService
    if (!token) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const actor = await AuthService.validateSession(token);
    if (!actor || actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถยกเลิก Session ได้' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await AuthService.revokeUserSession(userId, actor, ip);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถยกเลิก Session ได้' },
      { status: 400 }
    );
  }
}
