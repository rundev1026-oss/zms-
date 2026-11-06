'use client';

import React from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Heart,
  Landmark,
  ShieldCheck,
  RefreshCw,
  Coins
} from 'lucide-react';

export interface DonationKPIs {
  todayDonations: number;
  monthDonations: number;
  pendingVerificationCount: number;
  completedTransactionsCount: number;
  totalZakatDisbursed: number;
  auditedBalance: number;
}

interface DonationKPICardsProps {
  kpis: DonationKPIs;
  isLoading: boolean;
  onRefresh: () => void;
}

export function DonationKPICards({ kpis, isLoading, onRefresh }: DonationKPICardsProps) {
  const cards = [
    {
      id: 'today',
      title: 'ยอดรับบริจาควันนี้',
      value: `฿${kpis.todayDonations.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
      subtitle: 'บันทึกเข้าสู่ระบบเรียบร้อย',
      icon: Coins,
      gradient: 'from-emerald-500/10 to-emerald-600/5',
      border: 'border-emerald-200/80',
      textColor: 'text-emerald-950',
      iconColor: 'text-emerald-600',
      badge: 'Today',
      badgeBg: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'month',
      title: 'ยอดรับบริจาคเดือนนี้',
      value: `฿${kpis.monthDonations.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
      subtitle: 'ยอดสะสมรอบเดือนปัจจุบัน',
      icon: TrendingUp,
      gradient: 'from-teal-500/10 to-teal-600/5',
      border: 'border-teal-200/80',
      textColor: 'text-teal-950',
      iconColor: 'text-teal-600',
      badge: 'This Month',
      badgeBg: 'bg-teal-100 text-teal-800',
    },
    {
      id: 'pending',
      title: 'รายการรอตรวจสอบ',
      value: `${kpis.pendingVerificationCount} รายการ`,
      subtitle: 'สลิปโอนเงินรอเจ้าหน้าที่ยืนยัน',
      icon: Clock,
      gradient: 'from-amber-500/10 to-amber-600/5',
      border: 'border-amber-200/80',
      textColor: 'text-amber-950',
      iconColor: 'text-amber-600',
      badge: kpis.pendingVerificationCount > 0 ? 'Action Needed' : 'All Clear',
      badgeBg: kpis.pendingVerificationCount > 0 ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'completed',
      title: 'รายการชำระสำเร็จ',
      value: `${kpis.completedTransactionsCount} รายการ`,
      subtitle: 'ออกใบสำคัญรับเงินแล้ว',
      icon: CheckCircle2,
      gradient: 'from-blue-500/10 to-blue-600/5',
      border: 'border-blue-200/80',
      textColor: 'text-blue-950',
      iconColor: 'text-blue-600',
      badge: 'Verified',
      badgeBg: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'disbursed',
      title: 'ยอดจ่ายซะกาต',
      value: `฿${kpis.totalZakatDisbursed.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
      subtitle: 'จ่ายจริงแก่ผู้มีสิทธิ์ 8 อัสนัฟ',
      icon: Heart,
      gradient: 'from-rose-500/10 to-rose-600/5',
      border: 'border-rose-200/80',
      textColor: 'text-rose-950',
      iconColor: 'text-rose-600',
      badge: 'Disbursed',
      badgeBg: 'bg-rose-100 text-rose-800',
    },
    {
      id: 'audited',
      title: 'ยอดคงเหลือที่ตรวจสอบแล้ว',
      value: `฿${kpis.auditedBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
      subtitle: 'กระทบยอดสมุดบัญชีธนาคาร (GL)',
      icon: ShieldCheck,
      gradient: 'from-indigo-500/10 to-indigo-600/5',
      border: 'border-indigo-200/80',
      textColor: 'text-indigo-950',
      iconColor: 'text-indigo-600',
      badge: 'GL Reconciled',
      badgeBg: 'bg-indigo-100 text-indigo-800',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-emerald-800" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            ตัวชี้วัดทางการเงินและยอดรับบริจาคจริง (Real Database Metrics)
          </h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
          title="รีเฟรชข้อมูลจากฐานข้อมูลจริง"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>รีเฟรชยอด</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`p-4 rounded-xl bg-gradient-to-br ${card.gradient} bg-white border ${card.border} shadow-2xs relative overflow-hidden transition-all hover:shadow-xs`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.badgeBg}`}>
                  {card.badge}
                </span>
                <div className={`p-1.5 rounded-lg bg-white/80 shadow-2xs ${card.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <p className="text-xs font-medium text-slate-600 truncate">{card.title}</p>
              <p className={`text-lg font-black tracking-tight ${card.textColor} mt-0.5 truncate`}>
                {isLoading ? (
                  <span className="inline-block w-20 h-5 bg-slate-200 animate-pulse rounded" />
                ) : (
                  card.value
                )}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 truncate">{card.subtitle}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

