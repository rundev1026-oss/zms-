import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get('fundId') || undefined;
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const moneyType = searchParams.get('moneyType') || undefined;
    const bankAccountId = searchParams.get('bankAccountId') || undefined;
    const year = searchParams.get('year') || undefined;

    const txns = await FinancialService.getTransactions({
      fundId,
      type,
      status,
      search,
      moneyType,
      bankAccountId,
      year,
    });

    return NextResponse.json({ success: true, data: txns });
  } catch (error: any) {
    console.error('Failed to list donations/transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงรายการธุรกรรม' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { input, actor } = body;

    if (!input || !actor) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ input และ actor)' },
        { status: 400 }
      );
    }

    const result = await FinancialService.recordDonation(input, actor);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    const isConflict = error.message.includes('ตรวจพบธุรกรรมซ้ำ');
    return NextResponse.json(
      { success: false, error: error.message },
      { status: isConflict ? 409 : 400 }
    );
  }
}

