import { AuditService } from '../audit/audit.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertIncomeProfileDto } from './income.dto';
export declare class IncomeService {
    private readonly prisma;
    private readonly beneficiaries;
    private readonly audit;
    constructor(prisma: PrismaService, beneficiaries: BeneficiariesService, audit: AuditService);
    get(beneficiaryId: string, actor: AuthUser): Promise<{
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
    replace(beneficiaryId: string, input: UpsertIncomeProfileDto, actor: AuthUser): Promise<{
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
    private fields;
    private money;
    private toView;
}
