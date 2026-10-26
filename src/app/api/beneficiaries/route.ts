import { NextRequest, NextResponse } from 'next/server';
import { BeneficiaryService } from '@/services/beneficiaryService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const asnafCategory = searchParams.get('asnaf') || undefined;
    const branchId = searchParams.get('branch') || undefined;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const applications = await BeneficiaryService.getAllApplications({
      search,
      status,
      asnafCategory,
      branchId,
      page,
      limit,
    });

    const pagination = (applications as any).pagination || undefined;

    return NextResponse.json({ 
      success: true, 
      data: applications,
      ...(pagination ? { pagination } : {})
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลคำร้อง' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, actor } = body;

    if (!input || !actor) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลคำขอไม่สมบูรณ์ (ต้องระบุ input และ actor)' },
        { status: 400 }
      );
    }

    const result = await BeneficiaryService.registerBeneficiary(input, actor);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
