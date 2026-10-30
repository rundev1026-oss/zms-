import { getDb, initDb } from '../src/lib/db';

async function main() {
  await initDb();
  const db = getDb();
  await db.execute("UPDATE bank_accounts SET current_balance = 2300000.00 WHERE id = 'bank-1'");
  const res = await db.execute("SELECT id, bank_name, account_name, current_balance FROM bank_accounts");
  console.log('Bank Accounts in DB:');
  for (const row of res.rows) {
    console.log(` - ${row.id}: ${row.bank_name} - ${row.account_name} | Balance: ฿${Number(row.current_balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`);
  }
}

main().catch(console.error);
