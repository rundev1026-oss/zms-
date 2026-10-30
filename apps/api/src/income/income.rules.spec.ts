import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpsertIncomeProfileDto } from './income.dto';

describe('income profile validation', () => {
  it('rejects a money value that is not a decimal amount', async () => {
    const dto = plainToInstance(UpsertIncomeProfileDto, { personalIncome: 'มาก' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'personalIncome')).toBe(true);
  });

  it('accepts a decimal amount and does not require an eligibility score', async () => {
    const dto = plainToInstance(UpsertIncomeProfileDto, {
      personalIncome: '1500.50',
      housingCondition: 'บ้านเช่า',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).not.toHaveProperty('eligible');
  });
});
