import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = body.identifier || body.email || body.phone;

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกอีเมลหรือเบอร์โทรศัพท์ที่ลงทะเบียน' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1. First attempt NestJS enterprise backend
    try {
      const nestRes = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': ip,
          'x-zms-csrf': '1',
        },
        body: JSON.stringify({ email: identifier.trim() }),
      });

      const data = await nestRes.json();
      if (nestRes.ok) {
        const rawToken = data.resetToken;
        const resetUrl = rawToken ? `/reset-password?token=${rawToken}` : '/reset-password';
        return NextResponse.json({
          success: true,
          message: data.message || 'หากอีเมลนี้อยู่ในระบบ ท่านจะได้รับคำแนะนำในการรีเซ็ตรหัสผ่าน',
          emailStatus: 'สร้างโทเคนและส่งลิงก์รีเซ็ตรหัสผ่านเรียบร้อยแล้ว',
          rawToken,
          resetUrl,
        });
      }
    } catch (nestErr) {
      console.error('NestJS forgot-password proxy error:', nestErr);
    }

    // 2. Fallback to local AuthService
    const result = await AuthService.requestPasswordReset(identifier, ip);

    return NextResponse.json({
      success: true,
      message: result.message,
      emailStatus: result.emailStatus,
      rawToken: result.rawToken,
      resetUrl: result.resetUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการขอรีเซ็ตรหัสผ่าน' },
      { status: 400 }
    );
  }
}
