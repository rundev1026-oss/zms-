import type { AuthUser } from '../common/auth-user';
import { UpsertHouseholdDto } from '../common/request.dto';
import { HouseholdService } from './household.service';
export declare class HouseholdController {
    private readonly household;
    constructor(household: HouseholdService);
    get(beneficiaryId: string, user: AuthUser): Promise<{
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
    replace(beneficiaryId: string, dto: UpsertHouseholdDto, user: AuthUser): Promise<{
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
}
