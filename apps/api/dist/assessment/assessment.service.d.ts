import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { SubmitAssessmentDto } from './dto/assessment.dto';
export declare class AssessmentService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    submitAssessment(applicationId: string, dto: SubmitAssessmentDto, user: AuthUser): Promise<{
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
    getAssessment(applicationId: string): Promise<{
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
