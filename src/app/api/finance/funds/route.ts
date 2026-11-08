import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET() {
  try {
    const funds = await FinancialService.getFunds();
    return NextResponse.json({ success: true, data: funds });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลกองทุน' },
      { status: 500 }
    );
  }
}
