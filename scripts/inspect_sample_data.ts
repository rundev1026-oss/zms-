import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  
  const bRes = await client.execute("SELECT * FROM beneficiaries LIMIT 2");
  console.log("Beneficiary sample:");
  console.log(JSON.stringify(bRes.rows[0], null, 2));

  const hRes = await client.execute("SELECT * FROM households LIMIT 2");
  console.log("\nHousehold sample:");
  console.log(JSON.stringify(hRes.rows[0], null, 2));

  const aRes = await client.execute("SELECT * FROM assistance_applications LIMIT 2");
  console.log("\nAssistance Application sample:");
  console.log(JSON.stringify(aRes.rows[0], null, 2));
}

main().catch(console.error);

