import { NextRequest, NextResponse } from 'next/server';
import { readNestFailure } from '@/lib/registrySurvey';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function userToken(request: NextRequest): string | null {
  const headerToken = request.nextUrl.searchParams.get('token') || '';
  if (headerToken && headerToken !== 'null' && headerToken !== 'undefined') return headerToken;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = userToken(request);
  if (!token) return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;
  const inline = request.nextUrl.searchParams.get('inline') === '1' ? '1' : '0';
  const response = await fetch(`${API_BASE_URL}/documents/${id}/content?inline=${inline}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await readNestFailure(response, 'เปิดเอกสารไม่สำเร็จ');
    return NextResponse.json({ success: false, error }, { status: response.status });
  }
  const bytes = await response.arrayBuffer();
  const headers = new Headers();
  headers.set('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
  headers.set('Content-Disposition', response.headers.get('content-disposition') || 'attachment');
  headers.set('Cache-Control', 'private, no-store');
  return new NextResponse(bytes, { status: 200, headers });
}
