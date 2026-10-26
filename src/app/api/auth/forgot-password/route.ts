import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';

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
    const result = await AuthService.requestPasswordReset(identifier, ip);

    return NextResponse.json({
      success: true,
      message: result.message,
      emailStatus: result.emailStatus,
      rawToken: result.rawToken, // Provided in development/test environment for verification
      resetUrl: result.resetUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการขอรีเซ็ตรหัสผ่าน' },
      { status: 400 }
    );
  }
}
