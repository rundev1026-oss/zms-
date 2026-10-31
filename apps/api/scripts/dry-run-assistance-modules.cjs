const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client');

const dbPath = path.resolve(__dirname, '../../../data/zms.db');
if (!fs.existsSync(dbPath)) {
  console.log(JSON.stringify({ sqlite: 'missing', path: dbPath }));
  process.exit(0);
}

const db = createClient({ url: `file:${dbPath.replace(/\\/g, '/')}` });

async function count(sql) {
  const result = await db.execute(sql);
  return result.rows;
}

async function main() {
  const tables = await count("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
  const counts = [];
  for (const table of tables) {
    const rows = await count(`SELECT COUNT(*) AS c FROM "${table.name}"`);
    counts.push({ table: table.name, count: Number(rows[0].c) });
  }
  const status = await count(
    'SELECT status, COUNT(*) AS c FROM assistance_applications GROUP BY status ORDER BY c DESC',
  );
  const financeLinks = await count(`
    SELECT
      (SELECT COUNT(*) FROM financial_transactions WHERE application_id IS NOT NULL) AS tx_with_application,
      (SELECT COUNT(*) FROM assistance_execution_records WHERE is_confirmed = 1) AS confirmed_executions,
      (SELECT COUNT(*) FROM assistance_applications WHERE disbursed_amount IS NOT NULL AND CAST(disbursed_amount AS REAL) > 0) AS apps_with_disbursed_amount
  `);
  const split = await count(`
    WITH held AS (
      SELECT id FROM assistance_applications
      WHERE id IN (SELECT application_id FROM financial_transactions WHERE application_id IS NOT NULL)
         OR (disbursed_amount IS NOT NULL AND CAST(disbursed_amount AS REAL) > 0)
         OR id IN (SELECT application_id FROM assistance_execution_records WHERE is_confirmed = 1)
    )
    SELECT
      (SELECT COUNT(*) FROM assistance_applications) AS applications_total,
      (SELECT COUNT(*) FROM held) AS applications_held_for_finance,
      (SELECT COUNT(*) FROM assistance_applications WHERE id NOT IN (SELECT id FROM held)) AS applications_clearable,
      (SELECT COUNT(*) FROM application_documents WHERE application_id NOT IN (SELECT id FROM held)) AS documents_clearable,
      (SELECT COUNT(*) FROM application_documents WHERE application_id IN (SELECT id FROM held)) AS documents_held,
      (SELECT COUNT(*) FROM application_history WHERE application_id NOT IN (SELECT id FROM held)) AS history_clearable,
      (SELECT COUNT(*) FROM application_history WHERE application_id IN (SELECT id FROM held)) AS history_held,
      (SELECT COUNT(*) FROM beneficiary_assessments WHERE application_id NOT IN (SELECT id FROM held)) AS assessments_clearable,
      (SELECT COUNT(*) FROM beneficiary_assessments WHERE application_id IN (SELECT id FROM held)) AS assessments_held,
      (SELECT COUNT(*) FROM assistance_execution_records WHERE application_id NOT IN (SELECT id FROM held)) AS executions_clearable,
      (SELECT COUNT(*) FROM assistance_execution_records WHERE application_id IN (SELECT id FROM held)) AS executions_held
  `);
  console.log(JSON.stringify({
    sqlitePath: 'data/zms.db',
    counts: counts.filter((row) => row.count > 0),
    applicationStatus: status,
    financeLinks: financeLinks[0],
    split: split[0],
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
