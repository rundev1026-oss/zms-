import { NextRequest, NextResponse } from 'next/server';
import { FollowUpService } from '@/services/followUpService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = await FollowUpService.getPlanById(id);

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรายการติดตามผลที่ต้องการ' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error('Error fetching follow-up plan detail:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลรายละเอียดการติดตามผล' },
      { status: 500 }
    );
  }
}
