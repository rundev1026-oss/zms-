import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const actor = {
      id: body.actorId || 'officer-1',
      name: body.actorName || 'เจ้าหน้าที่ผู้ส่งมอบ',
      role: body.actorRole || 'officer',
    };

    const result = await BeneficiaryService.recordDelivery(
      id,
      {
        deliveryDate: body.deliveryDate,
        deliveryRef: body.deliveryRef,
        proofUrl: body.proofUrl,
        notes: body.notes,
        deliveredByName: body.deliveredByName,
      },
      actor
    );

    const state = await BeneficiaryService.getLifecycleState(id);
    return NextResponse.json({
      success: true,
      message: 'บันทึกการส่งมอบความช่วยเหลือสำเร็จ',
      data: result,
      lifecycle: state,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกการส่งมอบ' },
      { status: 422 }
    );
  }
}

