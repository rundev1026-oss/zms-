import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:c:/Users/mukhl/Documents/GitHub/zms-/data/zms.db' });
const ck = await db.execute('PRAGMA wal_checkpoint(TRUNCATE)');
console.log('CHECKPOINT', JSON.stringify(ck.rows));
const n = await db.execute('SELECT COUNT(*) AS n FROM financial_transactions');
const a = await db.execute('SELECT COUNT(*) AS n FROM assistance_applications');
const g = await db.execute('SELECT COUNT(*) AS n FROM general_ledger_entries');
const b = await db.execute('SELECT COALESCE(SUM(current_balance),0) AS c, COALESCE(SUM(opening_balance),0) AS o FROM bank_accounts');
const info = await db.execute('PRAGMA table_info(beneficiaries)');
console.log('BEN_COLS', info.rows.map((r) => r.name).join(','));
const members = await db.execute('SELECT member_id, full_name, registration_no FROM beneficiaries');
console.log('MEMBERS', JSON.stringify(members.rows));
console.log(JSON.stringify({ tx: n.rows[0].n, apps: a.rows[0].n, gl: g.rows[0].n, bank: b.rows[0] }));
