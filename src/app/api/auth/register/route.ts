import { NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, firstName, lastName, email, phone, password, confirmPassword, pdpaConsent } = body;

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const result = await AuthService.register(
      {
        name,
        firstName,
        lastName,
        email,
        phone,
        password,
        confirmPassword,
        pdpaConsent,
      },
      ip
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      user: result.user,
      notificationStatus: result.notificationStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'การสมัครสมาชิกล้มเหลว' },
      { status: 400 }
    );
  }
}
