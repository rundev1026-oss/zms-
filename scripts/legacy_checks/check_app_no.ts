import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const dups = await client.execute("SELECT application_no, count(*) as cnt FROM assistance_applications GROUP BY application_no HAVING cnt > 1");
  console.log("Duplicate application_no in SQLite:", dups.rows);
}

main().catch(console.error);

