import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const bList = await client.execute("SELECT id, household_id, full_name, national_id, registration_no, registration_status, asnaf_category FROM beneficiaries LIMIT 10");
  console.log("Sample 10 beneficiaries in SQLite:");
  console.table(bList.rows);

  const statusCounts = await client.execute("SELECT registration_status, count(*) as c FROM beneficiaries GROUP BY registration_status");
  console.log("\nBeneficiary status counts in SQLite:");
  console.table(statusCounts.rows);
}

main().catch(console.error);

