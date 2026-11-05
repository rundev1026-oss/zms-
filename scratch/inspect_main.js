const fs = require('fs');
console.log('=== apps/api/src/main.ts ===');
console.log(fs.readFileSync('apps/api/src/main.ts', 'utf8').substring(0, 1500));

