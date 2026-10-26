import { NextRequest, NextResponse } from 'next/server';
import { FollowUpService } from '@/services/followUpService';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params;
    const body = await request.json();
    const { minVisits, requiresFollowup, optOutReason, nextFollowupDate, assignedOfficerId, assignedOfficerName, notes, actor } = body;

    const currentActor = actor || {
      id: 'u-1',
      name: 'ผู้ดูแลระบบ',
      role: 'super_admin',
    };

    const updated = await FollowUpService.updatePlanSettings(
      planId,
      {
        minVisits,
        requiresFollowup,
        optOutReason,
        nextFollowupDate,
        assignedOfficerId,
        assignedOfficerName,
        notes,
      },
      currentActor
    );

    return NextResponse.json({
      success: true,
      message: 'ปรับปรุงข้อกำหนดแผนการติดตามสำเร็จ',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating follow-up plan settings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงแผนการติดตาม' },
      { status: 400 }
    );
  }
}
