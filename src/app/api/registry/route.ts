import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function resolveToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/zms_session=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || searchParams.get('q') || '';
    const registrationStatus = searchParams.get('registrationStatus') || searchParams.get('status') || '';
    const asnafCategory = searchParams.get('asnafCategory') || searchParams.get('asnafCategoryId') || '';
    const province = searchParams.get('province') || '';
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || searchParams.get('pageSize') || '20';

    const token = resolveToken(request);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const queryParams = new URLSearchParams();
    if (search) queryParams.set('q', search);
    if (registrationStatus && registrationStatus !== 'all') queryParams.set('status', registrationStatus.toUpperCase());
    if (asnafCategory && asnafCategory !== 'all') queryParams.set('asnafCategoryId', asnafCategory);
    if (province && province !== 'all') queryParams.set('province', province);
    queryParams.set('page', page);
    queryParams.set('pageSize', limit);

    const nestRes = await fetch(`${API_BASE_URL}/beneficiaries?${queryParams.toString()}`, {
      headers,
    });

    if (!nestRes.ok) {
      const err = await nestRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลทะเบียน' },
        { status: nestRes.status }
      );
    }

    const data = await nestRes.json();
    return NextResponse.json({
      success: true,
      data: data.items,
      pagination: {
        total: data.total,
        page: data.page,
        limit: data.pageSize,
        totalPages: Math.ceil(data.total / data.pageSize) || 1,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลทะเบียน' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = body.input || body;
    const token = resolveToken(request);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-zms-csrf': '1',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Split name into firstName and lastName
    const rawName = (input.fullName || input.name || '').trim();
    const nameParts = rawName.split(/\s+/);
    const firstName = nameParts[0] || 'ไม่ระบุชื่อ';
    const lastName = nameParts.slice(1).join(' ') || '-';
    const cleanNationalId = (input.nationalId || '').replace(/[^0-9]/g, '');

    // 1. Create Draft Beneficiary in NestJS
    const createRes = await fetch(`${API_BASE_URL}/beneficiaries`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: input.titlePrefix || 'นาย',
        firstName,
        lastName,
        identityType: 'THAI_NATIONAL_ID',
        identityNumber: cleanNationalId || undefined,
        dateOfBirth: input.birthDate || undefined,
        phone: input.phone || undefined,
        occupation: input.occupation || undefined,
        maritalStatus: input.maritalStatus || undefined,
        registrationNote: input.housingNotes || input.registrationNote || undefined,
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      return NextResponse.json(
        { success: false, error: createData.message || 'ไม่สามารถสร้างทะเบียนได้' },
        { status: createRes.status }
      );
    }

    const beneficiaryId = createData.id;

    // 2. Save Addresses
    if (input.province || input.district || input.subdistrict || input.address) {
      const addressesPayload = [
        {
          addressType: 'REGISTERED',
          addressLine: input.address || undefined,
          community: input.community || undefined,
          subdistrict: input.subdistrict || undefined,
          district: input.district || undefined,
          province: input.province || undefined,
          postalCode: input.postcode || undefined,
          latitude: input.latitude ? Number(input.latitude) : undefined,
          longitude: input.longitude ? Number(input.longitude) : undefined,
        },
        {
          addressType: 'CURRENT',
          addressLine: input.address || undefined,
          community: input.community || undefined,
          subdistrict: input.subdistrict || undefined,
          district: input.district || undefined,
          province: input.province || undefined,
          postalCode: input.postcode || undefined,
          latitude: input.latitude ? Number(input.latitude) : undefined,
          longitude: input.longitude ? Number(input.longitude) : undefined,
        },
      ];

      await fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}/addresses`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ addresses: addressesPayload }),
      });
    }

    // 3. Save Income Profile
    if (input.incomeBreakdown || input.expenseBreakdown || input.debtAmount !== undefined) {
      const personalInc = Number(input.incomeBreakdown?.salary || 0) + Number(input.incomeBreakdown?.freelance || 0);
      const regularExp = Number(input.expenseBreakdown?.living || 0) + Number(input.expenseBreakdown?.utilities || 0);
      const debtVal = Number(input.debtAmount || 0);

      await fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}/income-profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          personalIncome: personalInc.toFixed(2),
          regularExpense: regularExp.toFixed(2),
          debtBurden: debtVal.toFixed(2),
          housingCondition: input.housingNotes || input.housingCondition || undefined,
          livingConstraints: input.familySituationSummary || undefined,
          assistanceNeeds: input.necessityDetails || input.assistanceTypeDetails || undefined,
        }),
      });
    }

    // 4. Save Household
    if (input.members && Array.isArray(input.members)) {
      const mappedMembers = input.members.map((m: any, idx: number) => ({
        fullName: m.fullName || `สมาชิก ${idx + 1}`,
        relationship: m.relation || 'สมาชิกในครอบครัว',
        ageYears: m.age ? Number(m.age) : undefined,
        occupation: m.occupation || undefined,
        isDependent: m.relation === 'บุตร' || m.relation === 'คู่สมรส' || m.healthStatus === 'disabled' || m.healthStatus === 'chronically_ill',
        sortOrder: idx + 1,
      }));

      await fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}/household`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          memberCount: mappedMembers.length + 1,
          householdIncome: Number(input.totalIncome || 0).toFixed(2),
          householdExpense: Number(input.totalExpense || 0).toFixed(2),
          debtAmount: Number(input.debtAmount || 0).toFixed(2),
          dependentCount: mappedMembers.filter((m: any) => m.isDependent).length,
          additionalNotes: input.familySituationSummary || undefined,
          members: mappedMembers,
        }),
      });
    }

    // 5. Save PDPA Consent
    await fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}/consents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        consentTextVersion: 'v1.0',
        privacyNoticeVersion: 'v1.0',
        accepted: true,
        channel: 'WEB_FORM',
      }),
    });

    // 6. If submitted, call submit endpoint
    if (input.status === 'submitted' || body.submitStatus === 'submitted') {
      const submitRes = await fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}/submit`, {
        method: 'POST',
        headers,
      });
      if (submitRes.ok) {
        createData.status = 'PENDING_REVIEW';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        beneficiaryId,
        registrationNo: createData.registryNumber,
        status: createData.status,
      },
      message: `ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตสำเร็จ รหัสทะเบียน ${createData.registryNumber}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการขึ้นทะเบียน' },
      { status: 500 }
    );
  }
}
