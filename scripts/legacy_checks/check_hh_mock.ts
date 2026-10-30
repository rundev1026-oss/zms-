import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const bList = await client.execute("SELECT id, full_name, national_id, registration_no, household_id FROM beneficiaries WHERE household_id = 'hh-1792149119947'");
  console.log(`Count with hh-1792149119947: ${bList.rows.length}`);
  console.log('First 5:', bList.rows.slice(0, 5));
}

main().catch(console.error);

