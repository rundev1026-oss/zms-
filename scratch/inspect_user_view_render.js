const fs = require('fs');
const content = fs.readFileSync('src/components/views/UserManagementView.tsx', 'utf8');

// check view mode or layout
console.log('Does it have card or grid or table?');
console.log('grid:', content.includes('grid-cols'));
console.log('table:', content.includes('<table') || content.includes('<thead'));
console.log('View mode state:', content.includes('viewMode'));

