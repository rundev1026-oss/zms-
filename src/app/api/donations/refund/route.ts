import { NextRequest, NextResponse } from 'next/server';
import { PaymentGatewayAdapter } from '@/lib/paymentGatewayAdapter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transactionIdOrRef, refundAmount, reason, actor } = body;

    if (!transactionIdOrRef || !refundAmount || !reason || !actor) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน: ต้องระบุ transactionIdOrRef, refundAmount, reason, actor' },
        { status: 400 }
      );
    }

    const result = await PaymentGatewayAdapter.processRefund({
      transactionIdOrRef,
      refundAmount: Number(refundAmount),
      reason,
      auditor: actor,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการประมวลผลการคืนเงิน' },
      { status: 400 }
    );
  }
}

