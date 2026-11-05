const http = require('http');

http.get('http://127.0.0.1:3000/api/admin/roles', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Admin Roles from Next.js (port 3000):', res.statusCode, data.substring(0, 300)));
}).on('error', (err) => console.error('Error:', err.message));

