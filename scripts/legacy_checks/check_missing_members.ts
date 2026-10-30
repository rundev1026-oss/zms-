import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const members = await client.execute("SELECT m.id, m.household_id, m.full_name, h.id as hid FROM household_members m LEFT JOIN households h ON m.household_id = h.id");
  for (const m of members.rows) {
    if (!m.hid) {
      console.log('Member with non-existent household in SQLite:', m);
    }
  }

  // Also check which members in SQLite have households with beneficiaries
  const benHh = await client.execute("SELECT DISTINCT household_id FROM beneficiaries");
  const benHhSet = new Set(benHh.rows.map(r => r.household_id));
  for (const m of members.rows) {
    if (!benHhSet.has(m.household_id)) {
      console.log('Member whose household has no beneficiary in SQLite:', m);
    }
  }
}

main().catch(console.error);

