import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bankAccountId = searchParams.get('bankAccountId') || undefined;

    const logs = await FinancialService.getBankAccountChangeLogs(bankAccountId);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

