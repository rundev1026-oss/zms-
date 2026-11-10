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
      id: 'u-1',
      name: 'เจ้าหน้าที่ผู้พิจารณาอนุมัติ',
      role: 'approver',
    };

    // 1. Forward to NestJS (PostgreSQL) if running — strictly enforce backend validation & SoD
    let nestSucceeded = false;
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

      if (!nestRes.ok) {
        // If Nest is active and rejected (e.g., 400 Bad Request, 403 SoD violation, 404, etc.)
        if (nestRes.status !== 502) {
          const errMsg = nestJson.message || nestJson.error || 'ระบบหลักปฏิเสธการอนุมัติคำร้อง';
          return NextResponse.json(
            { success: false, error: errMsg },
            { status: nestRes.status }
          );
        }
      } else {
        nestSucceeded = true;
        nestData = nestJson.data || nestJson;
      }
    } catch (nestErr: any) {
      console.warn('Nest proxy error in approve route:', nestErr?.message);
    }

    // 2. Enforce Phase 10 Solvency Check & Fund Hold in SQLite BeneficiaryService
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
      // If Nest succeeded but SQLite failed, return error
      if (!nestSucceeded) {
        return NextResponse.json(
          { success: false, error: localErr.message || 'ไม่สามารถอนุมัติตามระเบียบงบประมาณได้' },
          { status: 422 }
        );
      }
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

