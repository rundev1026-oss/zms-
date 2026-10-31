import type { AuthUser } from '../common/auth-user';
import { AssessmentService } from './assessment.service';
import { SubmitAssessmentDto } from './dto/assessment.dto';
export declare class AssessmentController {
    private readonly assessmentService;
    constructor(assessmentService: AssessmentService);
    submit(applicationId: string, dto: SubmitAssessmentDto, user: AuthUser): Promise<{
        recommendedAmount: number;
        id: string;
        legacyId: string | null;
        createdAt: Date;
        housingCondition: string;
        housingNotes: string;
        livingScore: number;
        applicationId: string;
        officerRecommendation: string;
        debtBurdenSummary: string;
        primaryHardship: string;
        recommendedFundId: string;
        recommendedSpecificFundId: string | null;
        generalNotes: string;
        assessedById: string;
        assessedByName: string;
        assessedDate: string;
    }>;
    get(applicationId: string): Promise<{
        recommendedAmount: number;
        id: string;
        legacyId: string | null;
        createdAt: Date;
        housingCondition: string;
        housingNotes: string;
        livingScore: number;
        applicationId: string;
        officerRecommendation: string;
        debtBurdenSummary: string;
        primaryHardship: string;
        recommendedFundId: string;
        recommendedSpecificFundId: string | null;
        generalNotes: string;
        assessedById: string;
        assessedByName: string;
        assessedDate: string;
    }>;
}
