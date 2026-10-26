import { NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Strictly throws accounting standards violation
    await FinancialService.attemptDeleteTransaction(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: 'ACCOUNTING_STANDARDS_VIOLATION',
        allowedAction: 'REVERSAL_ENTRY',
      },
      { status: 403 }
    );
  }
}
