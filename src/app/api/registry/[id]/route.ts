import { NextRequest, NextResponse } from 'next/server';
import { RegistryService } from '@/services/registryService';
import { AuthService } from '@/services/authService';
import { resolveServerToken } from '@/lib/serverToken';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function extractToken(req: Request): string {
  return resolveServerToken(req);
}

function mapStatusToFrontend(nestStatus: string): string {
  const upper = String(nestStatus || '').toUpperCase();
  if (upper === 'DRAFT') return 'draft';
  if (upper === 'SUBMITTED') return 'pending_verification';
  if (upper === 'PENDING_REVIEW') return 'pending_qualification';
  if (upper === 'APPROVED') return 'qualified';
  if (upper === 'REJECTED') return 'disqualified';
  if (upper === 'SUSPENDED') return 'suspended';
  if (upper === 'NEED_INFO') return 'need_more_info';
  return String(nestStatus || 'pending_verification').toLowerCase();
}

function safeJsonParse(val: any, fallback: any = null) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function mapNestBeneficiaryToRegistryItem(nestData: any): any {
  const titlePrefix = nestData.title || 'นาย';
  const fullName = `${titlePrefix} ${nestData.firstName || ''} ${nestData.lastName || ''}`.trim() || 'ไม่ระบุชื่อ';
  const cleanId = nestData.identityNumber || '';
  const maskedId = cleanId ? (cleanId.length === 13 ? `${cleanId[0]}-${cleanId.slice(1, 5)}-${cleanId.slice(5, 10)}-${cleanId.slice(10, 12)}-${cleanId[12]}` : cleanId) : '-';

  const addresses = Array.isArray(nestData.addresses) ? nestData.addresses : [];
  const currentAddr = addresses.find((a: any) => a.addressType === 'CURRENT') || addresses[0] || {};
  const regAddr = addresses.find((a: any) => a.addressType === 'REGISTERED') || currentAddr;

  const hh = nestData.household || {};
  const inc = nestData.incomeProfile || {};

  const incBreakdown = safeJsonParse(hh.incomeBreakdown, {
    salary: Number(inc.personalIncome || 0),
    familySupport: 0,
    agriculture: 0,
    trading: 0,
    assetIncome: 0,
    freelance: 0,
    welfare: 0,
    otherIncome: 0,
  });

  const expBreakdown = safeJsonParse(hh.expenseBreakdown, {
    living: Number(inc.regularExpense || 0),
    education: 0,
    healthcare: 0,
    utilities: 0,
    rent: 0,
    debtPayment: Number(inc.debtBurden || 0),
    otherExpense: 0,
  });

  const pastAssistance = safeJsonParse(hh.pastAssistance, []);
  const coordinator = safeJsonParse(hh.coordinatorInfo, null);
  const certifier = safeJsonParse(hh.certifierInfo, null);

  const rawMembers = Array.isArray(hh.members) ? hh.members : [];
  const householdMembers = rawMembers.map((m: any, idx: number) => ({
    id: m.id || `mem-${idx + 1}`,
    fullName: m.fullName,
    relation: m.relationship,
    relationship: m.relationship,
    age: m.ageYears || 0,
    ageYears: m.ageYears || 0,
    dateOfBirth: m.dateOfBirth || '',
    occupation: m.occupation || '',
    monthlyIncome: 0,
    isDependent: m.isDependent,
  }));

  let asnafKey = 'miskin';
  if (nestData.asnaf?.code) {
    asnafKey = String(nestData.asnaf.code).toLowerCase();
  }

  return {
    id: nestData.id,
    registrationNo: nestData.registryNumber,
    registryNumber: nestData.registryNumber,
    registrationStatus: mapStatusToFrontend(nestData.status),
    status: nestData.status,
    titlePrefix,
    fullName,
    firstName: nestData.firstName,
    lastName: nestData.lastName,
    nationalId: cleanId,
    nationalIdMasked: maskedId,
    birthDate: nestData.dateOfBirth || '',
    age: nestData.ageYears || 0,
    phone: nestData.phone || '',
    email: '',
    occupation: nestData.occupation || '',
    maritalStatus: nestData.maritalStatus || 'married',
    asnafCategory: asnafKey,
    address: currentAddr.addressLine || hh.address || '',
    community: currentAddr.community || hh.community || '',
    subdistrict: currentAddr.subdistrict || hh.subdistrict || '',
    district: currentAddr.district || hh.district || '',
    province: currentAddr.province || hh.province || '',
    postcode: currentAddr.postalCode || '',
    latitude: currentAddr.latitude ? Number(currentAddr.latitude) : (hh.latitude ? Number(hh.latitude) : null),
    longitude: currentAddr.longitude ? Number(currentAddr.longitude) : (hh.longitude ? Number(hh.longitude) : null),
    residenceAddress: hh.residenceAddress || currentAddr.addressLine || '',
    placeName: hh.placeName || '',
    locationVerificationStatus: hh.locationVerificationStatus || 'not_specified',
    housingType: hh.housingType || 'own',
    housingCondition: hh.housingCondition || inc.housingCondition || 'dilapidated',
    housingNotes: hh.housingNotes || nestData.registrationNote || '',
    landTitleType: hh.landTitleType || 'title_deed',
    landTitleNotes: hh.landTitleNotes || '',
    monthlyIncome: Number(hh.householdIncome || inc.personalIncome || 0),
    monthlyExpense: Number(hh.householdExpense || inc.regularExpense || 0),
    debtAmount: Number(hh.debtAmount || inc.debtBurden || 0),
    debtPurpose: hh.debtPurpose || '',
    incomeBreakdown: incBreakdown,
    expenseBreakdown: expBreakdown,
    householdMembers,
    pastAssistance,
    familySituationSummary: hh.familySituationSummary || inc.livingConstraints || '',
    urgentNeeds: hh.urgentNeeds || inc.assistanceNeeds || '',
    dependentBurdens: hh.dependentBurdens || '',
    coordinator,
    certifier,
    documents: (nestData.documents || []).map((d: any) => ({
      id: d.id,
      name: d.name || d.originalFileName,
      fileName: d.fileName || d.originalFileName,
      category: d.category || d.documentType,
      documentType: d.documentType,
      fileSize: d.fileSize || d.sizeBytes,
      fileUrl: d.fileUrl || `/api/documents/${d.id}/download`,
    })),
    registeredDate: nestData.createdAt,
    createdAt: nestData.createdAt,
    updatedAt: nestData.updatedAt,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractToken(request);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // 1. Try fetching from NestJS PostgreSQL
    try {
      const nestRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}`, { headers });
      if (nestRes.ok) {
        const nestData = await nestRes.json();
        const mapped = mapNestBeneficiaryToRegistryItem(nestData);
        return NextResponse.json({ success: true, data: mapped });
      }
    } catch (nestErr) {
      console.warn('NestJS getById unreachable, falling back to local store:', nestErr);
    }

    // 2. Fallback to RegistryService (local store)
    const data = await RegistryService.getBeneficiaryRegistryById(id);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่พบข้อมูลทะเบียนผู้มีสิทธิ์รับซะกาต' },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

async function handleUpdate(
  request: NextRequest,
  paramsPromise: Promise<{ id: string }>
) {
  try {
    const { id } = await paramsPromise;
    const body = await request.json();
    const input = body.input || body;
    const token = extractToken(request);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-zms-csrf': '1',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Extract actor
    let actor = body.actor;
    if (!actor && token) {
      const sessionUser = await AuthService.validateSession(token);
      if (sessionUser) {
        actor = {
          id: sessionUser.id,
          name: sessionUser.name,
          role: sessionUser.role,
        };
      }
    }
    if (!actor) {
      actor = { id: 'officer-1', name: 'เจ้าหน้าที่ผู้รับผิดชอบ', role: 'officer' };
    }

    // 1. Update Beneficiary in NestJS
    const rawName = (input.fullName || input.name || '').trim();
    let firstName: string | undefined;
    let lastName: string | undefined;
    if (rawName) {
      const parts = rawName.split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || '-';
    }

    const cleanId = input.nationalId ? String(input.nationalId).replace(/[^0-9]/g, '') : undefined;

    await fetch(`${API_BASE_URL}/beneficiaries/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        title: input.titlePrefix || undefined,
        firstName,
        lastName,
        identityNumber: cleanId || undefined,
        dateOfBirth: input.birthDate || undefined,
        phone: input.phone || undefined,
        occupation: input.occupation || undefined,
        maritalStatus: input.maritalStatus || undefined,
        registrationNote: input.housingNotes || input.registrationNote || undefined,
      }),
    });

    // 2. Update Addresses
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

      await fetch(`${API_BASE_URL}/beneficiaries/${id}/addresses`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ addresses: addressesPayload }),
      });
    }

    // 3. Update Income Profile
    if (input.incomeBreakdown || input.expenseBreakdown || input.debtAmount !== undefined) {
      const personalInc = Number(input.incomeBreakdown?.salary || 0) + Number(input.incomeBreakdown?.freelance || 0);
      const regularExp = Number(input.expenseBreakdown?.living || 0) + Number(input.expenseBreakdown?.utilities || 0);
      const debtVal = Number(input.debtAmount || 0);

      await fetch(`${API_BASE_URL}/beneficiaries/${id}/income-profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          personalIncome: personalInc.toFixed(2),
          regularExpense: regularExp.toFixed(2),
          debtBurden: debtVal.toFixed(2),
          housingCondition: input.housingNotes || input.housingCondition || undefined,
          livingConstraints: input.familySituationSummary || undefined,
          assistanceNeeds: input.necessityDetails || input.urgentNeeds || undefined,
        }),
      });
    }

    // 4. Update Household
    const rawMembers = input.householdMembers || input.members;
    const mappedMembers = Array.isArray(rawMembers)
      ? rawMembers
          .filter((m: any) => (m.fullName || '').trim() !== '')
          .map((m: any, idx: number) => ({
            fullName: m.fullName || `สมาชิก ${idx + 1}`,
            relationship: m.relationship || m.relation || 'สมาชิกในครอบครัว',
            ageYears: m.ageYears ?? (m.age ? Number(m.age) : undefined),
            dateOfBirth: m.dateOfBirth || undefined,
            occupation: m.occupation || undefined,
            isDependent:
              m.isDependent ??
              (m.relation === 'บุตร' ||
                m.relation === 'คู่สมรส' ||
                m.relationship === 'บุตร' ||
                m.relationship === 'คู่สมรส'),
            sortOrder: idx + 1,
          }))
      : [];

    await fetch(`${API_BASE_URL}/beneficiaries/${id}/household`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        memberCount: mappedMembers.length + 1,
        householdIncome: Number(input.monthlyIncome ?? input.totalIncome ?? 0).toFixed(2),
        householdExpense: Number(input.monthlyExpense ?? input.totalExpense ?? 0).toFixed(2),
        debtAmount: Number(input.debtAmount ?? 0).toFixed(2),
        debtPurpose: input.debtPurpose || input.debtType || undefined,
        dependentCount: mappedMembers.filter((m: any) => m.isDependent).length,
        additionalNotes: input.familySituationSummary || input.livingLimitations || undefined,
        address: input.address || undefined,
        province: input.province || undefined,
        district: input.district || undefined,
        subdistrict: input.subdistrict || undefined,
        community: input.community || undefined,
        housingType: input.housingType || undefined,
        housingCondition: input.housingCondition || undefined,
        housingNotes: input.housingNotes || undefined,
        landTitleType: input.landTitleType || undefined,
        landTitleNotes: input.landTitleNotes || undefined,
        incomeBreakdown: input.incomeBreakdown ? JSON.stringify(input.incomeBreakdown) : undefined,
        expenseBreakdown: input.expenseBreakdown ? JSON.stringify(input.expenseBreakdown) : undefined,
        pastAssistance: input.pastAssistance ? JSON.stringify(input.pastAssistance) : undefined,
        familySituationSummary: input.familySituationSummary || undefined,
        urgentNeeds: input.urgentNeeds || undefined,
        dependentBurdens: input.dependentBurdens || undefined,
        coordinatorInfo: input.coordinator ? JSON.stringify(input.coordinator) : undefined,
        certifierInfo: input.certifier ? JSON.stringify(input.certifier) : undefined,
        latitude: input.latitude ? Number(input.latitude) : undefined,
        longitude: input.longitude ? Number(input.longitude) : undefined,
        residenceAddress: input.residenceAddress || input.address || undefined,
        placeName: input.placeName || undefined,
        locationVerificationStatus: input.locationVerificationStatus || 'not_specified',
        members: mappedMembers,
      }),
    });

    // 5. Also sync to local registryService for audit history
    try {
      await RegistryService.updateBeneficiaryRegistry(
        id,
        input,
        actor,
        body.notes || input.editNotes || ''
      );
    } catch {}

    // 6. Return updated record from NestJS
    const freshRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}`, { headers });
    let updatedData: any;
    if (freshRes.ok) {
      const freshJson = await freshRes.json();
      updatedData = mapNestBeneficiaryToRegistryItem(freshJson);
    } else {
      updatedData = { id, ...input };
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกการแก้ไขข้อมูลทะเบียนสำเร็จ',
      data: updatedData,
    });
  } catch (error: any) {
    const isForbidden = error.message?.includes('สิทธิ์');
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลทะเบียน' },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
