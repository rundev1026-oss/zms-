const fs = require('fs');
const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const views = [...content.matchAll(/currentView\s*===\s*['"]([^'"]*)['"]/g)].map(m => m[1]);
console.log('Views handled in src/app/page.tsx:', [...new Set(views)]);

// also check switch cases or other views
const cases = [...content.matchAll(/case\s+['"]([^'"]*)['"]/g)].map(m => m[1]);
console.log('Cases in src/app/page.tsx:', [...new Set(cases)]);

