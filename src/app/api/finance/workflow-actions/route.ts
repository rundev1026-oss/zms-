import { NextRequest, NextResponse } from 'next/server';
import { FinancialWorkflowService } from '@/services/financialWorkflowService';
import { getDb, initDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'kpi';

    if (view === 'kpi') {
      const kpi = await FinancialWorkflowService.getKpiBalances();
      return NextResponse.json({ success: true, data: kpi });
    }

    if (view === 'reconciliation') {
      const rec = await FinancialWorkflowService.getThreeWayReconciliation();
      return NextResponse.json({ success: true, data: rec });
    }

    if (view === 'register') {
      const tab = searchParams.get('tab') || 'all';
      const search = searchParams.get('search') || '';
      const items = await FinancialWorkflowService.getCashDisbursementRegister(tab, search);
      return NextResponse.json({ success: true, data: items });
    }

    if (view === 'applications') {
      await initDb();
      const db = getDb();
      // Get approved applications that are ready to disburse
      const res = await db.execute(`
        SELECT 
          a.id, a.application_no, a.beneficiary_id, b.full_name as beneficiary_name,
          b.national_id, a.asnaf_category, a.approved_amount, a.status
        FROM assistance_applications a
        LEFT JOIN beneficiaries b ON a.beneficiary_id = b.id
        WHERE a.status IN ('approved', 'wait_disbursement', 'pending')
        ORDER BY a.created_at DESC
        LIMIT 50
      `);
      return NextResponse.json({ success: true, data: res.rows });
    }

    if (view === 'categories') {
      await initDb();
      const db = getDb();
      const res = await db.execute(`
        SELECT id, code, name, group_name
        FROM admin_expense_categories
        WHERE is_active = 1
        ORDER BY order_index, code
      `);
      return NextResponse.json({ success: true, data: res.rows });
    }

    return NextResponse.json({ success: false, error: 'ไม่พบ view ที่ระบุ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, input, actor } = body;

    if (!action || !input || !actor) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องการ action, input, และ actor)' }, { status: 400 });
    }

    if (action === 'deposit') {
      const result = await FinancialWorkflowService.recordDeposit(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (action === 'withdrawal_workflow') {
      const result = await FinancialWorkflowService.recordWithdrawalWorkflow(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (action === 'transfer') {
      const result = await FinancialWorkflowService.recordTransfer(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (action === 'disburse_aid') {
      const result = await FinancialWorkflowService.deductAssistanceCashPayment(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'disburse_admin') {
      const result = await FinancialWorkflowService.deductAdminExpenseCash(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    return NextResponse.json({ success: false, error: `ไม่รองรับคำสั่ง "${action}"` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
