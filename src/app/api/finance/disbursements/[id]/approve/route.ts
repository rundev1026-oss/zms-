import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, notes, actor } = body;

    const targetActor = actor || {
      id: body.approvedById || 'usr-approver-1',
      name: body.approvedByName || 'ผู้อนุมัติฝ่ายการเงิน',
      role: body.approvedByRole || 'finance',
    };

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ถูกต้อง (action ต้องเป็น approve หรือ reject)' },
        { status: 400 }
      );
    }

    const result = await FinancialService.approvePaymentVoucher(
      { voucherId: id, action, notes },
      targetActor
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const isForbidden = error.message.includes('ไม่อนุญาต') || error.message.includes('เกินสิทธิ์');
    return NextResponse.json(
      { success: false, error: error.message },
      { status: isForbidden ? 403 : 400 }
    );
  }
}

