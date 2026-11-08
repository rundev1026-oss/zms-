import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(request: NextRequest) {
  try {
    const bankAccountId = new URL(request.url).searchParams.get('bankAccountId') || undefined;
    const data = await FinancialService.getBankReconciliations(bankAccountId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลการกระทบยอด' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, actor } = body;

    if (!input || !actor || !input.bankAccountId || input.statementBalance === undefined) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (กรุณาระบุบัญชีและยอดตามสเตตเมนต์)' },
        { status: 400 }
      );
    }

    const result = await FinancialService.reconcileBankAccount(
      {
        ...input,
        statementBalance: Number(input.statementBalance),
      },
      actor
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
