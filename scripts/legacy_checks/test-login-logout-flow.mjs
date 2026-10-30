// scripts/test-login-logout-flow.mjs
import { createClient } from '@libsql/client';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.resolve(process.cwd(), 'data', 'zms.db');

const db = createClient({
  url: `file:${DB_PATH.replace(/\\/g, '/')}`,
});

async function runTests() {
  console.log('===============================================================');
  console.log('  ZAKAT MANAGEMENT SYSTEM: LOGIN & LOGOUT VERIFICATION SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} -> ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Direct Access to /login
    // -------------------------------------------------------------
    console.log('--- TEST 1: Direct Access to /login ---');
    const res1 = await fetch(`${BASE_URL}/login`);
    const html1 = await res1.text();
    assert(res1.status === 200, 'Direct access to /login returns HTTP 200', `Got ${res1.status}`);
    assert(
      html1.includes('Zakat Management System') || html1.includes('เข้าสู่ระบบ'),
      '/login contains ZMS system branding & login elements'
    );

    // -------------------------------------------------------------
    // TEST 2: Successful Login with Valid Credentials
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Successful Login (Member) ---');
    const res2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'yusuf.donor@email.com',
        password: 'Zms@Secure2569!',
      }),
    });
    const json2 = await res2.json();
    const setCookieHeader = res2.headers.get('set-cookie') || '';

    assert(res2.status === 200, 'Valid credentials return HTTP 200', `Got ${res2.status}`);
    assert(json2.success === true, 'JSON response indicates success: true');
    assert(Boolean(json2.token), 'Response provides valid session token');
    assert(json2.user?.email === 'yusuf.donor@email.com', 'Authenticated user matches expected email');
    assert(json2.redirectUrl === '/my-account', 'Member redirectUrl is /my-account');
    assert(setCookieHeader.includes('zms_session='), 'Response sets zms_session HTTP cookie');
    assert(setCookieHeader.includes('HttpOnly'), 'zms_session cookie is HttpOnly for security');

    const activeToken = json2.token;

    // -------------------------------------------------------------
    // TEST 3: Failed Login with Invalid Password
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Failed Login (Wrong Password) ---');
    const res3 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'yusuf.donor@email.com',
        password: 'IncorrectPassword999!',
      }),
    });
    const json3 = await res3.json();
    assert(res3.status === 401, 'Invalid password returns HTTP 401', `Got ${res3.status}`);
    assert(json3.success === false, 'JSON response indicates success: false');
    assert(
      json3.error === 'อีเมล หมายเลขโทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง',
      'Generic non-revealing error message to prevent credential enumeration'
    );

    // -------------------------------------------------------------
    // TEST 4: Protected Routes Guard without Authentication
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Protected Routes Guard without Auth ---');
    const res4a = await fetch(`${BASE_URL}/api/auth/my-account`);
    assert(res4a.status === 401, '/api/auth/my-account rejects unauthenticated requests with 401');

    const res4b = await fetch(`${BASE_URL}/api/auth/profile`);
    assert(res4b.status === 401, '/api/auth/profile rejects unauthenticated requests with 401');

    const res4c = await fetch(`${BASE_URL}/my-account`, { redirect: 'manual' });
    const isRedirect = res4c.status === 307 || res4c.status === 308 || res4c.status === 302;
    const location = res4c.headers.get('location') || '';
    assert(
      isRedirect && location.includes('/login'),
      'Middleware redirects unauthenticated /my-account visitors to /login',
      `Status: ${res4c.status}, Location: ${location}`
    );

    // -------------------------------------------------------------
    // TEST 5: Authenticated Access Works with Valid Session
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Authenticated Data Access with Token ---');
    const res5 = await fetch(`${BASE_URL}/api/auth/my-account`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    const json5 = await res5.json();
    assert(res5.status === 200, 'Authenticated request to /api/auth/my-account succeeds with 200');
    assert(json5.data?.user?.email === 'yusuf.donor@email.com', 'Returns correct personal profile');
    assert(Array.isArray(json5.data?.transactions), 'Returns user personal transactions array');

    // -------------------------------------------------------------
    // TEST 6: Logout Execution & Session Termination
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Logout Execution & Cookie Clearance ---');
    const res6 = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        Cookie: `zms_session=${activeToken}`,
      },
    });
    const json6 = await res6.json();
    const logoutCookie = res6.headers.get('set-cookie') || '';

    assert(res6.status === 200, 'Logout request returns HTTP 200');
    assert(json6.success === true, 'Logout response indicates success: true');
    assert(
      logoutCookie.includes('Max-Age=0') || logoutCookie.includes('1970'),
      'zms_session cookie is properly cleared with Max-Age=0 / expired date'
    );

    // Verify session invalidated in SQLite DB
    const dbCheck = await db.execute({
      sql: `SELECT session_token FROM users WHERE email = ?`,
      args: ['yusuf.donor@email.com'],
    });
    const tokenInDb = dbCheck.rows[0]?.session_token;
    assert(
      tokenInDb === null || tokenInDb === undefined,
      'Session token is invalidated (NULL) in SQLite users table'
    );

    // -------------------------------------------------------------
    // TEST 7: Invalidation Check: Dead Session Rejected
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Post-Logout API Rejection ---');
    const res7a = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    assert(res7a.status === 401, '/api/auth/me rejects invalidated token with 401');

    const res7b = await fetch(`${BASE_URL}/api/auth/my-account`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    assert(res7b.status === 401, '/api/auth/my-account rejects invalidated token with 401');

    // -------------------------------------------------------------
    // TEST 8: Anti-Cache Security Headers (Browser Back Defense)
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Anti-Cache Security Headers ---');
    const res8 = await fetch(`${BASE_URL}/my-account`, { redirect: 'manual' });
    const cacheControl = res8.headers.get('cache-control') || '';
    assert(
      cacheControl.includes('no-store') && cacheControl.includes('no-cache'),
      'Protected routes contain Cache-Control: no-store, no-cache headers'
    );

    // -------------------------------------------------------------
    // TEST 9: Re-login Capability
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Re-login Capability ---');
    const res9 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'yusuf.donor@email.com',
        password: 'Zms@Secure2569!',
      }),
    });
    const json9 = await res9.json();
    assert(res9.status === 200, 'Re-login succeeds with HTTP 200');
    assert(Boolean(json9.token) && json9.token !== activeToken, 'New unique session token generated');

    const res9Me = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${json9.token}` },
    });
    assert(res9Me.status === 200, 'New session can immediately access /api/auth/me');

    // Clean up re-login session
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${json9.token}` },
    });

    // -------------------------------------------------------------
    // TEST 10: Multi-Role Authentication & Role Redirection
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Multi-Role Authentication ---');
    // Admin Login
    const resAdmin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@zakatfoundation.or.th',
        password: 'Zms@Secure2569!',
      }),
    });
    const jsonAdmin = await resAdmin.json();
    assert(resAdmin.status === 200, 'Super Admin login succeeds with 200');
    assert(jsonAdmin.user?.role === 'super_admin', 'Role is super_admin');
    assert(jsonAdmin.redirectUrl === '/#admin', 'Super Admin redirects to /#admin');

    // Clean up admin session
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jsonAdmin.token}` },
    });

    // Officer Login (Staff that completed individual password setup)
    const resOfficer = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'officer@zakatfoundation.or.th',
        password: 'Officer@Secure2569!',
      }),
    });
    const jsonOfficer = await resOfficer.json();
    assert(resOfficer.status === 200, 'Officer login succeeds with 200');
    assert(jsonOfficer.user?.role === 'officer', 'Role is officer');
    assert(jsonOfficer.redirectUrl === '/#admin', 'Officer redirects to /#admin');

    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jsonOfficer.token}` },
    });

    // Approver Login (Staff still pending password setup - must be blocked)
    const resApproverPending = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'approver@zakatfoundation.or.th',
        password: 'Zms@Secure2569!',
      }),
    });
    const jsonApproverPending = await resApproverPending.json();
    assert(resApproverPending.status === 401, 'Approver pending password setup is blocked with 401');
    assert(
      jsonApproverPending.error && jsonApproverPending.error.includes('ยังไม่ได้ตั้งรหัสผ่าน'),
      'Approver received proper pending password setup guidance'
    );

    // -------------------------------------------------------------
    // TEST 11: Audit Log Verification in Database
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Audit Trail Verification ---');
    const auditRes = await db.execute({
      sql: `SELECT action, description FROM audit_logs 
            WHERE action IN ('USER_LOGIN_SUCCESS', 'USER_LOGIN_FAILED', 'USER_LOGOUT') 
            ORDER BY timestamp DESC LIMIT 20`,
    });
    const actions = auditRes.rows.map((r) => r.action);
    assert(actions.includes('USER_LOGIN_SUCCESS'), 'Audit log contains USER_LOGIN_SUCCESS event');
    assert(actions.includes('USER_LOGIN_FAILED'), 'Audit log contains USER_LOGIN_FAILED event');
    assert(actions.includes('USER_LOGOUT'), 'Audit log contains USER_LOGOUT event');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  }
}

runTests();
