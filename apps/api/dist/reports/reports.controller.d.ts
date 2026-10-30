import { StreamableFile } from '@nestjs/common';
import type { AuthUser } from '../common/auth-user';
import { ExportBeneficiariesQueryDto } from './export.dto';
import { QueryReportDto } from './dto/reports.dto';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reports;
    constructor(reports: ReportsService);
    exportBeneficiaries(query: ExportBeneficiariesQueryDto, user: AuthUser): Promise<StreamableFile>;
    getAsnafDistribution(query: QueryReportDto): Promise<{
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
    getFinancialSummary(query: QueryReportDto): Promise<{
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
    getMonthlyTrends(query: QueryReportDto): Promise<{
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
    getDemographics(): Promise<{
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
    getExecutiveDashboard(): Promise<{
        totalBeneficiaries: number;
        totalAssistanceDisbursed: number;
        totalApplications: number;
        pendingApprovalsCount: number;
        totalAvailableFunds: number;
        timestamp: string;
    }>;
}
