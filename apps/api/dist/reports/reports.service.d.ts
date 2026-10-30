import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import type { ExportBeneficiariesQueryDto } from './export.dto';
export declare class ReportsService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    exportBeneficiaries(query: ExportBeneficiariesQueryDto, actor: AuthUser): Promise<{
        fileName: string;
        bytes: Buffer<ArrayBufferLike>;
    }>;
    getAsnafDistributionReport(query?: {
        fiscalYear?: string;
    }): Promise<{
        fiscalYear: string;
        grandTotalDisbursed: number;
        grandTotalApplications: number;
        items: {
            asnafCode: string;
            asnafNameTh: string;
            applicationCount: number;
            totalDisbursedAmount: number;
            totalApprovedAmount: number;
            percentage: number;
        }[];
    }>;
    getFinancialSummaryReport(query?: {
        fiscalYear?: string;
    }): Promise<{
        fiscalYear: string;
        totalReceived: number;
        totalCommitted: number;
        totalDisbursed: number;
        totalAvailable: number;
        totalBankBalance: number;
        totalRecordedDisbursements: number;
        funds: {
            id: string;
            code: string;
            name: string;
            totalReceived: number;
            committedAmount: number;
            disbursedAmount: number;
            availableAmount: number;
        }[];
        subFunds: {
            id: string;
            code: string;
            name: string;
            allocatedAmount: number;
            committedAmount: number;
            disbursedAmount: number;
            availableAmount: number;
        }[];
        bankAccounts: {
            id: string;
            bankName: string;
            accountName: string;
            accountNumber: string;
            currentBalance: number;
            reconciledBalance: number;
            status: string;
        }[];
    }>;
    getMonthlyTrendsReport(query?: {
        fiscalYear?: string;
    }): Promise<{
        fiscalYear: string;
        monthlyData: {
            totalDisbursedAmount: number;
            monthIndex: number;
            monthName: string;
            applicationsCount: number;
            approvedCount: number;
            disbursedCount: number;
        }[];
    }>;
    getDemographicsReport(): Promise<{
        totalBeneficiaries: number;
        byProvince: {
            province: string;
            count: number;
        }[];
        byStatus: {
            status: string;
            count: number;
        }[];
        byAgeGroup: {
            under18: number;
            age18To35: number;
            age36To60: number;
            over60: number;
            unknown: number;
        };
    }>;
    getExecutiveKpiDashboard(): Promise<{
        totalBeneficiaries: number;
        totalAssistanceDisbursed: number;
        totalApplications: number;
        pendingApprovalsCount: number;
        totalAvailableFunds: number;
        timestamp: string;
    }>;
}
