import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bankAccountId = searchParams.get('bankAccountId') || undefined;
    const transactions = await FinancialService.getBankTransactions(bankAccountId);
    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, input, actor } = body;

    if (!action || !input || !actor) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ action, input, และ actor)' }, { status: 400 });
    }

    if (action === 'transfer') {
      const result = await FinancialService.transferBetweenBankAccounts(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } else if (action === 'deposit') {
      const result = await FinancialService.depositCashToBank(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } else if (action === 'withdraw') {
      const result = await FinancialService.withdrawCashFromBank(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } else {
      return NextResponse.json({ success: false, error: `ไม่รองรับประเภทคำสั่ง "${action}"` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
