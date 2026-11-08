import { randomUUID } from 'crypto';
import { getDb, initDb } from '@/lib/db';
import { FinancialService, fromSatang, round2, toSatang } from '@/services/financialService';

type Actor = { id: string; name: string; role: string };
type Kind = 'deposit' | 'withdraw' | 'transfer';
type MoneyType = 'zakat' | 'sadaqah' | 'operational_admin' | 'restricted';
type DocStatus = 'draft' | 'pending_review' | 'pending_approval' | 'approved' | 'posted' | 'rejected' | 'cancelled';

export type MovementLineInput = {
  description: string;
  moneyType: MoneyType;
  bankAccountId?: string;
  counterpartyBankAccountId?: string;
  purpose?: string;
  amount: number;
  responsibleName?: string;
  proofUrl?: string;
};

const MONEY: MoneyType[] = ['zakat', 'sadaqah', 'operational_admin', 'restricted'];
const OPEN = ['draft', 'rejected'];

function fail(message: string): never {
  throw new Error(message);
}

function satangOf(amount: number) {
  const satang = toSatang(Number(amount));
  if (!Number.isFinite(satang) || satang <= 0) fail('จำนวนเงินแต่ละรายการต้องมากกว่า 0 บาท');
  return satang;
}

function accepts(stored: string, moneyType: MoneyType) {
  const types = String(stored || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (types.length === 0) return true;
  if (types.includes(moneyType)) return true;
  return moneyType === 'operational_admin' && types.includes('operational');
}

async function actorOf(actor: Actor) {
  const db = getDb();
  const row = await db.execute({ sql: 'SELECT id, name, role FROM users WHERE id = ?', args: [actor.id] });
  if (row.rows.length === 0) fail('ไม่พบผู้ใช้ที่ทำรายการ');
  if (String(row.rows[0].role) !== actor.role) fail('บทบาทผู้ใช้ไม่ตรงกับข้อมูลในระบบ');
  return { id: String(row.rows[0].id), name: String(row.rows[0].name), role: String(row.rows[0].role) };
}

function assertRole(actor: Actor, roles: string[]) {
  if (!roles.includes(actor.role)) fail(`บทบาท ${actor.role} ไม่มีสิทธิ์ทำรายการนี้`);
}

async function nextNumber(prefix: string, documentType: string) {
  const db = getDb();
  const year = '2569';
  await db.execute({
    sql: `INSERT INTO document_sequences (id, document_type, fiscal_year, last_sequence)
          VALUES (?, ?, ?, 1)
          ON CONFLICT(document_type, fiscal_year)
          DO UPDATE SET last_sequence = last_sequence + 1, updated_at = CURRENT_TIMESTAMP`,
    args: [`seq-${documentType}-${year}`, documentType, year],
  });
  const row = await db.execute({
    sql: 'SELECT last_sequence FROM document_sequences WHERE document_type = ? AND fiscal_year = ?',
    args: [documentType, year],
  });
  return `${prefix}-${year}-${String(row.rows[0].last_sequence).padStart(5, '0')}`;
}

async function event(documentType: string, documentId: string, action: string, from: string | null, to: string, actor: Actor, note?: string) {
  const db = getDb();
  const stamp = new Date().toLocaleString('th-TH', { hour12: false });
  await db.execute({
    sql: `INSERT INTO finance_approval_events (id, document_type, document_id, action, from_status, to_status, actor_id, actor_name, actor_role, note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [randomUUID(), documentType, documentId, action, from, to, actor.id, actor.name, actor.role, note || null],
  });
  await db.execute({
    sql: `INSERT INTO audit_logs (id, timestamp, user_id, user_name, user_role, action, entity_type, entity_id, description)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [randomUUID(), stamp, actor.id, actor.name, actor.role, action, documentType, documentId, note || action],
  });
}

export class FinanceDocumentService {
  static async cashPosition() {
    await initDb();
    const db = getDb();
    const bank = await db.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN step1_status IN ('approved', 'completed') AND overall_status != 'cancelled' THEN step1_withdraw_amount ELSE 0 END), 0) approved,
        COALESCE(SUM(CASE WHEN step1_status = 'completed' AND overall_status != 'cancelled' THEN step1_withdraw_amount ELSE 0 END), 0) withdrawn
      FROM cash_flow_workflows
    `);
    const treasurer = await db.execute(`
      SELECT COALESCE(SUM(CASE WHEN step2_status IN ('received', 'completed') THEN COALESCE(step2_deposit_amount, 0) ELSE 0 END), 0) received
      FROM cash_flow_workflows
      WHERE overall_status != 'cancelled'
    `);
    const drawn = await db.execute(`
      SELECT COALESCE(SUM(amount), 0) amount
      FROM cash_flow_withdrawals
      WHERE status IN ('disbursed', 'completed')
    `);
    const aid = await db.execute(`
      SELECT COALESCE(SUM(this_disbursement_amount), 0) amount
      FROM cash_flow_disbursement_items
      WHERE status NOT IN ('draft', 'cancelled')
    `);
    const petty = await db.execute(`
      SELECT COALESCE(SUM(clearance_spent_amount), 0) amount
      FROM cash_flow_withdrawals
      WHERE voucher_type = 'office_expense' AND clearance_status IN ('cleared', 'over_spent', 'overspent_approved')
    `);
    const approved = round2(Number(bank.rows[0].approved));
    const withdrawn = round2(Number(bank.rows[0].withdrawn));
    const received = round2(Number(treasurer.rows[0].received));
    const cashDrawn = round2(Number(drawn.rows[0].amount));
    const spent = round2(Number(aid.rows[0].amount) + Number(petty.rows[0].amount));
    return {
      bank: { approved, withdrawn, remaining: round2(approved - withdrawn) },
      treasurer: { received, drawn: cashDrawn, remaining: round2(received - cashDrawn) },
      fieldCash: { drawn: cashDrawn, spent, remaining: round2(cashDrawn - spent) },
    };
  }

  static async listMovements() {
    await initDb();
    const db = getDb();
    const docs = await db.execute(`SELECT * FROM finance_movement_documents ORDER BY created_at DESC LIMIT 50`);
    const lines = await db.execute(`SELECT * FROM finance_movement_lines ORDER BY line_no`);
    return docs.rows.map((doc) => ({
      id: String(doc.id),
      documentNo: String(doc.document_no),
      kind: String(doc.kind),
      documentDate: String(doc.document_date),
      purpose: String(doc.purpose),
      status: String(doc.status),
      totalSatang: Number(doc.total_satang),
      preparedByName: String(doc.prepared_by_name),
      approvedByName: doc.approved_by_name ? String(doc.approved_by_name) : '',
      reversedAt: doc.reversed_at ? String(doc.reversed_at) : '',
      lines: lines.rows.filter((line) => String(line.document_id) === String(doc.id)).map((line) => ({
        id: String(line.id),
        lineNo: Number(line.line_no),
        description: String(line.description),
        moneyType: String(line.money_type),
        amountSatang: Number(line.amount_satang),
        bankAccountId: line.bank_account_id ? String(line.bank_account_id) : '',
        counterpartyBankAccountId: line.counterparty_bank_account_id ? String(line.counterparty_bank_account_id) : '',
        proofUrl: line.proof_url ? String(line.proof_url) : '',
        ledgerTransactionId: line.ledger_transaction_id ? String(line.ledger_transaction_id) : '',
      })),
    }));
  }

  static async saveMovement(input: { id?: string; kind: Kind; documentDate: string; purpose: string; notes?: string; idempotencyKey?: string; lines: MovementLineInput[] }, actor: Actor) {
    await initDb();
    const user = await actorOf(actor);
    assertRole(user, ['finance', 'super_admin']);
    if (!input.purpose?.trim()) fail('ต้องระบุวัตถุประสงค์รวม');
    if (!input.lines?.length) fail('ต้องมีอย่างน้อยหนึ่งรายการ');
    const db = getDb();
    if (input.idempotencyKey) {
      const existing = await db.execute({ sql: 'SELECT id FROM finance_movement_documents WHERE idempotency_key = ?', args: [input.idempotencyKey] });
      if (existing.rows.length > 0) return { id: String(existing.rows[0].id), reused: true };
    }
    const lines = input.lines.map((line, index) => {
      if (!MONEY.includes(line.moneyType)) fail('ประเภทเงินไม่ถูกต้อง');
      if (!line.description?.trim()) fail('ต้องระบุรายละเอียดรายการ');
      if (input.kind === 'transfer' && (!line.bankAccountId || !line.counterpartyBankAccountId || line.bankAccountId === line.counterpartyBankAccountId)) {
        fail('การโอนต้องมีบัญชีต้นทางและปลายทางที่ต่างกัน');
      }
      if (input.kind !== 'transfer' && !line.bankAccountId) fail('ต้องเลือกบัญชีของแต่ละรายการ');
      return { ...line, lineNo: index + 1, amountSatang: satangOf(line.amount) };
    });
    const total = lines.reduce((sum, line) => sum + line.amountSatang, 0);
    const createdNumber = input.id ? '' : await nextNumber('MOV', 'movement');
    const tx = await db.transaction('write');
    try {
      let id = input.id || '';
      if (id) {
        const current = await tx.execute({ sql: 'SELECT status FROM finance_movement_documents WHERE id = ?', args: [id] });
        if (current.rows.length === 0) fail('ไม่พบเอกสาร');
        if (!OPEN.includes(String(current.rows[0].status))) fail('แก้ไขได้เฉพาะแบบร่างหรือรายการที่ถูกส่งกลับ');
        await tx.execute({
          sql: `UPDATE finance_movement_documents
                SET kind = ?, document_date = ?, purpose = ?, notes = ?, total_satang = ?, status = 'draft', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [input.kind, input.documentDate, input.purpose.trim(), input.notes || null, total, id],
        });
        await tx.execute({ sql: 'DELETE FROM finance_movement_lines WHERE document_id = ? AND ledger_transaction_id IS NULL', args: [id] });
      } else {
        id = randomUUID();
        const number = createdNumber;
        await tx.execute({
          sql: `INSERT INTO finance_movement_documents (
                  id, document_no, kind, document_date, purpose, notes, status, total_satang, prepared_by_id, prepared_by_name, idempotency_key
                ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
          args: [id, number, input.kind, input.documentDate, input.purpose.trim(), input.notes || null, total, user.id, user.name, input.idempotencyKey || null],
        });
      }
      for (const line of lines) {
        await tx.execute({
          sql: `INSERT INTO finance_movement_lines (
                  id, document_id, line_no, description, money_type, bank_account_id, counterparty_bank_account_id, purpose, amount_satang, responsible_name, proof_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [randomUUID(), id, line.lineNo, line.description.trim(), line.moneyType, line.bankAccountId || null, line.counterpartyBankAccountId || null, line.purpose || null, line.amountSatang, line.responsibleName || user.name, line.proofUrl || null],
        });
      }
      await tx.commit();
      return { id, reused: false };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  static async setMovementStatus(id: string, status: DocStatus, actor: Actor) {
    await initDb();
    const user = await actorOf(actor);
    const db = getDb();
    const row = await db.execute({ sql: 'SELECT status, prepared_by_id FROM finance_movement_documents WHERE id = ?', args: [id] });
    if (row.rows.length === 0) fail('ไม่พบเอกสาร');
    const current = String(row.rows[0].status);
    if (current === 'posted') fail('เอกสารถูกโพสต์แล้ว');
    const allowed: Record<string, string[]> = {
      pending_review: ['finance', 'super_admin'],
      pending_approval: ['finance', 'executive', 'super_admin'],
      approved: ['executive', 'super_admin'],
      rejected: ['executive', 'super_admin'],
      cancelled: ['finance', 'super_admin', 'executive'],
    };
    assertRole(user, allowed[status] || []);
    if (status === 'approved' && String(row.rows[0].prepared_by_id) === user.id) fail('ผู้จัดทำและผู้อนุมัติต้องไม่เป็นคนเดียวกัน');
    const nextOk: Record<string, string[]> = {
      draft: ['pending_review', 'cancelled'],
      pending_review: ['pending_approval', 'rejected', 'cancelled'],
      pending_approval: ['approved', 'rejected', 'cancelled'],
      approved: ['cancelled'],
      rejected: ['draft', 'cancelled'],
    };
    if (!nextOk[current]?.includes(status)) fail('เปลี่ยนสถานะนี้ไม่ได้');
    await db.execute({
      sql: `UPDATE finance_movement_documents
            SET status = ?, approved_by_id = CASE WHEN ? = 'approved' THEN ? ELSE approved_by_id END,
                approved_by_name = CASE WHEN ? = 'approved' THEN ? ELSE approved_by_name END,
                approved_at = CASE WHEN ? = 'approved' THEN ? ELSE approved_at END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [status, status, user.id, status, user.name, status, new Date().toLocaleString('th-TH', { hour12: false }), id],
    });
    await event('movement', id, 'MOVEMENT_STATUS', current, status, user);
    return { id, status };
  }

  static async postMovement(id: string, actor: Actor) {
    await initDb();
    const user = await actorOf(actor);
    assertRole(user, ['finance', 'super_admin']);
    const db = getDb();
    const tx = await db.transaction('write');
    try {
      const docRes = await tx.execute({ sql: 'SELECT * FROM finance_movement_documents WHERE id = ?', args: [id] });
      if (docRes.rows.length === 0) fail('ไม่พบเอกสาร');
      const doc = docRes.rows[0];
      if (String(doc.status) !== 'approved') fail('ต้องอนุมัติเอกสารก่อนลงสมุดบัญชี');
      if (doc.reversed_at) fail('เอกสารนี้ถูกกลับรายการแล้ว');
      const lineRes = await tx.execute({ sql: 'SELECT * FROM finance_movement_lines WHERE document_id = ? ORDER BY line_no', args: [id] });
      if (lineRes.rows.length === 0) fail('เอกสารไม่มีรายการ');
      const banks = await tx.execute(`SELECT id, account_name, current_balance, money_types FROM bank_accounts`);
      const bankMap = new Map(banks.rows.map((bank) => [String(bank.id), bank]));
      const delta = new Map<string, number>();
      const add = (bankId: string, satang: number) => delta.set(bankId, (delta.get(bankId) || 0) + satang);
      for (const line of lineRes.rows) {
        const moneyType = String(line.money_type) as MoneyType;
        const amount = Number(line.amount_satang);
        const source = String(line.bank_account_id || '');
        const target = String(line.counterparty_bank_account_id || '');
        const touch = (bankId: string) => {
          const bank = bankMap.get(bankId);
          if (!bank) fail('ไม่พบบัญชีที่ระบุในรายการ');
          if (!accepts(String(bank.money_types || ''), moneyType)) fail(`บัญชี ${bank.account_name} ไม่รองรับประเภทเงินนี้`);
        };
        if (String(doc.kind) === 'deposit') { touch(source); add(source, amount); }
        if (String(doc.kind) === 'withdraw') { touch(source); add(source, -amount); }
        if (String(doc.kind) === 'transfer') { touch(source); touch(target); add(source, -amount); add(target, amount); }
      }
      for (const [bankId, change] of delta) {
        const bank = bankMap.get(bankId)!;
        const next = toSatang(Number(bank.current_balance)) + change;
        if (next < 0) fail(`ยอดบัญชี ${bank.account_name} ไม่พอสำหรับเอกสารนี้`);
        await tx.execute({ sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [fromSatang(next), bankId] });
      }
      const stamp = new Date().toLocaleString('th-TH', { hour12: false });
      for (const line of lineRes.rows) {
        const amount = fromSatang(Number(line.amount_satang));
        const source = String(line.bank_account_id || '');
        const target = String(line.counterparty_bank_account_id || '');
        const sourceName = String(bankMap.get(source)?.account_name || '');
        const targetName = String(bankMap.get(target)?.account_name || '');
        const ledgerId = randomUUID();
        const base = [ledgerId, `${doc.document_no}-${line.line_no}`, inputDate(doc.document_date, stamp), amount, user.id, user.name, String(line.description), String(doc.document_no), line.proof_url || '', String(line.money_type)];
        if (String(doc.kind) === 'deposit') {
          await tx.execute({
            sql: `INSERT INTO financial_transactions (
                    id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method, payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, bank_account_id, money_type
                  ) VALUES (?, ?, ?, 'bank_deposit', 'fund-general', 'บัญชีกลาง', 'นำเงินฝากตามเอกสาร', ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
            args: [base[0], base[1], base[2], amount, user.name, base[7], base[8], user.id, user.name, base[6], source, base[9]],
          });
          await tx.execute({ sql: 'UPDATE finance_movement_lines SET status = ?, ledger_transaction_id = ? WHERE id = ?', args: ['posted', ledgerId, line.id] });
        } else if (String(doc.kind) === 'withdraw') {
          await tx.execute({
            sql: `INSERT INTO financial_transactions (
                    id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method, payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, bank_account_id, money_type
                  ) VALUES (?, ?, ?, 'bank_withdrawal', 'fund-general', 'บัญชีกลาง', ?, ?, 'cash', ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
            args: [base[0], base[1], base[2], String(line.purpose || line.description), -amount, user.name, base[7], base[8], user.id, user.name, base[6], source, base[9]],
          });
          await tx.execute({ sql: 'UPDATE finance_movement_lines SET status = ?, ledger_transaction_id = ? WHERE id = ?', args: ['posted', ledgerId, line.id] });
        } else {
          const inId = randomUUID();
          await tx.execute({
            sql: `INSERT INTO financial_transactions (
                    id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method, payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, bank_account_id, money_type
                  ) VALUES (?, ?, ?, 'bank_transfer_out', 'fund-general', 'บัญชีกลาง', 'โอนเงินระหว่างธนาคาร', ?, 'bank_transfer', ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
            args: [ledgerId, `${doc.document_no}-${line.line_no}-OUT`, base[2], -amount, `โอนไป ${targetName}`, base[7], base[8], user.id, user.name, base[6], source, base[9]],
          });
          await tx.execute({
            sql: `INSERT INTO financial_transactions (
                    id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method, payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, bank_account_id, money_type
                  ) VALUES (?, ?, ?, 'bank_transfer_in', 'fund-general', 'บัญชีกลาง', 'รับโอนเงินระหว่างธนาคาร', ?, 'bank_transfer', ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
            args: [inId, `${doc.document_no}-${line.line_no}-IN`, base[2], amount, `รับโอนจาก ${sourceName}`, base[7], base[8], user.id, user.name, base[6], target, base[9]],
          });
          await tx.execute({ sql: 'UPDATE finance_movement_lines SET status = ?, ledger_transaction_id = ?, ledger_counter_transaction_id = ? WHERE id = ?', args: ['posted', ledgerId, inId, line.id] });
        }
      }
      await tx.execute({ sql: `UPDATE finance_movement_documents SET status = 'posted', posted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, args: [stamp, id] });
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
    await event('movement', id, 'MOVEMENT_POSTED', 'approved', 'posted', user, 'ลงสมุดบัญชีจากเอกสารเคลื่อนย้าย');
    return { id, status: 'posted' };
  }

  static async reverseMovement(id: string, actor: Actor, reason: string) {
    await initDb();
    const user = await actorOf(actor);
    assertRole(user, ['finance', 'super_admin', 'executive']);
    if (!reason || reason.trim().length < 5) fail('ต้องระบุเหตุผลการกลับรายการอย่างน้อย 5 ตัวอักษร');
    const db = getDb();
    const tx = await db.transaction('write');
    try {
      const docRes = await tx.execute({ sql: 'SELECT * FROM finance_movement_documents WHERE id = ?', args: [id] });
      if (docRes.rows.length === 0) fail('ไม่พบเอกสาร');
      const doc = docRes.rows[0];
      if (String(doc.status) !== 'posted' || doc.reversed_at) fail('กลับรายการได้เฉพาะเอกสารที่โพสต์และยังไม่ถูกกลับรายการ');
      const lines = await tx.execute({ sql: 'SELECT * FROM finance_movement_lines WHERE document_id = ?', args: [id] });
      const banks = await tx.execute(`SELECT id, current_balance FROM bank_accounts`);
      const balance = new Map(banks.rows.map((bank) => [String(bank.id), toSatang(Number(bank.current_balance))]));
      const add = (bankId: string, satang: number) => balance.set(bankId, (balance.get(bankId) || 0) + satang);
      for (const line of lines.rows) {
        const amount = Number(line.amount_satang);
        const source = String(line.bank_account_id || '');
        const target = String(line.counterparty_bank_account_id || '');
        if (String(doc.kind) === 'deposit') add(source, -amount);
        if (String(doc.kind) === 'withdraw') add(source, amount);
        if (String(doc.kind) === 'transfer') { add(source, amount); add(target, -amount); }
      }
      for (const [bankId, next] of balance) {
        if (next < 0) fail('กลับรายการแล้วจะทำให้ยอดบัญชีติดลบ');
        await tx.execute({ sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [fromSatang(next), bankId] });
      }
      const stamp = new Date().toLocaleString('th-TH', { hour12: false });
      for (const line of lines.rows) {
        for (const ledgerId of [line.ledger_transaction_id, line.ledger_counter_transaction_id]) {
          if (!ledgerId) continue;
          const original = await tx.execute({ sql: 'SELECT amount, bank_account_id, transaction_no FROM financial_transactions WHERE id = ?', args: [String(ledgerId)] });
          if (original.rows.length === 0) continue;
          await tx.execute({ sql: `UPDATE financial_transactions SET status = 'reversed', reversal_reason = ?, reversed_at = ?, reversed_by_name = ? WHERE id = ?`, args: [reason.trim(), stamp, user.name, String(ledgerId)] });
          await tx.execute({
            sql: `INSERT INTO financial_transactions (
                    id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method, payer_or_payee, reference_no, status, recorded_by_id, recorded_by_name, notes, bank_account_id
                  ) VALUES (?, ?, ?, 'reversal', 'fund-general', 'บัญชีกลาง', 'กลับรายการเอกสารเคลื่อนย้าย', ?, 'bank_transfer', ?, ?, 'completed', ?, ?, ?, ?)`,
            args: [randomUUID(), `REV-${original.rows[0].transaction_no}`, stamp, -Number(original.rows[0].amount), user.name, String(doc.document_no), user.id, user.name, reason.trim(), original.rows[0].bank_account_id],
          });
        }
      }
      await tx.execute({ sql: 'UPDATE finance_movement_documents SET reversed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [stamp, id] });
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
    await event('movement', id, 'MOVEMENT_REVERSED', 'posted', 'posted', user, reason.trim());
    return { id, reversed: true };
  }

  static async listAdminExpenses() {
    await initDb();
    const db = getDb();
    const docs = await db.execute(`SELECT * FROM admin_expense_documents ORDER BY created_at DESC LIMIT 50`);
    const lines = await db.execute(`SELECT l.*, c.name AS category_name FROM admin_expense_lines l LEFT JOIN admin_expense_categories c ON c.id = l.category_id ORDER BY l.line_no`);
    return docs.rows.map((doc) => ({
      id: String(doc.id),
      documentNo: String(doc.document_no),
      documentDate: String(doc.document_date),
      purpose: String(doc.purpose),
      status: String(doc.status),
      moneyType: String(doc.money_type),
      totalSatang: Number(doc.total_satang),
      fundAccountId: String(doc.fund_account_id),
      reversedAt: doc.reversed_at ? String(doc.reversed_at) : '',
      lines: lines.rows.filter((line) => String(line.document_id) === String(doc.id)).map((line) => ({
        lineNo: Number(line.line_no),
        categoryId: line.category_id ? String(line.category_id) : '',
        categoryName: String(line.category_name || ''),
        description: String(line.description),
        amountSatang: Number(line.amount_satang),
        payeeName: line.payee_name ? String(line.payee_name) : '',
      })),
    }));
  }

  static async saveAdminExpense(input: { id?: string; documentDate: string; fundAccountId: string; bankAccountId?: string; moneyType?: string; purpose: string; notes?: string; idempotencyKey?: string; lines: { categoryId: string; description: string; amount: number; expenseDate: string; payeeName?: string; paymentMethod?: string; proofUrl?: string; notes?: string }[] }, actor: Actor) {
    await initDb();
    const user = await actorOf(actor);
    assertRole(user, ['finance', 'super_admin']);
    if (!input.purpose?.trim()) fail('ต้องระบุวัตถุประสงค์');
    if (!input.lines?.length) fail('ต้องมีอย่างน้อยหนึ่งรายการค่าใช้จ่าย');
    const db = getDb();
    const fund = await db.execute({ sql: 'SELECT id, category, name, available_amount FROM fund_accounts WHERE id = ?', args: [input.fundAccountId] });
    if (fund.rows.length === 0) fail('ไม่พบกองทุน');
    if (String(fund.rows[0].category) !== 'operational') fail('ค่าใช้จ่ายบริหารใช้ได้เฉพาะกองทุนบริหาร');
    if (input.moneyType && !['operational_admin', 'restricted'].includes(input.moneyType)) fail('ใช้เงินซะกาตเป็นค่าใช้จ่ายบริหารไม่ได้');
    const moneyType = input.moneyType === 'restricted' ? 'restricted' : 'operational_admin';
    if (input.bankAccountId) {
      const bank = await db.execute({ sql: 'SELECT account_name, money_types, status FROM bank_accounts WHERE id = ?', args: [input.bankAccountId] });
      if (bank.rows.length === 0 || bank.rows[0].status === 'closed') fail('ไม่พบบัญชีเงินต้นทางที่ใช้งานได้');
      if (!accepts(String(bank.rows[0].money_types || ''), moneyType)) fail(`บัญชี ${bank.rows[0].account_name} ไม่รองรับประเภทเงินนี้`);
    }
    if (input.idempotencyKey) {
      const existing = await db.execute({ sql: 'SELECT id FROM admin_expense_documents WHERE idempotency_key = ?', args: [input.idempotencyKey] });
      if (existing.rows.length > 0) return { id: String(existing.rows[0].id), reused: true };
    }
    const lines = [];
    for (const [index, line] of input.lines.entries()) {
      const category = await db.execute({ sql: 'SELECT id, is_active FROM admin_expense_categories WHERE id = ?', args: [line.categoryId] });
      if (category.rows.length === 0 || !category.rows[0].is_active) fail('หมวดค่าใช้จ่ายไม่พร้อมใช้งาน');
      if (!line.description?.trim()) fail('ต้องระบุรายละเอียดค่าใช้จ่าย');
      lines.push({ ...line, lineNo: index + 1, amountSatang: satangOf(line.amount) });
    }
    const total = lines.reduce((sum, line) => sum + line.amountSatang, 0);
    if (total > toSatang(Number(fund.rows[0].available_amount))) fail(`ยอดค่าบริหารเกินเงินคงเหลือของกองทุน ${fund.rows[0].name}`);
    const createdNumber = input.id ? '' : await nextNumber('ADM', 'admin_expense');
    const tx = await db.transaction('write');
    try {
      let id = input.id || '';
      if (id) {
        const current = await tx.execute({ sql: 'SELECT status FROM admin_expense_documents WHERE id = ?', args: [id] });
        if (current.rows.length === 0 || !OPEN.includes(String(current.rows[0].status))) fail('แก้ไขได้เฉพาะแบบร่าง');
        await tx.execute({
          sql: `UPDATE admin_expense_documents SET document_date = ?, fund_account_id = ?, bank_account_id = ?, money_type = ?, purpose = ?, notes = ?, total_satang = ?, status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          args: [input.documentDate, input.fundAccountId, input.bankAccountId || null, moneyType, input.purpose.trim(), input.notes || null, total, id],
        });
        await tx.execute({ sql: 'DELETE FROM admin_expense_lines WHERE document_id = ? AND ledger_transaction_id IS NULL', args: [id] });
      } else {
        id = randomUUID();
        const number = createdNumber;
        await tx.execute({
          sql: `INSERT INTO admin_expense_documents (
                  id, document_no, document_date, fund_account_id, bank_account_id, money_type, purpose, notes, status, total_satang, prepared_by_id, prepared_by_name, idempotency_key
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
          args: [id, number, input.documentDate, input.fundAccountId, input.bankAccountId || null, moneyType, input.purpose.trim(), input.notes || null, total, user.id, user.name, input.idempotencyKey || null],
        });
      }
      for (const line of lines) {
        await tx.execute({
          sql: `INSERT INTO admin_expense_lines (id, document_id, line_no, category_id, description, amount_satang, expense_date, payee_name, payment_method, proof_url, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [randomUUID(), id, line.lineNo, line.categoryId, line.description.trim(), line.amountSatang, line.expenseDate, line.payeeName || null, line.paymentMethod || 'cash', line.proofUrl || null, line.notes || null],
        });
      }
      await tx.commit();
      return { id, reused: false };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  static async setAdminStatus(id: string, status: DocStatus, actor: Actor) {
    await initDb();
    const user = await actorOf(actor);
    const db = getDb();
    const row = await db.execute({ sql: 'SELECT status, prepared_by_id FROM admin_expense_documents WHERE id = ?', args: [id] });
    if (row.rows.length === 0) fail('ไม่พบเอกสาร');
    const current = String(row.rows[0].status);
    if (current === 'posted') fail('เอกสารถูกโพสต์แล้ว');
    if (status === 'approved') assertRole(user, ['executive', 'super_admin']);
    else assertRole(user, ['finance', 'super_admin', 'executive']);
    if (status === 'approved' && String(row.rows[0].prepared_by_id) === user.id) fail('ผู้จัดทำและผู้อนุมัติต้องไม่เป็นคนเดียวกัน');
    await db.execute({
      sql: `UPDATE admin_expense_documents SET status = ?, approved_by_id = CASE WHEN ? = 'approved' THEN ? ELSE approved_by_id END, approved_by_name = CASE WHEN ? = 'approved' THEN ? ELSE approved_by_name END, approved_at = CASE WHEN ? = 'approved' THEN ? ELSE approved_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [status, status, user.id, status, user.name, status, new Date().toLocaleString('th-TH', { hour12: false }), id],
    });
    await event('admin_expense', id, 'ADMIN_EXPENSE_STATUS', current, status, user);
    return { id, status };
  }

  static async postAdminExpense(id: string, actor: Actor) {
    await initDb();
    const user = await actorOf(actor);
    assertRole(user, ['finance', 'super_admin']);
    const db = getDb();
    const tx = await db.transaction('write');
    try {
      const docRes = await tx.execute({ sql: 'SELECT * FROM admin_expense_documents WHERE id = ?', args: [id] });
      if (docRes.rows.length === 0) fail('ไม่พบเอกสาร');
      const doc = docRes.rows[0];
      if (String(doc.status) !== 'approved') fail('ต้องอนุมัติเอกสารก่อนลงสมุดบัญชี');
      if (String(doc.money_type) === 'zakat') fail('ใช้เงินซะกาตเป็นค่าบริหารไม่ได้');
      const fundRes = await tx.execute({ sql: 'SELECT * FROM fund_accounts WHERE id = ?', args: [String(doc.fund_account_id)] });
      const fund = fundRes.rows[0];
      if (!fund || String(fund.category) === 'zakat') fail('ค่าใช้จ่ายบริหารใช้ได้เฉพาะกองทุนบริหาร');
      const lines = await tx.execute({ sql: 'SELECT l.*, c.name AS category_name FROM admin_expense_lines l JOIN admin_expense_categories c ON c.id = l.category_id WHERE l.document_id = ?', args: [id] });
      const total = lines.rows.reduce((sum, line) => sum + Number(line.amount_satang), 0);
      if (total > toSatang(Number(fund.available_amount))) fail('ยอดค่าบริหารเกินเงินคงเหลือของกองทุน');
      let bankBalance = 0;
      if (doc.bank_account_id) {
        const bank = await tx.execute({ sql: 'SELECT current_balance, money_types, account_name FROM bank_accounts WHERE id = ?', args: [String(doc.bank_account_id)] });
        if (bank.rows.length === 0) fail('ไม่พบบัญชีที่ใช้จ่าย');
        if (!accepts(String(bank.rows[0].money_types || ''), 'operational_admin')) fail('บัญชีนี้ไม่รองรับเงินบริหาร');
        bankBalance = toSatang(Number(bank.rows[0].current_balance));
        if (total > bankBalance) fail('ยอดในบัญชีไม่พอจ่ายค่าบริหาร');
        await tx.execute({ sql: 'UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [fromSatang(bankBalance - total), String(doc.bank_account_id)] });
      }
      const nextAvailable = fromSatang(toSatang(Number(fund.available_amount)) - total);
      const nextDisbursed = fromSatang(toSatang(Number(fund.disbursed_amount)) + total);
      await tx.execute({ sql: 'UPDATE fund_accounts SET available_amount = ?, disbursed_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [nextAvailable, nextDisbursed, fund.id] });
      const stamp = new Date().toLocaleString('th-TH', { hour12: false });
      for (const line of lines.rows) {
        const ledgerId = randomUUID();
        await tx.execute({
          sql: `INSERT INTO financial_transactions (
                  id, transaction_no, date, type, fund_id, fund_name, category, amount, payment_method, payer_or_payee, reference_no, slip_url, status, recorded_by_id, recorded_by_name, notes, bank_account_id, money_type
                ) VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, 'operational_admin')`,
          args: [ledgerId, `${doc.document_no}-${line.line_no}`, stamp, fund.id, fund.name, String(line.category_name), fromSatang(Number(line.amount_satang)), line.payment_method || 'cash', line.payee_name || user.name, String(doc.document_no), line.proof_url || '', user.id, user.name, String(line.description), doc.bank_account_id || null],
        });
        await tx.execute({ sql: 'UPDATE admin_expense_lines SET ledger_transaction_id = ? WHERE id = ?', args: [ledgerId, line.id] });
      }
      await tx.execute({ sql: `UPDATE admin_expense_documents SET status = 'posted', posted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, args: [stamp, id] });
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
    await event('admin_expense', id, 'ADMIN_EXPENSE_POSTED', 'approved', 'posted', user, 'ลงสมุดบัญชีค่าใช้จ่ายบริหาร');
    return { id, status: 'posted' };
  }

  static async searchPayableApplications(search: string) {
    await initDb();
    const db = getDb();
    const term = `%${search.trim()}%`;
    const rows = await db.execute({
      sql: `SELECT a.id, a.application_no, a.asnaf_category, a.assistance_type, a.approved_amount, a.disbursed_amount, a.status,
                   a.approved_fund_id, b.id AS beneficiary_id, b.full_name, b.national_id, t.name AS type_name, t.assistance_format, f.name AS fund_name
            FROM assistance_applications a
            JOIN beneficiaries b ON b.id = a.beneficiary_id
            LEFT JOIN assistance_types t ON t.id = a.assistance_type_id
            LEFT JOIN fund_accounts f ON f.id = COALESCE(a.approved_fund_id, a.specific_fund_id)
            WHERE a.status IN ('approved', 'wait_disbursement', 'partially_disbursed')
              AND (? = '%%' OR a.application_no LIKE ? OR b.full_name LIKE ? OR b.national_id LIKE ?)
            ORDER BY a.updated_at DESC
            LIMIT 20`,
      args: [term, term, term, term],
    });
    return rows.rows.map((row) => {
      const approved = round2(Number(row.approved_amount) || 0);
      const paid = round2(Number(row.disbursed_amount) || 0);
      return {
        applicationId: String(row.id),
        applicationNo: String(row.application_no),
        beneficiaryId: String(row.beneficiary_id),
        beneficiaryName: String(row.full_name),
        nationalId: String(row.national_id),
        asnaf: String(row.asnaf_category || ''),
        assistanceType: String(row.type_name || row.assistance_type || ''),
        assistanceFormat: String(row.assistance_format || ''),
        fundName: String(row.fund_name || ''),
        approvedAmount: approved,
        paidAmount: paid,
        remainingAmount: round2(approved - paid),
        status: String(row.status),
      };
    });
  }

  static async listResolutions() {
    await initDb();
    const db = getDb();
    const rows = await db.execute(`
      SELECT r.*,
        COALESCE((SELECT SUM(amount) FROM cash_flow_withdrawals w WHERE w.meeting_resolution_id = r.id AND w.status != 'cancelled'), 0) used_amount
      FROM meeting_resolutions r
      ORDER BY r.created_at DESC
    `);
    return rows.rows.map((row) => {
      const approved = fromSatang(Number(row.approved_satang));
      const used = round2(Number(row.used_amount) || 0);
      return {
        id: String(row.id),
        resolutionNo: String(row.resolution_no),
        meetingNo: String(row.meeting_no),
        meetingDate: String(row.meeting_date),
        detail: String(row.detail),
        moneyType: String(row.money_type),
        approvedAmount: approved,
        usedAmount: used,
        remainingAmount: round2(approved - used),
      };
    });
  }

  static async createResolution(input: { meetingNo: string; meetingDate: string; detail: string; moneyType: MoneyType; approvedAmount: number }, actor: Actor) {
    await initDb();
    const user = await actorOf(actor);
    assertRole(user, ['finance', 'executive', 'super_admin']);
    if (!input.meetingNo?.trim() || !input.detail?.trim()) fail('ต้องระบุครั้งที่ประชุมและรายละเอียดมติ');
    if (!MONEY.includes(input.moneyType)) fail('ประเภทเงินของมติไม่ถูกต้อง');
    const satang = satangOf(input.approvedAmount);
    const db = getDb();
    const id = randomUUID();
    const number = await nextNumber('RES', 'meeting_resolution');
    await db.execute({
      sql: `INSERT INTO meeting_resolutions (id, resolution_no, meeting_no, meeting_date, detail, money_type, approved_satang, prepared_by_id, prepared_by_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, number, input.meetingNo.trim(), input.meetingDate, input.detail.trim(), input.moneyType, satang, user.id, user.name],
    });
    await event('movement', id, 'MEETING_RESOLUTION_RECORDED', null, 'approved', user, input.detail.trim());
    return { id, resolutionNo: number };
  }

  static async issueCashVoucher(input: {
    workflowId: string;
    resolutionId: string;
    voucherType: 'aid_disbursement' | 'office_expense';
    receiverName: string;
    purpose: string;
    proofUrl?: string;
    aidLines?: { applicationId: string; amount: number }[];
    adminLines?: { categoryName: string; description: string; amount: number; payeeName?: string }[];
  }, actor: Actor) {
    await initDb();
    const user = await actorOf(actor);
    assertRole(user, ['finance', 'super_admin', 'executive']);
    const db = getDb();
    const workflow = await db.execute({ sql: 'SELECT * FROM cash_flow_workflows WHERE id = ?', args: [input.workflowId] });
    if (workflow.rows.length === 0) fail('ไม่พบวงจรเบิกเงิน');
    const fundType = String(workflow.rows[0].step1_fund_type || 'zakat');
    if (input.voucherType === 'office_expense' && fundType === 'zakat') fail('ใช้เงินซะกาตเป็นค่าใช้จ่ายบริหารไม่ได้');
    const resolution = await db.execute({ sql: 'SELECT * FROM meeting_resolutions WHERE id = ?', args: [input.resolutionId] });
    if (resolution.rows.length === 0) fail('ไม่พบมติที่ประชุม');
    const resolutionMoney = String(resolution.rows[0].money_type);
    const workflowMoney = fundType === 'admin' || fundType === 'operational' ? 'operational_admin' : fundType;
    if (resolutionMoney !== workflowMoney) fail('ประเภทเงินของมติไม่ตรงกับเงินที่ถอนจากธนาคาร');
    const lines = input.voucherType === 'aid_disbursement' ? input.aidLines || [] : [];
    const admin = input.voucherType === 'office_expense' ? input.adminLines || [] : [];
    if (input.voucherType === 'aid_disbursement' && lines.length === 0) fail('ต้องมีรายการช่วยเหลืออย่างน้อยหนึ่งรายการ');
    if (input.voucherType === 'office_expense' && admin.length === 0) fail('ต้องมีรายการค่าบริหารอย่างน้อยหนึ่งรายการ');
    const amount = round2((input.voucherType === 'aid_disbursement' ? lines : admin).reduce((sum, line) => sum + Number(line.amount), 0));
    const used = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) used FROM cash_flow_withdrawals WHERE meeting_resolution_id = ? AND status != 'cancelled'`,
      args: [input.resolutionId],
    });
    const remaining = fromSatang(Number(resolution.rows[0].approved_satang)) - Number(used.rows[0].used);
    if (amount > round2(remaining) + 0.001) fail(`ยอดใบเบิกเกินวงเงินมติที่เหลือ ${round2(remaining).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`);
    let disbursementItems;
    if (input.voucherType === 'aid_disbursement') {
      disbursementItems = [];
      for (const line of lines) {
        const app = await db.execute({
          sql: `SELECT a.*, b.full_name, b.national_id, t.name AS type_name
                FROM assistance_applications a
                JOIN beneficiaries b ON b.id = a.beneficiary_id
                LEFT JOIN assistance_types t ON t.id = a.assistance_type_id
                WHERE a.id = ?`,
          args: [line.applicationId],
        });
        if (app.rows.length === 0) fail('ไม่พบคำร้องที่เลือก');
        const row = app.rows[0];
        if (!['approved', 'wait_disbursement', 'partially_disbursed'].includes(String(row.status))) fail(`คำร้อง ${row.application_no} ยังไม่ได้รับอนุมัติ`);
        const approved = round2(Number(row.approved_amount) || 0);
        const paid = round2(Number(row.disbursed_amount) || 0);
        const pay = round2(Number(line.amount));
        if (pay <= 0 || pay > round2(approved - paid) + 0.001) fail(`ยอดจ่ายของคำร้อง ${row.application_no} เกินวงเงินที่เหลือ`);
        disbursementItems.push({
          applicationId: String(row.id),
          beneficiaryId: String(row.beneficiary_id),
          beneficiaryName: String(row.full_name),
          nationalId: String(row.national_id),
          asnafCategory: String(row.asnaf_category),
          assistanceType: String(row.type_name || row.assistance_type || ''),
          approvedAmount: approved,
          disbursedAmountBefore: paid,
          thisDisbursementAmount: pay,
          remainingBalance: round2(approved - paid - pay),
        });
      }
    }
    const result = await FinancialService.addCashFlowWithdrawal({
      workflowId: input.workflowId,
      voucherType: input.voucherType,
      amount,
      purpose: input.purpose?.trim() || (input.voucherType === 'office_expense' ? 'ค่าใช้จ่ายบริหาร' : 'จ่ายความช่วยเหลือตามมติ'),
      withdrawerName: input.receiverName.trim(),
      sourceFundType: fundType,
      targetAsnaf: disbursementItems?.[0]?.asnafCategory,
      disbursementItems,
      expenseCategory: admin[0]?.categoryName,
      expenseDetails: admin.map((line) => `${line.categoryName}: ${line.description} ${line.amount}`).join('\n'),
      proofUrl: input.proofUrl,
      notes: `มติ ${resolution.rows[0].resolution_no}`,
      status: 'draft',
    }, user);
    await db.execute({ sql: 'UPDATE cash_flow_withdrawals SET meeting_resolution_id = ? WHERE id = ?', args: [input.resolutionId, result.withdrawalId] });
    return result;
  }
}

function inputDate(value: unknown, fallback: string) {
  const text = String(value || '').trim();
  return text || fallback;
}
