import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approvedAmount, fundId, notes, specificFundId } = body;

    if (approvedAmount === undefined || !fundId) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ approvedAmount และ fundId)' },
        { status: 400 }
      );
    }

    const res = await proxyToNest(`/approvals/${id}/approve`, request, {
      method: 'POST',
      body: {
        approvedAmount: Number(approvedAmount),
        fundId,
        specificFundId,
        notes: notes || 'อนุมัติวงเงินสวัสดิการ',
      },
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถอนุมัติคำร้องได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
      message: `อนุมัติคำร้องขอรับความช่วยเหลือเรียบร้อยแล้ว วงเงิน ฿${Number(approvedAmount).toLocaleString('th-TH')}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการอนุมัติคำร้อง' },
      { status: 400 }
    );
  }
}
