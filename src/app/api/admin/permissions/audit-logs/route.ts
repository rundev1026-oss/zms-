import { NextResponse } from 'next/server';
import { resolveServerToken } from '@/lib/server-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = resolveServerToken(req);
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const res = await fetch(`${API_BASE_URL}/permissions/audit-logs?${searchParams.toString()}`, { headers });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.message || 'ไม่สามารถดึงประวัติการแก้ไขสิทธิ์ได้' },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงประวัติสิทธิ์' },
      { status: 500 }
    );
  }
}
