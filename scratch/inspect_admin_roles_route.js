const fs = require('fs');
if (fs.existsSync('src/app/api/admin/roles/route.ts')) {
  console.log(fs.readFileSync('src/app/api/admin/roles/route.ts', 'utf8').substring(0, 1500));
} else {
  console.log('src/app/api/admin/roles/route.ts does not exist');
}

