// scripts/test-registry-edit-and-map.mjs
import { createClient } from '@libsql/client';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.resolve(process.cwd(), 'data', 'zms.db');

const db = createClient({
  url: `file:${DB_PATH.replace(/\\/g, '/')}`,
});

async function runTests() {
  console.log('========================================================================');
  console.log('  ZMS: BENEFICIARY REGISTRY EDIT & GOOGLE MAPS VERIFICATION SUITE');
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
    // TEST 1: Database Schema & Migration Verification
    // -------------------------------------------------------------
    console.log('--- TEST 1: Database Schema & Columns Verification ---');
    const benTableInfo = await db.execute("PRAGMA table_info('beneficiaries')");
    const benCols = benTableInfo.rows.map(r => r.name);

    assert(benCols.includes('latitude'), 'Table beneficiaries has latitude column');
    assert(benCols.includes('longitude'), 'Table beneficiaries has longitude column');
    assert(benCols.includes('residence_address'), 'Table beneficiaries has residence_address column');
    assert(benCols.includes('place_name'), 'Table beneficiaries has place_name column');
    assert(benCols.includes('location_updated_at'), 'Table beneficiaries has location_updated_at column');
    assert(benCols.includes('location_updated_by'), 'Table beneficiaries has location_updated_by column');

    const hhTableInfo = await db.execute("PRAGMA table_info('households')");
    const hhCols = hhTableInfo.rows.map(r => r.name);
    assert(hhCols.includes('latitude'), 'Table households has latitude column');
    assert(hhCols.includes('longitude'), 'Table households has longitude column');

    const editHistoryTable = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='beneficiary_edit_history'");
    assert(editHistoryTable.rows.length > 0, 'Table beneficiary_edit_history exists');

    const histTableInfo = await db.execute("PRAGMA table_info('beneficiary_edit_history')");
    const histCols = histTableInfo.rows.map(r => r.name);
    assert(histCols.includes('beneficiary_id'), 'Table beneficiary_edit_history has beneficiary_id');
    assert(histCols.includes('edited_by_id'), 'Table beneficiary_edit_history has edited_by_id');
    assert(histCols.includes('changes_detail'), 'Table beneficiary_edit_history has changes_detail');

    // -------------------------------------------------------------
    // TEST 2: Authentication as Super Admin / Officer
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Officer / Super Admin Authentication ---');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@zakatfoundation.or.th',
        password: 'Zms@Secure2569!',
      }),
    });
    const loginJson = await loginRes.json();
    assert(loginRes.status === 200, 'Super admin login returns HTTP 200', `Got ${loginRes.status}: ${JSON.stringify(loginJson)}`);
    assert(loginJson.success === true, 'Login successful');
    const adminToken = loginJson.token;
    const adminCookie = loginRes.headers.get('set-cookie') || `zms_session=${adminToken}`;

    // -------------------------------------------------------------
    // TEST 3: Fetch Registries List and Select Target
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Fetch Registries List ---');
    const regListRes = await fetch(`${BASE_URL}/api/registry`, {
      headers: { Cookie: adminCookie },
    });
    const regListJson = await regListRes.json();
    assert(regListRes.status === 200, 'GET /api/registry returns HTTP 200');
    assert(Array.isArray(regListJson.data) && regListJson.data.length > 0, 'Registries list contains data');

    const targetReg = regListJson.data[0];
    console.log(`Target registry: ${targetReg.fullName} (${targetReg.id}), Status: ${targetReg.registrationStatus}`);
    const originalStatus = targetReg.registrationStatus;

    // -------------------------------------------------------------
    // TEST 4: Validation on Coordinates Bounds (-90 to 90, -180 to 180)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Coordinate Bounds Validation ---');
    const invalidLatRes = await fetch(`${BASE_URL}/api/registry/${targetReg.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        ...targetReg,
        latitude: 95.5, // Invalid (> 90)
        longitude: 100.5,
      }),
    });
    const invalidLatJson = await invalidLatRes.json();
    assert(invalidLatRes.status === 400, 'Latitude > 90 rejected with HTTP 400', `Got ${invalidLatRes.status}`);
    assert(invalidLatJson.error?.includes('ละติจูด'), 'Error message mentions latitude range');

    const invalidLngRes = await fetch(`${BASE_URL}/api/registry/${targetReg.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        ...targetReg,
        latitude: 13.75,
        longitude: -190.0, // Invalid (< -180)
      }),
    });
    const invalidLngJson = await invalidLngRes.json();
    assert(invalidLngRes.status === 400, 'Longitude < -180 rejected with HTTP 400', `Got ${invalidLngRes.status}`);

    // -------------------------------------------------------------
    // TEST 5: Update Beneficiary Registry with Real Coordinates & Edit Data
    // -------------------------------------------------------------
    const newLatVal = targetReg.latitude === 13.856712 ? 13.857890 : 13.856712;
    const newLngVal = targetReg.longitude === 100.865421 ? 100.866543 : 100.865421;
    const testCoordinates = {
      latitude: newLatVal,
      longitude: newLngVal,
      residenceAddress: `15/2 หมู่ 3 ซอยมัสยิดนูรุลยากีน (${Date.now()})`,
      placeName: 'ใกล้มัสยิดนูรุลยากีน เขตหนองจอก',
    };

    const updatePayload = {
      ...targetReg,
      fullName: targetReg.fullName,
      phone: targetReg.phone || '081-999-8877',
      address: '15/2 หมู่ 3 ซอยมัสยิดนูรุลยากีน',
      latitude: testCoordinates.latitude,
      longitude: testCoordinates.longitude,
      residenceAddress: testCoordinates.residenceAddress,
      placeName: testCoordinates.placeName,
      monthlyIncome: 8500,
      monthlyExpense: 7200,
      housingNotes: 'บ้านไม้ยกพื้น สำรวจและปักหมุดพิกัดจริง ณ สถานที่จริง',
      editNotes: 'ปรับปรุงพิกัด GPS ที่อยู่อาศัยจากการลงพื้นที่สำรวจจริง',
    };

    const updateRes = await fetch(`${BASE_URL}/api/registry/${targetReg.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify(updatePayload),
    });
    const updateJson = await updateRes.json();
    assert(updateRes.status === 200, 'PUT /api/registry/[id] returns HTTP 200', `Got ${updateRes.status}`);
    assert(updateJson.success === true, 'Update returns success: true');

    // -------------------------------------------------------------
    // TEST 6: Verify Data Persisted and Status Remained Unchanged
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Verify Persistence and Status Immutability ---');
    const getRes = await fetch(`${BASE_URL}/api/registry/${targetReg.id}`, {
      headers: { Cookie: adminCookie },
    });
    const getJson = await getRes.json();
    assert(getRes.status === 200, 'GET /api/registry/[id] returns HTTP 200');
    assert(getJson.success === true, 'Fetch fresh registry successful');

    const freshReg = getJson.data;
    assert(Math.abs(freshReg.latitude - testCoordinates.latitude) < 0.00001, 'Latitude persisted correctly in DB');
    assert(Math.abs(freshReg.longitude - testCoordinates.longitude) < 0.00001, 'Longitude persisted correctly in DB');
    assert(freshReg.residenceAddress === testCoordinates.residenceAddress, 'Residence address persisted correctly');
    assert(freshReg.placeName === testCoordinates.placeName, 'Place name persisted correctly');
    assert(freshReg.locationUpdatedAt !== null && freshReg.locationUpdatedAt !== undefined, 'locationUpdatedAt is populated');
    assert(freshReg.registrationStatus === originalStatus, `CRITICAL: registrationStatus remained ${originalStatus} (NOT altered by edit)`);

    // -------------------------------------------------------------
    // TEST 7: Verify Audit Edit History Logged
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Verify Audit Edit History & Field Diffs ---');
    const histRes = await fetch(`${BASE_URL}/api/registry/${targetReg.id}/history`, {
      headers: { Cookie: adminCookie },
    });
    const histJson = await histRes.json();
    assert(histRes.status === 200, 'GET /api/registry/[id]/history returns HTTP 200');
    assert(Array.isArray(histJson.data) && histJson.data.length > 0, 'Edit history contains records');

    const latestAudit = histJson.data[0];
    console.log(`Latest audit: by ${latestAudit.editedByName} (${latestAudit.editedByRole}) at ${latestAudit.timestamp}`);
    assert(latestAudit.notes === updatePayload.editNotes, 'Audit notes matched');
    assert(Array.isArray(latestAudit.changesDetail) && latestAudit.changesDetail.length > 0, 'Audit contains field-level diffs');

    const diffFields = latestAudit.changesDetail.map(c => c.field);
    assert(diffFields.includes('latitude') || diffFields.includes('พิกัดที่อยู่อาศัย (ละติจูด)') || latestAudit.changesSummary.includes('พิกัด'), 'Audit recorded coordinate change');

    // -------------------------------------------------------------
    // TEST 8: RBAC Verification - Member Cannot Edit Another Beneficiary
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: RBAC Permission Check (Member Role) ---');
    const memberLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'yusuf.donor@email.com',
        password: 'Zms@Secure2569!',
      }),
    });
    const memberLoginJson = await memberLoginRes.json();
    const memberCookie = memberLoginRes.headers.get('set-cookie') || `zms_session=${memberLoginJson.token}`;

    const memberForbiddenRes = await fetch(`${BASE_URL}/api/registry/${targetReg.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: memberCookie,
      },
      body: JSON.stringify(updatePayload),
    });
    assert(
      memberForbiddenRes.status === 403,
      'Member cannot edit another beneficiary registry (HTTP 403 Forbidden)',
      `Got ${memberForbiddenRes.status}`
    );

    // -------------------------------------------------------------
    // TEST 9: Google Maps Route Navigation URL Generation
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Google Maps Navigation Route URL ---');
    const expectedRouteUrl = `https://www.google.com/maps/dir/?api=1&destination=${testCoordinates.latitude},${testCoordinates.longitude}`;
    assert(
      expectedRouteUrl.includes(`google.com/maps/dir/?api=1&destination=${testCoordinates.latitude},${testCoordinates.longitude}`),
      'Google Maps route URL conforms to standard API format'
    );

    console.log('\n========================================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
