import { pathToFileURL } from 'url';
import path from 'path';

async function resetPostgres() {
  const clientPath = pathToFileURL(path.join(process.cwd(), 'apps', 'api', 'node_modules', '@prisma', 'client', 'index.js')).href;
  const { PrismaClient } = await import(clientPath);
  const prisma = new PrismaClient();

  console.log('[POSTGRES] Checking columns...');
  const cCols = await prisma.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='assessment_counters';");
  console.log('assessment_counters cols:', cCols);
  const cRows = await prisma.$queryRawUnsafe('SELECT * FROM "assessment_counters";');
  console.log('assessment_counters rows:', cRows);
  const aCols = await prisma.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='audit_logs';");
  console.log('audit_logs cols:', aCols);

  console.log('[POSTGRES] Executing transaction tables reset in PostgreSQL...');
  try {
    await prisma.$transaction(async (ptx) => {
      // Child-to-parent order:
      // 1. Documents & History
      const d1 = await ptx.$executeRawUnsafe('DELETE FROM "application_documents";');
      const d2 = await ptx.$executeRawUnsafe('DELETE FROM "application_history";');
      // 2. Applications (must be deleted before assessments because of foreign keys)
      const d3 = await ptx.$executeRawUnsafe('DELETE FROM "assistance_applications";');
      // 3. Assessments
      const d4 = await ptx.$executeRawUnsafe('DELETE FROM "beneficiary_asnaf_assessments";');
      const d5 = await ptx.$executeRawUnsafe('DELETE FROM "beneficiary_assessments";');

      console.log(`Deleted rows: docs=${d1}, hist=${d2}, apps=${d3}, asnaf_assessments=${d4}, assessments=${d5}`);
    });

    await prisma.$executeRawUnsafe('UPDATE "assessment_counters" SET "last_value" = 0;');
    const counterRes = await prisma.$queryRawUnsafe('SELECT * FROM "assessment_counters";');
    console.log('[POSTGRES] assessment_counters reset:', counterRes);

    // Audit log
    await prisma.$executeRawUnsafe(`
      INSERT INTO "audit_logs" ("id", "created_at", "actor_id", "user_name", "user_role", "action", "resource_type", "resource_id", "description")
      VALUES (gen_random_uuid(), NOW(), (SELECT id FROM users LIMIT 1), 'Super Admin', 'super_admin', 'SYSTEM_FULL_TRANSACTION_RESET', 'system', 'all_transactions', 'ล้างข้อมูลธุรกรรมคำร้องและการประเมินทั้งหมดให้เหลือ 0 รายการ');
    `);
    console.log('[POSTGRES] Reset audit log inserted.');
    const checkTables = [
      'assistance_applications',
      'application_documents',
      'application_history',
      'beneficiary_asnaf_assessments',
      'beneficiary_assessments',
    ];
    for (const t of checkTables) {
      const res = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM "${t}";`);
      console.log(`  ${t.padEnd(35)}: ${Number(res[0]?.count || 0)} rows`);
    }

    const benRes = await prisma.$queryRawUnsafe('SELECT count(*) as count FROM "beneficiaries";');
    const userRes = await prisma.$queryRawUnsafe('SELECT count(*) as count FROM "users";');
    console.log(`  beneficiaries (preserved)        : ${Number(benRes[0]?.count || 0)} rows`);
    console.log(`  users (preserved)                : ${Number(userRes[0]?.count || 0)} rows`);
  } catch (err) {
    console.error('[POSTGRES ERROR]:', err);
  } finally {
    await prisma.$disconnect();
  }
}

resetPostgres().catch(console.error);
