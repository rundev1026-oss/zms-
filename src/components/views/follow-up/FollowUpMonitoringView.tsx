'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { formatPersonName } from '@zms/shared';
import { useApp } from '@/context/AppContext';
import { FollowUpPlan, FollowUpSummaryStats, FollowUpStatus } from '@/types';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  PlusCircle, 
  RefreshCw, 
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Building2, 
  UserCheck, 
  TrendingUp, 
  FileText,
  MapPin,
  Camera,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  ExternalLink,
  SlidersHorizontal,
  Settings,
  List,
  LayoutGrid,
  History,
} from 'lucide-react';
import { FollowUpDetailModal } from './FollowUpDetailModal';
import { ManageFollowUpModal } from './ManageFollowUpModal';
import { CardViewGrid } from '@/components/common/CardViewGrid';
import { useCardViewSettings } from '@/hooks/useCardViewSettings';
import { CardViewLayout, SIZE_PRESETS, resolveCardPageSize } from '@/lib/cardViewSettings';

interface FollowUpMonitoringViewProps {
  onNavigate?: (view: string, extra?: any) => void;
  initialPlanId?: string;
}

const FOLLOW_UP_VIEW_STORAGE_KEY = 'zms_followup_view_mode';

const ASNAF_LABELS: Record<string, string> = {
  faqir: 'ฟะกีร (ผู้ยากจนข้นแค้น)',
  fakir: 'ฟะกีร (ผู้ยากจนข้นแค้น)',
  miskin: 'มิสกีน (ผู้มีรายได้ไม่พอใช้)',
  faqir_miskin: 'ฟากีร–มิสกิน',
  amil: 'อามิล (เจ้าหน้าที่ซะกาต)',
  muallaf: 'มุอัลลัฟ (ผู้มีใจผูกพัน)',
  riqab: 'ริกอบ',
  gharimin: 'ฆอริมีน (ผู้มีหนี้สินล้นพ้น)',
  fisabilillah: 'ฟีสะบีลิลลาฮ์',
  ibnsabil: 'อิบนุสสะบีล',
  humanitarian: 'มนุษยธรรม',
};

function formatAsnaf(value?: string) {
  if (!value) return 'ไม่ระบุ';
  return ASNAF_LABELS[value.trim().toLowerCase()] || value;
}

function formatBaht(amount: number) {
  return amount.toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

const GENERIC_MEMBER_NAMES = new Set(['ผู้ขอรับความช่วยเหลือ', 'ผู้รับความช่วยเหลือ', 'ผู้รับประโยชน์']);

function beneficiaryDisplayName(name?: string) {
  const text = (name || '').trim();
  if (!text || text === 'null' || text === 'undefined') return '';
  return text;
}

function linkedMemberName(plan: FollowUpPlan, registries: { id: string; fullName?: string; titlePrefix?: string; firstName?: string; lastName?: string }[]) {
  const stored = beneficiaryDisplayName(plan.beneficiaryName);
  const linked = registries.find((item) => item.id === plan.beneficiaryId);
  const linkedName = linked ? beneficiaryDisplayName(formatPersonName(linked) || linked.fullName) : '';
  if (linkedName && (!stored || GENERIC_MEMBER_NAMES.has(stored))) return linkedName;
  return stored;
}

function financeStatusLabel(plan: FollowUpPlan) {
  const approved = typeof plan.approvedAmount === 'number' ? plan.approvedAmount : 0;
  const paid = typeof plan.disbursedAmount === 'number' ? plan.disbursedAmount : 0;
  if (paid > 0 && approved > paid) return 'จ่ายบางส่วน';
  if (paid > 0) return 'เบิกจ่ายแล้ว';
  if (approved > 0 || plan.approvedDate) return 'รอเบิกจ่าย';
  return 'รออนุมัติ';
}

function followUpProgressPercent(plan: FollowUpPlan) {
  if (plan.minVisits <= 0) return 100;
  return Math.min(100, Math.round((plan.completedVisits / plan.minVisits) * 100));
}

function FollowUpListMessage({
  icon,
  title,
  detail,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-12 px-4 text-center text-xs text-slate-400">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="font-bold text-slate-700">{title}</p>
      <p className="text-[11px] text-slate-400 mt-1">{detail}</p>
      {action}
    </div>
  );
}

function FollowUpPlanCards({
  plans,
  isLoading,
  loadError,
  canViewAmount,
  onRetry,
  onViewDetail,
  onManage,
  onViewHistory,
  statusBadge,
  layout,
  registries,
}: {
  plans: FollowUpPlan[];
  isLoading: boolean;
  loadError: string | null;
  canViewAmount: boolean;
  onRetry: () => void;
  onViewDetail: (planId: string) => void;
  onManage: (planId: string) => void;
  onViewHistory: (planId: string) => void;
  statusBadge: (status: FollowUpPlan['status']) => React.ReactNode;
  layout: CardViewLayout;
  registries: { id: string; fullName?: string; titlePrefix?: string; firstName?: string; lastName?: string }[];
}) {
  if (isLoading) {
    return (
      <FollowUpListMessage
        icon={<div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />}
        title="กำลังโหลดข้อมูลการติดตามผล..."
        detail="กำลังดึงรายการจากฐานข้อมูล"
      />
    );
  }

  if (loadError && plans.length === 0) {
    return (
      <FollowUpListMessage
        icon={<AlertCircle className="w-8 h-8 text-rose-400" />}
        title="โหลดรายการติดตามผลไม่สำเร็จ"
        detail={loadError}
        action={
          <button
            type="button"
            onClick={onRetry}
            className="zms-action mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            ลองอีกครั้ง
          </button>
        }
      />
    );
  }

  if (plans.length === 0) {
    return (
      <FollowUpListMessage
        icon={<ClipboardCheck className="w-8 h-8 text-slate-300" />}
        title="ไม่พบรายการติดตามผลที่ตรงกับเงื่อนไข"
        detail='ลองเปลี่ยนคำค้นหาหรือกดปุ่ม "ล้างตัวกรอง"'
      />
    );
  }

  const preset = SIZE_PRESETS[layout.size];

  return (
    <CardViewGrid layout={layout} className="px-0 py-3 sm:p-4">
      {plans.map((plan) => {
        const progressPct = plan.minVisits > 0 ? followUpProgressPercent(plan) : 0;
        const followUpComplete = plan.minVisits > 0 && plan.completedVisits >= plan.minVisits;
        const approvedAmount = typeof plan.approvedAmount === 'number' ? plan.approvedAmount : null;
        const showAmount = canViewAmount && approvedAmount !== null;
        const memberName = linkedMemberName(plan, registries);
        const moneyStatus = financeStatusLabel(plan);

        return (
          <article
            key={plan.id}
            className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xs"
            style={{ minHeight: layout.minHeightPx, fontSize: preset.bodyPx }}
          >
            <div className="border-b border-slate-100 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">APP {plan.applicationNo}</span>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">REG {plan.registrationNo}</span>
                <div className="ml-auto shrink-0">{statusBadge(plan.status)}</div>
              </div>
              <p className="mt-1 text-[12px] leading-5 text-slate-500">วันที่อนุมัติ {plan.approvedDate || '—'}</p>
            </div>

            <div className="px-3 pt-3">
              <h3 className="break-words text-[18px] font-black leading-6 text-[#0B2545]" style={{ fontSize: Math.max(preset.titlePx, 18) }}>{memberName || 'ยังไม่มีชื่อในทะเบียนที่เชื่อมโยง'}</h3>
              <p className="mt-1 text-[13px] leading-5 text-slate-600">
                {formatAsnaf(plan.asnafCategory)}
                <span className="px-1 text-slate-300">·</span>
                {plan.branchName || 'ส่วนกลาง'}
              </p>
            </div>

            <dl className="mx-3 mt-3 space-y-1.5 rounded-xl bg-[#F4F7FB] p-3 text-[13px]">
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-slate-500">ประเภท</dt>
                <dd className="min-w-0 break-words text-right font-bold text-slate-800">{plan.assistanceTypeName}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-slate-500">รูปแบบ</dt>
                <dd className="min-w-0 break-words text-right font-semibold text-slate-800">{plan.assistanceFormatName || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">รายละเอียดหรือวัตถุประสงค์</dt>
                <dd className="mt-0.5 line-clamp-3 leading-5 text-slate-700">{plan.assistancePurpose || plan.notes || '—'}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-slate-500">สถานะการเงิน</dt>
                <dd className="text-right font-bold text-[#0B2545]">{moneyStatus}</dd>
              </div>
              {showAmount && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-slate-500">วงเงินที่อนุมัติ</dt>
                  <dd className="text-right font-black tabular-nums text-[#0D9488]">{formatBaht(approvedAmount)} บาท</dd>
                </div>
              )}
            </dl>

            <div className="px-3 py-3 text-[13px]">
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-[11px] font-bold text-slate-500">ต้องติดตาม</p>
                  <p className="font-black tabular-nums text-[#0B2545]">{plan.minVisits}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500">ติดตามแล้ว</p>
                  <p className="font-black tabular-nums text-[#0D9488]">{plan.completedVisits}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500">เหลือ</p>
                  <p className="font-black tabular-nums text-slate-800">{plan.remainingVisits}</p>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-[#0D9488]" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="mt-1 text-[12px] font-bold text-teal-800">
                {followUpComplete ? `ติดตามครบ ${plan.completedVisits}/${plan.minVisits} ครั้ง` : `ติดตามแล้ว ${plan.completedVisits}/${plan.minVisits} ครั้ง`}
              </p>
              <dl className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-bold text-slate-500">วันที่ติดตามล่าสุด</dt>
                  <dd className="font-semibold text-slate-800">{plan.lastFollowupDate || 'ยังไม่มีการติดตาม'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold text-slate-500">วันนัดครั้งถัดไป</dt>
                  <dd className="font-semibold text-slate-800">{plan.nextFollowupDate || 'ยังไม่ได้กำหนด'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-bold text-slate-500">เจ้าหน้าที่ผู้รับผิดชอบ</dt>
                  <dd className="break-words font-semibold text-slate-800">{plan.assignedOfficerName?.trim() || 'ยังไม่ได้มอบหมาย'}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-auto grid grid-cols-3 justify-items-center gap-2 border-t border-slate-100 px-3 py-2.5 lg:flex lg:flex-wrap lg:justify-end">
              <button
                type="button"
                onClick={() => onViewDetail(plan.id)}
                className="zms-action inline-flex h-11 w-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-800 hover:bg-slate-200 lg:h-auto lg:w-auto lg:px-2.5 lg:py-2"
                aria-label="ดูรายละเอียด"
                title="ดูรายละเอียด"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden lg:inline">ดูรายละเอียด</span>
              </button>
              <button
                type="button"
                onClick={() => onManage(plan.id)}
                className="zms-action inline-flex h-11 w-11 items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 text-xs font-bold text-teal-800 hover:bg-teal-100 lg:h-auto lg:w-auto lg:px-2.5 lg:py-2"
                aria-label="จัดการติดตาม"
                title="จัดการติดตาม"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden lg:inline">จัดการติดตาม</span>
              </button>
              <button
                type="button"
                onClick={() => onViewHistory(plan.id)}
                className="zms-action inline-flex h-11 w-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 lg:h-auto lg:w-auto lg:px-2.5 lg:py-2"
                aria-label="ประวัติการติดตาม"
                title="ประวัติการติดตาม"
              >
                <History className="h-4 w-4" />
                <span className="hidden lg:inline">ประวัติการติดตาม</span>
              </button>
            </div>
          </article>
        );
      })}
    </CardViewGrid>
  );
}

export function FollowUpMonitoringView({ onNavigate, initialPlanId }: FollowUpMonitoringViewProps) {
  const { currentUser, showToast, registries } = useApp();
  const { layout: cardLayout } = useCardViewSettings('followup');

  const [plans, setPlans] = useState<FollowUpPlan[]>([]);
  const [stats, setStats] = useState<FollowUpSummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // SECTION 3: Filters & Search States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRegistryNo, setFilterRegistryNo] = useState<string>('');
  const [filterAssistanceNo, setFilterAssistanceNo] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTabCard, setActiveTabCard] = useState<'all' | 'due' | 'overdue' | 'in_progress' | 'completed'>('all');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Popups & Modals States
  const [selectedPlanIdForDetail, setSelectedPlanIdForDetail] = useState<string | null>(initialPlanId || null);
  const [detailInitialTab, setDetailInitialTab] = useState<'overview' | 'history'>('overview');
  const [selectedPlanIdForManage, setSelectedPlanIdForManage] = useState<string | null>(null);
  const [manageInitialTab, setManageInitialTab] = useState<'record' | 'schedule' | 'assign' | 'settings' | 'history'>('record');

  // Fetch real data from database via API
  const canViewAssistanceAmount = ['super_admin', 'executive', 'finance'].includes(currentUser.role);

  useEffect(() => {
    const stored = window.localStorage.getItem(FOLLOW_UP_VIEW_STORAGE_KEY);
    if (stored === 'card' || stored === 'table') {
      setViewMode(stored);
    }
  }, []);

  const handleViewModeChange = (mode: 'table' | 'card') => {
    setViewMode(mode);
    window.localStorage.setItem(FOLLOW_UP_VIEW_STORAGE_KEY, mode);
  };

  const openPlanDetail = (planId: string, tab: 'overview' | 'history' = 'overview') => {
    setDetailInitialTab(tab);
    setSelectedPlanIdForDetail(planId);
  };

  const fetchFollowUps = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (filterRegistryNo.trim()) params.append('registrationNo', filterRegistryNo.trim());
      if (filterAssistanceNo.trim()) params.append('applicationNo', filterAssistanceNo.trim());
      if (selectedType !== 'all') params.append('assistanceType', selectedType);
      if (selectedBranch !== 'all') params.append('branchId', selectedBranch);
      if (selectedOfficer !== 'all') params.append('officerId', selectedOfficer);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (activeTabCard !== 'all') params.append('filterTab', activeTabCard);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/follow-ups?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPlans(json.data || []);
        setStats(json.stats || null);
      } else {
        const message = json.error || 'ดึงข้อมูลไม่สำเร็จ';
        setLoadError(message);
        showToast(message, 'error');
      }
    } catch (err) {
      console.error(err);
      const message = 'ไม่สามารถดึงข้อมูลการติดตามผลได้';
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [
    searchTerm,
    filterRegistryNo,
    filterAssistanceNo,
    selectedType,
    selectedBranch,
    selectedOfficer,
    selectedStatus,
    activeTabCard,
    startDate,
    endDate,
    showToast,
  ]);

  useEffect(() => {
    fetchFollowUps();
    setCurrentPage(1); // Reset to page 1 whenever filters change
  }, [fetchFollowUps]);

  // Clear all filters handler
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterRegistryNo('');
    setFilterAssistanceNo('');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedBranch('all');
    setSelectedOfficer('all');
    setStartDate('');
    setEndDate('');
    setActiveTabCard('all');
    setCurrentPage(1);
    showToast('ล้างตัวกรองทั้งหมดเรียบร้อยแล้ว', 'info');
  };

  // Branch and Officer lists for dropdown options
  const branchList = useMemo(() => {
    const map = new Map<string, string>();
    plans.forEach((p) => {
      if (p.branchId && p.branchName) map.set(p.branchId, p.branchName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [plans]);

  const officerList = useMemo(() => {
    const map = new Map<string, string>();
    plans.forEach((p) => {
      if (p.assignedOfficerId && p.assignedOfficerName) {
        map.set(p.assignedOfficerId, p.assignedOfficerName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [plans]);

  // Status badge renderer
  const getStatusBadge = (status: FollowUpStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ติดตามครบตามเกณฑ์
          </span>
        );
      case 'partially_completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <Clock className="w-3 h-3 text-sky-600" />
            กำลังติดตาม
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            ถึงกำหนดติดตาม
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            ค้างติดตาม / เกินกำหนด
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Calendar className="w-3 h-3 text-blue-600" />
            รอติดตาม
          </span>
        );
      case 'requires_additional':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Sparkles className="w-3 h-3 text-purple-600" />
            ต้องติดตามเพิ่มเติม
          </span>
        );
      case 'terminated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-500" />
            ยุติการติดตาม
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            ยังไม่เริ่มติดตาม
          </span>
        );
    }
  };

  // Section 1: CSV Export function with UTF-8 BOM for Thai Excel
  const handleExportCsv = () => {
    if (plans.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', 'info');
      return;
    }

    const headers = [
      'ลำดับ',
      'รหัสแผนติดตาม',
      'รหัสทะเบียน',
      'ชื่อผู้รับความช่วยเหลือ',
      'เลขที่คำร้อง',
      'เลขที่เบิกจ่าย',
      'ประเภทความช่วยเหลือ',
      'เกณฑ์ขั้นต่ำ (ครั้ง)',
      'บันทึกสำเร็จจริง (ครั้ง)',
      'คงเหลือ (ครั้ง)',
      'วันติดตามครั้งถัดไป',
      'เจ้าหน้าที่รับผิดชอบ',
      'สาขา/แผนก',
      'สถานะการติดตาม',
    ];

    const rows = plans.map((p, idx) => [
      idx + 1,
      p.id,
      p.registrationNo,
      `"${(linkedMemberName(p, registries) || p.beneficiaryName).replace(/"/g, '""')}"`,
      p.applicationNo,
      p.disbursementRef || '-',
      `"${p.assistanceTypeName}"`,
      p.minVisits,
      p.completedVisits,
      p.remainingVisits,
      p.nextFollowupDate || 'ยังไม่ได้กำหนดวันติดตาม',
      `"${p.assignedOfficerName || 'เจ้าหน้าที่ภาคสนาม'}"`,
      `"${p.branchName || 'ส่วนกลาง'}"`,
      `"${p.statusTh || p.status}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `zms_followup_monitoring_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`ส่งออกข้อมูลเรียบร้อยแล้ว (${plans.length} รายการ)`, 'success');
  };

  // Pagination calculation
  const totalItems = plans.length;
  const listPageSize = viewMode === 'card' ? resolveCardPageSize(cardLayout, totalItems) : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / listPageSize) || 1);
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * listPageSize;
    return plans.slice(start, start + listPageSize);
  }, [plans, currentPage, listPageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <div className="animate-fadeIn space-y-3 pb-8 sm:space-y-6 sm:pb-12">
      {/* =========================================================================
          SECTION 1: หัวข้อและการดำเนินการ (Header & Actions)
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs sm:rounded-3xl sm:p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 text-white shadow-md sm:h-12 sm:w-12 sm:rounded-2xl">
              <ClipboardCheck className="h-5 w-5 text-amber-300 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[17px] font-black leading-6 tracking-tight text-slate-900 sm:text-2xl">
                  ตรวจสอบและติดตามผล
                </h1>
                <span className="hidden rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 sm:inline">
                  Follow-up & Monitoring
                </span>
              </div>
              <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
                ติดตามผลการช่วยเหลือและบันทึกหลักฐาน ตรวจสอบการลงพื้นที่และควบคุมเกณฑ์ความช่วยเหลือ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick search input in Section 1 */}
            <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาด่วน..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchFollowUps()}
              disabled={isLoading}
              className="zms-action inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors min-h-[36px]"
              title="รีเฟรชข้อมูล"
             aria-label="รีเฟรช">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-700' : ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            {/* Export Button (CSV / Excel) */}
            <button
              onClick={handleExportCsv}
              disabled={isLoading || plans.length === 0}
              className="zms-action inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors min-h-[36px] shadow-2xs disabled:opacity-50"
              title="ส่งออกข้อมูลเป็น CSV รองรับ Excel ภาษาไทย"
             aria-label="ส่งออกข้อมูล">
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออกข้อมูล</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: DASHBOARD CARDS (5 รายการตามข้อกำหนด)
            ========================================================================= */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:mt-6 sm:grid-cols-3 sm:gap-4 sm:pt-6 lg:grid-cols-5">
          {/* Card 1: งานติดตามทั้งหมด */}
          <div 
            onClick={() => {
              setActiveTabCard('all');
              setSelectedStatus('all');
            }}
            className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTabCard === 'all' && selectedStatus === 'all'
                ? 'bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20 shadow-xs' 
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold">1. งานติดตามทั้งหมด</span>
              <FileText className="w-4 h-4 text-teal-700" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {stats?.totalPlans || 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>แผนช่วยเหลือจริง</span>
              <span className="text-teal-700 font-bold">คลิกกรอง</span>
            </div>
          </div>

          {/* Card 2: งานที่ถึงกำหนดติดตาม */}
          <div 
            onClick={() => {
              setActiveTabCard('due');
              setSelectedStatus('all');
            }}
            className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTabCard === 'due' 
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20 shadow-xs' 
                : 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-800 mb-1">
              <span className="font-bold">2. ถึงกำหนดติดตาม</span>
              <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-amber-900 font-mono">
              {stats?.dueCount || 0}
            </div>
            <div className="text-[10px] text-amber-700 mt-1 flex items-center justify-between">
              <span>ภายใน 3 วันหรือวันนี้</span>
              <span className="font-bold">คลิกกรอง</span>
            </div>
          </div>

          {/* Card 3: งานค้างติดตาม */}
          <div 
            onClick={() => {
              setActiveTabCard('overdue');
              setSelectedStatus('all');
            }}
            className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTabCard === 'overdue' 
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20 shadow-xs' 
                : 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-rose-800 mb-1">
              <span className="font-bold">3. งานค้างติดตาม</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-900 font-mono">
              {stats?.overdueCount || 0}
            </div>
            <div className="text-[10px] text-rose-700 mt-1 flex items-center justify-between">
              <span>เลยกำหนดนัดหมาย</span>
              <span className="font-bold">คลิกกรอง</span>
            </div>
          </div>

          {/* Card 4: งานที่กำลังดำเนินการ */}
          <div 
            onClick={() => {
              setActiveTabCard('in_progress');
              setSelectedStatus('all');
            }}
            className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTabCard === 'in_progress' 
                ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-500/20 shadow-xs' 
                : 'bg-sky-50/40 border-sky-200/80 hover:bg-sky-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-sky-800 mb-1">
              <span className="font-bold">4. กำลังดำเนินการ</span>
              <Clock className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-sky-900 font-mono">
              {stats?.inProgressCount || 0}
            </div>
            <div className="text-[10px] text-sky-700 mt-1 flex items-center justify-between">
              <span>ติดตามอยู่ระหว่างทาง</span>
              <span className="font-bold">คลิกกรอง</span>
            </div>
          </div>

          {/* Card 5: งานที่ติดตามครบตามเกณฑ์ */}
          <div 
            onClick={() => {
              setActiveTabCard('completed');
              setSelectedStatus('all');
            }}
            className={`p-2.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTabCard === 'completed' 
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs' 
                : 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-emerald-800 mb-1">
              <span className="font-bold">5. ครบตามเกณฑ์</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-900 font-mono">
              {stats?.completedCount || 0}
            </div>
            <div className="text-[10px] text-emerald-700 mt-1 flex items-center justify-between">
              <span>ครบเกณฑ์ขั้นต่ำ</span>
              <span className="font-bold">คลิกกรอง</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: ตัวกรองและค้นหา (Filters Toolbar & Pagination Settings)
          แถวเดียวบน Desktop, เรียงแนวตั้งบน Mobile
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <SlidersHorizontal className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="text-xs font-bold text-slate-800">
              ตัวกรองข้อมูลและค้นหาขั้นสูง
            </span>
            {(searchTerm || filterRegistryNo || filterAssistanceNo || selectedType !== 'all' || selectedStatus !== 'all' || selectedBranch !== 'all' || selectedOfficer !== 'all' || startDate || endDate || activeTabCard !== 'all') && (
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                กำลังใช้งานตัวกรอง
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className="zms-action inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {filtersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{filtersOpen ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}</span>
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="zms-action inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              title="ล้างการตั้งค่าตัวกรองทั้งหมด"
             aria-label="ล้างตัวกรอง">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างตัวกรอง</span>
            </button>
          </div>
        </div>

        <div className="mt-3 max-w-xl">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            ค้นหาชื่อผู้รับความช่วยเหลือ
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ระบุชื่อหรือนามสกุล..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            />
          </div>
        </div>

        {filtersOpen && (
        <div className="mt-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* 2. รหัสทะเบียน */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              รหัสทะเบียน
            </label>
            <input
              type="text"
              value={filterRegistryNo}
              onChange={(e) => setFilterRegistryNo(e.target.value)}
              placeholder="REG-..."
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            />
          </div>

          {/* 3. เลขที่รายการช่วยเหลือ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              เลขที่ช่วยเหลือ/คำร้อง
            </label>
            <input
              type="text"
              value={filterAssistanceNo}
              onChange={(e) => setFilterAssistanceNo(e.target.value)}
              placeholder="REQ / REF..."
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            />
          </div>

          {/* 4. ประเภทความช่วยเหลือ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              ประเภทความช่วยเหลือ
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="housing">ที่อยู่อาศัย (&gt;= 1 ครั้ง)</option>
              <option value="career">ต่อยอดอาชีพ (&gt;= 6 ครั้ง)</option>
              <option value="other">ประเภทอื่น ๆ</option>
            </select>
          </div>

          {/* 5. สถานะการติดตาม */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              สถานะการติดตาม
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
            >
              <option value="all">ทั้งหมด</option>
              <option value="due">ถึงกำหนดติดตาม</option>
              <option value="in_progress">ค้างติดตาม / เกินกำหนด</option>
              <option value="partially_completed">กำลังติดตาม</option>
              <option value="completed">ติดตามครบตามเกณฑ์</option>
              <option value="pending">รอติดตาม</option>
              <option value="requires_additional">ต้องติดตามเพิ่ม</option>
              <option value="terminated">ยุติการติดตาม</option>
            </select>
          </div>

          {/* 6. สาขาและแผนก */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              สาขา/แผนก
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white truncate"
            >
              <option value="all">ทุกสาขา</option>
              {branchList.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* 7. เจ้าหน้าที่ผู้รับผิดชอบ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              ผู้รับผิดชอบ
            </label>
            <select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white truncate"
            >
              <option value="all">ทุกคน</option>
              {officerList.map((off) => (
                <option key={off.id} value={off.id}>{off.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-600">ช่วงวันที่ติดตาม:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-xl border border-slate-300 bg-white"
            />
            <span className="text-slate-400">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-xl border border-slate-300 bg-white"
            />
          </div>
        </div>
        </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 4: รายการติดตามผล (Data Table - Clean & Readable)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">รายการติดตามผล</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ทั้งหมด <strong className="text-teal-800">{totalItems}</strong> รายการ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {viewMode === 'table' ? (
            <label className="inline-flex items-center gap-2 text-[11px] text-slate-500">
              แสดงต่อหน้า
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold text-slate-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            ) : (
              <span className="text-[11px] font-bold text-slate-500">
                {cardLayout.cardsPerRow} การ์ด/แถว · {listPageSize} รายการต่อหน้า
              </span>
            )}
            <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-1" role="group" aria-label="สลับมุมมองรายการ">
              <button
                type="button"
                onClick={() => handleViewModeChange('table')}
                aria-pressed={viewMode === 'table'}
                className={`zms-action px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-white text-teal-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="มุมมองตาราง"
               aria-label="ตาราง">
                <List className="w-4 h-4" />
                <span>ตาราง</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('card')}
                aria-pressed={viewMode === 'card'}
                className={`zms-action px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'card'
                    ? 'bg-white text-teal-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="มุมมองการ์ด"
               aria-label="การ์ด">
                <LayoutGrid className="w-4 h-4" />
                <span>การ์ด</span>
              </button>
            </div>
          </div>
        </div>
        {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3.5">รหัสรายการ</th>
                <th className="py-3 px-3.5">ผู้รับความช่วยเหลือ</th>
                <th className="py-3 px-3.5">ประเภทความช่วยเหลือ</th>
                <th className="py-3 px-3.5 text-center min-w-[130px]">ความคืบหน้าการติดตาม</th>
                <th className="py-3 px-3.5">วันติดตามครั้งถัดไป</th>
                <th className="py-3 px-3.5">ผู้รับผิดชอบ</th>
                <th className="py-3 px-3.5">สถานะ</th>
                <th className="py-3 px-3.5 text-right min-w-[170px]">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>กำลังโหลดข้อมูลการติดตามผล...</span>
                  </td>
                </tr>
              ) : loadError && paginatedPlans.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <FollowUpListMessage
                      icon={<AlertCircle className="w-8 h-8 text-rose-400" />}
                      title="โหลดรายการติดตามผลไม่สำเร็จ"
                      detail={loadError}
                      action={
                        <button
                          type="button"
                          onClick={() => fetchFollowUps()}
                          className="zms-action mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          ลองอีกครั้ง
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : paginatedPlans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">ไม่พบรายการติดตามผลที่ตรงกับเงื่อนไข</p>
                    <p className="text-[11px] text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือกดปุ่ม &quot;ล้างตัวกรอง&quot;</p>
                  </td>
                </tr>
              ) : (
                paginatedPlans.map((p) => {
                  const isCareer = p.assistanceTypeName.includes('อาชีพ') || p.assistanceType === 'career';
                  const isHousing = p.assistanceTypeName.includes('ที่อยู่อาศัย') || p.assistanceTypeName.includes('ซ่อม') || p.assistanceType === 'housing';
                  const progressPct = p.minVisits > 0 ? Math.min(100, Math.round((p.completedVisits / p.minVisits) * 100)) : 100;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* 1. รหัสรายการ */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono text-slate-800 text-xs font-bold block">
                          {p.applicationNo}
                        </span>
                        {p.disbursementRef && (
                          <span className="font-mono text-slate-400 text-[10px] block">
                            Ref: {p.disbursementRef}
                          </span>
                        )}
                      </td>

                      {/* 2. ผู้รับความช่วยเหลือ (ชื่อ + รหัสทะเบียน) */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 text-xs">
                          {linkedMemberName(p, registries) || p.beneficiaryName}
                        </div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-100 font-mono text-[10px] text-slate-600 border border-slate-200">
                          {p.registrationNo}
                        </span>
                      </td>

                      {/* 3. ประเภทความช่วยเหลือ */}
                      <td className="py-3 px-3.5">
                        <span className={`inline-block font-bold text-xs ${
                          isCareer ? 'text-amber-800' : isHousing ? 'text-teal-800' : 'text-slate-700'
                        }`}>
                          {p.assistanceTypeName}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {`เกณฑ์ ${p.minVisits} ครั้ง`}
                        </span>
                      </td>

                      {/* 4. ความคืบหน้าการติดตาม (นับเฉพาะครั้งที่มีรูปหลักฐานสมบูรณ์) */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex flex-col items-center w-full max-w-[120px]">
                          <span className="font-mono font-extrabold text-xs text-teal-800">
                            {p.completedVisits} / {p.minVisits} ครั้ง
                          </span>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-teal-600 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            {progressPct >= 100 ? 'ครบเกณฑ์' : `คงเหลือ ${p.remainingVisits} ครั้ง`}
                          </span>
                        </div>
                      </td>

                      {/* 5. วันติดตามครั้งถัดไป */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {p.nextFollowupDate ? (
                          <span className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            {p.nextFollowupDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            ยังไม่ได้กำหนดวันติดตาม
                          </span>
                        )}
                      </td>

                      {/* 6. ผู้รับผิดชอบ */}
                      <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">
                        <span className="truncate block max-w-[130px] font-medium">
                          {p.assignedOfficerName || 'เจ้าหน้าที่ภาคสนาม'}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block max-w-[130px]">
                          {p.branchName || 'ส่วนกลาง'}
                        </span>
                      </td>

                      {/* 7. สถานะ */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {getStatusBadge(p.status)}
                      </td>

                      {/* 8. การดำเนินการ (SECTION 5: Popup Actions) */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* ปุ่ม ดูรายละเอียด */}
                          <button
                            onClick={() => openPlanDetail(p.id, 'overview')}
                            className="zms-action inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                            title="เปิดดูรายละเอียด 4 แท็บ: ภาพรวม, ประวัติ, รูปหลักฐาน, แผนงาน"
                           aria-label="ดูรายละเอียด">
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>ดูรายละเอียด</span>
                          </button>

                          {/* ปุ่ม จัดการติดตาม */}
                          <button
                            onClick={() => {
                              setSelectedPlanIdForManage(p.id);
                              setManageInitialTab('record');
                            }}
                            className="zms-action inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-colors shadow-2xs"
                            title="บันทึกผล, กำหนดนัดหมาย, มอบหมายงาน หรือปรับแผน"
                           aria-label="จัดการติดตาม">
                            <PlusCircle className="w-3.5 h-3.5 text-teal-700" />
                            <span>จัดการติดตาม</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        ) : (
          <FollowUpPlanCards
            plans={paginatedPlans}
            isLoading={isLoading}
            loadError={loadError}
            canViewAmount={canViewAssistanceAmount}
            onRetry={() => fetchFollowUps()}
            onViewDetail={(planId) => openPlanDetail(planId, 'overview')}
            onManage={(planId) => {
              setSelectedPlanIdForManage(planId);
              setManageInitialTab('record');
            }}
            onViewHistory={(planId) => openPlanDetail(planId, 'history')}
            statusBadge={getStatusBadge}
            layout={cardLayout}
            registries={registries}
          />
        )}

        {/* Pagination Controls Bar */}
        {totalItems > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-2.5 py-2 text-xs sm:p-4">
            <p className="min-w-0 truncate text-[12px] leading-5 text-slate-500">
              <span className="sm:hidden">{(currentPage - 1) * listPageSize + 1}–{Math.min(totalItems, currentPage * listPageSize)} / {totalItems}</span>
              <span className="hidden sm:inline">
                แสดงรายการที่ <strong className="text-slate-800">{(currentPage - 1) * listPageSize + 1}</strong> ถึง <strong className="text-slate-800">{Math.min(totalItems, currentPage * listPageSize)}</strong> จากทั้งหมด <strong className="text-teal-800">{totalItems}</strong> รายการ
              </span>
            </p>

            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="zms-action rounded-lg border border-slate-200 bg-white p-1.5 transition-colors hover:bg-slate-100 disabled:opacity-40"
                title="หน้าแรก"
                aria-label="หน้าแรก"
              >
                <ChevronsLeft className="h-4 w-4 text-slate-600" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="zms-action rounded-lg border border-slate-200 bg-white p-1.5 transition-colors hover:bg-slate-100 disabled:opacity-40"
                title="หน้าก่อนหน้า"
                aria-label="หน้าก่อนหน้า"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              <span className="px-1 text-[12px] font-bold whitespace-nowrap text-slate-700">
                <span className="sm:hidden">{currentPage}/{totalPages}</span>
                <span className="hidden sm:inline">หน้า {currentPage} / {totalPages}</span>
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="zms-action rounded-lg border border-slate-200 bg-white p-1.5 transition-colors hover:bg-slate-100 disabled:opacity-40"
                title="หน้าถัดไป"
                aria-label="หน้าถัดไป"
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="zms-action rounded-lg border border-slate-200 bg-white p-1.5 transition-colors hover:bg-slate-100 disabled:opacity-40"
                title="หน้าสุดท้าย"
                aria-label="หน้าสุดท้าย"
              >
                <ChevronsRight className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 5: POPUPS (ดูรายละเอียด & จัดการงานติดตาม)
          ========================================================================= */}

      {/* 1. Popup ดูรายละเอียดการติดตาม (4 แท็บ) */}
      {selectedPlanIdForDetail && (
        <FollowUpDetailModal
          isOpen={Boolean(selectedPlanIdForDetail)}
          onClose={() => setSelectedPlanIdForDetail(null)}
          planId={selectedPlanIdForDetail}
          initialTab={detailInitialTab}
          onRefreshList={fetchFollowUps}
          onOpenBeneficiaryRegistry={(beneficiaryId) => {
            setSelectedPlanIdForDetail(null);
            if (onNavigate) {
              onNavigate('registry');
            }
          }}
          onOpenManageModal={(planId) => {
            setSelectedPlanIdForDetail(null);
            setSelectedPlanIdForManage(planId);
            setManageInitialTab('record');
          }}
        />
      )}

      {/* 2. Popup จัดการติดตามงาน (บันทึกผล, กำหนดนัด, มอบหมาย, ปรับแผน, ประวัติ) */}
      {selectedPlanIdForManage && (
        <ManageFollowUpModal
          isOpen={Boolean(selectedPlanIdForManage)}
          onClose={() => setSelectedPlanIdForManage(null)}
          planId={selectedPlanIdForManage}
          onSuccess={() => {
            fetchFollowUps();
          }}
          initialTab={manageInitialTab}
        />
      )}
    </div>
  );
}
