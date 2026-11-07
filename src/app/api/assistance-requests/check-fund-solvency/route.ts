import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, approvedAmount, fundId, specificFundId } = body;

    if (!applicationId || approvedAmount === undefined) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน (ต้องระบุ applicationId และ approvedAmount)' },
        { status: 400 }
      );
    }

    const solvency = await BeneficiaryService.checkFundSolvencyForApproval({
      applicationId,
      approvedAmount: Number(approvedAmount),
      fundId,
      specificFundId,
    });

    return NextResponse.json({
      success: true,
      data: solvency,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบงบประมาณ' },
      { status: 500 }
    );
  }
}

