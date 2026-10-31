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
    const body = await req.json().catch(() => ({}));
    const newPassword = body?.newPassword || 'ZmsEnterprise2026!';

    const token = resolveServerToken(req);

    // 1. First attempt enterprise NestJS backend
    if (token) {
      try {
        // Fetch target user details to get their email
        let targetEmail = '';
        try {
          const userRes = await fetch(`${API_BASE_URL}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            targetEmail = userData.email || '';
          }
        } catch (fetchUserErr) {
          console.error('Fetch user detail error:', fetchUserErr);
        }

        // Reset the password in NestJS
        const nestRes = await fetch(`${API_BASE_URL}/users/${userId}/reset-password`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-zms-csrf': '1',
          },
          body: JSON.stringify({ newPassword }),
        });

        const data = await nestRes.json();
        if (nestRes.ok) {
          // Generate an active one-time password reset token for self-service link
          let generatedToken = '';
          if (targetEmail) {
            try {
              const forgotRes = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail }),
              });
              if (forgotRes.ok) {
                const forgotData = await forgotRes.json();
                generatedToken = forgotData.resetToken || '';
              }
            } catch (forgotErr) {
              console.error('Forgot password token generation error:', forgotErr);
            }
          }

          const resetToken = generatedToken || newPassword;
          const resetUrl = generatedToken
            ? `/reset-password?token=${generatedToken}`
            : `/reset-password?token=${newPassword}`;

          return NextResponse.json({
            success: true,
            message: data.message || `รีเซ็ตรหัสผ่านสำเร็จ รหัสผ่านเริ่มต้นคือ: ${newPassword}`,
            resetUrl,
            rawToken: resetToken,
            emailStatus: generatedToken
              ? `สร้างลิงก์รีเซ็ตรหัสผ่านพร้อมโทเคนเรียบร้อยแล้ว (รหัสผ่านเริ่มต้นปัจจุบัน: ${newPassword})`
              : `รีเซ็ตรหัสผ่านของผู้ใช้งานเป็น "${newPassword}" เรียบร้อยแล้ว`,
          });
        } else {
          return NextResponse.json(
            { success: false, error: data.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้' },
            { status: nestRes.status }
          );
        }
      } catch (err) {
        console.error('NestJS reset-password proxy error:', err);
      }
    }

    // 2. Fallback to local AuthService
    if (!token) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const actor = await AuthService.validateSession(token);
    if (!actor || actor.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้นที่สามารถสั่งรีเซ็ตรหัสผ่านได้' },
        { status: 403 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await AuthService.sendPasswordResetByAdmin(userId, actor, ip);

    return NextResponse.json({
      success: true,
      message: result.message,
      resetUrl: result.resetUrl,
      rawToken: result.rawToken,
      emailStatus: result.emailStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถสั่งรีเซ็ตรหัสผ่านได้' },
      { status: 400 }
    );
  }
}
