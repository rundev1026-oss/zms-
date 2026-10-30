import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await proxyToNest('/assistance/executions', request, {
      method: 'POST',
      body,
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถบันทึกการส่งมอบความช่วยเหลือได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
      message: 'บันทึกการส่งมอบความช่วยเหลือสำเร็จ',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกการส่งมอบ' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ applicationId' },
        { status: 400 }
      );
    }

    const res = await proxyToNest(`/assistance/executions/${applicationId}`, request, {
      method: 'GET',
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถดึงข้อมูลการส่งมอบได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลการส่งมอบ' },
      { status: 500 }
    );
  }
}

