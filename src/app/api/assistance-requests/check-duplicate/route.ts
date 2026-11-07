import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await BeneficiaryService.checkDuplicateAssistanceRules({
      beneficiaryId: body.beneficiaryId ? String(body.beneficiaryId).trim() : undefined,
      nationalId: body.nationalId ? String(body.nationalId).replace(/[^0-9]/g, '') : undefined,
      assistanceTypeId: body.assistanceTypeId ? String(body.assistanceTypeId).trim() : undefined,
      assistanceTypeCode: body.assistanceTypeCode ? String(body.assistanceTypeCode).trim() : undefined,
      assistanceTypeName: body.assistanceTypeName ? String(body.assistanceTypeName).trim() : undefined,
      fiscalYear: body.fiscalYear ? String(body.fiscalYear).trim() : undefined,
      requestDate: body.requestDate ? String(body.requestDate).trim() : undefined,
      excludeApplicationId: body.excludeApplicationId ? String(body.excludeApplicationId).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        hasDuplicate: false,
        error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบเงื่อนไขความช่วยเหลือซ้ำซ้อน',
      },
      { status: 500 }
    );
  }
}

