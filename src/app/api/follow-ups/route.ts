import { NextRequest, NextResponse } from 'next/server';
import { FollowUpService } from '@/services/followUpService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const assistanceType = searchParams.get('assistanceType') || undefined;
    const branchId = searchParams.get('branchId') || undefined;
    const officerId = searchParams.get('officerId') || undefined;
    const status = searchParams.get('status') || undefined;
    const filterTab = (searchParams.get('filterTab') as any) || undefined;
    const beneficiaryId = searchParams.get('beneficiaryId') || undefined;
    const applicationId = searchParams.get('applicationId') || undefined;
    const registrationNo = searchParams.get('registrationNo') || undefined;
    const applicationNo = searchParams.get('applicationNo') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const data = await FollowUpService.getPlans({
      search,
      assistanceType,
      branchId,
      officerId,
      status,
      filterTab,
      beneficiaryId,
      applicationId,
      registrationNo,
      applicationNo,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: data.plans,
      stats: data.stats,
    });
  } catch (error: any) {
    console.error('Error fetching follow-up plans:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลการติดตามผล' },
      { status: 500 }
    );
  }
}
