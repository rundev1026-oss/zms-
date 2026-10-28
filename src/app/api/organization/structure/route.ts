import { NextResponse } from 'next/server';
import { OrganizationService } from '@/services/organizationService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const branchId = searchParams.get('branchId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const status = searchParams.get('status') || undefined;
    const staffFilter = searchParams.get('staffFilter') || undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const includePersonnel = searchParams.get('includePersonnel') === 'true';

    const data = await OrganizationService.getOrganizationStructure({
      search,
      branchId,
      departmentId,
      status,
      staffFilter,
      activeOnly,
    });

    let personnel = undefined;
    if (includePersonnel) {
      personnel = await OrganizationService.getOrganizationPersonnel({
        branchId,
        departmentId,
        search,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        ...(personnel ? { personnel } : {}),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถโหลดโครงสร้างองค์กรได้' },
      { status: 500 }
    );
  }
}
