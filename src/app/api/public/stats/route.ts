import { NextResponse } from 'next/server';
import { PublicPortalService } from '@/services/publicPortalService';

export async function GET() {
  try {
    const stats = await PublicPortalService.getPublicStatistics();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error fetching public stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch public statistics' },
      { status: 500 }
    );
  }
}
