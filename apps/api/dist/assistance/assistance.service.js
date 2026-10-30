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
exports.AssistanceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app.exception");
let AssistanceService = class AssistanceService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async recordExecution(dto, user) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.applicationId);
        const app = await this.prisma.assistanceApplication.findFirst({
            where: isUuid
                ? { id: dto.applicationId }
                : { OR: [{ applicationNo: dto.applicationId }, { legacyId: dto.applicationId }] },
        });
        if (!app) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องขอความช่วยเหลือรหัส ${dto.applicationId}`);
        }
        const nowIso = new Date().toISOString();
        const executionDateStr = new Date().toLocaleDateString('th-TH');
        const disbursedDecimal = new client_1.Prisma.Decimal(dto.actualDisbursedAmount);
        const valueDecimal = new client_1.Prisma.Decimal(dto.actualAssistanceValue || dto.actualDisbursedAmount);
        return await this.prisma.$transaction(async (tx) => {
            const exec = await tx.assistanceExecutionRecord.create({
                data: {
                    applicationId: app.id,
                    installmentNo: dto.installmentNo || 1,
                    totalInstallments: dto.totalInstallments || 1,
                    assistanceType: dto.assistanceType,
                    asnafCategory: app.asnafCategory,
                    executionDate: executionDateStr,
                    executionDatetime: nowIso,
                    executorId: user.id,
                    executorName: user.displayName,
                    assistanceOutcome: dto.assistanceOutcome,
                    actualDisbursedAmount: disbursedDecimal,
                    actualAssistanceValue: valueDecimal,
                    details: dto.details || null,
                    proofUrl: dto.proofUrl || null,
                    status: 'completed',
                    isConfirmed: false,
                },
            });
            await tx.assistanceApplication.update({
                where: { id: app.id },
                data: {
                    assistanceResultStatus: 'completed',
                    assistanceOutcome: dto.assistanceOutcome,
                    actualAssistanceValue: valueDecimal,
                    executionConfirmedAt: nowIso,
                    executionConfirmedById: user.id,
                    executionConfirmedByName: user.displayName,
                    updatedAt: new Date(),
                },
            });
            await tx.applicationHistory.create({
                data: {
                    applicationId: app.id,
                    status: app.status,
                    timestamp: nowIso,
                    changedById: user.id,
                    changedByName: user.displayName,
                    notes: `บันทึกการส่งมอบความช่วยเหลือ (${dto.assistanceType}) มูลค่า ฿${valueDecimal.toFixed(2)} บาท (${dto.assistanceOutcome})`,
                },
            });
            await this.audit.record(tx, {
                actorId: user.id,
                action: 'ASSISTANCE_EXECUTION_RECORD',
                resourceType: 'assistance_execution_record',
                resourceId: exec.id,
                metadata: {
                    applicationNo: app.applicationNo,
                    assistanceType: dto.assistanceType,
                    value: valueDecimal.toFixed(2),
                },
            });
            return {
                ...exec,
                actualDisbursedAmount: Number(exec.actualDisbursedAmount),
                actualAssistanceValue: Number(exec.actualAssistanceValue),
            };
        });
    }
    async confirmExecution(id, dto, user) {
        const exec = await this.prisma.assistanceExecutionRecord.findUnique({
            where: { id },
        });
        if (!exec) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'EXECUTION_NOT_FOUND', `ไม่พบบันทึกการส่งมอบรหัส ${id}`);
        }
        const nowIso = new Date().toISOString();
        const updated = await this.prisma.assistanceExecutionRecord.update({
            where: { id: exec.id },
            data: {
                isConfirmed: true,
                confirmationStatement: dto.confirmationStatement || 'ยืนยันการรับมอบความช่วยเหลือเรียบร้อยครบถ้วน',
                confirmedById: user.id,
                confirmedByName: user.displayName,
                confirmedAt: nowIso,
                proofUrl: dto.proofUrl || exec.proofUrl,
                updatedAt: new Date(),
            },
        });
        await this.audit.write({
            actorId: user.id,
            action: 'ASSISTANCE_EXECUTION_CONFIRMED',
            resourceType: 'assistance_execution_record',
            resourceId: updated.id,
            metadata: {
                applicationId: updated.applicationId,
                confirmedBy: user.displayName,
            },
        });
        return {
            ...updated,
            actualDisbursedAmount: Number(updated.actualDisbursedAmount),
            actualAssistanceValue: Number(updated.actualAssistanceValue),
        };
    }
    async getExecutionsByApplication(applicationId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId);
        const app = await this.prisma.assistanceApplication.findFirst({
            where: isUuid
                ? { id: applicationId }
                : { OR: [{ applicationNo: applicationId }, { legacyId: applicationId }] },
        });
        if (!app) {
            throw new app_exception_1.AppException(common_1.HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', `ไม่พบคำร้องรหัส ${applicationId}`);
        }
        const records = await this.prisma.assistanceExecutionRecord.findMany({
            where: { applicationId: app.id },
            orderBy: { createdAt: 'desc' },
        });
        return records.map((r) => ({
            ...r,
            actualDisbursedAmount: Number(r.actualDisbursedAmount),
            actualAssistanceValue: Number(r.actualAssistanceValue),
        }));
    }
};
exports.AssistanceService = AssistanceService;
exports.AssistanceService = AssistanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AssistanceService);
//# sourceMappingURL=assistance.service.js.map