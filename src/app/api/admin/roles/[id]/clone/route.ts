import { NextResponse } from 'next/server';
import { resolveServerToken } from '@/lib/server-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const token = resolveServerToken(req);
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json', 
      'x-zms-csrf': '1',
      'Authorization': `Bearer ${token}`
    };

    const body = await req.json();
    const res = await fetch(`${API_BASE_URL}/roles/${resolvedParams.id}/clone`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.message || 'ไม่สามารถคัดลอกบทบาทได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการคัดลอกบทบาท' },
      { status: 500 }
    );
  }
}
