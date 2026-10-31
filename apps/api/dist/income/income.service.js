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
exports.IncomeService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const beneficiaries_service_1 = require("../beneficiaries/beneficiaries.service");
const prisma_service_1 = require("../prisma/prisma.service");
let IncomeService = class IncomeService {
    prisma;
    beneficiaries;
    audit;
    constructor(prisma, beneficiaries, audit) {
        this.prisma = prisma;
        this.beneficiaries = beneficiaries;
        this.audit = audit;
    }
    async get(beneficiaryId, actor) {
        await this.beneficiaries.requireRecord(beneficiaryId);
        const row = await this.prisma.incomeExpenseProfile.findUnique({ where: { beneficiaryId } });
        await this.audit.write({
            actorId: actor.id,
            action: 'INCOME_PROFILE_VIEW',
            resourceType: 'beneficiary',
            resourceId: beneficiaryId,
            metadata: { present: row !== null },
        });
        return row === null ? null : this.toView(row);
    }
    async replace(beneficiaryId, input, actor) {
        const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);
        this.beneficiaries.assertEditable(beneficiary.status);
        const data = this.fields(input);
        const saved = await this.prisma.$transaction(async (tx) => {
            const row = await tx.incomeExpenseProfile.upsert({
                where: { beneficiaryId },
                create: { beneficiaryId, ...data, createdById: actor.id, updatedById: actor.id },
                update: { ...data, updatedById: actor.id },
            });
            await this.audit.record(tx, {
                actorId: actor.id,
                action: 'INCOME_PROFILE_UPDATE',
                resourceType: 'beneficiary',
                resourceId: beneficiaryId,
                metadata: { updated: true },
            });
            return row;
        });
        return this.toView(saved);
    }
    fields(input) {
        const data = {};
        const assign = (key, value) => {
            if (value !== undefined)
                data[key] = value;
        };
        assign('personalIncome', this.money(input.personalIncome));
        assign('regularExpense', this.money(input.regularExpense));
        assign('debtBurden', this.money(input.debtBurden));
        assign('housingCondition', input.housingCondition);
        assign('livingConstraints', input.livingConstraints);
        assign('assistanceNeeds', input.assistanceNeeds);
        assign('otherAgencyAssistance', input.otherAgencyAssistance);
        assign('priorAssistanceHistory', input.priorAssistanceHistory);
        assign('officerNote', input.officerNote);
        return data;
    }
    money(value) {
        return value === undefined ? undefined : new client_1.Prisma.Decimal(value);
    }
    toView(row) {
        return {
            id: row.id,
            personalIncome: row.personalIncome?.toFixed(2) ?? null,
            regularExpense: row.regularExpense?.toFixed(2) ?? null,
            debtBurden: row.debtBurden?.toFixed(2) ?? null,
            housingCondition: row.housingCondition,
            livingConstraints: row.livingConstraints,
            assistanceNeeds: row.assistanceNeeds,
            otherAgencyAssistance: row.otherAgencyAssistance,
            priorAssistanceHistory: row.priorAssistanceHistory,
            officerNote: row.officerNote,
        };
    }
};
exports.IncomeService = IncomeService;
exports.IncomeService = IncomeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        beneficiaries_service_1.BeneficiariesService,
        audit_service_1.AuditService])
], IncomeService);
//# sourceMappingURL=income.service.js.map