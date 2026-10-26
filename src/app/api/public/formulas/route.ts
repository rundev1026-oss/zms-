import { NextResponse } from 'next/server';
import { PublicPortalService } from '@/services/publicPortalService';

export async function GET() {
  try {
    const formulas = await PublicPortalService.getZakatFormulas();
    return NextResponse.json({ success: true, data: formulas });
  } catch (error: any) {
    console.error('Error fetching zakat formulas:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch zakat formulas' },
      { status: 500 }
    );
  }
}
