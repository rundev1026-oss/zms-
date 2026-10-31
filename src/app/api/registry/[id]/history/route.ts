import { NextRequest, NextResponse } from 'next/server';
import { RegistryService } from '@/services/registryService';
import { resolveServerToken } from '@/lib/serverToken';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = resolveServerToken(request);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const nestRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/revisions`, { headers });
      if (nestRes.ok) {
        const rows = await nestRes.json();
        return NextResponse.json({ success: true, data: Array.isArray(rows) ? rows : [] });
      }
    } catch {
      // Fall through to the local history store.
    }
    const history = await RegistryService.getRegistryEditHistory(id);
    return NextResponse.json({ success: true, data: history });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่พบประวัติการแก้ไขข้อมูลทะเบียน' },
      { status: 404 }
    );
  }
}
