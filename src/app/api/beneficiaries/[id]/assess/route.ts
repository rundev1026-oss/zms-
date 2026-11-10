import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const assessmentData = body.assessment || body;
    const actor = body.actor || { id: 'u-1', name: 'เจ้าหน้าที่ลงพื้นที่', role: 'officer' };

    // Format clean payload for NestJS SubmitAssessmentDto
    const cleanPayload: Record<string, any> = {
      livingScore: Number(assessmentData.livingScore),
      housingCondition: String(assessmentData.housingCondition || 'poor'),
      housingNotes: assessmentData.housingNotes ? String(assessmentData.housingNotes) : '',
      debtBurdenSummary: assessmentData.debtBurdenSummary ? String(assessmentData.debtBurdenSummary) : '',
      primaryHardship: assessmentData.primaryHardship ? String(assessmentData.primaryHardship) : '',
      officerRecommendation: String(assessmentData.officerRecommendation || 'recommend_full'),
      recommendedAmount: Number(assessmentData.recommendedAmount ?? 0),
      generalNotes: assessmentData.generalNotes ? String(assessmentData.generalNotes) : '',
    };

    if (assessmentData.recommendedFundId) {
      cleanPayload.recommendedFundId = String(assessmentData.recommendedFundId);
    }
    if (assessmentData.recommendedSpecificFundId) {
      cleanPayload.recommendedSpecificFundId = String(assessmentData.recommendedSpecificFundId);
    }

    try {
      const res = await proxyToNest(`/assessments/${id}`, request, {
        method: 'POST',
        body: cleanPayload,
      });

      const json = await res.json();
      if (!res.ok) {
        let errorMessage = json.message || 'ไม่สามารถบันทึกผลการประเมินได้';
        if (Array.isArray(json.details) && json.details.length > 0) {
          const detailMessages = json.details.map((d: any) => d.message).filter(Boolean);
          if (detailMessages.length > 0) {
            errorMessage = detailMessages.join(', ');
          }
        }
        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            code: json.code || 'VALIDATION_ERROR',
            details: json.details || [],
          },
          { status: res.status }
        );
      }

      // Automatically sync assessment into SQLite so approval gating works seamlessly
      try {
        await BeneficiaryService.submitAssessment(id, cleanPayload as any, actor);
      } catch (localErr) {
        console.warn('Failed to sync assessment into SQLite:', localErr);
      }

      return NextResponse.json({
        success: true,
        data: json,
        message: 'บันทึกผลการประเมินเรียบร้อยแล้ว',
      });
    } catch (nestError) {
      // Fallback to SQLite service if NestJS API is temporarily unreachable
      console.warn('NestJS assessment endpoint unreachable, using SQLite fallback:', nestError);
      const result = await BeneficiaryService.submitAssessment(id, cleanPayload as any, actor);
      return NextResponse.json({
        success: true,
        data: result,
        message: 'บันทึกผลการประเมินเรียบร้อยแล้ว (Local DB)',
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกผลการประเมิน' },
      { status: 400 }
    );
  }
}
