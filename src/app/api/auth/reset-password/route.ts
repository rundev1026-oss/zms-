import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, newPassword, confirmPassword } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบโทเคนสำหรับการรีเซ็ตรหัสผ่าน' },
        { status: 400 }
      );
    }

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกรหัสผ่านใหม่และการยืนยันรหัสผ่าน' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await AuthService.resetPassword(token, newPassword, confirmPassword, ip);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'การรีเซ็ตรหัสผ่านล้มเหลว' },
      { status: 400 }
    );
  }
}
