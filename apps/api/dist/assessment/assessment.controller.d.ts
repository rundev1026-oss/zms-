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
        livingScore: number;
        housingCondition: string;
        housingNotes: string;
        debtBurdenSummary: string;
        primaryHardship: string;
        officerRecommendation: string;
        recommendedFundId: string;
        recommendedSpecificFundId: string | null;
        generalNotes: string;
        applicationId: string;
        assessedById: string;
        assessedByName: string;
        assessedDate: string;
    }>;
    get(applicationId: string): Promise<{
        recommendedAmount: number;
        id: string;
        legacyId: string | null;
        createdAt: Date;
        livingScore: number;
        housingCondition: string;
        housingNotes: string;
        debtBurdenSummary: string;
        primaryHardship: string;
        officerRecommendation: string;
        recommendedFundId: string;
        recommendedSpecificFundId: string | null;
        generalNotes: string;
        applicationId: string;
        assessedById: string;
        assessedByName: string;
        assessedDate: string;
    }>;
}
