import { NextRequest, NextResponse } from 'next/server';
import { resolveServerToken } from '@/lib/serverToken';
import { readNestFailure } from '@/lib/registrySurvey';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function normalizeAssessmentView(raw: any) {
  if (!raw || typeof raw !== 'object') return raw;
  return {
    ...raw,
    assessmentDate:
      typeof raw.assessmentDate === 'string'
        ? raw.assessmentDate.slice(0, 10)
        : raw.assessmentDate,
    asnafCategoryId: raw.asnafCategoryId || raw.asnaf?.id || undefined,
    asnafCode: raw.asnafCode || raw.asnaf?.code || '',
    asnafNameTh: raw.asnafNameTh || raw.asnaf?.nameTh || raw.asnafCode || 'ไม่ระบุหมวดอัสนัฟ',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = resolveServerToken(request);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const nestRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/assessments`, {
      headers,
      cache: 'no-store',
    });
    if (!nestRes.ok) {
      const error = await readNestFailure(nestRes, 'ไม่สามารถโหลดประวัติการประเมินสิทธิ์ได้');
      return NextResponse.json({ success: false, error }, { status: nestRes.status });
    }
    const payload = await nestRes.json();
    const rawItems = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
    const items = rawItems.map(normalizeAssessmentView);

    return NextResponse.json({
      success: true,
      data: items,
      meta: Array.isArray(payload)
        ? { total: items.length }
        : {
            beneficiaryId: payload.beneficiaryId,
            memberId: payload.memberId,
            memberStatus: payload.memberStatus,
            registryStatus: payload.registryStatus,
            total: payload.total ?? items.length,
          },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการโหลดประวัติการประเมินสิทธิ์' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const token = resolveServerToken(request);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-zms-csrf': '1',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const nestRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/assessments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!nestRes.ok) {
      const error = await readNestFailure(nestRes, 'ไม่สามารถบันทึกผลการประเมินสิทธิ์รอบใหม่ได้');
      return NextResponse.json({ success: false, error }, { status: nestRes.status });
    }

    const raw = await nestRes.json();
    const data = normalizeAssessmentView(raw);
    return NextResponse.json({
      success: true,
      data,
      message: `บันทึกผลการประเมินสิทธิ์สำเร็จ (${data.assessmentNumber || 'รอบใหม่'})`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกผลการประเมินสิทธิ์' },
      { status: 500 },
    );
  }
}
