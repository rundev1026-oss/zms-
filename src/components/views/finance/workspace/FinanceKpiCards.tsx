'use client';

import React from 'react';
import { Building2, Vault, HandCoins, ArrowDownRight, ArrowUpRight, RotateCcw, CheckCircle2 } from 'lucide-react';

export interface KpiData {
  bank: {
    openingBalance: number;
    incomingAmount: number;
    outgoingAmount: number;
    currentBalance: number;
  };
  treasurer: {
    openingBalance: number;
    receivedFromBank: number;
    paidToStaff: number;
    refundReceived: number;
    currentBalance: number;
  };
  staff: {
    receivedCash: number;
    reservedCash: number;
    actualDisbursed: number;
    refundedCash: number;
    currentBalance: number;
  };
  systemTotal: number;
}

function fmt(n: number): string {
  return (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function FinanceKpiCards({ data, loading }: { data: KpiData | null; loading?: boolean }) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="h-4 w-32 rounded bg-slate-200"></div>
            <div className="mt-4 h-8 w-44 rounded bg-slate-200"></div>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded bg-slate-100"></div>
              <div className="h-3 w-3/4 rounded bg-slate-100"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { bank, treasurer, staff } = data;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {/* CARD A: บัญชีธนาคาร (Bank Accounts) */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-white via-teal-50/20 to-teal-50/40 p-5 sm:p-5.5 shadow-xs transition-all hover:shadow-md">
        <div className="flex items-center justify-between border-b border-teal-100/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-800">บัญชี A</div>
              <div className="text-sm font-bold text-slate-800">บัญชีธนาคาร (Bank Accounts)</div>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
            <CheckCircle2 className="h-3 w-3" /> ออนไลน์
          </span>
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium text-slate-500">ยอดคงเหลือรวมในธนาคาร</div>
          <div className="text-2xl sm:text-[28px] font-black tracking-tight text-teal-900">
            ฿{fmt(bank.currentBalance)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
          <div>
            <div className="text-[11px] text-slate-400">ยอดยกมา</div>
            <div className="font-semibold text-slate-700 whitespace-nowrap">฿{fmt(bank.openingBalance)}</div>
          </div>
          <div>
            <div className="flex items-center gap-0.5 text-[11px] text-emerald-600">
              <ArrowDownRight className="h-3 w-3 shrink-0" /> เงินเข้า
            </div>
            <div className="font-semibold text-emerald-700 whitespace-nowrap">฿{fmt(bank.incomingAmount)}</div>
          </div>
          <div>
            <div className="flex items-center gap-0.5 text-[11px] text-amber-600">
              <ArrowUpRight className="h-3 w-3 shrink-0" /> เงินออก
            </div>
            <div className="font-semibold text-amber-700 whitespace-nowrap">฿{fmt(bank.outgoingAmount)}</div>
          </div>
        </div>
      </div>

      {/* CARD B: บัญชีเหรัญญิก (Treasurer Cash Float) */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40 p-5 sm:p-5.5 shadow-xs transition-all hover:shadow-md">
        <div className="flex items-center justify-between border-b border-amber-100/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
              <Vault className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">บัญชี B</div>
              <div className="text-sm font-bold text-slate-800">บัญชีเหรัญญิก (Treasurer Cash)</div>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            คลังสำนักงาน
          </span>
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium text-slate-500">เงินสดคงเหลือในมือเหรัญญิก</div>
          <div className="text-2xl sm:text-[28px] font-black tracking-tight text-amber-900">
            ฿{fmt(treasurer.currentBalance)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-1.5 border-t border-slate-100 pt-3 text-xs">
          <div>
            <div className="text-[11px] text-slate-400">ยอดยกมา</div>
            <div className="font-semibold text-slate-700 whitespace-nowrap">฿{fmt(treasurer.openingBalance)}</div>
          </div>
          <div>
            <div className="flex items-center gap-0.5 text-[11px] text-teal-600">
              <ArrowDownRight className="h-3 w-3 shrink-0" /> รับจากธนาคาร
            </div>
            <div className="font-semibold text-teal-700 whitespace-nowrap">฿{fmt(treasurer.receivedFromBank)}</div>
          </div>
          <div>
            <div className="flex items-center gap-0.5 text-[11px] text-rose-600">
              <ArrowUpRight className="h-3 w-3 shrink-0" /> โอนให้เจ้าหน้าที่
            </div>
            <div className="font-semibold text-rose-700 whitespace-nowrap">฿{fmt(treasurer.paidToStaff)}</div>
          </div>
          <div>
            <div className="flex items-center gap-0.5 text-[11px] text-emerald-600">
              <RotateCcw className="h-3 w-3 shrink-0" /> เงินคืน
            </div>
            <div className="font-semibold text-emerald-700 whitespace-nowrap">฿{fmt(treasurer.refundReceived)}</div>
          </div>
        </div>
      </div>

      {/* CARD C: เงินสดเจ้าหน้าที่ (Staff Cash Float) */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-blue-50/40 p-5 sm:p-5.5 shadow-xs transition-all hover:shadow-md md:col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between border-b border-blue-100/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-800">บัญชี C</div>
              <div className="text-sm font-bold text-slate-800">เงินสดเจ้าหน้าที่ (Staff Cash)</div>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
            เงินยืมทดรอง
          </span>
        </div>

        <div className="mt-4">
          <div className="text-xs font-medium text-slate-500">ยอดเงินสดคงเหลือในมือเจ้าหน้าที่</div>
          <div className="text-2xl sm:text-[28px] font-black tracking-tight text-blue-900">
            ฿{fmt(staff.currentBalance)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-1.5 border-t border-slate-100 pt-3 text-xs">
          <div>
            <div className="text-[11px] text-slate-400">รับจากเหรัญญิก</div>
            <div className="font-semibold text-slate-700 whitespace-nowrap">฿{fmt(staff.receivedCash)}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">ยอดยกมา</div>
            <div className="font-semibold text-amber-700 whitespace-nowrap">฿{fmt(staff.reservedCash)}</div>
          </div>
          <div>
            <div className="flex items-center gap-0.5 text-[11px] text-indigo-600">
              <ArrowUpRight className="h-3 w-3 shrink-0" /> จ่ายจริง
            </div>
            <div className="font-semibold text-indigo-700 whitespace-nowrap">฿{fmt(staff.actualDisbursed)}</div>
          </div>
          <div>
            <div className="flex items-center gap-0.5 text-[11px] text-emerald-600">
              <RotateCcw className="h-3 w-3 shrink-0" /> คืนแล้ว
            </div>
            <div className="font-semibold text-emerald-700 whitespace-nowrap">฿{fmt(staff.refundedCash)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
