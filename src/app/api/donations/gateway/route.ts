import { NextResponse } from 'next/server';
import { PaymentGatewayAdapter } from '@/lib/paymentGatewayAdapter';

export async function GET() {
  try {
    const status = PaymentGatewayAdapter.getConnectionStatus();
    const comparisonMatrix = PaymentGatewayAdapter.getProviderComparisonMatrix();
    return NextResponse.json({
      success: true,
      data: {
        connection: status,
        providers: comparisonMatrix,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบเกตเวย์' },
      { status: 500 }
    );
  }
}
