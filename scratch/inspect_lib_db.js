const fs = require('fs');
if (fs.existsSync('src/lib/db.ts')) {
  console.log(fs.readFileSync('src/lib/db.ts', 'utf8').substring(0, 1500));
}

