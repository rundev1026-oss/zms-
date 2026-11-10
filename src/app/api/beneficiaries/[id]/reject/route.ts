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
    const { reason, notes, actor: bodyActor } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุเหตุผลในการไม่อนุมัติ)' },
        { status: 400 }
      );
    }

    const actor = bodyActor || {
      id: 'u-1',
      name: 'เจ้าหน้าที่ผู้พิจารณาอนุมัติ',
      role: 'approver',
    };

    // 1. Forward to NestJS (PostgreSQL) if running
    let nestSucceeded = false;
    let nestData: any = null;
    try {
      const res = await proxyToNest(`/approvals/${id}/reject`, request, {
        method: 'POST',
        body: {
          reason: reason.trim(),
          notes: notes || undefined,
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status !== 502) {
          return NextResponse.json(
            { success: false, error: json.message || 'ไม่สามารถปฏิเสธคำร้องได้' },
            { status: res.status }
          );
        }
      } else {
        nestSucceeded = true;
        nestData = json.data || json;
      }
    } catch (nestErr: any) {
      console.warn('Nest proxy reject error:', nestErr?.message);
    }

    // 2. Also record rejection in SQLite
    let localResult: any = null;
    try {
      localResult = await BeneficiaryService.rejectApplication(
        id,
        reason.trim(),
        actor
      );
    } catch (localErr: any) {
      if (!nestSucceeded) {
        return NextResponse.json(
          { success: false, error: localErr.message || 'เกิดข้อผิดพลาดในการบันทึกไม่อนุมัติคำร้อง' },
          { status: 422 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: localResult || nestData,
      message: 'บันทึกการไม่อนุมัติคำร้องเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปฏิเสธคำร้อง' },
      { status: 400 }
    );
  }
}
