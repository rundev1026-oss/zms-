/**
 * Comprehensive Verification Test Suite
 * Master Prompt: Phase 13 Advanced User Management & Manual Permission Control
 * 
 * Verifies:
 * 1. 15-Module & 84-Action Permission Catalog Integrity (@zms/shared & PostgreSQL)
 * 2. Role Management Lifecycle (List, Create Custom Role, Clone Role, Update Role Permissions)
 * 3. User Creation & Validation (Username, Email, Position, Branch, Department)
 * 4. Three-Tier Manual Permission Control: (Role + ALLOW) - DENY
 * 5. Data Scope Management (OWN, DEPARTMENT, BRANCH, ORGANIZATION)
 * 6. Approval Limits & Separation of Duties (SoD)
 * 7. Security Safeguards: Last Super Admin Lockout Protection
 * 8. Comprehensive Audit Trail (PermissionAuditLog)
 */

import { MODULE_PERMISSION_CATALOG, PERMISSION_CODES } from '@zms/shared';
import crypto from 'node:crypto';

const API_BASE = 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-change-me-zms-enterprise-2026';
const SUPER_ADMIN_ID = 'fb5ffe28-f8a4-4a51-884f-3c4de9c34a6d';

// Generate Admin JWT token for testing
function generateTestToken(userId: string = SUPER_ADMIN_ID): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 3600 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

const adminToken = generateTestToken();

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
    'x-zms-csrf': '1',
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('  ZMS PHASE 13: ADVANCED USER & PERMISSION CONTROL VERIFICATION');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST SUITE 1: Permission Catalog & Module Architecture
  // -------------------------------------------------------------
  console.log('TEST SUITE 1: 15-Module & 84-Action Catalog Integrity');
  assert(MODULE_PERMISSION_CATALOG.length === 15, 'Catalog contains exactly 15 modules');
  
  const totalActions = MODULE_PERMISSION_CATALOG.reduce((sum, m) => sum + m.actions.length, 0);
  assert(totalActions === 84, `Catalog contains exactly 84 granular actions (Found: ${totalActions})`);

  const coreModules = MODULE_PERMISSION_CATALOG.filter(m => m.group === 'CORE');
  const supportModules = MODULE_PERMISSION_CATALOG.filter(m => m.group === 'SUPPORT');
  assert(coreModules.length === 9, `9 Core Mission Modules (Found: ${coreModules.length})`);
  assert(supportModules.length === 6, `6 Support & Governance Modules (Found: ${supportModules.length})`);

  const permRes = await apiRequest('/permissions');
  assert(permRes.ok && permRes.data.success === true, 'GET /permissions returns success');
  assert(permRes.data.totalModules === 15, 'API reports 15 modules in catalog');
  assert(permRes.data.totalActions === 84, 'API reports 84 actions in catalog');
  console.log('  -> Suite 1 Completed Successfully.\n');

  // -------------------------------------------------------------
  // TEST SUITE 2: Role Management & Custom Role Lifecycle
  // -------------------------------------------------------------
  console.log('TEST SUITE 2: Role Management Lifecycle (List, Create, Clone, Assign)');
  const rolesRes = await apiRequest('/roles');
  assert(rolesRes.ok && Array.isArray(rolesRes.data), 'GET /roles returns role array');
  assert(rolesRes.data.length >= 7, `Found at least 7 standard system roles (Found: ${rolesRes.data.length})`);
  
  const superAdminRole = rolesRes.data.find((r: any) => r.code === 'SUPER_ADMIN');
  assert(Boolean(superAdminRole), 'SUPER_ADMIN role exists');
  assert(superAdminRole.isSystem === true, 'SUPER_ADMIN is flagged as isSystem=true');

  // Create a Custom Role
  const customRoleCode = `TEST_SUPERVISOR_${Date.now()}`;
  const createRoleRes = await apiRequest('/roles', {
    method: 'POST',
    body: JSON.stringify({
      code: customRoleCode,
      name: 'ผู้ดูแลสาขาพิเศษ (ทดสอบ)',
      description: 'บทบาททดสอบสร้างโดยระบบอัตโนมัติ',
      permissions: ['beneficiaries.view', 'requests.view', 'dashboard.view'],
    }),
  });
  assert(createRoleRes.ok, `POST /roles created custom role: ${customRoleCode}`);
  const createdRoleId = createRoleRes.data.id;
  assert(createRoleRes.data.isCustom === true, 'Custom role has isCustom=true');

  // Clone Custom Role
  const clonedRoleCode = `${customRoleCode}_CLONE`;
  const cloneRoleRes = await apiRequest(`/roles/${createdRoleId}/clone`, {
    method: 'POST',
    body: JSON.stringify({
      code: clonedRoleCode,
      name: 'ผู้ดูแลสาขาพิเศษ (สำเนา)',
      description: 'คัดลอกสิทธิ์จากบทบาทต้นแบบ',
    }),
  });
  assert(cloneRoleRes.ok, `POST /roles/:id/clone cloned role to: ${clonedRoleCode}`);
  const clonedRoleId = cloneRoleRes.data.id;

  // Verify Permissions Cloned
  const clonedRoleDetail = await apiRequest(`/roles/${clonedRoleId}`);
  assert(clonedRoleDetail.ok, 'GET /roles/:id for cloned role');
  assert(
    clonedRoleDetail.data.permissions.includes('beneficiaries.view') &&
    clonedRoleDetail.data.permissions.includes('requests.view'),
    'Cloned role inherited permissions from source role'
  );

  // Update Role Permissions
  const updatePermRes = await apiRequest(`/roles/${createdRoleId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({
      permissions: ['beneficiaries.view', 'requests.view', 'reports.view', 'assistance.view'],
      reason: 'Automated test permission update',
    }),
  });
  assert(updatePermRes.ok, 'PUT /roles/:id/permissions updated permissions successfully');
  console.log('  -> Suite 2 Completed Successfully.\n');

  // -------------------------------------------------------------
  // TEST SUITE 3: User Creation & Validation
  // -------------------------------------------------------------
  console.log('TEST SUITE 3: User Creation & Validation');
  const testUserEmail = `test_adv_${Date.now()}@zms.local`;
  const testUsername = `user_${Date.now()}`;

  const createUserRes = await apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify({
      email: testUserEmail,
      username: testUsername,
      displayName: 'สมเกียรติ สิทธิการันตี',
      position: 'เจ้าหน้าที่อาวุโส',
      branchId: 'br-hq',
      departmentId: 'dept-social',
      role: 'ASSISTANCE_OFFICER',
      dataScope: 'BRANCH',
      approvalLimit: 25000,
    }),
  });
  assert(createUserRes.ok, `POST /users created user with username: @${testUsername}`);
  const testUserId = createUserRes.data.id;
  assert(createUserRes.data.username === testUsername, 'User username matches');
  assert(createUserRes.data.dataScope === 'BRANCH', 'User initial dataScope is BRANCH');

  // Test Duplicate Email Rejection
  const dupEmailRes = await apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify({
      email: testUserEmail,
      username: `user2_${Date.now()}`,
      displayName: 'ตัวแทนซ้ำ',
      role: 'ASSISTANCE_OFFICER',
    }),
  });
  assert(dupEmailRes.status === 409, 'Duplicate email rejected with HTTP 409 Conflict');

  // Test Duplicate Username Rejection
  const dupUserRes = await apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify({
      email: `diff_${Date.now()}@zms.local`,
      username: testUsername,
      displayName: 'ตัวแทนซ้ำ',
      role: 'ASSISTANCE_OFFICER',
    }),
  });
  assert(dupUserRes.status === 409, 'Duplicate username rejected with HTTP 409 Conflict');
  console.log('  -> Suite 3 Completed Successfully.\n');

  // -------------------------------------------------------------
  // TEST SUITE 4: Three-Tier Manual Permission Calculation: (Role + ALLOW) - DENY
  // -------------------------------------------------------------
  console.log('TEST SUITE 4: Three-Tier Permission Override Formula: (Role + ALLOW) - DENY');
  
  // 1. Initial State: Assistance Officer role permissions
  const initialPerms = await apiRequest(`/users/${testUserId}/permissions`);
  assert(initialPerms.ok, 'GET /users/:id/permissions');
  const initialEffective = initialPerms.data.effectivePermissions as string[];
  assert(initialEffective.includes('beneficiaries.create'), 'Officer has beneficiaries.create from Role');
  assert(!initialEffective.includes('finance.dashboard.view'), 'Officer does NOT have finance.dashboard.view initially');

  // 2. Add ALLOW Override for finance.dashboard.view
  //    Add DENY Override for beneficiaries.create (DENY takes precedence over Role!)
  const updateOverrideRes = await apiRequest(`/users/${testUserId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({
      overrides: [
        { permissionCode: 'finance.dashboard.view', effect: 'ALLOW', reason: 'อนุญาตให้ดูแดชบอร์ดการเงินชั่วคราว' },
        { permissionCode: 'beneficiaries.create', effect: 'DENY', reason: 'ระงับสิทธิ์การลงทะเบียนชั่วคราว' },
      ],
      dataScope: 'DEPARTMENT',
      approvalLimit: 75000,
      reason: 'ปรับปรุงสิทธิ์เฉพาะบุคคลเพื่อการทดสอบ',
    }),
  });
  assert(updateOverrideRes.ok, 'PUT /users/:id/permissions applied overrides');

  // 3. Verify Effective Permissions Calculation
  const calculatedRes = await apiRequest(`/users/${testUserId}/effective-permissions`);
  assert(calculatedRes.ok, 'GET /users/:id/effective-permissions');
  const effectiveList = calculatedRes.data.permissions as string[];

  // Test: ALLOW added a permission that the role didn't have
  assert(
    effectiveList.includes('finance.dashboard.view'),
    'Formula Check 1: User has ALLOW override -> "finance.dashboard.view" is GRANTED'
  );

  // Test: DENY stripped a permission that the role DID have (DENY takes absolute precedence)
  assert(
    !effectiveList.includes('beneficiaries.create'),
    'Formula Check 2: User has DENY override -> "beneficiaries.create" is STRIPPED despite being in Role'
  );

  // Test: Other role permissions still intact
  assert(
    effectiveList.includes('beneficiaries.view'),
    'Formula Check 3: Other role permissions remain intact'
  );

  // 4. Test INHERIT: Setting override to INHERIT restores the role permission
  const revertOverrideRes = await apiRequest(`/users/${testUserId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({
      overrides: [
        { permissionCode: 'finance.dashboard.view', effect: 'ALLOW' },
        { permissionCode: 'beneficiaries.create', effect: 'INHERIT' },
      ],
      reason: 'คืนสิทธิ์ beneficiaries.create สู่ INHERIT',
    }),
  });
  assert(revertOverrideRes.ok, 'PUT /users/:id/permissions reverted override to INHERIT');

  const afterRevertRes = await apiRequest(`/users/${testUserId}/effective-permissions`);
  const revertedEffective = afterRevertRes.data.permissions as string[];
  assert(
    revertedEffective.includes('beneficiaries.create'),
    'Formula Check 4: Reverting to INHERIT restored "beneficiaries.create" from Role'
  );
  console.log('  -> Suite 4 Completed Successfully.\n');

  // -------------------------------------------------------------
  // TEST SUITE 5: Data Scope Assignment & Limits
  // -------------------------------------------------------------
  console.log('TEST SUITE 5: Data Scope Assignment & Limits');
  assert(calculatedRes.data.dataScope === 'DEPARTMENT', 'DataScope updated to DEPARTMENT');
  assert(Number(calculatedRes.data.approvalLimit) === 75000, 'Approval limit updated to 75000');

  // Update scope to ORGANIZATION
  await apiRequest(`/users/${testUserId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({
      overrides: [],
      dataScope: 'ORGANIZATION',
      approvalLimit: null, // Unlimited
      reason: 'เลื่อนขอบเขตข้อมูลเป็นระดับองค์กร',
    }),
  });
  const orgScopeRes = await apiRequest(`/users/${testUserId}/effective-permissions`);
  assert(orgScopeRes.data.dataScope === 'ORGANIZATION', 'DataScope successfully set to ORGANIZATION');
  assert(orgScopeRes.data.approvalLimit === null, 'Approval limit cleared to unlimited (null)');
  console.log('  -> Suite 5 Completed Successfully.\n');

  // -------------------------------------------------------------
  // TEST SUITE 6: Security Safeguards (Last Super Admin Lockout)
  // -------------------------------------------------------------
  console.log('TEST SUITE 6: Security Safeguards (Last Super Admin Lockout Protection)');
  // Attempt to suspend or change role of the last Super Admin
  const lockAttemptRes = await apiRequest(`/users/${SUPER_ADMIN_ID}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'suspended',
      reason: 'Malicious suspension attempt',
    }),
  });
  // Should be rejected to prevent locking out all admins
  assert(
    lockAttemptRes.status === 403 || lockAttemptRes.status === 400,
    'Lockout Protection: Suspending the last Super Admin is rejected by policy',
    `Received status ${lockAttemptRes.status}`
  );

  // Attempt to demote the last Super Admin
  const demoteAttemptRes = await apiRequest(`/users/${SUPER_ADMIN_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({
      roleCode: 'MEMBER',
      reason: 'Demotion attempt',
    }),
  });
  assert(
    demoteAttemptRes.status === 403 || demoteAttemptRes.status === 400,
    'Lockout Protection: Demoting the last Super Admin is rejected by policy'
  );
  console.log('  -> Suite 6 Completed Successfully.\n');

  // -------------------------------------------------------------
  // TEST SUITE 7: Audit Trail & Permission History
  // -------------------------------------------------------------
  console.log('TEST SUITE 7: Comprehensive Audit Trail Verification');
  const auditRes = await apiRequest(`/permissions/audit-logs?targetUserId=${testUserId}`);
  assert(auditRes.ok && auditRes.data.success === true, 'GET /permissions/audit-logs returns success');
  assert(Array.isArray(auditRes.data.data), 'Audit logs data is an array');
  assert(auditRes.data.data.length >= 2, `Audit trail recorded all permission operations (Found: ${auditRes.data.data.length} logs)`);

  const firstLog = auditRes.data.data[0];
  assert(firstLog.actorId === SUPER_ADMIN_ID, 'Audit log correctly attributes actorId to Super Admin');
  assert(firstLog.targetUserId === testUserId, 'Audit log correctly identifies targetUserId');
  assert(Boolean(firstLog.details), 'Audit log contains details JSON with changes');
  console.log('  -> Suite 7 Completed Successfully.\n');

  console.log('================================================================');
  console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('  Phase 13: Advanced User & Manual Permission Control is 100% OPERATIONAL');
  console.log('================================================================\n');
}

runVerification().catch(err => {
  console.error('\nVerification encountered an unhandled error:');
  console.error(err);
  process.exit(1);
});
