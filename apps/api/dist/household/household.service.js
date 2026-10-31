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
exports.HouseholdService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const beneficiaries_service_1 = require("../beneficiaries/beneficiaries.service");
const prisma_service_1 = require("../prisma/prisma.service");
let HouseholdService = class HouseholdService {
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
        const household = await this.prisma.household.findUnique({
            where: { beneficiaryId },
            include: { members: { orderBy: { sortOrder: 'asc' } } },
        });
        await this.audit.write({
            actorId: actor.id,
            action: 'HOUSEHOLD_VIEW',
            resourceType: 'beneficiary',
            resourceId: beneficiaryId,
            metadata: { present: household !== null },
        });
        return household === null ? null : this.toView(household);
    }
    async replace(beneficiaryId, input, actor) {
        const beneficiary = await this.beneficiaries.requireRecord(beneficiaryId);
        this.beneficiaries.assertEditable(beneficiary.status);
        const saved = await this.prisma.$transaction(async (tx) => {
            const household = await tx.household.upsert({
                where: { beneficiaryId },
                create: {
                    beneficiaryId,
                    ...this.amounts(input),
                    createdById: actor.id,
                    updatedById: actor.id,
                },
                update: { ...this.amounts(input), updatedById: actor.id },
            });
            await tx.householdMember.deleteMany({ where: { householdId: household.id } });
            if (input.members.length > 0) {
                await tx.householdMember.createMany({
                    data: input.members.map((member, index) => ({
                        householdId: household.id,
                        fullName: member.fullName,
                        relationship: member.relationship,
                        dateOfBirth: member.dateOfBirth === undefined ? null : new Date(member.dateOfBirth),
                        ageYears: member.ageYears ?? null,
                        occupation: member.occupation ?? null,
                        isDependent: member.isDependent,
                        sortOrder: member.sortOrder ?? index,
                        createdById: actor.id,
                        updatedById: actor.id,
                    })),
                });
            }
            await this.audit.record(tx, {
                actorId: actor.id,
                action: 'HOUSEHOLD_UPDATE',
                resourceType: 'beneficiary',
                resourceId: beneficiaryId,
                metadata: { memberRows: input.members.length },
            });
            return tx.household.findUniqueOrThrow({
                where: { id: household.id },
                include: { members: { orderBy: { sortOrder: 'asc' } } },
            });
        });
        return this.toView(saved);
    }
    amounts(input) {
        return {
            memberCount: input.memberCount ?? null,
            householdIncome: this.money(input.householdIncome),
            householdExpense: this.money(input.householdExpense),
            debtAmount: this.money(input.debtAmount),
            debtPurpose: input.debtPurpose ?? null,
            dependentCount: input.dependentCount ?? null,
            additionalNotes: input.additionalNotes ?? null,
            address: input.address ?? null,
            province: input.province ?? null,
            district: input.district ?? null,
            subdistrict: input.subdistrict ?? null,
            community: input.community ?? null,
            housingCondition: input.housingCondition ?? null,
            housingNotes: input.housingNotes ?? null,
            housingType: input.housingType ?? null,
            landTitleType: input.landTitleType ?? null,
            landTitleNotes: input.landTitleNotes ?? null,
            livingScore: input.livingScore ?? null,
            incomeBreakdown: input.incomeBreakdown ?? null,
            expenseBreakdown: input.expenseBreakdown ?? null,
            pastAssistance: input.pastAssistance ?? null,
            familySituationSummary: input.familySituationSummary ?? null,
            urgentNeeds: input.urgentNeeds ?? null,
            dependentBurdens: input.dependentBurdens ?? null,
            coordinatorInfo: input.coordinatorInfo ?? null,
            certifierInfo: input.certifierInfo ?? null,
            latitude: input.latitude !== undefined && input.latitude !== null ? new client_1.Prisma.Decimal(input.latitude) : null,
            longitude: input.longitude !== undefined && input.longitude !== null ? new client_1.Prisma.Decimal(input.longitude) : null,
            residenceAddress: input.residenceAddress ?? null,
            placeName: input.placeName ?? null,
            locationVerificationStatus: input.locationVerificationStatus ?? null,
        };
    }
    money(value) {
        return value === undefined ? null : new client_1.Prisma.Decimal(value);
    }
    toView(household) {
        return {
            id: household.id,
            householdNo: household.householdNo ?? null,
            memberCount: household.memberCount,
            householdIncome: household.householdIncome?.toFixed(2) ?? null,
            householdExpense: household.householdExpense?.toFixed(2) ?? null,
            debtAmount: household.debtAmount?.toFixed(2) ?? null,
            debtPurpose: household.debtPurpose ?? null,
            dependentCount: household.dependentCount,
            additionalNotes: household.additionalNotes,
            address: household.address ?? null,
            province: household.province ?? null,
            district: household.district ?? null,
            subdistrict: household.subdistrict ?? null,
            community: household.community ?? null,
            housingCondition: household.housingCondition ?? null,
            housingNotes: household.housingNotes ?? null,
            housingType: household.housingType ?? null,
            landTitleType: household.landTitleType ?? null,
            landTitleNotes: household.landTitleNotes ?? null,
            livingScore: household.livingScore ?? null,
            incomeBreakdown: household.incomeBreakdown ?? null,
            expenseBreakdown: household.expenseBreakdown ?? null,
            pastAssistance: household.pastAssistance ?? null,
            familySituationSummary: household.familySituationSummary ?? null,
            urgentNeeds: household.urgentNeeds ?? null,
            dependentBurdens: household.dependentBurdens ?? null,
            coordinatorInfo: household.coordinatorInfo ?? null,
            certifierInfo: household.certifierInfo ?? null,
            latitude: household.latitude ? Number(household.latitude) : null,
            longitude: household.longitude ? Number(household.longitude) : null,
            residenceAddress: household.residenceAddress ?? null,
            placeName: household.placeName ?? null,
            locationVerificationStatus: household.locationVerificationStatus ?? null,
            members: (household.members || []).map((member) => ({
                ...member,
                dateOfBirth: member.dateOfBirth === null || member.dateOfBirth === undefined
                    ? null
                    : (member.dateOfBirth instanceof Date ? member.dateOfBirth.toISOString().slice(0, 10) : String(member.dateOfBirth).slice(0, 10)),
            })),
        };
    }
};
exports.HouseholdService = HouseholdService;
exports.HouseholdService = HouseholdService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        beneficiaries_service_1.BeneficiariesService,
        audit_service_1.AuditService])
], HouseholdService);
//# sourceMappingURL=household.service.js.map