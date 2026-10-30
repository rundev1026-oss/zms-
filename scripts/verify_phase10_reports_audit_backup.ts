/**
 * Phase 10 Verification Suite: Reports & BI, Audit Trail, System Settings & Database Backup
 *
 * Test Suites:
 * 1. Role Authentication & RBAC Tokens (Auditor, Finance, Super Admin, Officer)
 * 2. Executive Asnaf Distribution Report (GET /reports/asnaf-distribution)
 * 3. Financial Summary & Fund Hierarchy Report (GET /reports/financial-summary)
 * 4. Monthly Trends & Disbursement Trajectory (GET /reports/monthly-trends)
 * 5. Beneficiary Demographics & Vulnerability Report (GET /reports/demographics)
 * 6. Executive Dashboard KPI Cards (GET /reports/executive-dashboard)
 * 7. Audit Trail Listing, Search & Pagination (GET /audit-logs)
 * 8. Single Audit Log Detail & 404 Guard (GET /audit-logs/:id)
 * 9. Audit Trail Activity Summary & Statistics (GET /audit-logs/summary)
 * 10. System Settings Retrieval & Filtering (GET /settings)
 * 11. System Settings Update & RBAC Protection (PATCH /settings)
 * 12. Database Backup Snapshot Creation (POST /backup/create)
 * 13. Database Backup History & Integrity (GET /backup/history)
 * 14. Database Relational Integrity Verification (GET /backup/verify)
 * 15. Next.js BFF Proxy Endpoints Integration (/api/reports/*, /api/audit-logs/*, /api/settings, /api/backup/*)
 */

import pkg from '../apps/api/node_modules/@prisma/client/default.js';
const { PrismaClient } = pkg;

const API_BASE = 'http://localhost:4000/api/v1';
const NEXT_BASE = 'http://localhost:3001/api';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] #${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] #${totalTests}: ${testName}`, details ?? '');
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function login(email: string, password = 'ZmsEnterprise2026!') {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.accessToken as string;
}

async function runVerification() {
  console.log('================================================================');
  console.log('   PHASE 10: REPORTS, AUDIT TRAIL, SETTINGS & BACKUP SUITE       ');
  console.log('================================================================\n');

  const prisma = new PrismaClient();

  try {
    // -------------------------------------------------------------
    // SUITE 1: Role Authentication & RBAC Tokens
    // -------------------------------------------------------------
    console.log('--- SUITE 1: Role Authentication & RBAC Tokens ---');
    const auditorToken = await login('auditor@zms.local');
    assert(!!auditorToken, 'Auditor login successful & JWT token issued');

    const financeToken = await login('finance@zms.local');
    assert(!!financeToken, 'Finance Officer login successful & JWT token issued');

    const adminToken = await login('admin@zms.local');
    assert(!!adminToken, 'Super Admin login successful & JWT token issued');

    const officerToken = await login('officer@zms.local');
    assert(!!officerToken, 'Officer login successful & JWT token issued');

    // -------------------------------------------------------------
    // SUITE 2: Executive Asnaf Distribution Report
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: Executive Asnaf Distribution Report ---');
    const asnafRes = await fetch(`${API_BASE}/reports/asnaf-distribution`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(asnafRes.ok, 'GET /reports/asnaf-distribution returns 200 OK');
    const asnafReport = await asnafRes.json();
    assert(Array.isArray(asnafReport.items), 'Report returns items array');
    assert(asnafReport.items.length === 8, 'Covers all 8 canonical Asnaf categories');

    const categoryCodes = asnafReport.items.map((c: any) => c.asnafCode.toLowerCase());
    assert(categoryCodes.includes('faqir'), 'Includes faqir category');
    assert(categoryCodes.includes('miskin'), 'Includes miskin category');
    assert(categoryCodes.includes('amil'), 'Includes amil category');
    assert(categoryCodes.includes('muallaf'), 'Includes muallaf category');
    assert(categoryCodes.includes('riqab'), 'Includes riqab category');
    assert(categoryCodes.includes('gharimin'), 'Includes gharimin category');
    assert(categoryCodes.includes('fisabilillah'), 'Includes fisabilillah category');
    assert(categoryCodes.includes('ibnus_sabil'), 'Includes ibnus_sabil category');

    assert(typeof asnafReport.grandTotalDisbursed === 'number', 'Grand total disbursed amount is numeric');
    assert(typeof asnafReport.grandTotalApplications === 'number', 'Grand total applications count is numeric');
    assert(asnafReport.grandTotalApplications > 0, 'Found registered applications across categories');

    // Date/Fiscal year filtering test
    const filteredAsnafRes = await fetch(`${API_BASE}/reports/asnaf-distribution?fiscalYear=2569`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(filteredAsnafRes.ok, 'GET /reports/asnaf-distribution with fiscalYear filter returns 200 OK');
    const filteredAsnaf = await filteredAsnafRes.json();
    assert(filteredAsnaf.items.length === 8, 'Filtered report maintains all 8 categories');

    // -------------------------------------------------------------
    // SUITE 3: Financial Summary & Fund Hierarchy Report
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Financial Summary & Fund Hierarchy Report ---');
    const finRes = await fetch(`${API_BASE}/reports/financial-summary`, {
      headers: { Authorization: `Bearer ${financeToken}` },
    });
    assert(finRes.ok, 'GET /reports/financial-summary returns 200 OK');
    const finSummary = await finRes.json();
    assert(typeof finSummary.totalReceived === 'number', 'Total funds received is numeric');
    assert(typeof finSummary.totalDisbursed === 'number', 'Total assistance disbursed is numeric');
    assert(typeof finSummary.totalAvailable === 'number', 'Total available funds is numeric');
    assert(Array.isArray(finSummary.funds), 'Returns fund accounts breakdown');
    assert(finSummary.funds.length > 0, 'Fund accounts list is populated');
    assert(Array.isArray(finSummary.subFunds), 'Returns sub-fund accounts breakdown');
    assert(finSummary.subFunds.length > 0, 'Sub-fund accounts list is populated');
    assert(Array.isArray(finSummary.bankAccounts), 'Returns bank accounts breakdown');
    assert(finSummary.bankAccounts.length > 0, 'Bank accounts list is populated');
    assert(typeof finSummary.totalBankBalance === 'number', 'Total bank balance is numeric');

    // -------------------------------------------------------------
    // SUITE 4: Monthly Trends & Trajectory Report
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: Monthly Trends & Trajectory Report ---');
    const trendsRes = await fetch(`${API_BASE}/reports/monthly-trends`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(trendsRes.ok, 'GET /reports/monthly-trends returns 200 OK');
    const trendsData = await trendsRes.json();
    assert(Array.isArray(trendsData.monthlyData), 'Trends returns monthlyData array');
    assert(trendsData.monthlyData.length === 12, 'Returns 12 months fiscal data points');
    const firstMonth = trendsData.monthlyData[0];
    assert(typeof firstMonth.monthName === 'string', 'Month identifier string present');
    assert(typeof firstMonth.applicationsCount === 'number', 'Monthly applications count is numeric');
    assert(typeof firstMonth.approvedCount === 'number', 'Monthly approved count is numeric');
    assert(typeof firstMonth.totalDisbursedAmount === 'number', 'Monthly disbursed amount is numeric');

    // -------------------------------------------------------------
    // SUITE 5: Beneficiary Demographics & Vulnerability Report
    // -------------------------------------------------------------
    console.log('\n--- SUITE 5: Beneficiary Demographics & Vulnerability Report ---');
    const demoRes = await fetch(`${API_BASE}/reports/demographics`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(demoRes.ok, 'GET /reports/demographics returns 200 OK');
    const demoData = await demoRes.json();
    assert(typeof demoData.totalBeneficiaries === 'number', 'Total beneficiaries is numeric');
    assert(demoData.totalBeneficiaries > 0, 'Beneficiaries exist in database');
    assert(Array.isArray(demoData.byProvince), 'Demographics by province array present');
    assert(Array.isArray(demoData.byStatus), 'Demographics by status array present');
    assert(typeof demoData.byAgeGroup === 'object', 'Demographics by age group object present');
    assert(typeof demoData.byAgeGroup.under18 === 'number', 'Under 18 demographic count is numeric');
    assert(typeof demoData.byAgeGroup.age18To35 === 'number', 'Age 18-35 demographic count is numeric');
    assert(typeof demoData.byAgeGroup.age36To60 === 'number', 'Age 36-60 demographic count is numeric');
    assert(typeof demoData.byAgeGroup.over60 === 'number', 'Over 60 demographic count is numeric');

    // -------------------------------------------------------------
    // SUITE 6: Executive Dashboard KPI Cards
    // -------------------------------------------------------------
    console.log('\n--- SUITE 6: Executive Dashboard KPI Cards ---');
    const dashRes = await fetch(`${API_BASE}/reports/executive-dashboard`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(dashRes.ok, 'GET /reports/executive-dashboard returns 200 OK');
    const dashData = await dashRes.json();
    assert(typeof dashData.totalBeneficiaries === 'number', 'KPI total beneficiaries is numeric');
    assert(typeof dashData.totalApplications === 'number', 'KPI total applications is numeric');
    assert(typeof dashData.totalAssistanceDisbursed === 'number', 'KPI total assistance disbursed is numeric');
    assert(typeof dashData.totalAvailableFunds === 'number', 'KPI total available funds is numeric');
    assert(typeof dashData.pendingApprovalsCount === 'number', 'KPI pending approvals count is numeric');
    assert(typeof dashData.timestamp === 'string', 'Dashboard snapshot timestamp string present');

    // -------------------------------------------------------------
    // SUITE 7: Audit Trail Listing, Search & Pagination
    // -------------------------------------------------------------
    console.log('\n--- SUITE 7: Audit Trail Listing, Search & Pagination ---');
    const auditRes = await fetch(`${API_BASE}/audit-logs?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(auditRes.ok, 'GET /audit-logs returns 200 OK for Auditor');
    const auditData = await auditRes.json();
    assert(Array.isArray(auditData.items), 'Audit items is an array');
    assert(typeof auditData.total === 'number', 'Audit total count is numeric');
    assert(auditData.page === 1, 'Audit current page is 1');
    assert(auditData.limit === 10, 'Audit limit is 10');
    assert(auditData.items.length <= 10, 'Returned items within limit');

    // Search by action
    const actionSearchRes = await fetch(`${API_BASE}/audit-logs?action=BANK_RECONCILIATION_COMPLETED`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(actionSearchRes.ok, 'GET /audit-logs with action filter returns 200 OK');
    const actionSearchData = await actionSearchRes.json();
    assert(Array.isArray(actionSearchData.items), 'Action-filtered audit items is an array');

    // Free text search
    const textSearchRes = await fetch(`${API_BASE}/audit-logs?search=zms`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(textSearchRes.ok, 'GET /audit-logs with search query returns 200 OK');

    // -------------------------------------------------------------
    // SUITE 8: Single Audit Log Detail & 404 Guard
    // -------------------------------------------------------------
    console.log('\n--- SUITE 8: Single Audit Log Detail & 404 Guard ---');
    const sampleLog = auditData.items[0];
    assert(!!sampleLog && !!sampleLog.id, 'Sample audit log exists');
    const singleLogRes = await fetch(`${API_BASE}/audit-logs/${sampleLog.id}`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(singleLogRes.ok, `GET /audit-logs/${sampleLog.id} returns 200 OK`);
    const singleLog = await singleLogRes.json();
    assert(singleLog.id === sampleLog.id, 'Retrieved audit log ID matches');
    assert(typeof singleLog.action === 'string', 'Audit log has action property');
    assert(typeof singleLog.resourceType === 'string', 'Audit log has resourceType property');

    // 404 Guard on non-existent UUID
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const notFoundRes = await fetch(`${API_BASE}/audit-logs/${nonExistentId}`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(notFoundRes.status === 404, 'GET /audit-logs with non-existent ID returns 404 Not Found');

    // -------------------------------------------------------------
    // SUITE 9: Audit Trail Activity Summary & Statistics
    // -------------------------------------------------------------
    console.log('\n--- SUITE 9: Audit Trail Activity Summary & Statistics ---');
    const auditSummaryRes = await fetch(`${API_BASE}/audit-logs/summary`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(auditSummaryRes.ok, 'GET /audit-logs/summary returns 200 OK');
    const auditSummary = await auditSummaryRes.json();
    assert(typeof auditSummary.totalAuditLogs === 'number', 'Summary totalAuditLogs is numeric');
    assert(Array.isArray(auditSummary.topActions), 'Summary topActions is an array');
    assert(auditSummary.topActions.length > 0, 'Top actions populated with activity entries');

    // -------------------------------------------------------------
    // SUITE 10: System Settings Retrieval & Default Parameters
    // -------------------------------------------------------------
    console.log('\n--- SUITE 10: System Settings Retrieval & Default Parameters ---');
    const settingsRes = await fetch(`${API_BASE}/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(settingsRes.ok, 'GET /settings returns 200 OK for Super Admin');
    const settingsObj = await settingsRes.json();
    assert(typeof settingsObj === 'object' && !Array.isArray(settingsObj), 'Settings returned as structured object');
    assert(typeof settingsObj.organizationNameTh === 'string', 'Organization name TH present');
    assert(typeof settingsObj.activeFiscalYear === 'string', 'Active fiscal year present');
    assert(typeof settingsObj.approvalLimitTier1 === 'number', 'Approval limit tier 1 is numeric');
    assert(typeof settingsObj.approvalLimitTier2 === 'number', 'Approval limit tier 2 is numeric');
    assert(typeof settingsObj.approvalLimitTier3 === 'number', 'Approval limit tier 3 is numeric');

    // -------------------------------------------------------------
    // SUITE 11: System Settings Update & RBAC Protection
    // -------------------------------------------------------------
    console.log('\n--- SUITE 11: System Settings Update & RBAC Protection ---');
    // 1. Officer should be blocked (403 Forbidden)
    const officerUpdateRes = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        organizationNameTh: 'Hacked Title',
      }),
    });
    assert(officerUpdateRes.status === 403, 'PATCH /settings by non-admin returns 403 Forbidden');

    // 2. Super Admin updates settings successfully
    const updatedName = 'มูลนิธิเพื่อการบริหารจัดการซะกาตและสาธารณกุศลแห่งประเทศไทย (สำนักงานใหญ่)';
    const adminUpdateRes = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        organizationNameTh: updatedName,
        approvalLimitTier1: 15000,
        phone: '02-999-8888',
      }),
    });
    assert(adminUpdateRes.ok, 'PATCH /settings by Super Admin returns 200 OK');
    const updatedSettings = await adminUpdateRes.json();
    assert(updatedSettings.organizationNameTh === updatedName, 'Updated organization name persisted');
    assert(updatedSettings.approvalLimitTier1 === 15000, 'Updated approval limit tier 1 persisted');

    // -------------------------------------------------------------
    // SUITE 12: Database Backup Snapshot Creation
    // -------------------------------------------------------------
    console.log('\n--- SUITE 12: Database Backup Snapshot Creation ---');
    // 1. Officer blocked from creating backup (403 Forbidden)
    const officerBackupRes = await fetch(`${API_BASE}/backup/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ notes: 'Officer attempted backup' }),
    });
    assert(officerBackupRes.status === 403, 'POST /backup/create by Officer returns 403 Forbidden');

    // 2. Super Admin creates backup snapshot
    const backupNotes = `อัตโนมัติรอบการตรวจสอบ Phase 10 - ${new Date().toISOString()}`;
    const adminBackupRes = await fetch(`${API_BASE}/backup/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        backupType: 'snapshot',
        notes: backupNotes,
      }),
    });
    assert(adminBackupRes.ok, 'POST /backup/create by Super Admin returns 201/200 OK');
    const backupData = await adminBackupRes.json();
    assert(!!backupData.id, 'Backup record has unique ID');
    assert(typeof backupData.fileName === 'string' && backupData.fileName.startsWith('zms_backup_'), 'Backup file name follows standard pattern');
    assert(backupData.totalTables >= 9, 'Backup cataloged 9 or more core tables');
    assert(backupData.totalRecords > 2000, 'Backup cataloged complete database (> 2,000 records)');
    assert(backupData.status === 'completed', 'Backup status marked as completed');
    assert(typeof backupData.verificationSum === 'number', 'Financial verification checksum recorded');

    // -------------------------------------------------------------
    // SUITE 13: Database Backup History & Integrity
    // -------------------------------------------------------------
    console.log('\n--- SUITE 13: Database Backup History & Integrity ---');
    const historyRes = await fetch(`${API_BASE}/backup/history`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(historyRes.ok, 'GET /backup/history returns 200 OK for Auditor');
    const historyData = await historyRes.json();
    assert(Array.isArray(historyData), 'Backup history returns an array');
    assert(historyData.length > 0, 'Backup history contains at least one record');

    const createdRecord = historyData.find((b: any) => b.id === backupData.id);
    assert(!!createdRecord, 'Newly created backup snapshot appears in history list');
    assert(createdRecord.triggeredByName && createdRecord.triggeredByName.includes('ผู้ดูแลระบบสูงสุด'), 'Backup actor recorded accurately');
    assert(createdRecord.notes === backupNotes, 'Backup notes persisted correctly');

    // -------------------------------------------------------------
    // SUITE 14: Database Relational Integrity Verification
    // -------------------------------------------------------------
    console.log('\n--- SUITE 14: Database Relational Integrity Verification ---');
    const integrityRes = await fetch(`${API_BASE}/backup/verify`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(integrityRes.ok, 'GET /backup/verify returns 200 OK for Auditor');
    const integrityData = await integrityRes.json();
    assert(integrityData.status === 'healthy', 'Database status is healthy');
    assert(integrityData.integrityVerified === true, 'Database relational integrity verified 100%');
    assert(integrityData.checks.orphanedApplications.passed === true, 'Zero orphaned assistance applications');
    assert(integrityData.checks.orphanedApplications.count === 0, 'Orphaned applications count is exactly 0');
    assert(integrityData.checks.orphanedHouseholdMembers.passed === true, 'Zero orphaned household members');
    assert(integrityData.checks.orphanedHouseholdMembers.count === 0, 'Orphaned household members count is exactly 0');
    assert(integrityData.checks.financialConsistency.passed === true, 'Financial consistency check passed');

    // -------------------------------------------------------------
    // SUITE 15: Next.js BFF Proxy Endpoints Integration
    // -------------------------------------------------------------
    console.log('\n--- SUITE 15: Next.js BFF Proxy Endpoints Integration ---');
    const bffHeaders = {
      Authorization: `Bearer ${adminToken}`,
      'x-zms-csrf': '1',
      'Content-Type': 'application/json',
    };

    // 1. Next.js BFF Asnaf Distribution
    const nextAsnafRes = await fetch(`${NEXT_BASE}/reports/asnaf-distribution`, {
      headers: bffHeaders,
    });
    assert(nextAsnafRes.ok, 'Next.js BFF GET /api/reports/asnaf-distribution returns 200 OK');
    const nextAsnaf = await nextAsnafRes.json();
    assert(nextAsnaf.success === true && Array.isArray(nextAsnaf.data.items), 'BFF asnaf distribution response envelope valid');

    // 2. Next.js BFF Financial Summary
    const nextFinRes = await fetch(`${NEXT_BASE}/reports/financial-summary`, {
      headers: bffHeaders,
    });
    assert(nextFinRes.ok, 'Next.js BFF GET /api/reports/financial-summary returns 200 OK');
    const nextFin = await nextFinRes.json();
    assert(nextFin.success === true && Array.isArray(nextFin.data.funds), 'BFF financial summary response envelope valid');

    // 3. Next.js BFF Monthly Trends
    const nextTrendsRes = await fetch(`${NEXT_BASE}/reports/monthly-trends`, {
      headers: bffHeaders,
    });
    assert(nextTrendsRes.ok, 'Next.js BFF GET /api/reports/monthly-trends returns 200 OK');
    const nextTrends = await nextTrendsRes.json();
    assert(nextTrends.success === true && Array.isArray(nextTrends.data.monthlyData), 'BFF monthly trends returns monthlyData array');

    // 4. Next.js BFF Demographics
    const nextDemoRes = await fetch(`${NEXT_BASE}/reports/demographics`, {
      headers: bffHeaders,
    });
    assert(nextDemoRes.ok, 'Next.js BFF GET /api/reports/demographics returns 200 OK');
    const nextDemo = await nextDemoRes.json();
    assert(nextDemo.success === true && Array.isArray(nextDemo.data.byProvince), 'BFF demographics response envelope valid');

    // 5. Next.js BFF Executive Dashboard
    const nextDashRes = await fetch(`${NEXT_BASE}/reports/executive-dashboard`, {
      headers: bffHeaders,
    });
    assert(nextDashRes.ok, 'Next.js BFF GET /api/reports/executive-dashboard returns 200 OK');
    const nextDash = await nextDashRes.json();
    assert(nextDash.success === true && typeof nextDash.data.totalBeneficiaries === 'number', 'BFF executive dashboard valid');

    // 6. Next.js BFF Audit Logs Listing
    const nextAuditRes = await fetch(`${NEXT_BASE}/audit-logs?page=1&limit=5`, {
      headers: bffHeaders,
    });
    assert(nextAuditRes.ok, 'Next.js BFF GET /api/audit-logs returns 200 OK');
    const nextAudit = await nextAuditRes.json();
    assert(nextAudit.success === true && Array.isArray(nextAudit.data), 'BFF audit logs response envelope valid');
    assert(nextAudit.pagination.limit === 5, 'BFF pagination metadata forwarded correctly');

    // 7. Next.js BFF Audit Summary
    const nextAuditSumRes = await fetch(`${NEXT_BASE}/audit-logs/summary`, {
      headers: bffHeaders,
    });
    assert(nextAuditSumRes.ok, 'Next.js BFF GET /api/audit-logs/summary returns 200 OK');
    const nextAuditSum = await nextAuditSumRes.json();
    assert(nextAuditSum.success === true && typeof nextAuditSum.data.totalAuditLogs === 'number', 'BFF audit summary valid');

    // 8. Next.js BFF Settings GET & PATCH
    const nextSettingsRes = await fetch(`${NEXT_BASE}/settings`, {
      headers: bffHeaders,
    });
    assert(nextSettingsRes.ok, 'Next.js BFF GET /api/settings returns 200 OK');
    const nextSettings = await nextSettingsRes.json();
    assert(nextSettings.success === true && typeof nextSettings.data === 'object', 'BFF settings object valid');

    const nextPatchRes = await fetch(`${NEXT_BASE}/settings`, {
      method: 'PATCH',
      headers: bffHeaders,
      body: JSON.stringify({
        phone: '02-888-7777',
      }),
    });
    assert(nextPatchRes.ok, 'Next.js BFF PATCH /api/settings returns 200 OK');

    // 9. Next.js BFF Backup Verify
    const nextVerifyRes = await fetch(`${NEXT_BASE}/backup/verify`, {
      headers: bffHeaders,
    });
    assert(nextVerifyRes.ok, 'Next.js BFF GET /api/backup/verify returns 200 OK');
    const nextVerify = await nextVerifyRes.json();
    assert(nextVerify.success === true && nextVerify.data.status === 'healthy', 'BFF backup verify returns healthy');

    // 10. Next.js BFF Backup History
    const nextHistRes = await fetch(`${NEXT_BASE}/backup/history`, {
      headers: bffHeaders,
    });
    assert(nextHistRes.ok, 'Next.js BFF GET /api/backup/history returns 200 OK');
    const nextHist = await nextHistRes.json();
    assert(nextHist.success === true && Array.isArray(nextHist.data), 'BFF backup history returns array');

    // 11. Next.js BFF Backup Create
    const nextCreateRes = await fetch(`${NEXT_BASE}/backup/create`, {
      method: 'POST',
      headers: bffHeaders,
      body: JSON.stringify({
        notes: 'BFF Proxy verified backup creation',
      }),
    });
    assert(nextCreateRes.ok, 'Next.js BFF POST /api/backup/create returns 200 OK');
    const nextCreate = await nextCreateRes.json();
    assert(nextCreate.success === true && !!nextCreate.data.id, 'BFF backup create returned created entity');

    console.log('\n================================================================');
    console.log(`   ALL ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY (100%)       `);
    console.log('================================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

runVerification().catch((err) => {
  console.error('\nVerification failed with exception:', err);
  process.exit(1);
});
