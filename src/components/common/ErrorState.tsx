'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
  message = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์หรือประมวลผลข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`w-full bg-rose-50/60 rounded-xl border border-rose-200 p-8 text-center flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="max-w-md space-y-1">
        <h3 className="font-semibold text-rose-900 text-sm font-prompt">{title}</h3>
        <p className="text-xs text-rose-700/80 font-sarabun leading-relaxed">{message}</p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>ลองใหม่อีกครั้ง</span>
        </button>
      )}
    </div>
  );
}

