import { NextResponse } from 'next/server';
import { PublicPortalService } from '@/services/publicPortalService';

export async function POST(req: Request) {
  try {
    const { applicationNo, last4Digits } = await req.json();
    if (!applicationNo || !last4Digits) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุเลขที่คำร้องและเลข 4 หลักสุดท้าย' },
        { status: 400 }
      );
    }

    const result = await PublicPortalService.trackPublicAssistance(applicationNo, last4Digits);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error tracking public assistance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to track assistance application' },
      { status: 400 }
    );
  }
}
