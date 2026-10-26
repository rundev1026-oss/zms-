import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { assessment, actor } = body;

    if (!assessment || !actor) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่สมบูรณ์' },
        { status: 400 }
      );
    }

    const result = await BeneficiaryService.submitAssessment(id, assessment, actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
