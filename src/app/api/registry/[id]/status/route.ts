import { NextRequest, NextResponse } from 'next/server';
import { resolveServerToken } from '@/lib/serverToken';
import { mapNestBeneficiaryToRegistryItem, readNestFailure } from '@/lib/registrySurvey';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, memberStatus, reason } = body;
    const token = resolveServerToken(request);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-zms-csrf': '1',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // 1. Explicit Member Status update (ACTIVE | PENDING_VERIFICATION | SUSPENDED | ARCHIVED)
    if (memberStatus) {
      const nestRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/member-status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          memberStatus: String(memberStatus).toUpperCase(),
          reason: reason || `ปรับสถานะสมาชิกเป็น ${memberStatus}`,
        }),
      });
      if (!nestRes.ok) {
        const error = await readNestFailure(nestRes, 'ไม่สามารถปรับสถานะสมาชิกได้');
        return NextResponse.json({ success: false, error }, { status: nestRes.status });
      }
      const updated = await nestRes.json();
      return NextResponse.json({
        success: true,
        data: mapNestBeneficiaryToRegistryItem(updated),
      });
    }

    // 2. Map frontend status strings to NestJS member-status or periodic assessment status
    const rawStatus = String(status || '').toLowerCase();
    if (!rawStatus) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุสถานะที่ต้องการเปลี่ยน' },
        { status: 400 },
      );
    }

    if (rawStatus === 'suspended' || rawStatus === 'archived' || rawStatus === 'active') {
      const targetMemberStatus =
        rawStatus === 'suspended'
          ? 'SUSPENDED'
          : rawStatus === 'archived'
            ? 'ARCHIVED'
            : 'ACTIVE';
      const nestRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/member-status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          memberStatus: targetMemberStatus,
          reason: reason || `ปรับสถานะสมาชิกเป็น ${targetMemberStatus}`,
        }),
      });
      if (!nestRes.ok) {
        const error = await readNestFailure(nestRes, 'ไม่สามารถปรับสถานะสมาชิกได้');
        return NextResponse.json({ success: false, error }, { status: nestRes.status });
      }
      const updated = await nestRes.json();
      return NextResponse.json({
        success: true,
        data: mapNestBeneficiaryToRegistryItem(updated),
      });
    }

    // For assessment-related status transitions, update the latest assessment if one exists,
    // or create an initial assessment record so history is preserved in PostgreSQL.
    const mappedAssessmentStatus =
      rawStatus === 'qualified' || rawStatus === 'eligible'
        ? 'ELIGIBLE'
        : rawStatus === 'disqualified' || rawStatus === 'ineligible'
          ? 'NOT_ELIGIBLE'
          : rawStatus === 'need_more_info' || rawStatus === 'needs_correction'
            ? 'RETURNED_FOR_CORRECTION'
            : rawStatus === 'pending_qualification' || rawStatus === 'under_review'
              ? 'UNDER_REVIEW'
              : 'PENDING_ASSESSMENT';

    const listRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/assessments`, {
      headers,
      cache: 'no-store',
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const latestAsm = listData?.items?.[0];
      if (latestAsm?.id) {
        const patchRes = await fetch(
          `${API_BASE_URL}/beneficiaries/${id}/assessments/${latestAsm.id}/status`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              status: mappedAssessmentStatus,
              reviewerNote: reason || `เปลี่ยนสถานะเป็น ${mappedAssessmentStatus}`,
            }),
          },
        );
        if (!patchRes.ok) {
          const error = await readNestFailure(patchRes, 'ไม่สามารถปรับสถานะการประเมินได้');
          return NextResponse.json({ success: false, error }, { status: patchRes.status });
        }
      } else {
        const createRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/assessments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            assessmentType: 'INITIAL',
            status: mappedAssessmentStatus,
            rationale: reason || `บันทึกสถานะการประเมิน ${mappedAssessmentStatus}`,
          }),
        });
        if (!createRes.ok) {
          const error = await readNestFailure(createRes, 'ไม่สามารถสร้างผลการประเมินได้');
          return NextResponse.json({ success: false, error }, { status: createRes.status });
        }
      }
    }

    const freshRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}`, {
      headers,
      cache: 'no-store',
    });
    const fresh = freshRes.ok ? await freshRes.json() : null;
    return NextResponse.json({
      success: true,
      data: fresh ? mapNestBeneficiaryToRegistryItem(fresh) : { id, registrationStatus: rawStatus },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ' },
      { status: 400 },
    );
  }
}
