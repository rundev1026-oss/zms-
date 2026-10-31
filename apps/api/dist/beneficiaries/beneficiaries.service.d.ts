import type { Prisma, RegistryStatus } from '@prisma/client';
import { type RegistryStatusCode } from '@zms/shared';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { type BeneficiaryView } from './beneficiary.presenter';
import type { SoftDeleteBeneficiaryDto, RestoreBeneficiaryDto, QueryDeletedBeneficiariesDto } from './dto/soft-delete.dto';
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
    recordSurveyPrint(id: string, actor: AuthUser): Promise<{
        recorded: boolean;
        registryNumber: string;
    }>;
    requireRecord(id: string): Promise<{
        household: ({
            members: {
                id: string;
                legacyId: string | null;
                createdAt: Date;
                updatedAt: Date;
                dateOfBirth: Date | null;
                sortOrder: number;
                occupation: string | null;
                createdById: string | null;
                updatedById: string | null;
                householdId: string;
                fullName: string;
                relationship: string;
                ageYears: number | null;
                isDependent: boolean;
                monthlyIncome: Prisma.Decimal | null;
                healthStatus: string | null;
                healthNotes: string | null;
                educationStatus: string | null;
                notes: string | null;
            }[];
        } & {
            id: string;
            legacyId: string | null;
            createdAt: Date;
            updatedAt: Date;
            province: string | null;
            createdById: string | null;
            updatedById: string | null;
            beneficiaryId: string;
            community: string | null;
            subdistrict: string | null;
            district: string | null;
            latitude: Prisma.Decimal | null;
            longitude: Prisma.Decimal | null;
            householdNo: string | null;
            memberCount: number | null;
            householdIncome: Prisma.Decimal | null;
            householdExpense: Prisma.Decimal | null;
            debtAmount: Prisma.Decimal | null;
            debtPurpose: string | null;
            dependentCount: number | null;
            additionalNotes: string | null;
            address: string | null;
            housingCondition: string | null;
            housingNotes: string | null;
            housingType: string | null;
            landTitleType: string | null;
            landTitleNotes: string | null;
            livingScore: number | null;
            incomeBreakdown: string | null;
            expenseBreakdown: string | null;
            pastAssistance: string | null;
            familySituationSummary: string | null;
            urgentNeeds: string | null;
            dependentBurdens: string | null;
            coordinatorInfo: string | null;
            certifierInfo: string | null;
            residenceAddress: string | null;
            placeName: string | null;
            locationUpdatedAt: string | null;
            locationUpdatedBy: string | null;
            locationVerificationStatus: string | null;
        }) | null;
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
        incomeProfile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            updatedById: string | null;
            beneficiaryId: string;
            housingCondition: string | null;
            personalIncome: Prisma.Decimal | null;
            regularExpense: Prisma.Decimal | null;
            debtBurden: Prisma.Decimal | null;
            livingConstraints: string | null;
            assistanceNeeds: string | null;
            otherAgencyAssistance: string | null;
            priorAssistanceHistory: string | null;
            officerNote: string | null;
        } | null;
        documents: ({
            uploadedBy: {
                email: string;
                displayName: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.DocumentStatus;
            deletedAt: Date | null;
            beneficiaryId: string;
            reviewedById: string | null;
            documentType: string;
            originalFileName: string;
            storageKey: string;
            sizeBytes: number;
            mimeType: string;
            uploadedById: string | null;
            reviewedAt: Date | null;
            reviewNote: string | null;
        })[];
        assessments: ({
            category: {
                code: string;
                id: string;
                createdAt: Date;
                isActive: boolean;
                updatedAt: Date;
                sortOrder: number;
                nameTh: string;
            };
            recordedBy: {
                email: string;
                displayName: string;
            } | null;
            reviewedBy: {
                email: string;
                displayName: string;
            } | null;
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
        createdBy: {
            email: string;
            displayName: string;
        } | null;
        deletedBy: {
            id: string;
            email: string;
            displayName: string;
        } | null;
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
        deletedAt: Date | null;
        firstName: string;
        deletionReference: string | null;
        deletionReason: string | null;
        identityNumber: string | null;
        dateOfBirth: Date | null;
        identityType: import(".prisma/client").$Enums.IdentityType;
        identityNumberNormalized: string | null;
        occupation: string | null;
        maritalStatus: string | null;
        registrationNote: string | null;
        deletedById: string | null;
        deletionStatus: boolean;
        createdById: string | null;
        updatedById: string | null;
    }>;
    assertEditable(status: RegistryStatus): void;
    getDeletePreview(id: string, _actor: AuthUser): Promise<{
        canDelete: boolean;
        blockers: string[];
        summary: {
            id: string;
            registryNumber: string;
            fullName: string;
            identityType: import(".prisma/client").$Enums.IdentityType;
            identityNumberMasked: string | null;
            status: import(".prisma/client").$Enums.RegistryStatus;
            phone: string | null;
            createdAt: string;
            counts: {
                applications: number;
                activeApplications: number;
                completedAid: number;
                disbursements: number;
                followups: number;
                documents: number;
                householdMembers: number;
            };
        };
    }>;
    softDelete(id: string, dto: SoftDeleteBeneficiaryDto, actor: AuthUser, ip?: string): Promise<BeneficiaryView>;
    listDeleted(query: QueryDeletedBeneficiariesDto, actor: AuthUser): Promise<{
        items: {
            counts: {
                documents: number;
                applications: number;
                followUpRecords: number;
                disbursementItems: number;
            };
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
            asnaf: {
                id: string;
                code: string;
                nameTh: string;
                rationale: string;
                assessedAt: string;
                recordedByName: string | null;
                reviewedByName: string | null;
            } | null;
            createdByName: string | null;
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
        }[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    restore(id: string, dto: RestoreBeneficiaryDto, actor: AuthUser, ip?: string): Promise<BeneficiaryView>;
    recordRevision(id: string, input: {
        expectedUpdatedAt: string;
        reason?: string;
        ipAddress?: string;
        changes: {
            field: string;
            fieldLabel: string;
            oldValue?: string;
            newValue?: string;
            material?: boolean;
        }[];
    }, actor: AuthUser): Promise<{
        reReview: boolean;
        status: import(".prisma/client").$Enums.RegistryStatus;
        updatedAt: string;
    }>;
    listRevisions(id: string, _actor: AuthUser): Promise<{
        id: string;
        beneficiaryId: string;
        editedById: string;
        editedByName: string;
        editedByRole: string;
        timestamp: string;
        changesSummary: string | null;
        changesDetail: any[];
        notes: string | null;
        createdAt: string;
    }[]>;
    getAuditHistory(id: string, _actor: AuthUser): Promise<{
        id: string;
        action: string;
        actorId: string | null;
        actorName: string;
        actorEmail: string | null;
        metadata: Prisma.JsonValue;
        createdAt: string;
    }[]>;
    private duplicateIdentityConflict;
    private viewOptions;
}
export type BeneficiaryTransaction = Prisma.TransactionClient;
