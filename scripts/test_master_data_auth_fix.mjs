/**
 * Comprehensive Automated Verification Suite for Master Data Auth Fix
 * Verifies that Super Admin, Admin, and Authorized Officers can save Master Data
 * without receiving "กรุณาเข้าสู่ระบบก่อนดำเนินการ" (401), while strictly blocking
 * unauthenticated requests and unauthorized roles.
 */

const BASE_URL = 'http://localhost:3000';
const NEST_URL = 'http://localhost:4000/api/v1';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Starting Master Data Auth & Save Verification Suite');
  console.log('====================================================\n');

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

  // 1. Authenticate with NestJS to get real JWT access token
  console.log('1️⃣ Authenticating as Super Admin (admin@zms.local)...');
  const loginRes = await fetch(`${NEST_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@zms.local', password: 'ZmsEnterprise2026!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  const adminUser = loginData.user;

  assert(loginRes.ok && !!token, 'Super Admin login succeeded with valid JWT');
  console.log(`   User ID: ${adminUser.id}, Roles: ${JSON.stringify(adminUser.roles.map(r => r.code))}`);

  // Test Headers
  const bearerHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const cookieHeaders = {
    'Content-Type': 'application/json',
    'Cookie': `zms_session=${token}`,
  };

  const adminActor = {
    id: adminUser.id,
    name: adminUser.displayName,
    role: 'super_admin',
    email: adminUser.email,
  };

  // 2. Test PUT /api/admin/asnaf with Bearer token
  console.log('\n2️⃣ Testing Asnaf Settings (PUT /api/admin/asnaf) with Bearer token...');
  const asnafRes1 = await fetch(`${BASE_URL}/api/admin/asnaf`, {
    method: 'PUT',
    headers: bearerHeaders,
    body: JSON.stringify({
      code: 'asnaf_faqir',
      nameTh: 'ฟากิร (ผู้ยากไร้ขัดสน)',
      isActive: true,
      actor: adminActor,
    }),
  });
  const asnafData1 = await asnafRes1.json();
  assert(asnafRes1.status === 200 && asnafData1.success === true, 'Asnaf settings saved with Bearer token');

  // 3. Test PUT /api/admin/asnaf with Cookie session
  console.log('\n3️⃣ Testing Asnaf Settings (PUT /api/admin/asnaf) with Cookie session...');
  const asnafRes2 = await fetch(`${BASE_URL}/api/admin/asnaf`, {
    method: 'PUT',
    headers: cookieHeaders,
    body: JSON.stringify({
      code: 'asnaf_miskin',
      isActive: true,
      actor: adminActor,
    }),
  });
  const asnafData2 = await asnafRes2.json();
  assert(asnafRes2.status === 200 && asnafData2.success === true, 'Asnaf settings saved with Cookie session');

  // 4. Test PUT /api/admin/assistance-formats with Bearer token
  console.log('\n4️⃣ Testing Assistance Formats (PUT /api/admin/assistance-formats)...');
  const formatRes = await fetch(`${BASE_URL}/api/admin/assistance-formats`, {
    method: 'PUT',
    headers: bearerHeaders,
    body: JSON.stringify({
      id: 'fmt-bank-transfer',
      code: 'BANK_TRANSFER',
      name: 'โอนเงินเข้าบัญชีธนาคาร (PromptPay / Bank Transfer)',
      deliveryMethod: 'cash_transfer',
      deliveryMethodLabelTh: 'โอนเงินผ่านระบบธนาคาร',
      isActive: true,
      actor: adminActor,
    }),
  });
  const formatData = await formatRes.json();
  assert(formatRes.status === 200 && formatData.success === true, 'Assistance format updated successfully');

  // 5. Test Assistance Models (POST & PUT /api/admin/assistance-models)
  console.log('\n5️⃣ Testing Assistance Models (POST & PUT /api/admin/assistance-models)...');
  const testModelCode = `test_mdl_${Date.now()}`;
  const modelCreateRes = await fetch(`${BASE_URL}/api/admin/assistance-models`, {
    method: 'POST',
    headers: cookieHeaders,
    body: JSON.stringify({
      code: testModelCode,
      name: 'ทดสอบรูปแบบการช่วยเหลืออัตโนมัติ',
      nameEn: 'Automated Test Model',
      description: 'สร้างขึ้นเพื่อทดสอบการบันทึกข้อมูลพื้นฐาน',
      method: 'transfer',
      methodLabelTh: 'โอนเงินเข้าบัญชี',
      requiresAmount: true,
      requiresEvidence: true,
      requiresFollowUp: false,
      actor: adminActor,
    }),
  });
  const modelCreateData = await modelCreateRes.json();
  assert(modelCreateRes.ok && modelCreateData.success === true, 'Assistance model created successfully');

  if (modelCreateData.data?.id) {
    const modelToggleRes = await fetch(`${BASE_URL}/api/admin/assistance-models`, {
      method: 'PUT',
      headers: bearerHeaders,
      body: JSON.stringify({
        id: modelCreateData.data.id,
        code: testModelCode,
        isActive: false,
        actor: adminActor,
      }),
    });
    const modelToggleData = await modelToggleRes.json();
    assert(modelToggleRes.status === 200 && modelToggleData.success === true, 'Assistance model status toggled successfully');
  }

  // 6. Test Assistance Types (POST, PUT, DELETE /api/beneficiaries/assistance-types)
  console.log('\n6️⃣ Testing Assistance Types (POST, PUT, DELETE /api/beneficiaries/assistance-types)...');
  const uniqueTimestamp = Date.now();
  const typeCreateRes = await fetch(`${BASE_URL}/api/beneficiaries/assistance-types`, {
    method: 'POST',
    headers: bearerHeaders,
    body: JSON.stringify({
      input: {
        code: `AST_TEST_${uniqueTimestamp}`,
        name: `เงินช่วยเหลือฉุกเฉินทดสอบระบบ ${uniqueTimestamp}`,
        category: 'cash',
        description: 'การช่วยเหลือกรณีฉุกเฉิน',
        primaryAsnafGroup: 'faqir_miskin',
        specificFundId: 'subf-1',
        defaultFormat: 'one_time',
        minAmount: 1000,
        maxAmount: 5000,
        requiredDocuments: ['สำเนาบัตรประจำตัวประชาชน'],
        orderIndex: 99,
        isActive: true,
      },
      actor: adminActor,
    }),
  });
  const typeCreateData = await typeCreateRes.json();
  if (!typeCreateRes.ok || !typeCreateData.success) {
    console.log('    Create Type Error:', typeCreateRes.status, typeCreateData);
  }
  assert(typeCreateRes.ok && typeCreateData.success === true, 'Assistance type created successfully');

  const createdTypeId = typeCreateData.data?.id;
  if (createdTypeId) {
    // Update Type
    const typeUpdateRes = await fetch(`${BASE_URL}/api/beneficiaries/assistance-types`, {
      method: 'PUT',
      headers: cookieHeaders,
      body: JSON.stringify({
        input: {
          id: createdTypeId,
          name: `เงินช่วยเหลือฉุกเฉินทดสอบระบบ (ปรับปรุง) ${uniqueTimestamp}`,
          description: 'ปรับปรุงรายละเอียด',
          minAmount: 1500,
          maxAmount: 6000,
        },
        actor: adminActor,
      }),
    });
    const typeUpdateData = await typeUpdateRes.json();
    if (!typeUpdateRes.ok || !typeUpdateData.success) {
      console.log('    Update Error Details:', typeUpdateRes.status, typeUpdateData);
    }
    assert(typeUpdateRes.status === 200 && typeUpdateData.success === true, 'Assistance type updated successfully');

    // Deactivate / Delete Type
    const typeDeactivateRes = await fetch(`${BASE_URL}/api/beneficiaries/assistance-types`, {
      method: 'DELETE',
      headers: bearerHeaders,
      body: JSON.stringify({
        id: createdTypeId,
        mode: 'deactivate',
        reason: 'ทดสอบการระงับการใช้งานผ่าน UAT',
        actor: adminActor,
      }),
    });
    const typeDeactivateData = await typeDeactivateRes.json();
    assert(typeDeactivateRes.status === 200 && typeDeactivateData.success === true, 'Assistance type safely deactivated');
  }

  // 7. Test Relationship Matrix (POST /api/admin/relationship-matrix & toggle-format)
  console.log('\n7️⃣ Testing Relationship Matrix (POST /api/admin/relationship-matrix & toggle-format)...');
  const matrixToggleRes = await fetch(`${BASE_URL}/api/admin/relationship-matrix`, {
    method: 'POST',
    headers: bearerHeaders,
    body: JSON.stringify({
      asnafCode: 'asnaf_faqir',
      assistanceTypeId: 'ast-1',
      isActive: true,
      actor: adminActor,
    }),
  });
  const matrixToggleData = await matrixToggleRes.json();
  assert(matrixToggleRes.status === 200 && matrixToggleData.success === true, 'Relationship matrix link toggled successfully');

  const formatToggleRes = await fetch(`${BASE_URL}/api/admin/relationship-matrix/toggle-format`, {
    method: 'POST',
    headers: cookieHeaders,
    body: JSON.stringify({
      assistanceTypeId: 'ast-1',
      formatId: 'fmt-bank-transfer',
      isActive: true,
      isDefault: true,
      actor: adminActor,
    }),
  });
  const formatToggleData = await formatToggleRes.json();
  assert(formatToggleRes.status === 200 && formatToggleData.success === true, 'Relationship matrix format toggled successfully');

  // 8. Test General Settings (PATCH /api/settings)
  console.log('\n8️⃣ Testing General Settings (PATCH /api/settings)...');
  const settingsRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'PATCH',
    headers: cookieHeaders,
    body: JSON.stringify({
      organizationNameTh: 'มูลนิธิซะกาตและสาธารณกุศล',
      phone: '02-123-4567',
    }),
  });
  const settingsData = await settingsRes.json();
  assert(settingsRes.status === 200 && settingsData.success === true, 'General organization settings saved successfully');

  // 9. SECURITY GUARD TESTS: Unauthenticated requests MUST return 401
  console.log('\n9️⃣ Security Guard Test: Unauthenticated request rejection...');
  const unauthRes = await fetch(`${BASE_URL}/api/admin/asnaf`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'asnaf_faqir', isActive: true }),
  });
  const unauthData = await unauthRes.json();
  assert(unauthRes.status === 401 && unauthData.error === 'กรุณาเข้าสู่ระบบก่อนดำเนินการ',
    'Unauthenticated request blocked with 401 "กรุณาเข้าสู่ระบบก่อนดำเนินการ"');

  // 10. SECURITY GUARD TESTS: Unauthorized role (member/public) MUST return 403
  console.log('\n🔟 Security Guard Test: Unauthorized role rejection...');
  const forbiddenRes = await fetch(`${BASE_URL}/api/admin/relationship-matrix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asnafCode: 'asnaf_faqir',
      assistanceTypeId: 'ast-1',
      isActive: true,
      actor: { id: 'u-6', role: 'member', name: 'ยูซุฟ มีลาภ' },
    }),
  });
  const forbiddenData = await forbiddenRes.json();
  assert(forbiddenRes.status === 403 && forbiddenData.error?.includes('ไม่อนุญาต'),
    'Unauthorized member role blocked with 403 Forbidden');

  // Summary
  console.log('\n====================================================');
  console.log(`🏁 Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
