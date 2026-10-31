import type { Prisma, RegistryStatus } from '@prisma/client';
import { type RegistryStatusCode } from '@zms/shared';
export interface BeneficiaryFilters {
    q?: string;
    status?: RegistryStatus;
    asnafCategoryId?: string;
    province?: string;
    sort?: string;
}
export declare function buildBeneficiaryWhere(filters: BeneficiaryFilters): Prisma.BeneficiaryWhereInput;
export interface DeletedBeneficiaryFilters {
    q?: string;
    dateFrom?: string;
    dateTo?: string;
}
export declare function buildDeletedBeneficiaryWhere(filters: DeletedBeneficiaryFilters): Prisma.BeneficiaryWhereInput;
export declare function summaryFilters(filters: BeneficiaryFilters): BeneficiaryFilters;
export declare function toStatusSummary(groups: ReadonlyArray<{
    status: RegistryStatusCode;
    count: number;
}>): {
    total: number;
    counts: Record<RegistryStatusCode, number>;
};
export declare function buildBeneficiaryOrder(sort: string | undefined): Prisma.BeneficiaryOrderByWithRelationInput;
