import { createClient } from '@libsql/client';

const live = createClient({ url: 'file:c:/Users/mukhl/Documents/GitHub/zms-/data/zms.db' });
const hist = await live.execute('PRAGMA table_info(application_history)');
console.log('HIST_COLS', hist.rows.map((r) => r.name).join(', '));
const rows = await live.execute('SELECT * FROM application_history');
console.log('HIST', JSON.stringify(rows.rows, null, 2));
const life = await live.execute('SELECT * FROM assistance_lifecycle_transitions');
console.log('LIFE', JSON.stringify(life.rows, null, 2));
const files = await live.execute('SELECT id, workflow_id, file_name, file_url, file_path FROM workflow_attachments');
console.log('FILES', JSON.stringify(files.rows, null, 2));
const ev = await live.execute('SELECT id, file_name, file_url, storage_path FROM treasurer_transfer_evidence');
console.log('EV_COLS');
const evInfo = await live.execute('PRAGMA table_info(treasurer_transfer_evidence)');
console.log(evInfo.rows.map((r) => r.name).join(', '));
const evRows = await live.execute('SELECT * FROM treasurer_transfer_evidence');
for (const r of evRows.rows) {
  const pick = {};
  for (const k of Object.keys(r)) {
    if (/file|url|path|name|id/i.test(k)) pick[k] = r[k];
  }
  console.log('EV', JSON.stringify(pick));
}
const sub = await live.execute(
  'SELECT code, name, percentage, target_amount, allocated_amount, disbursed_amount, remaining_amount, committed_amount, budget_adjustment FROM faqir_miskin_sub_funds'
);
console.log('SUB', JSON.stringify(sub.rows, null, 2));
const fks = await live.execute(`
  SELECT m.name AS tbl, p."table" AS parent, p."from" AS col, p.on_delete AS on_delete
  FROM sqlite_master m, pragma_foreign_key_list(m.name) p
  WHERE m.type = 'table'
  ORDER BY 1
`);
for (const r of fks.rows) console.log(`FK ${r.tbl} -> ${r.parent} (${r.col}) ${r.on_delete}`);
const seq = await live.execute('SELECT * FROM document_sequences');
console.log('SEQ', JSON.stringify(seq.rows, null, 2));
