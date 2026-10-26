import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    const data = await FinancialService.getVoucherHandovers(search, status);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { input, actor, action } = body;

    // Support both direct payload and wrapped payload
    const handoverInput = input || body;
    const handoverActor = actor || {
      id: body.actorId || 'u-5',
      name: body.actorName || 'เจ้าหน้าที่ฝ่ายการเงิน',
      role: body.actorRole || 'finance',
    };

    if (action === 'cancel' || body.action === 'cancel_handover') {
      const result = await FinancialService.cancelFinanceHandover(
        body.handoverId,
        body.reason || 'ยกเลิกรายการส่งมอบเงิน',
        handoverActor
      );
      return NextResponse.json({ success: true, data: result });
    }

    const result = await FinancialService.recordFinanceHandover(handoverInput, handoverActor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { handoverId, reason, actor } = body;

    if (!handoverId || !reason || !actor) {
      return NextResponse.json({ success: false, error: 'ข้อมูลการยกเลิกไม่ครบถ้วน' }, { status: 400 });
    }

    const result = await FinancialService.cancelFinanceHandover(handoverId, reason, actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
