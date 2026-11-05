import { NextRequest, NextResponse } from 'next/server';
import { resolveServerToken } from '@/lib/serverToken';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nationalId = (searchParams.get('nationalId') || '').replace(/\D/g, '');
    const excludeId = searchParams.get('excludeId') || '';

    if (nationalId.length !== 13) {
      return NextResponse.json({
        success: true,
        data: { valid: false, duplicate: false, existingMember: null },
      });
    }

    const token = resolveServerToken(request);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const qs = new URLSearchParams({ nationalId });
    if (excludeId) qs.set('excludeId', excludeId);

    const nestRes = await fetch(`${API_BASE_URL}/beneficiaries/check-duplicate?${qs.toString()}`, {
      headers,
      cache: 'no-store',
    });

    const payload = await nestRes.json().catch(() => ({}));
    if (!nestRes.ok) {
      return NextResponse.json(
        { success: false, error: payload?.message || 'ไม่สามารถตรวจสอบเลขประจำตัวประชาชนได้' },
        { status: nestRes.status },
      );
    }

    const existingMember = payload?.existingMember
      ? {
          ...payload.existingMember,
          memberId: payload.existingMember.memberId || payload.existingMember.memberCode || '',
          memberCode: payload.existingMember.memberId || payload.existingMember.memberCode || '',
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        ...payload,
        existingMember,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลซ้ำ' },
      { status: 500 },
    );
  }
}
