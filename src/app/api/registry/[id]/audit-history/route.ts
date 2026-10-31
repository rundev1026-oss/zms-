import { resolveServerToken } from '@/lib/serverToken';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function resolveToken(req: Request): string {
  return resolveServerToken(req);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = resolveToken(request);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const nestRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/audit-history`, {
      headers,
    });

    if (!nestRes.ok) {
      const err = await nestRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.message || 'ไม่สามารถดึงประวัติ Audit Log ได้' },
        { status: nestRes.status },
      );
    }

    const data = await nestRes.json();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' },
      { status: 500 },
    );
  }
}

