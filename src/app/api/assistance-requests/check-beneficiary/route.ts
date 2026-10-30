import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nationalId = (body.nationalId || '').replace(/[^0-9]/g, '');
    const registrationNo = body.registrationNo || undefined;
    const beneficiaryId = body.beneficiaryId || undefined;

    if (!nationalId && !registrationNo && !beneficiaryId) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          canApply: false,
          error: 'กรุณากรอกเลขประจำตัวประชาชน 13 หลัก หรือเลขทะเบียนให้ถูกต้อง',
        },
        { status: 400 }
      );
    }

    const res = await proxyToNest('/assistance-requests/check-beneficiary', request, {
      method: 'POST',
      body: {
        nationalId,
        registrationNo,
        beneficiaryId,
      },
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          canApply: false,
          error: json.message || 'ไม่พบข้อมูลผู้มีสิทธิ์รับซะกาตตามที่ระบุ',
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      found: true,
      canApply: true,
      beneficiary: json.beneficiary,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        found: false,
        canApply: false,
        error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบทะเบียนผู้มีสิทธิ์',
      },
      { status: 500 }
    );
  }
}
