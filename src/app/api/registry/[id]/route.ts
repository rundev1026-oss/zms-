import { NextRequest, NextResponse } from 'next/server';
import { splitPersonName } from '@zms/shared';
import { RegistryService } from '@/services/registryService';
import { AuthService } from '@/services/authService';
import { resolveServerToken } from '@/lib/serverToken';
import {
  buildHouseholdPayload,
  buildIncomeProfilePayload,
  diffRegistryFields,
  mapNestBeneficiaryToRegistryItem,
  mapRegistryDocument,
  readNestFailure,
  registryNeedsReReview,
} from '@/lib/registrySurvey';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function extractToken(req: Request): string {
  return resolveServerToken(req);
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
        const docsRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/documents`, { headers });
        if (docsRes.ok) {
          const docs = await docsRes.json();
          if (Array.isArray(docs)) mapped.documents = docs.map((document: any) => mapRegistryDocument(document));
        }
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

    const forwarded = request.headers.get('x-forwarded-for') || '';
    const currentRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}`, { headers });
    const current = currentRes.ok ? await currentRes.json() : null;
    const currentView = current ? mapNestBeneficiaryToRegistryItem(current) : null;
    if (
      input.expectedUpdatedAt &&
      current?.updatedAt &&
      input.expectedUpdatedAt !== current.updatedAt
    ) {
      return NextResponse.json(
        { success: false, error: 'มีผู้อื่นบันทึกทะเบียนนี้ไปแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไขอีกครั้ง' },
        { status: 409 },
      );
    }

    const changes = Array.isArray(input.changes)
      ? input.changes
      : currentView
        ? diffRegistryFields(currentView, input)
        : [];
    const material = changes.some((change: any) => change.material);
    const reviewed = registryNeedsReReview(currentView?.registrationStatus);
    if (reviewed && material && String(body.notes || input.editNotes || '').trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'การแก้ไขข้อมูลที่มีผลต่อคุณสมบัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร' },
        { status: 400 },
      );
    }
    if (changes.length > 0) {
      const revisionRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/revisions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          expectedUpdatedAt: current?.updatedAt,
          reason: body.notes || input.editNotes || '',
          ipAddress: forwarded.split(',')[0]?.trim() || undefined,
          changes,
        }),
      });
      if (!revisionRes.ok) {
        const message = await readNestFailure(revisionRes, 'บันทึกประวัติการแก้ไขไม่สำเร็จ');
        return NextResponse.json({ success: false, error: message }, { status: revisionRes.status });
      }
    }

    // 1. Update Beneficiary in NestJS
    const hasNameInput = [input.titlePrefix, input.firstName, input.lastName, input.fullName, input.name]
      .some((value) => value !== undefined && value !== null && String(value).trim() !== '');
    const name = splitPersonName({
      prefix: input.titlePrefix,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName: input.fullName || input.name,
    });
    const firstName = hasNameInput ? name.firstName || undefined : undefined;
    const lastName = hasNameInput ? name.lastName || undefined : undefined;

    const cleanId = input.nationalId ? String(input.nationalId).replace(/[^0-9]/g, '') : undefined;

    const patchRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        title: input.titlePrefix === undefined ? undefined : name.prefix,
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
    if (!patchRes.ok) {
      const message = await readNestFailure(patchRes, 'บันทึกข้อมูลส่วนบุคคลไม่สำเร็จ');
      return NextResponse.json({ success: false, error: message }, { status: patchRes.status });
    }

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

    // 3. Update Income Profile — omit fields that were not sent so other values stay
    const incomePayload = buildIncomeProfilePayload(input);
    if (incomePayload) {
      const incomeRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/income-profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(incomePayload),
      });
      if (!incomeRes.ok) {
        const message = await readNestFailure(incomeRes, 'บันทึกรายได้รายจ่ายไม่สำเร็จ');
        return NextResponse.json({ success: false, error: message }, { status: incomeRes.status });
      }
    }

    // 4. Update Household — only the fields present in this request
    const householdPayload = buildHouseholdPayload(input);
    if (Object.keys(householdPayload).length > 0) {
      const householdRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/household`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(householdPayload),
      });
      if (!householdRes.ok) {
        const message = await readNestFailure(householdRes, 'บันทึกข้อมูลครัวเรือนไม่สำเร็จ');
        return NextResponse.json({ success: false, error: message }, { status: householdRes.status });
      }
    }

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

    const sentBack = reviewed && material;
    return NextResponse.json({
      success: true,
      message: sentBack
        ? 'บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว และส่งกลับไปรอตรวจสอบใหม่'
        : 'บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว',
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
