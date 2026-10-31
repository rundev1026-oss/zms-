import { NextRequest, NextResponse } from 'next/server';
import { mapRegistryDocument, readNestFailure } from '@/lib/registrySurvey';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = userToken(request);
  if (!token) return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;
  const response = await fetch(`${API_BASE_URL}/beneficiaries/${id}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await readNestFailure(response, 'โหลดเอกสารไม่สำเร็จ');
    return NextResponse.json({ success: false, error }, { status: response.status });
  }
  const rows = await response.json();
  return NextResponse.json({
    success: true,
    data: Array.isArray(rows) ? rows.map((row) => mapRegistryDocument(row)) : [],
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = userToken(request);
  if (!token) return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;
  const incoming = await request.formData();
  const file = incoming.get('file');
  const documentType = String(incoming.get('documentType') || '').trim();
  const replacesDocumentId = String(incoming.get('replacesDocumentId') || '').trim();
  if (!(file instanceof File) || !documentType) {
    return NextResponse.json({ success: false, error: 'กรุณาเลือกไฟล์และประเภทเอกสาร' }, { status: 400 });
  }
  const outgoing = new FormData();
  outgoing.append('file', file, file.name);
  outgoing.append('documentType', documentType);
  if (replacesDocumentId) outgoing.append('replacesDocumentId', replacesDocumentId);
  const response = await fetch(`${API_BASE_URL}/beneficiaries/${id}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: outgoing,
  });
  if (!response.ok) {
    const error = await readNestFailure(response, 'อัปโหลดเอกสารไม่สำเร็จ');
    return NextResponse.json({ success: false, error }, { status: response.status });
  }
  const created = await response.json();
  return NextResponse.json({ success: true, document: mapRegistryDocument(created) });
}
