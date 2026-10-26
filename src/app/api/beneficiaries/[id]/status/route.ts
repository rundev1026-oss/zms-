import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, actor } = body;

    if (!status || !actor) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ status และ actor)' },
        { status: 400 }
      );
    }

    const result = await BeneficiaryService.transitionApplicationStatus(
      id,
      status,
      notes || `เปลี่ยนสถานะเป็น ${status}`,
      actor
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะคำร้อง' },
      { status: 400 }
    );
  }
}
