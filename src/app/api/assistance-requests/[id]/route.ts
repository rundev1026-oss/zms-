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

    const isFullUpdate =
      body.requestedAmount !== undefined ||
      body.assistanceType !== undefined ||
      body.hardshipReasons !== undefined ||
      body.necessityDetails !== undefined ||
      body.specificFundCode !== undefined ||
      Array.isArray(body.documents);

    const endpoint = isFullUpdate
      ? `/assistance-requests/${id}`
      : `/assistance-requests/${id}/status`;

    const res = await proxyToNest(endpoint, request, {
      method: 'PATCH',
      body,
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถปรับปรุงคำร้องได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
      message: isFullUpdate ? 'ปรับปรุงข้อมูลคำร้องเรียบร้อยแล้ว' : 'ปรับปรุงสถานะคำร้องเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงคำร้อง' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params });
}

