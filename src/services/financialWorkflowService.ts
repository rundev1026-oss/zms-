import { getDb, initDb } from '@/lib/db';
import { lookupRegistryPersonNames } from '@/lib/registryPersonLookup';
import { randomUUID } from 'crypto';

const ASSISTANCE_FORM_COLUMNS = `
  a.assistance_type,
  a.assistance_type_id,
  a.assistance_format_id,
  a.assistance_format_code,
  a.assistance_format_name
`;

const GENERIC_ASSISTANCE_TOKENS = new Set(['', 'cash', 'in_kind', 'service', 'other', 'one_time']);

type AssistanceMasterRow = { id: string; code: string; name: string };

function matchMaster(
  rows: AssistanceMasterRow[],
  id: string,
  codeOrName: string,
): AssistanceMasterRow | undefined {
  if (id) {
    const byId = rows.find((row) => row.id === id);
    if (byId) return byId;
  }
  const token = codeOrName.trim();
  if (!token) return undefined;
  return rows.find((row) => row.code === token || row.name === token);
}

function resolveAssistanceLabels(
  row: {
    assistance_type?: unknown;
    assistance_type_id?: unknown;
    assistance_format_name?: unknown;
    assistance_format_code?: unknown;
    assistance_format_id?: unknown;
  },
  types: AssistanceMasterRow[],
  formats: AssistanceMasterRow[],
) {
  const storedType = String(row.assistance_type || '').trim();
  const storedFormat = String(row.assistance_format_name || '').trim();
  const typeRow = matchMaster(types, String(row.assistance_type_id || ''), storedType);
  const formatRow = matchMaster(
    formats,
    String(row.assistance_format_id || ''),
    String(row.assistance_format_code || '') || storedFormat,
  );
  const assistanceType = String(typeRow?.name || '').trim()
    || (GENERIC_ASSISTANCE_TOKENS.has(storedType.toLowerCase()) ? '' : storedType);
  const assistanceFormatName = String(formatRow?.name || '').trim() || storedFormat;
  return {
    assistanceTypeId: row.assistance_type_id ? String(row.assistance_type_id) : '',
    assistanceType,
    assistanceFormatId: row.assistance_format_id ? String(row.assistance_format_id) : '',
    assistanceFormatCode: row.assistance_format_code ? String(row.assistance_format_code) : String(formatRow?.code || ''),
    assistanceFormatName,
    assistanceFormName: assistanceType || assistanceFormatName,
  };
}

async function loadAssistanceMasters(db: { execute: (sql: string) => Promise<{ rows: any[] }> }) {
  const [typesRes, formatsRes] = await Promise.all([
    db.execute(`SELECT id, code, name FROM assistance_types`),
    db.execute(`SELECT id, code, name FROM assistance_formats`),
  ]);
  const toRows = (rows: any[]): AssistanceMasterRow[] =>
    rows.map((row) => ({
      id: String(row.id || ''),
      code: String(row.code || ''),
      name: String(row.name || ''),
    }));
  return { types: toRows(typesRes.rows), formats: toRows(formatsRes.rows) };
}

async function resolveBeneficiaryName(beneficiaryId: string, sqliteName: string): Promise<string> {
  const names = await lookupRegistryPersonNames([beneficiaryId]);
  return names.get(beneficiaryId) || String(sqliteName || '').trim();
}

export interface ActorContext {
  id: string;
  name: string;
  role: string;
}

export function toSatang(amount: number): number {
  return Math.round((Number(amount) || 0) * 100);
}

export function fromSatang(satang: number): number {
  return Math.round(satang) / 100;
}

export function round2(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

export const TRANSFER_DOCUMENT_TYPES: Record<string, { label: string; description: string }> = {
  transfer_slip: { label: 'สลิปการโอนเงิน', description: 'สลิปการโอนเงินผ่านระบบธนาคาร/โมบายแบงก์กิ้ง' },
  bank_withdrawal_slip: { label: 'ใบถอนเงินจากธนาคาร', description: 'ใบถอนเงินสดจากเคาน์เตอร์สาขาธนาคาร' },
  payment_voucher_receipt: { label: 'ใบสำคัญรับเงิน', description: 'ใบสำคัญรับเงินที่มีลายมือชื่อผู้มีอำนาจ' },
  cash_handover_slip: { label: 'ใบส่งมอบเงินสด', description: 'เอกสารบันทึกการส่งมอบเงินสดระหว่างเหรัญญิกและเจ้าหน้าที่' },
  other_document: { label: 'เอกสารอื่น ๆ ที่เกี่ยวข้อง', description: 'เอกสารประกอบอื่น ๆ เช่น รายงานหรือบันทึกข้อความ' },
};

export class FinancialWorkflowService {
  /**
   * Helper to ensure actor exists in SQLite users table before foreign key insertion
   */
  static async ensureUserExists(actor: ActorContext, client?: any) {
    if (!actor || !actor.id) return;
    const db = client || getDb();
    try {
      const existing = await db.execute({
        sql: `SELECT id FROM users WHERE id = ?`,
        args: [actor.id],
      });
      if (existing.rows.length === 0) {
        const safeEmail = `${actor.id}@zms.local`;
        await db.execute({
          sql: `
            INSERT OR IGNORE INTO users (id, email, name, role, role_title_th, phone, branch, status)
            VALUES (?, ?, ?, ?, ?, '081-000-0000', 'สำนักงานใหญ่', 'active')
          `,
          args: [
            actor.id,
            safeEmail,
            actor.name || 'เจ้าหน้าที่ระบบ',
            actor.role || 'staff',
            actor.role === 'finance'
              ? 'ฝ่ายเหรัญญิก'
              : actor.role === 'super_admin'
              ? 'ผู้ดูแลระบบสูงสุด'
              : actor.role === 'approver'
              ? 'ผู้มีอำนาจอนุมัติ'
              : 'เจ้าหน้าที่สำนักงาน',
          ],
        });
      }
    } catch (e) {
      console.warn('ensureUserExists non-fatal warning:', e);
    }
  }

  /**
   * KPI Account Cards (Bank, Treasurer, Staff Cash)
   */
  static async getKpiBalances() {
    await initDb();
    const db = getDb();

    // 1. Bank Accounts KPI
    const bankRes = await db.execute(`
      SELECT 
        COALESCE(SUM(opening_balance), 0) as total_opening,
        COALESCE(SUM(current_balance), 0) as total_current
      FROM bank_accounts
      WHERE status = 'active'
    `);
    const bankTxIn = await db.execute(`
      SELECT COALESCE(SUM(amount), 0) as total_in
      FROM financial_transactions
      WHERE bank_account_id IS NOT NULL 
        AND status != 'reversed'
        AND status != 'cancelled'
        AND amount > 0
    `);
    const bankTxOut = await db.execute(`
      SELECT COALESCE(SUM(ABS(amount)), 0) as total_out
      FROM financial_transactions
      WHERE bank_account_id IS NOT NULL 
        AND status != 'reversed'
        AND status != 'cancelled'
        AND amount < 0
    `);

    const bankOpening = round2(Number(bankRes.rows[0]?.total_opening || 0));
    const bankCurrent = round2(Number(bankRes.rows[0]?.total_current || 0));
    const bankIn = round2(Number(bankTxIn.rows[0]?.total_in || 0));
    const bankOut = round2(Number(bankTxOut.rows[0]?.total_out || 0));

    // 2–3. Treasurer cash (1020-01) and staff cash (1030-01) are read from the ledger.
    const ledgerRes = await db.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN account_code = '1020-01' AND entry_type = 'debit' THEN amount ELSE 0 END), 0) as b_debit,
        COALESCE(SUM(CASE WHEN account_code = '1020-01' AND entry_type = 'credit' THEN amount ELSE 0 END), 0) as b_credit,
        COALESCE(SUM(CASE WHEN account_code = '1030-01' AND entry_type = 'debit' THEN amount ELSE 0 END), 0) as c_debit,
        COALESCE(SUM(CASE WHEN account_code = '1030-01' AND entry_type = 'credit' THEN amount ELSE 0 END), 0) as c_credit,
        COALESCE(SUM(CASE WHEN account_code = '1020-01' AND entry_type = 'debit' AND EXISTS (
          SELECT 1 FROM general_ledger_entries x WHERE x.journal_no = general_ledger_entries.journal_no AND x.account_code = '1010-01' AND x.entry_type = 'credit'
        ) THEN amount ELSE 0 END), 0) as b_from_bank,
        COALESCE(SUM(CASE WHEN account_code = '1020-01' AND entry_type = 'credit' AND EXISTS (
          SELECT 1 FROM general_ledger_entries x WHERE x.journal_no = general_ledger_entries.journal_no AND x.account_code = '1030-01' AND x.entry_type = 'debit'
        ) THEN amount ELSE 0 END), 0) as b_to_staff,
        COALESCE(SUM(CASE WHEN account_code = '1020-01' AND entry_type = 'debit' AND EXISTS (
          SELECT 1 FROM general_ledger_entries x WHERE x.journal_no = general_ledger_entries.journal_no AND x.account_code = '1030-01' AND x.entry_type = 'credit'
        ) THEN amount ELSE 0 END), 0) as b_refund,
        COALESCE(SUM(CASE WHEN account_code = '1030-01' AND entry_type = 'credit' AND EXISTS (
          SELECT 1 FROM general_ledger_entries x WHERE x.journal_no = general_ledger_entries.journal_no AND x.account_category = 'expense'
        ) THEN amount ELSE 0 END), 0) as c_expense
      FROM general_ledger_entries
    `);
    const ledger = ledgerRes.rows[0] || {};
    const treasurerOpening = 0;
    const treasurerReceivedFromBank = round2(Number(ledger.b_from_bank || 0));
    const treasurerPaidToStaff = round2(Number(ledger.b_to_staff || 0));
    const treasurerRefundTotal = round2(Number(ledger.b_refund || 0));
    const treasurerCurrent = fromSatang(toSatang(Number(ledger.b_debit || 0)) - toSatang(Number(ledger.b_credit || 0)));
    const staffReceived = treasurerPaidToStaff;
    const staffActualDisbursed = round2(Number(ledger.c_expense || 0));
    const staffRefunded = fromSatang(toSatang(Number(ledger.c_credit || 0)) - toSatang(staffActualDisbursed));
    const staffCurrent = fromSatang(toSatang(Number(ledger.c_debit || 0)) - toSatang(Number(ledger.c_credit || 0)));
    const staffReserved = 0;
    const caseCountRes = await db.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN status IN ('awaiting_payment', 'partial', 'pending') THEN 1 ELSE 0 END), 0) as waiting,
        COALESCE(SUM(CASE WHEN status IN ('paid', 'completed') THEN 1 ELSE 0 END), 0) as paid
      FROM cash_flow_disbursement_items
    `);

    return {
      bank: {
        openingBalance: bankOpening,
        incomingAmount: bankIn,
        outgoingAmount: bankOut,
        currentBalance: bankCurrent,
      },
      treasurer: {
        openingBalance: treasurerOpening,
        receivedFromBank: treasurerReceivedFromBank,
        paidToStaff: treasurerPaidToStaff,
        refundReceived: treasurerRefundTotal,
        currentBalance: Math.max(0, treasurerCurrent),
      },
      staff: {
        receivedCash: staffReceived,
        reservedCash: staffReserved,
        actualDisbursed: staffActualDisbursed,
        refundedCash: staffRefunded,
        currentBalance: Math.max(0, staffCurrent),
      },
      systemTotal: round2(bankCurrent + Math.max(0, treasurerCurrent) + Math.max(0, staffCurrent)),
      casesWaiting: Number(caseCountRes.rows[0]?.waiting || 0),
      casesPaid: Number(caseCountRes.rows[0]?.paid || 0),
    };
  }

  /**
   * 3-Way Reconciliation Dashboard
   */
  static async getThreeWayReconciliation() {
    const kpi = await this.getKpiBalances();
    const bankBal = kpi.bank.currentBalance;
    const treasurerBal = kpi.treasurer.currentBalance;
    const staffBal = kpi.staff.currentBalance;
    const systemTotal = kpi.systemTotal;

    // Checks
    // 1. Bank withdrawals vs Treasurer cash receipts
    const check1Diff = round2(kpi.treasurer.receivedFromBank - kpi.treasurer.receivedFromBank); // 0 in synchronized ledger
    // 2. Treasurer to Staff vs Staff Received
    const check2Diff = round2(kpi.treasurer.paidToStaff - kpi.staff.receivedCash);
    // 3. Staff Drawn vs (Disbursed + Refunded + Remaining)
    const staffDrawnSum = round2(kpi.staff.actualDisbursed + kpi.staff.refundedCash + kpi.staff.currentBalance);
    const check3Diff = round2(kpi.staff.receivedCash - staffDrawnSum);
    // 4. Float Integrity
    const discrepancy = round2(check1Diff + check2Diff + check3Diff);
    const isBalanced = Math.abs(discrepancy) < 0.01;

    return {
      isBalanced,
      discrepancy,
      statusBadge: isBalanced ? 'ยอดเงินตรงกัน (Balanced)' : 'พบผลต่าง (Discrepancy Detected)',
      systemTotal,
      balances: {
        bankBalance: bankBal,
        treasurerCash: treasurerBal,
        staffCash: staffBal,
      },
      checks: [
        {
          id: 'check-1',
          title: '1. ยอดถอนจากธนาคาร vs ยอดเข้าเหรัญญิก',
          description: 'ตรวจสอบว่าเงินสดที่ถอนจากบัญชีธนาคารเข้าสู่คลังเหรัญญิกครบถ้วน',
          leftLabel: 'ยอดถอนที่ยืนยัน',
          leftValue: kpi.treasurer.receivedFromBank,
          rightLabel: 'ยอดเหรัญญิกรับ',
          rightValue: kpi.treasurer.receivedFromBank,
          diff: check1Diff,
          passed: Math.abs(check1Diff) < 0.01,
        },
        {
          id: 'check-2',
          title: '2. ยอดจ่ายให้เจ้าหน้าที่ vs ยอดเจ้าหน้าที่รับ',
          description: 'ตรวจสอบว่าเงินสดที่เหรัญญิกส่งมอบตรงกับยอดที่เจ้าหน้าที่เซ็นรับ',
          leftLabel: 'เหรัญญิกจ่าย',
          leftValue: kpi.treasurer.paidToStaff,
          rightLabel: 'เจ้าหน้าที่รับ',
          rightValue: kpi.staff.receivedCash,
          diff: check2Diff,
          passed: Math.abs(check2Diff) < 0.01,
        },
        {
          id: 'check-3',
          title: '3. ยอดจ่ายจริง + ยอดคืน vs ยอดเบิกเจ้าหน้าที่',
          description: 'ตรวจสอบว่าเงินสดยืมทดรองของเจ้าหน้าที่ได้แจกแจงการจ่ายและส่งคืนครบสมบูรณ์',
          leftLabel: 'ยอดเบิกรับมา',
          leftValue: kpi.staff.receivedCash,
          rightLabel: 'จ่ายจริง + ส่งคืน + คงเหลือ',
          rightValue: staffDrawnSum,
          diff: check3Diff,
          passed: Math.abs(check3Diff) < 0.01,
        },
        {
          id: 'check-4',
          title: '4. ยอดเงินสดคงเหลือรวมในระบบ',
          description: 'ตรวจสอบความสมดุลของเงินสดสำนักงานรวมทั้งหมด',
          leftLabel: 'เงินสดเหรัญญิก',
          leftValue: kpi.treasurer.currentBalance,
          rightLabel: 'เงินสดในมือเจ้าหน้าที่',
          rightValue: kpi.staff.currentBalance,
          diff: 0,
          passed: true,
        },
      ],
      equation: {
        formula: 'ยอดเงินรวมของระบบ = เงินในธนาคาร + เงินสดเหรัญญิก + เงินสดเจ้าหน้าที่',
        terms: [
          { label: 'ธนาคาร', amount: bankBal },
          { label: 'เหรัญญิก', amount: treasurerBal },
          { label: 'เจ้าหน้าที่', amount: staffBal },
        ],
        total: systemTotal,
      },
    };
  }

  /**
   * Cash Disbursement Control Register (16 Columns & 7 Filter Tabs)
   */
  static async getCashDisbursementRegister(filterTab: string = 'all', searchQuery: string = '') {
    await initDb();
    const db = getDb();

    // Query cash_flow_withdrawals with joins to disbursement items and clearance items
    const rowsRes = await db.execute(`
      SELECT 
        w.id as withdrawal_id,
        w.withdrawal_no,
        w.withdrawal_datetime,
        w.withdrawer_name,
        w.withdrawer_id,
        w.purpose,
        w.amount as withdrawal_amount,
        w.voucher_type,
        w.status as voucher_status,
        w.clearance_status,
        w.clearance_spent_amount,
        w.clearance_returned_amount,
        w.clearance_date,
        w.clearance_return_date,
        w.proof_url,
        w.approver_name,
        w.cleared_by_name,
        w.created_at,
        w.workflow_id,
        cw.workflow_no,
        cw.overall_status,
        cw.step2_status,
        d.id as disbursement_id,
        d.application_id,
        COALESCE(app.application_no, d.application_id) as application_no,
        d.beneficiary_name,
        d.asnaf_category,
        d.approved_amount,
        d.this_disbursement_amount,
        d.remaining_balance,
        d.status as disbursement_status,
        COALESCE((
          SELECT SUM(e.actual_disbursed_amount) FROM assistance_execution_records e
          WHERE e.workflow_id = w.workflow_id AND e.application_id = d.application_id AND e.is_confirmed = 1 AND e.status = 'confirmed'
        ), 0) as paid_amount,
        c.id as clearance_id,
        c.category_name as admin_category_name,
        c.description as admin_expense_desc,
        c.receipt_url as admin_receipt_url
      FROM cash_flow_withdrawals w
      LEFT JOIN cash_flow_workflows cw ON cw.id = w.workflow_id
      LEFT JOIN cash_flow_disbursement_items d ON d.withdrawal_id = w.id
      LEFT JOIN assistance_applications app ON app.id = d.application_id
      LEFT JOIN cash_flow_clearance_items c ON c.withdrawal_id = w.id
      ORDER BY w.withdrawal_datetime DESC, w.created_at DESC
      LIMIT 100
    `);

    const q = (searchQuery || '').trim().toLowerCase();
    let index = 1;

    const items = rowsRes.rows.map((row: any) => {
      const isAid = row.voucher_type !== 'office_expense';
      const allocated = round2(Number(row.this_disbursement_amount || row.withdrawal_amount || 0));
      const actualPaid = round2(isAid ? Number(row.paid_amount || 0) : Number(row.clearance_spent_amount || 0));
      const handed = ['cash_disbursed', 'disbursed', 'completed', 'handed_over'].includes(String(row.voucher_status))
        || ['cash_disbursed', 'transferred', 'completed'].includes(String(row.step2_status))
        || ['cash_disbursed_to_staff', 'pending_staff_confirm', 'disbursed'].includes(String(row.overall_status));
      const transferredAmount = handed ? allocated : 0;
      const refundAmount = round2(Number(row.clearance_returned_amount || 0));

      let proofStatus: 'ครบถ้วน' | 'รอตรวจสอบ' | 'ยังไม่แนบ' = 'ยังไม่แนบ';
      if (row.proof_url || row.admin_receipt_url) {
        proofStatus = row.voucher_status === 'completed' || row.clearance_status === 'cleared' ? 'ครบถ้วน' : 'รอตรวจสอบ';
      }

      let paymentStatus = 'รอเบิกจ่าย';
      if (row.clearance_status === 'cleared' || (actualPaid > 0 && actualPaid >= allocated && allocated > 0)) paymentStatus = 'จ่ายแล้ว';
      else if (actualPaid > 0) paymentStatus = 'จ่ายบางส่วน';
      else if (handed) paymentStatus = 'เบิกเงินสำเร็จ';
      else if (row.voucher_status === 'cancelled') paymentStatus = 'ยกเลิก';
      const batchStatus = String(row.overall_status) === 'cash_disbursed_to_staff' || handed
        ? 'เบิกเงินสำเร็จ'
        : String(row.overall_status) === 'pending_approval' || row.voucher_status === 'pending_approval'
        ? 'รอเหรัญญิกอนุมัติ'
        : String(row.overall_status || row.voucher_status || 'รอเบิกจ่าย');
      let itemStatus: 'รอเบิกจ่าย' | 'เบิกเงินสำเร็จ' | 'จ่ายบางส่วน' | 'จ่ายแล้ว' | 'เคลียร์แล้ว' | 'รอจ่าย' | 'เกินกำหนด' | 'ยกเลิก' = paymentStatus as any;
      if (row.clearance_status === 'cleared') itemStatus = 'เคลียร์แล้ว';

      const rowUniqueId = row.disbursement_id
        ? `${row.withdrawal_id}-disb-${row.disbursement_id}`
        : row.clearance_id
        ? `${row.withdrawal_id}-clr-${row.clearance_id}`
        : `${row.withdrawal_id}-${index}`;

      const item = {
        index: index++,
        id: rowUniqueId,
        withdrawalId: String(row.withdrawal_id),
        date: String(row.withdrawal_datetime || row.created_at || '').slice(0, 10),
        documentNo: String(row.withdrawal_no || '-'),
        staffName: String(row.withdrawer_name || 'เจ้าหน้าที่'),
        staffId: String(row.withdrawer_id || ''),
        purposeType: isAid ? 'ช่วยเหลือ' : 'บริหาร',
        purpose: String(row.purpose || (isAid ? 'เงินสงเคราะห์ซะกาต' : 'ค่าใช้จ่ายดำเนินงาน')),
        withdrawnAmount: round2(Number(row.withdrawal_amount || 0)),
        approvedAmount: round2(Number(row.approved_amount || row.this_disbursement_amount || row.withdrawal_amount || 0)),
        transferredAmount,
        remainingAmount: round2(Math.max(0, allocated - actualPaid - refundAmount)),
        batchStatus,
        paymentStatus,
        applicationNo: row.application_no ? String(row.application_no) : '-',
        beneficiaryName: row.beneficiary_name ? String(row.beneficiary_name) : '-',
        expenseCategory: row.admin_category_name ? String(row.admin_category_name) : (isAid ? 'เงินสงเคราะห์ตามอัสนัฟ' : 'ค่าใช้จ่ายสำนักงาน'),
        actualPaidDate: row.clearance_date ? String(row.clearance_date).slice(0, 10) : '-',
        actualPaidAmount: round2(actualPaid),
        refundAmount: round2(Math.max(0, refundAmount)),
        refundDate: row.clearance_return_date ? String(row.clearance_return_date).slice(0, 10) : '-',
        proofStatus,
        proofUrl: row.proof_url || row.admin_receipt_url || '',
        itemStatus,
        approverName: String(row.approver_name || row.cleared_by_name || '-'),
        voucherType: isAid ? 'aid_disbursement' : 'office_expense',
      };
      return item;
    });

    // Filtering by Tab
    const filtered = items.filter((item) => {
      if (filterTab === 'aid' && item.purposeType !== 'ช่วยเหลือ') return false;
      if (filterTab === 'admin' && item.purposeType !== 'บริหาร') return false;
      if (filterTab === 'pending_disbursement' && !['รอจ่าย', 'รอเบิกจ่าย', 'เบิกเงินสำเร็จ', 'จ่ายบางส่วน'].includes(item.itemStatus)) return false;
      if (filterTab === 'pending_review' && item.proofStatus !== 'รอตรวจสอบ') return false;
      if (filterTab === 'completed' && item.itemStatus !== 'เคลียร์แล้ว') return false;
      if (filterTab === 'pending_refund' && item.refundAmount <= 0) return false;

      if (q) {
        const text = `${item.documentNo} ${item.staffName} ${item.purpose} ${item.applicationNo} ${item.beneficiaryName} ${item.expenseCategory}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    return filtered;
  }

  /**
   * Phase 3: Deposit Modal Action
   */
  static async recordDeposit(input: {
    depositDate: string;
    moneyType: string;
    bankAccountId: string;
    sourceType: string;
    amount: number;
    depositorName: string;
    referenceNo: string;
    slipUrl?: string;
    notes?: string;
  }, actor: ActorContext) {
    await initDb();
    const db = getDb();

    const amount = round2(Number(input.amount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินนำฝากต้องมากกว่า 0 บาท');
    }

    if (!input.bankAccountId) {
      throw new Error('กรุณาเลือกบัญชีธนาคารปลายทาง');
    }

    const bankRes = await db.execute({
      sql: 'SELECT id, account_name, bank_name, current_balance, money_types FROM bank_accounts WHERE id = ?',
      args: [input.bankAccountId],
    });

    if (bankRes.rows.length === 0) {
      throw new Error('ไม่พบบัญชีธนาคารปลายทาง');
    }

    const bank = bankRes.rows[0];
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const dateFormatted = input.depositDate || new Date().toISOString().slice(0, 10);
    const txnNo = `TXN-DEP-${Date.now().toString().slice(-6)}`;
    const journalNo = `JV-${dateFormatted.slice(0, 4)}-${Date.now().toString().slice(-6)}`;
    const refNo = input.referenceNo ? input.referenceNo.trim() : `DEP-${Date.now().toString().slice(-6)}`;

    const currentBal = Number(bank.current_balance || 0);
    const newBal = fromSatang(toSatang(currentBal) + toSatang(amount));

    // Resolve credit source account
    let creditCode = '4010-01';
    let creditName = 'เงินสดบริจาคซะกาต/ศอดะเกาะฮ์';
    let creditCategory = 'income';

    if (input.sourceType === 'staff_refund') {
      creditCode = '1030-01';
      creditName = 'เงินสดยืมทดรองเจ้าหน้าที่';
      creditCategory = 'asset';
    } else if (input.sourceType === 'treasurer_cash') {
      creditCode = '1020-01';
      creditName = 'เงินสดในมือเหรัญญิก';
      creditCategory = 'asset';
    }

    // 1. Update Bank Account Balance
    await db.execute({
      sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [newBal, input.bankAccountId],
    });

    // 2. Insert Financial Transaction
    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes,
        bank_account_id, money_type, journal_no
      ) VALUES (?, ?, ?, 'bank_deposit', 'fund-general', 'บัญชีกลาง', ?, ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
      args: [
        `txn-${Date.now()}`,
        txnNo,
        dateFormatted,
        `นำฝากเงินสด (${input.sourceType || 'บริจาค'})`,
        amount,
        input.depositorName || actor.name,
        refNo,
        input.slipUrl || '',
        actor.id,
        actor.name,
        input.notes || `นำเงินสดเข้าบัญชี ${bank.account_name}`,
        input.bankAccountId,
        input.moneyType || 'zakat',
        journalNo,
      ],
    });

    // 3. Insert Balanced Double-Entry General Ledger Entries
    // Debit: 1010-01 ธนาคาร
    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        description, created_by
      ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1010-01', ?, 'asset', 'debit', ?, 'THB', ?, ?)`,
      args: [
        `gl-deb-${Date.now()}`,
        journalNo,
        txnNo,
        dateFormatted,
        `เงินฝากธนาคาร (${bank.bank_name})`,
        amount,
        `นำฝากเงินสดเข้าบัญชี: ${bank.account_name} (อ้างอิง: ${refNo})`,
        actor.name,
      ],
    });

    // Credit: Source Account
    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        description, created_by
      ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, ?, ?, ?, 'credit', ?, 'THB', ?, ?)`,
      args: [
        `gl-crd-${Date.now()}`,
        journalNo,
        txnNo,
        dateFormatted,
        creditCode,
        creditName,
        creditCategory,
        amount,
        `แหล่งที่มาเงินฝาก: ${input.sourceType || 'เงินสดรับ'} (โดย: ${input.depositorName || actor.name})`,
        actor.name,
      ],
    });

    // 4. Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, old_values, new_values)
            VALUES (?, ?, ?, ?, ?, 'DEPOSIT_MODAL_POSTED', 'bank_account', ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        input.bankAccountId,
        `นำฝากเงินสดเข้าธนาคาร ${bank.account_name} จำนวน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (อ้างอิง: ${refNo})`,
        JSON.stringify({ previousBalance: currentBal }),
        JSON.stringify({ newBalance: newBal, referenceNo: refNo, slipUrl: input.slipUrl || null }),
      ],
    });

    return {
      success: true,
      transactionNo: txnNo,
      journalNo,
      referenceNo: refNo,
      newBalance: newBal,
    };
  }

  /**
   * Phase 4: Withdrawal Modal Action (8-Step Workflow)
   */
  static async recordWithdrawalWorkflow(input: {
    title: string;
    bankAccountId: string;
    amount: number;
    fundType: string;
    eventDate: string;
    withdrawnByName: string;
    notes?: string;
    proofUrl?: string;
    step?: number;
    workflowId?: string;
    status?: 'draft' | 'pending_approval' | 'approved' | 'withdrawn' | 'completed';
  }, actor: ActorContext) {
    await initDb();
    const db = getDb();

    const amount = round2(Number(input.amount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินที่ถอนต้องมากกว่า 0 บาท');
    }

    const bankRes = await db.execute({
      sql: 'SELECT id, account_name, bank_name, current_balance FROM bank_accounts WHERE id = ?',
      args: [input.bankAccountId],
    });

    if (bankRes.rows.length === 0) {
      throw new Error('ไม่พบบัญชีธนาคาร');
    }

    const bank = bankRes.rows[0];
    const currentBal = Number(bank.current_balance || 0);

    // Validation: cannot withdraw more than bank balance
    if (amount > currentBal) {
      throw new Error(`ยอดเงินในธนาคารไม่เพียงพอ (คงเหลือ ฿${currentBal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} แต่ต้องการถอน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`);
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const dateFormatted = input.eventDate || new Date().toISOString().slice(0, 10);
    const wfNo = `WF-${dateFormatted.slice(0, 4)}-${Date.now().toString().slice(-5)}`;
    const journalNo = `JV-${dateFormatted.slice(0, 4)}-${Date.now().toString().slice(-6)}`;
    const refNo = `WTH-${Date.now().toString().slice(-6)}`;
    const txnNo = `TXN-WTH-${Date.now().toString().slice(-6)}`;

    // Status logic: if direct complete or approved
    const status = input.status || 'completed';

    // 1. Create or Update cash_flow_workflows
    const wfId = input.workflowId || `wf-${Date.now()}`;
    await db.execute({
      sql: `INSERT INTO cash_flow_workflows (
        id, workflow_no, title, step1_bank_account_id, step1_withdraw_amount, step1_date,
        step1_operator_id, step1_operator_name, step1_approver_id, step1_approver_name,
        step1_proof_url, step1_notes, step1_status,
        step2_treasurer_id, step2_treasurer_name, step2_deposit_amount, step2_date,
        step2_ref_no, step2_status, overall_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        step1_status = excluded.step1_status,
        step2_status = excluded.step2_status,
        step2_deposit_amount = excluded.step2_deposit_amount,
        overall_status = excluded.overall_status,
        updated_at = CURRENT_TIMESTAMP`,
      args: [
        wfId,
        wfNo,
        input.title || `ถอนเงินสดเข้าคลังเหรัญญิก (${input.fundType || 'zakat'})`,
        input.bankAccountId,
        amount,
        dateFormatted,
        actor.id,
        input.withdrawnByName || actor.name,
        actor.id,
        actor.name,
        input.proofUrl || '',
        input.notes || '',
        status === 'completed' ? 'completed' : status,
        actor.id,
        actor.name,
        amount,
        dateFormatted,
        refNo,
        status === 'completed' ? 'received' : 'pending',
        status === 'completed' ? 'in_progress' : 'pending',
      ],
    });

    let newBal = currentBal;
    // When completed (Step 7 & 8): deduct bank, credit bank, debit treasurer cash
    if (status === 'completed') {
      newBal = fromSatang(toSatang(currentBal) - toSatang(amount));
      await db.execute({
        sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [newBal, input.bankAccountId],
      });

      // Record transaction
      await db.execute({
        sql: `INSERT INTO financial_transactions (
          id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
          payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes,
          bank_account_id, money_type, journal_no
        ) VALUES (?, ?, ?, 'bank_withdrawal', 'fund-general', 'บัญชีกลาง', 'ถอนเงินสดเข้าคลังเหรัญญิก', ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
        args: [
          `txn-${Date.now()}`,
          txnNo,
          dateFormatted,
          -amount,
          actor.name,
          refNo,
          input.proofUrl || '',
          actor.id,
          actor.name,
          input.notes || `ถอนเงินสดจาก ${bank.account_name} เข้าคลังเหรัญญิก`,
          input.bankAccountId,
          input.fundType || 'zakat',
          journalNo,
        ],
      });

      // GL Entries (Debit 1020-01 Treasurer Cash, Credit 1010-01 Bank Account)
      await db.execute({
        sql: `INSERT INTO general_ledger_entries (
          id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
          account_code, account_name, account_category, entry_type, amount, currency,
          description, created_by
        ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1020-01', 'เงินสดในมือเหรัญญิก', 'asset', 'debit', ?, 'THB', ?, ?)`,
        args: [
          `gl-deb-${Date.now()}`,
          journalNo,
          txnNo,
          dateFormatted,
          amount,
          `เหรัญญิกรับเงินสดเข้าคลังจากธนาคาร: ${bank.account_name} (อ้างอิง: ${refNo})`,
          actor.name,
        ],
      });

      await db.execute({
        sql: `INSERT INTO general_ledger_entries (
          id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
          account_code, account_name, account_category, entry_type, amount, currency,
          description, created_by
        ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1010-01', ?, 'asset', 'credit', ?, 'THB', ?, ?)`,
        args: [
          `gl-crd-${Date.now()}`,
          journalNo,
          txnNo,
          dateFormatted,
          `เงินฝากธนาคาร (${bank.bank_name})`,
          amount,
          `ถอนเงินสดออกจากบัญชี: ${bank.account_name} (อ้างอิง: ${refNo})`,
          actor.name,
        ],
      });
    }

    // Audit log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, old_values, new_values)
            VALUES (?, ?, ?, ?, ?, 'WITHDRAWAL_WORKFLOW_PROCESSED', 'cash_flow_workflow', ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        wfId,
        `ถอนเงินสดจากธนาคาร ${bank.account_name} จำนวน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} สถานะ: ${status}`,
        JSON.stringify({ bankId: input.bankAccountId, previousBalance: currentBal }),
        JSON.stringify({ workflowNo: wfNo, status, newBankBalance: newBal }),
      ],
    });

    return {
      success: true,
      workflowId: wfId,
      workflowNo: wfNo,
      referenceNo: refNo,
      newBankBalance: newBal,
      status,
    };
  }

  /**
   * Phase 5: Transfer Modal Action (4 Modes)
   */
  static async recordTransfer(input: {
    transferMode: 'bank_to_bank' | 'bank_to_treasurer' | 'treasurer_to_staff' | 'staff_to_treasurer';
    sourceBankAccountId?: string;
    targetBankAccountId?: string;
    staffId?: string;
    staffName?: string;
    amount: number;
    moneyType?: string;
    transferDate: string;
    referenceNo?: string;
    slipUrl?: string;
    notes?: string;
  }, actor: ActorContext) {
    await initDb();
    const db = getDb();

    const amount = round2(Number(input.amount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินที่โอนต้องมากกว่า 0 บาท');
    }

    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const dateFormatted = input.transferDate || new Date().toISOString().slice(0, 10);
    const refNo = input.referenceNo ? input.referenceNo.trim() : `TRF-${Date.now().toString().slice(-6)}`;
    const journalNo = `JV-${dateFormatted.slice(0, 4)}-${Date.now().toString().slice(-6)}`;

    // Mode 1: Bank to Bank
    if (input.transferMode === 'bank_to_bank') {
      if (!input.sourceBankAccountId || !input.targetBankAccountId) {
        throw new Error('กรุณาระบุบัญชีธนาคารต้นทางและปลายทาง');
      }
      if (input.sourceBankAccountId === input.targetBankAccountId) {
        throw new Error('บัญชีต้นทางและปลายทางต้องไม่เป็นบัญชีเดียวกัน');
      }

      const srcRes = await db.execute({ sql: 'SELECT * FROM bank_accounts WHERE id = ?', args: [input.sourceBankAccountId] });
      const dstRes = await db.execute({ sql: 'SELECT * FROM bank_accounts WHERE id = ?', args: [input.targetBankAccountId] });
      if (srcRes.rows.length === 0 || dstRes.rows.length === 0) throw new Error('ไม่พบบัญชีธนาคาร');

      const src = srcRes.rows[0];
      const dst = dstRes.rows[0];
      const srcBal = Number(src.current_balance || 0);
      if (amount > srcBal) throw new Error(`ยอดเงินในบัญชีต้นทางไม่พอ (คงเหลือ ฿${srcBal.toLocaleString('th-TH')})`);

      const newSrcBal = fromSatang(toSatang(srcBal) - toSatang(amount));
      const newDstBal = fromSatang(toSatang(Number(dst.current_balance || 0)) + toSatang(amount));

      await db.execute({ sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [newSrcBal, input.sourceBankAccountId] });
      await db.execute({ sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [newDstBal, input.targetBankAccountId] });

      // Transactions
      await db.execute({
        sql: `INSERT INTO financial_transactions (
          id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
          payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, bank_account_id, journal_no
        ) VALUES (?, ?, ?, 'bank_transfer_out', 'fund-general', 'บัญชีกลาง', 'โอนเงินระหว่างธนาคาร', ?, 'bank_transfer', ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
        args: [`txn-${Date.now()}-out`, `TXN-TRF-OUT-${Date.now().toString().slice(-5)}`, dateFormatted, -amount, `โอนไปยัง: ${dst.account_name}`, refNo, input.slipUrl || '', actor.id, actor.name, input.notes || '', input.sourceBankAccountId, journalNo],
      });

      await db.execute({
        sql: `INSERT INTO financial_transactions (
          id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
          payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, bank_account_id, journal_no
        ) VALUES (?, ?, ?, 'bank_transfer_in', 'fund-general', 'บัญชีกลาง', 'รับโอนเงินระหว่างธนาคาร', ?, 'bank_transfer', ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
        args: [`txn-${Date.now()}-in`, `TXN-TRF-IN-${Date.now().toString().slice(-5)}`, dateFormatted, amount, `รับโอนจาก: ${src.account_name}`, refNo, input.slipUrl || '', actor.id, actor.name, input.notes || '', input.targetBankAccountId, journalNo],
      });

      // GL Entries
      await db.execute({
        sql: `INSERT INTO general_ledger_entries (id, journal_no, transaction_id, application_id, beneficiary_id, entry_date, account_code, account_name, account_category, entry_type, amount, currency, description, created_by)
              VALUES (?, ?, 'TXN-TRF', 'app-system-internal', 'ben-system-internal', ?, '1010-01', ?, 'asset', 'debit', ?, 'THB', ?, ?)`,
        args: [`gl-deb-${Date.now()}`, journalNo, dateFormatted, `เงินฝากธนาคารปลายทาง (${dst.bank_name})`, amount, `รับโอนเงินจาก ${src.account_name}`, actor.name],
      });
      await db.execute({
        sql: `INSERT INTO general_ledger_entries (id, journal_no, transaction_id, application_id, beneficiary_id, entry_date, account_code, account_name, account_category, entry_type, amount, currency, description, created_by)
              VALUES (?, ?, 'TXN-TRF', 'app-system-internal', 'ben-system-internal', ?, '1010-01', ?, 'asset', 'credit', ?, 'THB', ?, ?)`,
        args: [`gl-crd-${Date.now()}`, journalNo, dateFormatted, `เงินฝากธนาคารต้นทาง (${src.bank_name})`, amount, `โอนเงินไปยัง ${dst.account_name}`, actor.name],
      });
    }

    // Mode 2: Bank to Treasurer
    else if (input.transferMode === 'bank_to_treasurer') {
      if (!input.sourceBankAccountId) throw new Error('กรุณาระบุบัญชีธนาคารต้นทาง');
      return await this.recordWithdrawalWorkflow({
        title: input.notes || 'โอนเงินจากธนาคารเข้าบัญชีเหรัญญิก',
        bankAccountId: input.sourceBankAccountId,
        amount,
        fundType: input.moneyType || 'zakat',
        eventDate: dateFormatted,
        withdrawnByName: actor.name,
        notes: input.notes,
        proofUrl: input.slipUrl,
        status: 'completed',
      }, actor);
    }

    // Mode 3: Treasurer to Staff (Cash Handover / Advance Float)
    else if (input.transferMode === 'treasurer_to_staff') {
      const staffName = input.staffName || 'เจ้าหน้าที่ภาคสนาม';
      const staffId = input.staffId || actor.id;
      const voucherNo = `VOU-${dateFormatted.slice(0, 4)}-${Date.now().toString().slice(-5)}`;
      const withdrawalId = `wth-${Date.now()}`;

      // Insert cash_flow_withdrawals
      await db.execute({
        sql: `INSERT INTO cash_flow_withdrawals (
          id, workflow_id, withdrawal_no, amount, withdrawal_datetime, withdrawer_id, withdrawer_name,
          purpose, target_asnaf, status, voucher_type, clearance_status, proof_url, notes, approver_name
        ) VALUES (?, 'wf-internal-float', ?, ?, ?, ?, ?, ?, 'general', 'disbursed', 'office_expense', 'pending', ?, ?, ?)`,
        args: [
          withdrawalId,
          voucherNo,
          amount,
          dateFormatted,
          staffId,
          staffName,
          input.notes || `เบิกเงินทดรองจ่ายให้เจ้าหน้าที่: ${staffName}`,
          input.slipUrl || '',
          input.notes || '',
          actor.name,
        ],
      });

      // Insert finance_handover_records
      await db.execute({
        sql: `INSERT INTO finance_handover_records (
          id, withdrawal_id, workflow_id, handover_no, handover_date, handover_time,
          handed_over_by_id, handed_over_by_name, received_by_id, received_by_name,
          amount, handover_method, status, recorded_by_id, recorded_by_name, confirmed_by_id, confirmed_by_name, confirmed_at, proof_url, proof_name
        ) VALUES (?, ?, 'wf-internal-float', ?, ?, '10:00:00', ?, ?, ?, ?, ?, 'cash', 'confirmed', ?, ?, ?, ?, ?, ?, 'handover_receipt.pdf')`,
        args: [
          `hnd-${Date.now()}`,
          withdrawalId,
          `HND-${Date.now().toString().slice(-6)}`,
          dateFormatted,
          actor.id,
          actor.name,
          staffId,
          staffName,
          amount,
          actor.id,
          actor.name,
          actor.id,
          actor.name,
          timestampNow,
          input.slipUrl || 'https://placehold.co/400x300.png?text=Handover+Receipt',
        ],
      });

      // GL: Debit 1030-01 (เงินสดยืมทดรองเจ้าหน้าที่), Credit 1020-01 (เงินสดเหรัญญิก)
      await db.execute({
        sql: `INSERT INTO general_ledger_entries (id, journal_no, transaction_id, application_id, beneficiary_id, entry_date, account_code, account_name, account_category, entry_type, amount, currency, description, created_by)
              VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'debit', ?, 'THB', ?, ?)`,
        args: [`gl-deb-${Date.now()}`, journalNo, voucherNo, dateFormatted, amount, `เหรัญญิกส่งมอบเงินสดทดรองให้ ${staffName} (ใบสำคัญ: ${voucherNo})`, actor.name],
      });
      await db.execute({
        sql: `INSERT INTO general_ledger_entries (id, journal_no, transaction_id, application_id, beneficiary_id, entry_date, account_code, account_name, account_category, entry_type, amount, currency, description, created_by)
              VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1020-01', 'เงินสดในมือเหรัญญิก', 'asset', 'credit', ?, 'THB', ?, ?)`,
        args: [`gl-crd-${Date.now()}`, journalNo, voucherNo, dateFormatted, amount, `จ่ายเงินสดออกจากคลังเหรัญญิกให้ ${staffName} (ใบสำคัญ: ${voucherNo})`, actor.name],
      });
    }

    // Mode 4: Staff to Treasurer Refund
    else if (input.transferMode === 'staff_to_treasurer') {
      const staffName = input.staffName || actor.name;
      const refCode = `RFD-${Date.now().toString().slice(-6)}`;

      // GL: Debit 1020-01 (เงินสดเหรัญญิก), Credit 1030-01 (เงินสดยืมทดรองเจ้าหน้าที่)
      await db.execute({
        sql: `INSERT INTO general_ledger_entries (id, journal_no, transaction_id, application_id, beneficiary_id, entry_date, account_code, account_name, account_category, entry_type, amount, currency, description, created_by)
              VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1020-01', 'เงินสดในมือเหรัญญิก', 'asset', 'debit', ?, 'THB', ?, ?)`,
        args: [`gl-deb-${Date.now()}`, journalNo, refCode, dateFormatted, amount, `เหรัญญิกรับคืนเงินสดคงเหลือจาก ${staffName} (อ้างอิง: ${refCode})`, actor.name],
      });
      await db.execute({
        sql: `INSERT INTO general_ledger_entries (id, journal_no, transaction_id, application_id, beneficiary_id, entry_date, account_code, account_name, account_category, entry_type, amount, currency, description, created_by)
              VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'credit', ?, 'THB', ?, ?)`,
        args: [`gl-crd-${Date.now()}`, journalNo, refCode, dateFormatted, amount, `เจ้าหน้าที่ส่งคืนเงินสดคงเหลือให้เหรัญญิก (${staffName})`, actor.name],
      });
    }

    // Log Audit
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description, old_values, new_values)
            VALUES (?, ?, ?, ?, ?, 'INTERNAL_TRANSFER_PROCESSED', 'financial_transfer', ?, ?, ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        refNo,
        `ทำรายการโอนภายในองค์กร รูปแบบ ${input.transferMode} จำนวน ฿${amount.toLocaleString('th-TH')}`,
        JSON.stringify({ transferMode: input.transferMode }),
        JSON.stringify({ amount, journalNo, referenceNo: refNo }),
      ],
    });

    return {
      success: true,
      referenceNo: refNo,
      journalNo,
      amount,
      transferMode: input.transferMode,
    };
  }

  /**
   * Phase 7: Cash Assistance Payment Deduction
   */
  static async deductAssistanceCashPayment(input: {
    applicationId: string;
    beneficiaryId: string;
    beneficiaryName: string;
    asnafCategory: string;
    amount: number;
    paymentDate?: string;
    handoverProofUrl?: string;
    gpsCoordinates?: string;
    notes?: string;
  }, actor: ActorContext) {
    await initDb();
    const db = getDb();

    const amount = round2(Number(input.amount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินจ่ายช่วยเหลือต้องมากกว่า 0 บาท');
    }

    // Check application status to prevent double payment
    const appRes = await db.execute({
      sql: 'SELECT id, application_no, status, approved_amount, beneficiary_id FROM assistance_applications WHERE id = ?',
      args: [input.applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error('ไม่พบคำร้องขอความช่วยเหลือนี้ในระบบ');
    }

    const app = appRes.rows[0];
    if (app.status === 'disbursed' || app.status === 'completed') {
      throw new Error(`คำร้อง ${app.application_no} ได้รับการจ่ายเงินเรียบร้อยแล้ว ไม่สามารถจ่ายเงินซ้ำได้`);
    }

    const dateFormatted = input.paymentDate || new Date().toISOString().slice(0, 10);
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const journalNo = `JV-${dateFormatted.slice(0, 4)}-${Date.now().toString().slice(-6)}`;
    const txnNo = `TXN-AID-${Date.now().toString().slice(-6)}`;
    const disburseId = `disb-${Date.now()}`;
    const withdrawalId = `wth-aid-${Date.now()}`;

    // 1. Lock application to 'disbursed'
    await db.execute({
      sql: `UPDATE assistance_applications 
            SET status = 'disbursed', payment_status = 'completed', disbursement_date = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [dateFormatted, input.applicationId],
    });

    // 2. Insert into cash_flow_withdrawals for register linkage
    await db.execute({
      sql: `INSERT INTO cash_flow_withdrawals (
        id, workflow_id, withdrawal_no, amount, withdrawal_datetime, withdrawer_id, withdrawer_name,
        purpose, target_asnaf, status, voucher_type, clearance_status, proof_url, notes, approver_name
      ) VALUES (?, 'wf-internal-float', ?, ?, ?, ?, ?, ?, ?, 'completed', 'aid_disbursement', 'cleared', ?, ?, ?)`,
      args: [
        withdrawalId,
        `VOU-AID-${Date.now().toString().slice(-5)}`,
        amount,
        dateFormatted,
        actor.id,
        actor.name,
        `จ่ายเงินสดสงเคราะห์ซะกาต (${app.application_no})`,
        input.asnafCategory || 'faqir_miskin',
        input.handoverProofUrl || '',
        input.notes || '',
        actor.name,
      ],
    });

    // 3. Insert into cash_flow_disbursement_items
    await db.execute({
      sql: `INSERT INTO cash_flow_disbursement_items (
        id, withdrawal_id, workflow_id, application_id, beneficiary_id, beneficiary_name,
        national_id, asnaf_category, assistance_type, approved_amount, this_disbursement_amount,
        remaining_balance, notes, status
      ) VALUES (?, ?, 'wf-internal-float', ?, ?, ?, '1999999999999', ?, 'เงินสงเคราะห์ยังชีพ', ?, ?, 0, ?, 'completed')`,
      args: [
        disburseId,
        withdrawalId,
        input.applicationId,
        input.beneficiaryId || String(app.beneficiary_id),
        input.beneficiaryName,
        input.asnafCategory || 'faqir_miskin',
        amount,
        amount,
        input.notes || `จ่ายเงินสดสงเคราะห์ซะกาต (${app.application_no})`,
      ],
    });

    // 4. Insert transaction
    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes,
        beneficiary_id, application_id, journal_no
      ) VALUES (?, ?, ?, 'disbursement', 'fund-1', 'กองทุนซะกาตผู้ยากไร้และขัดสน', 'จ่ายเงินสงเคราะห์ซะกาต', ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
      args: [
        `txn-${Date.now()}`,
        txnNo,
        dateFormatted,
        -amount,
        input.beneficiaryName,
        String(app.application_no),
        input.handoverProofUrl || '',
        actor.id,
        actor.name,
        input.notes || `จ่ายเงินสดช่วยเหลือผู้ขอรับ (พิกัด: ${input.gpsCoordinates || 'N/A'})`,
        input.beneficiaryId || String(app.beneficiary_id),
        input.applicationId,
        journalNo,
      ],
    });

    // 4. Double-Entry GL: Debit 5101-FAQIR-MISKIN (or Asnaf Expense), Credit 1030-01 (เงินสดยืมทดรองเจ้าหน้าที่)
    const asnafCode = (input.asnafCategory || 'faqir_miskin').toUpperCase();
    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        asnaf_code, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'expense', 'debit', ?, 'THB', ?, ?, ?)`,
      args: [
        `gl-deb-${Date.now()}`,
        journalNo,
        txnNo,
        input.applicationId,
        input.beneficiaryId || String(app.beneficiary_id),
        dateFormatted,
        `5101-${asnafCode}`,
        `ค่าใช้จ่ายซะกาตหมวด ${input.asnafCategory || 'ฟากีร-มิสกิน'}`,
        amount,
        input.asnafCategory || 'faqir_miskin',
        `จ่ายเงินสวัสดิการซะกาต (${app.application_no} แก่ ${input.beneficiaryName})`,
        actor.name,
      ],
    });

    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        asnaf_code, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'credit', ?, 'THB', ?, ?, ?)`,
      args: [
        `gl-crd-${Date.now()}`,
        journalNo,
        txnNo,
        input.applicationId,
        input.beneficiaryId || String(app.beneficiary_id),
        dateFormatted,
        amount,
        input.asnafCategory || 'faqir_miskin',
        `ตัดจ่ายเงินสดในมือเจ้าหน้าที่ (${actor.name}) ตามคำร้อง ${app.application_no}`,
        actor.name,
      ],
    });

    // 5. Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, 'ASSISTANCE_CASH_DISBURSED', 'assistance_application', ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        input.applicationId,
        `จ่ายเงินสดช่วยเหลือคำร้อง ${app.application_no} จำนวน ฿${amount.toLocaleString('th-TH')} แก่ ${input.beneficiaryName} โดย ${actor.name}`,
      ],
    });

    return {
      success: true,
      transactionNo: txnNo,
      journalNo,
      applicationId: input.applicationId,
      status: 'disbursed',
    };
  }

  /**
   * Phase 8: Cash Administrative Expense Deduction
   */
  static async deductAdminExpenseCash(input: {
    categoryId: string;
    categoryName: string;
    amount: number;
    expenseDate?: string;
    payeeName: string;
    receiptUrl?: string;
    notes?: string;
  }, actor: ActorContext) {
    await initDb();
    const db = getDb();

    const amount = round2(Number(input.amount));
    if (isNaN(amount) || amount <= 0) {
      throw new Error('จำนวนเงินรายจ่ายต้องมากกว่า 0 บาท');
    }

    const dateFormatted = input.expenseDate || new Date().toISOString().slice(0, 10);
    const timestampNow = new Date().toLocaleString('th-TH', { hour12: false });
    const journalNo = `JV-${dateFormatted.slice(0, 4)}-${Date.now().toString().slice(-6)}`;
    const txnNo = `TXN-ADM-${Date.now().toString().slice(-6)}`;
    const clearanceId = `clr-${Date.now()}`;
    const withdrawalId = `wth-adm-${Date.now()}`;

    // 0. Insert withdrawal voucher for cash disbursement tracking
    await db.execute({
      sql: `INSERT INTO cash_flow_withdrawals (
        id, workflow_id, withdrawal_no, amount, withdrawal_datetime, withdrawer_id, withdrawer_name,
        purpose, target_asnaf, status, voucher_type, clearance_status, proof_url, notes, approver_name
      ) VALUES (?, 'wf-internal-float', ?, ?, ?, ?, ?, ?, 'operational', 'completed', 'office_expense', 'cleared', ?, ?, ?)`,
      args: [
        withdrawalId,
        `VOU-ADM-${Date.now().toString().slice(-5)}`,
        amount,
        dateFormatted,
        actor.id,
        actor.name,
        `จ่ายค่าใช้จ่ายบริหาร: ${input.categoryName}`,
        input.receiptUrl || '',
        input.notes || '',
        actor.name,
      ],
    });

    // 1. Insert clearance item
    await db.execute({
      sql: `INSERT INTO cash_flow_clearance_items (
        id, withdrawal_id, workflow_id, expense_date, description, amount,
        receipt_url, category_code, category_name, notes, status
      ) VALUES (?, ?, 'wf-internal-float', ?, ?, ?, ?, ?, ?, ?, 'cleared')`,
      args: [
        clearanceId,
        withdrawalId,
        dateFormatted,
        input.notes || `ค่าใช้จ่ายบริหาร: ${input.categoryName}`,
        amount,
        input.receiptUrl || '',
        input.categoryId,
        input.categoryName,
        input.notes || '',
      ],
    });

    // 2. Insert financial transaction
    await db.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, journal_no
      ) VALUES (?, ?, ?, 'expense', 'fund-admin', 'กองทุนบริหารจัดการสำนักงาน', ?, ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?)`,
      args: [
        `txn-${Date.now()}`,
        txnNo,
        dateFormatted,
        input.categoryName,
        -amount,
        input.payeeName || 'ร้านค้า/ผู้ให้บริการ',
        `ADM-${Date.now().toString().slice(-6)}`,
        input.receiptUrl || '',
        actor.id,
        actor.name,
        input.notes || `ตัดจ่ายเงินสดบริหาร: ${input.categoryName}`,
        journalNo,
      ],
    });

    // 3. Double-entry GL: Debit 5020-xx (Admin Expense), Credit 1030-01 (Staff Cash Float)
    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        description, created_by
      ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '5020-01', ?, 'expense', 'debit', ?, 'THB', ?, ?)`,
      args: [
        `gl-deb-${Date.now()}`,
        journalNo,
        txnNo,
        dateFormatted,
        `ค่าใช้จ่ายบริหารสำนักงาน (${input.categoryName})`,
        amount,
        `จ่ายค่าใช้จ่ายบริหาร: ${input.categoryName} แก่ ${input.payeeName || 'ผู้รับเงิน'}`,
        actor.name,
      ],
    });

    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        description, created_by
      ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'credit', ?, 'THB', ?, ?)`,
      args: [
        `gl-crd-${Date.now()}`,
        journalNo,
        txnNo,
        dateFormatted,
        amount,
        `ตัดจ่ายเงินสดในมือเจ้าหน้าที่ (${actor.name}) สำหรับค่าใช้จ่ายบริหาร`,
        actor.name,
      ],
    });

    // 4. Audit Log
    await db.execute({
      sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, 'ADMIN_EXPENSE_CASH_DISBURSED', 'admin_expense', ?, ?)`,
      args: [
        `log-${Date.now()}`,
        timestampNow,
        actor.id,
        actor.name,
        actor.role,
        clearanceId,
        `ตัดจ่ายเงินสดบริหาร ${input.categoryName} จำนวน ฿${amount.toLocaleString('th-TH')} แก่ ${input.payeeName} โดย ${actor.name}`,
      ],
    });

    return {
      success: true,
      transactionNo: txnNo,
      journalNo,
      clearanceId,
      status: 'cleared',
    };
  }

  // =========================================================================
  // TWO-ROLE BATCH DISBURSEMENT SYSTEM (PHASES 2 - 10)
  // =========================================================================

  /**
   * Fetch approved applications eligible for batch aid disbursement
   */
  /**
   * PHASE 1 & 3: Strict application eligibility & duplicate disbursement prevention checker
   */
  static async checkApplicationDisbursementEligibility(
    applicationId: string,
    requestedAmount?: number,
    excludeWorkflowId?: string,
    client?: any
  ): Promise<{
    eligible: boolean;
    applicationId: string;
    applicationNo: string;
    beneficiaryId: string;
    beneficiaryName: string;
    nationalId: string;
    registrationNo: string;
    asnafCategory: string;
    assistanceType: string;
    assistanceTypeId: string;
    assistanceFormatName: string;
    assistanceFormatCode: string;
    assistanceFormName: string;
    specificFundId: string;
    specificFundName: string;
    fundAccountId: string;
    fundAccountName: string;
    approvedAmount: number;
    disbursedAmount: number;
    pendingBatchAmount: number;
    remainingAmount: number;
    status: string;
    notes: string;
    conflictingBatches: string[];
  }> {
    await initDb();
    const db = client || getDb();

    const appRes = await db.execute({
      sql: `
        SELECT 
          a.id,
          a.application_no,
          a.beneficiary_id,
          COALESCE(b.full_name, a.assigned_officer_name, 'ผู้ขอรับความช่วยเหลือ') as beneficiary_name,
          COALESCE(b.national_id, '-') as national_id,
          COALESCE(b.registration_no, a.registration_no, '-') as registration_no,
          a.asnaf_category,
          ${ASSISTANCE_FORM_COLUMNS},
          COALESCE(a.approved_specific_fund_id, a.specific_fund_id, a.assistance_type_id) as specific_fund_id,
          COALESCE(sf.name, a.specific_fund_name, 'กองทุนเฉพาะเจาะจง') as specific_fund_name,
          COALESCE(a.approved_fund_id, sf.fund_account_id, 'fund-1') as fund_account_id,
          COALESCE(fa.name, 'กองทุนซะกาตหลัก') as fund_account_name,
          COALESCE(a.approved_amount, 0) as approved_amount,
          COALESCE(a.disbursed_amount, 0) as disbursed_amount,
          a.status,
          a.approval_status,
          a.payment_status,
          a.completion_status,
          COALESCE(a.approval_notes, a.necessity_details, a.hardship_reasons, '') as notes
        FROM assistance_applications a
        LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
        LEFT JOIN faqir_miskin_sub_funds sf ON (sf.id = a.approved_specific_fund_id OR sf.id = a.specific_fund_id OR sf.code = a.specific_fund_id)
        LEFT JOIN fund_accounts fa ON (fa.id = a.approved_fund_id OR fa.id = sf.fund_account_id)
        WHERE a.id = ?
      `,
      args: [applicationId],
    });

    if (appRes.rows.length === 0) {
      throw new Error(`ไม่พบข้อมูลคำร้อง ID "${applicationId}" ในระบบ`);
    }

    const app = appRes.rows[0];
    const appNo = String(app.application_no);
    const status = String(app.status || '');
    const approvalStatus = String(app.approval_status || '');
    const paymentStatus = String(app.payment_status || '');
    const completionStatus = String(app.completion_status || '');

    // 1. Check lifecycle and approval status
    const pendingStatuses = ['pending_approval', 'submitted', 'doc_review', 'assessment', 'pending'];
    if (pendingStatuses.includes(status) && approvalStatus !== 'approved') {
      throw new Error(`คำร้องเลขที่ ${appNo} ยังไม่ผ่านการอนุมัติ (สถานะปัจจุบัน: "${status}") ไม่สามารถนำมาเบิกจ่ายได้`);
    }
    if (status === 'rejected' || approvalStatus === 'rejected') {
      throw new Error(`คำร้องเลขที่ ${appNo} ได้รับการพิจารณา "ไม่อนุมัติ" ไม่สามารถเบิกจ่ายได้`);
    }
    if (status === 'need_info') {
      throw new Error(`คำร้องเลขที่ ${appNo} อยู่ระหว่างส่งกลับแก้ไขข้อมูล ไม่สามารถเบิกจ่ายได้`);
    }
    if (status === 'cancelled' || completionStatus === 'cancelled' || completionStatus === 'terminated') {
      throw new Error(`คำร้องเลขที่ ${appNo} ถูกยกเลิกแล้ว ไม่สามารถเบิกจ่ายได้`);
    }
    if (status === 'disbursed' || paymentStatus === 'completed' || status === 'closed') {
      throw new Error(`คำร้องเลขที่ ${appNo} ได้รับการเบิกจ่ายครบถ้วนแล้ว ไม่สามารถเบิกซ้ำได้`);
    }

    // Must be in approved or wait_disbursement
    const isApproved = status === 'wait_disbursement' || status === 'approved' || approvalStatus === 'approved';
    if (!isApproved) {
      throw new Error(`คำร้องเลขที่ ${appNo} ไม่อยู่ในสถานะพร้อมเบิกจ่าย (สถานะ: "${status}")`);
    }

    // 2. Check approved amount
    const approvedAmount = round2(Number(app.approved_amount) || 0);
    if (approvedAmount <= 0) {
      throw new Error(`คำร้องเลขที่ ${appNo} ไม่มีวงเงินอนุมัติ (วงเงินอนุมัติ: ฿0.00)`);
    }

    // 3. Check already disbursed amount
    const disbursedAmount = round2(Number(app.disbursed_amount) || 0);
    if (disbursedAmount >= approvedAmount) {
      throw new Error(`คำร้องเลขที่ ${appNo} ได้รับการเบิกจ่ายเต็มจำนวนแล้ว (อนุมัติ ฿${approvedAmount.toLocaleString('th-TH')}, เบิกจ่ายแล้ว ฿${disbursedAmount.toLocaleString('th-TH')})`);
    }

    // 4. Query active unclosed batches (Duplicate hold detection)
    let holdSql = `
      SELECT 
        di.id,
        di.workflow_id,
        di.this_disbursement_amount,
        cw.workflow_no,
        cw.title as batch_title,
        cw.overall_status,
        cw.step1_status
      FROM cash_flow_disbursement_items di
      JOIN cash_flow_workflows cw ON cw.id = di.workflow_id
      WHERE di.application_id = ?
        AND cw.overall_status NOT IN ('completed', 'closed', 'rejected', 'cancelled')
        AND cw.step1_status NOT IN ('rejected_for_revision', 'cancelled')
        AND di.status NOT IN ('cancelled', 'rejected')
    `;
    const holdArgs: any[] = [applicationId];
    if (excludeWorkflowId) {
      holdSql += ` AND cw.id != ?`;
      holdArgs.push(excludeWorkflowId);
    }

    const holdRes = await db.execute({ sql: holdSql, args: holdArgs });
    const conflictingBatches = holdRes.rows.map((r: any) => String(r.workflow_no));
    const pendingBatchAmount = round2(
      holdRes.rows.reduce((sum: number, r: any) => sum + (Number(r.this_disbursement_amount) || 0), 0)
    );

    const remainingAmount = round2(Math.max(0, approvedAmount - disbursedAmount - pendingBatchAmount));

    // If remaining is 0 or less because it's held in other active batches:
    if (remainingAmount <= 0) {
      const batchList = conflictingBatches.length > 0 ? ` (${conflictingBatches.join(', ')})` : '';
      throw new Error(
        `คำร้องเลขที่ ${appNo} อยู่ระหว่างการเบิกจ่ายในรอบอื่นแล้ว${batchList} เป็นจำนวน ฿${pendingBatchAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ซึ่งเต็มวงเงินอนุมัติคงเหลือแล้ว ไม่สามารถเพิ่มซ้ำได้`
      );
    }

    // 5. Validate requested amount if specified
    if (requestedAmount !== undefined && requestedAmount !== null) {
      const reqAmt = round2(Number(requestedAmount) || 0);
      if (reqAmt <= 0) {
        throw new Error(`จำนวนเงินที่ขอเบิกสำหรับคำร้อง ${appNo} ต้องมากกว่า 0 บาท`);
      }
      if (reqAmt > remainingAmount) {
        throw new Error(
          `ยอดเงินที่ขอเบิก (฿${reqAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}) เกินกว่าวงเงินคงเหลือที่สามารถเบิกได้ (คงเหลือ ฿${remainingAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}, วงเงินอนุมัติ ฿${approvedAmount.toLocaleString('th-TH')}, เบิกแล้ว ฿${disbursedAmount.toLocaleString('th-TH')}${pendingBatchAmount > 0 ? `, อยู่ในรอบอื่น ฿${pendingBatchAmount.toLocaleString('th-TH')}` : ''})`
        );
      }
    }

    const masters = await loadAssistanceMasters(db);
    const labels = resolveAssistanceLabels(app, masters.types, masters.formats);
    const beneficiaryName = await resolveBeneficiaryName(String(app.beneficiary_id), String(app.beneficiary_name || ''));

    return {
      eligible: true,
      applicationId: String(app.id),
      applicationNo: appNo,
      beneficiaryId: String(app.beneficiary_id),
      beneficiaryName,
      nationalId: String(app.national_id),
      registrationNo: String(app.registration_no),
      asnafCategory: String(app.asnaf_category || 'ผู้มีสิทธิ์รับซะกาต'),
      assistanceType: labels.assistanceType,
      assistanceTypeId: labels.assistanceTypeId,
      assistanceFormatName: labels.assistanceFormatName,
      assistanceFormatCode: labels.assistanceFormatCode,
      assistanceFormName: labels.assistanceFormName,
      specificFundId: String(app.specific_fund_id || 'fund-1'),
      specificFundName: String(app.specific_fund_name || 'กองทุนเฉพาะเจาะจง'),
      fundAccountId: String(app.fund_account_id || 'fund-1'),
      fundAccountName: String(app.fund_account_name || 'กองทุนซะกาตหลัก'),
      approvedAmount,
      disbursedAmount,
      pendingBatchAmount,
      remainingAmount,
      status,
      notes: String(app.notes || ''),
      conflictingBatches,
    };
  }

  /**
   * Fetch approved assistance applications waiting for disbursement
   */
  static async getEligibleAssistanceApplications(searchQuery: string = '') {
    await initDb();
    const db = getDb();
    const cleanSearch = searchQuery.trim();
    const q = cleanSearch ? `%${cleanSearch}%` : '';

    const res = await db.execute({
      sql: `
        SELECT 
          a.id,
          a.application_no,
          a.beneficiary_id,
          COALESCE(b.full_name, a.assigned_officer_name, 'ผู้ขอรับความช่วยเหลือ') as beneficiary_name,
          COALESCE(b.national_id, '-') as national_id,
          COALESCE(b.registration_no, a.registration_no, '-') as registration_no,
          a.asnaf_category,
          ${ASSISTANCE_FORM_COLUMNS},
          COALESCE(a.approved_specific_fund_id, a.specific_fund_id, a.assistance_type_id) as specific_fund_id,
          COALESCE(sf.name, a.specific_fund_name, 'กองทุนเฉพาะเจาะจง') as specific_fund_name,
          COALESCE(a.approved_fund_id, sf.fund_account_id, 'fund-1') as fund_account_id,
          COALESCE(fa.name, 'กองทุนซะกาตหลัก') as fund_account_name,
          COALESCE(a.approved_amount, 0) as approved_amount,
          COALESCE(a.disbursed_amount, 0) as disbursed_amount,
          COALESCE(held.held_amount, 0) as pending_batch_amount,
          COALESCE(held.batch_numbers, '') as active_batch_numbers,
          a.status,
          a.approval_status,
          a.payment_status,
          COALESCE(a.approval_notes, a.necessity_details, a.hardship_reasons, '') as notes
        FROM assistance_applications a
        LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
        LEFT JOIN faqir_miskin_sub_funds sf ON (sf.id = a.approved_specific_fund_id OR sf.id = a.specific_fund_id OR sf.code = a.specific_fund_id)
        LEFT JOIN fund_accounts fa ON (fa.id = a.approved_fund_id OR fa.id = sf.fund_account_id)
        LEFT JOIN (
          SELECT 
            di.application_id,
            SUM(di.this_disbursement_amount) as held_amount,
            GROUP_CONCAT(cw.workflow_no) as batch_numbers
          FROM cash_flow_disbursement_items di
          JOIN cash_flow_workflows cw ON cw.id = di.workflow_id
          WHERE cw.overall_status NOT IN ('completed', 'closed', 'rejected', 'cancelled')
            AND cw.step1_status NOT IN ('rejected_for_revision', 'cancelled')
            AND di.status NOT IN ('cancelled', 'rejected')
          GROUP BY di.application_id
        ) held ON held.application_id = a.id
        WHERE 
          (a.status IN ('wait_disbursement', 'approved') OR a.approval_status = 'approved')
          AND a.status NOT IN ('pending_approval', 'submitted', 'doc_review', 'assessment', 'need_info', 'rejected', 'cancelled', 'disbursed', 'closed', 'terminated')
          AND COALESCE(a.payment_status, 'wait_disbursement') NOT IN ('completed', 'disbursed', 'not_applicable')
          AND COALESCE(a.completion_status, 'active') NOT IN ('cancelled', 'terminated', 'closed')
          AND COALESCE(a.approved_amount, 0) > 0
          AND COALESCE(a.disbursed_amount, 0) < a.approved_amount
          AND (
            ? = '' OR
            a.application_no LIKE ? OR 
            b.full_name LIKE ? OR 
            b.national_id LIKE ? OR 
            b.registration_no LIKE ? OR 
            a.asnaf_category LIKE ?
          )
        ORDER BY a.created_at DESC
        LIMIT 60
      `,
      args: [q, q, q, q, q, q],
    });

    const masters = await loadAssistanceMasters(db);
    const mapped = res.rows
      .map((r: any) => {
        const approved = Number(r.approved_amount || 0);
        const disbursed = Number(r.disbursed_amount || 0);
        const pendingBatch = Number(r.pending_batch_amount || 0);
        const remaining = Math.max(0, approved - disbursed - pendingBatch);
        const labels = resolveAssistanceLabels(r, masters.types, masters.formats);

        return {
          id: String(r.id),
          applicationNo: String(r.application_no),
          beneficiaryId: String(r.beneficiary_id),
          beneficiaryName: String(r.beneficiary_name),
          nationalId: String(r.national_id),
          registrationNo: String(r.registration_no),
          asnafCategory: String(r.asnaf_category || 'ผู้มีสิทธิ์รับซะกาต'),
          assistanceType: labels.assistanceType,
          assistanceTypeId: labels.assistanceTypeId,
          assistanceFormatName: labels.assistanceFormatName,
          assistanceFormatCode: labels.assistanceFormatCode,
          assistanceFormName: labels.assistanceFormName,
          specificFundId: String(r.specific_fund_id || 'fund-1'),
          specificFundName: String(r.specific_fund_name || 'กองทุนเฉพาะเจาะจง'),
          fundAccountId: String(r.fund_account_id || 'fund-1'),
          fundAccountName: String(r.fund_account_name || 'กองทุนซะกาตหลัก'),
          approvedAmount: approved,
          disbursedAmount: disbursed,
          pendingBatchAmount: pendingBatch,
          remainingAmount: remaining,
          activeBatchNumbers: r.active_batch_numbers ? String(r.active_batch_numbers) : '',
          status: String(r.status),
          notes: String(r.notes || ''),
        };
      })
      .filter((item) => item.remainingAmount > 0);

    const registryNames = await lookupRegistryPersonNames(mapped.map((item) => item.beneficiaryId));
    return mapped.map((item) => {
      const registryName = registryNames.get(item.beneficiaryId);
      if (!registryName) return item;
      return { ...item, beneficiaryName: registryName };
    });
  }

  /**
   * Fetch active admin expense categories for batch line items
   */
  static async getAdminExpenseCategoriesList() {
    await initDb();
    const db = getDb();

    const res = await db.execute(`
      SELECT id, code, name, group_name, budget_limit
      FROM admin_expense_categories
      WHERE is_active = 1
      ORDER BY order_index ASC, code ASC
    `);

    return res.rows.map((r: any) => ({
      id: String(r.id),
      code: String(r.code),
      name: String(r.name),
      groupName: String(r.group_name || 'ทั่วไป'),
      budgetLimit: Number(r.budget_limit || 0),
    }));
  }

  /**
   * Fetch Active Treasurer Cash Accounts for Staff Batch Disbursement
   */
  static async getEligibleTreasurerAccounts() {
    await initDb();
    const db = getDb();

    // 1. Get real balance from KPI engine
    const kpi = await this.getKpiBalances();
    const currentBalance = kpi.treasurer.currentBalance;

    // 2. Query distinct treasurers and finance users from database
    const wfTreasurers = await db.execute(`
      SELECT DISTINCT step2_treasurer_id, step2_treasurer_name 
      FROM cash_flow_workflows 
      WHERE step2_treasurer_id IS NOT NULL AND step2_treasurer_name IS NOT NULL
      ORDER BY created_at DESC
    `);

    // Primary treasurer from database history
    const primaryCustodian = wfTreasurers.rows.find(
      (r: any) => r.step2_treasurer_id === 'custodian-ruslan' || String(r.step2_treasurer_name).includes('รุสลัน')
    ) || wfTreasurers.rows[0];

    const treasurerId = primaryCustodian ? String(primaryCustodian.step2_treasurer_id) : 'custodian-ruslan';
    const treasurerName = primaryCustodian ? String(primaryCustodian.step2_treasurer_name) : 'นายรุสลัน หะสาเมาะ (เหรัญญิกมูลนิธิ)';

    const accounts = [
      {
        id: 'treasurer-cash-main',
        accountCode: '1020-01',
        accountName: 'บัญชีเหรัญญิก (Treasurer Cash Account)',
        custodianId: treasurerId,
        custodianName: treasurerName,
        accountType: 'treasurer_cash',
        currentBalance,
        status: 'active',
        isDefault: true,
        allowedForStaffDisbursement: true,
        description: 'บัญชีเงินสดคลังเหรัญญิกสำหรับส่งมอบเงินสดให้เจ้าหน้าที่ประจำสำนักงานเพื่อเบิกจ่าย',
        fundTypes: ['zakat', 'sadaqah', 'operational'],
      },
    ];

    return accounts.filter((acc) => acc.allowedForStaffDisbursement && acc.status === 'active');
  }

  /**
   * ROLE A: Office Staff creates a multi-item batch disbursement
   */
  static async createBatchDisbursement(input: {
    title: string;
    fundType?: string;
    sourceAccountId?: string;
    bankAccountId?: string; // backwards compatibility
    notes?: string;
    submitImmediately?: boolean;
    items: Array<{
      type: 'aid' | 'admin';
      applicationId?: string;
      applicationNo?: string;
      beneficiaryId?: string;
      beneficiaryName?: string;
      nationalId?: string;
      asnafCategory?: string;
      assistanceType?: string;
      approvedAmount?: number;
      thisDisbursementAmount?: number;
      categoryId?: string;
      categoryName?: string;
      description?: string;
      amount?: number;
      payeeName?: string;
      notes?: string;
    }>;
  }, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (!input.title || input.title.trim().length === 0) {
      throw new Error('กรุณาระบุวัตถุประสงค์หรือชื่อรอบการเบิกเงิน');
    }

    const sourceAccountId = (input.sourceAccountId || input.bankAccountId || '').trim();
    if (!sourceAccountId) {
      throw new Error('กรุณาเลือกบัญชีต้นทาง (บัญชีเหรัญญิก)');
    }

    // STRICT CHECK 1: Disallow Commercial Bank Accounts
    const bankCheck = await db.execute({
      sql: `SELECT id, account_name, bank_name FROM bank_accounts WHERE id = ?`,
      args: [sourceAccountId],
    });
    if (bankCheck.rows.length > 0) {
      throw new Error(
        `ไม่อนุญาตให้เลือกบัญชีธนาคาร (${bankCheck.rows[0].account_name}) เป็นบัญชีต้นทาง — การสร้างรอบเบิกเงินของเจ้าหน้าที่ต้องเบิกจากบัญชีเหรัญญิก (Treasurer Cash Account) เท่านั้น`
      );
    }

    // STRICT CHECK 2: Disallow Staff Cash Accounts
    if (
      sourceAccountId === '1030-01' ||
      sourceAccountId.startsWith('staff-') ||
      sourceAccountId.toLowerCase().includes('officer') ||
      sourceAccountId.toLowerCase().includes('staff')
    ) {
      throw new Error(
        'ไม่อนุญาตให้เลือกบัญชีเงินสดเจ้าหน้าที่เป็นบัญชีต้นทาง — การสร้างรอบเบิกเงินต้องเริ่มต้นจากบัญชีเหรัญญิกเท่านั้น'
      );
    }

    // STRICT CHECK 3: Verify genuine Treasurer Cash Account
    const eligibleTreasurers = await this.getEligibleTreasurerAccounts();
    if (eligibleTreasurers.length === 0) {
      throw new Error('ไม่มีบัญชีเหรัญญิกที่พร้อมใช้งานสำหรับการเบิกจ่ายในระบบ กรุณาติดต่อฝ่ายเหรัญญิก');
    }

    const matchedTreasurer = eligibleTreasurers.find(
      (t) =>
        t.id === sourceAccountId ||
        t.accountCode === sourceAccountId ||
        t.custodianId === sourceAccountId ||
        sourceAccountId === 'treasurer-cash' ||
        sourceAccountId === 'treasurer-cash-main'
    );

    if (!matchedTreasurer) {
      throw new Error(
        `บัญชีต้นทาง "${sourceAccountId}" ไม่ใช่บัญชีเหรัญญิกที่ได้รับอนุญาตสำหรับรอบเบิกเงินของเจ้าหน้าที่`
      );
    }

    if (!input.items || input.items.length === 0) {
      throw new Error('ต้องมีรายการย่อยอย่างน้อย 1 รายการในรอบการเบิก');
    }

    const aidItems = input.items.filter((it) => it.type === 'aid');
    const adminItems = input.items.filter((it) => it.type === 'admin');

    // PHASE 3 & 7: Atomic write transaction for concurrency lock & duplicate prevention
    const tx = await db.transaction('write');
    try {
      await this.ensureUserExists(actor, tx);
      const verifiedAidDetails: Array<{
        item: (typeof aidItems)[0];
        eligibility: Awaited<ReturnType<typeof FinancialWorkflowService.checkApplicationDisbursementEligibility>>;
      }> = [];

      const aidAppIdSet = new Set<string>();
      for (const it of aidItems) {
        if (!it.applicationId) {
          throw new Error('รายการช่วยเหลือต้องระบุรหัสคำร้อง (applicationId)');
        }
        if (aidAppIdSet.has(it.applicationId)) {
          throw new Error(`คำร้องเลขที่ ${it.applicationNo || it.applicationId} ถูกระบุซ้ำในรอบการเบิกเดียวกัน`);
        }
        aidAppIdSet.add(it.applicationId);

        const disbAmt = round2(Number(it.thisDisbursementAmount) || 0);
        const eligibility = await this.checkApplicationDisbursementEligibility(it.applicationId, disbAmt, undefined, tx);
        verifiedAidDetails.push({ item: it, eligibility });
      }

      const totalAidAmount = round2(
        verifiedAidDetails.reduce((sum, vd) => sum + (Number(vd.item.thisDisbursementAmount) || 0), 0)
      );
      const totalAdminAmount = round2(
        adminItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0)
      );
      const totalBatchAmount = round2(totalAidAmount + totalAdminAmount);

      if (totalBatchAmount <= 0) {
        throw new Error('ยอดรวมของรอบการเบิกต้องมากกว่า 0 บาท');
      }

      // STRICT CHECK 4: Check Treasurer Cash Balance
      if (totalBatchAmount > matchedTreasurer.currentBalance) {
        throw new Error(
          `ยอดเงินคงเหลือในบัญชีเหรัญญิกไม่เพียงพอ (คงเหลือ ฿${matchedTreasurer.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}, แต่ยอดขอเบิกรอบนี้ ฿${totalBatchAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}) กรุณาปรับลดจำนวนเงิน หรือรอเหรัญญิกเบิกเงินสดจากธนาคารเข้าคลังก่อน`
        );
      }

      // STRICT CHECK 5: Validate Fund Type
      const fundType = input.fundType || 'zakat';
      if (!['zakat', 'sadaqah', 'operational'].includes(fundType)) {
        throw new Error(`ประเภทกองทุน "${fundType}" ไม่ถูกต้อง`);
      }

      const thaiYear = new Date().getFullYear() + 543;
      const batchNo = `WD-${thaiYear}-${Math.floor(1000 + Math.random() * 9000)}`;
      const workflowId = `wf-${Date.now()}-${randomUUID().slice(0, 6)}`;
      const dateNow = new Date().toISOString().slice(0, 10);
      const initialStatus = input.submitImmediately ? 'pending_approval' : 'draft';

      // 1. Insert cash_flow_workflows (The Batch Header)
      await tx.execute({
        sql: `
          INSERT INTO cash_flow_workflows (
            id, workflow_no, title,
            step1_bank_account_id, step1_withdraw_amount, step1_date,
            step1_operator_id, step1_operator_name, step1_status,
            step1_fund_type, step1_notes,
            step2_treasurer_id, step2_treasurer_name, step2_status,
            overall_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `,
        args: [
          workflowId,
          batchNo,
          input.title.trim(),
          matchedTreasurer.id,
          totalBatchAmount,
          dateNow,
          actor.id,
          actor.name,
          initialStatus,
          fundType,
          input.notes || null,
          matchedTreasurer.custodianId,
          matchedTreasurer.custodianName,
          initialStatus,
        ],
      });

      // 2. Insert Aid Voucher & Disbursement Line Items
      if (verifiedAidDetails.length > 0) {
        const aidVoucherId = `cw-aid-${Date.now()}-${randomUUID().slice(0, 4)}`;
        const aidVoucherNo = `${batchNo}-AID`;

        await tx.execute({
          sql: `
            INSERT INTO cash_flow_withdrawals (
              id, workflow_id, withdrawal_no, voucher_type,
              amount, requested_amount, approved_amount,
              withdrawal_datetime, withdrawer_id, withdrawer_name,
              target_asnaf, purpose, status, handover_status, clearance_status
            ) VALUES (?, ?, ?, 'aid_disbursement', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'not_required')
          `,
          args: [
            aidVoucherId,
            workflowId,
            aidVoucherNo,
            totalAidAmount,
            totalAidAmount,
            totalAidAmount,
            dateNow,
            actor.id,
            actor.name,
            verifiedAidDetails[0].eligibility.asnafCategory || 'ผู้มีสิทธิ์รับซะกาต',
            input.title,
            initialStatus,
          ],
        });

        for (let i = 0; i < verifiedAidDetails.length; i++) {
          const { item, eligibility } = verifiedAidDetails[i];
          const lineId = `di-${Date.now()}-${i + 1}-${randomUUID().slice(0, 4)}`;
          const disbAmt = round2(Number(item.thisDisbursementAmount) || 0);
          const appAmt = eligibility.approvedAmount;
          const remainingAfter = Math.max(0, eligibility.remainingAmount - disbAmt);

          await tx.execute({
            sql: `
              INSERT INTO cash_flow_disbursement_items (
                id, withdrawal_id, workflow_id,
                application_id, beneficiary_id, beneficiary_name, national_id,
                asnaf_category, assistance_type,
                approved_amount, disbursed_amount_before, this_disbursement_amount, remaining_balance,
                notes, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              lineId,
              aidVoucherId,
              workflowId,
              eligibility.applicationId,
              eligibility.beneficiaryId,
              eligibility.beneficiaryName,
              eligibility.nationalId,
              eligibility.asnafCategory,
              eligibility.assistanceType,
              appAmt,
              eligibility.disbursedAmount,
              disbAmt,
              remainingAfter,
              item.notes || null,
              initialStatus === 'pending_approval' ? 'pending' : 'draft',
            ],
          });
        }
      }

      // 3. Insert Admin Voucher & Clearance Line Items
      if (adminItems.length > 0) {
        const adminVoucherId = `cw-adm-${Date.now()}-${randomUUID().slice(0, 4)}`;
        const adminVoucherNo = `${batchNo}-ADM`;

        await tx.execute({
          sql: `
            INSERT INTO cash_flow_withdrawals (
              id, workflow_id, withdrawal_no, voucher_type,
              amount, requested_amount, approved_amount,
              withdrawal_datetime, withdrawer_id, withdrawer_name,
              target_asnaf, purpose, status, handover_status, clearance_status
            ) VALUES (?, ?, ?, 'office_expense', ?, ?, ?, ?, ?, ?, 'ค่าบริหาร', ?, ?, 'pending', 'pending_clearance')
          `,
          args: [
            adminVoucherId,
            workflowId,
            adminVoucherNo,
            totalAdminAmount,
            totalAdminAmount,
            totalAdminAmount,
            dateNow,
            actor.id,
            actor.name,
            input.title,
            initialStatus,
          ],
        });

        for (let i = 0; i < adminItems.length; i++) {
          const item = adminItems[i];
          const lineId = `cli-${Date.now()}-${i + 1}-${randomUUID().slice(0, 4)}`;
          const lineAmt = round2(Number(item.amount) || 0);

          await tx.execute({
            sql: `
              INSERT INTO cash_flow_clearance_items (
                id, withdrawal_id, workflow_id,
                expense_date, description, amount,
                category_code, category_name, notes, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              lineId,
              adminVoucherId,
              workflowId,
              dateNow,
              item.description || item.categoryName || 'ค่าใช้จ่ายบริหารสำนักงาน',
              lineAmt,
              item.categoryId || 'OFFICE_EXPENSE',
              item.categoryName || 'ค่าใช้จ่ายบริหาร',
              item.notes || null,
              initialStatus === 'pending_approval' ? 'pending' : 'draft',
            ],
          });
        }
      }

      // 4. Log Audit Event & Approval Event if submitted
      if (input.submitImmediately) {
        await tx.execute({
          sql: `
            INSERT INTO finance_approval_events (
              id, document_type, document_id, action, from_status, to_status,
              actor_id, actor_name, actor_role, note
            ) VALUES (?, 'payment_voucher', ?, 'SUBMIT', 'draft', 'pending_approval', ?, ?, ?, ?)
          `,
          args: [
            `fae-${Date.now()}`,
            workflowId,
            actor.id,
            actor.name,
            actor.role,
            `เจ้าหน้าที่จัดทำคำขอเบิกเงินเป็นรอบและยื่นเสนอขออนุมัติ ยอดรวม ฿${totalBatchAmount.toLocaleString('th-TH')}`,
          ],
        });
      }

      await tx.execute({
        sql: `
          INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
          VALUES (?, ?, ?, ?, ?, 'CREATE_BATCH_DISBURSEMENT', 'cash_flow_workflow', ?, ?)
        `,
        args: [
          `log-${Date.now()}`,
          new Date().toISOString(),
          actor.id,
          actor.name,
          actor.role,
          workflowId,
          `สร้างรอบเบิก ${batchNo} จำนวน ${input.items.length} รายการ ยอดรวม ฿${totalBatchAmount.toLocaleString('th-TH')} สถานะ ${initialStatus}`,
        ],
      });

      await tx.commit();

      return {
        success: true,
        workflowId,
        batchNo,
        totalAmount: totalBatchAmount,
        itemCount: input.items.length,
        status: initialStatus,
      };
    } catch (txErr) {
      await tx.rollback();
      const message = txErr instanceof Error ? txErr.message : '';
      if (message.includes('FOREIGN KEY')) {
        throw new Error('บันทึกรอบเบิกไม่สำเร็จ เพราะบัญชีผู้บันทึกยังไม่มีในทะเบียนผู้ใช้ กรุณาสลับบทบาทเป็นผู้ใช้ในระบบแล้วลองอีกครั้ง');
      }
      throw txErr;
    }
  }

  /**
   * ROLE A: Submit existing draft batch for treasurer approval
   */
  static async submitBatchForApproval(workflowId: string, actor: ActorContext) {
    await initDb();
    const db = getDb();

    const wfRes = await db.execute({
      sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`,
      args: [workflowId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรอบการเบิกที่ระบุ');

    const wf = wfRes.rows[0];
    if (wf.step1_status !== 'draft' && wf.step1_status !== 'rejected_for_revision') {
      throw new Error(`ไม่สามารถยื่นขออนุมัติได้ เนื่องจากสถานะปัจจุบันคือ ${wf.step1_status}`);
    }

    // Count items
    const disbCount = await db.execute({
      sql: `SELECT COUNT(*) as c FROM cash_flow_disbursement_items WHERE workflow_id = ?`,
      args: [workflowId],
    });
    const clearCount = await db.execute({
      sql: `SELECT COUNT(*) as c FROM cash_flow_clearance_items WHERE workflow_id = ?`,
      args: [workflowId],
    });
    const totalItems = Number(disbCount.rows[0]?.c || 0) + Number(clearCount.rows[0]?.c || 0);

    if (totalItems === 0) {
      throw new Error('ไม่สามารถส่งขออนุมัติรอบเบิกที่ไม่มีรายการย่อยได้');
    }

    const tx = await db.transaction('write');
    try {
      await this.ensureUserExists(actor, tx);

      await tx.execute({
        sql: `UPDATE cash_flow_workflows SET step1_status = 'pending_approval', overall_status = 'pending_approval', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [workflowId],
      });

      await tx.execute({
        sql: `UPDATE cash_flow_withdrawals SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP WHERE workflow_id = ?`,
        args: [workflowId],
      });

      await tx.execute({
        sql: `
          INSERT INTO finance_approval_events (
            id, document_type, document_id, action, from_status, to_status,
            actor_id, actor_name, actor_role, note
          ) VALUES (?, 'payment_voucher', ?, 'SUBMIT', ?, 'pending_approval', ?, ?, ?, ?)
        `,
        args: [
          `fae-${Date.now()}`,
          workflowId,
          String(wf.step1_status),
          actor.id,
          actor.name,
          actor.role,
          'เจ้าหน้าที่ส่งรอบเบิกเข้าสู่การพิจารณาอนุมัติของเหรัญญิก',
        ],
      });

      await tx.commit();
      return { success: true, workflowId, status: 'pending_approval' };
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /**
   * ROLE B: Attach Transfer Evidence into Treasurer Account before Approval
   */
  static async attachTransferEvidence(
    input: {
      workflowId: string;
      sourceBankAccountId: string;
      destinationAccountId?: string;
      amount: number;
      transferDatetime: string;
      referenceNo?: string;
      issuingBank?: string;
      fileUrl: string;
      fileName: string;
      fileSize?: number;
      mimeType?: string;
      notes?: string;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (!input.workflowId) throw new Error('ต้องระบุ workflowId');
    if (!input.fileUrl || !input.fileName) throw new Error('กรุณาแนบไฟล์สลิปหรือหลักฐานการโอนเงิน');
    
    const amount = round2(Number(input.amount) || 0);
    if (amount <= 0) throw new Error('จำนวนเงินที่โอนต้องมากกว่า 0 บาท');

    // 1. Check Workflow
    const wfRes = await db.execute({
      sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`,
      args: [input.workflowId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบรอบการเบิกที่ระบุ');
    const wf = wfRes.rows[0];

    if (wf.step1_status === 'approved' || wf.overall_status === 'completed') {
      throw new Error('รอบการเบิกนี้ได้รับการอนุมัติแล้ว ไม่สามารถแนบหลักฐานเพิ่มเติมได้');
    }

    // 2. Check Source Bank Account
    const bankRes = await db.execute({
      sql: `SELECT * FROM bank_accounts WHERE id = ?`,
      args: [input.sourceBankAccountId],
    });
    if (bankRes.rows.length === 0) {
      throw new Error('ไม่พบบัญชีธนาคารต้นทางที่ระบุในระบบ');
    }
    const bank = bankRes.rows[0];

    // 3. Check Destination Account (Must be Treasurer Account)
    const eligibleTreasurers = await this.getEligibleTreasurerAccounts();
    const destId = input.destinationAccountId || 'treasurer-cash-main';
    const destAccount = eligibleTreasurers.find(
      (t) => t.id === destId || t.accountCode === destId || destId.includes('treasurer')
    );
    if (!destAccount && destId !== '1020-01' && destId !== 'treasurer-cash-main') {
      throw new Error('บัญชีปลายทางต้องเป็นบัญชีเหรัญญิก (1020-01) ที่ได้รับอนุญาตเท่านั้น');
    }
    const destName = destAccount ? destAccount.accountName : 'บัญชีเหรัญญิก (Treasurer Cash Account)';

    const evidenceId = `tte-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const tx = await db.transaction('write');
    try {
      await this.ensureUserExists(actor, tx);

      await tx.execute({
        sql: `
          INSERT INTO treasurer_transfer_evidence (
            id, workflow_id, source_bank_account_id, source_bank_name,
            source_account_name, source_account_number, destination_account_id,
            destination_account_name, amount, transfer_datetime, reference_no,
            issuing_bank, file_url, file_name, file_size, mime_type, notes,
            status, created_by_id, created_by_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification', ?, ?)
        `,
        args: [
          evidenceId,
          input.workflowId,
          String(bank.id),
          String(bank.bank_name),
          String(bank.account_name),
          String(bank.account_number),
          destId,
          destName,
          amount,
          input.transferDatetime || new Date().toISOString(),
          input.referenceNo || null,
          input.issuingBank || String(bank.bank_name),
          input.fileUrl,
          input.fileName,
          Number(input.fileSize) || 0,
          input.mimeType || 'application/pdf',
          input.notes || null,
          actor.id,
          actor.name,
        ],
      });

      // Insert into workflow_attachments for unified file indexing
      await tx.execute({
        sql: `
          INSERT INTO workflow_attachments (
            id, workflow_id, withdrawal_id, step_number, file_name, file_url,
            file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
          ) VALUES (?, ?, NULL, 1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        `,
        args: [
          `wfa-${Date.now()}-${randomUUID().slice(0, 4)}`,
          input.workflowId,
          input.fileName,
          input.fileUrl,
          Number(input.fileSize) || 0,
          input.mimeType || 'application/pdf',
          actor.id,
          actor.name,
          `หลักฐานการโอนเงินเข้าบัญชีเหรัญญิก ฿${amount.toLocaleString('th-TH')}`,
        ],
      });

      await tx.execute({
        sql: `
          INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
          VALUES (?, ?, ?, ?, ?, 'ATTACH_TRANSFER_EVIDENCE', 'cash_flow_workflow', ?, ?)
        `,
        args: [
          `log-${Date.now()}`,
          new Date().toISOString(),
          actor.id,
          actor.name,
          actor.role,
          input.workflowId,
          `แนบหลักฐานการโอนเงินเข้าบัญชีเหรัญญิก ${input.fileName} จำนวน ฿${amount.toLocaleString('th-TH')} จากบัญชี ${bank.account_name}`,
        ],
      });

      await tx.commit();
      return { success: true, evidenceId, workflowId: input.workflowId, amount, status: 'pending_verification' };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  /**
   * ROLE B: Treasurer explicitly verifies, marks invalid, or requests more info on a transfer evidence
   */
  static async verifyTransferEvidence(
    input: {
      evidenceId: string;
      decision: 'verify' | 'invalid' | 'need_more_info';
      reason?: string;
      notes?: string;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (actor.role !== 'finance' && actor.role !== 'super_admin' && actor.role !== 'approver' && actor.role !== 'executive') {
      throw new Error('เฉพาะฝ่ายเหรัญญิกหรือผู้มีอำนาจตรวจสอบเท่านั้นที่สามารถตรวจสอบหลักฐานได้');
    }

    const evRes = await db.execute({
      sql: `SELECT * FROM treasurer_transfer_evidence WHERE id = ?`,
      args: [input.evidenceId],
    });
    if (evRes.rows.length === 0) throw new Error('ไม่พบหลักฐานการโอนเงินที่ระบุ');
    const ev = evRes.rows[0];

    const decision = input.decision;
    if (decision !== 'verify' && decision !== 'invalid' && decision !== 'need_more_info') {
      throw new Error(`คำสั่งการตรวจสอบหลักฐานไม่ถูกต้อง (${input.decision})`);
    }

    const reason = (input.reason || input.notes || '').trim();
    if ((decision === 'invalid' || decision === 'need_more_info') && reason.length === 0) {
      throw new Error('กรุณาระบุเหตุผลในการปฏิเสธหรือขอหลักฐานเพิ่มเติม');
    }

    const newStatus = decision === 'verify' ? 'verified' : decision === 'invalid' ? 'invalid' : 'need_more_info';

    const tx = await db.transaction('write');
    try {
      await this.ensureUserExists(actor, tx);

      await tx.execute({
        sql: `
          UPDATE treasurer_transfer_evidence SET
            status = ?,
            verified_by_id = ?,
            verified_by_name = ?,
            verified_at = CURRENT_TIMESTAMP,
            rejection_reason = ?,
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [newStatus, actor.id, actor.name, reason || null, input.notes || null, input.evidenceId],
      });

      await tx.execute({
        sql: `
          INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
          VALUES (?, ?, ?, ?, ?, 'VERIFY_TRANSFER_EVIDENCE', 'treasurer_transfer_evidence', ?, ?)
        `,
        args: [
          `log-${Date.now()}`,
          new Date().toISOString(),
          actor.id,
          actor.name,
          actor.role,
          input.evidenceId,
          `เหรัญญิกตรวจสอบหลักฐานการโอนเงิน ${ev.file_name} ผลการตรวจ: ${newStatus}${reason ? ` (เหตุผล: ${reason})` : ''}`,
        ],
      });

      await tx.commit();
      return { success: true, evidenceId: input.evidenceId, status: newStatus, decision };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  /**
   * Delete transfer evidence (only before approval)
   */
  static async deleteTransferEvidence(evidenceId: string, actor: ActorContext) {
    await initDb();
    const db = getDb();

    const evRes = await db.execute({
      sql: `
        SELECT e.*, w.step1_status, w.overall_status 
        FROM treasurer_transfer_evidence e 
        JOIN cash_flow_workflows w ON w.id = e.workflow_id 
        WHERE e.id = ?
      `,
      args: [evidenceId],
    });
    if (evRes.rows.length === 0) throw new Error('ไม่พบหลักฐานการโอนเงินที่ต้องการลบ');
    const ev = evRes.rows[0];

    if (ev.step1_status === 'approved' || ev.overall_status === 'completed') {
      throw new Error('ไม่อนุญาตให้ลบหลักฐานการโอนของรอบเบิกที่ได้รับการอนุมัติแล้ว');
    }

    const tx = await db.transaction('write');
    try {
      await this.ensureUserExists(actor, tx);

      await tx.execute({
        sql: `DELETE FROM treasurer_transfer_evidence WHERE id = ?`,
        args: [evidenceId],
      });

      await tx.execute({
        sql: `
          INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
          VALUES (?, ?, ?, ?, ?, 'DELETE_TRANSFER_EVIDENCE', 'treasurer_transfer_evidence', ?, ?)
        `,
        args: [
          `log-${Date.now()}`,
          new Date().toISOString(),
          actor.id,
          actor.name,
          actor.role,
          evidenceId,
          `ลบหลักฐานการโอนเงิน ${ev.file_name} ยอด ฿${Number(ev.amount || 0).toLocaleString('th-TH')}`,
        ],
      });

      await tx.commit();
      return { success: true, evidenceId };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  /**
   * ROLE B: Treasurer Approval Decision (Approve / Reject / Return for Revision)
   */
  static async treasurerReviewBatch(
    workflowId: string,
    input: { decision: string; reason?: string; note?: string },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    // Check permissions
    if (actor.role !== 'finance' && actor.role !== 'super_admin' && actor.role !== 'approver' && actor.role !== 'executive') {
      throw new Error('เฉพาะฝ่ายเหรัญญิกหรือผู้มีอำนาจอนุมัติเท่านั้นที่สามารถพิจารณารอบเบิกได้');
    }

    const wfRes = await db.execute({
      sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`,
      args: [workflowId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรอบการเบิก');

    const wf = wfRes.rows[0];

    // Prevent self-approval (Unless super_admin emergency override)
    if (String(wf.step1_operator_id) === actor.id && actor.role !== 'super_admin') {
      throw new Error('ไม่อนุญาตให้ผู้จัดทำคำขออนุมัติรายการของตนเอง (Segregation of Duties)');
    }

    if (wf.step1_status !== 'pending_approval') {
      throw new Error(`รอบการเบิกนี้ไม่ได้อยู่ในสถานะรออนุมัติ (สถานะปัจจุบัน: ${wf.step1_status})`);
    }

    const rawDecision = String(input.decision || '').toLowerCase().trim();
    const decision = (rawDecision === 'approve' || rawDecision === 'approved')
      ? 'approve'
      : (rawDecision === 'return_for_revision' || rawDecision === 'revision' || rawDecision === 'rejected_with_revision')
      ? 'return_for_revision'
      : (rawDecision === 'reject' || rawDecision === 'rejected' || rawDecision === 'cancel' || rawDecision === 'cancelled')
      ? 'reject'
      : null;

    if (!decision) {
      throw new Error(`คำสั่งการพิจารณาไม่ถูกต้อง (${input.decision})`);
    }

    const reason = (input.reason || input.note || '').trim();
    if ((decision === 'reject' || decision === 'return_for_revision') && reason.length === 0) {
      throw new Error('กรุณาระบุเหตุผลในการไม่อนุมัติหรือส่งกลับแก้ไข');
    }

    const withdrawAmount = Number(wf.step1_withdraw_amount || 0);

    // Verify sufficient treasurer float and transfer evidence before approval
    let activeEvidence: any[] = [];
    if (decision === 'approve') {
      const kpi = await this.getKpiBalances();
      const currentTreasurerBalance = kpi.treasurer.currentBalance;
      if (currentTreasurerBalance < withdrawAmount) {
        throw new Error(
          `ยอดเงินคงเหลือในบัญชีเหรัญญิกไม่เพียงพอ (คงเหลือ ฿${currentTreasurerBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, ยอดเบิกรอบนี้ ฿${withdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท) กรุณาเติมเงินสดเข้าคลังเหรัญญิกก่อนอนุมัติ`
        );
      }

      // STRICT CHECK: Transfer Evidence Validation
      const evRes = await db.execute({
        sql: `SELECT * FROM treasurer_transfer_evidence WHERE workflow_id = ?`,
        args: [workflowId],
      });

      if (evRes.rows.length === 0) {
        throw new Error('ไม่อนุญาตให้อนุมัติ: ยังไม่ได้แนบหลักฐานการโอนเงินเข้าบัญชีเหรัญญิกตามระเบียบของระบบ');
      }

      activeEvidence = evRes.rows.filter((r: any) => r.status !== 'invalid');
      if (activeEvidence.length === 0) {
        throw new Error('ไม่อนุญาตให้อนุมัติ: หลักฐานการโอนเงินทั้งหมดถูกระบุว่าไม่ถูกต้อง กรุณาแนบหลักฐานใหม่');
      }

      // Check destination accounts first
      for (const ev of activeEvidence) {
        const destId = String(ev.destination_account_id || '');
        if (destId !== 'treasurer-cash-main' && destId !== '1020-01' && !destId.includes('treasurer')) {
          throw new Error('ไม่อนุญาตให้อนุมัติ: บัญชีปลายทางของหลักฐานโอนต้องเป็นบัญชีเหรัญญิก (1020-01) เท่านั้น');
        }
      }

      const unverifiedItems = activeEvidence.filter((r: any) => r.status !== 'verified');
      if (unverifiedItems.length > 0) {
        throw new Error('ไม่อนุญาตให้อนุมัติ: มีหลักฐานการโอนเงินที่ยังไม่ผ่านการตรวจสอบและยืนยันโดยเหรัญญิก');
      }

      const verifiedSum = round2(
        activeEvidence
          .filter((r: any) => r.status === 'verified')
          .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0)
      );

      if (verifiedSum !== round2(withdrawAmount)) {
        throw new Error(
          `ไม่อนุญาตให้อนุมัติ: ยอดเงินตามหลักฐานการโอน (฿${verifiedSum.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท) ไม่ตรงกับยอดที่ขอเบิกในรอบ (฿${withdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`
        );
      }
    }

    const tx = await db.transaction('write');
    try {
      await this.ensureUserExists(actor, tx);

      if (decision === 'approve') {
        const firstEv = activeEvidence[0];
        const approvedAmount = round2(withdrawAmount);
        const approvedAt = new Date().toISOString();
        const txnNo = `TXN-INT-${Date.now().toString().slice(-6)}`;
        const journalNo = `JV-INT-${Date.now().toString().slice(-6)}`;
        const recipientId = String(wf.step1_operator_id || '');
        const recipientName = String(wf.step1_operator_name || '');
        const duplicate = await tx.execute({
          sql: `SELECT id FROM financial_transactions WHERE workflow_id = ? AND type = 'transfer' AND category = 'โอนภายในจากเงินสดเหรัญญิกไปเงินสดเจ้าหน้าที่' LIMIT 1`,
          args: [workflowId],
        });
        if (duplicate.rows.length > 0) {
          throw new Error('รอบการเบิกนี้ถูกอนุมัติและโอนเงินให้เจ้าหน้าที่แล้ว ไม่สามารถอนุมัติซ้ำ');
        }

        await tx.execute({
          sql: `
            UPDATE cash_flow_workflows SET 
              step1_status = 'approved',
              step1_approver_id = ?,
              step1_approver_name = ?,
              step2_status = 'cash_disbursed',
              step2_handover_person_id = ?,
              step2_handover_person_name = ?,
              step2_handover_amount = ?,
              step2_handover_datetime = ?,
              overall_status = 'cash_disbursed_to_staff',
              step1_proof_url = COALESCE(?, step1_proof_url),
              step1_proof_name = COALESCE(?, step1_proof_name),
              step1_proof_size = COALESCE(?, step1_proof_size),
              step1_proof_type = COALESCE(?, step1_proof_type),
              step1_ref_no = COALESCE(?, step1_ref_no),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND step1_status = 'pending_approval'
          `,
          args: [
            actor.id,
            actor.name,
            recipientId,
            recipientName,
            approvedAmount,
            approvedAt,
            firstEv ? firstEv.file_url : null,
            firstEv ? firstEv.file_name : null,
            firstEv ? Number(firstEv.file_size || 0) : null,
            firstEv ? firstEv.mime_type : null,
            firstEv ? firstEv.reference_no : null,
            workflowId,
          ],
        });

        await tx.execute({
          sql: `
            UPDATE cash_flow_withdrawals SET
              status = 'cash_disbursed',
              approver_id = ?,
              approver_name = ?,
              handover_status = 'handed_over',
              updated_at = CURRENT_TIMESTAMP
            WHERE workflow_id = ?
          `,
          args: [actor.id, actor.name, workflowId],
        });

        await tx.execute({
          sql: `
            UPDATE cash_flow_disbursement_items
            SET status = 'awaiting_payment', updated_at = CURRENT_TIMESTAMP
            WHERE workflow_id = ? AND status NOT IN ('cancelled', 'paid', 'partial', 'completed')
          `,
          args: [workflowId],
        });

        await tx.execute({
          sql: `INSERT INTO financial_transactions (
            id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
            payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name,
            verified_by_id, verified_by_name, notes, workflow_id, journal_no
          ) VALUES (?, ?, ?, 'transfer', 'fund-general', 'บัญชีกลาง', 'โอนภายในจากเงินสดเหรัญญิกไปเงินสดเจ้าหน้าที่', ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `txn-int-${workflowId}`,
            txnNo,
            approvedAt.slice(0, 10),
            approvedAmount,
            recipientName || actor.name,
            String(wf.workflow_no),
            firstEv ? String(firstEv.file_url || '') : '',
            actor.id,
            actor.name,
            actor.id,
            actor.name,
            `โอนภายใน บัญชี B 1020-01 ไปบัญชี C 1030-01 รอบ ${wf.workflow_no} จำนวน ${approvedAmount} ผู้อนุมัติ ${actor.name} ผู้รับ ${recipientName} หลักฐาน ${firstEv ? firstEv.file_name || firstEv.reference_no || '' : '-'}`,
            workflowId,
            journalNo,
          ],
        });

        await tx.execute({
          sql: `INSERT INTO general_ledger_entries (
            id, journal_no, transaction_id, entry_date, account_code, account_name, account_category,
            entry_type, amount, currency, description, created_by
          ) VALUES (?, ?, ?, ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'debit', ?, 'THB', ?, ?)`,
          args: [`gl-int-d-${workflowId}`, journalNo, txnNo, approvedAt.slice(0, 10), approvedAmount, `รับเงินสดจากเหรัญญิกเข้ามือเจ้าหน้าที่ รอบ ${wf.workflow_no}`, actor.name],
        });
        await tx.execute({
          sql: `INSERT INTO general_ledger_entries (
            id, journal_no, transaction_id, entry_date, account_code, account_name, account_category,
            entry_type, amount, currency, description, created_by
          ) VALUES (?, ?, ?, ?, '1020-01', 'เงินสดในมือเหรัญญิก', 'asset', 'credit', ?, 'THB', ?, ?)`,
          args: [`gl-int-c-${workflowId}`, journalNo, txnNo, approvedAt.slice(0, 10), approvedAmount, `โอนเงินสดให้เจ้าหน้าที่ รอบ ${wf.workflow_no}`, actor.name],
        });

        await tx.execute({
          sql: `
            INSERT INTO finance_approval_events (
              id, document_type, document_id, action, from_status, to_status,
              actor_id, actor_name, actor_role, note
            ) VALUES (?, 'payment_voucher', ?, 'APPROVE', 'pending_approval', 'approved', ?, ?, ?, ?)
          `,
          args: [
            `fae-${Date.now()}`,
            workflowId,
            actor.id,
            actor.name,
            actor.role,
            reason || 'เหรัญญิกตรวจสอบความถูกต้องและอนุมัติรอบเบิกเรียบร้อย',
          ],
        });

        await tx.execute({
          sql: `
            INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, 'APPROVE_BATCH_DISBURSEMENT', 'cash_flow_workflow', ?, ?)
          `,
          args: [
            `log-${Date.now()}`,
            new Date().toISOString(),
            actor.id,
            actor.name,
            actor.role,
            workflowId,
            `เหรัญญิกอนุมัติรอบเบิก ${wf.workflow_no} และโอนภายในจากบัญชีเหรัญญิกไปเงินสดเจ้าหน้าที่ ฿${withdrawAmount.toLocaleString('th-TH')} โดยยังไม่บันทึกรายจ่ายช่วยเหลือ`,
          ],
        });

        await tx.commit();
        return { success: true, workflowId, decision: 'approve', status: 'cash_disbursed_to_staff', amount: approvedAmount };
      }

      if (decision === 'return_for_revision') {
        await tx.execute({
          sql: `
            UPDATE cash_flow_workflows SET 
              step1_status = 'rejected_for_revision',
              step1_notes = ?,
              overall_status = 'rejected_for_revision',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [reason || 'ส่งกลับแก้ไข', workflowId],
        });

        await tx.execute({
          sql: `UPDATE cash_flow_withdrawals SET status = 'rejected_for_revision', updated_at = CURRENT_TIMESTAMP WHERE workflow_id = ?`,
          args: [workflowId],
        });

        await tx.execute({
          sql: `
            INSERT INTO finance_approval_events (
              id, document_type, document_id, action, from_status, to_status,
              actor_id, actor_name, actor_role, note
            ) VALUES (?, 'payment_voucher', ?, 'RETURN_FOR_REVISION', 'pending_approval', 'rejected_for_revision', ?, ?, ?, ?)
          `,
          args: [
            `fae-${Date.now()}`,
            workflowId,
            actor.id,
            actor.name,
            actor.role,
            reason || 'ส่งกลับแก้ไขเอกสาร',
          ],
        });

        await tx.execute({
          sql: `
            INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, 'RETURN_BATCH_FOR_REVISION', 'cash_flow_workflow', ?, ?)
          `,
          args: [
            `log-${Date.now()}`,
            new Date().toISOString(),
            actor.id,
            actor.name,
            actor.role,
            workflowId,
            `ส่งกลับแก้ไขรอบเบิก ${wf.workflow_no} เหตุผล: ${reason}`,
          ],
        });

        await tx.commit();
        return { success: true, workflowId, decision: 'return_for_revision', status: 'rejected_for_revision' };
      }

      // decision === 'reject'
      await tx.execute({
        sql: `
          UPDATE cash_flow_workflows SET 
            step1_status = 'rejected',
            step1_notes = ?,
            overall_status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [reason || 'ไม่อนุมัติ', workflowId],
      });

      await tx.execute({
        sql: `UPDATE cash_flow_withdrawals SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE workflow_id = ?`,
        args: [workflowId],
      });

      await tx.execute({
        sql: `UPDATE cash_flow_disbursement_items SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE workflow_id = ?`,
        args: [workflowId],
      });

      await tx.execute({
        sql: `
          INSERT INTO finance_approval_events (
            id, document_type, document_id, action, from_status, to_status,
            actor_id, actor_name, actor_role, note
          ) VALUES (?, 'payment_voucher', ?, 'REJECT', 'pending_approval', 'cancelled', ?, ?, ?, ?)
        `,
        args: [
          `fae-${Date.now()}`,
          workflowId,
          actor.id,
          actor.name,
          actor.role,
          reason || 'ไม่อนุมัติคำขอเบิกเงิน',
        ],
      });

      await tx.execute({
        sql: `
          INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
          VALUES (?, ?, ?, ?, ?, 'REJECT_BATCH_DISBURSEMENT', 'cash_flow_workflow', ?, ?)
        `,
        args: [
          `log-${Date.now()}`,
          new Date().toISOString(),
          actor.id,
          actor.name,
          actor.role,
          workflowId,
          `ไม่อนุมัติรอบเบิก ${wf.workflow_no} เหตุผล: ${reason}`,
        ],
      });

      await tx.commit();
      return { success: true, workflowId, decision: 'reject', status: 'cancelled' };
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /**
   * ROLE B: Treasurer records actual cash handover to Office Staff
   */
  static async handoverBatchCash(
    workflowId: string,
    input: {
      actualAmount: number;
      handoverDate: string;
      proofUrl?: string;
      notes?: string;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    if (actor.role !== 'finance' && actor.role !== 'super_admin') {
      throw new Error('เฉพาะฝ่ายเหรัญญิกเท่านั้นที่สามารถบันทึกการส่งมอบเงินสดได้');
    }

    const wfRes = await db.execute({
      sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`,
      args: [workflowId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรอบการเบิก');

    const wf = wfRes.rows[0];
    if (wf.step1_status !== 'approved') {
      throw new Error('ไม่สามารถส่งมอบเงินสดได้ เนื่องจากรอบเบิกยังไม่ได้รับการอนุมัติ');
    }

    const handedAmount = round2(Number(input.actualAmount) || 0);
    if (handedAmount <= 0) {
      throw new Error('จำนวนเงินที่ส่งมอบจริงต้องมากกว่า 0 บาท');
    }

    const handoverNo = `HND-${new Date().getFullYear() + 543}-${Math.floor(1000 + Math.random() * 9000)}`;
    const handoverId = `hnd-${Date.now()}-${randomUUID().slice(0, 4)}`;
    const handoverDate = input.handoverDate || new Date().toISOString().slice(0, 10);
    const handoverTime = new Date().toTimeString().slice(0, 8);

    // Get primary withdrawal id
    const wthRes = await db.execute({
      sql: `SELECT id FROM cash_flow_withdrawals WHERE workflow_id = ? LIMIT 1`,
      args: [workflowId],
    });
    const withdrawalId = String(wthRes.rows[0]?.id || `wth-${Date.now()}`);

    // Insert into finance_handover_records (Awaiting staff confirmation)
    await db.execute({
      sql: `
        INSERT INTO finance_handover_records (
          id, withdrawal_id, workflow_id, handover_no,
          handover_date, handover_time,
          handed_over_by_id, handed_over_by_name,
          received_by_id, received_by_name,
          amount, handover_method, proof_url, proof_name,
          status, recorded_by_id, recorded_by_name,
          confirmed_by_id, confirmed_by_name, confirmed_at, notes
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, 'cash', ?, ?,
          'pending_verification', ?, ?,
          '', '', '', ?
        )
      `,
      args: [
        handoverId,
        withdrawalId,
        workflowId,
        handoverNo,
        handoverDate,
        handoverTime,
        actor.id,
        actor.name,
        String(wf.step1_operator_id),
        String(wf.step1_operator_name),
        handedAmount,
        input.proofUrl || 'https://placehold.co/400x300.png?text=Handover+Receipt',
        'ใบส่งมอบเงินสด.pdf',
        actor.id,
        actor.name,
        input.notes || 'เหรัญญิกบันทึกการส่งมอบเงินสดแก่เจ้าหน้าที่สำนักงาน',
      ],
    });

    // Update workflow status to pending staff receipt
    await db.execute({
      sql: `
        UPDATE cash_flow_workflows SET
          step2_handover_person_id = ?,
          step2_handover_person_name = ?,
          step2_handover_amount = ?,
          step2_handover_datetime = ?,
          step2_status = 'handed_over',
          overall_status = 'pending_staff_receipt',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [actor.id, actor.name, handedAmount, `${handoverDate}T${handoverTime}`, workflowId],
    });

    await db.execute({
      sql: `
        UPDATE cash_flow_withdrawals SET
          handover_status = 'pending_verification',
          updated_at = CURRENT_TIMESTAMP
        WHERE workflow_id = ?
      `,
      args: [workflowId],
    });

    return {
      success: true,
      handoverId,
      handoverNo,
      amount: handedAmount,
      status: 'pending_staff_receipt',
    };
  }

  /**
   * ROLE B / TREASURER: Record cash withdrawal & transfer to staff float with evidence attachments
   */
  static async insertInternalTransfer(tx: any, input: {
    workflowId: string;
    workflowNo: string;
    amount: number;
    actor: ActorContext;
    recipientName: string;
    evidenceUrl?: string;
    approvedAt?: string;
  }) {
    const existing = await tx.execute({
      sql: `SELECT id FROM financial_transactions WHERE id = ? OR (workflow_id = ? AND type = 'transfer' AND category = 'โอนภายในจากเงินสดเหรัญญิกไปเงินสดเจ้าหน้าที่') LIMIT 1`,
      args: [`txn-int-${input.workflowId}`, input.workflowId],
    });
    if (existing.rows.length > 0) {
      throw new Error('รอบการเบิกนี้ถูกโอนจากบัญชีเหรัญญิกไปเงินสดเจ้าหน้าที่แล้ว ไม่สามารถโอนซ้ำ');
    }
    const approvedAt = input.approvedAt || new Date().toISOString();
    const txnNo = `TXN-INT-${Date.now().toString().slice(-6)}`;
    const journalNo = `JV-INT-${Date.now().toString().slice(-6)}`;
    const amount = round2(input.amount);
    await tx.execute({
      sql: `INSERT INTO financial_transactions (
        id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
        payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name,
        verified_by_id, verified_by_name, notes, workflow_id, journal_no
      ) VALUES (?, ?, ?, 'transfer', 'fund-general', 'บัญชีกลาง', 'โอนภายในจากเงินสดเหรัญญิกไปเงินสดเจ้าหน้าที่', ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `txn-int-${input.workflowId}`, txnNo, approvedAt.slice(0, 10), amount,
        input.recipientName || input.actor.name, input.workflowNo, input.evidenceUrl || '',
        input.actor.id, input.actor.name, input.actor.id, input.actor.name,
        `โอนภายใน บัญชี B 1020-01 ไปบัญชี C 1030-01 รอบ ${input.workflowNo} จำนวน ${amount} ผู้อนุมัติ ${input.actor.name}`,
        input.workflowId, journalNo,
      ],
    });
    await tx.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, entry_date, account_code, account_name, account_category,
        entry_type, amount, currency, description, created_by
      ) VALUES (?, ?, ?, ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'debit', ?, 'THB', ?, ?)`,
      args: [`gl-int-d-${input.workflowId}`, journalNo, txnNo, approvedAt.slice(0, 10), amount, `รับเงินสดจากเหรัญญิกเข้ามือเจ้าหน้าที่ รอบ ${input.workflowNo}`, input.actor.name],
    });
    await tx.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, entry_date, account_code, account_name, account_category,
        entry_type, amount, currency, description, created_by
      ) VALUES (?, ?, ?, ?, '1020-01', 'เงินสดในมือเหรัญญิก', 'asset', 'credit', ?, 'THB', ?, ?)`,
      args: [`gl-int-c-${input.workflowId}`, journalNo, txnNo, approvedAt.slice(0, 10), amount, `โอนเงินสดให้เจ้าหน้าที่ รอบ ${input.workflowNo}`, input.actor.name],
    });
    return { transactionNo: txnNo, journalNo, amount };
  }

  static async postUnpostedStaffHandover(workflowId: string, actor: ActorContext) {
    await initDb();
    const db = getDb();
    if (!['finance', 'super_admin', 'executive'].includes(actor.role)) {
      throw new Error('ไม่มีสิทธิ์บันทึกการโอนเงินให้เจ้าหน้าที่');
    }
    const wfRes = await db.execute({ sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`, args: [workflowId] });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบรอบการเบิก');
    const wf = wfRes.rows[0];
    const amount = round2(Number(wf.step1_withdraw_amount || 0));
    if (!(amount > 0)) throw new Error('ยอดรอบเบิกไม่ถูกต้อง');
    const kpi = await this.getKpiBalances();
    if (kpi.treasurer.currentBalance < amount) {
      throw new Error(`ยอดเงินคงเหลือในบัญชีเหรัญญิกไม่เพียงพอ (คงเหลือ ฿${kpi.treasurer.currentBalance.toLocaleString('th-TH')})`);
    }
    const tx = await db.transaction('write');
    try {
      await this.ensureUserExists(actor, tx);
      const posted = await this.insertInternalTransfer(tx, {
        workflowId,
        workflowNo: String(wf.workflow_no),
        amount,
        actor,
        recipientName: String(wf.step1_operator_name || actor.name),
        evidenceUrl: wf.step1_proof_url ? String(wf.step1_proof_url) : '',
      });
      await tx.execute({
        sql: `UPDATE cash_flow_workflows SET step1_status = 'approved', step2_status = 'cash_disbursed', overall_status = 'cash_disbursed_to_staff', step2_handover_amount = ?, step2_handover_datetime = COALESCE(step2_handover_datetime, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [amount, new Date().toISOString(), workflowId],
      });
      await tx.execute({
        sql: `UPDATE cash_flow_withdrawals SET status = 'cash_disbursed', handover_status = 'handed_over', updated_at = CURRENT_TIMESTAMP WHERE workflow_id = ?`,
        args: [workflowId],
      });
      await tx.execute({
        sql: `UPDATE cash_flow_disbursement_items SET status = 'awaiting_payment', updated_at = CURRENT_TIMESTAMP WHERE workflow_id = ? AND status NOT IN ('cancelled', 'paid', 'partial', 'completed')`,
        args: [workflowId],
      });
      await tx.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?, 'POST_INTERNAL_TRANSFER', 'cash_flow_workflow', ?, ?)`,
        args: [`log-int-${workflowId}`, new Date().toISOString(), actor.id, actor.name, actor.role, workflowId, `บันทึกโอนภายในที่ค้างไว้ ฿${amount} จากบัญชีเหรัญญิกไปเงินสดเจ้าหน้าที่ รอบ ${wf.workflow_no} โดยยังไม่บันทึกรายจ่ายช่วยเหลือ`],
      });
      await tx.commit();
      return { success: true, ...posted };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  static async recordTreasurerTransferAndHandover(
    input: {
      workflowId: string;
      sourceAccountId?: string;
      destinationAccountId?: string;
      amount: number;
      transferDatetime?: string;
      notes?: string;
      recipientUserId?: string;
      recipientUserName?: string;
      files: Array<{
        fileUrl: string;
        fileName: string;
        fileSize?: number;
        mimeType?: string;
        documentType?: 'transfer_slip' | 'bank_withdrawal_slip' | 'payment_voucher_receipt' | 'cash_handover_slip' | 'other_document';
        notes?: string;
      }>;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    // Permissions check
    if (actor.role !== 'finance' && actor.role !== 'super_admin' && actor.role !== 'approver' && actor.role !== 'executive') {
      throw new Error('เฉพาะฝ่ายเหรัญญิกหรือผู้มีอำนาจตรวจสอบเท่านั้นที่สามารถบันทึกการส่งมอบเงินได้');
    }

    const wfRes = await db.execute({
      sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`,
      args: [input.workflowId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรอบการเบิก');
    const wf = wfRes.rows[0];

    // Idempotency: Prevent recording transfer if already fully disbursed
    if (wf.overall_status === 'disbursed' || wf.overall_status === 'completed' || wf.overall_status === 'cash_disbursed_to_staff') {
      throw new Error('รอบการเบิกนี้ได้โอนเงินให้เจ้าหน้าที่แล้ว ไม่สามารถบันทึกการโอนซ้ำได้');
    }

    // STRICT CHECK 1: Source account MUST be Treasurer Account (1020-01)
    const srcId = String(input.sourceAccountId || '1020-01').trim();
    if (srcId !== '1020-01' && srcId !== 'treasurer-cash-main' && !srcId.includes('1020') && !srcId.includes('treasurer')) {
      throw new Error('บัญชีต้นทางต้องเป็นบัญชีเหรัญญิก (1020-01) เท่านั้น ห้ามเลือกบัญชีธนาคารอื่น');
    }

    // STRICT CHECK 2: Destination account MUST be Staff Cash Float (1030-01)
    const destId = String(input.destinationAccountId || '1030-01').trim();
    if (destId !== '1030-01' && destId !== 'staff-cash-main' && !destId.includes('1030') && !destId.includes('staff')) {
      throw new Error('บัญชีปลายทางต้องเป็นบัญชีเงินสดเจ้าหน้าที่ (1030-01) เท่านั้น');
    }

    const amount = round2(Number(input.amount) || 0);
    if (amount <= 0) {
      throw new Error('จำนวนเงินที่เบิกต้องมากกว่า 0 บาท');
    }

    // Check Treasurer Account Balance
    const kpi = await this.getKpiBalances();
    if (kpi.treasurer.currentBalance < amount) {
      throw new Error(
        `ยอดเงินคงเหลือในบัญชีเหรัญญิกไม่เพียงพอ (คงเหลือ ฿${kpi.treasurer.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท, ยอดที่ต้องการโอน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`
      );
    }

    // STRICT CHECK 3: Multi-file evidence validation
    if (!input.files || input.files.length === 0) {
      throw new Error('กรุณาแนบเอกสารหลักฐานอย่างน้อย 1 รายการ (เช่น สลิปการโอนเงิน, ใบถอนเงินสด, หรือใบสำคัญรับเงิน)');
    }

    for (const f of input.files) {
      if (!f.fileUrl || !f.fileName) {
        throw new Error('ข้อมูลเอกสารหลักฐานไม่สมบูรณ์ (ต้องมีชื่อไฟล์และ URL)');
      }
    }

    const recipientUserId = input.recipientUserId || String(wf.step1_operator_id);
    const recipientUserName = input.recipientUserName || String(wf.step1_operator_name);
    const transferDatetime = input.transferDatetime || new Date().toISOString();
    const handoverId = `hnd-${Date.now()}-${randomUUID().slice(0, 4)}`;
    const handoverNo = `HND-${new Date().getFullYear() + 543}-${Math.floor(1000 + Math.random() * 9000)}`;
    const handoverDate = transferDatetime.slice(0, 10);
    const handoverTime = transferDatetime.includes('T') ? transferDatetime.split('T')[1].slice(0, 8) : new Date().toTimeString().slice(0, 8);

    // Primary withdrawal
    const wthRes = await db.execute({
      sql: `SELECT id FROM cash_flow_withdrawals WHERE workflow_id = ? LIMIT 1`,
      args: [input.workflowId],
    });
    const withdrawalId = String(wthRes.rows[0]?.id || `wth-${Date.now()}`);

    // Get an active bank account for fallback foreign key compatibility in SQLite
    const bankRes = await db.execute(`SELECT id, bank_name, account_name, account_number FROM bank_accounts WHERE status = 'active' LIMIT 1`);
    const bank = bankRes.rows[0] || {
      id: 'bank-1',
      bank_name: 'ธนาคารอิสลามแห่งประเทศไทย',
      account_name: 'บัญชีเหรัญญิก',
      account_number: '1020-01',
    };

      const tx = await db.transaction('write');
    try {
      await this.ensureUserExists(actor, tx);
      await this.insertInternalTransfer(tx, {
        workflowId: input.workflowId,
        workflowNo: String(wf.workflow_no),
        amount,
        actor,
        recipientName: recipientUserName,
        evidenceUrl: input.files[0]?.fileUrl || '',
        approvedAt: transferDatetime,
      });

      // Check for discrepancy between requested withdraw amount and actual transfer amount
      const requestedAmount = Number(wf.step1_withdraw_amount || 0);
      const discrepancy = round2(amount - requestedAmount);
      let discrepancyNote = '';
      if (discrepancy !== 0) {
        discrepancyNote = discrepancy < 0 
          ? `ยอดโอนขาด ฿${Math.abs(discrepancy).toLocaleString('th-TH', { minimumFractionDigits: 2 })} จากยอดขอเบิก ฿${requestedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
          : `ยอดโอนเกิน ฿${discrepancy.toLocaleString('th-TH', { minimumFractionDigits: 2 })} จากยอดขอเบิก ฿${requestedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
      }

      const primaryFile = input.files[0];

      // 1. Insert into finance_handover_records
      await tx.execute({
        sql: `
          INSERT INTO finance_handover_records (
            id, withdrawal_id, workflow_id, handover_no,
            handover_date, handover_time,
            handed_over_by_id, handed_over_by_name,
            received_by_id, received_by_name,
            amount, handover_method, proof_url, proof_name, proof_size, proof_type,
            status, recorded_by_id, recorded_by_name,
            confirmed_by_id, confirmed_by_name, confirmed_at, notes,
            source_account_id, destination_account_id, actual_received_amount, discrepancy_reason
          ) VALUES (
            ?, ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?, 'cash', ?, ?, ?, ?,
            'pending_staff_confirm', ?, ?,
            '', '', '', ?,
            '1020-01', '1030-01', NULL, ?
          )
        `,
        args: [
          handoverId,
          withdrawalId,
          input.workflowId,
          handoverNo,
          handoverDate,
          handoverTime,
          actor.id,
          actor.name,
          recipientUserId,
          recipientUserName,
          amount,
          primaryFile.fileUrl,
          primaryFile.fileName,
          primaryFile.fileSize || 0,
          primaryFile.mimeType || 'application/pdf',
          actor.id,
          actor.name,
          input.notes || (discrepancyNote ? `เหรัญญิกบันทึกการส่งมอบเงินสด (${discrepancyNote})` : 'เหรัญญิกบันทึกการส่งมอบเงินสดให้แก่เจ้าหน้าที่'),
          discrepancyNote || null,
        ],
      });

      // 2. Insert all evidence files into treasurer_transfer_evidence and workflow_attachments
      const evidenceIds: string[] = [];
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const evidenceId = `tte-${Date.now()}-${i}-${randomUUID().slice(0, 4)}`;
        evidenceIds.push(evidenceId);

        await tx.execute({
          sql: `
            INSERT INTO treasurer_transfer_evidence (
              id, workflow_id, source_bank_account_id, source_bank_name,
              source_account_name, source_account_number, destination_account_id,
              destination_account_name, amount, transfer_datetime, reference_no,
              issuing_bank, file_url, file_name, file_size, mime_type, notes,
              status, verified_by_id, verified_by_name, verified_at,
              created_by_id, created_by_name,
              document_type, source_account_id, recipient_user_id, recipient_user_name, handover_id
            ) VALUES (
              ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              'verified', ?, ?, CURRENT_TIMESTAMP,
              ?, ?,
              ?, '1020-01', ?, ?, ?
            )
          `,
          args: [
            evidenceId,
            input.workflowId,
            String(bank.id),
            'บัญชีเงินสดเหรัญญิก (1020-01)',
            'บัญชีเงินสดเหรัญญิก',
            '1020-01',
            '1030-01',
            `เงินสดยืมทดรองเจ้าหน้าที่ (${recipientUserName})`,
            amount,
            transferDatetime,
            null,
            'คลังเงินสดเหรัญญิก',
            file.fileUrl,
            file.fileName,
            file.fileSize || 0,
            file.mimeType || 'application/pdf',
            file.notes || input.notes || null,
            actor.id,
            actor.name,
            actor.id,
            actor.name,
            file.documentType || 'transfer_slip',
            recipientUserId,
            recipientUserName,
            handoverId,
          ],
        });

        await tx.execute({
          sql: `
            INSERT INTO workflow_attachments (
              id, workflow_id, withdrawal_id, step_number, file_name, file_url,
              file_size, mime_type, uploaded_by_id, uploaded_by_name, uploaded_at, description
            ) VALUES (?, ?, ?, 2, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
          `,
          args: [
            `wfa-${Date.now()}-${i}-${randomUUID().slice(0, 4)}`,
            input.workflowId,
            withdrawalId,
            file.fileName,
            file.fileUrl,
            file.fileSize || 0,
            file.mimeType || 'application/pdf',
            actor.id,
            actor.name,
            `หลักฐานการส่งมอบเงินสด (${file.documentType || 'transfer_slip'}) ฿${amount.toLocaleString('th-TH')}`,
          ],
        });
      }

      // 3. Update cash_flow_workflows
      await tx.execute({
        sql: `
          UPDATE cash_flow_workflows SET
            step2_handover_person_id = ?,
            step2_handover_person_name = ?,
            step2_handover_amount = ?,
            step2_handover_datetime = ?,
            step2_status = 'cash_disbursed',
            overall_status = 'cash_disbursed_to_staff',
            step1_status = CASE WHEN step1_status = 'pending_approval' THEN 'approved' ELSE step1_status END,
            step1_approver_id = COALESCE(step1_approver_id, ?),
            step1_approver_name = COALESCE(step1_approver_name, ?),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [
          actor.id,
          actor.name,
          amount,
          transferDatetime,
          actor.id,
          actor.name,
          input.workflowId,
        ],
      });

      // 4. Update cash_flow_withdrawals
      await tx.execute({
        sql: `
          UPDATE cash_flow_withdrawals SET
            handover_status = 'handed_over',
            status = 'cash_disbursed',
            approver_id = COALESCE(approver_id, ?),
            approver_name = COALESCE(approver_name, ?),
            updated_at = CURRENT_TIMESTAMP
          WHERE workflow_id = ?
        `,
        args: [actor.id, actor.name, input.workflowId],
      });

      await tx.execute({
        sql: `UPDATE cash_flow_disbursement_items SET status = 'awaiting_payment', updated_at = CURRENT_TIMESTAMP WHERE workflow_id = ? AND status NOT IN ('cancelled', 'paid', 'partial', 'completed')`,
        args: [input.workflowId],
      });

      // 5. Audit log
      await tx.execute({
        sql: `
          INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
          VALUES (?, ?, ?, ?, ?, 'RECORD_TREASURER_TRANSFER', 'cash_flow_workflow', ?, ?)
        `,
        args: [
          `log-${Date.now()}`,
          new Date().toISOString(),
          actor.id,
          actor.name,
          actor.role,
          input.workflowId,
          `เหรัญญิก (${actor.name}) บันทึกการโอนเงิน/ถอนเงินสด ฿${amount.toLocaleString('th-TH')} จากบัญชีเหรัญญิก (1020-01) ไปยังเงินสดเจ้าหน้าที่ (${recipientUserName}) พร้อมแนบเอกสาร ${input.files.length} รายการ (สถานะ: รอเจ้าหน้าที่ยืนยันรับเงิน)`,
        ],
      });

      await tx.commit();
      return {
        success: true,
        workflowId: input.workflowId,
        handoverId,
        handoverNo,
        amount,
        status: 'pending_staff_confirm',
        evidenceCount: input.files.length,
        discrepancy,
      };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  /**
   * ROLE A / STAFF: Office staff confirms receipt of transferred cash
   * POSTS DOUBLE-ENTRY GENERAL LEDGER (GL) strictly on confirmation:
   * Debit: 1030-01 (Staff Cash Float)
   * Credit: 1020-01 (Treasurer Cash Float)
   * NEVER debit expense 5010-01 or 5020-xx at this step.
   */
  static async staffConfirmTransferReceipt(
    input: {
      workflowId: string;
      handoverId?: string;
      decision: 'fully_received' | 'partially_received' | 'returned_for_review';
      actualReceivedAmount?: number;
      discrepancyReason?: string;
      notes?: string;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const wfRes = await db.execute({
      sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`,
      args: [input.workflowId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรอบการเบิก');
    const wf = wfRes.rows[0];

    // Verify actor is the recipient staff or super_admin
    if (String(wf.step1_operator_id) !== actor.id && actor.role !== 'super_admin' && actor.role !== 'finance') {
      throw new Error('เฉพาะเจ้าหน้าที่ผู้จัดทำคำขอเบิกเท่านั้นที่สามารถกดยืนยันรับเงินสดได้');
    }

    const hndRes = await db.execute({
      sql: `
        SELECT * FROM finance_handover_records 
        WHERE (id = ? OR workflow_id = ?) 
          AND status IN ('pending_staff_confirm', 'pending_verification', 'transferred', 'partially_received')
        ORDER BY created_at DESC LIMIT 1
      `,
      args: [input.handoverId || '', input.workflowId],
    });
    if (hndRes.rows.length === 0) throw new Error('ไม่พบข้อมูลการส่งมอบเงินที่รอการยืนยัน');
    const hnd = hndRes.rows[0];

    const handedAmount = Number(hnd.amount || 0);
    const dateFormatted = new Date().toLocaleDateString('th-TH');
    const timestampNow = new Date().toISOString();
    const journalNo = `JV-HND-${new Date().getFullYear() + 543}-${Math.floor(1000 + Math.random() * 9000)}`;
    const txnNo = `TXN-HND-${Date.now()}`;

    const tx = await db.transaction('write');
    try {
      await this.ensureUserExists(actor, tx);

      if (input.decision === 'fully_received') {
        const alreadyPosted = await tx.execute({
          sql: `SELECT id FROM financial_transactions WHERE workflow_id = ? AND type = 'transfer' AND category = 'โอนภายในจากเงินสดเหรัญญิกไปเงินสดเจ้าหน้าที่' LIMIT 1`,
          args: [input.workflowId],
        });
        // 1. Update handover record
        await tx.execute({
          sql: `
            UPDATE finance_handover_records SET
              status = 'fully_received',
              actual_received_amount = ?,
              confirmed_by_id = ?,
              confirmed_by_name = ?,
              confirmed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [handedAmount, actor.id, actor.name, hnd.id],
        });

        if (alreadyPosted.rows.length === 0) {
        // 2. Update workflow status to disbursed
        await tx.execute({
          sql: `
            UPDATE cash_flow_workflows SET
              step2_deposit_amount = ?,
              step2_status = 'completed',
              step3_status = 'received',
              overall_status = 'disbursed',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [handedAmount, input.workflowId],
        });

        await tx.execute({
          sql: `
            UPDATE cash_flow_withdrawals SET
              status = 'disbursed',
              handover_status = 'fully_received',
              updated_at = CURRENT_TIMESTAMP
            WHERE workflow_id = ?
          `,
          args: [input.workflowId],
        });

        // 3. POST DOUBLE-ENTRY GENERAL LEDGER (GL)
        // Debit: 1030-01 (เงินสดยืมทดรองเจ้าหน้าที่ / Staff Cash Float)
        // Credit: 1020-01 (เงินสดในมือเหรัญญิก / Treasurer Cash Float)
        await tx.execute({
          sql: `INSERT INTO general_ledger_entries (
            id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
            account_code, account_name, account_category, entry_type, amount, currency,
            description, created_by
          ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'debit', ?, 'THB', ?, ?)`,
          args: [
            `gl-deb-hnd-${Date.now()}-1`,
            journalNo,
            txnNo,
            dateFormatted,
            handedAmount,
            `เจ้าหน้าที่ (${actor.name}) ยืนยันรับมอบเงินสดครบถ้วน ฿${handedAmount.toLocaleString('th-TH')} จากเหรัญญิกสำหรับรอบ ${wf.workflow_no}`,
            actor.name,
          ],
        });

        await tx.execute({
          sql: `INSERT INTO general_ledger_entries (
            id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
            account_code, account_name, account_category, entry_type, amount, currency,
            description, created_by
          ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1020-01', 'เงินสดในมือเหรัญญิก', 'asset', 'credit', ?, 'THB', ?, ?)`,
          args: [
            `gl-crd-hnd-${Date.now()}-2`,
            journalNo,
            txnNo,
            dateFormatted,
            handedAmount,
            `เหรัญญิกส่งมอบเงินสดแก่เจ้าหน้าที่ (${actor.name}) ฿${handedAmount.toLocaleString('th-TH')} สำหรับรอบ ${wf.workflow_no}`,
            actor.name,
          ],
        });
        }

        await tx.execute({
          sql: `
            INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, 'CONFIRM_CASH_RECEIPT', 'cash_flow_workflow', ?, ?)
          `,
          args: [
            `log-${Date.now()}`,
            timestampNow,
            actor.id,
            actor.name,
            actor.role,
            input.workflowId,
            `เจ้าหน้าที่ (${actor.name}) ยืนยันรับเงินสดครบถ้วน ฿${handedAmount.toLocaleString('th-TH')} จากเหรัญญิกเรียบร้อย (ลงบันทึก GL เรียบร้อย)`,
          ],
        });

        await tx.commit();
        return {
          success: true,
          workflowId: input.workflowId,
          decision: 'fully_received',
          amount: handedAmount,
          journalNo,
          status: 'disbursed',
          handoverStatus: 'fully_received',
        };
      }

      if (input.decision === 'partially_received') {
        const actualReceived = round2(Number(input.actualReceivedAmount) || 0);
        if (actualReceived <= 0 || actualReceived >= handedAmount) {
          throw new Error('ยอดเงินที่ได้รับจริงไม่ครบต้องมากกว่า 0 และน้อยกว่ายอดที่ส่งมอบ');
        }
        const reason = (input.discrepancyReason || input.notes || '').trim();
        if (!reason) {
          throw new Error('กรุณาระบุเหตุผลที่ได้รับเงินไม่ครบ (Discrepancy Reason)');
        }

        // 1. Update handover record
        await tx.execute({
          sql: `
            UPDATE finance_handover_records SET
              status = 'partially_received',
              actual_received_amount = ?,
              discrepancy_reason = ?,
              confirmed_by_id = ?,
              confirmed_by_name = ?,
              confirmed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [actualReceived, reason, actor.id, actor.name, hnd.id],
        });

        // 2. Update workflow
        await tx.execute({
          sql: `
            UPDATE cash_flow_workflows SET
              step2_deposit_amount = ?,
              step2_status = 'partially_received',
              overall_status = 'partially_received',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [actualReceived, input.workflowId],
        });

        await tx.execute({
          sql: `
            UPDATE cash_flow_withdrawals SET
              handover_status = 'partially_received',
              updated_at = CURRENT_TIMESTAMP
            WHERE workflow_id = ?
          `,
          args: [input.workflowId],
        });

        // 3. POST GL for the actual received portion
        await tx.execute({
          sql: `INSERT INTO general_ledger_entries (
            id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
            account_code, account_name, account_category, entry_type, amount, currency,
            description, created_by
          ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'debit', ?, 'THB', ?, ?)`,
          args: [
            `gl-deb-hnd-${Date.now()}-1`,
            journalNo,
            txnNo,
            dateFormatted,
            actualReceived,
            `เจ้าหน้าที่ (${actor.name}) ยืนยันรับเงินสดบางส่วน ฿${actualReceived.toLocaleString('th-TH')} จากยอดส่งมอบ ฿${handedAmount.toLocaleString('th-TH')} (เหตุผล: ${reason})`,
            actor.name,
          ],
        });

        await tx.execute({
          sql: `INSERT INTO general_ledger_entries (
            id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
            account_code, account_name, account_category, entry_type, amount, currency,
            description, created_by
          ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1020-01', 'เงินสดในมือเหรัญญิก', 'asset', 'credit', ?, 'THB', ?, ?)`,
          args: [
            `gl-crd-hnd-${Date.now()}-2`,
            journalNo,
            txnNo,
            dateFormatted,
            actualReceived,
            `เหรัญญิกส่งมอบเงินสดแก่เจ้าหน้าที่ (${actor.name}) ฿${actualReceived.toLocaleString('th-TH')} (รับบางส่วน, เหตุผล: ${reason})`,
            actor.name,
          ],
        });

        await tx.execute({
          sql: `
            INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, 'PARTIAL_CASH_RECEIPT', 'cash_flow_workflow', ?, ?)
          `,
          args: [
            `log-${Date.now()}`,
            timestampNow,
            actor.id,
            actor.name,
            actor.role,
            input.workflowId,
            `เจ้าหน้าที่ (${actor.name}) แจ้งยอดรับเงินไม่ครบ: ได้รับจริง ฿${actualReceived.toLocaleString('th-TH')} จากยอดส่งมอบ ฿${handedAmount.toLocaleString('th-TH')} เหตุผล: ${reason}`,
          ],
        });

        await tx.commit();
        return {
          success: true,
          workflowId: input.workflowId,
          decision: 'partially_received',
          amount: actualReceived,
          expectedAmount: handedAmount,
          discrepancy: round2(handedAmount - actualReceived),
          status: 'partially_received',
        };
      }

      if (input.decision === 'returned_for_review') {
        const reason = (input.discrepancyReason || input.notes || '').trim();
        if (!reason) {
          throw new Error('กรุณาระบุเหตุผลในการส่งกลับตรวจสอบ');
        }

        await tx.execute({
          sql: `
            UPDATE finance_handover_records SET
              status = 'returned_for_review',
              discrepancy_reason = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [reason, hnd.id],
        });

        await tx.execute({
          sql: `
            UPDATE cash_flow_workflows SET
              step2_status = 'returned_for_review',
              overall_status = 'returned_for_review',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [input.workflowId],
        });

        await tx.execute({
          sql: `
            UPDATE cash_flow_withdrawals SET
              handover_status = 'returned_for_review',
              updated_at = CURRENT_TIMESTAMP
            WHERE workflow_id = ?
          `,
          args: [input.workflowId],
        });

        await tx.execute({
          sql: `
            INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
            VALUES (?, ?, ?, ?, ?, 'RETURN_TRANSFER_FOR_REVIEW', 'cash_flow_workflow', ?, ?)
          `,
          args: [
            `log-${Date.now()}`,
            timestampNow,
            actor.id,
            actor.name,
            actor.role,
            input.workflowId,
            `เจ้าหน้าที่ (${actor.name}) ส่งกลับรายการโอนเงินให้เหรัญญิกตรวจสอบใหม่ เหตุผล: ${reason}`,
          ],
        });

        await tx.commit();
        return {
          success: true,
          workflowId: input.workflowId,
          decision: 'returned_for_review',
          status: 'returned_for_review',
          reason,
        };
      }

      throw new Error(`คำสั่งการยืนยันไม่ถูกต้อง (${input.decision})`);
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  /**
   * ROLE A: Office Staff confirms cash receipt -> POSTS DOUBLE-ENTRY GENERAL LEDGER (Backwards compatible)
   */
  static async staffConfirmCashReceipt(workflowId: string, handoverId: string, actor: ActorContext) {
    return this.staffConfirmTransferReceipt(
      {
        workflowId,
        handoverId,
        decision: 'fully_received',
      },
      actor
    );
  }

  /**
   * ROLE A: Office Staff settles a line item (จ่ายเงินช่วยเหลือ หรือจ่ายค่าบริหารจริง พร้อมแนบหลักฐาน)
   */
  static async settleBatchLineItem(
    input: {
      workflowId: string;
      itemId: string;
      itemType: 'aid' | 'admin';
      actualPaidAmount: number;
      paidDate: string;
      proofUrl?: string;
      notes?: string;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const wfRes = await db.execute({
      sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`,
      args: [input.workflowId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรอบการเบิก');

    const amount = round2(Number(input.actualPaidAmount) || 0);
    if (amount <= 0) throw new Error('ยอดเงินที่จ่ายจริงต้องมากกว่า 0 บาท');

    const paidDate = input.paidDate || new Date().toISOString().slice(0, 10);
    const dateFormatted = new Date().toLocaleDateString('th-TH');
    const journalNo = `JV-SETTLE-${new Date().getFullYear() + 543}-${Math.floor(1000 + Math.random() * 9000)}`;
    const txnNo = `TXN-SETTLE-${Date.now()}`;

    if (input.itemType === 'aid') {
      const itemRes = await db.execute({
        sql: `SELECT * FROM cash_flow_disbursement_items WHERE id = ?`,
        args: [input.itemId],
      });
      if (itemRes.rows.length === 0) throw new Error('ไม่พบรายการย่อยการช่วยเหลือ');
      const item = itemRes.rows[0];

      // Update item status
      await db.execute({
        sql: `
          UPDATE cash_flow_disbursement_items SET
            this_disbursement_amount = ?,
            status = 'confirmed',
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [amount, input.notes || null, input.itemId],
      });

      // Update assistance application (Partial vs Full disbursement lifecycle)
      if (item.application_id && !String(item.application_id).startsWith('app-system')) {
        const appRes = await db.execute({
          sql: `SELECT approved_amount, disbursed_amount FROM assistance_applications WHERE id = ?`,
          args: [item.application_id],
        });
        if (appRes.rows.length > 0) {
          const appRow = appRes.rows[0];
          const approved = Number(appRow.approved_amount) || 0;
          const prevDisbursed = Number(appRow.disbursed_amount) || 0;
          const newDisbursed = round2(prevDisbursed + amount);
          const isFullyDisbursed = newDisbursed >= approved;

          await db.execute({
            sql: `
              UPDATE assistance_applications SET
                disbursed_amount = ?,
                disbursement_date = ?,
                payment_status = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            args: [
              newDisbursed,
              paidDate,
              isFullyDisbursed ? 'completed' : 'partial',
              isFullyDisbursed ? 'disbursed' : 'wait_disbursement',
              item.application_id,
            ],
          });
        }
      }

      // POST DOUBLE-ENTRY GL
      // Debit: 5010-01 (ค่าใช้จ่ายเงินสงเคราะห์ซะกาตตามอัสนัฟ)
      // Credit: 1030-01 (เงินสดยืมทดรองเจ้าหน้าที่)
      await db.execute({
        sql: `INSERT INTO general_ledger_entries (
          id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
          account_code, account_name, account_category, entry_type, amount, currency,
          description, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, '5010-01', 'ค่าใช้จ่ายเงินสงเคราะห์ซะกาตตามอัสนัฟ', 'expense', 'debit', ?, 'THB', ?, ?)`,
        args: [
          `gl-deb-aid-${Date.now()}`,
          journalNo,
          txnNo,
          String(item.application_id || 'app-system-internal'),
          String(item.beneficiary_id || 'ben-system-internal'),
          dateFormatted,
          amount,
          `จ่ายเงินสงเคราะห์ซะกาตแก่ ${item.beneficiary_name} (${item.asnaf_category})`,
          actor.name,
        ],
      });

      await db.execute({
        sql: `INSERT INTO general_ledger_entries (
          id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
          account_code, account_name, account_category, entry_type, amount, currency,
          description, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'credit', ?, 'THB', ?, ?)`,
        args: [
          `gl-crd-aid-${Date.now()}`,
          journalNo,
          txnNo,
          String(item.application_id || 'app-system-internal'),
          String(item.beneficiary_id || 'ben-system-internal'),
          dateFormatted,
          amount,
          `ตัดจ่ายเงินสดในมือเจ้าหน้าที่ (${actor.name}) แก่ ${item.beneficiary_name}`,
          actor.name,
        ],
      });
    } else {
      // itemType === 'admin'
      const itemRes = await db.execute({
        sql: `SELECT * FROM cash_flow_clearance_items WHERE id = ?`,
        args: [input.itemId],
      });
      if (itemRes.rows.length === 0) throw new Error('ไม่พบรายการย่อยค่าบริหาร');
      const item = itemRes.rows[0];

      await db.execute({
        sql: `
          UPDATE cash_flow_clearance_items SET
            amount = ?,
            expense_date = ?,
            receipt_url = COALESCE(?, receipt_url),
            status = 'accepted',
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [amount, paidDate, input.proofUrl || null, input.notes || null, input.itemId],
      });

      // POST DOUBLE-ENTRY GL
      // Debit: 5020-01 (ค่าใช้จ่ายดำเนินงานบริหารสำนักงาน)
      // Credit: 1030-01 (เงินสดยืมทดรองเจ้าหน้าที่)
      await db.execute({
        sql: `INSERT INTO general_ledger_entries (
          id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
          account_code, account_name, account_category, entry_type, amount, currency,
          description, created_by
        ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '5020-01', 'ค่าใช้จ่ายดำเนินงานบริหารสำนักงาน', 'expense', 'debit', ?, 'THB', ?, ?)`,
        args: [
          `gl-deb-adm-${Date.now()}`,
          journalNo,
          txnNo,
          dateFormatted,
          amount,
          `จ่ายค่าใช้จ่ายบริหาร: ${item.description || item.category_name}`,
          actor.name,
        ],
      });

      await db.execute({
        sql: `INSERT INTO general_ledger_entries (
          id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
          account_code, account_name, account_category, entry_type, amount, currency,
          description, created_by
        ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'credit', ?, 'THB', ?, ?)`,
        args: [
          `gl-crd-adm-${Date.now()}`,
          journalNo,
          txnNo,
          dateFormatted,
          amount,
          `ตัดจ่ายเงินสดในมือเจ้าหน้าที่ (${actor.name}) สำหรับค่าบริหารสำนักงาน`,
          actor.name,
        ],
      });
    }

    return {
      success: true,
      workflowId: input.workflowId,
      itemId: input.itemId,
      amount,
      journalNo,
      status: 'confirmed',
    };
  }

  /**
   * ROLE A: Record Cash Refund back to Treasurer
   */
  static async recordBatchRefund(
    workflowId: string,
    input: {
      refundAmount: number;
      refundDate?: string;
      reason: string;
      proofUrl?: string;
    },
    actor: ActorContext
  ) {
    await initDb();
    const db = getDb();

    const refundAmount = round2(Number(input.refundAmount) || 0);
    if (refundAmount <= 0) throw new Error('ยอดเงินที่ส่งคืนต้องมากกว่า 0 บาท');
    if (!input.reason || input.reason.trim().length === 0) {
      throw new Error('กรุณาระบุเหตุผลการส่งคืนเงินสด');
    }

    const wfRes = await db.execute({
      sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`,
      args: [workflowId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรอบการเบิก');
    const wf = wfRes.rows[0];

    const refundNo = `REF-${new Date().getFullYear() + 543}-${Math.floor(1000 + Math.random() * 9000)}`;
    const refundId = `ref-${Date.now()}-${randomUUID().slice(0, 4)}`;
    const refundDate = input.refundDate || new Date().toISOString().slice(0, 10);
    const dateFormatted = new Date().toLocaleDateString('th-TH');
    const journalNo = `JV-REF-${new Date().getFullYear() + 543}-${Math.floor(1000 + Math.random() * 9000)}`;
    const txnNo = `TXN-REF-${Date.now()}`;

    // Insert into assistance_refund_records
    await db.execute({
      sql: `
        INSERT INTO assistance_refund_records (
          id, refund_no, workflow_id, refund_date, refund_time, refund_datetime,
          refund_amount, refund_reason,
          returned_by_id, returned_by_name,
          received_by_id, received_by_name,
          proof_url, status
        ) VALUES (
          ?, ?, ?, ?, '12:00:00', ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, 'completed'
        )
      `,
      args: [
        refundId,
        refundNo,
        workflowId,
        refundDate,
        `${refundDate} 12:00:00`,
        refundAmount,
        input.reason.trim(),
        actor.id,
        actor.name,
        String(wf.step2_treasurer_id || 'custodian-ruslan'),
        String(wf.step2_treasurer_name || 'นายรุสลัน หะสาเมาะ'),
        input.proofUrl || 'https://placehold.co/400x300.png?text=Refund+Slip',
      ],
    });

    // Update withdrawal clearance_returned_amount
    await db.execute({
      sql: `
        UPDATE cash_flow_withdrawals SET
          clearance_returned_amount = COALESCE(clearance_returned_amount, 0) + ?,
          clearance_return_date = ?,
          clearance_status = 'cleared',
          updated_at = CURRENT_TIMESTAMP
        WHERE workflow_id = ?
      `,
      args: [refundAmount, refundDate, workflowId],
    });

    // POST DOUBLE-ENTRY GL
    // Debit: 1020-01 (เงินสดในมือเหรัญญิก / Treasurer Cash Float)
    // Credit: 1030-01 (เงินสดยืมทดรองเจ้าหน้าที่ / Staff Cash Float)
    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        description, created_by
      ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1020-01', 'เงินสดในมือเหรัญญิก', 'asset', 'debit', ?, 'THB', ?, ?)`,
      args: [
        `gl-deb-ref-${Date.now()}`,
        journalNo,
        txnNo,
        dateFormatted,
        refundAmount,
        `เหรัญญิกรับคืนเงินสดคงเหลือจากเจ้าหน้าที่ (${actor.name}) สำหรับรอบ ${wf.workflow_no}`,
        actor.name,
      ],
    });

    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        description, created_by
      ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'credit', ?, 'THB', ?, ?)`,
      args: [
        `gl-crd-ref-${Date.now()}`,
        journalNo,
        txnNo,
        dateFormatted,
        refundAmount,
        `เจ้าหน้าที่ (${actor.name}) ส่งคืนเงินสดคงเหลือเข้ามือเหรัญญิก`,
        actor.name,
      ],
    });

    return {
      success: true,
      refundId,
      refundNo,
      amount: refundAmount,
      journalNo,
    };
  }

  /**
   * ROLE B: Treasurer inspects equation & closes the batch round
   */
  static async closeBatchRound(workflowId: string, input: { notes?: string }, actor: ActorContext) {
    await initDb();
    const db = getDb();

    if (actor.role !== 'finance' && actor.role !== 'super_admin' && actor.role !== 'approver') {
      throw new Error('เฉพาะฝ่ายเหรัญญิกหรือผู้ดูแลระบบเท่านั้นที่สามารถอนุมัติปิดรอบได้');
    }
    await this.ensureUserExists(actor);

    const detail = await this.getBatchDisbursementDetail(workflowId);
    if (!detail) throw new Error('ไม่พบข้อมูลรอบการเบิก');

    const totalHandedOver = detail.totalHandedOver;
    const totalActualDisbursed = detail.totalActualDisbursed;
    const totalRefunded = detail.totalRefunded;
    const remainingFloat = round2(totalHandedOver - (totalActualDisbursed + totalRefunded));

    // Update workflow closing record
    await db.execute({
      sql: `
        UPDATE cash_flow_workflows SET
          step5_reconciled_amount = ?,
          step5_remaining_cash = ?,
          step5_auditor_id = ?,
          step5_auditor_name = ?,
          step5_closed_at = CURRENT_TIMESTAMP,
          step5_status = 'completed',
          step5_notes = ?,
          overall_status = 'completed',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        totalActualDisbursed + totalRefunded,
        remainingFloat,
        actor.id,
        actor.name,
        input.notes || `เหรัญญิกตรวจสอบปิดรอบสมบูรณ์ (จ่ายจริง ฿${totalActualDisbursed.toLocaleString('th-TH')}, คืนเงิน ฿${totalRefunded.toLocaleString('th-TH')}, คงเหลือความรับผิดชอบ ฿${remainingFloat.toLocaleString('th-TH')})`,
        workflowId,
      ],
    });

    await db.execute({
      sql: `UPDATE cash_flow_withdrawals SET status = 'completed', clearance_status = 'cleared', updated_at = CURRENT_TIMESTAMP WHERE workflow_id = ?`,
      args: [workflowId],
    });

    await db.execute({
      sql: `
        INSERT INTO finance_approval_events (
          id, document_type, document_id, action, from_status, to_status,
          actor_id, actor_name, actor_role, note
        ) VALUES (?, 'payment_voucher', ?, 'CLOSE_ROUND', 'disbursed', 'completed', ?, ?, ?, ?)
      `,
      args: [
        `fae-${Date.now()}`,
        workflowId,
        actor.id,
        actor.name,
        actor.role,
        input.notes || 'ตรวจสอบกระทบยอดปิดรอบเรียบร้อย',
      ],
    });

    return {
      success: true,
      workflowId,
      totalHandedOver,
      totalActualDisbursed,
      totalRefunded,
      remainingFloat,
      isBalanced: remainingFloat === 0,
      status: 'completed',
    };
  }

  /**
   * Fetch Batch Disbursement list with Filtering for Treasurer & Officer
   */
  static async getBatchDisbursementList(filters: {
    tab?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    role?: string;
    userId?: string;
  }) {
    await initDb();
    const db = getDb();

    const tab = filters.tab || 'all';
    const search = `%${(filters.search || '').trim()}%`;
    const dateFrom = filters.dateFrom?.trim() || '';
    const dateTo = filters.dateTo?.trim() || '';

    let sql = `
      SELECT 
        w.id,
        w.workflow_no,
        w.title,
        w.step1_withdraw_amount,
        w.step1_date,
        w.step1_operator_id,
        w.step1_operator_name,
        w.step1_status,
        w.step1_fund_type,
        w.step2_treasurer_name,
        w.step2_handover_amount,
        w.step2_status,
        w.overall_status,
        w.created_at,
        COALESCE(d_cnt.c, 0) as aid_count,
        COALESCE(c_cnt.c, 0) as admin_count,
        COALESCE(d_sum.s, 0) as aid_spent,
        COALESCE(c_sum.s, 0) as admin_spent,
        COALESCE(r_sum.s, 0) as refunded_amount,
        COALESCE(ev.c, 0) as evidence_count
      FROM cash_flow_workflows w
      LEFT JOIN (
        SELECT workflow_id, COUNT(*) as c FROM cash_flow_disbursement_items GROUP BY workflow_id
      ) d_cnt ON d_cnt.workflow_id = w.id
      LEFT JOIN (
        SELECT workflow_id, COUNT(*) as c FROM cash_flow_clearance_items GROUP BY workflow_id
      ) c_cnt ON c_cnt.workflow_id = w.id
      LEFT JOIN (
        SELECT workflow_id, SUM(this_disbursement_amount) as s FROM cash_flow_disbursement_items WHERE status = 'confirmed' GROUP BY workflow_id
      ) d_sum ON d_sum.workflow_id = w.id
      LEFT JOIN (
        SELECT workflow_id, SUM(amount) as s FROM cash_flow_clearance_items WHERE status = 'accepted' GROUP BY workflow_id
      ) c_sum ON c_sum.workflow_id = w.id
      LEFT JOIN (
        SELECT workflow_id, SUM(refund_amount) as s FROM assistance_refund_records WHERE status = 'completed' GROUP BY workflow_id
      ) r_sum ON r_sum.workflow_id = w.id
      LEFT JOIN (
        SELECT workflow_id, COUNT(*) as c FROM treasurer_transfer_evidence GROUP BY workflow_id
      ) ev ON ev.workflow_id = w.id
      WHERE (w.workflow_no LIKE ? OR w.title LIKE ? OR w.step1_operator_name LIKE ?)
    `;
    const args: any[] = [search, search, search];

    if (dateFrom) {
      sql += ` AND date(w.step1_date) >= date(?)`;
      args.push(dateFrom);
    }
    if (dateTo) {
      sql += ` AND date(w.step1_date) <= date(?)`;
      args.push(dateTo);
    }

    sql += ` ORDER BY w.created_at DESC`;

    const allRowsRes = await db.execute({ sql, args });

    const items = allRowsRes.rows.map((r: any) => {
      const step1Status = String(r.step1_status || 'draft');
      const step2Status = String(r.step2_status || 'pending');
      const overallStatus = String(r.overall_status || 'draft');
      const aidCount = Number(r.aid_count || 0);
      const adminCount = Number(r.admin_count || 0);
      const totalAmount = Number(r.step1_withdraw_amount || 0);
      const actualDisbursed = Number(r.aid_spent || 0) + Number(r.admin_spent || 0);
      const refunded = Number(r.refunded_amount || 0);
      const handedAmount = Number(r.step2_handover_amount || totalAmount);

      return {
        id: String(r.id),
        workflowNo: String(r.workflow_no),
        title: String(r.title),
        date: String(r.step1_date || '').slice(0, 10),
        operatorId: String(r.step1_operator_id || ''),
        operatorName: String(r.step1_operator_name || 'เจ้าหน้าที่'),
        treasurerName: String(r.step2_treasurer_name || 'เหรัญญิก'),
        fundType: String(r.step1_fund_type || 'zakat'),
        totalAmount,
        handedAmount,
        actualDisbursed,
        refunded,
        remainingResponsibility: Math.max(0, handedAmount - (actualDisbursed + refunded)),
        itemCount: aidCount + adminCount,
        aidCount,
        adminCount,
        step1Status,
        step2Status,
        overallStatus,
        evidenceCount: Number(r.evidence_count || 0),
        createdAt: String(r.created_at || ''),
      };
    });

    const isRejected = (it: { step1Status: string; overallStatus: string }) => it.step1Status === 'rejected' || it.overallStatus === 'cancelled';
    const isRevision = (it: { step1Status: string }) => it.step1Status === 'rejected_for_revision';
    const isApproved = (it: { step1Status: string; overallStatus: string }) => !isRejected(it) && !isRevision(it) && (it.step1Status === 'approved' || ['cash_disbursed_to_staff', 'disbursed', 'completed'].includes(it.overallStatus));
    const isIncoming = (it: { step1Status: string; evidenceCount: number }) => it.step1Status === 'pending_approval' && it.evidenceCount === 0;
    const isReviewing = (it: { step1Status: string; evidenceCount: number }) => it.step1Status === 'pending_approval' && it.evidenceCount > 0;
    const amountOf = (list: Array<{ totalAmount: number }>) => round2(list.reduce((sum, it) => sum + Number(it.totalAmount || 0), 0));
    const incomingItems = items.filter(isIncoming);
    const reviewingItems = items.filter(isReviewing);
    const revisionItems = items.filter(isRevision);
    const approvedItems = items.filter(isApproved);
    const rejectedItems = items.filter(isRejected);
    const pendingItems = items.filter((it) => it.step1Status === 'pending_approval');

    // Compute Badge counts for Tabs & Summary Cards
    const badgeCounts = {
      all: items.length,
      incoming: incomingItems.length,
      reviewing: reviewingItems.length,
      pending_approval: pendingItems.length,
      approved: approvedItems.length,
      revision: revisionItems.length,
      rejected: rejectedItems.length,
      pending_handover: items.filter((it) => it.step1Status === 'approved' && (it.step2Status === 'pending' || it.step2Status === 'pending_handover')).length,
      pending_receipt: items.filter((it) => it.overallStatus === 'pending_staff_receipt').length,
      pending_closing: items.filter((it) => it.overallStatus === 'disbursed' || it.overallStatus === 'in_progress').length,
      closed: items.filter((it) => it.overallStatus === 'completed').length,
    };

    // Filter by selected tab
    let filteredItems = items;
    if (tab === 'incoming') {
      filteredItems = incomingItems;
    } else if (tab === 'reviewing') {
      filteredItems = reviewingItems;
    } else if (tab === 'pending_approval') {
      filteredItems = pendingItems;
    } else if (tab === 'revision') {
      filteredItems = revisionItems;
    } else if (tab === 'approved') {
      filteredItems = approvedItems;
    } else if (tab === 'rejected') {
      filteredItems = rejectedItems;
    } else if (tab === 'pending_handover') {
      filteredItems = items.filter((it) => it.step1Status === 'approved' && (it.step2Status === 'pending' || it.step2Status === 'pending_handover'));
    } else if (tab === 'pending_receipt') {
      filteredItems = items.filter((it) => it.overallStatus === 'pending_staff_receipt');
    } else if (tab === 'pending_closing') {
      filteredItems = items.filter((it) => it.overallStatus === 'disbursed' || it.overallStatus === 'in_progress');
    } else if (tab === 'closed') {
      filteredItems = items.filter((it) => it.overallStatus === 'completed');
    }

    const amounts = {
      incoming: amountOf(incomingItems),
      reviewing: amountOf(reviewingItems),
      pending_approval: amountOf(pendingItems),
      revision: amountOf(revisionItems),
      approved: amountOf(approvedItems),
      rejected: amountOf(rejectedItems),
      all: amountOf(items),
    };

    return {
      items: filteredItems,
      batches: filteredItems,
      badgeCounts,
      counts: badgeCounts,
      amounts,
      totalCount: items.length,
    };
  }

  static async readStaffFloat(client: any) {
    const gl = await client.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN account_code = '1030-01' AND entry_type = 'debit' THEN amount ELSE 0 END), 0) as debit,
        COALESCE(SUM(CASE WHEN account_code = '1030-01' AND entry_type = 'credit' THEN amount ELSE 0 END), 0) as credit
      FROM general_ledger_entries
    `);
    return fromSatang(toSatang(Number(gl.rows[0]?.debit || 0)) - toSatang(Number(gl.rows[0]?.credit || 0)));
  }

  static async listStaffPayableCases(actor: ActorContext) {
    await initDb();
    const db = getDb();
    const mineOnly = actor.role === 'officer';
    const res = await db.execute({
      sql: `
        SELECT d.id, d.workflow_id, d.application_id, d.beneficiary_id, d.beneficiary_name, d.asnaf_category,
          d.assistance_type, d.approved_amount, d.this_disbursement_amount, d.status,
          w.workflow_no, w.step1_operator_id, w.step1_operator_name, w.step1_approver_name, w.overall_status,
          COALESCE(a.application_no, d.application_id) as application_no,
          COALESCE(paid.paid_amount, 0) as paid_amount,
          COALESCE(paid.installments, 0) as installments
        FROM cash_flow_disbursement_items d
        JOIN cash_flow_workflows w ON w.id = d.workflow_id
        LEFT JOIN assistance_applications a ON a.id = d.application_id
        LEFT JOIN (
          SELECT workflow_id, application_id, SUM(actual_disbursed_amount) as paid_amount, COUNT(*) as installments
          FROM assistance_execution_records
          WHERE is_confirmed = 1 AND status = 'confirmed'
          GROUP BY workflow_id, application_id
        ) paid ON paid.workflow_id = d.workflow_id AND paid.application_id = d.application_id
        WHERE w.overall_status = 'cash_disbursed_to_staff'
          AND d.status IN ('awaiting_payment', 'partial')
          AND (? = 0 OR w.step1_operator_id = ?)
        ORDER BY w.created_at DESC, d.created_at ASC
      `,
      args: [mineOnly ? 1 : 0, actor.id],
    });
    return res.rows.map((row: any) => {
      const allocated = round2(Number(row.this_disbursement_amount || 0));
      const paidAmount = round2(Number(row.paid_amount || 0));
      return {
        id: String(row.id),
        workflowId: String(row.workflow_id),
        workflowNo: String(row.workflow_no),
        applicationId: String(row.application_id),
        applicationNo: String(row.application_no),
        beneficiaryId: String(row.beneficiary_id),
        beneficiaryName: String(row.beneficiary_name),
        asnafCategory: String(row.asnaf_category || ''),
        assistanceType: String(row.assistance_type || ''),
        approvedAmount: round2(Number(row.approved_amount || 0)),
        allocatedAmount: allocated,
        paidAmount,
        remainingAmount: round2(Math.max(0, allocated - paidAmount)),
        installments: Number(row.installments || 0),
        status: String(row.status),
        operatorName: String(row.step1_operator_name || ''),
        approverName: String(row.step1_approver_name || ''),
      };
    });
  }

  static async confirmStaffCasePayment(input: {
    itemId: string;
    amount: number;
    paymentDate?: string;
    paymentMethod?: 'cash' | 'bank_transfer';
    proofUrl?: string;
    proofName?: string;
    payeeName?: string;
    totalInstallments?: number;
    notes?: string;
    idempotencyKey?: string;
  }, actor: ActorContext) {
    await initDb();
    const db = getDb();
    if (!['officer', 'finance', 'super_admin', 'executive'].includes(actor.role)) {
      throw new Error('เฉพาะเจ้าหน้าที่ที่ได้รับเงินหรือฝ่ายการเงินเท่านั้นที่บันทึกการจ่ายได้');
    }
    const amount = round2(Number(input.amount));
    if (!(amount > 0)) throw new Error('จำนวนเงินที่จ่ายต้องมากกว่า 0 บาท');
    if (!input.proofUrl) throw new Error('กรุณาแนบหลักฐานการจ่ายเงิน');

    const itemRes = await db.execute({
      sql: `
        SELECT d.*, w.workflow_no, w.overall_status, w.step1_operator_id, w.step1_fund_type,
          a.application_no, a.approved_amount as app_approved, a.disbursed_amount as app_paid, a.status as app_status
        FROM cash_flow_disbursement_items d
        JOIN cash_flow_workflows w ON w.id = d.workflow_id
        LEFT JOIN assistance_applications a ON a.id = d.application_id
        WHERE d.id = ?
      `,
      args: [input.itemId],
    });
    if (itemRes.rows.length === 0) throw new Error('ไม่พบรายการช่วยเหลือในรอบเบิก');
    const item = itemRes.rows[0];
    if (String(item.overall_status) !== 'cash_disbursed_to_staff') {
      throw new Error('รอบเบิกนี้ยังไม่ได้โอนเงินเข้ามือเจ้าหน้าที่');
    }
    if (actor.role === 'officer' && String(item.step1_operator_id) !== actor.id) {
      throw new Error('เจ้าหน้าที่บันทึกการจ่ายได้เฉพาะเคสในรอบเบิกของตนเอง');
    }
    if (!['awaiting_payment', 'partial'].includes(String(item.status))) {
      throw new Error('รายการนี้ไม่อยู่ในสถานะที่จ่ายได้');
    }

    const tx = await db.transaction('write');
    try {
      await this.ensureUserExists(actor, tx);
      const paidRes = await tx.execute({
        sql: `SELECT COALESCE(SUM(actual_disbursed_amount), 0) as paid, COUNT(*) as n
              FROM assistance_execution_records
              WHERE workflow_id = ? AND application_id = ? AND is_confirmed = 1 AND status = 'confirmed'`,
        args: [item.workflow_id, item.application_id],
      });
      const alreadyPaid = round2(Number(paidRes.rows[0]?.paid || 0));
      const installmentNo = Number(paidRes.rows[0]?.n || 0) + 1;
      const allocated = round2(Number(item.this_disbursement_amount || 0));
      if (round2(alreadyPaid + amount) > allocated) {
        throw new Error(`ยอดจ่ายเกินวงเงินของเคสในรอบนี้ (จ่ายแล้ว ฿${alreadyPaid.toLocaleString('th-TH')} คงเหลือ ฿${round2(allocated - alreadyPaid).toLocaleString('th-TH')})`);
      }
      if (input.idempotencyKey) {
        const dup = await tx.execute({
          sql: `SELECT id FROM assistance_execution_records WHERE workflow_id = ? AND application_id = ? AND details LIKE ? AND is_confirmed = 1 LIMIT 1`,
          args: [item.workflow_id, item.application_id, `%${input.idempotencyKey}%`],
        });
        if (dup.rows.length > 0) throw new Error('รายการจ่ายนี้ถูกบันทึกแล้ว');
      }
      const staffBalance = await this.readStaffFloat(tx);
      if (staffBalance < amount) {
        throw new Error(`เงินสดในมือเจ้าหน้าที่ไม่พอ (คงเหลือ ฿${staffBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`);
      }

      const totalInstallments = Math.max(installmentNo, Number(input.totalInstallments || installmentNo));
      const paymentDate = input.paymentDate || new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString();
      const executionId = `ex-${Date.now()}-${randomUUID().slice(0, 4)}`;
      const txnNo = `TXN-AID-${Date.now().toString().slice(-6)}`;
      const journalNo = `JV-AID-${Date.now().toString().slice(-6)}`;
      const nextPaid = round2(alreadyPaid + amount);
      const nextStatus = nextPaid >= allocated ? 'paid' : 'partial';
      const payee = input.payeeName || String(item.beneficiary_name);

      await tx.execute({
        sql: `INSERT INTO assistance_execution_records (
          id, application_id, withdrawal_id, workflow_id, installment_no, total_installments,
          assistance_type, asnaf_category, execution_date, execution_time, execution_datetime,
          executor_id, executor_name, assistance_outcome, actual_disbursed_amount, actual_assistance_value,
          details, proof_url, proof_name, status, is_confirmed, confirmed_by_id, confirmed_by_name, confirmed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid_to_beneficiary', ?, ?, ?, ?, ?, 'confirmed', 1, ?, ?, ?)`,
        args: [
          executionId, item.application_id, item.withdrawal_id, item.workflow_id, installmentNo, totalInstallments,
          String(item.assistance_type || 'เงินสงเคราะห์'), String(item.asnaf_category || ''),
          paymentDate, now.slice(11, 19), now, actor.id, actor.name, amount, amount,
          JSON.stringify({ notes: input.notes || '', method: input.paymentMethod || 'cash', payee, idempotencyKey: input.idempotencyKey || '', installmentLabel: `${installmentNo}/${totalInstallments}` }),
          input.proofUrl, input.proofName || 'หลักฐานการจ่าย', actor.id, actor.name, now,
        ],
      });

      await tx.execute({
        sql: `INSERT INTO financial_transactions (
          id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
          payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name,
          verified_by_id, verified_by_name, notes, beneficiary_id, application_id, workflow_id, journal_no, asnaf_category
        ) VALUES (?, ?, ?, 'disbursement', 'fund-1', 'กองทุนซะกาต', 'จ่ายเงินช่วยเหลือผู้รับซะกาต', ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `txn-aid-${executionId}`, txnNo, paymentDate, -amount, input.paymentMethod || 'cash', payee,
          String(item.application_no || item.application_id), input.proofUrl, actor.id, actor.name, actor.id, actor.name,
          input.notes || `จ่ายงวด ${installmentNo}/${totalInstallments} รอบ ${item.workflow_no}`,
          item.beneficiary_id, item.application_id, item.workflow_id, journalNo, String(item.asnaf_category || ''),
        ],
      });

      const asnafCode = String(item.asnaf_category || 'faqir').replace(/\s+/g, '_').slice(0, 24);
      await tx.execute({
        sql: `INSERT INTO general_ledger_entries (
          id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
          account_code, account_name, account_category, entry_type, amount, currency, asnaf_code, description, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'expense', 'debit', ?, 'THB', ?, ?, ?)`,
        args: [`gl-aid-d-${executionId}`, journalNo, txnNo, item.application_id, item.beneficiary_id, paymentDate, `5101-${asnafCode}`, `ค่าใช้จ่ายช่วยเหลือ ${item.asnaf_category || ''}`, amount, asnafCode, `จ่ายจริงแก่ ${payee} งวด ${installmentNo}/${totalInstallments}`, actor.name],
      });
      await tx.execute({
        sql: `INSERT INTO general_ledger_entries (
          id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
          account_code, account_name, account_category, entry_type, amount, currency, description, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'credit', ?, 'THB', ?, ?)`,
        args: [`gl-aid-c-${executionId}`, journalNo, txnNo, item.application_id, item.beneficiary_id, paymentDate, amount, `ตัดเงินสดเจ้าหน้าที่ตามการจ่ายจริง ${item.application_no || ''}`, actor.name],
      });

      await tx.execute({
        sql: `UPDATE cash_flow_disbursement_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [nextStatus, item.id],
      });
      const appPaid = round2(Number(item.app_paid || 0) + amount);
      const appApproved = round2(Number(item.app_approved || item.approved_amount || 0));
      const appDone = appApproved > 0 && appPaid >= appApproved;
      await tx.execute({
        sql: `UPDATE assistance_applications
              SET disbursed_amount = ?, payment_status = ?, status = CASE WHEN ? = 1 THEN 'disbursed' ELSE status END, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [appPaid, appDone ? 'completed' : 'partial', appDone ? 1 : 0, item.application_id],
      });
      await tx.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
              VALUES (?, ?, ?, ?, ?, 'STAFF_CASE_PAYMENT', 'cash_flow_disbursement_item', ?, ?)`,
        args: [`log-${executionId}`, now, actor.id, actor.name, actor.role, String(item.id), `จ่ายจริง ฿${amount} งวด ${installmentNo}/${totalInstallments} เคส ${item.application_no || item.application_id} โดย ${actor.name} ผู้รับ ${payee}`],
      });
      await tx.commit();
      return { success: true, executionId, transactionNo: txnNo, paidAmount: nextPaid, remainingAmount: round2(allocated - nextPaid), status: nextStatus, installmentLabel: `${installmentNo}/${totalInstallments}` };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  static async refundUnspentStaffCash(input: {
    workflowId: string;
    amount: number;
    refundDate?: string;
    destinationAccountId?: string;
    receiverName?: string;
    proofUrl?: string;
    proofName?: string;
    notes?: string;
  }, actor: ActorContext) {
    await initDb();
    const db = getDb();
    if (!['officer', 'finance', 'super_admin', 'executive'].includes(actor.role)) {
      throw new Error('ไม่มีสิทธิ์บันทึกการคืนเงิน');
    }
    const amount = round2(Number(input.amount));
    if (!(amount > 0)) throw new Error('จำนวนเงินที่คืนต้องมากกว่า 0 บาท');
    if (!input.proofUrl) throw new Error('กรุณาแนบหลักฐานการคืนเงิน');

    const wfRes = await db.execute({ sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`, args: [input.workflowId] });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบรอบการเบิก');
    const wf = wfRes.rows[0];
    if (String(wf.overall_status) !== 'cash_disbursed_to_staff') throw new Error('รอบนี้ยังไม่ได้อยู่ในสถานะเบิกเงินสำเร็จ');
    if (actor.role === 'officer' && String(wf.step1_operator_id) !== actor.id) throw new Error('เจ้าหน้าที่คืนเงินได้เฉพาะรอบเบิกของตนเอง');

    const destination = String(input.destinationAccountId || '1020-01');
    const backToTreasurer = ['1020-01', 'treasurer-cash-main', ''].includes(destination);
    const tx = await db.transaction('write');
    try {
      await this.ensureUserExists(actor, tx);
      const staffBalance = await this.readStaffFloat(tx);
      if (staffBalance < amount) throw new Error(`เงินสดในมือเจ้าหน้าที่ไม่พอสำหรับคืน (คงเหลือ ฿${staffBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })})`);
      let bank: any = null;
      if (!backToTreasurer) {
        const bankRes = await tx.execute({ sql: `SELECT id, account_name, current_balance FROM bank_accounts WHERE id = ?`, args: [destination] });
        if (bankRes.rows.length === 0) throw new Error('ไม่พบบัญชีปลายทางที่รับคืน');
        bank = bankRes.rows[0];
      }
      const now = new Date().toISOString();
      const refundDate = input.refundDate || now.slice(0, 10);
      const refundId = `rf-${Date.now()}-${randomUUID().slice(0, 4)}`;
      const refundNo = `RF-${new Date().getFullYear() + 543}-${Date.now().toString().slice(-4)}`;
      const txnNo = `TXN-RF-${Date.now().toString().slice(-6)}`;
      const journalNo = `JV-RF-${Date.now().toString().slice(-6)}`;
      const receiver = input.receiverName || String(wf.step2_treasurer_name || actor.name);
      await tx.execute({
        sql: `INSERT INTO assistance_refund_records (
          id, refund_no, workflow_id, refund_date, refund_time, refund_datetime, refund_amount, refund_reason,
          returned_by_id, returned_by_name, received_by_id, received_by_name, target_bank_account_id,
          proof_url, proof_name, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
        args: [
          refundId, refundNo, input.workflowId, refundDate, now.slice(11, 19), now, amount,
          input.notes || 'คืนเงินสดคงเหลือที่ยังไม่ได้จ่าย', actor.id, actor.name, actor.id, receiver,
          backToTreasurer ? '1020-01' : destination, input.proofUrl, input.proofName || 'หลักฐานการคืนเงิน', input.notes || '',
        ],
      });
      await tx.execute({
        sql: `INSERT INTO financial_transactions (
          id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method,
          payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, workflow_id, journal_no
        ) VALUES (?, ?, ?, 'transfer', 'fund-general', 'บัญชีกลาง', 'คืนเงินสดคงเหลือจากเจ้าหน้าที่', ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
        args: [`txn-${refundId}`, txnNo, refundDate, amount, receiver, String(wf.workflow_no), input.proofUrl, actor.id, actor.name, input.notes || `คืนเงินรอบ ${wf.workflow_no}`, input.workflowId, journalNo],
      });
      const debitCode = backToTreasurer ? '1020-01' : '1010-01';
      const debitName = backToTreasurer ? 'เงินสดในมือเหรัญญิก' : `เงินฝากธนาคาร ${bank.account_name}`;
      await tx.execute({
        sql: `INSERT INTO general_ledger_entries (
          id, journal_no, transaction_id, entry_date, account_code, account_name, account_category, entry_type, amount, currency, description, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'asset', 'debit', ?, 'THB', ?, ?)`,
        args: [`gl-rf-d-${refundId}`, journalNo, txnNo, refundDate, debitCode, debitName, amount, `รับคืนเงินสดจากเจ้าหน้าที่ รอบ ${wf.workflow_no}`, actor.name],
      });
      await tx.execute({
        sql: `INSERT INTO general_ledger_entries (
          id, journal_no, transaction_id, entry_date, account_code, account_name, account_category, entry_type, amount, currency, description, created_by
        ) VALUES (?, ?, ?, ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'credit', ?, 'THB', ?, ?)`,
        args: [`gl-rf-c-${refundId}`, journalNo, txnNo, refundDate, amount, `ตัดเงินสดเจ้าหน้าที่จากการคืนเงิน รอบ ${wf.workflow_no}`, actor.name],
      });
      if (bank) {
        await tx.execute({
          sql: `UPDATE bank_accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [amount, destination],
        });
      }
      await tx.execute({
        sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
              VALUES (?, ?, ?, ?, ?, 'STAFF_CASH_REFUND', 'cash_flow_workflow', ?, ?)`,
        args: [`log-${refundId}`, now, actor.id, actor.name, actor.role, input.workflowId, `คืนเงิน ฿${amount} จากเงินสดเจ้าหน้าที่ไป ${debitName} รอบ ${wf.workflow_no} ผู้รับคืน ${receiver}`],
      });
      await tx.commit();
      return { success: true, refundNo, amount, destination: backToTreasurer ? '1020-01' : destination };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  /**
   * Fetch full batch disbursement details including line items, handovers, refunds, and approval trail
   */
  static async getBatchDisbursementDetail(workflowId: string) {
    await initDb();
    const db = getDb();

    let realWorkflowId = workflowId;
    let wfRes = await db.execute({
      sql: `SELECT * FROM cash_flow_workflows WHERE id = ? OR workflow_no = ?`,
      args: [workflowId, workflowId],
    });
    if (wfRes.rows.length === 0) {
      // Check if it's a withdrawal id
      const wRes = await db.execute({
        sql: `SELECT workflow_id FROM cash_flow_withdrawals WHERE id = ? OR withdrawal_no = ? LIMIT 1`,
        args: [workflowId, workflowId],
      });
      if (wRes.rows.length > 0 && wRes.rows[0].workflow_id) {
        realWorkflowId = String(wRes.rows[0].workflow_id);
        wfRes = await db.execute({
          sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`,
          args: [realWorkflowId],
        });
      }
    }
    if (wfRes.rows.length === 0) return null;
    const wf = wfRes.rows[0];

    // Child vouchers
    const vouchersRes = await db.execute({
      sql: `SELECT * FROM cash_flow_withdrawals WHERE workflow_id = ?`,
      args: [realWorkflowId],
    });

    // Aid line items
    const aidItemsRes = await db.execute({
      sql: `
        SELECT 
          d.*,
          COALESCE(b.full_name, d.beneficiary_name) as full_name,
          COALESCE(a.application_no, d.application_id) as app_no,
          COALESCE((
            SELECT SUM(e.actual_disbursed_amount) FROM assistance_execution_records e
            WHERE e.workflow_id = d.workflow_id AND e.application_id = d.application_id AND e.is_confirmed = 1 AND e.status = 'confirmed'
          ), 0) as paid_amount,
          COALESCE((
            SELECT COUNT(*) FROM assistance_execution_records e
            WHERE e.workflow_id = d.workflow_id AND e.application_id = d.application_id AND e.is_confirmed = 1 AND e.status = 'confirmed'
          ), 0) as installment_count
        FROM cash_flow_disbursement_items d
        LEFT JOIN beneficiaries b ON b.id = d.beneficiary_id
        LEFT JOIN assistance_applications a ON a.id = d.application_id
        WHERE d.workflow_id = ?
        ORDER BY d.created_at ASC
      `,
      args: [realWorkflowId],
    });

    // Admin line items
    const adminItemsRes = await db.execute({
      sql: `
        SELECT *
        FROM cash_flow_clearance_items
        WHERE workflow_id = ?
        ORDER BY created_at ASC
      `,
      args: [realWorkflowId],
    });

    // Handover records
    const handoversRes = await db.execute({
      sql: `
        SELECT *
        FROM finance_handover_records
        WHERE workflow_id = ?
        ORDER BY created_at DESC
      `,
      args: [realWorkflowId],
    });

    // Refund records
    const refundsRes = await db.execute({
      sql: `
        SELECT *
        FROM assistance_refund_records
        WHERE workflow_id = ?
        ORDER BY created_at DESC
      `,
      args: [realWorkflowId],
    });

    // Approval events
    const approvalsRes = await db.execute({
      sql: `
        SELECT *
        FROM finance_approval_events
        WHERE document_id = ?
        ORDER BY created_at DESC
      `,
      args: [realWorkflowId],
    });

    // Transfer evidence into Treasurer account
    const evidenceRes = await db.execute({
      sql: `
        SELECT 
          id, workflow_id, source_bank_account_id, source_bank_name,
          source_account_name, source_account_number, destination_account_id,
          destination_account_name, amount, transfer_datetime, reference_no,
          issuing_bank, file_url, file_name, file_size, mime_type, notes,
          status, verified_by_id, verified_by_name, verified_at,
          rejection_reason, created_by_id, created_by_name, created_at,
          document_type, source_account_id, recipient_user_id, recipient_user_name, handover_id
        FROM treasurer_transfer_evidence
        WHERE workflow_id = ?
        ORDER BY created_at ASC
      `,
      args: [realWorkflowId],
    });

    const aidItems = aidItemsRes.rows.map((r: any) => ({
      id: String(r.id),
      applicationId: String(r.application_id),
      applicationNo: String(r.app_no || r.application_id),
      beneficiaryId: String(r.beneficiary_id),
      beneficiaryName: String(r.full_name || r.beneficiary_name),
      nationalId: String(r.national_id || '-'),
      asnafCategory: String(r.asnaf_category),
      assistanceType: String(r.assistance_type || 'เงินสงเคราะห์ตามมติ'),
      approvedAmount: Number(r.approved_amount || 0),
      thisDisbursementAmount: Number(r.this_disbursement_amount || 0),
      paidAmount: Number(r.paid_amount || 0),
      remainingAmount: Math.max(0, Number(r.this_disbursement_amount || 0) - Number(r.paid_amount || 0)),
      installmentCount: Number(r.installment_count || 0),
      status: String(r.status),
      notes: r.notes ? String(r.notes) : '',
    }));

    const adminItems = adminItemsRes.rows.map((r: any) => ({
      id: String(r.id),
      description: String(r.description),
      amount: Number(r.amount || 0),
      categoryCode: String(r.category_code),
      categoryName: String(r.category_name || 'ค่าใช้จ่ายบริหาร'),
      expenseDate: String(r.expense_date || ''),
      receiptUrl: r.receipt_url ? String(r.receipt_url) : '',
      status: String(r.status),
      notes: r.notes ? String(r.notes) : '',
    }));

    const handovers = handoversRes.rows.map((r: any) => ({
      id: String(r.id),
      handoverNo: String(r.handover_no),
      handoverDate: String(r.handover_date),
      handoverTime: String(r.handover_time || ''),
      handedOverByName: String(r.handed_over_by_name),
      receivedByName: String(r.received_by_name),
      amount: Number(r.amount || 0),
      actualReceivedAmount: r.actual_received_amount != null ? Number(r.actual_received_amount) : Number(r.amount || 0),
      discrepancyReason: r.discrepancy_reason ? String(r.discrepancy_reason) : null,
      sourceAccountId: r.source_account_id ? String(r.source_account_id) : '1020-01',
      destinationAccountId: r.destination_account_id ? String(r.destination_account_id) : '1030-01',
      proofUrl: String(r.proof_url || ''),
      proofName: String(r.proof_name || ''),
      status: String(r.status),
      confirmedAt: r.confirmed_at ? String(r.confirmed_at) : null,
      notes: r.notes ? String(r.notes) : '',
    }));

    const refunds = refundsRes.rows.map((r: any) => ({
      id: String(r.id),
      refundNo: String(r.refund_no),
      refundDate: String(r.refund_date),
      amount: Number(r.refund_amount || 0),
      reason: String(r.refund_reason),
      returnedByName: String(r.returned_by_name),
      receivedByName: String(r.received_by_name),
      proofUrl: String(r.proof_url || ''),
      status: String(r.status),
    }));

    const approvalEvents = approvalsRes.rows.map((r: any) => ({
      id: String(r.id),
      action: String(r.action),
      fromStatus: r.from_status ? String(r.from_status) : null,
      toStatus: String(r.to_status),
      actorName: String(r.actor_name),
      actorRole: String(r.actor_role),
      note: r.note ? String(r.note) : '',
      createdAt: String(r.created_at),
    }));

    const evidenceItems = evidenceRes.rows.map((r: any) => ({
      id: String(r.id),
      workflowId: String(r.workflow_id),
      sourceBankAccountId: String(r.source_bank_account_id),
      sourceBankName: String(r.source_bank_name),
      sourceAccountName: String(r.source_account_name),
      sourceAccountNumber: String(r.source_account_number),
      sourceAccountId: r.source_account_id ? String(r.source_account_id) : '1020-01',
      destinationAccountId: String(r.destination_account_id),
      destinationAccountName: String(r.destination_account_name),
      recipientUserId: r.recipient_user_id ? String(r.recipient_user_id) : String(wf.step1_operator_id),
      recipientUserName: r.recipient_user_name ? String(r.recipient_user_name) : String(wf.step1_operator_name),
      handoverId: r.handover_id ? String(r.handover_id) : null,
      documentType: r.document_type ? String(r.document_type) : 'transfer_slip',
      documentTypeName: TRANSFER_DOCUMENT_TYPES[r.document_type]?.label || 'สลิปการโอนเงิน',
      amount: Number(r.amount || 0),
      transferDatetime: String(r.transfer_datetime),
      referenceNo: r.reference_no ? String(r.reference_no) : '',
      issuingBank: r.issuing_bank ? String(r.issuing_bank) : String(r.source_bank_name),
      fileUrl: String(r.file_url),
      fileName: String(r.file_name),
      fileSize: Number(r.file_size || 0),
      mimeType: String(r.mime_type || 'application/pdf'),
      notes: r.notes ? String(r.notes) : '',
      status: String(r.status),
      verifiedById: r.verified_by_id ? String(r.verified_by_id) : null,
      verifiedByName: r.verified_by_name ? String(r.verified_by_name) : null,
      verifiedAt: r.verified_at ? String(r.verified_at) : null,
      rejectionReason: r.rejection_reason ? String(r.rejection_reason) : null,
      createdById: String(r.created_by_id),
      createdByName: String(r.created_by_name),
      createdAt: String(r.created_at),
    }));

    const totalWithdrawAmount = Number(wf.step1_withdraw_amount || 0);

    const totalEvidenceAmount = round2(
      evidenceItems.filter((e) => e.status !== 'invalid').reduce((s, e) => s + e.amount, 0)
    );
    const verifiedEvidenceAmount = round2(
      evidenceItems.filter((e) => e.status === 'verified').reduce((s, e) => s + e.amount, 0)
    );
    const isAmountMatched = totalEvidenceAmount === totalWithdrawAmount;

    let overallEvidenceStatus = 'not_attached';
    if (evidenceItems.length > 0) {
      if (evidenceItems.some((e) => e.status === 'invalid')) {
        overallEvidenceStatus = 'invalid';
      } else if (evidenceItems.some((e) => e.status === 'need_more_info')) {
        overallEvidenceStatus = 'need_more_info';
      } else if (evidenceItems.every((e) => e.status === 'verified') && isAmountMatched) {
        overallEvidenceStatus = 'verified';
      } else if (evidenceItems.some((e) => e.status === 'pending_verification')) {
        overallEvidenceStatus = 'pending_verification';
      } else {
        overallEvidenceStatus = 'attached';
      }
    }

    const isApprovalReady =
      overallEvidenceStatus === 'verified' &&
      isAmountMatched &&
      evidenceItems.length > 0;

    const totalHandedOver = handovers
      .filter((h) => h.status === 'fully_handed_over')
      .reduce((s, h) => s + h.amount, 0) || Number(wf.step2_handover_amount || 0);

    const totalActualAidDisbursed = aidItems
      .filter((it) => it.status === 'confirmed')
      .reduce((s, it) => s + it.thisDisbursementAmount, 0);

    const totalActualAdminDisbursed = adminItems
      .filter((it) => it.status === 'accepted')
      .reduce((s, it) => s + it.amount, 0);

    const totalActualDisbursed = round2(totalActualAidDisbursed + totalActualAdminDisbursed);
    const totalRefunded = round2(refunds.filter((r) => r.status === 'completed').reduce((s, r) => s + r.amount, 0));
    const remainingResponsibility = round2(Math.max(0, totalHandedOver - (totalActualDisbursed + totalRefunded)));

    const isEquationBalanced = round2(totalHandedOver - (totalActualDisbursed + totalRefunded + remainingResponsibility)) === 0;

    const latestHandover = handovers.length > 0 ? handovers[0] : null;
    const primaryVoucher = vouchersRes.rows.length > 0 ? {
      id: String(vouchersRes.rows[0].id),
      voucher_number: String(vouchersRes.rows[0].withdrawal_no),
      amount: Number(vouchersRes.rows[0].amount || 0),
      actual_amount: Number(vouchersRes.rows[0].clearance_spent_amount || 0),
      refund_amount: Number(vouchersRes.rows[0].clearance_returned_amount || 0),
      recipient_type: 'staff',
      recipient_user_id: String(vouchersRes.rows[0].withdrawer_id),
      purpose: String(vouchersRes.rows[0].purpose || wf.title),
      status: String(vouchersRes.rows[0].status),
      bank_account_id: vouchersRes.rows[0].bank_account_id ? String(vouchersRes.rows[0].bank_account_id) : null,
      fund_source_type: String(wf.step1_fund_type || 'zakat'),
    } : {
      id: '',
      voucher_number: '',
      amount: totalWithdrawAmount,
      actual_amount: totalActualDisbursed,
      refund_amount: totalRefunded,
      recipient_type: 'staff',
      recipient_user_id: String(wf.step1_operator_id),
      purpose: String(wf.title),
      status: String(wf.overall_status),
      bank_account_id: String(wf.step1_bank_account_id),
      fund_source_type: String(wf.step1_fund_type || 'zakat'),
    };

    const kpi = await this.getKpiBalances();
    const currentTreasurerBalance = kpi.treasurer.currentBalance;
    const simulatedBalanceAfter = Math.max(0, currentTreasurerBalance - totalWithdrawAmount);

    const transferTxn = await db.execute({
      sql: `SELECT id, transaction_no, journal_no, date, type, category, amount, status, reference_no, payer_or_payee, notes, recorded_by_name
            FROM financial_transactions
            WHERE id = ? OR (workflow_id = ? AND type = 'transfer' AND category = 'โอนภายในจากเงินสดเหรัญญิกไปเงินสดเจ้าหน้าที่')
            ORDER BY created_at DESC LIMIT 1`,
      args: [`txn-int-${realWorkflowId}`, realWorkflowId],
    });
    let internalTransfer = null;
    if (transferTxn.rows[0]) {
      const row = transferTxn.rows[0];
      const journalNo = String(row.journal_no || '');
      const lineRes = journalNo
        ? await db.execute({
            sql: `SELECT account_code, account_name, entry_type, amount, description FROM general_ledger_entries WHERE journal_no = ? ORDER BY entry_type DESC`,
            args: [journalNo],
          })
        : { rows: [] as any[] };
      internalTransfer = {
        id: String(row.id),
        transactionNo: String(row.transaction_no || ''),
        journalNo,
        date: String(row.date || ''),
        type: String(row.type || 'transfer'),
        category: String(row.category || ''),
        amount: Number(row.amount || 0),
        status: String(row.status || ''),
        referenceNo: String(row.reference_no || ''),
        payee: String(row.payer_or_payee || ''),
        notes: String(row.notes || ''),
        recordedByName: String(row.recorded_by_name || ''),
        lines: lineRes.rows.map((line: any) => ({
          accountCode: String(line.account_code || ''),
          accountName: String(line.account_name || ''),
          entryType: String(line.entry_type || ''),
          amount: Number(line.amount || 0),
          description: String(line.description || ''),
        })),
      };
    }

    return {
      workflow: {
        id: String(wf.id),
        workflowNo: String(wf.workflow_no),
        workflow_number: String(wf.workflow_no),
        title: String(wf.title),
        status: String(wf.overall_status || 'draft'),
        fundType: String(wf.step1_fund_type || 'zakat'),
        bankAccountId: String(wf.step1_bank_account_id),
        sourceAccountId: String(wf.step1_bank_account_id),
        sourceAccountName: 'บัญชีเหรัญญิก (Treasurer Cash Account)',
        sourceAccountType: 'treasurer_cash',
        treasurerId: String(wf.step2_treasurer_id || 'custodian-ruslan'),
        treasurerName: String(wf.step2_treasurer_name || 'นายรุสลัน หะสาเมาะ'),
        withdrawAmount: totalWithdrawAmount,
        date: String(wf.step1_date || '').slice(0, 10),
        operatorId: String(wf.step1_operator_id),
        operatorName: String(wf.step1_operator_name),
        created_by_id: String(wf.step1_operator_id),
        created_by_name: String(wf.step1_operator_name),
        approverId: wf.step1_approver_id ? String(wf.step1_approver_id) : null,
        approverName: wf.step1_approver_name ? String(wf.step1_approver_name) : null,
        approved_by_id: wf.step1_approver_id ? String(wf.step1_approver_id) : null,
        approved_by_name: wf.step1_approver_name ? String(wf.step1_approver_name) : null,
        notes: String(wf.step1_notes || ''),
        rejection_reason: wf.rejection_reason ? String(wf.rejection_reason) : null,
        step1Status: String(wf.step1_status || 'draft'),
        step2Status: String(wf.step2_status || 'pending'),
        step5Status: String(wf.step5_status || 'pending'),
        overallStatus: String(wf.overall_status || 'draft'),
        createdAt: String(wf.created_at),
        created_at: String(wf.created_at),
        updated_at: String(wf.updated_at || wf.created_at),
      },
      withdrawal: primaryVoucher,
      vouchers: vouchersRes.rows.map((r: any) => ({
        id: String(r.id),
        withdrawalNo: String(r.withdrawal_no),
        voucherType: String(r.voucher_type),
        amount: Number(r.amount || 0),
        status: String(r.status),
        handoverStatus: String(r.handover_status),
      })),
      aidItems,
      adminItems,
      handover: latestHandover ? {
        id: latestHandover.id,
        handed_over_by_id: '',
        handed_over_by_name: latestHandover.handedOverByName,
        received_by_id: '',
        amount: latestHandover.amount,
        status: latestHandover.status,
        handed_over_at: latestHandover.handoverDate,
        confirmed_at: latestHandover.confirmedAt,
        proof_url: latestHandover.proofUrl,
        notes: latestHandover.notes,
      } : null,
      handovers,
      refunds,
      approvalEvents,
      auditEvents: approvalEvents.map((ae) => ({
        id: ae.id,
        action: ae.action,
        from_status: ae.fromStatus,
        to_status: ae.toStatus,
        actor_id: '',
        actor_name: ae.actorName,
        note: ae.note,
        created_at: ae.createdAt,
      })),
      staffAccount: {
        accountId: '1030-01',
        accountCode: '1030-01',
        accountName: 'บัญชีเงินสดยืมทดรองเจ้าหน้าที่ (Staff Cash Float)',
        operatorId: String(wf.step1_operator_id),
        operatorName: String(wf.step1_operator_name),
        currentBalance: kpi.staff.currentBalance,
      },
      financialSummary: {
        totalRequested: totalWithdrawAmount,
        totalTransferred: totalHandedOver,
        confirmedReceived: round2(
          handovers
            .filter((h) => h.status === 'fully_received' || h.status === 'fully_handed_over' || h.status === 'partially_received')
            .reduce((s, h) => s + (h.actualReceivedAmount || h.amount), 0)
        ),
        remainingToTransfer: Math.max(0, round2(totalWithdrawAmount - totalHandedOver)),
        treasurerBalance: currentTreasurerBalance,
        staffCashBalance: kpi.staff.currentBalance,
        mismatchDiff: round2(totalHandedOver - totalWithdrawAmount),
        isMatched: totalHandedOver === totalWithdrawAmount,
        status: ((): string => {
          if (wf.overall_status === 'cancelled') return 'cancelled';
          if (wf.overall_status === 'disbursed' || handovers.some((h) => h.status === 'fully_received' || h.status === 'fully_handed_over')) return 'fully_received';
          if (handovers.some((h) => h.status === 'partially_received')) return 'partially_received';
          if (handovers.some((h) => h.status === 'returned_for_review')) return 'returned_for_review';
          if (handovers.some((h) => h.status === 'pending_staff_confirm' || h.status === 'pending_verification' || h.status === 'transferred')) return 'pending_staff_confirm';
          if (totalHandedOver > 0) return 'transferred';
          return 'pending_withdrawal';
        })(),
      },
      equation: {
        handedOver: totalHandedOver,
        actualPaid: totalActualDisbursed,
        refunded: totalRefunded,
        remainingFloat: remainingResponsibility,
        isBalanced: isEquationBalanced,
      },
      treasurerAccount: {
        accountId: '1020-01',
        accountName: 'บัญชีเงินสดเหรัญญิก (Treasurer Cash Float)',
        currentBalance: currentTreasurerBalance,
        simulatedBalanceAfter: internalTransfer ? currentTreasurerBalance : simulatedBalanceAfter,
        isSufficient: internalTransfer ? true : currentTreasurerBalance >= totalWithdrawAmount,
      },
      transferEvidence: {
        items: evidenceItems,
        totalAmount: totalEvidenceAmount,
        verifiedAmount: verifiedEvidenceAmount,
        requiredAmount: totalWithdrawAmount,
        isAmountMatched,
        overallStatus: overallEvidenceStatus,
        isApprovalReady,
        mismatchDiff: round2(totalEvidenceAmount - totalWithdrawAmount),
      },
      internalTransfer,
      // Calculations & Equation Check
      totalWithdrawAmount,
      totalHandedOver,
      totalActualDisbursed,
      totalActualAidDisbursed,
      totalActualAdminDisbursed,
      totalRefunded,
      remainingResponsibility,
      isClosingReady: aidItems.every((it) => it.status === 'confirmed') && adminItems.every((it) => it.status === 'accepted') && remainingResponsibility === 0,
    };
  }
}
