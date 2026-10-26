'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// Global counter for active open modals to safely lock/unlock body scroll across stacked modals
let activeModalsCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

export function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (activeModalsCount === 0) {
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open-lock');
  }
  activeModalsCount++;
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  activeModalsCount = Math.max(0, activeModalsCount - 1);
  if (activeModalsCount === 0) {
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
    document.body.classList.remove('modal-open-lock');
  }
}

/**
 * React Portal Container: Renders children directly into document.body
 * Decouples modal from ancestor transforms, overflow, and local stacking contexts.
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
}

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  hideHeader?: boolean;
  headerBg?: string;
  headerTextColor?: string;
  contentClassName?: string;
  bodyClassName?: string;
  showCloseButton?: boolean;
  ariaLabel?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',      // 448px (confirmations, simple prompts)
  md: 'max-w-lg',      // 512px (status change, compact forms)
  lg: 'max-w-2xl',     // 672px (standard forms, transaction entry)
  xl: 'max-w-4xl',     // 896px (large forms, checklists)
  '2xl': 'max-w-5xl',  // 1024px (complex data, multi-tab tables)
  full: 'max-w-6xl',   // 1152px (6-section master registry details)
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  headerActions,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  hideHeader = false,
  headerBg = 'bg-[#0b2545]',
  headerTextColor = 'text-white',
  contentClassName = '',
  bodyClassName = '',
  showCloseButton = true,
  ariaLabel,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Manage body scroll lock safely
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => {
        unlockBodyScroll();
      };
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      {/* Overlay Backdrop - Fixed to Viewport, Top Level z-[1000] */}
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/65 backdrop-blur-xs overscroll-contain animate-fadeIn"
        onClick={(e) => {
          if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : ariaLabel || 'หน้าต่างข้อมูล'}
      >
        {/* Modal Dialog Card - Perfectly Centered, Responsive, Constrained Height */}
        <div
          ref={dialogRef}
          onClick={(e) => e.stopPropagation()}
          className={`relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden w-full ${SIZE_CLASSES[size]} max-h-[calc(100vh-20px)] sm:max-h-[calc(100vh-32px)] max-h-[calc(100dvh-20px)] sm:max-h-[calc(100dvh-32px)] overscroll-contain transition-all ${contentClassName}`}
        >
          {/* Header Bar */}
          {!hideHeader && (
            <div
              className={`p-4 sm:p-5 ${headerBg} ${headerTextColor} flex items-center justify-between gap-3 shrink-0 border-b border-slate-200/20`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {badge}
                </div>
                {title && (
                  <h3 className="text-base sm:text-lg font-black truncate leading-tight tracking-tight">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {headerActions}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors min-w-[32px] min-h-[32px] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-label="ปิดหน้าต่าง"
                    title="ปิดหน้าต่าง (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Modal Body - Primary Scrolling Container with overscroll containment */}
          <div
            className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 bg-slate-50/50 touch-scroll ${bodyClassName}`}
          >
            {children}
          </div>

          {/* Modal Footer */}
          {footer && (
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-end gap-2.5 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

/**
 * Standard In-App Confirmation Dialog
 * Replaces native browser alert() and confirm() with an elegant, brand-aligned modal.
 */
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  message?: React.ReactNode;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  description,
  message,
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  variant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  const handleClose = onCancel || onClose || (() => {});
  const displayDesc = description || message;
  const finalConfirmText = confirmLabel || confirmText || 'ยืนยัน';
  const finalCancelText = cancelLabel || cancelText || 'ยกเลิก';

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-sky-100 text-[#0b2545] flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs focus-visible:ring-rose-500';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs focus-visible:ring-amber-500';
      default:
        return 'bg-[#0b2545] hover:bg-[#133e6f] text-white shadow-xs focus-visible:ring-[#0b2545]';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : handleClose}
      size="sm"
      hideHeader
      closeOnOverlayClick={!isLoading}
      closeOnEsc={!isLoading}
    >
      <div className="p-2 space-y-4">
        <div className="flex items-start gap-3.5">
          {getIcon()}
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-base font-bold text-slate-900 leading-tight">
              {title}
            </h4>
            <div className="text-xs text-slate-600 mt-1 leading-relaxed">
              {displayDesc}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 min-h-[38px]"
          >
            {finalCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 min-h-[38px] ${getConfirmButtonClasses()}`}
          >
            {isLoading ? 'กำลังดำเนินการ...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
