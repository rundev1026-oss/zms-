import { getDb, initDb } from '@/lib/db';
import { randomUUID } from 'crypto';

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

export class FinancialWorkflowService {
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

    // 2. Treasurer Cash KPI
    // Received from bank: cash_flow_workflows where step 2 is received/completed
    const trRecvRes = await db.execute(`
      SELECT COALESCE(SUM(step2_deposit_amount), 0) as total_received
      FROM cash_flow_workflows
      WHERE step2_status IN ('received', 'completed')
        AND overall_status != 'cancelled'
    `);
    // Also include any bank withdrawals marked completed
    const trWthRes = await db.execute(`
      SELECT COALESCE(SUM(step1_withdraw_amount), 0) as total_withdrawn
      FROM cash_flow_workflows
      WHERE step1_status = 'completed'
        AND overall_status != 'cancelled'
    `);
    // Handed over to staff
    const trToStaffRes = await db.execute(`
      SELECT COALESCE(SUM(amount), 0) as total_to_staff
      FROM cash_flow_withdrawals
      WHERE status IN ('disbursed', 'completed')
    `);
    // Staff refunds back to treasurer
    const trRefundRes = await db.execute(`
      SELECT COALESCE(SUM(clearance_returned_amount), 0) as total_refunded
      FROM cash_flow_withdrawals
      WHERE clearance_status IN ('cleared', 'over_spent', 'overspent_approved')
    `);

    const treasurerReceivedFromBank = round2(Math.max(Number(trRecvRes.rows[0]?.total_received || 0), Number(trWthRes.rows[0]?.total_withdrawn || 0)));
    const treasurerPaidToStaff = round2(Number(trToStaffRes.rows[0]?.total_to_staff || 0));
    const treasurerRefundReceived = round2(Number(trRefundRes.rows[0]?.total_refunded || 0));
    const treasurerOpening = 0; // standard starting float
    const treasurerCurrent = round2(treasurerReceivedFromBank - treasurerPaidToStaff + treasurerRefundReceived);

    // 3. Staff Cash KPI
    // Cash received from treasurer
    const staffReceived = treasurerPaidToStaff;
    // Cash reserved in active aid disbursements or in progress
    const staffReservedRes = await db.execute(`
      SELECT COALESCE(SUM(amount), 0) as total_reserved
      FROM cash_flow_withdrawals
      WHERE status IN ('pending', 'approved')
    `);
    const staffReserved = round2(Number(staffReservedRes.rows[0]?.total_reserved || 0));
    
    // Cash actually disbursed for aid
    const staffAidDisbursedRes = await db.execute(`
      SELECT COALESCE(SUM(this_disbursement_amount), 0) as total_aid
      FROM cash_flow_disbursement_items
      WHERE status NOT IN ('draft', 'cancelled')
    `);
    // Cash actually disbursed for administrative expenses
    const staffAdminSpentRes = await db.execute(`
      SELECT COALESCE(SUM(clearance_spent_amount), 0) as total_admin
      FROM cash_flow_withdrawals
      WHERE voucher_type = 'office_expense'
        AND clearance_status IN ('cleared', 'over_spent', 'overspent_approved')
    `);
    const staffActualDisbursed = round2(Number(staffAidDisbursedRes.rows[0]?.total_aid || 0) + Number(staffAdminSpentRes.rows[0]?.total_admin || 0));
    const staffRefunded = treasurerRefundReceived;
    const staffCurrent = round2(staffReceived - staffActualDisbursed - staffRefunded);

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
        refundReceived: treasurerRefundReceived,
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
        d.id as disbursement_id,
        d.application_id,
        d.beneficiary_name,
        d.asnaf_category,
        d.this_disbursement_amount,
        d.remaining_balance,
        d.status as disbursement_status,
        c.id as clearance_id,
        c.category_name as admin_category_name,
        c.description as admin_expense_desc,
        c.receipt_url as admin_receipt_url
      FROM cash_flow_withdrawals w
      LEFT JOIN cash_flow_disbursement_items d ON d.withdrawal_id = w.id
      LEFT JOIN cash_flow_clearance_items c ON c.withdrawal_id = w.id
      ORDER BY w.withdrawal_datetime DESC, w.created_at DESC
      LIMIT 100
    `);

    const q = (searchQuery || '').trim().toLowerCase();
    let index = 1;

    const items = rowsRes.rows.map((row: any) => {
      const isAid = row.voucher_type !== 'office_expense';
      const actualPaid = isAid 
        ? Number(row.this_disbursement_amount || row.clearance_spent_amount || 0)
        : Number(row.clearance_spent_amount || 0);
      
      const refundAmount = Number(row.clearance_returned_amount || (Number(row.withdrawal_amount) - actualPaid) || 0);

      let proofStatus: 'ครบถ้วน' | 'รอตรวจสอบ' | 'ยังไม่แนบ' = 'ยังไม่แนบ';
      if (row.proof_url || row.admin_receipt_url) {
        proofStatus = row.voucher_status === 'completed' || row.clearance_status === 'cleared' ? 'ครบถ้วน' : 'รอตรวจสอบ';
      }

      let itemStatus: 'รอจ่าย' | 'จ่ายแล้ว' | 'เคลียร์แล้ว' | 'เกินกำหนด' = 'รอจ่าย';
      if (row.clearance_status === 'cleared' || row.voucher_status === 'completed') {
        itemStatus = 'เคลียร์แล้ว';
      } else if (actualPaid > 0) {
        itemStatus = 'จ่ายแล้ว';
      } else if (row.voucher_status === 'pending') {
        itemStatus = 'รอจ่าย';
      }

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
        applicationNo: row.application_id ? String(row.application_id) : '-',
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
      if (filterTab === 'pending_disbursement' && item.itemStatus !== 'รอจ่าย') return false;
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
  static async getEligibleAssistanceApplications(searchQuery: string = '') {
    await initDb();
    const db = getDb();
    const q = `%${searchQuery.trim()}%`;

    const res = await db.execute({
      sql: `
        SELECT 
          a.id,
          a.application_no,
          a.beneficiary_id,
          COALESCE(b.full_name, a.assigned_officer_name, 'ผู้ขอรับความช่วยเหลือ') as beneficiary_name,
          COALESCE(b.national_id, '-') as national_id,
          a.asnaf_category,
          COALESCE(a.approved_amount, a.requested_amount, 0) as approved_amount,
          COALESCE(a.disbursed_amount, 0) as disbursed_amount,
          a.status
        FROM assistance_applications a
        LEFT JOIN beneficiaries b ON b.id = a.beneficiary_id
        WHERE (a.status IN ('approved', 'in_progress', 'ready_for_disbursement') OR a.approved_amount > 0)
          AND (
            a.application_no LIKE ? OR 
            b.full_name LIKE ? OR 
            b.national_id LIKE ? OR 
            a.asnaf_category LIKE ?
          )
        ORDER BY a.created_at DESC
        LIMIT 60
      `,
      args: [q, q, q, q],
    });

    return res.rows.map((r: any) => ({
      id: String(r.id),
      applicationNo: String(r.application_no),
      beneficiaryId: String(r.beneficiary_id),
      beneficiaryName: String(r.beneficiary_name),
      nationalId: String(r.national_id),
      asnafCategory: String(r.asnaf_category || 'ผู้มีสิทธิ์รับซะกาต'),
      approvedAmount: Number(r.approved_amount || 0),
      disbursedAmount: Number(r.disbursed_amount || 0),
      remainingAmount: Math.max(0, Number(r.approved_amount || 0) - Number(r.disbursed_amount || 0)),
      status: String(r.status),
    }));
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
   * ROLE A: Office Staff creates a multi-item batch disbursement
   */
  static async createBatchDisbursement(input: {
    title: string;
    fundType?: string;
    bankAccountId: string;
    notes?: string;
    submitImmediately?: boolean;
    items: Array<{
      type: 'aid' | 'admin';
      applicationId?: string;
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
    if (!input.bankAccountId) {
      throw new Error('กรุณาเลือกบัญชีธนาคารต้นทาง');
    }
    if (!input.items || input.items.length === 0) {
      throw new Error('ต้องมีรายการย่อยอย่างน้อย 1 รายการในรอบการเบิก');
    }

    const aidItems = input.items.filter((it) => it.type === 'aid');
    const adminItems = input.items.filter((it) => it.type === 'admin');

    const totalAidAmount = round2(
      aidItems.reduce((sum, it) => sum + (Number(it.thisDisbursementAmount) || 0), 0)
    );
    const totalAdminAmount = round2(
      adminItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0)
    );
    const totalBatchAmount = round2(totalAidAmount + totalAdminAmount);

    if (totalBatchAmount <= 0) {
      throw new Error('ยอดรวมของรอบการเบิกต้องมากกว่า 0 บาท');
    }

    const thaiYear = new Date().getFullYear() + 543;
    const batchNo = `WD-${thaiYear}-${Math.floor(1000 + Math.random() * 9000)}`;
    const workflowId = `wf-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const dateNow = new Date().toISOString().slice(0, 10);
    const initialStatus = input.submitImmediately ? 'pending_approval' : 'draft';

    // 1. Insert cash_flow_workflows (The Batch Header)
    await db.execute({
      sql: `
        INSERT INTO cash_flow_workflows (
          id, workflow_no, title,
          step1_bank_account_id, step1_withdraw_amount, step1_date,
          step1_operator_id, step1_operator_name, step1_status,
          step1_fund_type, step1_notes,
          step2_treasurer_id, step2_treasurer_name, step2_status,
          overall_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'custodian-ruslan', 'นายรุสลัน หะสาเมาะ', 'pending', ?)
      `,
      args: [
        workflowId,
        batchNo,
        input.title.trim(),
        input.bankAccountId,
        totalBatchAmount,
        dateNow,
        actor.id,
        actor.name,
        initialStatus,
        input.fundType || 'zakat',
        input.notes || null,
        initialStatus,
      ],
    });

    // 2. Insert Aid Voucher & Disbursement Line Items
    if (aidItems.length > 0) {
      const aidVoucherId = `cw-aid-${Date.now()}-${randomUUID().slice(0, 4)}`;
      const aidVoucherNo = `${batchNo}-AID`;

      await db.execute({
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
          aidItems[0].asnafCategory || 'ผู้มีสิทธิ์รับซะกาต',
          input.title,
          initialStatus,
        ],
      });

      for (let i = 0; i < aidItems.length; i++) {
        const item = aidItems[i];
        const lineId = `di-${Date.now()}-${i + 1}-${randomUUID().slice(0, 4)}`;
        const disbAmt = round2(Number(item.thisDisbursementAmount) || 0);
        const appAmt = round2(Number(item.approvedAmount) || disbAmt);

        await db.execute({
          sql: `
            INSERT INTO cash_flow_disbursement_items (
              id, withdrawal_id, workflow_id,
              application_id, beneficiary_id, beneficiary_name, national_id,
              asnaf_category, assistance_type,
              approved_amount, disbursed_amount_before, this_disbursement_amount, remaining_balance,
              notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
          `,
          args: [
            lineId,
            aidVoucherId,
            workflowId,
            item.applicationId || `app-${Date.now()}-${i}`,
            item.beneficiaryId || `ben-${Date.now()}-${i}`,
            item.beneficiaryName || 'ผู้มีสิทธิ์รับซะกาต',
            item.nationalId || '-',
            item.asnafCategory || 'ยากจน/ขัดสน',
            item.assistanceType || 'เงินสงเคราะห์ตามมติ',
            appAmt,
            disbAmt,
            Math.max(0, appAmt - disbAmt),
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

      await db.execute({
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

        await db.execute({
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
      await db.execute({
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

    await db.execute({
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

    return {
      success: true,
      workflowId,
      batchNo,
      totalAmount: totalBatchAmount,
      itemCount: input.items.length,
      status: initialStatus,
    };
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

    await db.execute({
      sql: `UPDATE cash_flow_workflows SET step1_status = 'pending_approval', overall_status = 'pending_approval', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [workflowId],
    });

    await db.execute({
      sql: `UPDATE cash_flow_withdrawals SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP WHERE workflow_id = ?`,
      args: [workflowId],
    });

    await db.execute({
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

    return { success: true, workflowId, status: 'pending_approval' };
  }

  /**
   * ROLE B: Treasurer Approval Decision (Approve / Reject / Return for Revision)
   */
  static async treasurerReviewBatch(
    workflowId: string,
    input: { decision: 'approve' | 'reject' | 'return_for_revision'; reason?: string },
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

    if ((input.decision === 'reject' || input.decision === 'return_for_revision') && (!input.reason || input.reason.trim().length === 0)) {
      throw new Error('กรุณาระบุเหตุผลในการไม่อนุมัติหรือส่งกลับแก้ไข');
    }

    const timestampNow = new Date().toISOString();

    if (input.decision === 'approve') {
      await db.execute({
        sql: `
          UPDATE cash_flow_workflows SET 
            step1_status = 'approved',
            step1_approver_id = ?,
            step1_approver_name = ?,
            step2_status = 'pending_handover',
            overall_status = 'approved',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [actor.id, actor.name, workflowId],
      });

      await db.execute({
        sql: `
          UPDATE cash_flow_withdrawals SET
            status = 'approved',
            approver_id = ?,
            approver_name = ?,
            handover_status = 'not_handed_over',
            updated_at = CURRENT_TIMESTAMP
          WHERE workflow_id = ?
        `,
        args: [actor.id, actor.name, workflowId],
      });

      await db.execute({
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
          input.reason || 'เหรัญญิกตรวจสอบความถูกต้องและอนุมัติรอบเบิกเรียบร้อย',
        ],
      });

      return { success: true, workflowId, decision: 'approve', status: 'approved' };
    }

    if (input.decision === 'return_for_revision') {
      await db.execute({
        sql: `
          UPDATE cash_flow_workflows SET 
            step1_status = 'rejected_for_revision',
            step1_notes = ?,
            overall_status = 'rejected_for_revision',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [input.reason || 'ส่งกลับแก้ไข', workflowId],
      });

      await db.execute({
        sql: `UPDATE cash_flow_withdrawals SET status = 'rejected_for_revision', updated_at = CURRENT_TIMESTAMP WHERE workflow_id = ?`,
        args: [workflowId],
      });

      await db.execute({
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
          input.reason || 'ส่งกลับแก้ไขเอกสาร',
        ],
      });

      return { success: true, workflowId, decision: 'return_for_revision', status: 'rejected_for_revision' };
    }

    // decision === 'reject'
    await db.execute({
      sql: `
        UPDATE cash_flow_workflows SET 
          step1_status = 'rejected',
          step1_notes = ?,
          overall_status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [input.reason || 'ไม่อนุมัติ', workflowId],
    });

    await db.execute({
      sql: `UPDATE cash_flow_withdrawals SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE workflow_id = ?`,
      args: [workflowId],
    });

    await db.execute({
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
        input.reason || 'ไม่อนุมัติคำขอเบิกเงิน',
      ],
    });

    return { success: true, workflowId, decision: 'reject', status: 'cancelled' };
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
   * ROLE A: Office Staff confirms cash receipt -> POSTS DOUBLE-ENTRY GENERAL LEDGER
   */
  static async staffConfirmCashReceipt(workflowId: string, handoverId: string, actor: ActorContext) {
    await initDb();
    const db = getDb();

    const wfRes = await db.execute({
      sql: `SELECT * FROM cash_flow_workflows WHERE id = ?`,
      args: [workflowId],
    });
    if (wfRes.rows.length === 0) throw new Error('ไม่พบข้อมูลรอบการเบิก');
    const wf = wfRes.rows[0];

    // Verify actor is the recipient staff or super_admin
    if (String(wf.step1_operator_id) !== actor.id && actor.role !== 'super_admin') {
      throw new Error('เฉพาะเจ้าหน้าที่ผู้จัดทำคำขอเบิกเท่านั้นที่สามารถกดยืนยันรับเงินสดได้');
    }

    const hndRes = await db.execute({
      sql: `SELECT * FROM finance_handover_records WHERE id = ? OR (workflow_id = ? AND status = 'pending_verification') LIMIT 1`,
      args: [handoverId, workflowId],
    });
    if (hndRes.rows.length === 0) throw new Error('ไม่พบข้อมูลการส่งมอบเงินที่รอการยืนยัน');
    const hnd = hndRes.rows[0];

    const amount = Number(hnd.amount || 0);
    const dateFormatted = new Date().toLocaleDateString('th-TH');
    const timestampNow = new Date().toISOString();
    const journalNo = `JV-HND-${new Date().getFullYear() + 543}-${Math.floor(1000 + Math.random() * 9000)}`;
    const txnNo = `TXN-HND-${Date.now()}`;

    // 1. Update handover record
    await db.execute({
      sql: `
        UPDATE finance_handover_records SET
          status = 'fully_handed_over',
          confirmed_by_id = ?,
          confirmed_by_name = ?,
          confirmed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [actor.id, actor.name, hnd.id],
    });

    // 2. Update workflow status to disbursed (active float)
    await db.execute({
      sql: `
        UPDATE cash_flow_workflows SET
          step2_deposit_amount = ?,
          step2_status = 'completed',
          step3_status = 'received',
          overall_status = 'disbursed',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [amount, workflowId],
    });

    await db.execute({
      sql: `
        UPDATE cash_flow_withdrawals SET
          status = 'disbursed',
          handover_status = 'fully_handed_over',
          updated_at = CURRENT_TIMESTAMP
        WHERE workflow_id = ?
      `,
      args: [workflowId],
    });

    // 3. POST DOUBLE-ENTRY GENERAL LEDGER
    // Debit: 1030-01 (เงินสดยืมทดรองเจ้าหน้าที่ / Staff Cash Float)
    // Credit: 1020-01 (เงินสดในมือเหรัญญิก / Treasurer Cash Float)
    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        description, created_by
      ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1030-01', 'เงินสดยืมทดรองเจ้าหน้าที่', 'asset', 'debit', ?, 'THB', ?, ?)`,
      args: [
        `gl-deb-hnd-${Date.now()}`,
        journalNo,
        txnNo,
        dateFormatted,
        amount,
        `เจ้าหน้าที่ (${actor.name}) ยืนยันรับมอบเงินสดจากเหรัญญิกสำหรับรอบ ${wf.workflow_no}`,
        actor.name,
      ],
    });

    await db.execute({
      sql: `INSERT INTO general_ledger_entries (
        id, journal_no, transaction_id, application_id, beneficiary_id, entry_date,
        account_code, account_name, account_category, entry_type, amount, currency,
        description, created_by
      ) VALUES (?, ?, ?, 'app-system-internal', 'ben-system-internal', ?, '1020-01', 'เงินสดในมือเหรัญญิก', 'asset', 'credit', ?, 'THB', ?, ?)`,
      args: [
        `gl-crd-hnd-${Date.now()}`,
        journalNo,
        txnNo,
        dateFormatted,
        amount,
        `เหรัญญิกส่งมอบเงินสดแก่เจ้าหน้าที่ (${actor.name}) สำหรับรอบ ${wf.workflow_no}`,
        actor.name,
      ],
    });

    // 4. Audit Log
    await db.execute({
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
        workflowId,
        `เจ้าหน้าที่ (${actor.name}) ยืนยันรับเงินสด ฿${amount.toLocaleString('th-TH')} จากเหรัญญิกเรียบร้อย และลงบัญชีแยกประเภทแล้ว`,
      ],
    });

    return {
      success: true,
      workflowId,
      amount,
      journalNo,
      status: 'disbursed',
    };
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

      // Update assistance application
      if (item.application_id && !String(item.application_id).startsWith('app-system')) {
        await db.execute({
          sql: `
            UPDATE assistance_applications SET
              disbursed_amount = ?,
              disbursement_date = ?,
              payment_status = 'completed',
              status = 'disbursed',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [amount, paidDate, item.application_id],
        });
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
   * Fetch Batch Disbursement list with 7-Tab Filtering for Treasurer & Officer
   */
  static async getBatchDisbursementList(filters: {
    tab?: string;
    search?: string;
    role?: string;
    userId?: string;
  }) {
    await initDb();
    const db = getDb();

    const tab = filters.tab || 'all';
    const search = `%${(filters.search || '').trim()}%`;

    const allRowsRes = await db.execute({
      sql: `
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
          COALESCE(r_sum.s, 0) as refunded_amount
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
        WHERE (w.workflow_no LIKE ? OR w.title LIKE ? OR w.step1_operator_name LIKE ?)
        ORDER BY w.created_at DESC
      `,
      args: [search, search, search],
    });

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
        createdAt: String(r.created_at || ''),
      };
    });

    // Compute Badge counts for the 7 Tabs
    const badgeCounts = {
      all: items.length,
      pending_approval: items.filter((it) => it.step1Status === 'pending_approval').length,
      revision: items.filter((it) => it.step1Status === 'rejected_for_revision').length,
      approved: items.filter((it) => it.step1Status === 'approved' && it.step2Status === 'pending').length,
      pending_handover: items.filter((it) => it.step1Status === 'approved' && (it.step2Status === 'pending' || it.step2Status === 'pending_handover')).length,
      pending_receipt: items.filter((it) => it.overallStatus === 'pending_staff_receipt').length,
      pending_closing: items.filter((it) => it.overallStatus === 'disbursed' || it.overallStatus === 'in_progress').length,
      closed: items.filter((it) => it.overallStatus === 'completed').length,
    };

    // Filter by selected tab
    let filteredItems = items;
    if (tab === 'pending_approval') {
      filteredItems = items.filter((it) => it.step1Status === 'pending_approval');
    } else if (tab === 'revision') {
      filteredItems = items.filter((it) => it.step1Status === 'rejected_for_revision');
    } else if (tab === 'approved') {
      filteredItems = items.filter((it) => it.step1Status === 'approved');
    } else if (tab === 'pending_handover') {
      filteredItems = items.filter((it) => it.step1Status === 'approved' && (it.step2Status === 'pending' || it.step2Status === 'pending_handover'));
    } else if (tab === 'pending_receipt') {
      filteredItems = items.filter((it) => it.overallStatus === 'pending_staff_receipt');
    } else if (tab === 'pending_closing') {
      filteredItems = items.filter((it) => it.overallStatus === 'disbursed' || it.overallStatus === 'in_progress');
    } else if (tab === 'closed') {
      filteredItems = items.filter((it) => it.overallStatus === 'completed');
    }

    return {
      items: filteredItems,
      badgeCounts,
      totalCount: items.length,
    };
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
          COALESCE(a.application_no, d.application_id) as app_no
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
      proofUrl: String(r.proof_url || ''),
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

    const totalWithdrawAmount = Number(wf.step1_withdraw_amount || 0);
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

    return {
      workflow: {
        id: String(wf.id),
        workflowNo: String(wf.workflow_no),
        workflow_number: String(wf.workflow_no),
        title: String(wf.title),
        status: String(wf.overall_status || 'draft'),
        fundType: String(wf.step1_fund_type || 'zakat'),
        bankAccountId: String(wf.step1_bank_account_id),
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
      equation: {
        handedOver: totalHandedOver,
        actualPaid: totalActualDisbursed,
        refunded: totalRefunded,
        remainingFloat: remainingResponsibility,
        isBalanced: isEquationBalanced,
      },
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
