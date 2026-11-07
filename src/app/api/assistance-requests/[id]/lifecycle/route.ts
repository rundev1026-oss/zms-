import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const state = await BeneficiaryService.getLifecycleState(id);
    return NextResponse.json({ success: true, data: state });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะวงจรชีวิตคำร้อง' },
      { status: error.message?.includes('ไม่พบ') ? 404 : 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = String(body.action || '').toUpperCase();

    const actor = {
      id: body.actorId || 'officer-1',
      name: body.actorName || 'เจ้าหน้าที่ผู้รับผิดชอบ',
      role: body.actorRole || 'officer',
    };

    let result: any = null;

    switch (action) {
      case 'START_ASSESSMENT':
        result = await BeneficiaryService.startAssessment(id, actor);
        break;

      case 'SUBMIT_ASSESSMENT':
        result = await BeneficiaryService.submitAssessment(
          id,
          {
            livingScore: Number(body.livingScore || 50),
            housingCondition: body.housingCondition || 'moderate',
            housingNotes: body.housingNotes || '',
            debtBurdenSummary: body.debtBurdenSummary || '',
            primaryHardship: body.primaryHardship || '',
            officerRecommendation: body.officerRecommendation || 'recommend_full',
            recommendedAmount: Number(body.recommendedAmount || 0),
            recommendedFundId: body.recommendedFundId || 'fund-1',
            recommendedSpecificFundId: body.recommendedSpecificFundId || null,
            generalNotes: body.generalNotes || '',
          },
          actor
        );
        break;

      case 'REJECT_ASSESSMENT':
        result = await BeneficiaryService.rejectAssessment(id, body.reason || 'ไม่ผ่านเกณฑ์การประเมินสิทธิ์', actor);
        break;

      case 'APPROVE':
        result = await BeneficiaryService.approveApplication(
          id,
          Number(body.approvedAmount || 0),
          body.fundId || 'fund-1',
          body.notes || 'อนุมัติตามระเบียบ',
          { ...actor, role: body.actorRole || 'approver' },
          body.specificFundId
        );
        break;

      case 'REJECT':
        result = await BeneficiaryService.rejectApplication(
          id,
          body.reason || 'ไม่อนุมัติ',
          { ...actor, role: body.actorRole || 'approver' }
        );
        break;

      case 'DISBURSE':
        result = await BeneficiaryService.recordDisbursement(
          id,
          body.paymentRef || `REF-${Date.now()}`,
          body.proofUrl || '/proofs/disb-slip.jpg',
          body.notes || 'จ่ายเงินเรียบร้อย',
          { ...actor, role: 'finance' }
        );
        break;

      case 'DELIVER':
        result = await BeneficiaryService.recordDelivery(
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
        break;

      case 'SCHEDULE_FOLLOWUP':
        result = await BeneficiaryService.scheduleFollowup(
          id,
          body.scheduleDate || new Date().toLocaleDateString('th-TH'),
          { id: body.officerId || actor.id, name: body.officerName || actor.name },
          actor
        );
        break;

      case 'COMPLETE_FOLLOWUP':
        result = await BeneficiaryService.recordFollowup(
          id,
          body.statusSummary || 'ติดตามผลเรียบร้อย',
          Boolean(body.isLivingImproved),
          body.notes || '',
          actor
        );
        break;

      case 'CLOSE':
        result = await BeneficiaryService.closeAssistanceRequest(
          id,
          body.closingNotes || 'ปิดกระบวนการคำร้องเสร็จสิ้นสมบูรณ์',
          { ...actor, role: body.actorRole || 'super_admin' },
          { waiveFollowup: Boolean(body.waiveFollowup) }
        );
        break;

      case 'NEED_INFO':
        result = await BeneficiaryService.requestMoreInfo(id, body.reason || 'ขอเอกสารเพิ่มเติม', actor);
        break;

      case 'RESUBMIT':
        result = await BeneficiaryService.resubmitRequest(id, body.notes || 'ส่งข้อมูลเพิ่มเติมแล้ว', actor);
        break;

      case 'CANCEL':
        result = await BeneficiaryService.cancelRequest(id, body.reason || 'ขอยกเลิกคำร้อง', actor);
        break;

      default:
        return NextResponse.json(
          { success: false, error: `คำสั่งดำเนินการ "${action}" ไม่ถูกต้อง` },
          { status: 400 }
        );
    }

    const state = await BeneficiaryService.getLifecycleState(id);
    return NextResponse.json({
      success: true,
      message: `ดำเนินการ ${action} สำเร็จ`,
      actionResult: result,
      lifecycle: state,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงสถานะวงจรชีวิต' },
      { status: 422 }
    );
  }
}

