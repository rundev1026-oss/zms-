const fs = require('fs');

function searchMatches(dir, patterns) {
  const results = [];
  function walk(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach(ent => {
      const full = d + '/' + ent.name;
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== '.next') walk(full);
      } else if (ent.name.endsWith('.ts') || ent.name.endsWith('.tsx')) {
        const c = fs.readFileSync(full, 'utf8');
        patterns.forEach(p => {
          if (c.includes(p)) {
            results.push({ file: full, pattern: p });
          }
        });
      }
    });
  }
  walk(dir);
  return results;
}

console.log('--- Assistance Type & Asnaf references in API ---');
const apiRefs = searchMatches('apps/api/src', ['AssistanceType', 'assistance_types', 'AsnafCategory', 'asnaf_categories']);
console.log(apiRefs);

console.log('--- Assistance Type & Asnaf references in Frontend ---');
const feRefs = searchMatches('src', ['AssistanceType', 'assistance-types', 'asnaf_categories', 'asnaf/categories']);
console.log(feRefs);

