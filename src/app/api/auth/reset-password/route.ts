import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, newPassword, confirmPassword } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบโทเคนสำหรับการรีเซ็ตรหัสผ่าน กรุณาใช้ลิงก์ที่ได้รับจากระบบ' },
        { status: 400 }
      );
    }

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกรหัสผ่านใหม่และการยืนยันรหัสผ่าน' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน' },
        { status: 400 }
      );
    }

    // Clean token if user accidentally pasted full URL
    let cleanToken = token.trim();
    if (cleanToken.includes('token=')) {
      const match = cleanToken.match(/token=([a-zA-Z0-9_\-]+)/);
      if (match && match[1]) {
        cleanToken = match[1];
      }
    }

    // 1. First attempt NestJS enterprise backend
    try {
      const nestRes = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-zms-csrf': '1',
        },
        body: JSON.stringify({ token: cleanToken, newPassword }),
      });

      const data = await nestRes.json();
      if (nestRes.ok) {
        return NextResponse.json({
          success: true,
          message: data.message || 'รีเซ็ตรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่',
        });
      } else if (nestRes.status === 400) {
        // Return NestJS error message (e.g. invalid token, expired token)
        return NextResponse.json(
          { success: false, error: data.message || 'โทเคนรีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว' },
          { status: 400 }
        );
      }
    } catch (nestErr) {
      console.error('NestJS auth reset-password error:', nestErr);
    }

    // 2. Fallback to local AuthService
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await AuthService.resetPassword(cleanToken, newPassword, confirmPassword, ip);

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
