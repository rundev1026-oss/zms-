import { Injectable } from '@nestjs/common';
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

@Injectable()
export class SettingsService {
  private readonly defaultSettings: SystemSettingsData = {
    organizationNameTh: 'มูลนิธิซะกาตและสาธารณกุศล',
    organizationNameEn: 'Zakat and Charity Foundation',
    taxId: '0994000123456',
    address: '123 ถนนเพชรบุรี แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพมหานคร 10400',
    phone: '02-123-4567',
    email: 'contact@zms.local',
    activeFiscalYear: '2569',
    currency: 'THB',
    approvalLimitTier1: 10000,
    approvalLimitTier2: 50000,
    approvalLimitTier3: 200000,
    updatedAt: new Date().toISOString(),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Get all active system and organizational settings
   */
  async getSettings(): Promise<SystemSettingsData> {
    const rows = await this.prisma.systemSetting.findMany();
    const result = { ...this.defaultSettings };

    for (const r of rows) {
      if (r.key in result) {
        if (typeof (this.defaultSettings as any)[r.key] === 'number') {
          (result as any)[r.key] = Number(r.value);
        } else {
          (result as any)[r.key] = r.value;
        }
      }
    }

    return result;
  }

  /**
   * Update organizational parameters (Restricted to Super Admin)
   */
  async updateSettings(dto: UpdateSettingsDto, user: AuthUser): Promise<SystemSettingsData> {
    const keys = Object.keys(dto) as (keyof UpdateSettingsDto)[];

    for (const k of keys) {
      const val = dto[k];
      if (val !== undefined && val !== null) {
        await this.prisma.systemSetting.upsert({
          where: { key: k },
          update: {
            value: String(val),
            updatedBy: user.displayName,
          },
          create: {
            key: k,
            value: String(val),
            category: 'organization',
            updatedBy: user.displayName,
          },
        });
      }
    }

    await this.audit.write({
      actorId: user.id,
      action: 'SYSTEM_SETTINGS_UPDATE',
      resourceType: 'system_setting',
      resourceId: null,
      metadata: {
        updatedFields: keys.join(','),
        updatedBy: user.displayName,
      },
    });

    return this.getSettings();
  }
}

