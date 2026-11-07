import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const actor = {
      id: body.actorId || 'super-admin-1',
      name: body.actorName || 'ผู้ดูแลระบบ',
      role: body.actorRole || 'super_admin',
    };

    const result = await BeneficiaryService.closeAssistanceRequest(
      id,
      body.closingNotes || 'ปิดกระบวนการคำร้องเรียบร้อยแล้ว',
      actor,
      { waiveFollowup: Boolean(body.waiveFollowup) }
    );

    const state = await BeneficiaryService.getLifecycleState(id);
    return NextResponse.json({
      success: true,
      message: 'ปิดกระบวนการคำร้องขอรับความช่วยเหลือเรียบร้อยแล้ว',
      data: result,
      lifecycle: state,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปิดคำร้อง' },
      { status: 422 }
    );
  }
}

