import { NextRequest, NextResponse } from 'next/server';
import {
  getRegistryStatusLabelTh,
  normalizeRegistryStatusCode,
  type RegistryStatusCode,
} from '@zms/shared';
import { resolveServerToken } from '@/lib/serverToken';
import { mapNestBeneficiaryToRegistryItem, readNestFailure } from '@/lib/registrySurvey';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const TRANSITION_ENDPOINT_MAP: Partial<
  Record<RegistryStatusCode, Partial<Record<RegistryStatusCode, { path: string; requiresReason: boolean }>>>
> = {
  DRAFT: {
    UNDER_REVIEW: { path: 'submit', requiresReason: false },
  },
  UNDER_REVIEW: {
    DRAFT: { path: 'request-correction', requiresReason: true },
    QUALIFIED: { path: 'approve', requiresReason: true },
    NOT_QUALIFIED: { path: 'reject', requiresReason: true },
  },
  QUALIFIED: {
    UNDER_REVIEW: { path: 're-review', requiresReason: true },
  },
  NOT_QUALIFIED: {
    UNDER_REVIEW: { path: 're-review', requiresReason: true },
  },
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, memberStatus, reason, notes } = body;
    const reasonText = String(reason ?? notes ?? '').trim();
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
          reason: reasonText || `ปรับสถานะสมาชิกเป็น ${memberStatus}`,
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

    // 2. Enforce strictly 4 canonical Registration Status transitions
    const rawStatus = String(status || '').trim();
    if (!rawStatus) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุสถานะที่ต้องการเปลี่ยน' },
        { status: 400 },
      );
    }

    const targetCode = normalizeRegistryStatusCode(rawStatus);
    if (!targetCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'สถานะทะเบียนไม่ถูกต้อง ระบบรองรับเฉพาะ 4 สถานะ (ร่าง, ตรวจสอบข้อมูล, มีคุณสมบัติตามเกณฑ์, ไม่มีคุณสมบัติตามเกณฑ์)',
        },
        { status: 400 },
      );
    }

    const currentRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}`, {
      headers,
      cache: 'no-store',
    });
    if (!currentRes.ok) {
      const error = await readNestFailure(currentRes, 'ไม่พบข้อมูลทะเบียนผู้มีสิทธิ์รับซะกาต');
      return NextResponse.json({ success: false, error }, { status: currentRes.status });
    }
    const currentRow = await currentRes.json();
    const currentCode = normalizeRegistryStatusCode(currentRow.status || currentRow.registrationStatus) || 'DRAFT';

    if (currentCode === targetCode) {
      return NextResponse.json({
        success: true,
        data: mapNestBeneficiaryToRegistryItem(currentRow),
      });
    }

    const edge = TRANSITION_ENDPOINT_MAP[currentCode]?.[targetCode];
    if (!edge) {
      return NextResponse.json(
        {
          success: false,
          error: `ไม่สามารถเปลี่ยนสถานะจาก "${getRegistryStatusLabelTh(currentCode)}" เป็น "${getRegistryStatusLabelTh(targetCode)}" ได้โดยตรงตามลำดับขั้นตอน`,
        },
        { status: 422 },
      );
    }

    if (edge.requiresReason && reasonText.length < 2) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุเหตุผลประกอบการเปลี่ยนสถานะ' },
        { status: 400 },
      );
    }

    const transitionRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/${edge.path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(
        edge.path === 'submit'
          ? {}
          : { reason: reasonText || `เปลี่ยนสถานะเป็น ${getRegistryStatusLabelTh(targetCode)}` },
      ),
    });

    if (!transitionRes.ok) {
      const error = await readNestFailure(transitionRes, 'ไม่สามารถเปลี่ยนสถานะทะเบียนได้');
      return NextResponse.json({ success: false, error }, { status: transitionRes.status });
    }

    const freshRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}`, {
      headers,
      cache: 'no-store',
    });
    const fresh = freshRes.ok ? await freshRes.json() : await transitionRes.json().catch(() => null);
    return NextResponse.json({
      success: true,
      data: fresh ? mapNestBeneficiaryToRegistryItem(fresh) : { id, registrationStatus: targetCode.toLowerCase() },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ' },
      { status: 400 },
    );
  }
}
