import type { Prisma, RegistryStatus } from '@prisma/client';
import type { RegistryStatusCode } from '@zms/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { type BeneficiaryView } from './beneficiary.presenter';
export interface BeneficiaryWriteInput {
    title?: string | null;
    firstName?: string;
    lastName?: string;
    identityType?: 'THAI_NATIONAL_ID' | 'OTHER';
    identityNumber?: string | null;
    dateOfBirth?: string | null;
    phone?: string | null;
    occupation?: string | null;
    maritalStatus?: string | null;
    registrationNote?: string | null;
}
export interface BeneficiaryListQuery {
    page: number;
    pageSize: number;
    q?: string;
    status?: RegistryStatus;
    asnafCategoryId?: string;
    province?: string;
    sort?: string;
}
export declare class BeneficiariesService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    create(input: BeneficiaryWriteInput, actor: AuthUser): Promise<BeneficiaryView>;
    list(query: BeneficiaryListQuery, actor: AuthUser): Promise<{
        items: BeneficiaryView[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    summary(query: Pick<BeneficiaryListQuery, 'q' | 'asnafCategoryId' | 'province'>): Promise<{
        total: number;
        counts: Record<RegistryStatusCode, number>;
    }>;
    getById(id: string, actor: AuthUser): Promise<BeneficiaryView>;
    update(id: string, input: BeneficiaryWriteInput, actor: AuthUser): Promise<BeneficiaryView>;
    addConsent(id: string, input: {
        consentTextVersion: string;
        privacyNoticeVersion: string;
        accepted: boolean;
        channel?: string;
    }, actor: AuthUser): Promise<{
        id: string;
        accepted: boolean;
        recordedAt: string;
    }>;
    latestConsent(id: string, actor: AuthUser): Promise<{
        id: string;
        accepted: boolean;
        consentTextVersion: string;
        privacyNoticeVersion: string;
        recordedAt: string;
    } | null>;
    requireRecord(id: string): Promise<{
        addresses: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            province: string | null;
            createdById: string | null;
            updatedById: string | null;
            beneficiaryId: string;
            addressType: import(".prisma/client").$Enums.AddressType;
            addressLine: string | null;
            community: string | null;
            subdistrict: string | null;
            district: string | null;
            postalCode: string | null;
            latitude: Prisma.Decimal | null;
            longitude: Prisma.Decimal | null;
        }[];
        assessments: ({
            category: {
                code: string;
                id: string;
                createdAt: Date;
                isActive: boolean;
                updatedAt: Date;
                nameTh: string;
                sortOrder: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            decision: import(".prisma/client").$Enums.AsnafDecision;
            assessedAt: Date;
            beneficiaryId: string;
            rationale: string;
            supportingInfo: string | null;
            recordedById: string | null;
            reviewedById: string | null;
            reviewerNote: string | null;
        })[];
    } & {
        title: string | null;
        id: string;
        legacyId: string | null;
        createdAt: Date;
        phone: string | null;
        updatedAt: Date;
        registryNumber: string;
        lastName: string;
        status: import(".prisma/client").$Enums.RegistryStatus;
        firstName: string;
        identityNumber: string | null;
        dateOfBirth: Date | null;
        identityType: import(".prisma/client").$Enums.IdentityType;
        identityNumberNormalized: string | null;
        occupation: string | null;
        maritalStatus: string | null;
        registrationNote: string | null;
        deletedAt: Date | null;
        createdById: string | null;
        updatedById: string | null;
    }>;
    assertEditable(status: RegistryStatus): void;
    private viewOptions;
}
export type BeneficiaryTransaction = Prisma.TransactionClient;
