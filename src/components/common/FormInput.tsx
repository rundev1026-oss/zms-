'use client';

import React, { forwardRef } from 'react';
import { LucideIcon, AlertCircle } from 'lucide-react';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: LucideIcon;
  suffix?: React.ReactNode;
  containerClassName?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      helperText,
      error,
      icon: Icon,
      suffix,
      className = '',
      containerClassName = '',
      required,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-slate-700 font-prompt"
          >
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative rounded-lg shadow-2xs">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Icon className="w-4 h-4" />
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            required={required}
            className={`
              w-full rounded-lg border text-xs sm:text-sm py-2 transition-colors font-sarabun
              ${Icon ? 'pl-9' : 'pl-3'}
              ${suffix ? 'pr-10' : 'pr-3'}
              ${
                error
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                  : 'border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-white'
              }
              disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />

          {suffix && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              {suffix}
            </div>
          )}
        </div>

        {error ? (
          <p className="flex items-center gap-1 text-[11px] text-rose-600 font-sarabun mt-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500 font-sarabun mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

