'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';
import { Toast } from '@/types';

export function GlobalToastContainer() {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div 
      className="fixed top-16 sm:top-20 right-3 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-[calc(100vw-24px)] sm:max-w-md pointer-events-none select-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast: Toast) => {
        let badgeColor = 'bg-slate-900/95 text-slate-100 border-slate-700/60';
        let icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;
        let typeBadge = 'ข้อมูล';
        let badgeStyle = 'bg-sky-500/20 text-sky-300 border-sky-500/30';

        if (toast.type === 'success') {
          badgeColor = 'bg-[#062419]/95 text-emerald-100 border-emerald-500/50 shadow-emerald-950/40';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          typeBadge = 'สำเร็จ';
          badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
        } else if (toast.type === 'error') {
          badgeColor = 'bg-[#2a080c]/95 text-rose-100 border-rose-500/50 shadow-rose-950/40';
          icon = <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />;
          typeBadge = 'ข้อผิดพลาด';
          badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
        } else if (toast.type === 'warning') {
          badgeColor = 'bg-[#281804]/95 text-amber-100 border-amber-500/50 shadow-amber-950/40';
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          typeBadge = 'แจ้งเตือน';
          badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
        } else {
          badgeColor = 'bg-[#071d36]/95 text-sky-100 border-sky-500/50 shadow-sky-950/40';
          icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;
          typeBadge = 'แจ้งข้อมูล';
          badgeStyle = 'bg-sky-500/20 text-sky-300 border-sky-500/30';
        }

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-2xl flex items-start gap-3 border backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-2 fade-in ${badgeColor}`}
          >
            <div className="pt-0.5">{icon}</div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${badgeStyle}`}>
                  {typeBadge}
                </span>
                {toast.title && (
                  <span className="text-xs font-bold truncate">
                    {toast.title}
                  </span>
                )}
              </div>
              <div className="text-xs sm:text-sm font-medium leading-relaxed break-words">
                {toast.message}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="zms-action text-slate-400 hover:text-white transition-colors p-1.5 -mr-1 -mt-1 rounded-lg hover:bg-white/10 shrink-0"
              title="ปิดแจ้งเตือน"
              aria-label="ปิดแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
