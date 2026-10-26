import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get('applicationId');
    const search = searchParams.get('search') || undefined;
    const financeStatus = searchParams.get('financeStatus') || undefined;
    const assistanceStatus = searchParams.get('assistanceStatus') || undefined;
    const officerId = searchParams.get('officerId') || undefined;

    // Extract actor context
    const actor = {
      id: req.headers.get('x-user-id') || searchParams.get('actorId') || 'u-admin',
      name: req.headers.get('x-user-name') || searchParams.get('actorName') || 'ผู้ดูแลระบบ',
      role: req.headers.get('x-user-role') || searchParams.get('actorRole') || 'super_admin',
    };

    if (applicationId) {
      const data = await FinancialService.getAssistanceFinancialDetails(applicationId, actor);
      return NextResponse.json({ success: true, data });
    }

    const data = await FinancialService.getAssistanceRecordsWithFinancialStatus(actor, {
      search,
      financeStatus,
      assistanceStatus,
      officerId,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const isPermissionError = error.message?.includes('ไม่อนุญาต');
    return NextResponse.json(
      { success: false, error: error.message },
      { status: isPermissionError ? 403 : 400 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, applicationId, input, actor } = body;

    const currentActor = actor || {
      id: body.actorId || 'u-3',
      name: body.actorName || 'อุสมาน เจริญสุข',
      role: body.actorRole || 'officer',
    };

    if (action === 'record_refund') {
      const result = await FinancialService.recordAssistanceRefund(
        {
          applicationId: applicationId || input?.applicationId || body.applicationId,
          withdrawalId: input?.withdrawalId || body.withdrawalId,
          workflowId: input?.workflowId || body.workflowId,
          refundDate: input?.refundDate || body.refundDate || new Date().toISOString().slice(0, 10),
          refundTime: input?.refundTime || body.refundTime,
          refundAmount: Number(input?.refundAmount ?? body.refundAmount ?? 0),
          refundReason: input?.refundReason || body.refundReason || 'เงินช่วยเหลือคงเหลือ',
          returnedById: input?.returnedById || body.returnedById || currentActor.id,
          returnedByName: input?.returnedByName || body.returnedByName || currentActor.name,
          receivedById: input?.receivedById || body.receivedById || currentActor.id,
          receivedByName: input?.receivedByName || body.receivedByName || currentActor.name,
          targetBankAccountId: input?.targetBankAccountId || body.targetBankAccountId,
          targetFundId: input?.targetFundId || body.targetFundId,
          proofUrl: input?.proofUrl || body.proofUrl,
          proofName: input?.proofName || body.proofName,
          proofSize: input?.proofSize || body.proofSize,
          proofType: input?.proofType || body.proofType,
          notes: input?.notes || body.notes,
        },
        currentActor
      );
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'cancel_refund') {
      const refundId = String(body.refundId || input?.refundId || '');
      const cancellationReason = String(body.cancellationReason || input?.cancellationReason || '');
      const result = await FinancialService.cancelAssistanceRefund(
        refundId,
        cancellationReason,
        currentActor
      );
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'get_refunds') {
      const result = await FinancialService.getAssistanceRefunds({
        applicationId: applicationId || input?.applicationId || body.applicationId,
        withdrawalId: input?.withdrawalId || body.withdrawalId,
        workflowId: input?.workflowId || body.workflowId,
        status: input?.status || body.status,
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ applicationId' },
        { status: 400 }
      );
    }

    if (action === 'get_financial_details') {
      const result = await FinancialService.getAssistanceFinancialDetails(applicationId, currentActor);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'discrepancy' || body.category) {
      const result = await FinancialService.reportAssistanceDiscrepancy(
        applicationId,
        {
          withdrawalId: input?.withdrawalId || body.withdrawalId,
          category: input?.category || body.category || 'amount_mismatch',
          notes: input?.notes || body.notes || '',
          expectedAmount: input?.expectedAmount ?? body.expectedAmount,
          actualAmount: input?.actualAmount ?? body.actualAmount,
        },
        currentActor
      );
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'draft_execution') {
      const result = await FinancialService.saveAssistanceExecutionDraft(
        {
          applicationId,
          withdrawalId: input?.withdrawalId || body.withdrawalId,
          installmentNo: input?.installmentNo || body.installmentNo || 1,
          totalInstallments: input?.totalInstallments || body.totalInstallments || 1,
          executionDate: input?.executionDate || body.executionDate,
          executionTime: input?.executionTime || body.executionTime,
          assistanceOutcome: input?.assistanceOutcome || body.assistanceOutcome || 'บันทึกแบบร่าง',
          actualDisbursedAmount: Number(input?.actualDisbursedAmount ?? body.actualDisbursedAmount ?? 0),
          actualAssistanceValue: input?.actualAssistanceValue !== undefined ? Number(input.actualAssistanceValue) : undefined,
          details: input?.details || body.details,
          proofUrl: input?.proofUrl || body.proofUrl,
          proofName: input?.proofName || body.proofName,
          proofSize: input?.proofSize || body.proofSize,
          proofType: input?.proofType || body.proofType,
          isConfirmed: false,
          confirmationStatement: '',
          status: 'draft',
        },
        currentActor
      );
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'confirm_completion') {
      const result = await FinancialService.confirmAssistanceCompletion(
        {
          applicationId,
          withdrawalId: input?.withdrawalId || body.withdrawalId,
          installmentNo: input?.installmentNo || body.installmentNo || 1,
          totalInstallments: input?.totalInstallments || body.totalInstallments || 1,
          executionDate: input?.executionDate || body.executionDate,
          executionTime: input?.executionTime || body.executionTime,
          assistanceOutcome: input?.assistanceOutcome || body.assistanceOutcome,
          actualDisbursedAmount: Number(input?.actualDisbursedAmount ?? body.actualDisbursedAmount ?? 0),
          actualAssistanceValue: input?.actualAssistanceValue !== undefined ? Number(input.actualAssistanceValue) : undefined,
          details: input?.details || body.details,
          proofUrl: input?.proofUrl || body.proofUrl,
          proofName: input?.proofName || body.proofName,
          proofSize: input?.proofSize || body.proofSize,
          proofType: input?.proofType || body.proofType,
          isConfirmed: Boolean(input?.isConfirmed ?? body.isConfirmed),
          confirmationStatement: input?.confirmationStatement || body.confirmationStatement || '',
          status: input?.status || body.status,
        },
        currentActor
      );
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'edit_execution') {
      const recordId = String(body.recordId || input?.recordId || '');
      const editReason = String(body.editReason || input?.editReason || '');
      const result = await FinancialService.editConfirmedAssistanceCompletion(
        recordId,
        {
          ...input,
          editReason,
        },
        currentActor
      );
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'cancel_execution') {
      const recordId = String(body.recordId || input?.recordId || '');
      const cancellationReason = String(body.cancellationReason || input?.cancellationReason || '');
      const result = await FinancialService.cancelAssistanceExecution(
        recordId,
        cancellationReason,
        currentActor
      );
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'get_execution_records') {
      const result = await FinancialService.getAssistanceExecutionRecords(applicationId, currentActor);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: 'ไม่พบคำสั่ง (action) ที่ระบุ' },
      { status: 400 }
    );
  } catch (error: any) {
    const isPermissionError = error.message?.includes('ไม่อนุญาต');
    return NextResponse.json(
      { success: false, error: error.message },
      { status: isPermissionError ? 403 : 400 }
    );
  }
}
