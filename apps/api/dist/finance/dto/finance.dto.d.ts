export declare class DisburseAssistanceDto {
    applicationId: string;
    amount?: number;
    paymentRef: string;
    bankAccountId?: string;
    paymentMethod?: string;
    proofUrl?: string;
    notes?: string;
    installmentNo?: number;
}
export declare class CreateTransactionDto {
    type: string;
    fundId: string;
    amount: number;
    paymentMethod: string;
    payerOrPayee: string;
    referenceNo: string;
    category?: string;
    slipUrl?: string;
    notes?: string;
    applicationId?: string;
    beneficiaryId?: string;
    specificFundId?: string;
    asnafCategory?: string;
    bankAccountId?: string;
}
export declare class QueryTransactionsDto {
    search?: string;
    fundId?: string;
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
}
