import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { input, actor } = body;

    if (!input || !actor) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ input และ actor)' }, { status: 400 });
    }

    const result = await FinancialService.recordIncome(input, actor);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    const isConflict = error.message.includes('ตรวจพบธุรกรรมซ้ำ');
    return NextResponse.json(
      { success: false, error: error.message },
      { status: isConflict ? 409 : 400 }
    );
  }
}
