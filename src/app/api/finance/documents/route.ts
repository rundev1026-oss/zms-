import { NextRequest, NextResponse } from 'next/server';
import { FinanceDocumentService } from '@/services/financeDocumentService';

export async function GET(req: NextRequest) {
  try {
    const view = req.nextUrl.searchParams.get('view') || 'cash';
    const data = view === 'movements'
      ? await FinanceDocumentService.listMovements()
      : view === 'admin'
        ? await FinanceDocumentService.listAdminExpenses()
        : view === 'applications'
          ? await FinanceDocumentService.searchPayableApplications(req.nextUrl.searchParams.get('q') || '')
          : view === 'resolutions'
            ? await FinanceDocumentService.listResolutions()
            : view === 'cash'
            ? await FinanceDocumentService.cashPosition()
            : null;
    if (!data) return NextResponse.json({ success: false, error: 'ไม่รู้จักมุมมองที่ขอ' }, { status: 400 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'อ่านข้อมูลไม่สำเร็จ' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const actor = body.actor;
    const input = body.input || {};
    if (!actor?.id || !actor?.role) {
      return NextResponse.json({ success: false, error: 'ต้องระบุผู้ทำรายการ' }, { status: 400 });
    }
    const data = await run(body.action, input, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ';
    const denied = message.includes('สิทธิ์') || message.includes('บทบาท');
    return NextResponse.json({ success: false, error: message }, { status: denied ? 403 : 400 });
  }
}

async function run(action: string, input: any, actor: { id: string; name: string; role: string }) {
  if (action === 'save_movement') return FinanceDocumentService.saveMovement(input, actor);
  if (action === 'movement_status') return FinanceDocumentService.setMovementStatus(input.id, input.status, actor);
  if (action === 'post_movement') return FinanceDocumentService.postMovement(input.id, actor);
  if (action === 'reverse_movement') return FinanceDocumentService.reverseMovement(input.id, actor, input.reason);
  if (action === 'save_admin') return FinanceDocumentService.saveAdminExpense(input, actor);
  if (action === 'admin_status') return FinanceDocumentService.setAdminStatus(input.id, input.status, actor);
  if (action === 'post_admin') return FinanceDocumentService.postAdminExpense(input.id, actor);
  if (action === 'create_resolution') return FinanceDocumentService.createResolution(input, actor);
  if (action === 'issue_voucher') return FinanceDocumentService.issueCashVoucher(input, actor);
  throw new Error('ไม่รู้จักคำสั่ง');
}
