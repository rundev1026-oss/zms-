import type { AsnafDecision } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
export interface AssessmentInput {
    categoryId: string;
    rationale: string;
    supportingInfo?: string;
    decision?: AsnafDecision;
    reviewerNote?: string;
}
export declare class RegistryWorkflowService {
    private readonly prisma;
    private readonly beneficiaries;
    private readonly audit;
    private readonly lock;
    constructor(prisma: PrismaService, beneficiaries: BeneficiariesService, audit: AuditService);
    submit(id: string, actor: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    requestCorrection(id: string, reason: string, actor: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    assess(id: string, input: AssessmentInput, actor: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    approve(id: string, reason: string, actor: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    reject(id: string, reason: string, actor: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    suspend(id: string, reason: string, actor: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    archive(id: string, reason: string, actor: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    history(id: string): Promise<{
        id: string;
        fromStatus: import(".prisma/client").$Enums.RegistryStatus | null;
        toStatus: import(".prisma/client").$Enums.RegistryStatus;
        reason: string | null;
        actedById: string | null;
        actedAt: string;
    }[]>;
    private plan;
    private load;
    private changeStatus;
    private assertPermission;
    private options;
}
