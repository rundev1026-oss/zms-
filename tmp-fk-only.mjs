import { createClient } from '@libsql/client';
const live = createClient({ url: 'file:c:/Users/mukhl/Documents/GitHub/zms-/data/zms.db' });
const fks = await live.execute(`
  SELECT m.name AS tbl, p."table" AS parent, p."from" AS col, p.on_delete AS on_delete
  FROM sqlite_master m, pragma_foreign_key_list(m.name) p
  WHERE m.type = 'table'
  ORDER BY m.name
`);
for (const r of fks.rows) console.log(`${r.tbl} -> ${r.parent} (${r.col}) ${r.on_delete}`);
const files = await live.execute('SELECT file_url, file_name FROM workflow_attachments UNION ALL SELECT file_url, file_name FROM treasurer_transfer_evidence');
console.log('URLS', JSON.stringify(files.rows, null, 2));
const sub = await live.execute('SELECT code, target_amount, allocated_amount, disbursed_amount, remaining_amount, committed_amount, budget_adjustment FROM faqir_miskin_sub_funds');
console.log('SUB', JSON.stringify(sub.rows));
