import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ledger = await BeneficiaryService.getFinancialLedgerDetails(id);

    return NextResponse.json({
      success: true,
      data: ledger,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลบัญชีและการเงิน' },
      { status: error.message?.includes('ไม่พบ') ? 404 : 500 }
    );
  }
}

