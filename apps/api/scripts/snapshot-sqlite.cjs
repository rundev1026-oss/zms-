const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client');

const source = path.resolve(__dirname, '../../../data/zms.db');
const target = path.resolve(__dirname, '../../../backups/zms-sqlite-20261031-2205.db');
const db = createClient({ url: `file:${source.replace(/\\/g, '/')}` });

db.execute(`VACUUM INTO '${target.replace(/\\/g, '/')}'`)
  .then(() => {
    const stat = fs.statSync(target);
    console.log(JSON.stringify({ backup: path.basename(target), bytes: stat.size }));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
