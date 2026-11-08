'use client';

import React, { useEffect, useState } from 'react';
import type { BankAccount, FundAccount } from '@/types';

type Actor = { id: string; name: string; role: string };
type MoneyType = 'zakat' | 'sadaqah' | 'operational_admin' | 'restricted';
type Kind = 'deposit' | 'withdraw' | 'transfer';

const moneyLabel: Record<string, string> = {
  zakat: 'เงินซะกาต',
  sadaqah: 'ศอดะเกาะห์ทั่วไป',
  operational_admin: 'เงินบริจาคเพื่อการบริหาร',
  restricted: 'เงินบริจาคเฉพาะวัตถุประสงค์',
  operational: 'เงินบริจาคเพื่อการบริหาร',
};

function baht(value: number) {
  return `฿${(Number.isFinite(value) ? value : 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusLabel(status: string, reversed: boolean) {
  if (reversed) return 'กลับรายการแล้ว';
  const labels: Record<string, string> = {
    draft: 'แบบร่าง',
    pending_review: 'รอตรวจสอบ',
    pending_approval: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    posted: 'ลงบัญชีแล้ว',
    rejected: 'ไม่อนุมัติ',
    cancelled: 'ยกเลิก',
  };
  return labels[status] || status;
}

function statusClass(status: string, reversed: boolean) {
  if (reversed || status === 'posted') return 'bg-teal-50 text-[#0D9488]';
  if (status === 'pending_review' || status === 'pending_approval') return 'bg-amber-50 text-amber-700';
  if (status === 'approved') return 'bg-blue-50 text-[#2563EB]';
  if (status === 'rejected' || status === 'cancelled') return 'bg-red-50 text-[#DC2626]';
  return 'bg-slate-100 text-[#64748B]';
}

async function call(action: string, actor: Actor, input: Record<string, unknown>) {
  const response = await fetch('/api/finance/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, actor, input }),
  });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(body.error || 'บันทึกไม่สำเร็จ');
  return body.data;
}

export function CashPosition() {
  const [data, setData] = useState<{ bank: { approved: number; withdrawn: number; remaining: number }; treasurer: { received: number; drawn: number; remaining: number }; fieldCash: { drawn: number; spent: number; remaining: number } } | null>(null);
  useEffect(() => {
    fetch('/api/finance/documents?view=cash').then((response) => response.json()).then((body) => { if (body.success) setData(body.data); });
  }, []);
  if (!data) return null;
  const cards = [
    ['ยอดเบิกจากธนาคาร', 'อนุมัติให้ถอน', data.bank.approved, 'ถอนแล้วยืนยัน', data.bank.withdrawn, data.bank.remaining],
    ['ยอดเบิกจากเหรัญญิก', 'รับมอบที่ยืนยัน', data.treasurer.received, 'เบิกเงินสดแล้ว', data.treasurer.drawn, data.treasurer.remaining],
    ['การใช้จ่ายเงินสด', 'เบิกเงินสดแล้ว', data.fieldCash.drawn, 'ใช้จ่ายที่ยืนยัน', data.fieldCash.spent, data.fieldCash.remaining],
  ] as const;
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {cards.map(([title, leftLabel, left, rightLabel, right, remaining]) => (
        <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-bold text-[#0B2545]">{title}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
            <div>{leftLabel}<div className="text-sm font-semibold text-slate-800">{baht(left)}</div></div>
            <div>{rightLabel}<div className="text-sm font-semibold text-slate-800">{baht(right)}</div></div>
          </div>
          <div className="mt-3 text-xs text-slate-400">คงเหลือ</div>
          <div className="text-lg font-bold text-[#0D9488]">{baht(remaining)}</div>
        </div>
      ))}
    </div>
  );
}

export function MovementDocuments({ banks, actor, onChanged }: { banks: BankAccount[]; actor: Actor; onChanged?: () => void }) {
  const [kind, setKind] = useState<Kind>('deposit');
  const [purpose, setPurpose] = useState('');
  const [lines, setLines] = useState([{ description: '', moneyType: 'zakat' as MoneyType, bankAccountId: banks.find((bank) => bank.status === 'active')?.id || '', counterpartyBankAccountId: '', amount: '', proofUrl: '' }]);
  const [docs, setDocs] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = banks.filter((bank) => bank.status === 'active');
  const total = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  async function reload() {
    const response = await fetch('/api/finance/documents?view=movements');
    const body = await response.json();
    if (body.success) setDocs(body.data);
  }
  useEffect(() => { reload(); }, []);
  function update(index: number, patch: Partial<(typeof lines)[number]>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }
  async function save(status?: string) {
    setBusy(true);
    setError('');
    try {
      const saved = await call('save_movement', actor, {
        kind,
        documentDate: new Date().toISOString().slice(0, 10),
        purpose,
        idempotencyKey: crypto.randomUUID(),
        lines: lines.map((line) => ({ ...line, amount: Number(line.amount), responsibleName: actor.name })),
      });
      if (status) await call('movement_status', actor, { id: saved.id, status });
      setPurpose('');
      setLines([{ description: '', moneyType: 'zakat', bankAccountId: active[0]?.id || '', counterpartyBankAccountId: '', amount: '', proofUrl: '' }]);
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  async function act(id: string, action: string, status?: string) {
    setBusy(true);
    setError('');
    try {
      if (action === 'post_movement' && !window.confirm('ยืนยันลงสมุดบัญชี ยอดธนาคารจะเปลี่ยนตามรายการในเอกสาร')) return;
      if (action === 'reverse_movement') {
        const reason = window.prompt('เหตุผลการกลับรายการ') || '';
        await call(action, actor, { id, reason });
      } else if (status) await call('movement_status', actor, { id, status });
      else await call(action, actor, { id });
      await reload();
      if (action === 'post_movement' || action === 'reverse_movement') onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <form className="rounded-2xl border border-slate-200 bg-white p-4" onSubmit={(event) => { event.preventDefault(); save(); }}>
        <div className="text-sm font-bold text-[#0B2545]">เอกสารฝาก ถอน หรือโอนหลายรายการ</div>
        <p className="mt-1 text-xs text-slate-500">ยังไม่มีมติที่ประชุมในระบบ จึงยังเลือกมติและตรวจวงเงินมติไม่ได้ แบบร่างยังไม่ตัดยอดธนาคาร</p>
        <div className="mt-3 flex gap-2">
          {([['deposit', 'ฝาก'], ['withdraw', 'ถอน'], ['transfer', 'โอน']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setKind(id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${kind === id ? 'bg-[#0D9488] text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>
          ))}
        </div>
        <label className="mt-3 block text-xs text-slate-500">วัตถุประสงค์รวม
          <input value={purpose} onChange={(event) => setPurpose(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <div className="mt-3 overflow-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="text-slate-400"><tr><th>รายละเอียด</th><th>ประเภทเงิน</th><th>บัญชี</th>{kind === 'transfer' ? <th>บัญชีปลายทาง</th> : null}<th className="text-right">จำนวน</th><th></th></tr></thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="border-t border-slate-100">
                  <td className="py-2 pr-2"><input value={line.description} onChange={(event) => update(index, { description: event.target.value })} className="w-full rounded-lg border border-slate-200 px-2 py-1" /></td>
                  <td className="pr-2"><select value={line.moneyType} onChange={(event) => update(index, { moneyType: event.target.value as MoneyType })} className="rounded-lg border border-slate-200 px-2 py-1">{Object.entries(moneyLabel).filter(([id]) => id !== 'operational').map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></td>
                  <td className="pr-2"><select value={line.bankAccountId} onChange={(event) => update(index, { bankAccountId: event.target.value })} className="rounded-lg border border-slate-200 px-2 py-1">{active.map((bank) => <option key={bank.id} value={bank.id}>{bank.accountName}</option>)}</select></td>
                  {kind === 'transfer' ? <td className="pr-2"><select value={line.counterpartyBankAccountId} onChange={(event) => update(index, { counterpartyBankAccountId: event.target.value })} className="rounded-lg border border-slate-200 px-2 py-1"><option value="">เลือก</option>{active.map((bank) => <option key={bank.id} value={bank.id}>{bank.accountName}</option>)}</select></td> : null}
                  <td><input value={line.amount} onChange={(event) => update(index, { amount: event.target.value })} inputMode="decimal" className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right" /></td>
                  <td className="whitespace-nowrap pl-2">
                    <button type="button" onClick={() => setLines((current) => [...current, { ...line }])} className="text-[#2563EB]">คัดลอก</button>
                    <button type="button" onClick={() => setLines((current) => current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index))} className="ml-2 text-[#DC2626]">ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => setLines((current) => [...current, { description: '', moneyType: 'zakat', bankAccountId: active[0]?.id || '', counterpartyBankAccountId: '', amount: '', proofUrl: '' }])} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">เพิ่มรายการ</button>
          <div className="text-sm font-bold">รวม {baht(total)} · {lines.length} รายการ</div>
        </div>
        {error ? <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-[#DC2626]">{error}</div> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">บันทึกร่าง</button>
          <button type="button" disabled={busy} onClick={() => save('pending_review')} className="rounded-xl bg-[#0D9488] px-3 py-2 text-xs font-bold text-white">ส่งตรวจสอบ</button>
        </div>
      </form>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-bold text-[#0B2545]">เอกสารที่บันทึก</div>
        <div className="mt-3 max-h-80 space-y-3 overflow-auto">
          {docs.length === 0 ? <div className="text-xs text-slate-400">ยังไม่มีเอกสารหลายรายการ</div> : docs.map((doc) => (
            <div key={doc.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{doc.documentNo}</div>
                  <div className="text-[11px] text-slate-400">{doc.purpose} · {doc.lines.length} รายการ · {doc.preparedByName}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(doc.status, Boolean(doc.reversedAt))}`}>{statusLabel(doc.status, Boolean(doc.reversedAt))}</span>
              </div>
              <div className="mt-1 text-sm font-bold">{baht(doc.totalSatang / 100)}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {doc.status === 'pending_review' ? <button type="button" onClick={() => act(doc.id, 'movement_status', 'pending_approval')}>ส่งอนุมัติ</button> : null}
                {doc.status === 'pending_approval' && ['executive', 'super_admin'].includes(actor.role) ? <button type="button" onClick={() => act(doc.id, 'movement_status', 'approved')}>อนุมัติ</button> : null}
                {doc.status === 'approved' ? <button type="button" onClick={() => act(doc.id, 'post_movement')}>ลงสมุดบัญชี</button> : null}
                {doc.status === 'posted' && !doc.reversedAt ? <button type="button" onClick={() => act(doc.id, 'reverse_movement')}>กลับรายการ</button> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function maskNationalId(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 4) return '—';
  return `•••••••••${digits.slice(-4)}`;
}

function Popup({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-[#0B2545]">{title}</div>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-400">ปิด</button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

type AdminLine = { categoryId: string; description: string; amount: string; expenseDate: string; payeeName: string; paymentMethod: string; proofUrl: string; proofKind: string; documentNo: string };

export function AdminExpenseModal({ open, onClose, funds, banks, actor, onChanged }: { open: boolean; onClose: () => void; funds: FundAccount[]; banks: BankAccount[]; actor: Actor; onChanged?: () => void }) {
  const operational = funds.filter((fund) => fund.category === 'operational');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [fundId, setFundId] = useState(operational[0]?.id || '');
  const [source, setSource] = useState('');
  const [moneyType, setMoneyType] = useState<'operational_admin' | 'restricted'>('operational_admin');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState('');
  const blank = (): AdminLine => ({ categoryId: categories[0]?.id || '', description: '', amount: '', expenseDate: payDate, payeeName: '', paymentMethod: 'cash', proofUrl: '', proofKind: 'ใบเสร็จ', documentNo: '' });
  const [lines, setLines] = useState<AdminLine[]>([blank()]);
  const [docs, setDocs] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const total = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const field = 'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm';
  async function reload() {
    const response = await fetch('/api/finance/documents?view=admin');
    const body = await response.json();
    if (body.success) setDocs(body.data);
  }
  useEffect(() => {
    if (!open) return;
    reload();
    fetch('/api/finance/admin-expenses/categories').then((response) => response.json()).then((body) => {
      if (!body.success) return;
      const list = (body.data || []).filter((item: { code?: string }) => !String(item.code || '').startsWith('TASK6'));
      setCategories(list);
      setLines((current) => current.map((line) => line.categoryId ? line : { ...line, categoryId: list[0]?.id || '' }));
    });
  }, [open]);
  function validate() {
    if (!source) return 'ต้องเลือกบัญชีเงินต้นทาง';
    if (operational.length === 0) return 'ไม่พบกองทุนบริหาร';
    if (lines.length === 0) return 'ต้องมีอย่างน้อยหนึ่งรายการ';
    for (const line of lines) {
      if (!line.categoryId) return 'ต้องเลือกหมวดค่าใช้จ่ายจากข้อมูลหลัก';
      if (!line.description.trim()) return 'ต้องระบุรายละเอียดค่าใช้จ่าย';
      if (!(Number(line.amount) > 0)) return 'จำนวนเงินต้องมากกว่า 0';
      if (line.paymentMethod !== 'cash' && !line.proofUrl.trim()) return 'การจ่ายผ่านธนาคารต้องมีหลักฐาน';
    }
    return '';
  }
  async function save(review: boolean) {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError('');
    try {
      const saved = await call('save_admin', actor, {
        id: editingId || undefined,
        documentDate: payDate,
        fundAccountId: fundId,
        bankAccountId: source === 'cash' ? '' : source,
        moneyType,
        purpose: lines.map((line) => line.description.trim()).filter(Boolean).join(', '),
        notes: note,
        idempotencyKey: editingId ? undefined : crypto.randomUUID(),
        lines: lines.map((line) => ({ ...line, amount: Number(line.amount), expenseDate: payDate, notes: [line.proofKind, line.documentNo].filter(Boolean).join(' · ') })),
      });
      if (review) await call('admin_status', actor, { id: saved.id, status: 'pending_review' });
      setEditingId('');
      setLines([blank()]);
      setNote('');
      await reload();
      onChanged?.();
      if (review) onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  if (!open) return null;
  return (
    <Popup title="เพิ่มรายจ่ายบริหาร" subtitle="บันทึกค่าใช้จ่ายในการดำเนินงานของมูลนิธิ" onClose={onClose}>
      <div className="grid gap-4">
        <section className="grid gap-3 md:grid-cols-2">
          <div className="text-xs font-bold text-[#0B2545] md:col-span-2">ข้อมูลรายการ</div>
          <label className="text-xs text-slate-500">วันที่จ่าย<input type="date" value={payDate} onChange={(event) => setPayDate(event.target.value)} className={field} /></label>
          <label className="text-xs text-slate-500">ประเภทเงิน
            <select value={moneyType} onChange={(event) => setMoneyType(event.target.value as 'operational_admin' | 'restricted')} className={field}>
              <option value="operational_admin">เงินบริจาคเพื่อการบริหาร</option>
              <option value="restricted">เงินบริจาคเฉพาะวัตถุประสงค์</option>
            </select>
          </label>
          <label className="text-xs text-slate-500">บัญชีเงินต้นทาง
            <select value={source} onChange={(event) => setSource(event.target.value)} className={field}>
              <option value="">เลือกบัญชี</option>
              <option value="cash">เงินสดในมือ</option>
              {banks.filter((bank) => bank.status === 'active').map((bank) => <option key={bank.id} value={bank.id}>{bank.accountName}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500">กองทุน
            <select value={fundId} onChange={(event) => setFundId(event.target.value)} className={field}>
              {operational.map((fund) => <option key={fund.id} value={fund.id}>{fund.name}</option>)}
            </select>
          </label>
        </section>
        <div className="overflow-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-400"><tr><th className="px-2 py-2">หมวด</th><th>รายละเอียด</th><th>จำนวน</th><th>วิธีชำระ</th><th>ผู้รับเงิน</th><th>หลักฐาน</th><th></th></tr></thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="border-t border-slate-100">
                  <td className="px-2 py-2"><select value={line.categoryId} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, categoryId: event.target.value } : item))} className="rounded-lg border border-slate-200 px-2 py-1">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></td>
                  <td><input value={line.description} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} className="w-full rounded-lg border border-slate-200 px-2 py-1" /></td>
                  <td><input value={line.amount} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} inputMode="decimal" className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right" /></td>
                  <td><select value={line.paymentMethod} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, paymentMethod: event.target.value } : item))} className="rounded-lg border border-slate-200 px-2 py-1"><option value="cash">เงินสด</option><option value="bank_transfer">โอนธนาคาร</option><option value="cheque">เช็ค</option><option value="promptpay">พร้อมเพย์</option></select></td>
                  <td><input value={line.payeeName} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, payeeName: event.target.value } : item))} className="w-28 rounded-lg border border-slate-200 px-2 py-1" /></td>
                  <td>
                    <select value={line.proofKind} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, proofKind: event.target.value } : item))} className="mb-1 rounded-lg border border-slate-200 px-2 py-1"><option>ใบเสร็จ</option><option>ใบกำกับภาษี</option><option>หลักฐานการโอน</option><option>เอกสารประกอบอื่น</option></select>
                    <input value={line.proofUrl} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, proofUrl: event.target.value } : item))} placeholder="เลขที่หรือลิงก์หลักฐาน" className="w-36 rounded-lg border border-slate-200 px-2 py-1" />
                  </td>
                  <td>{lines.length > 1 ? <button type="button" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-[#DC2626]">ลบ</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setLines((current) => [...current, blank()])} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">เพิ่มรายการ</button>
          <div className="text-sm font-bold text-[#0B2545]">รวม {baht(total)}</div>
        </div>
        <label className="text-xs text-slate-500">หมายเหตุ<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} className={field} /></label>
        <p className="text-xs text-amber-700">เงินซะกาตไม่ถูกใช้เป็นค่าใช้จ่ายบริหาร ระบบรับเฉพาะกองทุนบริหารและประเภทเงินที่เลือกไว้</p>
        {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-[#DC2626]">{error}</div> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">ยกเลิก</button>
          <button type="button" disabled={busy} onClick={() => save(false)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">บันทึกร่าง</button>
          <button type="button" disabled={busy} onClick={() => save(true)} className="rounded-xl bg-[#F59E0B] px-3 py-2 text-sm font-bold text-white">ส่งตรวจสอบ</button>
        </div>
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {docs.filter((doc) => ['draft', 'pending_review', 'pending_approval', 'approved'].includes(doc.status)).map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-2 text-xs">
              <div><span className="font-semibold">{doc.documentNo}</span> · {doc.purpose} · {baht(doc.totalSatang / 100)}</div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${statusClass(doc.status, false)}`}>{statusLabel(doc.status, false)}</span>
                {doc.status === 'draft' ? <button type="button" onClick={() => { setEditingId(doc.id); setFundId(doc.fundAccountId); setMoneyType(doc.moneyType === 'restricted' ? 'restricted' : 'operational_admin'); setLines(doc.lines.map((line: any) => ({ categoryId: line.categoryId, description: line.description, amount: String(line.amountSatang / 100), expenseDate: payDate, payeeName: line.payeeName || '', paymentMethod: 'cash', proofUrl: '', proofKind: 'ใบเสร็จ', documentNo: '' }))); }} className="text-[#2563EB]">แก้ไข</button> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Popup>
  );
}

type AidLine = { applicationId: string; applicationNo: string; beneficiaryName: string; beneficiaryId: string; nationalId: string; asnaf: string; assistanceType: string; assistanceFormat: string; fundName: string; approvedAmount: number; paidAmount: number; remainingAmount: number; status: string; amount: string };

export function AssistancePaymentModal({ open, onClose, banks, actor }: { open: boolean; onClose: () => void; banks: BankAccount[]; actor: Actor }) {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<any[]>([]);
  const [lines, setLines] = useState<AidLine[]>([]);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState('');
  const [channel, setChannel] = useState<'cash' | 'bank_transfer' | 'cheque' | 'promptpay'>('cash');
  const [proofKind, setProofKind] = useState('หลักฐานการโอน');
  const [proof, setProof] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = 'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm';
  const total = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  async function search() {
    setError('');
    const response = await fetch(`/api/finance/documents?view=applications&q=${encodeURIComponent(query)}`);
    const body = await response.json();
    if (!body.success) { setError(body.error || 'ค้นหาไม่สำเร็จ'); return; }
    setFound(body.data);
  }
  function add(row: any) {
    if (lines.some((line) => line.applicationId === row.applicationId)) return;
    setLines((current) => [...current, { ...row, amount: String(row.remainingAmount || '') }]);
    setFound([]);
    setQuery('');
  }
  async function save(review: boolean) {
    if (!source) { setError('ต้องเลือกบัญชีเงินต้นทาง'); return; }
    if (lines.length === 0) { setError('ต้องเลือกคำร้องที่ได้รับอนุมัติอย่างน้อยหนึ่งรายการ'); return; }
    if (channel !== 'cash' && !proof.trim()) { setError('การจ่ายผ่านธนาคารต้องมีหลักฐาน'); return; }
    for (const line of lines) {
      const amount = Number(line.amount);
      if (!(amount > 0)) { setError(`จำนวนเงินของ ${line.applicationNo} ต้องมากกว่า 0`); return; }
      if (amount > line.remainingAmount + 0.001) { setError(`${line.applicationNo} จ่ายได้ไม่เกิน ${baht(line.remainingAmount)}`); return; }
    }
    setBusy(true);
    setError('');
    setMessage('');
    const created: string[] = [];
    try {
      for (const line of lines) {
        const response = await fetch('/api/finance/disbursements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actor,
            input: {
              applicationId: line.applicationId,
              amount: Number(line.amount),
              paymentMethod: channel,
              bankAccountId: source === 'cash' ? undefined : source,
              cashReceiverName: line.beneficiaryName,
              proofUrl: proof,
              notes: `${proofKind}${note ? ` · ${note}` : ''} · วันที่จ่าย ${payDate}`,
              submitForReview: review,
            },
          }),
        });
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error || `สร้างใบจ่ายของ ${line.applicationNo} ไม่สำเร็จ`);
        created.push(body.data.voucherNo);
      }
      setMessage(review ? `ส่งตรวจสอบแล้ว ${created.join(', ')} แต่ละคำร้องมีใบสำคัญของตัวเอง และยังไม่ตัดเงินจนกว่าจะมีผู้อนุมัติคนอื่น` : `บันทึกแบบร่าง ${created.join(', ')} ยังไม่ตัดเงิน`);
      setLines([]);
    } catch (reason) {
      setError(`${reason instanceof Error ? reason.message : 'บันทึกไม่สำเร็จ'}${created.length ? ` ใบที่บันทึกแล้ว: ${created.join(', ')}` : ''}`);
    } finally {
      setBusy(false);
    }
  }
  if (!open) return null;
  return (
    <Popup title="บันทึกการจ่ายเงินช่วยเหลือ" subtitle="บันทึกการจ่ายเงินตามคำร้องที่ได้รับอนุมัติแล้ว" onClose={onClose}>
      <div className="grid gap-4">
        <section>
          <div className="text-xs font-bold text-[#0B2545]">ค้นหาคำร้อง</div>
          <div className="mt-2 flex gap-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="เลขคำร้อง ชื่อ หรือเลขประจำตัว" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <button type="button" onClick={search} className="rounded-xl bg-[#0B2545] px-3 py-2 text-xs font-bold text-white">ค้นหา</button>
          </div>
          {found.length > 0 ? (
            <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-100">
              {found.map((row) => (
                <button key={row.applicationId} type="button" onClick={() => add(row)} className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm first:border-t-0">
                  <span className="font-semibold">{row.applicationNo}</span> · {row.beneficiaryName} · คงเหลือ {baht(row.remainingAmount)}
                </button>
              ))}
            </div>
          ) : null}
        </section>
        {lines.map((line, index) => (
          <section key={line.applicationId} className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-[#0B2545]">{line.applicationNo} · {line.beneficiaryName}</div>
              <button type="button" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-[#DC2626]">นำออก</button>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-slate-600 md:grid-cols-2">
              <div>ทะเบียน {line.beneficiaryId}</div>
              <div>เลขประจำตัว {maskNationalId(line.nationalId)}</div>
              <div>อัสนัฟ {line.asnaf || '—'}</div>
              <div>สถานะคำร้อง {line.status}</div>
              <div>ประเภท {line.assistanceType || '—'}</div>
              <div>รูปแบบ {line.assistanceFormat || '—'}</div>
              <div>กองทุน {line.fundName || '—'}</div>
              <div>อนุมัติ {baht(line.approvedAmount)} · จ่ายแล้ว {baht(line.paidAmount)} · คงเหลือ {baht(line.remainingAmount)}</div>
            </div>
            <label className="mt-2 block text-xs text-slate-500">จำนวนเงินที่จ่ายจริง
              <input value={line.amount} onChange={(event) => setLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} inputMode="decimal" className={field} />
            </label>
          </section>
        ))}
        <section className="grid gap-3 md:grid-cols-2">
          <div className="text-xs font-bold text-[#0B2545] md:col-span-2">รายละเอียดการจ่าย</div>
          <label className="text-xs text-slate-500">วันที่จ่าย<input type="date" value={payDate} onChange={(event) => setPayDate(event.target.value)} className={field} /></label>
          <label className="text-xs text-slate-500">วิธีจ่าย
            <select value={channel} onChange={(event) => setChannel(event.target.value as typeof channel)} className={field}>
              <option value="cash">เงินสด</option>
              <option value="bank_transfer">โอนธนาคาร</option>
              <option value="cheque">เช็ค</option>
              <option value="promptpay">พร้อมเพย์</option>
            </select>
          </label>
          <label className="text-xs text-slate-500 md:col-span-2">บัญชีเงินต้นทาง
            <select value={source} onChange={(event) => setSource(event.target.value)} className={field}>
              <option value="">เลือกบัญชี</option>
              <option value="cash">เงินสดในมือ</option>
              {banks.filter((bank) => bank.status === 'active').map((bank) => <option key={bank.id} value={bank.id}>{bank.accountName}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500">ประเภทหลักฐาน
            <select value={proofKind} onChange={(event) => setProofKind(event.target.value)} className={field}>
              <option>หลักฐานการโอน</option>
              <option>ใบรับเงิน</option>
              <option>รูปภาพการส่งมอบ</option>
              <option>เอกสารอื่น ๆ</option>
            </select>
          </label>
          <label className="text-xs text-slate-500">หลักฐาน<input value={proof} onChange={(event) => setProof(event.target.value)} className={field} /></label>
          <label className="text-xs text-slate-500 md:col-span-2">หมายเหตุ<input value={note} onChange={(event) => setNote(event.target.value)} className={field} /></label>
        </section>
        <div className="text-right text-sm font-bold">รวมที่จ่าย {baht(total)}</div>
        <p className="text-xs text-slate-500">อัสนัฟ ประเภท รูปแบบ และกองทุนมาจากคำร้องเดิม หน้านี้เปลี่ยนค่าเหล่านั้นไม่ได้ แต่ละคำร้องได้ใบสำคัญของตัวเองเพื่อกันจ่ายเกินวงเงิน</p>
        <p className="text-xs text-amber-700">ผู้สร้างใบสำคัญจ่ายยืนยันตัดเงินเองไม่ได้ ต้องให้ผู้อนุมัติอีกคนอนุมัติก่อนจึงจะลงบัญชี</p>
        {message ? <div className="rounded-xl bg-teal-50 px-3 py-2 text-xs text-[#0D9488]">{message}</div> : null}
        {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-[#DC2626]">{error}</div> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">ยกเลิก</button>
          <button type="button" disabled={busy} onClick={() => save(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">บันทึกร่าง</button>
          <button type="button" disabled={busy} onClick={() => save(true)} className="rounded-xl bg-[#0D9488] px-3 py-2 text-sm font-bold text-white">ส่งตรวจสอบ</button>
          <button type="button" onClick={() => setError('ผู้สร้างใบสำคัญจ่ายยืนยันการจ่ายเองไม่ได้ ต้องส่งตรวจสอบก่อน แล้วให้ผู้อนุมัติอีกคนอนุมัติ จึงจะลงบัญชีได้')} className="rounded-xl border border-[#0D9488] px-3 py-2 text-sm font-bold text-[#0D9488]">ยืนยันการจ่ายตามสิทธิ์</button>
        </div>
      </div>
    </Popup>
  );
}
