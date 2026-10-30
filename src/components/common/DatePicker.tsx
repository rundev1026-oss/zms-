'use client';

import React from 'react';
import { Calendar, AlertCircle } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  helperText,
  error,
  className = '',
  containerClassName = '',
}: DatePickerProps) {
  // Format Thai Buddhist Year helper label if date is selected
  let thaiFormattedDate = '';
  if (value && value.includes('-')) {
    const [y, m, d] = value.split('-');
    const yearBe = parseInt(y, 10) + 543;
    const monthsTh = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const monthIndex = parseInt(m, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      thaiFormattedDate = `${parseInt(d, 10)} ${monthsTh[monthIndex]} ${yearBe}`;
    }
  }

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-xs font-medium text-slate-700 font-prompt">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-2xs">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Calendar className="w-4 h-4" />
        </div>

        <input
          type="date"
          value={value || ''}
          min={min}
          max={max}
          disabled={disabled}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className={`
            w-full rounded-lg border text-xs sm:text-sm py-2 pl-9 pr-3 transition-colors font-sarabun bg-white
            ${
              error
                ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                : 'border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600'
            }
            disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
            ${className}
          `}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] font-sarabun">
        {error ? (
          <p className="flex items-center gap-1 text-rose-600">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="text-slate-500">{helperText}</p>
        ) : (
          <span />
        )}

        {thaiFormattedDate && (
          <span className="text-teal-700 font-medium">({thaiFormattedDate})</span>
        )}
      </div>
    </div>
  );
}

