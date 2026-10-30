import pkg from '../apps/api/node_modules/@prisma/client/default.js';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  const formulas = await prisma.zakatFormulaVersion.findMany();
  console.log('Zakat Formula Versions:', formulas);
  const bankRecons = await prisma.bankReconciliation.findMany({ include: { bankAccount: true } });
  console.log('Bank Reconciliations:', bankRecons);
  await prisma.$disconnect();
}

main().catch(console.error);
