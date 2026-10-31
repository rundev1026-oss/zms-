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
  },
  assessments: {
    where: { decision: 'CONFIRMED' as const },
    orderBy: { assessedAt: 'desc' as const },
    take: 1,
    include: { category: true },
  },
  deletedBy: {
    select: { id: true, displayName: true, email: true },
  },
} satisfies Prisma.BeneficiaryInclude;

export type BeneficiaryRecord = Prisma.BeneficiaryGetPayload<{
  include: typeof beneficiaryInclude;
}>;

export interface BeneficiaryView {
  id: string;
  registryNumber: string;
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
  asnaf: { id: string; code: string; nameTh: string } | null;
  requestCount: number;
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
  const current = row.addresses.find((address) => address.addressType === 'CURRENT');
  const registered = row.addresses.find((address) => address.addressType === 'REGISTERED');
  const place = current ?? registered ?? null;
  const confirmed = row.assessments[0];
  const dateOfBirth = row.dateOfBirth === null ? null : row.dateOfBirth.toISOString().slice(0, 10);
  const view: BeneficiaryView = {
    id: row.id,
    registryNumber: row.registryNumber,
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
          },
    requestCount: 0,
    addresses: row.addresses,
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
      fileUrl: `/api/documents/${d.id}/download`,
    })),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    deletedById: row.deletedById ?? null,
    deletedByName: row.deletedBy ? (row.deletedBy.displayName || row.deletedBy.email) : null,
    deletionReason: row.deletionReason ?? null,
    deletionReference: row.deletionReference ?? null,
    deletionStatus: row.deletionStatus ?? false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (options.revealAid) {
    view.aidTotal = '0.00';
  }
  return view;
}
