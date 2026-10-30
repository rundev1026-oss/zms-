import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { UpdateSettingsDto } from './dto/settings.dto';
export interface SystemSettingsData {
    organizationNameTh: string;
    organizationNameEn: string;
    taxId: string;
    address: string;
    phone: string;
    email: string;
    activeFiscalYear: string;
    currency: string;
    approvalLimitTier1: number;
    approvalLimitTier2: number;
    approvalLimitTier3: number;
    updatedAt: string;
}
export declare class SettingsService {
    private readonly prisma;
    private readonly audit;
    private readonly defaultSettings;
    constructor(prisma: PrismaService, audit: AuditService);
    getSettings(): Promise<SystemSettingsData>;
    updateSettings(dto: UpdateSettingsDto, user: AuthUser): Promise<SystemSettingsData>;
}
