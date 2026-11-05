import { Prisma } from '@prisma/client';
import { completedAgeYears } from '../beneficiaries/beneficiary-fields';
import { maskIdentityNumber } from '../beneficiaries/mask-identity';

export const ASSESSMENT_WORKFLOW_STATUSES = [
  'DRAFT',
  'PENDING_ASSESSMENT',
  'UNDER_REVIEW',
  'ELIGIBLE',
  'NOT_ELIGIBLE',
  'RETURNED_FOR_CORRECTION',
  'APPROVED',
  'CLOSED',
] as const;

export type AssessmentWorkflowStatus = (typeof ASSESSMENT_WORKFLOW_STATUSES)[number];

export const ELIGIBILITY_RESULTS = ['PENDING', 'ELIGIBLE', 'NOT_ELIGIBLE'] as const;
export type EligibilityResultCode = (typeof ELIGIBILITY_RESULTS)[number];

export const ASSESSMENT_TYPES = ['INITIAL', 'PERIODIC', 'SPECIAL'] as const;
export type AssessmentTypeCode = (typeof ASSESSMENT_TYPES)[number];

export const MEMBER_STATUSES = [
  'ACTIVE',
  'PENDING_VERIFICATION',
  'SUSPENDED',
  'ARCHIVED',
] as const;
export type MemberStatusCode = (typeof MEMBER_STATUSES)[number];

export function deriveDecisionFromAssessment(
  status: string,
  eligibilityResult?: string | null,
): 'PROPOSED' | 'CONFIRMED' | 'NOT_CONFIRMED' {
  const s = (status || '').toUpperCase();
  const r = (eligibilityResult || '').toUpperCase();
  if (s === 'ELIGIBLE' || s === 'APPROVED' || (r === 'ELIGIBLE' && s !== 'DRAFT' && s !== 'PENDING_ASSESSMENT')) {
    return 'CONFIRMED';
  }
  if (s === 'NOT_ELIGIBLE' || r === 'NOT_ELIGIBLE') {
    return 'NOT_CONFIRMED';
  }
  return 'PROPOSED';
}

export function normalizeEligibilityResult(
  status: string,
  input?: string | null,
): EligibilityResultCode {
  const r = (input || '').toUpperCase();
  if (r === 'ELIGIBLE' || r === 'NOT_ELIGIBLE' || r === 'PENDING') {
    return r;
  }
  const s = (status || '').toUpperCase();
  if (s === 'ELIGIBLE' || s === 'APPROVED') return 'ELIGIBLE';
  if (s === 'NOT_ELIGIBLE') return 'NOT_ELIGIBLE';
  return 'PENDING';
}

export async function allocateAssessmentNumber(
  tx: { assessmentCounter?: { upsert: (args: any) => Promise<{ lastValue: number }> } },
  assessedAt: Date,
): Promise<string | undefined> {
  if (!tx?.assessmentCounter?.upsert) {
    return undefined;
  }
  const year = assessedAt.getFullYear();
  const counter = await tx.assessmentCounter.upsert({
    where: { year },
    create: { year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return `ASM-${year}-${String(counter.lastValue).padStart(6, '0')}`;
}

function parseJsonSafe(raw: unknown): unknown {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function decToNum(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Builds an immutable point-in-time snapshot of the member's master record
 * at the moment of assessment. Subsequent edits to Beneficiary master data
 * must never alter historical assessment snapshots.
 */
export function buildMemberAssessmentSnapshot(
  row: Record<string, any> | null | undefined,
  assessedAt: Date,
): Prisma.InputJsonValue | undefined {
  if (!row || (!row.firstName && !Array.isArray(row.addresses))) {
    return undefined;
  }

  const addresses = Array.isArray(row.addresses) ? row.addresses : [];
  const registered = addresses.find((a: any) => a.addressType === 'REGISTERED') || null;
  const current = addresses.find((a: any) => a.addressType === 'CURRENT') || null;
  const h = row.household || null;
  const ip = row.incomeProfile || null;

  const dob =
    row.dateOfBirth instanceof Date
      ? row.dateOfBirth.toISOString().slice(0, 10)
      : typeof row.dateOfBirth === 'string'
        ? row.dateOfBirth.slice(0, 10)
        : null;

  const personalIncome = decToNum(ip?.personalIncome);
  const householdIncome = decToNum(h?.householdIncome ?? ip?.personalIncome);
  const regularExpense = decToNum(ip?.regularExpense);
  const householdExpense = decToNum(h?.householdExpense ?? ip?.regularExpense);
  const debtBurden = decToNum(ip?.debtBurden);
  const debtAmount = decToNum(h?.debtAmount ?? ip?.debtBurden);

  return {
    snapshotVersion: 1,
    capturedAt: assessedAt.toISOString(),
    member: {
      id: row.id ?? null,
      memberId: row.memberId ?? null,
      title: row.title ?? null,
      firstName: row.firstName ?? '',
      lastName: row.lastName ?? '',
      fullName: [row.title, row.firstName, row.lastName].filter(Boolean).join(' ').trim(),
      identityType: row.identityType ?? null,
      identityMasked: maskIdentityNumber(row.identityNumber ?? null),
      dateOfBirth: dob,
      ageYears: dob ? completedAgeYears(dob, assessedAt) : null,
      phone: row.phone ?? null,
      occupation: row.occupation ?? null,
      maritalStatus: row.maritalStatus ?? null,
      memberStatus: row.memberStatus ?? 'ACTIVE',
      registryStatus: row.status ?? null,
    },
    addresses: {
      registered: registered
        ? {
            addressLine: registered.addressLine ?? null,
            community: registered.community ?? null,
            subdistrict: registered.subdistrict ?? null,
            district: registered.district ?? null,
            province: registered.province ?? null,
            postalCode: registered.postalCode ?? null,
            latitude: registered.latitude != null ? Number(registered.latitude) : null,
            longitude: registered.longitude != null ? Number(registered.longitude) : null,
          }
        : null,
      current: current
        ? {
            addressLine: current.addressLine ?? null,
            community: current.community ?? null,
            subdistrict: current.subdistrict ?? null,
            district: current.district ?? null,
            province: current.province ?? null,
            postalCode: current.postalCode ?? null,
            latitude: current.latitude != null ? Number(current.latitude) : null,
            longitude: current.longitude != null ? Number(current.longitude) : null,
          }
        : null,
    },
    household: h
      ? {
          householdNo: h.householdNo ?? null,
          memberCount: h.memberCount ?? (Array.isArray(h.members) ? h.members.length : 0),
          dependentCount: h.dependentCount ?? 0,
          housingType: h.housingType ?? null,
          housingCondition: h.housingCondition ?? ip?.housingCondition ?? null,
          housingNotes: h.housingNotes ?? null,
          landTitleType: h.landTitleType ?? null,
          landTitleNotes: h.landTitleNotes ?? null,
          livingScore: h.livingScore ?? 0,
          members: (Array.isArray(h.members) ? h.members : []).map((m: any) => ({
            fullName: m.fullName ?? '',
            relationship: m.relationship ?? '',
            dateOfBirth:
              m.dateOfBirth instanceof Date
                ? m.dateOfBirth.toISOString().slice(0, 10)
                : m.dateOfBirth ?? null,
            ageYears: m.ageYears ?? null,
            occupation: m.occupation ?? null,
            isDependent: Boolean(m.isDependent),
            monthlyIncome: decToNum(m.monthlyIncome),
            healthStatus: m.healthStatus ?? null,
            healthNotes: m.healthNotes ?? null,
            educationStatus: m.educationStatus ?? null,
            notes: m.notes ?? null,
          })),
        }
      : null,
    financial: {
      personalIncome,
      householdIncome,
      regularExpense,
      householdExpense,
      debtBurden,
      debtAmount,
      debtPurpose: h?.debtPurpose ?? null,
      netMonthlyBalance: householdIncome - householdExpense,
      incomeBreakdown: (parseJsonSafe(h?.incomeBreakdown) ?? h?.incomeBreakdown ?? null) as any,
      expenseBreakdown: (parseJsonSafe(h?.expenseBreakdown) ?? h?.expenseBreakdown ?? null) as any,
    },
    currentCondition: {
      familySituationSummary: h?.familySituationSummary ?? null,
      urgentNeeds: h?.urgentNeeds ?? null,
      dependentBurdens: h?.dependentBurdens ?? null,
      livingConstraints: ip?.livingConstraints ?? null,
      assistanceNeeds: ip?.assistanceNeeds ?? null,
      otherAgencyAssistance: ip?.otherAgencyAssistance ?? null,
      priorAssistanceHistory: ip?.priorAssistanceHistory ?? h?.pastAssistance ?? null,
      officerNote: ip?.officerNote ?? h?.additionalNotes ?? row.registrationNote ?? null,
    },
    references: {
      coordinator: (parseJsonSafe(h?.coordinatorInfo) ?? h?.coordinatorInfo ?? null) as any,
      certifier: (parseJsonSafe(h?.certifierInfo) ?? h?.certifierInfo ?? null) as any,
    },
  };
}
