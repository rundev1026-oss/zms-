'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface NotificationProps {
  id?: string;
  type?: NotificationType;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export function Notification({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}: NotificationProps) {
  const typeConfigs = {
    success: {
      icon: CheckCircle2,
      container: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      iconColor: 'text-emerald-600',
    },
    warning: {
      icon: AlertTriangle,
      container: 'bg-amber-50 text-amber-900 border-amber-200',
      iconColor: 'text-amber-600',
    },
    error: {
      icon: AlertCircle,
      container: 'bg-rose-50 text-rose-900 border-rose-200',
      iconColor: 'text-rose-600',
    },
    info: {
      icon: Info,
      container: 'bg-sky-50 text-sky-900 border-sky-200',
      iconColor: 'text-sky-600',
    },
  };

  const config = typeConfigs[type] || typeConfigs.info;
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 shadow-sm flex items-start gap-3 transition-all animate-fadeIn ${config.container} ${className}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />

      <div className="flex-1 space-y-0.5">
        {title && (
          <h4 className="text-xs font-semibold font-prompt">{title}</h4>
        )}
        <p className="text-xs font-sarabun leading-relaxed opacity-90">{message}</p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
          title="ปิดการแจ้งเตือน"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

