import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason, notes } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุเหตุผลในการไม่อนุมัติ)' },
        { status: 400 }
      );
    }

    const res = await proxyToNest(`/approvals/${id}/reject`, request, {
      method: 'POST',
      body: {
        reason: reason.trim(),
        notes: notes || undefined,
      },
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถปฏิเสธคำร้องได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
      message: 'บันทึกการไม่อนุมัติคำร้องเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปฏิเสธคำร้อง' },
      { status: 400 }
    );
  }
}
