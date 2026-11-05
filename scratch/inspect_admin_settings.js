const fs = require('fs');
const content = fs.readFileSync('src/components/views/AdminOrgAndSettingsViews.tsx', 'utf8');
const idx = content.indexOf('export function AdminSettingsView');
if (idx !== -1) {
  const slice = content.substring(idx, idx + 4000);
  console.log(slice.substring(0, 1500));
}

