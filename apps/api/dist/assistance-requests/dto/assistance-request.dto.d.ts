export declare class CreateAssistanceRequestDto {
    beneficiaryId: string;
    asnafCategory: string;
    requestedAmount: number;
    urgencyLevel?: string;
    assistanceTypeId?: string;
    assistanceGroup?: string;
    hardshipReasons?: string;
    necessityDetails?: string;
    specificFundId?: string;
    specificFundCode?: string;
    specificFundName?: string;
    branchId?: string;
    branchName?: string;
}
export declare class QueryAssistanceRequestsDto {
    search?: string;
    status?: string;
    asnafCategory?: string;
    branchId?: string;
    beneficiaryId?: string;
    page?: number;
    limit?: number;
}
export declare class UpdateRequestStatusDto {
    status: string;
    notes?: string;
}
export declare class CheckBeneficiaryDto {
    nationalId?: string;
    registrationNo?: string;
    beneficiaryId?: string;
}
export declare class AddApplicationDocumentDto {
    name: string;
    category: string;
    fileUrl: string;
    mimeType?: string;
    fileSize?: number;
    isConfidential?: boolean;
}
