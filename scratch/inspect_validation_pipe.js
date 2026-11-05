const fs = require('fs');
if (fs.existsSync('apps/api/src/common/validation.pipe.ts')) {
  console.log(fs.readFileSync('apps/api/src/common/validation.pipe.ts', 'utf8'));
}

