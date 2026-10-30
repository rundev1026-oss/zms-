"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let SettingsService = class SettingsService {
    prisma;
    audit;
    defaultSettings = {
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
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async getSettings() {
        const rows = await this.prisma.systemSetting.findMany();
        const result = { ...this.defaultSettings };
        for (const r of rows) {
            if (r.key in result) {
                if (typeof this.defaultSettings[r.key] === 'number') {
                    result[r.key] = Number(r.value);
                }
                else {
                    result[r.key] = r.value;
                }
            }
        }
        return result;
    }
    async updateSettings(dto, user) {
        const keys = Object.keys(dto);
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
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map