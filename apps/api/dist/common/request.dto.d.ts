import { AddressType, AsnafDecision } from '@prisma/client';
export declare class ReasonDto {
    reason: string;
}
export declare class AssessmentDto {
    categoryId: string;
    rationale: string;
    supportingInfo?: string;
    decision?: AsnafDecision;
    reviewerNote?: string;
}
export declare class HouseholdMemberDto {
    fullName: string;
    relationship: string;
    dateOfBirth?: string;
    ageYears?: number;
    occupation?: string;
    isDependent: boolean;
    sortOrder?: number;
}
export declare class UpsertHouseholdDto {
    memberCount?: number;
    householdIncome?: string;
    householdExpense?: string;
    debtAmount?: string;
    dependentCount?: number;
    additionalNotes?: string;
    members: HouseholdMemberDto[];
}
export declare class AddressItemDto {
    addressType: AddressType;
    addressLine?: string;
    community?: string;
    subdistrict?: string;
    district?: string;
    province?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
}
export declare class ReplaceAddressesDto {
    addresses: AddressItemDto[];
}
export declare class ReviewDocumentDto {
    status: 'ACCEPTED' | 'REJECTED';
    reviewNote?: string;
}
export declare class PageQueryDto {
    page: number;
    pageSize: number;
    resourceType?: string;
    resourceId?: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class UploadDocumentDto {
    documentType: string;
}
export declare class Enable2faDto {
    code: string;
    secret: string;
    recoveryCodes: string[];
}
export declare class Disable2faDto {
    password: string;
    code: string;
}
export declare class Verify2faDto {
    tempToken: string;
    code: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    newPassword: string;
}
