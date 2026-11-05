const fs = require('fs');

['users', 'roles', 'permissions', 'settings', 'assistance', 'asnaf'].forEach(dir => {
  const p = 'apps/api/src/' + dir;
  fs.readdirSync(p).filter(f => f.includes('controller.ts')).forEach(f => {
    const content = fs.readFileSync(p + '/' + f, 'utf8');
    const ctrlMatch = content.match(/@Controller\(['"]([^'"]*)['"]\)/);
    const ctrl = ctrlMatch ? ctrlMatch[1] : '';
    console.log('\n=== ' + p + '/' + f + ' (base: ' + ctrl + ') ===');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      const match = l.match(/@(Get|Post|Put|Patch|Delete)\((?:['"]([^'"]*)['"])?\)/);
      if (match) {
        // find next function name
        const nextLines = lines.slice(idx, idx + 4).join(' ');
        const fnMatch = nextLines.match(/\s+([a-zA-Z0-9_]+)\s*\(/);
        console.log('  ' + match[1].padEnd(6) + ' ' + (match[2] ? match[2] : '/') + ' -> ' + (fnMatch ? fnMatch[1] : 'unknown'));
      }
    });
  });
});

