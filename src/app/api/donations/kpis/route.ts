import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET() {
  try {
    const kpis = await FinancialService.getDonationKPIs();
    return NextResponse.json({ success: true, data: kpis });
  } catch (error: any) {
    console.error('Failed to get donation KPIs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการคำนวณ KPI' },
      { status: 500 }
    );
  }
}

