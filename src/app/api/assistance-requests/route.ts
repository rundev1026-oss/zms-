import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = `/assistance-requests${queryString ? `?${queryString}` : ''}`;

    const res = await proxyToNest(endpoint, request, { method: 'GET' });
    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'เกิดข้อผิดพลาดในการดึงรายการคำร้อง' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json.items,
      pagination: {
        total: json.total,
        page: json.page,
        limit: json.limit,
        totalPages: json.totalPages,
      },
      items: json.items,
      total: json.total,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงรายการคำร้องขอความช่วยเหลือ' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawInput = body.input || body;

    const beneficiaryId =
      rawInput.beneficiaryId ||
      rawInput.nationalId ||
      body.nationalId ||
      rawInput.memberId ||
      body.memberId;

    if (!beneficiaryId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุผู้ขอรับความช่วยเหลือ (เลขบัตรประชาชน หรือรหัสผู้มีสิทธิ์)' },
        { status: 400 }
      );
    }

    const payload = {
      beneficiaryId,
      asnafCategory: rawInput.asnafCategory || 'miskin',
      requestedAmount: Number(rawInput.requestedAmount || 0),
      urgencyLevel: rawInput.urgencyLevel || 'normal',
      hardshipReasons: rawInput.hardshipReasons || rawInput.necessityDetails || rawInput.notes,
      necessityDetails: rawInput.necessityDetails || rawInput.hardshipReasons || '',
      assistanceTypeId: rawInput.assistanceTypeId,
      assistanceGroup: rawInput.assistanceGroup || 'core',
      specificFundId: rawInput.specificFundId,
      branchId: rawInput.branchId,
      branchName: rawInput.branchName,
    };

    const res = await proxyToNest('/assistance-requests', request, {
      method: 'POST',
      body: payload,
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'เกิดข้อผิดพลาดในการยื่นคำร้อง' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        applicationId: json.id,
        applicationNo: json.applicationNo,
        ...json,
      },
      message: `ยื่นคำร้องขอความช่วยเหลือสำเร็จ เลขที่คำร้อง ${json.applicationNo}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการยื่นคำร้องขอความช่วยเหลือ' },
      { status: 500 }
    );
  }
}
