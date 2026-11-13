'use client';

import { useEffect, useMemo, useState } from 'react';

type Actor = { id: string; name: string; role: string };

type Kpi = {
  bank: { currentBalance: number };
  treasurer: { currentBalance: number; paidToStaff: number; refundReceived: number };
  staff: { receivedCash: number; actualDisbursed: number; refundedCash: number; currentBalance: number };
  casesWaiting?: number;
  casesPaid?: number;
};

type PayableCase = {
  id: string;
  workflowId: string;
  workflowNo: string;
  applicationNo: string;
  beneficiaryName: string;
  asnafCategory: string;
  assistanceType: string;
  approvedAmount: number;
  allocatedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installments: number;
  status: string;
};

const PAY_ROLES = ['officer', 'finance', 'super_admin', 'executive'];

function baht(value: number) {
  return `฿${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function caseStatus(status: string) {
  if (status === 'pending' || status === 'approved') return 'รอเบิกจ่าย';
  if (status === 'awaiting_payment') return 'เบิกเงินสำเร็จ';
  if (status === 'partial') return 'จ่ายบางส่วน';
  if (status === 'paid' || status === 'completed') return 'จ่ายแล้ว';
  if (status === 'refunded') return 'คืนเงิน';
  if (status === 'cancelled') return 'ยกเลิก';
  return status;
}

async function readFile(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.readAsDataURL(file);
  });
  return { url: dataUrl, name: file.name };
}

export function CashPositionCards() {
  const [kpi, setKpi] = useState<Kpi | null>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/finance/workflow-actions?view=kpi')
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success) setKpi(json.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  if (!kpi) return null;
  const cards = [
    ['บัญชี A ธนาคาร', kpi.bank.currentBalance, 'ยอดจริงในบัญชีธนาคาร'],
    ['บัญชี B เงินสดเหรัญญิก', kpi.treasurer.currentBalance, 'หลังโอนให้เจ้าหน้าที่'],
    ['บัญชี C เงินสดเจ้าหน้าที่', kpi.staff.currentBalance, 'ได้รับ − จ่ายจริง − คืนแล้ว'],
    ['ส่งมอบให้เจ้าหน้าที่', kpi.treasurer.paidToStaff, 'โอนภายในจากบัญชี B'],
    ['จ่ายจริงแก่ผู้รับ', kpi.staff.actualDisbursed, 'เกิดเมื่อยืนยันการจ่าย'],
    ['รอคืนจากเจ้าหน้าที่', kpi.staff.currentBalance, 'เงินสดที่ยังอยู่ในมือ'],
    ['เคสรอจ่าย', kpi.casesWaiting || 0, 'ยังไม่ยืนยันการจ่าย'],
    ['เคสจ่ายแล้ว', kpi.casesPaid || 0, 'จ่ายครบและยืนยันแล้ว'],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, hint]) => (
        <div key={label} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-2 text-lg font-bold text-[#0B2545]">{typeof value === 'number' && label.startsWith('เคส') ? value.toLocaleString('th-TH') : baht(Number(value))}</div>
          <div className="mt-1 text-[11px] text-slate-400">{hint}</div>
        </div>
      ))}
    </div>
  );
}

export function StaffCasePaymentPanel({ actor, onChanged }: { actor: Actor; onChanged?: () => void }) {
  const canPay = PAY_ROLES.includes(actor.role);
  const [rows, setRows] = useState<PayableCase[]>([]);
  const [banks, setBanks] = useState<Array<{ id: string; account_name: string }>>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState<PayableCase | null>(null);
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [payee, setPayee] = useState('');
  const [installments, setInstallments] = useState('1');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState<{ url: string; name: string } | null>(null);
  const [refundWorkflow, setRefundWorkflow] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDate, setRefundDate] = useState('');
  const [destination, setDestination] = useState('1020-01');
  const [receiver, setReceiver] = useState('');
  const [refundProof, setRefundProof] = useState<{ url: string; name: string } | null>(null);

  const load = async () => {
    const params = new URLSearchParams({ view: 'staff_cases', actorId: actor.id, actorName: actor.name, actorRole: actor.role });
    const res = await fetch(`/api/finance/workflow-actions?${params.toString()}`);
    const json = await res.json();
    if (json.success) setRows(json.data || []);
  };

  useEffect(() => {
    load().catch(() => setError('โหลดรายการจ่ายไม่สำเร็จ'));
    fetch('/api/finance/workflow-actions?view=bank_accounts')
      .then((res) => res.json())
      .then((json) => { if (json.success) setBanks(json.data || []); })
      .catch(() => undefined);
  }, [actor.id, actor.role]);

  const workflows = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => map.set(row.workflowId, row.workflowNo));
    return Array.from(map.entries());
  }, [rows]);

  const submitPay = async () => {
    if (!paying) return;
    setBusy(true);
    setError('');
    try {
      if (!proof) throw new Error('กรุณาแนบหลักฐานการจ่ายเงิน');
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay_case',
          actor,
          input: {
            itemId: paying.id,
            amount: Number(amount),
            paymentDate: payDate,
            paymentMethod: method,
            proofUrl: proof.url,
            proofName: proof.name,
            payeeName: payee || paying.beneficiaryName,
            totalInstallments: Number(installments || 1),
            notes,
            idempotencyKey: `${paying.id}-${payDate}-${amount}-${proof.name}`,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'บันทึกการจ่ายไม่สำเร็จ');
      setNotice(`บันทึกการจ่ายแล้ว งวด ${json.data.installmentLabel} คงเหลือ ${baht(json.data.remainingAmount)}`);
      setPaying(null);
      setProof(null);
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err.message || 'บันทึกการจ่ายไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const submitRefund = async () => {
    setBusy(true);
    setError('');
    try {
      if (!refundWorkflow) throw new Error('กรุณาเลือกรอบเบิก');
      if (!refundProof) throw new Error('กรุณาแนบหลักฐานการคืนเงิน');
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refund_staff_cash',
          actor,
          input: {
            workflowId: refundWorkflow,
            amount: Number(refundAmount),
            refundDate,
            destinationAccountId: destination,
            receiverName: receiver,
            proofUrl: refundProof.url,
            proofName: refundProof.name,
            notes,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'บันทึกการคืนเงินไม่สำเร็จ');
      setNotice(`คืนเงิน ${baht(json.data.amount)} เรียบร้อย เลขที่ ${json.data.refundNo}`);
      setRefundAmount('');
      setRefundProof(null);
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err.message || 'บันทึกการคืนเงินไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-3">
          <h3 className="text-base font-bold text-[#0B2545]">จ่ายเงินช่วยเหลือจากเงินสดเจ้าหน้าที่</h3>
          <p className="text-xs text-slate-500">เงินเข้าบัญชี C แล้ว แต่ละเคสยังรอจ่ายจนกว่าจะยืนยันยอดจริงและหลักฐาน</p>
        </div>
        {error ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        {notice ? <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div> : null}
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                {['ผู้รับ', 'เลขคำร้อง', 'รูปแบบ', 'อัสนัฟ', 'วงเงิน', 'ได้รับจากเหรัญญิก', 'จ่ายจริง', 'คงเหลือ', 'งวด', 'สถานะ', ''].map((head) => (
                  <th key={head} className="px-2 py-2 font-medium">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={11} className="px-2 py-8 text-center text-slate-400">ยังไม่มีเคสที่เบิกเงินสำเร็จและรอจ่าย</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-2 py-2 font-semibold text-slate-900">{row.beneficiaryName}</td>
                  <td className="px-2 py-2 font-mono text-xs">{row.applicationNo}</td>
                  <td className="px-2 py-2">{row.assistanceType}</td>
                  <td className="px-2 py-2">{row.asnafCategory}</td>
                  <td className="px-2 py-2 text-right">{baht(row.approvedAmount)}</td>
                  <td className="px-2 py-2 text-right">{baht(row.allocatedAmount)}</td>
                  <td className="px-2 py-2 text-right">{baht(row.paidAmount)}</td>
                  <td className="px-2 py-2 text-right font-semibold text-[#0D9488]">{baht(row.remainingAmount)}</td>
                  <td className="px-2 py-2 text-center">{row.installments}</td>
                  <td className="px-2 py-2">{caseStatus(row.status)}</td>
                  <td className="px-2 py-2">
                    {canPay ? (
                      <button
                        type="button"
                        className="rounded-xl bg-[#0D9488] px-3 py-2 text-xs font-bold text-white"
                        onClick={() => {
                          setPaying(row);
                          setAmount(String(row.remainingAmount));
                          setPayee(row.beneficiaryName);
                          setPayDate(new Date().toISOString().slice(0, 10));
                          setInstallments(String(Math.max(1, row.installments + 1)));
                          setProof(null);
                          setError('');
                        }}
                      >
                        บันทึกการจ่ายเงิน
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {paying ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <h4 className="font-bold text-[#0B2545]">ยืนยันการจ่าย {paying.applicationNo}</h4>
          <p className="mt-1 text-xs text-slate-500">{paying.beneficiaryName} · คงเหลือ {baht(paying.remainingAmount)} · รอบ {paying.workflowNo}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-500">จำนวนที่จ่ายจริง
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">วันที่จ่าย
              <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">วิธีจ่าย
              <select value={method} onChange={(e) => setMethod(e.target.value as 'cash' | 'bank_transfer')} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="cash">เงินสด</option>
                <option value="bank_transfer">โอนเงิน</option>
              </select>
            </label>
            <label className="text-xs text-slate-500">จำนวนงวดทั้งหมด
              <input value={installments} onChange={(e) => setInstallments(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">ผู้รับเงิน
              <input value={payee} onChange={(e) => setPayee(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">หลักฐานการจ่าย
              <input type="file" className="mt-1 w-full text-sm" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setProof(await readFile(file));
              }} />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={submitPay} className="rounded-xl bg-[#0B2545] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">ยืนยันการจ่าย</button>
            <button type="button" onClick={() => setPaying(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">ปิด</button>
          </div>
        </div>
      ) : null}

      {canPay ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <h4 className="font-bold text-[#0B2545]">คืนเงินสดคงเหลือ</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-500">รอบเบิก
              <select value={refundWorkflow} onChange={(e) => setRefundWorkflow(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">เลือกรอบเบิก</option>
                {workflows.map(([id, no]) => <option key={id} value={id}>{no}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-500">จำนวนที่คืน
              <input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">วันที่คืน
              <input type="date" value={refundDate} onChange={(e) => setRefundDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">บัญชีที่รับคืน
              <select value={destination} onChange={(e) => setDestination(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="1020-01">บัญชี B เงินสดเหรัญญิก</option>
                {banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.account_name}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-500">ผู้รับคืน
              <input value={receiver} onChange={(e) => setReceiver(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-500">หลักฐานการคืน
              <input type="file" className="mt-1 w-full text-sm" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setRefundProof(await readFile(file));
              }} />
            </label>
          </div>
          <button type="button" disabled={busy} onClick={submitRefund} className="mt-3 rounded-xl border border-[#0B2545] px-4 py-2 text-sm font-bold text-[#0B2545] disabled:opacity-50">ยืนยันการคืนเงิน</button>
        </div>
      ) : null}
    </div>
  );
}
