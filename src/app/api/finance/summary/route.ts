import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET() {
  try {
    const funds = await FinancialService.getFunds();
    const banks = await FinancialService.getBankAccounts();

    return NextResponse.json({
      success: true,
      data: {
        totalReceived: funds.reduce((sum, fund) => sum + fund.totalReceived, 0),
        totalAvailable: funds.reduce((sum, fund) => sum + fund.availableAmount, 0),
        totalCommitted: funds.reduce((sum, fund) => sum + fund.committedAmount, 0),
        totalDisbursed: funds.reduce((sum, fund) => sum + fund.disbursedAmount, 0),
        fundsCount: funds.length,
        bankCount: banks.filter((bank) => bank.status === 'active').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปงบประมาณ' },
      { status: 500 }
    );
  }
}
