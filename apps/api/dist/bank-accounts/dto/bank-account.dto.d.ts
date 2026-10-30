export declare class ReconcileBankAccountDto {
    statementBalance: number;
    reconciliationDate?: string;
    notes?: string;
    proofUrl?: string;
}
export declare class QueryReconciliationsDto {
    bankAccountId?: string;
    status?: string;
    page?: number;
    limit?: number;
}
