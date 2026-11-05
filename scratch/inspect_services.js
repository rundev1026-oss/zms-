const fs = require('fs');

console.log('=== src/services/organizationService.ts (first 100 lines) ===');
if (fs.existsSync('src/services/organizationService.ts')) {
  const c = fs.readFileSync('src/services/organizationService.ts', 'utf8');
  console.log(c.substring(0, 1500));
}

console.log('=== src/services/beneficiaryService.ts (getAssistanceTypes) ===');
if (fs.existsSync('src/services/beneficiaryService.ts')) {
  const c = fs.readFileSync('src/services/beneficiaryService.ts', 'utf8');
  const idx = c.indexOf('getAssistanceTypes');
  if (idx !== -1) {
    console.log(c.substring(idx, idx + 1500));
  }
}

