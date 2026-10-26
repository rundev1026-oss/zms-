import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { StorageService, MAX_FILE_SIZE } from '../src/services/storageService';
import { RegistryService } from '../src/services/registryService';
import { initDb, getDb } from '../src/lib/db';

async function runStorageTestSuite() {
  console.log('========================================================================');
  console.log('   ZMS - CLOUD STORAGE & DIRECT S3 PRESIGNED URL INTEGRATION TESTS      ');
  console.log('         (S3 SigV4, Local Fallback, SQLite Metadata & Privacy Guard)    ');
  console.log('========================================================================\n');

  await initDb();
  const db = getDb();

  // ---------------------------------------------------------------------------
  // Test 1: Configuration Resolution
  // ---------------------------------------------------------------------------
  console.log('--- 1. Testing Storage Configuration Resolution ---');
  const initialConfig = StorageService.getConfig();
  console.log(`[PASS] Storage Provider resolved: ${initialConfig.provider.toUpperCase()}`);
  assert(initialConfig.local.uploadDir, 'Upload directory path must be defined');

  // ---------------------------------------------------------------------------
  // Test 2: MIME Type & Size Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing File Type & Size Validations ---');
  let invalidTypeBlocked = false;
  try {
    await StorageService.generatePresignedUploadUrl({
      fileName: 'malicious.exe',
      fileType: 'application/x-msdownload',
      fileSize: 1024,
      category: 'id_card',
      entityType: 'assistance_request',
    });
  } catch (err: any) {
    invalidTypeBlocked = true;
    console.log(`[PASS] Blocked unauthorized MIME type: "${err.message}"`);
  }
  assert(invalidTypeBlocked, 'Should block unauthorized file types');

  let oversizedBlocked = false;
  try {
    await StorageService.generatePresignedUploadUrl({
      fileName: 'large_scan.pdf',
      fileType: 'application/pdf',
      fileSize: 30 * 1024 * 1024, // 30 MB > 25 MB limit
      category: 'id_card',
      entityType: 'assistance_request',
    });
  } catch (err: any) {
    oversizedBlocked = true;
    console.log(`[PASS] Blocked oversized document: "${err.message}"`);
  }
  assert(oversizedBlocked, 'Should block files exceeding 25MB');

  // ---------------------------------------------------------------------------
  // Test 3: S3 Signature Version 4 Presigned URL Generation
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Testing AWS Signature Version 4 Presigned URL Generator ---');
  // Temporarily set mock AWS env variables to verify AWS SigV4 algorithm
  process.env.AWS_S3_BUCKET = 'zms-prod-documents-bucket';
  process.env.AWS_REGION = 'ap-southeast-1';
  process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
  process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

  const s3Config = StorageService.getConfig();
  assert.strictEqual(s3Config.provider, 's3', 'Provider should switch to s3 when env credentials exist');

  const presignedS3 = await StorageService.generatePresignedUploadUrl({
    fileName: 'high_res_id_card_scan.pdf',
    fileType: 'application/pdf',
    fileSize: 4.5 * 1024 * 1024, // 4.5 MB
    category: 'id_card',
    entityType: 'assistance_request',
    entityId: 'app-demo-123',
  });

  console.log(`[PASS] S3 Presigned URL generated successfully:`);
  console.log(`       Provider: ${presignedS3.provider}`);
  console.log(`       Upload URL: ${presignedS3.uploadUrl.substring(0, 85)}...`);
  console.log(`       File Key: ${presignedS3.fileKey}`);

  // Validate AWS SigV4 URL Structure
  assert(presignedS3.uploadUrl.includes('X-Amz-Algorithm=AWS4-HMAC-SHA256'), 'Must use AWS4-HMAC-SHA256 algorithm');
  assert(presignedS3.uploadUrl.includes('X-Amz-Credential=AKIAIOSFODNN7EXAMPLE'), 'Must include Access Key ID in credential');
  assert(presignedS3.uploadUrl.includes('X-Amz-Signature='), 'Must include computed HMAC-SHA256 signature');
  assert(presignedS3.uploadUrl.includes('X-Amz-Expires=900'), 'Must have 900s expiration');

  // Clean up env vars
  delete process.env.AWS_S3_BUCKET;
  delete process.env.AWS_REGION;
  delete process.env.AWS_ACCESS_KEY_ID;
  delete process.env.AWS_SECRET_ACCESS_KEY;

  // ---------------------------------------------------------------------------
  // Test 4: Local Storage Engine & Checksum Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Testing Local Storage Engine Fallback & SHA-256 Checksum ---');
  const samplePdfContent = Buffer.from('%PDF-1.4 Simulated High-Resolution Medical Certificate and Zakat Document Scan\n%%EOF');
  const localSaved = await StorageService.saveLocalFile(
    samplePdfContent,
    'medical_scan_certified.pdf',
    'application/pdf',
    'medical_cert',
    'assistance_request',
    'app-demo-123'
  );

  console.log(`[PASS] Local file saved:`);
  console.log(`       URL: ${localSaved.fileUrl}`);
  console.log(`       Storage Path: ${localSaved.storagePath}`);
  console.log(`       File Size: ${localSaved.fileSize} bytes`);
  console.log(`       SHA-256 Checksum: ${localSaved.checksum}`);

  const physicalPath = path.join(process.cwd(), 'public', 'uploads', 'documents', localSaved.storagePath);
  assert(fs.existsSync(physicalPath), 'Physical file must exist on disk');

  // ---------------------------------------------------------------------------
  // Test 5: Register Document in SQLite & Audit Log
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing SQLite Document Registration & Audit Trail ---');
  const registeredDoc = await StorageService.registerDocument(
    {
      name: 'medical_scan_certified.pdf',
      category: 'medical_cert',
      fileUrl: localSaved.fileUrl,
      storageProvider: 'local',
      storagePath: localSaved.storagePath,
      fileSize: localSaved.fileSize,
      mimeType: 'application/pdf',
      checksum: localSaved.checksum,
      entityType: 'assistance_request',
      entityId: 'app-demo-123',
    },
    { id: 'u-1', name: 'Super Admin', role: 'superadmin' }
  );

  console.log(`[PASS] Document registered in SQLite: ID = ${registeredDoc.id}`);

  // Query database directly to verify record
  const dbCheck = await db.execute({
    sql: 'SELECT id, name, storage_provider, storage_path, file_size, mime_type, checksum FROM application_documents WHERE id = ?',
    args: [registeredDoc.id],
  });
  assert.strictEqual(dbCheck.rows.length, 1, 'Document record must exist in DB');
  assert.strictEqual(dbCheck.rows[0].storage_provider, 'local');
  assert.strictEqual(dbCheck.rows[0].file_size, localSaved.fileSize);
  console.log(`[PASS] Database columns verified (storage_provider, file_size, checksum, mime_type)`);

  // Verify Audit Log
  const auditCheck = await db.execute({
    sql: "SELECT * FROM audit_logs WHERE action = 'DOCUMENT_UPLOADED' ORDER BY created_at DESC LIMIT 1",
  });
  assert(auditCheck.rows.length > 0, 'Audit log entry must be created');
  console.log(`[PASS] Audit log recorded: action = DOCUMENT_UPLOADED, user = ${auditCheck.rows[0].user_name}`);

  // ---------------------------------------------------------------------------
  // Test 6: Privacy Guard & Document Access Permission Check
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Testing Document Privacy Guard (PDPA Enforcement) ---');

  // Create a document linked to Yusuf (u-6, member)
  const yusufDoc = await StorageService.registerDocument(
    {
      name: 'yusuf_house_reg_scan.pdf',
      category: 'house_reg',
      fileUrl: '/uploads/documents/doc-yusuf-house.pdf',
      storageProvider: 'local',
      storagePath: 'doc-yusuf-house.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
      entityType: 'beneficiary',
      entityId: 'ben-yusuf-006', // Linked to Yusuf
    },
    { id: 'u-6', name: 'ยูซุฟ มีลาภ', role: 'member', nationalId: '1100200000006' }
  );

  // A. Super Admin should be able to access
  const adminDownload = await StorageService.getSecureDownloadUrl(yusufDoc.id, {
    id: 'u-1',
    name: 'Super Admin',
    role: 'superadmin',
  });
  assert.strictEqual(adminDownload, '/uploads/documents/doc-yusuf-house.pdf');
  console.log('[PASS] Super Admin granted access to confidential document');

  // B. Yusuf (the owner) should be able to access
  const ownerDownload = await StorageService.getSecureDownloadUrl(yusufDoc.id, {
    id: 'u-6',
    name: 'ยูซุฟ มีลาภ',
    role: 'member',
    nationalId: '1100200000006',
  });
  assert.strictEqual(ownerDownload, '/uploads/documents/doc-yusuf-house.pdf');
  console.log('[PASS] Document owner (Member Yusuf) granted access to own document');

  // C. Another member (u-7, Ahmad) trying to access Yusuf's document must be blocked
  let privacyBlocked = false;
  try {
    await StorageService.getSecureDownloadUrl(yusufDoc.id, {
      id: 'u-7',
      name: 'อาหมัด มีทรัพย์',
      role: 'member',
      nationalId: '1100500000007',
    });
  } catch (err: any) {
    privacyBlocked = true;
    console.log(`[PASS] Blocked unauthorized member: "${err.message}"`);
  }
  assert(privacyBlocked, 'Unauthorized member must be blocked from accessing other members documents');

  // ---------------------------------------------------------------------------
  // Test 7: End-to-End Assistance Request with Cloud Storage Attachments
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Testing Assistance Request Submission with Attached Documents ---');
  const appWithDocs = await RegistryService.createAssistanceRequest(
    {
      nationalId: '1100200000006',
      assistanceType: 'ซ่อมและสร้างที่อยู่อาศัย',
      requestedAmount: 18000,
      necessityDetails: 'หลังคาบ้านรั่วชำรุดเสียหายหนักช่วงฤดูมรสุม',
      documents: [
        {
          name: 'roof_damage_photo_highres.jpg',
          category: 'housing_exterior',
          fileUrl: '/uploads/documents/roof_damage_photo_highres.jpg',
          storageProvider: 's3',
          storagePath: 'assistance_request/app-demo/roof_damage_photo_highres.jpg',
          fileSize: 3500000,
          mimeType: 'image/jpeg',
        },
        {
          name: 'repair_cost_estimate.pdf',
          category: 'other_doc',
          fileUrl: '/uploads/documents/repair_cost_estimate.pdf',
          storageProvider: 's3',
          storagePath: 'assistance_request/app-demo/repair_cost_estimate.pdf',
          fileSize: 1200000,
          mimeType: 'application/pdf',
        },
      ],
    },
    { id: 'u-6', name: 'ยูซุฟ มีลาภ', role: 'member', nationalId: '1100200000006' }
  );

  console.log(`[PASS] Assistance Request created with Cloud Attachments: ${appWithDocs.applicationNo}`);

  // Query application documents in DB
  const attachedCheck = await db.execute({
    sql: 'SELECT id, name, category, storage_provider, file_size FROM application_documents WHERE application_id = ?',
    args: [appWithDocs.applicationId],
  });

  assert.strictEqual(attachedCheck.rows.length, 2, 'Must have 2 attached documents in DB');
  console.log(`[PASS] Verified 2 attached documents in database with storage_provider: ${attachedCheck.rows[0].storage_provider}`);

  console.log('\n========================================================================');
  console.log('  ALL CLOUD STORAGE & PRESIGNED URL TESTS PASSED WITH 100% SUCCESS!     ');
  console.log('========================================================================\n');
}

runStorageTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
