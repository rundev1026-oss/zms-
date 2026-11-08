import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET() {
  try {
    const accounts = await FinancialService.getBankAccounts();
    return NextResponse.json({ success: true, data: accounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, input, action, actor } = body;

    if (!id || !actor) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ id และ actor)' }, { status: 400 });
    }

    if (action === 'set_default') {
      const result = await FinancialService.setDefaultBankAccount(id, actor);
      return NextResponse.json({ success: true, data: result });
    }

    if (input) {
      const result = await FinancialService.updateBankAccount(id, input, actor);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: 'ไม่พบคำสั่งที่ต้องการดำเนินการ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const role = req.headers.get('x-user-role') || 'super_admin';
    const actorId = req.headers.get('x-user-id') || 'super-admin-1';
    const actorName = req.headers.get('x-user-name') || 'Super Admin';

    if (!id) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุรหัสบัญชีที่ต้องการลบ (id)' }, { status: 400 });
    }

    const actor = { id: actorId, name: actorName, role };
    const result = await FinancialService.deleteBankAccount(id, actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
