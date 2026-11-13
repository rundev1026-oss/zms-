'use client';

import React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

export type ActionButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';

const VARIANTS: Record<ActionButtonVariant, string> = {
  primary: 'bg-[#0B2545] text-white hover:bg-[#133e6f]',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500',
  warning: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  outline: 'border border-[#0B2545] bg-white text-[#0B2545] hover:bg-slate-50',
};

export interface ResponsiveActionButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  label: string;
  variant?: ActionButtonVariant;
  loading?: boolean;
  iconPosition?: 'start' | 'end';
}

/**
 * Shared action button. Mobile hides the label through `.zms-action`.
 * Desktop keeps the icon and the label together.
 */
export function ResponsiveActionButton({
  icon: Icon,
  label,
  variant = 'primary',
  loading = false,
  iconPosition = 'start',
  className = '',
  type = 'button',
  disabled,
  title,
  ...rest
}: ResponsiveActionButtonProps) {
  const glyph = loading
    ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
    : <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-label={label}
      title={title || label}
      className={`zms-action inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {iconPosition === 'start' && glyph}
      <span>{label}</span>
      {iconPosition === 'end' && glyph}
    </button>
  );
}

export function ActionButtonGroup({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`zms-actions flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}
