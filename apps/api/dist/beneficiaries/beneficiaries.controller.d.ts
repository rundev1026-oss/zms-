import type { Request } from 'express';
import type { AuthUser } from '../common/auth-user';
import { BeneficiariesService } from './beneficiaries.service';
import { BeneficiaryListQueryDto, CreateBeneficiaryDto, CreateConsentDto, RecordRevisionDto, UpdateBeneficiaryDto, BeneficiarySummaryQueryDto } from './beneficiary.dto';
import { SoftDeleteBeneficiaryDto, RestoreBeneficiaryDto, QueryDeletedBeneficiariesDto } from './dto/soft-delete.dto';
export declare class BeneficiariesController {
    private readonly beneficiaries;
    constructor(beneficiaries: BeneficiariesService);
    create(dto: CreateBeneficiaryDto, user: AuthUser): Promise<import("./beneficiary.presenter").BeneficiaryView>;
    list(query: BeneficiaryListQueryDto, user: AuthUser): Promise<{
        items: import("./beneficiary.presenter").BeneficiaryView[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    summary(query: BeneficiarySummaryQueryDto): Promise<{
        total: number;
        counts: Record<import("@zms/shared").RegistryStatusCode, number>;
    }>;
    listDeleted(query: QueryDeletedBeneficiariesDto, user: AuthUser): Promise<{
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
    getDeletePreview(id: string, user: AuthUser): Promise<{
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
    softDelete(id: string, dto: SoftDeleteBeneficiaryDto, user: AuthUser, req: Request): Promise<import("./beneficiary.presenter").BeneficiaryView>;
    restore(id: string, dto: RestoreBeneficiaryDto, user: AuthUser, req: Request): Promise<import("./beneficiary.presenter").BeneficiaryView>;
    listRevisions(id: string, user: AuthUser): Promise<{
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
    recordRevision(id: string, dto: RecordRevisionDto, user: AuthUser, req: Request): Promise<{
        reReview: boolean;
        status: import(".prisma/client").$Enums.RegistryStatus;
        updatedAt: string;
    }>;
    getAuditHistory(id: string, user: AuthUser): Promise<{
        id: string;
        action: string;
        actorId: string | null;
        actorName: string;
        actorEmail: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        createdAt: string;
    }[]>;
    recordSurveyPrint(id: string, user: AuthUser): Promise<{
        recorded: boolean;
        registryNumber: string;
    }>;
    get(id: string, user: AuthUser): Promise<import("./beneficiary.presenter").BeneficiaryView>;
    update(id: string, dto: UpdateBeneficiaryDto, user: AuthUser): Promise<import("./beneficiary.presenter").BeneficiaryView>;
    latestConsent(id: string, user: AuthUser): Promise<{
        id: string;
        accepted: boolean;
        consentTextVersion: string;
        privacyNoticeVersion: string;
        recordedAt: string;
    } | null>;
    consent(id: string, dto: CreateConsentDto, user: AuthUser): Promise<{
        id: string;
        accepted: boolean;
        recordedAt: string;
    }>;
}
