import { AsnafService } from './asnaf.service';
import type { AuthUser } from '../common/auth-user';

function makeInMemoryPeriodicEnv() {
  const categories = [
    { id: 'cat-faqir', code: 'faqir', nameTh: 'ฟะกีร (ผู้ยากไร้)', isActive: true, sortOrder: 1 },
    { id: 'cat-miskin', code: 'miskin', nameTh: 'มิสกีน (ผู้ขัดสน)', isActive: true, sortOrder: 2 },
  ];

  const member = {
    id: 'ben-001',
    memberId: 'MB-2026-000012',
    registryNumber: 'ZMS-2026-000012',
    memberStatus: 'ACTIVE',
    status: 'PENDING_REVIEW',
    title: 'นาง',
    firstName: 'มารีแย',
    lastName: 'ลาเต๊ะ',
    identityNumberMasked: '1-9401-•••••-12-3',
    dateOfBirth: new Date('1978-04-10T00:00:00.000Z'),
    gender: 'FEMALE',
    maritalStatus: 'WIDOWED',
    phonePrimary: '0812345678',
    occupation: 'รับจ้างกรีดยาง',
    educationLevel: 'ประถมศึกษา',
    vulnerabilityFlags: ['ILLNESS'],
    livingLimitations: 'ดูแลบุตรวัยเรียนเพียงลำพัง',
    disabilityNotes: null,
    chronicIllnessNotes: 'ความดันโลหิตสูง',
    familySituationNotes: 'หม้าย มีบุตร 2 คน',
    urgentNeedsNotes: 'ทุนยังชีพ',
    dependentCareBurdenNotes: 'บุตรกำลังเรียน 2 คน',
    coordinatorName: 'นายอับดุลเลาะ',
    coordinatorPhone: '0890001111',
    coordinatorRelation: 'กรรมการมัสยิด',
    certifierName: 'อิหม่ามซอและห์',
    certifierPosition: 'อิหม่ามประจำมัสยิด',
    certifierPhone: '0892223333',
    deletedAt: null,
    addresses: [
      {
        addressType: 'CURRENT',
        addressLine: '12/4 หมู่ 3',
        community: 'ชุมชนบ้านต้นไทร',
        subdistrict: 'บานา',
        district: 'เมืองปัตตานี',
        province: 'ปัตตานี',
        postalCode: '94000',
        latitude: 6.869,
        longitude: 101.25,
      },
    ],
    household: {
      householdNo: 'HH-001',
      memberCount: 1,
      householdIncome: 3500,
      householdExpense: 5200,
      debtAmount: 12000,
      housingType: 'own',
      housingCondition: 'poor',
      housingNotes: 'หลังคารั่วบางจุด',
      landTitleType: 'title_deed',
      members: [
        {
          fullName: 'ด.ช.ฮากีม ลาเต๊ะ',
          relationship: 'บุตร',
          ageYears: 11,
          occupation: 'นักเรียน',
          monthlyIncome: 0,
          healthStatus: 'ปกติ',
        },
      ],
    },
    incomeProfile: {
      personalIncome: 3500,
      regularExpense: 5200,
      debtBurden: 12000,
      livingConstraints: 'ดูแลบุตรวัยเรียนเพียงลำพัง',
    },
  };

  const yearSeq: Record<number, number> = {};
  const assessments: any[] = [];
  const statusHistory: any[] = [];
  const auditLogs: any[] = [];
  let beneficiaryCreateCalls = 0;

  const tx: any = {
    assessmentCounter: {
      upsert: jest.fn(async ({ where }: any) => {
        yearSeq[where.year] = (yearSeq[where.year] || 0) + 1;
        return { year: where.year, lastValue: yearSeq[where.year] };
      }),
    },
    beneficiary: {
      create: jest.fn(async () => {
        beneficiaryCreateCalls += 1;
        throw new Error('Must NEVER create duplicate Beneficiary during periodic assessment');
      }),
      findFirst: jest.fn(async ({ where }: any) => (where.id === member.id ? member : null)),
      update: jest.fn(async ({ data }: any) => {
        if (data.memberId && data.memberId !== member.memberId) {
          throw new Error('Must NEVER mutate permanent memberId');
        }
        if (data.status) member.status = data.status;
        return member;
      }),
    },
    beneficiaryAsnafAssessment: {
      count: jest.fn(async ({ where }: any) =>
        assessments.filter((a) => a.beneficiaryId === where.beneficiaryId).length,
      ),
      findMany: jest.fn(async ({ where }: any) =>
        [...assessments]
          .filter((a) => a.beneficiaryId === where.beneficiaryId)
          .sort((a, b) => b.assessedAt.getTime() - a.assessedAt.getTime()),
      ),
      findFirst: jest.fn(async ({ where }: any) => {
        const list = [...assessments]
          .filter((a) => a.beneficiaryId === where.beneficiaryId)
          .sort((a, b) => b.assessedAt.getTime() - a.assessedAt.getTime());
        if (where.id) return list.find((a) => a.id === where.id) ?? null;
        return list[0] ?? null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const cat = categories.find((c) => c.id === data.categoryId)!;
        const row = {
          id: `asm-uuid-${assessments.length + 1}`,
          ...data,
          // Deep-clone JSON snapshot to simulate JSONB persistence in PostgreSQL
          memberSnapshot: data.memberSnapshot ? JSON.parse(JSON.stringify(data.memberSnapshot)) : null,
          category: cat,
          recordedBy: { id: data.recordedById, displayName: 'เจ้าหน้าที่ภาคสนาม', email: 'officer@zms.or.th' },
          reviewedBy: data.reviewedById
            ? { id: data.reviewedById, displayName: 'ผู้อนุมัติสิทธิ์', email: 'approver@zms.or.th' }
            : null,
          _count: { applications: 0 },
          createdAt: new Date(data.assessedAt),
          updatedAt: new Date(data.assessedAt),
        };
        assessments.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const idx = assessments.findIndex((a) => a.id === where.id);
        const updated = {
          ...assessments[idx],
          ...data,
          reviewedBy: data.reviewedById
            ? { id: data.reviewedById, displayName: 'ผู้อนุมัติสิทธิ์', email: 'approver@zms.or.th' }
            : assessments[idx].reviewedBy,
          updatedAt: new Date(),
        };
        assessments[idx] = updated;
        return updated;
      }),
    },
    registryStatusHistory: {
      create: jest.fn(async ({ data }: any) => {
        statusHistory.push(data);
        return data;
      }),
    },
  };

  const prisma: any = {
    ...tx,
    asnafCategory: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (where.id) return categories.find((c) => c.id === where.id && c.isActive) ?? null;
        if (where.code?.equals) {
          return (
            categories.find(
              (c) => c.code.toLowerCase() === String(where.code.equals).toLowerCase() && c.isActive,
            ) ?? null
          );
        }
        return categories[0];
      }),
      findMany: jest.fn(async () => categories),
    },
    $transaction: jest.fn(async (cb: any) => cb(tx)),
  };

  const beneficiariesService: any = {
    requireRecord: jest.fn(async (id: string) => {
      if (id !== member.id) throw new Error('Not found');
      return member;
    }),
    assertEditable: jest.fn(),
  };

  const auditService: any = {
    write: jest.fn(async (entry: any) => {
      auditLogs.push(entry);
    }),
    record: jest.fn(async (_tx: any, entry: any) => {
      auditLogs.push(entry);
    }),
  };

  const service = new AsnafService(prisma, beneficiariesService, auditService);
  return { service, member, assessments, auditLogs, getBeneficiaryCreateCalls: () => beneficiaryCreateCalls };
}

describe('Periodic Member Re-Assessment & Immutable Snapshot (Master Requirement)', () => {
  const officerActor: AuthUser = {
    id: 'user-officer-1',
    email: 'officer@zms.or.th',
    displayName: 'เจ้าหน้าที่ภาคสนาม',
    roles: [{ code: 'FIELD_OFFICER', name: 'เจ้าหน้าที่ภาคสนาม' }],
    permissions: ['beneficiaries.write', 'asnaf.propose'],
  };

  const approverActor: AuthUser = {
    id: 'user-approver-1',
    email: 'approver@zms.or.th',
    displayName: 'คณะกรรมการอนุมัติ',
    roles: [{ code: 'APPROVER', name: 'คณะกรรมการอนุมัติ' }],
    permissions: ['beneficiaries.decide', 'approvals.approve'],
  };

  it('creates append-only periodic assessments under the same permanent Member ID and freezes historical snapshots', async () => {
    const env = makeInMemoryPeriodicEnv();

    // Round 1: Initial assessment (income = 3,500, address = 12/4 หมู่ 3)
    const round1 = await env.service.createPeriodicAssessment(
      'ben-001',
      {
        asnafCode: 'miskin',
        assessmentType: 'INITIAL',
        assessmentPeriod: 'ประจำปี 2569 (ขึ้นทะเบียนครั้งแรก)',
        assessmentDate: '2026-01-15',
        eligibilityResult: 'ELIGIBLE',
        status: 'ELIGIBLE',
        rationale: 'รายได้น้อยกว่าค่าใช้จ่ายจำเป็น มีบุตรวัยเรียน',
        nextAssessmentDate: '2027-01-15',
      },
      officerActor,
    );

    expect(round1.assessmentNumber).toBe('ASM-2026-000001');
    expect(round1.memberId).toBe('MB-2026-000012');
    expect(round1.eligibilityResult).toBe('ELIGIBLE');
    expect((round1.memberSnapshot as any).financial.householdIncome).toBe(3500);
    expect((round1.memberSnapshot as any).addresses.current.addressLine).toBe('12/4 หมู่ 3');

    // Member updates master data 1 year later (income drops to 1,500, moves to 99/1 หมู่ 5)
    env.member.household.householdIncome = 1500;
    env.member.incomeProfile.personalIncome = 1500;
    env.member.addresses[0].addressLine = '99/1 หมู่ 5';

    // Round 2: Periodic re-assessment (must NOT create new Beneficiary and must NOT change Member ID)
    const round2 = await env.service.createPeriodicAssessment(
      'ben-001',
      {
        asnafCode: 'faqir',
        assessmentType: 'PERIODIC',
        assessmentPeriod: 'ประจำปี 2570 รอบที่ 1',
        assessmentDate: '2027-01-20',
        assessmentDetails: 'ลงพื้นที่ทบทวนสิทธิ์ รายได้ลดลงและย้ายบ้านเช่า',
        eligibilityResult: 'PENDING',
        status: 'UNDER_REVIEW',
        rationale: 'ส่งต่อคณะกรรมการพิจารณาปรับหมวดเป็นฟะกีร',
      },
      officerActor,
    );

    expect(env.getBeneficiaryCreateCalls()).toBe(0);
    expect(env.member.memberId).toBe('MB-2026-000012');
    expect(round2.assessmentNumber).toBe('ASM-2027-000001');
    expect(round2.memberId).toBe('MB-2026-000012');
    expect((round2.memberSnapshot as any).financial.householdIncome).toBe(1500);
    expect((round2.memberSnapshot as any).addresses.current.addressLine).toBe('99/1 หมู่ 5');

    // Subsequent edit to master data AFTER Round 2 must NOT alter Round 1 or Round 2 snapshots
    env.member.household.householdIncome = 9000;
    env.member.incomeProfile.personalIncome = 9000;
    env.member.addresses[0].addressLine = '555 ถนนสุขาภิบาล';

    // Approver approves Round 2 status — must NOT overwrite Round 2 snapshot
    const approvedRound2 = await env.service.updateAssessmentStatus(
      'ben-001',
      round2.id,
      {
        status: 'APPROVED',
        eligibilityResult: 'ELIGIBLE',
        reviewerNote: 'อนุมัติสิทธิ์รอบประจำปี 2570',
      },
      approverActor,
    );

    expect(approvedRound2.status).toBe('APPROVED');
    expect(approvedRound2.eligibilityResult).toBe('ELIGIBLE');
    expect((approvedRound2.memberSnapshot as any).financial.householdIncome).toBe(1500);
    expect((approvedRound2.memberSnapshot as any).addresses.current.addressLine).toBe('99/1 หมู่ 5');

    // Verify full append-only history (newest first)
    const history = await env.service.listAssessments('ben-001', officerActor);
    expect(history.total).toBe(2);
    expect(history.memberId).toBe('MB-2026-000012');
    expect(history.items[0].assessmentNumber).toBe('ASM-2027-000001');
    expect((history.items[0].memberSnapshot as any).financial.householdIncome).toBe(1500);
    expect(history.items[1].assessmentNumber).toBe('ASM-2026-000001');
    expect((history.items[1].memberSnapshot as any).financial.householdIncome).toBe(3500);
    expect((history.items[1].memberSnapshot as any).addresses.current.addressLine).toBe('12/4 หมู่ 3');
  });

  it('rejects unauthorized callers and archived members', async () => {
    const env = makeInMemoryPeriodicEnv();
    const unauthorizedViewer: AuthUser = {
      id: 'viewer-1',
      email: 'viewer@zms.or.th',
      displayName: 'ผู้ดูรายงาน',
      roles: [{ code: 'AUDITOR', name: 'ผู้ตรวจสอบ' }],
      permissions: ['beneficiaries.read'],
    };

    await expect(
      env.service.createPeriodicAssessment(
        'ben-001',
        { rationale: 'ไม่มีสิทธิ์ประเมิน' },
        unauthorizedViewer,
      ),
    ).rejects.toMatchObject({ status: 403 });

    env.member.memberStatus = 'ARCHIVED';
    await expect(
      env.service.createPeriodicAssessment(
        'ben-001',
        { rationale: 'สมาชิกปิดประวัติแล้ว' },
        officerActor,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
