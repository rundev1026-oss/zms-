const fs = require('fs');
const lines = fs.readFileSync('src/app/page.tsx', 'utf8').split('\n');
console.log(lines.slice(0, 45).join('\n'));

