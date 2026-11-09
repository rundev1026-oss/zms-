'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, Scale, Building2, Vault, HandCoins, ArrowRight, ShieldCheck } from 'lucide-react';

export interface ReconciliationData {
  isBalanced: boolean;
  discrepancy: number;
  statusBadge: string;
  systemTotal: number;
  balances: {
    bankBalance: number;
    treasurerCash: number;
    staffCash: number;
  };
  checks: Array<{
    id: string;
    title: string;
    description: string;
    leftLabel: string;
    leftValue: number;
    rightLabel: string;
    rightValue: number;
    diff: number;
    passed: boolean;
  }>;
  equation: {
    formula: string;
    terms: Array<{ label: string; amount: number }>;
    total: number;
  };
}

function fmt(n: number): string {
  return (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function FinanceThreeWayReconciliation({
  data,
  loading,
  onRefresh,
}: {
  data: ReconciliationData | null;
  loading?: boolean;
  onRefresh?: () => void;
}) {
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-xs"></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"></div>
          ))}
        </div>
      </div>
    );
  }

  const { isBalanced, discrepancy, systemTotal, balances, checks } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Equation */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-6 shadow-xs transition-all ${
          isBalanced
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/30'
            : 'border-rose-200 bg-gradient-to-br from-rose-50/60 via-white to-amber-50/30'
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isBalanced ? 'bg-emerald-600 text-white shadow-xs' : 'bg-rose-600 text-white shadow-xs'
              }`}
            >
              {isBalanced ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold ${
                    isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isBalanced ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {data.statusBadge}
                </span>
                {discrepancy !== 0 && (
                  <span className="text-xs font-semibold text-rose-600">
                    ผลต่าง: ฿{fmt(discrepancy)} บาท
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-800">
                แดชบอร์ดการกระทบยอด 3 ทาง (3-Way Cash Reconciliation)
              </h2>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6">
            <div className="text-xs font-medium text-slate-500">ยอดเงินรวมในระบบทั้งหมด</div>
            <div className="text-2xl font-black tracking-tight text-slate-900">
              ฿{fmt(systemTotal)} <span className="text-sm font-normal text-slate-500">บาท</span>
            </div>
          </div>
        </div>

        {/* The Equation Breakdown */}
        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            สมการตรวจสอบยอดเงินระบบ (System Balance Equation)
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
            {/* Bank */}
            <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-teal-900">
              <Building2 className="h-4 w-4 text-teal-600" />
              <div>
                <span className="font-medium text-slate-500">ธนาคาร: </span>
                <span className="font-bold">฿{fmt(balances.bankBalance)}</span>
              </div>
            </div>

            <span className="text-base font-bold text-slate-400">+</span>

            {/* Treasurer */}
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
              <Vault className="h-4 w-4 text-amber-600" />
              <div>
                <span className="font-medium text-slate-500">เหรัญญิก: </span>
                <span className="font-bold">฿{fmt(balances.treasurerCash)}</span>
              </div>
            </div>

            <span className="text-base font-bold text-slate-400">+</span>

            {/* Staff */}
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-blue-900">
              <HandCoins className="h-4 w-4 text-blue-600" />
              <div>
                <span className="font-medium text-slate-500">เจ้าหน้าที่: </span>
                <span className="font-bold">฿{fmt(balances.staffCash)}</span>
              </div>
            </div>

            <span className="text-base font-bold text-slate-400">=</span>

            {/* Total */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white">
              <Scale className="h-4 w-4 text-emerald-400" />
              <div>
                <span className="text-xs text-slate-300">รวม 3 ทาง: </span>
                <span className="font-black text-emerald-300">฿{fmt(systemTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Verification Check Cards */}
      <div>
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-slate-800">
            รายการตรวจสอบความถูกต้อง 4 ขั้นตอน (4 Reconciliation Points)
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900"
            >
              รีเฟรชข้อมูล
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {checks.map((chk) => (
            <div
              key={chk.id}
              className={`rounded-2xl border p-4 shadow-2xs transition-all ${
                chk.passed ? 'border-slate-200 bg-white hover:border-emerald-200' : 'border-rose-300 bg-rose-50/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-slate-800">{chk.title}</div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    chk.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {chk.passed ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" /> ยอดตรงกัน
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3" /> พบผลต่าง ฿{fmt(chk.diff)}
                    </>
                  )}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{chk.description}</div>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs">
                <div>
                  <div className="text-[11px] text-slate-400">{chk.leftLabel}</div>
                  <div className="font-bold text-slate-800">฿{fmt(chk.leftValue)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">{chk.rightLabel}</div>
                  <div className="font-bold text-slate-800">฿{fmt(chk.rightValue)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
