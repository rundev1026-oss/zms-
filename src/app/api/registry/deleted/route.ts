import { resolveServerToken } from '@/lib/serverToken';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function resolveToken(req: Request): string {
  return resolveServerToken(req);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || searchParams.get('search') || '';
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || searchParams.get('limit') || '20';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const token = resolveToken(request);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const queryParams = new URLSearchParams();
    if (q) queryParams.set('q', q);
    if (dateFrom) queryParams.set('dateFrom', dateFrom);
    if (dateTo) queryParams.set('dateTo', dateTo);
    queryParams.set('page', page);
    queryParams.set('pageSize', pageSize);

    const nestRes = await fetch(`${API_BASE_URL}/beneficiaries/deleted?${queryParams.toString()}`, {
      headers,
    });

    if (!nestRes.ok) {
      const err = await nestRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.message || 'ไม่สามารถดึงข้อมูลทะเบียนที่ถูกลบได้' },
        { status: nestRes.status },
      );
    }

    const data = await nestRes.json();
    return NextResponse.json({
      success: true,
      data: data.items,
      pagination: {
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: Math.ceil(data.total / data.pageSize) || 1,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' },
      { status: 500 },
    );
  }
}

