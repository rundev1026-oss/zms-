import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const dups = await client.execute("SELECT registration_no, count(*) as cnt FROM beneficiaries GROUP BY registration_no HAVING cnt > 1");
  console.log("Duplicate registration_no in SQLite:", dups.rows);

  const nulls = await client.execute("SELECT count(*) as cnt FROM beneficiaries WHERE registration_no IS NULL OR registration_no = ''");
  console.log("Null/Empty registration_no in SQLite:", nulls.rows[0].cnt);
}

main().catch(console.error);

