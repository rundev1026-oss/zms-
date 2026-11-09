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

    if (view === 'categories' || view === 'admin_categories') {
      const items = await FinancialWorkflowService.getAdminExpenseCategoriesList();
      return NextResponse.json({ success: true, data: items });
    }

    if (view === 'treasurer_accounts' || view === 'treasurer_account') {
      const items = await FinancialWorkflowService.getEligibleTreasurerAccounts();
      return NextResponse.json({ success: true, data: items });
    }

    if (view === 'eligible_applications') {
      const search = searchParams.get('search') || '';
      const items = await FinancialWorkflowService.getEligibleAssistanceApplications(search);
      return NextResponse.json({ success: true, data: items });
    }

    if (view === 'batch_list') {
      const tab = searchParams.get('tab') || 'all';
      const search = searchParams.get('search') || '';
      const result = await FinancialWorkflowService.getBatchDisbursementList({ tab, search });
      return NextResponse.json({ success: true, data: result });
    }

    if (view === 'batch_detail') {
      const workflowId = searchParams.get('workflowId') || searchParams.get('id');
      if (!workflowId) {
        return NextResponse.json({ success: false, error: 'ต้องระบุ workflowId' }, { status: 400 });
      }
      const result = await FinancialWorkflowService.getBatchDisbursementDetail(workflowId);
      if (!result) {
        return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลรอบการเบิก' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: result });
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

    // =========================================================================
    // TWO-ROLE BATCH DISBURSEMENT ACTIONS
    // =========================================================================
    if (action === 'create_batch') {
      const result = await FinancialWorkflowService.createBatchDisbursement(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (action === 'submit_batch') {
      const result = await FinancialWorkflowService.submitBatchForApproval(input.workflowId, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'treasurer_review') {
      const result = await FinancialWorkflowService.treasurerReviewBatch(input.workflowId, input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'handover_cash') {
      const result = await FinancialWorkflowService.handoverBatchCash(input.workflowId, input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'confirm_receipt') {
      const result = await FinancialWorkflowService.staffConfirmCashReceipt(input.workflowId, input.handoverId, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'settle_item') {
      const result = await FinancialWorkflowService.settleBatchLineItem(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'record_refund') {
      const result = await FinancialWorkflowService.recordBatchRefund(input.workflowId, input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'close_round') {
      const result = await FinancialWorkflowService.closeBatchRound(input.workflowId, input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    return NextResponse.json({ success: false, error: `ไม่รองรับคำสั่ง "${action}"` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
