import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const zakatYear = searchParams.get('zakatYear') || undefined;
    const startDate = searchParams.get('startDate') || searchParams.get('dateFrom') || undefined;
    const endDate = searchParams.get('endDate') || searchParams.get('dateTo') || undefined;

    const result = await FinancialService.calculateVerifiedAidExpenses({
      zakatYear,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
