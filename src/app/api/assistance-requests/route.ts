import { NextRequest, NextResponse } from 'next/server';
import { proxyToNest } from '@/lib/apiProxy';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = `/assistance-requests${queryString ? `?${queryString}` : ''}`;

    const res = await proxyToNest(endpoint, request, { method: 'GET' });
    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'เกิดข้อผิดพลาดในการดึงรายการคำร้อง' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: json.items,
      pagination: {
        total: json.total,
        page: json.page,
        limit: json.limit,
        totalPages: json.totalPages,
      },
      items: json.items,
      total: json.total,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงรายการคำร้องขอความช่วยเหลือ' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawInput = body.input || body;

    const beneficiaryId =
      rawInput.beneficiaryId ||
      rawInput.nationalId ||
      body.nationalId ||
      rawInput.memberId ||
      body.memberId;

    if (!beneficiaryId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุผู้ขอรับความช่วยเหลือ (เลขบัตรประชาชน หรือรหัสผู้มีสิทธิ์)' },
        { status: 400 }
      );
    }

    // Category-Specific Duplicate Prevention Rules (Phase 8)
    try {
      const dupCheck = await BeneficiaryService.checkDuplicateAssistanceRules({
        beneficiaryId: String(beneficiaryId),
        nationalId: rawInput.nationalId || body.nationalId,
        assistanceTypeId: rawInput.assistanceTypeId,
        assistanceTypeCode: rawInput.assistanceTypeCode || rawInput.assistanceType,
        assistanceTypeName: rawInput.assistanceType,
        fiscalYear: rawInput.fiscalYear || body.fiscalYear,
      });

      if (dupCheck.hasDuplicate && !rawInput.allowDuplicateOverride && !body.allowDuplicateOverride) {
        return NextResponse.json(
          {
            success: false,
            error: dupCheck.message,
            ruleCode: dupCheck.ruleCode,
            ruleNameTh: dupCheck.ruleNameTh,
            existingApplication: dupCheck.existingApplication,
          },
          { status: 422 }
        );
      }
    } catch {}

    const rawDocs = Array.isArray(rawInput.documents)
      ? rawInput.documents
      : Array.isArray(body.documents)
        ? body.documents
        : undefined;

    const payload = {
      beneficiaryId,
      assessmentId: rawInput.assessmentId || body.assessmentId || undefined,
      assistanceType: rawInput.assistanceType || body.assistanceType || undefined,
      assistanceTypeDetails:
        rawInput.assistanceTypeDetails || body.assistanceTypeDetails || undefined,
      asnafCategory: rawInput.asnafCategory || 'miskin',
      primaryGroupCode: rawInput.primaryGroupCode || body.primaryGroupCode || undefined,
      requestedAmount: Number(rawInput.requestedAmount || 0),
      urgencyLevel: rawInput.urgencyLevel || 'normal',
      hardshipReasons: rawInput.hardshipReasons || rawInput.necessityDetails || rawInput.notes,
      necessityDetails: rawInput.necessityDetails || rawInput.hardshipReasons || '',
      assistanceTypeId: rawInput.assistanceTypeId,
      assistanceGroup: rawInput.assistanceGroup || 'core',
      specificFundId: rawInput.specificFundId,
      specificFundCode: rawInput.specificFundCode || body.specificFundCode || undefined,
      specificFundName: rawInput.specificFundName || body.specificFundName || undefined,
      fiscalYear: rawInput.fiscalYear || body.fiscalYear || undefined,
      assistanceFormatId: rawInput.assistanceFormatId || body.assistanceFormatId || undefined,
      assistanceFormatCode: rawInput.assistanceFormatCode || rawInput.assistanceFormat || body.assistanceFormatCode || body.assistanceFormat || undefined,
      assistanceFormatName: rawInput.assistanceFormatName || body.assistanceFormatName || undefined,
      deliveryMethod: rawInput.deliveryMethod || body.deliveryMethod || undefined,
      branchId: rawInput.branchId,
      branchName: rawInput.branchName,
      status: rawInput.status || body.status || undefined,
      idempotencyKey: rawInput.idempotencyKey || body.idempotencyKey || undefined,
      documents: rawDocs
        ?.filter((d: any) => d && d.name && d.fileUrl)
        .map((d: any) => ({
          name: String(d.name),
          category: String(d.category || 'other_doc'),
          fileUrl: String(d.fileUrl),
          mimeType: d.mimeType ? String(d.mimeType) : undefined,
          fileSize: typeof d.fileSize === 'number' ? d.fileSize : undefined,
          storageProvider: d.storageProvider ? String(d.storageProvider) : undefined,
          storagePath: d.storagePath ? String(d.storagePath) : undefined,
        })),
    };

    const res = await proxyToNest('/assistance-requests', request, {
      method: 'POST',
      body: payload,
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: json.message || 'เกิดข้อผิดพลาดในการยื่นคำร้อง' },
        { status: res.status }
      );
    }

    if (json.id) {
      try {
        const { upsertApplicationIntoSqlite } = await import('@/lib/syncAssistanceRequest');
        await upsertApplicationIntoSqlite({
          ...json,
          ...payload,
          id: json.id,
          applicationNo: json.applicationNo || json.id,
        });
      } catch (syncErr) {
        console.error('Failed to sync application to SQLite:', syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        applicationId: json.id,
        applicationNo: json.applicationNo,
        ...json,
      },
      message: `ยื่นคำร้องขอความช่วยเหลือสำเร็จ เลขที่คำร้อง ${json.applicationNo}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการยื่นคำร้องขอความช่วยเหลือ' },
      { status: 500 }
    );
  }
}
