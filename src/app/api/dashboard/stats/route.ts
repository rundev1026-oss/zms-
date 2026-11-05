import { NextRequest, NextResponse } from 'next/server';
import { resolveServerToken } from '@/lib/serverToken';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '';

    const token = resolveServerToken(request);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const qs = new URLSearchParams();
    if (period) qs.set('period', period);

    const nestRes = await fetch(
      `${API_BASE_URL}/beneficiaries/dashboard-metrics${qs.toString() ? `?${qs.toString()}` : ''}`,
      {
        headers,
        cache: 'no-store',
      },
    );

    if (!nestRes.ok) {
      if (nestRes.status === 401) {
        return NextResponse.json({
          success: true,
          data: emptyStats(),
        });
      }
      const err = await nestRes.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการดึงสถิติภาพรวม' },
        { status: nestRes.status },
      );
    }

    const metrics = await nestRes.json();

    // Return both the 6 strictly separated metrics (Section 9) AND backward-compatible
    // registry/applications objects so ExecutiveDashboard and BeneficiaryRegistryView stay in sync.
    return NextResponse.json({
      success: true,
      data: {
        period: metrics.period ?? null,
        availablePeriods: metrics.availablePeriods ?? [],
        // 6 Strictly Separated Core Metrics (Master Requirement Section 9)
        totalMembers: metrics.totalMembers ?? 0,
        pendingAssessments: metrics.pendingAssessments ?? 0,
        eligibleCount: metrics.eligibleCount ?? 0,
        ineligibleCount: metrics.ineligibleCount ?? 0,
        totalAssistanceRequests: metrics.totalAssistanceRequests ?? 0,
        assistedMembersCount: metrics.assistedMembersCount ?? 0,
        totalAssessmentRounds: metrics.totalAssessmentRounds ?? 0,
        totalDisbursedAmount: metrics.totalDisbursedAmount ?? 0,
        // Backward-compatible flat aliases
        totalRegisteredBeneficiaries: metrics.totalMembers ?? 0,
        pendingVerificationRegistries: metrics.pendingAssessments ?? 0,
        qualifiedBeneficiaries: metrics.eligibleCount ?? 0,
        disqualifiedBeneficiaries: metrics.ineligibleCount ?? 0,
        pendingAssistanceRequests: metrics.requestBreakdown?.pending ?? 0,
        approvedAssistanceRequests: metrics.requestBreakdown?.approved ?? 0,
        completedAssistanceDisbursed: metrics.assistedMembersCount ?? 0,
        separated: {
          totalMembers: metrics.totalMembers ?? 0,
          pendingAssessments: metrics.pendingAssessments ?? 0,
          eligibleCount: metrics.eligibleCount ?? 0,
          ineligibleCount: metrics.ineligibleCount ?? 0,
          totalAssistanceRequests: metrics.totalAssistanceRequests ?? 0,
          assistedMembersCount: metrics.assistedMembersCount ?? 0,
          totalAssessmentRounds: metrics.totalAssessmentRounds ?? 0,
          totalDisbursedAmount: metrics.totalDisbursedAmount ?? 0,
        },
        registry: {
          totalRegistered: metrics.totalMembers ?? 0,
          qualifiedCount: metrics.eligibleCount ?? 0,
          pendingVerificationCount: metrics.pendingAssessments ?? 0,
          disqualifiedCount: metrics.ineligibleCount ?? 0,
          suspendedCount: metrics.memberBreakdown?.suspended ?? 0,
          byAsnaf: metrics.byAsnaf ?? {},
          byProvince: metrics.byProvince ?? {},
        },
        applications: {
          totalApplications: metrics.totalAssistanceRequests ?? 0,
          pendingApplications: metrics.requestBreakdown?.pending ?? 0,
          approvedApplications: metrics.requestBreakdown?.approved ?? 0,
          rejectedApplications: metrics.requestBreakdown?.rejected ?? 0,
          disbursedTotalAmount: metrics.totalDisbursedAmount ?? 0,
          assistedMembersCount: metrics.assistedMembersCount ?? 0,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงสถิติภาพรวม' },
      { status: 500 },
    );
  }
}

function emptyStats() {
  return {
    period: null,
    availablePeriods: [],
    totalMembers: 0,
    pendingAssessments: 0,
    eligibleCount: 0,
    ineligibleCount: 0,
    totalAssistanceRequests: 0,
    assistedMembersCount: 0,
    totalAssessmentRounds: 0,
    totalDisbursedAmount: 0,
    totalRegisteredBeneficiaries: 0,
    pendingVerificationRegistries: 0,
    qualifiedBeneficiaries: 0,
    disqualifiedBeneficiaries: 0,
    pendingAssistanceRequests: 0,
    approvedAssistanceRequests: 0,
    completedAssistanceDisbursed: 0,
    separated: {
      totalMembers: 0,
      pendingAssessments: 0,
      eligibleCount: 0,
      ineligibleCount: 0,
      totalAssistanceRequests: 0,
      assistedMembersCount: 0,
      totalAssessmentRounds: 0,
      totalDisbursedAmount: 0,
    },
    registry: {
      totalRegistered: 0,
      qualifiedCount: 0,
      pendingVerificationCount: 0,
      disqualifiedCount: 0,
      suspendedCount: 0,
      byAsnaf: {},
      byProvince: {},
    },
    applications: {
      totalApplications: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
      disbursedTotalAmount: 0,
      assistedMembersCount: 0,
    },
  };
}
