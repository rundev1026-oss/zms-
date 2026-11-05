const http = require('http');

http.get('http://127.0.0.1:3000/api/admin/assistance-models', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Assistance Models Status:', res.statusCode, 'Count:', json.data?.length, 'Sample:', json.data?.[0]);
    } catch (e) {
      console.log('Error parsing:', data);
    }
  });
}).on('error', e => console.error(e));

