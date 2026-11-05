const http = require('http');

http.get('http://127.0.0.1:4000/api/v1/asnaf/categories', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('NestJS Asnaf Categories Status:', res.statusCode, 'Data:', data.substring(0, 300)));
}).on('error', e => console.error(e));

