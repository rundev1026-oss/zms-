import { NextResponse } from 'next/server';
import { PublicPortalService } from '@/services/publicPortalService';

export async function GET() {
  try {
    const campaigns = await PublicPortalService.getCampaigns();
    return NextResponse.json({ success: true, data: campaigns });
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}
