import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const assessmentData = body.assessment || body;

    const res = await proxyToNest(`/assessments/${id}`, request, {
      method: 'POST',
      body: assessmentData,
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถบันทึกผลการประเมินได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
      message: 'บันทึกผลการประเมินเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกผลการประเมิน' },
      { status: 400 }
    );
  }
}
