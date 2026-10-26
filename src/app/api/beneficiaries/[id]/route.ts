import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const application = await BeneficiaryService.getApplicationById(id);
    return NextResponse.json({ success: true, data: application });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่พบข้อมูลคำร้อง' },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { input, actor } = body;

    if (!input || !actor) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ input และ actor)' },
        { status: 400 }
      );
    }

    const result = await BeneficiaryService.updateApplication(id, input, actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการแก้ไขคำร้อง' },
      { status: 400 }
    );
  }
}
