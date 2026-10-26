import { NextResponse } from 'next/server';
import { PublicPortalService } from '@/services/publicPortalService';

export async function GET() {
  try {
    const report = await PublicPortalService.getPublicTransparencyReport();
    return NextResponse.json({ success: true, data: report });
  } catch (error: any) {
    console.error('Error fetching transparency report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch transparency report' },
      { status: 500 }
    );
  }
}
