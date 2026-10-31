import { IdentityType } from '@prisma/client';
export declare class CreateBeneficiaryDto {
    title?: string;
    firstName: string;
    lastName: string;
    identityType: IdentityType;
    identityNumber?: string;
    dateOfBirth?: string;
    phone?: string;
    occupation?: string;
    maritalStatus?: string;
    registrationNote?: string;
}
export declare class BeneficiaryListQueryDto {
    page: number;
    pageSize: number;
    q?: string;
    status?: string;
    asnafCategoryId?: string;
    province?: string;
    sort?: string;
}
export declare class BeneficiarySummaryQueryDto {
    q?: string;
    asnafCategoryId?: string;
    province?: string;
}
export declare class CreateConsentDto {
    consentTextVersion: string;
    privacyNoticeVersion: string;
    accepted: boolean;
    channel?: string;
}
declare const UpdateBeneficiaryDto_base: import("@nestjs/common").Type<Partial<CreateBeneficiaryDto>>;
export declare class UpdateBeneficiaryDto extends UpdateBeneficiaryDto_base {
}
export declare class RegistryFieldChangeDto {
    field: string;
    fieldLabel: string;
    oldValue?: string;
    newValue?: string;
    material?: boolean;
}
export declare class RecordRevisionDto {
    expectedUpdatedAt: string;
    reason?: string;
    ipAddress?: string;
    changes: RegistryFieldChangeDto[];
}
export {};
