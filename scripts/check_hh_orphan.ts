import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const hh = await client.execute("SELECT * FROM households WHERE id = 'hh-1792419138903'");
  console.log('Household hh-1792419138903:', hh.rows[0]);
}

main().catch(console.error);

