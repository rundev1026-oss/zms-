import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const orphanHh = await client.execute("SELECT h.id, h.household_no, h.address, h.province, count(m.id) as member_count FROM households h LEFT JOIN beneficiaries b ON h.id = b.household_id LEFT JOIN household_members m ON h.id = m.household_id WHERE b.id IS NULL GROUP BY h.id");
  console.log('Households without beneficiaries in SQLite:', orphanHh.rows);
}

main().catch(console.error);

