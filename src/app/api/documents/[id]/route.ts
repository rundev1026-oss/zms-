import { NextRequest, NextResponse } from 'next/server';
import { readNestFailure } from '@/lib/registrySurvey';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function userToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token && token !== 'null' && token !== 'undefined') return token;
  }
  const cookie = request.headers.get('cookie') || '';
  const session = cookie.match(/zms_session=([^;]+)/);
  if (session) return decodeURIComponent(session[1]);
  const stored = cookie.match(/zms_auth_token=([^;]+)/);
  if (stored) return decodeURIComponent(stored[1]);
  return null;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = userToken(request);
  if (!token) return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await readNestFailure(response, 'ลบเอกสารไม่สำเร็จ');
    return NextResponse.json({ success: false, error }, { status: response.status });
  }
  return NextResponse.json({ success: true });
}
