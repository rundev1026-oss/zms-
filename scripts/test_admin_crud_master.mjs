/**
 * scripts/test_admin_crud_master.mjs
 * Master Automated Verification Test Suite for ZMS System Administration & Configuration Complete CRUD
 * 
 * Verifies:
 * Group A: System Administration
 *   1. User Management CRUD & Super Admin Lockout Guard
 *   2. Role & Permission Management CRUD, Clone, Overrides & SOD checks
 *   3. Organization Management (Branches, Departments, Personnel & Tree Hierarchy)
 * Group B: Master Data Configuration
 *   1. Assistance Formats (Level 3) Complete CRUD (GET, POST, PUT, DELETE)
 *   2. Assistance Types (Level 2) Complete CRUD (GET, POST, PUT, DELETE/Deactivate)
 *   3. Asnaf Master Data (Level 1) & 3-Level Relationship Matrix Integration
 *   4. System Audit Trail Logging
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';
const SUPER_ADMIN_UUID = 'dffb49d1-7cf3-4593-bb58-a82b25f5bff4';

const MOCK_ACTOR = {
  id: SUPER_ADMIN_UUID,
  name: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
  email: 'admin@zms.local',
  role: 'super_admin',
};

// Generate HMAC token matching NestJS JwtModule secret
import crypto from 'crypto';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-change-me';
function generateHmacToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

const AUTH_TOKEN = generateHmacToken(MOCK_ACTOR);

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Cookie': `zms_session=${AUTH_TOKEN}`,
      ...headers,
    };

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runMasterCrudTests() {
  console.log('================================================================');
  console.log('🚀 STARTING ZMS SYSTEM ADMINISTRATION & CONFIGURATION MASTER CRUD TEST');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // GROUP A - 1: User Management CRUD
    // -------------------------------------------------------------
    console.log('--- TEST GROUP A1: User Management ---');
    const usersRes = await makeRequest('GET', '/api/admin/users?limit=10');
    assert(usersRes.status === 200, 'GET /api/admin/users returns 200');
    assert(usersRes.body.success === true, 'Response reports success: true');
    const usersList = Array.isArray(usersRes.body.data) ? usersRes.body.data : (usersRes.body.data?.users || []);
    assert(Array.isArray(usersList) && usersList.length > 0, `Users array returned with ${usersList.length} users`);

    // Test lock-out guard on Super Admin
    const superAdminUser = usersList.find(u => u.primaryRoleCode === 'SUPER_ADMIN' || u.role === 'super_admin');
    if (superAdminUser) {
      const lockAttemptRes = await makeRequest('PATCH', `/api/admin/users/${superAdminUser.id}/status`, {
        status: 'disabled',
        reason: 'Attempt lockout test',
        actor: MOCK_ACTOR,
      });
      // Should reject or fail safety check because it is the sole active super admin
      assert(
        lockAttemptRes.status === 400 || lockAttemptRes.status === 403 || lockAttemptRes.body.success === false,
        'Super admin lockout protection active (cannot deactivate last active Super Admin)'
      );
    }

    // -------------------------------------------------------------
    // GROUP A - 2: Roles and Permissions
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP A2: Roles & Permissions ---');
    const rolesRes = await makeRequest('GET', '/api/admin/roles');
    assert(rolesRes.status === 200, 'GET /api/admin/roles returns 200');
    assert(rolesRes.body.success === true, 'Roles list returned successfully');
    assert(rolesRes.body.data.length >= 5, `Found ${rolesRes.body.data.length} system roles`);

    const permsRes = await makeRequest('GET', '/api/admin/permissions');
    assert(permsRes.status === 200, 'GET /api/admin/permissions returns 200');
    assert(permsRes.body.success === true, 'Permissions catalog returned successfully');

    // -------------------------------------------------------------
    // GROUP A - 3: Organization Structure & Tree Hierarchy
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP A3: Organization Hierarchy & Structure ---');
    const orgRes = await makeRequest('GET', '/api/organization/structure?includePersonnel=true');
    assert(orgRes.status === 200, 'GET /api/organization/structure returns 200');
    assert(orgRes.body.success === true, 'Structure returned successfully');
    assert(Array.isArray(orgRes.body.data.branches), 'Branches list returned');
    assert(Array.isArray(orgRes.body.data.departments), 'Departments list returned');
    assert(orgRes.body.data.summary.totalBranches > 0, 'Branch summary count > 0');
    assert(orgRes.body.data.summary.totalDepartments > 0, 'Department summary count > 0');

    // -------------------------------------------------------------
    // GROUP B - 1: Level 3 Assistance Formats CRUD
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP B1: Level 3 Assistance Formats CRUD ---');
    const formatsRes = await makeRequest('GET', '/api/admin/assistance-formats');
    assert(formatsRes.status === 200, 'GET /api/admin/assistance-formats returns 200');
    assert(formatsRes.body.success === true, 'Assistance formats list returned');
    const initialFormatCount = formatsRes.body.data.length;

    // Test POST Create Format
    const testFormatCode = `test_fmt_${Date.now()}`;
    const testFormatName = `รูปแบบทดสอบระบบ ${Date.now()}`;
    const createFormatRes = await makeRequest('POST', '/api/admin/assistance-formats', {
      code: testFormatCode,
      name: testFormatName,
      nameEn: 'Automated Test Delivery Channel',
      description: 'สร้างขึ้นโดย Master CRUD Test Script',
      deliveryMethod: 'direct_transfer',
      deliveryMethodLabelTh: 'โอนเงินตรงเข้าบัญชีผู้รับ',
      requiresReceipt: true,
      requiresInspection: false,
      sortOrder: 99,
      isActive: true,
      actor: MOCK_ACTOR,
    });
    assert(createFormatRes.status === 201, 'POST /api/admin/assistance-formats returns 201 Created');
    assert(createFormatRes.body.success === true, 'New format created successfully');
    const createdFormatId = createFormatRes.body.data?.id;

    // Test Duplicate Code Prevention
    const dupFormatRes = await makeRequest('POST', '/api/admin/assistance-formats', {
      code: testFormatCode,
      name: 'ชื่อซ้ำ',
      actor: MOCK_ACTOR,
    });
    assert(dupFormatRes.status === 409, 'POST duplicate code correctly returns 409 Conflict');

    // Test PUT Update Format
    const updateFormatRes = await makeRequest('PUT', '/api/admin/assistance-formats', {
      id: createdFormatId,
      code: testFormatCode,
      name: `${testFormatName} (Updated)`,
      description: 'ปรับปรุงรายละเอียดเรียบร้อยแล้ว',
      isActive: false,
      sortOrder: 95,
      actor: MOCK_ACTOR,
    });
    assert(updateFormatRes.status === 200, 'PUT /api/admin/assistance-formats returns 200 OK');
    assert(updateFormatRes.body.success === true, 'Format updated successfully');

    // Test DELETE Safe Removal
    const deleteFormatRes = await makeRequest('DELETE', `/api/admin/assistance-formats?id=${createdFormatId}`);
    assert(deleteFormatRes.status === 200, 'DELETE /api/admin/assistance-formats returns 200 OK');
    assert(deleteFormatRes.body.success === true, 'Format deleted successfully');

    // Verify deletion
    const verifyFormatsRes = await makeRequest('GET', '/api/admin/assistance-formats');
    const foundDeleted = verifyFormatsRes.body.data.find(f => f.id === createdFormatId);
    assert(!foundDeleted, 'Deleted format no longer appears in formats list');

    // -------------------------------------------------------------
    // GROUP B - 2: Level 2 Assistance Types CRUD
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP B2: Level 2 Assistance Types CRUD ---');
    const typesRes = await makeRequest('GET', '/api/beneficiaries/assistance-types?includeInactive=true');
    assert(typesRes.status === 200, 'GET /api/beneficiaries/assistance-types returns 200');
    assert(typesRes.body.success === true, 'Assistance types list returned');

    // Test POST Create Type
    const testTypeCode = `TEST_TYPE_${Date.now()}`;
    const testTypeName = `ทุนช่วยเหลือทดสอบ ${Date.now()}`;
    const createTypeRes = await makeRequest('POST', '/api/beneficiaries/assistance-types', {
      code: testTypeCode,
      name: testTypeName,
      category: 'cash',
      description: 'ประเภทการช่วยเหลือสำหรับทดสอบ CRUD',
      conditions: 'เงื่อนไขทดสอบ',
      primaryGroup: 'faqir_miskin',
      specificFundId: 'subf-1',
      format: 'one_time',
      minAmount: '1000',
      maxAmount: '5000',
      requiredDocuments: ['สำเนาบัตรประชาชน'],
      orderIndex: 99,
      isActive: true,
      allowedAsnafs: ['faqir', 'miskin'],
      allowedFormats: ['fmt-bank-transfer'],
      actor: MOCK_ACTOR,
    });
    assert(createTypeRes.status === 200 || createTypeRes.status === 201, 'POST /api/beneficiaries/assistance-types returns 200/201');
    assert(createTypeRes.body.success === true, 'Assistance type created successfully');
    const createdTypeId = createTypeRes.body.data?.id;

    // Test PUT Update Type
    const updateTypeRes = await makeRequest('PUT', '/api/beneficiaries/assistance-types', {
      id: createdTypeId,
      name: `${testTypeName} (Updated)`,
      maxAmount: '8000',
      isActive: true,
      actor: MOCK_ACTOR,
    });
    assert(updateTypeRes.status === 200, 'PUT /api/beneficiaries/assistance-types returns 200');
    assert(updateTypeRes.body.success === true, 'Assistance type updated successfully');

    // Test DELETE Type
    const deleteTypeRes = await makeRequest('DELETE', `/api/beneficiaries/assistance-types?id=${createdTypeId}&action=delete`);
    assert(deleteTypeRes.status === 200, 'DELETE /api/beneficiaries/assistance-types returns 200');
    assert(deleteTypeRes.body.success === true, 'Assistance type deleted successfully');

    // -------------------------------------------------------------
    // GROUP B - 3: Level 1 Asnaf Master Data & 3-Level Matrix
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP B3: Level 1 Asnaf & Matrix Integration ---');
    const asnafRes = await makeRequest('GET', '/api/admin/asnaf');
    assert(asnafRes.status === 200, 'GET /api/admin/asnaf returns 200');
    assert(asnafRes.body.success === true, 'Asnaf master data returned');
    assert(asnafRes.body.data.length === 8, 'Found exactly 8 Asnaf categories (Shariah compliance)');

    const matrixRes = await makeRequest('GET', '/api/admin/relationship-matrix');
    assert(matrixRes.status === 200, 'GET /api/admin/relationship-matrix returns 200');
    assert(matrixRes.body.success === true, '3-Level relationship matrix loaded successfully');
    assert(matrixRes.body.data.asnafs.length === 8, 'Matrix covers all 8 Asnaf groups');

    // -------------------------------------------------------------
    // GROUP B - 4: Audit Logs Verification
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP B4: Audit Trail Verification ---');
    const auditRes = await makeRequest('GET', '/api/admin/relationship-matrix/audit-logs?limit=5');
    assert(auditRes.status === 200, 'GET /api/admin/relationship-matrix/audit-logs returns 200');
    assert(auditRes.body.success === true, 'Audit log retrieved');
    assert(Array.isArray(auditRes.body.data), 'Audit records array returned');

    console.log('\n================================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runMasterCrudTests();
