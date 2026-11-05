const fs = require('fs');
const lines = fs.readFileSync('src/app/page.tsx', 'utf8').split('\n');
console.log('--- Lines 265 to 285 ---');
console.log(lines.slice(264, 285).join('\n'));

console.log('--- Lines 395 to 420 ---');
console.log(lines.slice(394, 420).join('\n'));

