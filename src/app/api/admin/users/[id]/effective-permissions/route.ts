import { NextResponse } from 'next/server';
import { resolveServerToken } from '@/lib/server-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const token = resolveServerToken(req);
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const res = await fetch(`${API_BASE_URL}/users/${resolvedParams.id}`, { headers });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.message || 'ไม่สามารถดึงข้อมูลสิทธิ์สุทธิของผู้ใช้ได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: data.id,
        roles: data.roles,
        permissions: data.permissions || [],
        dataScope: data.dataScope || 'BRANCH',
        approvalLimit: data.approvalLimit || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงสิทธิ์สุทธิ' },
      { status: 500 }
    );
  }
}
