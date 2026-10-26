import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const zakatYear = searchParams.get('zakatYear') || undefined;
    const moneyType = searchParams.get('moneyType') || undefined;
    const bankAccountId = searchParams.get('bankAccountId') || undefined;
    const asnaf = searchParams.get('asnaf') || undefined;
    const fundId = searchParams.get('fundId') || undefined;

    const summary = await FinancialService.getDashboardSummary({
      dateFrom,
      dateTo,
      zakatYear,
      moneyType,
      bankAccountId,
      asnaf,
      fundId,
    });

    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
