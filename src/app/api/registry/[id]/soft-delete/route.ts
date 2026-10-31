import { resolveServerToken } from '@/lib/serverToken';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function resolveToken(req: Request): string {
  return resolveServerToken(req);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const token = resolveToken(request);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const nestRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/soft-delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!nestRes.ok) {
      const err = await nestRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.message || 'ไม่สามารถลบทะเบียนได้' },
        { status: nestRes.status },
      );
    }

    const data = await nestRes.json();
    return NextResponse.json({
      success: true,
      message: 'จำหน่าย/ลบข้อมูลทะเบียนเรียบร้อยแล้ว',
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' },
      { status: 500 },
    );
  }
}

