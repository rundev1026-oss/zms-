const fs = require('fs');
if (fs.existsSync('src/lib/apiProxy.ts')) {
  console.log(fs.readFileSync('src/lib/apiProxy.ts', 'utf8'));
}

