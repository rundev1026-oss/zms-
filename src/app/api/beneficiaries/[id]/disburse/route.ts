import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { paymentRef, proofUrl, notes, amount, bankAccountId, paymentMethod, actor: bodyActor } = body;

    if (!paymentRef || !paymentRef.trim()) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุหมายเลขอ้างอิงการโอนเงิน paymentRef)' },
        { status: 400 }
      );
    }

    const actor = bodyActor || {
      id: 'u-finance-1',
      name: 'ฝ่ายการเงินและบัญชี',
      role: 'finance',
    };

    // 1. Enforce Phase 10 GL Double-Entry & Release Commitment in BeneficiaryService
    let localResult: any = null;
    try {
      localResult = await BeneficiaryService.recordDisbursement(
        id,
        paymentRef.trim(),
        proofUrl || '/slips/default-slip.jpg',
        notes || 'โอนเงินสวัสดิการสำเร็จ',
        actor
      );
    } catch (localErr: any) {
      return NextResponse.json(
        { success: false, error: localErr.message || 'ไม่สามารถบันทึกการเบิกจ่ายเงินได้' },
        { status: 422 }
      );
    }

    // 2. Also forward to Nest if running
    try {
      await proxyToNest('/finance/disburse', request, {
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
    } catch {}

    return NextResponse.json({
      success: true,
      data: localResult,
      message: `เบิกจ่ายเงินสงเคราะห์สำเร็จ ใบสำคัญเลขที่ ${localResult.journalNo} เลขอ้างอิง ${paymentRef.trim()}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกการเบิกจ่าย' },
      { status: 400 }
    );
  }
}

