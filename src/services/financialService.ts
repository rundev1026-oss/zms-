import { getDb, initDb } from '@/lib/db';
import { 
  FinancialTransaction, 
  FundAccount, 
  BankAccount, 
  BankReconciliation, 
  CashFlowWorkflow, 
  CashFlowWithdrawal,
  CashFlowDisbursementItem,
  CashMovementHistoryEntry,
  WorkflowAuditSummary,
  AsnafAllocation, 
  FaqirMiskinSubFund, 
  AdminExpenseCategory,
  PettyCashClearanceItem,
  FinanceHandoverRecord,
  VoucherHandoverSummary,
  HandoverStatus,
  AssistanceFinancialDetail,
  AssistanceFinanceDiscrepancy,
  FinanceHandoverStatusType,
  AssistanceExecutionStatusType,
  AssistanceOutcomeStatus,
  AssistanceExecutionRecord,
  ConfirmAssistanceInput,
  AssistanceRefundRecord,
  RecordAssistanceRefundInput,
  VerifiedAidCalculationResult,
  AsnafAidExpenseItem,
  AssistanceTypeAidExpenseItem,
  MissingProofItem,
  AidDrillDownItem
} from '@/types';

export interface ActorContext {
  id: string;
  name: string;
  role: string;
  nationalId?: string;
  beneficiaryId?: string;
}

export interface RecordIncomeInput {
  fundId: string;
  category: string;
  amount: number;
  payer?: string;
  donorName?: string;
  paymentMethod: 'promptpay_qr' | 'bank_transfer' | 'cash';
  referenceNo: string;
  receiptUrl?: string;
  slipUrl?: string;
  notes?: string;
  bankAccountId?: string;
  moneyType?: 'zakat' | 'sadaqah' | 'operational_admin';
  zakatYear?: string;
  isAnonymous?: boolean;
  usageRestriction?: string;
  receiptNo?: string;
}

export interface RecordExpenseInput {
  fundId: string;
  category: string;
  amount: number;
  payee: string;
  paymentMethod?: 'promptpay_qr' | 'bank_transfer' | 'cash';
  referenceNo?: string;
  slipUrl?: string;
  notes?: string;
  bankAccountId?: string;
  asnafCategory?: string;
  subFundCategory?: string;
  adminCategoryCode?: string;
  beneficiaryId?: string;
  applicationId?: string;
}

export interface CreateBankAccountInput {
  accountName: string;
  bankName: string;
  accountNumber: string;
  branchName?: string;
  openingBalance: number;
}

export interface ReconcileBankAccountInput {
  bankAccountId: string;
  reconciliationDate: string;
  statementBalance: number;
  notes?: string;
  proofUrl?: string;
}

export interface TransferBetweenBankAccountsInput {
  sourceBankAccountId: string;
  targetBankAccountId: string;
  amount: number;
  transferDate?: string;
  referenceNo?: string;
  slipUrl?: string;
  notes?: string;
}

export interface DepositCashToBankInput {
  bankAccountId: string;
  amount: number;
  depositDate?: string;
  referenceNo?: string;
  slipUrl?: string;
  notes?: string;
}

export interface WithdrawCashFromBankInput {
  bankAccountId: string;
  amount: number;
  withdrawalDate?: string;
  referenceNo?: string;
  purpose?: string;
  notes?: string;
}


export interface CreateCashFlowWorkflowInput {
  title: string;
  bankAccountId: string;
  withdrawAmount: number;
  refNo?: string;
  notes?: string;
  proofUrl?: string;
  proofName?: string;
  proofSize?: number;
  proofType?: string;
  eventDatetime?: string;
  eventDate?: string;
  eventTime?: string;
  fundType?: string;
  transferRef?: string;
  approverId?: string;
  approverName?: string;
  withdrawnByName?: string;
  status?: 'draft' | 'pending_approval' | 'approved' | 'withdrawn' | 'completed' | 'cancelled';
}

export interface RecordFinanceHandoverInput {
  withdrawalId: string;
  handoverDate: string;
  handoverTime?: string;
  handoverAmount?: number;
  amount?: number;
  handedOverById?: string;
  handedOverByName: string;
  receivedById?: string;
  receivedByName: string;
  receivedByPosition?: string;
  handoverMethod?: string;
  referenceNo?: string;
  notes?: string;
  proofUrl: string;
  proofName: string;
  proofSize?: number;
  proofType?: string;
  isConfirmed: boolean;
}

export interface AddCashFlowWithdrawalInput {
  workflowId: string;
  withdrawalNo?: string;
  voucherNo?: string;
  voucherType?: 'aid_disbursement' | 'office_expense' | 'other_approved';
  requestedAmount?: number;
  approvedAmount?: number;
  sourceFundType?: string;
  amount: number;
  withdrawalDatetime?: string;
  withdrawerId?: string;
  withdrawerName?: string;
  sourceDescription?: string;
  targetAsnaf?: string;
  targetFundId?: string;
  purpose?: string;
  expenseCategory?: string;
  expenseDetails?: string;
  allowedFundId?: string;
  deadlineDate?: string;
  disbursementItems?: Array<{
    applicationId: string;
    beneficiaryId: string;
    beneficiaryName: string;
    nationalId: string;
    asnafCategory: string;
    assistanceType: string;
    areaInfo?: string;
    approvedAmount: number;
    disbursedAmountBefore?: number;
    thisDisbursementAmount: number;
    remainingBalance?: number;
    notes?: string;
  }>;
  aidItems?: Array<{
    applicationId: string;
    beneficiaryId: string;
    beneficiaryName: string;
    nationalId: string;
    asnafCategory: string;
    assistanceType: string;
    areaInfo?: string;
    approvedAmount: number;
    disbursedAmountBefore?: number;
    thisDisbursementAmount: number;
    remainingBalance?: number;
    notes?: string;
  }>;
  approverId?: string;
  approverName?: string;
  isAutoAllocated?: boolean;
  proofUrl?: string;
  proofName?: string;
  proofSize?: number;
  proofType?: string;
  notes?: string;
  status?: 'draft' | 'pending' | 'pending_approval' | 'approved' | 'disbursed' | 'completed' | 'cancelled';
  clientToken?: string;
}

// Decimal satang precision helpers (to prevent floating-point inaccuracies like 0.1 + 0.2 = 0.30000000000000004)
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function toSatang(num: number): number {
  return Math.round((num + Number.EPSILON) * 100);
}

export function fromSatang(satang: number): number {
  return Math.round(satang) / 100;
}

export function maskAccountNumber(accNo: string): string {
  if (!accNo) return '';
  const clean = accNo.replace(/[^0-9]/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 3)}-x-xxx${clean.slice(-3, -1)}-${clean.slice(-1)}`;
  }
  return accNo.replace(/.(?=.{4})/g, '•');
}

export class FinancialService {
  /**
   * 1. Get All Funds with Real Calculated Balances & Commitments
   */
  static async getFunds(): Promise<FundAccount[]> {
    await initDb();
    const db = getDb();

    const res = await db.execute(`
      SELECT 
        f.id, f.code, f.name, f.description, f.category,
        f.total_received, f.committed_amount, f.disbursed_amount, f.available_amount, f.target_goal
      FROM fund_accounts f
      ORDER BY f.code ASC
    `);

    // Dynamic commitment calculation from active applications waiting for disbursement
    const commitmentsRes = await db.execute(`
      SELECT 
        COALESCE(ass.recommended_fund_id, 'fund-1') as fund_id,
        SUM(COALESCE(a.approved_amount, 0)) as total_committed
      FROM assistance_applications a
      LEFT JOIN beneficiary_assessments ass ON ass.application_id = a.id
      WHERE a.status = 'wait_disbursement'
      GROUP BY COALESCE(ass.recommended_fund_id, 'fund-1')
    `);

    const commitmentMap = new Map<string, number>();
    for (const row of commitmentsRes.rows) {
      commitmentMap.set(String(row.fund_id), Number(row.total_committed) || 0);
    }

    return res.rows.map((r) => {
      const fundId = String(r.id);
      const totalReceived = round2(Number(r.total_received) || 0);
      const disbursedAmount = round2(Number(r.disbursed_amount) || 0);
      
      const dynamicCommitted = commitmentMap.get(fundId);
      const committedAmount = dynamicCommitted !== undefined 
        ? round2(dynamicCommitted) 
        : round2(Number(r.committed_amount) || 0);

      const availableAmount = round2(Math.max(0, totalReceived - disbursedAmount - committedAmount));

      return {
        id: fundId,
        code: String(r.code),
        name: String(r.name),
        description: String(r.description),
        category: String(r.category) as any,
        totalReceived,
        committedAmount,
        disbursedAmount,
        availableAmount,
        targetGoal: r.target_goal ? round2(Number(r.target_goal)) : undefined,
      };
    });
  }

  /**
   * 2. Get Transactions with Filtering & Pagination
   */
  static async getTransactions(filters?: {
    fundId?: string;
    type?: string;
    status?: string;
    search?: string;
    moneyType?: string;
    bankAccountId?: string;
    asnaf?: string;
    year?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<FinancialTransaction[]> {
    await initDb();
    const db = getDb();

    let sql = `SELECT * FROM financial_transactions WHERE 1=1`;
    const args: any[] = [];

    if (filters?.fundId && filters.fundId !== 'all') {
      sql += ` AND fund_id = ?`;
      args.push(filters.fundId);
    }

    if (filters?.type && filters.type !== 'all') {
      sql += ` AND type = ?`;
      args.push(filters.type);
    }

    if (filters?.status && filters.status !== 'all') {
      sql += ` AND status = ?`;
      args.push(filters.status);
    }

    if (filters?.moneyType && filters.moneyType !== 'all') {
      sql += ` AND money_type = ?`;
      args.push(filters.moneyType);
    }

    if (filters?.bankAccountId && filters.bankAccountId !== 'all') {
      sql += ` AND bank_account_id = ?`;
      args.push(filters.bankAccountId);
    }

    if (filters?.asnaf && filters.asnaf !== 'all') {
      sql += ` AND asnaf_category = ?`;
      args.push(filters.asnaf);
    }

    if (filters?.year && filters.year !== 'all') {
      sql += ` AND zakat_year = ?`;
      args.push(filters.year);
    }

    if (filters?.search) {
      sql += ` AND (transaction_no LIKE ? OR payer_or_payee LIKE ? OR reference_no LIKE ? OR category LIKE ? OR fund_name LIKE ? OR donor_name LIKE ?)`;
      const s = `%${filters.search}%`;
      args.push(s, s, s, s, s, s);
    }

    sql += ` ORDER BY created_at DESC, date DESC`;

    const res = await db.execute({ sql, args });

    // Fetch bank accounts map for naming
    const bankRes = await db.execute('SELECT id, account_name FROM bank_accounts');
    const bankMap = new Map<string, string>();
    for (const b of bankRes.rows) {
      bankMap.set(String(b.id), String(b.account_name));
    }

    return res.rows.map((r) => ({
      id: String(r.id),
      transactionNo: String(r.transaction_no),
      date: String(r.date),
      type: String(r.type) as any,
      fundId: String(r.fund_id),
      fundName: String(r.fund_name),
      category: String(r.category),
      amount: round2(Number(r.amount)),
      paymentMethod: String(r.payment_method) as any,
      payerOrPayee: String(r.payer_or_payee),
      referenceNo: String(r.reference_no),
      receiptUrl: r.receipt_url ? String(r.receipt_url) : undefined,
      slipUrl: r.slip_url ? String(r.slip_url) : undefined,
      status: String(r.status) as any,
      reversalRefId: r.reversal_ref_id ? String(r.reversal_ref_id) : undefined,
      reversalReason: r.reversal_reason ? String(r.reversal_reason) : undefined,
      reversedAt: r.reversed_at ? String(r.reversed_at) : undefined,
      reversedBy: r.reversed_by_name ? String(r.reversed_by_name) : undefined,
      recordedBy: String(r.recorded_by_name),
      verifiedBy: r.verified_by_name ? String(r.verified_by_name) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      bankAccountId: r.bank_account_id ? String(r.bank_account_id) : undefined,
      bankAccountName: r.bank_account_id ? bankMap.get(String(r.bank_account_id)) : undefined,
      moneyType: r.money_type ? String(r.money_type) as any : 'zakat',
      zakatYear: r.zakat_year ? String(r.zakat_year) : '2569',
      asnafCategory: r.asnaf_category ? String(r.asnaf_category) : undefined,
      subFundCategory: r.sub_fund_category ? String(r.sub_fund_category) : undefined,
      beneficiaryId: r.beneficiary_id ? String(r.beneficiary_id) : undefined,
      applicationId: r.application_id ? String(r.application_id) : undefined,
      donorName: r.donor_name ? String(r.donor_name) : undefined,
      isAnonymous: Boolean(r.is_anonymous),
      usageRestriction: r.usage_restriction ? String(r.usage_restriction) : undefined,
      workflowId: r.workflow_id ? String(r.workflow_id) : undefined,
    }));
  }

  /**
   * 3. Record Income (Zakat, General Sadaqah, Operational Admin)
   * - Segregation of funds: Shariah compliance checks
   * - Idempotency duplicate check on referenceNo
   * - Bank account balance adjustment
   * - Audit log
   */
  static async recordIncome(input: RecordIncomeInput, actor: ActorContext) {
    await initDb();
    const db = getDb();

    // 1. Role Authorization
    if (!['finance', 'super_admin'].includes(actor.role)) {
      throw new Error(`การละเมิดสิทธิ์: บทบาท "${actor.role}" ไม่มีสิทธิ์บันทึกรายรับเข้าสู่ระบบบัญชี`);
    }

    // 2. Validate Amount
    const amount = round2(Number(input.amount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินรายรับต้องมากกว่า 0 บาท');
    }

    // 3. Duplicate Prevention Check (Idempotency Key / Reference No)
    const cleanRefNo = input.referenceNo.trim();
    if (!cleanRefNo) {
      throw new Error('กรุณาระบุหมายเลขอ้างอิงการชำระเงิน (เช่น เลขที่สลิปโอนเงิน หรือเลขอ้างอิง PromptPay)');
    }

    const dupCheck = await db.execute({
      sql: 'SELECT id, transaction_no, date, amount FROM financial_transactions WHERE reference_no = ? AND status != ?',
      args: [cleanRefNo, 'reversed'],
    });

    if (dupCheck.rows.length > 0) {
      const existing = dupCheck.rows[0];
      throw new Error(
        `ตรวจพบธุรกรรมซ้ำ! หมายเลขอ้างอิง "${cleanRefNo}" ถูกบันทึกไว้ในระบบแล้วในรายการเลขที่ ${existing.transaction_no} เมื่อ ${existing.date}`
      );
    }

    // 4. Fund & Money Type Segregation Check
    const fundRes = await db.execute({
      sql: 'SELECT id, code, name, category, total_received, available_amount FROM fund_accounts WHERE id = ?',
      args: [input.fundId],
    });

    if (fundRes.rows.length === 0) {
      throw new Error(`ไม่พบบัญชีกองทุนรหัส ${input.fundId}`);
    }

    const fund = fundRes.rows[0];
    const moneyType = input.moneyType || (fund.category === 'operational' ? 'operational_admin' : fund.category === 'sadaqah' ? 'sadaqah' : 'zakat');

    // Shariah & Purpose validation: Operational donations cannot be put into Pure Zakat funds and vice-versa
    if (moneyType === 'operational_admin' && fund.category === 'zakat') {
      throw new Error('ข้อห้ามตามหลักการ: เงินบริจาคสำหรับค่าใช้จ่ายบริหาร ไม่สามารถนำเข้ากองทุนซะกาตได้ (ต้องนำเข้ากองทุนค่าใช้จ่ายดำเนินงาน FND-OPR-01 เท่านั้น)');
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const receiptNo = input.receiptNo || `REC-2569-${Date.now().toString().slice(-5)}`;
    const txnNo = `TXN-REV-2569-${Date.now().toString().slice(-5)}`;
    const txnId = `txn-${Date.now()}`;
    const payerDisplay = input.isAnonymous ? 'ผู้ไม่ประสงค์ออกนาม' : (input.donorName || input.payer || 'ผู้บริจาค').trim();

    // 5. Atomic Update: Fund Account
    const currentReceivedSatang = toSatang(Number(fund.total_received));
    const currentAvailableSatang = toSatang(Number(fund.available_amount));
    const addSatang = toSatang(amount);

    const newReceived = fromSatang(currentReceivedSatang + addSatang);
    const newAvailable = fromSatang(currentAvailableSatang + addSatang);

    await db.execute({
      sql: `UPDATE fund_accounts 
            SET total_received = ?, available_amount = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [newReceived, newAvailable, input.fundId],
    });

    // 6. Update Bank Account balance if specified
    let bankAccountId = input.bankAccountId;
    if (bankAccountId && bankAccountId !== 'none' && input.paymentMethod !== 'cash') {
      const bankRes = await db.execute({
        sql: 'SELECT id, account_name, current_balance FROM bank_accounts WHERE id = ?',
        args: [bankAccountId],
      });
      if (bankRes.rows.length > 0) {
        const b = bankRes.rows[0];
        const newBankBal = fromSatang(toSatang(Number(b.current_balance)) + addSatang);
        await db.execute({
          sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [newBankBal, bankAccountId],
        });
      }
    }

    // 7. Insert Financial Transaction
    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, receipt_url, slip_url, status, recorded_by_id, recorded_by_name, notes,
        bank_account_id, money_type, zakat_year, donor_name, is_anonymous, usage_restriction
      ) VALUES (?, ?, ?, 'income', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        txnId,
        txnNo,
        timestampNow,
        input.fundId,
        String(fund.name),
        input.category,
        amount,
        input.paymentMethod,
        payerDisplay,
        cleanRefNo,
        input.receiptUrl || `/receipts/${receiptNo}.pdf`,
        input.slipUrl || '',
        actor.id,
        actor.name,
        input.notes || '',
        bankAccountId || null,
        moneyType,
        input.zakatYear || '2569',
        input.donorName || input.payer || null,
        input.isAnonymous ? 1 : 0,
        input.usageRestriction || null,
      ],
    });

    // 8. Audit Log
    const moneyTypeThMap: Record<string, string> = {
      zakat: 'เงินซะกาต',
      sadaqah: 'ศอดะเกาะฮ์ทั่วไป',
      operational_admin: 'เงินสำหรับบริหาร',
    };

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'FINANCIAL_INCOME_RECORDED',
        'financial_transaction',
        txnNo,
        `บันทึกรับ${moneyTypeThMap[moneyType]} ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท เข้า "${fund.name}" จาก ${payerDisplay} (ใบรับเงิน ${receiptNo}, อ้างอิง ${cleanRefNo})`,
      ],
    });

    return {
      transactionId: txnId,
      transactionNo: txnNo,
      receiptNo,
      amount,
      fundName: String(fund.name),
      newAvailable,
    };
  }

  /**
   * 4. Record Operating Expense / Aid Disbursement
   */
  static async recordExpense(input: RecordExpenseInput, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['finance', 'super_admin'].includes(actor.role)) {
      throw new Error(`การละเมิดสิทธิ์: บทบาท "${actor.role}" ไม่มีสิทธิ์บันทึกรายจ่าย`);
    }

    const amount = round2(Number(input.amount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินรายจ่ายต้องมากกว่า 0 บาท');
    }

    const fundRes = await db.execute({
      sql: 'SELECT id, code, name, category, disbursed_amount, available_amount FROM fund_accounts WHERE id = ?',
      args: [input.fundId],
    });

    if (fundRes.rows.length === 0) {
      throw new Error(`ไม่พบบัญชีกองทุนรหัส ${input.fundId}`);
    }

    const fund = fundRes.rows[0];
    const fundCategory = String(fund.category);

    // CRITICAL SHARIAH & PURPOSE RULE:
    // Zakat funds CANNOT be spent on general operational expenses!
    if (fundCategory === 'zakat' && !input.beneficiaryId && !input.applicationId) {
      throw new Error(
        `การละเมิดหลักชะรีอะฮ์และวัตถุประสงค์กองทุน: เงินซะกาต (${fund.name}) ไม่สามารถนำไปเบิกจ่ายเป็นค่าใช้จ่ายดำเนินงานทั่วไปได้! (ตามหลักการศาสนาและข้อบังคับมูลนิธิ ค่าใช้จ่ายดำเนินงานต้องเบิกจ่ายจากกองทุนค่าดำเนินงาน FND-OPR-01 หรือกองทุนศอดะเกาะฮ์เท่านั้น)`
      );
    }

    const currentAvailable = round2(Number(fund.available_amount));
    if (amount > currentAvailable) {
      throw new Error(
        `ยอดเงินคงเหลือในกองทุนไม่เพียงพอ (Over-Budget)! กองทุน "${fund.name}" มียอดคงเหลือจัดสรรได้ ฿${currentAvailable.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท แต่ต้องการเบิกจ่าย ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (ขาดอีก ฿${(amount - currentAvailable).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`
      );
    }

    const refNo = input.referenceNo ? input.referenceNo.trim() : `EXP-REF-${Date.now()}`;
    const dupCheck = await db.execute({
      sql: 'SELECT id, transaction_no, date FROM financial_transactions WHERE reference_no = ? AND status != ?',
      args: [refNo, 'reversed'],
    });

    if (dupCheck.rows.length > 0) {
      const existing = dupCheck.rows[0];
      throw new Error(
        `ตรวจพบธุรกรรมซ้ำ! ใบสำคัญหรือหมายเลขอ้างอิง "${refNo}" ถูกบันทึกไว้ในระบบแล้วในรายการเลขที่ ${existing.transaction_no}`
      );
    }

    // Separation of duties & application validation
    let appData: any = null;
    if (input.applicationId) {
      const appRes = await db.execute({
        sql: 'SELECT id, application_no, approved_by_id, approved_by_name, status, approved_amount, disbursed_amount FROM assistance_applications WHERE id = ?',
        args: [input.applicationId],
      });
      if (appRes.rows.length > 0) {
        appData = appRes.rows[0];
        // Enforce strict Separation of Duties: Approver != Disburser
        if (appData.approved_by_id && actor.id && String(appData.approved_by_id) === String(actor.id)) {
          throw new Error(`การละเมิดหลักการแบ่งแยกหน้าที่ (Separation of Duties): ผู้อนุมัติคำร้อง (${actor.name}) ไม่มีสิทธิ์ทำรายการเบิกจ่ายเงินด้วยตนเอง กรุณาให้เจ้าหน้าที่การเงินท่านอื่นดำเนินการ`);
        }
        if (appData.approved_by_name && actor.name && String(appData.approved_by_name).trim() === String(actor.name).trim()) {
          throw new Error(`การละเมิดหลักการแบ่งแยกหน้าที่ (Separation of Duties): ผู้อนุมัติคำร้อง (${actor.name}) ไม่มีสิทธิ์ทำรายการเบิกจ่ายเงินด้วยตนเอง กรุณาให้เจ้าหน้าที่การเงินท่านอื่นดำเนินการ`);
        }
      }
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const isAidDisbursement = Boolean(input.applicationId || input.beneficiaryId || input.category.includes('สวัสดิการ') || input.category.includes('ช่วยเหลือ'));
    const txnType = isAidDisbursement ? 'disbursement' : 'expense';
    const txnPrefix = isAidDisbursement ? 'TXN-DISB-2569' : 'TXN-EXP-2569';
    const txnNo = `${txnPrefix}-${Date.now().toString().slice(-5)}`;
    const txnId = `txn-${Date.now()}`;

    // Deduct Fund Balances
    const currentDisbursedSatang = toSatang(Number(fund.disbursed_amount));
    const currentAvailableSatang = toSatang(Number(fund.available_amount));
    const expenseSatang = toSatang(amount);

    const newDisbursed = fromSatang(currentDisbursedSatang + expenseSatang);
    const newAvailable = fromSatang(Math.max(0, currentAvailableSatang - expenseSatang));

    await db.execute({
      sql: `UPDATE fund_accounts 
            SET disbursed_amount = ?, available_amount = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [newDisbursed, newAvailable, input.fundId],
    });

    // Deduct Bank Account if bank transfer
    if (input.bankAccountId && input.bankAccountId !== 'none' && input.paymentMethod !== 'cash') {
      const bankRes = await db.execute({
        sql: 'SELECT id, current_balance FROM bank_accounts WHERE id = ?',
        args: [input.bankAccountId],
      });
      if (bankRes.rows.length > 0) {
        const b = bankRes.rows[0];
        const newBankBal = fromSatang(Math.max(0, toSatang(Number(b.current_balance)) - expenseSatang));
        await db.execute({
          sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [newBankBal, input.bankAccountId],
        });
      }
    }

    // Update assistance_applications if linked
    if (input.applicationId && appData) {
      const prevDisbursed = Number(appData.disbursed_amount) || 0;
      const newAppDisbursed = round2(prevDisbursed + amount);
      const approvedAmt = Number(appData.approved_amount) || 0;
      const newStatus = newAppDisbursed >= approvedAmt ? 'disbursed' : 'partially_disbursed';

      await db.execute({
        sql: `UPDATE assistance_applications 
              SET status = ?, 
                  disbursed_amount = ?, 
                  disbursement_date = ?, 
                  disbursement_ref = ?, 
                  disbursed_by_id = ?,
                  disbursed_by_name = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [newStatus, newAppDisbursed, timestampNow, refNo, actor.id, actor.name, input.applicationId],
      });
    }

    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes,
        bank_account_id, asnaf_category, sub_fund_category, beneficiary_id, application_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        txnId,
        txnNo,
        timestampNow,
        txnType,
        input.fundId,
        String(fund.name),
        input.category,
        amount,
        input.paymentMethod || 'bank_transfer',
        input.payee.trim(),
        refNo,
        input.slipUrl || '',
        actor.id,
        actor.name,
        input.notes || '',
        input.bankAccountId || null,
        input.asnafCategory || null,
        input.subFundCategory || null,
        input.beneficiaryId || null,
        input.applicationId || null,
      ],
    });

    // Audit Log
    const actionName = isAidDisbursement ? 'FINANCIAL_AID_DISBURSEMENT_RECORDED' : 'FINANCIAL_EXPENSE_RECORDED';
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        actionName,
        'financial_transaction',
        txnNo,
        `บันทึก${isAidDisbursement ? 'จ่ายเงินช่วยเหลือ' : 'รายจ่ายบริหาร'} ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท จาก "${fund.name}" จ่ายให้ ${input.payee} (${input.category}) อ้างอิง ${refNo}`,
      ],
    });

    return {
      transactionId: txnId,
      transactionNo: txnNo,
      amount,
      fundName: String(fund.name),
      newAvailable,
    };
  }

  /**
   * 5. Strictly Prevent Direct SQL / API Deletion of Transactions
   */
  static async attemptDeleteTransaction(transactionId: string): Promise<never> {
    throw new Error(
      `การละเมิดมาตรฐานการบัญชีและการตรวจสอบ (Accounting Standards Violation): ไม่อนุญาตให้ลบรายการบัญชีที่บันทึกแล้ว (${transactionId}) โดยตรงเด็ดขาด! หากต้องการแก้ไขความผิดพลาด กรุณาใช้ระบบ "กลับรายการ/ปรับปรุงบัญชี (Reversal Entry)" เพื่อรักษาความโปร่งใสและ Audit Trail ที่สมบูรณ์`
    );
  }

  /**
   * 6. Reversal / Adjustment Entry Engine
   */
  static async reverseTransaction(
    transactionId: string,
    reason: string,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['finance', 'super_admin', 'executive'].includes(actor.role)) {
      throw new Error(`การละเมิดสิทธิ์: บทบาท "${actor.role}" ไม่มีสิทธิ์กลับรายการทางบัญชี`);
    }

    if (!reason || reason.trim().length < 5) {
      throw new Error('กรุณาระบุเหตุผลในการกลับรายการบัญชีอย่างชัดเจน (ความยาวอย่างน้อย 5 ตัวอักษร)');
    }

    const txnRes = await db.execute({
      sql: 'SELECT * FROM financial_transactions WHERE id = ? OR transaction_no = ?',
      args: [transactionId, transactionId],
    });

    if (txnRes.rows.length === 0) {
      throw new Error(`ไม่พบรายการบัญชีรหัส ${transactionId}`);
    }

    const orig = txnRes.rows[0];

    if (String(orig.status) === 'reversed') {
      throw new Error(`รายการบัญชีเลขที่ ${orig.transaction_no} นี้ถูกกลับรายการไปแล้ว ไม่สามารถกลับรายการซ้ำได้`);
    }

    if (String(orig.type) === 'reversal') {
      throw new Error(`ไม่สามารถกลับรายการที่เป็นรายการปรับปรุง (Reversal Entry) ได้`);
    }

    const fundId = String(orig.fund_id);
    const amount = round2(Number(orig.amount));
    const origType = String(orig.type);
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const revTxnNo = `TXN-REV-ADJ-${Date.now().toString().slice(-5)}`;
    const revTxnId = `txn-rev-${Date.now()}`;

    const fundRes = await db.execute({
      sql: 'SELECT id, name, total_received, disbursed_amount, available_amount FROM fund_accounts WHERE id = ?',
      args: [fundId],
    });

    const isBankTransfer = ['bank_transfer_out', 'bank_transfer_in', 'bank_deposit', 'bank_withdrawal'].includes(origType);
    if (fundRes.rows.length === 0 && !isBankTransfer && fundId !== 'fund-general') {
      throw new Error(`ไม่พบบัญชีกองทุนที่เกี่ยวข้อง (${fundId})`);
    }

    const fund = fundRes.rows.length > 0 ? fundRes.rows[0] : null;
    const fundName = fund ? String(fund.name) : (orig.fund_name ? String(orig.fund_name) : 'บัญชีกลาง');

    // Reverse Fund Balances if attached to a specific fund
    if (origType === 'income' && fund) {
      const currentReceivedSatang = toSatang(Number(fund.total_received));
      const currentAvailableSatang = toSatang(Number(fund.available_amount));
      const amtSatang = toSatang(amount);

      const newReceived = fromSatang(Math.max(0, currentReceivedSatang - amtSatang));
      const newAvailable = fromSatang(Math.max(0, currentAvailableSatang - amtSatang));

      await db.execute({
        sql: `UPDATE fund_accounts 
              SET total_received = ?, available_amount = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?`,
        args: [newReceived, newAvailable, fundId],
      });

      // Reverse Bank Account if bank account attached
      if (orig.bank_account_id) {
        const bankRes = await db.execute({
          sql: 'SELECT id, current_balance FROM bank_accounts WHERE id = ?',
          args: [String(orig.bank_account_id)],
        });
        if (bankRes.rows.length > 0) {
          const b = bankRes.rows[0];
          const newBal = fromSatang(Math.max(0, toSatang(Number(b.current_balance)) - amtSatang));
          await db.execute({
            sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            args: [newBal, String(orig.bank_account_id)],
          });
        }
      }
    } else if (origType === 'expense' || origType === 'disbursement') {
      const amtSatang = toSatang(amount);
      if (fund) {
        const currentDisbursedSatang = toSatang(Number(fund.disbursed_amount));
        const currentAvailableSatang = toSatang(Number(fund.available_amount));
        const newDisbursed = fromSatang(Math.max(0, currentDisbursedSatang - amtSatang));
        const newAvailable = fromSatang(currentAvailableSatang + amtSatang);

        await db.execute({
          sql: `UPDATE fund_accounts 
                SET disbursed_amount = ?, available_amount = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?`,
          args: [newDisbursed, newAvailable, fundId],
        });
      }

      // Reverse Bank Account if attached
      if (orig.bank_account_id) {
        const bankRes = await db.execute({
          sql: 'SELECT id, current_balance FROM bank_accounts WHERE id = ?',
          args: [String(orig.bank_account_id)],
        });
        if (bankRes.rows.length > 0) {
          const b = bankRes.rows[0];
          const newBal = fromSatang(toSatang(Number(b.current_balance)) + amtSatang);
          await db.execute({
            sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            args: [newBal, String(orig.bank_account_id)],
          });
        }
      }

      // If it was disbursement for assistance application, restore to wait_disbursement
      if (origType === 'disbursement') {
        const matchApp = await db.execute({
          sql: 'SELECT id FROM assistance_applications WHERE disbursement_ref = ? OR application_no = ?',
          args: [String(orig.reference_no), String(orig.reference_no)],
        });

        if (matchApp.rows.length > 0) {
          const appId = String(matchApp.rows[0].id);
          await db.execute({
            sql: `UPDATE assistance_applications 
                  SET status = 'wait_disbursement', disbursed_amount = 0, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`,
            args: [appId],
          });
        }
      }
    } else if (origType === 'bank_transfer_out') {
      const amtSatang = toSatang(amount);
      if (orig.bank_account_id) {
        const bankRes = await db.execute({
          sql: 'SELECT id, current_balance FROM bank_accounts WHERE id = ?',
          args: [String(orig.bank_account_id)],
        });
        if (bankRes.rows.length > 0) {
          const b = bankRes.rows[0];
          const newBal = fromSatang(toSatang(Number(b.current_balance)) + amtSatang);
          await db.execute({
            sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            args: [newBal, String(orig.bank_account_id)],
          });
        }
      }
    } else if (origType === 'bank_transfer_in') {
      const amtSatang = toSatang(amount);
      if (orig.bank_account_id) {
        const bankRes = await db.execute({
          sql: 'SELECT id, current_balance FROM bank_accounts WHERE id = ?',
          args: [String(orig.bank_account_id)],
        });
        if (bankRes.rows.length > 0) {
          const b = bankRes.rows[0];
          const newBal = fromSatang(Math.max(0, toSatang(Number(b.current_balance)) - amtSatang));
          await db.execute({
            sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            args: [newBal, String(orig.bank_account_id)],
          });
        }
      }
    }

    // Mark original as reversed
    await db.execute({
      sql: `UPDATE financial_transactions 
            SET status = 'reversed', reversal_ref_id = ?, reversal_reason = ?,
                reversed_at = ?, reversed_by_id = ?, reversed_by_name = ?
            WHERE id = ?`,
      args: [revTxnId, reason.trim(), timestampNow, actor.id, actor.name, String(orig.id)],
    });

    // Insert Counter-Entry
    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, reversal_ref_id, reversal_reason,
        recorded_by_id, recorded_by_name, notes, bank_account_id
      ) VALUES (?, ?, ?, 'reversal', ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
      args: [
        revTxnId,
        revTxnNo,
        timestampNow,
        fundId,
        fundName,
        `กลับรายการ: ${orig.category}`,
        -amount,
        String(orig.payment_method),
        `รายการกลับบัญชี (${orig.payer_or_payee})`,
        `REV-${orig.transaction_no}`,
        String(orig.slip_url || ''),
        String(orig.id),
        reason.trim(),
        actor.id,
        actor.name,
        `กลับรายการบัญชีเลขที่ ${orig.transaction_no} เนื่องจาก: ${reason}`,
        orig.bank_account_id || null,
      ],
    });

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'FINANCIAL_TRANSACTION_REVERSED',
        'financial_transaction',
        revTxnNo,
        `กลับรายการบัญชีเลขที่ ${orig.transaction_no} (วงเงิน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}) โดย ${actor.name} เหตุผล: ${reason}`,
      ],
    });

    return {
      success: true,
      reversedTransactionNo: String(orig.transaction_no),
      reversalTransactionNo: revTxnNo,
      amount,
      reason,
    };
  }

  /**
   * 7. Fund Reconciliation & Balance Verification
   */
  static async reconcileBalances() {
    await initDb();
    const db = getDb();

    const funds = await db.execute('SELECT id, code, name FROM fund_accounts');
    const reconciliationReport = [];

    for (const f of funds.rows) {
      const fundId = String(f.id);

      const incRes = await db.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions 
              WHERE fund_id = ? AND type = 'income' AND status = 'completed'`,
        args: [fundId],
      });

      const expRes = await db.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions 
              WHERE fund_id = ? AND (type = 'expense' OR type = 'disbursement') AND status = 'completed'`,
        args: [fundId],
      });

      const comRes = await db.execute({
        sql: `SELECT COALESCE(SUM(a.approved_amount), 0) as total 
              FROM assistance_applications a
              LEFT JOIN beneficiary_assessments ass ON ass.application_id = a.id
              WHERE a.status = 'wait_disbursement' AND COALESCE(ass.recommended_fund_id, 'fund-1') = ?`,
        args: [fundId],
      });

      const totalReceived = round2(Number(incRes.rows[0].total) || 0);
      const disbursedAmount = round2(Number(expRes.rows[0].total) || 0);
      const committedAmount = round2(Number(comRes.rows[0].total) || 0);
      const availableAmount = round2(Math.max(0, totalReceived - disbursedAmount - committedAmount));

      await db.execute({
        sql: `UPDATE fund_accounts 
              SET total_received = ?, committed_amount = ?, disbursed_amount = ?, available_amount = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [totalReceived, committedAmount, disbursedAmount, availableAmount, fundId],
      });

      reconciliationReport.push({
        fundId,
        code: String(f.code),
        name: String(f.name),
        totalReceived,
        committedAmount,
        disbursedAmount,
        availableAmount,
      });
    }

    return reconciliationReport;
  }

  // =========================================================================
  // 8. Bank Accounts Management & Reconciliation
  // =========================================================================

  static async getBankAccounts(): Promise<BankAccount[]> {
    await initDb();
    const db = getDb();

    const res = await db.execute(`
      SELECT * FROM bank_accounts ORDER BY is_default DESC, created_at ASC
    `);

    return res.rows.map((r) => ({
      id: String(r.id),
      accountName: String(r.account_name),
      bankName: String(r.bank_name),
      accountNumber: String(r.account_number),
      branchName: r.branch_name ? String(r.branch_name) : undefined,
      openingBalance: round2(Number(r.opening_balance) || 0),
      currentBalance: round2(Number(r.current_balance) || 0),
      reconciledBalance: round2(Number(r.reconciled_balance) || 0),
      lastReconciledAt: r.last_reconciled_at ? String(r.last_reconciled_at) : undefined,
      lastReconciledBy: r.last_reconciled_by ? String(r.last_reconciled_by) : undefined,
      status: String(r.status) as any,
      isDefault: Boolean(r.is_default),
      createdAt: r.created_at ? String(r.created_at) : undefined,
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    }));
  }

  static async createBankAccount(input: CreateBankAccountInput, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: เฉพาะผู้ดูแลระบบหรือเจ้าหน้าที่การเงินเท่านั้นที่สามารถเพิ่มบัญชีธนาคารได้');
    }

    if (!input.accountName.trim() || !input.bankName.trim() || !input.accountNumber.trim()) {
      throw new Error('กรุณาระบุชื่อบัญชี ธนาคาร และเลขที่บัญชีให้ครบถ้วน');
    }

    const id = `bank-${Date.now()}`;
    const openingBal = round2(Number(input.openingBalance) || 0);

    await db.execute({
      sql: `INSERT INTO bank_accounts (id, account_name, bank_name, account_number, branch_name, opening_balance, current_balance, reconciled_balance, status, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)`,
      args: [id, input.accountName.trim(), input.bankName.trim(), input.accountNumber.trim(), input.branchName || '', openingBal, openingBal, openingBal],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        new Date().toLocaleString('th-TH', { hour12: false }),
        actor.id,
        actor.name,
        actor.role,
        'BANK_ACCOUNT_CREATED',
        'bank_account',
        id,
        `เพิ่มบัญชีธนาคารใหม่: ${input.accountName} (${input.bankName}) ยอดยกมา ฿${openingBal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
      ],
    });

    return { id, success: true };
  }

  static async toggleBankAccountStatus(id: string, status: 'active' | 'inactive' | 'closed', actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการเปลี่ยนสถานะบัญชีธนาคาร');
    }

    await db.execute({
      sql: `UPDATE bank_accounts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [status, id],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        new Date().toLocaleString('th-TH', { hour12: false }),
        actor.id,
        actor.name,
        actor.role,
        'BANK_ACCOUNT_STATUS_CHANGED',
        'bank_account',
        id,
        `เปลี่ยนสถานะบัญชีธนาคาร ${id} เป็น "${status}" (ประวัติธุรกรรมเดิมยังคงอยู่ครบถ้วน)`,
      ],
    });

    return { success: true };
  }

  static async reconcileBankAccount(input: ReconcileBankAccountInput, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance', 'executive'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการทำรายการกระทบยอดธนาคาร');
    }

    const bankRes = await db.execute({
      sql: 'SELECT id, account_name, current_balance FROM bank_accounts WHERE id = ?',
      args: [input.bankAccountId],
    });

    if (bankRes.rows.length === 0) {
      throw new Error('ไม่พบบัญชีธนาคารที่ต้องการกระทบยอด');
    }

    const bank = bankRes.rows[0];
    const systemBalance = round2(Number(bank.current_balance));
    const statementBalance = round2(Number(input.statementBalance));
    const difference = round2(systemBalance - statementBalance);
    const status = Math.abs(difference) < 0.01 ? 'balanced' : 'discrepancy';
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const recId = `rec-${Date.now()}`;

    await db.execute({
      sql: `INSERT INTO bank_reconciliations (
        id, bank_account_id, reconciliation_date, system_balance, statement_balance, difference, status, notes, proof_url, auditor_id, auditor_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recId,
        input.bankAccountId,
        input.reconciliationDate || timestampNow,
        systemBalance,
        statementBalance,
        difference,
        status,
        input.notes || '',
        input.proofUrl || '',
        actor.id,
        actor.name,
      ],
    });

    // Update bank account last reconciled state
    await db.execute({
      sql: `UPDATE bank_accounts 
            SET reconciled_balance = ?, last_reconciled_at = ?, last_reconciled_by = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [statementBalance, timestampNow, actor.name, input.bankAccountId],
    });

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'BANK_RECONCILIATION_PERFORMED',
        'bank_reconciliation',
        recId,
        `กระทบยอดบัญชีธนาคาร "${bank.account_name}": ยอดระบบ ฿${systemBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}, ยอดสเตตเมนต์ ฿${statementBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}, ผลต่าง ฿${difference.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (สถานะ: ${status === 'balanced' ? 'ตรงกันสมบูรณ์' : 'มียอดผลต่าง'})`,
      ],
    });

    return {
      id: recId,
      systemBalance,
      statementBalance,
      difference,
      status,
    };
  }

  static async getBankReconciliations(bankAccountId?: string): Promise<BankReconciliation[]> {
    await initDb();
    const db = getDb();

    let sql = `SELECT r.*, b.account_name as bank_account_name FROM bank_reconciliations r LEFT JOIN bank_accounts b ON b.id = r.bank_account_id`;
    const args: any[] = [];
    if (bankAccountId && bankAccountId !== 'all') {
      sql += ` WHERE r.bank_account_id = ?`;
      args.push(bankAccountId);
    }
    sql += ` ORDER BY r.created_at DESC`;

    const res = await db.execute({ sql, args });
    return res.rows.map((r) => ({
      id: String(r.id),
      bankAccountId: String(r.bank_account_id),
      bankAccountName: r.bank_account_name ? String(r.bank_account_name) : undefined,
      reconciliationDate: String(r.reconciliation_date),
      systemBalance: round2(Number(r.system_balance)),
      statementBalance: round2(Number(r.statement_balance)),
      difference: round2(Number(r.difference)),
      status: String(r.status) as any,
      notes: r.notes ? String(r.notes) : undefined,
      proofUrl: r.proof_url ? String(r.proof_url) : undefined,
      auditorId: String(r.auditor_id),
      auditorName: String(r.auditor_name),
      createdAt: String(r.created_at),
    }));
  }

  /**
   * Transfer Money Between Bank Accounts (Dual-ledger with Real Balances & Audit Trail)
   */
  static async transferBetweenBankAccounts(input: TransferBetweenBankAccountsInput, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance', 'executive'].includes(actor.role)) {
      throw new Error(`การละเมิดสิทธิ์: บทบาท "${actor.role}" ไม่มีสิทธิ์ทำรายการโอนเงินระหว่างบัญชีธนาคาร`);
    }

    if (!input.sourceBankAccountId || !input.targetBankAccountId) {
      throw new Error('กรุณาระบุบัญชีธนาคารต้นทางและปลายทาง');
    }

    if (input.sourceBankAccountId === input.targetBankAccountId) {
      throw new Error('บัญชีต้นทางและปลายทางต้องไม่เป็นบัญชีเดียวกัน');
    }

    const amount = round2(Number(input.amount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินที่ต้องการโอนต้องมากกว่า 0 บาท');
    }

    const sourceRes = await db.execute({
      sql: 'SELECT id, account_name, bank_name, current_balance FROM bank_accounts WHERE id = ?',
      args: [input.sourceBankAccountId],
    });
    const targetRes = await db.execute({
      sql: 'SELECT id, account_name, bank_name, current_balance FROM bank_accounts WHERE id = ?',
      args: [input.targetBankAccountId],
    });

    if (sourceRes.rows.length === 0 || targetRes.rows.length === 0) {
      throw new Error('ไม่พบบัญชีธนาคารต้นทางหรือปลายทาง');
    }

    const sourceBank = sourceRes.rows[0];
    const targetBank = targetRes.rows[0];

    const sourceBal = round2(Number(sourceBank.current_balance));
    if (amount > sourceBal) {
      throw new Error(
        `ยอดเงินคงเหลือในบัญชีต้นทาง "${sourceBank.account_name}" ไม่เพียงพอ (คงเหลือ ฿${sourceBal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, ต้องการโอน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`
      );
    }

    const amtSatang = toSatang(amount);
    const newSourceBal = fromSatang(toSatang(Number(sourceBank.current_balance)) - amtSatang);
    const newTargetBal = fromSatang(toSatang(Number(targetBank.current_balance)) + amtSatang);

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const refNo = input.referenceNo ? input.referenceNo.trim() : `TRF-${Date.now().toString().slice(-6)}`;
    const outTxnNo = `TXN-TRF-OUT-${Date.now().toString().slice(-5)}`;
    const inTxnNo = `TXN-TRF-IN-${Date.now().toString().slice(-5)}`;

    // 1. Update Source Bank Account
    await db.execute({
      sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [newSourceBal, input.sourceBankAccountId],
    });

    // 2. Update Target Bank Account
    await db.execute({
      sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [newTargetBal, input.targetBankAccountId],
    });

    // 3. Record Outbound Transaction (Credit Source Bank)
    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, bank_account_id
      ) VALUES (?, ?, ?, 'bank_transfer_out', 'fund-general', 'บัญชีกลาง', 'โอนเงินระหว่างธนาคาร', ?, 'bank_transfer', ?, ?, ?, 'completed', ?, ?, ?, ?)`,
      args: [
        `txn-${Date.now()}-out`,
        outTxnNo,
        input.transferDate || timestampNow,
        -amount,
        `โอนเงินไปยัง: ${targetBank.account_name}`,
        refNo,
        input.slipUrl || '',
        actor.id,
        actor.name,
        input.notes || `โอนเงินระหว่างบัญชีไปยัง ${targetBank.account_name}`,
        input.sourceBankAccountId,
      ],
    });

    // 4. Record Inbound Transaction (Debit Target Bank)
    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, bank_account_id
      ) VALUES (?, ?, ?, 'bank_transfer_in', 'fund-general', 'บัญชีกลาง', 'รับโอนเงินระหว่างธนาคาร', ?, 'bank_transfer', ?, ?, ?, 'completed', ?, ?, ?, ?)`,
      args: [
        `txn-${Date.now()}-in`,
        inTxnNo,
        input.transferDate || timestampNow,
        amount,
        `รับโอนเงินจาก: ${sourceBank.account_name}`,
        refNo,
        input.slipUrl || '',
        actor.id,
        actor.name,
        input.notes || `รับโอนเงินระหว่างบัญชีจาก ${sourceBank.account_name}`,
        input.targetBankAccountId,
      ],
    });

    // 5. Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'BANK_INTER_TRANSFER_PERFORMED',
        'bank_transfer',
        refNo,
        `โอนเงินระหว่างบัญชี ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} จาก "${sourceBank.account_name}" ไปยัง "${targetBank.account_name}" (อ้างอิง: ${refNo}) โดย ${actor.name}`,
      ],
    });

    return {
      success: true,
      referenceNo: refNo,
      amount,
      sourceBalance: newSourceBal,
      targetBalance: newTargetBal,
      outTxnNo,
      inTxnNo,
    };
  }

  /**
   * Deposit Cash into Bank Account (Treasurer or Office Cash Deposit)
   */
  static async depositCashToBank(input: DepositCashToBankInput, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance', 'executive'].includes(actor.role)) {
      throw new Error(`การละเมิดสิทธิ์: บทบาท "${actor.role}" ไม่มีสิทธิ์บันทึกการนำเงินสดเข้าธนาคาร`);
    }

    const amount = round2(Number(input.amount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินนำฝากต้องมากกว่า 0 บาท');
    }

    const bankRes = await db.execute({
      sql: 'SELECT id, account_name, current_balance FROM bank_accounts WHERE id = ?',
      args: [input.bankAccountId],
    });

    if (bankRes.rows.length === 0) {
      throw new Error('ไม่พบบัญชีธนาคารปลายทาง');
    }

    const bank = bankRes.rows[0];
    const newBal = fromSatang(toSatang(Number(bank.current_balance)) + toSatang(amount));
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const txnNo = `TXN-DEP-${Date.now().toString().slice(-5)}`;
    const refNo = input.referenceNo ? input.referenceNo.trim() : `DEP-${Date.now().toString().slice(-6)}`;

    await db.execute({
      sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [newBal, input.bankAccountId],
    });

    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, bank_account_id
      ) VALUES (?, ?, ?, 'bank_deposit', 'fund-general', 'บัญชีกลาง', ?, ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?)`,
      args: [
        `txn-${Date.now()}`,
        txnNo,
        input.depositDate || timestampNow,
        'นำเงินสดเข้าบัญชีธนาคาร',
        amount,
        actor.name,
        refNo,
        input.slipUrl || '',
        actor.id,
        actor.name,
        input.notes || `นำเงินสดเข้าบัญชี ${bank.account_name}`,
        input.bankAccountId,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'BANK_CASH_DEPOSITED',
        'bank_account',
        input.bankAccountId,
        `นำเงินสดเข้าบัญชี "${bank.account_name}" วงเงิน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (อ้างอิง: ${refNo}) โดย ${actor.name}`,
      ],
    });

    return {
      success: true,
      transactionNo: txnNo,
      referenceNo: refNo,
      newBalance: newBal,
    };
  }

  /**
   * Withdraw Cash from Bank to Petty Cash / Cash Float
   */
  static async withdrawCashFromBank(input: WithdrawCashFromBankInput, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance', 'executive'].includes(actor.role)) {
      throw new Error(`การละเมิดสิทธิ์: บทบาท "${actor.role}" ไม่มีสิทธิ์บันทึกการถอนเงินสดจากธนาคาร`);
    }

    const amount = round2(Number(input.amount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินที่ถอนต้องมากกว่า 0 บาท');
    }

    const bankRes = await db.execute({
      sql: 'SELECT id, account_name, current_balance FROM bank_accounts WHERE id = ?',
      args: [input.bankAccountId],
    });

    if (bankRes.rows.length === 0) {
      throw new Error('ไม่พบบัญชีธนาคาร');
    }

    const bank = bankRes.rows[0];
    const currentBal = round2(Number(bank.current_balance));
    if (amount > currentBal) {
      throw new Error(
        `ยอดเงินคงเหลือในบัญชี "${bank.account_name}" ไม่เพียงพอ (คงเหลือ ฿${currentBal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, ต้องการถอน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`
      );
    }

    const newBal = fromSatang(toSatang(Number(bank.current_balance)) - toSatang(amount));
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const txnNo = `TXN-WTH-${Date.now().toString().slice(-5)}`;
    const refNo = input.referenceNo ? input.referenceNo.trim() : `WTH-${Date.now().toString().slice(-6)}`;

    await db.execute({
      sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [newBal, input.bankAccountId],
    });

    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, status, recorded_by_id, recorded_by_name, notes, bank_account_id
      ) VALUES (?, ?, ?, 'bank_withdrawal', 'fund-general', 'บัญชีกลาง', ?, ?, 'cash', ?, ?, 'completed', ?, ?, ?, ?)`,
      args: [
        `txn-${Date.now()}`,
        txnNo,
        input.withdrawalDate || timestampNow,
        input.purpose || 'ถอนเงินสดจากบัญชีธนาคาร',
        -amount,
        actor.name,
        refNo,
        actor.id,
        actor.name,
        input.notes || `ถอนเงินสดจากบัญชี ${bank.account_name} เพื่อเป็นเงินสำรอง`,
        input.bankAccountId,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'BANK_CASH_WITHDRAWN',
        'bank_account',
        input.bankAccountId,
        `ถอนเงินสดจากบัญชี "${bank.account_name}" วงเงิน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (อ้างอิง: ${refNo}) โดย ${actor.name}`,
      ],
    });

    return {
      success: true,
      transactionNo: txnNo,
      referenceNo: refNo,
      newBalance: newBal,
    };
  }

  /**
   * Get All Bank Transactions (Transfers, Deposits, Withdrawals, Incomes, Disbursements)
   */
  static async getBankTransactions(bankAccountId?: string) {
    await initDb();
    const db = getDb();

    let sql = `
      SELECT t.*, b.account_name as bank_account_name, b.bank_name
      FROM financial_transactions t
      LEFT JOIN bank_accounts b ON b.id = t.bank_account_id
      WHERE t.bank_account_id IS NOT NULL
    `;
    const args: any[] = [];

    if (bankAccountId && bankAccountId !== 'all') {
      sql += ` AND t.bank_account_id = ?`;
      args.push(bankAccountId);
    }

    sql += ` ORDER BY t.created_at DESC LIMIT 100`;

    const res = await db.execute({ sql, args });
    return res.rows.map((r) => ({
      id: String(r.id),
      transactionNo: String(r.transaction_no),
      date: String(r.date),
      type: String(r.type),
      category: String(r.category),
      amount: round2(Number(r.amount)),
      paymentMethod: String(r.payment_method),
      payerOrPayee: String(r.payer_or_payee),
      referenceNo: String(r.reference_no),
      slipUrl: r.slip_url ? String(r.slip_url) : undefined,
      receiptUrl: r.receipt_url ? String(r.receipt_url) : undefined,
      status: String(r.status),
      bankAccountId: String(r.bank_account_id),
      bankAccountName: r.bank_account_name ? String(r.bank_account_name) : undefined,
      bankName: r.bank_name ? String(r.bank_name) : undefined,
      recordedByName: String(r.recorded_by_name),
      notes: r.notes ? String(r.notes) : undefined,
      createdAt: String(r.created_at),
    }));
  }


  // =========================================================================
  // 9. 5-Step Deposit-Withdrawal & Cash Movement Workflow
  // =========================================================================

  static async getCashFlowWorkflows(): Promise<CashFlowWorkflow[]> {
    await initDb();
    const db = getDb();

    const res = await db.execute(`
      SELECT w.*, b.account_name as bank_account_name 
      FROM cash_flow_workflows w
      LEFT JOIN bank_accounts b ON b.id = w.step1_bank_account_id
      ORDER BY w.created_at DESC
    `);

    // Fetch all child withdrawals
    const withdrawalsRes = await db.execute(`
      SELECT * FROM cash_flow_withdrawals ORDER BY withdrawal_datetime ASC, created_at ASC
    `);

    // Fetch all disbursement line items
    let disbItemsMap = new Map<string, any[]>();
    try {
      const disbItemsRes = await db.execute(`
        SELECT i.*, a.application_no, COALESCE(b.registration_no, a.registration_no) as registration_no
        FROM cash_flow_disbursement_items i
        LEFT JOIN assistance_applications a ON i.application_id = a.id
        LEFT JOIN beneficiaries b ON i.beneficiary_id = b.id
        ORDER BY i.created_at ASC
      `);
      for (const row of disbItemsRes.rows) {
        const wId = String(row.withdrawal_id);
        if (!disbItemsMap.has(wId)) disbItemsMap.set(wId, []);
        disbItemsMap.get(wId)!.push({
          id: String(row.id),
          withdrawalId: wId,
          workflowId: String(row.workflow_id),
          applicationId: String(row.application_id),
          applicationNo: row.application_no ? String(row.application_no) : undefined,
          registrationNo: row.registration_no ? String(row.registration_no) : undefined,
          beneficiaryId: String(row.beneficiary_id),
          beneficiaryName: String(row.beneficiary_name),
          nationalId: String(row.national_id),
          asnafCategory: String(row.asnaf_category),
          assistanceType: String(row.assistance_type),
          areaInfo: row.area_info ? String(row.area_info) : undefined,
          approvedAmount: round2(Number(row.approved_amount)),
          disbursedAmountBefore: round2(Number(row.disbursed_amount_before)),
          thisDisbursementAmount: round2(Number(row.this_disbursement_amount)),
          remainingBalance: round2(Number(row.remaining_balance)),
          notes: row.notes ? String(row.notes) : undefined,
          status: String(row.status) as any,
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        });
      }
    } catch {}

    // Fetch all clearance items (TASK 6)
    let clearanceItemsMap = new Map<string, any[]>();
    try {
      const clItemsRes = await db.execute(`
        SELECT * FROM cash_flow_clearance_items ORDER BY expense_date ASC, created_at ASC
      `);
      for (const row of clItemsRes.rows) {
        const wId = String(row.withdrawal_id);
        if (!clearanceItemsMap.has(wId)) clearanceItemsMap.set(wId, []);
        clearanceItemsMap.get(wId)!.push({
          id: String(row.id),
          withdrawalId: wId,
          workflowId: String(row.workflow_id),
          expenseDate: String(row.expense_date),
          description: String(row.description),
          amount: round2(Number(row.amount)),
          receiptUrl: row.receipt_url ? String(row.receipt_url) : undefined,
          receiptName: row.receipt_name ? String(row.receipt_name) : undefined,
          receiptSize: row.receipt_size ? Number(row.receipt_size) : undefined,
          receiptType: row.receipt_type ? String(row.receipt_type) : undefined,
          categoryCode: row.category_code ? String(row.category_code) : undefined,
          categoryName: row.category_name ? String(row.category_name) : undefined,
          notes: row.notes ? String(row.notes) : undefined,
          status: (String(row.status) as any) || 'accepted',
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        });
      }
    } catch {}

    // Fetch all attachments
    const attachmentsRes = await db.execute(`
      SELECT * FROM workflow_attachments ORDER BY step_number ASC, uploaded_at ASC
    `);

    const withdrawalsMap = new Map<string, any[]>();
    for (const row of withdrawalsRes.rows) {
      const wfId = String(row.workflow_id);
      if (!withdrawalsMap.has(wfId)) {
        withdrawalsMap.set(wfId, []);
      }
      const wId = String(row.id);
      withdrawalsMap.get(wfId)!.push({
        id: wId,
        workflowId: wfId,
        withdrawalNo: String(row.withdrawal_no),
        voucherType: row.voucher_type ? (String(row.voucher_type) as any) : 'aid_disbursement',
        requestedAmount: row.requested_amount ? round2(Number(row.requested_amount)) : round2(Number(row.amount)),
        approvedAmount: row.approved_amount ? round2(Number(row.approved_amount)) : round2(Number(row.amount)),
        amount: round2(Number(row.amount)),
        withdrawalDatetime: String(row.withdrawal_datetime),
        withdrawerId: String(row.withdrawer_id),
        withdrawerName: String(row.withdrawer_name),
        sourceDescription: row.source_description ? String(row.source_description) : undefined,
        sourceFundType: row.source_fund_type ? String(row.source_fund_type) : undefined,
        targetAsnaf: String(row.target_asnaf),
        targetFundId: row.target_fund_id ? String(row.target_fund_id) : undefined,
        purpose: String(row.purpose),
        expenseCategory: row.expense_category ? String(row.expense_category) : undefined,
        expenseDetails: row.expense_details ? String(row.expense_details) : undefined,
        allowedFundId: row.allowed_fund_id ? String(row.allowed_fund_id) : undefined,
        deadlineDate: row.deadline_date ? String(row.deadline_date) : undefined,
        clearanceStatus: row.clearance_status ? (String(row.clearance_status) as any) : 'not_required',
        clearanceSpentAmount: row.clearance_spent_amount ? round2(Number(row.clearance_spent_amount)) : undefined,
        clearanceReturnedAmount: row.clearance_returned_amount ? round2(Number(row.clearance_returned_amount)) : undefined,
        clearanceExcessAmount: row.clearance_excess_amount ? round2(Number(row.clearance_excess_amount)) : undefined,
        clearanceDate: row.clearance_date ? String(row.clearance_date) : undefined,
        clearanceReturnDate: row.clearance_return_date ? String(row.clearance_return_date) : undefined,
        clearanceOverspentReason: row.clearance_overspent_reason ? String(row.clearance_overspent_reason) : undefined,
        clearanceOverspentApprovedById: row.clearance_overspent_approved_by_id ? String(row.clearance_overspent_approved_by_id) : undefined,
        clearanceOverspentApprovedByName: row.clearance_overspent_approved_by_name ? String(row.clearance_overspent_approved_by_name) : undefined,
        clearanceOverspentApprovedAt: row.clearance_overspent_approved_at ? String(row.clearance_overspent_approved_at) : undefined,
        clearanceProofUrl: row.clearance_proof_url ? String(row.clearance_proof_url) : undefined,
        clearanceProofName: row.clearance_proof_name ? String(row.clearance_proof_name) : undefined,
        clearanceProofSize: row.clearance_proof_size ? Number(row.clearance_proof_size) : undefined,
        clearanceProofType: row.clearance_proof_type ? String(row.clearance_proof_type) : undefined,
        clearanceNotes: row.clearance_notes ? String(row.clearance_notes) : undefined,
        clearedById: row.cleared_by_id ? String(row.cleared_by_id) : undefined,
        clearedByName: row.cleared_by_name ? String(row.cleared_by_name) : undefined,
        clearanceItems: clearanceItemsMap.get(wId) || [],
        disbursementItems: disbItemsMap.get(wId) || [],
        approverId: row.approver_id ? String(row.approver_id) : undefined,
        approverName: row.approver_name ? String(row.approver_name) : undefined,
        proofUrl: row.proof_url ? String(row.proof_url) : undefined,
        proofName: row.proof_name ? String(row.proof_name) : undefined,
        proofSize: row.proof_size ? Number(row.proof_size) : undefined,
        proofType: row.proof_type ? String(row.proof_type) : undefined,
        notes: row.notes ? String(row.notes) : undefined,
        status: String(row.status) as any,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      });
    }

    const attachmentsMap = new Map<string, any[]>();
    for (const row of attachmentsRes.rows) {
      const wfId = String(row.workflow_id);
      if (!attachmentsMap.has(wfId)) {
        attachmentsMap.set(wfId, []);
      }
      attachmentsMap.get(wfId)!.push({
        id: String(row.id),
        workflowId: wfId,
        withdrawalId: row.withdrawal_id ? String(row.withdrawal_id) : undefined,
        stepNumber: Number(row.step_number),
        fileName: String(row.file_name),
        fileUrl: String(row.file_url),
        fileSize: Number(row.file_size),
        mimeType: String(row.mime_type),
        uploadedById: String(row.uploaded_by_id),
        uploadedByName: String(row.uploaded_by_name),
        uploadedAt: String(row.uploaded_at),
        description: row.description ? String(row.description) : undefined,
      });
    }

    return res.rows.map((r) => {
      const wfId = String(r.id);
      const childWithdrawals = withdrawalsMap.get(wfId) || [];
      const childAttachments = attachmentsMap.get(wfId) || [];

      const totalReceived = r.step2_deposit_amount ? round2(Number(r.step2_deposit_amount)) : 0;
      
      // TASK 3: Calculate real transaction metrics for cash withdrawal from treasurer
      let totalConfirmedDisbursed = 0;
      let totalInProgressWithdrawals = 0;
      let pendingVoucherCount = 0;

      if (childWithdrawals.length > 0) {
        for (const w of childWithdrawals) {
          if (w.status === 'disbursed' || w.status === 'completed') {
            totalConfirmedDisbursed += round2(w.amount);
          } else if (['draft', 'pending', 'pending_approval', 'approved'].includes(w.status)) {
            totalInProgressWithdrawals += round2(w.amount);
            pendingVoucherCount++;
          }
        }
      } else if (r.step3_withdraw_amount) {
        totalConfirmedDisbursed = round2(Number(r.step3_withdraw_amount));
      }

      totalConfirmedDisbursed = round2(totalConfirmedDisbursed);
      totalInProgressWithdrawals = round2(totalInProgressWithdrawals);
      const totalWithdrawn = totalConfirmedDisbursed;

      // Add back any petty cash returned from clearance
      const totalClearanceReturned = childWithdrawals
        .filter((w) => w.status !== 'cancelled' && w.clearanceReturnedAmount)
        .reduce((acc, w) => acc + round2(w.clearanceReturnedAmount || 0), 0);

      const availableTreasurerCash = Math.max(0, round2(totalReceived - totalWithdrawn + totalClearanceReturned));

      // Calculate latest activity datetime
      const activityDates = [
        String(r.created_at || ''),
        String(r.step1_date || ''),
        String(r.step2_date || ''),
        String(r.step3_date || ''),
        String(r.step4_date || ''),
        String(r.step5_closed_at || ''),
        ...childWithdrawals.map((w) => w.withdrawalDatetime || w.createdAt),
      ].filter(Boolean);
      const latestActivityDatetime = activityDates.sort().reverse()[0] || String(r.created_at);

      return {
        id: wfId,
        workflowNo: String(r.workflow_no),
        title: String(r.title),
        step1BankAccountId: String(r.step1_bank_account_id),
        step1BankAccountName: r.bank_account_name ? String(r.bank_account_name) : undefined,
        step1WithdrawAmount: round2(Number(r.step1_withdraw_amount)),
        step1Date: String(r.step1_date),
        step1EventDate: r.step1_event_date ? String(r.step1_event_date) : undefined,
        step1EventTime: r.step1_event_time ? String(r.step1_event_time) : undefined,
        step1EventDatetime: r.step1_event_datetime ? String(r.step1_event_datetime) : undefined,
        step1FundType: r.step1_fund_type ? String(r.step1_fund_type) : 'zakat',
        step1TransferRef: r.step1_transfer_ref ? String(r.step1_transfer_ref) : undefined,
        step1RefNo: r.step1_ref_no ? String(r.step1_ref_no) : String(r.workflow_no),
        step1OperatorId: String(r.step1_operator_id),
        step1OperatorName: String(r.step1_operator_name),
        step1WithdrawnByName: String(r.step1_operator_name),
        step1ApproverId: r.step1_approver_id ? String(r.step1_approver_id) : undefined,
        step1ApproverName: r.step1_approver_name ? String(r.step1_approver_name) : undefined,
        step1ProofUrl: r.step1_proof_url ? String(r.step1_proof_url) : undefined,
        step1ProofName: r.step1_proof_name ? String(r.step1_proof_name) : undefined,
        step1ProofSize: r.step1_proof_size ? Number(r.step1_proof_size) : undefined,
        step1ProofType: r.step1_proof_type ? String(r.step1_proof_type) : undefined,
        step1Notes: r.step1_notes ? String(r.step1_notes) : undefined,
        step1Status: String(r.step1_status) as any,
        step2TreasurerId: String(r.step2_treasurer_id || 'custodian-ruslan'),
        step2TreasurerName: String(r.step2_treasurer_name || 'นายรุสลัน หะสาเมาะ'),
        step2HandoverPersonId: r.step2_handover_person_id ? String(r.step2_handover_person_id) : undefined,
        step2HandoverPersonName: r.step2_handover_person_name ? String(r.step2_handover_person_name) : undefined,
        step2HandoverDatetime: r.step2_handover_datetime ? String(r.step2_handover_datetime) : undefined,
        step2HandoverAmount: r.step2_handover_amount ? round2(Number(r.step2_handover_amount)) : undefined,
        step2DepositAmount: r.step2_deposit_amount ? round2(Number(r.step2_deposit_amount)) : undefined,
        step2ReceivedDatetime: r.step2_received_datetime ? String(r.step2_received_datetime) : undefined,
        step2Date: r.step2_date ? String(r.step2_date) : undefined,
        step2EventDatetime: r.step2_event_datetime ? String(r.step2_event_datetime) : undefined,
        step2RefNo: r.step2_ref_no ? String(r.step2_ref_no) : undefined,
        step2MismatchReason: r.step2_mismatch_reason ? String(r.step2_mismatch_reason) : undefined,
        step2MismatchApprovedById: r.step2_mismatch_approved_by_id ? String(r.step2_mismatch_approved_by_id) : undefined,
        step2MismatchApprovedByName: r.step2_mismatch_approved_by_name ? String(r.step2_mismatch_approved_by_name) : undefined,
        step2MismatchApprovedAt: r.step2_mismatch_approved_at ? String(r.step2_mismatch_approved_at) : undefined,
        step2AuditorId: r.step2_auditor_id ? String(r.step2_auditor_id) : undefined,
        step2AuditorName: r.step2_auditor_name ? String(r.step2_auditor_name) : undefined,
        step2Notes: r.step2_notes ? String(r.step2_notes) : undefined,
        step2ProofUrl: r.step2_proof_url ? String(r.step2_proof_url) : undefined,
        step2ProofName: r.step2_proof_name ? String(r.step2_proof_name) : undefined,
        step2ProofSize: r.step2_proof_size ? Number(r.step2_proof_size) : undefined,
        step2ProofType: r.step2_proof_type ? String(r.step2_proof_type) : undefined,
        step2Status: String(r.step2_status) as any,
        step3WithdrawerId: String(r.step3_withdrawer_id),
        step3WithdrawerName: String(r.step3_withdrawer_name),
        step3WithdrawAmount: totalWithdrawn > 0 ? totalWithdrawn : undefined,
        step3Date: r.step3_date ? String(r.step3_date) : undefined,
        step3EventDatetime: r.step3_event_datetime ? String(r.step3_event_datetime) : undefined,
        step3Purpose: r.step3_purpose ? String(r.step3_purpose) : undefined,
        step3TargetAsnaf: r.step3_target_asnaf ? String(r.step3_target_asnaf) : undefined,
        step3TargetFundId: r.step3_target_fund_id ? String(r.step3_target_fund_id) : undefined,
        step3ApproverId: r.step3_approver_id ? String(r.step3_approver_id) : undefined,
        step3ApproverName: r.step3_approver_name ? String(r.step3_approver_name) : undefined,
        step3ProofUrl: r.step3_proof_url ? String(r.step3_proof_url) : undefined,
        step3ProofName: r.step3_proof_name ? String(r.step3_proof_name) : undefined,
        step3ProofSize: r.step3_proof_size ? Number(r.step3_proof_size) : undefined,
        step3ProofType: r.step3_proof_type ? String(r.step3_proof_type) : undefined,
        step3Status: (childWithdrawals.length > 0 || r.step3_status === 'completed') ? 'approved' : String(r.step3_status) as any,
        step4AllocatedAmount: round2(Number(r.step4_allocated_amount) || 0),
        step4Date: r.step4_date ? String(r.step4_date) : undefined,
        step4EventDatetime: r.step4_event_datetime ? String(r.step4_event_datetime) : undefined,
        step4DistributionSummary: r.step4_distribution_summary ? String(r.step4_distribution_summary) : undefined,
        step4ProofUrl: r.step4_proof_url ? String(r.step4_proof_url) : undefined,
        step4ProofName: r.step4_proof_name ? String(r.step4_proof_name) : undefined,
        step4ProofSize: r.step4_proof_size ? Number(r.step4_proof_size) : undefined,
        step4ProofType: r.step4_proof_type ? String(r.step4_proof_type) : undefined,
        step4Status: String(r.step4_status) as any,
        step5ReconciledAmount: r.step5_reconciled_amount ? round2(Number(r.step5_reconciled_amount)) : undefined,
        step5RemainingCash: round2(Number(r.step5_remaining_cash) || 0),
        step5AuditorId: r.step5_auditor_id ? String(r.step5_auditor_id) : undefined,
        step5AuditorName: r.step5_auditor_name ? String(r.step5_auditor_name) : undefined,
        step5ClosedAt: r.step5_closed_at ? String(r.step5_closed_at) : undefined,
        step5EventDatetime: r.step5_event_datetime ? String(r.step5_event_datetime) : undefined,
        step5ProofUrl: r.step5_proof_url ? String(r.step5_proof_url) : undefined,
        step5ProofName: r.step5_proof_name ? String(r.step5_proof_name) : undefined,
        step5ProofSize: r.step5_proof_size ? Number(r.step5_proof_size) : undefined,
        step5ProofType: r.step5_proof_type ? String(r.step5_proof_type) : undefined,
        step5Notes: r.step5_notes ? String(r.step5_notes) : undefined,
        step5Status: r.step5_status ? (String(r.step5_status) as any) : (r.overall_status === 'completed' ? 'completed' : 'pending'),
        step5UnallocatedAmount: r.step5_unallocated_amount ? round2(Number(r.step5_unallocated_amount)) : 0,
        step5ConfirmedAidAmount: r.step5_confirmed_aid_amount ? round2(Number(r.step5_confirmed_aid_amount)) : 0,
        step5ConfirmedOtherExpenseAmount: r.step5_confirmed_other_expense_amount ? round2(Number(r.step5_confirmed_other_expense_amount)) : 0,
        step5VoucherCount: r.step5_voucher_count ? Number(r.step5_voucher_count) : childWithdrawals.length,
        step5AssistanceCaseCount: r.step5_assistance_case_count ? Number(r.step5_assistance_case_count) : undefined,
        step5PendingItemsCount: r.step5_pending_items_count ? Number(r.step5_pending_items_count) : 0,
        step5MissingProofCount: r.step5_missing_proof_count ? Number(r.step5_missing_proof_count) : 0,
        overallStatus: String(r.overall_status) as any,
        withdrawals: childWithdrawals,
        attachments: childAttachments,
        totalTreasurerReceived: totalReceived,
        totalCashWithdrawn: totalWithdrawn,
        availableTreasurerCash,
        totalConfirmedDisbursed,
        totalInProgressWithdrawals,
        pendingVoucherCount,
        withdrawalCount: childWithdrawals.length,
        proofCount: childAttachments.length + (r.step1_proof_url ? 1 : 0) + (r.step2_proof_url ? 1 : 0),
        latestActivityDatetime,
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      };
    });
  }

  static async createCashFlowWorkflow(input: CreateCashFlowWorkflowInput, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการสร้างรายการเบิกเงินสด');
    }

    const amount = round2(Number(input.withdrawAmount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินเบิกต้องมากกว่า 0 บาท');
    }

    const bankRes = await db.execute({
      sql: 'SELECT id, account_name, current_balance FROM bank_accounts WHERE id = ?',
      args: [input.bankAccountId],
    });

    if (bankRes.rows.length === 0) {
      throw new Error('ไม่พบบัญชีธนาคารต้นทาง');
    }

    const bank = bankRes.rows[0];
    const currentBankBal = round2(Number(bank.current_balance));
    if (amount > currentBankBal) {
      throw new Error(`ยอดเงินในบัญชีธนาคารไม่พอเบิก (คงเหลือ ฿${currentBankBal.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`);
    }

    // Prevent duplicate submission within 3 seconds for same bank, amount, operator
    const recentDuplicate = await db.execute({
      sql: `SELECT id, workflow_no FROM cash_flow_workflows 
            WHERE step1_bank_account_id = ? 
              AND step1_withdraw_amount = ? 
              AND step1_operator_id = ? 
              AND created_at >= datetime('now', '-3 seconds')`,
      args: [input.bankAccountId, amount, actor.id],
    });
    if (recentDuplicate.rows.length > 0) {
      throw new Error(`ตรวจพบคำขอซ้ำซ้อน: รายการ ${recentDuplicate.rows[0].workflow_no} เพิ่งถูกสร้างไปเมื่อสักครู่`);
    }

    const isCompleted = !input.status || input.status === 'completed' || (input.status as string) === 'withdrawn';
    const step1Status: string = isCompleted ? 'completed' : (input.status || 'draft');
    const refNo = input.refNo?.trim() || '';
    const fundType = input.fundType?.trim() || 'zakat';
    const transferRef = input.transferRef?.trim() || `TR-2569-${Date.now().toString().slice(-5)}`;

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const nowIso = new Date().toISOString();
    const eventDate = input.eventDate || (input.eventDatetime ? input.eventDatetime.slice(0, 10) : nowIso.slice(0, 10));
    const eventTime = input.eventTime || (input.eventDatetime ? input.eventDatetime.slice(11, 16) : nowIso.slice(11, 16));
    const eventDt = input.eventDatetime || `${eventDate}T${eventTime}:00`;

    // Step 1: Withdraw from bank (deduct bank balance only if completed)
    if (isCompleted) {
      const newBankBal = fromSatang(toSatang(currentBankBal) - toSatang(amount));
      await db.execute({
        sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [newBankBal, input.bankAccountId],
      });
    }

    const wfNo = `CFW-2569-${Date.now().toString().slice(-5)}`;
    const wfId = `cfw-${Date.now()}`;

    await db.execute({
      sql: `INSERT INTO cash_flow_workflows (
        id, workflow_no, title,
        step1_bank_account_id, step1_withdraw_amount, step1_fund_type, step1_transfer_ref,
        step1_event_date, step1_event_time, step1_event_datetime, step1_date, step1_ref_no,
        step1_operator_id, step1_operator_name, step1_approver_id, step1_approver_name,
        step1_proof_url, step1_proof_name, step1_proof_size, step1_proof_type, step1_notes, step1_status,
        step2_treasurer_id, step2_treasurer_name, step2_status,
        step3_withdrawer_id, step3_withdrawer_name, step3_status,
        step4_status, overall_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'custodian-ruslan', 'นายรุสลัน หะสาเมาะ', 'pending', 'custodian-mukhlis', 'นายมุกลิส มีระยะ', 'pending', 'pending', 'in_progress')`,
      args: [
        wfId,
        wfNo,
        input.title.trim() || `เบิกเงินสดจาก ${bank.account_name}`,
        input.bankAccountId,
        amount,
        fundType,
        transferRef,
        eventDate,
        eventTime,
        eventDt,
        timestampNow,
        refNo,
        actor.id,
        input.withdrawnByName || actor.name,
        input.approverId || 'u-4',
        input.approverName || 'อิหม่ามฟารุก อาลี',
        input.proofUrl || '',
        input.proofName || '',
        input.proofSize || 0,
        input.proofType || '',
        input.notes || '',
        step1Status,
      ],
    });

    // Record Attachment if proofUrl present
    if (input.proofUrl) {
      await db.execute({
        sql: `INSERT INTO workflow_attachments (
          id, workflow_id, step_number, file_name, file_url, file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `att-${Date.now()}-1`,
          wfId,
          input.proofName || 'สลิปถอนเงินจากธนาคาร.pdf',
          input.proofUrl,
          input.proofSize || 102400,
          input.proofType || 'application/pdf',
          actor.id,
          actor.name,
          timestampNow,
          `หลักฐานการถอนเงินจากธนาคารตามคำขอ ${wfNo}${refNo ? ` (เลขอ้างอิง: ${refNo})` : ''}`,
        ],
      });
    }

    const fundName = fundType === 'sadaqah' 
      ? 'กองทุนศอดะเกาะฮ์ทั่วไป (General Sadaqah)'
      : fundType === 'admin'
      ? 'กองทุนบริหารจัดการสำนักงาน (Admin Fund)'
      : fundType === 'emergency'
      ? 'กองทุนบรรเทาทุกข์ฉุกเฉิน (Emergency Relief)'
      : 'กองทุนซะกาตผู้ยากไร้และขัดสน (Faqir & Miskin)';

    // Record bank transfer out in transactions only if completed
    if (isCompleted) {
      await db.execute({
        sql: `INSERT INTO financial_transactions (
          id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
          payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes,
          bank_account_id, workflow_id
        ) VALUES (?, ?, ?, 'transfer', 'fund-1', ?, 'เบิกเงินสดจากธนาคารเพื่อส่งมอบเหรัญญิก (โอนย้ายเงินสด)', ?, 'cash', 'นายรุสลัน หะสาเมาะ (เหรัญญิก)', ?, ?, 'completed', ?, ?, ?, ?, ?)`,
        args: [
          `txn-cfw-${Date.now()}`,
          `TXN-CW-${Date.now().toString().slice(-5)}`,
          timestampNow,
          fundName,
          amount,
          refNo || wfNo,
          input.proofUrl || '',
          actor.id,
          actor.name,
          `ขั้นตอนที่ 1 เบิกเงินสดจาก ${bank.account_name} (${fundName}) ตามคำขอ ${wfNo}${refNo ? ` (เลขอ้างอิง: ${refNo})` : ''}`,
          input.bankAccountId,
          wfId,
        ],
      });
    }

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'CASH_FLOW_WORKFLOW_STARTED',
        'cash_flow_workflow',
        wfNo,
        `เริ่มกระบวนการเบิกเงินสด ขั้นตอนที่ 1 (สถานะ: ${step1Status}, แหล่งเงิน: ${fundType}): ถอนเงินสด ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท จาก "${bank.account_name}" เพื่อส่งมอบเหรัญญิก [รหัสส่งมอบ: ${transferRef}]`,
      ],
    });

    return {
      id: wfId,
      workflowNo: wfNo,
      step1WithdrawAmount: amount,
      step1Status,
      step1EventDate: eventDate,
      step1EventTime: eventTime,
      step1EventDatetime: eventDt,
      step1FundType: fundType,
      step1TransferRef: transferRef,
      step1RefNo: refNo,
      step1Date: timestampNow,
    };
  }

  static async advanceWorkflowToStep1(workflowId: string, input: any, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance', 'executive'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการปรับปรุงข้อมูลขั้นตอนที่ 1');
    }

    const wfRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_workflows WHERE id = ?',
      args: [workflowId],
    });

    if (wfRes.rows.length === 0) {
      throw new Error('ไม่พบรอบการเบิกเงินสดที่ระบุ');
    }

    const wf = wfRes.rows[0];
    if (wf.overall_status === 'completed') {
      throw new Error('ไม่สามารถดำเนินการได้: รอบการเบิกเงินสดนี้ถูกปิดรอบสมบูรณ์แล้ว (Locked)');
    }
    const targetStatus = input.status || 'completed';
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const eventDate = input.eventDate || (input.eventDatetime ? input.eventDatetime.slice(0, 10) : wf.step1_event_date);
    const eventTime = input.eventTime || (input.eventDatetime ? input.eventDatetime.slice(11, 16) : wf.step1_event_time);
    const eventDt = input.eventDatetime || (eventDate && eventTime ? `${eventDate}T${eventTime}:00` : wf.step1_event_datetime || timestampNow);
    const refNo = input.refNo || wf.step1_ref_no || '';
    const fundType = input.fundType || wf.step1_fund_type || 'zakat';
    const transferRef = input.transferRef || wf.step1_transfer_ref || `TR-2569-${Date.now().toString().slice(-5)}`;

    // Idempotency check: Cannot re-confirm already completed withdrawal
    if (wf.step1_status === 'completed' && targetStatus === 'completed') {
      throw new Error(`รายการ ${wf.workflow_no} ได้รับการบันทึกยืนยันการถอนเงินจากธนาคารไปแล้ว ไม่สามารถยืนยันซ้ำได้`);
    }

    // Permission check for approval
    if (targetStatus === 'approved') {
      if (!['super_admin', 'executive'].includes(actor.role)) {
        throw new Error('ไม่อนุญาต: เฉพาะผู้บริหารหรือผู้อนุมัติที่มีสิทธิ์เท่านั้นที่สามารถอนุมัติคำขอถอนเงินได้');
      }
    }

    // If transitioning from draft/pending/approved to completed (actual bank withdrawal)
    if (wf.step1_status !== 'completed' && targetStatus === 'completed') {
      const bankRes = await db.execute({
        sql: 'SELECT id, account_name, current_balance FROM bank_accounts WHERE id = ?',
        args: [wf.step1_bank_account_id],
      });
      if (bankRes.rows.length > 0) {
        const bank = bankRes.rows[0];
        const currentBankBal = round2(Number(bank.current_balance));
        const amount = round2(Number(wf.step1_withdraw_amount));
        if (amount > currentBankBal) {
          throw new Error(`ยอดเงินในบัญชีธนาคารไม่พอเบิก (คงเหลือ ฿${currentBankBal.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`);
        }
        const newBankBal = fromSatang(toSatang(currentBankBal) - toSatang(amount));
        await db.execute({
          sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [newBankBal, wf.step1_bank_account_id],
        });

        const fundName = fundType === 'sadaqah' 
          ? 'กองทุนศอดะเกาะฮ์ทั่วไป (General Sadaqah)'
          : fundType === 'admin'
          ? 'กองทุนบริหารจัดการสำนักงาน (Admin Fund)'
          : fundType === 'emergency'
          ? 'กองทุนบรรเทาทุกข์ฉุกเฉิน (Emergency Relief)'
          : 'กองทุนซะกาตผู้ยากไร้และขัดสน (Faqir & Miskin)';

        // Insert into financial_transactions
        await db.execute({
          sql: `INSERT INTO financial_transactions (
            id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
            payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes,
            bank_account_id, workflow_id
          ) VALUES (?, ?, ?, 'transfer', 'fund-1', ?, 'เบิกเงินสดจากธนาคารเพื่อส่งมอบเหรัญญิก (โอนย้ายเงินสด)', ?, 'cash', 'นายรุสลัน หะสาเมาะ (เหรัญญิก)', ?, ?, 'completed', ?, ?, ?, ?, ?)`,
          args: [
            `txn-cfw-${Date.now()}`,
            `TXN-CW-${Date.now().toString().slice(-5)}`,
            timestampNow,
            fundName,
            amount,
            refNo || String(wf.workflow_no),
            input.proofUrl || wf.step1_proof_url || '',
            actor.id,
            actor.name,
            `ขั้นตอนที่ 1 เบิกเงินสดจาก ${bank.account_name} (${fundName}) ตามคำขอ ${wf.workflow_no}${refNo ? ` (เลขอ้างอิง: ${refNo})` : ''}`,
            wf.step1_bank_account_id,
            workflowId,
          ],
        });
      }
    }

    // If cancelling an already completed withdrawal, refund bank balance safely
    if (targetStatus === 'cancelled' && wf.step1_status === 'completed') {
      const bankRes = await db.execute({
        sql: 'SELECT current_balance FROM bank_accounts WHERE id = ?',
        args: [wf.step1_bank_account_id],
      });
      if (bankRes.rows.length > 0) {
        const currentBankBal = round2(Number(bankRes.rows[0].current_balance));
        const amount = round2(Number(wf.step1_withdraw_amount));
        const restoredBankBal = fromSatang(toSatang(currentBankBal) + toSatang(amount));
        await db.execute({
          sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [restoredBankBal, wf.step1_bank_account_id],
        });

        await db.execute({
          sql: `INSERT INTO financial_transactions (
            id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
            payer_or_payee, reference_no, status, recorded_by_id, recorded_by_name, notes,
            bank_account_id, workflow_id
          ) VALUES (?, ?, ?, 'income', 'fund-1', 'กองทุนซะกาตผู้ยากไร้และขัดสน', 'คืนเงินเข้าบัญชีธนาคารเนื่องจากยกเลิกคำขอถอนเงิน', ?, 'cash', 'บัญชีธนาคารต้นทาง', ?, 'completed', ?, ?, ?, ?, ?)`,
          args: [
            `txn-cfw-rev-${Date.now()}`,
            `TXN-REV-${Date.now().toString().slice(-5)}`,
            timestampNow,
            amount,
            String(wf.workflow_no),
            actor.id,
            actor.name,
            `กลับรายการถอนเงินเนื่องจากยกเลิกคำขอ ${wf.workflow_no} เหตุผล: ${input.notes || 'ยกเลิกคำขอ'}`,
            wf.step1_bank_account_id,
            workflowId,
          ],
        });
      }
    }

    // Update workflow step1
    await db.execute({
      sql: `UPDATE cash_flow_workflows SET
        step1_status = ?,
        step1_fund_type = ?,
        step1_transfer_ref = ?,
        step1_event_date = ?,
        step1_event_time = ?,
        step1_event_datetime = ?,
        step1_ref_no = ?,
        step1_proof_url = COALESCE(?, step1_proof_url),
        step1_proof_name = COALESCE(?, step1_proof_name),
        step1_proof_size = COALESCE(?, step1_proof_size),
        step1_proof_type = COALESCE(?, step1_proof_type),
        step1_notes = COALESCE(?, step1_notes),
        step1_approver_id = CASE WHEN ? = 'approved' THEN ? ELSE COALESCE(?, step1_approver_id) END,
        step1_approver_name = CASE WHEN ? = 'approved' THEN ? ELSE COALESCE(?, step1_approver_name) END,
        overall_status = CASE WHEN ? = 'cancelled' THEN 'cancelled' ELSE overall_status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        targetStatus,
        fundType,
        transferRef,
        eventDate || null,
        eventTime || null,
        eventDt,
        refNo,
        input.proofUrl || null,
        input.proofName || null,
        input.proofSize || null,
        input.proofType || null,
        input.notes || null,
        targetStatus,
        actor.id,
        input.approverId || null,
        targetStatus,
        actor.name,
        input.approverName || null,
        targetStatus,
        workflowId,
      ],
    });

    // Record Attachment if new proofUrl provided
    if (input.proofUrl && input.proofUrl !== wf.step1_proof_url) {
      await db.execute({
        sql: `INSERT INTO workflow_attachments (
          id, workflow_id, step_number, file_name, file_url, file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `att-${Date.now()}-1`,
          workflowId,
          input.proofName || 'สลิปถอนเงินจากธนาคาร.pdf',
          input.proofUrl,
          input.proofSize || 102400,
          input.proofType || 'application/pdf',
          actor.id,
          actor.name,
          timestampNow,
          `หลักฐานการถอนเงินจากธนาคารตามคำขอ ${wf.workflow_no}${refNo ? ` (เลขอ้างอิง: ${refNo})` : ''}`,
        ],
      });
    }

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'CASH_FLOW_STEP1_UPDATED',
        'cash_flow_workflow',
        String(wf.workflow_no),
        `ปรับปรุงขั้นตอนที่ 1 เป็นสถานะ "${targetStatus}" ตามคำขอ ${wf.workflow_no}${input.notes ? ` (หมายเหตุ: ${input.notes})` : ''}`,
      ],
    });

    return { success: true, workflowId, status: targetStatus, transferRef };
  }

  static async deleteCashFlowWorkflow(workflowId: string, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการลบรายการ');
    }

    const wfRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_workflows WHERE id = ?',
      args: [workflowId],
    });

    if (wfRes.rows.length === 0) {
      throw new Error('ไม่พบรอบการเบิกเงินสดที่ระบุ');
    }

    const wf = wfRes.rows[0];

    // Rule 10: Confirmed/completed transactions must NOT be deleted directly!
    if (wf.step1_status === 'completed' || wf.overall_status === 'completed') {
      throw new Error(`ไม่อนุญาตให้ลบรายการ ${wf.workflow_no} ที่บันทึกถอนเงินสดหรือมีธุรกรรมจริงแล้วโดยตรง กรุณาใช้การยกเลิกรายการ (Cancel) เพื่อรักษาประวัติการเงิน (Audit Trail)`);
    }

    // Only unconfirmed draft/pending workflows can be safely deleted
    await db.execute({ sql: 'DELETE FROM workflow_attachments WHERE workflow_id = ?', args: [workflowId] });
    await db.execute({ sql: 'DELETE FROM cash_flow_workflows WHERE id = ?', args: [workflowId] });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        new Date().toLocaleString('th-TH', { hour12: false }),
        actor.id,
        actor.name,
        actor.role,
        'CASH_FLOW_WORKFLOW_DELETED',
        'cash_flow_workflow',
        String(wf.workflow_no),
        `ลบแบบร่างรอบการเบิกเงินสด ${wf.workflow_no} (สถานะก่อนลบ: ${wf.step1_status})`,
      ],
    });

    return { success: true, message: `ลบแบบร่างรายการ ${wf.workflow_no} เรียบร้อยแล้ว` };
  }

  static async advanceWorkflowToStep2(
    workflowId: string,
    input: { 
      depositAmount: number;
      handoverAmount?: number;
      handoverDatetime?: string;
      receivedDatetime?: string;
      eventDatetime?: string;
      refNo?: string;
      handoverPersonId?: string;
      handoverPersonName?: string;
      treasurerId?: string;
      treasurerName?: string;
      mismatchReason?: string;
      mismatchApprovedById?: string;
      mismatchApprovedByName?: string;
      auditorId?: string;
      auditorName?: string;
      proofUrl?: string; 
      proofName?: string; 
      proofSize?: number; 
      proofType?: string; 
      notes?: string;
      status?: 'draft' | 'received' | 'completed' | 'cancelled';
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    // 0. Permission check: super_admin, finance, executive
    if (!['super_admin', 'finance', 'executive'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการบันทึกหรือปรับปรุงข้อมูลขั้นตอนที่ 2');
    }

    // 1. Fetch parent workflow
    const wfRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_workflows WHERE id = ?',
      args: [workflowId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรอบการเบิกเงินสด');
    const wf = wfRes.rows[0];

    if (wf.overall_status === 'completed') {
      throw new Error('ไม่สามารถดำเนินการได้: รอบการเบิกเงินสดนี้ถูกปิดรอบสมบูรณ์แล้ว (Locked)');
    }

    // Rule 1: Step 1 must be completed (actual withdrawal executed)
    if (wf.step1_status !== 'completed') {
      throw new Error(`ไม่อนุญาต: ขั้นตอนที่ 1 ยังไม่ได้รับการบันทึกยืนยันการถอนเงินจากธนาคารจริง (สถานะปัจจุบัน: ${wf.step1_status})`);
    }

    const targetStatus = input.status || 'received';
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // Handle cancellation of Step 2
    if (targetStatus === 'cancelled') {
      const childCheck = await db.execute({
        sql: `SELECT COUNT(*) as c FROM cash_flow_withdrawals WHERE workflow_id = ? AND status != 'cancelled'`,
        args: [workflowId],
      });
      if (Number(childCheck.rows[0].c) > 0) {
        throw new Error('ไม่สามารถยกเลิกขั้นตอนที่ 2 ได้ เนื่องจากมีการออกใบสำคัญเบิกเงินสดในขั้นตอนที่ 3 ไปแล้ว');
      }

      await db.execute({
        sql: `UPDATE cash_flow_workflows 
              SET step2_status = 'cancelled', step2_deposit_amount = 0, step2_notes = COALESCE(?, step2_notes), updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [input.notes ? `ยกเลิกการรับมอบ: ${input.notes}` : 'ยกเลิกการรับมอบเงินเหรัญญิก', workflowId],
      });

      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `log-${Date.now()}`,
          timestampNow,
          actor.id,
          actor.name,
          actor.role,
          'CASH_FLOW_STEP2_CANCELLED',
          'cash_flow_workflow',
          String(wf.workflow_no),
          `ยกเลิกขั้นตอนที่ 2 (ส่งมอบเหรัญญิก) ของรายการ ${wf.workflow_no}${input.notes ? ` (เหตุผล: ${input.notes})` : ''}`,
        ],
      });

      return { success: true, workflowId, status: 'cancelled' };
    }

    // Idempotency: cannot re-confirm already completed/received Step 2
    if ((wf.step2_status === 'received' || wf.step2_status === 'completed') && (targetStatus === 'received' || targetStatus === 'completed')) {
      throw new Error(`รายการ ${wf.workflow_no} ได้รับการบันทึกยืนยันส่งมอบให้เหรัญญิกเรียบร้อยแล้ว ไม่สามารถบันทึกซ้ำได้`);
    }

    // Rule 2 & 3: Auto withdrawal amount and actual received deposit amount
    const step1Amt = round2(Number(wf.step1_withdraw_amount));
    const depAmt = round2(Number(input.depositAmount));
    const handoverAmt = input.handoverAmount !== undefined ? round2(Number(input.handoverAmount)) : step1Amt;

    if (targetStatus !== 'draft' && (isNaN(depAmt) || depAmt <= 0)) {
      throw new Error('จำนวนเงินที่รับมอบจริงต้องมากกว่า 0 บาท');
    }

    // Rule 4 & 5: Mismatch Detection and Policy Approval
    const isMismatch = depAmt !== step1Amt;
    if (isMismatch && targetStatus !== 'draft') {
      if (!input.mismatchReason?.trim()) {
        const diff = round2(depAmt - step1Amt);
        const diffSign = diff > 0 ? '+' : '';
        throw new Error(
          `ยอดเงินที่รับมอบจริง (฿${depAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}) ไม่ตรงกับยอดถอนจากธนาคาร (฿${step1Amt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}) มีส่วนต่าง ${diffSign}฿${diff.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท! กรุณาระบุเหตุผลความคลาดเคลื่อนก่อนดำเนินการต่อ`
        );
      }

      // Check policy approval for mismatch
      const isExecutive = ['super_admin', 'executive'].includes(actor.role);
      const hasSupervisor = Boolean(input.mismatchApprovedByName?.trim() || input.auditorName?.trim());
      if (!isExecutive && !hasSupervisor) {
        throw new Error('ไม่อนุญาต: รายการที่มีส่วนต่างของยอดเงินต้องได้รับการตรวจสอบและอนุมัติจากผู้บริหารหรือผู้ตรวจสอบตามนโยบาย');
      }
    }

    // Validation: Proof file required on completion
    const proofUrl = input.proofUrl || wf.step2_proof_url || '';
    if (targetStatus !== 'draft' && !proofUrl) {
      throw new Error('กรุณาแนบไฟล์หลักฐานการรับมอบเงินสด (ใบส่งมอบหรือใบเสร็จรับเงิน)');
    }

    // Custodian (Default: นายรุสลัน หะสาเมาะ) and change tracking
    const newTreasurerId = input.treasurerId || wf.step2_treasurer_id || 'custodian-ruslan';
    const newTreasurerName = input.treasurerName?.trim() || wf.step2_treasurer_name || 'นายรุสลัน หะสาเมาะ';
    const isCustodianChanged = newTreasurerName !== (wf.step2_treasurer_name || 'นายรุสลัน หะสาเมาะ');

    if (isCustodianChanged) {
      if (!['super_admin', 'finance'].includes(actor.role)) {
        throw new Error('ไม่อนุญาต: เฉพาะผู้ดูแลระบบหรือเจ้าหน้าที่การเงินเท่านั้นที่สามารถเปลี่ยนตัวผู้รับผิดชอบ (เหรัญญิก) ได้');
      }
      await db.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `log-cust-${Date.now()}`,
          timestampNow,
          actor.id,
          actor.name,
          actor.role,
          'CASH_FLOW_TREASURER_CHANGED',
          'cash_flow_workflow',
          String(wf.workflow_no),
          `เปลี่ยนแปลงผู้รับผิดชอบเงินสดของรอบ ${wf.workflow_no} จาก "${wf.step2_treasurer_name || 'นายรุสลัน หะสาเมาะ'}" เป็น "${newTreasurerName}" โดย ${actor.name}`,
        ],
      });
    }

    // Timestamps and names
    const handoverDt = input.handoverDatetime || wf.step2_handover_datetime || wf.step1_event_datetime || timestampNow;
    const receivedDt = input.receivedDatetime || input.eventDatetime || wf.step2_received_datetime || timestampNow;
    const handoverPersonName = input.handoverPersonName?.trim() || wf.step2_handover_person_name || wf.step1_operator_name || 'เจ้าหน้าที่ผู้ถอนเงิน';
    const handoverPersonId = input.handoverPersonId || wf.step2_handover_person_id || wf.step1_operator_id || 'operator-1';
    const refNo = input.refNo?.trim() || wf.step2_ref_no || `REC-TREAS-${Date.now().toString().slice(-4)}`;
    
    const mismatchApprovedById = isMismatch 
      ? (input.mismatchApprovedById || (['super_admin', 'executive'].includes(actor.role) ? actor.id : 'exec-approver'))
      : null;
    const mismatchApprovedByName = isMismatch 
      ? (input.mismatchApprovedByName || (['super_admin', 'executive'].includes(actor.role) ? actor.name : 'อิหม่ามฟารุก อาลี (ผู้อนุมัติ)'))
      : null;
    const mismatchApprovedAt = isMismatch ? timestampNow : null;

    const auditorId = input.auditorId || wf.step2_auditor_id || null;
    const auditorName = input.auditorName?.trim() || wf.step2_auditor_name || null;
    const notes = input.notes?.trim() || wf.step2_notes || (isMismatch 
      ? `รับมอบเงินสดมีส่วนต่าง (เหตุผล: ${input.mismatchReason})` 
      : `${newTreasurerName} ได้รับมอบเงินสดครบถ้วน ฿${depAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`);

    // Update workflow Step 2
    await db.execute({
      sql: `UPDATE cash_flow_workflows SET
        step2_treasurer_id = ?,
        step2_treasurer_name = ?,
        step2_handover_person_id = ?,
        step2_handover_person_name = ?,
        step2_handover_datetime = ?,
        step2_handover_amount = ?,
        step2_deposit_amount = ?,
        step2_received_datetime = ?,
        step2_date = ?,
        step2_event_datetime = ?,
        step2_ref_no = ?,
        step2_mismatch_reason = ?,
        step2_mismatch_approved_by_id = ?,
        step2_mismatch_approved_by_name = ?,
        step2_mismatch_approved_at = ?,
        step2_auditor_id = ?,
        step2_auditor_name = ?,
        step2_notes = ?,
        step2_proof_url = COALESCE(?, step2_proof_url),
        step2_proof_name = COALESCE(?, step2_proof_name),
        step2_proof_size = COALESCE(?, step2_proof_size),
        step2_proof_type = COALESCE(?, step2_proof_type),
        step2_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        newTreasurerId,
        newTreasurerName,
        handoverPersonId,
        handoverPersonName,
        handoverDt,
        handoverAmt,
        depAmt,
        receivedDt,
        timestampNow,
        receivedDt,
        refNo,
        input.mismatchReason || null,
        mismatchApprovedById,
        mismatchApprovedByName,
        mismatchApprovedAt,
        auditorId,
        auditorName,
        notes,
        input.proofUrl || null,
        input.proofName || null,
        input.proofSize || null,
        input.proofType || null,
        targetStatus,
        workflowId,
      ],
    });

    // Rule 8: STRICTLY NO INSERT TO financial_transactions!
    // (We do not insert any transaction here, satisfying Rule 8: ห้ามนับยอดรับมอบเป็นรายรับใหม่)

    // Save attachment in workflow_attachments
    if (input.proofUrl && input.proofUrl !== wf.step2_proof_url) {
      await db.execute({
        sql: `INSERT INTO workflow_attachments (
          id, workflow_id, step_number, file_name, file_url, file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
        ) VALUES (?, ?, 2, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `att-${Date.now()}-2`,
          workflowId,
          input.proofName || 'สลิปหรือเอกสารรับมอบเงินเหรัญญิก.pdf',
          input.proofUrl,
          input.proofSize || 102400,
          input.proofType || 'application/pdf',
          actor.id,
          actor.name,
          timestampNow,
          `หลักฐานการรับมอบเงินโดยเหรัญญิก ${newTreasurerName} (อ้างอิง ${refNo})`,
        ],
      });
    }

    // Audit Log
    const auditAction = targetStatus === 'draft' ? 'CASH_FLOW_STEP2_DRAFT_SAVED' : 'CASH_FLOW_STEP2_COMPLETED';
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        auditAction,
        'cash_flow_workflow',
        String(wf.workflow_no),
        `ขั้นตอนที่ 2: เหรัญญิก (${newTreasurerName}) ได้รับมอบเงินสดเข้าความดูแล จำนวน ฿${depAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (ผู้ส่งมอบ: ${handoverPersonName}, อ้างอิง: ${refNo})` +
        (isMismatch ? ` [ส่วนต่าง: ฿${Math.abs(depAmt - step1Amt).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, เหตุผล: ${input.mismatchReason}, ผู้อนุมัติ: ${mismatchApprovedByName || 'ผู้บริหาร'}]` : ''),
      ],
    });

    return { 
      success: true, 
      workflowId, 
      status: targetStatus,
      depositAmount: depAmt,
      availableCash: depAmt,
      treasurerName: newTreasurerName,
    };
  }

  /**
   * แยกหรือคำนวณปีพุทธศักราชจากวันที่ของเอกสาร (เช่น 2026 -> 2569, 2027 -> 2570)
   */
  static extractDocumentYear(dateOrDatetime?: string, fallbackYear?: string): string {
    if (dateOrDatetime) {
      const d = new Date(dateOrDatetime);
      if (!isNaN(d.getTime())) {
        const gYear = d.getFullYear();
        if (gYear > 2400) return String(gYear);
        return String(gYear + 543);
      }
      const m = String(dateOrDatetime).match(/\b(25\d{2}|20\d{2})\b/);
      if (m) {
        const yr = parseInt(m[1], 10);
        return yr > 2400 ? String(yr) : String(yr + 543);
      }
    }
    if (fallbackYear) return fallbackYear;
    return String(new Date().getFullYear() + 543);
  }

  /**
   * คำนวณเลขที่ใบสำคัญเบิกเงินสดถัดไปที่ไม่ซ้ำกับระบบ (Read-only Preview)
   * ตรวจสอบทั้งตาราง document_sequences และเลขที่มีอยู่จริงใน cash_flow_withdrawals
   */
  static async getNextWithdrawalNo(targetYear?: string): Promise<string> {
    await initDb();
    const db = getDb();
    const year = targetYear || this.extractDocumentYear();

    // 1. ดึงเลข sequence สูงสุดที่มีอยู่จริงในตาราง cash_flow_withdrawals ของปีนั้น
    const annualRes = await db.execute({
      sql: "SELECT withdrawal_no FROM cash_flow_withdrawals WHERE withdrawal_no LIKE '%/' || ?",
      args: [year],
    });
    let maxExisting = 0;
    for (const row of annualRes.rows) {
      const parts = String(row.withdrawal_no).split('/');
      if (parts.length === 2 && parts[1] === year) {
        const num = parseInt(parts[0], 10);
        if (!isNaN(num) && num > maxExisting) {
          maxExisting = num;
        }
      }
    }

    // 2. ดึงค่า last_sequence จากตาราง document_sequences (ถ้ามี)
    const seqRes = await db.execute({
      sql: "SELECT last_sequence FROM document_sequences WHERE document_type = 'cash_withdrawal' AND fiscal_year = ?",
      args: [year],
    });
    const lastSeq = seqRes.rows.length > 0 ? Number(seqRes.rows[0].last_sequence || 0) : 0;

    // เริ่มต้นจากเลขลำดับถัดไปตามข้อมูลจริงในฐานข้อมูล
    let candidateNum = maxExisting + 1;

    // 3. วนลูปตรวจสอบความว่างจริงในฐานข้อมูล หากเลขนั้นถูกใช้ไปแล้ว ให้เลื่อนไปเลขถัดไป
    while (true) {
      const candidateNo = `${String(candidateNum).padStart(2, '0')}/${year}`;
      const checkRes = await db.execute({
        sql: 'SELECT id FROM cash_flow_withdrawals WHERE withdrawal_no = ?',
        args: [candidateNo],
      });
      if (checkRes.rows.length === 0) {
        return candidateNo;
      }
      candidateNum++;
    }
  }

  /**
   * จัดสรรและล็อกเลขที่ใบสำคัญเบิกเงินสดถัดไปแบบ Atomic ภายใต้ Transaction
   */
  static async allocateNextWithdrawalNo(year: string, txClient?: any): Promise<string> {
    const db = txClient || (await getDb());

    // 1. ดึงเลขสูงสุดที่มีอยู่จริงในตาราง cash_flow_withdrawals
    const annualRes = await db.execute({
      sql: "SELECT withdrawal_no FROM cash_flow_withdrawals WHERE withdrawal_no LIKE '%/' || ?",
      args: [year],
    });
    let maxExisting = 0;
    for (const row of annualRes.rows) {
      const parts = String(row.withdrawal_no).split('/');
      if (parts.length === 2 && parts[1] === year) {
        const num = parseInt(parts[0], 10);
        if (!isNaN(num) && num > maxExisting) {
          maxExisting = num;
        }
      }
    }

    let nextNum = maxExisting + 1;

    // 2. ตรวจสอบให้แน่ใจว่าไม่มีการชนกับเลขที่มีอยู่แล้วในฐานข้อมูล
    while (true) {
      const candidateNo = `${String(nextNum).padStart(2, '0')}/${year}`;
      const checkRes = await db.execute({
        sql: 'SELECT id FROM cash_flow_withdrawals WHERE withdrawal_no = ?',
        args: [candidateNo],
      });
      if (checkRes.rows.length === 0) {
        break;
      }
      nextNum++;
    }

    const finalVoucherNo = `${String(nextNum).padStart(2, '0')}/${year}`;

    // 4. บันทึกปรับปรุง document_sequences
    await db.execute({
      sql: `INSERT INTO document_sequences (id, document_type, fiscal_year, last_sequence, updated_at)
            VALUES (?, 'cash_withdrawal', ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(document_type, fiscal_year) DO UPDATE SET
              last_sequence = excluded.last_sequence,
              updated_at = CURRENT_TIMESTAMP`,
      args: [`seq-cw-${year}`, year, nextNum],
    });

    return finalVoucherNo;
  }

  /**
   * Section 2 & 3: Add multiple cash withdrawals under Step 3
   * Guarantees that Treasurer balance does NOT need to be zero, strictly prevents overdrafts,
   * and runs under atomic transaction with automatic concurrency collision retry.
   */
  static async addCashFlowWithdrawal(
    input: AddCashFlowWithdrawalInput,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance', 'executive'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการออกใบสำคัญเบิกเงินสด');
    }

    const amount = round2(Number(input.amount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินเบิกสดต้องมากกว่า 0 บาท');
    }

    const voucherType = input.voucherType || 'aid_disbursement';

    // Limit 1: Office Petty Cash Float <= 10,000 THB
    if (voucherType === 'office_expense' && amount > 10000) {
      throw new Error(`วงเงินสำรองจ่ายประจำสำนักงาน (Office Cash Float) เกินกำหนด: กำหนดวงเงินไม่เกิน 10,000 บาท ต่อครั้ง (ยอดที่ขอเบิก: ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`);
    }

    // Limit 2: Field mission advance <= 5,000 THB
    const purposeLower = (input.purpose || '').toLowerCase();
    const isFieldMission = purposeLower.includes('ลงพื้นที่') || purposeLower.includes('ภาคสนาม');
    if (isFieldMission && amount > 5000) {
      throw new Error(`วงเงินทดรองจ่ายลงพื้นที่ (Field Mission Advance) เกินกำหนด: กำหนดวงเงินไม่เกิน 5,000 บาท ต่อภารกิจ (ยอดที่ขอเบิก: ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`);
    }

    // Limit 3: Initial aid emergency payout <= 500 THB
    const isInitialAid = purposeLower.includes('ช่วยเหลือเบื้องต้น') || purposeLower.includes('ฉุกเฉินเบื้องต้น');
    if (isInitialAid && amount > 500) {
      throw new Error(`วงเงินช่วยเหลือเบื้องต้น ณ ที่เกิดเหตุ/ฉุกเฉิน (Initial Aid) เกินกำหนด: กำหนดวงเงินไม่เกิน 500 บาท ต่อราย (ยอดที่ขอเบิก: ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`);
    }

    // 1. Fetch parent workflow
    const wfRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_workflows WHERE id = ?',
      args: [input.workflowId],
    });

    if (wfRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลรอบการเบิกเงินสดที่ระบุ');
    }

    const wf = wfRes.rows[0];
    if (wf.overall_status === 'completed') {
      throw new Error('ไม่สามารถเบิกเงินสดได้: รอบการเบิกเงินสดนี้ถูกปิดรอบสมบูรณ์แล้ว (Locked)');
    }
    if (wf.step2_status !== 'received' && wf.step2_status !== 'completed') {
      throw new Error('ไม่สามารถเบิกเงินสดได้: เหรัญญิกยังไม่ได้รับมอบเงินสดในขั้นตอนที่ 2');
    }

    // 2. Fetch existing withdrawals for this workflow
    const existingRes = await db.execute({
      sql: 'SELECT id, withdrawal_no, amount, status, notes FROM cash_flow_withdrawals WHERE workflow_id = ?',
      args: [input.workflowId],
    });

    const totalReceived = round2(Number(wf.step2_deposit_amount || 0));
    // Rule 5 & 6: Exclude non-disbursed (draft, pending, approved, cancelled) from deducted cash
    const disbursedWithdrawals = existingRes.rows.filter(
      (w) => String(w.status) === 'disbursed' || String(w.status) === 'completed'
    );
    const totalWithdrawnSoFar = disbursedWithdrawals.reduce((acc, w) => acc + round2(Number(w.amount)), 0);
    const availableCash = round2(totalReceived - totalWithdrawnSoFar);

    const status = input.status || 'disbursed';
    const isDisbursed = status === 'disbursed' || status === 'completed';
    const isDraft = status === 'draft';

    // 3. Strict Solvency Check (Rule 3) - Only if disbursed
    if (isDisbursed && amount > availableCash) {
      throw new Error(
        `ยอดเงินสดคงเหลือในมือเหรัญญิกไม่เพียงพอ! มียอดคงเหลือที่เบิกได้ ฿${availableCash.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท แต่ต้องการเบิก ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (เกินวงเงินคงเหลือ ฿${round2(amount - availableCash).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`
      );
    }

    // 4. Determine Document Year dynamically (no hardcoding)
    const rawVoucherNo = (input.withdrawalNo || input.voucherNo)?.trim();
    let year = this.extractDocumentYear(input.withdrawalDatetime);
    if (rawVoucherNo && rawVoucherNo.includes('/')) {
      const parts = rawVoucherNo.split('/');
      if (parts.length === 2 && /^\d{4}$/.test(parts[1])) {
        year = parts[1];
      }
    }

    const isAutoVoucher = !rawVoucherNo || rawVoucherNo.toLowerCase() === 'auto';

    // 5. Duplicate Submission Prevention within 3 seconds (Rule 7)
    const purpose = (input.purpose || input.expenseDetails || input.expenseCategory || 'เบิกเงินสด').trim();
    const recentDup = await db.execute({
      sql: `SELECT id, withdrawal_no FROM cash_flow_withdrawals 
            WHERE workflow_id = ? AND amount = ? AND purpose = ? AND created_at >= datetime('now', '-3 seconds')`,
      args: [input.workflowId, amount, purpose],
    });
    if (recentDup.rows.length > 0) {
      throw new Error(`ตรวจพบคำขอซ้ำซ้อน: ใบสำคัญเบิกเงินสด "${recentDup.rows[0].withdrawal_no}" เพิ่งถูกสร้างไปเมื่อสักครู่`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const eventDt = input.withdrawalDatetime || timestampNow;
    const withdrawerName = input.withdrawerName?.trim() || 'นายมุกลิส มีระยะ';
    const withdrawerId = input.withdrawerId || 'custodian-mukhlis';
    const count = existingRes.rows.length + 1;
    const clearanceStatus = voucherType === 'office_expense' ? 'pending_clearance' : 'not_required';
    const requestedAmt = input.requestedAmount !== undefined ? round2(Number(input.requestedAmount)) : amount;
    const approvedAmt = input.approvedAmount !== undefined ? round2(Number(input.approvedAmount)) : amount;
    const sourceFundType = input.sourceFundType || wf.step1_fund_type || 'zakat';

    // 7. Validate Line items total vs voucher amount (Rule 8)
    const lineItems = input.disbursementItems || input.aidItems;

    // TASK 6 & TASK 3 Validation: Never mix office expenses or other approved expenses with aid disbursement to beneficiaries
    if ((voucherType === 'office_expense' || voucherType === 'other_approved') && lineItems && lineItems.length > 0) {
      throw new Error(voucherType === 'office_expense' 
        ? 'ห้ามรวมค่าใช้จ่ายสำนักงานเป็นยอดช่วยเหลือผู้รับซะกาต' 
        : 'ห้ามรวมรายจ่ายอื่นที่ได้รับอนุมัติเข้ากับตารางช่วยเหลือผู้รับซะกาต'
      );
    }

    if (voucherType === 'aid_disbursement' && (input.expenseCategory || input.allowedFundId)) {
      throw new Error('ห้ามรวมหมวดค่าใช้จ่ายสำนักงานเข้ากับใบสำคัญเบิกเงินสดช่วยเหลือผู้รับซะกาต');
    }

    // TASK 6 Validation 2: Never use unauthorized source funds for office expenses
    if (voucherType === 'office_expense') {
      const fundLower = (input.sourceFundType || '').toLowerCase();
      const asnafLower = (input.targetAsnaf || '').toLowerCase();
      const isUnauthorized = 
        fundLower === 'unauthorized' || 
        fundLower === 'zakat_direct' || 
        fundLower === 'zakat_aid' ||
        fundLower === 'faqir_miskin' ||
        ((asnafLower === 'faqir' || asnafLower === 'miskin' || asnafLower === 'gharimin') && !input.allowedFundId);

      if (isUnauthorized) {
        throw new Error('ห้ามใช้แหล่งเงินที่ไม่ได้รับอนุญาตสำหรับค่าใช้จ่ายสำนักงาน (ต้องใช้แหล่งเงินที่ได้รับอนุญาต เช่น กองทุนอามิลีน / งบดำเนินงาน / บริหารจัดการ)');
      }
    }

    if (lineItems && lineItems.length > 0) {
      // TASK 2: Prevent accidental duplicate case selection within the same voucher
      const appIds = lineItems.map((it: any) => it.applicationId).filter(Boolean);
      const uniqueAppIds = new Set(appIds);
      if (appIds.length !== uniqueAppIds.size) {
        throw new Error('ตรวจพบคำร้องซ้ำซ้อน: ห้ามเลือกคำร้องเดียวกันซ้ำในใบสำคัญเบิกเงินสดใบเดียวกัน');
      }

      // TASK 2: Strict backend validation for each selected application
      for (const it of lineItems) {
        if (it.applicationId) {
          const valRes = await FinancialService.validateApplicationForWithdrawal(it.applicationId, actor);
          if (!valRes.valid) {
            throw new Error(`คำร้อง "${it.beneficiaryName || it.applicationId}": ${valRes.reason}`);
          }
          const itemAmt = round2(Number(it.thisDisbursementAmount || 0));
          if (valRes.application && itemAmt > valRes.application.remainingAmount) {
            throw new Error(
              `ยอดเบิกจ่ายครั้งนี้ของ "${valRes.application.beneficiaryName}" (฿${itemAmt.toLocaleString()}) เกินยอดอนุมัติคงเหลือ (฿${valRes.application.remainingAmount.toLocaleString()})`
            );
          }
        }
      }

      const sumItems = lineItems.reduce(
        (acc, it) => acc + round2(Number(it.thisDisbursementAmount || 0)), 
        0
      );
      if (sumItems > amount) {
        throw new Error(
          `ยอดรวมในตารางรายละเอียดการจ่าย (฿${sumItems.toLocaleString('th-TH', { minimumFractionDigits: 2 })}) เกินยอดที่ขอเบิกตามใบสำคัญ (฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`
        );
      }
    }

    // 8. Atomic Transaction Execution with Collision Retry
    let withdrawalNo: string = rawVoucherNo || '';
    const maxRetries = isAutoVoucher ? 10 : 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      let tx: any = null;
      const withdrawalId = `cw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      try {
        tx = await db.transaction('write');
        if (isAutoVoucher) {
          // If a candidate voucher was provided and it's not taken, try using it first, otherwise allocate next
          if (withdrawalNo && withdrawalNo !== 'auto' && withdrawalNo.includes('/')) {
            const checkCandidate = await tx.execute({
              sql: 'SELECT id FROM cash_flow_withdrawals WHERE withdrawal_no = ?',
              args: [withdrawalNo],
            });
            if (checkCandidate.rows.length === 0) {
              const parts = withdrawalNo.split('/');
              const num = parseInt(parts[0], 10);
              if (!isNaN(num)) {
                await tx.execute({
                  sql: `INSERT INTO document_sequences (id, document_type, fiscal_year, last_sequence, updated_at)
                        VALUES (?, 'cash_withdrawal', ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(document_type, fiscal_year) DO UPDATE SET
                          last_sequence = MAX(last_sequence, excluded.last_sequence),
                          updated_at = CURRENT_TIMESTAMP`,
                  args: [`seq-cw-${year}`, year, num],
                });
              }
            } else {
              // Candidate was taken, allocate next safe sequence
              withdrawalNo = await FinancialService.allocateNextWithdrawalNo(year, tx);
            }
          } else {
            // Dynamically allocate next sequence within transaction
            withdrawalNo = await FinancialService.allocateNextWithdrawalNo(year, tx);
          }
        } else {
          // Manual voucher: verify uniqueness inside transaction
          if (!withdrawalNo) {
            withdrawalNo = await FinancialService.allocateNextWithdrawalNo(year, tx);
          } else {
            const checkExistingNo = await tx.execute({
              sql: 'SELECT id, withdrawal_no FROM cash_flow_withdrawals WHERE withdrawal_no = ?',
              args: [withdrawalNo],
            });
            if (checkExistingNo.rows.length > 0) {
              const nextAvail = await FinancialService.getNextWithdrawalNo(year);
              throw new Error(`ตรวจพบเลขที่ใบสำคัญซ้ำซ้อน: เลขที่ "${withdrawalNo}" มีอยู่ในระบบแล้ว กรุณาใช้เลขที่เอกสารอื่น (แนะนำเลขที่ถัดไป: "${nextAvail}")`);
            }
            if (withdrawalNo.includes('/')) {
              const parts = withdrawalNo.split('/');
              const num = parseInt(parts[0], 10);
              if (!isNaN(num)) {
                await tx.execute({
                  sql: `INSERT INTO document_sequences (id, document_type, fiscal_year, last_sequence, updated_at)
                        VALUES (?, 'cash_withdrawal', ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(document_type, fiscal_year) DO UPDATE SET
                          last_sequence = MAX(last_sequence, excluded.last_sequence),
                          updated_at = CURRENT_TIMESTAMP`,
                  args: [`seq-cw-${year}`, year, num],
                });
              }
            }
          }
        }

        if (!withdrawalNo) {
          withdrawalNo = await FinancialService.allocateNextWithdrawalNo(year, tx);
        }

        // Insert withdrawal line item
        await tx.execute({
          sql: `INSERT INTO cash_flow_withdrawals (
            id, workflow_id, withdrawal_no, amount, requested_amount, approved_amount, actual_received_amount, source_fund_type,
            withdrawal_datetime, withdrawer_id, withdrawer_name, source_description,
            target_asnaf, target_fund_id, purpose, approver_id, approver_name,
            proof_url, proof_name, proof_size, proof_type, notes, status,
            voucher_type, expense_category, expense_details, allowed_fund_id, deadline_date, clearance_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            withdrawalId,
            input.workflowId,
            withdrawalNo,
            amount,
            requestedAmt,
            approvedAmt,
            amount,
            sourceFundType,
            eventDt,
            withdrawerId,
            withdrawerName,
            input.sourceDescription || `เงินสดในมือเหรัญญิกรอบ ${wf.workflow_no} (${sourceFundType})`,
            input.targetAsnaf || (voucherType === 'office_expense' ? 'amileen' : (voucherType === 'other_approved' ? 'other' : 'faqir_miskin')),
            input.targetFundId || 'fund-1',
            purpose,
            input.approverId || 'u-4',
            input.approverName || 'อิหม่ามฟารุก อาลี',
            input.proofUrl || '',
            input.proofName || '',
            input.proofSize || 0,
            input.proofType || '',
            input.notes || '',
            status,
            voucherType,
            input.expenseCategory || null,
            input.expenseDetails || null,
            input.allowedFundId || null,
            input.deadlineDate || null,
            clearanceStatus,
          ],
        });

        // Insert child disbursement items if provided (Step 4 Linking)
        if (lineItems && lineItems.length > 0) {
          for (let i = 0; i < lineItems.length; i++) {
            const item = lineItems[i];
            const itemId = `disb-${Date.now()}-${i + 1}`;
            await tx.execute({
              sql: `INSERT INTO cash_flow_disbursement_items (
                id, withdrawal_id, workflow_id, application_id, beneficiary_id,
                beneficiary_name, national_id, asnaf_category, assistance_type,
                area_info, approved_amount, disbursed_amount_before,
                this_disbursement_amount, remaining_balance, notes, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                itemId,
                withdrawalId,
                input.workflowId,
                item.applicationId || '',
                item.beneficiaryId || '',
                item.beneficiaryName || '',
                item.nationalId || '',
                item.asnafCategory || '',
                item.assistanceType || '',
                item.areaInfo || '',
                round2(Number(item.approvedAmount || 0)),
                round2(Number(item.disbursedAmountBefore || 0)),
                round2(Number(item.thisDisbursementAmount || 0)),
                round2(Number(item.remainingBalance ?? ((item.approvedAmount || 0) - (item.disbursedAmountBefore || 0) - (item.thisDisbursementAmount || 0)))),
                item.notes || '',
                isDraft ? 'draft' : 'pending_verification',
              ],
            });
          }
        }

        // Record attachment if present
        if (input.proofUrl) {
          await tx.execute({
            sql: `INSERT INTO workflow_attachments (
              id, workflow_id, withdrawal_id, step_number, file_name, file_url, file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
            ) VALUES (?, ?, ?, 3, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              `att-cw-${Date.now()}-${count}`,
              input.workflowId,
              withdrawalId,
              input.proofName || `ใบเบิกเงินสด-${withdrawalNo.replace('/', '_')}.pdf`,
              input.proofUrl,
              input.proofSize || 102400,
              input.proofType || 'application/pdf',
              actor.id,
              actor.name,
              timestampNow,
              `หลักฐานการเบิกเงินสด ${withdrawalNo} เพื่อ "${purpose}"`,
            ],
          });
        }

        // Update parent workflow Step 3 summary totals (Only if isDisbursed)
        let remainingCashAfter = availableCash;
        if (isDisbursed) {
          const newTotalWithdrawn = round2(totalWithdrawnSoFar + amount);
          remainingCashAfter = round2(availableCash - amount);
          await tx.execute({
            sql: `UPDATE cash_flow_workflows 
                  SET step3_withdraw_amount = ?, step3_date = ?, step3_purpose = ?, step3_target_asnaf = ?, step3_target_fund_id = ?, step3_approver_id = ?, step3_approver_name = ?, step3_status = 'approved', updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            args: [
              newTotalWithdrawn,
              eventDt,
              purpose,
              input.targetAsnaf || (voucherType === 'office_expense' ? 'amileen' : 'faqir_miskin'),
              input.targetFundId || 'fund-1',
              input.approverId || 'u-4',
              input.approverName || 'อิหม่ามฟารุก อาลี',
              input.workflowId,
            ],
          });
        }

        // Audit Log
        const auditAction = isDraft ? 'CASH_FLOW_WITHDRAWAL_DRAFT' : 'CASH_FLOW_WITHDRAWAL_ADDED';
        await tx.execute({
          sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `log-${Date.now()}`,
            timestampNow,
            actor.id,
            actor.name,
            actor.role,
            auditAction,
            'cash_flow_workflow',
            input.workflowId,
            `ขั้นตอนที่ 3: ผู้เบิกเงินสด (${withdrawerName}) ออกใบสำคัญเบิกเงินสด ${withdrawalNo} (${voucherType === 'office_expense' ? 'สำรองจ่ายสำนักงาน' : (voucherType === 'other_approved' ? 'วัตถุประสงค์อื่นที่ได้รับอนุมัติ' : 'ช่วยเหลือผู้รับ')}) จำนวน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (สถานะ: ${status}, คงเหลือในมือเหรัญญิก: ฿${remainingCashAfter.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
          ],
        });

        // Commit all changes atomically!
        await tx.commit();

        return {
          success: true,
          withdrawalId,
          withdrawalNo,
          amount,
          status,
          remainingCash: remainingCashAfter,
          cumulativeWithdrawn: isDisbursed ? round2(totalWithdrawnSoFar + amount) : totalWithdrawnSoFar,
        };
      } catch (err: any) {
        if (tx) {
          try {
            await tx.rollback();
          } catch {
            // Ignore rollback error if tx is already closed
          }
        }
        const isConstraintErr = err.message && (
          err.message.includes('UNIQUE constraint failed') ||
          err.message.includes('SQLITE_CONSTRAINT') ||
          err.message.includes('idx_cfw_withdrawal_no')
        );
        const isBusyErr = err.message && (
          err.message.includes('SQLITE_BUSY') ||
          err.message.includes('database is locked')
        );

        if (isBusyErr && attempt < maxRetries) {
          // Jittered backoff to alleviate concurrency contention
          await new Promise((resolve) => setTimeout(resolve, attempt * 50 + Math.floor(Math.random() * 50)));
          continue;
        }

        if (!isAutoVoucher && isConstraintErr) {
          const nextAvail = await FinancialService.getNextWithdrawalNo(year);
          throw new Error(`ตรวจพบเลขที่ใบสำคัญซ้ำซ้อน: เลขที่ "${withdrawalNo}" มีอยู่ในระบบแล้ว กรุณาใช้เลขที่เอกสารอื่น (แนะนำเลขที่ถัดไป: "${nextAvail}")`);
        }
        if (isAutoVoucher && isConstraintErr && attempt < maxRetries) {
          console.warn(`[AutoVoucher] Collision detected for "${withdrawalNo}", retrying (${attempt}/${maxRetries})...`);
          withdrawalNo = ''; // Force dynamic allocation on next attempt
          await new Promise((resolve) => setTimeout(resolve, attempt * 30 + Math.floor(Math.random() * 30)));
          continue;
        }
        throw err;
      }
    }

    throw new Error('ไม่สามารถจัดสรรเลขที่ใบสำคัญที่ไม่ซ้ำได้ กรุณาลองใหม่อีกครั้ง');
  }

  /**
   * Fetch approved assistance applications for linking in Step 4
   */
  static async getApprovedAssistanceApplications(search?: string, asnaf?: string) {
    await initDb();
    const db = getDb();

    let sql = `
      SELECT 
        a.id, a.application_no, a.beneficiary_id, b.full_name as beneficiary_name, 
        b.national_id, COALESCE(b.registration_no, a.registration_no) as registration_no, a.asnaf_category, 
        COALESCE(at.name, a.assistance_type, 'เงินช่วยเหลือยังชีพ') as assistance_type,
        COALESCE(
          NULLIF(TRIM(COALESCE(h.subdistrict, b.subdistrict, '') || ' ' || COALESCE(h.district, '') || ' จ.' || COALESCE(h.province, '')), ' จ.'),
          b.branch_name, 
          'ปัตตานี'
        ) as area_info,
        round(a.approved_amount, 2) as approved_amount, 
        round(COALESCE(a.disbursed_amount, 0), 2) as disbursed_amount,
        round(a.approved_amount - COALESCE(a.disbursed_amount, 0), 2) as remaining_amount,
        a.status,
        a.approved_date,
        b.phone,
        a.approver_id,
        a.approved_by
      FROM assistance_applications a
      JOIN beneficiaries b ON a.beneficiary_id = b.id
      LEFT JOIN households h ON b.household_id = h.id
      LEFT JOIN assistance_types at ON a.assistance_type_id = at.id
      WHERE a.status IN ('wait_disbursement', 'approved', 'partially_disbursed') 
        AND a.approved_amount > 0
        AND (a.disbursed_amount IS NULL OR a.disbursed_amount < a.approved_amount)
        AND a.status NOT IN ('rejected', 'cancelled', 'closed', 'suspended')
    `;
    const args: any[] = [];

    if (asnaf && asnaf !== 'all') {
      sql += ` AND a.asnaf_category = ?`;
      args.push(asnaf);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ` AND (
        a.application_no LIKE ? OR 
        b.registration_no LIKE ? OR 
        a.registration_no LIKE ? OR 
        b.full_name LIKE ? OR 
        b.national_id LIKE ? OR 
        a.assistance_type LIKE ? OR 
        at.name LIKE ? OR 
        h.province LIKE ? OR 
        h.district LIKE ? OR 
        h.subdistrict LIKE ? OR 
        a.approved_date LIKE ?
      )`;
      args.push(q, q, q, q, q, q, q, q, q, q, q);
    }

    sql += ` ORDER BY a.created_at DESC`;

    const res = await db.execute({ sql, args });
    return res.rows.map((r) => ({
      id: String(r.id),
      applicationNo: String(r.application_no),
      registrationNo: r.registration_no ? String(r.registration_no) : undefined,
      beneficiaryId: String(r.beneficiary_id),
      beneficiaryName: String(r.beneficiary_name),
      nationalId: String(r.national_id),
      asnafCategory: String(r.asnaf_category),
      assistanceType: String(r.assistance_type),
      areaInfo: r.area_info ? String(r.area_info) : undefined,
      approvedAmount: round2(Number(r.approved_amount)),
      disbursedAmount: round2(Number(r.disbursed_amount)),
      remainingAmount: round2(Number(r.remaining_amount)),
      status: String(r.status),
      approvedDate: r.approved_date ? String(r.approved_date) : undefined,
      phone: r.phone ? String(r.phone) : undefined,
      approverId: r.approver_id ? String(r.approver_id) : undefined,
      approvedBy: r.approved_by ? String(r.approved_by) : undefined,
    }));
  }

  /**
   * TASK 2: Fetch Categorized Assistance Applications (Groups A, B, C)
   * Group A: Ready for Disbursement (พร้อมเบิกจ่าย)
   * Group B: In Progress / Pending Verification (อยู่ระหว่างดำเนินการ พร้อมเหตุผลชัดเจน)
   * Group C: Re-application required / No ready cases (จัดการที่ Frontend/Search results)
   */
  static async getCategorizedAssistanceApplications(search?: string, asnaf?: string) {
    await initDb();
    const db = getDb();

    let sql = `
      SELECT 
        a.id, a.application_no, a.beneficiary_id, b.full_name as beneficiary_name, 
        b.national_id, COALESCE(b.registration_no, a.registration_no) as registration_no, a.asnaf_category, 
        COALESCE(at.name, a.assistance_type, 'เงินช่วยเหลือยังชีพ') as assistance_type,
        COALESCE(
          NULLIF(TRIM(COALESCE(h.subdistrict, b.subdistrict, '') || ' ' || COALESCE(h.district, '') || ' จ.' || COALESCE(h.province, '')), ' จ.'),
          b.branch_name, 
          'ปัตตานี'
        ) as area_info,
        round(COALESCE(a.approved_amount, 0), 2) as approved_amount, 
        round(COALESCE(a.disbursed_amount, 0), 2) as disbursed_amount,
        round(COALESCE(a.approved_amount, 0) - COALESCE(a.disbursed_amount, 0), 2) as remaining_amount,
        round(COALESCE(a.requested_amount, 0), 2) as requested_amount,
        a.status,
        a.urgency_level,
        a.approved_date,
        a.approval_notes,
        a.necessity_details,
        b.phone,
        b.occupation,
        h.living_score
      FROM assistance_applications a
      JOIN beneficiaries b ON a.beneficiary_id = b.id
      LEFT JOIN households h ON b.household_id = h.id
      LEFT JOIN assistance_types at ON a.assistance_type_id = at.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (asnaf && asnaf !== 'all') {
      sql += ` AND a.asnaf_category = ?`;
      args.push(asnaf);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ` AND (
        a.application_no LIKE ? OR 
        b.registration_no LIKE ? OR 
        a.registration_no LIKE ? OR 
        b.full_name LIKE ? OR 
        b.national_id LIKE ? OR 
        a.assistance_type LIKE ? OR 
        at.name LIKE ? OR 
        h.province LIKE ? OR 
        h.district LIKE ? OR 
        h.subdistrict LIKE ? OR 
        a.approved_date LIKE ?
      )`;
      args.push(q, q, q, q, q, q, q, q, q, q, q);
    }

    sql += ` ORDER BY a.created_at DESC`;

    const res = await db.execute({ sql, args });

    const readyToDisburse: any[] = [];
    const inProgress: any[] = [];

    for (const r of res.rows) {
      const approvedAmount = round2(Number(r.approved_amount || 0));
      const disbursedAmount = round2(Number(r.disbursed_amount || 0));
      const remainingAmount = round2(approvedAmount - disbursedAmount);
      const status = String(r.status || '');

      const baseItem = {
        id: String(r.id),
        applicationNo: String(r.application_no),
        registrationNo: r.registration_no ? String(r.registration_no) : undefined,
        beneficiaryId: String(r.beneficiary_id),
        beneficiaryName: String(r.beneficiary_name),
        nationalId: String(r.national_id),
        asnafCategory: String(r.asnaf_category),
        assistanceType: String(r.assistance_type),
        areaInfo: r.area_info ? String(r.area_info) : undefined,
        approvedAmount,
        disbursedAmount,
        remainingAmount,
        requestedAmount: round2(Number(r.requested_amount || 0)),
        status,
        approvedDate: r.approved_date ? String(r.approved_date) : undefined,
        approvalNotes: r.approval_notes ? String(r.approval_notes) : undefined,
        necessityDetails: r.necessity_details ? String(r.necessity_details) : undefined,
        phone: r.phone ? String(r.phone) : undefined,
        occupation: r.occupation ? String(r.occupation) : undefined,
        livingScore: r.living_score ? Number(r.living_score) : undefined,
        urgencyLevel: r.urgency_level ? String(r.urgency_level) : 'normal',
      };

      // GROUP A: พร้อมเบิกจ่าย
      // 1. ได้รับอนุมัติแล้ว (approved, wait_disbursement, partially_disbursed)
      // 2. มีจำนวนเงินหรือวงเงินอนุมัติที่ตรวจสอบได้ (approvedAmount > 0)
      // 3. ยังมียอดอนุมัติคงเหลือ (remainingAmount > 0)
      // 4. ไม่ถูกยกเลิกหรือระงับ (status not in cancelled, rejected, closed, suspended)
      // 5. ไม่ถูกจ่ายเต็มจำนวนไปแล้ว (remainingAmount > 0)
      const isApprovedStatus = ['wait_disbursement', 'approved', 'partially_disbursed'].includes(status);
      const isNotTerminated = !['cancelled', 'rejected', 'closed', 'suspended', 'disbursed'].includes(status);

      if (isApprovedStatus && isNotTerminated && approvedAmount > 0 && remainingAmount > 0) {
        readyToDisburse.push({
          ...baseItem,
          group: 'ready',
          groupLabel: 'พร้อมเบิกจ่าย (กลุ่ม A)',
          canDisburse: true,
        });
      } else {
        // GROUP B: อยู่ระหว่างดำเนินการ (หรือจ่ายครบ/ยกเลิก)
        let blockReason = 'อยู่ระหว่างดำเนินการตามขั้นตอน';
        if (status === 'submitted') {
          blockReason = 'อยู่ระหว่างรอเจ้าหน้าที่รับเรื่องและตรวจสอบเอกสารเบื้องต้น';
        } else if (status === 'doc_review') {
          blockReason = 'อยู่ระหว่างเจ้าหน้าที่ตรวจสอบเอกสารและหลักฐานประกอบ';
        } else if (status === 'field_inspection' || status === 'assessment' || status === 'assessing') {
          blockReason = 'อยู่ระหว่างรอลงพื้นที่ตรวจสอบและประเมินสภาพความเป็นอยู่จริง';
        } else if (status === 'pending_approval') {
          blockReason = 'อยู่ระหว่างรอการพิจารณาอนุมัติวงเงินจากคณะกรรมการ';
        } else if (status === 'need_info') {
          blockReason = 'รอข้อมูลหรือเอกสารเพิ่มเติมจากผู้ยื่นคำร้อง';
        } else if (status === 'rejected') {
          blockReason = 'คำร้องไม่ผ่านการอนุมัติ (ถูกปฏิเสธ)';
        } else if (status === 'cancelled' || status === 'suspended') {
          blockReason = 'คำร้องถูกยกเลิกหรือระงับการดำเนินการ';
        } else if (status === 'disbursed' || remainingAmount <= 0) {
          blockReason = `จ่ายเงินช่วยเหลือครบตามวงเงินอนุมัติแล้ว (฿${approvedAmount.toLocaleString()} บาท)`;
        } else if (status === 'closed') {
          blockReason = 'ปิดคำร้องเรียบร้อยแล้ว';
        } else if (approvedAmount <= 0) {
          blockReason = 'ยังไม่มียอดอนุมัติ หรือยอดอนุมัติเป็น 0 บาท';
        }

        inProgress.push({
          ...baseItem,
          group: 'in_progress',
          groupLabel: 'อยู่ระหว่างดำเนินการ (กลุ่ม B)',
          canDisburse: false,
          blockReason,
        });
      }
    }

    return {
      readyToDisburse,
      inProgress,
      summary: {
        totalReady: readyToDisburse.length,
        totalInProgress: inProgress.length,
        totalReadyAmount: readyToDisburse.reduce((sum, item) => sum + item.remainingAmount, 0),
      },
    };
  }

  /**
   * TASK 2: Strict Backend Validation before allowing an application to be selected for withdrawal voucher
   */
  static async validateApplicationForWithdrawal(applicationId: string, actor: ActorContext) {
    await initDb();
    const db = getDb();

    // 1. Authorization check
    if (!['super_admin', 'finance', 'executive'].includes(actor.role)) {
      return {
        valid: false,
        code: 'UNAUTHORIZED_ROLE',
        reason: `ไม่มีสิทธิ์ดำเนินการ: เฉพาะฝ่ายการเงินหรือผู้มีอำนาจเท่านั้นที่มีสิทธิ์เบิกเงินช่วยเหลือ (บทบาทปัจจุบัน: ${actor.role})`,
      };
    }

    if (!applicationId || !applicationId.trim()) {
      return {
        valid: false,
        code: 'MISSING_APPLICATION_ID',
        reason: 'ข้อมูลไม่ครบถ้วน: ต้องระบุรหัสคำร้องขอความช่วยเหลือ',
      };
    }

    // 2. Fetch Application
    const appRes = await db.execute({
      sql: `SELECT a.*, b.full_name as beneficiary_name, b.national_id, b.registration_no as ben_reg_no,
                   b.asnaf_category as ben_asnaf
            FROM assistance_applications a
            JOIN beneficiaries b ON a.beneficiary_id = b.id
            WHERE a.id = ?`,
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      return {
        valid: false,
        code: 'APPLICATION_NOT_FOUND',
        reason: `ไม่พบข้อมูลคำร้องขอความช่วยเหลือ (รหัส: ${applicationId}) กรุณาตรวจสอบว่ามีคำร้องอยู่ในระบบหรือไม่`,
      };
    }

    const app = appRes.rows[0];
    const status = String(app.status || '');
    const approvedAmount = round2(Number(app.approved_amount || 0));
    const disbursedAmount = round2(Number(app.disbursed_amount || 0));
    const remainingAmount = round2(approvedAmount - disbursedAmount);

    // 3. Status checks
    if (['rejected'].includes(status)) {
      return {
        valid: false,
        code: 'REJECTED_APPLICATION',
        reason: 'ยังไม่ได้รับอนุมัติ: คำร้องนี้ไม่ผ่านการพิจารณาอนุมัติ (ถูกปฏิเสธ)',
      };
    }

    if (['cancelled', 'suspended'].includes(status)) {
      return {
        valid: false,
        code: 'CANCELLED_APPLICATION',
        reason: 'ถูกระงับ: คำร้องนี้ถูกระงับหรือยกเลิกการช่วยเหลือ',
      };
    }

    if (['closed'].includes(status)) {
      return {
        valid: false,
        code: 'CLOSED_APPLICATION',
        reason: 'คำร้องถูกปิดแล้ว: คำร้องนี้ถูกปิดเรื่องเรียบร้อยแล้ว ไม่สามารถเบิกเงินซ้ำได้',
      };
    }

    if (['submitted', 'doc_review', 'field_inspection', 'pending_approval', 'need_info', 'assessment', 'assessing'].includes(status)) {
      let stageName = status;
      if (status === 'submitted') stageName = 'รอรับเรื่อง';
      else if (status === 'doc_review') stageName = 'รอตรวจเอกสาร';
      else if (status === 'field_inspection') stageName = 'รอลงพื้นที่';
      else if (status === 'pending_approval') stageName = 'รอคณะกรรมการอนุมัติ';
      else if (status === 'need_info') stageName = 'ขอเอกสารเพิ่ม';

      return {
        valid: false,
        code: 'NOT_YET_APPROVED',
        reason: `ยังไม่ได้รับอนุมัติ: คำร้องนี้ยังอยู่ระหว่างขั้นตอน "${stageName}" ยังไม่ผ่านการอนุมัติวงเงินช่วยเหลือ`,
      };
    }

    // 4. Amount checks
    if (approvedAmount <= 0) {
      return {
        valid: false,
        code: 'NO_APPROVED_AMOUNT',
        reason: 'ไม่มียอดอนุมัติ: คำร้องนี้ยังไม่มียอดอนุมัติ หรือยอดอนุมัติเป็น 0 บาท',
      };
    }

    if (remainingAmount <= 0 || status === 'disbursed') {
      return {
        valid: false,
        code: 'ALREADY_DISBURSED',
        reason: `จ่ายครบแล้ว: จ่ายเงินช่วยเหลือครบตามวงเงินอนุมัติแล้ว (ยอดอนุมัติ ฿${approvedAmount.toLocaleString()} บาท, จ่ายแล้ว ฿${disbursedAmount.toLocaleString()} บาท, คงเหลือ ฿0 บาท)`,
      };
    }

    if (!['approved', 'wait_disbursement', 'partially_disbursed'].includes(status)) {
      return {
        valid: false,
        code: 'INVALID_STATUS',
        reason: `สถานะไม่ถูกต้อง: สถานะของคำร้องคือ "${status}" ซึ่งไม่อยู่ในเงื่อนไขการเบิกจ่าย`,
      };
    }

    // 5. Data completeness checks
    if (!app.beneficiary_id || !app.beneficiary_name) {
      return {
        valid: false,
        code: 'INCOMPLETE_BENEFICIARY_DATA',
        reason: 'ข้อมูลไม่ครบถ้วน: ไม่พบข้อมูลผู้มีสิทธิ์รับซะกาตที่เชื่อมโยงกับคำร้องนี้',
      };
    }

    return {
      valid: true,
      application: {
        id: String(app.id),
        applicationNo: String(app.application_no),
        registrationNo: app.ben_reg_no ? String(app.ben_reg_no) : (app.registration_no ? String(app.registration_no) : undefined),
        beneficiaryId: String(app.beneficiary_id),
        beneficiaryName: String(app.beneficiary_name),
        nationalId: String(app.national_id),
        asnafCategory: String(app.asnaf_category || app.ben_asnaf || 'faqir_miskin'),
        assistanceType: String(app.assistance_type || 'เงินช่วยเหลือยังชีพ'),
        approvedAmount,
        disbursedAmount,
        remainingAmount,
        status,
        approvedDate: app.approved_date ? String(app.approved_date) : undefined,
      },
    };
  }


  /**
   * Section 2: Clear Petty Cash / Office Expense (เคลียร์เงินสำรองจ่าย)
   */
  static async clearPettyCash(
    arg1: string | {
      withdrawalId: string;
      spentAmount?: number;
      returnedAmount?: number;
      returnDate?: string;
      items?: {
        expenseDate?: string;
        description: string;
        amount: number;
        receiptUrl?: string;
        receiptName?: string;
        receiptSize?: number;
        receiptType?: string;
        categoryCode?: string;
        categoryName?: string;
        notes?: string;
      }[];
      clearanceDate?: string;
      proofUrl?: string;
      proofName?: string;
      proofSize?: number;
      proofType?: string;
      notes?: string;
      overspentReason?: string;
      overspentApprovedById?: string;
      overspentApprovedByName?: string;
      isOverspentApproved?: boolean;
    },
    arg2: any,
    arg3?: any
  ) {
    await initDb();
    const db = getDb();

    let withdrawalId: string;
    let input: {
      spentAmount?: number;
      returnedAmount?: number;
      returnDate?: string;
      items?: {
        expenseDate?: string;
        description: string;
        amount: number;
        receiptUrl?: string;
        receiptName?: string;
        receiptSize?: number;
        receiptType?: string;
        categoryCode?: string;
        categoryName?: string;
        notes?: string;
      }[];
      clearanceDate?: string;
      proofUrl?: string;
      proofName?: string;
      proofSize?: number;
      proofType?: string;
      notes?: string;
      overspentReason?: string;
      overspentApprovedById?: string;
      overspentApprovedByName?: string;
      isOverspentApproved?: boolean;
    };
    let actor: ActorContext;

    if (typeof arg1 === 'string') {
      withdrawalId = arg1;
      input = arg2;
      actor = arg3;
    } else {
      withdrawalId = arg1.withdrawalId;
      input = arg1;
      actor = arg2;
    }

    const withRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_withdrawals WHERE id = ?',
      args: [withdrawalId],
    });
    if (withRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรายการเบิกสำรองจ่าย');
    const item = withRes.rows[0];

    // Locked workflow check
    const wfCheck = await db.execute({
      sql: 'SELECT overall_status FROM cash_flow_workflows WHERE id = ?',
      args: [item.workflow_id],
    });
    if (wfCheck.rows.length > 0 && wfCheck.rows[0].overall_status === 'completed') {
      throw new Error('ไม่สามารถเคลียร์เงินสำรองจ่ายได้: รอบการเบิกเงินสดนี้ถูกปิดรอบสมบูรณ์แล้ว (Locked)');
    }

    // Duplicate clearance prevention (TASK 6)
    if (item.clearance_status === 'cleared' || item.clearance_status === 'overspent_approved') {
      throw new Error('รายการเบิกเงินสำรองจ่ายนี้ได้ทำการเคลียร์ใบเสร็จเรียบร้อยแล้ว ไม่สามารถเคลียร์ซ้ำได้');
    }

    // Process itemized actual expenses (TASK 6)
    const items = input.items || [];
    let spentAmt = 0;
    if (items.length > 0) {
      for (const it of items) {
        const amt = round2(Number(it.amount));
        if (isNaN(amt) || amt <= 0) {
          throw new Error('จำนวนเงินในรายการค่าใช้จ่ายจริงต้องมากกว่า 0 บาท');
        }
        spentAmt += amt;
      }
      spentAmt = round2(spentAmt);
    } else {
      spentAmt = round2(Number(input.spentAmount || 0));
    }

    if (spentAmt < 0) throw new Error('จำนวนเงินที่ใช้จริงต้องไม่ติดลบ');

    const receivedAmt = round2(Number(item.amount));
    const requiredRefund = spentAmt <= receivedAmt ? round2(receivedAmt - spentAmt) : 0;
    const excessAmt = spentAmt > receivedAmt ? round2(spentAmt - receivedAmt) : 0;

    // Negative refund check (ห้ามบันทึกเงินคืนติดลบโดยไม่มีการชี้แจง)
    if (input.returnedAmount !== undefined && Number(input.returnedAmount) < 0) {
      throw new Error('ห้ามบันทึกเงินคืนติดลบโดยไม่มีการชี้แจงและอนุมัติ');
    }

    const actualReturnedAmt = input.returnedAmount !== undefined ? round2(Number(input.returnedAmount)) : requiredRefund;

    // Overspent policy handling (TASK 6)
    let clearanceStatus: 'cleared' | 'overspent_approved' = 'cleared';
    let overspentReason: string | null = null;
    let overspentApprovedById: string | null = null;
    let overspentApprovedByName: string | null = null;
    let overspentApprovedAt: string | null = null;

    if (excessAmt > 0) {
      overspentReason = (input.overspentReason || input.notes || '').trim();
      if (!overspentReason) {
        throw new Error(`มีค่าใช้จ่ายจริง (฿${spentAmt.toLocaleString()}) เกินเงินที่ได้รับ (฿${receivedAmt.toLocaleString()}) ส่วนต่าง ฿${excessAmt.toLocaleString()} บาท ต้องระบุเหตุผลชี้แจงส่วนต่าง`);
      }

      const isRoleAuthorized = actor.role === 'super_admin' || actor.role === 'executive' || actor.role === 'finance';
      if (!isRoleAuthorized) {
        throw new Error('ค่าใช้จ่ายเกินเงินที่ได้รับต้องได้รับการอนุมัติตามนโยบายมูลนิธิโดยผู้มีสิทธิ์ (Super Admin, Executive, Finance)');
      }

      if (!input.isOverspentApproved) {
        throw new Error('ค่าใช้จ่ายเกินเงินที่ได้รับต้องได้รับการอนุมัติตามนโยบายมูลนิธิ (Policy Approval)');
      }

      clearanceStatus = 'overspent_approved';
      overspentApprovedById = input.overspentApprovedById || actor.id;
      overspentApprovedByName = input.overspentApprovedByName || actor.name;
      overspentApprovedAt = new Date().toISOString();
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const clDate = input.clearanceDate || timestampNow;
    const returnDate = input.returnDate || input.clearanceDate || timestampNow;

    // Save clearance items to cash_flow_clearance_items
    if (items.length > 0) {
      await db.execute({
        sql: 'DELETE FROM cash_flow_clearance_items WHERE withdrawal_id = ?',
        args: [withdrawalId]
      });

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const clItemId = `cli-${Date.now()}-${i + 1}`;
        await db.execute({
          sql: `INSERT INTO cash_flow_clearance_items (
            id, withdrawal_id, workflow_id, expense_date, description, amount,
            receipt_url, receipt_name, receipt_size, receipt_type,
            category_code, category_name, notes, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            clItemId,
            withdrawalId,
            String(item.workflow_id),
            it.expenseDate || clDate,
            it.description.trim(),
            round2(Number(it.amount)),
            it.receiptUrl || null,
            it.receiptName || null,
            it.receiptSize || 0,
            it.receiptType || null,
            it.categoryCode || item.expense_category || null,
            it.categoryName || null,
            it.notes || null,
            'accepted'
          ]
        });

        if (it.receiptUrl) {
          await db.execute({
            sql: `INSERT INTO workflow_attachments (
              id, workflow_id, withdrawal_id, step_number, file_name, file_url, file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
            ) VALUES (?, ?, ?, 3, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              `att-cli-${Date.now()}-${i + 1}`,
              String(item.workflow_id),
              withdrawalId,
              it.receiptName || `ใบเสร็จ-${it.description}.pdf`,
              it.receiptUrl,
              it.receiptSize || 102400,
              it.receiptType || 'application/pdf',
              actor.id,
              actor.name,
              timestampNow,
              `ใบเสร็จรายการค่าใช้จ่าย: ${it.description} (฿${round2(Number(it.amount)).toLocaleString()})`
            ]
          });
        }
      }
    }

    await db.execute({
      sql: `UPDATE cash_flow_withdrawals SET
        clearance_spent_amount = ?,
        clearance_returned_amount = ?,
        clearance_excess_amount = ?,
        clearance_status = ?,
        clearance_date = ?,
        clearance_return_date = ?,
        clearance_overspent_reason = ?,
        clearance_overspent_approved_by_id = ?,
        clearance_overspent_approved_by_name = ?,
        clearance_overspent_approved_at = ?,
        clearance_proof_url = ?,
        clearance_proof_name = ?,
        clearance_proof_size = ?,
        clearance_proof_type = ?,
        clearance_notes = ?,
        cleared_by_id = ?,
        cleared_by_name = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        spentAmt,
        actualReturnedAmt,
        excessAmt,
        clearanceStatus,
        clDate,
        returnDate,
        overspentReason,
        overspentApprovedById,
        overspentApprovedByName,
        overspentApprovedAt,
        input.proofUrl || '',
        input.proofName || '',
        input.proofSize || 0,
        input.proofType || '',
        input.notes || '',
        actor.id,
        actor.name,
        withdrawalId,
      ],
    });

    if (input.proofUrl) {
      await db.execute({
        sql: `INSERT INTO workflow_attachments (
          id, workflow_id, withdrawal_id, step_number, file_name, file_url, file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
        ) VALUES (?, ?, ?, 3, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `att-clear-${Date.now()}`,
          String(item.workflow_id),
          withdrawalId,
          input.proofName || 'ใบเสร็จเคลียร์เงินสำรองจ่าย.pdf',
          input.proofUrl,
          input.proofSize || 102400,
          input.proofType || 'application/pdf',
          actor.id,
          actor.name,
          timestampNow,
          `หลักฐานการเคลียร์เงินสำรองจ่าย ${item.withdrawal_no} ใช้จริง ฿${spentAmt.toLocaleString()} คืน ฿${actualReturnedAmt.toLocaleString()}`,
        ],
      });
    }

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        excessAmt > 0 ? 'PETTY_CASH_OVERSPENT_APPROVED' : 'PETTY_CASH_CLEARED',
        'cash_flow_withdrawal',
        withdrawalId,
        `เคลียร์เงินสำรองจ่าย ${item.withdrawal_no}: ได้รับ ฿${receivedAmt.toLocaleString()} ใช้จริง ฿${spentAmt.toLocaleString()} คืน ฿${actualReturnedAmt.toLocaleString()}${excessAmt > 0 ? ` (ส่วนเกิน ฿${excessAmt.toLocaleString()} อนุมัติแล้ว)` : ''}`,
      ],
    });

    return {
      success: true,
      withdrawalId,
      receivedAmount: receivedAmt,
      spentAmount: spentAmt,
      returnedAmount: actualReturnedAmt,
      excessAmount: excessAmt,
      clearanceSpentAmount: spentAmt,
      clearanceReturnedAmount: actualReturnedAmt,
      clearanceExcessAmount: excessAmt,
      clearanceStatus,
      itemCount: items.length
    };
  }

  /**
   * Step 4: Confirm actual cash disbursement to beneficiaries
   */
  static async confirmCashDisbursement(
    input: string | {
      withdrawalId: string;
      notes?: string;
      proofUrl?: string;
      proofName?: string;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const withdrawalId = typeof input === 'string' ? input : input.withdrawalId;
    const notes = typeof input === 'string' ? '' : (input.notes || '');
    const proofUrl = typeof input === 'string' ? '' : (input.proofUrl || '');
    const proofName = typeof input === 'string' ? '' : (input.proofName || '');

    const withRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_withdrawals WHERE id = ?',
      args: [withdrawalId],
    });
    if (withRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรายการเบิกเงินสด');
    const withdrawal = withRes.rows[0];

    const wfCheck = await db.execute({
      sql: 'SELECT overall_status FROM cash_flow_workflows WHERE id = ?',
      args: [withdrawal.workflow_id],
    });
    if (wfCheck.rows.length > 0 && wfCheck.rows[0].overall_status === 'completed') {
      throw new Error('ไม่สามารถยืนยันการจ่ายได้: รอบการเบิกเงินสดนี้ถูกปิดรอบสมบูรณ์แล้ว (Locked)');
    }

    // Idempotency & Status Checks (Rule 4)
    if (withdrawal.status === 'completed') {
      throw new Error(`ใบสำคัญเบิกเงินสด "${withdrawal.withdrawal_no}" ได้รับการยืนยันการจ่ายเงินช่วยเหลือเรียบร้อยแล้ว ไม่สามารถยืนยันซ้ำได้`);
    }
    if (withdrawal.status === 'cancelled') {
      throw new Error(`ไม่สามารถยืนยันการจ่ายเงินของใบสำคัญ "${withdrawal.withdrawal_no}" ได้ เนื่องจากรายการถูกยกเลิกแล้ว`);
    }

    // Fetch child disbursement line items
    const itemsRes = await db.execute({
      sql: "SELECT * FROM cash_flow_disbursement_items WHERE withdrawal_id = ? AND status != 'cancelled'",
      args: [withdrawalId],
    });

    if (itemsRes.rows.length === 0) {
      throw new Error(`ไม่พบรายการผู้รับความช่วยเหลือในใบสำคัญ "${withdrawal.withdrawal_no}"`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const effectiveProof = proofUrl || withdrawal.proof_url || '';

    // Update each assistance_application and insert financial_transactions
    for (const item of itemsRes.rows) {
      const appId = String(item.application_id);
      const disAmt = round2(Number(item.this_disbursement_amount));

      // Fetch current application
      const appRes = await db.execute({
        sql: 'SELECT * FROM assistance_applications WHERE id = ?',
        args: [appId],
      });
      if (appRes.rows.length > 0) {
        const app = appRes.rows[0];
        const prevDisb = round2(Number(app.disbursed_amount || 0));
        const appAmt = round2(Number(app.approved_amount || 0));
        const newDisb = round2(prevDisb + disAmt);
        const newStatus = newDisb >= appAmt ? 'disbursed' : 'wait_disbursement';

        const prevRef = app.disbursement_ref ? String(app.disbursement_ref).trim() : '';
        const currRef = String(withdrawal.withdrawal_no).trim();
        const combinedRef = prevRef ? (prevRef.includes(currRef) ? prevRef : `${prevRef}, ${currRef}`) : currRef;
        const effectiveNotes = item.notes || notes || withdrawal.purpose || 'จ่ายเงินสดช่วยเหลือตามคำร้อง';
        const itemProof = effectiveProof || app.disbursement_proof_url || '';

        // 1. Update assistance_applications
        await db.execute({
          sql: `UPDATE assistance_applications 
                SET disbursed_amount = ?, 
                    status = ?, 
                    disbursement_date = ?, 
                    disbursed_by_id = ?, 
                    disbursed_by_name = ?, 
                    disbursement_ref = ?, 
                    disbursement_proof_url = ?, 
                    disbursement_notes = ?, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [
            newDisb, 
            newStatus, 
            timestampNow, 
            actor.id, 
            actor.name, 
            combinedRef, 
            itemProof, 
            effectiveNotes, 
            appId
          ],
        });

        // 2. Insert into application_history (Status audit log on application)
        await db.execute({
          sql: `INSERT INTO application_history (
            id, application_id, status, changed_by_id, changed_by_name, notes, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `aph-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            appId,
            newStatus,
            actor.id,
            actor.name,
            `ยืนยันการจ่ายเงินสด ฿${disAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ตามใบสำคัญ ${withdrawal.withdrawal_no} (จ่ายสะสม ฿${newDisb.toLocaleString('th-TH', { minimumFractionDigits: 2 })} / ฿${appAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`,
            timestampNow,
          ],
        });

        // 3. Insert into financial_transactions
        const txnId = `txn-cash-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await db.execute({
          sql: `INSERT INTO financial_transactions (
            id, transaction_no, date, type, fund_id, fund_name, category,
            amount, payment_method, payer_or_payee, reference_no, slip_url,
            status, recorded_by_id, recorded_by_name, notes,
            beneficiary_id, application_id, workflow_id
          ) VALUES (?, ?, ?, 'disbursement', ?, ?, ?, ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
          args: [
            txnId,
            `TXN-DISB-${Date.now().toString().slice(-5)}`,
            timestampNow,
            String(withdrawal.target_fund_id || 'fund-1'),
            'กองทุนซะกาตผู้ยากไร้และขัดสน',
            String(item.asnaf_category || 'faqir_miskin'),
            disAmt,
            String(item.beneficiary_name),
            String(withdrawal.withdrawal_no),
            itemProof || null,
            actor.id,
            actor.name,
            `จ่ายเงินสดช่วยเหลือตามคำร้อง ${app.application_no} (${item.beneficiary_name}) ใบสำคัญ ${withdrawal.withdrawal_no}`,
            String(item.beneficiary_id),
            appId,
            String(withdrawal.workflow_id),
          ],
        });
      }
    }

    // Update items to confirmed
    await db.execute({
      sql: "UPDATE cash_flow_disbursement_items SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE withdrawal_id = ?",
      args: [withdrawalId],
    });

    // Update withdrawal status to completed
    await db.execute({
      sql: "UPDATE cash_flow_withdrawals SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [withdrawalId],
    });

    // Update parent workflow step 4 allocated amount
    const allDisbItemsRes = await db.execute({
      sql: `SELECT SUM(this_disbursement_amount) as total 
            FROM cash_flow_disbursement_items 
            WHERE workflow_id = ? AND status = 'confirmed'`,
      args: [withdrawal.workflow_id],
    });
    const totalAllocated = round2(Number(allDisbItemsRes.rows[0]?.total || 0));

    await db.execute({
      sql: `UPDATE cash_flow_workflows 
            SET step4_allocated_amount = ?, step4_status = 'completed', step4_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [totalAllocated, timestampNow, withdrawal.workflow_id],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'CASH_FLOW_DISBURSEMENT_CONFIRMED',
        'cash_flow_withdrawal',
        withdrawalId,
        `ยืนยันการจ่ายเงินสดช่วยเหลือตามใบสำคัญ ${withdrawal.withdrawal_no} จำนวน ฿${Number(withdrawal.amount).toLocaleString()} บาท ให้แก่ผู้รับ ${itemsRes.rows.length} ราย`,
      ],
    });

    return { success: true };
  }

  /**
   * Section 4: Get Unified Cash Movement History Table (7 Categories)
   */
  static async getCashMovementHistory(filters?: {
    search?: string;
    category?: string;
    paymentType?: string;
    asnaf?: string;
    assistanceType?: string;
    officeCategory?: string;
    payee?: string;
    startDate?: string;
    endDate?: string;
    workflowId?: string;
    status?: string;
    responsiblePerson?: string;
    voucherNo?: string;
  }): Promise<CashMovementHistoryEntry[]> {
    await initDb();
    const db = getDb();

    // 1. Fetch Workflows
    const wfsRes = await db.execute(`
      SELECT w.*, b.account_name as bank_account_name
      FROM cash_flow_workflows w
      LEFT JOIN bank_accounts b ON b.id = w.step1_bank_account_id
      ORDER BY w.created_at DESC
    `);

    // 2. Fetch Withdrawals
    const withsRes = await db.execute(`
      SELECT cw.*, w.workflow_no, w.title as workflow_title, w.step1_bank_account_id, b.account_name as bank_account_name
      FROM cash_flow_withdrawals cw
      JOIN cash_flow_workflows w ON cw.workflow_id = w.id
      LEFT JOIN bank_accounts b ON b.id = w.step1_bank_account_id
      ORDER BY cw.created_at DESC
    `);

    // 3. Fetch Line Items (cash_flow_disbursement_items)
    const disbItemsRes = await db.execute(`
      SELECT * FROM cash_flow_disbursement_items WHERE status != 'cancelled' ORDER BY id ASC
    `);
    const disbItemsMap = new Map<string, CashFlowDisbursementItem[]>();
    for (const row of disbItemsRes.rows) {
      const wid = String(row.withdrawal_id);
      if (!disbItemsMap.has(wid)) disbItemsMap.set(wid, []);
      disbItemsMap.get(wid)!.push({
        id: String(row.id),
        withdrawalId: wid,
        workflowId: String(row.workflow_id),
        applicationId: String(row.application_id || ''),
        beneficiaryId: String(row.beneficiary_id || ''),
        beneficiaryName: String(row.beneficiary_name || ''),
        nationalId: String(row.national_id || ''),
        asnafCategory: String(row.asnaf_category || ''),
        assistanceType: String(row.assistance_type || ''),
        areaInfo: row.area_info ? String(row.area_info) : undefined,
        approvedAmount: Number(row.approved_amount || 0),
        disbursedAmountBefore: Number(row.disbursed_amount_before || 0),
        thisDisbursementAmount: Number(row.this_disbursement_amount || 0),
        disbursedAmount: Number(row.this_disbursement_amount || 0),
        remainingBalance: Number(row.remaining_balance || 0),
        notes: row.notes ? String(row.notes) : undefined,
        status: String(row.status || 'confirmed') as any,
        createdAt: String(row.created_at || ''),
        updatedAt: String(row.updated_at || ''),
      });
    }

    // 4. Fetch Clearance Items (cash_flow_clearance_items)
    const clearanceItemsRes = await db.execute(`
      SELECT * FROM cash_flow_clearance_items ORDER BY expense_date ASC, id ASC
    `);
    const clearanceItemsMap = new Map<string, PettyCashClearanceItem[]>();
    for (const row of clearanceItemsRes.rows) {
      const wid = String(row.withdrawal_id);
      if (!clearanceItemsMap.has(wid)) clearanceItemsMap.set(wid, []);
      clearanceItemsMap.get(wid)!.push({
        id: String(row.id),
        withdrawalId: wid,
        workflowId: String(row.workflow_id),
        expenseDate: String(row.expense_date),
        description: String(row.description),
        amount: Number(row.amount || 0),
        receiptUrl: row.receipt_url ? String(row.receipt_url) : undefined,
        receiptName: row.receipt_name ? String(row.receipt_name) : undefined,
        categoryCode: row.category_code ? String(row.category_code) : undefined,
        categoryName: row.category_name ? String(row.category_name) : undefined,
        notes: row.notes ? String(row.notes) : undefined,
        status: String(row.status || 'accepted') as any,
      });
    }

    // 5. Fetch Handover Records (finance_handover_records)
    const handoversRes = await db.execute(`
      SELECT * FROM finance_handover_records ORDER BY handover_date DESC, created_at DESC
    `);
    const handoversMap = new Map<string, FinanceHandoverRecord[]>();
    for (const row of handoversRes.rows) {
      const wid = String(row.withdrawal_id);
      if (!handoversMap.has(wid)) handoversMap.set(wid, []);
      handoversMap.get(wid)!.push({
        id: String(row.id),
        withdrawalId: wid,
        workflowId: String(row.workflow_id),
        handoverNo: String(row.handover_no),
        handoverDate: String(row.handover_date),
        handoverTime: String(row.handover_time),
        handedOverById: String(row.handed_over_by_id),
        handedOverByName: String(row.handed_over_by_name),
        receivedById: row.received_by_id ? String(row.received_by_id) : undefined,
        receivedByName: String(row.received_by_name),
        receivedByPosition: row.received_by_position ? String(row.received_by_position) : undefined,
        amount: Number(row.amount || 0),
        handoverMethod: String(row.handover_method || 'cash'),
        referenceNo: row.reference_no ? String(row.reference_no) : undefined,
        notes: row.notes ? String(row.notes) : undefined,
        proofUrl: String(row.proof_url || ''),
        proofName: String(row.proof_name || ''),
        status: String(row.status || 'fully_handed_over') as any,
        recordedById: String(row.recorded_by_id || ''),
        recordedByName: String(row.recorded_by_name || ''),
        confirmedById: String(row.confirmed_by_id || ''),
        confirmedByName: String(row.confirmed_by_name || ''),
        confirmedAt: String(row.confirmed_at || ''),
        createdAt: String(row.created_at || ''),
        updatedAt: String(row.updated_at || ''),
      });
    }

    // 6. Fetch Attachments (workflow_attachments)
    const attachmentsRes = await db.execute(`
      SELECT * FROM workflow_attachments ORDER BY step_number ASC, uploaded_at ASC
    `);
    const attachmentsMap = new Map<string, any[]>();
    for (const row of attachmentsRes.rows) {
      const wid = row.withdrawal_id ? String(row.withdrawal_id) : String(row.workflow_id);
      if (!attachmentsMap.has(wid)) attachmentsMap.set(wid, []);
      attachmentsMap.get(wid)!.push({
        id: String(row.id),
        fileName: String(row.file_name),
        fileUrl: String(row.file_url),
        fileSize: Number(row.file_size || 0),
        mimeType: String(row.mime_type || ''),
        stepNumber: Number(row.step_number),
        uploadedByName: String(row.uploaded_by_name || ''),
        uploadedAt: String(row.uploaded_at || ''),
        description: row.description ? String(row.description) : undefined,
      });
    }

    // 7. Fetch Audit Logs
    const auditLogsRes = await db.execute(`
      SELECT * FROM audit_logs 
      WHERE entity_type IN ('cash_flow_workflow', 'cash_flow_withdrawal', 'finance_handover')
      ORDER BY timestamp DESC
    `);
    const auditLogsMap = new Map<string, any[]>();
    for (const row of auditLogsRes.rows) {
      const eid = String(row.entity_id);
      if (!auditLogsMap.has(eid)) auditLogsMap.set(eid, []);
      auditLogsMap.get(eid)!.push({
        id: String(row.id),
        timestamp: String(row.timestamp),
        action: String(row.action),
        userName: String(row.user_name),
        userRole: String(row.user_role),
        description: String(row.description),
      });
    }

    const getAsnafLabel = (asnaf?: any): string => {
      if (!asnaf) return '-';
      const str = String(asnaf);
      const m: Record<string, string> = {
        faqir: 'ฟากีร (ผู้ยากไร้)',
        miskin: 'มิสactivity/ขัดสน',
        amileen: 'อามิลีน (เจ้าหน้าที่)',
        muallaf: 'มุอัลลัฟ',
        riqab: 'ริกอบ (ปลดปล่อย)',
        gharimin: 'ฆอริมีน (ผู้มีหนี้สิน)',
        fisabilillah: 'ฟีสะบีลิลลาฮ์',
        ibnsabil: 'อิบนุสสะบีล',
        faqir_miskin: 'ฟากีรและมิสกิน',
      };
      return m[str.toLowerCase()] || str;
    };

    const getFundName = (f?: any): string => {
      if (!f) return 'เงินซะกาต';
      const str = String(f);
      if (str === 'sadaqah') return 'เงินศอดะเกาะฮ์ทั่วไป';
      if (str === 'admin') return 'งบประมาณบริหารจัดการ';
      if (str === 'emergency') return 'เงินกองทุนฉุกเฉิน';
      return 'เงินซะกาต';
    };

    const history: CashMovementHistoryEntry[] = [];

    // -------------------------------------------------------------------------
    // A. Real Withdrawals & Disbursements (Step 3: Aid, Office, Other Approved)
    // -------------------------------------------------------------------------
    for (const cw of withsRes.rows) {
      const wid = String(cw.id);
      const wfId = String(cw.workflow_id);
      const dt = String(cw.withdrawal_datetime || cw.created_at);
      const datePart = dt.slice(0, 10);
      const timePart = dt.length >= 16 ? dt.slice(11, 16) : '00:00';
      const vType = String(cw.voucher_type || 'aid_disbursement');
      const isOffice = vType === 'office_expense';
      const isOther = vType === 'other_approved';
      const rawStatus = String(cw.status || 'draft');
      const isCancelled = rawStatus === 'cancelled';
      const amount = round2(Number(cw.amount || 0));

      const aidItems = disbItemsMap.get(wid) || [];
      const clearanceItems = clearanceItemsMap.get(wid) || [];
      const handoverRecords = handoversMap.get(wid) || [];
      const totalHandedOver = handoverRecords
        .filter((h) => h.status !== 'cancelled')
        .reduce((sum, h) => sum + Number(h.amount || 0), 0);

      const itemAttachments = attachmentsMap.get(wid) || attachmentsMap.get(wfId) || [];
      const itemLogs = auditLogsMap.get(wid) || auditLogsMap.get(String(cw.withdrawal_no)) || [];

      let paymentType = 'aid_disbursement';
      let paymentTypeLabel = 'เงินช่วยเหลือผู้รับ';
      let payeeName = '';
      let nationalId: string | undefined = undefined;
      let asnaf: string | undefined = undefined;
      let asnafLabel: string | undefined = undefined;
      let assistanceType: string | undefined = undefined;
      let expenseCategory: string | undefined = undefined;
      let expenseCategoryName: string | undefined = undefined;
      let expenseDetails: string | undefined = undefined;
      let statusLabel = 'แบบร่าง';

      if (isOffice) {
        paymentType = 'office_expense';
        paymentTypeLabel = 'ค่าใช้จ่ายสำนักงาน';
        payeeName = (cw.expense_details ? String(cw.expense_details) : null) || (clearanceItems.length > 0 ? clearanceItems[0].description : null) || (cw.purpose ? String(cw.purpose) : null) || 'ร้านค้า/ผู้ขาย (สำนักงาน)';
        asnaf = '-';
        asnafLabel = 'ไม่ระบุอัสนัฟ (ค่าใช้จ่ายสำนักงาน)';
        expenseCategory = cw.expense_category ? String(cw.expense_category) : 'office_supplies';
        expenseCategoryName = cw.expense_category ? String(cw.expense_category) : 'ค่าใช้จ่ายสำนักงาน';
        expenseDetails = cw.expense_details ? String(cw.expense_details) : (cw.purpose ? String(cw.purpose) : undefined);
        statusLabel = cw.clearance_status === 'cleared'
          ? 'เคลียร์ใบเสร็จแล้ว'
          : cw.clearance_status === 'over_spent' || cw.clearance_status === 'overspent_approved'
          ? 'ใช้เงินเกิน (อนุมัติ)'
          : cw.clearance_status === 'pending_clearance'
          ? 'รอเคลียร์ใบเสร็จ'
          : rawStatus === 'disbursed'
          ? 'เบิกเงินสดแล้ว'
          : rawStatus === 'draft'
          ? 'แบบร่าง'
          : rawStatus;
      } else if (isOther) {
        paymentType = 'other_approved';
        paymentTypeLabel = 'วัตถุประสงค์อื่นที่ได้รับอนุมัติ';
        payeeName = cw.purpose ? String(cw.purpose) : 'ผู้รับเงินตามมติอนุมัติ';
        asnaf = '-';
        asnafLabel = 'ไม่ระบุอัสนัฟ';
        assistanceType = cw.purpose ? String(cw.purpose) : 'วัตถุประสงค์อื่นที่ได้รับอนุมัติ';
        expenseCategory = 'other_approved';
        expenseCategoryName = 'วัตถุประสงค์อื่นที่ได้รับอนุมัติ';
        statusLabel = rawStatus === 'completed'
          ? 'เบิกจ่ายสมบูรณ์'
          : rawStatus === 'disbursed'
          ? 'เบิกเงินสดแล้ว'
          : rawStatus === 'approved'
          ? 'อนุมัติแล้ว'
          : rawStatus === 'pending'
          ? 'รออนุมัติ'
          : rawStatus === 'draft'
          ? 'แบบร่าง'
          : rawStatus;
      } else {
        // Aid Disbursement
        paymentType = 'aid_disbursement';
        paymentTypeLabel = 'เงินช่วยเหลือผู้รับ';
        if (aidItems.length === 1) {
          payeeName = aidItems[0].beneficiaryName;
          nationalId = aidItems[0].nationalId;
          asnaf = aidItems[0].asnafCategory || (cw.target_asnaf ? String(cw.target_asnaf) : 'faqir_miskin');
          asnafLabel = getAsnafLabel(asnaf);
          assistanceType = aidItems[0].assistanceType || (cw.purpose ? String(cw.purpose) : 'เงินสงเคราะห์');
        } else if (aidItems.length > 1) {
          payeeName = `${aidItems[0].beneficiaryName} และคณะ (รวม ${aidItems.length} ท่าน)`;
          nationalId = aidItems.map((i) => i.nationalId).filter(Boolean).join(', ');
          asnaf = aidItems.map((i) => i.asnafCategory).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') || (cw.target_asnaf ? String(cw.target_asnaf) : 'faqir_miskin');
          asnafLabel = getAsnafLabel(asnaf);
          assistanceType = aidItems.map((i) => i.assistanceType).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') || (cw.purpose ? String(cw.purpose) : 'เงินสงเคราะห์');
        } else {
          payeeName = cw.purpose ? String(cw.purpose) : 'ผู้รับความช่วยเหลือตามคำร้อง';
          asnaf = cw.target_asnaf ? String(cw.target_asnaf) : 'faqir_miskin';
          asnafLabel = getAsnafLabel(asnaf);
          assistanceType = cw.purpose ? String(cw.purpose) : 'เงินสงเคราะห์เพื่อการยังชีพ';
        }
        statusLabel = rawStatus === 'completed'
          ? 'จ่ายสำเร็จแล้ว'
          : rawStatus === 'disbursed'
          ? 'เบิกเงินสดแล้ว'
          : rawStatus === 'approved'
          ? 'อนุมัติแล้ว'
          : rawStatus === 'pending' || rawStatus === 'pending_approval'
          ? 'รออนุมัติ'
          : rawStatus === 'draft'
          ? 'แบบร่าง'
          : rawStatus;
      }

      if (isCancelled) {
        statusLabel = 'ยกเลิกแล้ว';
      }

      history.push({
        id: `hist-cw-${wid}`,
        withdrawalId: wid,
        date: datePart,
        time: timePart,
        datetime: dt,
        workflowNo: String(cw.workflow_no),
        workflowId: wfId,
        workflowTitle: String(cw.workflow_title || ''),
        voucherNo: String(cw.withdrawal_no),
        voucherType: vType as any,
        paymentType,
        paymentTypeLabel,
        isActualDisbursement: !isCancelled,
        payeeName,
        payeeType: isOffice ? 'vendor' : isOther ? 'vendor' : 'beneficiary',
        nationalId,
        asnaf,
        asnafLabel,
        assistanceType,
        expenseCategory,
        expenseCategoryName,
        expenseDetails,
        currency: 'THB',
        amount,
        requestedAmount: cw.requested_amount ? round2(Number(cw.requested_amount)) : amount,
        approvedAmount: cw.approved_amount ? round2(Number(cw.approved_amount)) : amount,
        responsiblePerson: String(cw.withdrawer_name || 'เจ้าหน้าที่ผู้เบิก'),
        withdrawerName: String(cw.withdrawer_name || ''),
        approverName: String(cw.approver_name || ''),
        recordedByName: String(cw.withdrawer_name || ''),
        sourceFundType: String(cw.source_fund_type || 'zakat'),
        sourceFundName: getFundName(cw.source_fund_type),
        bankAccountName: cw.bank_account_name ? String(cw.bank_account_name) : undefined,
        status: rawStatus,
        statusLabel,
        proofUrl: cw.proof_url ? String(cw.proof_url) : undefined,
        proofName: cw.proof_name ? String(cw.proof_name) : undefined,
        proofSize: cw.proof_size ? Number(cw.proof_size) : undefined,
        proofType: cw.proof_type ? String(cw.proof_type) : undefined,
        notes: cw.notes ? String(cw.notes) : (cw.purpose ? String(cw.purpose) : undefined),
        aidItemsCount: aidItems.length,
        aidItems: aidItems.length > 0 ? aidItems : undefined,
        clearanceItemsCount: clearanceItems.length,
        clearanceItems: clearanceItems.length > 0 ? clearanceItems : undefined,
        handoverSummary: handoverRecords.length > 0 ? {
          handoverCount: handoverRecords.length,
          totalHandedOver,
          remainingHandover: Math.max(0, amount - totalHandedOver),
          recipientName: handoverRecords[0]?.receivedByName,
          handovers: handoverRecords,
        } : undefined,
        attachments: itemAttachments,
        auditLogs: itemLogs,
        category: isOffice ? 'เบิกเงินสำรองจ่ายสำนักงาน' : isCancelled ? 'รายการปรับปรุงหรือกลับบัญชี' : 'เบิกเงินสดช่วยเหลือ',
        categoryKey: isOffice ? 'office_petty_cash' : isCancelled ? 'reversal_adjustment' : 'aid_cash_withdrawal',
      });
    }

    // -------------------------------------------------------------------------
    // B. Cash Flow Movement Steps (Step 1 Bank Withdrawal, Step 2 Deposit, Step 5 Return)
    // Rule: isActualDisbursement = false (Guarantees money movements are NEVER counted as duplicate disbursements)
    // -------------------------------------------------------------------------
    for (const w of wfsRes.rows) {
      const wfId = String(w.id);

      // 1. Step 1: Bank Withdrawals
      const dt1 = String(w.step1_event_datetime || w.step1_date || w.created_at);
      const datePart1 = dt1.slice(0, 10);
      const timePart1 = dt1.length >= 16 ? dt1.slice(11, 16) : '00:00';
      history.push({
        id: `hist-s1-${w.id}`,
        date: datePart1,
        time: timePart1,
        datetime: dt1,
        workflowNo: String(w.workflow_no),
        workflowId: wfId,
        workflowTitle: String(w.title || ''),
        voucherNo: String(w.step1_ref_no || w.workflow_no),
        voucherType: 'bank_withdrawal',
        paymentType: 'bank_withdrawal',
        paymentTypeLabel: 'เบิกเงินจากธนาคาร (โอนย้ายเงินสด)',
        isActualDisbursement: false,
        payeeName: `บัญชี ${w.bank_account_name || 'ธนาคาร'}`,
        payeeType: 'bank',
        asnaf: '-',
        assistanceType: 'โอนย้ายเงินสดเข้าองค์กร',
        currency: 'THB',
        amount: round2(Number(w.step1_withdraw_amount)),
        responsiblePerson: String(w.step1_operator_name || 'เจ้าหน้าที่การเงิน'),
        withdrawerName: String(w.step1_operator_name || ''),
        approverName: String(w.step1_approver_name || ''),
        sourceFundType: String(w.step1_fund_type || 'zakat'),
        sourceFundName: getFundName(w.step1_fund_type),
        bankAccountName: w.bank_account_name ? String(w.bank_account_name) : undefined,
        status: String(w.step1_status || 'completed'),
        statusLabel: w.step1_status === 'draft'
          ? 'ร่าง'
          : w.step1_status === 'pending_approval'
          ? 'รออนุมัติ'
          : w.step1_status === 'approved'
          ? 'อนุมัติแล้ว'
          : w.step1_status === 'cancelled'
          ? 'ยกเลิก'
          : 'ถอนเงินแล้ว',
        proofUrl: w.step1_proof_url ? String(w.step1_proof_url) : undefined,
        proofName: w.step1_proof_name ? String(w.step1_proof_name) : undefined,
        proofSize: w.step1_proof_size ? Number(w.step1_proof_size) : undefined,
        proofType: w.step1_proof_type ? String(w.step1_proof_type) : undefined,
        notes: `ถอนเงินจาก ${w.bank_account_name || 'ธนาคาร'} เพื่อ ${w.title}`,
        category: 'เบิกเงินจากธนาคาร',
        categoryKey: 'bank_withdrawal',
      });

      // 2. Step 2: Treasurer Deposits
      if ((w.step2_status === 'received' || w.step2_status === 'completed') && w.step2_deposit_amount) {
        const dt2 = String(w.step2_event_datetime || w.step2_date || w.created_at);
        const datePart2 = dt2.slice(0, 10);
        const timePart2 = dt2.length >= 16 ? dt2.slice(11, 16) : '00:00';
        history.push({
          id: `hist-s2-${w.id}`,
          date: datePart2,
          time: timePart2,
          datetime: dt2,
          workflowNo: String(w.workflow_no),
          workflowId: wfId,
          workflowTitle: String(w.title || ''),
          voucherNo: String(w.step2_ref_no || `DEP-${w.workflow_no}`),
          voucherType: 'treasurer_deposit',
          paymentType: 'treasurer_deposit',
          paymentTypeLabel: 'ฝากเข้าบัญชีเหรัญญิก (พักเงินสด)',
          isActualDisbursement: false,
          payeeName: `${w.step2_treasurer_name || 'นายรุสลัน หะสาเมาะ'} (เหรัญญิก)`,
          payeeType: 'custodian',
          asnaf: '-',
          assistanceType: 'รับมอบเงินสดเข้าความดูแล',
          currency: 'THB',
          amount: round2(Number(w.step2_deposit_amount)),
          responsiblePerson: String(w.step2_treasurer_name || 'นายรุสลัน หะสาเมาะ'),
          withdrawerName: String(w.step2_handover_person_name || 'ผู้ส่งมอบ'),
          approverName: String(w.step2_mismatch_approved_by_name || 'อิหม่ามฟารุก อาลี'),
          sourceFundType: String(w.step1_fund_type || 'zakat'),
          sourceFundName: getFundName(w.step1_fund_type),
          bankAccountName: w.bank_account_name ? String(w.bank_account_name) : undefined,
          status: 'received',
          statusLabel: 'รับมอบแล้ว',
          proofUrl: w.step2_proof_url ? String(w.step2_proof_url) : undefined,
          proofName: w.step2_proof_name ? String(w.step2_proof_name) : undefined,
          notes: w.step2_mismatch_reason ? `คลาดเคลื่อน: ${w.step2_mismatch_reason}` : `เหรัญญิกรับมอบเงินสดเรียบร้อย`,
          category: 'ฝากเข้าบัญชีเหรัญญิก',
          categoryKey: 'treasurer_deposit',
        });
      }

      // 3. Step 5: Cash Returns
      if (w.step5_remaining_cash && Number(w.step5_remaining_cash) > 0) {
        const dt5 = String(w.step5_event_datetime || w.step5_closed_at || w.created_at);
        history.push({
          id: `hist-ret-${w.id}`,
          date: dt5.slice(0, 10),
          time: dt5.length >= 16 ? dt5.slice(11, 16) : '00:00',
          datetime: dt5,
          workflowNo: String(w.workflow_no),
          workflowId: wfId,
          workflowTitle: String(w.title || ''),
          voucherNo: `RET-${w.workflow_no}`,
          voucherType: 'cash_returned',
          paymentType: 'cash_returned',
          paymentTypeLabel: 'คืนเงินสดคงเหลือ (ปิดรอบ)',
          isActualDisbursement: false,
          payeeName: 'คืนเงินสดเข้ากองทุน (เหรัญญิก)',
          payeeType: 'custodian',
          asnaf: '-',
          assistanceType: 'ส่งคืนเงินสดคงเหลือปิดรอบ',
          currency: 'THB',
          amount: round2(Number(w.step5_remaining_cash)),
          responsiblePerson: String(w.step5_auditor_name || 'ผู้ตรวจสอบ'),
          approverName: String(w.step5_auditor_name || ''),
          sourceFundType: String(w.step1_fund_type || 'zakat'),
          sourceFundName: getFundName(w.step1_fund_type),
          status: 'completed',
          statusLabel: 'ส่งคืนแล้ว',
          proofUrl: w.step5_proof_url ? String(w.step5_proof_url) : undefined,
          proofName: w.step5_proof_name ? String(w.step5_proof_name) : undefined,
          notes: `ส่งคืนเงินสดคงเหลือจากการปิดรอบ ${w.workflow_no}`,
          category: 'คืนเงินสด',
          categoryKey: 'cash_returned',
        });
      }
    }

    // Sort by datetime desc
    history.sort((a, b) => b.datetime.localeCompare(a.datetime));

    // -------------------------------------------------------------------------
    // C. 9 Unified Filters
    // -------------------------------------------------------------------------
    let filtered = history;

    // 1. Payment Type
    if (filters?.paymentType && filters.paymentType !== 'all') {
      if (filters.paymentType === 'actual_disbursements') {
        filtered = filtered.filter((h) => h.isActualDisbursement);
      } else if (filters.paymentType === 'cash_movements') {
        filtered = filtered.filter((h) => !h.isActualDisbursement);
      } else {
        filtered = filtered.filter((h) => h.paymentType === filters.paymentType || h.voucherType === filters.paymentType);
      }
    }

    // 2. Asnaf
    if (filters?.asnaf && filters.asnaf !== 'all') {
      const targetAsnaf = filters.asnaf.toLowerCase();
      filtered = filtered.filter((h) => {
        if (!h.asnaf || h.asnaf === '-') return false;
        return h.asnaf.toLowerCase().includes(targetAsnaf) || (h.asnafLabel && h.asnafLabel.toLowerCase().includes(targetAsnaf));
      });
    }

    // 3. Assistance Type
    if (filters?.assistanceType && filters.assistanceType !== 'all') {
      const aType = filters.assistanceType.toLowerCase();
      filtered = filtered.filter((h) => h.assistanceType && h.assistanceType.toLowerCase().includes(aType));
    }

    // 4. Office Expense Category
    if (filters?.officeCategory && filters.officeCategory !== 'all') {
      const oc = filters.officeCategory.toLowerCase();
      filtered = filtered.filter((h) => h.expenseCategory && h.expenseCategory.toLowerCase().includes(oc));
    }

    // 5. Payee Name / Beneficiary / Vendor
    if (filters?.payee && filters.payee.trim()) {
      const p = filters.payee.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          (h.payeeName && h.payeeName.toLowerCase().includes(p)) ||
          (h.nationalId && h.nationalId.includes(p)) ||
          (h.expenseDetails && h.expenseDetails.toLowerCase().includes(p))
      );
    }

    // 6. Responsible Person / Operator
    if (filters?.responsiblePerson && filters.responsiblePerson.trim()) {
      const rp = filters.responsiblePerson.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          (h.responsiblePerson && h.responsiblePerson.toLowerCase().includes(rp)) ||
          (h.withdrawerName && h.withdrawerName.toLowerCase().includes(rp)) ||
          (h.approverName && h.approverName.toLowerCase().includes(rp))
      );
    }

    // 7. Voucher No
    if (filters?.voucherNo && filters.voucherNo.trim()) {
      const vn = filters.voucherNo.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          (h.voucherNo && h.voucherNo.toLowerCase().includes(vn)) ||
          (h.workflowNo && h.workflowNo.toLowerCase().includes(vn))
      );
    }

    // 8. Status
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'completed_disbursed') {
        filtered = filtered.filter((h) => ['completed', 'disbursed', 'cleared'].includes(h.status));
      } else if (filters.status === 'pending') {
        filtered = filtered.filter((h) => ['pending', 'pending_approval', 'pending_clearance'].includes(h.status));
      } else if (filters.status === 'draft') {
        filtered = filtered.filter((h) => h.status === 'draft');
      } else if (filters.status === 'cancelled') {
        filtered = filtered.filter((h) => h.status === 'cancelled');
      } else {
        filtered = filtered.filter((h) => h.status === filters.status || h.statusLabel === filters.status);
      }
    }

    // 9. Date Range
    if (filters?.startDate) {
      filtered = filtered.filter((h) => h.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter((h) => h.date <= filters.endDate!);
    }

    // General Keyword Search
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          (h.workflowNo && h.workflowNo.toLowerCase().includes(q)) ||
          (h.voucherNo && h.voucherNo.toLowerCase().includes(q)) ||
          (h.payeeName && h.payeeName.toLowerCase().includes(q)) ||
          (h.nationalId && h.nationalId.includes(q)) ||
          (h.responsiblePerson && h.responsiblePerson.toLowerCase().includes(q)) ||
          (h.paymentTypeLabel && h.paymentTypeLabel.toLowerCase().includes(q)) ||
          (h.asnaf && h.asnaf.toLowerCase().includes(q)) ||
          (h.assistanceType && h.assistanceType.toLowerCase().includes(q)) ||
          (h.expenseCategory && h.expenseCategory.toLowerCase().includes(q)) ||
          (h.statusLabel && h.statusLabel.toLowerCase().includes(q)) ||
          (h.notes && h.notes.toLowerCase().includes(q))
      );
    }

    // Legacy Filters
    if (filters?.category && filters.category !== 'all') {
      filtered = filtered.filter((h) => h.category === filters.category || h.categoryKey === filters.category);
    }
    if (filters?.workflowId) {
      filtered = filtered.filter((h) => h.workflowId === filters.workflowId);
    }

    return filtered;
  }

  /**
   * Update or transition cash withdrawal voucher status (draft -> pending -> approved -> disbursed / cancelled)
   */
  static async updateCashFlowWithdrawal(
    withdrawalId: string,
    input: {
      status?: 'draft' | 'pending' | 'pending_approval' | 'approved' | 'disbursed' | 'completed' | 'cancelled';
      amount?: number;
      requestedAmount?: number;
      approvedAmount?: number;
      withdrawalDatetime?: string;
      withdrawerName?: string;
      purpose?: string;
      notes?: string;
      approverName?: string;
      proofUrl?: string;
      proofName?: string;
      proofSize?: number;
      proofType?: string;
      reason?: string;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance', 'executive'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการปรับปรุงใบสำคัญเบิกเงินสด');
    }

    const wRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_withdrawals WHERE id = ?',
      args: [withdrawalId],
    });

    if (wRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลใบสำคัญเบิกเงินสดที่ระบุ');
    }

    const item = wRes.rows[0];
    const wfId = String(item.workflow_id);

    // If cancelling, route through cancelCashFlowWithdrawal
    if (input.status === 'cancelled') {
      return this.cancelCashFlowWithdrawal(withdrawalId, input.reason || input.notes || 'ยกเลิกใบสำคัญ', actor);
    }

    const wfRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_workflows WHERE id = ?',
      args: [wfId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบรอบการเบิกเงินสด');
    const wf = wfRes.rows[0];

    if (wf.overall_status === 'completed') {
      throw new Error('ไม่สามารถแก้ไขใบสำคัญได้: รอบการเบิกเงินสดนี้ถูกปิดรอบสมบูรณ์แล้ว (Locked)');
    }

    const currentStatus = String(item.status);
    const targetStatus = input.status || currentStatus;
    const amount = input.amount !== undefined ? round2(Number(input.amount)) : round2(Number(item.amount));
    const requestedAmt = input.requestedAmount !== undefined ? round2(Number(input.requestedAmount)) : Number(item.requested_amount || amount);
    const approvedAmt = input.approvedAmount !== undefined ? round2(Number(input.approvedAmount)) : Number(item.approved_amount || amount);

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // Transitioning from non-disbursed (draft/pending/approved) to disbursed/completed
    const wasDisbursed = currentStatus === 'disbursed' || currentStatus === 'completed';
    const willBeDisbursed = targetStatus === 'disbursed' || targetStatus === 'completed';

    if (!wasDisbursed && willBeDisbursed) {
      // Calculate current available cash
      const otherWithdrawals = await db.execute({
        sql: "SELECT amount FROM cash_flow_withdrawals WHERE workflow_id = ? AND id != ? AND status IN ('disbursed', 'completed')",
        args: [wfId, withdrawalId],
      });
      const totalOtherDisbursed = otherWithdrawals.rows.reduce((acc, r) => acc + round2(Number(r.amount)), 0);
      const totalReceived = round2(Number(wf.step2_deposit_amount || 0));
      const availableCash = round2(totalReceived - totalOtherDisbursed);

      if (amount > availableCash) {
        throw new Error(
          `ยอดเงินสดคงเหลือในมือเหรัญญิกไม่เพียงพอสำหรับยืนยันการเบิกจริง! (คงเหลือที่เบิกได้ ฿${availableCash.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท แต่ต้องการเบิก ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`
        );
      }
    }

    // Update DB
    await db.execute({
      sql: `UPDATE cash_flow_withdrawals SET
        amount = ?,
        requested_amount = ?,
        approved_amount = ?,
        withdrawal_datetime = COALESCE(?, withdrawal_datetime),
        withdrawer_name = COALESCE(?, withdrawer_name),
        purpose = COALESCE(?, purpose),
        approver_name = COALESCE(?, approver_name),
        notes = COALESCE(?, notes),
        proof_url = COALESCE(?, proof_url),
        proof_name = COALESCE(?, proof_name),
        proof_size = COALESCE(?, proof_size),
        proof_type = COALESCE(?, proof_type),
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        amount,
        requestedAmt,
        approvedAmt,
        input.withdrawalDatetime || null,
        input.withdrawerName?.trim() || null,
        input.purpose?.trim() || null,
        input.approverName?.trim() || null,
        input.notes?.trim() || null,
        input.proofUrl || null,
        input.proofName || null,
        input.proofSize || null,
        input.proofType || null,
        targetStatus,
        withdrawalId,
      ],
    });

    // Update parent workflow step3_withdraw_amount
    const allDisbursed = await db.execute({
      sql: "SELECT amount FROM cash_flow_withdrawals WHERE workflow_id = ? AND status IN ('disbursed', 'completed')",
      args: [wfId],
    });
    const newTotalDisbursed = allDisbursed.rows.reduce((acc, r) => acc + round2(Number(r.amount)), 0);
    await db.execute({
      sql: 'UPDATE cash_flow_workflows SET step3_withdraw_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [newTotalDisbursed, wfId],
    });

    // Audit log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        targetStatus === 'disbursed' ? 'CASH_FLOW_WITHDRAWAL_DISBURSED' : 'CASH_FLOW_WITHDRAWAL_UPDATED',
        'cash_flow_withdrawal',
        withdrawalId,
        `ปรับปรุงใบสำคัญเบิกเงินสด ${item.withdrawal_no}: เปลี่ยนสถานะเป็น "${targetStatus}" จำนวน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท โดย ${actor.name}`,
      ],
    });

    return {
      success: true,
      withdrawalId,
      status: targetStatus,
      amount,
    };
  }

  /**
   * Cancel / Reverse a cash withdrawal item with mandatory reason
   */
  static async cancelCashFlowWithdrawal(
    withdrawalId: string,
    reason: string,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!reason || reason.trim().length < 5) {
      throw new Error('กรุณาระบุเหตุผลในการยกเลิกรายการเบิกเงินสดอย่างชัดเจน (อย่างน้อย 5 ตัวอักษร)');
    }

    const wRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_withdrawals WHERE id = ?',
      args: [withdrawalId],
    });

    if (wRes.rows.length === 0) {
      throw new Error('ไม่พบรายการเบิกเงินสดที่ต้องการยกเลิก');
    }

    const item = wRes.rows[0];

    const wfCheck = await db.execute({
      sql: 'SELECT overall_status FROM cash_flow_workflows WHERE id = ?',
      args: [item.workflow_id],
    });
    if (wfCheck.rows.length > 0 && wfCheck.rows[0].overall_status === 'completed') {
      throw new Error('ไม่สามารถยกเลิกรายการได้: รอบการเบิกเงินสดนี้ถูกปิดรอบสมบูรณ์แล้ว (Locked)');
    }

    if (String(item.status) === 'cancelled') {
      throw new Error('รายการเบิกเงินสดนี้ถูกยกเลิกไปแล้ว');
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    await db.execute({
      sql: `UPDATE cash_flow_withdrawals 
            SET status = 'cancelled', notes = COALESCE(notes, '') || ' [ยกเลิกเมื่อ ' || ? || ' โดย ' || ? || ': ' || ? || ']', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [timestampNow, actor.name, reason.trim(), withdrawalId],
    });

    // Recalculate remaining disbursed withdrawals for parent workflow
    const remainingRes = await db.execute({
      sql: "SELECT amount FROM cash_flow_withdrawals WHERE workflow_id = ? AND status IN ('disbursed', 'completed')",
      args: [item.workflow_id],
    });

    const newTotal = remainingRes.rows.reduce((acc, r) => acc + round2(Number(r.amount)), 0);
    await db.execute({
      sql: 'UPDATE cash_flow_workflows SET step3_withdraw_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [newTotal, item.workflow_id],
    });

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'CASH_FLOW_WITHDRAWAL_CANCELLED',
        'cash_flow_workflow',
        String(item.workflow_id),
        `ยกเลิกรายการเบิกเงินสด ${item.withdrawal_no} จำนวน ฿${round2(Number(item.amount)).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท คืนยอดเงินเข้าบัญชีเหรัญญิก (เหตุผล: ${reason.trim()})`,
      ],
    });

    return { success: true };
  }

  /**
   * Backwards-compatible advanceWorkflowToStep3 (delegates to addCashFlowWithdrawal)
   */
  static async advanceWorkflowToStep3(
    workflowId: string,
    input: { withdrawAmount: number; purpose: string; targetAsnaf: string; targetFundId: string; approverId: string; approverName: string; proofUrl?: string; eventDatetime?: string },
    actor: ActorContext
  ) {
    return this.addCashFlowWithdrawal(
      {
        workflowId,
        amount: input.withdrawAmount,
        purpose: input.purpose,
        targetAsnaf: input.targetAsnaf,
        targetFundId: input.targetFundId,
        approverId: input.approverId,
        approverName: input.approverName,
        proofUrl: input.proofUrl,
        withdrawalDatetime: input.eventDatetime,
      },
      actor
    );
  }

  static async advanceWorkflowToStep4(
    workflowId: string,
    input: { allocatedAmount: number; distributionSummary: string; proofUrl?: string; proofName?: string; proofSize?: number; proofType?: string; eventDatetime?: string },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const wfRes = await db.execute({
      sql: 'SELECT overall_status FROM cash_flow_workflows WHERE id = ?',
      args: [workflowId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรอบการเบิกเงินสด');
    if (wfRes.rows[0].overall_status === 'completed') {
      throw new Error('ไม่สามารถดำเนินการได้: รอบการเบิกเงินสดนี้ถูกปิดรอบสมบูรณ์แล้ว (Locked)');
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const eventDt = input.eventDatetime || timestampNow;
    const allocAmt = round2(input.allocatedAmount);

    await db.execute({
      sql: `UPDATE cash_flow_workflows 
            SET step4_allocated_amount = ?, step4_distribution_summary = ?, step4_date = ?, step4_event_datetime = ?, step4_proof_url = ?, step4_proof_name = ?, step4_proof_size = ?, step4_proof_type = ?, step4_status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        allocAmt, 
        input.distributionSummary, 
        timestampNow, 
        eventDt, 
        input.proofUrl || '', 
        input.proofName || '', 
        input.proofSize || 0, 
        input.proofType || '', 
        workflowId
      ],
    });

    if (input.proofUrl) {
      await db.execute({
        sql: `INSERT INTO workflow_attachments (
          id, workflow_id, step_number, file_name, file_url, file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
        ) VALUES (?, ?, 4, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `att-${Date.now()}-4`,
          workflowId,
          input.proofName || 'หลักฐานการจัดสรรส่งมอบความช่วยเหลือ.pdf',
          input.proofUrl,
          input.proofSize || 102400,
          input.proofType || 'application/pdf',
          actor.id,
          actor.name,
          timestampNow,
          `หลักฐานการจัดสรรส่งมอบความช่วยเหลือ (${input.distributionSummary})`,
        ],
      });
    }

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'CASH_FLOW_STEP4_COMPLETED',
        'cash_flow_workflow',
        workflowId,
        `ขั้นตอนที่ 4: จัดสรรเงินช่วยเหลือแล้ว ฿${allocAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (${input.distributionSummary})`,
      ],
    });

    return { success: true };
  }

  /**
   * TASK 5: Audit Summary & Reconciliation Engine
   * Aggregates real transaction figures across all 5 steps, checks discrepancies, and validates closing readiness.
   */
  static async getWorkflowAuditSummary(workflowId: string): Promise<WorkflowAuditSummary> {
    await initDb();
    const db = getDb();

    const wfRes = await db.execute({
      sql: `SELECT w.*, b.account_name as bank_account_name 
            FROM cash_flow_workflows w 
            LEFT JOIN bank_accounts b ON b.id = w.step1_bank_account_id 
            WHERE w.id = ?`,
      args: [workflowId],
    });

    if (wfRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลรอบการเบิกเงินสด');
    }
    const wf = wfRes.rows[0];

    // Fetch child withdrawals
    const withsRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_withdrawals WHERE workflow_id = ? ORDER BY withdrawal_datetime ASC, created_at ASC',
      args: [workflowId],
    });
    const allWithdrawals = withsRes.rows;
    const activeWithdrawals = allWithdrawals.filter((w) => String(w.status) !== 'cancelled');

    // Fetch disbursement items
    const itemsRes = await db.execute({
      sql: "SELECT * FROM cash_flow_disbursement_items WHERE workflow_id = ? AND status != 'cancelled'",
      args: [workflowId],
    });
    const allDisbItems = itemsRes.rows;

    // 1. ยอดถอนจากธนาคาร (Step 1)
    const bankWithdrawAmount = round2(Number(wf.step1_withdraw_amount || 0));

    // 2. ยอดส่งมอบ (Step 2 handover)
    const handoverAmount = round2(
      Number(wf.step2_handover_amount !== null && wf.step2_handover_amount !== undefined 
        ? wf.step2_handover_amount 
        : wf.step1_withdraw_amount)
    );

    // 3. ยอดรับจริงโดยเหรัญญิก (Step 2 actual deposit)
    const treasurerReceivedAmount = round2(Number(wf.step2_deposit_amount || 0));

    // 4. ยอดเบิกเงินสดจริง (Step 3 actual cash disbursed by Treasurer)
    const disbursedVouchers = activeWithdrawals.filter(
      (w) => String(w.status) === 'disbursed' || String(w.status) === 'completed'
    );
    const actualWithdrawnAmount = round2(
      disbursedVouchers.reduce((acc, w) => acc + round2(Number(w.amount)), 0)
    );

    // 5. ยอดจ่ายช่วยเหลือที่ยืนยันแล้ว (Step 4 Aid Disbursements)
    const confirmedAidVouchers = activeWithdrawals.filter(
      (w) => w.voucher_type === 'aid_disbursement' && (w.status === 'disbursed' || w.status === 'completed')
    );
    let confirmedAidAmount = 0;
    for (const v of confirmedAidVouchers) {
      const vItems = allDisbItems.filter((i) => String(i.withdrawal_id) === String(v.id));
      if (vItems.length > 0) {
        confirmedAidAmount += vItems.reduce((acc, i) => acc + round2(Number(i.this_disbursement_amount)), 0);
      } else {
        confirmedAidAmount += round2(Number(v.amount));
      }
    }
    confirmedAidAmount = round2(confirmedAidAmount);

    // 6. ยอดค่าใช้จ่ายอื่นที่เกี่ยวข้อง (Step 4 Office / Petty Cash Cleared)
    const clearedPettyVouchers = activeWithdrawals.filter(
      (w) => w.voucher_type === 'office_expense' && (w.clearance_status === 'cleared' || w.clearance_status === 'over_spent' || w.clearance_status === 'overspent_approved')
    );
    const confirmedOtherExpenseAmount = round2(
      clearedPettyVouchers.reduce((acc, w) => acc + round2(Number(w.clearance_spent_amount || 0)), 0)
    );
    const totalPettyReturnedAmount = round2(
      clearedPettyVouchers.reduce((acc, w) => acc + round2(Number(w.clearance_returned_amount || 0)), 0)
    );

    // 7. ยอดเงินสดคงเหลือ (เหรัญญิก)
    // Formula: actualReceived - actualWithdrawn + totalPettyReturned
    const remainingCashAmount = Math.max(0, round2(treasurerReceivedAmount - actualWithdrawnAmount + totalPettyReturnedAmount));

    // 8. ยอดที่ยังไม่ระบุการใช้จ่าย (Unallocated / pending clearance)
    // Cash issued in Step 3 that has NOT been confirmed spent on aid, cleared on expenses, or returned as cash
    const totalAccountedFor = round2(confirmedAidAmount + confirmedOtherExpenseAmount + totalPettyReturnedAmount);
    const unallocatedAmount = Math.max(0, round2(actualWithdrawnAmount - totalAccountedFor));

    // 9. จำนวนใบสำคัญ (Voucher count)
    const voucherCount = activeWithdrawals.length;

    // 10. จำนวนเคสช่วยเหลือ (Assistance cases count)
    const distinctBeneficiaryIds = new Set(allDisbItems.map((i) => String(i.beneficiary_id)));
    const assistanceCaseCount = distinctBeneficiaryIds.size || allDisbItems.length;

    // 11. จำนวนรายการรอตรวจสอบ (Pending items count)
    const pendingVouchers = activeWithdrawals.filter((w) => ['draft', 'pending', 'pending_approval'].includes(String(w.status)));
    const unclearedPetty = activeWithdrawals.filter((w) => w.voucher_type === 'office_expense' && w.clearance_status === 'pending_clearance');
    const draftItems = allDisbItems.filter((i) => i.status === 'draft');
    const pendingItemCount = pendingVouchers.length + unclearedPetty.length + draftItems.length;

    // 12. จำนวนเอกสารที่ยังขาด (Missing proofs count)
    let missingProofCount = 0;
    if (!wf.step1_proof_url) missingProofCount++;
    if (!wf.step2_proof_url) missingProofCount++;
    for (const v of disbursedVouchers) {
      if (v.voucher_type === 'aid_disbursement' && !v.proof_url) missingProofCount++;
      if (v.voucher_type === 'office_expense' && (v.clearance_status === 'cleared' || v.clearance_status === 'overspent_approved') && !v.clearance_proof_url && !v.proof_url) missingProofCount++;
    }

    // Discrepancies check (Rule 1 & Rule 5)
    const discrepancies: WorkflowAuditSummary['discrepancies'] = [];
    const diffStep1Step2 = round2(bankWithdrawAmount - treasurerReceivedAmount);
    if (diffStep1Step2 !== 0) {
      const hasApprovedReason = Boolean(
        wf.step2_mismatch_reason && (wf.step2_mismatch_approved_by_id || wf.step2_mismatch_approved_by_name)
      );
      discrepancies.push({
        stage: 'ขั้นตอนที่ 1 -> ขั้นตอนที่ 2 (ถอนจากธนาคาร -> รับเข้าเหรัญญิก)',
        description: `ยอดถอนจากธนาคาร (฿${bankWithdrawAmount.toLocaleString()}) ไม่ตรงกับยอดรับเข้าเหรัญญิก (฿${treasurerReceivedAmount.toLocaleString()})`,
        expectedAmount: bankWithdrawAmount,
        actualAmount: treasurerReceivedAmount,
        difference: diffStep1Step2,
        reason: wf.step2_mismatch_reason ? String(wf.step2_mismatch_reason) : undefined,
        isApproved: hasApprovedReason,
      });
    }

    // Validation rules evaluation (Rule 1 to 6)
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Step 1 and Step 2 status
    if (wf.step1_status !== 'completed') {
      validationErrors.push(`ขั้นตอนที่ 1 (ถอนเงินจากธนาคาร) ยังไม่เสร็จสิ้น (สถานะ: ${wf.step1_status})`);
    }
    if (wf.step2_status !== 'received' && wf.step2_status !== 'completed') {
      validationErrors.push(`ขั้นตอนที่ 2 (ฝากเข้าบัญชีเหรัญญิก) ยังไม่เสร็จสิ้น (สถานะ: ${wf.step2_status})`);
    }

    // Pending vouchers
    if (pendingVouchers.length > 0) {
      validationErrors.push(
        `มีใบสำคัญที่ยังค้างอยู่ในสถานะร่างหรือรออนุมัติ ${pendingVouchers.length} ฉบับ (${pendingVouchers.map((v) => v.withdrawal_no).join(', ')})`
      );
    }

    // Uncleared petty cash
    if (unclearedPetty.length > 0) {
      validationErrors.push(
        `มีเงินสำรองจ่ายสำนักงานที่ยังไม่ได้เคลียร์ใบเสร็จ ${unclearedPetty.length} รายการ (${unclearedPetty.map((v) => v.withdrawal_no).join(', ')})`
      );
    }

    // Unallocated cash
    if (unallocatedAmount > 0) {
      validationErrors.push(
        `มียอดเงินเบิกสดที่ยังไม่ระบุการใช้จ่ายหรือยังไม่ได้รับการยืนยัน ฿${unallocatedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`
      );
    }

    // Unapproved discrepancies
    for (const d of discrepancies) {
      if (!d.isApproved) {
        validationErrors.push(
          `พบผลต่างยอดเงินใน "${d.stage}" จำนวน ฿${Math.abs(d.difference).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ที่ยังไม่มีการระบุเหตุผลและอนุมัติ`
        );
      }
    }

    // Missing proofs warning
    if (missingProofCount > 0) {
      validationWarnings.push(
        `มีเอกสารหลักฐานที่ยังไม่ได้แนบ ${missingProofCount} รายการ (สลิปธนาคาร, ใบรับเงินเหรัญญิก, หรือใบสำคัญจ่าย)`
      );
    }

    const isClosed = wf.overall_status === 'completed';
    const canClose = !isClosed && validationErrors.length === 0;

    return {
      workflowId,
      workflowNo: String(wf.workflow_no),
      title: String(wf.title),
      overallStatus: String(wf.overall_status) as any,
      bankWithdrawAmount,
      handoverAmount,
      treasurerReceivedAmount,
      actualWithdrawnAmount,
      confirmedAidAmount,
      confirmedOtherExpenseAmount,
      remainingCashAmount,
      unallocatedAmount,
      voucherCount,
      assistanceCaseCount,
      pendingItemCount,
      missingProofCount,
      totalPettyReturnedAmount,
      discrepancies,
      validationErrors,
      validationWarnings,
      canClose,
      isClosed,
      closedAt: wf.step5_closed_at ? String(wf.step5_closed_at) : undefined,
      closedById: wf.step5_auditor_id ? String(wf.step5_auditor_id) : undefined,
      closedByName: wf.step5_auditor_name ? String(wf.step5_auditor_name) : undefined,
      closureNotes: wf.step5_notes ? String(wf.step5_notes) : undefined,
      closureProofUrl: wf.step5_proof_url ? String(wf.step5_proof_url) : undefined,
    };
  }

  /**
   * TASK 5: Step 5 Close Cash Flow Workflow
   * Enforces rules 1-9: full verification, lock workflow, record closer info, audit log.
   */
  static async advanceWorkflowToStep5(
    workflowId: string,
    input: {
      reconciledAmount?: number;
      remainingCash?: number;
      notes?: string;
      proofUrl?: string;
      proofName?: string;
      proofSize?: number;
      proofType?: string;
      eventDatetime?: string;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    // Rule 7: Role check - Super Admin, Executive, Finance only
    if (!['super_admin', 'executive', 'finance'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: เฉพาะผู้มีสิทธิ์ (Super Admin, Executive, Finance) เท่านั้นที่สามารถตรวจสอบและปิดรอบการเบิกเงินสดได้');
    }

    // Verify parent workflow exists
    const wfRes = await db.execute({
      sql: 'SELECT * FROM cash_flow_workflows WHERE id = ?',
      args: [workflowId],
    });

    if (wfRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลรอบการเบิกเงินสด');
    }

    const wf = wfRes.rows[0];

    // Rule 9: Cannot re-close or modify closed workflow
    if (wf.overall_status === 'completed') {
      throw new Error('รอบการเบิกเงินสดนี้ถูกปิดรอบสมบูรณ์แล้ว ไม่สามารถปิดซ้ำได้');
    }

    // Run full audit summary
    const summary = await this.getWorkflowAuditSummary(workflowId);

    // Rule 6: Block closure if validation errors exist
    if (!summary.canClose && summary.validationErrors.length > 0) {
      throw new Error(`ไม่สามารถปิดรอบได้เนื่องจากมีข้อผิดพลาดสำคัญ:\n- ${summary.validationErrors.join('\n- ')}`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const eventDt = input.eventDatetime || timestampNow;
    const recAmt = input.reconciledAmount !== undefined ? round2(input.reconciledAmount) : round2(summary.actualWithdrawnAmount);
    const remCash = input.remainingCash !== undefined ? round2(input.remainingCash) : round2(summary.remainingCashAmount);

    if (remCash < 0) {
      throw new Error(`ยอดเงินสดคงเหลือส่งคืนต้องไม่ติดลบ (คำนวณได้: ฿${remCash.toLocaleString()} บาท)`);
    }

    // Rule 8: Record closer, datetime, notes, and metrics snapshot
    await db.execute({
      sql: `UPDATE cash_flow_workflows 
            SET step5_reconciled_amount = ?, 
                step5_remaining_cash = ?, 
                step5_auditor_id = ?, 
                step5_auditor_name = ?, 
                step5_closed_at = ?, 
                step5_event_datetime = ?, 
                step5_proof_url = ?, 
                step5_proof_name = ?, 
                step5_proof_size = ?, 
                step5_proof_type = ?, 
                step5_notes = ?, 
                step5_status = 'completed',
                step5_unallocated_amount = ?,
                step5_confirmed_aid_amount = ?,
                step5_confirmed_other_expense_amount = ?,
                step5_voucher_count = ?,
                step5_assistance_case_count = ?,
                step5_pending_items_count = ?,
                step5_missing_proof_count = ?,
                overall_status = 'completed', 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        recAmt, 
        remCash, 
        actor.id, 
        actor.name, 
        timestampNow, 
        eventDt, 
        input.proofUrl || '', 
        input.proofName || '', 
        input.proofSize || 0, 
        input.proofType || '', 
        input.notes || '', 
        summary.unallocatedAmount,
        summary.confirmedAidAmount,
        summary.confirmedOtherExpenseAmount,
        summary.voucherCount,
        summary.assistanceCaseCount,
        summary.pendingItemCount,
        summary.missingProofCount,
        workflowId
      ],
    });

    if (input.proofUrl) {
      await db.execute({
        sql: `INSERT INTO workflow_attachments (
          id, workflow_id, step_number, file_name, file_url, file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
        ) VALUES (?, ?, 5, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `att-${Date.now()}-5`,
          workflowId,
          input.proofName || 'เอกสารกระทบยอดและปิดรอบการเบิก.pdf',
          input.proofUrl,
          input.proofSize || 102400,
          input.proofType || 'application/pdf',
          actor.id,
          actor.name,
          timestampNow,
          `หลักฐานการตรวจสอบและปิดรอบการเบิกเงินสด (${wf.workflow_no})`,
        ],
      });
    }

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'CASH_FLOW_STEP5_CLOSED',
        'cash_flow_workflow',
        workflowId,
        `ขั้นตอนที่ 5: ตรวจสอบและปิดรอบการเบิกเงินสด ${wf.workflow_no} สำเร็จ: ยอดเบิกจริง ฿${recAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท จ่ายช่วยเหลือ ฿${summary.confirmedAidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ค่าใช้จ่ายอื่น ฿${summary.confirmedOtherExpenseAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท เงินสดคงเหลือส่งคืน ฿${remCash.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (ตรวจสอบและปิดรอบโดย ${actor.name})`,
      ],
    });

    return { success: true, workflowId, summary };
  }

  static async addWorkflowAttachment(
    input: {
      workflowId: string;
      withdrawalId?: string;
      stepNumber: number;
      fileName: string;
      fileUrl: string;
      fileSize?: number;
      mimeType?: string;
      description?: string;
    },
    actor: { id: string; name: string; role?: string }
  ): Promise<{ success: boolean; attachmentId: string }> {
    await initDb();
    const db = getDb();
    const attachmentId = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestampNow = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO workflow_attachments (
        id, workflow_id, withdrawal_id, step_number, file_name, file_url, file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        attachmentId,
        input.workflowId,
        input.withdrawalId || null,
        input.stepNumber,
        input.fileName,
        input.fileUrl,
        input.fileSize || 0,
        input.mimeType || 'application/octet-stream',
        actor.id,
        actor.name,
        timestampNow,
        input.description || `เอกสารแนบขั้นตอนที่ ${input.stepNumber}`,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role || 'Staff',
        'CASH_FLOW_ATTACHMENT_UPLOADED',
        'workflow_attachment',
        attachmentId,
        `แนบเอกสารเพิ่มเติม "${input.fileName}" ในขั้นตอนที่ ${input.stepNumber} (รอบการเบิก: ${input.workflowId}) โดย ${actor.name}`,
      ],
    });

    return { success: true, attachmentId };
  }

  // =========================================================================
  // 10. Asnaf Allocations (8 Asnafs, 100% total)
  // =========================================================================

  static async getAsnafAllocations(fiscalYear: string = '2569'): Promise<AsnafAllocation[]> {
    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: 'SELECT * FROM asnaf_allocations WHERE fiscal_year = ? ORDER BY percentage DESC',
      args: [fiscalYear],
    });

    // Calculate dynamic disbursed amount per Asnaf from verified actual aid disbursements
    const verifiedExpenses = await this.calculateVerifiedAidExpenses({ zakatYear: fiscalYear });
    const disbursedMap = new Map<string, number>();
    for (const b of verifiedExpenses.breakdownByAsnaf) {
      disbursedMap.set(b.asnafCode, b.disbursedAmount);
    }

    // Get total zakat pool
    const poolRes = await db.execute(`
      SELECT SUM(total_received) as pool FROM fund_accounts WHERE category = 'zakat'
    `);
    const totalZakatPool = Number(poolRes.rows[0]?.pool) || 0;

    return res.rows.map((r) => {
      const code = String(r.asnaf_code);
      const pct = Number(r.percentage);
      const targetAmount = round2((totalZakatPool * pct) / 100);
      const disbursedAmount = round2(disbursedMap.get(code) ?? (Number(r.disbursed_amount) || 0));
      const allocatedAmount = round2(Number(r.allocated_amount) || targetAmount);
      const remainingAmount = round2(Math.max(0, targetAmount - disbursedAmount));

      return {
        id: String(r.id),
        fiscalYear: String(r.fiscal_year),
        asnafCode: code,
        asnafName: String(r.asnaf_name),
        percentage: pct,
        targetAmount,
        allocatedAmount,
        disbursedAmount,
        remainingAmount,
        policyRef: r.policy_ref ? String(r.policy_ref) : undefined,
        updatedById: r.updated_by_id ? String(r.updated_by_id) : undefined,
        updatedByName: r.updated_by_name ? String(r.updated_by_name) : undefined,
        updatedAt: String(r.updated_at),
      };
    });
  }

  static async updateAsnafAllocations(
    allocations: { asnafCode: string; percentage: number }[],
    fiscalYear: string = '2569',
    policyRef: string,
    reason: string,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'executive', 'approver'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการปรับเปลี่ยนสัดส่วนการจัดสรรซะกาตตามอัสนัฟ');
    }

    // Validate 100% sum
    const totalPct = allocations.reduce((acc, a) => acc + a.percentage, 0);
    if (Math.abs(totalPct - 100.0) > 0.001) {
      throw new Error(`ผลรวมเปอร์เซ็นต์ต้องเท่ากับ 100% พอดี (ปัจจุบันได้ ${totalPct.toFixed(2)}%)`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // Update each allocation
    for (const item of allocations) {
      await db.execute({
        sql: `UPDATE asnaf_allocations 
              SET percentage = ?, policy_ref = ?, updated_by_id = ?, updated_by_name = ?, updated_at = CURRENT_TIMESTAMP
              WHERE fiscal_year = ? AND asnaf_code = ?`,
        args: [item.percentage, policyRef, actor.id, actor.name, fiscalYear, item.asnafCode],
      });
    }

    // Save history record
    await db.execute({
      sql: `INSERT INTO asnaf_allocation_history (
        id, fiscal_year, proportions_json, changed_by_id, changed_by_name, policy_ref, reason, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `aah-${Date.now()}`,
        fiscalYear,
        JSON.stringify(allocations),
        actor.id,
        actor.name,
        policyRef,
        reason,
        timestampNow,
      ],
    });

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'ASNAF_PROPORTIONS_UPDATED',
        'asnaf_allocation',
        fiscalYear,
        `ปรับปรุงสัดส่วนจัดสรร 8 อัสนัฟ ประจำปี ${fiscalYear} ตามนโยบาย: "${policyRef}" เหตุผล: ${reason}`,
      ],
    });

    return { success: true };
  }

  static async getAsnafAllocationHistory(fiscalYear: string = '2569') {
    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: 'SELECT * FROM asnaf_allocation_history WHERE fiscal_year = ? ORDER BY created_at DESC',
      args: [fiscalYear],
    });

    return res.rows.map((r) => ({
      id: String(r.id),
      fiscalYear: String(r.fiscal_year),
      proportions: JSON.parse(String(r.proportions_json || '[]')),
      changedById: String(r.changed_by_id),
      changedByName: String(r.changed_by_name),
      policyRef: String(r.policy_ref),
      reason: String(r.reason),
      timestamp: String(r.timestamp),
      createdAt: String(r.created_at),
    }));
  }

  // =========================================================================
  // 11. Faqir-Miskin Sub-Fund Allocations (5 Sub-funds, Exact Penny Allocation)
  // =========================================================================

  static async getFaqirMiskinSubFunds(fiscalYear: string = '2569'): Promise<FaqirMiskinSubFund[]> {
    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: 'SELECT * FROM faqir_miskin_sub_funds WHERE fiscal_year = ? ORDER BY percentage DESC',
      args: [fiscalYear],
    });

    // Calculate Faqir-Miskin allocated pool amount
    const poolRes = await db.execute(`
      SELECT total_received FROM fund_accounts WHERE id = 'fund-1'
    `);
    const totalFaqirMiskinPool = Number(poolRes.rows[0]?.total_received) || 0;

    // Use Penny Allocation Algorithm to distribute pool without rounding errors
    const breakdown = this.calculatePennyAllocation(
      totalFaqirMiskinPool,
      res.rows.map((r) => ({ code: String(r.code), pct: Number(r.percentage) }))
    );

    return res.rows.map((r) => {
      const code = String(r.code);
      const targetAmount = breakdown.get(code) || 0;
      const allocatedAmount = targetAmount;
      const disbursedAmount = round2(Number(r.disbursed_amount) || 0);
      const remainingAmount = round2(Math.max(0, targetAmount - disbursedAmount));

      return {
        id: String(r.id),
        fiscalYear: String(r.fiscal_year),
        code,
        name: String(r.name),
        percentage: Number(r.percentage),
        targetAmount,
        allocatedAmount,
        disbursedAmount,
        remainingAmount,
        isActive: Boolean(r.is_active),
        updatedById: r.updated_by_id ? String(r.updated_by_id) : undefined,
        updatedByName: r.updated_by_name ? String(r.updated_by_name) : undefined,
        updatedAt: String(r.updated_at),
      };
    });
  }

  /**
   * Exact Penny Allocation Algorithm
   * Ensures sum(subFunds) === poolAmount to exact Satang (Zero Floating Point Loss)
   * Example: 1,438,311.34 THB distributes exactly:
   * 15% -> 215,746.70
   * 20% -> 287,662.27
   * 20% -> 287,662.27
   * 35% -> 503,408.97
   * 10% -> 143,831.13
   * Total = 1,438,311.34 THB (100% exact match)
   */
  static calculatePennyAllocation(poolAmount: number, items: { code: string; pct: number }[]): Map<string, number> {
    const totalSatang = toSatang(poolAmount);
    const result = new Map<string, number>();

    const intermediate: { code: string; satang: number; remainder: number }[] = [];
    let allocatedSatangSum = 0;

    for (const item of items) {
      const exactSatang = (totalSatang * item.pct) / 100;
      const baseSatang = Math.floor(exactSatang);
      const remainder = exactSatang - baseSatang;
      intermediate.push({ code: item.code, satang: baseSatang, remainder });
      allocatedSatangSum += baseSatang;
    }

    // Distribute remaining satangs to items with largest remainder
    let missingSatang = totalSatang - allocatedSatangSum;
    intermediate.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < missingSatang; i++) {
      intermediate[i % intermediate.length].satang += 1;
    }

    for (const entry of intermediate) {
      result.set(entry.code, fromSatang(entry.satang));
    }

    return result;
  }

  static async updateFaqirMiskinSubFunds(
    subFunds: { code: string; percentage: number }[],
    fiscalYear: string = '2569',
    policyRef: string,
    reason: string,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'executive', 'approver'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการปรับสัดส่วนกองทุนย่อยฟากีร–มิสกิน');
    }

    const totalPct = subFunds.reduce((acc, sf) => acc + sf.percentage, 0);
    if (Math.abs(totalPct - 100.0) > 0.001) {
      throw new Error(`ผลรวมเปอร์เซ็นต์ต้องเท่ากับ 100% พอดี (ปัจจุบันได้ ${totalPct.toFixed(2)}%)`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    for (const item of subFunds) {
      await db.execute({
        sql: `UPDATE faqir_miskin_sub_funds 
              SET percentage = ?, updated_by_id = ?, updated_by_name = ?, updated_at = CURRENT_TIMESTAMP
              WHERE fiscal_year = ? AND code = ?`,
        args: [item.percentage, actor.id, actor.name, fiscalYear, item.code],
      });
    }

    await db.execute({
      sql: `INSERT INTO faqir_miskin_history (
        id, fiscal_year, proportions_json, changed_by_id, changed_by_name, policy_ref, reason, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `fmh-${Date.now()}`,
        fiscalYear,
        JSON.stringify(subFunds),
        actor.id,
        actor.name,
        policyRef,
        reason,
        timestampNow,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'FAQIR_MISKIN_PROPORTIONS_UPDATED',
        'faqir_miskin_sub_funds',
        fiscalYear,
        `ปรับปรุงสัดส่วนกองทุนย่อยฟากีร–มิสกิน ปี ${fiscalYear} นโยบาย: ${policyRef} เหตุผล: ${reason}`,
      ],
    });

    return { success: true };
  }

  static async getFaqirMiskinHistory(fiscalYear: string = '2569') {
    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: 'SELECT * FROM faqir_miskin_history WHERE fiscal_year = ? ORDER BY created_at DESC',
      args: [fiscalYear],
    });

    return res.rows.map((r) => ({
      id: String(r.id),
      fiscalYear: String(r.fiscal_year),
      proportions: JSON.parse(String(r.proportions_json || '[]')),
      changedById: String(r.changed_by_id),
      changedByName: String(r.changed_by_name),
      policyRef: String(r.policy_ref),
      reason: String(r.reason),
      timestamp: String(r.timestamp),
      createdAt: String(r.created_at),
    }));
  }

  // =========================================================================
  // 12. Administrative Expense Categories & Clearance Items (TASK 6)
  // =========================================================================

  static async getAdminExpenseCategories(includeInactive = false): Promise<AdminExpenseCategory[]> {
    await initDb();
    const db = getDb();

    const sql = includeInactive
      ? `SELECT * FROM admin_expense_categories ORDER BY order_index ASC`
      : `SELECT * FROM admin_expense_categories WHERE is_active = 1 ORDER BY order_index ASC`;

    const res = await db.execute(sql);

    return res.rows.map((r) => ({
      id: String(r.id),
      code: String(r.code),
      name: String(r.name),
      groupName: String(r.group_name),
      budgetLimit: round2(Number(r.budget_limit) || 0),
      isActive: Boolean(r.is_active),
      orderIndex: Number(r.order_index) || 0,
    }));
  }

  static async createAdminExpenseCategory(
    input: { code: string; name: string; groupName?: string; expenseGroup?: string; budgetLimit?: number; orderIndex?: number; displayOrder?: number },
    actor: ActorContext
  ): Promise<AdminExpenseCategory> {
    await initDb();
    const db = getDb();

    const allowedRoles = ['super_admin', 'executive', 'finance', 'admin'];
    if (!allowedRoles.includes(actor.role || '')) {
      throw new Error('ไม่อนุญาต: เฉพาะผู้ดูแลที่มีสิทธิ์ (Super Admin, Executive, Finance) เท่านั้นที่สามารถเพิ่มหมวดค่าใช้จ่ายได้');
    }

    const code = input.code.trim().toUpperCase().replace(/\s+/g, '_');
    const name = input.name.trim();
    if (!code || !name) throw new Error('กรุณาระบุรหัสและชื่อหมวดค่าใช้จ่าย');

    const exist = await db.execute({
      sql: 'SELECT id FROM admin_expense_categories WHERE code = ? OR name = ?',
      args: [code, name]
    });
    if (exist.rows.length > 0) {
      throw new Error(`หมวดค่าใช้จ่ายรหัส "${code}" หรือชื่อ "${name}" มีอยู่ในระบบแล้ว`);
    }

    const id = `aec-${Date.now()}`;
    const groupName = input.groupName?.trim() || input.expenseGroup?.trim() || 'ทั่วไป';
    const limit = input.budgetLimit ? round2(Number(input.budgetLimit)) : 0;
    const orderIndex = input.orderIndex !== undefined ? Number(input.orderIndex) : (input.displayOrder !== undefined ? Number(input.displayOrder) : 99);

    await db.execute({
      sql: `INSERT INTO admin_expense_categories (id, code, name, group_name, budget_limit, order_index, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)`,
      args: [id, code, name, groupName, limit, orderIndex]
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        new Date().toISOString(),
        actor.id,
        actor.name,
        actor.role,
        'ADMIN_CATEGORY_CREATED',
        'admin_expense_category',
        id,
        `เพิ่มหมวดค่าใช้จ่ายใหม่: ${name} (${code})`
      ]
    });

    return {
      id,
      code,
      name,
      groupName,
      budgetLimit: limit,
      isActive: true,
      orderIndex
    };
  }

  static async updateAdminExpenseCategory(
    id: string,
    input: { name?: string; groupName?: string; budgetLimit?: number; orderIndex?: number; isActive?: boolean },
    actor: ActorContext
  ): Promise<AdminExpenseCategory> {
    await initDb();
    const db = getDb();

    const allowedRoles = ['super_admin', 'executive', 'finance', 'admin'];
    if (!allowedRoles.includes(actor.role || '')) {
      throw new Error('ไม่อนุญาต: เฉพาะผู้ดูแลที่มีสิทธิ์ (Super Admin, Executive, Finance) เท่านั้นที่สามารถแก้ไขหมวดค่าใช้จ่ายได้');
    }

    const exist = await db.execute({
      sql: 'SELECT * FROM admin_expense_categories WHERE id = ?',
      args: [id]
    });
    if (exist.rows.length === 0) throw new Error('ไม่พบหมวดค่าใช้จ่ายที่ต้องการแก้ไข');

    const current = exist.rows[0];
    const name = input.name !== undefined ? input.name.trim() : String(current.name);
    const groupName = input.groupName !== undefined ? input.groupName.trim() : String(current.group_name);
    const budgetLimit = input.budgetLimit !== undefined ? round2(Number(input.budgetLimit)) : Number(current.budget_limit);
    const orderIndex = input.orderIndex !== undefined ? Number(input.orderIndex) : Number(current.order_index);
    const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : Number(current.is_active);

    await db.execute({
      sql: `UPDATE admin_expense_categories 
            SET name = ?, group_name = ?, budget_limit = ?, order_index = ?, is_active = ?
            WHERE id = ?`,
      args: [name, groupName, budgetLimit, orderIndex, isActive, id]
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        new Date().toISOString(),
        actor.id,
        actor.name,
        actor.role,
        'ADMIN_CATEGORY_UPDATED',
        'admin_expense_category',
        id,
        `แก้ไขหมวดค่าใช้จ่าย: ${name} (สถานะ: ${isActive ? 'ใช้งาน' : 'ปิดใช้งาน'})`
      ]
    });

    return {
      id,
      code: String(current.code),
      name,
      groupName,
      budgetLimit,
      isActive: Boolean(isActive),
      orderIndex
    };
  }

  static async toggleAdminExpenseCategoryStatus(
    id: string,
    isActive: boolean,
    actor: ActorContext
  ): Promise<AdminExpenseCategory> {
    return await this.updateAdminExpenseCategory(id, { isActive }, actor);
  }

  static async getPettyCashClearanceItems(withdrawalId: string): Promise<PettyCashClearanceItem[]> {
    await initDb();
    const db = getDb();
    const res = await db.execute({
      sql: 'SELECT * FROM cash_flow_clearance_items WHERE withdrawal_id = ? ORDER BY expense_date ASC, created_at ASC',
      args: [withdrawalId]
    });
    return res.rows.map(r => ({
      id: String(r.id),
      withdrawalId: String(r.withdrawal_id),
      workflowId: String(r.workflow_id),
      expenseDate: String(r.expense_date),
      description: String(r.description),
      amount: round2(Number(r.amount)),
      receiptUrl: r.receipt_url ? String(r.receipt_url) : undefined,
      receiptName: r.receipt_name ? String(r.receipt_name) : undefined,
      receiptSize: r.receipt_size ? Number(r.receipt_size) : undefined,
      receiptType: r.receipt_type ? String(r.receipt_type) : undefined,
      categoryCode: r.category_code ? String(r.category_code) : undefined,
      categoryName: r.category_name ? String(r.category_name) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      status: (String(r.status) as any) || 'accepted',
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  }

  // =========================================================================
  // 13. Financial Dashboard Aggregator
  // =========================================================================

  static async getDashboardSummary(filters?: {
    dateFrom?: string;
    dateTo?: string;
    zakatYear?: string;
    moneyType?: string;
    bankAccountId?: string;
    asnaf?: string;
    fundId?: string;
  }) {
    await initDb();
    const db = getDb();

    // 1. Funds and Transactions
    const funds = await this.getFunds();
    const transactions = await this.getTransactions(filters);
    const bankAccounts = await this.getBankAccounts();
    const cashFlowWorkflows = await this.getCashFlowWorkflows();
    const asnafAllocations = await this.getAsnafAllocations(filters?.zakatYear || '2569');
    const faqirMiskinSubFunds = await this.getFaqirMiskinSubFunds(filters?.zakatYear || '2569');
    const reconciliations = await this.getBankReconciliations();

    // KPI Aggregations
    const totalIncome = transactions
      .filter((t) => t.type === 'income' && t.status !== 'reversed')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => (t.type === 'expense' || t.type === 'disbursement') && t.status !== 'reversed')
      .reduce((acc, t) => acc + t.amount, 0);

    const netBalance = round2(totalIncome - totalExpense);

    const totalBankBalance = bankAccounts
      .filter((b) => b.status === 'active')
      .reduce((acc, b) => acc + b.currentBalance, 0);

    // Verified cash on hand: remaining cash in active workflows + initial cash
    const totalCashOnHand = cashFlowWorkflows
      .filter((w) => w.overallStatus === 'in_progress' || w.overallStatus === 'completed')
      .reduce((acc, w) => acc + (w.overallStatus === 'in_progress' ? (w.step3WithdrawAmount || w.step1WithdrawAmount) - w.step4AllocatedAmount : w.step5RemainingCash), 0);

    const totalAllocatedBudget = funds.reduce((acc, f) => acc + f.totalReceived, 0);
    const totalDisbursedAid = transactions
      .filter((t) => t.type === 'disbursement' && t.status !== 'reversed')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalAvailableFunds = funds.reduce((acc, f) => acc + f.availableAmount, 0);

    const pendingApprovalsCount = cashFlowWorkflows.filter((w) => w.overallStatus === 'in_progress').length;
    const pendingReconciliationsCount = reconciliations.filter((r) => r.status === 'discrepancy').length;

    // Charts: Income vs Expense Time Aggregation (Monthly)
    const monthlyIncomeExpenseMap = new Map<string, { month: string; income: number; expense: number }>();
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    months.forEach((m) => monthlyIncomeExpenseMap.set(m, { month: m, income: 0, expense: 0 }));

    for (const t of transactions) {
      if (t.status === 'reversed') continue;
      // Extract month name from date string (e.g., '14 ต.ค. 2569')
      const matchedMonth = months.find((m) => t.date.includes(m));
      if (matchedMonth && monthlyIncomeExpenseMap.has(matchedMonth)) {
        const item = monthlyIncomeExpenseMap.get(matchedMonth)!;
        if (t.type === 'income') item.income += t.amount;
        if (t.type === 'expense' || t.type === 'disbursement') item.expense += t.amount;
      }
    }

    const incomeVsExpenseChart = Array.from(monthlyIncomeExpenseMap.values()).map((v) => ({
      month: v.month,
      income: round2(v.income),
      expense: round2(v.expense),
    }));

    // Charts: Asnaf Budget vs Actual
    const asnafChartData = asnafAllocations.map((a) => ({
      name: a.asnafName.split(' ')[0],
      fullName: a.asnafName,
      code: a.asnafCode,
      targetAmount: a.targetAmount,
      disbursedAmount: a.disbursedAmount,
      percentage: a.percentage,
    }));

    // Charts: Faqir-Miskin Sub-funds Budget vs Actual
    const faqirMiskinChartData = faqirMiskinSubFunds.map((sf) => ({
      name: sf.name,
      code: sf.code,
      targetAmount: sf.targetAmount,
      disbursedAmount: sf.disbursedAmount,
      percentage: sf.percentage,
    }));

    // Charts: Admin Expenses Breakdown (10 categories)
    const adminExpMap = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === 'expense' && t.status !== 'reversed') {
        const cat = t.category;
        adminExpMap.set(cat, (adminExpMap.get(cat) || 0) + t.amount);
      }
    }
    const adminExpensesChartData = Array.from(adminExpMap.entries()).map(([category, amount]) => ({
      category,
      amount: round2(amount),
    }));

    // Section D: Detailed Tables
    const recentIncomes = transactions.filter((t) => t.type === 'income').slice(0, 5);
    const recentExpenses = transactions.filter((t) => t.type === 'expense' || t.type === 'disbursement').slice(0, 5);
    const incompleteWorkflows = cashFlowWorkflows.filter((w) => w.overallStatus === 'in_progress');

    // Section E: Verified Assistance Aid Calculations (TASK 4)
    const verifiedExpenses = await this.calculateVerifiedAidExpenses({
      zakatYear: filters?.zakatYear || '2569',
      startDate: filters?.dateFrom,
      endDate: filters?.dateTo,
    });

    // TASK 5: Operational Overview (6 Vital Metrics with Direct Navigation Action)
    const pettyPendingRes = await db.execute(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
      FROM cash_flow_withdrawals
      WHERE voucher_type = 'office_expense' AND (clearance_status = 'pending_clearance' OR clearance_status = 'over_spent')
    `);
    const pendingPettyCount = Number(pettyPendingRes.rows[0]?.cnt || 0);
    const pendingPettyAmount = round2(Number(pettyPendingRes.rows[0]?.total || 0));

    const pendingHandoversRes = await db.execute(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
      FROM cash_flow_withdrawals
      WHERE voucher_type = 'aid_disbursement' AND (handover_status IS NULL OR handover_status IN ('not_handed_over', 'partially_handed_over')) AND status IN ('disbursed', 'approved')
    `);
    const pendingHandoversCount = Number(pendingHandoversRes.rows[0]?.cnt || 0);
    const pendingHandoversAmount = round2(Number(pendingHandoversRes.rows[0]?.total || 0));

    const pendingApprovalsRes = await db.execute(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
      FROM cash_flow_withdrawals
      WHERE status IN ('pending', 'pending_approval')
    `);
    const pendingVoucherCount = Number(pendingApprovalsRes.rows[0]?.cnt || 0) + pendingApprovalsCount;
    const pendingVoucherAmount = round2(Number(pendingApprovalsRes.rows[0]?.total || 0));

    const actualDisbursements = await this.getCashMovementHistory({ paymentType: 'actual_disbursements' });
    const topRecentDisbursements = actualDisbursements.slice(0, 5);

    return {
      kpi: {
        totalIncome: round2(totalIncome),
        totalExpense: round2(totalExpense),
        netBalance: round2(netBalance),
        totalBankBalance: round2(totalBankBalance),
        totalCashOnHand: round2(totalCashOnHand),
        totalAllocatedBudget: round2(totalAllocatedBudget),
        totalDisbursedAid: round2(totalDisbursedAid),
        totalAvailableFunds: round2(totalAvailableFunds),
        pendingApprovalsCount,
        pendingReconciliationsCount,
        // TASK 4 Verified Metrics
        totalVerifiedAidDisbursed: verifiedExpenses.totalVerifiedAidDisbursed,
        totalHandedOverToCaseWorkers: verifiedExpenses.totalHandedOverToCaseWorkers,
        inProgressAssistanceAmount: verifiedExpenses.inProgressAssistanceAmount,
        completedAssistanceAmount: verifiedExpenses.completedAssistanceAmount,
        unspentHeldAmount: verifiedExpenses.unspentHeldAmount,
        totalRefundedAmount: verifiedExpenses.totalRefundedAmount,
        unclearedAmount: verifiedExpenses.unclearedAmount,
        missingProofCount: verifiedExpenses.missingProofCount,
        missingProofAmount: verifiedExpenses.missingProofAmount,
      },
      operationalOverview: {
        cashOnHand: {
          title: 'เงินสดคงเหลือตรวจนับ',
          amount: round2(totalCashOnHand),
          count: cashFlowWorkflows.length,
          description: 'เงินสดในตู้นิรภัยเหรัญญิกและเงินสดระหว่างดำเนินการ',
          targetTab: 'cash_flow',
        },
        pendingApprovals: {
          title: 'รายการรออนุมัติ',
          amount: pendingVoucherAmount,
          count: pendingVoucherCount,
          description: 'ขั้นตอนเบิกเงินสดและใบสำคัญที่รออนุมัติ',
          targetTab: 'cash_flow',
        },
        pendingHandovers: {
          title: 'รายการรอส่งมอบให้ผู้ดูแลเคส',
          amount: pendingHandoversAmount,
          count: pendingHandoversCount,
          description: 'ใบสำคัญที่เบิกแล้ว อยู่ระหว่างรอส่งมอบให้อาสาสมัคร',
          targetTab: 'cash_flow',
        },
        pendingAssistanceConfirmations: {
          title: 'รายการรอยืนยันการช่วยเหลือ',
          amount: verifiedExpenses.inProgressAssistanceAmount,
          count: verifiedExpenses.drillDown.inProgressItems.length,
          description: 'ส่งมอบเงินแล้ว รอลงพื้นที่และยืนยันหลักฐานผลการช่วย',
          targetTab: 'aid_expenses',
        },
        pendingPettyClearances: {
          title: 'รายการรอเคลียร์เงินสำนักงาน',
          amount: pendingPettyAmount,
          count: pendingPettyCount,
          description: 'เงินสำรองจ่ายสำนักงานที่อยู่ระหว่างรอรวบรวมใบเสร็จ',
          targetTab: 'cash_flow',
        },
        recentDisbursements: {
          title: 'ประวัติการจ่ายล่าสุด',
          amount: verifiedExpenses.totalVerifiedAidDisbursed,
          count: actualDisbursements.length,
          description: 'บันทึกรายจ่ายจริงที่ยืนยันผลแล้วล่าสุด',
          items: topRecentDisbursements,
          targetTab: 'cash_flow',
        },
      },
      charts: {
        incomeVsExpense: incomeVsExpenseChart,
        asnafAllocations: asnafChartData,
        faqirMiskinSubFunds: faqirMiskinChartData,
        adminExpenses: adminExpensesChartData,
        assistanceTypes: verifiedExpenses.breakdownByAssistanceType,
      },
      tables: {
        recentIncomes,
        recentExpenses,
        incompleteWorkflows,
        bankAccounts,
        funds,
        missingProofItems: verifiedExpenses.missingProofItems,
        refundRecords: verifiedExpenses.refundRecords,
      },
      verifiedAid: verifiedExpenses,
    };
  }

  // =========================================================================
  // 14. Financial Reports Generator & CSV Export
  // =========================================================================

  static async getFinancialReports(reportType: string, filters?: any) {
    const transactions = await this.getTransactions(filters);
    const funds = await this.getFunds();
    const bankAccounts = await this.getBankAccounts();
    const asnafs = await this.getAsnafAllocations(filters?.year || '2569');
    const subFunds = await this.getFaqirMiskinSubFunds(filters?.year || '2569');
    const workflows = await this.getCashFlowWorkflows();

    switch (reportType) {
      case 'income_by_type':
        return {
          title: 'รายงานรายรับแยกตามประเภทเงิน (ซะกาต / ศอดะเกาะฮ์ / สำหรับบริหาร)',
          headers: ['เลขที่รายการ', 'วันที่', 'ประเภทเงิน', 'ผู้บริจาค/ชำระ', 'กองทุนปลายทาง', 'บัญชีธนาคาร/ช่องทาง', 'จำนวนเงิน (บาท)', 'สถานะ'],
          rows: transactions.filter((t) => t.type === 'income').map((t) => [
            t.transactionNo,
            t.date,
            t.moneyType === 'zakat' ? 'ซะกาต' : t.moneyType === 'sadaqah' ? 'ศอดะเกาะฮ์ทั่วไป' : 'สำหรับบริหาร',
            t.payerOrPayee,
            t.fundName,
            t.bankAccountName || t.paymentMethod,
            t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            t.status === 'completed' ? 'สำเร็จ' : t.status,
          ]),
        };

      case 'aid_by_asnaf':
        return {
          title: 'รายงานรายจ่ายเพื่อการช่วยเหลือแยกตาม 8 อัสนัฟ',
          headers: ['หมวดอัสนัฟ', 'สัดส่วนนโยบาย', 'งบเป้าหมาย (บาท)', 'ยอดจัดสรรจริง (บาท)', 'ยอดเบิกจ่ายจริง (บาท)', 'ยอดคงเหลือ (บาท)'],
          rows: asnafs.map((a) => [
            a.asnafName,
            `${a.percentage.toFixed(1)}%`,
            a.targetAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            a.allocatedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            a.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            a.remainingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
          ]),
        };

      case 'faqir_miskin_subfunds':
        return {
          title: 'รายงานรายจ่ายตามกองทุนย่อยฟากีร–มิสกิน (5 รูปแบบความช่วยเหลือ)',
          headers: ['รูปแบบความช่วยเหลือ', 'สัดส่วนนโยบาย', 'งบประมาณเป้าหมาย (บาท)', 'ยอดใช้จ่ายจริง (บาท)', 'ยอดคงเหลือ (บาท)'],
          rows: subFunds.map((sf) => [
            sf.name,
            `${sf.percentage.toFixed(1)}%`,
            sf.targetAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            sf.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            sf.remainingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
          ]),
        };

      case 'admin_expenses':
        return {
          title: 'รายงานค่าใช้จ่ายบริหาร 10 หมวดหมู่',
          headers: ['เลขที่รายการ', 'วันที่', 'หมวดค่าใช้จ่าย', 'รายละเอียด', 'ผู้รับเงิน', 'จำนวนเงิน (บาท)', 'ผู้บันทึก'],
          rows: transactions.filter((t) => t.type === 'expense').map((t) => [
            t.transactionNo,
            t.date,
            t.category,
            t.notes || '-',
            t.payerOrPayee,
            t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            t.recordedBy,
          ]),
        };

      case 'bank_balances':
        return {
          title: 'รายงานเงินคงเหลือแยกตามบัญชีธนาคารและการกระทบยอด',
          headers: ['ชื่อบัญชี', 'ธนาคาร', 'เลขที่บัญชี (Masked)', 'ยอดยกมา (บาท)', 'ยอดคงเหลือระบบ (บาท)', 'ยอดสเตตเมนต์ล่าสุด (บาท)', 'วันที่กระทบยอด', 'สถานะ'],
          rows: bankAccounts.map((b) => [
            b.accountName,
            b.bankName,
            maskAccountNumber(b.accountNumber),
            b.openingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            b.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            b.reconciledBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            b.lastReconciledAt || 'ยังไม่ได้กระทบยอด',
            b.status === 'active' ? 'เปิดใช้งาน' : b.status === 'closed' ? 'ปิดบัญชีแล้ว' : 'ระงับ',
          ]),
        };

      case 'cash_flow_workflows':
        return {
          title: 'รายงานการเบิกเงินสด 5 ขั้นตอนและการส่งมอบความช่วยเหลือ',
          headers: ['เลขที่คำขอ', 'ชื่อโครงการ/วัตถุประสงค์', 'ยอดเบิกธนาคาร (บาท)', 'ผู้รับฝากเหรัญญิก', 'ผู้เบิกเงินสด', 'จัดสรรแล้ว (บาท)', 'เงินสดคงเหลือ (บาท)', 'สถานะ'],
          rows: workflows.map((w) => [
            w.workflowNo,
            w.title,
            w.step1WithdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            w.step2TreasurerName,
            w.step3WithdrawerName,
            w.step4AllocatedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            w.step5RemainingCash.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            w.overallStatus === 'completed' ? 'เสร็จสิ้นครบ 5 ขั้นตอน' : 'กำลังดำเนินการ',
          ]),
        };

      case 'aid_by_assistance_type': {
        const verified = await this.calculateVerifiedAidExpenses({ zakatYear: filters?.year || '2569' });
        return {
          title: 'รายงานรายจ่ายเพื่อการช่วยเหลือแยกตามประเภทความช่วยเหลือ',
          headers: ['รหัสประเภท', 'ชื่อประเภทความช่วยเหลือ', 'หมวดหมู่', 'จำนวนเคสที่ช่วยเหลือ', 'ช่วยเหลือเสร็จสิ้น', 'ยอดเงินช่วยเหลือจริง (บาท)'],
          rows: verified.breakdownByAssistanceType.map((t) => [
            t.typeCode,
            t.typeName,
            t.categoryLabel,
            t.caseCount.toString(),
            t.confirmedCount.toString(),
            t.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
          ]),
        };
      }

      case 'caregiver_unspent_summary': {
        const verified = await this.calculateVerifiedAidExpenses({ zakatYear: filters?.year || '2569' });
        return {
          title: 'รายงานการส่งมอบเงินสดและยอดเงินคงเหลือในความรับผิดชอบของผู้ดูแล',
          headers: ['หัวข้อการเงิน', 'จำนวนเงิน (บาท)', 'รายละเอียด'],
          rows: [
            ['เงินสดส่งมอบให้ผู้ดูแลแล้ว', verified.totalHandedOverToCaseWorkers.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 'ยอดเงินสดที่การเงินส่งมอบให้ผู้รับผิดชอบโครงการ/เคส'],
            ['เงินช่วยเหลือที่ยืนยันแล้ว', verified.totalVerifiedAidDisbursed.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 'ยอดที่นำไปจ่ายช่วยเหลือผู้รับซะกาตจริงพร้อมหลักฐาน'],
            ['เงินเหลือที่ส่งคืนมูลนิธิแล้ว', verified.totalRefundedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 'ยอดเงินคงเหลือที่ผู้ดูแลนำส่งคืนเข้าบัญชีมูลนิธิ'],
            ['ยอดเงินสดคงค้างในมือผู้ดูแล', verified.unspentHeldAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }), 'ยอดคงเหลือที่ต้องดำเนินการช่วยเหลือต่อหรือนำส่งคืน'],
            ['รายการที่ยังขาดหลักฐานยืนยัน', `${verified.missingProofCount} รายการ (฿${verified.missingProofAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`, 'รายการที่ยังไม่แนบภาพถ่ายหรือสลิปยืนยันผล'],
          ],
        };
      }

      case 'deposit_withdraw_transfers':
        return {
          title: 'รายงานฝาก–ถอน–โอน และความเคลื่อนไหวบัญชีธนาคาร',
          headers: ['เลขที่รายการ', 'วันที่', 'ประเภท', 'บัญชีธนาคาร', 'คู่สัญญา/ผู้ดำเนินงาน', 'จำนวนเงิน (บาท)', 'เลขอ้างอิง', 'สถานะ'],
          rows: transactions.filter((t) => t.bankAccountId || t.paymentMethod === 'bank_transfer').map((t) => [
            t.transactionNo,
            t.date,
            t.type === 'income' ? 'ฝากเข้าบัญชี' : t.type === 'disbursement' ? 'โอนจ่ายช่วยเหลือ' : 'ถอน/ค่าใช้จ่าย',
            t.bankAccountName || '-',
            t.payerOrPayee,
            t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            t.referenceNo,
            t.status === 'completed' ? 'สำเร็จ' : t.status,
          ]),
        };

      case 'allocated_vs_actual':
        return {
          title: 'รายงานยอดจัดสรรเทียบยอดใช้จริง (Budget vs Actual Allocation)',
          headers: ['ชื่อกองทุน/หมวด', 'รหัส', 'ประเภทเงิน', 'ยอดรับสะสม (บาท)', 'ยอดผูกพันรอจ่าย (บาท)', 'ยอดจ่ายจริงแล้ว (บาท)', 'ยอดคงเหลือใช้ได้ (บาท)'],
          rows: funds.map((f) => [
            f.name,
            f.code,
            f.category === 'zakat' ? 'ซะกาต (8 อัสนัฟ)' : f.category === 'sadaqah' ? 'ศอดะเกาะฮ์' : 'บริหาร',
            f.totalReceived.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            f.committedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            f.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            f.availableAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
          ]),
        };

      case 'by_recorder_approver':
        return {
          title: 'รายงานธุรกรรมตามผู้บันทึกและผู้อนุมัติ (Officer & Approver Audit)',
          headers: ['เลขที่รายการ', 'วันที่', 'ประเภท', 'หมวดหมู่', 'จำนวนเงิน (บาท)', 'ผู้บันทึก (Recorder)', 'ผู้อนุมัติ/ผู้ตรวจสอบ', 'สถานะ'],
          rows: transactions.map((t) => [
            t.transactionNo,
            t.date,
            t.type === 'income' ? 'รายรับ' : t.type === 'disbursement' ? 'จ่ายสวัสดิการ' : t.type === 'reversal' ? 'กลับรายการ' : 'รายจ่ายบริหาร',
            t.category,
            t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            t.recordedBy,
            (t as any).approvedBy || 'ระบบอนุมัติอัตโนมัติ',
            t.status === 'completed' ? 'สมบูรณ์' : t.status,
          ]),
        };

      case 'audit_reversals':
        return {
          title: 'รายงานประวัติการแก้ไขและยกเลิกรายการ (Audit Log & Reversals)',
          headers: ['เลขที่รายการ', 'วันที่ทำรายการ', 'ประเภท', 'จำนวนเงิน (บาท)', 'ผู้ทำรายการ', 'เหตุผลการกลับรายการ/ปรับปรุง', 'สถานะ'],
          rows: transactions.filter((t) => t.type === 'reversal' || t.status === 'reversed').map((t) => [
            t.transactionNo,
            t.date,
            t.type === 'reversal' ? 'รายการกลับบัญชี (Reversal Entry)' : 'รายการเดิมที่ถูกปรับปรุง',
            t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            t.recordedBy,
            t.reversalReason || 'ปรับปรุงรายการตามระเบียบการเงิน',
            t.status,
          ]),
        };

      default:
        return {
          title: 'สมุดรายวันธุรกรรมทางการเงินทั้งหมด (General Ledger)',
          headers: ['เลขที่รายการ', 'วันที่', 'ประเภท', 'กองทุน', 'หมวดหมู่', 'จำนวนเงิน (บาท)', 'คู่สัญญา', 'สถานะ'],
          rows: transactions.map((t) => [
            t.transactionNo,
            t.date,
            t.type,
            t.fundName,
            t.category,
            t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
            t.payerOrPayee,
            t.status,
          ]),
        };
    }
  }

  static async exportReportCsv(reportType: string, filters?: any): Promise<string> {
    const report = await this.getFinancialReports(reportType, filters);
    const headers = report.headers.map((h: string) => `"${h}"`).join(',');
    const rows = report.rows.map((r: string[]) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
    return '\uFEFF' + [headers, ...rows].join('\r\n');
  }

  static async exportTransactionsCsv(): Promise<string> {
    const transactions = await this.getTransactions();

    const headers = [
      'เลขที่ธุรกรรม',
      'วันที่-เวลา',
      'ประเภทรายการ',
      'ชื่อกองทุน',
      'หมวดหมู่',
      'จำนวนเงิน (บาท)',
      'ช่องทางชำระเงิน',
      'ผู้จ่าย / ผู้รับเงิน',
      'หมายเลขอ้างอิง',
      'สถานะ',
      'ผู้บันทึก',
      'หมายเหตุ',
    ];

    const typeThaiMap: Record<string, string> = {
      income: 'รายรับ (เงินบริจาค/ซะกาต)',
      expense: 'รายจ่ายดำเนินงาน',
      disbursement: 'จ่ายสวัสดิการซะกาต',
      reversal: 'รายการกลับบัญชี/ปรับปรุง',
    };

    const statusThaiMap: Record<string, string> = {
      completed: 'สำเร็จ',
      reversed: 'กลับรายการแล้ว',
      pending: 'รอดำเนินการ',
      cancelled: 'ยกเลิก',
    };

    const methodThaiMap: Record<string, string> = {
      promptpay_qr: 'PromptPay QR',
      bank_transfer: 'โอนผ่านธนาคาร',
      cash: 'เงินสด',
    };

    const rows = transactions.map((t) => [
      `"${t.transactionNo}"`,
      `"${t.date}"`,
      `"${typeThaiMap[t.type] || t.type}"`,
      `"${t.fundName}"`,
      `"${t.category}"`,
      t.amount.toFixed(2),
      `"${methodThaiMap[t.paymentMethod] || t.paymentMethod}"`,
      `"${t.payerOrPayee}"`,
      `"${t.referenceNo}"`,
      `"${statusThaiMap[t.status] || t.status}"`,
      `"${t.recordedBy}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  // =========================================================================
  // TASK 1: Finance Handover to Case Worker Functions
  // =========================================================================

  /**
   * TASK 1: ดึงรายการใบสำคัญเบิกเงินสดที่ต้องส่งมอบเงินให้ผู้ดูแลเคส
   * พร้อมยอดส่งมอบสะสม ยอดคงเหลือ และประวัติการส่งมอบแต่ละครั้ง
   */
  static async getVoucherHandovers(search?: string, statusFilter?: string): Promise<VoucherHandoverSummary[]> {
    await initDb();
    const db = getDb();

    // Fetch disbursed/completed cash withdrawals (specifically for aid disbursement)
    const withdrawalsRes = await db.execute(`
      SELECT 
        w.id as withdrawal_id,
        w.withdrawal_no,
        w.workflow_id,
        w.amount,
        w.source_fund_type,
        w.source_description,
        w.target_asnaf,
        w.purpose,
        w.withdrawal_datetime,
        w.withdrawer_name,
        w.recipient_case_worker_name,
        w.handover_status,
        w.total_handed_over_amount,
        w.remaining_handover_amount,
        w.voucher_type,
        w.status as voucher_status,
        wf.workflow_no,
        wf.title as workflow_title,
        wf.step1_bank_account_id
      FROM cash_flow_withdrawals w
      JOIN cash_flow_workflows wf ON w.workflow_id = wf.id
      WHERE w.status IN ('disbursed', 'completed')
      ORDER BY w.withdrawal_datetime DESC, w.created_at DESC
    `);

    // Fetch all handover records
    const handoversRes = await db.execute(`
      SELECT * FROM finance_handover_records ORDER BY handover_date DESC, handover_time DESC, created_at DESC
    `);

    // Group handovers by withdrawal_id
    const handoverMap = new Map<string, FinanceHandoverRecord[]>();
    for (const row of handoversRes.rows) {
      const wId = String(row.withdrawal_id);
      const rec: FinanceHandoverRecord = {
        id: String(row.id),
        withdrawalId: wId,
        workflowId: String(row.workflow_id),
        handoverNo: String(row.handover_no),
        handoverDate: String(row.handover_date),
        handoverTime: String(row.handover_time || '12:00'),
        handedOverById: String(row.handed_over_by_id),
        handedOverByName: String(row.handed_over_by_name),
        receivedById: row.received_by_id ? String(row.received_by_id) : undefined,
        receivedByName: String(row.received_by_name),
        receivedByPosition: row.received_by_position ? String(row.received_by_position) : undefined,
        amount: round2(Number(row.amount || 0)),
        handoverMethod: String(row.handover_method || 'cash'),
        referenceNo: row.reference_no ? String(row.reference_no) : undefined,
        notes: row.notes ? String(row.notes) : undefined,
        proofUrl: String(row.proof_url || ''),
        proofName: String(row.proof_name || ''),
        proofSize: row.proof_size ? Number(row.proof_size) : undefined,
        proofType: row.proof_type ? String(row.proof_type) : undefined,
        status: (row.status || 'fully_handed_over') as HandoverStatus,
        cancellationReason: row.cancellation_reason ? String(row.cancellation_reason) : undefined,
        recordedById: String(row.recorded_by_id),
        recordedByName: String(row.recorded_by_name),
        confirmedById: String(row.confirmed_by_id),
        confirmedByName: String(row.confirmed_by_name),
        confirmedAt: String(row.confirmed_at || ''),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
      if (!handoverMap.has(wId)) handoverMap.set(wId, []);
      handoverMap.get(wId)!.push(rec);
    }

    // Also fetch disbursement items to identify assigned case workers if not explicitly set
    const itemsRes = await db.execute(`
      SELECT withdrawal_id, application_id, beneficiary_name, assistance_type, asnaf_category
      FROM cash_flow_disbursement_items
    `);
    const appMap = new Map<string, string>();
    for (const item of itemsRes.rows) {
      const wId = String(item.withdrawal_id);
      if (!appMap.has(wId) && item.assistance_type) {
        appMap.set(wId, String(item.assistance_type));
      }
    }

    const results: VoucherHandoverSummary[] = [];

    for (const row of withdrawalsRes.rows) {
      const wId = String(row.withdrawal_id);
      const voucherAmount = round2(Number(row.amount || 0));
      const history = handoverMap.get(wId) || [];

      // Calculate active (non-cancelled) total handed over
      const activeHandovers = history.filter((h) => h.status !== 'cancelled' && h.status !== 'error');
      const totalHandedOver = activeHandovers.reduce((sum, h) => sum + h.amount, 0);
      const remainingHandover = Math.max(0, round2(voucherAmount - totalHandedOver));

      let computedStatus: HandoverStatus = 'not_handed_over';
      if (history.some((h) => h.status === 'pending_verification')) {
        computedStatus = 'pending_verification';
      } else if (history.some((h) => h.status === 'discrepancy' || h.status === 'error')) {
        computedStatus = 'discrepancy';
      } else if (totalHandedOver >= voucherAmount && voucherAmount > 0) {
        computedStatus = 'fully_handed_over';
      } else if (totalHandedOver > 0) {
        computedStatus = 'partially_handed_over';
      }

      const currentDbStatus = (row.handover_status as HandoverStatus) || 'not_handed_over';
      const finalStatus = currentDbStatus === 'cancelled' ? 'cancelled' : computedStatus;

      const summary: VoucherHandoverSummary = {
        withdrawalId: wId,
        withdrawalNo: String(row.withdrawal_no),
        workflowId: String(row.workflow_id),
        workflowNo: String(row.workflow_no),
        withdrawalDatetime: String(row.withdrawal_datetime || ''),
        amount: voucherAmount,
        sourceFundType: String(row.source_fund_type || 'zakat'),
        sourceDescription: row.source_description ? String(row.source_description) : undefined,
        targetAsnaf: String(row.target_asnaf || 'faqir_miskin'),
        assistanceType: appMap.get(wId) || (row.voucher_type === 'office_expense' ? 'สำรองจ่ายสำนักงาน' : 'เงินสงเคราะห์เพื่อการยังชีพ'),
        purpose: String(row.purpose || ''),
        withdrawerName: String(row.withdrawer_name || ''),
        recipientCaseWorkerName: row.recipient_case_worker_name ? String(row.recipient_case_worker_name) : (history[0]?.receivedByName || 'อุสมาน เจริญสุข'),
        totalHandedOverAmount: round2(totalHandedOver),
        remainingHandoverAmount: round2(remainingHandover),
        handoverStatus: finalStatus,
        handoverHistory: history,
      };

      if (search) {
        const s = search.toLowerCase();
        const matches = 
          summary.withdrawalNo.toLowerCase().includes(s) ||
          summary.workflowNo.toLowerCase().includes(s) ||
          summary.withdrawerName.toLowerCase().includes(s) ||
          (summary.recipientCaseWorkerName || '').toLowerCase().includes(s) ||
          (summary.purpose || '').toLowerCase().includes(s);
        if (!matches) continue;
      }

      if (statusFilter && statusFilter !== 'all') {
        if (summary.handoverStatus !== statusFilter) continue;
      }

      results.push(summary);
    }

    return results;
  }

  /**
   * TASK 1: บันทึกและยืนยันการส่งมอบเงินสดจากฝ่ายการเงินให้ผู้ดูแลเคส
   * ดำเนินการภายใต้ Atomic Transaction พร้อมตรวจสอบความถูกต้องทางบัญชีอย่างเคร่งครัด
   */
  static async recordFinanceHandover(
    input: RecordFinanceHandoverInput,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    // 1. ตรวจสอบสิทธิ์การใช้งาน
    if (!['super_admin', 'finance', 'executive'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการบันทึกส่งมอบเงินจากฝ่ายการเงิน');
    }

    // 2. ตรวจสอบ Checkbox ยืนยัน
    if (!input.isConfirmed) {
      throw new Error('กรุณาทำเครื่องหมายยืนยันว่า "ข้าพเจ้ายืนยันว่าได้ตรวจสอบหลักฐานและข้อมูลการส่งมอบเงินตามรายการนี้แล้ว"');
    }

    // 3. ตรวจสอบฟิลด์บังคับ
    if (!input.withdrawalId) {
      throw new Error('ต้องระบุ withdrawalId ของใบสำคัญที่ต้องการส่งมอบ');
    }
    const rawAmount = input.handoverAmount !== undefined ? input.handoverAmount : input.amount;
    const handoverAmount = round2(Number(rawAmount));
    if (isNaN(handoverAmount) || handoverAmount <= 0) {
      throw new Error('จำนวนเงินที่ส่งมอบจริงต้องมากกว่า 0 บาท');
    }
    if (!input.handoverDate || !input.handoverDate.trim()) {
      throw new Error('กรุณาระบุวันที่ส่งมอบจริง');
    }
    if (!input.handedOverByName || !input.handedOverByName.trim()) {
      throw new Error('กรุณาระบุชื่อผู้ส่งมอบเงิน (ฝ่ายการเงิน)');
    }
    if (!input.receivedByName || !input.receivedByName.trim()) {
      throw new Error('กรุณาระบุชื่อผู้รับมอบเงิน (ผู้ดูแลเคส)');
    }
    if (!input.proofUrl || !input.proofUrl.trim()) {
      throw new Error('กรุณาแนบไฟล์หลักฐานการส่งมอบเงิน (PDF, JPG, JPEG, PNG)');
    }

    const tx = await db.transaction('write');

    try {
      // 4. ดึงข้อมูลใบสำคัญเบิกเงินสดเดิม
      const wRes = await tx.execute({
        sql: 'SELECT * FROM cash_flow_withdrawals WHERE id = ?',
        args: [input.withdrawalId],
      });

      if (wRes.rows.length === 0) {
        throw new Error('ไม่พบข้อมูลใบสำคัญเบิกเงินสดที่ระบุ');
      }

      const voucher = wRes.rows[0];
      const voucherAmount = round2(Number(voucher.amount || 0));
      const workflowId = String(voucher.workflow_id);

      if (voucher.status !== 'disbursed' && voucher.status !== 'completed') {
        throw new Error('ไม่สามารถส่งมอบเงินได้: ใบสำคัญนี้ยังไม่ได้ทำการเบิกเงินสดจริง (สถานะต้องเป็นเบิกแล้ว)');
      }

      // 5. คำนวณยอดที่ส่งมอบไปแล้วจากรายการที่ยังไม่ถูกยกเลิก
      const existingHandoversRes = await tx.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total_handed
              FROM finance_handover_records
              WHERE withdrawal_id = ? AND status != 'cancelled' AND status != 'error'`,
        args: [input.withdrawalId],
      });

      const currentTotalHanded = round2(Number(existingHandoversRes.rows[0]?.total_handed || 0));
      const remainingBefore = round2(voucherAmount - currentTotalHanded);

      // กฎการเงิน: ห้ามส่งมอบเกินยอดคงเหลือที่ต้องส่งมอบ
      if (handoverAmount > remainingBefore) {
        throw new Error(
          `ยอดเงินที่ส่งมอบ (฿${handoverAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}) เกินยอดคงเหลือที่ยังไม่ได้ส่งมอบ (฿${remainingBefore.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`
        );
      }

      const newTotalHanded = round2(currentTotalHanded + handoverAmount);
      const newRemaining = round2(voucherAmount - newTotalHanded);
      const newStatus: HandoverStatus = newRemaining === 0 ? 'fully_handed_over' : 'partially_handed_over';

      // 6. สร้างเลขที่เอกสารการส่งมอบ (Handover No)
      const handoverTime = input.handoverTime?.trim() || new Date().toTimeString().slice(0, 5);
      const docYear = FinancialService.extractDocumentYear(input.handoverDate);
      const countRes = await tx.execute({
        sql: "SELECT COUNT(*) as c FROM finance_handover_records WHERE handover_date LIKE ? || '%'",
        args: [input.handoverDate.slice(0, 4)],
      });
      const nextSeq = Number(countRes.rows[0]?.c || 0) + 1;
      const handoverNo = `HO-${docYear}-${String(nextSeq).padStart(3, '0')}`;
      const handoverId = `ho-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

      // 7. บันทึกลงตาราง finance_handover_records
      await tx.execute({
        sql: `INSERT INTO finance_handover_records (
          id, withdrawal_id, workflow_id, handover_no, handover_date, handover_time,
          handed_over_by_id, handed_over_by_name, received_by_id, received_by_name, received_by_position,
          amount, handover_method, reference_no, notes,
          proof_url, proof_name, proof_size, proof_type, status,
          recorded_by_id, recorded_by_name, confirmed_by_id, confirmed_by_name, confirmed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          handoverId,
          input.withdrawalId,
          workflowId,
          handoverNo,
          input.handoverDate.trim(),
          handoverTime,
          input.handedOverById || actor.id,
          input.handedOverByName.trim(),
          input.receivedById || null,
          input.receivedByName.trim(),
          input.receivedByPosition?.trim() || 'ผู้ดูแลเคส',
          handoverAmount,
          input.handoverMethod || 'cash',
          input.referenceNo?.trim() || null,
          input.notes?.trim() || null,
          input.proofUrl.trim(),
          input.proofName.trim(),
          input.proofSize || 0,
          input.proofType || 'application/pdf',
          newStatus,
          actor.id,
          actor.name,
          actor.id,
          actor.name,
          timestampNow,
        ],
      });

      // 8. อัปเดตตาราง cash_flow_withdrawals
      await tx.execute({
        sql: `UPDATE cash_flow_withdrawals
              SET handover_status = ?,
                  total_handed_over_amount = ?,
                  remaining_handover_amount = ?,
                  recipient_case_worker_name = ?,
                  recipient_case_worker_id = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [
          newStatus,
          newTotalHanded,
          newRemaining,
          input.receivedByName.trim(),
          input.receivedById || null,
          input.withdrawalId,
        ],
      });

      // 9. บันทึกหลักฐานลง workflow_attachments
      await tx.execute({
        sql: `INSERT INTO workflow_attachments (
          id, workflow_id, withdrawal_id, step_number, file_name, file_url, file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
        ) VALUES (?, ?, ?, 4, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `att-ho-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          workflowId,
          input.withdrawalId,
          input.proofName.trim(),
          input.proofUrl.trim(),
          input.proofSize || 102400,
          input.proofType || 'application/pdf',
          actor.id,
          actor.name,
          timestampNow,
          `หลักฐานการส่งมอบเงินสดตามใบสำคัญ ${voucher.withdrawal_no} ให้ผู้ดูแลเคส (${input.receivedByName.trim()}) จำนวน ฿${handoverAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
        ],
      });

      // 10. บันทึก Audit Log
      await tx.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestampNow,
          actor.id,
          actor.name,
          actor.role,
          'FINANCE_HANDOVER_CONFIRMED',
          'finance_handover',
          handoverId,
          `ฝ่ายการเงิน (${input.handedOverByName.trim()}) ยืนยันการส่งมอบเงินสดตามใบสำคัญ ${voucher.withdrawal_no} ให้ผู้ดูแลเคส (${input.receivedByName.trim()}) จำนวน ฿${handoverAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท (เอกสารอ้างอิง: ${handoverNo}, คงเหลือค้างส่งมอบ: ฿${newRemaining.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
        ],
      });

      // Commit all changes atomically!
      await tx.commit();

      return {
        success: true,
        handoverId,
        handoverNo,
        handoverAmount,
        totalHandedOver: newTotalHanded,
        remainingHandover: newRemaining,
        status: newStatus,
        withdrawalNo: String(voucher.withdrawal_no),
      };
    } catch (err: any) {
      try {
        await tx.rollback();
      } catch {}
      throw err;
    }
  }

  /**
   * TASK 1: ยกเลิกรายการส่งมอบเงินพร้อมระบุเหตุผล และคำนวณยอดย้อนกลับอย่างถูกต้อง
   */
  static async cancelFinanceHandover(
    handoverId: string,
    reason: string,
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!['super_admin', 'finance'].includes(actor.role)) {
      throw new Error('ไม่อนุญาต: สิทธิ์ไม่เพียงพอในการยกเลิกรายการส่งมอบเงิน');
    }

    if (!reason || reason.trim().length < 5) {
      throw new Error('กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 5 ตัวอักษร');
    }

    const tx = await db.transaction('write');

    try {
      const hoRes = await tx.execute({
        sql: 'SELECT * FROM finance_handover_records WHERE id = ?',
        args: [handoverId],
      });

      if (hoRes.rows.length === 0) {
        throw new Error('ไม่พบข้อมูลรายการส่งมอบเงินที่ระบุ');
      }

      const ho = hoRes.rows[0];
      if (ho.status === 'cancelled') {
        throw new Error('รายการส่งมอบเงินนี้ถูกยกเลิกไปแล้ว');
      }

      const withdrawalId = String(ho.withdrawal_id);
      const cancelledAmount = round2(Number(ho.amount || 0));
      const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

      // Mark record as cancelled
      await tx.execute({
        sql: `UPDATE finance_handover_records
              SET status = 'cancelled', cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [reason.trim(), handoverId],
      });

      // Re-fetch remaining active handovers for this voucher
      const activeRes = await tx.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total_handed
              FROM finance_handover_records
              WHERE withdrawal_id = ? AND status != 'cancelled' AND status != 'error'`,
        args: [withdrawalId],
      });

      const wRes = await tx.execute({
        sql: 'SELECT amount, withdrawal_no FROM cash_flow_withdrawals WHERE id = ?',
        args: [withdrawalId],
      });

      const voucherAmount = round2(Number(wRes.rows[0]?.amount || 0));
      const newTotalHanded = round2(Number(activeRes.rows[0]?.total_handed || 0));
      const newRemaining = round2(voucherAmount - newTotalHanded);

      let newStatus: HandoverStatus = 'not_handed_over';
      if (newTotalHanded >= voucherAmount && voucherAmount > 0) {
        newStatus = 'fully_handed_over';
      } else if (newTotalHanded > 0) {
        newStatus = 'partially_handed_over';
      }

      await tx.execute({
        sql: `UPDATE cash_flow_withdrawals
              SET handover_status = ?, total_handed_over_amount = ?, remaining_handover_amount = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [newStatus, newTotalHanded, newRemaining, withdrawalId],
      });

      // Audit Log
      await tx.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestampNow,
          actor.id,
          actor.name,
          actor.role,
          'FINANCE_HANDOVER_CANCELLED',
          'finance_handover',
          handoverId,
          `ยกเลิกรายการส่งมอบเงิน ${ho.handover_no} (ยอดเงิน ฿${cancelledAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท) ด้วยเหตุผล: "${reason.trim()}"`,
        ],
      });

      await tx.commit();

      return {
        success: true,
        handoverId,
        cancelledAmount,
        totalHandedOver: newTotalHanded,
        remainingHandover: newRemaining,
        status: newStatus,
      };
    } catch (err: any) {
      try {
        await tx.rollback();
      } catch {}
      throw err;
    }
  }

  // =========================================================================
  // TASK 2: Assistance - Finance Handover Linkage & Caretaker Permissions
  // =========================================================================

  static readonly ASNAF_THAI_NAMES: Record<string, string> = {
    fakir: 'ผู้ยากไร้ (Faqir)',
    faqir: 'ผู้ยากไร้ (Faqir)',
    miskin: 'ผู้ขัดสน (Miskin)',
    amil: 'เจ้าหน้าที่จัดการซะกาต (Amil)',
    muallaf: 'ผู้เข้ารับอิสลามใหม่ (Muallaf)',
    riqab: 'ปลดปล่อยทาส/พันธนาการ (Riqab)',
    gharimin: 'ผู้มีหนี้สินล้นพ้นตัว (Gharimin)',
    fisabilillah: 'ในหนทางของอัลลอฮ์ (Fisabilillah)',
    ibnsabil: 'ผู้เดินทางขาดแคลน (Ibn Sabil)',
    faqir_miskin: 'ผู้ยากไร้และขัดสน (Faqir & Miskin)',
  };

  static readonly OUTCOME_STATUS_THAI_NAMES: Record<AssistanceOutcomeStatus, string> = {
    not_started: 'ยังไม่เริ่มดำเนินการ',
    in_progress: 'กำลังดำเนินการ',
    partially_assisted: 'ช่วยเหลือบางส่วน',
    wait_proof_verification: 'รอตรวจสอบหลักฐาน',
    completed: 'ช่วยเหลือเสร็จสิ้น',
    has_issues: 'มีปัญหาหรือรอแก้ไข',
    cancelled: 'ยกเลิกพร้อมเหตุผล',
    draft: 'บันทึกร่าง (ยังไม่ยืนยัน)',
  };

  /**
   * Check if current actor has permission to access an assistance case
   * Rule: Super Admin, Executive, Finance have universal access.
   * Case Worker / Officer sees only assigned cases or where they are recipient case worker.
   */
  static checkCaseWorkerAccess(
    app: Record<string, any>,
    actor: ActorContext
  ): boolean {
    if (!actor) return false;
    const role = String(actor.role || '').toLowerCase();
    if (['super_admin', 'executive', 'finance', 'admin'].includes(role)) {
      return true;
    }
    if (role === 'officer' || role === 'case_worker') {
      const actorId = String(actor.id || '').trim();
      const actorName = String(actor.name || '').trim().toLowerCase();

      if (app.assigned_officer_id && String(app.assigned_officer_id).trim() === actorId) return true;
      if (app.recipient_case_worker_id && String(app.recipient_case_worker_id).trim() === actorId) return true;
      if (app.assigned_officer_name && String(app.assigned_officer_name).trim().toLowerCase() === actorName) return true;
      if (app.recipient_case_worker_name && String(app.recipient_case_worker_name).trim().toLowerCase() === actorName) return true;

      return false;
    }
    return false;
  }

  /**
   * Get 13-field Assistance Financial Linkage Details for a specific application
   * Pulls all data from real DB, checks permission, and computes dual independent statuses.
   */
  static async getAssistanceFinancialDetails(
    applicationId: string,
    actor: ActorContext
  ): Promise<AssistanceFinancialDetail> {
    await initDb();
    const db = getDb();

    // 1. Fetch application with linked beneficiary
    const appRes = await db.execute({
      sql: `SELECT a.*, 
                   b.full_name as beneficiary_name, 
                   b.registration_no as beneficiary_registration_no, 
                   b.national_id, 
                   b.asnaf_category as beneficiary_asnaf,
                   b.branch_name as beneficiary_branch_name,
                   b.subdistrict as beneficiary_subdistrict,
                   b.residence_address as beneficiary_residence_address
            FROM assistance_applications a
            LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
            WHERE a.id = ?`,
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบข้อมูลคำร้องขอความช่วยเหลือ (ID: ${applicationId})`);
    }

    const app = appRes.rows[0];

    // 2. Permission Check
    const hasAccess = this.checkCaseWorkerAccess(app, actor);
    if (!hasAccess) {
      throw new Error('ไม่อนุญาต: คุณไม่มีสิทธิ์เข้าถึงข้อมูลคำร้องนี้ เนื่องจากไม่ใช่ผู้ดูแลเคสที่ได้รับมอบหมาย');
    }

    // 3. Fetch linked cash disbursement items
    const itemsRes = await db.execute({
      sql: `SELECT i.*, 
                   w.withdrawal_no, 
                   w.amount as voucher_total_amount, 
                   w.handover_status as voucher_handover_status,
                   w.recipient_case_worker_name, 
                   w.recipient_case_worker_id,
                   w.proof_url as voucher_proof_url,
                   w.proof_name as voucher_proof_name
            FROM cash_flow_disbursement_items i
            JOIN cash_flow_withdrawals w ON w.id = i.withdrawal_id
            WHERE i.application_id = ? AND i.status != 'cancelled'`,
      args: [applicationId],
    });

    const linkedItems = itemsRes.rows;
    const withdrawalIds = Array.from(new Set(linkedItems.map((i) => String(i.withdrawal_id))));

    // 4. Fetch handover records for linked vouchers
    let handovers: FinanceHandoverRecord[] = [];
    if (withdrawalIds.length > 0) {
      const placeholders = withdrawalIds.map(() => '?').join(',');
      const hoRes = await db.execute({
        sql: `SELECT * FROM finance_handover_records 
              WHERE withdrawal_id IN (${placeholders}) AND status != 'cancelled'
              ORDER BY handover_date DESC, handover_time DESC, created_at DESC`,
        args: withdrawalIds,
      });

      handovers = hoRes.rows.map((r) => ({
        id: String(r.id),
        withdrawalId: String(r.withdrawal_id),
        workflowId: String(r.workflow_id),
        handoverNo: String(r.handover_no),
        handoverDate: String(r.handover_date),
        handoverTime: String(r.handover_time),
        handedOverById: String(r.handed_over_by_id),
        handedOverByName: String(r.handed_over_by_name),
        receivedById: r.received_by_id ? String(r.received_by_id) : undefined,
        receivedByName: String(r.received_by_name),
        receivedByPosition: r.received_by_position ? String(r.received_by_position) : undefined,
        amount: round2(Number(r.amount || 0)),
        handoverMethod: String(r.handover_method || 'cash'),
        referenceNo: r.reference_no ? String(r.reference_no) : undefined,
        notes: r.notes ? String(r.notes) : undefined,
        proofUrl: String(r.proof_url || ''),
        proofName: String(r.proof_name || ''),
        proofSize: r.proof_size ? Number(r.proof_size) : undefined,
        proofType: r.proof_type ? String(r.proof_type) : undefined,
        status: (r.status || 'fully_handed_over') as HandoverStatus,
        cancellationReason: r.cancellation_reason ? String(r.cancellation_reason) : undefined,
        recordedById: String(r.recorded_by_id),
        recordedByName: String(r.recorded_by_name),
        confirmedById: String(r.confirmed_by_id),
        confirmedByName: String(r.confirmed_by_name),
        confirmedAt: String(r.confirmed_at || ''),
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      }));
    }

    // 5. Fetch discrepancies
    const discRes = await db.execute({
      sql: `SELECT * FROM assistance_finance_discrepancies 
            WHERE application_id = ? 
            ORDER BY reported_at DESC, created_at DESC`,
      args: [applicationId],
    });

    const discrepancies: AssistanceFinanceDiscrepancy[] = discRes.rows.map((r) => ({
      id: String(r.id),
      applicationId: String(r.application_id),
      withdrawalId: r.withdrawal_id ? String(r.withdrawal_id) : undefined,
      category: String(r.category || 'other'),
      reportedById: String(r.reported_by_id),
      reportedByName: String(r.reported_by_name),
      reportedAt: String(r.reported_at),
      expectedAmount: r.expected_amount !== null && r.expected_amount !== undefined ? round2(Number(r.expected_amount)) : undefined,
      actualAmount: r.actual_amount !== null && r.actual_amount !== undefined ? round2(Number(r.actual_amount)) : undefined,
      notes: String(r.notes),
      status: (r.status || 'pending_investigation') as any,
      resolutionNotes: r.resolution_notes ? String(r.resolution_notes) : undefined,
      resolvedById: r.resolved_by_id ? String(r.resolved_by_id) : undefined,
      resolvedByName: r.resolved_by_name ? String(r.resolved_by_name) : undefined,
      resolvedAt: r.resolved_at ? String(r.resolved_at) : undefined,
      createdAt: String(r.created_at),
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    }));

    // 6. Fetch application status history
    const histRes = await db.execute({
      sql: `SELECT * FROM application_history 
            WHERE application_id = ? 
            ORDER BY timestamp DESC`,
      args: [applicationId],
    });

    const statusHistory = histRes.rows.map((h) => ({
      status: String(h.status),
      statusLabel: String(h.status),
      timestamp: String(h.timestamp),
      changedBy: String(h.changed_by_name || 'เจ้าหน้าที่'),
      notes: h.notes ? String(h.notes) : undefined,
    }));

    // 6.5 Fetch Assistance Execution Records (TASK 3)
    let executionRecords: AssistanceExecutionRecord[] = [];
    try {
      const execRes = await db.execute({
        sql: `SELECT * FROM assistance_execution_records 
              WHERE application_id = ? 
              ORDER BY installment_no ASC, created_at ASC`,
        args: [applicationId],
      });

      executionRecords = execRes.rows.map((r) => ({
        id: String(r.id),
        applicationId: String(r.application_id),
        withdrawalId: r.withdrawal_id ? String(r.withdrawal_id) : undefined,
        workflowId: r.workflow_id ? String(r.workflow_id) : undefined,
        installmentNo: Number(r.installment_no || 1),
        totalInstallments: Number(r.total_installments || 1),
        assistanceType: String(r.assistance_type || app.assistance_type || 'เงินสงเคราะห์เพื่อการยังชีพ'),
        asnafCategory: String(r.asnaf_category || app.asnaf_category || 'fakir'),
        asnafLabel: this.ASNAF_THAI_NAMES[String(r.asnaf_category || app.asnaf_category)] || String(r.asnaf_category || app.asnaf_category),
        executionDate: String(r.execution_date),
        executionTime: String(r.execution_time),
        executionDatetime: String(r.execution_datetime || `${r.execution_date} ${r.execution_time}`),
        executorId: String(r.executor_id),
        executorName: String(r.executor_name),
        assistanceOutcome: String(r.assistance_outcome),
        actualDisbursedAmount: round2(Number(r.actual_disbursed_amount || 0)),
        actualAssistanceValue: round2(Number(r.actual_assistance_value || r.actual_disbursed_amount || 0)),
        details: r.details ? String(r.details) : undefined,
        proofUrl: r.proof_url ? String(r.proof_url) : undefined,
        proofName: r.proof_name ? String(r.proof_name) : undefined,
        proofSize: r.proof_size ? Number(r.proof_size) : undefined,
        proofType: r.proof_type ? String(r.proof_type) : undefined,
        status: (r.status || 'draft') as AssistanceOutcomeStatus,
        statusLabel: this.OUTCOME_STATUS_THAI_NAMES[(r.status || 'draft') as AssistanceOutcomeStatus] || String(r.status),
        isConfirmed: Boolean(r.is_confirmed),
        confirmationStatement: r.confirmation_statement ? String(r.confirmation_statement) : undefined,
        confirmedById: r.confirmed_by_id ? String(r.confirmed_by_id) : undefined,
        confirmedByName: r.confirmed_by_name ? String(r.confirmed_by_name) : undefined,
        confirmedAt: r.confirmed_at ? String(r.confirmed_at) : undefined,
        editReason: r.edit_reason ? String(r.edit_reason) : undefined,
        previousValues: r.previous_values ? String(r.previous_values) : undefined,
        cancellationReason: r.cancellation_reason ? String(r.cancellation_reason) : undefined,
        createdAt: String(r.created_at),
        updatedAt: r.updated_at ? String(r.updated_at) : undefined,
      }));
    } catch {}

    // 7. Calculate Financial Quantities (Strictly segregated from aid disbursement!)
    const approvedAmount = round2(Number(app.approved_amount || app.requested_amount || 0));
    
    // Withdrawn cash amount allocated to this application across linked vouchers
    let withdrawnAmount = 0;
    if (linkedItems.length > 0) {
      withdrawnAmount = round2(
        linkedItems.reduce((sum, item) => sum + round2(Number(item.this_disbursement_amount || 0)), 0)
      );
    } else if (app.disbursement_ref && app.disbursed_amount) {
      // Direct disbursement without cash workflow
      withdrawnAmount = round2(Number(app.disbursed_amount));
    }

    // Total cash handed over from finance to caseworker
    let handedOverAmount = 0;
    if (linkedItems.length > 0) {
      for (const item of linkedItems) {
        const vId = String(item.withdrawal_id);
        const itemAmount = round2(Number(item.this_disbursement_amount || 0));
        const vTotal = round2(Number(item.voucher_total_amount || itemAmount));
        const vHandovers = handovers.filter((h) => h.withdrawalId === vId && h.status !== 'error');
        const vHanded = vHandovers.reduce((sum, h) => sum + h.amount, 0);

        if (vTotal > 0 && itemAmount > 0) {
          const share = Math.min(itemAmount, round2(vHanded * (itemAmount / vTotal)));
          handedOverAmount += share;
        } else {
          handedOverAmount += Math.min(itemAmount, vHanded);
        }
      }
      handedOverAmount = Math.min(withdrawnAmount, round2(handedOverAmount));
    } else if (handovers.length > 0) {
      handedOverAmount = round2(handovers.reduce((sum, h) => sum + h.amount, 0));
    }

    // Amount actually received by caseworker
    // If active discrepancy filed with actual amount specified, reflect actual received amount
    const activeDiscrepancy = discrepancies.find((d) => d.status === 'pending_investigation' && d.actualAmount !== undefined);
    let receivedAmount = handedOverAmount;
    if (activeDiscrepancy && activeDiscrepancy.actualAmount !== undefined) {
      receivedAmount = round2(activeDiscrepancy.actualAmount);
    }

    // Actual aid disbursed to beneficiary (must NOT be automatically incremented by handover)
    const disbursedAmount = round2(Number(app.disbursed_amount || 0));
    const remainingBalance = Math.max(0, round2(approvedAmount - disbursedAmount));

    // Voucher numbers
    const voucherNos = Array.from(new Set(linkedItems.map((i) => String(i.withdrawal_no)).filter(Boolean)));
    const withdrawalNo = voucherNos.join(', ') || (app.disbursement_ref ? String(app.disbursement_ref) : 'ยังไม่มีใบสำคัญการเบิกจ่าย');

    // Handover Datetime and Proof
    let handoverDatetime: string | undefined = undefined;
    let proofUrl: string | undefined = undefined;
    let proofName: string | undefined = undefined;
    let proofSize: number | undefined = undefined;

    if (handovers.length > 0) {
      const latest = handovers[0];
      handoverDatetime = `${latest.handoverDate} ${latest.handoverTime}`;
      proofUrl = latest.proofUrl;
      proofName = latest.proofName;
      proofSize = latest.proofSize;
    } else if (linkedItems.length > 0 && linkedItems[0].voucher_proof_url) {
      proofUrl = String(linkedItems[0].voucher_proof_url);
      proofName = linkedItems[0].voucher_proof_name ? String(linkedItems[0].voucher_proof_name) : 'เอกสารใบสำคัญเบิกเงินสด.pdf';
    } else if (app.disbursement_proof_url) {
      proofUrl = String(app.disbursement_proof_url);
      proofName = 'หลักฐานการโอนสวัสดิการ.pdf';
    }

    // 8. Dual Independent Statuses Calculation (Real Data Driven)
    // Finance Status (การเงิน)
    let financeStatus: FinanceHandoverStatusType = 'not_handed_over';
    if (withdrawnAmount > 0 && handedOverAmount >= withdrawnAmount) {
      financeStatus = 'fully_handed_over';
    } else if (handedOverAmount > 0) {
      financeStatus = 'partially_handed_over';
    } else {
      financeStatus = 'not_handed_over';
    }

    const financeStatusLabel = 
      financeStatus === 'fully_handed_over' ? 'ส่งมอบครบแล้ว' :
      financeStatus === 'partially_handed_over' ? 'ส่งมอบบางส่วน' : 'ยังไม่ส่งมอบ';

    // Assistance Execution Status (การช่วยเหลือ)
    let assistanceStatus: AssistanceExecutionStatusType = 'not_started';
    const appStatus = String(app.status || '');

    if (disbursedAmount >= approvedAmount && approvedAmount > 0 || appStatus === 'disbursed' || appStatus === 'closed') {
      assistanceStatus = 'completed';
    } else if (appStatus === 'wait_confirmation') {
      assistanceStatus = 'wait_confirmation';
    } else if (disbursedAmount > 0 || (handedOverAmount > 0 && (appStatus === 'wait_disbursement' || appStatus === 'approved'))) {
      assistanceStatus = 'in_progress';
    } else {
      assistanceStatus = 'not_started';
    }

    const assistanceStatusLabel =
      assistanceStatus === 'completed' ? 'เสร็จสิ้น' :
      assistanceStatus === 'wait_confirmation' ? 'รอยืนยันผล' :
      assistanceStatus === 'in_progress' ? 'กำลังดำเนินการ' : 'ยังไม่เริ่ม';

    // Outcome Status determination (Task 3)
    let outcomeStatus: AssistanceOutcomeStatus = (app.assistance_result_status as AssistanceOutcomeStatus) || 'not_started';
    const confirmedRecords = executionRecords.filter((r) => r.isConfirmed && r.status !== 'cancelled');
    if (confirmedRecords.length > 0) {
      const latestConfirmed = confirmedRecords[confirmedRecords.length - 1];
      const allConfirmedCount = confirmedRecords.length;
      const totalRequiredInstallments = Number(app.installment_count || latestConfirmed.totalInstallments || 1);

      if (allConfirmedCount >= totalRequiredInstallments && (latestConfirmed.status === 'completed' || disbursedAmount >= approvedAmount)) {
        outcomeStatus = 'completed';
      } else if (allConfirmedCount < totalRequiredInstallments || latestConfirmed.status === 'partially_assisted') {
        outcomeStatus = 'partially_assisted';
      } else {
        outcomeStatus = latestConfirmed.status;
      }
    } else if (executionRecords.length > 0) {
      outcomeStatus = executionRecords[executionRecords.length - 1].status;
    }
    const outcomeStatusLabel = this.OUTCOME_STATUS_THAI_NAMES[outcomeStatus] || outcomeStatus;

    const asnafRaw = String(app.asnaf_category || app.beneficiary_asnaf || 'fakir');
    const asnafLabel = this.ASNAF_THAI_NAMES[asnafRaw] || asnafRaw;

    // 8.5 Check follow up plan & metadata
    let hasFollowUpPlan = false;
    let followUpStatus = 'none';
    try {
      const fupRes = await db.execute({
        sql: `SELECT status FROM follow_up_plans WHERE assistance_record_id = ? LIMIT 1`,
        args: [applicationId],
      });
      if (fupRes.rows.length > 0) {
        hasFollowUpPlan = true;
        followUpStatus = String(fupRes.rows[0].status || 'not_started');
      }
    } catch {}

    const latestExecution = executionRecords.length > 0 ? executionRecords[executionRecords.length - 1] : undefined;
    const actualAssistanceDate = latestExecution?.executionDate || (app.disbursement_date ? String(app.disbursement_date).slice(0, 10) : undefined);
    const purpose = String(app.necessity_details || app.hardship_reasons || app.assistance_type_details || app.disbursement_notes || 'ช่วยเหลือบรรเทาความเดือดร้อนตามหลักเกณฑ์');
    const appliedDate = String(app.applied_date || app.created_at || '').slice(0, 10);
    const approvedDate = app.approved_date ? String(app.approved_date).slice(0, 10) : undefined;
    const disbursementDate = app.disbursement_date ? String(app.disbursement_date).slice(0, 10) : undefined;
    const branchName = String(app.branch_name || app.beneficiary_branch_name || 'สำนักงานใหญ่ กรุงเทพมหานคร');
    const area = String(app.beneficiary_subdistrict || app.beneficiary_residence_address || '');

    return {
      applicationId: String(app.id),
      applicationNo: String(app.application_no),
      registrationNo: String(app.beneficiary_registration_no || app.registration_no || (app.national_id ? `REG-${app.national_id}` : '-')),
      beneficiaryName: String(app.beneficiary_name || 'ไม่ระบุชื่อ'),
      asnafCategory: asnafRaw,
      asnafLabel,
      assistanceType: String(app.assistance_type || 'เงินสงเคราะห์เพื่อการยังชีพ'),
      approvedAmount,
      withdrawnAmount,
      handedOverAmount,
      receivedAmount,
      disbursedAmount,
      remainingBalance,
      withdrawalNo,
      voucherNos,
      handoverDatetime,
      proofUrl,
      proofName,
      proofSize,
      financeStatus,
      financeStatusLabel,
      assistanceStatus,
      assistanceStatusLabel,
      assignedOfficerId: String(app.assigned_officer_id || ''),
      assignedOfficerName: String(app.assigned_officer_name || ''),
      recipientCaseWorkerName: handovers[0]?.receivedByName || String(app.recipient_case_worker_name || app.assigned_officer_name || ''),
      canAccess: true,
      discrepancies,
      handovers,
      disbursementItems: linkedItems.map((i) => ({
        id: String(i.id),
        withdrawalId: String(i.withdrawal_id),
        voucherNo: String(i.withdrawal_no),
        amount: round2(Number(i.this_disbursement_amount || 0)),
        status: String(i.status || 'draft'),
      })),
      statusHistory,
      outcomeStatus,
      outcomeStatusLabel,
      executionRecords,
      currentInstallment: Number(app.current_installment || (executionRecords.length > 0 ? executionRecords[executionRecords.length - 1].installmentNo : 1)),
      installmentCount: Number(app.installment_count || 1),
      appliedDate,
      approvedDate,
      disbursementDate,
      actualAssistanceDate,
      purpose,
      branchName,
      area,
      beneficiaryPhoto: '',
      hasFollowUpPlan,
      followUpStatus,
    };
  }

  /**
   * Get all assistance applications with their financial status for the actor
   * Automatically enforces caseworker RBAC (officer sees only assigned cases).
   */
  static async getAssistanceRecordsWithFinancialStatus(
    actor: ActorContext,
    filters?: {
      search?: string;
      financeStatus?: string;
      assistanceStatus?: string;
      officerId?: string;
    }
  ): Promise<AssistanceFinancialDetail[]> {
    await initDb();
    const db = getDb();

    // Fetch all assistance applications
    const appsRes = await db.execute(`
      SELECT a.*, 
             b.full_name as beneficiary_name, 
             b.registration_no as beneficiary_registration_no, 
             b.national_id, 
             b.asnaf_category as beneficiary_asnaf
      FROM assistance_applications a
      LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
      ORDER BY a.created_at DESC
    `);

    const results: AssistanceFinancialDetail[] = [];

    for (const row of appsRes.rows) {
      // Permission check per application
      if (!this.checkCaseWorkerAccess(row, actor)) {
        continue;
      }

      // Fetch financial details
      try {
        const detail = await this.getAssistanceFinancialDetails(String(row.id), actor);

        // Filter by financeStatus
        if (filters?.financeStatus && filters.financeStatus !== 'all' && detail.financeStatus !== filters.financeStatus) {
          continue;
        }

        // Filter by assistanceStatus
        if (filters?.assistanceStatus && filters.assistanceStatus !== 'all' && detail.assistanceStatus !== filters.assistanceStatus) {
          continue;
        }

        // Filter by officerId
        if (filters?.officerId && filters.officerId !== 'all' && detail.assignedOfficerId !== filters.officerId) {
          continue;
        }

        // Filter by search
        if (filters?.search && filters.search.trim()) {
          const q = filters.search.trim().toLowerCase();
          const match =
            detail.applicationNo.toLowerCase().includes(q) ||
            detail.registrationNo.toLowerCase().includes(q) ||
            detail.beneficiaryName.toLowerCase().includes(q) ||
            detail.withdrawalNo.toLowerCase().includes(q) ||
            detail.assistanceType.toLowerCase().includes(q);
          if (!match) continue;
        }

        results.push(detail);
      } catch {
        // Skip unaccessible or erroneous rows cleanly
      }
    }

    return results;
  }

  /**
   * Report Discrepancy back to Finance without altering confirmed transactions
   * Rule: Caretaker reports issue via status/checklist; confirmed numbers are NOT tampered with.
   */
  static async reportAssistanceDiscrepancy(
    applicationId: string,
    input: {
      withdrawalId?: string;
      category: 'amount_mismatch' | 'voucher_mismatch' | 'proof_mismatch' | 'other' | string;
      notes: string;
      expectedAmount?: number;
      actualAmount?: number;
    },
    actor: ActorContext
  ): Promise<{ success: boolean; discrepancyId: string }> {
    await initDb();
    const db = getDb();

    // Verify application exists and actor has access
    const appRes = await db.execute({
      sql: `SELECT a.*, b.full_name as beneficiary_name 
            FROM assistance_applications a
            LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
            WHERE a.id = ?`,
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลคำร้องขอความช่วยเหลือ');
    }

    const app = appRes.rows[0];
    if (!this.checkCaseWorkerAccess(app, actor)) {
      throw new Error('ไม่อนุญาต: คุณไม่มีสิทธิ์รายงานปัญหาสำหรับคำร้องนี้');
    }

    if (!input.notes || !input.notes.trim()) {
      throw new Error('กรุณาระบุรายละเอียดข้อผิดพลาดหรือปัญหาที่พบ');
    }

    const discrepancyId = `discrepancy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const expAmt = input.expectedAmount !== undefined ? round2(input.expectedAmount) : null;
    const actAmt = input.actualAmount !== undefined ? round2(input.actualAmount) : null;

    // Record discrepancy in assistance_finance_discrepancies
    await db.execute({
      sql: `INSERT INTO assistance_finance_discrepancies (
        id, application_id, withdrawal_id, category, reported_by_id, reported_by_name,
        reported_at, expected_amount, actual_amount, notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_investigation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        discrepancyId,
        applicationId,
        input.withdrawalId || null,
        input.category || 'amount_mismatch',
        actor.id,
        actor.name,
        timestampNow,
        expAmt,
        actAmt,
        input.notes.trim(),
      ],
    });

    // Record in Application History
    const historyId = `hist-disc-${Date.now()}`;
    await db.execute({
      sql: `INSERT INTO application_history (
        id, application_id, status, timestamp, changed_by_id, changed_by_name, notes
      ) VALUES (?, ?, 'discrepancy_reported', ?, ?, ?, ?)`,
      args: [
        historyId,
        applicationId,
        timestampNow,
        actor.id,
        actor.name,
        `ผู้ดูแลเคสรายงานปัญหายอดเงิน/หลักฐาน: ${input.notes.trim()} (ยอดที่คาดหมาย: ฿${expAmt?.toLocaleString() ?? '-'}, ยอดที่รับจริง: ฿${actAmt?.toLocaleString() ?? '-'})`,
      ],
    });

    // Audit Log for Finance & Executive Review
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'ASSISTANCE_FINANCE_DISCREPANCY_REPORTED',
        'assistance_application',
        applicationId,
        `ผู้ดูแลเคส (${actor.name}) รายงานปัญหายอดเงิน/หลักฐานการส่งมอบสำหรับคำร้อง ${app.application_no}: "${input.notes.trim()}" ส่งเรื่องให้ฝ่ายการเงินตรวจสอบโดยไม่แก้ไขธุรกรรมเดิม`,
      ],
    });

    return {
      success: true,
      discrepancyId,
    };
  }

  /**
   * Record actual aid disbursement to beneficiary by caseworker
   * Rule: Handover amount must NOT automatically be counted as aid disbursement.
   * Only this explicit call marks the aid as delivered to the beneficiary!
   */
  static async recordActualAidDisbursement(
    applicationId: string,
    input: {
      actualAmount: number;
      receiptProofUrl?: string;
      receiptProofName?: string;
      notes?: string;
      eventDatetime?: string;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const appRes = await db.execute({
      sql: `SELECT a.*, b.full_name as beneficiary_name 
            FROM assistance_applications a
            LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
            WHERE a.id = ?`,
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลคำร้องขอความช่วยเหลือ');
    }

    const app = appRes.rows[0];
    if (!this.checkCaseWorkerAccess(app, actor)) {
      throw new Error('ไม่อนุญาต: คุณไม่มีสิทธิ์บันทึกการส่งมอบความช่วยเหลือสำหรับคำร้องนี้');
    }

    const actualAmount = round2(input.actualAmount);
    if (actualAmount <= 0) {
      throw new Error('จำนวนเงินที่ส่งมอบให้ผู้รับความช่วยเหลือต้องมากกว่า 0 บาท');
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const eventDt = input.eventDatetime || timestampNow;
    const refNo = `AID-CASH-${Date.now().toString().slice(-6)}`;

    // Update assistance application
    await db.execute({
      sql: `UPDATE assistance_applications
            SET disbursed_amount = ?,
                status = 'disbursed',
                disbursement_date = ?,
                disbursed_by_id = ?,
                disbursed_by_name = ?,
                disbursement_ref = ?,
                disbursement_proof_url = ?,
                disbursement_notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        actualAmount,
        eventDt,
        actor.id,
        actor.name,
        refNo,
        input.receiptProofUrl || '',
        input.notes || 'ส่งมอบความช่วยเหลือแก่ผู้มีสิทธิ์รับซะกาตเรียบร้อย',
        applicationId,
      ],
    });

    // Insert history
    await db.execute({
      sql: `INSERT INTO application_history (
        id, application_id, status, timestamp, changed_by_id, changed_by_name, notes
      ) VALUES (?, ?, 'disbursed', ?, ?, ?, ?)`,
      args: [
        `hist-${Date.now()}`,
        applicationId,
        timestampNow,
        actor.id,
        actor.name,
        `ผู้ดูแลเคสส่งมอบความช่วยเหลือจริงแก่ผู้รับซะกาตแล้ว ฿${actualAmount.toLocaleString()} บาท (อ้างอิง: ${refNo})`,
      ],
    });

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'ASSISTANCE_AID_DISBURSED_TO_BENEFICIARY',
        'assistance_application',
        applicationId,
        `ผู้ดูแลเคส (${actor.name}) ส่งมอบความช่วยเหลือจริงแก่ ${app.beneficiary_name} จำนวน ฿${actualAmount.toLocaleString()} บาท สำเร็จ`,
      ],
    });

    return {
      success: true,
      applicationId,
      disbursedAmount: actualAmount,
      disbursementRef: refNo,
      disbursementDate: eventDt,
    };
  }

  /**
   * TASK 3: Save draft of assistance execution
   * Rule: การบันทึกร่างไม่ถือว่าช่วยเหลือเสร็จสิ้น (Draft does NOT mark assistance as completed).
   * Does NOT alter application status to completed or disbursed.
   */
  static async saveAssistanceExecutionDraft(
    input: ConfirmAssistanceInput,
    actor: ActorContext
  ): Promise<{ success: boolean; recordId: string; isDraft: boolean }> {
    await initDb();
    const db = getDb();

    // Verify application
    const appRes = await db.execute({
      sql: `SELECT a.*, b.full_name as beneficiary_name, b.asnaf_category as beneficiary_asnaf
            FROM assistance_applications a
            LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
            WHERE a.id = ?`,
      args: [input.applicationId],
    });
    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบข้อมูลคำร้องขอความช่วยเหลือ (ID: ${input.applicationId})`);
    }
    const app = appRes.rows[0];

    // Permission check
    if (!this.checkCaseWorkerAccess(app, actor)) {
      throw new Error('ไม่อนุญาต: คุณไม่มีสิทธิ์บันทึกผลการช่วยเหลือสำหรับคำร้องนี้');
    }

    const recordId = `aer-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const execDt = input.executionDate && input.executionTime ? `${input.executionDate} ${input.executionTime}` : timestampNow;
    const actualAmt = round2(Number(input.actualDisbursedAmount || 0));
    const actualVal = input.actualAssistanceValue !== undefined && input.actualAssistanceValue !== null
      ? round2(Number(input.actualAssistanceValue))
      : actualAmt;
    const installmentNo = Number(input.installmentNo || 1);
    const totalInstallments = Number(input.totalInstallments || 1);

    await db.execute({
      sql: `INSERT INTO assistance_execution_records (
        id, application_id, withdrawal_id, installment_no, total_installments,
        assistance_type, asnaf_category, execution_date, execution_time, execution_datetime,
        executor_id, executor_name, assistance_outcome, actual_disbursed_amount, actual_assistance_value,
        details, proof_url, proof_name, proof_size, proof_type, status, is_confirmed,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        recordId,
        input.applicationId,
        input.withdrawalId || null,
        installmentNo,
        totalInstallments,
        String(app.assistance_type || 'เงินสงเคราะห์เพื่อการยังชีพ'),
        String(app.asnaf_category || 'fakir'),
        input.executionDate || '',
        input.executionTime || '',
        execDt,
        actor.id,
        actor.name,
        input.assistanceOutcome || 'บันทึกแบบร่างผลการช่วยเหลือ',
        actualAmt,
        actualVal,
        input.details || null,
        input.proofUrl || null,
        input.proofName || null,
        input.proofSize || 0,
        input.proofType || 'application/pdf',
      ],
    });

    // Record in history that draft was saved
    await db.execute({
      sql: `INSERT INTO application_history (
        id, application_id, status, timestamp, changed_by_id, changed_by_name, notes
      ) VALUES (?, ?, 'draft', ?, ?, ?, ?)`,
      args: [
        `hist-draft-${Date.now()}`,
        input.applicationId,
        timestampNow,
        actor.id,
        actor.name,
        `บันทึกแบบร่างผลการดำเนินงานช่วยเหลือ (งวด ${installmentNo}/${totalInstallments}) - ยังไม่ยืนยันเสร็จสิ้น`,
      ],
    });

    return {
      success: true,
      recordId,
      isDraft: true,
    };
  }

  /**
   * TASK 3: Confirm Assistance Completion
   * Strictly enforces all 6 Pre-confirmation validations + un-prechecked checkbox verification.
   * Handles installments: does NOT mark complete until all tranches meet conditions.
   * Idempotent: does NOT create duplicate expense entries in general ledger.
   */
  static async confirmAssistanceCompletion(
    input: ConfirmAssistanceInput,
    actor: ActorContext
  ): Promise<{
    success: boolean;
    recordId: string;
    outcomeStatus: AssistanceOutcomeStatus;
    totalDisbursed: number;
    remainingBalance: number;
  }> {
    await initDb();
    const db = getDb();

    // Checkbox Validation (Mandatory)
    // Rule: “ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง”
    // Rule: Checkbox ต้องไม่ถูกเลือกไว้ล่วงหน้า และ การกด Checkbox โดยไม่มีการบันทึกสำเร็จไม่ถือว่าเสร็จสิ้น
    if (
      !input.isConfirmed ||
      !input.confirmationStatement ||
      !input.confirmationStatement.includes('ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว')
    ) {
      throw new Error('ต้องกดยืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริงก่อนบันทึก');
    }

    // Fetch application
    const appRes = await db.execute({
      sql: `SELECT a.*, b.full_name as beneficiary_name, b.asnaf_category as beneficiary_asnaf
            FROM assistance_applications a
            LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
            WHERE a.id = ?`,
      args: [input.applicationId],
    });
    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบข้อมูลคำร้องขอความช่วยเหลือ (ID: ${input.applicationId})`);
    }
    const app = appRes.rows[0];

    // Pre-check 1: Actor Permission (ผู้ใช้มีสิทธิ์บันทึกผลการช่วยเหลือ)
    if (!this.checkCaseWorkerAccess(app, actor)) {
      throw new Error('ไม่อนุญาต: คุณไม่มีสิทธิ์บันทึกผลการช่วยเหลือสำหรับคำร้องนี้');
    }

    // Pre-check 2: Associated Approval Exists (มีรายการอนุมัติที่เกี่ยวข้อง)
    const approvedAmt = round2(Number(app.approved_amount || 0));
    const appStatus = String(app.status || '');
    const validApprovalStatuses = [
      'approved',
      'wait_disbursement',
      'in_progress',
      'partially_disbursed',
      'partially_assisted',
      'wait_confirmation',
      'disbursed',
    ];
    if (approvedAmt <= 0 && !validApprovalStatuses.includes(appStatus)) {
      throw new Error('ไม่พบรายการอนุมัติที่เกี่ยวข้องสำหรับคำร้องนี้ หรือยอดอนุมัติเป็น 0 บาท');
    }

    // Pre-check 3: Execution Datetime and Outcome (มีข้อมูลวันเวลาและผลการช่วยเหลือ)
    if (!input.executionDate || !input.executionDate.trim()) {
      throw new Error('กรุณาระบุวันที่ช่วยเหลือจริง');
    }
    if (!input.executionTime || !input.executionTime.trim()) {
      throw new Error('กรุณาระบุเวลาที่ช่วยเหลือจริง');
    }
    if (!input.assistanceOutcome || !input.assistanceOutcome.trim()) {
      throw new Error('กรุณาระบุผลการช่วยเหลือ');
    }

    // Pre-check 4: Policy-compliant Real Proof Attached (มีหลักฐานตามนโยบายของประเภทความช่วยเหลือ)
    if (!input.proofUrl || !input.proofUrl.trim() || !input.proofName || !input.proofName.trim()) {
      throw new Error('กรุณาแนบไฟล์หลักฐานการช่วยเหลือจริงตามนโยบาย');
    }

    // Pre-check 5 & 6: Financial Handover & Limit Check
    const finDetail = await this.getAssistanceFinancialDetails(input.applicationId, actor);

    // Rule: มีการส่งมอบเงินจากฝ่ายการเงินตามเงื่อนไขที่กำหนด
    if (finDetail.handedOverAmount <= 0) {
      throw new Error('ไม่สามารถยืนยันผลการช่วยเหลือได้: ยังไม่มีการส่งมอบเงินสดจากฝ่ายการเงินให้ผู้ดูแลเคส');
    }

    const actualAmt = round2(Number(input.actualDisbursedAmount || 0));
    if (actualAmt <= 0) {
      throw new Error('จำนวนเงินที่ส่งมอบให้ผู้รับจริงต้องมากกว่า 0 บาท');
    }

    // Rule: จำนวนเงินที่รายงานไม่เกินยอดที่ได้รับอนุมัติและยอดที่สามารถจ่ายได้
    if (actualAmt > finDetail.approvedAmount) {
      throw new Error(`จำนวนเงินที่รายงาน (฿${actualAmt.toLocaleString()}) เกินยอดที่ได้รับอนุมัติ (฿${finDetail.approvedAmount.toLocaleString()})`);
    }

    if (actualAmt > finDetail.handedOverAmount) {
      throw new Error(`จำนวนเงินที่รายงาน (฿${actualAmt.toLocaleString()}) เกินยอดเงินสดที่ได้รับมอบจากฝ่ายการเงิน (฿${finDetail.handedOverAmount.toLocaleString()})`);
    }

    // Prevent duplicate confirmation for the same installment
    const installmentNo = Number(input.installmentNo || 1);
    const totalInstallments = Number(input.totalInstallments || 1);

    const dupCheck = await db.execute({
      sql: `SELECT id FROM assistance_execution_records 
            WHERE application_id = ? AND installment_no = ? AND is_confirmed = 1 AND status != 'cancelled'`,
      args: [input.applicationId, installmentNo],
    });
    if (dupCheck.rows.length > 0) {
      throw new Error(`งวดที่ ${installmentNo} ได้รับการยืนยันผลการช่วยเหลือไปแล้ว หากต้องการแก้ไขข้อมูล กรุณาใช้กระบวนการแก้ไขพร้อมระบุเหตุผล`);
    }

    // Check previously confirmed amounts across other installments
    const prevSumRes = await db.execute({
      sql: `SELECT SUM(actual_disbursed_amount) as prev_disbursed 
            FROM assistance_execution_records 
            WHERE application_id = ? AND is_confirmed = 1 AND status != 'cancelled'`,
      args: [input.applicationId],
    });
    const prevDisbursed = round2(Number(prevSumRes.rows[0]?.prev_disbursed || 0));
    const projectedTotal = round2(prevDisbursed + actualAmt);

    if (projectedTotal > finDetail.approvedAmount) {
      throw new Error(`ยอดรวมเมื่อรวมงวดนี้ (฿${projectedTotal.toLocaleString()}) เกินยอดที่ได้รับอนุมัติทั้งหมด (฿${finDetail.approvedAmount.toLocaleString()})`);
    }
    if (projectedTotal > finDetail.handedOverAmount) {
      throw new Error(`ยอดรวมเมื่อรวมงวดนี้ (฿${projectedTotal.toLocaleString()}) เกินยอดเงินสดที่ได้รับมอบจากฝ่ายการเงินทั้งหมด (฿${finDetail.handedOverAmount.toLocaleString()})`);
    }

    // Installment logic & Outcome Status
    const isLastInstallment = installmentNo >= totalInstallments;
    let outcomeStatus: AssistanceOutcomeStatus = input.status || 'completed';

    // Rule: การช่วยเหลือที่จ่ายเป็นงวดต้องสามารถบันทึกผลแต่ละงวดได้ โดยไม่เปลี่ยนสถานะเป็นเสร็จสิ้นทั้งหมดจนกว่าจะครบเงื่อนไข
    if (!isLastInstallment && (outcomeStatus === 'completed' || !input.status)) {
      outcomeStatus = 'partially_assisted';
    } else if (isLastInstallment && (!input.status || input.status === 'in_progress')) {
      outcomeStatus = 'completed';
    }

    const actualVal = input.actualAssistanceValue !== undefined && input.actualAssistanceValue !== null && input.actualAssistanceValue > 0
      ? round2(Number(input.actualAssistanceValue))
      : actualAmt;

    const recordId = `aer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const execDt = `${input.executionDate} ${input.executionTime}`;

    // Insert record
    await db.execute({
      sql: `INSERT INTO assistance_execution_records (
        id, application_id, withdrawal_id, workflow_id, installment_no, total_installments,
        assistance_type, asnaf_category, execution_date, execution_time, execution_datetime,
        executor_id, executor_name, assistance_outcome, actual_disbursed_amount, actual_assistance_value,
        details, proof_url, proof_name, proof_size, proof_type, status, is_confirmed,
        confirmation_statement, confirmed_by_id, confirmed_by_name, confirmed_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        recordId,
        input.applicationId,
        input.withdrawalId || finDetail.disbursementItems[0]?.withdrawalId || null,
        finDetail.handovers[0]?.workflowId || null,
        installmentNo,
        totalInstallments,
        String(app.assistance_type || 'เงินสงเคราะห์เพื่อการยังชีพ'),
        String(app.asnaf_category || 'fakir'),
        input.executionDate,
        input.executionTime,
        execDt,
        actor.id,
        actor.name,
        input.assistanceOutcome.trim(),
        actualAmt,
        actualVal,
        input.details || null,
        input.proofUrl,
        input.proofName,
        input.proofSize || 0,
        input.proofType || 'application/pdf',
        outcomeStatus,
        input.confirmationStatement,
        actor.id,
        actor.name,
        timestampNow,
      ],
    });

    // Update assistance application
    const appNewStatus = (outcomeStatus === 'completed' && projectedTotal >= finDetail.approvedAmount) || isLastInstallment && outcomeStatus === 'completed'
      ? 'disbursed'
      : (outcomeStatus === 'partially_assisted' ? 'partially_disbursed' : String(app.status));
    const remainingBalance = Math.max(0, round2(finDetail.approvedAmount - projectedTotal));

    await db.execute({
      sql: `UPDATE assistance_applications
            SET disbursed_amount = ?,
                actual_assistance_value = ?,
                assistance_result_status = ?,
                assistance_outcome = ?,
                status = ?,
                current_installment = ?,
                installment_count = ?,
                execution_confirmed_at = ?,
                execution_confirmed_by_id = ?,
                execution_confirmed_by_name = ?,
                disbursement_date = ?,
                disbursed_by_id = ?,
                disbursed_by_name = ?,
                disbursement_proof_url = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        projectedTotal,
        actualVal,
        outcomeStatus,
        input.assistanceOutcome.trim(),
        appNewStatus,
        installmentNo,
        totalInstallments,
        timestampNow,
        actor.id,
        actor.name,
        execDt,
        actor.id,
        actor.name,
        input.proofUrl,
        input.applicationId,
      ],
    });

    // Application History
    await db.execute({
      sql: `INSERT INTO application_history (
        id, application_id, status, timestamp, changed_by_id, changed_by_name, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-aer-${Date.now()}`,
        input.applicationId,
        outcomeStatus,
        timestampNow,
        actor.id,
        actor.name,
        `ยืนยันผลการช่วยเหลือ (งวด ${installmentNo}/${totalInstallments}): ${input.assistanceOutcome.trim()} จำนวนเงินจริง ฿${actualAmt.toLocaleString()} สถานะ: ${this.OUTCOME_STATUS_THAI_NAMES[outcomeStatus]} โดย ${actor.name}`,
      ],
    });

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'ASSISTANCE_EXECUTION_CONFIRMED',
        'assistance_execution_records',
        recordId,
        `ยืนยันผลการช่วยเหลือสำเร็จสำหรับคำร้อง ${app.application_no} (งวด ${installmentNo}/${totalInstallments}) ผู้ยืนยัน: ${actor.name} ยอดเงิน: ฿${actualAmt.toLocaleString()} สถานะ: ${outcomeStatus}`,
      ],
    });

    return {
      success: true,
      recordId,
      outcomeStatus,
      totalDisbursed: projectedTotal,
      remainingBalance,
    };
  }

  /**
   * TASK 3: Edit Confirmed Assistance Completion
   * Rule: หากต้องแก้ไขผลที่ยืนยันแล้ว ให้ใช้กระบวนการแก้ไขพร้อมเหตุผลและประวัติ
   * Requires non-empty editReason, snapshots old values, preserves full audit trail.
   */
  static async editConfirmedAssistanceCompletion(
    recordId: string,
    input: Partial<ConfirmAssistanceInput> & { editReason: string },
    actor: ActorContext
  ): Promise<{ success: boolean; recordId: string }> {
    await initDb();
    const db = getDb();

    if (!input.editReason || !input.editReason.trim()) {
      throw new Error('การแก้ไขผลการช่วยเหลือที่ยืนยันแล้ว ต้องระบุเหตุผลการแก้ไขเสมอ');
    }

    const recRes = await db.execute({
      sql: `SELECT * FROM assistance_execution_records WHERE id = ?`,
      args: [recordId],
    });
    if (recRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลบันทึกผลการช่วยเหลือที่ต้องการแก้ไข');
    }
    const current = recRes.rows[0];

    // Fetch application
    const appRes = await db.execute({
      sql: `SELECT a.*, b.full_name as beneficiary_name FROM assistance_applications a
            LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id WHERE a.id = ?`,
      args: [current.application_id],
    });
    if (appRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลคำร้องขอความช่วยเหลือที่เกี่ยวข้อง');
    }
    const app = appRes.rows[0];

    if (!this.checkCaseWorkerAccess(app, actor)) {
      throw new Error('ไม่อนุญาต: คุณไม่มีสิทธิ์แก้ไขผลการช่วยเหลือนี้');
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    // Snapshot old values
    const oldSnapshot = {
      executionDate: current.execution_date,
      executionTime: current.execution_time,
      assistanceOutcome: current.assistance_outcome,
      actualDisbursedAmount: Number(current.actual_disbursed_amount),
      actualAssistanceValue: Number(current.actual_assistance_value),
      details: current.details,
      proofUrl: current.proof_url,
      proofName: current.proof_name,
      status: current.status,
      snapshotTimestamp: timestampNow,
      snapshotActor: actor.name,
      editReason: input.editReason.trim(),
    };

    let previousSnapshots: any[] = [];
    if (current.previous_values) {
      try {
        previousSnapshots = JSON.parse(String(current.previous_values));
      } catch {}
    }
    previousSnapshots.push(oldSnapshot);

    const newExecDate = input.executionDate || String(current.execution_date);
    const newExecTime = input.executionTime || String(current.execution_time);
    const newOutcome = input.assistanceOutcome !== undefined ? input.assistanceOutcome.trim() : String(current.assistance_outcome);
    const newDisbursed = input.actualDisbursedAmount !== undefined ? round2(Number(input.actualDisbursedAmount)) : Number(current.actual_disbursed_amount);
    const newAssistanceValue = input.actualAssistanceValue !== undefined ? round2(Number(input.actualAssistanceValue)) : Number(current.actual_assistance_value);
    const newDetails = input.details !== undefined ? input.details : current.details;
    const newProofUrl = input.proofUrl || current.proof_url;
    const newProofName = input.proofName || current.proof_name;
    const newStatus = input.status || (current.status as AssistanceOutcomeStatus);

    await db.execute({
      sql: `UPDATE assistance_execution_records
            SET execution_date = ?,
                execution_time = ?,
                execution_datetime = ?,
                assistance_outcome = ?,
                actual_disbursed_amount = ?,
                actual_assistance_value = ?,
                details = ?,
                proof_url = ?,
                proof_name = ?,
                status = ?,
                edit_reason = ?,
                previous_values = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        newExecDate,
        newExecTime,
        `${newExecDate} ${newExecTime}`,
        newOutcome,
        newDisbursed,
        newAssistanceValue,
        newDetails,
        newProofUrl,
        newProofName,
        newStatus,
        input.editReason.trim(),
        JSON.stringify(previousSnapshots),
        recordId,
      ],
    });

    // Recalculate total disbursed for application
    const sumRes = await db.execute({
      sql: `SELECT SUM(actual_disbursed_amount) as total_disbursed, SUM(actual_assistance_value) as total_value
            FROM assistance_execution_records
            WHERE application_id = ? AND is_confirmed = 1 AND status != 'cancelled'`,
      args: [current.application_id],
    });
    const totalDisbursed = round2(Number(sumRes.rows[0]?.total_disbursed || newDisbursed));
    const totalValue = round2(Number(sumRes.rows[0]?.total_value || newAssistanceValue));

    await db.execute({
      sql: `UPDATE assistance_applications
            SET disbursed_amount = ?,
                actual_assistance_value = ?,
                assistance_result_status = ?,
                assistance_outcome = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        totalDisbursed,
        totalValue,
        newStatus,
        newOutcome,
        current.application_id,
      ],
    });

    // Application History
    await db.execute({
      sql: `INSERT INTO application_history (
        id, application_id, status, timestamp, changed_by_id, changed_by_name, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `hist-aer-edit-${Date.now()}`,
        current.application_id,
        newStatus,
        timestampNow,
        actor.id,
        actor.name,
        `แก้ไขผลการช่วยเหลือที่ยืนยันแล้ว: เหตุผล "${input.editReason.trim()}" (เดิม: ฿${current.actual_disbursed_amount} -> ใหม่: ฿${newDisbursed}) โดย ${actor.name}`,
      ],
    });

    // Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        'ASSISTANCE_EXECUTION_EDITED',
        'assistance_execution_records',
        recordId,
        `ผู้ใช้ ${actor.name} แก้ไขผลการช่วยเหลือที่ยืนยันแล้ว คำร้อง ${app.application_no} เหตุผล: "${input.editReason.trim()}"`,
      ],
    });

    return {
      success: true,
      recordId,
    };
  }

  /**
   * TASK 3: Cancel Assistance Execution with reason
   */
  static async cancelAssistanceExecution(
    recordId: string,
    cancellationReason: string,
    actor: ActorContext
  ): Promise<{ success: boolean; recordId: string }> {
    await initDb();
    const db = getDb();

    if (!cancellationReason || !cancellationReason.trim()) {
      throw new Error('กรุณาระบุเหตุผลในการยกเลิกผลการช่วยเหลือ');
    }

    const recRes = await db.execute({
      sql: `SELECT * FROM assistance_execution_records WHERE id = ?`,
      args: [recordId],
    });
    if (recRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลบันทึกผลการช่วยเหลือ');
    }
    const record = recRes.rows[0];

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });

    await db.execute({
      sql: `UPDATE assistance_execution_records
            SET status = 'cancelled',
                cancellation_reason = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [cancellationReason.trim(), recordId],
    });

    // Recalculate application disbursed amounts
    const sumRes = await db.execute({
      sql: `SELECT SUM(actual_disbursed_amount) as total_disbursed, SUM(actual_assistance_value) as total_value
            FROM assistance_execution_records
            WHERE application_id = ? AND is_confirmed = 1 AND status != 'cancelled'`,
      args: [record.application_id],
    });
    const totalDisbursed = round2(Number(sumRes.rows[0]?.total_disbursed || 0));
    const totalValue = round2(Number(sumRes.rows[0]?.total_value || 0));

    await db.execute({
      sql: `UPDATE assistance_applications
            SET disbursed_amount = ?,
                actual_assistance_value = ?,
                assistance_result_status = 'cancelled',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [totalDisbursed, totalValue, record.application_id],
    });

    // Application History
    await db.execute({
      sql: `INSERT INTO application_history (
        id, application_id, status, timestamp, changed_by_id, changed_by_name, notes
      ) VALUES (?, ?, 'cancelled', ?, ?, ?, ?)`,
      args: [
        `hist-cancel-${Date.now()}`,
        record.application_id,
        timestampNow,
        actor.id,
        actor.name,
        `ยกเลิกผลการช่วยเหลือ (งวด ${record.installment_no}) เหตุผล: ${cancellationReason.trim()} โดย ${actor.name}`,
      ],
    });

    return {
      success: true,
      recordId,
    };
  }

  /**
   * TASK 3: Fetch execution records for an application
   */
  static async getAssistanceExecutionRecords(
    applicationId: string,
    actor: ActorContext
  ): Promise<AssistanceExecutionRecord[]> {
    await initDb();
    const db = getDb();

    const appRes = await db.execute({
      sql: `SELECT * FROM assistance_applications WHERE id = ?`,
      args: [applicationId],
    });
    if (appRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลคำร้องขอความช่วยเหลือ');
    }
    const app = appRes.rows[0];
    if (!this.checkCaseWorkerAccess(app, actor)) {
      throw new Error('ไม่อนุญาต: คุณไม่มีสิทธิ์เข้าถึงข้อมูลผลการช่วยเหลือนี้');
    }

    const execRes = await db.execute({
      sql: `SELECT * FROM assistance_execution_records 
            WHERE application_id = ? 
            ORDER BY installment_no ASC, created_at ASC`,
      args: [applicationId],
    });

    return execRes.rows.map((r) => ({
      id: String(r.id),
      applicationId: String(r.application_id),
      withdrawalId: r.withdrawal_id ? String(r.withdrawal_id) : undefined,
      workflowId: r.workflow_id ? String(r.workflow_id) : undefined,
      installmentNo: Number(r.installment_no || 1),
      totalInstallments: Number(r.total_installments || 1),
      assistanceType: String(r.assistance_type || app.assistance_type || 'เงินสงเคราะห์เพื่อการยังชีพ'),
      asnafCategory: String(r.asnaf_category || app.asnaf_category || 'fakir'),
      asnafLabel: this.ASNAF_THAI_NAMES[String(r.asnaf_category || app.asnaf_category)] || String(r.asnaf_category || app.asnaf_category),
      executionDate: String(r.execution_date),
      executionTime: String(r.execution_time),
      executionDatetime: String(r.execution_datetime || `${r.execution_date} ${r.execution_time}`),
      executorId: String(r.executor_id),
      executorName: String(r.executor_name),
      assistanceOutcome: String(r.assistance_outcome),
      actualDisbursedAmount: round2(Number(r.actual_disbursed_amount || 0)),
      actualAssistanceValue: round2(Number(r.actual_assistance_value || r.actual_disbursed_amount || 0)),
      details: r.details ? String(r.details) : undefined,
      proofUrl: r.proof_url ? String(r.proof_url) : undefined,
      proofName: r.proof_name ? String(r.proof_name) : undefined,
      proofSize: r.proof_size ? Number(r.proof_size) : undefined,
      proofType: r.proof_type ? String(r.proof_type) : undefined,
      status: (r.status || 'draft') as AssistanceOutcomeStatus,
      statusLabel: this.OUTCOME_STATUS_THAI_NAMES[(r.status || 'draft') as AssistanceOutcomeStatus] || String(r.status),
      isConfirmed: Boolean(r.is_confirmed),
      confirmationStatement: r.confirmation_statement ? String(r.confirmation_statement) : undefined,
      confirmedById: r.confirmed_by_id ? String(r.confirmed_by_id) : undefined,
      confirmedByName: r.confirmed_by_name ? String(r.confirmed_by_name) : undefined,
      confirmedAt: r.confirmed_at ? String(r.confirmed_at) : undefined,
      editReason: r.edit_reason ? String(r.edit_reason) : undefined,
      previousValues: r.previous_values ? String(r.previous_values) : undefined,
      cancellationReason: r.cancellation_reason ? String(r.cancellation_reason) : undefined,
      createdAt: String(r.created_at),
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    }));
  }

  // =========================================================================
  // TASK 4: Verified Assistance Expenses, Asnaf Breakdown & Refund Ledger
  // =========================================================================

  static readonly CANONICAL_ASNAFS: Array<{ code: string; name: string; defaultPct: number }> = [
    { code: 'faqir_miskin', name: 'ฟากีร–มิสกิน (ผู้ยากไร้และขัดสน)', defaultPct: 70.0 },
    { code: 'amil', name: 'อามีลีน (เจ้าหน้าที่จัดการซะกาต)', defaultPct: 12.0 },
    { code: 'muallaf', name: 'มุสลิมใหม่ (มุอัลลัฟ)', defaultPct: 3.0 },
    { code: 'gharimin', name: 'ผู้มีหนี้สินล้นตัว (อัล-ฆอรีมีน)', defaultPct: 3.0 },
    { code: 'fisabilillah', name: 'ฟีสาบิลิลละฮฺ (ในหนทางของอัลลอฮ์)', defaultPct: 7.0 },
    { code: 'ibnsabil', name: 'ผู้เดินทาง/ผู้พลัดถิ่น (อิบนุสสะบีล)', defaultPct: 1.0 },
    { code: 'humanitarian', name: 'มนุษยธรรม', defaultPct: 4.0 },
  ];

  /**
   * Normalizes raw asnaf strings or categories to canonical DB codes
   */
  static normalizeAsnafCode(rawAsnaf?: string | null): string {
    if (!rawAsnaf) return 'faqir_miskin';
    const clean = rawAsnaf.trim().toLowerCase();

    if (
      clean === 'faqir_miskin' ||
      clean === 'fakir' ||
      clean === 'faqir' ||
      clean === 'miskin' ||
      clean.includes('ฟากีร') ||
      clean.includes('มิสกิน') ||
      clean.includes('ผู้ยากไร้') ||
      clean.includes('ขัดสน') ||
      clean.includes('ยากไร้')
    ) {
      return 'faqir_miskin';
    }
    if (
      clean === 'amil' ||
      clean.includes('อามิล') ||
      clean.includes('อามีลีน') ||
      clean.includes('เจ้าหน้าที่')
    ) {
      return 'amil';
    }
    if (
      clean === 'muallaf' ||
      clean.includes('มุอัลลัฟ') ||
      clean.includes('มุสลิมใหม่') ||
      clean.includes('อิสลามใหม่')
    ) {
      return 'muallaf';
    }
    if (
      clean === 'gharimin' ||
      clean === 'gharimun' ||
      clean.includes('กอริมีน') ||
      clean.includes('ฆอริม') ||
      clean.includes('หนี้สิน') ||
      clean.includes('มีหนี้')
    ) {
      return 'gharimin';
    }
    if (
      clean === 'fisabilillah' ||
      clean.includes('ฟีสะบีลิล') ||
      clean.includes('ฟีสาบิลิล') ||
      clean.includes('หนทางของอัลลอฮ')
    ) {
      return 'fisabilillah';
    }
    if (
      clean === 'ibnsabil' ||
      clean === 'ibn_sabil' ||
      clean.includes('อิบนุ') ||
      clean.includes('ผู้เดินทาง') ||
      clean.includes('พลัดถิ่น')
    ) {
      return 'ibnsabil';
    }
    if (
      clean === 'humanitarian' ||
      clean.includes('มนุษยธรรม') ||
      clean.includes('ภัยพิบัติ') ||
      clean.includes('ผู้ลี้ภัย')
    ) {
      return 'humanitarian';
    }
    if (clean === 'riqab' || clean.includes('ทาส')) {
      return 'faqir_miskin';
    }

    const found = this.CANONICAL_ASNAFS.find(
      (a) => a.code === clean || a.name.toLowerCase().includes(clean)
    );
    if (found) return found.code;

    return 'faqir_miskin';
  }

  /**
   * Matches raw assistance type string or code with configured types
   */
  static matchAssistanceType(
    rawType: string | undefined | null,
    allDbTypes: Array<{ id: string; code: string; name: string; category?: string; category_label?: string }>
  ): { id: string; code: string; name: string; category: string; categoryLabel: string } {
    if (!rawType || !rawType.trim()) {
      const defaultType = allDbTypes.find((t) => t.code === 'LIVING_SUPPORT') || {
        id: 'ast-core-1',
        code: 'LIVING_SUPPORT',
        name: 'ปัจจัยยังชีพ',
        category: 'cash',
        category_label: 'เงินสงเคราะห์/สิ่งของยังชีพ',
      };
      return {
        id: defaultType.id,
        code: defaultType.code,
        name: defaultType.name,
        category: defaultType.category || 'cash',
        categoryLabel: defaultType.category_label || 'เงินสงเคราะห์',
      };
    }

    const clean = rawType.trim();
    const cleanLower = clean.toLowerCase();

    // 1. Exact match on code or name
    const exact = allDbTypes.find(
      (t) => t.code.toLowerCase() === cleanLower || t.name === clean
    );
    if (exact) {
      return {
        id: exact.id,
        code: exact.code,
        name: exact.name,
        category: exact.category || 'cash',
        categoryLabel: exact.category_label || 'สวัสดิการ',
      };
    }

    // 2. Keyword matching to standard types
    const stdKeywordMap: Array<{ keywords: string[]; code: string }> = [
      { keywords: ['ยังชีพ', 'อาหาร', 'ข้าวสาร', 'ดำรงชีพ'], code: 'LIVING_SUPPORT' },
      { keywords: ['รายเดือน', 'ต่อเนื่อง', 'ผู้สูงอายุ', 'ผู้พิการ'], code: 'MONTHLY_ALLOWANCE' },
      { keywords: ['ซ่อม', 'สร้าง', 'บ้าน', 'ที่อยู่อาศัย', 'หลังคา', 'ห้องน้ำ'], code: 'HOUSING_REPAIR_BUILD' },
      { keywords: ['อาชีพ', 'เครื่องมือ', 'ทุนหมุนเวียน', 'ค้าขาย'], code: 'CAREER_SUPPORT' },
      { keywords: ['การศึกษา', 'ทุนเรียน', 'ค่าเล่าเรียน', 'ชุดนักเรียน', 'อุปกรณ์การเรียน'], code: 'EDUCATION_GRANT' },
      { keywords: ['ฉุกเฉิน', 'ภัยพิบัติ', 'อัคคีภัย', 'วาตภัย', 'อุทกภัย', 'น้ำท่วม', 'ไฟไหม้', 'อุบัติภัย'], code: 'EMERGENCY_AID' },
      { keywords: ['มุสลิมใหม่', 'มุอัลลัฟ', 'เข้ารับอิสลาม'], code: 'MUALLAF_SUPPORT' },
      { keywords: ['มนุษยธรรม', 'ผู้ลี้ภัย', 'ไร้ที่พึ่ง'], code: 'HUMANITARIAN_AID' },
      { keywords: ['หนี้สิน', 'ฆอริม', 'กอริม', 'ปลดหนี้'], code: 'GHARIMUN_DEBT' },
      { keywords: ['เดินทาง', 'อิบนุ', 'พลัดถิ่น', 'ตั๋ว'], code: 'IBN_SABIL' },
    ];

    for (const item of stdKeywordMap) {
      if (item.keywords.some((kw) => cleanLower.includes(kw.toLowerCase()))) {
        const match = allDbTypes.find((t) => t.code === item.code);
        if (match) {
          return {
            id: match.id,
            code: match.code,
            name: match.name,
            category: match.category || 'cash',
            categoryLabel: match.category_label || 'สวัสดิการ',
          };
        }
      }
    }

    // 3. Substring match
    const partial = allDbTypes.find(
      (t) => cleanLower.includes(t.code.toLowerCase()) || clean.includes(t.name) || t.name.includes(clean)
    );
    if (partial) {
      return {
        id: partial.id,
        code: partial.code,
        name: partial.name,
        category: partial.category || 'cash',
        categoryLabel: partial.category_label || 'สวัสดิการ',
      };
    }

    // Fallback: Custom Type
    const customCode = `CUSTOM_${clean.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
    return {
      id: `custom-${clean}`,
      code: customCode,
      name: clean,
      category: 'other',
      categoryLabel: 'ประเภทอื่นๆ',
    };
  }

  /**
   * Calculates verified actual aid expenses segregated by Asnaf and Assistance Type,
   * accounting for handovers, actual executions, refunds, and preventing double-counting.
   */
  static async calculateVerifiedAidExpenses(filters?: {
    zakatYear?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<VerifiedAidCalculationResult> {
    await initDb();
    const db = getDb();

    // 0. Load assistance types from database
    const typesRes = await db.execute(`
      SELECT id, code, name, category, description, type_group
      FROM assistance_types
      ORDER BY order_index ASC
    `);
    const allTypes = typesRes.rows.map((r) => ({
      id: String(r.id),
      code: String(r.code),
      name: String(r.name),
      category: String(r.category || 'cash'),
      category_label: String(r.category || 'cash'),
    }));

    // Canonical Asnaf Name Map
    const asnafNameMap = new Map<string, string>();
    for (const a of this.CANONICAL_ASNAFS) {
      asnafNameMap.set(a.code, a.name);
    }

    // Fetch Asnaf allocations targets
    const fiscalYear = filters?.zakatYear || '2569';
    const allocRes = await db.execute({
      sql: 'SELECT * FROM asnaf_allocations WHERE fiscal_year = ?',
      args: [fiscalYear],
    });
    const asnafAllocMap = new Map<string, { pct: number; target: number; alloc: number }>();
    const poolRes = await db.execute(`
      SELECT SUM(total_received) as pool FROM fund_accounts WHERE category = 'zakat'
    `);
    const totalZakatPool = Number(poolRes.rows[0]?.pool) || 0;
    for (const r of allocRes.rows) {
      const code = String(r.asnaf_code);
      const pct = Number(r.percentage);
      const target = round2((totalZakatPool * pct) / 100);
      const alloc = round2(Number(r.allocated_amount) || target);
      asnafAllocMap.set(code, { pct, target, alloc });
    }

    // Drill down item buckets
    const verifiedAidItems: AidDrillDownItem[] = [];
    const handedOverItems: AidDrillDownItem[] = [];
    const inProgressItems: AidDrillDownItem[] = [];
    const completedItems: AidDrillDownItem[] = [];
    const unspentHeldItems: AidDrillDownItem[] = [];
    const refundItems: AidDrillDownItem[] = [];
    const missingProofItems: MissingProofItem[] = [];
    const missingProofDrillDownItems: AidDrillDownItem[] = [];

    const appsWithConfirmedExec = new Set<string>();

    // 1. Confirmed Assistance Execution Records (TASK 3 verified field records)
    let execSql = `
      SELECT e.*, 
             a.application_no, a.beneficiary_id, b.full_name as beneficiary_name, b.national_id, 
             a.asnaf_category as app_asnaf, a.assistance_type as app_assistance_type,
             a.status as app_status, a.approved_amount as app_approved_amount,
             w.withdrawal_no, w.workflow_id as w_workflow_id,
             wf.workflow_no
      FROM assistance_execution_records e
      LEFT JOIN assistance_applications a ON e.application_id = a.id
      LEFT JOIN beneficiaries b ON a.beneficiary_id = b.id
      LEFT JOIN cash_flow_withdrawals w ON e.withdrawal_id = w.id
      LEFT JOIN cash_flow_workflows wf ON (e.workflow_id = wf.id OR w.workflow_id = wf.id)
      WHERE e.is_confirmed = 1 AND e.status != 'cancelled'
    `;
    const execArgs: any[] = [];
    if (filters?.zakatYear) {
      const y = filters.zakatYear.trim();
      const gy = (Number(y) > 2400 ? Number(y) - 543 : Number(y)).toString();
      execSql += ` AND (e.execution_date LIKE ? OR e.execution_date LIKE ? OR a.application_no LIKE ? OR a.created_at LIKE ?)`;
      execArgs.push(`%${y}%`, `%${gy}%`, `%${y}%`, `%${gy}%`);
    }
    if (filters?.startDate) {
      execSql += ` AND e.execution_date >= ?`;
      execArgs.push(filters.startDate);
    }
    if (filters?.endDate) {
      execSql += ` AND e.execution_date <= ?`;
      execArgs.push(filters.endDate);
    }
    execSql += ` ORDER BY e.execution_date ASC, e.execution_time ASC`;

    const execRes = await db.execute({ sql: execSql, args: execArgs });

    for (const r of execRes.rows) {
      const appId = String(r.application_id);
      appsWithConfirmedExec.add(appId);

      const amount = round2(Number(r.actual_disbursed_amount || 0));
      const value = round2(Number(r.actual_assistance_value || amount));
      const asnafCode = this.normalizeAsnafCode(String(r.asnaf_category || r.app_asnaf));
      const asnafName = asnafNameMap.get(asnafCode) || asnafCode;
      const typeObj = this.matchAssistanceType(String(r.assistance_type || r.app_assistance_type), allTypes);
      const hasValidProof = Boolean(r.proof_url && String(r.proof_url).trim().length > 0);

      const item: AidDrillDownItem = {
        id: `exec-${r.id}`,
        recordType: 'execution_record',
        recordId: String(r.id),
        applicationId: appId,
        applicationNo: r.application_no ? String(r.application_no) : undefined,
        beneficiaryId: r.beneficiary_id ? String(r.beneficiary_id) : undefined,
        beneficiaryName: String(r.beneficiary_name || 'ไม่ระบุชื่อ'),
        nationalId: r.national_id ? String(r.national_id) : undefined,
        withdrawalId: r.withdrawal_id ? String(r.withdrawal_id) : undefined,
        withdrawalNo: r.withdrawal_no ? String(r.withdrawal_no) : undefined,
        workflowId: r.workflow_id ? String(r.workflow_id) : undefined,
        workflowNo: r.workflow_no ? String(r.workflow_no) : undefined,
        asnafCode,
        asnafName,
        assistanceTypeCode: typeObj.code,
        assistanceTypeName: typeObj.name,
        amount,
        actualAssistanceValue: value,
        eventDate: String(r.execution_date),
        eventDatetime: String(r.execution_datetime || `${r.execution_date} ${r.execution_time}`),
        caseWorkerId: r.executor_id ? String(r.executor_id) : undefined,
        caseWorkerName: String(r.executor_name || 'เจ้าหน้าที่'),
        status: String(r.status),
        statusLabel: this.OUTCOME_STATUS_THAI_NAMES[(r.status || 'completed') as AssistanceOutcomeStatus] || String(r.status),
        hasValidProof,
        proofUrl: r.proof_url ? String(r.proof_url) : undefined,
        proofName: r.proof_name ? String(r.proof_name) : undefined,
        details: r.details ? String(r.details) : undefined,
        installmentInfo: `งวดที่ ${r.installment_no || 1}/${r.total_installments || 1}`,
      };

      verifiedAidItems.push(item);

      if (item.status === 'completed') {
        completedItems.push(item);
      } else {
        inProgressItems.push(item);
      }

      if (!hasValidProof) {
        missingProofItems.push({
          id: `mp-exec-${r.id}`,
          sourceType: 'execution',
          applicationNo: item.applicationNo || '-',
          beneficiaryName: item.beneficiaryName,
          withdrawalNo: item.withdrawalNo,
          amount: item.amount,
          eventDate: item.eventDate,
          officerName: item.caseWorkerName || 'เจ้าหน้าที่',
          issueDescription: 'ยังไม่ได้แนบหลักฐานภาพถ่ายการส่งมอบความช่วยเหลือจริง',
        });
        missingProofDrillDownItems.push(item);
      }
    }

    // 2. Direct Bank Transfers by Finance (Excluded if app already has confirmed execution records)
    let directSql = `
      SELECT a.*, b.full_name as beneficiary_name, b.national_id
      FROM assistance_applications a
      LEFT JOIN beneficiaries b ON a.beneficiary_id = b.id
      WHERE a.status IN ('disbursed', 'completed')
        AND a.disbursed_amount > 0
    `;
    const directArgs: any[] = [];
    if (filters?.zakatYear) {
      const y = filters.zakatYear.trim();
      const gy = (Number(y) > 2400 ? Number(y) - 543 : Number(y)).toString();
      directSql += ` AND (a.disbursement_date LIKE ? OR a.disbursement_date LIKE ? OR a.created_at LIKE ? OR a.application_no LIKE ?)`;
      directArgs.push(`%${y}%`, `%${gy}%`, `%${gy}%`, `%${y}%`);
    }
    const directRes = await db.execute({ sql: directSql, args: directArgs });

    for (const a of directRes.rows) {
      const appId = String(a.id);
      if (appsWithConfirmedExec.has(appId)) {
        // PREVENT DOUBLE-COUNTING: already counted from confirmed execution records
        continue;
      }

      const amount = round2(Number(a.disbursed_amount || 0));
      if (amount <= 0) continue;

      const asnafCode = this.normalizeAsnafCode(String(a.asnaf_category));
      const asnafName = asnafNameMap.get(asnafCode) || asnafCode;
      const typeObj = this.matchAssistanceType(String(a.assistance_type), allTypes);
      const hasValidProof = Boolean(a.disbursement_proof_url && String(a.disbursement_proof_url).trim().length > 0 && a.disbursement_ref);

      const item: AidDrillDownItem = {
        id: `direct-${a.id}`,
        recordType: 'direct_disbursement',
        recordId: appId,
        applicationId: appId,
        applicationNo: a.application_no ? String(a.application_no) : undefined,
        beneficiaryId: a.beneficiary_id ? String(a.beneficiary_id) : undefined,
        beneficiaryName: String(a.beneficiary_name || 'ไม่ระบุชื่อ'),
        nationalId: a.national_id ? String(a.national_id) : undefined,
        withdrawalId: a.withdrawal_id ? String(a.withdrawal_id) : undefined,
        withdrawalNo: a.withdrawal_no ? String(a.withdrawal_no) : undefined,
        workflowId: a.workflow_id ? String(a.workflow_id) : undefined,
        workflowNo: a.workflow_no ? String(a.workflow_no) : undefined,
        asnafCode,
        asnafName,
        assistanceTypeCode: typeObj.code,
        assistanceTypeName: typeObj.name,
        amount,
        actualAssistanceValue: amount,
        eventDate: String(a.disbursement_date || a.updated_at || a.created_at || ''),
        eventDatetime: String(a.disbursement_date || a.updated_at || a.created_at || ''),
        caseWorkerId: a.disbursed_by_id ? String(a.disbursed_by_id) : undefined,
        caseWorkerName: String(a.disbursed_by_name || 'ฝ่ายการเงิน'),
        status: 'completed',
        statusLabel: 'โอนเงินสำเร็จ',
        hasValidProof,
        proofUrl: a.disbursement_proof_url ? String(a.disbursement_proof_url) : undefined,
        proofName: a.disbursement_proof_url ? 'สลิปการโอนเงินธนาคาร.pdf' : undefined,
        details: a.disbursement_notes ? String(a.disbursement_notes) : `โอนตรงเข้าบัญชีผู้รับ อ้างอิง: ${a.disbursement_ref || '-'}`,
        installmentInfo: 'โอนตรง 1 งวด',
      };

      verifiedAidItems.push(item);
      completedItems.push(item);

      if (!hasValidProof) {
        missingProofItems.push({
          id: `mp-direct-${a.id}`,
          sourceType: 'direct_transfer',
          applicationNo: item.applicationNo || '-',
          beneficiaryName: item.beneficiaryName,
          withdrawalNo: item.withdrawalNo,
          amount: item.amount,
          eventDate: item.eventDate,
          officerName: item.caseWorkerName || 'ฝ่ายการเงิน',
          issueDescription: 'ขาดสลิปหลักฐานการโอนเงินหรือเลขอ้างอิงธนาคาร',
        });
        missingProofDrillDownItems.push(item);
      }
    }

    // 3. Handed Over Cash to Case Workers (Step 2 Cash Custody Transfer)
    const hoRes = await db.execute(`
      SELECT h.*, w.withdrawal_no, w.workflow_id as w_workflow_id, wf.workflow_no
      FROM finance_handover_records h
      LEFT JOIN cash_flow_withdrawals w ON h.withdrawal_id = w.id
      LEFT JOIN cash_flow_workflows wf ON (h.workflow_id = wf.id OR w.workflow_id = wf.id)
      WHERE h.status != 'cancelled'
      ORDER BY h.handover_date DESC, h.handover_time DESC
    `);

    let totalHandedOverToCaseWorkers = 0;
    for (const r of hoRes.rows) {
      const amt = round2(Number(r.amount || 0));
      totalHandedOverToCaseWorkers += amt;

      const item: AidDrillDownItem = {
        id: `ho-${r.id}`,
        recordType: 'handover',
        recordId: String(r.id),
        withdrawalId: r.withdrawal_id ? String(r.withdrawal_id) : undefined,
        withdrawalNo: r.withdrawal_no ? String(r.withdrawal_no) : undefined,
        workflowId: r.workflow_id ? String(r.workflow_id) : undefined,
        workflowNo: r.workflow_no ? String(r.workflow_no) : undefined,
        beneficiaryName: `ผู้รับมอบ: ${r.received_by_name} (${r.received_by_position || 'ผู้ดูแลเคส'})`,
        asnafCode: 'amil',
        asnafName: 'อามีลีน (เจ้าหน้าที่จัดการซะกาต)',
        assistanceTypeCode: 'CASH_HANDOVER',
        assistanceTypeName: 'ส่งมอบเงินสดให้ผู้ดูแลเคส',
        amount: amt,
        eventDate: String(r.handover_date),
        eventDatetime: `${r.handover_date} ${r.handover_time}`,
        caseWorkerId: r.received_by_id ? String(r.received_by_id) : undefined,
        caseWorkerName: String(r.received_by_name),
        status: String(r.status),
        statusLabel: r.status === 'fully_handed_over' ? 'ส่งมอบครบถ้วน' : String(r.status),
        hasValidProof: Boolean(r.proof_url && String(r.proof_url).trim().length > 0),
        proofUrl: r.proof_url ? String(r.proof_url) : undefined,
        proofName: r.proof_name ? String(r.proof_name) : undefined,
        details: r.notes ? String(r.notes) : `ส่งมอบโดย: ${r.handed_over_by_name}`,
      };
      handedOverItems.push(item);
    }

    // 4. Assistance Refund Records (ยอดเงินเหลือส่งคืน)
    const refRes = await db.execute(`
      SELECT r.*, a.application_no, b.full_name as beneficiary_name, b.national_id, a.asnaf_category, a.assistance_type,
             w.withdrawal_no, wf.workflow_no
      FROM assistance_refund_records r
      LEFT JOIN assistance_applications a ON r.application_id = a.id
      LEFT JOIN beneficiaries b ON a.beneficiary_id = b.id
      LEFT JOIN cash_flow_withdrawals w ON r.withdrawal_id = w.id
      LEFT JOIN cash_flow_workflows wf ON (r.workflow_id = wf.id OR w.workflow_id = wf.id)
      WHERE r.status = 'completed'
      ORDER BY r.refund_date DESC, r.refund_time DESC
    `);

    let totalRefundedAmount = 0;
    const refundRecords: AssistanceRefundRecord[] = [];

    for (const r of refRes.rows) {
      const amt = round2(Number(r.refund_amount || 0));
      totalRefundedAmount += amt;

      const refObj: AssistanceRefundRecord = {
        id: String(r.id),
        refundNo: String(r.refund_no),
        applicationId: r.application_id ? String(r.application_id) : undefined,
        applicationNo: r.application_no ? String(r.application_no) : undefined,
        beneficiaryName: r.beneficiary_name ? String(r.beneficiary_name) : undefined,
        withdrawalId: r.withdrawal_id ? String(r.withdrawal_id) : undefined,
        withdrawalNo: r.withdrawal_no ? String(r.withdrawal_no) : undefined,
        workflowId: r.workflow_id ? String(r.workflow_id) : undefined,
        workflowNo: r.workflow_no ? String(r.workflow_no) : undefined,
        refundDate: String(r.refund_date),
        refundTime: String(r.refund_time),
        refundDatetime: String(r.refund_datetime),
        refundAmount: amt,
        refundReason: String(r.refund_reason),
        returnedById: String(r.returned_by_id),
        returnedByName: String(r.returned_by_name),
        receivedById: String(r.received_by_id),
        receivedByName: String(r.received_by_name),
        targetBankAccountId: r.target_bank_account_id ? String(r.target_bank_account_id) : undefined,
        targetFundId: r.target_fund_id ? String(r.target_fund_id) : 'fund-1',
        proofUrl: r.proof_url ? String(r.proof_url) : undefined,
        proofName: r.proof_name ? String(r.proof_name) : undefined,
        proofSize: r.proof_size ? Number(r.proof_size) : undefined,
        proofType: r.proof_type ? String(r.proof_type) : undefined,
        status: (r.status || 'completed') as any,
        cancellationReason: r.cancellation_reason ? String(r.cancellation_reason) : undefined,
        notes: r.notes ? String(r.notes) : undefined,
        createdAt: String(r.created_at),
        updatedAt: r.updated_at ? String(r.updated_at) : undefined,
      };
      refundRecords.push(refObj);

      const asnafCode = this.normalizeAsnafCode(r.asnaf_category ? String(r.asnaf_category) : undefined);
      const typeObj = this.matchAssistanceType(r.assistance_type ? String(r.assistance_type) : undefined, allTypes);

      refundItems.push({
        id: `refund-${r.id}`,
        recordType: 'refund',
        recordId: String(r.id),
        applicationId: refObj.applicationId,
        applicationNo: refObj.applicationNo,
        beneficiaryName: refObj.beneficiaryName || `คืนเงินโดย: ${refObj.returnedByName}`,
        nationalId: r.national_id ? String(r.national_id) : undefined,
        withdrawalId: refObj.withdrawalId,
        withdrawalNo: refObj.withdrawalNo,
        workflowId: refObj.workflowId,
        workflowNo: refObj.workflowNo,
        asnafCode,
        asnafName: asnafNameMap.get(asnafCode) || asnafCode,
        assistanceTypeCode: typeObj.code,
        assistanceTypeName: typeObj.name,
        amount: amt,
        eventDate: refObj.refundDate,
        eventDatetime: refObj.refundDatetime,
        caseWorkerId: refObj.returnedById,
        caseWorkerName: refObj.returnedByName,
        status: 'completed',
        statusLabel: 'คืนเงินสำเร็จ',
        hasValidProof: Boolean(refObj.proofUrl),
        proofUrl: refObj.proofUrl,
        proofName: refObj.proofName,
        details: `เหตุผลการคืน: ${refObj.refundReason} (ผู้รับเงิน: ${refObj.receivedByName})`,
      });
    }

    // 5. Total Calculations & Segregation Formulas
    const totalVerifiedAidDisbursed = round2(
      verifiedAidItems.reduce((sum, item) => sum + item.amount, 0)
    );

    const completedAssistanceAmount = round2(
      completedItems.reduce((sum, item) => sum + item.amount, 0)
    );

    const inProgressAssistanceAmount = round2(
      inProgressItems.reduce((sum, item) => sum + item.amount, 0)
    );

    // Sum of confirmed aid disbursed by caregivers holding cash
    const totalAidFromCaregivers = round2(
      verifiedAidItems
        .filter((i) => i.recordType === 'execution_record')
        .reduce((sum, item) => sum + item.amount, 0)
    );

    // Unspent held cash = Handed over - Actual Aid disbursed - Refunded
    const unspentHeldAmount = Math.max(
      0,
      round2(totalHandedOverToCaseWorkers - totalAidFromCaregivers - totalRefundedAmount)
    );

    const unclearedAmount = unspentHeldAmount;

    if (unspentHeldAmount > 0) {
      unspentHeldItems.push({
        id: 'unspent-summary',
        recordType: 'in_progress',
        recordId: 'unspent-summary-1',
        beneficiaryName: 'ยอดเงินสดคงค้างในความรับผิดชอบของผู้ดูแลเคส (รอช่วยเหลือหรือส่งคืน)',
        asnafCode: 'amil',
        asnafName: 'อามีลีน (เจ้าหน้าที่จัดการซะกาต)',
        assistanceTypeCode: 'HELD_CASH',
        assistanceTypeName: 'เงินสดคงค้างในมือผู้ดูแล',
        amount: unspentHeldAmount,
        eventDate: new Date().toLocaleDateString('th-TH'),
        eventDatetime: new Date().toLocaleString('th-TH'),
        status: 'in_progress',
        statusLabel: 'รอเคลียร์เงินสด',
        hasValidProof: false,
        details: `เงินส่งมอบ (฿${totalHandedOverToCaseWorkers.toLocaleString()}) - ช่วยเหลือแล้ว (฿${totalAidFromCaregivers.toLocaleString()}) - คืนแล้ว (฿${totalRefundedAmount.toLocaleString()})`,
      });
    }

    // 6. Breakdown by Canonical Asnaf
    const asnafDisbursedMap = new Map<string, { disbursed: number; cases: Set<string>; confirmed: number; items: AidDrillDownItem[] }>();
    for (const a of this.CANONICAL_ASNAFS) {
      asnafDisbursedMap.set(a.code, { disbursed: 0, cases: new Set(), confirmed: 0, items: [] });
    }

    for (const item of verifiedAidItems) {
      let entry = asnafDisbursedMap.get(item.asnafCode);
      if (!entry) {
        entry = { disbursed: 0, cases: new Set(), confirmed: 0, items: [] };
        asnafDisbursedMap.set(item.asnafCode, entry);
      }
      entry.disbursed = round2(entry.disbursed + item.amount);
      if (item.applicationId) entry.cases.add(item.applicationId);
      if (item.status === 'completed') entry.confirmed += 1;
      entry.items.push(item);
    }

    const breakdownByAsnaf: AsnafAidExpenseItem[] = this.CANONICAL_ASNAFS.map((a) => {
      const entry = asnafDisbursedMap.get(a.code) || { disbursed: 0, cases: new Set(), confirmed: 0, items: [] };
      const alloc = asnafAllocMap.get(a.code) || { pct: a.defaultPct, target: round2((totalZakatPool * a.defaultPct) / 100), alloc: 0 };
      const disbursedAmount = round2(entry.disbursed);
      const targetAmount = alloc.target;
      const allocatedAmount = alloc.alloc || targetAmount;
      const remainingAmount = round2(Math.max(0, targetAmount - disbursedAmount));

      return {
        asnafCode: a.code,
        asnafName: a.name,
        percentage: alloc.pct,
        targetAmount,
        allocatedAmount,
        disbursedAmount,
        remainingAmount,
        caseCount: entry.cases.size,
        confirmedCount: entry.confirmed,
        items: entry.items,
      };
    });

    // 7. Breakdown by Assistance Type
    const typeMap = new Map<string, { typeDef: any; disbursed: number; cases: Set<string>; confirmed: number; items: AidDrillDownItem[] }>();
    for (const t of allTypes) {
      typeMap.set(t.code, { typeDef: t, disbursed: 0, cases: new Set(), confirmed: 0, items: [] });
    }

    for (const item of verifiedAidItems) {
      let entry = typeMap.get(item.assistanceTypeCode);
      if (!entry) {
        entry = {
          typeDef: {
            id: `custom-${item.assistanceTypeCode}`,
            code: item.assistanceTypeCode,
            name: item.assistanceTypeName,
            category: 'other',
            category_label: 'ประเภทอื่นๆ',
          },
          disbursed: 0,
          cases: new Set(),
          confirmed: 0,
          items: [],
        };
        typeMap.set(item.assistanceTypeCode, entry);
      }
      entry.disbursed = round2(entry.disbursed + item.amount);
      if (item.applicationId) entry.cases.add(item.applicationId);
      if (item.status === 'completed') entry.confirmed += 1;
      entry.items.push(item);
    }

    const breakdownByAssistanceType: AssistanceTypeAidExpenseItem[] = Array.from(typeMap.values()).map((e) => ({
      typeCode: e.typeDef.code,
      typeId: e.typeDef.id,
      typeName: e.typeDef.name,
      category: e.typeDef.category || 'cash',
      categoryLabel: e.typeDef.category_label || e.typeDef.category || 'สวัสดิการ',
      disbursedAmount: round2(e.disbursed),
      caseCount: e.cases.size,
      confirmedCount: e.confirmed,
      items: e.items,
    }));

    const missingProofAmount = round2(
      missingProofItems.reduce((sum, m) => sum + m.amount, 0)
    );

    return {
      totalVerifiedAidDisbursed,
      totalHandedOverToCaseWorkers: round2(totalHandedOverToCaseWorkers),
      inProgressAssistanceAmount,
      completedAssistanceAmount,
      unspentHeldAmount,
      totalRefundedAmount: round2(totalRefundedAmount),
      unclearedAmount,
      missingProofCount: missingProofItems.length,
      missingProofAmount,
      breakdownByAsnaf,
      breakdownByAssistanceType,
      refundRecords,
      missingProofItems,
      drillDown: {
        verifiedAidItems,
        handedOverItems,
        inProgressItems,
        completedItems,
        unspentHeldItems,
        refundItems,
        missingProofItems: missingProofDrillDownItems,
      },
    };
  }

  /**
   * Records unspent cash refund from assistance cases or vouchers back to foundation funds.
   */
  static async recordAssistanceRefund(
    input: RecordAssistanceRefundInput,
    actor: ActorContext
  ): Promise<AssistanceRefundRecord> {
    await initDb();
    const db = getDb();

    const refundAmt = round2(Number(input.refundAmount));
    if (isNaN(refundAmt) || refundAmt <= 0) {
      throw new Error('จำนวนเงินที่คืนต้องมากกว่า 0 บาท');
    }
    if (!input.refundReason || !input.refundReason.trim()) {
      throw new Error('กรุณาระบุเหตุผลการคืนเงิน');
    }
    if (!input.returnedByName || !input.returnedByName.trim()) {
      throw new Error('กรุณาระบุชื่อผู้ส่งคืนเงิน');
    }

    const refundId = `ref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const dateStr = input.refundDate || new Date().toISOString().slice(0, 10);
    const timeStr = input.refundTime || new Date().toLocaleTimeString('th-TH', { hour12: false });
    const datetimeStr = `${dateStr} ${timeStr}`;
    const refundNo = `REF-${dateStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const targetFundId = input.targetFundId || 'fund-1';
    const receivedById = input.receivedById || actor.id;
    const receivedByName = input.receivedByName || actor.name;
    const returnedById = input.returnedById || actor.id;

    // 1. Insert into assistance_refund_records
    await db.execute({
      sql: `INSERT INTO assistance_refund_records (
        id, refund_no, application_id, withdrawal_id, workflow_id,
        refund_date, refund_time, refund_datetime, refund_amount, refund_reason,
        returned_by_id, returned_by_name, received_by_id, received_by_name,
        target_bank_account_id, target_fund_id, proof_url, proof_name, proof_size, proof_type,
        status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        refundId,
        refundNo,
        input.applicationId || null,
        input.withdrawalId || null,
        input.workflowId || null,
        dateStr,
        timeStr,
        datetimeStr,
        refundAmt,
        input.refundReason.trim(),
        returnedById,
        input.returnedByName.trim(),
        receivedById,
        receivedByName,
        input.targetBankAccountId || null,
        targetFundId,
        input.proofUrl || null,
        input.proofName || null,
        input.proofSize || 0,
        input.proofType || 'application/pdf',
        input.notes || null,
      ],
    });

    // 2. Financial Ledger Reversal Transaction: restore money into fund
    const txnId = `txn-ref-${Date.now()}`;
    const txnNo = `TXN-REF-${Date.now().toString().slice(-5)}`;
    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes,
        bank_account_id, workflow_id
      ) VALUES (?, ?, ?, 'reversal', ?, 'กองทุนซะกาตผู้ยากไร้และขัดสน', 'คืนเงินสวัสดิการที่ไม่ได้ใช้ (Assistance Refund)', ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
      args: [
        txnId,
        txnNo,
        datetimeStr,
        targetFundId,
        refundAmt,
        `${input.returnedByName} (ผู้ส่งคืน)`,
        refundNo,
        input.proofUrl || '',
        actor.id,
        actor.name,
        `รับคืนเงินเหลือจากการช่วยเหลือ (${refundNo}): ${input.refundReason}`,
        input.targetBankAccountId || null,
        input.workflowId || null,
      ],
    });

    // 3. If returning to a specific bank account, increase current_balance
    if (input.targetBankAccountId) {
      await db.execute({
        sql: `UPDATE bank_accounts 
              SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?`,
        args: [refundAmt, input.targetBankAccountId],
      });
    }

    // 4. Update assistance_applications if linked
    if (input.applicationId) {
      await db.execute({
        sql: `UPDATE assistance_applications
              SET refunded_amount = COALESCE(refunded_amount, 0) + ?,
                  is_refunded = 1,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [refundAmt, input.applicationId],
      });

      await db.execute({
        sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
              VALUES (?, ?, 'refunded', ?, ?, ?, ?)`,
        args: [
          `hist-ref-${Date.now()}`,
          input.applicationId,
          datetimeStr,
          actor.id,
          actor.name,
          `บันทึกรับคืนเงินสวัสดิการคงเหลือ ฿${refundAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (${refundNo}): ${input.refundReason}`,
        ],
      });
    }

    // 5. Update cash_flow_withdrawals if linked
    if (input.withdrawalId) {
      await db.execute({
        sql: `UPDATE cash_flow_withdrawals
              SET aid_refunded_amount = COALESCE(aid_refunded_amount, 0) + ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [refundAmt, input.withdrawalId],
      });
    }

    return {
      id: refundId,
      refundNo,
      applicationId: input.applicationId,
      withdrawalId: input.withdrawalId,
      workflowId: input.workflowId,
      refundDate: dateStr,
      refundTime: timeStr,
      refundDatetime: datetimeStr,
      refundAmount: refundAmt,
      refundReason: input.refundReason,
      returnedById,
      returnedByName: input.returnedByName,
      receivedById,
      receivedByName,
      targetBankAccountId: input.targetBankAccountId,
      targetFundId,
      proofUrl: input.proofUrl,
      proofName: input.proofName,
      proofSize: input.proofSize,
      proofType: input.proofType,
      status: 'completed',
      notes: input.notes,
      createdAt: datetimeStr,
    };
  }

  /**
   * Cancels a previously recorded refund, adjusting ledger and balances.
   */
  static async cancelAssistanceRefund(
    refundId: string,
    cancellationReason: string,
    actor: ActorContext
  ): Promise<AssistanceRefundRecord> {
    await initDb();
    const db = getDb();

    const refRes = await db.execute({
      sql: 'SELECT * FROM assistance_refund_records WHERE id = ?',
      args: [refundId],
    });
    if (refRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลบันทึกการคืนเงิน');
    }
    const r = refRes.rows[0];
    if (r.status === 'cancelled') {
      throw new Error('รายการคืนเงินนี้ถูกยกเลิกไปแล้ว');
    }

    const amt = round2(Number(r.refund_amount || 0));
    const reason = (cancellationReason || '').trim();
    if (!reason) {
      throw new Error('กรุณาระบุเหตุผลการยกเลิกรายการคืนเงิน');
    }

    await db.execute({
      sql: `UPDATE assistance_refund_records
            SET status = 'cancelled', cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [reason, refundId],
    });

    // Reverse bank adjustment
    if (r.target_bank_account_id) {
      await db.execute({
        sql: `UPDATE bank_accounts 
              SET current_balance = MAX(0, current_balance - ?), updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?`,
        args: [amt, r.target_bank_account_id],
      });
    }

    // Adjust application refunded_amount
    if (r.application_id) {
      await db.execute({
        sql: `UPDATE assistance_applications
              SET refunded_amount = MAX(0, COALESCE(refunded_amount, 0) - ?),
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [amt, r.application_id],
      });

      const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
      await db.execute({
        sql: `INSERT INTO application_history (id, application_id, status, timestamp, changed_by_id, changed_by_name, notes)
              VALUES (?, ?, 'refund_cancelled', ?, ?, ?, ?)`,
        args: [
          `hist-refcan-${Date.now()}`,
          r.application_id,
          timestampNow,
          actor.id,
          actor.name,
          `ยกเลิกบันทึกการคืนเงิน ฿${amt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (${r.refund_no}): ${reason}`,
        ],
      });
    }

    // Adjust cash_flow_withdrawals
    if (r.withdrawal_id) {
      await db.execute({
        sql: `UPDATE cash_flow_withdrawals
              SET aid_refunded_amount = MAX(0, COALESCE(aid_refunded_amount, 0) - ?),
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [amt, r.withdrawal_id],
      });
    }

    return {
      id: String(r.id),
      refundNo: String(r.refund_no),
      applicationId: r.application_id ? String(r.application_id) : undefined,
      withdrawalId: r.withdrawal_id ? String(r.withdrawal_id) : undefined,
      workflowId: r.workflow_id ? String(r.workflow_id) : undefined,
      refundDate: String(r.refund_date),
      refundTime: String(r.refund_time),
      refundDatetime: String(r.refund_datetime),
      refundAmount: amt,
      refundReason: String(r.refund_reason),
      returnedById: String(r.returned_by_id),
      returnedByName: String(r.returned_by_name),
      receivedById: String(r.received_by_id),
      receivedByName: String(r.received_by_name),
      targetBankAccountId: r.target_bank_account_id ? String(r.target_bank_account_id) : undefined,
      targetFundId: String(r.target_fund_id || 'fund-1'),
      proofUrl: r.proof_url ? String(r.proof_url) : undefined,
      proofName: r.proof_name ? String(r.proof_name) : undefined,
      proofSize: r.proof_size ? Number(r.proof_size) : undefined,
      proofType: r.proof_type ? String(r.proof_type) : undefined,
      status: 'cancelled',
      cancellationReason: reason,
      notes: r.notes ? String(r.notes) : undefined,
      createdAt: String(r.created_at),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves assistance refund records with optional filtering
   */
  static async getAssistanceRefunds(filters?: {
    applicationId?: string;
    withdrawalId?: string;
    workflowId?: string;
    status?: string;
  }): Promise<AssistanceRefundRecord[]> {
    await initDb();
    const db = getDb();

    let sql = `
      SELECT r.*, a.application_no, b.full_name as beneficiary_name, w.withdrawal_no, wf.workflow_no
      FROM assistance_refund_records r
      LEFT JOIN assistance_applications a ON r.application_id = a.id
      LEFT JOIN beneficiaries b ON a.beneficiary_id = b.id
      LEFT JOIN cash_flow_withdrawals w ON r.withdrawal_id = w.id
      LEFT JOIN cash_flow_workflows wf ON (r.workflow_id = wf.id OR w.workflow_id = wf.id)
      WHERE 1=1
    `;
    const args: any[] = [];
    if (filters?.applicationId) {
      sql += ' AND r.application_id = ?';
      args.push(filters.applicationId);
    }
    if (filters?.withdrawalId) {
      sql += ' AND r.withdrawal_id = ?';
      args.push(filters.withdrawalId);
    }
    if (filters?.workflowId) {
      sql += ' AND (r.workflow_id = ? OR w.workflow_id = ?)';
      args.push(filters.workflowId, filters.workflowId);
    }
    if (filters?.status) {
      sql += ' AND r.status = ?';
      args.push(filters.status);
    }
    sql += ' ORDER BY r.refund_date DESC, r.refund_time DESC';

    const res = await db.execute({ sql, args });
    return res.rows.map((r) => ({
      id: String(r.id),
      refundNo: String(r.refund_no),
      applicationId: r.application_id ? String(r.application_id) : undefined,
      applicationNo: r.application_no ? String(r.application_no) : undefined,
      beneficiaryName: r.beneficiary_name ? String(r.beneficiary_name) : undefined,
      withdrawalId: r.withdrawal_id ? String(r.withdrawal_id) : undefined,
      withdrawalNo: r.withdrawal_no ? String(r.withdrawal_no) : undefined,
      workflowId: r.workflow_id ? String(r.workflow_id) : undefined,
      workflowNo: r.workflow_no ? String(r.workflow_no) : undefined,
      refundDate: String(r.refund_date),
      refundTime: String(r.refund_time),
      refundDatetime: String(r.refund_datetime),
      refundAmount: round2(Number(r.refund_amount || 0)),
      refundReason: String(r.refund_reason),
      returnedById: String(r.returned_by_id),
      returnedByName: String(r.returned_by_name),
      receivedById: String(r.received_by_id),
      receivedByName: String(r.received_by_name),
      targetBankAccountId: r.target_bank_account_id ? String(r.target_bank_account_id) : undefined,
      targetFundId: String(r.target_fund_id || 'fund-1'),
      proofUrl: r.proof_url ? String(r.proof_url) : undefined,
      proofName: r.proof_name ? String(r.proof_name) : undefined,
      proofSize: r.proof_size ? Number(r.proof_size) : undefined,
      proofType: r.proof_type ? String(r.proof_type) : undefined,
      status: (r.status || 'completed') as any,
      cancellationReason: r.cancellation_reason ? String(r.cancellation_reason) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
      createdAt: String(r.created_at),
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    }));
  }

}


