'use client';

import React, { useEffect, useState } from 'react';
import { Landmark, Scale, TableProperties, History, ShieldCheck, FileSpreadsheet } from 'lucide-react';
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
      const res = await fetch('/api/finance/workflow-actions?view=batch_list&tab=all');
      const body = await res.json();
      if (!cancelled && body.success) setReport(body.data);
    }
    load();
    return () => { cancelled = true; };
  }, [section]);

  const transfers = rows.filter((tx) => {
    const kind = String(tx.type);
    return kind === 'transfer' || kind === 'bank_transfer_in' || kind === 'bank_transfer_out';
  });

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
        <div className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <h2 className="text-base font-bold text-[#0B2545]">รายงานการเบิกเงิน</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['ส่งมาใหม่', report?.counts?.incoming, report?.amounts?.incoming],
              ['รอตรวจสอบ', report?.counts?.reviewing, report?.amounts?.reviewing],
              ['อนุมัติแล้ว', report?.counts?.approved, report?.amounts?.approved],
              ['ไม่อนุมัติ', report?.counts?.rejected, report?.amounts?.rejected],
            ].map(([label, count, amount]) => (
              <div key={String(label)} className="rounded-2xl border border-slate-200 p-3">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="text-2xl font-black text-[#0B2545]">{Number(count || 0)}</div>
                <div className="text-sm font-bold text-[#0D9488]">{baht(Number(amount || 0))}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr><th className="py-2">เลขที่รอบ</th><th>หัวข้อ</th><th>สถานะ</th><th className="text-right">ยอด</th></tr>
              </thead>
              <tbody>
                {(report?.items || []).map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="py-2 font-mono text-xs">{item.workflowNo}</td>
                    <td>{item.title}</td>
                    <td>{item.overallStatus}</td>
                    <td className="text-right font-bold">{baht(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
