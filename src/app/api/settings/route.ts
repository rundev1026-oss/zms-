import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = `/settings${queryString ? `?${queryString}` : ''}`;
    const res = await proxyToNest(endpoint, request, { method: 'GET' });
    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถดึงข้อมูลการตั้งค่าระบบได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await proxyToNest('/settings', request, {
      method: 'PATCH',
      body,
    });
    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถปรับปรุงการตั้งค่าระบบได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
      message: 'ปรับปรุงการตั้งค่าระบบสำเร็จ',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงการตั้งค่า' },
      { status: 500 }
    );
  }
}
