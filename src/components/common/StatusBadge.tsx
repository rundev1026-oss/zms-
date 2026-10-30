'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  HelpCircle, 
  ShieldCheck, 
  RefreshCw, 
  FileText 
} from 'lucide-react';

export type StatusVariant = 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'neutral' 
  | 'primary'
  | 'teal';

interface StatusBadgeProps {
  status: string;
  label?: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  variant,
  size = 'md',
  showDot = true,
  showIcon = false,
  className = '',
}: StatusBadgeProps) {
  // Normalize status string for lookup
  const normStatus = (status || '').toLowerCase().trim();

  // Resolve display label if not provided
  let displayLabel = label;
  let resolvedVariant: StatusVariant = variant || 'neutral';
  let IconComponent = Clock;

  if (!displayLabel) {
    switch (normStatus) {
      case 'active':
      case 'completed':
      case 'eligible':
      case 'approved':
      case 'disbursed':
      case 'balanced':
      case 'healthy':
      case 'published':
        displayLabel = normStatus === 'active' ? 'ใช้งานปกติ'
          : normStatus === 'eligible' ? 'ผ่านเกณฑ์ได้รับสิทธิ์'
          : normStatus === 'approved' ? 'อนุมัติแล้ว'
          : normStatus === 'disbursed' ? 'จ่ายเงินแล้ว'
          : normStatus === 'balanced' ? 'กระทบยอดลงตัว'
          : normStatus === 'healthy' ? 'ระบบสมบูรณ์ 100%'
          : 'เสร็จสมบูรณ์';
        resolvedVariant = variant || 'success';
        IconComponent = CheckCircle2;
        break;

      case 'pending':
      case 'pending_approval':
      case 'pending_review':
      case 'submitted':
      case 'wait_disbursement':
      case 'under_assessment':
      case 'doc_review':
      case 'in_progress':
        displayLabel = normStatus === 'pending_approval' ? 'รอพิจารณาอนุมัติ'
          : normStatus === 'pending_review' ? 'รอตรวจสอบเอกสาร'
          : normStatus === 'submitted' ? 'ยื่นคำขอแล้ว'
          : normStatus === 'wait_disbursement' ? 'รอการเบิกจ่าย'
          : normStatus === 'under_assessment' ? 'อยู่ระหว่างประเมิน'
          : normStatus === 'doc_review' ? 'ตรวจเอกสาร'
          : 'รอดำเนินการ';
        resolvedVariant = variant || 'warning';
        IconComponent = Clock;
        break;

      case 'rejected':
      case 'ineligible':
      case 'suspended':
      case 'discrepancy':
      case 'failed':
      case 'degraded':
      case 'cancelled':
        displayLabel = normStatus === 'rejected' ? 'ปฏิเสธคำขอ'
          : normStatus === 'ineligible' ? 'ไม่ผ่านเกณฑ์สิทธิ์'
          : normStatus === 'suspended' ? 'ระงับชั่วคราว'
          : normStatus === 'discrepancy' ? 'พบยอดต่าง / ไม่ตรง'
          : normStatus === 'degraded' ? 'พบข้อผิดพลาด'
          : 'ไม่ผ่านเกณฑ์';
        resolvedVariant = variant || 'danger';
        IconComponent = XCircle;
        break;

      case 'draft':
      case 'need_info':
      case 'needs_correction':
        displayLabel = normStatus === 'draft' ? 'ฉบับร่าง'
          : 'ส่งกลับแก้ไข / ขอข้อมูลเพิ่ม';
        resolvedVariant = variant || 'info';
        IconComponent = FileText;
        break;

      case 'archived':
      case 'inactive':
        displayLabel = normStatus === 'archived' ? 'จัดเก็บประวัติ' : 'ปิดใช้งาน';
        resolvedVariant = variant || 'neutral';
        IconComponent = HelpCircle;
        break;

      default:
        displayLabel = status;
        resolvedVariant = variant || 'neutral';
        IconComponent = AlertCircle;
    }
  }

  // Variant color definitions based on Enterprise Palette
  const variantStyles: Record<StatusVariant, { badge: string; dot: string }> = {
    success: {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    warning: {
      badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
      dot: 'bg-amber-500',
    },
    danger: {
      badge: 'bg-rose-50 text-rose-800 border-rose-200/80',
      dot: 'bg-rose-500',
    },
    info: {
      badge: 'bg-sky-50 text-sky-800 border-sky-200/80',
      dot: 'bg-sky-500',
    },
    teal: {
      badge: 'bg-teal-50 text-teal-800 border-teal-200/80',
      dot: 'bg-teal-500',
    },
    primary: {
      badge: 'bg-[#0B2545]/10 text-[#0B2545] border-[#0B2545]/20',
      dot: 'bg-[#0B2545]',
    },
    neutral: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
    },
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  };

  const style = variantStyles[resolvedVariant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border transition-colors shadow-2xs ${style.badge} ${sizeStyles[size]} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`}
          aria-hidden="true"
        />
      )}
      {showIcon && (
        <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}

