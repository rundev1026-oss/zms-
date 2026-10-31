import { NextRequest, NextResponse } from 'next/server';
import { assembleSurveyDocument } from '@/lib/surveyPrint/assemble';
import { fillSurveyPdf } from '@/lib/surveyPrint/stamp';

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
    const pdf = await fillSurveyPdf(result.model);
    const filename = `survey-${result.registryNumber}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'private, no-store',
        'X-Registry-Number': result.registryNumber,
        'X-Full-Name': encodeURIComponent(result.fullName),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'สร้างไฟล์ PDF ไม่สำเร็จ';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
