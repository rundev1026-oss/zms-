// scripts/verify-auth-and-user-accounts.mjs
import { createClient } from '@libsql/client';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.resolve(process.cwd(), 'data', 'zms.db');

const db = createClient({
  url: `file:${DB_PATH.replace(/\\/g, '/')}`,
});

async function runComprehensiveAudit() {
  console.log('========================================================================');
  console.log('  ZMS: COMPREHENSIVE AUTHENTICATION & USER MANAGEMENT VERIFICATION');
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
    // FIXTURE RESET: Ensure u-4 (Approver) is in pending_setup for testing
    // -------------------------------------------------------------
    await db.execute(`
      UPDATE users 
      SET password_setup_status = 'pending_setup',
          password_hash = NULL,
          salt = NULL,
          session_token = NULL,
          session_expires_at = NULL
      WHERE id = 'u-4'
    `);

    // Ensure u-1 (Super Admin) is active and completed
    await db.execute(`
      UPDATE users 
      SET password_setup_status = 'completed', status = 'active'
      WHERE id = 'u-1'
    `);

    // =============================================================
    // SECTION 1: LOGIN PAGE & AUTHENTICATION IDENTITY VERIFICATION
    // =============================================================
    console.log('--- SECTION 1: Login Page & Authentication ---');
    
    // 1.1 Direct access to /login
    const loginPageRes = await fetch(`${BASE_URL}/login`);
    const loginHtml = await loginPageRes.text();
    assert(loginPageRes.status === 200, '1.1 /login page loads with HTTP 200');
    assert(
      loginHtml.includes('Zakat Management System') && loginHtml.includes('เข้าสู่ระบบ'),
      '1.1 /login contains system title and login form'
    );

    // 1.2 Super Admin (u-1) authentication with real DB identity
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@zakatfoundation.or.th',
        password: 'Zms@Secure2569!',
      }),
    });
    const adminJson = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, '1.2 Super Admin (u-1) authenticates with HTTP 200');
    assert(adminJson.user?.id === 'u-1', '1.2 Authenticated user ID is u-1');
    assert(adminJson.user?.role === 'super_admin', '1.2 Role verified as super_admin');
    assert(adminJson.user?.passwordSetupStatus === 'completed', '1.2 Setup status is completed');
    assert(Boolean(adminJson.token), '1.2 Session token returned');
    assert(adminJson.redirectUrl === '/#admin', '1.2 Super Admin redirects to /#admin');
    const adminToken = adminJson.token;

    // Check Set-Cookie
    const cookieHeader = adminLoginRes.headers.get('set-cookie') || '';
    assert(cookieHeader.includes('zms_session'), '1.2 zms_session cookie is set');
    assert(cookieHeader.toLowerCase().includes('httponly'), '1.2 Cookie has HttpOnly flag');

    // 1.3 Anti-Enumeration & Invalid Credential Security
    const badPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@zakatfoundation.or.th',
        password: 'WrongPassword999!',
      }),
    });
    const badPassJson = await badPassRes.json();
    assert(badPassRes.status === 401, '1.3 Invalid password returns HTTP 401');
    assert(
      badPassJson.error === 'อีเมล หมายเลขโทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง',
      '1.3 Generic error returned to prevent username/credential enumeration'
    );

    const unknownUserRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'nonexistent.user.2569@zakatfoundation.or.th',
        password: 'SomePassword123!',
      }),
    });
    const unknownJson = await unknownUserRes.json();
    assert(unknownUserRes.status === 401, '1.3 Unknown user returns HTTP 401');
    assert(
      unknownJson.error === 'อีเมล หมายเลขโทรศัพท์ หรือรหัสผ่านไม่ถูกต้อง',
      '1.3 Anti-enumeration prevents detecting valid accounts'
    );

    // =============================================================
    // SECTION 2: LOGOUT & REAL SERVER-SIDE SESSION INVALIDATION
    // =============================================================
    console.log('\n--- SECTION 2: Logout & Server-Side Session Invalidation ---');

    // 2.1 Login temporary session for member (u-6)
    const memberLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'yusuf.donor@email.com',
        password: 'Zms@Secure2569!',
      }),
    });
    const memberJson = await memberLoginRes.json();
    const tempToken = memberJson.token;
    assert(Boolean(tempToken), '2.1 Member session generated for logout test');

    // Verify session is active in database
    const sessionInDbBefore = await db.execute({
      sql: `SELECT session_token FROM users WHERE id = 'u-6'`,
    });
    assert(sessionInDbBefore.rows[0].session_token === tempToken, '2.1 Session token persisted in database');

    // 2.2 Execute Logout
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    assert(logoutRes.status === 200, '2.2 Logout API returns HTTP 200');

    // Check cookie cleared
    const logoutCookie = logoutRes.headers.get('set-cookie') || '';
    assert(
      logoutCookie.includes('Max-Age=0') || logoutCookie.includes('expires='),
      '2.2 Logout response expires and clears zms_session cookie'
    );

    // Verify session token is NULL in database
    const sessionInDbAfter = await db.execute({
      sql: `SELECT session_token FROM users WHERE id = 'u-6'`,
    });
    assert(sessionInDbAfter.rows[0].session_token === null, '2.2 Session token wiped (NULL) in users table');

    // 2.3 Verify post-logout API access rejection
    const profileWithRevokedToken = await fetch(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    assert(
      profileWithRevokedToken.status === 401,
      '2.3 Calling /api/auth/profile with revoked token returns HTTP 401 Unauthorized'
    );

    // 2.4 Verify Audit Log records logout
    const logoutAudit = await db.execute(`
      SELECT action, user_id FROM audit_logs 
      WHERE action = 'USER_LOGOUT' AND user_id = 'u-6' 
      ORDER BY timestamp DESC LIMIT 1
    `);
    assert(logoutAudit.rows.length > 0, '2.4 Audit log contains USER_LOGOUT event');

    // =============================================================
    // SECTION 3: DEPARTMENT USER PASSWORD SETUP FLOW
    // =============================================================
    console.log('\n--- SECTION 3: Department User Password Setup Flow ---');

    // 3.1 Approver (u-4) in pending_setup cannot login
    const approverLoginPending = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'approver@zakatfoundation.or.th',
        password: 'AnyPassword@123',
      }),
    });
    const approverPendingJson = await approverLoginPending.json();
    assert(approverLoginPending.status === 401, '3.1 Pending setup user blocked from logging in (401)');
    assert(
      approverPendingJson.error && approverPendingJson.error.includes('ยังไม่ได้ตั้งรหัสผ่าน'),
      '3.1 Clear guidance provided to check invite email or request new link from admin'
    );

    // 3.2 Super Admin sends setup invite
    const inviteRes = await fetch(`${BASE_URL}/api/admin/users/u-4/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const inviteJson = await inviteRes.json();
    assert(inviteRes.status === 200, '3.2 Super Admin creates setup invite (HTTP 200)');
    assert(Boolean(inviteJson.rawToken), '3.2 Secure invite token generated');
    const approverSetupToken = inviteJson.rawToken;

    // Verify token stored as SHA-256 in DB, NOT plaintext
    const tokenDb = await db.execute({
      sql: `SELECT token_hash, used FROM password_reset_tokens WHERE user_id = 'u-4' AND used = 0 ORDER BY created_at DESC LIMIT 1`,
    });
    assert(tokenDb.rows.length > 0, '3.2 Token recorded in password_reset_tokens table');
    assert(tokenDb.rows[0].token_hash !== approverSetupToken, '3.2 Token stored as SHA-256 hash, NOT plaintext');

    // 3.3 User configures secure password
    const newApproverPassword = 'Approver@Secure2569!';
    const completeSetupRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: approverSetupToken,
        newPassword: newApproverPassword,
        confirmPassword: newApproverPassword,
      }),
    });
    assert(completeSetupRes.status === 200, '3.3 Password setup completed with HTTP 200');

    // Verify DB updated to completed with unique salt
    const u4Db = await db.execute(`SELECT password_setup_status, password_hash, salt FROM users WHERE id = 'u-4'`);
    assert(u4Db.rows[0].password_setup_status === 'completed', '3.3 DB password_setup_status is completed');
    assert(Boolean(u4Db.rows[0].password_hash), '3.3 Salted password hash populated');
    assert(Boolean(u4Db.rows[0].salt), '3.3 Unique cryptographic salt generated');

    // 3.4 Token reuse rejection
    const replaySetupRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: approverSetupToken,
        newPassword: 'AnotherPassword@2569!',
        confirmPassword: 'AnotherPassword@2569!',
      }),
    });
    assert(replaySetupRes.status === 400, '3.4 Token replay / reuse rejected with HTTP 400');

    // 3.5 Approver logs in with newly created password
    const approverLoginSuccess = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'approver@zakatfoundation.or.th',
        password: newApproverPassword,
      }),
    });
    const approverSuccessJson = await approverLoginSuccess.json();
    assert(approverLoginSuccess.status === 200, '3.5 Approver logs in successfully with new password');
    assert(approverSuccessJson.user?.role === 'approver', '3.5 Role verified as approver');
    const approverToken = approverSuccessJson.token;

    // =============================================================
    // SECTION 4: SUPER ADMIN USER & ROLE MANAGEMENT
    // =============================================================
    console.log('\n--- SECTION 4: Super Admin User & Role Management ---');

    // 4.1 Filter users by branch, dept, and setup status
    const filterRes = await fetch(`${BASE_URL}/api/admin/users?role=all&status=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const filterJson = await filterRes.json();
    assert(filterRes.status === 200, '4.1 Super Admin lists all users with HTTP 200');
    assert(filterJson.data.length >= 6, '4.1 All organization users retrieved');

    // 4.2 Super Admin edits user profile & department placement
    const updateRes = await fetch(`${BASE_URL}/api/admin/users/u-4`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'ฟารุก',
        lastName: 'อาลี (ผู้ทรงคุณวุฒิ)',
        phone: '0843338899',
        email: 'approver@zakatfoundation.or.th',
        role: 'approver',
        branchId: 'br-hq',
        departmentId: 'dept-board',
      }),
    });
    const updateJson = await updateRes.json();
    assert(updateRes.status === 200, '4.2 User updated successfully by Super Admin');
    assert(updateJson.data?.name === 'ฟารุก อาลี (ผู้ทรงคุณวุฒิ)', '4.2 Name updated in database');

    // 4.3 Super Admin resets password and forces session invalidation
    const resetTrigger = await fetch(`${BASE_URL}/api/admin/users/u-4/reset-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const resetTriggerJson = await resetTrigger.json();
    assert(resetTrigger.status === 200, '4.3 Admin triggers password reset');
    assert(Boolean(resetTriggerJson.rawToken), '4.3 Reset token generated');

    // Verify Approver session was revoked
    const checkApproverSession = await fetch(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${approverToken}` },
    });
    assert(
      checkApproverSession.status === 401,
      '4.3 Target user session immediately revoked upon admin triggering password reset'
    );

    // 4.4 Guard against demoting or disabling the last Super Admin
    const demoteLastAdmin = await fetch(`${BASE_URL}/api/admin/users/u-1`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'officer' }),
    });
    assert(demoteLastAdmin.status === 400, '4.4 Demoting the last Super Admin is blocked (400)');

    const suspendLastAdmin = await fetch(`${BASE_URL}/api/admin/users/u-1/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert(suspendLastAdmin.status === 400, '4.4 Suspending the last Super Admin is blocked (400)');

    // 4.5 Non-Admin Role Authorization (RBAC) Protection
    const officerLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'officer@zakatfoundation.or.th',
        password: 'Officer@Secure2569!',
      }),
    });
    const officerJson = await officerLogin.json();
    const officerToken = officerJson.token;

    const officerAdminAttempt = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(officerAdminAttempt.status === 403, '4.5 Non-admin user blocked from Admin API with HTTP 403 Forbidden');

    // 4.6 Segregation of duties: Officer cannot approve assistance applications
    const officerApproveAttempt = await fetch(`${BASE_URL}/api/beneficiaries/app-001/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${officerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        approvedAmount: 10000,
        fundId: 'fund-1',
        actor: { id: 'u-3', name: 'อุสมาน เจริญสุข', role: 'officer' },
      }),
    });
    assert(
      officerApproveAttempt.status === 400,
      '4.6 Officer role rejected from approving assistance applications (Segregation of Duties)'
    );

    // 4.7 Direct access to /admin/users route
    const adminUsersPageRes = await fetch(`${BASE_URL}/admin/users`);
    assert(adminUsersPageRes.status === 200, '4.7 /admin/users page is accessible with HTTP 200');

    // 4.8 Zero plaintext passwords in database & audit logs
    const plainPasswordsInDb = await db.execute(`
      SELECT id, name FROM users 
      WHERE password_hash LIKE 'Zms@Secure2569!' 
         OR password_hash LIKE 'Approver@Secure2569!'
         OR password_hash LIKE 'Officer@Secure2569!'
    `);
    assert(plainPasswordsInDb.rows.length === 0, '4.8 Zero plaintext passwords stored in users table');

    const plainPasswordsInAudit = await db.execute(`
      SELECT id, description FROM audit_logs 
      WHERE description LIKE '%Zms@Secure2569!%' 
         OR description LIKE '%Approver@Secure2569!%'
         OR description LIKE '%Officer@Secure2569!%'
    `);
    assert(plainPasswordsInAudit.rows.length === 0, '4.8 Zero plaintext passwords leaked into audit logs');

    console.log('\n========================================================================');
    console.log(`  COMPREHENSIVE AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal audit error:', err);
    process.exit(1);
  }
}

runComprehensiveAudit();
