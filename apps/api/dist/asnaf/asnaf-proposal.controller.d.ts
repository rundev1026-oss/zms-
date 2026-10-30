import type { AuthUser } from '../common/auth-user';
import { AsnafService } from './asnaf.service';
import { ProposeAsnafDto } from './proposal.dto';
export declare class AsnafProposalController {
    private readonly asnaf;
    constructor(asnaf: AsnafService);
    latest(beneficiaryId: string, user: AuthUser): Promise<{
        id: string;
        categoryId: string;
        categoryCode: string;
        categoryNameTh: string;
        rationale: string;
        supportingInfo: string | null;
        decision: "PROPOSED";
        assessedAt: string;
    } | null>;
    propose(beneficiaryId: string, dto: ProposeAsnafDto, user: AuthUser): Promise<{
        id: string;
        categoryId: string;
        categoryCode: string;
        categoryNameTh: string;
        rationale: string;
        supportingInfo: string | null;
        decision: "PROPOSED";
        assessedAt: string;
    }>;
}
