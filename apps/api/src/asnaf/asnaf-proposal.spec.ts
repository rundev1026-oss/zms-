import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AsnafService } from './asnaf.service';
import { ProposeAsnafDto } from './proposal.dto';

const categoryId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('asnaf proposal', () => {
  it('rejects a client-supplied eligibility decision', async () => {
    const dto = plainToInstance(ProposeAsnafDto, {
      categoryId,
      rationale: 'เจ้าหน้าที่เสนอหมวดนี้',
      decision: 'CONFIRMED',
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some((error) => error.property === 'decision')).toBe(true);
  });

  it('records PROPOSED and does not change the registry status', async () => {
    const assessmentCreate = jest.fn().mockResolvedValue({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      categoryId,
      rationale: 'เจ้าหน้าที่เสนอหมวดนี้',
      supportingInfo: null,
      decision: 'PROPOSED',
      assessedAt: new Date('2026-01-02T00:00:00.000Z'),
      category: { nameTh: 'ฟากีร', code: 'FAQIR' },
    });
    const beneficiaryUpdate = jest.fn();
    const prisma = {
      asnafCategory: {
        findFirst: jest.fn().mockResolvedValue({ id: categoryId, code: 'FAQIR', isActive: true }),
      },
      beneficiaryAsnafAssessment: { findFirst: jest.fn() },
      $transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) =>
        work({
          beneficiaryAsnafAssessment: { create: assessmentCreate },
          beneficiary: { update: beneficiaryUpdate },
        }),
      ),
    };
    const beneficiaries = {
      requireRecord: jest.fn().mockResolvedValue({ status: 'DRAFT' }),
      assertEditable: jest.fn(),
    };
    const audit = { write: jest.fn(), record: jest.fn() };
    const service = new AsnafService(prisma as never, beneficiaries as never, audit as never);
    const saved = await service.propose(
      '11111111-1111-4111-8111-111111111111',
      { categoryId, rationale: 'เจ้าหน้าที่เสนอหมวดนี้' },
      {
        id: '22222222-2222-4222-8222-222222222222',
        email: 'registrar@zms.local',
        displayName: 'เจ้าหน้าที่',
        roles: [],
        permissions: ['beneficiaries.write'],
      },
    );

    expect(saved.decision).toBe('PROPOSED');
    expect(assessmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ decision: 'PROPOSED' }),
      }),
    );
    expect(beneficiaryUpdate).not.toHaveBeenCalled();
    expect(JSON.stringify(saved)).not.toContain('ELIGIBLE');
  });
});
