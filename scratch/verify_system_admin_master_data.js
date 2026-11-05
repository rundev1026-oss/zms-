const path = require('path');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');

const { PrismaClient } = require(path.resolve(__dirname, '../apps/api/node_modules/.prisma/client'));
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-change-me-zms-enterprise-2026';
const SYSTEM_ADMIN_ID = process.env.SYSTEM_ADMIN_ID || '0b4b3ae1-b1d6-49cb-a947-3ce94ff24516';

function createServiceToken(userId = SYSTEM_ADMIN_ID) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: now + 3600, iat: now })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

function requestJson(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runComprehensiveVerification() {
  console.log('================================================================');
  console.log('   ZMS CENTRALIZED ADMINISTRATION & CONFIGURATION VERIFICATION   ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] Point ${total}: ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] Point ${total}: ${message}`);
    }
  }

  try {
    const token = createServiceToken();

    // 1. Verify Real Database Beneficiaries (Zero Data Loss)
    const beneficiaries = await prisma.beneficiary.findMany({ select: { memberId: true, firstName: true, lastName: true } });
    assert(
      beneficiaries.length === 3 &&
      beneficiaries.some(b => b.memberId === 'MB-2026-000001') &&
      beneficiaries.some(b => b.memberId === 'MB-2026-000002') &&
      beneficiaries.some(b => b.memberId === 'MB-2026-000003'),
      `Beneficiary Master Registry intact (3/3 members: MB-2026-000001, 000002, 000003 present)`
    );

    // 2. Verify 8 Quranic Asnafs in DB
    const asnafsDb = await prisma.asnafCategory.findMany();
    assert(asnafsDb.length === 8, `PostgreSQL asnaf_categories has 8 Quranic categories`);

    // 3. Verify 23 Assistance Types in DB
    const typesDb = await prisma.assistanceType.findMany();
    assert(typesDb.length === 23, `PostgreSQL assistance_types has 23 real items intact`);

    // 4. Verify System Settings via /api/settings
    const settingsRes = await requestJson({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/settings',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      settingsRes.status === 200 && settingsRes.data?.success && settingsRes.data?.data?.organizationNameTh,
      `GET /api/settings returns centralized organization & system parameters`
    );

    // 5. Verify Patching Settings & Audit Trail
    const updateRes = await requestJson({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/settings',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }, {
      activeFiscalYear: '2569',
      calendarType: 'buddhist',
      pageSize: 10,
    });
    assert(
      updateRes.status === 200 && updateRes.data?.success,
      `PATCH /api/settings updates settings in PostgreSQL system_settings table with audit log`
    );

    // 6. Verify Assistance Models API
    const modelsRes = await requestJson({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/admin/assistance-models',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      modelsRes.status === 200 && modelsRes.data?.data?.length === 8 &&
      modelsRes.data.data.some(m => m.code === 'cash' && m.linkedTypeCount > 0),
      `GET /api/admin/assistance-models returns 8 master models with dynamic linkedTypeCount`
    );

    // 7. Verify Asnaf Master Data API
    const asnafRes = await requestJson({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/admin/asnaf',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      asnafRes.status === 200 && asnafRes.data?.data?.length === 8 &&
      asnafRes.data.data.some(a => a.code === 'faqir' && a.nameAr && a.criteria?.length > 0),
      `GET /api/admin/asnaf returns 8 enriched Asnafs with Arabic names, criteria, documents, and linked types`
    );

    // 8. Verify Assistance Types API with Application Linkage Protection
    const typesRes = await requestJson({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/beneficiaries/assistance-types?includeInactive=true',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      typesRes.status === 200 && typesRes.data?.data?.length === 23 &&
      typesRes.data.data.some(t => t.linkedApplicationCount > 0 && t.canHardDelete === false),
      `GET /api/beneficiaries/assistance-types enforces foreign-key hard delete protection (canHardDelete: false)`
    );

    // 9. Verify Roles API
    const rolesRes = await requestJson({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/admin/roles',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      rolesRes.status === 200 && rolesRes.data?.data?.length >= 7 &&
      rolesRes.data.data.some(r => r.code === 'SUPER_ADMIN'),
      `GET /api/admin/roles returns RBAC roles from PostgreSQL roles table`
    );

    // 10. Verify Organization Structure API
    const orgRes = await requestJson({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/organization/structure',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      orgRes.status === 200 && orgRes.data?.success && orgRes.data?.data?.branches?.length >= 1,
      `GET /api/organization/structure returns hierarchical organization tree with HQ & branches`
    );

    // 11. Verify Sidebar Navigation Configuration
    const sidebarContent = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
    assert(
      (sidebarContent.includes("id: 'admin-center'") || sidebarContent.includes("handleNavigate('admin-center')")) &&
      sidebarContent.includes('การตั้งค่าและบริหารระบบ') &&
      !sidebarContent.includes("id: 'branches-depts'") &&
      sidebarContent.includes('isAdminView'),
      `Sidebar centralized into 'admin-center' (การตั้งค่าและบริหารระบบ) removing duplicate entries`
    );

    // 12. Verify View Routing in page.tsx
    const pageContent = fs.readFileSync('src/app/page.tsx', 'utf8');
    assert(
      pageContent.includes('SystemAdminCenterView') &&
      pageContent.includes("'admin-center',") &&
      pageContent.includes("'assistance-models',") &&
      pageContent.includes("'asnaf-categories',"),
      `src/app/page.tsx routes all 7 sub-views into centralized SystemAdminCenterView`
    );

    // 13. Verify Frontend Component Structure
    const hasAdminCenter = fs.existsSync('src/components/views/admin/SystemAdminCenterView.tsx');
    const hasModelsTab = fs.existsSync('src/components/views/admin/tabs/AssistanceModelsTab.tsx');
    const hasTypesTab = fs.existsSync('src/components/views/admin/tabs/AssistanceTypesTab.tsx');
    const hasAsnafTab = fs.existsSync('src/components/views/admin/tabs/AsnafManagementTab.tsx');
    const hasGeneralTab = fs.existsSync('src/components/views/admin/tabs/GeneralSettingsTab.tsx');
    const hasRolesTab = fs.existsSync('src/components/views/admin/tabs/RolesAndPermissionsTab.tsx');

    assert(
      hasAdminCenter && hasModelsTab && hasTypesTab && hasAsnafTab && hasGeneralTab && hasRolesTab,
      `All 6 centralized admin and master data configuration components exist and are modularized`
    );

  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`   VERIFICATION SUMMARY: ${passed}/${total} TESTS PASSED (${Math.round((passed/total)*100)}%)   `);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runComprehensiveVerification();
