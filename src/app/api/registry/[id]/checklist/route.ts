import { NextRequest, NextResponse } from 'next/server';
import { RegistryService } from '@/services/registryService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { checklist, actor } = body;

    if (!checklist || !actor) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ checklist และ actor)' },
        { status: 400 }
      );
    }

    const result = await RegistryService.updateBeneficiaryChecklist(id, checklist, actor);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึก Checklist' },
      { status: 400 }
    );
  }
}
