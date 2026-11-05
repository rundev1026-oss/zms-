const http = require('http');

const req = http.get('http://127.0.0.1:4000/api/v1/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('NestJS Health:', res.statusCode, data));
});
req.on('error', (err) => console.error('Error code:', err.code, err.message));
