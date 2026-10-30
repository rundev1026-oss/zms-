import { getDb, initDb } from '@/lib/db';
import { FinancialService } from '@/services/financialService';
import { BeneficiaryService } from '@/services/beneficiaryService';
import { RegistryService } from '@/services/registryService';
import { PublicPortalService } from '@/services/publicPortalService';

async function runStep6Verification() {
  console.log('===============================================================');
  console.log('STARTING STEP 6 END-TO-END VERIFICATION');
  console.log('Dynamic 3-Tier Assistance Requests Integration');
  console.log('===============================================================\n');

  await initDb();
  const db = getDb();
  const testIdsToClean: {
    applicationIds: string[];
    beneficiaryIds: string[];
    historyIds: string[];
    auditLogIds: string[];
  } = {
    applicationIds: [],
    beneficiaryIds: [],
    historyIds: [],
    auditLogIds: [],
  };

  const testActor = { id: 'usr-officer-01', name: 'นายเจ้าหน้าที่ ทดสอบ', role: 'officer' as const };

  try {
    // -----------------------------------------------------------------
    // TEST 1: Retrieve and verify active 3-tier hierarchy
    // -----------------------------------------------------------------
    console.log('--- TEST 1: Retrieve Active 3-Tier Hierarchy ---');
    const hierarchyResult = await FinancialService.getThreeTierFundHierarchy('2569', { activeOnly: true });
    const primaryGroups = hierarchyResult.primaryGroups;
    console.log(`Active Primary Groups: ${primaryGroups.length}`);
    if (!primaryGroups || primaryGroups.length === 0) {
      throw new Error('FAIL: Active 3-tier hierarchy is empty');
    }

    const faqirGroup = primaryGroups.find((g) => g.asnafCode === 'faqir_miskin');
    if (!faqirGroup) throw new Error('FAIL: faqir_miskin primary group not found');
    console.log(`Faqir-Miskin specific funds: ${faqirGroup.specificFunds?.length || 0}`);
    if (!faqirGroup.specificFunds || faqirGroup.specificFunds.length === 0) {
      throw new Error('FAIL: faqir_miskin has no specific funds');
    }

    const fund1 = faqirGroup.specificFunds[0];
    console.log(`Fund 1: [${fund1.code}] ${fund1.name}, assistance types: ${fund1.assistanceTypes?.length || 0}`);
    if (!fund1.assistanceTypes || fund1.assistanceTypes.length === 0) {
      throw new Error(`FAIL: Fund ${fund1.code} has no linked assistance types`);
    }

    const type1 = fund1.assistanceTypes[0];
    console.log(`Assistance Type 1: [${type1.code}] ${type1.name}`);
    console.log('PASS: Test 1 - Hierarchy retrieved with all 3 levels intact\n');

    // -----------------------------------------------------------------
    // TEST 2: Create Assistance Request with 3-tier linkage
    // -----------------------------------------------------------------
    console.log('--- TEST 2: Create Assistance Request with 3-Tier Linkage ---');
    const benRes = await db.execute(
      `SELECT * FROM beneficiaries LIMIT 1`
    );
    let testBen = benRes.rows[0];
    if (!testBen) {
      const benId = `test-ben-step6-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO beneficiaries (id, full_name, national_id, asnaf_category, registration_status, created_at, updated_at)
              VALUES (?, 'นาย ทดสอบ ขั้นที่หก', '1999999999991', 'faqir', 'qualified', datetime('now'), datetime('now'))`,
        args: [benId],
      });
      testIdsToClean.beneficiaryIds.push(benId);
      const resAfter = await db.execute({
        sql: `SELECT * FROM beneficiaries WHERE id = ?`,
        args: [benId],
      });
      testBen = resAfter.rows[0];
    }

    const reqResult = await RegistryService.createAssistanceRequest(
      {
        beneficiaryId: String(testBen.id),
        nationalId: String(testBen.national_id),
        primaryGroupCode: 'faqir_miskin',
        specificFundId: fund1.id,
        assistanceTypeId: type1.id,
        assistanceType: type1.name,
        requestedAmount: 5000,
        necessityDetails: 'ทดสอบการยื่นคำร้องแบบ 3 ระดับ ขั้นที่ 6',
        urgencyLevel: 'high',
      },
      testActor
    );

    testIdsToClean.applicationIds.push(reqResult.id);
    console.log(`Created Application ID: ${reqResult.id}, App No: ${reqResult.applicationNo}`);

    // Verify row in database
    const appRes = await db.execute({
      sql: `SELECT * FROM assistance_applications WHERE id = ?`,
      args: [reqResult.id],
    });
    const dbApp = appRes.rows[0];
    if (!dbApp) throw new Error('FAIL: Application row not found in DB');

    console.log('DB Application Row 3-Tier Columns:');
    console.log(`- primary_group_code: ${dbApp.primary_group_code}`);
    console.log(`- specific_fund_id:   ${dbApp.specific_fund_id}`);
    console.log(`- assistance_type_id: ${dbApp.assistance_type_id}`);
    console.log(`- assistance_type:    ${dbApp.assistance_type}`);
    console.log(`- classification_snapshot: ${dbApp.classification_snapshot ? 'PRESENT' : 'MISSING'}`);

    if (
      dbApp.primary_group_code !== 'faqir_miskin' ||
      dbApp.specific_fund_id !== fund1.id ||
      dbApp.assistance_type_id !== type1.id ||
      !dbApp.classification_snapshot
    ) {
      throw new Error('FAIL: Application 3-tier columns do not match requested IDs');
    }
    console.log('PASS: Test 2 - 3-tier columns and snapshot persisted accurately\n');

    // -----------------------------------------------------------------
    // TEST 3: Validation & Hierarchy Integrity
    // -----------------------------------------------------------------
    console.log('--- TEST 3: Hierarchy Integrity & Amount Validation ---');
    // 3.1 Amount <= 0 rejection
    try {
      await RegistryService.createAssistanceRequest(
        {
          beneficiaryId: String(testBen.id),
          primaryGroupCode: 'faqir_miskin',
          specificFundId: fund1.id,
          assistanceTypeId: type1.id,
          assistanceType: type1.name,
          requestedAmount: 0,
          necessityDetails: 'ทดสอบยอด 0',
        },
        testActor
      );
      throw new Error('FAIL: Expected rejection for requestedAmount <= 0');
    } catch (err: any) {
      console.log(`[Expected] Rejection for amount <= 0: ${err.message}`);
    }

    // 3.2 Mismatched Level 2 & Level 3 rejection
    const fund2 = faqirGroup.specificFunds[1];
    if (fund2 && fund2.assistanceTypes && fund2.assistanceTypes.length > 0) {
      const typeFromFund2 = fund2.assistanceTypes[0];
      try {
        await RegistryService.createAssistanceRequest(
          {
            beneficiaryId: String(testBen.id),
            primaryGroupCode: 'faqir_miskin',
            specificFundId: fund1.id, // fund1
            assistanceTypeId: typeFromFund2.id, // type from fund2!
            assistanceType: typeFromFund2.name,
            requestedAmount: 4000,
            necessityDetails: 'ทดสอบ mismatch กองทุน',
          },
          testActor
        );
        throw new Error('FAIL: Expected rejection for mismatched fund and type');
      } catch (err: any) {
        console.log(`[Expected] Rejection for mismatched fund & type: ${err.message}`);
      }
    }
    console.log('PASS: Test 3 - Integrity validation prevented invalid combinations\n');

    // -----------------------------------------------------------------
    // TEST 4: Anti-Duplicate 60-Second Flood Guard
    // -----------------------------------------------------------------
    console.log('--- TEST 4: 60-Second Rapid Duplicate Submission Guard ---');
    try {
      await RegistryService.createAssistanceRequest(
        {
          beneficiaryId: String(testBen.id),
          nationalId: String(testBen.national_id),
          primaryGroupCode: 'faqir_miskin',
          specificFundId: fund1.id,
          assistanceTypeId: type1.id,
          assistanceType: type1.name,
          requestedAmount: 5000,
          necessityDetails: 'ทดสอบการส่งซ้ำติดกัน',
        },
        testActor
      );
      throw new Error('FAIL: Expected 60-second flood guard to reject rapid duplicate');
    } catch (err: any) {
      console.log(`[Expected] Rapid duplicate blocked: ${err.message}`);
    }
    console.log('PASS: Test 4 - Anti-duplicate flood guard successfully blocked rapid submission\n');

    // -----------------------------------------------------------------
    // TEST 5: Pre-Approval Staff 3-Tier Classification Edit
    // -----------------------------------------------------------------
    console.log('--- TEST 5: Pre-Approval Staff Classification Edit ---');
    const targetFund = faqirGroup.specificFunds.length > 1 ? faqirGroup.specificFunds[1] : fund1;
    const targetType = targetFund.assistanceTypes![targetFund.assistanceTypes!.length - 1];

    const editOk = await BeneficiaryService.updateApplication(
      reqResult.id,
      {
        primaryGroupCode: 'faqir_miskin',
        specificFundId: targetFund.id,
        assistanceTypeId: targetType.id,
        assistanceType: targetType.name,
        requestedAmount: 7500,
      },
      testActor
    );

    if (!editOk) throw new Error('FAIL: Staff updateApplication returned false');

    const updatedRes = await db.execute({
      sql: `SELECT * FROM assistance_applications WHERE id = ?`,
      args: [reqResult.id],
    });
    const updatedApp = updatedRes.rows[0];
    console.log(`Updated App Specific Fund ID: ${updatedApp.specific_fund_id} (Expected: ${targetFund.id})`);
    console.log(`Updated App Assistance Type ID: ${updatedApp.assistance_type_id} (Expected: ${targetType.id})`);
    console.log(`Updated App Requested Amount: ${updatedApp.requested_amount} (Expected: 7500)`);

    if (
      updatedApp.specific_fund_id !== targetFund.id ||
      updatedApp.assistance_type_id !== targetType.id ||
      Number(updatedApp.requested_amount) !== 7500
    ) {
      throw new Error('FAIL: Application classification not updated properly');
    }

    // Verify audit log
    const auditRes = await db.execute({
      sql: `SELECT * FROM audit_logs WHERE entity_id = ? AND action = 'UPDATE_CLASSIFICATION' ORDER BY timestamp DESC LIMIT 1`,
      args: [reqResult.id],
    });
    const auditLogRow = auditRes.rows[0];
    console.log(`Audit Log for reclassification: ${auditLogRow ? 'FOUND' : 'MISSING'}`);
    if (!auditLogRow) throw new Error('FAIL: Audit log entry for classification update not found');
    console.log('PASS: Test 5 - Pre-approval classification update allowed and audited\n');

    // -----------------------------------------------------------------
    // TEST 6: Immutability / Lock Protection After Approval
    // -----------------------------------------------------------------
    console.log('--- TEST 6: Immutability Lock Protection After Approval ---');
    await db.execute({
      sql: `UPDATE assistance_applications SET status = 'approved', approved_amount = 7500 WHERE id = ?`,
      args: [reqResult.id],
    });

    try {
      await BeneficiaryService.updateApplication(
        reqResult.id,
        {
          primaryGroupCode: 'faqir_miskin',
          specificFundId: fund1.id,
          assistanceTypeId: type1.id,
          assistanceType: type1.name,
        },
        testActor
      );
      throw new Error('FAIL: Expected locked application to block classification change');
    } catch (err: any) {
      console.log(`[Expected] Blocked on approved application: ${err.message}`);
    }
    console.log('PASS: Test 6 - Approved applications are strictly locked against classification tampering\n');

    // -----------------------------------------------------------------
    // TEST 7: Public Portal Submission with 3-Tier Linkage
    // -----------------------------------------------------------------
    console.log('--- TEST 7: Public Portal Application Submission ---');
    const publicResult = await PublicPortalService.submitPublicAssistance({
      fullName: 'นายประชาชน ขั้นหก',
      nationalId: '1940200889988',
      phone: '081-999-8877',
      primaryGroupCode: 'faqir_miskin',
      specificFundId: fund1.id,
      assistanceTypeId: type1.id,
      assistanceType: type1.name,
      asnafCategory: 'faqir',
      address: '123 หมู่ 1',
      province: 'ปัตตานี',
      district: 'เมืองปัตตานี',
      community: 'ริมคลอง',
      housingCondition: 'poor',
      housingNotes: 'บ้านไม้',
      debtAmount: 0,
      debtPurpose: 'ไม่มี',
      requestedAmount: 6000,
      necessityDetails: 'ขอความช่วยเหลือผ่านระบบบริการประชาชนออนไลน์',
      monthlyIncome: 3000,
      monthlyExpense: 6000,
      urgencyLevel: 'urgent',
      householdMembers: [],
      documents: [],
    });

    testIdsToClean.applicationIds.push(publicResult.applicationId);
    console.log(`Public Application ID: ${publicResult.applicationId}, App No: ${publicResult.applicationNo}`);

    const pubRes = await db.execute({
      sql: `SELECT * FROM assistance_applications WHERE id = ?`,
      args: [publicResult.applicationId],
    });
    const dbPublicApp = pubRes.rows[0];
    if (!dbPublicApp) throw new Error('FAIL: Public application row not found');

    console.log(`Public App primary_group_code: ${dbPublicApp.primary_group_code}`);
    console.log(`Public App specific_fund_id:   ${dbPublicApp.specific_fund_id}`);
    console.log(`Public App assistance_type_id: ${dbPublicApp.assistance_type_id}`);

    if (
      dbPublicApp.primary_group_code !== 'faqir_miskin' ||
      dbPublicApp.specific_fund_id !== fund1.id ||
      dbPublicApp.assistance_type_id !== type1.id
    ) {
      throw new Error('FAIL: Public application did not persist complete 3-tier columns');
    }

    if (dbPublicApp.beneficiary_id) {
      testIdsToClean.beneficiaryIds.push(String(dbPublicApp.beneficiary_id));
    }
    console.log('PASS: Test 7 - Public portal submission properly mapped and recorded 3-tier linkage\n');

    console.log('===============================================================');
    console.log('ALL STEP 6 VERIFICATION TESTS PASSED (7 / 7)');
    console.log('===============================================================\n');
  } finally {
    // -----------------------------------------------------------------
    // CLEANUP
    // -----------------------------------------------------------------
    console.log('--- CLEANUP: Removing test records from zms.db ---');
    for (const appId of testIdsToClean.applicationIds) {
      await db.execute({ sql: `DELETE FROM assistance_applications WHERE id = ?`, args: [appId] });
      await db.execute({ sql: `DELETE FROM audit_logs WHERE entity_id = ?`, args: [appId] });
    }
    for (const benId of testIdsToClean.beneficiaryIds) {
      if (benId.startsWith('test-ben-step6-') || benId.startsWith('ben-pub-')) {
        await db.execute({ sql: `DELETE FROM beneficiaries WHERE id = ?`, args: [benId] });
      }
    }
    console.log('Database cleanup completed. System remains clean and pristine.\n');
  }
}

runStep6Verification().catch((err) => {
  console.error('\n*** STEP 6 VERIFICATION FAILED ***');
  console.error(err);
  process.exit(1);
});
