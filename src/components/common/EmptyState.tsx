'use client';

import React from 'react';
import { Inbox, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export function EmptyState({
  title = 'ไม่พบข้อมูลในระบบ',
  description = 'ยังไม่มีรายการที่ตรงกับเงื่อนไขการค้นหาหรือยังไม่มีการบันทึกข้อมูลในส่วนนี้',
  icon: Icon = Inbox,
  action,
  className = '',
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div className={`w-full bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400">
        <Icon className="w-7 h-7 stroke-[1.5]" />
      </div>

      <div className="max-w-md space-y-1">
        <h3 className="font-semibold text-slate-800 text-sm font-prompt">{title}</h3>
        <p className="text-xs text-slate-500 font-sarabun leading-relaxed">{description}</p>
      </div>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0B2545] hover:bg-[#133e6f] rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}

