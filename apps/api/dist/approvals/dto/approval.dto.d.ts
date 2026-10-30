export declare class ApproveApplicationDto {
    approvedAmount: number;
    fundId: string;
    specificFundId?: string;
    notes?: string;
}
export declare class RejectApplicationDto {
    reason: string;
    notes?: string;
}
export declare class ReturnApplicationDto {
    notes: string;
    targetStatus?: string;
}
export declare class QueryPendingApprovalsDto {
    search?: string;
    asnafCategory?: string;
    urgencyLevel?: string;
    branchId?: string;
    page?: number;
    limit?: number;
}
