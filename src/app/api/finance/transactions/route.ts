import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await FinancialService.getTransactions({
      fundId: searchParams.get('fundId') || undefined,
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      moneyType: searchParams.get('moneyType') || undefined,
      bankAccountId: searchParams.get('bankAccountId') || undefined,
      asnaf: searchParams.get('asnaf') || undefined,
      year: searchParams.get('year') || searchParams.get('zakatYear') || undefined,
    });

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลธุรกรรม' },
      { status: 500 }
    );
  }
}
