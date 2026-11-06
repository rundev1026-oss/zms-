import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, reason, actor } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ action ("approve" หรือ "reject")' },
        { status: 400 }
      );
    }

    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลผู้ทำรายการ (actor)' },
        { status: 401 }
      );
    }

    const result = await FinancialService.verifyPendingTransaction(
      id,
      action as 'approve' | 'reject',
      reason,
      actor
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error verifying transaction:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบรายการ' },
      { status: 400 }
    );
  }
}

