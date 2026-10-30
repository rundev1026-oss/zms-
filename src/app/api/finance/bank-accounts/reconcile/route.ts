import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = `/bank-accounts/reconciliations${queryString ? `?${queryString}` : ''}`;

    const res = await proxyToNest(endpoint, request, { method: 'GET' });
    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถดึงข้อมูลการกระทบยอดได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json.items || json,
      pagination: json.total !== undefined ? {
        total: json.total,
        page: json.page,
        limit: json.limit,
        totalPages: json.totalPages,
      } : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลการกระทบยอด' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;
    const targetInput = input || body;
    const bankAccountId = targetInput.bankAccountId;

    if (!bankAccountId || targetInput.statementBalance === undefined) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (กรุณาระบุ bankAccountId และ statementBalance)' },
        { status: 400 }
      );
    }

    const res = await proxyToNest(`/bank-accounts/${bankAccountId}/reconcile`, request, {
      method: 'POST',
      body: {
        statementBalance: Number(targetInput.statementBalance),
        reconciliationDate: targetInput.reconciliationDate,
        notes: targetInput.notes,
        proofUrl: targetInput.proofUrl,
      },
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'ไม่สามารถบันทึกการกระทบยอดธนาคารได้' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json,
      message: 'บันทึกการกระทบยอดธนาคารสำเร็จ',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการกระทบยอด' },
      { status: 500 }
    );
  }
}
