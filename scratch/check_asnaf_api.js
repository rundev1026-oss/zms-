const http = require('http');

http.get('http://127.0.0.1:3000/api/admin/asnaf', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
}).on('error', e => console.error(e));
