import { NextRequest, NextResponse } from 'next/server';
import { FinancialService } from '@/services/financialService';
import { generateStaticPromptPayQr } from '@/lib/promptpayQr';

/**
 * GET /api/donations/qr?ref=xxx
 * Retrieve an active Dynamic QR session by reference
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    if (!ref) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุ referenceNo (ref)' }, { status: 400 });
    }

    const session = await FinancialService.getPromptPayQrSession(ref);
    if (!session) {
      return NextResponse.json({ success: false, error: 'ไม่พบ QR session สำหรับเลขอ้างอิงนี้' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/donations/qr
 * Generate a new Dynamic or Static PromptPay QR code
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = 'dynamic', amount, referenceNo, bankAccountId, promptpayId, moneyType, terminalLabel } = body;

    if (type === 'static') {
      if (!promptpayId) {
        return NextResponse.json({ success: false, error: 'กรุณาระบุ promptpayId สำหรับ Static QR' }, { status: 400 });
      }
      const staticQr = await generateStaticPromptPayQr({
        promptpayId,
        amount: amount ? Number(amount) : undefined,
        terminalLabel,
      });
      return NextResponse.json({ success: true, data: staticQr });
    }

    // Dynamic QR
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ success: false, error: 'จำนวนเงินสำหรับ Dynamic QR ต้องมากกว่า 0 บาท' }, { status: 400 });
    }
    if (!referenceNo) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุ referenceNo สำหรับผูกกับรายการบริจาค' }, { status: 400 });
    }
    if (!bankAccountId) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุ bankAccountId ของมูลนิธิ' }, { status: 400 });
    }

    const session = await FinancialService.createPromptPayQrSession({
      amount: Number(amount),
      referenceNo,
      bankAccountId,
      moneyType,
      terminalLabel: terminalLabel || 'ZMS ZAKAT',
      expiresInMinutes: 15,
    });

    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

