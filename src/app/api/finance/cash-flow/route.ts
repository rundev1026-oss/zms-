import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get('audit_summary') === 'true') {
      const workflowId = searchParams.get('workflowId');
      if (!workflowId) {
        return NextResponse.json({ success: false, error: 'ต้องระบุ workflowId' }, { status: 400 });
      }
      const summary = await FinancialService.getWorkflowAuditSummary(workflowId);
      return NextResponse.json({ success: true, data: summary });
    }

    if (searchParams.get('history') === 'true') {
      const search = searchParams.get('search') || undefined;
      const category = searchParams.get('category') || undefined;
      const paymentType = searchParams.get('paymentType') || undefined;
      const asnaf = searchParams.get('asnaf') || undefined;
      const assistanceType = searchParams.get('assistanceType') || undefined;
      const officeCategory = searchParams.get('officeCategory') || undefined;
      const payee = searchParams.get('payee') || undefined;
      const startDate = searchParams.get('startDate') || undefined;
      const endDate = searchParams.get('endDate') || undefined;
      const status = searchParams.get('status') || undefined;
      const responsiblePerson = searchParams.get('responsiblePerson') || undefined;
      const voucherNo = searchParams.get('voucherNo') || undefined;
      const workflowId = searchParams.get('workflowId') || undefined;

      const history = await FinancialService.getCashMovementHistory({ 
        search, 
        category,
        paymentType,
        asnaf,
        assistanceType,
        officeCategory,
        payee,
        startDate, 
        endDate,
        status,
        responsiblePerson,
        voucherNo,
        workflowId
      });
      return NextResponse.json({ success: true, data: history });
    }

    if (searchParams.get('categories') === 'true') {
      const includeInactive = searchParams.get('includeInactive') === 'true';
      const categories = await FinancialService.getAdminExpenseCategories(includeInactive);
      return NextResponse.json({ success: true, data: categories });
    }

    if (searchParams.get('clearance_items') === 'true') {
      const withdrawalId = searchParams.get('withdrawalId');
      if (!withdrawalId) {
        return NextResponse.json({ success: false, error: 'ต้องระบุ withdrawalId' }, { status: 400 });
      }
      const items = await FinancialService.getPettyCashClearanceItems(withdrawalId);
      return NextResponse.json({ success: true, data: items });
    }

    if (searchParams.get('categorized_apps') === 'true') {
      const search = searchParams.get('search') || undefined;
      const asnaf = searchParams.get('asnaf') || undefined;

      const data = await FinancialService.getCategorizedAssistanceApplications(search, asnaf);
      return NextResponse.json({ success: true, data });
    }

    if (searchParams.get('approved_apps') === 'true') {
      const search = searchParams.get('search') || undefined;
      const asnaf = searchParams.get('asnaf') || undefined;

      const approvedApps = await FinancialService.getApprovedAssistanceApplications(search, asnaf);
      return NextResponse.json({ success: true, data: approvedApps });
    }

    if (searchParams.get('handovers') === 'true') {
      const search = searchParams.get('search') || undefined;
      const status = searchParams.get('status') || undefined;
      const handovers = await FinancialService.getVoucherHandovers(search, status);
      return NextResponse.json({ success: true, data: handovers });
    }

    if (searchParams.get('next_voucher_no') === 'true' || searchParams.get('action') === 'next_voucher_no') {
      const year = searchParams.get('year') || FinancialService.extractDocumentYear();
      const nextVoucherNo = await FinancialService.getNextWithdrawalNo(year);
      return NextResponse.json({ success: true, nextVoucherNo, data: nextVoucherNo });
    }

    const workflows = await FinancialService.getCashFlowWorkflows();
    return NextResponse.json({ success: true, data: workflows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, input, actor } = body;

    if (!input || !actor) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    if (action === 'validate_app_for_withdrawal') {
      const result = await FinancialService.validateApplicationForWithdrawal(input.applicationId, actor);
      if (!result.valid) {
        return NextResponse.json({ success: false, error: result.reason, data: result }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'create_admin_category') {
      const result = await FinancialService.createAdminExpenseCategory(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (action === 'update_admin_category') {
      const result = await FinancialService.updateAdminExpenseCategory(input.id, input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'toggle_admin_category') {
      const result = await FinancialService.toggleAdminExpenseCategoryStatus(input.id, input.isActive, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'add_withdrawal') {
      const result = await FinancialService.addCashFlowWithdrawal(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (action === 'clear_petty_cash') {
      const result = await FinancialService.clearPettyCash(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'confirm_disbursement') {
      const result = await FinancialService.confirmCashDisbursement(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'record_handover') {
      const result = await FinancialService.recordFinanceHandover(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'add_attachment') {
      const result = await FinancialService.addWorkflowAttachment(input, actor);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    const result = await FinancialService.createCashFlowWorkflow(input, actor);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { action, step, workflowId, withdrawalId, handoverId, reason, input, actor } = body;

    if (action === 'cancel_handover') {
      if (!handoverId || !reason || !actor) {
        return NextResponse.json({ success: false, error: 'ข้อมูลการยกเลิกการส่งมอบไม่ครบถ้วน' }, { status: 400 });
      }
      const result = await FinancialService.cancelFinanceHandover(handoverId, reason, actor);
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (action === 'cancel_withdrawal') {
      if (!withdrawalId || !reason || !actor) {
        return NextResponse.json({ success: false, error: 'ข้อมูลการยกเลิกรายการเบิกไม่ครบถ้วน' }, { status: 400 });
      }
      const result = await FinancialService.cancelCashFlowWithdrawal(withdrawalId, reason, actor);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'update_withdrawal') {
      if (!withdrawalId || !input || !actor) {
        return NextResponse.json({ success: false, error: 'ข้อมูลการปรับปรุงใบสำคัญไม่ครบถ้วน' }, { status: 400 });
      }
      const result = await FinancialService.updateCashFlowWithdrawal(withdrawalId, input, actor);
      return NextResponse.json({ success: true, data: result });
    }

    if (!step || !workflowId || !input || !actor) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    let result;
    if (step === 1) {
      result = await FinancialService.advanceWorkflowToStep1(workflowId, input, actor);
    } else if (step === 2) {
      result = await FinancialService.advanceWorkflowToStep2(workflowId, input, actor);
    } else if (step === 3) {
      result = await FinancialService.advanceWorkflowToStep3(workflowId, input, actor);
    } else if (step === 4) {
      result = await FinancialService.advanceWorkflowToStep4(workflowId, input, actor);
    } else if (step === 5) {
      result = await FinancialService.advanceWorkflowToStep5(workflowId, input, actor);
    } else {
      return NextResponse.json({ success: false, error: 'ขั้นตอนไม่ถูกต้อง' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get('workflowId');

    const actor = {
      id: searchParams.get('actorId') || 'u-1',
      name: searchParams.get('actorName') || 'ผู้ดูแลระบบ',
      role: searchParams.get('actorRole') || 'super_admin',
    };

    if (!workflowId) {
      return NextResponse.json({ success: false, error: 'ต้องระบุ workflowId ที่ต้องการลบ' }, { status: 400 });
    }

    const result = await FinancialService.deleteCashFlowWorkflow(workflowId, actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

