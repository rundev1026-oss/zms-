export declare class RecordExecutionDto {
    applicationId: string;
    assistanceType: string;
    actualDisbursedAmount: number;
    actualAssistanceValue?: number;
    assistanceOutcome: string;
    details?: string;
    proofUrl?: string;
    installmentNo?: number;
    totalInstallments?: number;
}
export declare class ConfirmExecutionDto {
    confirmationStatement?: string;
    proofUrl?: string;
}
