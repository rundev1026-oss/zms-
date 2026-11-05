const fs = require('fs');
const content = fs.readFileSync('src/components/views/AdminOrgAndSettingsViews.tsx', 'utf8');
const idx = content.indexOf('export function BranchesAndDepartmentsView');
const slice = content.substring(idx, idx + 3500);
console.log(slice);

