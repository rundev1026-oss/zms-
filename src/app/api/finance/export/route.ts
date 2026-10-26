import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';

    if (format === 'csv' || format === 'excel') {
      const csvData = await FinancialService.exportTransactionsCsv();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `zms-financial-ledger-${dateStr}.csv`;

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Default JSON report
    const funds = await FinancialService.getFunds();
    const transactions = await FinancialService.getTransactions();

    return NextResponse.json({
      success: true,
      data: {
        funds,
        transactions,
        generatedAt: new Date().toLocaleString('th-TH'),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
