import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.count();
    console.log('PostgreSQL Users count:', users);
  } catch (e) {
    console.log('Error counting users:', e.message);
  }

  try {
    const apps = await prisma.assistanceApplication.count();
    console.log('PostgreSQL AssistanceApplications count:', apps);
  } catch (e) {
    console.log('Error counting apps:', e.message);
  }

  try {
    const bens = await prisma.beneficiary.count();
    console.log('PostgreSQL Beneficiaries count:', bens);
  } catch (e) {
    console.log('Error counting bens:', e.message);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
