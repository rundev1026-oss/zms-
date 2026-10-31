import type { Prisma } from '@prisma/client';
export declare const beneficiaryInclude: {
    addresses: true;
    household: {
        include: {
            members: {
                orderBy: {
                    sortOrder: "asc";
                };
            };
        };
    };
    incomeProfile: true;
    documents: {
        where: {
            deletedAt: null;
        };
        orderBy: {
            createdAt: "desc";
        };
        include: {
            uploadedBy: {
                select: {
                    displayName: true;
                    email: true;
                };
            };
        };
    };
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
            recordedBy: {
                select: {
                    displayName: true;
                    email: true;
                };
            };
            reviewedBy: {
                select: {
                    displayName: true;
                    email: true;
                };
            };
        };
    };
    createdBy: {
        select: {
            displayName: true;
            email: true;
        };
    };
    deletedBy: {
        select: {
            id: true;
            displayName: true;
            email: true;
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
        rationale: string;
        assessedAt: string;
        recordedByName: string | null;
        reviewedByName: string | null;
    } | null;
    createdByName: string | null;
    requestCount: number;
    aidTotal?: string;
    addresses?: any[];
    household?: any;
    incomeProfile?: any;
    documents?: any[];
    deletedAt?: string | null;
    deletedById?: string | null;
    deletedByName?: string | null;
    deletionReason?: string | null;
    deletionReference?: string | null;
    deletionStatus?: boolean;
    createdAt: string;
    updatedAt: string;
}
export declare function presentBeneficiary(row: BeneficiaryRecord, options: {
    revealIdentity: boolean;
    revealAid: boolean;
}): BeneficiaryView;
