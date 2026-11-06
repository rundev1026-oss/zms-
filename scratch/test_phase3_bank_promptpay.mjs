import { getDb, initDb } from '../src/lib/db.js';
import { FinancialService } from '../src/services/financialService.js';
import {
  validateThaiNationalOrTaxId,
  validateThaiPhone,
  validateBillerId,
  validatePromptPay,
  maskBankAccountNumber,
  maskPromptPayId,
} from '../src/lib/promptpayValidator.js';

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
  console.log('  PHASE 3 TEST SUITE: Bank Account & PromptPay Configuration');
  console.log('====================================================\n');

  await initDb();
  const db = getDb();

  // Initial cleanup of any leftover temp accounts before running tests
  await db.execute("DELETE FROM bank_accounts WHERE id NOT IN ('bank-1', 'bank-2', 'bank-3')");
  await db.execute("DELETE FROM bank_account_change_logs WHERE bank_account_id NOT IN ('bank-1', 'bank-2', 'bank-3')");

  // ----------------------------------------------------------------
  // 1. PromptPay Validation Tests (Phone, Tax ID, Biller ID, Mod 11)
  // ----------------------------------------------------------------
  console.log('--- TEST GROUP 1: PromptPay Validation & Checksum ---');

  // Phone Validation
  const validPhone = '0812345678';
  const invalidPhonePrefix = '0212345678';
  const invalidPhoneLen = '081234567';
  assert(validateThaiPhone(validPhone) === true, 'Valid Thai mobile phone (081-234-5678) passes');
  assert(validateThaiPhone(invalidPhonePrefix) === false, 'Non-mobile phone (02 prefix) fails');
  assert(validateThaiPhone(invalidPhoneLen) === false, 'Phone with < 10 digits fails');

  // National / Tax ID Checksum (Mod 11)
  // 0-1255-69000-12-6 is a valid 13-digit tax id with valid mod 11 check digit (6)
  const validTaxId = '0125569000126';
  const invalidTaxId = '0125569000129'; // Wrong check digit
  const repeatedId = '1111111111111'; // Pattern of all identical digits
  assert(validateThaiNationalOrTaxId(validTaxId) === true, 'Valid 13-digit Tax ID with Mod 11 check digit passes');
  assert(validateThaiNationalOrTaxId(invalidTaxId) === false, '13-digit ID with incorrect check digit fails');
  assert(validateThaiNationalOrTaxId(repeatedId) === false, '13-digit ID with 13 identical digits fails');

  // Biller ID
  const validBiller = '012345678901234';
  const invalidBiller = '0123456789';
  assert(validateBillerId(validBiller) === true, '15-digit Biller ID passes');
  assert(validateBillerId(invalidBiller) === false, 'Biller ID with wrong length fails');

  // Auto PromptPay detection
  const ppPhoneResult = validatePromptPay('081-234-5678');
  assert(ppPhoneResult.valid === true && ppPhoneResult.type === 'phone', 'Auto-detect phone PromptPay');
  assert(ppPhoneResult.formatted === '081-234-5678', 'Format phone display with hyphens');

  const ppTaxResult = validatePromptPay('0125569000126');
  assert(ppTaxResult.valid === true && ppTaxResult.type === 'tax_id', 'Auto-detect tax ID PromptPay');
  assert(ppTaxResult.formatted === '0-1255-69000-12-6', 'Format tax ID display with hyphens');

  const ppBillerResult = validatePromptPay('012345678901234');
  assert(ppBillerResult.valid === true && ppBillerResult.type === 'biller_id', 'Auto-detect biller ID PromptPay');

  const ppInvalidResult = validatePromptPay('1234567');
  assert(ppInvalidResult.valid === false && ppInvalidResult.error.length > 0, 'Invalid length returns descriptive error');

  // Masking utilities
  assert(maskBankAccountNumber('095-1-23456-7', false) === '095-x-xxx456-7', 'Bank account masking masks middle digits');
  assert(maskBankAccountNumber('095-1-23456-7', true) === '095-1-23456-7', 'Bank account unmasked returns full string');
  assert(maskPromptPayId('0812345678', false) === '081-xxx-5678', 'Phone PromptPay mask conceals middle digits');
  assert(maskPromptPayId('0125569000120', false) === '0-xxxx-xxxxx-20', 'Tax ID mask conceals middle digits');

  // ----------------------------------------------------------------
  // 2. Permission Boundary Tests (Strict Super Admin Role Enforcement)
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Permission Enforcement (Super Admin Only) ---');

  const financeActor = { id: 'usr-fin', name: 'Finance Staff', role: 'finance' };
  const officerActor = { id: 'usr-off', name: 'Officer Staff', role: 'officer' };
  const superAdminActor = { id: 'usr-sa', name: 'Super Admin User', role: 'super_admin' };

  // Try creating bank account with finance role -> should fail
  let financeCreateBlocked = false;
  try {
    await FinancialService.createBankAccount(
      {
        accountName: 'บัญชีทดสอบสิทธิ์',
        bankName: 'ธนาคารกสิกรไทย',
        accountNumber: '111-2-33333-4',
        openingBalance: 0,
      },
      financeActor
    );
  } catch (err) {
    financeCreateBlocked = true;
    assert(err.message.includes('Super Admin'), `Finance role blocked from creating bank account: "${err.message}"`);
  }
  assert(financeCreateBlocked, 'Non-super-admin is blocked from creating bank account');

  // Try updating bank account with officer role -> should fail
  let officerUpdateBlocked = false;
  try {
    await FinancialService.updateBankAccount(
      'bank-1',
      { branchName: 'สาขาแก้ไขทดสอบ' },
      officerActor
    );
  } catch (err) {
    officerUpdateBlocked = true;
    assert(err.message.includes('Super Admin'), `Officer role blocked from updating bank account: "${err.message}"`);
  }
  assert(officerUpdateBlocked, 'Non-super-admin is blocked from updating bank account');

  // Try setting default bank account with finance role -> should fail
  let financeDefaultBlocked = false;
  try {
    await FinancialService.setDefaultBankAccount('bank-2', financeActor);
  } catch (err) {
    financeDefaultBlocked = true;
    assert(err.message.includes('Super Admin'), `Finance role blocked from setting default account: "${err.message}"`);
  }
  assert(financeDefaultBlocked, 'Non-super-admin is blocked from setting default account');

  // Try toggling bank account status with finance role -> should fail
  let financeStatusBlocked = false;
  try {
    await FinancialService.toggleBankAccountStatus('bank-2', 'inactive', financeActor);
  } catch (err) {
    financeStatusBlocked = true;
    assert(err.message.includes('Super Admin'), `Finance role blocked from toggling status: "${err.message}"`);
  }
  assert(financeStatusBlocked, 'Non-super-admin is blocked from toggling account status');

  // ----------------------------------------------------------------
  // 3. PromptPay Check on Create / Update & Change Logs
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: PromptPay Validation in Service & Change Logs ---');

  // Super Admin creating account with invalid PromptPay -> should fail
  let invalidPpBlocked = false;
  try {
    await FinancialService.createBankAccount(
      {
        accountName: 'บัญชีทดสอบ PromptPay ผิด',
        bankName: 'ธนาคารกรุงเทพ',
        accountNumber: '999-0-12345-6',
        promptpayId: '0125569000129', // Invalid Mod 11 check digit
        openingBalance: 0,
      },
      superAdminActor
    );
  } catch (err) {
    invalidPpBlocked = true;
    assert(err.message.includes('PromptPay'), `Invalid PromptPay check digit rejected on create: "${err.message}"`);
  }
  assert(invalidPpBlocked, 'Service layer rejects invalid PromptPay checksum');

  // Create a temporary operational account with valid PromptPay
  const tempTestAccRes = await FinancialService.createBankAccount(
    {
      accountName: 'บัญชีกองทุนบริหารทดสอบ (Operational Only)',
      bankName: 'ธนาคารกรุงไทย',
      accountNumber: '888-0-99999-1',
      promptpayId: '0812345678', // Valid phone
      moneyTypes: ['operational'],
      openingBalance: 5000,
      effectiveDate: '2569-01-01',
    },
    superAdminActor
  );
  const tempAccId = tempTestAccRes.id;
  assert(tempTestAccRes.success === true, `Super admin created temporary test account: ${tempAccId}`);

  // Update account and verify field-level change logs
  const updateRes = await FinancialService.updateBankAccount(
    tempAccId,
    {
      branchName: 'สาขาทดสอบเพิ่มขึ้น',
      promptpayId: '0125569000126', // Change to valid Tax ID
      reason: 'เปลี่ยน PromptPay เป็นเลขประจำตัวผู้เสียภาษีตามมติบอร์ด',
      effectiveDate: '2569-02-01',
    },
    superAdminActor
  );
  assert(updateRes.success === true && updateRes.changesRecorded > 0, `Updated bank account with ${updateRes.changesRecorded} field changes recorded`);

  // Verify change log was inserted
  const logs = await FinancialService.getBankAccountChangeLogs(tempAccId);
  assert(logs.length >= 2, `Bank account change logs contain ${logs.length} entries for field modifications`);
  const ppLog = logs.find((l) => l.field_name === 'promptpay_id');
  assert(ppLog && ppLog.old_value === '0812345678' && ppLog.new_value === '0125569000126', 'Change log captured old and new PromptPay IDs accurately');

  // ----------------------------------------------------------------
  // 4. Payment Channel Mapping (Shariah-compliant Money Type Rules)
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Payment Channel Mapping Enforcement ---');

  // Attempt to record pure zakat donation to operational-only bank account -> MUST be rejected
  let channelViolationBlocked = false;
  try {
    await FinancialService.recordDonation(
      {
        fundId: 'fund-1',
        category: 'ซะกาตรายได้ประจำปี',
        amount: 1500,
        moneyType: 'zakat',
        paymentMethod: 'bank_transfer',
        bankAccountId: tempAccId, // allows only 'operational'
        donorName: 'ผู้บริจาคทดสอบ',
        referenceNo: `TEST-CH-VIOLATE-${Date.now()}`,
      },
      superAdminActor
    );
  } catch (err) {
    channelViolationBlocked = true;
    assert(
      err.message.includes('ข้อห้ามตามหลักการเงินและวัตถุประสงค์บัญชี'),
      `Channel mapping blocked zakat into operational account: "${err.message}"`
    );
  }
  assert(channelViolationBlocked, 'Pure zakat cannot be received into an operational-only bank account');

  // Attempt to record donation into inactive bank account -> MUST be rejected
  await FinancialService.toggleBankAccountStatus(tempAccId, 'inactive', superAdminActor);
  let inactiveBankBlocked = false;
  try {
    await FinancialService.recordDonation(
      {
        fundId: 'fund-6',
        category: 'เงินบริจาคค่าบริหาร',
        amount: 500,
        moneyType: 'operational_admin',
        paymentMethod: 'bank_transfer',
        bankAccountId: tempAccId, // currently inactive
        donorName: 'ผู้บริจาคทดสอบ',
        referenceNo: `TEST-INACT-${Date.now()}`,
      },
      superAdminActor
    );
  } catch (err) {
    inactiveBankBlocked = true;
    assert(
      err.message.includes('ไม่ได้เปิดใช้งาน'),
      `Inactive bank account rejected for donation: "${err.message}"`
    );
  }
  assert(inactiveBankBlocked, 'Donation cannot be recorded into inactive bank account');

  // ----------------------------------------------------------------
  // 5. Historical Snapshot Integrity
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Historical Snapshot Preservation ---');

  // Record a valid donation to bank-1 (Official Islamic Bank)
  const validTxnRef = `TEST-SNAP-${Date.now()}`;
  const validDonationRes = await FinancialService.recordDonation(
    {
      fundId: 'fund-1',
      category: 'ซะกาตรายได้',
      amount: 2500,
      moneyType: 'zakat',
      paymentMethod: 'bank_transfer',
      bankAccountId: 'bank-1', // Allows zakat
      donorName: 'ผู้บริจาคเพื่อสแน็ปช็อต',
      referenceNo: validTxnRef,
    },
    superAdminActor
  );
  assert(validDonationRes.transactionNo.length > 0, `Recorded valid donation with ref ${validTxnRef}`);

  // Query transaction from database and verify snapshot values
  const txnRowRes = await db.execute({
    sql: 'SELECT bank_name, bank_account_name, bank_account_number FROM financial_transactions WHERE reference_no = ?',
    args: [validTxnRef],
  });
  const txnRow = txnRowRes.rows[0];
  assert(
    txnRow.bank_name.includes('อิสลามแห่งประเทศไทย') &&
      txnRow.bank_account_number === '095-1-23456-7',
    `Transaction contains immutable bank snapshot: ${txnRow.bank_name} / ${txnRow.bank_account_number}`
  );

  // Clean up the temporary test transaction
  await db.execute({
    sql: 'DELETE FROM financial_transactions WHERE reference_no = ?',
    args: [validTxnRef],
  });

  // ----------------------------------------------------------------
  // 6. Clean Up & Ensure Exactly 3 Official Accounts Exist
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Database Integrity & Cleanup ---');

  // Delete the temporary test account (tempAccId) using FinancialService
  const delRes = await FinancialService.deleteBankAccount(tempAccId, superAdminActor);
  assert(delRes.success === true, `Cleanly deleted temporary test account ${tempAccId}`);

  // Also clean up any lingering test logs
  await db.execute({
    sql: 'DELETE FROM bank_account_change_logs WHERE bank_account_id = ?',
    args: [tempAccId],
  });

  // Check remaining accounts in bank_accounts
  const remainingRes = await db.execute('SELECT id, bank_name, account_number, is_default, money_types FROM bank_accounts ORDER BY id ASC');
  assert(remainingRes.rows.length === 3, `Exactly 3 official bank accounts exist in database (found: ${remainingRes.rows.length})`);

  for (const b of remainingRes.rows) {
    console.log(`    Account: ${b.id} | ${b.bank_name} (${b.account_number}) | default: ${b.is_default} | types: ${b.money_types}`);
  }

  // Verify bank-1 is still the default account
  const bank1 = remainingRes.rows.find((r) => r.id === 'bank-1');
  assert(bank1 && bank1.is_default === 1, 'Official primary account bank-1 remains the default account');

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
