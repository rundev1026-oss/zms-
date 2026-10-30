import { NextResponse } from 'next/server';
import { PublicPortalService } from '@/services/publicPortalService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await PublicPortalService.submitPublicAssistance(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    const msg = String(error?.message || 'Failed to submit assistance application');
    const status = msg.startsWith('DUPLICATE_SUBMISSION') ? 409 : 400;
    return NextResponse.json(
      { success: false, error: msg },
      { status }
    );
  }
}
