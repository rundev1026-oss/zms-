import { Prisma, PrismaClient } from '@prisma/client';

const ROLLBACK = 'ROLLBACK_VERIFICATION';
const prisma = new PrismaClient();

function beneficiaryRow(
  registryNumber: string,
  lastName: string,
  identityType: 'THAI_NATIONAL_ID' | 'OTHER',
  status: 'DRAFT' | 'PENDING_REVIEW' | 'ARCHIVED',
  identityNumber: string,
) {
  return {
    registryNumber,
    firstName: 'ทดสอบ',
    lastName,
    identityType,
    identityNumber,
    identityNumberNormalized: identityNumber,
    status,
  };
}

async function expectRolledBack(
  work: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await work(tx);
      throw new Error(ROLLBACK);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!message.includes(ROLLBACK)) {
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

async function main(): Promise<void> {
  const index = await prisma.$queryRaw<Array<{ indexdef: string }>>`
    SELECT indexdef
    FROM pg_indexes
    WHERE indexname = 'beneficiaries_thai_national_id_active_key'
  `;
  if (index.length !== 1 || !index[0]?.indexdef.includes('WHERE')) {
    throw new Error('Partial unique index for Thai national IDs is missing');
  }

  const money = await prisma.$queryRaw<
    Array<{ column_name: string; data_type: string; numeric_scale: number }>
  >`
    SELECT column_name, data_type, numeric_scale
    FROM information_schema.columns
    WHERE table_name = 'households'
      AND column_name IN ('household_income', 'household_expense', 'debt_amount')
  `;
  if (
    money.length !== 3 ||
    money.some((column) => column.data_type !== 'numeric' || column.numeric_scale !== 2)
  ) {
    throw new Error('Household money columns are not numeric with scale 2');
  }

  const [users, roles, permissions, categories] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.asnafCategory.count(),
  ]);
  if (users < 6 || roles < 6 || permissions < 14 || categories < 8) {
    throw new Error('Seed counts are below the system catalog (run prisma db seed first)');
  }

  const beneficiaryCountBefore = await prisma.beneficiary.count();
  const sharedId = '0000000000001';

  try {
    await prisma.$transaction(async (tx) => {
      await tx.beneficiary.create({
        data: beneficiaryRow('ZMS-2026-900001', 'ระบบ', 'THAI_NATIONAL_ID', 'DRAFT', sharedId),
      });
      await tx.beneficiary.create({
        data: beneficiaryRow(
          'ZMS-2026-900002',
          'ระบบซ้ำ',
          'THAI_NATIONAL_ID',
          'PENDING_REVIEW',
          sharedId,
        ),
      });
    });
    throw new Error('Expected a unique constraint violation');
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
  }

  await expectRolledBack(async (tx) => {
    await tx.beneficiary.create({
      data: beneficiaryRow(
        'ZMS-2026-900003',
        'คลังหนึ่ง',
        'THAI_NATIONAL_ID',
        'ARCHIVED',
        sharedId,
      ),
    });
    await tx.beneficiary.create({
      data: beneficiaryRow('ZMS-2026-900004', 'คลังสอง', 'THAI_NATIONAL_ID', 'ARCHIVED', sharedId),
    });
  });

  await expectRolledBack(async (tx) => {
    await tx.beneficiary.create({
      data: {
        ...beneficiaryRow('ZMS-2026-900005', 'ลบแบบนุ่ม', 'THAI_NATIONAL_ID', 'DRAFT', sharedId),
        deletedAt: new Date(),
      },
    });
    await tx.beneficiary.create({
      data: beneficiaryRow(
        'ZMS-2026-900006',
        'ร่างที่ยังใช้',
        'THAI_NATIONAL_ID',
        'DRAFT',
        sharedId,
      ),
    });
  });

  await expectRolledBack(async (tx) => {
    await tx.beneficiary.create({
      data: beneficiaryRow('ZMS-2026-900007', 'เอกสารอื่นหนึ่ง', 'OTHER', 'DRAFT', sharedId),
    });
    await tx.beneficiary.create({
      data: beneficiaryRow('ZMS-2026-900008', 'เอกสารอื่นสอง', 'OTHER', 'DRAFT', sharedId),
    });
  });

  const beneficiaryCountAfter = await prisma.beneficiary.count();
  if (beneficiaryCountAfter !== beneficiaryCountBefore) {
    throw new Error('Verification left beneficiary rows behind');
  }

  console.log(
    JSON.stringify({
      partialUniqueIndex: true,
      decimalScale: 2,
      users,
      roles,
      permissions,
      categories,
      beneficiaryRows: beneficiaryCountAfter,
    }),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Migration verification failed');
    await prisma.$disconnect();
    process.exitCode = 1;
  });
