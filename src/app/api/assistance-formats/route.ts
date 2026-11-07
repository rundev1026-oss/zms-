import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assistanceTypeId = searchParams.get('assistanceTypeId') || searchParams.get('typeId') || undefined;
    const assistanceTypeCode = searchParams.get('assistanceTypeCode') || searchParams.get('typeCode') || undefined;
    const includeInactive = searchParams.get('includeInactive') === '1' || searchParams.get('includeInactive') === 'true';

    const formats = await BeneficiaryService.getAssistanceFormats({
      assistanceTypeId,
      assistanceTypeCode,
      includeInactive,
    });

    return NextResponse.json({
      success: true,
      data: formats,
      total: formats.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงรายการรูปแบบการช่วยเหลือ' },
      { status: 500 }
    );
  }
}

