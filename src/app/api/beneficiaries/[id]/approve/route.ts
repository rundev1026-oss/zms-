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

    if (approvedAmount === undefined || Number(approvedAmount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ถูกต้อง (ต้องระบุ approvedAmount มากกว่า 0 บาท)' },
        { status: 400 }
      );
    }

    const actor = bodyActor || {
      id: 'u-approver-1',
      name: 'คณะกรรมการพิจารณาอนุมัติ',
      role: 'approver',
    };

    // 1. Enforce Phase 10 Solvency Check, SoD & Atomic Fund Hold in SQLite BeneficiaryService FIRST
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
      const msg = String(localErr?.message || 'ไม่สามารถอนุมัติตามระเบียบงบประมาณได้');
      const status = msg.includes('Segregation of Duties') || msg.includes('ไม่มีสิทธิ์') ? 403 : 422;
      return NextResponse.json(
        { success: false, error: msg },
        { status }
      );
    }

    // 2. Sync approval status to NestJS (PostgreSQL) if running
    let nestData: any = null;
    try {
      const nestRes = await proxyToNest(`/approvals/${id}/approve`, request, {
        method: 'POST',
        body: {
          approvedAmount: Number(approvedAmount),
          fundId,
          specificFundId,
          notes: notes || 'อนุมัติวงเงินสวัสดิการ',
        },
      });

      const nestJson = await nestRes.json().catch(() => ({}));
      if (nestRes.ok) {
        nestData = nestJson.data || nestJson;
      }
    } catch (nestErr: any) {
      console.warn('Nest proxy error in approve route:', nestErr?.message);
    }

    return NextResponse.json({
      success: true,
      data: localResult || nestData,
      message: `อนุมัติคำร้องขอรับความช่วยเหลือเรียบร้อยแล้ว วงเงิน ฿${Number(approvedAmount).toLocaleString('th-TH')}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการอนุมัติคำร้อง' },
      { status: 400 }
    );
  }
}

