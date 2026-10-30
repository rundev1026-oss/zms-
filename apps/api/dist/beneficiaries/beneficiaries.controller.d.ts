import type { AuthUser } from '../common/auth-user';
import { BeneficiariesService } from './beneficiaries.service';
import { BeneficiaryListQueryDto, CreateBeneficiaryDto, CreateConsentDto, UpdateBeneficiaryDto, BeneficiarySummaryQueryDto } from './beneficiary.dto';
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
