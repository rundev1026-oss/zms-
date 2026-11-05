const fs = require('fs');
if (fs.existsSync('src/components/views/users/ManualPermissionModal.tsx')) {
  const c = fs.readFileSync('src/components/views/users/ManualPermissionModal.tsx', 'utf8');
  console.log('ManualPermissionModal lines:', c.split('\n').length);
  console.log(c.substring(0, 1000));
}

