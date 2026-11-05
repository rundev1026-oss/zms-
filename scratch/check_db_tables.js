const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../apps/api/node_modules/.prisma/client'));

const prisma = new PrismaClient();

async function checkDb() {
  try {
    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    const permCount = await prisma.permission.count();
    const branchCount = await prisma.branch.count();
    const deptCount = await prisma.department.count();
    const asnafCount = await prisma.asnafCategory.count();
    const assistTypeCount = await prisma.assistanceType.count();
    const settingCount = await prisma.systemSetting.count();
    const beneficiaryCount = await prisma.beneficiary.count();

    console.log('=== REAL DB STATS ===');
    console.log('Users:', userCount);
    console.log('Roles:', roleCount);
    console.log('Permissions:', permCount);
    console.log('Branches:', branchCount);
    console.log('Departments:', deptCount);
    console.log('Asnaf Categories:', asnafCount);
    console.log('Assistance Types:', assistTypeCount);
    console.log('System Settings:', settingCount);
    console.log('Beneficiaries:', beneficiaryCount);

    if (roleCount > 0) {
      const roles = await prisma.role.findMany({ select: { id: true, code: true, name: true, isSystem: true } });
      console.log('Roles sample:', roles.slice(0, 5));
    }
    if (branchCount > 0) {
      const branches = await prisma.branch.findMany({ select: { id: true, code: true, name: true, isHeadquarters: true } });
      console.log('Branches sample:', branches.slice(0, 5));
    }
    if (asnafCount > 0) {
      const asnafs = await prisma.asnafCategory.findMany({ select: { id: true, code: true, nameTh: true } });
      console.log('Asnafs:', asnafs);
    }
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();

