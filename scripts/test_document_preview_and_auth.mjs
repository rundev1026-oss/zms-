/**
 * Automated Verification Script for ZMS Document Preview, Authentication & File Access
 * Runs 10 comprehensive test scenarios covering backend APIs, security constraints, and error handling.
 */

const BASE_URL = 'http://localhost:3000';
const NEST_URL = 'http://localhost:4000/api/v1';

async function runTests() {
  console.log('================================================================');
  console.log('ZMS DOCUMENT PREVIEW & AUTHENTICATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  // Helper function
  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Authenticate as Super Admin to get valid JWT token
  console.log('--- Setup: Authenticating as Super Admin ---');
  let adminToken = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@zms.local', password: 'ZmsEnterprise2026!' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.token, 'Login succeeded and returned JWT');
    adminToken = loginData.token;
  } catch (err) {
    assert(false, `Login failed: ${err.message}`);
  }

  // 2. Scenario 1: Authenticated PDF Preview via Bearer Header
  console.log('\n--- Scenario 1: PDF Document Preview via Bearer Header ---');
  try {
    const res = await fetch(`${BASE_URL}/api/storage/file/doc-1794367508423-mh5f?action=preview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const contentType = res.headers.get('content-type') || '';
    const contentDisp = res.headers.get('content-disposition') || '';
    const buf = await res.arrayBuffer();

    assert(res.status === 200, `Returns HTTP 200 OK (got ${res.status})`);
    assert(contentType.includes('application/pdf'), `Content-Type is application/pdf (got "${contentType}")`);
    assert(contentDisp.startsWith('inline'), `Content-Disposition is inline (got "${contentDisp}")`);
    assert(buf.byteLength > 100000, `Received complete PDF stream (${buf.byteLength} bytes)`);
  } catch (err) {
    assert(false, `Scenario 1 failed: ${err.message}`);
  }

  // 3. Scenario 2: Authenticated Image Preview (JPG)
  console.log('\n--- Scenario 2: JPG Image Preview via Bearer Header ---');
  try {
    const res = await fetch(`${BASE_URL}/api/storage/file/doc-1794367517949-v9q9?action=preview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const contentType = res.headers.get('content-type') || '';
    const contentDisp = res.headers.get('content-disposition') || '';
    const buf = await res.arrayBuffer();

    assert(res.status === 200, `Returns HTTP 200 OK (got ${res.status})`);
    assert(contentType.includes('image/jpeg'), `Content-Type is image/jpeg (got "${contentType}")`);
    assert(contentDisp.startsWith('inline'), `Content-Disposition is inline (got "${contentDisp}")`);
    assert(buf.byteLength > 500000, `Received complete image stream (${buf.byteLength} bytes)`);
  } catch (err) {
    assert(false, `Scenario 2 failed: ${err.message}`);
  }

  // 4. Scenario 3: Document Download Mode
  console.log('\n--- Scenario 3: Document Download (action=download) ---');
  try {
    const res = await fetch(`${BASE_URL}/api/storage/file/doc-1794367508423-mh5f?action=download`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const contentDisp = res.headers.get('content-disposition') || '';
    const buf = await res.arrayBuffer();

    assert(res.status === 200, `Returns HTTP 200 OK (got ${res.status})`);
    assert(contentDisp.startsWith('attachment'), `Content-Disposition is attachment (got "${contentDisp}")`);
    assert(buf.byteLength > 100000, `Downloaded complete file (${buf.byteLength} bytes)`);
  } catch (err) {
    assert(false, `Scenario 3 failed: ${err.message}`);
  }

  // 5. Scenario 4: HTTP-only Cookie Authentication (No Query String Token)
  console.log('\n--- Scenario 4: Authentication via Cookie zms_session ---');
  try {
    const res = await fetch(`${BASE_URL}/api/storage/file/doc-1794367508423-mh5f?action=preview`, {
      headers: {
        Cookie: `zms_session=${adminToken}`,
        // Simulate frontend when authToken is 'cookie-session'
        Authorization: 'Bearer cookie-session',
      },
    });
    const contentType = res.headers.get('content-type') || '';
    const buf = await res.arrayBuffer();

    assert(res.status === 200, `Returns HTTP 200 OK with cookie-session fallback (got ${res.status})`);
    assert(contentType.includes('application/pdf'), `Content-Type is PDF (got "${contentType}")`);
    assert(buf.byteLength > 100000, `Received file via cookie authentication (${buf.byteLength} bytes)`);
  } catch (err) {
    assert(false, `Scenario 4 failed: ${err.message}`);
  }

  // 6. Scenario 5: Rejection of Unauthenticated Request
  console.log('\n--- Scenario 5: Unauthenticated Access Rejection ---');
  try {
    const res = await fetch(`${BASE_URL}/api/storage/file/doc-1794367508423-mh5f`);
    const body = await res.json().catch(() => ({}));

    assert(res.status === 401, `Returns HTTP 401 Unauthorized (got ${res.status})`);
    assert(body.error?.includes('เข้าสู่ระบบ'), `Returns friendly login prompt (got "${body.error}")`);
  } catch (err) {
    assert(false, `Scenario 5 failed: ${err.message}`);
  }

  // 7. Scenario 6: Rejection of Invalid/Expired Token
  console.log('\n--- Scenario 6: Invalid/Expired Token Rejection ---');
  try {
    const res = await fetch(`${BASE_URL}/api/storage/file/doc-1794367508423-mh5f`, {
      headers: { Authorization: 'Bearer invalid-token-123456789' },
    });
    const body = await res.json().catch(() => ({}));

    assert(res.status === 401, `Returns HTTP 401 Unauthorized (got ${res.status})`);
    assert(body.error?.includes('หมดอายุ') || body.error?.includes('ไม่ถูกต้อง'), `Returns session expired message (got "${body.error}")`);
  } catch (err) {
    assert(false, `Scenario 6 failed: ${err.message}`);
  }

  // 8. Scenario 7: Non-existent Document (404 Not Found)
  console.log('\n--- Scenario 7: Non-existent Document Handling ---');
  try {
    const res = await fetch(`${BASE_URL}/api/storage/file/doc-non-existent-99999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const body = await res.json().catch(() => ({}));

    assert(res.status === 404, `Returns HTTP 404 Not Found (got ${res.status})`);
    assert(body.error?.includes('ไม่พบไฟล์เอกสาร'), `Returns accurate 404 message (got "${body.error}")`);
  } catch (err) {
    assert(false, `Scenario 7 failed: ${err.message}`);
  }

  // 9. Scenario 8: NestJS Document Content Proxying with Fallback
  console.log('\n--- Scenario 8: Document Content Proxying (/api/documents/[id]/content) ---');
  try {
    const res = await fetch(`${BASE_URL}/api/documents/doc-1794367508423-mh5f/content?inline=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const contentType = res.headers.get('content-type') || '';
    const buf = await res.arrayBuffer();

    assert(res.status === 200, `Returns HTTP 200 OK via /api/documents content route (got ${res.status})`);
    assert(contentType.includes('application/pdf'), `Content-Type is PDF (got "${contentType}")`);
    assert(buf.byteLength > 100000, `Proxy fallback returned correct file buffer (${buf.byteLength} bytes)`);
  } catch (err) {
    assert(false, `Scenario 8 failed: ${err.message}`);
  }

  // 10. Scenario 9: Security Constraint - Rejecting Query String Token
  console.log('\n--- Scenario 9: Security Rule - Disallow Query String Token ---');
  try {
    // Attempt to access without Bearer or Cookie, ONLY passing token in query string
    const res = await fetch(`${BASE_URL}/api/storage/file/doc-1794367508423-mh5f?token=${encodeURIComponent(adminToken)}`);
    const body = await res.json().catch(() => ({}));

    assert(res.status === 401, `Query string token is NOT accepted (HTTP 401, got ${res.status})`);
    assert(body.error?.includes('เข้าสู่ระบบ'), `Denies access requiring headers/cookies (got "${body.error}")`);
  } catch (err) {
    assert(false, `Scenario 9 failed: ${err.message}`);
  }

  // 11. Scenario 10: Role-Based Access Control (Approver & Officer access)
  console.log('\n--- Scenario 10: Approver & Officer Access Verification ---');
  try {
    const approverLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'approver@zms.local', password: 'ZmsEnterprise2026!' }),
    });
    const approverData = await approverLogin.json();
    assert(approverLogin.status === 200 && approverData.token, 'Approver login succeeded');

    const previewRes = await fetch(`${BASE_URL}/api/storage/file/doc-1794367508423-mh5f?action=preview`, {
      headers: { Authorization: `Bearer ${approverData.token}` },
    });
    assert(previewRes.status === 200, `Approver can preview document (HTTP 200, got ${previewRes.status})`);
  } catch (err) {
    assert(false, `Scenario 10 failed: ${err.message}`);
  }

  // Final Summary
  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
