import { copyFileSync } from 'node:fs';

const testDb = 'c:/Users/mukhl/Documents/GitHub/zms-/data/zms-reset-test.db';
copyFileSync('c:/Users/mukhl/Documents/GitHub/zms-/data/zms.db', testDb);
process.env.ZMS_DB_PATH = testDb;

const { FinancialService } = await import('./src/services/financialService.ts');
const { FinancialWorkflowService } = await import('./src/services/financialWorkflowService.ts');

const actor = { id: 'u-1', name: 'อิบรอฮีม มานะชัย', role: 'super_admin' as const };

const before = await FinancialWorkflowService.getKpiBalances();
const income = await FinancialService.recordIncome(
  {
    fundId: 'fund-1',
    category: 'ทดสอบรายรับหลังล้างข้อมูล',
    amount: 1000,
    payer: 'ผู้ทดสอบระบบ',
    paymentMethod: 'bank_transfer',
    referenceNo: `RESET-TEST-${Date.now()}`,
    bankAccountId: 'bank-1',
    moneyType: 'zakat',
    notes: 'รายการทดสอบบนสำเนาฐานข้อมูล ไม่ใช่ข้อมูลจริง',
  },
  actor
);
const afterIncome = await FinancialWorkflowService.getKpiBalances();
const transfer = await FinancialWorkflowService.recordTransfer(
  {
    transferMode: 'bank_to_treasurer',
    sourceBankAccountId: 'bank-1',
    amount: 100,
    transferDate: '2026-11-13',
    referenceNo: `RESET-TRF-${Date.now()}`,
    notes: 'ทดสอบโอนจากบัญชีธนาคารไปบัญชีเหรัญญิกบนสำเนาฐานข้อมูล',
  },
  actor
);
const afterTransfer = await FinancialWorkflowService.getKpiBalances();
console.log(JSON.stringify({
  incomeId: income?.id || income?.transactionNo || income,
  transfer,
  before,
  afterIncome: { bank: afterIncome.bank, treasurer: afterIncome.treasurer },
  afterTransfer: { bank: afterTransfer.bank, treasurer: afterTransfer.treasurer, staff: afterTransfer.staff },
}, null, 2));
