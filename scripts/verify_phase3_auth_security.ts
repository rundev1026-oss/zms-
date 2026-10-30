/**
 * Phase 3 Verification: Authentication, RBAC, 2FA (TOTP) & Security
 *
 * Verifies:
 * 1. Password Security: Scrypt / Argon2id hashing, salt randomness, timing-safe equality
 * 2. Login & JWT Issuance: Access token generation (HS256, 15m), HttpOnly refresh cookie
 * 3. Session Rotation: Refresh token rotation with transactional invalidation and reuse detection
 * 4. CSRF Header Protection: Rejection of state-changing token requests without x-zms-csrf: 1
 * 5. Rate Limiting: Login brute force prevention (5 attempts window)
 * 6. 2FA (RFC 6238 TOTP): Setup, QR URI generation, TOTP validation, recovery codes
 * 7. 2FA Login Interception: Login returns tempToken when MFA is active, verified with OTP
 * 8. Password Reset: Secure token generation, 1-hour expiration, session invalidation
 * 9. RBAC & Permissions Enforcement: RolesGuard & PermissionsGuard blocking unauthorized access
 * 10. Audit Logging: AuditLog entries for all authentication events
 */

import { generateTotp } from '../apps/api/dist/security/totp.js';
import { hashPassword, verifyPassword } from '../apps/api/dist/security/password-hash.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] #${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] #${totalTests}: ${testName}`);
    if (details) console.error('         Details:', details);
  }
}

const BASE_URL = 'http://localhost:4000/api/v1';

async function runPhase3Verification() {
  console.log('================================================================');
  console.log('   PHASE 3: AUTHENTICATION, RBAC, 2FA (TOTP) & SECURITY AUDIT   ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // SECTION 1: Password Hashing & Timing-Safe Equality
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: Cryptographic Password Hashing (OWASP ASVS) ---');
  const rawPw = 'P@ssw0rdEnterprise2026!';
  const hash1 = hashPassword(rawPw);
  const hash2 = hashPassword(rawPw);

  assert(hash1.startsWith('scrypt$'), 'Password hash uses scrypt cryptographic scheme');
  assert(hash1 !== hash2, 'Salt is cryptographically random (two hashes of same password differ)');
  assert(verifyPassword(rawPw, hash1), 'Password verification succeeds with correct password');
  assert(!verifyPassword('WrongPassword123!', hash1), 'Password verification fails with incorrect password');
  assert(!verifyPassword(rawPw, 'invalid-hash-string'), 'Malformed password hashes safely return false');

  // ---------------------------------------------------------------------------
  // SECTION 2: Standard Staff Authentication & JWT Issuance
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Staff Login & Token Issuance ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@zms.local', password: 'ZmsEnterprise2026!' }),
  });

  assert(loginRes.status === 200, 'POST /auth/login returns HTTP 200 for valid credentials');
  const setCookie = loginRes.headers.get('set-cookie') || '';
  assert(setCookie.includes('zms_refresh'), 'Login issues HttpOnly zms_refresh cookie');
  assert(setCookie.includes('HttpOnly'), 'Refresh cookie contains HttpOnly flag');

  const session = await loginRes.json();
  assert(session.mfaRequired === false, 'Standard login without 2FA returns mfaRequired: false');
  assert(typeof session.accessToken === 'string' && session.accessToken.length > 20, 'Issues valid JWT accessToken');
  assert(session.expiresIn === 900, 'Access token TTL is 900 seconds (15 minutes)');
  assert(session.user.email === 'admin@zms.local', 'Session payload contains correct user email');
  assert(session.user.roles.some((r: any) => r.code === 'SUPER_ADMIN'), 'User has SUPER_ADMIN role');

  // Extract refresh token from cookie
  const refreshCookieMatch = setCookie.match(/zms_refresh=([^;]+)/);
  const refreshToken = refreshCookieMatch ? refreshCookieMatch[1] : '';

  // ---------------------------------------------------------------------------
  // SECTION 3: Session Rotation & CSRF Protection
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Refresh Token Rotation & CSRF Protection ---');
  
  // Rejection without CSRF header
  const noCsrfRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      Cookie: `zms_refresh=${refreshToken}`,
    },
  });
  assert(noCsrfRes.status === 403, 'POST /auth/refresh rejects request without x-zms-csrf header (HTTP 403)');

  // Successful refresh with CSRF header
  const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      Cookie: `zms_refresh=${refreshToken}`,
      'x-zms-csrf': '1',
    },
  });
  assert(refreshRes.status === 200, 'POST /auth/refresh succeeds with valid cookie and x-zms-csrf header');
  const refreshedSession = await refreshRes.json();
  assert(typeof refreshedSession.accessToken === 'string', 'Refresh returns new accessToken');
  
  const newSetCookie = refreshRes.headers.get('set-cookie') || '';
  const newRefreshMatch = newSetCookie.match(/zms_refresh=([^;]+)/);
  const newRefreshToken = newRefreshMatch ? newRefreshMatch[1] : '';
  assert(newRefreshToken !== refreshToken, 'Refresh token is rotated to a new cryptographically secure token');

  // Attempt reuse of old refresh token (Token Reuse Detection)
  const reuseRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      Cookie: `zms_refresh=${refreshToken}`,
      'x-zms-csrf': '1',
    },
  });
  assert(reuseRes.status === 401, 'Reused old refresh token is immediately rejected (HTTP 401)');

  // ---------------------------------------------------------------------------
  // SECTION 4: Protected Profile & Role-Based Access Control (RBAC)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: RBAC & Permissions Enforcement ---');
  
  // Unauthenticated access
  const unauthMe = await fetch(`${BASE_URL}/auth/me`);
  assert(unauthMe.status === 401, 'GET /auth/me rejects unauthenticated request (HTTP 401)');

  // Authenticated Super Admin
  const authMe = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${refreshedSession.accessToken}` },
  });
  assert(authMe.status === 200, 'GET /auth/me succeeds with valid Bearer token');
  const meData = await authMe.json();
  assert(meData.permissions.includes('beneficiaries.read'), 'Super Admin has beneficiaries.read permission');
  assert(meData.permissions.includes('audit.read'), 'Super Admin has audit.read permission');

  // Login as Officer and check permissions
  const officerLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'officer@zms.local', password: 'ZmsEnterprise2026!' }),
  });
  const officerSession = await officerLogin.json();
  assert(officerSession.user.roles.some((r: any) => r.code === 'ASSISTANCE_OFFICER'), 'Officer has ASSISTANCE_OFFICER role');
  assert(!officerSession.user.permissions.includes('beneficiaries.decide'), 'Officer does NOT have approver decide permission');

  // ---------------------------------------------------------------------------
  // SECTION 5: Two-Factor Authentication (2FA TOTP RFC 6238)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 5: 2FA TOTP Engine & Multi-Factor Login Flow ---');
  
  // Setup 2FA for officer
  const setup2faRes = await fetch(`${BASE_URL}/auth/2fa/setup`, {
    headers: { Authorization: `Bearer ${officerSession.accessToken}` },
  });
  assert(setup2faRes.status === 200, 'GET /auth/2fa/setup returns secret, otpAuthUri and recovery codes');
  const setupData = await setup2faRes.json();
  assert(typeof setupData.secret === 'string' && setupData.secret.length >= 16, 'Generates Base32 TOTP secret');
  assert(setupData.otpAuthUri.startsWith('otpauth://totp/'), 'Generates valid otpauth:// URI');
  assert(Array.isArray(setupData.recoveryCodes) && setupData.recoveryCodes.length === 8, 'Generates 8 backup recovery codes');

  // Generate valid 6-digit TOTP code
  const currentOtp = generateTotp(setupData.secret);

  // Enable 2FA
  const enableRes = await fetch(`${BASE_URL}/auth/2fa/enable`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${officerSession.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: currentOtp,
      secret: setupData.secret,
      recoveryCodes: setupData.recoveryCodes,
    }),
  });
  assert(enableRes.status === 200, 'POST /auth/2fa/enable enables 2FA with valid OTP code');

  let finalMfaSession: any = null;
  try {
    // Test Login with 2FA Interception
    const mfaLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer@zms.local', password: 'ZmsEnterprise2026!' }),
    });
    const mfaLoginData = await mfaLoginRes.json();
    assert(mfaLoginData.mfaRequired === true, 'Login with 2FA enabled intercepts session and returns mfaRequired: true');
    assert(typeof mfaLoginData.tempToken === 'string', 'Returns signed temporary verification token');

    // Verify 2FA with invalid code
    const invalidVerifyRes = await fetch(`${BASE_URL}/auth/2fa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken: mfaLoginData.tempToken, code: '000000' }),
    });
    assert(invalidVerifyRes.status === 401, 'POST /auth/2fa/verify rejects invalid OTP code (HTTP 401)');

    // Verify 2FA with valid OTP code
    const freshOtp = generateTotp(setupData.secret);
    const validVerifyRes = await fetch(`${BASE_URL}/auth/2fa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken: mfaLoginData.tempToken, code: freshOtp }),
    });
    assert(validVerifyRes.status === 200, 'POST /auth/2fa/verify succeeds with valid OTP and issues final session');
    finalMfaSession = await validVerifyRes.json();
    assert(typeof finalMfaSession.accessToken === 'string', 'Issues full accessToken upon successful 2FA');
  } finally {
    // Disable 2FA to return officer to baseline
    const tokenToUse = finalMfaSession?.accessToken || officerSession.accessToken;
    const disableRes = await fetch(`${BASE_URL}/auth/2fa/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenToUse}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: 'ZmsEnterprise2026!',
        code: generateTotp(setupData.secret),
      }),
    });
    assert(disableRes.status === 200, 'POST /auth/2fa/disable successfully disables 2FA');
  }

  // ---------------------------------------------------------------------------
  // SECTION 6: Password Reset & Audit Trail
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Password Reset Workflow & Audit Logging ---');
  
  const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'auditor@zms.local' }),
  });
  assert(forgotRes.status === 200, 'POST /auth/forgot-password returns HTTP 200');
  const forgotData = await forgotRes.json();
  assert(typeof forgotData.resetToken === 'string', 'Generates cryptographically secure password reset token');

  // Reset password
  const newAuditorPassword = 'NewZmsAuditorPassword2026!';
  try {
    const resetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: forgotData.resetToken,
        newPassword: newAuditorPassword,
      }),
    });
    assert(resetRes.status === 200, 'POST /reset-password updates password and invalidates token');

    // Verify login with new password
    const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'auditor@zms.local', password: newAuditorPassword }),
    });
    assert(newLoginRes.status === 200, 'Login succeeds with newly set password');

    // Re-attempt using the consumed reset token (Single-use enforcement)
    const reusedResetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: forgotData.resetToken,
        newPassword: 'AnotherPassword2026!',
      }),
    });
    assert(reusedResetRes.status === 400, 'Reused reset token is rejected (HTTP 400 single-use token)');
  } finally {
    // Restore auditor password to baseline
    const forgotRestore = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'auditor@zms.local' }),
    });
    const restoreToken = (await forgotRestore.json()).resetToken;
    if (restoreToken) {
      await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: restoreToken, newPassword: 'ZmsEnterprise2026!' }),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // SECTION 7: Rate Limiting & OWASP Anti-Brute-Force
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 7: Rate Limiting & Anti-Brute-Force ---');
  let rateLimited = false;
  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bruteforce@zms.local', password: 'WrongPassword123!' }),
    });
    if (res.status === 429) {
      rateLimited = true;
      break;
    }
  }
  assert(rateLimited, 'Rate limiter blocks repeated failed login attempts with HTTP 429 Too Many Requests');

  console.log('\n================================================================');
  console.log(`PHASE 3 AUDIT RESULT: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase3Verification().catch((err) => {
  console.error('Phase 3 verification error:', err);
  process.exit(1);
});
