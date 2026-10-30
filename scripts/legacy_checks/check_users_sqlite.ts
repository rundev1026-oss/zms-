import { createClient } from '@libsql/client';
import * as path from 'path';

async function main() {
  const client = createClient({ url: 'file:' + path.resolve('data/zms.db').replace(/\\/g, '/') });
  const users = await client.execute("SELECT id, email, name, role, phone, branch FROM users");
  console.log("SQLite Users:");
  console.table(users.rows);
}

main().catch(console.error);

