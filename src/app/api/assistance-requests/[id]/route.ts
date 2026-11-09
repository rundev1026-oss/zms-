import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let nestData: any = null;

    try {
      const res = await proxyToNest(`/assistance-requests/${id}`, request, {
        method: 'GET',
      });
      if (res.ok) {
        nestData = await res.json();
        // Keep SQLite synced with NestJS / PostgreSQL
        try {
          const { upsertApplicationIntoSqlite } = await import('@/lib/syncAssistanceRequest');
          await upsertApplicationIntoSqlite(nestData.data || nestData);
        } catch {}
      }
    } catch {}

    const lifecycleState = await BeneficiaryService.getLifecycleState(id).catch(() => null);

    if (!nestData && !lifecycleState) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบคำร้องขอความช่วยเหลือ' },
        { status: 404 }
      );
    }

    const mergedData = {
      ...(nestData || {}),
      ...(lifecycleState ? {
        requestStatus: lifecycleState.statuses.request,
        assessmentStatus: lifecycleState.statuses.assessment,
        approvalStatus: lifecycleState.statuses.approval,
        paymentStatus: lifecycleState.statuses.payment,
        deliveryStatus: lifecycleState.statuses.delivery,
        followupStatus: lifecycleState.statuses.followup,
        completionStatus: lifecycleState.statuses.completion,
        lifecycle: lifecycleState,
      } : {}),
    };

    return NextResponse.json({
      success: true,
      data: mergedData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลคำร้อง' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const isFullUpdate =
      body.requestedAmount !== undefined ||
      body.assistanceType !== undefined ||
      body.hardshipReasons !== undefined ||
      body.necessityDetails !== undefined ||
      body.specificFundCode !== undefined ||
      Array.isArray(body.documents);

    const endpoint = isFullUpdate
      ? `/assistance-requests/${id}`
      : `/assistance-requests/${id}/status`;

    const res = await proxyToNest(endpoint, request, {
      method: 'PATCH',
      body,
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถปรับปรุงคำร้องได้' },
        { status: res.status }
      );
    }

    // Sync updated data into SQLite
    try {
      const { upsertApplicationIntoSqlite } = await import('@/lib/syncAssistanceRequest');
      await upsertApplicationIntoSqlite(json.data || json);
    } catch {}

    return NextResponse.json({
      success: true,
      data: json,
      message: isFullUpdate ? 'ปรับปรุงข้อมูลคำร้องเรียบร้อยแล้ว' : 'ปรับปรุงสถานะคำร้องเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงคำร้อง' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params });
}

