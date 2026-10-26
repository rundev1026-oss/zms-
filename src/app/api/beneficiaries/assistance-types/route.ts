import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function GET() {
  try {
    const types = await BeneficiaryService.getAssistanceTypes();
    return NextResponse.json({ success: true, data: types });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงประเภทความช่วยเหลือ' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, description, actor } = body;

    if (!name || !category || !actor) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ name, category, actor)' },
        { status: 400 }
      );
    }

    const result = await BeneficiaryService.addAssistanceType(
      name,
      category,
      description || '',
      actor
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเพิ่มประเภทความช่วยเหลือ' },
      { status: 400 }
    );
  }
}
