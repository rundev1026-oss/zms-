import { NextRequest, NextResponse } from 'next/server';
import { PaymentGatewayAdapter } from '@/lib/paymentGatewayAdapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchNo, provider, settlementItems, auditor, startDate, endDate, notes } = body;

    if (!batchNo || !provider || !Array.isArray(settlementItems) || !auditor) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน: ต้องระบุ batchNo, provider, settlementItems (array), auditor' },
        { status: 400 }
      );
    }

    const result = await PaymentGatewayAdapter.reconcileSettlementData({
      batchNo,
      provider,
      settlementItems,
      auditor,
      startDate,
      endDate,
      notes,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการประมวลผล Settlement Report' },
      { status: 500 }
    );
  }
}

