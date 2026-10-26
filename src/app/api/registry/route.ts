import { NextRequest, NextResponse } from 'next/server';
import { RegistryService } from '@/services/registryService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const registrationStatus = searchParams.get('registrationStatus') || undefined;
    const asnafCategory = searchParams.get('asnafCategory') || undefined;
    const branchId = searchParams.get('branchId') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const data: any = await RegistryService.getAllBeneficiaryRegistries({
      search,
      registrationStatus,
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
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลทะเบียนผู้มีสิทธิ์รับซะกาต' },
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

    const input = body.input || body;
    const result = await RegistryService.registerBeneficiaryProfile(input, actor);

    return NextResponse.json({
      success: true,
      data: result,
      message: `ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตสำเร็จ รหัสทะเบียน ${result.registrationNo}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต' },
      { status: 400 }
    );
  }
}
