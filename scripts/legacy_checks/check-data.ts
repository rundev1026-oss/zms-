import { getDb, initDb } from '../src/lib/db';
import { FinancialService } from '../src/services/financialService';

async function main() {
  await initDb();
  const db = getDb();
  const cols = await db.execute("PRAGMA table_info(cash_flow_workflows)");
  console.log('Columns in cash_flow_workflows:', cols.rows.map(r => r.name));
}

main().catch(console.error);
