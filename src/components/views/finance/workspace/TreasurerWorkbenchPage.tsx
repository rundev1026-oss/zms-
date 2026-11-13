'use client';

import React, { useEffect, useState } from 'react';
import { Landmark, Scale, TableProperties, History, ShieldCheck, FileSpreadsheet, Download, Search, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { FinancialTransaction } from '@/types';
import { TreasurerApprovalWorkbench } from './TreasurerApprovalWorkbench';
import { FinanceKpiCards, type KpiData } from './FinanceKpiCards';
import { FinanceCashControlRegister, type RegisterItem } from './FinanceCashControlRegister';
import { FinanceThreeWayReconciliation, type ReconciliationData } from './FinanceThreeWayReconciliation';

type Section = 'inbox' | 'accounts' | 'register' | 'history' | 'reconcile' | 'report';

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'inbox', label: 'กล่องงานเหรัญญิก', icon: ShieldCheck },
  { id: 'accounts', label: 'บัญชี A/B/C', icon: Landmark },
  { id: 'register', label: 'ทะเบียนควบคุมการเบิก', icon: TableProperties },
  { id: 'history', label: 'ประวัติการโอน', icon: History },
  { id: 'reconcile', label: 'กระทบยอด', icon: Scale },
  { id: 'report', label: 'รายงานการเบิกเงิน', icon: FileSpreadsheet },
];

function baht(value: number) {
  return `฿${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TreasurerWorkbenchPage({
  actor,
  rows,
  onRefreshParent,
}: {
  actor: { id: string; name: string; role: string };
  rows: FinancialTransaction[];
  onRefreshParent?: () => void;
}) {
  const [section, setSection] = useState<Section>('inbox');
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [registerItems, setRegisterItems] = useState<RegisterItem[]>([]);
  const [registerTab, setRegisterTab] = useState('all');
  const [registerSearch, setRegisterSearch] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [reconcile, setReconcile] = useState<ReconciliationData | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [report, setReport] = useState<{ counts?: Record<string, number>; amounts?: Record<string, number>; items?: Array<{ id: string; workflowNo: string; title: string; totalAmount: number; overallStatus: string }> } | null>(null);
  const [reportItems, setReportItems] = useState<RegisterItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [reportCategory, setReportCategory] = useState<'all' | 'aid' | 'admin'>('all');

  useEffect(() => {
    if (section !== 'accounts' && section !== 'reconcile') return;
    let cancelled = false;
    async function load() {
      if (section === 'accounts') setKpiLoading(true);
      if (section === 'reconcile') setReconcileLoading(true);
      try {
        const view = section === 'accounts' ? 'kpi' : 'reconciliation';
        const res = await fetch(`/api/finance/workflow-actions?view=${view}`);
        const body = await res.json();
        if (cancelled || !body.success) return;
        if (section === 'accounts') setKpi(body.data);
        if (section === 'reconcile') setReconcile(body.data);
      } finally {
        if (!cancelled) {
          setKpiLoading(false);
          setReconcileLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [section]);

  useEffect(() => {
    if (section !== 'register') return;
    let cancelled = false;
    async function load() {
      setRegisterLoading(true);
      try {
        const params = new URLSearchParams({ view: 'register', tab: registerTab, search: registerSearch });
        const res = await fetch(`/api/finance/workflow-actions?${params.toString()}`);
        const body = await res.json();
        if (!cancelled && body.success) setRegisterItems(body.data || []);
      } finally {
        if (!cancelled) setRegisterLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [section, registerTab, registerSearch]);

  useEffect(() => {
    if (section !== 'report') return;
    let cancelled = false;
    async function load() {
      setReportLoading(true);
      try {
        const [batchRes, regRes] = await Promise.all([
          fetch('/api/finance/workflow-actions?view=batch_list&tab=all'),
          fetch('/api/finance/workflow-actions?view=register&tab=all'),
        ]);
        const batchBody = await batchRes.json();
        const regBody = await regRes.json();
        if (!cancelled && batchBody.success) setReport(batchBody.data);
        if (!cancelled && regBody.success) setReportItems(regBody.data || []);
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [section]);

  const transfers = rows.filter((tx) => {
    const kind = String(tx.type);
    return kind === 'transfer' || kind === 'bank_transfer_in' || kind === 'bank_transfer_out';
  });

  // Report calculations for 12 KPIs
  const filteredReportItems = reportItems.filter((it) => {
    if (reportCategory === 'aid' && it.purposeType !== 'ช่วยเหลือ') return false;
    if (reportCategory === 'admin' && it.purposeType !== 'บริหาร') return false;
    if (reportSearch) {
      const q = reportSearch.toLowerCase();
      const txt = `${it.documentNo} ${it.batchNo} ${it.staffName} ${it.purpose} ${it.beneficiaryName || ''}`.toLowerCase();
      if (!txt.includes(q)) return false;
    }
    return true;
  });

  const totalRequested = filteredReportItems.reduce((s, it) => s + (it.requestedAmount || it.withdrawnAmount || 0), 0);
  const totalApproved = filteredReportItems.reduce((s, it) => s + (it.approvedAmount || 0), 0);
  const totalTransferred = filteredReportItems.reduce((s, it) => s + (it.transferredAmount || 0), 0);
  const totalActualPaid = filteredReportItems.reduce((s, it) => s + (it.actualPaidAmount || 0), 0);
  const totalRemaining = filteredReportItems.reduce((s, it) => s + (it.remainingAmount || 0), 0);
  const totalRefunded = filteredReportItems.reduce((s, it) => s + (it.refundAmount || 0), 0);
  const uniqueBatches = new Set(filteredReportItems.map((it) => it.batchNo).filter((b) => b && b !== '-'));
  const totalBatches = uniqueBatches.size;
  const aidItemsCount = filteredReportItems.filter((it) => it.purposeType === 'ช่วยเหลือ').length;
  const adminItemsCount = filteredReportItems.filter((it) => it.purposeType === 'บริหาร').length;
  const paidItemsCount = filteredReportItems.filter((it) => it.itemStatus === 'จ่ายแล้ว' || it.itemStatus === 'เคลียร์แล้ว' || (it.actualPaidAmount > 0 && it.remainingAmount === 0)).length;
  const pendingItemsCount = filteredReportItems.filter((it) => ['รอจ่าย', 'รอเบิกจ่าย', 'รออนุมัติ', 'เบิกเงินสำเร็จ', 'จ่ายบางส่วน'].includes(it.itemStatus)).length;
  const disbursementRate = totalApproved > 0 ? (totalActualPaid / totalApproved) * 100 : 0;

  function exportReportCsv() {
    const headers = [
      'ลำดับ',
      'วันที่',
      'เลขที่เอกสาร',
      'เลขที่รอบเบิก',
      'เจ้าหน้าที่',
      'วัตถุประสงค์',
      'บัญชีต้นทาง',
      'ยอดขอเบิก',
      'ยอดอนุมัติ',
      'ยอดโอนส่งมอบ',
      'ยอดจ่ายจริง',
      'ยอดคงเหลือ',
      'ยอดส่งคืน',
      'สถานะ',
    ];

    const csvRows = filteredReportItems.map((it) => [
      it.index,
      it.date,
      it.documentNo,
      it.batchNo || '-',
      `"${it.staffName || ''}"`,
      `"${it.purpose || ''}"`,
      `"${it.sourceAccountName || ''}"`,
      it.requestedAmount || it.withdrawnAmount || 0,
      it.approvedAmount || 0,
      it.transferredAmount || 0,
      it.actualPaidAmount || 0,
      it.remainingAmount || 0,
      it.refundAmount || 0,
      `"${it.itemStatus || ''}"`,
    ]);

    const content = '\uFEFF' + [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `disbursement-report-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white p-2">
        {SECTIONS.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`zms-action inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
                active ? 'bg-[#0B2545] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {section === 'inbox' ? <TreasurerApprovalWorkbench actor={actor} onRefreshParent={onRefreshParent} /> : null}

      {section === 'accounts' ? <FinanceKpiCards data={kpi} loading={kpiLoading} /> : null}

      {section === 'register' ? (
        <div className="space-y-2">
          {registerLoading ? <p className="text-xs text-slate-500">กำลังโหลดทะเบียนควบคุมการเบิก...</p> : null}
          <FinanceCashControlRegister
            items={registerItems}
            activeTab={registerTab}
            onTabChange={setRegisterTab}
            searchQuery={registerSearch}
            onSearchChange={setRegisterSearch}
          />
        </div>
      ) : null}

      {section === 'history' ? (
        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">เลขที่</th>
                <th className="px-3 py-2">วันที่</th>
                <th className="px-3 py-2">ประเภท</th>
                <th className="px-3 py-2">คู่บัญชี</th>
                <th className="px-3 py-2 text-right">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">ยังไม่มีรายการโอนในปีที่เลือก</td></tr>
              ) : transfers.map((tx) => (
                <tr key={tx.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">{tx.transactionNo}</td>
                  <td className="px-3 py-2">{tx.date}</td>
                  <td className="px-3 py-2">{tx.category}</td>
                  <td className="px-3 py-2">{tx.payerOrPayee}</td>
                  <td className="px-3 py-2 text-right font-bold">{baht(Math.abs(tx.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {section === 'reconcile' ? (
        <FinanceThreeWayReconciliation data={reconcile} loading={reconcileLoading} onRefresh={onRefreshParent} />
      ) : null}

      {section === 'report' ? (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          {/* Header & Export */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                รายงานสรุปการเบิกจ่ายเงินสด (Cash Disbursement Report)
              </h2>
              <p className="text-xs text-slate-500">
                ประมวลผล 12 ตัวชี้วัดสำคัญ (KPIs) จากฐานข้อมูลทะเบียนคุมและ Ledger กลาง
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportReportCsv}
                className="zms-action inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" /> ส่งออกรายงาน CSV
              </button>
            </div>
          </div>

          {/* 12 KPIs Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* 1. ยอดขอเบิกรวม */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="text-xs font-medium text-slate-500">1. ยอดขอเบิกรวม (Total Requested)</div>
              <div className="mt-1 text-xl font-black text-slate-800 tabular-nums">{baht(totalRequested)}</div>
            </div>
            {/* 2. ยอดอนุมัติรวม */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="text-xs font-medium text-slate-500">2. ยอดอนุมัติรวม (Total Approved)</div>
              <div className="mt-1 text-xl font-black text-slate-900 tabular-nums">{baht(totalApproved)}</div>
            </div>
            {/* 3. ยอดโอนส่งมอบรวม */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-3.5">
              <div className="text-xs font-medium text-teal-700">3. ยอดโอนส่งมอบรวม (Transferred)</div>
              <div className="mt-1 text-xl font-black text-teal-800 tabular-nums">{baht(totalTransferred)}</div>
            </div>
            {/* 4. ยอดจ่ายจริงรวม */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3.5">
              <div className="text-xs font-medium text-indigo-700">4. ยอดจ่ายจริงรวม (Actual Paid)</div>
              <div className="mt-1 text-xl font-black text-indigo-800 tabular-nums">{baht(totalActualPaid)}</div>
            </div>
            {/* 5. ยอดคงเหลือรวม */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5">
              <div className="text-xs font-medium text-amber-700">5. ยอดคงเหลือรวม (Remaining)</div>
              <div className="mt-1 text-xl font-black text-amber-800 tabular-nums">{baht(totalRemaining)}</div>
            </div>
            {/* 6. ยอดส่งคืนรวม */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5">
              <div className="text-xs font-medium text-emerald-700">6. ยอดส่งคืนรวม (Refunded)</div>
              <div className="mt-1 text-xl font-black text-emerald-800 tabular-nums">{baht(totalRefunded)}</div>
            </div>
            {/* 7. จำนวนรอบเบิกทั้งหมด */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="text-xs font-medium text-slate-500">7. จำนวนรอบเบิกทั้งหมด (Batches)</div>
              <div className="mt-1 text-xl font-black text-slate-800 tabular-nums">{totalBatches} <span className="text-xs font-normal text-slate-500">รอบ</span></div>
            </div>
            {/* 8. จำนวนรายการช่วยเหลือ */}
            <div className="rounded-2xl border border-teal-200 bg-teal-50/30 p-3.5">
              <div className="text-xs font-medium text-teal-700">8. รายการช่วยเหลือ (Aid Items)</div>
              <div className="mt-1 text-xl font-black text-teal-800 tabular-nums">{aidItemsCount} <span className="text-xs font-normal text-slate-500">รายการ</span></div>
            </div>
            {/* 9. จำนวนรายการบริหาร */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-3.5">
              <div className="text-xs font-medium text-blue-700">9. รายการบริหาร (Admin Items)</div>
              <div className="mt-1 text-xl font-black text-blue-800 tabular-nums">{adminItemsCount} <span className="text-xs font-normal text-slate-500">รายการ</span></div>
            </div>
            {/* 10. จำนวนรายการจ่ายแล้ว */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-3.5">
              <div className="text-xs font-medium text-emerald-700">10. รายการจ่ายแล้ว (Paid Items)</div>
              <div className="mt-1 text-xl font-black text-emerald-800 tabular-nums">{paidItemsCount} <span className="text-xs font-normal text-slate-500">รายการ</span></div>
            </div>
            {/* 11. จำนวนรายการค้างจ่าย */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-3.5">
              <div className="text-xs font-medium text-rose-700">11. รายการค้างจ่าย (Pending)</div>
              <div className="mt-1 text-xl font-black text-rose-800 tabular-nums">{pendingItemsCount} <span className="text-xs font-normal text-slate-500">รายการ</span></div>
            </div>
            {/* 12. อัตราการจ่ายสำเร็จ */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-3.5">
              <div className="text-xs font-medium text-indigo-700">12. อัตราการจ่ายสำเร็จ (Disbursement Rate)</div>
              <div className="mt-1 text-xl font-black text-indigo-800 tabular-nums">{disbursementRate.toFixed(1)}%</div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, disbursementRate))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReportCategory('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  reportCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                ทุกประเภท
              </button>
              <button
                type="button"
                onClick={() => setReportCategory('aid')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  reportCategory === 'aid'
                    ? 'bg-teal-700 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                เงินช่วยเหลือ
              </button>
              <button
                type="button"
                onClick={() => setReportCategory('admin')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  reportCategory === 'admin'
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                เงินบริหาร
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs w-full sm:w-72">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="ค้นหารายการในรายงาน..."
                className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-slate-50/80 font-bold text-slate-600">
                <tr>
                  <th className="py-3 pl-3 pr-2">#</th>
                  <th className="px-2.5 py-3">วันที่</th>
                  <th className="px-2.5 py-3">เลขที่เอกสาร</th>
                  <th className="px-2.5 py-3">รอบเบิก</th>
                  <th className="px-2.5 py-3">เจ้าหน้าที่</th>
                  <th className="px-2.5 py-3">วัตถุประสงค์</th>
                  <th className="px-2.5 py-3 text-right">ยอดอนุมัติ</th>
                  <th className="px-2.5 py-3 text-right">โอนส่งมอบ</th>
                  <th className="px-2.5 py-3 text-right">จ่ายจริง</th>
                  <th className="px-2.5 py-3 text-right">คงเหลือ</th>
                  <th className="px-2.5 py-3 text-right">ส่งคืน</th>
                  <th className="py-3 pl-2 pr-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReportItems.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-slate-400">
                      ไม่พบข้อมูลรายงานตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredReportItems.map((it, idx) => (
                    <tr key={`rpt-${it.id || idx}`} className="hover:bg-slate-50/60">
                      <td className="py-2.5 pl-3 pr-2 text-slate-400">{idx + 1}</td>
                      <td className="px-2.5 py-2.5 text-slate-600">{it.date}</td>
                      <td className="px-2.5 py-2.5 font-semibold text-slate-900">{it.documentNo}</td>
                      <td className="px-2.5 py-2.5 font-mono text-[11px] text-teal-700">{it.batchNo || '-'}</td>
                      <td className="px-2.5 py-2.5 text-slate-800">{it.staffName}</td>
                      <td className="px-2.5 py-2.5 max-w-[200px] truncate text-slate-600" title={it.purpose}>{it.purpose}</td>
                      <td className="px-2.5 py-2.5 text-right font-medium text-slate-900 tabular-nums">{baht(it.approvedAmount || 0)}</td>
                      <td className="px-2.5 py-2.5 text-right font-medium text-teal-700 tabular-nums">{baht(it.transferredAmount || 0)}</td>
                      <td className="px-2.5 py-2.5 text-right font-medium text-indigo-700 tabular-nums">{it.actualPaidAmount > 0 ? baht(it.actualPaidAmount) : '-'}</td>
                      <td className="px-2.5 py-2.5 text-right font-medium text-amber-700 tabular-nums">{baht(it.remainingAmount || 0)}</td>
                      <td className="px-2.5 py-2.5 text-right font-medium text-emerald-700 tabular-nums">{it.refundAmount > 0 ? baht(it.refundAmount) : '-'}</td>
                      <td className="py-2.5 pl-2 pr-3 text-center">
                        <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {it.itemStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
