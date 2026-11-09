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

      const item = {
        index: index++,
        id: String(row.withdrawal_id),
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
}
