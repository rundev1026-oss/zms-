const fs = require('fs');
const content = fs.readFileSync('src/components/views/UserManagementView.tsx', 'utf8');

console.log('--- API calls in UserManagementView ---');
const fetchMatches = [...content.matchAll(/fetch\(['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
console.log([...new Set(fetchMatches)]);

console.log('--- Modals or Subcomponents imported or used in UserManagementView ---');
const imports = [...content.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g)].map(m => m[0]);
console.log(imports.filter(i => i.includes('./') || i.includes('@/')));

console.log('--- Key state variables in UserManagementView ---');
const stateMatches = [...content.matchAll(/const\s+\[([a-zA-Z0-9_]+),\s*set[a-zA-Z0-9_]+\]\s*=\s*useState/g)].map(m => m[1]);
console.log(stateMatches.slice(0, 25));

