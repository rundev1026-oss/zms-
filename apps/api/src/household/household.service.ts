import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BeneficiariesService } from '../beneficiaries/beneficiaries.service';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

export interface HouseholdMemberInput {
  fullName: string;
  relationship: string;
  dateOfBirth?: string;
  ageYears?: number;
  occupation?: string;
  isDependent: boolean;
  sortOrder?: number;
  monthlyIncome?: number;
  educationStatus?: string;
  healthStatus?: string;
  healthNotes?: string;
  notes?: string;
}

export interface HouseholdInput {
  memberCount?: number;
  householdIncome?: string;
  householdExpense?: string;
  debtAmount?: string;
  debtPurpose?: string;
  dependentCount?: number;
  additionalNotes?: string;
  address?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  community?: string;
  housingCondition?: string;
  housingNotes?: string;
  housingType?: string;
  landTitleType?: string;
  landTitleNotes?: string;
  livingScore?: number;
  incomeBreakdown?: string;
  expenseBreakdown?: string;
  pastAssistance?: string;
  familySituationSummary?: string;
  urgentNeeds?: string;
  dependentBurdens?: string;
  coordinatorInfo?: string;
  certifierInfo?: string;
  latitude?: number;
  longitude?: number;
  residenceAddress?: string;
  placeName?: string;
  locationVerificationStatus?: string;
  members?: HouseholdMemberInput[];
}

@Injectable()
export class HouseholdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly beneficiaries: BeneficiariesService,
    private readonly audit: AuditService,
  ) {}

  async get(beneficiaryId: string, actor: AuthUser) {
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

  async replace(beneficiaryId: string, input: HouseholdInput, actor: AuthUser) {
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

  private amounts(input: HouseholdInput) {
    const data: Record<string, unknown> = {};
    const assign = (key: string, value: unknown) => {
      if (value !== undefined) data[key] = value;
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
    assign('latitude', input.latitude === undefined ? undefined : input.latitude === null ? null : new Prisma.Decimal(input.latitude));
    assign('longitude', input.longitude === undefined ? undefined : input.longitude === null ? null : new Prisma.Decimal(input.longitude));
    assign('residenceAddress', input.residenceAddress);
    assign('placeName', input.placeName);
    assign('locationVerificationStatus', input.locationVerificationStatus);
    return data;
  }

  private money(value: string | undefined): Prisma.Decimal | undefined {
    return value === undefined ? undefined : new Prisma.Decimal(value);
  }

  private toView(household: any) {
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
      members: (household.members || []).map((member: any) => ({
        ...member,
        monthlyIncome: member.monthlyIncome == null ? null : Number(member.monthlyIncome).toFixed(2),
        dateOfBirth:
          member.dateOfBirth === null || member.dateOfBirth === undefined
            ? null
            : (member.dateOfBirth instanceof Date ? member.dateOfBirth.toISOString().slice(0, 10) : String(member.dateOfBirth).slice(0, 10)),
      })),
    };
  }
}
