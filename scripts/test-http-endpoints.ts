import http from 'http';

async function postJson(url: string, data: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode || 500, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function get(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.get(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
      },
      (res) => {
        resolve(res.statusCode || 500);
      }
    );
    req.on('error', reject);
  });
}

async function run() {
  console.log('Testing live HTTP Server endpoints on http://localhost:3000 ...');
  
  // 1. GET /
  const homeStatus = await get('http://localhost:3000/');
  console.log(`[HTTP TEST 1] GET / -> Status: ${homeStatus}`);
  
  // 2. Unregistered National ID
  const unregRes = await postJson('http://localhost:3000/api/assistance-requests/check-beneficiary', {
    nationalId: '1100500000007',
    actor: { id: 'u-7', role: 'member', nationalId: '1100500000007' }
  });
  console.log(`[HTTP TEST 2] Check Unregistered ID -> Status: ${unregRes.status}, Error: "${unregRes.data?.error}"`);
  
  // 3. Registered National ID
  const regRes = await postJson('http://localhost:3000/api/assistance-requests/check-beneficiary', {
    nationalId: '1100200000006',
    actor: { id: 'u-6', role: 'member', nationalId: '1100200000006' }
  });
  console.log(`[HTTP TEST 3] Check Registered ID -> Status: ${regRes.status}, Found: ${regRes.data?.found}, Name: ${regRes.data?.beneficiary?.fullName}`);
  
  // 4. Attempt to submit for other's ID
  const otherRes = await postJson('http://localhost:3000/api/assistance-requests/check-beneficiary', {
    nationalId: '1100200119922',
    actor: { id: 'u-6', role: 'member', nationalId: '1100200000006' }
  });
  console.log(`[HTTP TEST 4] Member Submit for Other -> Status: ${otherRes.status}, Error: "${otherRes.data?.error}"`);

  // 5. Cloud Storage Presigned URL generation
  const presignRes = await postJson('http://localhost:3000/api/storage/presign', {
    fileName: 'high_res_medical_scan.pdf',
    fileType: 'application/pdf',
    fileSize: 4500000,
    category: 'medical_cert',
    entityType: 'assistance_request',
    entityId: 'app-http-test',
  });
  console.log(`[HTTP TEST 5] Presign API -> Status: ${presignRes.status}, Provider: ${presignRes.data?.provider}, UploadUrl: ${presignRes.data?.uploadUrl?.substring(0, 45)}...`);

  // 6. Security & Privacy check on download endpoint
  const downloadRes = await postJson('http://localhost:3000/api/storage/presign', {
    fileName: 'hack_script.exe',
    fileType: 'application/x-msdownload',
    fileSize: 1000,
    category: 'id_card',
    entityType: 'assistance_request',
  });
  console.log(`[HTTP TEST 6] Reject Malicious MIME -> Status: ${downloadRes.status}, Error: "${downloadRes.data?.error}"`);

  console.log('\nAll Live HTTP tests executed successfully.');
}

run().catch((err) => {
  console.error('HTTP test error:', err);
  process.exit(1);
});
