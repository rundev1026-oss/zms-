import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approvedAmount, fundId, notes, actor } = body;

    if (approvedAmount === undefined || !fundId || !actor) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ approvedAmount, fundId, actor)' },
        { status: 400 }
      );
    }

    const result = await BeneficiaryService.approveApplication(
      id,
      Number(approvedAmount),
      fundId,
      notes || 'อนุมัติวงเงินสวัสดิการ',
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
