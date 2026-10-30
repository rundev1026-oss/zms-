// scripts/test-user-password-setup.mjs
import { createClient } from '@libsql/client';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.resolve(process.cwd(), 'data', 'zms.db');

const db = createClient({
  url: `file:${DB_PATH.replace(/\\/g, '/')}`,
});

async function runTests() {
  console.log('========================================================================');
  console.log('  ZMS: DEPARTMENT USER ACCOUNTS & PASSWORD SETUP VERIFICATION SUITE');
  console.log('========================================================================\n');

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
    // FIXTURE SETUP: Ensure u-3 is in pending_setup state for clean testing
    // -------------------------------------------------------------
    await db.execute(`
      UPDATE users 
      SET password_setup_status = 'pending_setup',
          password_hash = NULL,
          salt = NULL,
          session_token = NULL,
          session_expires_at = NULL
      WHERE id = 'u-3'
    `);

    // -------------------------------------------------------------
    // TEST 1: Super Admin (u-1) Authentication Verification
    // -------------------------------------------------------------
    console.log('--- TEST 1: Super Admin Authentication ---');
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@zakatfoundation.or.th',
        password: 'Zms@Secure2569!',
      }),
    });
    const adminJson = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Super Admin logs in with HTTP 200', `Got ${adminLoginRes.status}`);
    assert(adminJson.success === true, 'Super Admin login success is true');
    assert(adminJson.user?.role === 'super_admin', 'Super Admin role verified as super_admin');
    assert(adminJson.user?.passwordSetupStatus === 'completed', 'Super Admin passwordSetupStatus is completed');
    const adminToken = adminJson.token;
    assert(Boolean(adminToken), 'Super Admin session token generated');

    // -------------------------------------------------------------
    // TEST 2: Department User with pending_setup cannot login
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Department User (u-3) Blocked Prior to Password Setup ---');
    const officerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'officer@zakatfoundation.or.th',
        password: 'AnyPassword123!',
      }),
    });
    const officerJson = await officerLoginRes.json();
    assert(officerLoginRes.status === 401, 'Pending setup user login blocked with HTTP 401', `Got ${officerLoginRes.status}`);
    assert(
      officerJson.error && officerJson.error.includes('ยังไม่ได้ตั้งรหัสผ่าน'),
      'Clear guidance provided to check invite email or request new link from admin',
      `Got error: ${officerJson.error}`
    );

    // -------------------------------------------------------------
    // TEST 3: Public Registration Privilege Escalation Protection
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Public Registration Cannot Escalate Privileges ---');
    const testRegEmail = `test-escalation-${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Hacker',
        lastName: 'Attempt',
        email: testRegEmail,
        password: 'HackPassword@2569!',
        confirmPassword: 'HackPassword@2569!',
        role: 'super_admin', // Malicious attempt to self-assign super_admin
        pdpaConsent: true,
      }),
    });
    const regJson = await regRes.json();
    assert(regRes.status === 200, 'Public registration returns HTTP 200');
    assert(regJson.user?.role === 'member', 'Assigned role is strictly "member" regardless of request input');

    // Clean up test registration
    await db.execute({
      sql: `DELETE FROM users WHERE email = ?`,
      args: [testRegEmail],
    });

    // -------------------------------------------------------------
    // TEST 4: Admin Views Users Separated by Branch & Department
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Admin Views Users with Org Filters ---');
    const listRes = await fetch(`${BASE_URL}/api/admin/users?passwordSetupStatus=pending_setup`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const listJson = await listRes.json();
    assert(listRes.status === 200, 'Admin fetches users list with HTTP 200', `Got ${listRes.status}`);
    assert(Array.isArray(listJson.data), 'Returns array of users');
    assert(listJson.pendingSetupCount >= 4, `Pending setup counter reports pending accounts (count: ${listJson.pendingSetupCount})`);
    
    // Check fields branchName and departmentName exist
    const sampleUser = listJson.data.find(u => u.id === 'u-3');
    assert(Boolean(sampleUser), 'Found u-3 (Help Officer) in pending setup list');
    assert(Boolean(sampleUser?.branchName || sampleUser?.branch), 'Branch information populated');
    assert(Boolean(sampleUser?.departmentName), 'Department information populated');

    // -------------------------------------------------------------
    // TEST 5: Admin Sends Password Setup Invite for Department User (u-3)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Admin Sends Password Setup Invite ---');
    const inviteRes = await fetch(`${BASE_URL}/api/admin/users/u-3/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const inviteJson = await inviteRes.json();
    assert(inviteRes.status === 200, 'Admin sends invite with HTTP 200', `Got ${inviteRes.status}`);
    assert(inviteJson.success === true, 'Invite response reports success: true');
    assert(Boolean(inviteJson.rawToken), 'Invite response provides secure token');
    assert(inviteJson.setupUrl?.includes(inviteJson.rawToken), 'Setup URL contains token parameter');

    const setupToken = inviteJson.rawToken;

    // Verify token was stored as SHA-256 hash in DB, NOT plaintext
    const tokenDbCheck = await db.execute({
      sql: `SELECT token_hash, used FROM password_reset_tokens WHERE user_id = 'u-3' AND used = 0 ORDER BY created_at DESC LIMIT 1`,
    });
    assert(tokenDbCheck.rows.length > 0, 'Reset token recorded in database');
    assert(tokenDbCheck.rows[0].token_hash !== setupToken, 'Token stored in DB as cryptographic hash, not plaintext');
    assert(Number(tokenDbCheck.rows[0].used) === 0, 'Token initial state is unused (used = 0)');

    // -------------------------------------------------------------
    // TEST 6: User Sets Password via Setup URL
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Department User Completes Password Setup ---');
    const newOfficerPassword = 'Officer@Secure2569!';
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: setupToken,
        newPassword: newOfficerPassword,
        confirmPassword: newOfficerPassword,
      }),
    });
    const resetJson = await resetRes.json();
    assert(resetRes.status === 200, 'Password setup returns HTTP 200', `Got ${resetRes.status}`);
    assert(resetJson.success === true, 'Password setup completed successfully');

    // Check DB status of u-3
    const u3DbCheck = await db.execute({
      sql: `SELECT password_setup_status, password_hash, salt FROM users WHERE id = 'u-3'`,
    });
    assert(u3DbCheck.rows[0].password_setup_status === 'completed', 'DB status updated to completed');
    assert(Boolean(u3DbCheck.rows[0].password_hash), 'DB password_hash populated');
    assert(Boolean(u3DbCheck.rows[0].salt), 'DB unique salt populated');

    // -------------------------------------------------------------
    // TEST 7: Token Replay / Reuse Rejection
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Token Reuse Protection ---');
    const replayRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: setupToken,
        newPassword: 'AnotherPassword@2569!',
        confirmPassword: 'AnotherPassword@2569!',
      }),
    });
    const replayJson = await replayRes.json();
    assert(replayRes.status === 400, 'Reusing token returns HTTP 400', `Got ${replayRes.status}`);
    assert(
      replayJson.error && replayJson.error.includes('ถูกใช้งานไปแล้ว'),
      'Token reuse rejected with proper error message'
    );

    // -------------------------------------------------------------
    // TEST 8: Officer (u-3) Logs in with Newly Set Password
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Successful Login with Configured Password ---');
    const officerLoginSuccessRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'officer@zakatfoundation.or.th',
        password: newOfficerPassword,
      }),
    });
    const officerSuccessJson = await officerLoginSuccessRes.json();
    assert(officerLoginSuccessRes.status === 200, 'Department user logs in successfully with HTTP 200');
    assert(officerSuccessJson.success === true, 'Login response success is true');
    assert(officerSuccessJson.user?.role === 'officer', 'User role correctly assigned as officer');
    assert(officerSuccessJson.user?.passwordSetupStatus === 'completed', 'User passwordSetupStatus is completed');
    const officerToken = officerSuccessJson.token;
    assert(Boolean(officerToken), 'Session token generated for newly setup officer');

    // -------------------------------------------------------------
    // TEST 9: Role-Based Access Control - Officer cannot access Admin Users API
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: RBAC Enforcement (Officer cannot access Admin API) ---');
    const forbiddenRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: {
        'Authorization': `Bearer ${officerToken}`,
      },
    });
    assert(forbiddenRes.status === 403, 'Non-admin user blocked from Admin API with HTTP 403', `Got ${forbiddenRes.status}`);

    // -------------------------------------------------------------
    // TEST 10: Admin Provisions New Staff Account with Org Placement
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Admin Provisions New Staff Account ---');
    const newStaffEmail = `staff.test.${Date.now()}@zakatfoundation.or.th`;
    const createStaffRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'ซะการียา',
        lastName: 'มะแซ',
        email: newStaffEmail,
        phone: '081-999-8877',
        role: 'approver',
        branchId: 'br-hq',
        departmentId: 'dept-board',
        sendInvite: true,
      }),
    });
    const createStaffJson = await createStaffRes.json();
    assert(createStaffRes.status === 201, 'Staff account provisioned with HTTP 201', `Got ${createStaffRes.status}`);
    assert(createStaffJson.data?.passwordSetupStatus === 'pending_setup', 'New staff created in pending_setup state');
    assert(Boolean(createStaffJson.setupUrl), 'Setup URL generated for newly created staff');
    const newStaffId = createStaffJson.data?.id;

    // -------------------------------------------------------------
    // TEST 11: Account Suspension & Immediate Login Block
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Account Suspension ---');
    const suspendRes = await fetch(`${BASE_URL}/api/admin/users/${newStaffId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    const suspendJson = await suspendRes.json();
    assert(suspendRes.status === 200, 'Admin suspends account with HTTP 200');
    assert(suspendJson.data?.status === 'suspended', 'User status updated to suspended');

    // Attempt login as suspended user
    const suspendedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: newStaffEmail,
        password: 'AnyPassword@123',
      }),
    });
    const suspendedLoginJson = await suspendedLoginRes.json();
    assert(suspendedLoginRes.status === 401, 'Suspended user login rejected with HTTP 401');
    assert(
      suspendedLoginJson.error && suspendedLoginJson.error.includes('ถูกระงับ'),
      'Clear suspension notification returned on login attempt'
    );

    // -------------------------------------------------------------
    // TEST 12: Admin Self-Suspension Prevention
    // -------------------------------------------------------------
    console.log('\n--- TEST 12: Admin Self-Suspension Guard ---');
    const selfSuspendRes = await fetch(`${BASE_URL}/api/admin/users/u-1/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert(selfSuspendRes.status === 400, 'Self-suspension rejected with HTTP 400', `Got ${selfSuspendRes.status}`);

    // -------------------------------------------------------------
    // TEST 13: Clean up test staff user
    // -------------------------------------------------------------
    await db.execute({
      sql: `DELETE FROM users WHERE id = ?`,
      args: [newStaffId],
    });
    await db.execute({
      sql: `DELETE FROM password_reset_tokens WHERE user_id = ?`,
      args: [newStaffId],
    });

    // -------------------------------------------------------------
    // TEST 14: Session Revocation upon Logout
    // -------------------------------------------------------------
    console.log('\n--- TEST 14: Logout & Session Invalidation ---');
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${officerToken}`,
      },
    });
    assert(logoutRes.status === 200, 'Logout succeeds with HTTP 200');

    // Validate that officerToken is no longer valid
    const profileAfterLogoutRes = await fetch(`${BASE_URL}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${officerToken}`,
      },
    });
    assert(
      profileAfterLogoutRes.status === 401,
      'Revoked session token returns HTTP 401 Unauthorized',
      `Got ${profileAfterLogoutRes.status}`
    );

    // -------------------------------------------------------------
    // TEST 15: Security & Audit Check - No Plaintext Passwords in DB or Audit Logs
    // -------------------------------------------------------------
    console.log('\n--- TEST 15: No Plaintext Passwords in Logs or Profiles ---');
    const auditLeaks = await db.execute(`
      SELECT action, description FROM audit_logs 
      WHERE description LIKE '%Officer@Secure2569!%' 
         OR description LIKE '%Zms@Secure2569!%'
         OR description LIKE '%password_hash%'
    `);
    assert(auditLeaks.rows.length === 0, 'Zero plaintext passwords found in audit logs');

    const profileLeaks = await db.execute(`
      SELECT id, name, email FROM users
      WHERE password_hash = 'Officer@Secure2569!'
         OR password_hash = 'Zms@Secure2569!'
    `);
    assert(profileLeaks.rows.length === 0, 'Passwords properly salted and hashed, never stored as plaintext');

    console.log('\n========================================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
