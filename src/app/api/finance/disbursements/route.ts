import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const fundId = searchParams.get('fundId') || undefined;
    const bankAccountId = searchParams.get('bankAccountId') || undefined;
    const paymentMethod = searchParams.get('paymentMethod') || undefined;
    const asnafCategory = searchParams.get('asnafCategory') || undefined;
    const search = searchParams.get('search') || undefined;

    const vouchers = await FinancialService.getPaymentVouchers({
      status,
      fundId,
      bankAccountId,
      paymentMethod,
      asnafCategory,
      search,
    });

    return NextResponse.json({ success: true, data: vouchers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลใบสำคัญจ่าย' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { input, actor } = body;

    const targetInput = input || body;
    const targetActor = actor || {
      id: body.createdById || 'usr-officer-1',
      name: body.createdByName || 'เจ้าหน้าที่การเงิน',
      role: body.createdByRole || 'officer',
    };

    if (!targetInput.applicationId) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ applicationId)' },
        { status: 400 }
      );
    }

    const voucher = await FinancialService.createPaymentVoucher(targetInput, targetActor);
    return NextResponse.json({ success: true, data: voucher }, { status: 201 });
  } catch (error: any) {
    const isConflict = error.message.includes('มีใบสำคัญจ่าย') || error.message.includes('ซ้ำ');
    return NextResponse.json(
      { success: false, error: error.message },
      { status: isConflict ? 409 : 400 }
    );
  }
}

