import { AuditService } from '../audit/audit.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
export interface HouseholdMemberInput {
    fullName: string;
    relationship: string;
    dateOfBirth?: string;
    ageYears?: number;
    occupation?: string;
    isDependent: boolean;
    sortOrder?: number;
}
export interface HouseholdInput {
    memberCount?: number;
    householdIncome?: string;
    householdExpense?: string;
    debtAmount?: string;
    dependentCount?: number;
    additionalNotes?: string;
    members: HouseholdMemberInput[];
}
export declare class HouseholdService {
    private readonly prisma;
    private readonly beneficiaries;
    private readonly audit;
    constructor(prisma: PrismaService, beneficiaries: BeneficiariesService, audit: AuditService);
    get(beneficiaryId: string, actor: AuthUser): Promise<{
        id: string;
        memberCount: number | null;
        householdIncome: string | null;
        householdExpense: string | null;
        debtAmount: string | null;
        dependentCount: number | null;
        additionalNotes: string | null;
        members: {
            dateOfBirth: string | null;
            id: string;
            fullName: string;
            relationship: string;
            ageYears: number | null;
            occupation: string | null;
            isDependent: boolean;
            sortOrder: number;
        }[];
    } | null>;
    replace(beneficiaryId: string, input: HouseholdInput, actor: AuthUser): Promise<{
        id: string;
        memberCount: number | null;
        householdIncome: string | null;
        householdExpense: string | null;
        debtAmount: string | null;
        dependentCount: number | null;
        additionalNotes: string | null;
        members: {
            dateOfBirth: string | null;
            id: string;
            fullName: string;
            relationship: string;
            ageYears: number | null;
            occupation: string | null;
            isDependent: boolean;
            sortOrder: number;
        }[];
    }>;
    private amounts;
    private money;
    private toView;
}
