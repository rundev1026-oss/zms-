import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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

    const nestRes = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!nestRes.ok) {
      return NextResponse.json({ success: false, error: 'Session หมดอายุหรือไม่ถูกต้อง' }, { status: 401 });
    }

    const apiUser = await nestRes.json();
    const primaryRole = apiUser.roles[0]?.code || 'PUBLIC';
    let role = 'public';
    if (primaryRole === 'SUPER_ADMIN') role = 'super_admin';
    else if (primaryRole === 'ADMIN') role = 'executive';
    else if (primaryRole === 'ASSISTANCE_OFFICER') role = 'officer';
    else if (primaryRole === 'FINANCE_OFFICER' || primaryRole === 'TREASURER') role = 'finance';
    else if (primaryRole === 'APPROVER') role = 'approver';
    else if (primaryRole === 'AUDITOR') role = 'approver';

    const mappedUser = {
      id: apiUser.id,
      name: apiUser.displayName,
      email: apiUser.email,
      role,
      roleTitleTh: apiUser.roles[0]?.name || 'เจ้าหน้าที่',
      phone: '',
      branch: 'สำนักงานใหญ่',
      status: 'active',
      permissions: apiUser.permissions,
      mfaEnabled: apiUser.mfaEnabled,
    };

    return NextResponse.json({
      success: true,
      data: mappedUser,
      user: mappedUser,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
