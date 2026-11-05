const fs = require('fs');
const lines = fs.readFileSync('src/app/page.tsx', 'utf8').split('\n');
lines.forEach((l, idx) => {
  if (l.includes('<UserManagementView') || l.includes('<BranchesAndDepartmentsView') || l.includes('<AdminSettingsView')) {
    console.log('--- Line ' + (idx+1) + ' ---');
    console.log(lines.slice(Math.max(0, idx-5), idx+6).join('\n'));
  }
});

