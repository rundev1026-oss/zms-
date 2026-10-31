import { NextRequest, NextResponse } from 'next/server';
import { assembleSurveyDocument } from '@/lib/surveyPrint/assemble';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await assembleSurveyDocument(request, id);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      success: true,
      html: result.html,
      registryNumber: result.registryNumber,
      fullName: result.fullName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'จัดทำเอกสารไม่สำเร็จ';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
