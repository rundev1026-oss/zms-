import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const dups = await client.execute("SELECT national_id, count(*) as cnt FROM beneficiaries GROUP BY national_id HAVING cnt > 1");
  console.log("Duplicate national_id in SQLite:", dups.rows);
}

main().catch(console.error);

