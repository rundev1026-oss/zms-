import { NextRequest, NextResponse } from 'next/server';
import { PaymentGatewayAdapter } from '@/lib/paymentGatewayAdapter';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers: Record<string, string | null> = {};
    req.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const result = await PaymentGatewayAdapter.processWebhookEvent({
      rawBody,
      headers,
      clientIp,
    });

    return NextResponse.json(result, { status: result.statusCode });
  } catch (error: any) {
    console.error('Webhook processing exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal webhook processing failure' },
      { status: 500 }
    );
  }
}
