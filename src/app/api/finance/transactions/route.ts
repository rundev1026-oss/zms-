import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fundId = searchParams.get('fundId') || undefined;
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const transactions = await FinancialService.getTransactions({
      fundId,
      type,
      status,
      search,
    });

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
