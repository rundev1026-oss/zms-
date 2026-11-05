const fs = require('fs');

function searchMatches(dir, pattern) {
  const results = [];
  function walk(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach(ent => {
      const full = d + '/' + ent.name;
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== '.next') walk(full);
      } else if (ent.name.endsWith('.ts') || ent.name.endsWith('.tsx')) {
        const c = fs.readFileSync(full, 'utf8');
        if (c.includes(pattern)) results.push(full);
      }
    });
  }
  walk(dir);
  return results;
}

console.log('Routes using proxyToNest:', searchMatches('src/app/api', 'proxyToNest'));

