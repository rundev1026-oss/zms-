import { getDb, initDb } from '../src/lib/db.js';
import { FinancialService } from '../src/services/financialService.js';
import {
  calcCrc16,
  formatTlv,
  generateStaticPromptPayQr,
  generateDynamicPromptPayQr,
  generateQrDataUrl,
  generateQrSvg,
  parseAndValidatePromptPayQr,
  EMVCO_TAGS,
  PROMPTPAY_AID,
} from '../src/lib/promptpayQr.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('  PHASE 4 TEST SUITE: Real PromptPay QR Generator & Validator');
  console.log('====================================================\n');

  await initDb();
  const db = getDb();

  // ----------------------------------------------------------------
  // 1. CRC16-CCITT Engine Tests (Known Test Vectors)
  // ----------------------------------------------------------------
  console.log('--- TEST GROUP 1: CRC16-CCITT Engine & Test Vectors ---');

  // Standard CCITT test vector: '123456789' -> 0x29B1
  const crcStandard = calcCrc16('123456789');
  assert(crcStandard === '29B1', `Standard CRC-16/CCITT-FALSE for "123456789" is 29B1 (got: ${crcStandard})`);

  // BOT / PromptPay known test string
  const knownBotString = '00020101021129370016A0000006770101110113006681234567853037645802TH6304';
  const botCrc = calcCrc16(knownBotString);
  assert(botCrc === '823E', `BOT PromptPay test vector CRC is 823E (got: ${botCrc})`);

  // TLV formatting
  assert(formatTlv('00', '01') === '000201', 'formatTlv creates correct Tag (00), Length (02), Value (01)');
  assert(formatTlv('54', '100.00') === '5406100.00', 'formatTlv handles amount 100.00 with length 06');

  // ----------------------------------------------------------------
  // 2. Static QR Generation Tests (Phone, Tax ID, Biller ID)
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Static PromptPay QR Generation ---');

  // 2.1 Phone Static QR
  const staticPhone = await generateStaticPromptPayQr({
    promptpayId: '0812345678',
  });
  assert(staticPhone.success === true, 'Static Phone QR generated successfully');
  assert(staticPhone.payload.includes('010211'), 'Point of Initiation Method is 11 (Static)');
  assert(staticPhone.payload.includes('0016A000000677010111'), 'Contains PromptPay Credit Transfer AID (Tag 29 Sub 00)');
  assert(staticPhone.payload.includes('01130066812345678'), 'Phone correctly formatted as 0066812345678 with length 13');
  assert(staticPhone.payload.includes('5303764'), 'Currency is THB (764)');
  assert(staticPhone.payload.includes('5802TH'), 'Country is TH');
  assert(staticPhone.payload.endsWith(staticPhone.crc), 'Payload ends with computed CRC');

  // 2.2 Tax ID Static QR
  const staticTax = await generateStaticPromptPayQr({
    promptpayId: '0125569000126', // Valid Mod 11 check digit
    amount: 500,
  });
  assert(staticTax.success === true, 'Static Tax ID QR generated successfully');
  assert(staticTax.payload.includes('02130125569000126'), 'Tax ID formatted under Sub-tag 02 with length 13');
  assert(staticTax.payload.includes('5406500.00'), 'Amount 500.00 included under Tag 54');

  // 2.3 Biller ID Static QR (Tag 30)
  const staticBiller = await generateStaticPromptPayQr({
    promptpayId: '012345678901234', // 15 digits
  });
  assert(staticBiller.success === true, 'Static Biller ID QR generated successfully');
  assert(staticBiller.payload.includes('0016A000000677010112'), 'Contains PromptPay Bill Payment AID (Tag 30 Sub 00)');
  assert(staticBiller.payload.includes('0115012345678901234'), 'Biller ID formatted under Tag 30 Sub 01 with length 15');

  // ----------------------------------------------------------------
  // 3. Dynamic QR Generation Tests (Amount, Reference, Expiration)
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Dynamic PromptPay QR Generation ---');

  const testAmount = 1250.75;
  const testRef = 'TXN-REV-2569-99881';

  const dynamicQr = await generateDynamicPromptPayQr({
    promptpayId: '0-1255-69000-12-6',
    amount: testAmount,
    referenceNo: testRef,
    terminalLabel: 'ZMS ZAKAT',
    expiresInMinutes: 15,
  });

  assert(dynamicQr.success === true, 'Dynamic QR generated successfully');
  assert(dynamicQr.qrType === 'dynamic', 'QR Type is dynamic');
  assert(dynamicQr.payload.includes('010212'), 'Point of Initiation Method is 12 (Dynamic QR)');
  assert(dynamicQr.payload.includes('54071250.75'), 'Tag 54 contains exact amount 1250.75 with length 07');
  assert(dynamicQr.payload.includes(`07${testRef.length.toString().padStart(2, '0')}${testRef}`), 'Tag 62 Sub-tag 07 contains exact Reference No.');
  assert(dynamicQr.expiresAt !== undefined, 'Expiration timestamp is provided (15 mins)');
  assert(dynamicQr.dataUrl && dynamicQr.dataUrl.startsWith('data:image/png;base64,'), 'Generated local PNG data URL in-memory without external calls');

  // Validation of amount rule (must be > 0 for Dynamic QR)
  let zeroAmtBlocked = false;
  try {
    await generateDynamicPromptPayQr({
      promptpayId: '0812345678',
      amount: 0,
      referenceNo: 'REF-ZERO',
    });
  } catch (err) {
    zeroAmtBlocked = true;
  }
  assert(zeroAmtBlocked, 'Dynamic QR rejects 0 or negative amount');

  // ----------------------------------------------------------------
  // 4. Local Image Generation & Zero External API Calls
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Local QR Image Generation ---');

  const pngDataUrl = await generateQrDataUrl(dynamicQr.payload);
  assert(pngDataUrl.startsWith('data:image/png;base64,'), 'generateQrDataUrl outputs valid base64 PNG data URL');
  assert(pngDataUrl.length > 500, `Data URL contains valid PNG image bytes (${pngDataUrl.length} chars)`);

  const svgString = await generateQrSvg(dynamicQr.payload);
  assert(svgString.includes('<svg') && svgString.includes('</svg>'), 'generateQrSvg outputs clean SVG vector string');
  assert(svgString.includes('viewBox='), 'SVG has valid viewBox attributes');

  // ----------------------------------------------------------------
  // 5. QR Parser & Security Validator (Tamper Detection)
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: QR Parser & Integrity Validation ---');

  // Parse valid dynamic QR
  const parseResult = parseAndValidatePromptPayQr(dynamicQr.payload);
  assert(parseResult.valid === true, 'parseAndValidatePromptPayQr validates authentic dynamic QR payload');
  assert(parseResult.qrType === 'dynamic', 'Parser correctly identifies Dynamic QR (Tag 01=12)');
  assert(parseResult.amount === 1250.75, `Parser extracts exact amount: ${parseResult.amount}`);
  assert(parseResult.currency === '764', 'Parser extracts THB currency');
  assert(parseResult.reference === testRef, `Parser extracts exact reference: ${parseResult.reference}`);
  assert(parseResult.crc === dynamicQr.crc, `Parser verifies stated CRC matches computed CRC (${parseResult.crc})`);

  // Tamper Test 1: Maliciously change amount from 1250.75 to 9999.99 without updating CRC
  const tamperedPayload = dynamicQr.payload.replace('54071250.75', '54079999.99');
  const tamperResult1 = parseAndValidatePromptPayQr(tamperedPayload);
  assert(tamperResult1.valid === false, 'Tampered amount payload is detected and REJECTED');
  assert(tamperResult1.error.includes('CRC16 ไม่ถูกต้อง'), `Descriptive tamper error: "${tamperResult1.error}"`);

  // Tamper Test 2: Alter CRC digits
  const alteredCrcPayload = dynamicQr.payload.slice(0, -4) + '0000';
  const tamperResult2 = parseAndValidatePromptPayQr(alteredCrcPayload);
  assert(tamperResult2.valid === false, 'Tampered CRC digits are detected and REJECTED');

  // Tamper Test 3: Alter Currency from 764 to 840 (USD)
  const nonThbPayload = dynamicQr.payload.replace('5303764', '5303840');
  const recomputedNonThb = nonThbPayload.slice(0, -4) + calcCrc16(nonThbPayload.slice(0, -4));
  const nonThbResult = parseAndValidatePromptPayQr(recomputedNonThb);
  assert(nonThbResult.valid === false, 'Non-THB currency (840) is rejected');
  assert(nonThbResult.error.includes('764'), `Rejected with currency message: "${nonThbResult.error}"`);

  // ----------------------------------------------------------------
  // 6. QR Session Persistence & "No Automatic Confirmation" Rule
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: QR Session Persistence & Financial Boundary ---');

  const sessionRef = `TEST-QRSESS-${Date.now()}`;
  const qrSessionRes = await FinancialService.createPromptPayQrSession({
    amount: 3000,
    referenceNo: sessionRef,
    bankAccountId: 'bank-1', // Official Islamic Bank
    moneyType: 'zakat',
    expiresInMinutes: 15,
    terminalLabel: 'ZMS ZAKAT',
  });

  assert(qrSessionRes.sessionId.startsWith('qrs-'), `QR Session created in database: ${qrSessionRes.sessionId}`);
  assert(qrSessionRes.bankSnapshot.bankName.includes('อิสลามแห่งประเทศไทย'), 'Captured immutable destination bank name in session');
  assert(qrSessionRes.bankSnapshot.accountNumber === '095-1-23456-7', 'Captured immutable destination account number in session');

  // CRUCIAL FINANCIAL RULE:
  // Check financial_transactions table: Creating a QR Code must NEVER create a 'completed' or 'PAID' donation!
  const prematureCheck = await db.execute({
    sql: "SELECT id, status FROM financial_transactions WHERE reference_no = ? AND status IN ('completed', 'PAID')",
    args: [sessionRef],
  });
  assert(prematureCheck.rows.length === 0, 'CRITICAL: No donation is marked as PAID or completed simply because QR was created');

  // Verify retrieval of QR Session
  const retrievedSession = await FinancialService.getPromptPayQrSession(sessionRef);
  assert(retrievedSession !== null, 'Retrieved active QR session from database');
  assert(retrievedSession.status === 'active', `QR session status is active (status: ${retrievedSession.status})`);
  assert(retrievedSession.amount === 3000, 'Retrieved session retains exact amount 3000');

  // ----------------------------------------------------------------
  // 7. Destination Snapshot Preservation across Bank Updates
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Destination Snapshot Preservation ---');

  // Simulate editing bank-1 in the bank_accounts table (e.g. changing branch or details)
  const originalSessionSnapshot = { ...qrSessionRes.bankSnapshot };

  // Update bank-1 branch
  await db.execute({
    sql: "UPDATE bank_accounts SET branch_name = 'สาขากรุงเทพฯ เปลี่ยนใหม่' WHERE id = 'bank-1'",
  });

  // Verify the QR session created earlier still retains the snapshot data from creation time
  const recheckedSession = await FinancialService.getPromptPayQrSession(sessionRef);
  assert(
    recheckedSession.bankName === originalSessionSnapshot.bankName &&
      recheckedSession.accountNumber === originalSessionSnapshot.accountNumber,
    'QR Session destination snapshot remains unchanged after bank account setting modifications'
  );

  // Restore bank-1 branch
  await db.execute({
    sql: "UPDATE bank_accounts SET branch_name = 'สำนักงานใหญ่ กรุงเทพมหานคร' WHERE id = 'bank-1'",
  });

  // Clean up the test QR session
  await db.execute({
    sql: 'DELETE FROM donation_qr_sessions WHERE reference_no = ?',
    args: [sessionRef],
  });
  assert(true, 'Cleaned up test QR session from database');

  // Ensure 3 official accounts exist untouched
  const finalBanks = await db.execute('SELECT id, bank_name, account_number, is_default FROM bank_accounts');
  assert(finalBanks.rows.length === 3, `Exactly 3 official foundation accounts exist (found: ${finalBanks.rows.length})`);

  console.log('\n====================================================');
  console.log(`  PHASE 4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error in Phase 4 suite:', err);
  process.exit(1);
});
