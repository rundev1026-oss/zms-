import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes, targetStatus } = body;

    if (!notes || !notes.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรายละเอียดที่ต้องการให้แก้ไขหรือขอข้อมูลเพิ่ม' },
        { status: 400 }
      );
    }

    const res = await proxyToNest(`/approvals/${id}/return`, request, {
      method: 'POST',
      body: {
        notes: notes.trim(),
        targetStatus: targetStatus || 'need_info',
      },
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถส่งกลับคำร้องได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
      message: 'ส่งกลับคำร้องเพื่อขอข้อมูลเพิ่มเติมเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการส่งกลับคำร้อง' },
      { status: 500 }
    );
  }
}

