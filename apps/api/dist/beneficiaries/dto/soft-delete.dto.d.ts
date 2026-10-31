export declare class SoftDeleteBeneficiaryDto {
    reason: string;
    reference?: string;
    passwordConfirm?: string;
}
export declare class RestoreBeneficiaryDto {
    reason: string;
    reference?: string;
}
export declare class QueryDeletedBeneficiariesDto {
    page?: number;
    pageSize?: number;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
}
