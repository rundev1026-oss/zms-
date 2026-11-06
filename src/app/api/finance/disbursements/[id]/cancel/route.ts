import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { reason, actor } = body;

    const targetActor = actor || {
      id: body.cancelledById || 'usr-officer-1',
      name: body.cancelledByName || 'เจ้าหน้าที่การเงิน',
      role: body.cancelledByRole || 'officer',
    };

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุเหตุผลในการยกเลิกใบสำคัญจ่าย' },
        { status: 400 }
      );
    }

    const result = await FinancialService.cancelPaymentVoucher(id, reason, targetActor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

