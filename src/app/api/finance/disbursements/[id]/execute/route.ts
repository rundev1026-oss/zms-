import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { proofUrl, proofName, referenceNo, chequeClearingDate, notes, actor } = body;

    const targetActor = actor || {
      id: body.disbursedById || 'usr-finance-exec',
      name: body.disbursedByName || 'เจ้าหน้าที่โอนเงิน',
      role: body.disbursedByRole || 'finance',
    };

    const result = await FinancialService.executePaymentDisbursement(
      {
        voucherId: id,
        proofUrl,
        proofName,
        referenceNo,
        chequeClearingDate,
        notes,
      },
      targetActor
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const isForbidden = error.message.includes('การละเมิดสิทธิ์');
    return NextResponse.json(
      { success: false, error: error.message },
      { status: isForbidden ? 403 : 400 }
    );
  }
}

