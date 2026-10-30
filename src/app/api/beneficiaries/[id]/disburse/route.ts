import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { paymentRef, proofUrl, notes, amount, bankAccountId, paymentMethod } = body;

    if (!paymentRef || !paymentRef.trim()) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุหมายเลขอ้างอิงการโอนเงิน paymentRef)' },
        { status: 400 }
      );
    }

    const res = await proxyToNest('/finance/disburse', request, {
      method: 'POST',
      body: {
        applicationId: id,
        paymentRef: paymentRef.trim(),
        proofUrl: proofUrl || '/slips/default-slip.jpg',
        notes: notes || 'โอนเงินสวัสดิการสำเร็จ',
        amount: amount ? Number(amount) : undefined,
        bankAccountId,
        paymentMethod: paymentMethod || 'bank_transfer',
      },
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถบันทึกการเบิกจ่ายเงินได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
      message: `เบิกจ่ายเงินสงเคราะห์สำเร็จ เลขที่ธุรกรรม ${json.transactionNo}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกการเบิกจ่าย' },
      { status: 400 }
    );
  }
}
