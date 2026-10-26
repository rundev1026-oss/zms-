import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { paymentRef, proofUrl, notes, actor } = body;

    if (!paymentRef || !actor) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ paymentRef และ actor)' },
        { status: 400 }
      );
    }

    const result = await BeneficiaryService.recordDisbursement(
      id,
      paymentRef,
      proofUrl || '/slips/default-slip.jpg',
      notes || 'โอนเงินสวัสดิการสำเร็จ',
      actor
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
