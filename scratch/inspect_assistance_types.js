const fs = require('fs');

console.log('=== src/app/api/beneficiaries/assistance-types/route.ts ===');
if (fs.existsSync('src/app/api/beneficiaries/assistance-types/route.ts')) {
  console.log(fs.readFileSync('src/app/api/beneficiaries/assistance-types/route.ts', 'utf8'));
}

console.log('=== src/lib/constants/assistanceTypes.ts ===');
if (fs.existsSync('src/lib/constants/assistanceTypes.ts')) {
  console.log(fs.readFileSync('src/lib/constants/assistanceTypes.ts', 'utf8').substring(0, 2000));
}

