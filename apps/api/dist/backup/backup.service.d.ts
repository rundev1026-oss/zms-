import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { CreateBackupDto } from './dto/backup.dto';
export declare class BackupService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    createBackup(dto: CreateBackupDto, user: AuthUser): Promise<{
        id: string;
        fileName: string;
        backupType: string;
        totalTables: number;
        totalRecords: number;
        status: string;
        verificationSum: number;
        tableCounts: {
            users: number;
            beneficiaries: number;
            households: number;
            assistanceApplications: number;
            fundAccounts: number;
            financialTransactions: number;
            auditLogs: number;
            bankReconciliations: number;
            zakatFormulaVersions: number;
        };
        triggeredByName: string | null;
        createdAt: string;
        message: string;
    }>;
    getBackupHistory(): Promise<{
        fileSizeBytes: number;
        verificationSum: number;
        createdAt: string;
        id: string;
        status: string;
        notes: string | null;
        backupType: string;
        fileName: string;
        totalTables: number;
        totalRecords: number;
        triggeredById: string | null;
        triggeredByName: string | null;
    }[]>;
    verifyDatabaseIntegrity(): Promise<{
        status: string;
        integrityVerified: boolean;
        timestamp: string;
        checks: {
            orphanedApplications: {
                passed: boolean;
                count: number;
                severity: string;
            };
            orphanedHouseholdMembers: {
                passed: boolean;
                count: number;
                severity: string;
            };
            financialConsistency: {
                passed: boolean;
                totalFundDisbursed: number;
                totalTxnsDisbursed: number;
            };
        };
        message: string;
    }>;
}
