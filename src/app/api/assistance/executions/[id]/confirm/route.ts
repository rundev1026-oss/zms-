import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const res = await proxyToNest(`/assistance/executions/${id}/confirm`, request, {
      method: 'POST',
      body,
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถยืนยันการรับมอบความช่วยเหลือได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
      message: 'ยืนยันการรับมอบความช่วยเหลือสำเร็จ',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการยืนยันการรับมอบ' },
      { status: 500 }
    );
  }
}

