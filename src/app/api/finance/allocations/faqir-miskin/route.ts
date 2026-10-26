import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || '2569';
    const view = searchParams.get('view');

    if (view === 'history') {
      const history = await FinancialService.getFaqirMiskinHistory(year);
      return NextResponse.json({ success: true, data: history });
    }

    const subFunds = await FinancialService.getFaqirMiskinSubFunds(year);
    return NextResponse.json({ success: true, data: subFunds });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { subFunds, fiscalYear, policyRef, reason, actor } = body;

    if (!subFunds || !policyRef || !reason || !actor) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const result = await FinancialService.updateFaqirMiskinSubFunds(
      subFunds,
      fiscalYear || '2569',
      policyRef,
      reason,
      actor
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
