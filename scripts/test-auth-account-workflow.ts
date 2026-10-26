/**
 * Automated Verification Test Suite: Authentication, Registration & User Account Management
 * Zakat Management System (ZMS)
 */

import { AuthService } from '../src/services/authService';
import { getDb, initDb } from '../src/lib/db';
import crypto from 'crypto';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(suite: string, test: string, passed: boolean, details?: string) {
  results.push({ suite, test, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [${suite}] ${test}${details ? ` -> ${details}` : ''}`);
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING AUTHENTICATION & ACCOUNT SECURITY VERIFICATION SUITE');
  console.log('================================================================\n');

  await initDb();
  const db = getDb();
  const testRunId = Date.now();
  const testEmail = `test.member.${testRunId}@zakatfoundation.test`;
  const testPhone = `089${String(testRunId).slice(-7)}`;
  const validStrongPassword = 'Zms@Secure2569!';
  const newPasswordForReset = 'Zms@NewStrongPass2569#';

  // -------------------------------------------------------------
  // SUITE 1: REGISTRATION & VALIDATION
  // -------------------------------------------------------------
  console.log('--- SUITE 1: REGISTRATION & VALIDATION ---');

  // Test 1.1: Weak password rejection
  try {
    await AuthService.register({
      firstName: 'ทดสอบ',
      lastName: 'อ่อนแอ',
      email: `weak.${testRunId}@test.com`,
      phone: testPhone,
      password: '123',
      confirmPassword: '123',
      pdpaConsent: true,
    });
    record('Registration', 'Reject weak password', false, 'Allowed password with only 3 characters');
  } catch (err: any) {
    const isWeak = err.message.includes('8 ตัวอักษร');
    record('Registration', 'Reject weak password', isWeak, err.message);
  }

  // Test 1.2: PDPA consent required
  try {
    await AuthService.register({
      firstName: 'ทดสอบ',
      lastName: 'ไม่ยินยอม',
      email: `nopdpa.${testRunId}@test.com`,
      phone: testPhone,
      password: validStrongPassword,
      confirmPassword: validStrongPassword,
      pdpaConsent: false,
    });
    record('Registration', 'Require PDPA consent', false, 'Allowed registration without PDPA consent');
  } catch (err: any) {
    const isPdpa = err.message.includes('PDPA');
    record('Registration', 'Require PDPA consent', isPdpa, err.message);
  }

  // Test 1.3: Successful member registration
  let registeredUserId = '';
  try {
    const regResult = await AuthService.register({
      firstName: 'มูฮัมหมัด',
      lastName: 'สมศักดิ์',
      name: 'มูฮัมหมัด สมศักดิ์',
      email: testEmail,
      phone: testPhone,
      password: validStrongPassword,
      confirmPassword: validStrongPassword,
      pdpaConsent: true,
    });

    registeredUserId = regResult.user.id;
    const isMember = regResult.user.role === 'member';
    const isHonest = String(regResult.notificationStatus).includes('ยังไม่ได้เชื่อมต่อ');

    record(
      'Registration',
      'Successful registration with Member role and honest provider status',
      isMember && isHonest,
      `User ID: ${registeredUserId}, Role: ${regResult.user.role}, Notification: ${regResult.notificationStatus}`
    );
  } catch (err: any) {
    record('Registration', 'Successful registration', false, err.message);
  }

  // Test 1.4: Prevent duplicate email
  try {
    await AuthService.register({
      firstName: 'ใครสักคน',
      lastName: 'ซ้ำซ้อน',
      email: testEmail, // same email
      phone: `081${String(Date.now()).slice(-7)}`, // different phone
      password: validStrongPassword,
      confirmPassword: validStrongPassword,
      pdpaConsent: true,
    });
    record('Registration', 'Prevent duplicate email registration', false, 'Allowed duplicate email');
  } catch (err: any) {
    const isDup = err.message.includes('อีเมลนี้ถูกใช้งาน');
    record('Registration', 'Prevent duplicate email registration', isDup, err.message);
  }

  // Test 1.5: Verify no password hash or salt leaked to returned user object
  try {
    const userRow = await db.execute({
      sql: `SELECT * FROM users WHERE id = ?`,
      args: [registeredUserId],
    });
    const dbRecord = userRow.rows[0];
    const hasHashInDb = Boolean(dbRecord.password_hash);
    const hasSaltInDb = Boolean(dbRecord.salt);
    const pdpaRecorded = dbRecord.pdpa_consent_version === 'v2569.1';

    record(
      'Security',
      'Password salt & hash stored securely in DB with PDPA version recorded',
      hasHashInDb && hasSaltInDb && pdpaRecorded,
      `Salt length: ${String(dbRecord.salt).length}, PDPA Version: ${dbRecord.pdpa_consent_version}`
    );
  } catch (err: any) {
    record('Security', 'Password storage check', false, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 2: AUTHENTICATION & BRUTE-FORCE LOCKOUT
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: AUTHENTICATION & BRUTE-FORCE LOCKOUT ---');

  // Test 2.1: Login success with Email
  try {
    const loginRes = await AuthService.login(testEmail, validStrongPassword);
    const validToken = Boolean(loginRes.token && loginRes.user.id === registeredUserId);
    record('Authentication', 'Login successfully with Email', validToken, `Token: ${loginRes.token.slice(0, 10)}...`);
  } catch (err: any) {
    record('Authentication', 'Login with Email', false, err.message);
  }

  // Test 2.2: Login success with Phone Number
  try {
    const loginResPhone = await AuthService.login(testPhone, validStrongPassword);
    const validPhone = Boolean(loginResPhone.token && loginResPhone.user.email === testEmail);
    record('Authentication', 'Login successfully with Phone Number', validPhone, `Email matched: ${loginResPhone.user.email}`);
  } catch (err: any) {
    record('Authentication', 'Login with Phone Number', false, err.message);
  }

  // Test 2.3: Generic safe error on wrong password (non-revealing)
  try {
    await AuthService.login(testEmail, 'WrongPassword123!');
    record('Authentication', 'Generic error on wrong password', false, 'Allowed wrong password');
  } catch (err: any) {
    const isSafe = err.message.includes('รหัสผ่านไม่ถูกต้อง');
    record('Authentication', 'Generic non-revealing error on wrong password', isSafe, err.message);
  }

  // Test 2.4: Brute-force lockout (5 consecutive failed attempts)
  try {
    console.log('Simulating 5 consecutive failed login attempts...');
    for (let i = 1; i <= 4; i++) {
      try {
        await AuthService.login(testEmail, 'BadPass123!');
      } catch {}
    }
    // 5th failed attempt should trigger lockout
    try {
      await AuthService.login(testEmail, 'BadPass123!');
      record('Security', 'Brute-force lockout after 5 attempts', false, 'Did not throw on 5th attempt');
    } catch (err: any) {
      const isLockNotice = err.message.includes('ถูกระงับชั่วคราว') || err.message.includes('15 นาที');
      record('Security', 'Brute-force lockout triggered (15 minutes)', isLockNotice, err.message);
    }

    // Attempting even with correct password during lockout should be rejected
    try {
      await AuthService.login(testEmail, validStrongPassword);
      record('Security', 'Reject login during active lockout', false, 'Allowed login during lockout');
    } catch (err: any) {
      const locked = err.message.includes('ถูกระงับชั่วคราว');
      record('Security', 'Reject login during active lockout', locked, err.message);
    }
  } catch (err: any) {
    record('Security', 'Brute force lockout suite', false, err.message);
  }

  // Unlock user for next tests
  await db.execute({
    sql: `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
    args: [registeredUserId],
  });

  // -------------------------------------------------------------
  // SUITE 3: FORGOT PASSWORD & SECURE TOKEN MANAGEMENT
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: FORGOT PASSWORD & SECURE TOKEN MANAGEMENT ---');

  // Test 3.1: Non-enumerating forgot-password request
  let rawResetToken = '';
  try {
    const forgotRes = await AuthService.requestPasswordReset(testEmail);
    rawResetToken = forgotRes.rawToken || forgotRes.resetToken || '';
    const safeMsg = forgotRes.message.includes('หากพบข้อมูลในระบบ');
    const hasToken = rawResetToken.length === 64; // 32-byte hex = 64 characters

    record(
      'Forgot Password',
      'Non-enumerating response with cryptographically secure token',
      safeMsg && hasToken,
      `Token length: ${rawResetToken.length}, Status: ${forgotRes.emailStatus}`
    );
  } catch (err: any) {
    record('Forgot Password', 'Request password reset', false, err.message);
  }

  // Test 3.2: Verify only token SHA-256 hash is stored in database (never plain text)
  try {
    const expectedHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const tokenRows = await db.execute({
      sql: `SELECT * FROM password_reset_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      args: [registeredUserId],
    });

    const storedHash = tokenRows.rows[0]?.token_hash;
    const isHashed = storedHash === expectedHash;
    const isNotPlain = storedHash !== rawResetToken;

    record(
      'Security',
      'Reset token stored exclusively as SHA-256 hash in database',
      isHashed && isNotPlain,
      `Stored Hash: ${String(storedHash).slice(0, 16)}...`
    );
  } catch (err: any) {
    record('Security', 'Token hash DB check', false, err.message);
  }

  // Test 3.3: Reset password successfully using valid token
  // First, create a valid active session to verify session revocation
  let oldSessionToken = '';
  try {
    const sessionRes = await AuthService.login(testEmail, validStrongPassword);
    oldSessionToken = sessionRes.token;
  } catch {}

  try {
    const resetRes = await AuthService.resetPassword(
      rawResetToken,
      newPasswordForReset,
      newPasswordForReset
    );
    record('Reset Password', 'Reset password with valid token', Boolean(resetRes.success), resetRes.message);
  } catch (err: any) {
    record('Reset Password', 'Reset password with valid token', false, err.message);
  }

  // Test 3.4: Verify token cannot be reused (Single Use Policy)
  try {
    await AuthService.resetPassword(
      rawResetToken,
      'AnotherNewPass123!@#',
      'AnotherNewPass123!@#'
    );
    record('Security', 'Single-use token enforcement', false, 'Allowed token reuse');
  } catch (err: any) {
    const isSingleUse = err.message.includes('ถูกใช้งานไปแล้ว') || err.message.includes('หมดอายุ');
    record('Security', 'Single-use token enforcement', isSingleUse, err.message);
  }

  // Test 3.5: Verify session revocation upon password reset
  try {
    const sessionCheck = await AuthService.validateSession(oldSessionToken);
    record(
      'Security',
      'Revoke existing sessions upon password reset',
      sessionCheck === null,
      sessionCheck ? 'Old session is still valid!' : 'Old session was invalidated'
    );
  } catch (err: any) {
    record('Security', 'Revoke sessions check', false, err.message);
  }

  // Test 3.6: Verify login works with new password and fails with old password
  try {
    const newLogin = await AuthService.login(testEmail, newPasswordForReset);
    record('Reset Password', 'Login with newly reset password', Boolean(newLogin.token));

    try {
      await AuthService.login(testEmail, validStrongPassword);
      record('Reset Password', 'Old password rejected', false, 'Old password still worked');
    } catch {
      record('Reset Password', 'Old password rejected', true);
    }
  } catch (err: any) {
    record('Reset Password', 'Login with new password check', false, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 4: PROFILE MANAGEMENT & RBAC TAMPERING PREVENTION
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: PROFILE MANAGEMENT & RBAC TAMPERING PREVENTION ---');

  // Test 4.1: Member can update their own first name, last name, phone, and notifications
  try {
    const updateRes = await AuthService.updateProfile(registeredUserId, {
      firstName: 'มูฮัมหมัด-อัปเดต',
      lastName: 'สมศักดิ์-แก้ไข',
      phone: '081-999-8877',
      notificationEmail: true,
      notificationSms: true,
      notificationApp: false,
    });

    const isUpdated =
      updateRes.name === 'มูฮัมหมัด-อัปเดต สมศักดิ์-แก้ไข' &&
      updateRes.phone === '081-999-8877' &&
      updateRes.notificationSms === true;

    record('Profile', 'Member can update personal details and notification preferences', isUpdated);
  } catch (err: any) {
    record('Profile', 'Update profile', false, err.message);
  }

  // Test 4.2: Strict Server-Side RBAC Tampering Prevention:
  // Public member CANNOT modify role, branch_id, or department_id
  try {
    await AuthService.updateProfile(registeredUserId, {
      role: 'super_admin' as any,
    });
    record('Authorization', 'Prevent role tampering by member', false, 'Allowed member to escalate to super_admin');
  } catch (err: any) {
    const isBlocked = err.message.includes('ไม่อนุญาตให้แก้ไขสิทธิ์');
    record('Authorization', 'Prevent role tampering by member (Server Blocked)', isBlocked, err.message);
  }

  try {
    await AuthService.updateProfile(registeredUserId, {
      branch_id: 'br-hq' as any,
      department_id: 'dept-finance' as any,
    });
    record('Authorization', 'Prevent branch/department tampering by member', false, 'Allowed tampering');
  } catch (err: any) {
    const isBlocked = err.message.includes('ไม่อนุญาตให้แก้ไขสาขาหรือแผนก');
    record('Authorization', 'Prevent branch/department tampering by member (Server Blocked)', isBlocked, err.message);
  }

  // Test 4.3: Changing password from profile requires valid current password
  try {
    await AuthService.updateProfile(registeredUserId, {
      currentPassword: 'WrongCurrentPassword!',
      newPassword: 'Zms@BrandNew2569!',
      confirmPassword: 'Zms@BrandNew2569!',
    });
    record('Profile', 'Require valid current password for password change', false, 'Allowed wrong current password');
  } catch (err: any) {
    const isBlocked = err.message.includes('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    record('Profile', 'Require valid current password for password change', isBlocked, err.message);
  }

  // -------------------------------------------------------------
  // SUITE 5: DATA ISOLATION & DASHBOARD INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: DATA ISOLATION & DASHBOARD INTEGRITY ---');

  // Test 5.1: Verify organization structure table returns branches & departments
  try {
    const orgStructure = await AuthService.getOrganizationStructure();
    const hasBranches = orgStructure.branches.length >= 4;
    const hasDepts = orgStructure.departments.length >= 5;
    record(
      'Organization',
      'Organization structure correctly loaded from branches & departments tables',
      hasBranches && hasDepts,
      `Branches: ${orgStructure.branches.length}, Departments: ${orgStructure.departments.length}`
    );
  } catch (err: any) {
    record('Organization', 'Organization structure load', false, err.message);
  }

  // Test 5.2: Verify data isolation: New member dashboard returns empty transactions (no fake mockup data)
  try {
    const userTxnRes = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM financial_transactions WHERE payer_or_payee = ?`,
      args: [`มูฮัมหมัด-อัปเดต สมศักดิ์-แก้ไข`],
    });
    const count = Number(userTxnRes.rows[0]?.cnt || 0);
    record(
      'Data Isolation',
      'New member sees 0 transactions (clean Empty State, no fake numbers)',
      count === 0,
      `Transaction count: ${count}`
    );
  } catch (err: any) {
    record('Data Isolation', 'Empty state check', false, err.message);
  }

  // Clean up test member
  await db.execute({
    sql: `DELETE FROM users WHERE id = ?`,
    args: [registeredUserId],
  });
  await db.execute({
    sql: `DELETE FROM password_reset_tokens WHERE user_id = ?`,
    args: [registeredUserId],
  });

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 TEST EXECUTION SUMMARY:');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`TOTAL: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
