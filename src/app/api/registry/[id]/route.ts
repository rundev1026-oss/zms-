import { NextRequest, NextResponse } from 'next/server';
import { splitPersonName } from '@zms/shared';
import { RegistryService } from '@/services/registryService';
import { AuthService } from '@/services/authService';
import { resolveServerToken } from '@/lib/serverToken';
import {
  EXPENSE_LINE_KEYS,
  INCOME_LINE_KEYS,
  breakdownsEqual,
  buildHouseholdPayload,
  buildIncomeProfilePayload,
  diffRegistryFields,
  mapNestBeneficiaryToRegistryItem,
  mapRegistryDocument,
  readNestFailure,
  registryNeedsReReview,
  sumFilled,
  valuesEqual,
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

    // 1. Fetch current beneficiary data: Try NestJS first; if not found or error, fallback to local SQLite
    let currentNest: any = null;
    let currentView: any = null;
    let isNestBeneficiary = false;

    try {
      const currentRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}`, { headers });
      if (currentRes.ok) {
        currentNest = await currentRes.json();
        currentView = currentNest ? mapNestBeneficiaryToRegistryItem(currentNest) : null;
        isNestBeneficiary = true;
      }
    } catch (nestErr) {
      console.warn('NestJS fetch failed or unreachable, checking local SQLite:', nestErr);
    }

    if (!isNestBeneficiary) {
      try {
        currentView = await RegistryService.getBeneficiaryRegistryById(id);
      } catch (localErr: any) {
        return NextResponse.json(
          { success: false, error: `ไม่พบข้อมูลทะเบียนผู้มีสิทธิ์รับซะกาตรหัส ${id}` },
          { status: 404 }
        );
      }
    }

    if (!currentView) {
      return NextResponse.json(
        { success: false, error: `ไม่พบข้อมูลทะเบียนผู้มีสิทธิ์รับซะกาตรหัส ${id}` },
        { status: 404 }
      );
    }

    // Check concurrency
    const currentUpdatedAt = currentNest?.updatedAt || currentView?.updatedAt;
    if (
      input.expectedUpdatedAt &&
      currentUpdatedAt &&
      input.expectedUpdatedAt !== currentUpdatedAt
    ) {
      return NextResponse.json(
        { success: false, error: 'มีผู้อื่นบันทึกทะเบียนนี้ไปแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนแก้ไขอีกครั้ง' },
        { status: 409 },
      );
    }

    // Validate non-negative financial numbers if provided
    for (const [key, label] of [
      ['monthlyIncome', 'รายได้ต่อเดือน'],
      ['monthlyExpense', 'ค่าใช้จ่ายต่อเดือน'],
      ['debtAmount', 'ยอดหนี้คงเหลือ'],
    ] as const) {
      const v = input[key];
      if (v !== undefined && v !== null && v !== '') {
        const num = Number(v);
        if (!Number.isFinite(num) || num < 0) {
          return NextResponse.json({ success: false, error: `${label}ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป` }, { status: 400 });
        }
      }
    }

    // Sync total income/expense from breakdown ONLY if breakdown actually changed and total wasn't manually edited
    if (currentView) {
      const incBreakChanged = input.incomeBreakdown !== undefined && !breakdownsEqual(currentView.incomeBreakdown, input.incomeBreakdown);
      const incTotalChanged = input.monthlyIncome !== undefined && !valuesEqual(currentView.monthlyIncome, input.monthlyIncome, 'number');
      if (incBreakChanged && !incTotalChanged) {
        const lineSum = sumFilled(input.incomeBreakdown, INCOME_LINE_KEYS);
        if (lineSum !== null) input.monthlyIncome = lineSum;
      }
      const expBreakChanged = input.expenseBreakdown !== undefined && !breakdownsEqual(currentView.expenseBreakdown, input.expenseBreakdown);
      const expTotalChanged = input.monthlyExpense !== undefined && !valuesEqual(currentView.monthlyExpense, input.monthlyExpense, 'number');
      if (expBreakChanged && !expTotalChanged) {
        const lineSum = sumFilled(input.expenseBreakdown, EXPENSE_LINE_KEYS);
        if (lineSum !== null) input.monthlyExpense = lineSum;
      }
    }

    const mergedForDiff = currentView ? { ...currentView, ...input } : input;
    const changes = Array.isArray(input.changes) && input.changes.length > 0
      ? input.changes
      : currentView
        ? diffRegistryFields(currentView, mergedForDiff)
        : [];
    const material = changes.some((change: any) => change.material);
    const reviewed = registryNeedsReReview(currentView?.registrationStatus);
    if (material && String(body.notes || input.editNotes || '').trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'การแก้ไขข้อมูลที่มีผลต่อคุณสมบัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร' },
        { status: 400 },
      );
    }

    let updatedData: any = null;

    if (isNestBeneficiary) {
      let latestUpdatedAt: string | undefined = currentNest?.updatedAt;

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

      const patchBody: Record<string, unknown> = {
        title: input.titlePrefix === undefined ? undefined : name.prefix,
        firstName,
        lastName,
        identityNumber: cleanId || undefined,
        dateOfBirth: input.birthDate ? String(input.birthDate).slice(0, 10) : undefined,
        phone: input.phone ? String(input.phone).trim() : undefined,
        occupation: input.occupation === undefined ? undefined : String(input.occupation).trim(),
        maritalStatus: input.maritalStatus === undefined ? undefined : String(input.maritalStatus).trim(),
        registrationNote:
          input.housingNotes !== undefined
            ? String(input.housingNotes).trim()
            : input.registrationNote !== undefined
              ? String(input.registrationNote).trim()
              : undefined,
      };

      if (Object.values(patchBody).some((value) => value !== undefined)) {
        const patchRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(patchBody),
        });
        if (!patchRes.ok) {
          const message = await readNestFailure(patchRes, 'บันทึกข้อมูลส่วนบุคคลไม่สำเร็จ');
          return NextResponse.json({ success: false, error: message }, { status: patchRes.status });
        }
        const patched = await patchRes.json().catch(() => null);
        if (patched?.updatedAt) latestUpdatedAt = patched.updatedAt;
      }

      // 2. Update Addresses
      if (
        input.province !== undefined ||
        input.district !== undefined ||
        input.subdistrict !== undefined ||
        input.address !== undefined ||
        input.community !== undefined ||
        input.postcode !== undefined ||
        input.latitude !== undefined ||
        input.longitude !== undefined
      ) {
        const resolvedAddress = input.address !== undefined ? (input.address || undefined) : (currentView?.address || undefined);
        const resolvedCommunity = input.community !== undefined ? (input.community || undefined) : (currentView?.community || undefined);
        const resolvedSubdistrict = input.subdistrict !== undefined ? (input.subdistrict || undefined) : (currentView?.subdistrict || undefined);
        const resolvedDistrict = input.district !== undefined ? (input.district || undefined) : (currentView?.district || undefined);
        const resolvedProvince = input.province !== undefined ? (input.province || undefined) : (currentView?.province || undefined);
        const resolvedPostcode = input.postcode !== undefined ? (input.postcode || undefined) : (currentView?.postcode || undefined);
        const rawLat = input.latitude !== undefined ? input.latitude : currentView?.latitude;
        const rawLng = input.longitude !== undefined ? input.longitude : currentView?.longitude;
        const resolvedLat = rawLat !== undefined && rawLat !== null && rawLat !== '' ? Number(rawLat) : undefined;
        const resolvedLng = rawLng !== undefined && rawLng !== null && rawLng !== '' ? Number(rawLng) : undefined;

        const addressesPayload = [
          {
            addressType: 'REGISTERED',
            addressLine: resolvedAddress,
            community: resolvedCommunity,
            subdistrict: resolvedSubdistrict,
            district: resolvedDistrict,
            province: resolvedProvince,
            postalCode: resolvedPostcode,
            latitude: resolvedLat,
            longitude: resolvedLng,
          },
          {
            addressType: 'CURRENT',
            addressLine: resolvedAddress,
            community: resolvedCommunity,
            subdistrict: resolvedSubdistrict,
            district: resolvedDistrict,
            province: resolvedProvince,
            postalCode: resolvedPostcode,
            latitude: resolvedLat,
            longitude: resolvedLng,
          },
        ];

        const addressRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/addresses`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ addresses: addressesPayload }),
        });
        if (!addressRes.ok) {
          const message = await readNestFailure(addressRes, 'บันทึกข้อมูลที่อยู่ไม่สำเร็จ');
          return NextResponse.json({ success: false, error: message }, { status: addressRes.status });
        }
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

      // 5. Record revision history & re-review status AFTER all data writes succeeded
      if (changes.length > 0) {
        const revisionRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}/revisions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            expectedUpdatedAt: latestUpdatedAt,
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

      // 6. Also sync to local registryService for audit history
      try {
        await RegistryService.updateBeneficiaryRegistry(
          id,
          input,
          actor,
          body.notes || input.editNotes || ''
        );
      } catch (e) {
        console.warn('Sync to local SQLite store failed:', e);
      }

      // 7. Return updated record from NestJS
      const freshRes = await fetch(`${API_BASE_URL}/beneficiaries/${id}`, { headers });
      if (freshRes.ok) {
        const freshJson = await freshRes.json();
        updatedData = mapNestBeneficiaryToRegistryItem(freshJson);
      } else {
        updatedData = { id, ...input };
      }
    } else {
      // Direct SQLite update
      updatedData = await RegistryService.updateBeneficiaryRegistry(
        id,
        input,
        actor,
        body.notes || input.editNotes || ''
      );
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
