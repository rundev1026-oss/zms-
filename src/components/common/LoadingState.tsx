'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  variant?: 'inline' | 'card' | 'fullscreen';
  className?: string;
}

export function LoadingState({
  message = 'กำลังโหลดข้อมูล...',
  subMessage = 'โปรดรอสักครู่ ระบบกำลังดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์',
  variant = 'card',
  className = '',
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 text-xs text-slate-500 py-1 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
        <span>{message}</span>
      </div>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 flex flex-col items-center max-w-sm text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm font-prompt">{message}</h3>
            {subMessage && (
              <p className="text-xs text-slate-500 mt-1 font-sarabun">{subMessage}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-white rounded-xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-800 text-sm font-prompt">{message}</h3>
        {subMessage && (
          <p className="text-xs text-slate-500 mt-1 font-sarabun max-w-md">{subMessage}</p>
        )}
      </div>
    </div>
  );
}

