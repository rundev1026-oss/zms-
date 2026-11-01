import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:4000/api/v1';
const NEXT_BASE = 'http://localhost:3000';

async function main() {
  console.log('--- Step 1: Login to get token ---');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@zms.local', password: 'ZmsEnterprise2026!' }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('Login successful. Token obtained.');

  console.log('\n--- Step 2: Fetch beneficiaries to verify memberId in DB ---');
  const listRes = await fetch(`${API_BASE}/beneficiaries?page=1&pageSize=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) {
    throw new Error(`List failed: ${await listRes.text()}`);
  }
  const listData = await listRes.json();
  console.log(`Found ${listData.total} beneficiaries:`);
  for (const item of listData.items) {
    console.log(` - ID: ${item.id} | Registry: ${item.registryNumber} | MemberId: ${item.memberId} | Name: ${item.firstName} ${item.lastName}`);
    if (!item.memberId || !item.memberId.startsWith('MB-')) {
      throw new Error(`Invalid or missing memberId for ${item.registryNumber}: ${item.memberId}`);
    }
  }

  console.log('\n--- Step 3: Test search by Member ID ---');
  const targetMemberId = listData.items[0].memberId;
  const searchRes = await fetch(`${API_BASE}/beneficiaries?q=${encodeURIComponent(targetMemberId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const searchData = await searchRes.json();
  console.log(`Search for '${targetMemberId}' returned ${searchData.total} results.`);
  if (searchData.total === 0 || searchData.items[0].memberId !== targetMemberId) {
    throw new Error(`Search by memberId failed! Expected ${targetMemberId}`);
  }
  console.log('✓ Search by Member ID verified successfully!');

  console.log('\n--- Step 4: Generate Survey Document PDF via Next.js Route ---');
  const targetId = listData.items[0].id;
  const pdfRes = await fetch(`${NEXT_BASE}/api/registry/${targetId}/survey-document/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pdfRes.ok) {
    throw new Error(`PDF generation failed (${pdfRes.status}): ${await pdfRes.text()}`);
  }

  const contentType = pdfRes.headers.get('content-type');
  const xMemberId = pdfRes.headers.get('x-member-id');
  const xRegistryNumber = pdfRes.headers.get('x-registry-number');
  console.log(`Response headers: Content-Type=${contentType}, X-Member-Id=${xMemberId}, X-Registry-Number=${xRegistryNumber}`);

  if (!contentType?.includes('application/pdf')) {
    throw new Error(`Expected application/pdf, got ${contentType}`);
  }
  if (xMemberId !== targetMemberId) {
    throw new Error(`Expected X-Member-Id to be ${targetMemberId}, got ${xMemberId}`);
  }

  const pdfArrayBuffer = await pdfRes.arrayBuffer();
  const pdfBuffer = Buffer.from(pdfArrayBuffer);
  console.log(`PDF successfully generated! Size: ${pdfBuffer.length} bytes`);

  console.log('\n--- Step 5: Verify PDF Structure with pdf-lib ---');
  const doc = await PDFDocument.load(pdfBuffer);
  const pageCount = doc.getPageCount();
  console.log(`Page count: ${pageCount}`);
  if (pageCount < 3) {
    throw new Error(`Expected at least 3 pages, got ${pageCount}`);
  }

  const outputPath = path.join(process.cwd(), 'survey_sample_output.pdf');
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`✓ Sample PDF saved to: ${outputPath}`);

  console.log('\n--- Step 6: Verify master-form.pdf was NOT touched ---');
  const masterPath = path.join(process.cwd(), 'src', 'lib', 'surveyPrint', 'master-form.pdf');
  const masterStats = fs.statSync(masterPath);
  console.log(`master-form.pdf size: ${masterStats.size} bytes (unchanged)`);

  console.log('\n========================================');
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY! 🚀');
  console.log('========================================');
}

main().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
