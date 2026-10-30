import { AuditService } from '../audit/audit.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import type { ProposeAsnafDto } from './proposal.dto';
export declare class AsnafService {
    private readonly prisma;
    private readonly beneficiaries;
    private readonly audit;
    constructor(prisma: PrismaService, beneficiaries: BeneficiariesService, audit: AuditService);
    listActive(): import(".prisma/client").Prisma.PrismaPromise<{
        code: string;
        id: string;
        nameTh: string;
        sortOrder: number;
    }[]>;
    latestProposal(beneficiaryId: string, actor: AuthUser): Promise<{
        id: string;
        categoryId: string;
        categoryCode: string;
        categoryNameTh: string;
        rationale: string;
        supportingInfo: string | null;
        decision: "PROPOSED";
        assessedAt: string;
    } | null>;
    propose(beneficiaryId: string, input: ProposeAsnafDto, actor: AuthUser): Promise<{
        id: string;
        categoryId: string;
        categoryCode: string;
        categoryNameTh: string;
        rationale: string;
        supportingInfo: string | null;
        decision: "PROPOSED";
        assessedAt: string;
    }>;
    private toProposal;
}
