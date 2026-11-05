const fs = require('fs');
const lines = fs.readFileSync('src/components/views/UserManagementView.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('usersList.map(') || l.includes('paginatedUsers.map('));
if (start !== -1) {
  console.log(lines.slice(start, start + 60).join('\n'));
} else {
  console.log('Not found mapping');
}

