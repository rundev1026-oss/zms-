import { NextRequest, NextResponse } from 'next/server';
import { resolveServerToken } from '@/lib/serverToken';
import { readNestFailure } from '@/lib/registrySurvey';
import { normalizeAssessmentView } from '../route';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assessmentId: string }> },
) {
  try {
    const { id, assessmentId } = await params;
    const body = await request.json();
    const token = resolveServerToken(request);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-zms-csrf': '1',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const nestRes = await fetch(
      `${API_BASE_URL}/beneficiaries/${id}/assessments/${assessmentId}/status`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      },
    );

    if (!nestRes.ok) {
      const error = await readNestFailure(nestRes, 'ไม่สามารถอัปเดตสถานะการประเมินสิทธิ์ได้');
      return NextResponse.json({ success: false, error }, { status: nestRes.status });
    }

    const raw = await nestRes.json();
    const data = normalizeAssessmentView(raw);
    return NextResponse.json({
      success: true,
      data,
      message: 'อัปเดตสถานะผลการประเมินสิทธิ์สำเร็จ',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะการประเมินสิทธิ์' },
      { status: 500 },
    );
  }
}
