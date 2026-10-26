import { NextResponse } from 'next/server';
import { PublicPortalService } from '@/services/publicPortalService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await PublicPortalService.processPublicDonation(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error processing public donation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process donation' },
      { status: 400 }
    );
  }
}
