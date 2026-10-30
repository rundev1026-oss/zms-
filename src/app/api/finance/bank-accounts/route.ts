import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';
import { FinancialService } from '@/services/financialService';

export async function GET(request: NextRequest) {
  try {
    const res = await proxyToNest('/finance/bank-accounts', request, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ success: true, data });
    }
    const accounts = await FinancialService.getBankAccounts();
    return NextResponse.json({ success: true, data: accounts });
  } catch (error: any) {
    try {
      const accounts = await FinancialService.getBankAccounts();
      return NextResponse.json({ success: true, data: accounts });
    } catch {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { input, actor } = body;

    if (!input || !actor) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const result = await FinancialService.createBankAccount(input, actor);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status, actor } = body;

    if (!id || !status || !actor) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const result = await FinancialService.toggleBankAccountStatus(id, status, actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
