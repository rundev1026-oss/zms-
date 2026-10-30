import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const dups = await client.execute("SELECT transaction_no, count(*) as cnt FROM financial_transactions GROUP BY transaction_no HAVING cnt > 1");
  console.log("Duplicate transaction_no in SQLite:", dups.rows);
}

main().catch(console.error);

