import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await proxyToNest(`/assistance-requests/${id}`, request, {
      method: 'GET',
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่พบคำร้องขอความช่วยเหลือ' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลคำร้อง' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const res = await proxyToNest(`/assistance-requests/${id}/status`, request, {
      method: 'PATCH',
      body,
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถปรับปรุงสถานะคำร้องได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
      message: `ปรับปรุงสถานะคำร้องเรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงสถานะคำร้อง' },
      { status: 500 }
    );
  }
}

