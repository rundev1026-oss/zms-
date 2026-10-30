import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const dupsWf = await client.execute("SELECT workflow_no, count(*) as cnt FROM cash_flow_workflows GROUP BY workflow_no HAVING cnt > 1");
  console.log("Duplicate workflow_no in SQLite:", dupsWf.rows);

  const dupsWdr = await client.execute("SELECT withdrawal_no, count(*) as cnt FROM cash_flow_withdrawals GROUP BY withdrawal_no HAVING cnt > 1");
  console.log("Duplicate withdrawal_no in SQLite:", dupsWdr.rows);
}

main().catch(console.error);

