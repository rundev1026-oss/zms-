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
    const { notes, targetStatus, actor: bodyActor } = body;

    if (!notes || !notes.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรายละเอียดที่ต้องการให้แก้ไขหรือขอข้อมูลเพิ่ม' },
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
      const res = await proxyToNest(`/approvals/${id}/return`, request, {
        method: 'POST',
        body: {
          notes: notes.trim(),
          targetStatus: targetStatus || 'need_info',
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status !== 502) {
          return NextResponse.json(
            { success: false, error: json.message || 'ไม่สามารถส่งกลับคำร้องได้' },
            { status: res.status }
          );
        }
      } else {
        nestSucceeded = true;
        nestData = json.data || json;
      }
    } catch (nestErr: any) {
      console.warn('Nest proxy return error:', nestErr?.message);
    }

    // 2. Also record return in SQLite
    let localResult: any = null;
    try {
      localResult = await BeneficiaryService.transitionApplicationStatus(
        id,
        (targetStatus || 'need_info') as any,
        notes.trim(),
        actor
      );
    } catch (localErr: any) {
      if (!nestSucceeded) {
        return NextResponse.json(
          { success: false, error: localErr.message || 'เกิดข้อผิดพลาดในการบันทึกส่งกลับคำร้อง' },
          { status: 422 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: localResult || nestData,
      message: 'ส่งกลับคำร้องเพื่อขอข้อมูลเพิ่มเติมเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการส่งกลับคำร้อง' },
      { status: 500 }
    );
  }
}

