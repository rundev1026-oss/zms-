const fs = require('fs');
const content = fs.readFileSync('src/components/views/AdminOrgAndSettingsViews.tsx', 'utf8');

console.log('--- API calls in AdminOrgAndSettingsViews ---');
const fetchMatches = [...content.matchAll(/fetch\(['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
console.log([...new Set(fetchMatches)]);

console.log('--- Key sections / tabs in AdminOrgAndSettingsViews ---');
const tabs = [...content.matchAll(/activeTab\s*===?\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
console.log([...new Set(tabs)]);

