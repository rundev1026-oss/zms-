import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';
import { RegistryService } from '@/services/registryService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const asnafCategory = searchParams.get('asnafCategory') || undefined;
    const branchId = searchParams.get('branchId') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const data: any = await BeneficiaryService.getAllApplications({
      search,
      status,
      asnafCategory,
      branchId,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: data.pagination || {
        total: data.length,
        page: page || 1,
        limit: limit || data.length,
        totalPages: 1,
      },
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
    const actor = body.actor || {
      id: 'officer-1',
      name: 'เจ้าหน้าที่ผู้รับผิดชอบ',
      role: 'officer',
    };

    const payload = body.input ? { ...body.input, nationalId: body.nationalId || body.input.nationalId, memberId: body.memberId || body.input.memberId } : body;

    const result = await RegistryService.createAssistanceRequest(payload, actor);

    return NextResponse.json({
      success: true,
      data: result,
      message: `ยื่นคำร้องขอความช่วยเหลือสำเร็จ เลขที่คำร้อง ${result.applicationNo}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการยื่นคำร้องขอความช่วยเหลือ' },
      { status: 400 }
    );
  }
}
