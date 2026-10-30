import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const res = await client.execute('SELECT household_id, count(*) as c FROM beneficiaries GROUP BY household_id HAVING c > 1');
  console.log('Households with multiple beneficiaries in SQLite:', res.rows.length);
  for (const r of res.rows) {
    console.log(r);
  }

  const orphaned = await client.execute('SELECT b.id, b.household_id FROM beneficiaries b LEFT JOIN households h ON b.household_id = h.id WHERE h.id IS NULL');
  console.log('Beneficiaries without matching household:', orphaned.rows.length);

  const hhOrphaned = await client.execute('SELECT h.id FROM households h LEFT JOIN beneficiaries b ON h.id = b.household_id WHERE b.id IS NULL');
  console.log('Households without matching beneficiary:', hhOrphaned.rows.length);
}

main().catch(console.error);

