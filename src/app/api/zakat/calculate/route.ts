import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await proxyToNest('/zakat/calculate', request, {
      method: 'POST',
      body,
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถคำนวณซะกาตได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการคำนวณซะกาต' },
      { status: 500 }
    );
  }
}

