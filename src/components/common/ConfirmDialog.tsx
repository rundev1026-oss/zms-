'use client';

import React from 'react';
import { AlertTriangle, Info, CheckCircle2, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  variant = 'primary',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconContainer: 'bg-rose-100 text-rose-600',
      confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
    },
    warning: {
      icon: AlertTriangle,
      iconContainer: 'bg-amber-100 text-amber-600',
      confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
    },
    success: {
      icon: CheckCircle2,
      iconContainer: 'bg-emerald-100 text-emerald-600',
      confirmButton: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
    },
    primary: {
      icon: Info,
      iconContainer: 'bg-teal-100 text-teal-700',
      confirmButton: 'bg-[#0B2545] hover:bg-[#133e6f] text-white focus:ring-[#0B2545]',
    },
  };

  const currentStyle = variantStyles[variant] || variantStyles.primary;
  const Icon = currentStyle.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={!isLoading ? onClose : undefined}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          role="dialog"
          aria-modal="true"
          className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md p-6 border border-slate-100 animate-fadeIn"
        >
          <div className="flex items-start gap-4">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${currentStyle.iconContainer}`}>
              <Icon className="w-5 h-5" />
            </div>

            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-semibold text-slate-900 font-prompt">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-sarabun leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${currentStyle.confirmButton}`}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

