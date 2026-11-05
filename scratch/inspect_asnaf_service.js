const fs = require('fs');
console.log(fs.readFileSync('apps/api/src/asnaf/asnaf.service.ts', 'utf8').substring(0, 1500));

