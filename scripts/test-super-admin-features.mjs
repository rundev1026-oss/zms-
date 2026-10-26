// scripts/test-super-admin-features.mjs
import { createClient } from '@libsql/client';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.resolve(process.cwd(), 'data', 'zms.db');

const db = createClient({
  url: `file:${DB_PATH.replace(/\\/g, '/')}`,
});

async function runTests() {
  console.log('========================================================================');
  console.log('  ZMS: SUPER ADMIN USER & PASSWORD MANAGEMENT TEST SUITE');
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
    // SETUP: Super Admin Login & Officer Login
    // -------------------------------------------------------------
    console.log('--- SETUP: Authenticating Test Personas ---');
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@zakatfoundation.or.th',
        password: 'Zms@Secure2569!',
      }),
    });
    const adminJson = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Super Admin login succeeds with 200');
    const adminToken = adminJson.token;
    assert(Boolean(adminToken), 'Super Admin token obtained');

    const officerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'officer@zakatfoundation.or.th',
        password: 'Officer@Secure2569!',
      }),
    });
    const officerJson = await officerLoginRes.json();
    assert(officerLoginRes.status === 200, 'Help Officer login succeeds with 200');
    const officerToken = officerJson.token;
    assert(Boolean(officerToken), 'Officer token obtained');

    // -------------------------------------------------------------
    // TEST 1: Super Admin Views User Details
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Super Admin Views User Details ---');
    const detailRes = await fetch(`${BASE_URL}/api/admin/users/u-3`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const detailJson = await detailRes.json();
    assert(detailRes.status === 200, 'Super Admin gets user details with 200');
    assert(detailJson.data?.id === 'u-3', 'Target user ID matches u-3');
    assert(Boolean(detailJson.data?.departmentName), 'Department name populated');
    assert(Boolean(detailJson.data?.branchName), 'Branch name populated');

    // -------------------------------------------------------------
    // TEST 2: Super Admin Edits User Profile (Name, Phone, Dept, Branch)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Super Admin Edits User Profile ---');
    const editRes = await fetch(`${BASE_URL}/api/admin/users/u-3`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'อุสมาน',
        lastName: 'เจริญสุข (อัปเดต)',
        email: 'officer@zakatfoundation.or.th',
        phone: '086-555-9999',
        role: 'officer',
        branchId: 'br-central',
        departmentId: 'dept-social',
      }),
    });
    const editJson = await editRes.json();
    assert(editRes.status === 200, 'Edit user succeeds with 200', `Got ${editRes.status}`);
    assert(editJson.data?.name === 'อุสมาน เจริญสุข (อัปเดต)', 'User full name updated');
    assert(editJson.data?.phone === '0865559999', 'User phone updated');

    // Revert user name back for consistency
    await fetch(`${BASE_URL}/api/admin/users/u-3`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'อุสมาน',
        lastName: 'เจริญสุข',
        email: 'officer@zakatfoundation.or.th',
        phone: '086-555-1234',
        role: 'officer',
        branchId: 'br-central',
        departmentId: 'dept-social',
      }),
    });

    // -------------------------------------------------------------
    // TEST 3: Email Uniqueness Enforcement during Edit
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Duplicate Email Check on Edit ---');
    const dupEmailRes = await fetch(`${BASE_URL}/api/admin/users/u-3`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: 'อุสมาน',
        lastName: 'เจริญสุข',
        email: 'admin@zakatfoundation.or.th', // Conflicts with Super Admin
      }),
    });
    const dupEmailJson = await dupEmailRes.json();
    assert(dupEmailRes.status === 400, 'Duplicate email update rejected with 400');
    assert(
      dupEmailJson.error && dupEmailJson.error.includes('ถูกใช้งานโดยผู้ใช้อื่น'),
      'Duplicate email error returned properly'
    );

    // -------------------------------------------------------------
    // TEST 4: Protection of Last Super Admin (Demotion & Suspension)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Guarding the Last Super Admin ---');
    // Attempt to demote u-1
    const demoteRes = await fetch(`${BASE_URL}/api/admin/users/u-1`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'officer',
      }),
    });
    assert(demoteRes.status === 400, 'Demoting last Super Admin rejected with 400');

    // Attempt to suspend u-1
    const suspendAdminRes = await fetch(`${BASE_URL}/api/admin/users/u-1/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    assert(suspendAdminRes.status === 400, 'Suspending last Super Admin rejected with 400');

    // -------------------------------------------------------------
    // TEST 5: Super Admin Password Reset & Active Session Invalidation
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Password Reset by Super Admin & Session Invalidation ---');
    // Officer is currently logged in with officerToken
    const profileBeforeReset = await fetch(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(profileBeforeReset.status === 200, 'Officer session active before reset');

    // Super Admin triggers password reset for u-3
    const resetTriggerRes = await fetch(`${BASE_URL}/api/admin/users/u-3/reset-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const resetTriggerJson = await resetTriggerRes.json();
    assert(resetTriggerRes.status === 200, 'Super Admin triggers password reset with 200');
    assert(resetTriggerJson.success === true, 'Reset response success is true');
    assert(Boolean(resetTriggerJson.rawToken), 'Reset token generated');
    assert(Boolean(resetTriggerJson.resetUrl), 'Reset URL generated');
    const officerResetToken = resetTriggerJson.rawToken;

    // Verify officer session was revoked immediately by the reset trigger
    const profileAfterResetTrigger = await fetch(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(
      profileAfterResetTrigger.status === 401,
      'Officer session immediately revoked upon admin triggering password reset'
    );

    // Officer completes password reset via token
    const newOfficerPass = 'Officer@Secure2569!';
    const completeResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: officerResetToken,
        newPassword: newOfficerPass,
        confirmPassword: newOfficerPass,
      }),
    });
    assert(completeResetRes.status === 200, 'Officer completes password reset with 200');

    // Officer re-logins with new password
    const officerReLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'officer@zakatfoundation.or.th',
        password: newOfficerPass,
      }),
    });
    const officerReLoginJson = await officerReLoginRes.json();
    assert(officerReLoginRes.status === 200, 'Officer logs in successfully with new password');
    const newOfficerToken = officerReLoginJson.token;

    // -------------------------------------------------------------
    // TEST 6: Admin Explicitly Revokes User Session
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Explicit User Session Revocation ---');
    const revokeRes = await fetch(`${BASE_URL}/api/admin/users/u-3/revoke-session`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(revokeRes.status === 200, 'Admin revokes session with 200');

    // Check that newOfficerToken is now 401
    const checkRevoked = await fetch(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${newOfficerToken}` },
    });
    assert(checkRevoked.status === 401, 'Target user session invalidated after explicit revocation');

    // -------------------------------------------------------------
    // TEST 7: Super Admin Views User Audit Logs
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Super Admin Views User Audit Trail ---');
    const auditRes = await fetch(`${BASE_URL}/api/admin/users/u-3/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditJson = await auditRes.json();
    assert(auditRes.status === 200, 'Admin fetches user audit logs with 200');
    assert(Array.isArray(auditJson.data), 'Audit logs returned as array');
    const actions = auditJson.data.map(l => l.action);
    assert(
      actions.includes('PASSWORD_RESET_TRIGGERED_BY_ADMIN') || actions.includes('USER_SESSION_REVOKED_BY_ADMIN'),
      'Audit log recorded admin actions for target user'
    );

    // -------------------------------------------------------------
    // TEST 8: Non-Admin Access Control (RBAC Enforcement)
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: RBAC Access Control ---');
    // Login as member (u-6)
    const memberLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'yusuf.donor@email.com',
        password: 'Zms@Secure2569!',
      }),
    });
    const memberJson = await memberLogin.json();
    const memberToken = memberJson.token;

    // Member attempts to edit another user
    const memberEditAttempt = await fetch(`${BASE_URL}/api/admin/users/u-3`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'super_admin' }),
    });
    assert(memberEditAttempt.status === 403, 'Member blocked from PUT /api/admin/users with 403');

    // Member attempts to reset password for another user
    const memberResetAttempt = await fetch(`${BASE_URL}/api/admin/users/u-3/reset-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(memberResetAttempt.status === 403, 'Member blocked from reset-password API with 403');

    // Member attempts to revoke sessions
    const memberRevokeAttempt = await fetch(`${BASE_URL}/api/admin/users/u-3/revoke-session`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(memberRevokeAttempt.status === 403, 'Member blocked from revoke-session API with 403');

    // Member attempts to read audit logs
    const memberAuditAttempt = await fetch(`${BASE_URL}/api/admin/users/u-3/audit-logs`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(memberAuditAttempt.status === 403, 'Member blocked from audit-logs API with 403');

    // -------------------------------------------------------------
    // TEST 9: Direct Access to /admin/users Page
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Direct Access to /admin/users Page ---');
    const pageRes = await fetch(`${BASE_URL}/admin/users`);
    const pageHtml = await pageRes.text();
    assert(pageRes.status === 200, '/admin/users returns HTTP 200', `Got ${pageRes.status}`);

    console.log('\n========================================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
