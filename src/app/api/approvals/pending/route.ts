import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = `/approvals/pending${queryString ? `?${queryString}` : ''}`;

    const res = await proxyToNest(endpoint, request, { method: 'GET' });
    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'เกิดข้อผิดพลาดในการดึงรายการคำร้องรออนุมัติ' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json.items,
      pagination: {
        total: json.total,
        page: json.page,
        limit: json.limit,
        totalPages: json.totalPages,
      },
      ...json,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงรายการคำร้องรออนุมัติ' },
      { status: 500 }
    );
  }
}

