import { NextRequest, NextResponse } from 'next/server';
import { formatPersonName, splitPersonName } from '@zms/shared';
import { resolveServerToken } from '@/lib/serverToken';
import {
  buildHouseholdPayload,
  buildIncomeProfilePayload,
  mapNestBeneficiaryToRegistryItem,
  readNestFailure,
} from '@/lib/registrySurvey';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function resolveToken(req: Request): string {
  return resolveServerToken(req);
}

function nestApiError(payload: any, fallback: string) {
  const rawMessage = payload?.message;
  const message =
    typeof rawMessage === 'string'
      ? rawMessage
      : Array.isArray(rawMessage) && typeof rawMessage[0] === 'string'
        ? rawMessage[0]
        : typeof payload?.error === 'string'
          ? payload.error
          : fallback;
  return {
    success: false as const,
    error: message,
    code: typeof payload?.code === 'string' ? payload.code : undefined,
  };
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
      if (nestRes.status === 401) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
        });
      }
      const err = await nestRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลทะเบียน' },
        { status: nestRes.status }
      );
    }

    const data = await nestRes.json();
    const mappedItems = (data.items || []).map((item: any) => {
      const cleanId = item.identityNumber || item.nationalId || '';
      const maskedId = item.nationalIdMasked || (cleanId ? (cleanId.length === 13 ? `${cleanId[0]}-${cleanId.slice(1, 5)}-${cleanId.slice(5, 10)}-${cleanId.slice(10, 12)}-${cleanId[12]}` : cleanId) : '-');
      const name = splitPersonName({
        prefix: item.titlePrefix || item.title,
        firstName: item.firstName,
        lastName: item.lastName,
        fullName: item.fullName,
      });
      const titlePrefix = name.prefix;
      const fullName = formatPersonName(name) || 'ไม่ระบุชื่อ';

      // Determine asnaf category key
      let asnafCategory = 'miskin';
      if (item.asnafCategory) {
        asnafCategory = String(item.asnafCategory).toLowerCase();
      } else if (item.asnaf?.code) {
        asnafCategory = String(item.asnaf.code).toLowerCase();
      } else if (typeof item.asnaf === 'string') {
        asnafCategory = item.asnaf.toLowerCase();
      }

      // Map NestJS status enum to Frontend RegistrationStatus
      let regStatus = item.registrationStatus || item.status || 'draft';
      const statusUpper = String(regStatus).toUpperCase();
      if (statusUpper === 'DRAFT') regStatus = 'draft';
      else if (statusUpper === 'SUBMITTED') regStatus = 'pending_verification';
      else if (statusUpper === 'PENDING_REVIEW') regStatus = 'pending_qualification';
      else if (statusUpper === 'APPROVED') regStatus = 'qualified';
      else if (statusUpper === 'REJECTED') regStatus = 'disqualified';
      else if (statusUpper === 'SUSPENDED') regStatus = 'suspended';
      else if (statusUpper === 'NEED_INFO') regStatus = 'need_more_info';
      else regStatus = String(regStatus).toLowerCase();

      const survey = mapNestBeneficiaryToRegistryItem(item);
      return {
        ...item,
        ...survey,
        id: item.id,
        registrationNo: item.registrationNo || item.registryNumber || `REG-${item.id?.slice(0, 8)}`,
        fullName,
        titlePrefix,
        nationalId: cleanId,
        nationalIdMasked: maskedId,
        phone: item.phone || '-',
        age: item.age || item.ageYears,
        birthDate: item.birthDate || item.dateOfBirth,
        asnafCategory,
        registrationStatus: regStatus,
        community: item.community || '',
        district: item.district || '',
        province: item.province || '',
        address: item.address || `${item.community || ''} ${item.district || ''} ${item.province || ''}`.trim() || '-',
        assistanceApplicationsCount: item.assistanceApplicationsCount ?? item.requestCount ?? 0,
        totalAssistanceReceived: item.totalAssistanceReceived !== undefined ? Number(item.totalAssistanceReceived) : (Number(item.aidTotal) || 0),
        registeredDate: item.registeredDate || item.createdAt || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: mappedItems,
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

    const name = splitPersonName({
      prefix: input.titlePrefix,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName: input.fullName || input.name,
    });
    const firstName = name.firstName || 'ไม่ระบุชื่อ';
    const lastName = name.lastName || '-';
    const cleanNationalId = (input.nationalId || '').replace(/[^0-9]/g, '');

    // 1. Create Draft Beneficiary in NestJS
    const createRes = await fetch(`${API_BASE_URL}/beneficiaries`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: name.prefix || undefined,
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

    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok) {
      return NextResponse.json(nestApiError(createData, 'ไม่สามารถสร้างทะเบียนได้'), {
        status: createRes.status,
      });
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

    // 3. Save Income Profile — full monthly totals, not only salary + freelance
    const incomePayload = buildIncomeProfilePayload(input);
    if (incomePayload) {
      const incomeRes = await fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}/income-profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(incomePayload),
      });
      if (!incomeRes.ok) {
        const message = await readNestFailure(incomeRes, 'บันทึกรายได้รายจ่ายไม่สำเร็จ');
        return NextResponse.json(
          { success: false, error: message, data: { id: beneficiaryId, beneficiaryId } },
          { status: incomeRes.status },
        );
      }
    }

    // 4. Save Household (line items, debt, situation, members)
    const householdPayload = buildHouseholdPayload(input);
    const householdRes = await fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}/household`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(householdPayload),
    });
    if (!householdRes.ok) {
      const message = await readNestFailure(householdRes, 'บันทึกข้อมูลครัวเรือนไม่สำเร็จ');
      return NextResponse.json(
        { success: false, error: message, data: { id: beneficiaryId, beneficiaryId } },
        { status: householdRes.status },
      );
    }

    // 5. Asnaf Category Proposal
    if (input.asnafCategory) {
      try {
        const catRes = await fetch(`${API_BASE_URL}/asnaf/categories`, { headers });
        if (catRes.ok) {
          const catList = await catRes.json();
          const targetKey = String(input.asnafCategory).trim().toUpperCase();
          const match = (catList || []).find(
            (c: any) =>
              c.code?.toUpperCase() === targetKey ||
              c.nameTh?.includes(input.asnafCategory) ||
              (targetKey === 'MISKIN' && c.code === 'MISKIN') ||
              (targetKey === 'FAQIR' && c.code === 'FAKIR')
          );
          if (match?.id) {
            await fetch(`${API_BASE_URL}/beneficiaries/${beneficiaryId}/asnaf-proposal`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                categoryId: match.id,
                rationale: `การจัดหมวดอัสนัฟเบื้องต้นจากการขึ้นทะเบียน: ${match.nameTh || input.asnafCategory}`,
              }),
            });
          }
        }
      } catch (asnafErr) {
        console.error('Failed to propose Asnaf category:', asnafErr);
      }
    }

    // 6. Save PDPA Consent
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

    // 7. If submitted, call submit endpoint
    if (input.registrationStatus === 'pending_verification' || input.status === 'submitted' || body.submitStatus === 'submitted') {
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
        id: beneficiaryId,
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
