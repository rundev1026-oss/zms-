import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET() {
  try {
    const batches = await FinancialService.getPaymentReconciliations();
    return NextResponse.json({ success: true, data: batches });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { input, actor } = body;

    if (!input || !actor) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ input และ actor)' }, { status: 400 });
    }

    const result = await FinancialService.reconcilePaymentsAndBank(input, actor);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

