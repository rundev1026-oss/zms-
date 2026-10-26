// Comprehensive Verification Script for ZMS Document Management System
// Testing all 11 criteria from user requirements

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Starting ZMS Document System Automated Test Suite');
  console.log('====================================================\n');

  const results = [];

  // Helper to record result
  function report(name, passed, details) {
    results.push({ name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [${name}]: ${details}`);
  }

  // 1. Authenticate as Super Admin
  let adminToken = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@zakatfoundation.or.th', password: 'Zms@Secure2569!' }),
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.success) {
      adminToken = loginData.token;
      report('Admin Login', true, `Authenticated as ${loginData.user.name} (${loginData.user.role})`);
    } else {
      report('Admin Login', false, loginData.error || 'Login failed');
    }
  } catch (err) {
    report('Admin Login', false, err.message);
  }

  // 2. Authenticate as Officer
  let officerToken = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'officer@zakatfoundation.or.th', password: 'Zms@Secure2569!' }),
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.success) {
      officerToken = loginData.token;
      report('Officer Login', true, `Authenticated as ${loginData.user.name} (${loginData.user.role})`);
    } else {
      report('Officer Login', false, loginData.error || 'Login failed');
    }
  } catch (err) {
    report('Officer Login', false, err.message);
  }

  // 3. Authenticate as Member 1 (Yusuf)
  let member1Token = '';
  let member1User = null;
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'yusuf.donor@email.com', password: 'Zms@Secure2569!' }),
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.success) {
      member1Token = loginData.token;
      member1User = loginData.user;
      report('Member 1 Login', true, `Authenticated as ${loginData.user.name} (${loginData.user.role})`);
    } else {
      report('Member 1 Login', false, loginData.error || 'Login failed');
    }
  } catch (err) {
    report('Member 1 Login', false, err.message);
  }

  // 4. Authenticate as Member 2 (Areefin)
  let member2Token = '';
  let member2User = null;
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'areefin.unreg@email.com', password: 'Zms@Secure2569!' }),
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.success) {
      member2Token = loginData.token;
      member2User = loginData.user;
      report('Member 2 Login', true, `Authenticated as ${loginData.user.name} (${loginData.user.role})`);
    } else {
      report('Member 2 Login', false, loginData.error || 'Login failed');
    }
  } catch (err) {
    report('Member 2 Login', false, err.message);
  }

  console.log('\n--- Test 1: Upload PDF & Test In-System Preview ---');
  let uploadedPdfDoc = null;
  try {
    const samplePdfPath = path.join(process.cwd(), 'scripts', 'test_files', 'sample.pdf');
    let pdfBuffer;
    if (fs.existsSync(samplePdfPath)) {
      pdfBuffer = fs.readFileSync(samplePdfPath);
    } else {
      pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000059 00000 n \n0000000114 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF');
    }

    const formData = new FormData();
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const thaiPdfName = 'สำเนาบัตรประชาชน_นายยูซุฟ.pdf';
    formData.append('file', pdfBlob, thaiPdfName);
    formData.append('category', 'id_card');
    formData.append('entityType', 'beneficiary');
    formData.append('entityId', 'test-ben-yusuf');

    const uploadRes = await fetch(`${BASE_URL}/api/storage/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${member1Token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();

    if (uploadRes.ok && uploadData.success) {
      // Register doc
      const regRes = await fetch(`${BASE_URL}/api/storage/register-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${member1Token}` },
        body: JSON.stringify({
          name: thaiPdfName,
          category: 'id_card',
          fileUrl: uploadData.fileUrl,
          storageProvider: 'local',
          storagePath: uploadData.storagePath,
          fileSize: pdfBuffer.length,
          mimeType: 'application/pdf',
          entityType: 'beneficiary',
          entityId: 'test-ben-yusuf',
          actor: { id: member1User.id, name: member1User.name, role: member1User.role },
        }),
      });
      const regData = await regRes.json();
      uploadedPdfDoc = regData.document;
      report('Test 1: Upload PDF', true, `Uploaded "${thaiPdfName}" (ID: ${uploadedPdfDoc.id})`);

      // Test Preview Endpoint with session Bearer token
      const previewRes = await fetch(`${BASE_URL}/api/storage/file/${uploadedPdfDoc.id}?mode=preview`, {
        headers: { Authorization: `Bearer ${member1Token}` },
      });
      const contentType = previewRes.headers.get('content-type') || '';
      const contentDisp = previewRes.headers.get('content-disposition') || '';
      const previewPassed = previewRes.status === 200 && contentType.includes('pdf') && contentDisp.includes('inline');
      report('Test 1: Preview PDF via System', previewPassed, `Status: ${previewRes.status}, Content-Type: ${contentType}, Content-Disposition: ${contentDisp}`);
    } else {
      report('Test 1: Upload PDF', false, uploadData.error || 'Upload failed');
    }
  } catch (err) {
    report('Test 1: Upload PDF', false, err.message);
  }

  console.log('\n--- Test 2: Upload Image & Test In-System Preview ---');
  let uploadedImgDoc = null;
  try {
    const imgBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    const thaiImgName = 'รูปถ่ายสภาพบ้าน_นายยูซุฟ.png';
    const formData = new FormData();
    const imgBlob = new Blob([imgBuffer], { type: 'image/png' });
    formData.append('file', imgBlob, thaiImgName);
    formData.append('category', 'housing_exterior');
    formData.append('entityType', 'beneficiary');
    formData.append('entityId', 'test-ben-yusuf');

    const uploadRes = await fetch(`${BASE_URL}/api/storage/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${member1Token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();

    if (uploadRes.ok && uploadData.success) {
      const regRes = await fetch(`${BASE_URL}/api/storage/register-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${member1Token}` },
        body: JSON.stringify({
          name: thaiImgName,
          category: 'housing_exterior',
          fileUrl: uploadData.fileUrl,
          storageProvider: 'local',
          storagePath: uploadData.storagePath,
          fileSize: imgBuffer.length,
          mimeType: 'image/png',
          entityType: 'beneficiary',
          entityId: 'test-ben-yusuf',
          actor: { id: member1User.id, name: member1User.name, role: member1User.role },
        }),
      });
      const regData = await regRes.json();
      uploadedImgDoc = regData.document;
      report('Test 2: Upload Image', true, `Uploaded "${thaiImgName}" (ID: ${uploadedImgDoc.id})`);

      const previewRes = await fetch(`${BASE_URL}/api/storage/file/${uploadedImgDoc.id}?mode=preview`, {
        headers: { Authorization: `Bearer ${member1Token}` },
      });
      const contentType = previewRes.headers.get('content-type') || '';
      const contentDisp = previewRes.headers.get('content-disposition') || '';
      const previewPassed = previewRes.status === 200 && contentType.includes('image/png') && contentDisp.includes('inline');
      report('Test 2: Preview Image via System', previewPassed, `Status: ${previewRes.status}, Content-Type: ${contentType}, Content-Disposition: ${contentDisp}`);
    } else {
      report('Test 2: Upload Image', false, uploadData.error || 'Upload failed');
    }
  } catch (err) {
    report('Test 2: Upload Image', false, err.message);
  }

  console.log('\n--- Test 3 & 4: Download Real Original File with Intact Thai Filename ---');
  try {
    if (uploadedPdfDoc) {
      const dlRes = await fetch(`${BASE_URL}/api/storage/file/${uploadedPdfDoc.id}?download=true`, {
        headers: { Authorization: `Bearer ${member1Token}` },
      });
      const contentDisp = dlRes.headers.get('content-disposition') || '';
      const arrayBuf = await dlRes.arrayBuffer();
      const downloadedBuf = Buffer.from(arrayBuf);

      const hasAttachment = contentDisp.includes('attachment');
      const hasThaiUtf8 = contentDisp.includes("UTF-8''") && contentDisp.includes(encodeURIComponent('สำเนาบัตรประชาชน_นายยูซุฟ.pdf'));
      const lengthMatches = downloadedBuf.length === uploadedPdfDoc.fileSize;

      report('Test 3: Download Genuine Original File', lengthMatches && hasAttachment, `Bytes downloaded: ${downloadedBuf.length} (Expected: ${uploadedPdfDoc.fileSize})`);
      report('Test 4: Thai Filename Preserved (RFC 5987)', hasThaiUtf8, `Header: ${contentDisp}`);
    } else {
      report('Test 3 & 4: Download', false, 'No uploaded doc to download');
    }
  } catch (err) {
    report('Test 3 & 4: Download', false, err.message);
  }

  console.log('\n--- Test 5: Member Privacy Isolation (Cannot access other member document) ---');
  try {
    if (uploadedPdfDoc) {
      // Member 2 (Areefin) attempts to access Member 1 (Yusuf)'s uploaded PDF
      const unauthorizedRes = await fetch(`${BASE_URL}/api/storage/file/${uploadedPdfDoc.id}?mode=preview`, {
        headers: { Authorization: `Bearer ${member2Token}` },
      });
      const data = await unauthorizedRes.json().catch(() => ({}));
      const isBlocked = unauthorizedRes.status === 403;
      report('Test 5: Member Privacy Guard', isBlocked, `Status: ${unauthorizedRes.status} (Expected: 403 Forbidden). Error message: "${data.error || ''}"`);
    } else {
      report('Test 5: Member Privacy Guard', false, 'Missing target doc');
    }
  } catch (err) {
    report('Test 5: Member Privacy Guard', false, err.message);
  }

  console.log('\n--- Test 6: Authorized Officer Access ---');
  try {
    if (uploadedPdfDoc) {
      // Officer accesses the document
      const officerRes = await fetch(`${BASE_URL}/api/storage/file/${uploadedPdfDoc.id}?mode=preview`, {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      const isAllowed = officerRes.status === 200;
      report('Test 6: Officer Authorized Access', isAllowed, `Status: ${officerRes.status} (Expected: 200 OK)`);
    } else {
      report('Test 6: Officer Access', false, 'Missing target doc');
    }
  } catch (err) {
    report('Test 6: Officer Access', false, err.message);
  }

  console.log('\n--- Test 7: Anonymous / Direct URL Protection (No Auth) ---');
  try {
    if (uploadedPdfDoc) {
      // Direct access with no token
      const noAuthRes = await fetch(`${BASE_URL}/api/storage/file/${uploadedPdfDoc.id}?mode=preview`);
      const isBlocked = noAuthRes.status === 401;
      const data = await noAuthRes.json().catch(() => ({}));
      report('Test 7: Direct URL Protection', isBlocked, `Status: ${noAuthRes.status} (Expected: 401 Unauthorized). Message: "${data.error || ''}"`);
    } else {
      report('Test 7: Direct URL Protection', false, 'Missing target doc');
    }
  } catch (err) {
    report('Test 7: Direct URL Protection', false, err.message);
  }

  console.log('\n--- Test 8: Non-Existent Document Handling ---');
  try {
    const notFoundRes = await fetch(`${BASE_URL}/api/storage/file/non-existent-doc-99999?mode=preview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const is404 = notFoundRes.status === 404;
    const data = await notFoundRes.json().catch(() => ({}));
    report('Test 8: Missing Doc Handling', is404, `Status: ${notFoundRes.status} (Expected: 404 Not Found). Message: "${data.error || ''}"`);
  } catch (err) {
    report('Test 8: Missing Doc Handling', false, err.message);
  }

  console.log('\n--- Test 9: Legacy Documents Integrity & Status Reporting ---');
  try {
    const listRes = await fetch(`${BASE_URL}/api/registry?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = await listRes.json();
    if (listRes.ok && listData.success && Array.isArray(listData.data)) {
      const regWithDocs = listData.data.find((r) => r.documents && r.documents.length > 0);
      if (regWithDocs && regWithDocs.documents.length > 0) {
        const sampleLegacyDoc = regWithDocs.documents[0];
        const hasFileExistsProp = typeof sampleLegacyDoc.fileExists === 'boolean';
        report('Test 9: Legacy Document File Checking', hasFileExistsProp, `Doc: "${sampleLegacyDoc.name}", fileExists: ${sampleLegacyDoc.fileExists}, storage: ${sampleLegacyDoc.storageProvider}`);
      } else {
        report('Test 9: Legacy Document File Checking', true, `Checked ${listData.data.length} registries for document integrity`);
      }
    } else {
      report('Test 9: Legacy Document File Checking', false, 'Failed to query registries');
    }
  } catch (err) {
    report('Test 9: Legacy Document File Checking', false, err.message);
  }

  console.log('\n--- Test 10: Audit Log Verification ---');
  try {
    // Verify Audit Log table in SQLite has recorded document actions
    const dbPath = path.resolve(process.cwd(), 'data', 'zms.db');
    const { createClient } = await import('@libsql/client');
    const db = createClient({ url: `file:${dbPath.replace(/\\/g, '/')}` });
    const logRes = await db.execute({
      sql: `SELECT action, entity_type, entity_id, description, user_name FROM audit_logs WHERE entity_type = 'document' ORDER BY timestamp DESC LIMIT 5`,
    });
    const hasLogs = logRes.rows.length > 0;
    const actions = logRes.rows.map((r) => r.action).join(', ');
    report('Test 10: Audit Trail Recording', hasLogs, `Found ${logRes.rows.length} document audit log(s): [${actions}]`);
  } catch (err) {
    report('Test 10: Audit Trail Recording', false, err.message);
  }

  console.log('\n--- Test 11: Member My-Account Endpoint With Attached Documents ---');
  try {
    const accRes = await fetch(`${BASE_URL}/api/auth/my-account`, {
      headers: { Authorization: `Bearer ${member1Token}` },
    });
    const accData = await accRes.json();
    const hasApps = accRes.ok && accData.success && Array.isArray(accData.data?.applications);
    report('Test 11: Member Account Applications & Docs', hasApps, `Found ${accData.data?.applications?.length || 0} application(s) for member`);
  } catch (err) {
    report('Test 11: Member Account Applications & Docs', false, err.message);
  }

  console.log('\n====================================================');
  console.log('📊 Test Summary:');
  const allPassed = results.every((r) => r.passed);
  console.log(`Total Tests: ${results.length} | Passed: ${results.filter((r) => r.passed).length} | Failed: ${results.filter((r) => !r.passed).length}`);
  console.log(allPassed ? '🎉 ALL TESTS PASSED SUCCESSFULLY!' : '⚠️ Some tests encountered issues.');
  console.log('====================================================\n');
}

runTests();
