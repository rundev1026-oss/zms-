import type { AuthUser } from '../common/auth-user';
import { UpsertIncomeProfileDto } from './income.dto';
import { IncomeService } from './income.service';
export declare class IncomeController {
    private readonly income;
    constructor(income: IncomeService);
    get(beneficiaryId: string, user: AuthUser): Promise<{
        id: string;
        personalIncome: string | null;
        regularExpense: string | null;
        debtBurden: string | null;
        housingCondition: string | null;
        livingConstraints: string | null;
        assistanceNeeds: string | null;
        otherAgencyAssistance: string | null;
        priorAssistanceHistory: string | null;
        officerNote: string | null;
    } | null>;
    replace(beneficiaryId: string, dto: UpsertIncomeProfileDto, user: AuthUser): Promise<{
        id: string;
        personalIncome: string | null;
        regularExpense: string | null;
        debtBurden: string | null;
        housingCondition: string | null;
        livingConstraints: string | null;
        assistanceNeeds: string | null;
        otherAgencyAssistance: string | null;
        priorAssistanceHistory: string | null;
        officerNote: string | null;
    }>;
}
