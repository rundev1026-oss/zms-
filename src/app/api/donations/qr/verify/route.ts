import { NextRequest, NextResponse } from 'next/server';
import { parseAndValidatePromptPayQr } from '@/lib/promptpayQr';

/**
 * POST /api/donations/qr/verify
 * Validate, decode, and inspect any EMVCo PromptPay QR payload
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payload } = body;

    if (!payload || typeof payload !== 'string') {
      return NextResponse.json({ success: false, error: 'กรุณาระบุ payload สตริงของ QR Code' }, { status: 400 });
    }

    const result = parseAndValidatePromptPayQr(payload);
    return NextResponse.json({
      success: result.valid,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

