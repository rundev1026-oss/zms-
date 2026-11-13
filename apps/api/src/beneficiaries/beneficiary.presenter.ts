import type { Prisma } from '@prisma/client';
import { completedAgeYears } from './beneficiary-fields';
import { maskIdentityNumber } from './mask-identity';

export const beneficiaryInclude = {
  addresses: true,
  household: {
    include: {
      members: { orderBy: { sortOrder: 'asc' } },
    },
  },
  incomeProfile: true,
  documents: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { uploadedBy: { select: { displayName: true, email: true } } },
  },
  assessments: {
    orderBy: [{ assessedAt: 'desc' as const }, { createdAt: 'desc' as const }],
    take: 5,
    include: {
      category: true,
      recordedBy: { select: { displayName: true, email: true } },
      reviewedBy: { select: { displayName: true, email: true } },
    },
  },
  applications: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      status: true,
      disbursedAmount: true,
      actualAssistanceValue: true,
      branchName: true,
    },
  },
  _count: {
    select: {
      assessments: true,
      applications: true,
    },
  },
  createdBy: { select: { displayName: true, email: true } },
  deletedBy: {
    select: { id: true, displayName: true, email: true },
  },
} satisfies Prisma.BeneficiaryInclude;

export type BeneficiaryRecord = Prisma.BeneficiaryGetPayload<{
  include: typeof beneficiaryInclude;
}>;

export interface BeneficiaryLatestAssessmentSummary {
  id: string;
  assessmentNumber: string | null;
  assessmentPeriod: string | null;
  assessmentType: string;
  assessmentDate: string;
  status: string;
  decision: string;
  resultCode: string;
  categoryCode: string;
  categoryNameTh: string;
  rationale: string;
  recommendations: string | null;
  nextAssessmentDate: string | null;
  assessorName: string | null;
  approvedByName: string | null;
}

export interface BeneficiaryView {
  id: string;
  registryNumber: string;
  memberId: string | null;
  memberStatus: string;
  status: string;
  title: string | null;
  firstName: string;
  lastName: string;
  identityType: string;
  identityNumber: string | null;
  dateOfBirth: string | null;
  ageYears: number | null;
  phone: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  registrationNote: string | null;
  province: string | null;
  community: string | null;
  asnaf: {
    id: string;
    code: string;
    nameTh: string;
    rationale: string;
    assessedAt: string;
    recordedByName: string | null;
    reviewedByName: string | null;
  } | null;
  latestAssessment: BeneficiaryLatestAssessmentSummary | null;
  assessmentCount: number;
  createdByName: string | null;
  requestCount: number;
  requestBreakdown: {
    total: number;
    pending: number;
    approved: number;
    disbursed: number;
  };
  branchName: string | null;
  aidTotal?: string;
  addresses?: any[];
  household?: any;
  incomeProfile?: any;
  documents?: any[];
  deletedAt?: string | null;
  deletedById?: string | null;
  deletedByName?: string | null;
  deletionReason?: string | null;
  deletionReference?: string | null;
  deletionStatus?: boolean;
  createdAt: string;
  updatedAt: string;
}

export function presentBeneficiary(
  row: BeneficiaryRecord,
  options: { revealIdentity: boolean; revealAid: boolean },
): BeneficiaryView {
  const addresses = Array.isArray(row.addresses) ? row.addresses : [];
  const current = addresses.find((address) => address.addressType === 'CURRENT');
  const registered = addresses.find((address) => address.addressType === 'REGISTERED');
  const place = current ?? registered ?? null;

  const assessments = Array.isArray(row.assessments) ? row.assessments : [];
  const latest = assessments[0];
  const confirmed = assessments.find((a) => a.decision === 'CONFIRMED') ?? latest;

  const apps = Array.isArray((row as any).applications) ? (row as any).applications : [];
  const requestCount = (row as any)._count?.applications ?? apps.length;
  const requestBreakdown = classifyMemberRequests(apps);
  const branchName = apps.find((app: { branchName?: string | null }) => app.branchName)?.branchName ?? null;
  const assessmentCount = (row as any)._count?.assessments ?? assessments.length;

  const dateOfBirth = row.dateOfBirth === null ? null : row.dateOfBirth.toISOString().slice(0, 10);
  const view: BeneficiaryView = {
    id: row.id,
    registryNumber: row.registryNumber,
    memberId: row.memberId ?? null,
    memberStatus: (row as any).memberStatus ?? 'ACTIVE',
    status: row.status,
    title: row.title,
    firstName: row.firstName,
    lastName: row.lastName,
    identityType: row.identityType,
    identityNumber: options.revealIdentity
      ? row.identityNumber
      : maskIdentityNumber(row.identityNumber),
    dateOfBirth,
    ageYears: dateOfBirth === null ? null : completedAgeYears(dateOfBirth, new Date()),
    phone: row.phone,
    occupation: row.occupation,
    maritalStatus: row.maritalStatus,
    registrationNote: row.registrationNote,
    province: place?.province ?? null,
    community: place?.community ?? null,
    asnaf:
      confirmed === undefined
        ? null
        : {
            id: confirmed.category.id,
            code: confirmed.category.code,
            nameTh: confirmed.category.nameTh,
            rationale: confirmed.rationale,
            assessedAt: confirmed.assessedAt.toISOString(),
            recordedByName:
              confirmed.recordedBy?.displayName || confirmed.recordedBy?.email || null,
            reviewedByName:
              confirmed.reviewedBy?.displayName || confirmed.reviewedBy?.email || null,
          },
    latestAssessment:
      latest === undefined
        ? null
        : {
            id: latest.id,
            assessmentNumber: (latest as any).assessmentNumber ?? null,
            assessmentPeriod: (latest as any).assessmentPeriod ?? null,
            assessmentType: (latest as any).assessmentType ?? 'INITIAL',
            assessmentDate: latest.assessedAt.toISOString(),
            status: (latest as any).status ?? 'PENDING_ASSESSMENT',
            decision: latest.decision,
            resultCode: (latest as any).eligibilityResult ?? 'PENDING',
            categoryCode: latest.category.code,
            categoryNameTh: latest.category.nameTh,
            rationale: latest.rationale,
            recommendations: (latest as any).recommendations ?? null,
            nextAssessmentDate:
              (latest as any).nextAssessmentDate instanceof Date
                ? (latest as any).nextAssessmentDate.toISOString().slice(0, 10)
                : (latest as any).nextAssessmentDate ?? null,
            assessorName: latest.recordedBy?.displayName || latest.recordedBy?.email || null,
            approvedByName: latest.reviewedBy?.displayName || latest.reviewedBy?.email || null,
          },
    assessmentCount,
    createdByName: row.createdBy?.displayName || row.createdBy?.email || null,
    requestCount,
    requestBreakdown,
    branchName,
    addresses,
    household: row.household
      ? {
          ...row.household,
          householdIncome: row.household.householdIncome?.toFixed(2) ?? null,
          householdExpense: row.household.householdExpense?.toFixed(2) ?? null,
          debtAmount: row.household.debtAmount?.toFixed(2) ?? null,
          latitude: row.household.latitude ? Number(row.household.latitude) : null,
          longitude: row.household.longitude ? Number(row.household.longitude) : null,
          members: (row.household.members || []).map((m) => ({
            ...m,
            dateOfBirth: m.dateOfBirth === null ? null : m.dateOfBirth.toISOString().slice(0, 10),
            monthlyIncome: m.monthlyIncome == null ? null : m.monthlyIncome.toFixed(2),
          })),
        }
      : null,
    incomeProfile: row.incomeProfile
      ? {
          ...row.incomeProfile,
          personalIncome: row.incomeProfile.personalIncome?.toFixed(2) ?? null,
          regularExpense: row.incomeProfile.regularExpense?.toFixed(2) ?? null,
          debtBurden: row.incomeProfile.debtBurden?.toFixed(2) ?? null,
        }
      : null,
    documents: (row.documents || []).map((d) => ({
      id: d.id,
      name: d.originalFileName,
      fileName: d.originalFileName,
      documentType: d.documentType,
      category: d.documentType,
      fileSize: d.sizeBytes,
      mimeType: d.mimeType,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      uploadedByName: d.uploadedBy?.displayName || d.uploadedBy?.email || null,
      fileUrl: `/api/documents/${d.id}/content`,
    })),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    deletedById: row.deletedById ?? null,
    deletedByName: row.deletedBy ? row.deletedBy.displayName || row.deletedBy.email : null,
    deletionReason: row.deletionReason ?? null,
    deletionReference: row.deletionReference ?? null,
    deletionStatus: row.deletionStatus ?? false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (options.revealAid) {
    let totalAid = 0;
    for (const app of apps) {
      const st = String(app.status || '').toLowerCase();
      const val = Number(app.actualAssistanceValue ?? app.disbursedAmount ?? 0);
      if (Number.isFinite(val) && val > 0 && (st === 'disbursed' || st === 'completed' || Number(app.disbursedAmount || 0) > 0)) {
        totalAid += val;
      }
    }
    view.aidTotal = totalAid.toFixed(2);
  }
  return view;
}

const PENDING_REQUEST_STATUSES = new Set([
  'draft',
  'submitted',
  'doc_review',
  'field_inspection',
  'pending_approval',
  'assessment',
  'assessing',
  'need_info',
  'under_review',
]);
const APPROVED_REQUEST_STATUSES = new Set([
  'approved',
  'wait_disbursement',
  'pending_disbursement',
]);

function classifyMemberRequests(
  apps: Array<{ status?: string | null; disbursedAmount?: unknown; actualAssistanceValue?: unknown }>,
) {
  let pending = 0;
  let approved = 0;
  let disbursed = 0;
  for (const app of apps) {
    const status = String(app.status || '').toLowerCase();
    const paid = Number(app.disbursedAmount || 0) > 0 || Number(app.actualAssistanceValue || 0) > 0;
    const actuallyPaid =
      status === 'disbursed' ||
      status === 'completed' ||
      (paid && ['disbursed', 'completed', 'closed', 'followup'].includes(status));
    if (actuallyPaid) disbursed += 1;
    else if (APPROVED_REQUEST_STATUSES.has(status)) approved += 1;
    else if (PENDING_REQUEST_STATUSES.has(status)) pending += 1;
  }
  return { total: apps.length, pending, approved, disbursed };
}
