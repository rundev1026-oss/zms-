import type { AuthUser } from '../common/auth-user';
import { AssessmentDto, ReasonDto } from '../common/request.dto';
import { RegistryWorkflowService } from './registry-workflow.service';
export declare class RegistryWorkflowController {
    private readonly workflow;
    constructor(workflow: RegistryWorkflowService);
    submit(id: string, user: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    requestCorrection(id: string, dto: ReasonDto, user: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    assess(id: string, dto: AssessmentDto, user: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    approve(id: string, dto: ReasonDto, user: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    reject(id: string, dto: ReasonDto, user: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    suspend(id: string, dto: ReasonDto, user: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    archive(id: string, dto: ReasonDto, user: AuthUser): Promise<import("../beneficiaries/beneficiary.presenter").BeneficiaryView>;
    history(id: string): Promise<{
        id: string;
        fromStatus: import(".prisma/client").$Enums.RegistryStatus | null;
        toStatus: import(".prisma/client").$Enums.RegistryStatus;
        reason: string | null;
        actedById: string | null;
        actedAt: string;
    }[]>;
}
