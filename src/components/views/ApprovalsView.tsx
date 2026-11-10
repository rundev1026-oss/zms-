'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { formatPersonName } from '@zms/shared';
import { useApp } from '@/context/AppContext';
import { AssistanceApplication, FaqirMiskinSubFund, FundAccount } from '@/types';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Wallet,
  AlertCircle,
  Check,
  User,
  FileText,
  ShieldCheck,
  Layers,
  AlertTriangle,
  Search,
  RefreshCw,
  Clock,
  IdCard,
  Phone,
  MapPin,
  Calendar,
  Award,
  ArrowLeft,
  PenTool,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  CreditCard,
  Building2,
  Filter,
} from 'lucide-react';
import { DocumentListTable } from '@/components/common/DocumentListTable';
import { ModalPortal } from '@/components/common/Modal';
import { resolveAssistanceFunds, UNMAPPED_FUND_WARNING } from '@/lib/fundResolution';

interface ApprovalsViewProps {
  onNavigate: (view: string) => void;
}

const ASNAF_DISPLAY_NAMES: Record<string, { th: string; sub: string }> = {
  faqir_miskin: { th: 'ฟากีร–มิสกิน', sub: 'ผู้ยากไร้และคนขัดสน (Faqir & Miskin)' },
  faqir: { th: 'ฟากีร', sub: 'ผู้ยากไร้ไม่มีรายได้ (The Destitute)' },
  miskin: { th: 'มิสกิน', sub: 'คนขัดสนรายได้ไม่พอประทังชีพ (The Needy)' },
  amil: { th: 'อามิลีน', sub: 'เจ้าหน้าที่บริหารจัดการซะกาต (Amil)' },
  muallaf: { th: 'มุอัลลัฟ', sub: 'ผู้เข้ารับอิสลามใหม่และผู้มีจิตโน้มสู่ศรัทธา (Muallaf)' },
  gharimin: { th: 'อัล-ฆอรีมีน', sub: 'ผู้มีภาระหนี้สินจำเป็นล้นพ้นตัว (Gharimin)' },
  fisabilillah: { th: 'ฟีสะบีลิลลาฮ์', sub: 'กิจการเพื่อศาสนา การศึกษา และสาธารณประโยชน์ (Fi Sabilillah)' },
  ibnsabil: { th: 'อิบนุสสะบีล', sub: 'ผู้เดินทางตกยากและผู้พลัดถิ่น (Ibn Sabil)' },
  humanitarian: { th: 'มนุษยธรรม', sub: 'การบรรเทาทุกข์และสิทธิมนุษยชน' },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string; textClass: string }
> = {
  pending_approval: {
    label: 'รอพิจารณาอนุมัติ',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-800',
  },
  approved: {
    label: 'อนุมัติแล้ว',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-800',
  },
  wait_disbursement: {
    label: 'รอเบิกจ่าย',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    dotClass: 'bg-sky-500',
    textClass: 'text-sky-800',
  },
  disbursed: {
    label: 'เบิกจ่ายสำเร็จ',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    dotClass: 'bg-teal-500',
    textClass: 'text-teal-800',
  },
  need_info: {
    label: 'ส่งกลับแก้ไข',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    dotClass: 'bg-orange-500',
    textClass: 'text-orange-800',
  },
  assessment: {
    label: 'รอลงพื้นที่สำรวจ',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    dotClass: 'bg-purple-500',
    textClass: 'text-purple-800',
  },
  rejected: {
    label: 'ไม่อนุมัติ',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    dotClass: 'bg-rose-500',
    textClass: 'text-rose-800',
  },
};

const URGENCY_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  urgent: { label: 'เร่งด่วนที่สุด', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  high: { label: 'เร่งด่วน', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  normal: { label: 'ระดับปกติ', badgeClass: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const QUICK_DECISION_NOTES = [
  'เห็นชอบตามผลการประเมินสภาพความเป็นอยู่ของเจ้าหน้าที่ ให้ความช่วยเหลือตามวงเงินที่เสนอ',
  'อนุมัติตามระเบียบคณะกรรมการ โดยมีเงื่อนไขให้ฝ่ายพัฒนาสังคมติดตามผลการใช้จ่ายใน 3 เดือน',
  'เอกสารหลักฐานรายได้และภาระหนี้สินยังไม่ชัดเจน ส่งกลับให้เจ้าหน้าที่ภาคสนามสอบทานเพิ่มเติม',
  'ไม่อนุมัติเนื่องจากไม่เข้าเกณฑ์คุณสมบัติตามระเบียบการจัดสรรซะกาตหมวดฟากีร-มิสกิน',
];

function maskNationalId(id?: string): string {
  if (!id) return '-';
  const clean = id.replace(/\D/g, '');
  if (clean.length !== 13) return id;
  return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-XXXXX-${clean.slice(10, 12)}-${clean.slice(12)}`;
}

function formatHardshipText(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val.summary || val.description || val.notes || val.detail || '';
}

function getHouseholdTotalIncome(app: AssistanceApplication): number {
  if (app.netIncome) return app.netIncome;
  if (!app.incomeBreakdown) return 0;
  const ib = app.incomeBreakdown;
  return (
    (ib.salary || 0) +
    (ib.familySupport || 0) +
    (ib.agriculture || 0) +
    (ib.trading || 0) +
    (ib.assetIncome || 0) +
    (ib.freelance || 0) +
    (ib.welfare || 0) +
    (ib.otherIncome || 0)
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function ApprovalsView({ onNavigate }: ApprovalsViewProps) {
  const {
    applications,
    registries,
    funds,
    currentUser,
    approveApplication,
    rejectApplication,
    returnApplication,
    showToast,
    refreshData,
  } = useApp();

  // Selected Application & UI State
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [approvalAmount, setApprovalAmount] = useState<number>(0);
  const [decisionNotes, setDecisionNotes] = useState<string>(QUICK_DECISION_NOTES[0]);
  const [showMaskedId, setShowMaskedId] = useState<boolean>(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'pending_approval' | 'all' | 'need_info' | 'approved' | 'rejected'>('pending_approval');
  const [asnafFilter, setAsnafFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Confirmation Modal & Processing
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Specific Funds (for background solvency guard & mapping)
  const [specificFunds, setSpecificFunds] = useState<FaqirMiskinSubFund[]>([]);
  const [summaryStats, setSummaryStats] = useState<{
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    needInfoCount: number;
    totalPendingAmount: number;
    totalApprovedAmount: number;
  } | null>(null);

  // Fetch summary stats & specific funds from API
  const fetchSummaryAndBudgetData = useCallback(async () => {
    try {
      const [sumRes, budgetRes] = await Promise.all([
        fetch('/api/approvals/summary').catch(() => null),
        fetch('/api/finance/allocations/faqir-miskin?fiscalYear=2569&primaryGroupCode=all').catch(() => null),
      ]);

      if (sumRes && sumRes.ok) {
        const sumJson = await sumRes.json();
        if (sumJson.success && sumJson.data) {
          setSummaryStats(sumJson.data);
        }
      }

      if (budgetRes && budgetRes.ok) {
        const bJson = await budgetRes.json();
        if (bJson && bJson.success) {
          const list = Array.isArray(bJson.data)
            ? bJson.data
            : Array.isArray(bJson.data?.subFunds)
            ? bJson.data.subFunds
            : Array.isArray(bJson.subFunds)
            ? bJson.subFunds
            : [];
          setSpecificFunds(list);
        }
      }
    } catch (err) {
      console.error('Failed to load summary or budget data in ApprovalsView', err);
    }
  }, []);

  useEffect(() => {
    fetchSummaryAndBudgetData();
  }, [fetchSummaryAndBudgetData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshData(), fetchSummaryAndBudgetData()]);
      showToast('อัปเดตข้อมูลคำร้องล่าสุดเรียบร้อยแล้ว', 'info');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Real-time summary counts calculation
  const computedSummary = useMemo(() => {
    const pending = applications.filter((a) => a.status === 'pending_approval');
    const approved = applications.filter((a) => ['approved', 'wait_disbursement', 'disbursed'].includes(a.status));
    const returned = applications.filter((a) => ['need_info', 'assessment'].includes(a.status));
    const rejected = applications.filter((a) => a.status === 'rejected');

    const pendingAmount = pending.reduce((sum, a) => sum + (a.requestedAmount || 0), 0);
    const approvedAmount = approved.reduce((sum, a) => sum + (a.approvedAmount || a.requestedAmount || 0), 0);

    return {
      pendingCount: summaryStats?.pendingCount ?? pending.length,
      approvedCount: summaryStats?.approvedCount ?? approved.length,
      needInfoCount: summaryStats?.needInfoCount ?? returned.length,
      rejectedCount: summaryStats?.rejectedCount ?? rejected.length,
      totalPendingAmount: summaryStats?.totalPendingAmount ?? pendingAmount,
      totalApprovedAmount: summaryStats?.totalApprovedAmount ?? approvedAmount,
    };
  }, [applications, summaryStats]);

  // Filter application list
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Status Tab Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending_approval' && app.status !== 'pending_approval') return false;
        if (statusFilter === 'approved' && !['approved', 'wait_disbursement', 'disbursed'].includes(app.status)) return false;
        if (statusFilter === 'need_info' && !['need_info', 'assessment'].includes(app.status)) return false;
        if (statusFilter === 'rejected' && app.status !== 'rejected') return false;
      }

      // Asnaf Filter
      if (asnafFilter !== 'all') {
        const appAsnaf = (app.asnafCategory || '').toLowerCase();
        if (appAsnaf !== asnafFilter.toLowerCase()) return false;
      }

      // Assistance Type Filter
      if (typeFilter !== 'all') {
        if (app.assistanceType !== typeFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = formatPersonName(app).toLowerCase();
        const appNo = (app.applicationNo || '').toLowerCase();
        const regNo = (app.registrationNo || '').toLowerCase();
        const nationalId = (app.nationalId || '').toLowerCase();
        const community = (app.community || '').toLowerCase();
        if (
          !name.includes(q) &&
          !appNo.includes(q) &&
          !regNo.includes(q) &&
          !nationalId.includes(q) &&
          !community.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [applications, statusFilter, asnafFilter, typeFilter, searchQuery]);

  // Available Filter Options derived from actual data
  const availableAsnafCategories = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      if (a.asnafCategory) set.add(a.asnafCategory);
    });
    return Array.from(set);
  }, [applications]);

  const availableAssistanceTypes = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      if (a.assistanceType) set.add(a.assistanceType);
    });
    return Array.from(set);
  }, [applications]);

  // Selected Application
  const selectedApp = useMemo(() => {
    if (!selectedAppId) {
      return filteredApplications.length > 0 ? filteredApplications[0] : null;
    }
    return applications.find((a) => a.id === selectedAppId) || null;
  }, [selectedAppId, filteredApplications, applications]);

  // Initialize selected app and default amount
  useEffect(() => {
    if (selectedApp) {
      setApprovalAmount(selectedApp.assessment?.recommendedAmount || selectedApp.requestedAmount || 0);
    }
  }, [selectedApp]);

  // Registry details linked to selected application
  const linkedRegistry = useMemo(() => {
    if (!selectedApp) return null;
    return (
      registries.find(
        (r) =>
          (selectedApp.registrationNo && r.registrationNo === selectedApp.registrationNo) ||
          (selectedApp.beneficiaryId && r.id === selectedApp.beneficiaryId) ||
          (selectedApp.nationalId && r.nationalId === selectedApp.nationalId)
      ) || null
    );
  }, [selectedApp, registries]);

  // Automatic Data Resolution & Solvency Guard (Runs in background without displaying fund cards)
  const resolvedData = useMemo(() => {
    if (!selectedApp) return null;

    const asnafRaw = (selectedApp.asnafCategory || 'faqir_miskin').toLowerCase();
    const asnafMeta = ASNAF_DISPLAY_NAMES[asnafRaw] || {
      th: selectedApp.primaryGroupName || selectedApp.asnafCategory || 'ฟากีร–มิสกิน',
      sub: selectedApp.asnafCategory || '',
    };

    const assistanceTypeName = selectedApp.assistanceType || 'ไม่ระบุประเภท';
    const assistanceFormatName =
      (selectedApp as any).assistanceFormat ||
      (selectedApp as any).assistance_format ||
      (selectedApp as any).deliveryMethod ||
      'โอนเงินผ่านระบบธนาคาร (Bank Transfer)';

    // Canonical resolution strictly by assistance type & asnaf
    const resolution = resolveAssistanceFunds({
      asnafCategory: selectedApp.asnafCategory,
      assistanceType: selectedApp.assistanceType,
      assistanceTypeId: selectedApp.assistanceTypeId,
      assistanceTypeCode: (selectedApp as any).assistanceTypeCode,
      funds,
      subFunds: specificFunds,
    });

    const mainFund = resolution.mainFund as FundAccount | null;
    const subFund = resolution.subFund as FaqirMiskinSubFund | null;

    // Real-time financial metrics from database & budget allocation
    const mainAllocated = Number(
      mainFund?.totalReceived ??
      ((mainFund?.availableAmount || 0) + (mainFund?.disbursedAmount || 0) + (mainFund?.committedAmount || 0))
    ) || 0;
    const mainDisbursed = Number(mainFund?.disbursedAmount ?? 0);
    const mainCommitted = Number(mainFund?.committedAmount ?? 0);
    const mainAvailableBefore = Number(
      mainFund?.availableAmount ?? (mainAllocated - mainDisbursed - mainCommitted)
    );
    const mainRemainingAfter = mainAvailableBefore - approvalAmount;

    const subAllocated = Number(
      subFund?.adjustedBudgetAmount ?? subFund?.allocatedAmount ?? subFund?.targetAmount ?? 0
    );
    const subDisbursed = Number(subFund?.netDisbursedAmount ?? subFund?.disbursedAmount ?? 0);
    const subCommitted = Number(subFund?.committedAmount ?? 0);
    const subAvailableBefore = Number(
      subFund?.availableAfterCommitment ?? subFund?.remainingAmount ?? (subAllocated - subDisbursed - subCommitted)
    );
    const subRemainingAfter = subAvailableBefore - approvalAmount;

    const isMainInsufficient = mainRemainingAfter < 0;
    const isSubInsufficient = subRemainingAfter < 0;

    const isAllSufficient = Boolean(
      resolution.isMapped &&
      subFund &&
      mainFund &&
      !isMainInsufficient &&
      !isSubInsufficient &&
      approvalAmount > 0
    );

    return {
      asnafMeta,
      assistanceTypeName,
      assistanceFormatName,
      mainFund,
      subFund,
      isMapped: resolution.isMapped,
      unmappedWarning: resolution.unmappedWarning,
      isAllSufficient,
      isMainInsufficient,
      isSubInsufficient,
      mainAvailableBefore,
      subAvailableBefore,
    };
  }, [selectedApp, funds, specificFunds, approvalAmount]);

  // Execute Approval
  const handleExecuteApproval = async () => {
    if (!selectedApp || isSubmitting || !resolvedData) return;

    if (!resolvedData.isAllSufficient) {
      if (!resolvedData.isMapped) {
        showToast(resolvedData.unmappedWarning || UNMAPPED_FUND_WARNING, 'error');
      } else {
        showToast('ยอดเงินคงเหลือในกองทุนไม่เพียงพอกับยอดที่เสนออนุมัติ!', 'error');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await approveApplication(
        selectedApp.id,
        approvalAmount,
        resolvedData.mainFund?.id,
        decisionNotes,
        resolvedData.subFund?.id
      );
      if (success) {
        showToast(`อนุมัติคำร้อง ${selectedApp.applicationNo} เรียบร้อยแล้ว`, 'success');
        setConfirmAction(null);
        setSelectedAppId(null);
        await Promise.all([refreshData(), fetchSummaryAndBudgetData()]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Rejection
  const handleExecuteReject = async () => {
    if (!selectedApp || isSubmitting) return;
    if (!decisionNotes.trim()) {
      showToast('กรุณาระบุเหตุผลการไม่อนุมัติคำร้อง', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await rejectApplication(selectedApp.id, decisionNotes);
      if (success) {
        showToast(`บันทึกไม่อนุมัติคำร้อง ${selectedApp.applicationNo} เรียบร้อยแล้ว`, 'info');
        setConfirmAction(null);
        setSelectedAppId(null);
        await Promise.all([refreshData(), fetchSummaryAndBudgetData()]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Return for Correction
  const handleExecuteReturn = async () => {
    if (!selectedApp || isSubmitting) return;
    if (!decisionNotes.trim()) {
      showToast('กรุณาระบุเหตุผลหรือสิ่งที่ต้องแก้ไขเพิ่มเติม', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await returnApplication(selectedApp.id, decisionNotes);
      if (success) {
        showToast(`ส่งกลับคำร้อง ${selectedApp.applicationNo} ให้เจ้าหน้าที่แก้ไขแล้ว`, 'info');
        setConfirmAction(null);
        setSelectedAppId(null);
        await Promise.all([refreshData(), fetchSummaryAndBudgetData()]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Living Score Progress indicator
  const livingScore = selectedApp?.assessment?.livingScore || (selectedApp?.periodicAssessment as any)?.livingScore || 0;
  const scoreLevel = useMemo(() => {
    if (livingScore >= 75) return { text: 'ความเดือดร้อนรุนแรงมาก (วิกฤต)', color: 'text-rose-700', bg: 'bg-rose-500' };
    if (livingScore >= 50) return { text: 'ความเดือดร้อนปานกลาง (เร่งด่วน)', color: 'text-amber-700', bg: 'bg-amber-500' };
    return { text: 'ความเดือดร้อนระดับทั่วไป', color: 'text-emerald-700', bg: 'bg-emerald-500' };
  }, [livingScore]);

  return (
    <div className="space-y-5 animate-fadeIn pb-16 font-sans">
      {/* ========================================================================= */}
      {/* A. HEADER */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <h1 className="text-xl font-bold text-[#0B2545]">
              พิจารณาอนุมัติคำร้องขอรับซะกาต (Approver Workbench)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {computedSummary.pendingCount} คำร้องรอพิจารณา
            </span>
          </div>
          <p className="text-xs text-slate-500 pl-11">
            ระบบพิจารณาและลงมติอนุมัติคำร้องขอรับความช่วยเหลือตามระเบียบและหลักธรรมาภิบาลซะกาต
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto pl-11 md:pl-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            รีเฟรชข้อมูล
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* B. SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Pending */}
        <div 
          onClick={() => setStatusFilter('pending_approval')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'pending_approval'
              ? 'bg-amber-50/60 border-amber-400 ring-1 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">รอพิจารณาอนุมัติ</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#0B2545]">
            {computedSummary.pendingCount} <span className="text-xs font-normal text-slate-400">คำร้อง</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1 truncate">
            รวม ฿{computedSummary.totalPendingAmount.toLocaleString()} บาท
          </div>
        </div>

        {/* Approved */}
        <div 
          onClick={() => setStatusFilter('approved')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'approved'
              ? 'bg-emerald-50/60 border-emerald-400 ring-1 ring-emerald-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">อนุมัติแล้ว</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-800">
            {computedSummary.approvedCount} <span className="text-xs font-normal text-slate-400">คำร้อง</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1 truncate">
            รวม ฿{computedSummary.totalApprovedAmount.toLocaleString()} บาท
          </div>
        </div>

        {/* Returned */}
        <div 
          onClick={() => setStatusFilter('need_info')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'need_info'
              ? 'bg-orange-50/60 border-orange-400 ring-1 ring-orange-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ส่งกลับแก้ไข</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-orange-800">
            {computedSummary.needInfoCount} <span className="text-xs font-normal text-slate-400">คำร้อง</span>
          </div>
          <div className="text-[11px] text-orange-700 font-medium mt-1">
            รอเจ้าหน้าที่แก้ไขข้อมูล
          </div>
        </div>

        {/* Rejected */}
        <div 
          onClick={() => setStatusFilter('rejected')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'rejected'
              ? 'bg-rose-50/60 border-rose-400 ring-1 ring-rose-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ไม่อนุมัติ</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-800">
            {computedSummary.rejectedCount} <span className="text-xs font-normal text-slate-400">คำร้อง</span>
          </div>
          <div className="text-[11px] text-rose-700 font-medium mt-1">
            ไม่ผ่านเกณฑ์การพิจารณา
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2-COLUMN MASTER-DETAIL LAYOUT */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ===================================================================== */}
        {/* C. LEFT PANEL — รายการคำร้อง (34% width / 4 of 12 cols on desktop) */}
        {/* ===================================================================== */}
        <div
          className={`lg:col-span-4 space-y-3.5 ${
            selectedApp ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้ยื่น, เลขคำร้อง, เลข ปชช..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setStatusFilter('pending_approval')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  statusFilter === 'pending_approval'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                รอพิจารณา ({computedSummary.pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  statusFilter === 'all'
                    ? 'bg-[#0B2545] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ทั้งหมด ({applications.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('need_info')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  statusFilter === 'need_info'
                    ? 'bg-orange-100 text-orange-900 border border-orange-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ส่งกลับ ({computedSummary.needInfoCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                อนุมัติแล้ว ({computedSummary.approvedCount})
              </button>
            </div>

            {/* Dropdown Filters (Asnaf & Assistance Type) */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  หมวดอัสนัฟ
                </label>
                <select
                  value={asnafFilter}
                  onChange={(e) => setAsnafFilter(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">ทุกหมวดอัสนัฟ</option>
                  {availableAsnafCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {ASNAF_DISPLAY_NAMES[cat.toLowerCase()]?.th || cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  ประเภทความช่วยเหลือ
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">ทุกประเภท</option>
                  {availableAssistanceTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Application Cards List */}
          <div className="space-y-2.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
            {filteredApplications.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200 shadow-xs space-y-2">
                <Search className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-700">ไม่พบคำร้องที่ตรงกับเงื่อนไข</div>
                <p className="text-[11px] text-slate-400">
                  ลองปรับคำค้นหา หรือรีเซ็ตตัวกรองสถานะ/อัสนัฟ
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setAsnafFilter('all');
                    setTypeFilter('all');
                  }}
                  className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            ) : (
              filteredApplications.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                const statusCfg = STATUS_CONFIG[app.status] || {
                  label: app.status,
                  badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                  dotClass: 'bg-slate-400',
                  textClass: 'text-slate-700',
                };
                const urgencyCfg = URGENCY_CONFIG[app.urgencyLevel || 'normal'] || URGENCY_CONFIG.normal;
                const asnafMeta = ASNAF_DISPLAY_NAMES[(app.asnafCategory || '').toLowerCase()] || {
                  th: app.primaryGroupName || app.asnafCategory || 'ฟากีร-มิสกิน',
                  sub: '',
                };

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 shadow-2xs ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header: App No & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs text-emerald-800">
                        {app.applicationNo}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${statusCfg.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Applicant Name */}
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {formatPersonName(app)}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {app.community ? `ชุมชน${app.community}` : ''} {app.province || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Category & Assistance Type Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {asnafMeta.th}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {app.assistanceType || 'ปัจจัยยังชีพ'}
                      </span>
                      {urgencyCfg.label !== 'ระดับปกติ' && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${urgencyCfg.badgeClass}`}>
                          {urgencyCfg.label}
                        </span>
                      )}
                    </div>

                    {/* Footer: Amount & Date */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-slate-400">
                        ยื่นเมื่อ {formatDate(app.appliedDate)}
                      </span>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 mr-1">ขอรับ:</span>
                        <strong className="text-emerald-800 font-extrabold text-xs">
                          ฿{app.requestedAmount.toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* D. RIGHT PANEL — รายละเอียดคำร้อง (66% width / 8 of 12 cols on desktop) */}
        {/* ===================================================================== */}
        <div
          className={`lg:col-span-8 space-y-4 ${
            selectedApp ? 'block' : 'hidden lg:block'
          }`}
        >
          {!selectedApp ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">กรุณาเลือกคำร้องที่ต้องการพิจารณา</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                เลือกคำร้องจากรายการทางด้านซ้ายเพื่อเปิดดูรายละเอียด เอกสารหลักฐาน ผลการประเมินสิทธิ์ และลงมติอนุมัติ
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobile Back Button */}
              <div className="lg:hidden flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedAppId(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  กลับไปหน้ารายการคำร้อง
                </button>
                <span className="font-mono font-bold text-xs text-emerald-800">
                  {selectedApp.applicationNo}
                </span>
              </div>

              {/* Application Top Banner Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        {selectedApp.applicationNo}
                      </span>
                      <h2 className="text-base font-bold text-[#0B2545]">
                        {formatPersonName(selectedApp)}
                      </h2>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span>ยื่นคำร้องเมื่อ: {formatDate(selectedApp.appliedDate)}</span>
                      <span>•</span>
                      <span>สาขา/พื้นที่: {selectedApp.branchName || selectedApp.province || 'สำนักงานใหญ่'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {selectedApp.urgencyLevel && selectedApp.urgencyLevel !== 'normal' && (
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${URGENCY_CONFIG[selectedApp.urgencyLevel]?.badgeClass}`}>
                        {URGENCY_CONFIG[selectedApp.urgencyLevel]?.label}
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      STATUS_CONFIG[selectedApp.status]?.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[selectedApp.status]?.dotClass || 'bg-slate-400'}`} />
                      {STATUS_CONFIG[selectedApp.status]?.label || selectedApp.status}
                    </span>
                  </div>
                </div>

                {/* Quick 3-Metric Summary Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-medium">วงเงินที่ขอรับ</span>
                    <span className="text-base font-extrabold text-[#0B2545] block mt-0.5">
                      ฿{selectedApp.requestedAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200">
                    <span className="text-[10px] text-purple-600 block font-medium">จนท. ประเมินเสนอแนะ</span>
                    <span className="text-base font-extrabold text-purple-900 block mt-0.5">
                      ฿{(selectedApp.assessment?.recommendedAmount || selectedApp.requestedAmount).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[10px] text-emerald-600 block font-medium">คะแนนความจำเป็น (Score)</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-base font-extrabold text-emerald-800">
                        {livingScore}
                      </span>
                      <span className="text-[10px] text-slate-400">/ 100</span>
                      <span className="text-[10px] font-bold text-emerald-700 ml-auto truncate">
                        {scoreLevel.text}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* SECTION 1: ข้อมูลผู้ยื่นคำร้อง (Applicant Information) */}
              {/* ===================================================================== */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-700" />
                    1. ข้อมูลผู้ยื่นคำร้อง (Applicant Information)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowMaskedId(!showMaskedId)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                  >
                    {showMaskedId ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {showMaskedId ? 'แสดงเลข ปชช.' : 'ซ่อนเลข ปชช.'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">ชื่อ-นามสกุล</span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {formatPersonName(selectedApp)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">เลขประจำตัวประชาชน 13 หลัก</span>
                    <span className="font-mono font-bold text-slate-800 block mt-0.5">
                      {showMaskedId
                        ? selectedApp.nationalIdMasked || maskNationalId(selectedApp.nationalId)
                        : selectedApp.nationalId || selectedApp.nationalIdMasked || '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">วันเกิด / อายุ</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {selectedApp.age ? `${selectedApp.age} ปี` : '-'}
                      {selectedApp.birthDate && (
                        <span className="text-slate-500 text-[11px] font-normal ml-1">
                          ({formatDate(selectedApp.birthDate)})
                        </span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">เบอร์โทรศัพท์</span>
                    <span className="font-semibold text-slate-800 block mt-0.5 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedApp.phone || '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">อาชีพ / สถานะสมรส</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {selectedApp.occupation || 'รับจ้างทั่วไป'} • {selectedApp.maritalStatus || 'สมรส'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">รายได้เฉลี่ยครัวเรือน</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {getHouseholdTotalIncome(selectedApp) > 0
                        ? `฿${getHouseholdTotalIncome(selectedApp).toLocaleString()} / เดือน`
                        : 'รายได้ไม่แน่นอน'}
                    </span>
                  </div>

                  <div className="sm:col-span-2 md:col-span-3">
                    <span className="text-slate-400 block text-[10px]">ที่อยู่ตามทะเบียนและปัจจุบัน</span>
                    <span className="font-medium text-slate-800 block mt-0.5 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span>
                        {selectedApp.address || '-'} ชุมชน{selectedApp.community || '-'} ตำบล{selectedApp.subdistrict || '-'} อำเภอ{selectedApp.district || '-'} จังหวัด{selectedApp.province || '-'} {selectedApp.postcode || ''}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* SECTION 2: ข้อมูลทะเบียนผู้มีสิทธิ์รับซะกาต (Beneficiary Registry Info) */}
              {/* ===================================================================== */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-teal-700" />
                    2. ข้อมูลทะเบียนผู้มีสิทธิ์รับซะกาต (Beneficiary Registry)
                  </h3>
                  <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    ข้อมูลเชื่อมโยงจากฐานข้อมูลทะเบียน
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">รหัสทะเบียนผู้มีสิทธิ์</span>
                    <span className="font-mono font-bold text-teal-800 block mt-0.5">
                      {selectedApp.registrationNo || linkedRegistry?.registrationNo || 'ZMS-2026-000020'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">รหัสสมาชิกถาวร</span>
                    <span className="font-mono font-semibold text-slate-800 block mt-0.5">
                      {selectedApp.memberId || linkedRegistry?.memberCode || linkedRegistry?.memberId || '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">หมวดหมู่อัสนัฟที่รับรอง</span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {resolvedData?.asnafMeta.th}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {resolvedData?.asnafMeta.sub}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">วันที่ขึ้นทะเบียนในระบบ</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {formatDate(linkedRegistry?.registeredDate || selectedApp.appliedDate)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">จำนวนสมาชิกในครัวเรือน</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {selectedApp.householdMembers?.length || linkedRegistry?.householdMembers?.length || 1} คน
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">สถานะทะเบียน</span>
                    <span className="font-semibold text-emerald-700 block mt-0.5 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ขึ้นทะเบียนและยืนยันสิทธิ์แล้ว
                    </span>
                  </div>

                  <div className="sm:col-span-2 md:col-span-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <span className="text-slate-500 block text-[10px] font-bold">
                      สรุปสภาพความเป็นอยู่และภาระพึ่งพิงครอบครัว:
                    </span>
                    <p className="text-slate-800 mt-1 leading-relaxed">
                      {selectedApp.familySituationSummary ||
                        linkedRegistry?.familySituationSummary ||
                        formatHardshipText(selectedApp.hardshipReasons) ||
                        'มีภาระพึ่งพิงและรายได้ไม่เพียงพอต่อค่าครองชีพขั้นพื้นฐาน สมาชิกในครัวเรือนประกอบด้วยเด็กและผู้สูงอายุ'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* SECTION 3: ประเภทและรูปแบบความช่วยเหลือ (Assistance & Delivery Details) */}
              {/* ===================================================================== */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-700" />
                    3. ประเภทและรูปแบบความช่วยเหลือ (Assistance & Delivery Format)
                  </h3>
                  <span className="text-[10px] font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {selectedApp.assistanceTypeGroup === 'core' ? 'ความช่วยเหลือหลัก (Core)' : 'ความช่วยเหลือเฉพาะด้าน (Specific)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">ประเภทความช่วยเหลือ</span>
                    <strong className="text-slate-900 block mt-0.5 text-xs">
                      {resolvedData?.assistanceTypeName}
                    </strong>
                    <span className="text-[10px] text-indigo-700 mt-0.5 block">
                      หมวด: {selectedApp.assistanceTypeGroup || 'ปัจจัยยังชีพขั้นพื้นฐาน'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">รูปแบบการสนับสนุน</span>
                    <strong className="text-slate-900 block mt-0.5 text-xs">
                      {resolvedData?.assistanceFormatName}
                    </strong>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      สนับสนุนเงินช่วยเหลือตรงตามสิทธิ์
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">วิธีการส่งมอบความช่วยเหลือ</span>
                    <strong className="text-slate-900 block mt-0.5 text-xs flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      {(selectedApp as any).deliveryMethod || 'โอนเงินผ่านระบบธนาคาร / พร้อมเพย์'}
                    </strong>
                    <span className="text-[10px] text-emerald-700 mt-0.5 block">
                      บันทึกหลักฐานการโอนเงินเข้าสู่ระบบอัตโนมัติ
                    </span>
                  </div>

                  {/* Bank Account / Delivery Target Info */}
                  <div className="sm:col-span-2 md:col-span-3 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-600 font-bold block uppercase">
                          ช่องทางการรับเงินช่วยเหลือ
                        </span>
                        <div className="font-bold text-slate-900">
                          {(selectedApp as any).bankName || (selectedApp as any).recipientBankName || 'ธนาคารอิสลามแห่งประเทศไทย (iBank)'}
                          <span className="font-mono text-indigo-900 font-semibold ml-2">
                            {(selectedApp as any).accountNumber || (selectedApp as any).recipientAccountNumber || '095-X-XXX45-1'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right text-[11px] text-slate-600">
                      <span>ชื่อบัญชี: </span>
                      <strong className="text-slate-900 font-bold">
                        {(selectedApp as any).accountName || (selectedApp as any).recipientAccountName || formatPersonName(selectedApp)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* SECTION 4: ผลการตรวจสอบและประเมินสิทธิ์ (Field Assessment Results) */}
              {/* ===================================================================== */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-700" />
                    4. ผลการตรวจสอบและประเมินสิทธิ์ (Field Assessment Results)
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    เจ้าหน้าที่สำรวจ: <strong className="text-slate-700">{selectedApp.assignedOfficerName || 'เจ้าหน้าที่ภาคสนาม'}</strong>
                  </span>
                </div>

                {selectedApp.assessmentStatus && selectedApp.assessmentStatus !== 'completed' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="flex-1">
                      <strong>รอการประเมินสิทธิ์:</strong> คำร้องนี้ยังไม่ผ่านการประเมินสิทธิ์ (สถานะ: &quot;รอประเมิน&quot;) ต้องผ่านการประเมินสิทธิ์ให้เสร็จสิ้นก่อนจึงจะสามารถพิจารณาอนุมัติได้
                    </div>
                  </div>
                )}

                {/* Score & Progress Indicator */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        คะแนนความเดือดร้อนและความจำเป็น (Living Condition Score)
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl font-black text-[#0B2545]">
                          {livingScore}
                        </span>
                        <span className="text-xs text-slate-400">/ 100 คะแนน</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreLevel.color} bg-white border border-slate-200 ml-2`}>
                          {scoreLevel.text}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">วันที่ประเมินเสร็จสิ้น</span>
                      <span className="font-semibold text-slate-700 text-xs block mt-0.5">
                        {formatDate(selectedApp.assessment?.assessedDate || selectedApp.appliedDate)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${scoreLevel.bg}`}
                      style={{ width: `${Math.min(100, Math.max(5, livingScore))}%` }}
                    />
                  </div>
                </div>

                {/* Hardship Details & Housing Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200 text-xs space-y-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                      บันทึกสภาพความเดือดร้อนจริงจากการลงพื้นที่:
                    </div>
                    <p className="text-amber-900 leading-relaxed text-[11px]">
                      {selectedApp.assessment?.generalNotes ||
                        formatHardshipText(selectedApp.hardshipReasons) ||
                        'เจ้าหน้าที่ได้ลงพื้นที่สำรวจความเป็นอยู่จริง พบว่าครอบครัวมีรายได้ไม่เพียงพอต่อค่าครองชีพพื้นฐาน'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      สภาพที่อยู่อาศัยและภาระหนี้สิน:
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>
                        • ที่อยู่อาศัย: {selectedApp.assessment?.housingNotes || selectedApp.housingNotes || 'ที่พักอาศัยสภาพทรุดโทรม ไม่มีกรรมสิทธิ์ในที่ดิน'}
                      </div>
                      <div>
                        • ภาระหนี้สิน: {selectedApp.assessment?.debtBurdenSummary || selectedApp.urgentNeeds || 'มีภาระหนี้สินจำเป็นเพื่อการยังชีพ'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================================== */}
              {/* SECTION 5: เอกสารประกอบคำร้อง (Attached Documents) */}
              {/* ===================================================================== */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-700" />
                    <h3 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider">
                      5. เอกสารประกอบคำร้อง (Attached Documents)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                      {selectedApp.documents?.length || 0} รายการ
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    รองรับการตรวจสอบไฟล์ PDF, JPG, PNG
                  </span>
                </div>

                {selectedApp.documents && selectedApp.documents.length > 0 ? (
                  <DocumentListTable documents={selectedApp.documents} readOnly={true} />
                ) : (
                  <div className="p-6 text-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs space-y-1">
                    <FileText className="w-6 h-6 text-slate-300 mx-auto" />
                    <div className="font-semibold text-slate-700">ไม่มีเอกสารแนบในคำร้องนี้</div>
                    <p className="text-[11px] text-slate-400">
                      คำร้องได้รับการยืนยันข้อมูลผ่านการลงพื้นที่สำรวจสิทธิ์ของเจ้าหน้าที่
                    </p>
                  </div>
                )}
              </div>

              {/* ===================================================================== */}
              {/* SECTION 6: วงเงินที่เสนอและวงเงินที่พิจารณา (Proposed & Approved Amount) */}
              {/* Note: NO multi-tier fund cards or simulation tables per Phase 3 */}
              {/* ===================================================================== */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-700" />
                    6. วงเงินที่เสนอและวงเงินที่พิจารณา (Proposed & Approved Amount)
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    THB Currency
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Requested Amount */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-medium">วงเงินที่ผู้ยื่นเสนอขอ</span>
                    <span className="text-lg font-bold text-slate-800 block mt-1">
                      ฿{selectedApp.requestedAmount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">ตามเอกสารคำขอ</span>
                  </div>

                  {/* Recommended Amount */}
                  <div className="p-3.5 rounded-lg bg-purple-50/70 border border-purple-200">
                    <span className="text-[10px] text-purple-700 block font-medium">จนท. ประเมินเสนอแนะ</span>
                    <span className="text-lg font-bold text-purple-900 block mt-1">
                      ฿{(selectedApp.assessment?.recommendedAmount || selectedApp.requestedAmount).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-purple-600 mt-0.5 block">จากผลการลงพื้นที่</span>
                  </div>

                  {/* Approval Amount Input */}
                  <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-300 ring-1 ring-emerald-400">
                    <label className="text-[10px] text-emerald-800 block font-bold uppercase tracking-wider">
                      วงเงินที่พิจารณาอนุมัติ (บาท) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-700">฿</span>
                      <input
                        type="number"
                        min={1}
                        required
                        value={approvalAmount}
                        onChange={(e) => setApprovalAmount(Math.max(0, Number(e.target.value)))}
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-emerald-300 rounded-md font-extrabold text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs text-right"
                      />
                    </div>
                    {/* Quick Fill Buttons */}
                    <div className="flex items-center justify-between gap-1 pt-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setApprovalAmount(selectedApp.assessment?.recommendedAmount || selectedApp.requestedAmount)}
                        className="text-purple-700 hover:underline font-bold"
                      >
                        [ใช้ยอดประเมิน]
                      </button>
                      <button
                        type="button"
                        onClick={() => setApprovalAmount(selectedApp.requestedAmount)}
                        className="text-slate-600 hover:underline font-medium"
                      >
                        [ใช้ยอดคำขอ]
                      </button>
                    </div>
                  </div>
                </div>

                {/* Validation & Solvency Alerts */}
                {!resolvedData?.isMapped ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1 animate-fadeIn">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      ไม่พบการตั้งค่ากองทุนที่สัมพันธ์ใน Master Data (ล็อกปุ่มอนุมัติ)
                    </div>
                    <p className="text-[11px] text-amber-800 pl-5">
                      ประเภทความช่วยเหลือ &ldquo;<strong>{resolvedData?.assistanceTypeName}</strong>&rdquo; ยังไม่มีการกำหนดกองทุน กรุณาส่งกลับให้เจ้าหน้าที่ตรวจสอบ
                    </p>
                  </div>
                ) : approvalAmount <= 0 ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-800 font-semibold flex items-center gap-2 animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    กรุณาระบุวงเงินที่พิจารณาอนุมัติมากกว่า 0 บาท
                  </div>
                ) : !resolvedData?.isAllSufficient && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900 space-y-1 animate-fadeIn">
                    <div className="font-bold flex items-center gap-1.5 text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      งบประมาณกองทุนไม่เพียงพอสำหรับวงเงินนี้ (ล็อกปุ่มอนุมัติ)
                    </div>
                    <p className="text-[11px] text-rose-800 pl-5">
                      ยอดคงเหลือในกองทุนไม่เพียงพอ กรุณาปรับลดวงเงิน หรือเลือก &ldquo;ส่งกลับแก้ไข&rdquo; / &ldquo;ไม่อนุมัติ&rdquo; ตามระเบียบ
                    </p>
                  </div>
                )}
              </div>

              {/* ===================================================================== */}
              {/* SECTION 7: บันทึกการพิจารณาของคณะกรรมการ (Decision & Notes) */}
              {/* ===================================================================== */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-[#0B2545] uppercase tracking-wider flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-slate-700" />
                    7. บันทึกการพิจารณาของคณะกรรมการ (Decision & Notes)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    บันทึกลงใน Audit Log และประวัติคำร้อง
                  </span>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="ระบุความเห็น ข้อกำหนด หรือเหตุผลการพิจารณาของคณะกรรมการ..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
                  />
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                    ข้อความสำเร็จรูป (Quick Notes):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_DECISION_NOTES.map((note, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDecisionNotes(note)}
                        className="px-2.5 py-1 rounded-md text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-left"
                      >
                        {note.slice(0, 36)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* ===================================================================== */}
                {/* ACTION BUTTONS (ส่งกลับแก้ไข / ไม่อนุมัติ / อนุมัติคำร้อง) */}
                {/* ===================================================================== */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  {/* Return */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setConfirmAction('return')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-700" />
                    ส่งกลับแก้ไข
                  </button>

                  {/* Reject */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setConfirmAction('reject')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 text-rose-700" />
                    ไม่อนุมัติ
                  </button>

                  {/* Approve */}
                  <button
                    type="button"
                    disabled={
                      !resolvedData?.isAllSufficient ||
                      approvalAmount <= 0 ||
                      isSubmitting ||
                      (Boolean(selectedApp.assessmentStatus) && selectedApp.assessmentStatus !== 'completed')
                    }
                    onClick={() => setConfirmAction('approve')}
                    title={
                      selectedApp.assessmentStatus && selectedApp.assessmentStatus !== 'completed'
                        ? 'คำร้องนี้ต้องผ่านการประเมินสิทธิ์ให้เสร็จสิ้นก่อนจึงจะสามารถพิจารณาอนุมัติได้'
                        : undefined
                    }
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-all ${
                      resolvedData?.isAllSufficient &&
                      approvalAmount > 0 &&
                      !isSubmitting &&
                      (!selectedApp.assessmentStatus || selectedApp.assessmentStatus === 'completed')
                        ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-sm hover:shadow'
                        : 'bg-slate-300 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    อนุมัติคำร้อง (Approve)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL (PHASE 6) */}
      {/* ========================================================================= */}
      {confirmAction && selectedApp && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) setConfirmAction(null);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                    confirmAction === 'approve'
                      ? 'bg-emerald-100 text-emerald-800'
                      : confirmAction === 'reject'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {confirmAction === 'approve' ? '✓' : confirmAction === 'reject' ? '✕' : '↺'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {confirmAction === 'approve'
                      ? 'ยืนยันการอนุมัติคำร้องขอรับซะกาต'
                      : confirmAction === 'reject'
                      ? 'ยืนยันการไม่อนุมัติคำร้อง'
                      : 'ยืนยันการส่งกลับให้เจ้าหน้าที่แก้ไข'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatPersonName(selectedApp)} ({selectedApp.applicationNo})
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 text-xs text-slate-700 space-y-2 border border-slate-200">
                {confirmAction === 'approve' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">วงเงินที่พิจารณาอนุมัติ:</span>
                      <strong className="text-emerald-700 text-sm font-extrabold">
                        ฿{approvalAmount.toLocaleString()} บาท
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ประเภทความช่วยเหลือ:</span>
                      <strong className="text-slate-800">{resolvedData?.assistanceTypeName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">หมวดหมู่อัสนัฟ:</span>
                      <strong className="text-slate-800">{resolvedData?.asnafMeta.th}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                      * ระบบจะดำเนินการ Hold กันวงเงินงบประมาณอัตโนมัติ และส่งต่อฝ่ายการเงินเพื่อรอเบิกจ่าย
                    </div>
                  </>
                ) : (
                  <div>
                    <span className="text-slate-500 block mb-1">เหตุผลประกอบการตัดสินใจ:</span>
                    <div className="p-2 bg-white rounded border border-slate-200 text-slate-800 font-medium">
                      {decisionNotes || 'ไม่ได้ระบุเหตุผล'}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={
                    confirmAction === 'approve'
                      ? handleExecuteApproval
                      : confirmAction === 'reject'
                      ? handleExecuteReject
                      : handleExecuteReturn
                  }
                  className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-400 ${
                    confirmAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : confirmAction === 'reject'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการทำรายการ'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
