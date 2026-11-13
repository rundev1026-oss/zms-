import { NextRequest, NextResponse } from 'next/server';
import { readNestFailure } from '@/lib/registrySurvey';
import { resolveServerToken } from '@/lib/serverToken';
import { StorageService } from '@/services/storageService';
import { AuthService } from '@/services/authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = resolveServerToken(request);
  if (!token) return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  const { id } = await params;

  if (UUID_REGEX.test(id)) {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        return NextResponse.json({ success: true });
      }
      if (response.status !== 404 && response.status !== 400) {
        const error = await readNestFailure(response, 'ลบเอกสารไม่สำเร็จ');
        return NextResponse.json({ success: false, error }, { status: response.status });
      }
    } catch {}
  }

  try {
    const user = await AuthService.validateSession(token);
    const actor = user
      ? { id: user.id, name: user.name, role: user.role, nationalId: user.nationalId }
      : { id: 'officer-1', name: 'เจ้าหน้าที่ระบบ', role: 'officer' as const };
    await StorageService.deleteDocument(id, actor);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'ลบเอกสารไม่สำเร็จ' },
      { status: 404 },
    );
  }
}
