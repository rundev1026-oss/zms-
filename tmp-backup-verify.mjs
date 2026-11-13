import { createClient } from '@libsql/client';

const livePath = 'c:/Users/mukhl/Documents/GitHub/zms-/data/zms.db';
const snapPath = 'c:/Users/mukhl/Documents/GitHub/zms-/data/backups/full-reset-20261113-174639/zms-consistent.db';

const live = createClient({ url: `file:${livePath}` });
await live.execute('PRAGMA foreign_keys = ON');
await live.execute(`VACUUM INTO '${snapPath}'`);

const snap = createClient({ url: `file:${snapPath}` });

async function counts(client) {
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  const out = {};
  for (const row of tables.rows) {
    const name = String(row.name);
    const c = await client.execute(`SELECT COUNT(*) AS n FROM "${name}"`);
    out[name] = Number(c.rows[0].n);
  }
  return out;
}

const a = await counts(live);
const b = await counts(snap);
const mismatch = Object.keys(a).filter((k) => a[k] !== b[k]);
console.log('TABLES', Object.keys(a).length);
console.log('MISMATCH', mismatch.length ? mismatch : 'none');
console.log('NONZERO');
for (const [k, v] of Object.entries(a)) {
  if (v > 0) console.log(`${k}\t${v}`);
}

const banks = await live.execute(
  'SELECT id, account_name, bank_name, account_number, status, opening_balance, current_balance, reconciled_balance FROM bank_accounts'
);
console.log('BANKS', JSON.stringify(banks.rows, null, 2));
const funds = await live.execute(
  'SELECT id, code, name, total_received, committed_amount, disbursed_amount, available_amount, target_goal FROM fund_accounts'
);
console.log('FUNDS', JSON.stringify(funds.rows, null, 2));
const alloc = await live.execute(
  'SELECT asnaf_code, percentage, target_amount, allocated_amount, disbursed_amount, remaining_amount, committed_amount FROM asnaf_allocations'
);
console.log('ALLOC', JSON.stringify(alloc.rows, null, 2));
const camps = await live.execute(
  'SELECT id, title, target_amount, raised_amount, donor_count, status FROM campaigns'
);
console.log('CAMPAIGNS', JSON.stringify(camps.rows, null, 2));
const faqir = await live.execute(
  'SELECT action_type, reason, substr(proportions_json,1,80) AS p FROM faqir_miskin_history LIMIT 2'
);
console.log('FAQIR_HIST', JSON.stringify(faqir.rows, null, 2));
const hist = await live.execute('SELECT id, action, notes FROM application_history');
console.log('APP_HIST', JSON.stringify(hist.rows, null, 2));
const fks = await live.execute(`
  SELECT m.name AS tbl, p."table" AS parent, p."from" AS col, p."on_delete" AS on_delete
  FROM sqlite_master m
  JOIN pragma_foreign_key_list(m.name) p
  WHERE m.type = 'table'
  ORDER BY 1, 2
`);
console.log('FKS');
for (const r of fks.rows) console.log(`${r.tbl} -> ${r.parent}.${r.col} ${r.on_delete}`);
