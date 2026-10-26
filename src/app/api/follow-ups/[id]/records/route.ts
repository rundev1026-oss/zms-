import { NextRequest, NextResponse } from 'next/server';
import { FollowUpService } from '@/services/followUpService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params;
    const body = await request.json();

    const {
      followupDate,
      visitFormat,
      location,
      inspectorId,
      inspectorName,
      inspectionDetails,
      visitResult,
      progressAssessment,
      problemsAndObstacles,
      additionalSupportNeeded,
      officerRecommendation,
      nextAppointmentDate,
      notes,
      requiresAdditional,
      attachments,
      actor,
    } = body;

    // Required Field Validations
    if (!inspectionDetails || inspectionDetails.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกรายละเอียดสิ่งที่ตรวจสอบ' },
        { status: 400 }
      );
    }

    if (!visitResult || visitResult.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกผลการติดตาม' },
        { status: 400 }
      );
    }

    if (!progressAssessment || progressAssessment.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกความก้าวหน้าของการช่วยเหลือ' },
        { status: 400 }
      );
    }

    // MANDATORY PHOTO PROOF: Requirement 5: ทุกครั้งที่บันทึกการติดตาม ต้องแนบรูปหลักฐานอย่างน้อย 1 รูป
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ข้อกำหนดของระบบ: ทุกครั้งที่บันทึกการติดตาม ต้องแนบรูปหลักฐานอย่างน้อย 1 รูปก่อนส่งบันทึกสำเร็จ',
        },
        { status: 400 }
      );
    }

    const currentActor = actor || {
      id: inspectorId || 'u-3',
      name: inspectorName || 'อุสมาน เจริญสุข',
      role: 'officer',
    };

    const result = await FollowUpService.recordVisit(
      planId,
      {
        followupDate: followupDate || new Date().toLocaleDateString('th-TH'),
        visitFormat: visitFormat || 'field_visit',
        location,
        inspectorId: inspectorId || currentActor.id,
        inspectorName: inspectorName || currentActor.name,
        inspectionDetails,
        visitResult,
        progressAssessment,
        problemsAndObstacles,
        additionalSupportNeeded,
        officerRecommendation,
        nextAppointmentDate,
        notes,
        requiresAdditional,
      },
      attachments,
      currentActor
    );

    return NextResponse.json({
      success: true,
      message: 'บันทึกผลการติดตามและรูปหลักฐานสำเร็จ',
      data: result,
    });
  } catch (error: any) {
    console.error('Error recording follow-up visit:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกผลการติดตาม' },
      { status: 400 }
    );
  }
}
