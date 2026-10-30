import type { Prisma, RegistryStatus } from '@prisma/client';
import { REGISTRY_STATUSES, type RegistryStatusCode } from '@zms/shared';

const SORT_FIELDS = ['createdAt', 'registryNumber', 'lastName', 'status'] as const;
type SortField = (typeof SORT_FIELDS)[number];

export interface BeneficiaryFilters {
  q?: string;
  status?: RegistryStatus;
  asnafCategoryId?: string;
  province?: string;
  sort?: string;
}

export function buildBeneficiaryWhere(filters: BeneficiaryFilters): Prisma.BeneficiaryWhereInput {
  const where: Prisma.BeneficiaryWhereInput = { deletedAt: null };
  if (filters.status !== undefined) {
    where.status = filters.status;
  }
  if (filters.province !== undefined && filters.province.length > 0) {
    where.addresses = { some: { province: filters.province } };
  }
  if (filters.asnafCategoryId !== undefined) {
    where.assessments = {
      some: { categoryId: filters.asnafCategoryId, decision: 'CONFIRMED' },
    };
  }
  if (filters.q !== undefined && filters.q.trim().length > 0) {
    const q = filters.q.trim();
    const or: Prisma.BeneficiaryWhereInput[] = [
      { registryNumber: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { addresses: { some: { community: { contains: q, mode: 'insensitive' } } } },
    ];
    if (/^\d{13}$/.test(q)) {
      or.push({ identityNumberNormalized: q });
    }
    where.OR = or;
  }
  return where;
}

export function summaryFilters(filters: BeneficiaryFilters): BeneficiaryFilters {
  return {
    q: filters.q,
    asnafCategoryId: filters.asnafCategoryId,
    province: filters.province,
  };
}

export function toStatusSummary(
  groups: ReadonlyArray<{ status: RegistryStatusCode; count: number }>,
): { total: number; counts: Record<RegistryStatusCode, number> } {
  const counts = Object.fromEntries(REGISTRY_STATUSES.map((status) => [status, 0])) as Record<
    RegistryStatusCode,
    number
  >;
  for (const group of groups) {
    if (REGISTRY_STATUSES.includes(group.status)) {
      counts[group.status] = group.count;
    }
  }
  const total = REGISTRY_STATUSES.reduce((sum, status) => sum + counts[status], 0);
  return { total, counts };
}

export function buildBeneficiaryOrder(
  sort: string | undefined,
): Prisma.BeneficiaryOrderByWithRelationInput {
  const [rawField, rawDirection] = (sort ?? 'createdAt:desc').split(':');
  const field = SORT_FIELDS.find((item) => item === rawField) ?? 'createdAt';
  const direction = rawDirection === 'asc' ? 'asc' : 'desc';
  return { [field]: direction } as Record<SortField, 'asc' | 'desc'>;
}
