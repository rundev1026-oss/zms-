const http = require('http');

http.get('http://127.0.0.1:3000/api/beneficiaries/assistance-types?includeInactive=true', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Assistance Types Count:', json.data?.length, 'Sample:', json.data?.[0]);
    } catch (e) {
      console.log('Error parsing:', data.substring(0, 200));
    }
  });
}).on('error', e => console.error(e));

