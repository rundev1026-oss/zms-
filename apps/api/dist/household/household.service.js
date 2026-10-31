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
            if (input.members !== undefined) {
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
                            monthlyIncome: member.monthlyIncome ?? null,
                            educationStatus: member.educationStatus ?? null,
                            healthStatus: member.healthStatus ?? null,
                            healthNotes: member.healthNotes ?? null,
                            notes: member.notes ?? null,
                            sortOrder: member.sortOrder ?? index,
                            createdById: actor.id,
                            updatedById: actor.id,
                        })),
                    });
                }
            }
            await this.audit.record(tx, {
                actorId: actor.id,
                action: 'HOUSEHOLD_UPDATE',
                resourceType: 'beneficiary',
                resourceId: beneficiaryId,
                metadata: {
                    memberRows: input.members?.length ?? null,
                    membersReplaced: input.members !== undefined,
                },
            });
            return tx.household.findUniqueOrThrow({
                where: { id: household.id },
                include: { members: { orderBy: { sortOrder: 'asc' } } },
            });
        });
        return this.toView(saved);
    }
    amounts(input) {
        const data = {};
        const assign = (key, value) => {
            if (value !== undefined)
                data[key] = value;
        };
        assign('memberCount', input.memberCount);
        assign('householdIncome', this.money(input.householdIncome));
        assign('householdExpense', this.money(input.householdExpense));
        assign('debtAmount', this.money(input.debtAmount));
        assign('debtPurpose', input.debtPurpose);
        assign('dependentCount', input.dependentCount);
        assign('additionalNotes', input.additionalNotes);
        assign('address', input.address);
        assign('province', input.province);
        assign('district', input.district);
        assign('subdistrict', input.subdistrict);
        assign('community', input.community);
        assign('housingCondition', input.housingCondition);
        assign('housingNotes', input.housingNotes);
        assign('housingType', input.housingType);
        assign('landTitleType', input.landTitleType);
        assign('landTitleNotes', input.landTitleNotes);
        assign('livingScore', input.livingScore);
        assign('incomeBreakdown', input.incomeBreakdown);
        assign('expenseBreakdown', input.expenseBreakdown);
        assign('pastAssistance', input.pastAssistance);
        assign('familySituationSummary', input.familySituationSummary);
        assign('urgentNeeds', input.urgentNeeds);
        assign('dependentBurdens', input.dependentBurdens);
        assign('coordinatorInfo', input.coordinatorInfo);
        assign('certifierInfo', input.certifierInfo);
        assign('latitude', input.latitude === undefined ? undefined : input.latitude === null ? null : new client_1.Prisma.Decimal(input.latitude));
        assign('longitude', input.longitude === undefined ? undefined : input.longitude === null ? null : new client_1.Prisma.Decimal(input.longitude));
        assign('residenceAddress', input.residenceAddress);
        assign('placeName', input.placeName);
        assign('locationVerificationStatus', input.locationVerificationStatus);
        return data;
    }
    money(value) {
        return value === undefined ? undefined : new client_1.Prisma.Decimal(value);
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
                monthlyIncome: member.monthlyIncome == null ? null : Number(member.monthlyIncome).toFixed(2),
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