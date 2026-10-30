import type { Prisma } from '@prisma/client';
export declare const beneficiaryInclude: {
    addresses: true;
    assessments: {
        where: {
            decision: "CONFIRMED";
        };
        orderBy: {
            assessedAt: "desc";
        };
        take: number;
        include: {
            category: true;
        };
    };
};
export type BeneficiaryRecord = Prisma.BeneficiaryGetPayload<{
    include: typeof beneficiaryInclude;
}>;
export interface BeneficiaryView {
    id: string;
    registryNumber: string;
    status: string;
    title: string | null;
    firstName: string;
    lastName: string;
    identityType: string;
    identityNumber: string | null;
    dateOfBirth: string | null;
    ageYears: number | null;
    phone: string | null;
    occupation: string | null;
    maritalStatus: string | null;
    registrationNote: string | null;
    province: string | null;
    community: string | null;
    asnaf: {
        id: string;
        code: string;
        nameTh: string;
    } | null;
    requestCount: number;
    aidTotal?: string;
    createdAt: string;
    updatedAt: string;
}
export declare function presentBeneficiary(row: BeneficiaryRecord, options: {
    revealIdentity: boolean;
    revealAid: boolean;
}): BeneficiaryView;
