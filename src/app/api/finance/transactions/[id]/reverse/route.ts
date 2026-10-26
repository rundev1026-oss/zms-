import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { reason, actor } = body;

    if (!reason || !actor) {
      return NextResponse.json({ success: false, error: 'ต้องระบุเหตุผลในการกลับรายการและผู้ดำเนินการ' }, { status: 400 });
    }

    const result = await FinancialService.reverseTransaction(id, reason, actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
