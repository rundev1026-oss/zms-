const fs = require('fs');
const lines = fs.readFileSync('src/app/page.tsx', 'utf8').split('\n');
lines.forEach((l, idx) => {
  if (l.includes("case 'users'") || l.includes("case 'branches-depts'") || l.includes("case 'settings'")) {
    console.log('--- Line ' + (idx+1) + ' ---');
    console.log(lines.slice(idx, idx+15).join('\n'));
  }
});

