'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Plus, Search, Building2, Banknote, ArrowLeftRight, RefreshCw, TableProperties, Scale, History, Layers, FileText } from 'lucide-react';
import type { AsnafAllocation, BankAccount, CashFlowWorkflow, FinancialTransaction, FundAccount } from '@/types';
import { AdminExpenseModal, AssistancePaymentModal, CashPosition, MovementDocuments } from './FinanceDocuments';
import { CashCycle } from './CashCycleDialogs';
import { FinanceKpiCards, type KpiData } from './FinanceKpiCards';
import { FinanceMovementModalDeposit } from './FinanceMovementModalDeposit';
import { FinanceMovementModalWithdraw } from './FinanceMovementModalWithdraw';
import { FinanceMovementModalTransfer } from './FinanceMovementModalTransfer';
import { FinanceCashControlRegister, type RegisterItem } from './FinanceCashControlRegister';
import { FinanceThreeWayReconciliation, type ReconciliationData } from './FinanceThreeWayReconciliation';
import { FinanceModalCashAidDisburse } from './FinanceModalCashAidDisburse';
import { FinanceModalCashAdminExpense } from './FinanceModalCashAdminExpense';
import { FinanceBatchDisbursementModal } from './FinanceBatchDisbursementModal';
import { FinanceStaffBatchSettlementModal } from './FinanceStaffBatchSettlementModal';

function baht(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function financeInstant(value: string) {
  const match = String(value || '').match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (match) {
    let year = Number(match[3]);
    if (year > 2400) year -= 543;
    const date = new Date(year, Number(match[2]) - 1, Number(match[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function thaiDate(value: string) {
  const date = financeInstant(value);
  if (!date) return value || '—';
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Bangkok' }).format(date);
}

function inRange(value: string, from: string, to: string) {
  const instant = financeInstant(value);
  if (!instant) return !from && !to;
  if (from && instant < new Date(`${from}T00:00:00`)) return false;
  if (to && instant > new Date(`${to}T23:59:59`)) return false;
  return true;
}

function kindLabel(tx: FinancialTransaction) {
  const type = tx.type as string;
  if (type === 'income') return 'รับเงิน';
  if (type === 'expense') return 'ค่าบริหาร';
  if (type === 'disbursement') return 'ช่วยเหลือ';
  if (type === 'reversal') return 'กลับรายการ';
  if (type === 'bank_deposit' || type === 'deposit') return 'ฝากเงิน';
  if (type === 'bank_withdrawal' || type === 'withdrawal') return 'ถอนเงิน';
  if (type === 'bank_transfer_in' || type === 'bank_transfer_out' || type === 'transfer') return 'โอนระหว่างบัญชี';
  return tx.type;
}

function moneyLabel(value?: string) {
  if (value === 'zakat') return 'ซะกาต';
  if (value === 'sadaqah') return 'ศอดะเกาะห์';
  if (value === 'operational_admin' || value === 'operational') return 'เงินบริหาร';
  return value || 'ไม่ระบุ';
}

function accountLabel(tx: FinancialTransaction) {
  return tx.bankAccountName || tx.bankName || tx.fundName || '—';
}

function statusText(tx: FinancialTransaction) {
  if (tx.status === 'pending') return 'รอยืนยัน';
  if (tx.status === 'cancelled') return 'ยกเลิก';
  if (tx.status === 'reversed') return 'กลับรายการ';
  return 'ลงบัญชีแล้ว';
}

function statusClass(tx: FinancialTransaction) {
  if (tx.status === 'pending') return 'bg-amber-50 text-amber-700';
  if (tx.status === 'cancelled' || tx.status === 'reversed') return 'bg-slate-100 text-slate-500';
  return 'bg-emerald-50 text-emerald-700';
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white shadow-xs ${className}`}>{children}</section>;
}

function Navy({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-[#0B2545] px-4 py-4 text-white">
      <div className="text-xs text-slate-300">{label}</div>
      <div className="mt-2 text-xl font-bold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-slate-400">{hint}</div> : null}
    </div>
  );
}

function Light({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold tracking-tight text-[#0B2545]">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-slate-400">{hint}</div> : null}
    </div>
  );
}

function Dates({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (value: string) => void; onTo: (value: string) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
      ตั้งแต่
      <input type="date" value={from} onChange={(event) => onFrom(event.target.value)} className="bg-transparent text-sm text-slate-700 outline-none" />
      ถึง
      <input type="date" value={to} onChange={(event) => onTo(event.target.value)} className="bg-transparent text-sm text-slate-700 outline-none" />
    </label>
  );
}

function Pager({ page, count, total, size, onPage }: { page: number; count: number; total: number; size: number; onPage: (page: number) => void }) {
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  const pages = Array.from({ length: count }, (_, index) => index + 1).filter((item) => item === 1 || item === count || Math.abs(item - page) <= 1);
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
      <span>{from}-{to} จาก {total} รายการ</span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg px-2 py-1 disabled:opacity-30">‹</button>
        {pages.map((item, index) => (
          <span key={item} className="flex items-center">
            {index > 0 && item - pages[index - 1] > 1 ? <span className="px-1">…</span> : null}
            <button type="button" onClick={() => onPage(item)} className={`h-7 min-w-7 rounded-lg ${item === page ? 'bg-[#0B2545] text-white' : 'hover:bg-slate-100'}`}>{item}</button>
          </span>
        ))}
        <button type="button" disabled={page >= count} onClick={() => onPage(page + 1)} className="rounded-lg px-2 py-1 disabled:opacity-30">›</button>
      </div>
    </div>
  );
}

function downloadCsv(name: string, header: string[], rows: string[][]) {
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function AuditScreen({ rows, compactFilters = false }: { rows: FinancialTransaction[]; compactFilters?: boolean }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listed = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows.filter((tx) => {
      if (kind !== 'all' && tx.type !== kind) return false;
      if (status !== 'all' && tx.status !== status) return false;
      if (!inRange(tx.date, from, to)) return false;
      if (!keyword) return true;
      return `${tx.transactionNo} ${tx.payerOrPayee} ${tx.category} ${tx.fundName} ${tx.recordedBy}`.toLowerCase().includes(keyword);
    });
  }, [rows, query, kind, status, from, to]);
  const pageCount = Math.max(1, Math.ceil(listed.length / 8));
  const safe = Math.min(page, pageCount);
  const slice = listed.slice((safe - 1) * 8, safe * 8);
  const selected = listed.find((tx) => tx.id === selectedId) || listed[0] || null;
  const posted = rows.filter((tx) => tx.status === 'completed').length;
  const pending = rows.filter((tx) => tx.status === 'pending').length;
  const reversed = rows.filter((tx) => tx.status === 'reversed' || tx.status === 'cancelled').length;
  const events = selected ? [
    { title: 'บันทึกรายการ', who: selected.recordedBy, when: selected.date, note: selected.category },
    selected.verifiedBy ? { title: 'ตรวจรับ', who: selected.verifiedBy, when: selected.verifiedAt || '', note: '' } : null,
    selected.reversedBy ? { title: 'กลับรายการ', who: selected.reversedBy, when: selected.reversedAt || '', note: selected.reversalReason || '' } : null,
  ].filter((item): item is { title: string; who: string; when: string; note: string } => Boolean(item)) : [];

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {compactFilters ? null : <Dates from={from} to={to} onFrom={(value) => { setFrom(value); setPage(1); }} onTo={(value) => { setTo(value); setPage(1); }} />}
          <select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">ทุกประเภท</option>
            <option value="income">รับเงิน</option>
            <option value="disbursement">ช่วยเหลือ</option>
            <option value="expense">ค่าบริหาร</option>
            <option value="reversal">กลับรายการ</option>
          </select>
          {compactFilters ? null : (
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="all">ทุกสถานะ</option>
              <option value="completed">ลงบัญชีแล้ว</option>
              <option value="pending">รอยืนยัน</option>
              <option value="reversed">กลับรายการ</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          )}
          <button type="button" onClick={() => downloadCsv('audit.csv', ['เลขที่', 'วันที่', 'ประเภท', 'บัญชี', 'ประเภทเงิน', 'จำนวน', 'ผู้บันทึก', 'ผู้อนุมัติ', 'สถานะ'], listed.map((tx) => [tx.transactionNo, tx.date, kindLabel(tx), accountLabel(tx), moneyLabel(tx.moneyType), String(tx.amount), tx.recordedBy || '', tx.verifiedBy || '', statusText(tx)]))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">ส่งออก Excel</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          <Light label="ธุรกรรมทั้งหมด" value={String(rows.length)} />
          <Light label="ลงบัญชีแล้ว" value={String(posted)} />
          <Light label="รอยืนยัน" value={String(pending)} />
          <Light label="กลับรายการ" value={String(reversed)} />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ค้นหาเลขที่ ชื่อผู้เกี่ยวข้อง หรือหมวด" className="w-full bg-transparent py-2.5 text-sm outline-none" />
        </div>
        <Card>
          <div className="px-4 py-3 text-sm font-bold">ประวัติธุรกรรม {listed.length} รายการ</div>
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">เลขที่</th>
                  <th className="px-4 py-2 font-medium">วันที่</th>
                  <th className="px-4 py-2 font-medium">ประเภท</th>
                  <th className="px-4 py-2 font-medium">บัญชี</th>
                  <th className="px-4 py-2 font-medium">ประเภทเงิน</th>
                  <th className="px-4 py-2 text-right font-medium">จำนวน</th>
                  <th className="px-4 py-2 font-medium">ผู้บันทึก</th>
                  <th className="px-4 py-2 font-medium">ผู้อนุมัติ</th>
                  <th className="px-4 py-2 font-medium">สถานะ</th>
                  <th className="px-4 py-2 font-medium">หลักฐาน</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((tx) => (
                  <tr key={tx.id} onClick={() => setSelectedId(tx.id)} className={`cursor-pointer border-t border-slate-100 ${selected?.id === tx.id ? 'bg-emerald-50/70' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3 text-xs">{tx.transactionNo}</td>
                    <td className="px-4 py-3 text-xs">{thaiDate(tx.date)}</td>
                    <td className="px-4 py-3">{kindLabel(tx)}<div className="text-[11px] text-slate-400">{tx.category}</div></td>
                    <td className="px-4 py-3 text-xs">{accountLabel(tx)}</td>
                    <td className="px-4 py-3 text-xs">{moneyLabel(tx.moneyType)}</td>
                    <td className="px-4 py-3 text-right font-bold">{baht(tx.amount)}</td>
                    <td className="px-4 py-3 text-xs">{tx.recordedBy || '—'}</td>
                    <td className="px-4 py-3 text-xs">{tx.verifiedBy || '—'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(tx)}`}>{statusText(tx)}</span></td>
                    <td className="px-4 py-3 text-xs">
                      {tx.receiptUrl || tx.slipUrl ? (
                        <a href={tx.receiptUrl || tx.slipUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#0D9488]" onClick={(event) => event.stopPropagation()}>ดูหลักฐาน</a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {slice.length === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-400">ไม่มีรายการตามเงื่อนไข</div> : null}
          </div>
          <Pager page={safe} count={pageCount} total={listed.length} size={8} onPage={setPage} />
        </Card>
      </div>
      <Card className="p-4">
        <div className="text-sm font-bold">ประวัติการตรวจสอบ</div>
        {selected ? (
          <div className="mt-3 space-y-3 text-sm">
            <div className="font-semibold">{selected.transactionNo}</div>
            <div className="text-xs text-slate-500">{selected.payerOrPayee} · {accountLabel(selected)} · {moneyLabel(selected.moneyType)}</div>
            <div className="text-lg font-bold">{baht(selected.amount)}</div>
            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(selected)}`}>{statusText(selected)}</span>
            <div className="text-xs text-slate-500">ผู้บันทึก {selected.recordedBy || '—'} · ผู้อนุมัติ {selected.verifiedBy || '—'}</div>
            {selected.receiptUrl || selected.slipUrl ? <a href={selected.receiptUrl || selected.slipUrl} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-[#0D9488]">เปิดหลักฐานประกอบ</a> : <div className="text-xs text-slate-400">ไม่มีหลักฐานประกอบ</div>}
            <div className="space-y-3 border-t border-slate-100 pt-3">
              {events.map((event) => (
                <div key={event.title} className="text-xs">
                  <div className="font-semibold text-slate-700">{event.title}</div>
                  <div className="text-slate-500">{event.who || '—'} · {event.when ? thaiDate(event.when) : ''}</div>
                  {event.note ? <div className="text-slate-400">{event.note}</div> : null}
                </div>
              ))}
            </div>
            {selected.referenceNo ? <div className="text-xs text-slate-500">เลขอ้างอิง {selected.referenceNo}</div> : null}
            {selected.notes ? <p className="text-xs text-slate-600">{selected.notes}</p> : null}
          </div>
        ) : <p className="mt-4 text-sm text-slate-400">ยังไม่มีรายการ</p>}
      </Card>
    </div>
  );
}

function paymentLabel(value?: string) {
  if (value === 'bank_transfer') return 'โอนผ่านธนาคาร';
  if (value === 'promptpay_qr') return 'พร้อมเพย์';
  if (value === 'cash') return 'เงินสด';
  return value || '—';
}

type StatusTone = 'success' | 'pending' | 'processing' | 'rejected' | 'idle';

function StatusBadge({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  const toneClass = {
    success: 'bg-teal-50 text-[#0D9488]',
    pending: 'bg-amber-50 text-amber-700',
    processing: 'bg-blue-50 text-[#2563EB]',
    rejected: 'bg-red-50 text-[#DC2626]',
    idle: 'bg-slate-100 text-[#64748B]',
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}>{children}</span>;
}

function stepTone(status: string): { tone: StatusTone; label: string } {
  if (status === 'completed' || status === 'received') return { tone: 'success', label: 'ดำเนินการแล้ว' };
  if (status === 'approved') return { tone: 'processing', label: 'อนุมัติแล้ว' };
  if (status === 'pending_approval' || status === 'pending' || status === 'draft') return { tone: 'pending', label: status === 'draft' ? 'แบบร่าง' : 'รอตรวจสอบ' };
  if (status === 'cancelled') return { tone: 'rejected', label: 'ยกเลิก' };
  return { tone: 'idle', label: 'ยังไม่เริ่ม' };
}

function workflowBadge(wf: CashFlowWorkflow) {
  if (wf.overallStatus === 'cancelled' || wf.step1Status === 'cancelled') return { tone: 'rejected' as StatusTone, label: 'ยกเลิก' };
  if (wf.overallStatus === 'completed') return { tone: 'success' as StatusTone, label: 'ปิดรายการแล้ว' };
  return stepTone(wf.step1Status);
}

function movementTimeline(wf: CashFlowWorkflow) {
  const cancelled = wf.overallStatus === 'cancelled' || wf.step1Status === 'cancelled';
  const approved = wf.step1Status === 'approved' || wf.step1Status === 'completed';
  const sent = wf.step1Status === 'pending_approval' || approved;
  const withdrawn = wf.step1Status === 'completed';
  const proved = withdrawn && Boolean(wf.step1ProofUrl);
  const handed = wf.step2Status === 'received' || wf.step2Status === 'completed';
  const closed = wf.overallStatus === 'completed';
  const items = [
    { title: 'สร้างคำขอถอน', who: wf.step1OperatorName, done: true },
    { title: 'ส่งเหรัญญิกตรวจสอบ', who: wf.step2TreasurerName, done: sent },
    { title: 'เหรัญญิกอนุมัติ', who: approved ? wf.step1ApproverName || '' : '', done: approved },
    { title: 'ถอนเงินจากธนาคาร', who: withdrawn ? wf.step1OperatorName : '', done: withdrawn },
    { title: 'แนบหลักฐานการถอน', who: proved ? wf.step1OperatorName : '', done: proved },
    { title: 'ส่งมอบเงินให้เหรัญญิก', who: handed ? wf.step2HandoverPersonName || wf.step1OperatorName : wf.step2TreasurerName, done: handed },
    { title: 'เหรัญญิกยืนยันรับเงิน', who: handed ? wf.step2TreasurerName : '', done: handed },
    { title: 'ปิดรายการและส่งต่อยอด', who: closed ? wf.step5AuditorName || '' : '', done: closed },
  ];
  const current = items.findIndex((item) => !item.done);
  return items.map((item, index) => {
    const tone: StatusTone = cancelled && !item.done ? 'rejected' : item.done ? 'success' : index === current ? 'pending' : 'idle';
    const label = cancelled && !item.done ? 'ยกเลิก' : item.done ? 'ดำเนินการแล้ว' : index === current ? 'รอดำเนินการ' : 'ยังไม่เริ่ม';
    return { ...item, tone, label };
  });
}

export function MovementScreen({
  rows,
  bankTotal,
  cash,
  banks,
  actor,
  onChanged,
}: {
  rows: FinancialTransaction[];
  bankTotal: number;
  cash: number;
  banks: BankAccount[];
  actor: { id: string; name: string; role: string };
  onChanged?: () => void;
}) {
  // Views & Modals state
  const [activeView, setActiveView] = useState<'register' | 'reconciliation' | 'movements'>('register');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAidModalOpen, setIsAidModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isBatchCreateOpen, setIsBatchCreateOpen] = useState(false);
  const [settlementWorkflowId, setSettlementWorkflowId] = useState<string | null>(null);

  // Data State
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [loadingKpi, setLoadingKpi] = useState(true);

  const [reconcileData, setReconcileData] = useState<ReconciliationData | null>(null);
  const [loadingReconcile, setLoadingReconcile] = useState(true);

  const [registerItems, setRegisterItems] = useState<RegisterItem[]>([]);
  const [registerTab, setRegisterTab] = useState('all');
  const [registerSearch, setRegisterSearch] = useState('');
  const [loadingRegister, setLoadingRegister] = useState(true);

  // Movement history state
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'transfer'>('withdraw');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [money, setMoney] = useState('all');
  const [bankId, setBankId] = useState('all');
  const [branch, setBranch] = useState('all');
  const [status, setStatus] = useState('all');
  const [workflows, setWorkflows] = useState<CashFlowWorkflow[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [flowError, setFlowError] = useState('');
  const [busy, setBusy] = useState(false);

  // Fetch KPI
  async function loadKpi() {
    setLoadingKpi(true);
    try {
      const res = await fetch('/api/finance/workflow-actions?view=kpi');
      const body = await res.json();
      if (body.success && body.data) setKpiData(body.data);
    } catch (e) {
      console.error('Error loading KPI balances:', e);
    } finally {
      setLoadingKpi(false);
    }
  }

  // Fetch Reconciliation
  async function loadReconciliation() {
    setLoadingReconcile(true);
    try {
      const res = await fetch('/api/finance/workflow-actions?view=reconciliation');
      const body = await res.json();
      if (body.success && body.data) setReconcileData(body.data);
    } catch (e) {
      console.error('Error loading reconciliation:', e);
    } finally {
      setLoadingReconcile(false);
    }
  }

  // Fetch Register
  async function loadRegister() {
    setLoadingRegister(true);
    try {
      const p = new URLSearchParams({ view: 'register', tab: registerTab, search: registerSearch });
      const res = await fetch(`/api/finance/workflow-actions?${p.toString()}`);
      const body = await res.json();
      if (body.success && body.data) setRegisterItems(body.data);
    } catch (e) {
      console.error('Error loading register:', e);
    } finally {
      setLoadingRegister(false);
    }
  }

  // Fetch Workflows
  async function loadWorkflows(preferId?: string) {
    setLoadingFlows(true);
    setFlowError('');
    try {
      const response = await fetch('/api/finance/cash-flow');
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'โหลดคำขอเคลื่อนย้ายไม่สำเร็จ');
      const list = (body.data || []) as CashFlowWorkflow[];
      setWorkflows(list);
      setWorkflowId((current) => preferId || current || list[0]?.id || null);
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'โหลดคำขอเคลื่อนย้ายไม่สำเร็จ');
    } finally {
      setLoadingFlows(false);
    }
  }

  function refreshAll() {
    loadKpi();
    loadReconciliation();
    loadRegister();
    loadWorkflows();
    onChanged?.();
  }

  useEffect(() => {
    loadKpi();
    loadReconciliation();
    loadWorkflows();
  }, []);

  useEffect(() => {
    loadRegister();
  }, [registerTab, registerSearch]);

  const posted = rows.filter((tx) => tx.status !== 'cancelled');
  const deposits = posted.filter((tx) => tx.type === 'income');
  const transfers = posted.filter((tx) => (tx.type as string) === 'transfer' || (tx.type as string) === 'bank_transfer_out' || (tx.type as string) === 'bank_transfer_in');
  const pool = tab === 'deposit' ? deposits : transfers;
  const moneyTypes = Array.from(new Set(rows.map((tx) => tx.moneyType).filter((value): value is NonNullable<FinancialTransaction['moneyType']> => Boolean(value))));

  const visible = pool.filter((tx) => {
    if (!inRange(tx.date, from, to)) return false;
    if (money !== 'all' && tx.moneyType !== money) return false;
    if (bankId !== 'all' && tx.bankAccountId !== bankId) return false;
    if (status !== 'all' && tx.status !== status) return false;
    const q = query.trim().toLowerCase();
    if (q && !`${tx.transactionNo} ${tx.payerOrPayee} ${tx.category} ${tx.referenceNo} ${tx.fundName}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const selected = visible.find((tx) => tx.id === selectedId) || visible[0] || null;
  const field = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none';
  const bankOf = (id?: string) => banks.find((bank) => bank.id === id);
  const branches = Array.from(new Set(banks.map((bank) => bank.branchName).filter((value): value is string => Boolean(value))));
  const canCreate = ['finance', 'super_admin', 'executive'].includes(actor.role);
  const canApprove = ['executive', 'super_admin'].includes(actor.role);

  const visibleFlows = workflows.filter((wf) => {
    const bank = bankOf(wf.step1BankAccountId);
    if (branch !== 'all' && bank?.branchName !== branch) return false;
    if (bankId !== 'all' && wf.step1BankAccountId !== bankId) return false;
    if (money !== 'all' && wf.step1FundType !== money && !(money === 'operational_admin' && wf.step1FundType === 'admin')) return false;
    if (status === 'pending' && wf.step1Status !== 'pending_approval' && wf.step1Status !== 'draft') return false;
    if (status === 'completed' && wf.step1Status !== 'completed' && wf.overallStatus !== 'completed') return false;
    if (status === 'reversed' && wf.step1Status !== 'cancelled' && wf.overallStatus !== 'cancelled') return false;
    if (!inRange(wf.step1EventDate || wf.step1Date, from, to)) return false;
    const keyword = query.trim().toLowerCase();
    if (keyword && !`${wf.workflowNo} ${wf.title} ${wf.step1OperatorName} ${wf.step1Notes || ''}`.toLowerCase().includes(keyword)) return false;
    return true;
  });

  const selectedFlow = visibleFlows.find((wf) => wf.id === workflowId) || visibleFlows[0] || null;

  async function mutateFlow(method: 'POST' | 'PUT' | 'DELETE', payload?: Record<string, unknown>, removeId?: string) {
    setBusy(true);
    setFlowError('');
    try {
      const response = await fetch(method === 'DELETE'
        ? `/api/finance/cash-flow?${new URLSearchParams({ workflowId: removeId || '', actorId: actor.id, actorName: actor.name, actorRole: actor.role })}`
        : '/api/finance/cash-flow', {
        method,
        headers: method === 'DELETE' ? undefined : { 'Content-Type': 'application/json' },
        body: method === 'DELETE' ? undefined : JSON.stringify({ ...payload, actor }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'บันทึกไม่สำเร็จ');
      return body;
    } finally {
      setBusy(false);
    }
  }

  async function advance(next: 'pending_approval' | 'approved' | 'completed') {
    if (!selectedFlow) return;
    if (next === 'completed' && !window.confirm('ยืนยันการถอนจากธนาคาร ระบบจะตัดยอดบัญชีและบันทึกสมุดบัญชี')) return;
    try {
      await mutateFlow('PUT', { step: 1, workflowId: selectedFlow.id, input: { status: next, proofUrl: selectedFlow.step1ProofUrl, notes: selectedFlow.step1Notes } });
      await loadWorkflows(selectedFlow.id);
      refreshAll();
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ');
    }
  }

  async function removeDraft() {
    if (!selectedFlow) return;
    try {
      await mutateFlow('DELETE', undefined, selectedFlow.id);
      setWorkflowId(null);
      await loadWorkflows();
      refreshAll();
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'ลบแบบร่างไม่สำเร็จ');
    }
  }

  function exportVisible() {
    const source = tab === 'withdraw' ? visibleFlows : visible;
    downloadCsv(`movements-${tab}.csv`, ['เลขที่', 'วันที่', 'ประเภท', 'ผู้เกี่ยวข้อง', 'จำนวน', 'สถานะ'], source.map((item) => 'workflowNo' in item
      ? [item.workflowNo, item.step1Date, 'ถอน', item.step1OperatorName, String(item.step1WithdrawAmount), workflowBadge(item).label]
      : [item.transactionNo, item.date, kindLabel(item), item.payerOrPayee, String(item.amount), statusText(item)]));
  }

  return (
    <div className="space-y-6">
      {/* ================================================== */}
      {/* TOP HEADER: 3 PRIMARY ACTION BUTTONS & VIEW SWITCH */}
      {/* ================================================== */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-teal-700">กลุ่มงานเหรัญญิก</div>
          <h1 className="text-xl font-extrabold text-slate-800">
            ฝาก ถอน โอน (Deposit, Withdrawal & Transfer)
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            บริหารเงินในบัญชี A ธนาคาร, บัญชี B เงินสดเหรัญญิก และบัญชี C เงินสดเจ้าหน้าที่
          </p>
          <Link href="/finance/disbursement-approval" className="mt-1 inline-flex text-xs font-semibold text-[#0D9488]">
            งานอนุมัติรอบเบิกอยู่หน้าถัดไปในกลุ่มเดียวกัน
          </Link>
        </div>

        {/* 3 Prominent Colored Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Button 1: ฝากเงิน (Teal #0D9488) */}
          <button
            type="button"
            onClick={() => setIsDepositOpen(true)}
            className="zms-action inline-flex items-center gap-2 rounded-2xl bg-[#0D9488] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-700/20 transition hover:bg-[#0f766e] active:scale-[0.98]"
          >
            <Building2 className="h-4 w-4" />
            ฝากเงิน
          </button>

          {/* Button 2: ถอนเงิน (Amber #D97706) */}
          <button
            type="button"
            onClick={() => setIsWithdrawOpen(true)}
            className="zms-action inline-flex items-center gap-2 rounded-2xl bg-[#D97706] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-700/20 transition hover:bg-[#b45309] active:scale-[0.98]"
          >
            <Banknote className="h-4 w-4" />
            ถอนเงิน
          </button>

          {/* Button 3: โอนเงิน (Blue #2563EB) */}
          <button
            type="button"
            onClick={() => setIsTransferOpen(true)}
            className="zms-action inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-700/20 transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <ArrowLeftRight className="h-4 w-4" />
            โอนเงิน
          </button>

          {/* Button 4: สร้างรอบเบิกเงิน (Batch Disbursement) */}
          <button
            type="button"
            onClick={() => setIsBatchCreateOpen(true)}
            className="zms-action inline-flex items-center gap-2 rounded-2xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-900/20 transition hover:bg-teal-900 active:scale-[0.98]"
          >
            <Layers className="h-4 w-4" />
            สร้างรอบเบิกเงิน (Batch)
          </button>

          <button
            type="button"
            onClick={refreshAll}
            className="zms-action rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            title="รีเฟรชข้อมูลทั้งหมด"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ================================================== */}
      {/* 3 KPI ACCOUNT CARDS (BANK, TREASURER, STAFF CASH)  */}
      {/* ================================================== */}
      <FinanceKpiCards data={kpiData} loading={loadingKpi} />

      {/* ================================================== */}
      {/* WORKSPACE VIEW SELECTOR TABS                       */}
      {/* ================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('register')}
            className={`zms-action inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
              activeView === 'register'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TableProperties className="h-4 w-4 shrink-0" />
            ทะเบียนควบคุมการเบิกและตัดยอดเงินสด
          </button>

          <button
            type="button"
            onClick={() => setActiveView('reconciliation')}
            className={`zms-action inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
              activeView === 'reconciliation'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Scale className="h-4 w-4 shrink-0" />
            การกระทบยอด 3 ทาง (Reconciliation)
            {reconcileData?.isBalanced && (
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveView('movements')}
            className={`zms-action inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
              activeView === 'movements'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History className="h-4 w-4 shrink-0" />
            ประวัติธุรกรรมและการเคลื่อนไหว
          </button>
        </div>
      </div>

      {/* ================================================== */}
      {/* VIEW CONTENT                                       */}
      {/* ================================================== */}
      {activeView === 'register' && (
        <FinanceCashControlRegister
          items={registerItems}
          activeTab={registerTab}
          onTabChange={setRegisterTab}
          searchQuery={registerSearch}
          onSearchChange={setRegisterSearch}
          onRefresh={refreshAll}
          onOpenAidModal={() => setIsAidModalOpen(true)}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
          onOpenCreateBatch={() => setIsBatchCreateOpen(true)}
          onOpenSettlement={(id) => setSettlementWorkflowId(id)}
        />
      )}

      {activeView === 'reconciliation' && (
        <FinanceThreeWayReconciliation
          data={reconcileData}
          loading={loadingReconcile}
          onRefresh={refreshAll}
        />
      )}

      {activeView === 'movements' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={exportVisible}
              className="zms-action inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <Download className="h-4 w-4" />
              ส่งออก
            </button>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <label className="text-[11px] text-slate-400">
              ช่วงวันที่
              <span className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 px-2">
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="w-full bg-transparent py-2 text-xs outline-none"
                />
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="w-full bg-transparent py-2 text-xs outline-none"
                />
              </span>
            </label>
            <label className="text-[11px] text-slate-400">
              ประเภทเงิน
              <select value={money} onChange={(event) => setMoney(event.target.value)} className={field}>
                <option value="all">ทุกประเภท</option>
                {moneyTypes.map((item) => (
                  <option key={item} value={item}>
                    {moneyTypeText(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-slate-400">
              บัญชีธนาคาร
              <select value={bankId} onChange={(event) => setBankId(event.target.value)} className={field}>
                <option value="all">ทุกบัญชี</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bankName} · {bank.accountName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-slate-400">
              สถานะ
              <select value={status} onChange={(event) => setStatus(event.target.value)} className={field}>
                <option value="all">ทุกสถานะ</option>
                <option value="pending">รอตรวจสอบ</option>
                <option value="completed">ลงบัญชีแล้ว</option>
                <option value="reversed">ยกเลิก</option>
              </select>
            </label>
            <label className="text-[11px] text-slate-400">
              สาขา
              <select value={branch} onChange={(event) => setBranch(event.target.value)} className={field}>
                <option value="all">ทุกสาขา</option>
                {branches.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-slate-400">
              ค้นหา
              <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="เลขที่ ชื่อ หรือหมวด"
                  className="w-full bg-transparent py-2 text-sm outline-none"
                />
              </span>
            </label>
          </div>

          {flowError ? (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-[#DC2626]">{flowError}</div>
          ) : null}

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card>
              <div className="flex border-b border-slate-100">
                {([
                  ['deposit', 'ฝาก', deposits.length],
                  ['withdraw', 'ถอน', visibleFlows.length],
                  ['transfer', 'โอน', transfers.length],
                ] as const).map(([id, label, count]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setTab(id);
                      setSelectedId(null);
                    }}
                    className={`flex-1 px-4 py-3 text-sm font-semibold ${
                      tab === id ? 'border-b-2 border-[#0D9488] text-[#0D9488]' : 'text-slate-500'
                    }`}
                  >
                    {label} <span className="text-[11px] font-medium text-slate-400">{count}</span>
                  </button>
                ))}
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                {tab === 'withdraw' ? (
                  loadingFlows ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">กำลังโหลดคำขอ</div>
                  ) : visibleFlows.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-400">ไม่มีคำขอถอนตามเงื่อนไข</div>
                  ) : (
                    visibleFlows.map((wf, wfIdx) => {
                      const badge = workflowBadge(wf);
                      return (
                        <button
                          key={`wf-${wf.id}-${wfIdx}`}
                          type="button"
                          onClick={() => setWorkflowId(wf.id)}
                          className={`block w-full border-t border-slate-100 px-4 py-3 text-left ${
                            selectedFlow?.id === wf.id ? 'bg-emerald-50/70' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-[#0e2744]">{wf.workflowNo}</div>
                              <div className="text-[11px] text-slate-400">
                                {wf.title} · {wf.step1OperatorName}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{baht(wf.step1WithdrawAmount)}</div>
                              <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )
                ) : visible.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">ไม่มีรายการตามเงื่อนไข</div>
                ) : (
                  visible.map((tx, txIdx) => (
                    <button
                      key={`tx-${tx.id}-${txIdx}`}
                      type="button"
                      onClick={() => setSelectedId(tx.id)}
                      className={`block w-full border-t border-slate-100 px-4 py-3 text-left ${
                        selected?.id === tx.id ? 'bg-emerald-50/70' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[#0e2744]">{tx.transactionNo}</div>
                          <div className="text-[11px] text-slate-400">
                            {tx.category || kindLabel(tx)} · {tx.payerOrPayee}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{baht(tx.amount)}</div>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                              tx
                            )}`}
                          >
                            {statusText(tx)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-4">
              {tab === 'withdraw' && selectedFlow ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#0e2744]">{selectedFlow.workflowNo}</div>
                      <div className="mt-1 text-xs text-slate-500">{selectedFlow.title}</div>
                    </div>
                    <StatusBadge tone={workflowBadge(selectedFlow).tone}>
                      {workflowBadge(selectedFlow).label}
                    </StatusBadge>
                  </div>
                  <div className="rounded-2xl bg-[#0B2545] px-4 py-4 text-white">
                    <div className="text-[11px] text-slate-300">จำนวนคำขอถอน</div>
                    <div className="mt-1 text-xl font-bold">{baht(selectedFlow.step1WithdrawAmount)}</div>
                  </div>
                  <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <div>
                      บัญชี{' '}
                      <span className="font-semibold text-slate-700">
                        {selectedFlow.step1BankAccountName ||
                          bankOf(selectedFlow.step1BankAccountId)?.accountName ||
                          '—'}
                      </span>
                    </div>
                    <div>
                      ประเภทเงิน{' '}
                      <span className="font-semibold text-slate-700">
                        {moneyTypeText(selectedFlow.step1FundType || '')}
                      </span>
                    </div>
                    <div>
                      ผู้ทำรายการ{' '}
                      <span className="font-semibold text-slate-700">
                        {selectedFlow.step1OperatorName || '—'}
                      </span>
                    </div>
                    <div>
                      เหรัญญิก{' '}
                      <span className="font-semibold text-slate-700">
                        {selectedFlow.step2TreasurerName || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {movementTimeline(selectedFlow).map((step, index) => (
                      <div key={`step-${step.title}-${index}`} className="flex gap-3">
                        <div
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            step.tone === 'success'
                              ? 'bg-[#0D9488] text-white'
                              : step.tone === 'pending'
                              ? 'bg-[#F59E0B] text-white'
                              : step.tone === 'rejected'
                              ? 'bg-[#DC2626] text-white'
                              : 'bg-slate-200 text-[#64748B]'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-[#0B2545]">{step.title}</div>
                            <StatusBadge tone={step.tone}>{step.label}</StatusBadge>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {step.who || 'ยังไม่ระบุผู้รับผิดชอบ'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedFlow.step1ProofUrl ? (
                    <a
                      href={selectedFlow.step1ProofUrl}
                      className="block truncate text-xs font-semibold text-[#0D9488]"
                      target="_blank"
                      rel="noreferrer"
                    >
                      หลักฐาน: {selectedFlow.step1ProofName || selectedFlow.step1ProofUrl}
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400">ยังไม่มีหลักฐานการถอน</p>
                  )}
                  {selectedFlow.step1Notes ? (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {selectedFlow.step1Notes}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {selectedFlow.step1Status === 'draft' && canCreate ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => advance('pending_approval')}
                        className="rounded-xl bg-[#F59E0B] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        ส่งให้ตรวจสอบ
                      </button>
                    ) : null}
                    {selectedFlow.step1Status === 'pending_approval' && canApprove ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => advance('approved')}
                        className="rounded-xl bg-[#2563EB] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        อนุมัติ
                      </button>
                    ) : null}
                    {selectedFlow.step1Status === 'approved' && canCreate ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => advance('completed')}
                        className="rounded-xl bg-[#0D9488] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        ยืนยันถอนจากธนาคาร
                      </button>
                    ) : null}
                    {(selectedFlow.step1Status === 'draft' ||
                      selectedFlow.step1Status === 'pending_approval') &&
                    canCreate ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={removeDraft}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-[#DC2626] disabled:opacity-50"
                      >
                        ลบแบบร่าง
                      </button>
                    ) : null}
                  </div>
                  <CashCycle
                    workflow={selectedFlow}
                    actor={actor}
                    onChanged={() => {
                      loadWorkflows(selectedFlow.id);
                      refreshAll();
                    }}
                  />
                </div>
              ) : tab === 'withdraw' ? (
                <p className="text-sm text-slate-400">ไม่มีคำขอให้เปิด</p>
              ) : selected ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#0e2744]">{selected.transactionNo}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {kindLabel(selected)} · {selected.category || '—'}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(
                        selected
                      )}`}
                    >
                      {statusText(selected)}
                    </span>
                  </div>
                  <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <div>
                      วันที่ <span className="font-semibold text-slate-700">{thaiDate(selected.date)}</span>
                    </div>
                    <div>
                      ช่องทาง{' '}
                      <span className="font-semibold text-slate-700">
                        {paymentLabel(selected.paymentMethod)}
                      </span>
                    </div>
                    <div>
                      ผู้เกี่ยวข้อง{' '}
                      <span className="font-semibold text-slate-700">
                        {selected.payerOrPayee || '—'}
                      </span>
                    </div>
                    <div>
                      กองทุน{' '}
                      <span className="font-semibold text-slate-700">{selected.fundName || '—'}</span>
                    </div>
                    <div>
                      บัญชี{' '}
                      <span className="font-semibold text-slate-700">
                        {bankOf(selected.bankAccountId)?.accountName || 'ไม่ผูกบัญชี'}
                      </span>
                    </div>
                    <div>
                      เลขอ้างอิง{' '}
                      <span className="font-semibold text-slate-700">
                        {selected.referenceNo || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#0B2545] px-4 py-4 text-white">
                    <div className="flex items-end justify-between gap-3">
                      <div className="text-[11px] text-slate-300">จำนวนตามสมุดบัญชี</div>
                      <div className="text-xl font-bold">{baht(selected.amount)}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">ผู้บันทึก</span>
                      <span>
                        {selected.recordedBy || '—'} · {thaiDate(selected.date)}
                      </span>
                    </div>
                    {selected.verifiedBy ? (
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">ผู้ตรวจ</span>
                        <span>
                          {selected.verifiedBy}
                          {selected.verifiedAt ? ` · ${thaiDate(selected.verifiedAt)}` : ''}
                        </span>
                      </div>
                    ) : null}
                    {selected.reversedBy ? (
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">กลับรายการ</span>
                        <span>
                          {selected.reversedBy}
                          {selected.reversalReason ? ` · ${selected.reversalReason}` : ''}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  {selected.notes ? (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {selected.notes}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-400">ไม่มีรายการให้เปิด</p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 3 TRANSACTION MODALS + 2 CASH PAYMENT MODALS      */}
      {/* ================================================== */}
      <FinanceMovementModalDeposit
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        banks={banks}
        actor={actor}
        onSuccess={refreshAll}
      />

      <FinanceMovementModalWithdraw
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        banks={banks}
        actor={actor}
        onSuccess={refreshAll}
      />

      <FinanceMovementModalTransfer
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        banks={banks}
        actor={actor}
        onSuccess={refreshAll}
      />

      <FinanceModalCashAidDisburse
        isOpen={isAidModalOpen}
        onClose={() => setIsAidModalOpen(false)}
        actor={actor}
        onSuccess={refreshAll}
      />

      <FinanceModalCashAdminExpense
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        actor={actor}
        onSuccess={refreshAll}
      />

      {/* Two-Role Batch Disbursement & Staff Settlement Modals */}
      <FinanceBatchDisbursementModal
        isOpen={isBatchCreateOpen}
        onClose={() => setIsBatchCreateOpen(false)}
        banks={banks}
        actor={actor}
        onSuccess={refreshAll}
      />

      {settlementWorkflowId && (
        <FinanceStaffBatchSettlementModal
          workflowId={settlementWorkflowId}
          isOpen={!!settlementWorkflowId}
          onClose={() => setSettlementWorkflowId(null)}
          actor={actor}
          onSettled={refreshAll}
        />
      )}
    </div>
  );
}

function moneyTypeText(value: string) {
  if (value === 'zakat') return 'ซะกาต';
  if (value === 'sadaqah') return 'ศอดะเกาะห์';
  if (value === 'operational_admin' || value === 'operational' || value === 'admin') return 'เงินบริหาร';
  return value;
}

function isCashHandover(tx: FinancialTransaction) {
  const text = `${tx.category} ${tx.notes || ''}`;
  return text.includes('เบิกเงินสด') || text.includes('โอนย้ายเงินสด') || text.includes('ส่งมอบเหรัญญิก');
}

function subFundLabel(value?: string) {
  if (value === 'living') return 'ปัจจัยยังชีพ';
  if (value === 'housing') return 'ซ่อมและสร้างที่อยู่อาศัย';
  if (value === 'career') return 'ต่อยอดอาชีพ';
  if (value === 'education') return 'ทุนการศึกษา';
  if (value === 'emergency') return 'ช่วยเหลือฉุกเฉิน';
  return value || '—';
}

function asnafOf(tx: FinancialTransaction) {
  const name = `${tx.asnafCategory || ''} ${tx.fundName || ''}`.toLowerCase();
  if (name.includes('faqir') || name.includes('miskin') || name.includes('ยากไร้') || name.includes('มิสกีน')) return 'ฟากีร–มิสกีน';
  if (name.includes('gharim') || name.includes('หนี้')) return 'ผู้มีหนี้สิน';
  if (name.includes('sabilillah') || name.includes('ฟีสะบีล')) return 'ฟีสะบีลิลลาฮ์';
  if (name.includes('ibn') || name.includes('เดินทาง')) return 'อิบนุสะบิล';
  if (name.includes('muallaf') || name.includes('มุอัลลัฟ')) return 'มุอัลลัฟ';
  if (name.includes('amil') || name.includes('admin') || name.includes('อามีล') || name.includes('ดำเนินงาน') || name.includes('สำนักงาน')) return 'อามิลีน';
  if (name.includes('sadaqah') || name.includes('ศอดะ')) return 'ศอดะเกาะห์';
  return 'ไม่ระบุกลุ่ม';
}

export function ExpenseScreen({
  rows,
  bankTotal,
  cash,
  banks,
  fundAccounts,
  actor,
  onChanged,
}: {
  rows: FinancialTransaction[];
  bankTotal: number;
  cash: number;
  banks: BankAccount[];
  fundAccounts: FundAccount[];
  actor: { id: string; name: string; role: string };
  onChanged?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'admin' | 'aid'>('all');
  const [adminOpen, setAdminOpen] = useState(false);
  const [aidOpen, setAidOpen] = useState(false);
  const [waiting, setWaiting] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [money, setMoney] = useState('all');
  const [asnaf, setAsnaf] = useState('all');
  const [fund, setFund] = useState('all');
  const [status, setStatus] = useState('all');
  const [branch, setBranch] = useState('all');
  const spending = rows.filter((tx) => !isCashHandover(tx));
  const branchOf = (tx: FinancialTransaction) => banks.find((bank) => bank.id === tx.bankAccountId)?.branchName || '';
  const funds = Array.from(new Set(spending.map((tx) => tx.fundName).filter(Boolean)));
  const asnafs = Array.from(new Set(spending.map(asnafOf)));
  const branches = Array.from(new Set(banks.map((bank) => bank.branchName).filter((value): value is string => Boolean(value))));
  const moneyTypes = Array.from(new Set(spending.map((tx) => tx.moneyType).filter((value): value is NonNullable<FinancialTransaction['moneyType']> => Boolean(value))));
  const visible = spending.filter((tx) => {
    if (!inRange(tx.date, from, to)) return false;
    if (money !== 'all' && tx.moneyType !== money) return false;
    if (asnaf !== 'all' && asnafOf(tx) !== asnaf) return false;
    if (fund !== 'all' && tx.fundName !== fund) return false;
    if (status !== 'all' && tx.status !== status) return false;
    if (branch !== 'all' && branchOf(tx) !== branch) return false;
    return true;
  });
  const aid = visible.filter((tx) => tx.type === 'disbursement');
  const admin = visible.filter((tx) => tx.type === 'expense');
  const listed = tab === 'aid' ? aid : tab === 'admin' ? admin : [...aid, ...admin];
  const posted = (tx: FinancialTransaction) => tx.status === 'completed';
  const aidPaid = aid.filter(posted).reduce((sum, tx) => sum + tx.amount, 0);
  const adminPaid = admin.filter(posted).reduce((sum, tx) => sum + tx.amount, 0);
  const selected = listed.find((tx) => tx.id === selectedId) || listed[0] || null;
  const field = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none';
  const adminGroups = Array.from(admin.reduce((map, tx) => {
    const key = tx.category || 'ไม่ระบุหมวด';
    const current = map.get(key) || { category: key, count: 0, paid: 0 };
    current.count += 1;
    if (posted(tx)) current.paid += tx.amount;
    map.set(key, current);
    return map;
  }, new Map<string, { category: string; count: number; paid: number }>()).values());
  useEffect(() => {
    Promise.all([
      fetch('/api/finance/documents?view=admin').then((response) => response.json()).catch(() => ({ success: false })),
      fetch('/api/finance/disbursements?status=pending_approval').then((response) => response.json()).catch(() => ({ success: false })),
      fetch('/api/finance/disbursements?status=draft').then((response) => response.json()).catch(() => ({ success: false })),
    ]).then(([adminDocs, pendingVouchers, draftVouchers]) => {
      const adminWait = Array.isArray(adminDocs.data) ? adminDocs.data.filter((doc: { status: string }) => ['draft', 'pending_review', 'pending_approval'].includes(doc.status)).reduce((sum: number, doc: { totalSatang: number }) => sum + Number(doc.totalSatang || 0) / 100, 0) : 0;
      const voucherWait = [...(pendingVouchers.data || []), ...(draftVouchers.data || [])].reduce((sum: number, voucher: { amount?: number }) => sum + Number(voucher.amount || 0), 0);
      setWaiting(adminWait + voucherWait);
    });
  }, [adminOpen, aidOpen]);
  function exportVisible() {
    downloadCsv('expenses.csv', ['เลขที่', 'ประเภท', 'ผู้เกี่ยวข้อง', 'กองทุน', 'หมวด', 'จำนวน', 'สถานะ'], listed.map((tx) => [tx.transactionNo, kindLabel(tx), tx.payerOrPayee, tx.fundName, tx.category, String(tx.amount), statusText(tx)]));
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setAdminOpen(true)} className="rounded-2xl bg-[#F59E0B] px-4 py-3 text-left text-white">
            <div className="text-sm font-bold">+ เพิ่มรายจ่ายบริหาร</div>
            <div className="mt-1 text-[11px] text-amber-50">ค่าดำเนินงานของมูลนิธิ ใช้เงินบริหาร</div>
          </button>
          <button type="button" onClick={() => setAidOpen(true)} className="rounded-2xl bg-[#0D9488] px-4 py-3 text-left text-white">
            <div className="text-sm font-bold">+ เพิ่มรายการช่วยเหลือ</div>
            <div className="mt-1 text-[11px] text-teal-50">จ่ายตามคำร้องที่อนุมัติแล้วเท่านั้น</div>
          </button>
        </div>
        <button type="button" onClick={exportVisible} className="zms-action inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          <Download className="h-4 w-4" />
          ส่งออก
        </button>
      </div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-[11px] text-slate-400">ช่วงวันที่
          <span className="mt-1 flex items-center gap-1 rounded-xl border border-slate-200 px-2">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-full bg-transparent py-2 text-xs outline-none" />
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-full bg-transparent py-2 text-xs outline-none" />
          </span>
        </label>
        <label className="text-[11px] text-slate-400">ประเภทเงิน
          <select value={money} onChange={(event) => setMoney(event.target.value)} className={field}>
            <option value="all">ทุกประเภท</option>
            {moneyTypes.map((item) => <option key={item} value={item}>{moneyTypeText(item)}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-slate-400">อัสนัฟ
          <select value={asnaf} onChange={(event) => setAsnaf(event.target.value)} className={field}>
            <option value="all">ทุกกลุ่ม</option>
            {asnafs.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-slate-400">กองทุน
          <select value={fund} onChange={(event) => setFund(event.target.value)} className={field}>
            <option value="all">ทุกกองทุน</option>
            {funds.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-slate-400">สถานะ
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={field}>
            <option value="all">ทุกสถานะ</option>
            <option value="completed">จ่ายแล้ว</option>
            <option value="pending">รออนุมัติ</option>
            <option value="reversed">กลับรายการ</option>
          </select>
        </label>
        <label className="text-[11px] text-slate-400">สาขา
          <select value={branch} onChange={(event) => setBranch(event.target.value)} className={field}>
            <option value="all">ทุกสาขา</option>
            {branches.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Light label="รายจ่ายบริหาร" value={baht(adminPaid)} hint={`${admin.filter(posted).length} รายการที่จ่ายแล้ว`} />
        <Light label="รายจ่ายช่วยเหลือ" value={baht(aidPaid)} hint={`${aid.filter(posted).length} รายการที่จ่ายแล้ว`} />
        <Navy label="ยอดจ่ายรวม" value={baht(aidPaid + adminPaid)} hint="ช่วยเหลือและค่าบริหารที่ลงบัญชีแล้ว" />
        <Light label="ยอดรออนุมัติ" value={baht(waiting)} hint="แบบร่างและเอกสารที่ยังไม่ลงบัญชี" />
      </div>
      <div className="flex flex-wrap gap-2">
        {([['all', 'ทั้งหมด'], ['admin', 'รายจ่ายบริหาร'], ['aid', 'รายจ่ายช่วยเหลือ']] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === id ? 'bg-[#0B2545] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{label}</button>
        ))}
      </div>
      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800">ซะกาตใช้เป็นรายจ่ายช่วยเหลือ ค่าบริหารแยกบันทึกต่างหาก การเบิกเงินสดไปเหรัญญิกไม่ถูกนับซ้ำ และยอดที่กลับรายการแล้วไม่รวมในยอดจ่ายจริง</div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {tab !== 'admin' ? <Card>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-sm font-bold text-[#0B2545]">รายจ่ายช่วยเหลือผู้มีสิทธิ์</div>
              <div className="text-xs text-slate-400">{aid.length} รายการ</div>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">คำขอ / ผู้รับสิทธิ์</th>
                    <th className="px-4 py-2 font-medium">อัสนัฟ</th>
                    <th className="px-4 py-2 font-medium">ประเภทความช่วยเหลือ</th>
                    <th className="px-4 py-2 text-right font-medium">จ่ายจริง</th>
                    <th className="px-4 py-2 font-medium">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {aid.map((tx) => (
                    <tr key={tx.id} onClick={() => setSelectedId(tx.id)} className={`cursor-pointer border-t border-slate-100 ${selected?.id === tx.id ? 'bg-emerald-50/80' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0B2545]">{tx.payerOrPayee}</div>
                        <div className="text-[11px] text-slate-400">{tx.transactionNo}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{asnafOf(tx)}</td>
                      <td className="px-4 py-3 text-xs">{tx.subFundCategory ? subFundLabel(tx.subFundCategory) : tx.category}</td>
                      <td className="px-4 py-3 text-right font-bold">{baht(tx.amount)}</td>
                      <td className="px-4 py-3"><StatusBadge tone={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'pending' : tx.status === 'reversed' || tx.status === 'cancelled' ? 'rejected' : 'idle'}>{tx.status === 'completed' ? 'จ่ายแล้ว' : tx.status === 'pending' ? 'รออนุมัติ' : statusText(tx)}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {aid.length === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-400">ไม่มีรายการช่วยเหลือตามเงื่อนไข</div> : null}
            </div>
          </Card> : null}
          {tab !== 'aid' ? <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="text-sm font-bold text-[#0B2545]">B ค่าใช้จ่ายบริหาร</div>
              <div className="text-xs font-semibold text-[#0D9488]">จ่ายจริง {baht(adminPaid)}</div>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">หมวดค่าใช้จ่าย</th>
                    <th className="px-4 py-2 text-right font-medium">จำนวนรายการ</th>
                    <th className="px-4 py-2 text-right font-medium">จ่ายจริง</th>
                  </tr>
                </thead>
                <tbody>
                  {adminGroups.map((group) => {
                    const sample = admin.find((tx) => (tx.category || 'ไม่ระบุหมวด') === group.category && posted(tx)) || admin.find((tx) => (tx.category || 'ไม่ระบุหมวด') === group.category);
                    return (
                      <tr key={group.category} onClick={() => sample && setSelectedId(sample.id)} className={`cursor-pointer border-t border-slate-100 ${sample && selected?.id === sample.id ? 'bg-emerald-50/80' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3 font-semibold text-[#0B2545]">{group.category}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{group.count}</td>
                        <td className="px-4 py-3 text-right font-bold">{baht(group.paid)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {adminGroups.length === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-400">ไม่มีค่าใช้จ่ายบริหารตามเงื่อนไข</div> : null}
            </div>
          </Card> : null}
        </div>
        <Card className="p-4 xl:sticky xl:top-4">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">ประวัติธุรกรรม</div>
                  <div className="mt-1 text-sm font-bold text-[#0B2545]">{selected.transactionNo}</div>
                  <div className="mt-1 text-xs text-slate-500">{selected.payerOrPayee}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#0B2545]">{baht(selected.amount)}</div>
                  <StatusBadge tone={selected.status === 'completed' ? 'success' : selected.status === 'pending' ? 'pending' : selected.status === 'reversed' || selected.status === 'cancelled' ? 'rejected' : 'idle'}>{selected.status === 'completed' ? 'จ่ายแล้ว' : selected.status === 'pending' ? 'รออนุมัติ' : statusText(selected)}</StatusBadge>
                </div>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                {[
                  ['ผู้รับ', selected.payerOrPayee || '—'],
                  ['อัสนัฟ', asnafOf(selected)],
                  ['ประเภท', selected.subFundCategory ? subFundLabel(selected.subFundCategory) : selected.category || '—'],
                  ['กองทุน', selected.fundName || '—'],
                  ['ประเภทเงิน', moneyTypeText(selected.moneyType || '')],
                  ['ช่องทาง', paymentLabel(selected.paymentMethod)],
                  ['วันที่', thaiDate(selected.date)],
                  ['เลขอ้างอิง', selected.referenceNo || '—'],
                  ['สาขา', branchOf(selected) || 'ไม่ระบุสาขา'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-right font-semibold text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs">
                <div className="text-slate-400">กองทุนที่บันทึก</div>
                <div className="mt-1 font-semibold text-[#0B2545]">{selected.fundName || '—'}</div>
                <div className="mt-1 text-slate-500">จ่ายในรายการนี้ {baht(selected.amount)}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[#0B2545]">หลักฐานที่บันทึก</div>
                {selected.receiptUrl || selected.slipUrl ? (
                  <a href={selected.receiptUrl || selected.slipUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-semibold text-[#0D9488]">{selected.receiptUrl || selected.slipUrl}</a>
                ) : <p className="mt-2 text-xs text-slate-400">รายการนี้ไม่มีไฟล์แนบ</p>}
              </div>
              <div>
                <div className="text-xs font-bold text-[#0B2545]">ประวัติที่บันทึกไว้</div>
                <div className="mt-2 space-y-2">
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span>บันทึกโดย {selected.recordedBy || '—'}</span>
                    <StatusBadge tone="success">บันทึกแล้ว</StatusBadge>
                  </div>
                  {selected.verifiedBy ? (
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <span>ตรวจโดย {selected.verifiedBy}{selected.verifiedAt ? ` · ${thaiDate(selected.verifiedAt)}` : ''}</span>
                      <StatusBadge tone="success">ตรวจแล้ว</StatusBadge>
                    </div>
                  ) : null}
                  {selected.reversedBy ? (
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <span>กลับรายการโดย {selected.reversedBy}{selected.reversalReason ? ` · ${selected.reversalReason}` : ''}</span>
                      <StatusBadge tone="rejected">กลับรายการ</StatusBadge>
                    </div>
                  ) : null}
                </div>
              </div>
              {selected.notes ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{selected.notes}</p> : null}
            </div>
          ) : <p className="text-sm text-slate-400">ยังไม่มีรายจ่ายตามเงื่อนไข</p>}
        </Card>
      </div>
      <div className="text-xs text-slate-400">ตรวจสอบแล้ว: ช่วยเหลือ {baht(aidPaid)} + บริหาร {baht(adminPaid)} = รายจ่ายรวม {baht(aidPaid + adminPaid)} เงินในบัญชี {baht(bankTotal)} และเงินสด {baht(cash)} ไม่ถูกนับเป็นรายจ่าย</div>
      <AdminExpenseModal open={adminOpen} onClose={() => setAdminOpen(false)} funds={fundAccounts} banks={banks} actor={actor} onChanged={onChanged} />
      <AssistancePaymentModal open={aidOpen} onClose={() => setAidOpen(false)} banks={banks} actor={actor} />
    </div>
  );
}

export function ReconcileScreen({
  banks,
  rows,
  onOpen,
}: {
  banks: BankAccount[];
  rows: FinancialTransaction[];
  onOpen: (bank: BankAccount) => void;
}) {
  const [bankId, setBankId] = useState(banks[0]?.id || '');
  const bank = banks.find((item) => item.id === bankId) || banks[0];
  const mine = bank ? rows.filter((tx) => tx.bankAccountId === bank.id && tx.status !== 'cancelled' && tx.status !== 'reversed') : [];
  const system = Number(bank?.currentBalance || 0);
  const statement = Number(bank?.reconciledBalance || 0);
  const gap = system - statement;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select value={bank?.id || ''} onChange={(event) => setBankId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          {banks.map((item) => <option key={item.id} value={item.id}>{item.bankName} · {item.accountName}</option>)}
        </select>
      </div>
      {bank ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Light label="ยอดตามสเตตเมนต์ล่าสุด" value={baht(statement)} hint={bank.lastReconciledAt ? thaiDate(bank.lastReconciledAt) : 'ยังไม่เคยบันทึกสเตตเมนต์'} />
            <Light label="ยอดในระบบ" value={baht(system)} />
            <Navy label="ผลต่าง" value={baht(gap)} hint={gap === 0 ? 'ยอดตรงกัน' : 'ยังไม่ตรงกับสเตตเมนต์'} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {banks.map((item) => (
              <button key={item.id} type="button" onClick={() => setBankId(item.id)} className={`rounded-2xl border px-4 py-3 text-left ${item.id === bank.id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <div className="text-sm font-semibold">{item.bankName}</div>
                <div className="mt-1 text-lg font-bold">{baht(Number(item.currentBalance || 0))}</div>
                <div className="text-[11px] text-slate-400">สเตตเมนต์ {baht(Number(item.reconciledBalance || 0))}</div>
              </button>
            ))}
          </div>
          {gap !== 0 ? <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">ยอดในระบบและยอดสเตตเมนต์ต่างกัน {baht(Math.abs(gap))} การบันทึกสเตตเมนต์จะไม่แก้รายการในสมุดบัญชี</div> : null}
          <Card>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-sm font-bold">รายการในระบบของบัญชีนี้ {mine.length} รายการ</div>
              <button type="button" onClick={() => onOpen(bank)} className="rounded-xl bg-[#0D9488] px-3 py-2 text-xs font-bold text-white">บันทึกยอดสเตตเมนต์</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">วันที่</th>
                    <th className="px-4 py-2 font-medium">รายการ</th>
                    <th className="px-4 py-2 text-right font-medium">จำนวน</th>
                    <th className="px-4 py-2 font-medium">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {mine.slice(0, 12).map((tx) => (
                    <tr key={tx.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{thaiDate(tx.date)}</td>
                      <td className="px-4 py-3">{kindLabel(tx)} · {tx.transactionNo}<div className="text-[11px] text-slate-400">{tx.payerOrPayee}</div></td>
                      <td className="px-4 py-3 text-right font-bold">{baht(tx.amount)}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(tx)}`}>{statusText(tx)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mine.length === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-400">ยังไม่มีรายการที่ผูกกับบัญชีนี้</div> : null}
            </div>
          </Card>
        </>
      ) : <Card><div className="px-4 py-8 text-center text-sm text-slate-400">ยังไม่มีบัญชีธนาคาร</div></Card>}
    </div>
  );
}

function shareText(value: number) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function usedShare(disbursed: number, target: number) {
  if (!target) return 0;
  return (disbursed / target) * 100;
}

type ProportionSnapshot = { code?: string; asnafCode?: string; name?: string; percentage: number };
type AllocationHistoryItem = {
  id: string;
  scope: string;
  actionType?: string;
  oldProportions?: ProportionSnapshot[];
  newProportions: ProportionSnapshot[];
  policyRef?: string;
  reason?: string;
  changedByName?: string;
  effectiveDate?: string;
  timestamp?: string;
  createdAt?: string;
};

function historyTime(item: AllocationHistoryItem) {
  if (item.createdAt && /^\d{4}-\d{2}-\d{2}/.test(item.createdAt)) {
    const date = new Date(item.createdAt.replace(' ', 'T'));
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }
  return financeInstant(item.timestamp || '')?.getTime() || 0;
}

export function AllocationScreen({
  year,
  years,
  onYear,
  fallback,
  bankTotal,
  cash,
  actor,
}: {
  year: string;
  years: string[];
  onYear: (year: string) => void;
  fallback: { id: string; label: string; received: number; spent: number }[];
  bankTotal: number;
  cash: number;
  actor: { id: string; name: string; role: string };
}) {
  const [rows, setRows] = useState<AsnafAllocation[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<'groups' | 'funds' | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [policyRef, setPolicyRef] = useState('');
  const [editReason, setEditReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [history, setHistory] = useState<AllocationHistoryItem[]>([]);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const canEdit = ['super_admin', 'admin', 'executive', 'approver', 'finance'].includes(actor.role);
  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setEditing(null);
    const yearQuery = encodeURIComponent(year);
    Promise.all([
      fetch(`/api/finance/allocations/asnaf?fiscalYear=${yearQuery}&includeHierarchy=1`).then((res) => res.json()),
      fetch(`/api/finance/allocations/asnaf?fiscalYear=${yearQuery}&view=history`).then((res) => res.json()).catch(() => ({ success: false })),
      fetch(`/api/finance/allocations/faqir-miskin?fiscalYear=${yearQuery}&view=history&primaryGroupCode=all`).then((res) => res.json()).catch(() => ({ success: false })),
    ]).then(([allocationJson, groupHistoryJson, fundHistoryJson]) => {
      if (cancelled) return;
      const groupHistory: AllocationHistoryItem[] = Array.isArray(groupHistoryJson.data)
        ? groupHistoryJson.data.map((item: AllocationHistoryItem) => ({ ...item, scope: 'สัดส่วนอัสนัฟ' }))
        : [];
      const fundHistory: AllocationHistoryItem[] = Array.isArray(fundHistoryJson.data)
        ? fundHistoryJson.data.map((item: AllocationHistoryItem) => ({ ...item, scope: 'กองทุนย่อย' }))
        : [];
      setHistory([...groupHistory, ...fundHistory].sort((a, b) => historyTime(b) - historyTime(a)));
      if (!allocationJson.success || !Array.isArray(allocationJson.data) || allocationJson.data.length === 0) {
        setState('fallback');
        return;
      }
      setRows(allocationJson.data);
      setSelectedId((current) => (allocationJson.data.some((row: AsnafAllocation) => row.id === current) ? current : allocationJson.data[0]?.id || null));
      setState('ready');
    }).catch(() => { if (!cancelled) setState('fallback'); });
    return () => { cancelled = true; };
  }, [year, reloadKey]);
  const ordered = rows.some((row) => row.sortOrder != null)
    ? [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    : rows;
  const selected = ordered.find((row) => row.id === selectedId) || ordered[0];
  const target = ordered.reduce((sum, row) => sum + Number(row.targetAmount || 0), 0);
  const allocated = ordered.reduce((sum, row) => sum + Number(row.allocatedAmount || 0), 0);
  const spent = ordered.reduce((sum, row) => sum + Number(row.disbursedAmount || 0), 0);
  const left = ordered.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0);
  const share = ordered.reduce((sum, row) => sum + Number(row.percentage || 0), 0);
  const field = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none';
  function exportRows() {
    const source = state === 'ready' ? ordered : [];
    downloadCsv(
      `asnaf-${year}.csv`,
      ['อัสนัฟ', 'สัดส่วน', 'เป้าหมาย', 'จัดสรรแล้ว', 'จ่ายจริง', 'คงเหลือ'],
      source.map((row) => [row.asnafName, String(row.percentage), String(row.targetAmount), String(row.allocatedAmount), String(row.disbursedAmount), String(row.remainingAmount)]),
    );
  }
  if (state !== 'ready') {
    const received = fallback.reduce((sum, row) => sum + row.received, 0);
    const paid = fallback.reduce((sum, row) => sum + row.spent, 0);
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Light label="รับเข้าที่ระบุอัสนัฟ" value={baht(received)} />
          <Light label="จ่ายจริง" value={baht(paid)} />
          <Navy label="คงเหลือจากรายการ" value={baht(received - paid)} />
        </div>
        <Card className="overflow-x-auto">
          <div className="px-4 py-3 text-sm font-bold">{state === 'loading' ? 'กำลังโหลดงบจัดสรร' : 'สัดส่วนจากรายการที่ระบุอัสนัฟ'}</div>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-slate-400"><tr><th className="px-4 py-2">อัสนัฟ</th><th className="px-4 py-2">รับเข้า</th><th className="px-4 py-2">จ่ายจริง</th></tr></thead>
            <tbody>
              {fallback.map((row) => (
                <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3">{row.label}</td><td className="px-4 py-3">{baht(row.received)}</td><td className="px-4 py-3">{baht(row.spent)}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }
  const funds = selected?.specificFunds || [];
  const fundAllocated = funds.reduce((sum, fund) => sum + Number(fund.allocatedAmount || 0), 0);
  const fundSpent = funds.reduce((sum, fund) => sum + Number(fund.disbursedAmount || 0), 0);
  const fundLeft = funds.reduce((sum, fund) => sum + Number(fund.remainingAmount || 0), 0);
  const fundShare = funds.reduce((sum, fund) => sum + Number(fund.percentage || 0), 0);
  const used = usedShare(spent, target || allocated);
  const draftKeys = editing === 'groups' ? ordered.map((row) => row.asnafCode) : editing === 'funds' ? funds.map((fund) => fund.id) : [];
  const draftValues = draftKeys.map((key) => Number(draft[key]));
  const draftTotal = draftValues.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  const draftBalanced = draftValues.length > 0 && draftValues.every((value) => Number.isFinite(value) && value >= 0 && value <= 100) && Math.abs(draftTotal - 100) < 0.001;
  function beginEdit(kind: 'groups' | 'funds') {
    const next: Record<string, string> = {};
    if (kind === 'groups') ordered.forEach((row) => { next[row.asnafCode] = String(row.percentage); });
    else funds.forEach((fund) => { next[fund.id] = String(fund.percentage); });
    setDraft(next);
    setPolicyRef('');
    setEditReason('');
    setEditError('');
    setEditing(kind);
  }
  async function savePercents(event: React.FormEvent) {
    event.preventDefault();
    if (!draftBalanced) {
      setEditError(`ผลรวมต้องเท่ากับ 100% ตอนนี้ได้ ${draftTotal.toFixed(2)}%`);
      return;
    }
    if (!policyRef.trim() || !editReason.trim()) {
      setEditError('กรุณาระบุเอกสารอ้างอิงและเหตุผล');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const payload = editing === 'funds'
        ? {
          subFunds: funds.map((fund) => ({ code: fund.id, percentage: Number(draft[fund.id]) })),
          fiscalYear: year,
          primaryGroupCode: selected?.asnafCode,
          policyRef,
          reason: editReason,
          effectiveDate,
          actor,
        }
        : {
          allocations: ordered.map((row) => ({ asnafCode: row.asnafCode, percentage: Number(draft[row.asnafCode]) })),
          fiscalYear: year,
          policyRef,
          reason: editReason,
          effectiveDate,
          actor,
        };
      const response = await fetch(editing === 'funds' ? '/api/finance/allocations/faqir-miskin' : '/api/finance/allocations/asnaf', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setEditError(json.error || 'บันทึกสัดส่วนไม่สำเร็จ');
        return;
      }
      setEditing(null);
      setPolicyRef('');
      setEditReason('');
      setReloadKey((key) => key + 1);
    } catch {
      setEditError('บันทึกสัดส่วนไม่สำเร็จ');
    } finally {
      setEditSaving(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button type="button" onClick={exportRows} className="zms-action inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          <Download className="h-4 w-4" />
          ส่งออก
        </button>
        {canEdit ? (
          <button type="button" onClick={() => beginEdit('groups')} className="zms-action inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-3 py-2 text-sm font-bold text-white">
            <Plus className="h-4 w-4" />
            สร้างการจัดสรรใหม่
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-3">
        <label className="text-[11px] text-slate-400">ปีงบประมาณ
          <select value={year} onChange={(event) => onYear(event.target.value)} className={field}>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-slate-400">ประเภทเงิน
          <div className={field}>ซะกาต</div>
        </label>
        <label className="text-[11px] text-slate-400">ฉบับที่บันทึก
          <div className={field}>ปี {year} • ใช้งานอยู่</div>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Light label="งบซะกาตที่จัดสรร" value={baht(allocated || target)} hint={`สัดส่วนรวม ${shareText(share)}`} />
        <Light label="ยอดช่วยเหลือที่จ่ายจริง" value={baht(spent)} hint={target ? `${shareText(used)} ของงบที่จัดสรร` : undefined} />
        <Navy label="งบประมาณคงเหลือ" value={baht(left)} hint={target ? `คงเหลือ ${shareText(usedShare(left, target))}` : undefined} />
        <Light label="เงินคงเหลือรวมทุกประเภท" value={baht(bankTotal + cash)} hint={`บัญชี ${baht(bankTotal)} • เงินสด ${baht(cash)}`} />
      </div>
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
        ใช้งบจัดสรรปี {year} ที่บันทึกไว้แล้ว สัดส่วนนี้คือฉบับใช้งาน และการจ่ายจริงคือยอดที่ตัดออกจากงบแล้ว
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Card className="overflow-x-auto">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="text-sm font-bold text-[#0e2744]">งบจัดสรรตามอัสนัฟ</div>
              <span className="text-[11px] text-slate-400">หน่วย: บาท</span>
            </div>
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-emerald-50/70 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">อัสนัฟ / กลุ่ม</th>
                  <th className="px-4 py-2 font-medium">สัดส่วน</th>
                  <th className="px-4 py-2 text-right font-medium">เป้าหมาย</th>
                  <th className="px-4 py-2 text-right font-medium">จัดสรรแล้ว</th>
                  <th className="px-4 py-2 text-right font-medium">จ่ายจริง</th>
                  <th className="px-4 py-2 text-right font-medium">คงเหลือ</th>
                  <th className="px-4 py-2 text-right font-medium">ใช้ไป</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((row) => (
                  <tr key={row.id} onClick={() => { if (editing !== 'funds') setSelectedId(row.id); }} className={`border-t border-slate-100 ${editing === 'funds' ? '' : 'cursor-pointer'} ${selected?.id === row.id ? 'bg-emerald-50/80' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3 font-medium">{row.asnafName}</td>
                    <td className="px-4 py-3">
                      {editing === 'groups' ? (
                        <input value={draft[row.asnafCode] ?? ''} onClick={(event) => event.stopPropagation()} onChange={(event) => setDraft({ ...draft, [row.asnafCode]: event.target.value })} inputMode="decimal" aria-label={`สัดส่วน ${row.asnafName}`} className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right" />
                      ) : shareText(row.percentage)}
                    </td>
                    <td className="px-4 py-3 text-right">{baht(row.targetAmount)}</td>
                    <td className="px-4 py-3 text-right">{baht(row.allocatedAmount)}</td>
                    <td className="px-4 py-3 text-right">{baht(row.disbursedAmount)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{baht(row.remainingAmount)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#0D9488]">{shareText(usedShare(row.disbursedAmount, row.targetAmount || row.allocatedAmount))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 text-sm font-bold">
                  <td className="px-4 py-3">รวมทุกกลุ่ม</td>
                  <td className={`px-4 py-3 ${editing === 'groups' && !draftBalanced ? 'text-amber-600' : ''}`}>{editing === 'groups' ? `${draftTotal.toFixed(2)}%` : shareText(share)}</td>
                  <td className="px-4 py-3 text-right">{baht(target)}</td>
                  <td className="px-4 py-3 text-right">{baht(allocated)}</td>
                  <td className="px-4 py-3 text-right">{baht(spent)}</td>
                  <td className="px-4 py-3 text-right">{baht(left)}</td>
                  <td className="px-4 py-3 text-right text-[#0D9488]">{shareText(used)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
          <Card className="overflow-x-auto">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="text-sm font-bold text-[#0e2744]">กองทุนย่อยของ {selected?.asnafName || 'กลุ่มที่เลือก'}</div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">ฐาน {baht(selected?.allocatedAmount || selected?.targetAmount || 0)}</span>
                {canEdit && !editing && funds.length > 0 ? <button type="button" onClick={() => beginEdit('funds')} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-[#0D9488]">ปรับสัดส่วน</button> : null}
              </div>
            </div>
            {funds.length === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-400">กลุ่มนี้ไม่มีกองทุนย่อยในปี {year}</div> : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">กองทุนย่อย</th>
                    <th className="px-4 py-2 font-medium">สัดส่วน</th>
                    <th className="px-4 py-2 text-right font-medium">จัดสรร</th>
                    <th className="px-4 py-2 text-right font-medium">จ่ายจริง</th>
                    <th className="px-4 py-2 text-right font-medium">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody>
                  {funds.map((fund) => (
                    <tr key={fund.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{fund.name}</td>
                      <td className="px-4 py-3">
                        {editing === 'funds' ? (
                          <input value={draft[fund.id] ?? ''} onChange={(event) => setDraft({ ...draft, [fund.id]: event.target.value })} inputMode="decimal" aria-label={`สัดส่วน ${fund.name}`} className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right" />
                        ) : shareText(fund.percentage)}
                      </td>
                      <td className="px-4 py-3 text-right">{baht(fund.allocatedAmount || 0)}</td>
                      <td className="px-4 py-3 text-right">{baht(fund.disbursedAmount || 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{baht(fund.remainingAmount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-bold">
                    <td className="px-4 py-3">รวมกองทุนย่อย</td>
                    <td className={`px-4 py-3 ${editing === 'funds' && !draftBalanced ? 'text-amber-600' : ''}`}>{editing === 'funds' ? `${draftTotal.toFixed(2)}%` : shareText(fundShare)}</td>
                    <td className="px-4 py-3 text-right">{baht(fundAllocated)}</td>
                    <td className="px-4 py-3 text-right">{baht(fundSpent)}</td>
                    <td className="px-4 py-3 text-right">{baht(fundLeft)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </Card>
        </div>
        <Card className="p-4">
          {editing ? (
            <form onSubmit={savePercents} className="space-y-3">
              <div>
                <div className="text-sm font-bold text-[#0e2744]">{editing === 'groups' ? 'สร้างการจัดสรรใหม่' : `ปรับกองทุนย่อยของ ${selected?.asnafName || ''}`}</div>
                <div className="mt-1 text-[11px] text-slate-400">ปี {year} • บันทึกแล้วจะแทนฉบับที่ใช้งาน</div>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">ตรวจสอบสัดส่วน</span>
                <span className={`font-semibold ${draftBalanced ? 'text-emerald-700' : 'text-amber-600'}`}>{draftBalanced ? 'ครบ 100%' : `${draftTotal.toFixed(2)}%`}</span>
              </div>
              <div className="text-[11px] text-slate-400">ชั้นอัสนัฟ {shareText(share)} • กองทุนย่อยที่เลือก {funds.length ? shareText(fundShare) : 'ไม่มี'}</div>
              <div className="text-xs text-slate-500">ผู้บันทึก <span className="font-semibold text-slate-700">{actor.name}</span></div>
              <label className="block text-xs text-slate-500">วันที่มีผล
                <input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs text-slate-500">เอกสารอ้างอิง
                <input value={policyRef} onChange={(event) => setPolicyRef(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs text-slate-500">เหตุผล
                <textarea value={editReason} onChange={(event) => setEditReason(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <p className="text-[11px] text-slate-400">เป้าหมายคำนวณใหม่จากเงินที่รับเข้า รายการที่จ่ายไปแล้วไม่ถูกแก้ไข</p>
              {editError ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{editError}</p> : null}
              <button type="submit" disabled={editSaving || !draftBalanced} className="w-full rounded-xl bg-[#0D9488] py-2.5 text-sm font-bold text-white disabled:opacity-50">{editSaving ? 'กำลังบันทึก...' : 'บันทึกการจัดสรร'}</button>
              <button type="button" onClick={() => { setEditing(null); setEditError(''); }} className="w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold">ยกเลิก</button>
            </form>
          ) : (
            <div>
              <div className="text-[11px] text-slate-400">ฉบับที่ใช้งาน</div>
              <div className="mt-1 text-sm font-bold text-[#0e2744]">ปี {year}</div>
              <div className="mt-2 text-xs text-slate-500">สัดส่วนอัสนัฟ {shareText(share)} • จ่ายจริง {baht(spent)}</div>
              {selected ? <div className="mt-1 text-xs text-slate-400">กลุ่มที่เลือก {selected.asnafName} {shareText(selected.percentage)}</div> : null}
            </div>
          )}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="text-sm font-bold text-[#0e2744]">ประวัติการแก้ไข</div>
            {history.length === 0 ? <p className="mt-3 text-xs text-slate-400">ยังไม่มีประวัติการปรับสัดส่วนในปี {year}</p> : (
              <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
                {history.map((item) => {
                  const open = historyId === item.id;
                  const when = item.timestamp || item.createdAt || '';
                  return (
                    <button key={item.id} type="button" onClick={() => setHistoryId(open ? null : item.id)} className="block w-full rounded-xl border border-slate-100 px-3 py-2 text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-slate-700">{item.scope}</div>
                          <div className="text-[11px] text-slate-400">{when ? thaiDate(when) : '—'} • {item.changedByName || '—'}</div>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">บันทึกแล้ว</span>
                      </div>
                      {open ? (
                        <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                          <div>อ้างอิง {item.policyRef || '—'}</div>
                          <div>{item.reason || '—'}</div>
                          {(item.newProportions || []).map((next) => {
                            const key = next.code || next.asnafCode || next.name || '';
                            const previous = (item.oldProportions || []).find((old) => (old.code || old.asnafCode || old.name) === key);
                            const changed = previous && Math.abs(Number(previous.percentage) - Number(next.percentage)) > 0.001;
                            if (previous && !changed) return null;
                            return (
                              <div key={key} className="flex justify-between gap-2">
                                <span>{next.name || key}</span>
                                <span>{previous ? `${shareText(previous.percentage)} → ` : ''}{shareText(next.percentage)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ReportLines({ rows }: { rows: FinancialTransaction[] }) {
  if (rows.length === 0) return <div className="px-4 py-8 text-center text-sm text-slate-400">ไม่มีรายการตามเงื่อนไข</div>;
  return (
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead className="text-xs text-slate-400">
        <tr>
          <th className="px-4 py-2">เลขที่</th>
          <th className="px-4 py-2">วันที่</th>
          <th className="px-4 py-2">ประเภท</th>
          <th className="px-4 py-2">บัญชี</th>
          <th className="px-4 py-2">ประเภทเงิน</th>
          <th className="px-4 py-2 text-right">จำนวน</th>
          <th className="px-4 py-2">สถานะ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((tx) => (
          <tr key={tx.id} className="border-t border-slate-100">
            <td className="px-4 py-3 text-xs">{tx.transactionNo}</td>
            <td className="px-4 py-3 text-xs">{thaiDate(tx.date)}</td>
            <td className="px-4 py-3">{kindLabel(tx)}</td>
            <td className="px-4 py-3 text-xs">{accountLabel(tx)}</td>
            <td className="px-4 py-3 text-xs">{moneyLabel(tx.moneyType)}</td>
            <td className="px-4 py-3 text-right font-semibold">{baht(tx.amount)}</td>
            <td className="px-4 py-3 text-xs">{statusText(tx)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const REPORT_VIEWS = [
  { id: 'income', label: 'รายงานรายรับ' },
  { id: 'expense', label: 'รายงานรายจ่าย' },
  { id: 'money', label: 'รายงานตามประเภทเงิน' },
  { id: 'banks', label: 'รายงานตามบัญชีธนาคาร' },
  { id: 'asnaf', label: 'รายงานตามอัสนัฟ' },
  { id: 'funds', label: 'รายงานตามกองทุน' },
  { id: 'movements', label: 'รายงานการฝาก ถอน โอน' },
  { id: 'disbursement', label: 'รายงานการเบิกจ่าย' },
  { id: 'cash', label: 'รายงานเงินสดคงเหลือ' },
  { id: 'budget', label: 'งบประมาณจัดสรรเทียบยอดจ่ายจริง' },
] as const;

type ReportView = (typeof REPORT_VIEWS)[number]['id'];

const MOVEMENT_TYPES = ['bank_deposit', 'bank_withdrawal', 'bank_transfer_in', 'bank_transfer_out', 'transfer', 'deposit', 'withdrawal'];

export function ReportScreen({
  year,
  income,
  expense,
  net,
  bankTotal,
  accounts,
  cash,
  funds,
  asnaf,
  rows = [],
}: {
  year: string;
  income: number;
  expense: number;
  net: number;
  bankTotal: number;
  accounts: BankAccount[];
  cash: number;
  funds: FundAccount[];
  asnaf: { id: string; label: string; received: number; spent: number }[];
  rows?: FinancialTransaction[];
}) {
  const [view, setView] = useState<ReportView>('income');
  const incomeRows = rows.filter((tx) => tx.type === 'income');
  const expenseRows = rows.filter((tx) => tx.type === 'expense');
  const disbursementRows = rows.filter((tx) => tx.type === 'disbursement');
  const movementRows = rows.filter((tx) => MOVEMENT_TYPES.includes(tx.type as string));
  const cashRows = rows.filter((tx) => tx.paymentMethod === 'cash');
  const moneyRows = (['zakat', 'sadaqah', 'operational_admin'] as const).map((id) => {
    const matched = rows.filter((tx) => {
      if (id === 'operational_admin') return tx.moneyType === 'operational_admin' || (tx.moneyType as string) === 'operational';
      return (tx.moneyType || 'zakat') === id;
    });
    const received = matched.filter((tx) => tx.type === 'income' && tx.status !== 'cancelled' && tx.status !== 'reversed').reduce((sum, tx) => sum + tx.amount, 0);
    const spent = matched.filter((tx) => (tx.type === 'expense' || tx.type === 'disbursement') && tx.status !== 'cancelled' && tx.status !== 'reversed').reduce((sum, tx) => sum + tx.amount, 0);
    return { id, label: moneyLabel(id), received, spent };
  });
  const lineExport = (name: string, list: FinancialTransaction[]) => downloadCsv(name, ['เลขที่', 'วันที่', 'ประเภท', 'บัญชี', 'ประเภทเงิน', 'จำนวน', 'สถานะ'], list.map((tx) => [tx.transactionNo, tx.date, kindLabel(tx), accountLabel(tx), moneyLabel(tx.moneyType), String(tx.amount), statusText(tx)]));
  function exportView() {
    if (view === 'income') lineExport(`income-${year}.csv`, incomeRows);
    if (view === 'expense') lineExport(`expense-${year}.csv`, expenseRows);
    if (view === 'disbursement') lineExport(`disbursement-${year}.csv`, disbursementRows);
    if (view === 'movements') lineExport(`movements-${year}.csv`, movementRows);
    if (view === 'cash') lineExport(`cash-${year}.csv`, cashRows);
    if (view === 'money') downloadCsv(`money-${year}.csv`, ['ประเภทเงิน', 'รับเข้า', 'จ่ายจริง', 'คงเหลือ'], moneyRows.map((row) => [row.label, String(row.received), String(row.spent), String(row.received - row.spent)]));
    if (view === 'funds' || view === 'budget') downloadCsv(`funds-${year}.csv`, ['กองทุน', 'รับเข้า', 'จ่ายจริง', 'คงเหลือ'], funds.map((fund) => [fund.name, String(fund.totalReceived), String(fund.disbursedAmount), String(fund.availableAmount)]));
    if (view === 'asnaf') downloadCsv(`asnaf-${year}.csv`, ['อัสนัฟ', 'รับเข้า', 'จ่ายจริง', 'คงเหลือ'], asnaf.map((row) => [row.label, String(row.received), String(row.spent), String(row.received - row.spent)]));
    if (view === 'banks') downloadCsv(`banks-${year}.csv`, ['ธนาคาร', 'บัญชี', 'ยอดในระบบ', 'ยอดสเตตเมนต์'], accounts.map((account) => [account.bankName, account.accountName, String(account.currentBalance || 0), String(account.reconciledBalance || 0)]));
  }
  const activeRows = view === 'income' ? incomeRows : view === 'expense' ? expenseRows : view === 'disbursement' ? disbursementRows : view === 'movements' ? movementRows : view === 'cash' ? cashRows : [];
  return (
    <div id="finance-report-sheet" className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={exportView} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">ส่งออก Excel</button>
        <button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">พิมพ์ PDF</button>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Light label="รายรับทั้งหมด" value={baht(income)} />
        <Light label="รายจ่ายทั้งหมด" value={baht(expense)} />
        <Navy label="ยอดคงเหลือ" value={baht(net)} />
        <Light label="ยอดในบัญชี" value={baht(bankTotal)} />
        <Light label="เงินสดคงเหลือ" value={baht(cash)} />
      </div>
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div>
          <label className="block lg:hidden">
            <span className="mb-1 block text-xs text-slate-500">เลือกรายงาน</span>
            <select value={view} onChange={(event) => setView(event.target.value as ReportView)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {REPORT_VIEWS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <Card className="hidden p-2 lg:block">
            {REPORT_VIEWS.map((item) => (
              <button key={item.id} type="button" onClick={() => setView(item.id)} className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${view === item.id ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-600'}`}>{item.label}</button>
            ))}
          </Card>
        </div>
        <Card className="max-w-full overflow-x-auto">
          <div className="px-4 py-3 text-sm font-bold">{REPORT_VIEWS.find((item) => item.id === view)?.label} · ปี {year}</div>
          {view === 'funds' || view === 'budget' ? (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-slate-400"><tr><th className="px-4 py-2">กองทุน</th><th className="px-4 py-2 text-right">รับเข้า</th><th className="px-4 py-2 text-right">จ่ายจริง</th><th className="px-4 py-2 text-right">คงเหลือ</th></tr></thead>
              <tbody>
                {funds.map((fund) => (
                  <tr key={fund.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{fund.name}</td>
                    <td className="px-4 py-3 text-right">{baht(fund.totalReceived)}</td>
                    <td className="px-4 py-3 text-right">{baht(fund.disbursedAmount)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{baht(fund.availableAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {view === 'asnaf' ? (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-slate-400"><tr><th className="px-4 py-2">อัสนัฟ</th><th className="px-4 py-2 text-right">รับเข้า</th><th className="px-4 py-2 text-right">จ่ายจริง</th><th className="px-4 py-2 text-right">คงเหลือ</th></tr></thead>
              <tbody>
                {asnaf.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{row.label}</td>
                    <td className="px-4 py-3 text-right">{baht(row.received)}</td>
                    <td className="px-4 py-3 text-right">{baht(row.spent)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{baht(row.received - row.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {view === 'banks' ? (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-slate-400"><tr><th className="px-4 py-2">บัญชี</th><th className="px-4 py-2 text-right">ยอดในระบบ</th><th className="px-4 py-2 text-right">ยอดสเตตเมนต์</th></tr></thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{account.bankName}<div className="text-[11px] text-slate-400">{account.accountName}</div></td>
                    <td className="px-4 py-3 text-right">{baht(Number(account.currentBalance || 0))}</td>
                    <td className="px-4 py-3 text-right">{baht(Number(account.reconciledBalance || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {view === 'money' ? (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-slate-400"><tr><th className="px-4 py-2">ประเภทเงิน</th><th className="px-4 py-2 text-right">รับเข้า</th><th className="px-4 py-2 text-right">จ่ายจริง</th><th className="px-4 py-2 text-right">คงเหลือ</th></tr></thead>
              <tbody>
                {moneyRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{row.label}</td>
                    <td className="px-4 py-3 text-right">{baht(row.received)}</td>
                    <td className="px-4 py-3 text-right">{baht(row.spent)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{baht(row.received - row.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {activeRows.length || view === 'income' || view === 'expense' || view === 'disbursement' || view === 'movements' || view === 'cash' ? (
            view === 'cash' ? (
              <div>
                <div className="px-4 pb-2 text-xs text-slate-500">เงินสดคงเหลือตามระบบ {baht(cash)} · รายการเงินสดในช่วงที่เลือก {cashRows.length} รายการ</div>
                <ReportLines rows={cashRows} />
              </div>
            ) : <ReportLines rows={activeRows} />
          ) : null}
        </Card>
      </div>
    </div>
  );
}
