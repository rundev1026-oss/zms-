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
    const { approvedAmount, fundId, notes, specificFundId, actor: bodyActor } = body;

    if (approvedAmount === undefined || !fundId) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ approvedAmount และ fundId)' },
        { status: 400 }
      );
    }

    const actor = bodyActor || {
      id: 'u-1',
      name: 'เจ้าหน้าที่ผู้พิจารณาอนุมัติ',
      role: 'approver',
    };

    // 1. Enforce Phase 10 Solvency Check & Fund Hold in BeneficiaryService
    let localResult: any = null;
    try {
      localResult = await BeneficiaryService.approveApplication(
        id,
        Number(approvedAmount),
        fundId,
        notes || 'อนุมัติตามระเบียบ',
        actor,
        specificFundId
      );
    } catch (localErr: any) {
      return NextResponse.json(
        { success: false, error: localErr.message || 'ไม่สามารถอนุมัติตามระเบียบงบประมาณได้' },
        { status: 422 }
      );
    }

    // 2. Also forward to Nest if running
    try {
      await proxyToNest(`/approvals/${id}/approve`, request, {
        method: 'POST',
        body: {
          approvedAmount: Number(approvedAmount),
          fundId,
          specificFundId,
          notes: notes || 'อนุมัติวงเงินสวัสดิการ',
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: localResult,
      message: `อนุมัติคำร้องขอรับความช่วยเหลือเรียบร้อยแล้ว วงเงิน ฿${Number(approvedAmount).toLocaleString('th-TH')}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการอนุมัติคำร้อง' },
      { status: 400 }
    );
  }
}

