import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'default';
    const format = searchParams.get('format') || 'json';
    const year = searchParams.get('year') || '2569';

    if (format === 'csv') {
      const csv = await FinancialService.exportReportCsv(reportType, { year });
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="zms-financial-report-${reportType}-${Date.now()}.csv"`,
        },
      });
    }

    const report = await FinancialService.getFinancialReports(reportType, { year });
    return NextResponse.json({ success: true, data: report });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
