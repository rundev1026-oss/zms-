const fs = require('fs');
if (fs.existsSync('src/components/views/users/RoleManagementModal.tsx')) {
  const c = fs.readFileSync('src/components/views/users/RoleManagementModal.tsx', 'utf8');
  console.log('RoleManagementModal lines:', c.split('\n').length);
  console.log(c.substring(0, 1000));
}

