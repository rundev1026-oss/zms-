'use client';

/**
 * @deprecated
 * NOTE: This monolithic component is superseded by:
 * 1. BeneficiaryRegistryView.tsx - Master Registry of Zakat Beneficiaries (ทะเบียนผู้มีสิทธิ์)
 * 2. AssistanceRequestsView.tsx - Assistance Requests & Lifecycle Tracking (คำร้องขอความช่วยเหลือ)
 * Retained for legacy reference and backward compatibility.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { formatPersonName } from '@zms/shared';
import { useApp } from '@/context/AppContext';
import { ModalPortal, lockBodyScroll, unlockBodyScroll } from '@/components/common/Modal';
import {
  AssistanceApplication,
  ApplicationStatus,
  AsnafCategory,
  EvaluatorChecklist,
  HouseholdMember,
  PastAssistanceRecord
} from '@/types';
import {
  Search,
  Filter,
  Plus,
  Eye,
  FileCheck2,
  CheckCircle,
  Printer,
  Download,
  MapPin,
  Phone,
  Calendar,
  X,
  User,
  Heart,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  Home,
  CheckSquare,
  Square,
  DollarSign,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  Edit,
  FileSpreadsheet,
  XCircle,
  HelpCircle,
  Layers,
  Save,
  Check
} from 'lucide-react';
import { DocumentListTable } from '@/components/common/DocumentListTable';

interface BeneficiaryListViewProps {
  onNavigate: (view: string) => void;
  selectedAppId?: string;
  onEditApplication?: (app: AssistanceApplication) => void;
}

export function BeneficiaryListView({ onNavigate, selectedAppId, onEditApplication }: BeneficiaryListViewProps) {
  const {
    applications,
    currentUser,
    funds,
    updateApplicationStatus,
    updateChecklist,
    approveApplication,
    rejectApplication,
    executeDisbursement,
    showToast,
    refreshData
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [asnafFilter, setAsnafFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Active modal application
  const [activeModalApp, setActiveModalApp] = useState<AssistanceApplication | null>(
    selectedAppId ? applications.find((a) => a.id === selectedAppId) || null : null
  );

  // Modal active tab: 'survey' | 'checklist' | 'history' | 'documents'
  const [modalTab, setModalTab] = useState<'survey' | 'checklist' | 'history' | 'documents'>('survey');

  // Checklist local editing state
  const [checklistState, setChecklistState] = useState<EvaluatorChecklist | null>(null);
  const [isSavingChecklist, setIsSavingChecklist] = useState<boolean>(false);

  // Approval & Rejection dialog states
  const [showApprovalDialog, setShowApprovalDialog] = useState<boolean>(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState<boolean>(false);
  const [showDisburseDialog, setShowDisburseDialog] = useState<boolean>(false);
  const [approvalAmount, setApprovalAmount] = useState<number>(10000);
  const [selectedFundId, setSelectedFundId] = useState<string>(funds[0]?.id || 'fund-1');
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Lock body scroll cleanly whenever any modal in this view is active
  const isAnyModalActive = Boolean(
    activeModalApp ||
    showApprovalDialog ||
    showRejectionDialog ||
    showDisburseDialog
  );

  useEffect(() => {
    if (isAnyModalActive) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isAnyModalActive]);

  // Synchronize checklist state when active modal app changes
  const openAppDetail = (app: AssistanceApplication) => {
    setActiveModalApp(app);
    setModalTab('survey');
    setApprovalAmount(app.requestedAmount || 10000);
    setChecklistState(
      app.checklist || {
        amalIbadah: true,
        amalIbadahNotes: 'ปฏิบัติศาสนกิจสม่ำเสมอในชุมชน',
        landRights: app.landTitleType !== 'no_doc',
        landRightsNotes: app.landTitleNotes || 'มีเอกสารสิทธิ์/ได้รับอนุญาตถูกต้อง',
        housingCondition: app.housingType !== 'own' || app.housingCondition === 'dilapidated',
        housingConditionNotes: app.housingNotes || 'ที่อยู่อาศัยชำรุดทรุดโทรม',
        economicStatus: true,
        economicStatusNotes: 'ไม่มีรายได้ประจำ หรือรายได้ไม่เพียงพอต่อการยังชีพ',
        communityParticipation: true,
        communityParticipationNotes: 'ให้ความร่วมมือในกิจกรรมชุมชนมัสยิด',
        leaderEndorsement: !!app.certifier?.fullName,
        leaderEndorsementNotes: app.certifier ? `ได้รับการรับรองจาก ${app.certifier.fullName} (${app.certifier.roleTitle})` : 'ผู้นำชุมชนรับรองความเดือดร้อน',
        asnafVulnerability: true,
        asnafVulnerabilityNotes: `ตรงตามหลักเกณฑ์อัสนาฟหมวด ${app.asnafCategory}`,
        dependentBurdens: (app.householdMembers?.length || 0) > 1,
        dependentBurdensNotes: app.dependentBurdens || 'มีภาระพึ่งพิงสมาชิกในครอบครัว',
        committeeNotes: '',
      }
    );
  };

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        app.fullName.toLowerCase().includes(searchLower) ||
        app.applicationNo.toLowerCase().includes(searchLower) ||
        app.nationalIdMasked.toLowerCase().includes(searchLower) ||
        app.phone.toLowerCase().includes(searchLower) ||
        app.province.toLowerCase().includes(searchLower) ||
        (app.district && app.district.toLowerCase().includes(searchLower)) ||
        (app.subdistrict && app.subdistrict.toLowerCase().includes(searchLower)) ||
        app.community.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesAsnaf = asnafFilter === 'all' || app.asnafCategory === asnafFilter;
      const matchesBranch = branchFilter === 'all' ||
        (app.branchId && app.branchId === branchFilter) ||
        (app.branchName && app.branchName.includes(branchFilter));

      return matchesSearch && matchesStatus && matchesAsnaf && matchesBranch;
    });
  }, [applications, searchTerm, statusFilter, asnafFilter, branchFilter]);

  // Pagination calculation
  const totalItems = filteredApps.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApps.slice(start, start + pageSize);
  }, [filteredApps, currentPage, pageSize]);

  // Reset page when filter changes
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  // 9 Distinct Status Badges
  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> ฉบับร่าง
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> ยื่นคำร้องแล้ว
          </span>
        );
      case 'doc_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> รอตรวจเอกสาร
          </span>
        );
      case 'field_inspection':
      case 'assessment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> รอลงพื้นที่
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> รอพิจารณา
          </span>
        );
      case 'approved':
      case 'wait_disbursement':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> อนุมัติแล้ว
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> ไม่อนุมัติ
          </span>
        );
      case 'disbursed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-300">
            <Check className="w-3 h-3 text-teal-600" /> จ่ายช่วยเหลือแล้ว
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" /> ปิดคำร้อง
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getAsnafLabel = (cat: AsnafCategory) => {
    switch (cat) {
      case 'faqir': return 'ฟะกีร (ผู้ยากไร้)';
      case 'miskin': return 'มิสเกน (ผู้ขัดสน)';
      case 'gharimin': return 'ฆอริมูน (มีหนี้สิน)';
      case 'fisabilillah': return 'ฟีสะบีลิลลาฮ์';
      case 'ibnsabil': return 'อิบนุสสะบีล';
      case 'muallaf': return 'มุอัลลัฟ';
      default: return cat;
    }
  };

  // Hardship badges generator
  const renderHardshipSummary = (app: AssistanceApplication) => {
    const hr = app.hardshipReasons;
    const badges: string[] = [];
    if (hr) {
      if (hr.poverty) badges.push('ยากจน/รายได้น้อย');
      if (hr.debt) badges.push(`หนี้สิน (฿${(hr.debtAmount || app.requestedAmount).toLocaleString()})`);
      if (hr.unemployed) badges.push('ตกงาน/ไร้อาชีพ');
      if (hr.disability) badges.push('มีความพิการ');
      if (hr.illness) badges.push('เจ็บป่วยเรื้อรัง');
      if (hr.familyIssue) badges.push('ปัญหาครอบครัว');
      if (hr.other) badges.push('เหตุผลอื่น');
    }
    if (badges.length === 0) {
      badges.push(getAsnafLabel(app.asnafCategory));
    }
    return (
      <div className="flex flex-wrap gap-1 max-w-[220px]">
        {badges.slice(0, 2).map((b, i) => (
          <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
            {b}
          </span>
        ))}
        {badges.length > 2 && (
          <span className="px-1 py-0.5 rounded text-[9px] bg-slate-200 text-slate-600 font-medium">
            +{badges.length - 2}
          </span>
        )}
      </div>
    );
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredApps.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', 'info');
      return;
    }

    const headers = [
      'เลขที่คำร้อง',
      'ชื่อ-นามสกุล',
      'เลขประจำตัวประชาชน',
      'เบอร์โทรศัพท์',
      'จังหวัด',
      'อำเภอ',
      'ตำบล',
      'ชุมชน',
      'หมวดอัสนาฟ',
      'วงเงินขอรับ (บาท)',
      'วงเงินอนุมัติ (บาท)',
      'สถานะ',
      'วันที่ยื่นคำร้อง',
      'เจ้าหน้าที่รับผิดชอบ',
      'สาขา'
    ];

    const rows = filteredApps.map((a) => [
      `"${a.applicationNo}"`,
      `"${formatPersonName(a)}"`,
      `"${a.nationalIdMasked}"`,
      `"${a.phone}"`,
      `"${a.province}"`,
      `"${a.district || ''}"`,
      `"${a.subdistrict || ''}"`,
      `"${a.community}"`,
      `"${getAsnafLabel(a.asnafCategory)}"`,
      a.requestedAmount,
      a.approvedAmount || 0,
      `"${a.status}"`,
      `"${a.appliedDate}"`,
      `"${a.assignedOfficerName}"`,
      `"${a.branchName || 'สำนักงานใหญ่'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `zms-beneficiaries-registry-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ส่งออกไฟล์ CSV สำเร็จเรียบร้อย', 'success');
  };

  // Save Checklist
  const handleSaveChecklist = async () => {
    if (!activeModalApp || !checklistState) return;
    setIsSavingChecklist(true);
    const ok = await updateChecklist(activeModalApp.id, checklistState);
    setIsSavingChecklist(false);
    if (ok) {
      setActiveModalApp({
        ...activeModalApp,
        checklist: checklistState
      });
    }
  };

  // Status Transition Action
  const handleTransition = async (newStatus: ApplicationStatus, notes: string) => {
    if (!activeModalApp) return;
    await updateApplicationStatus(activeModalApp.id, newStatus, notes);
    setActiveModalApp({
      ...activeModalApp,
      status: newStatus
    });
  };

  // KPI calculations
  const stats = useMemo(() => {
    const total = applications.length;
    const pendingAssessment = applications.filter((a) => a.status === 'doc_review' || a.status === 'field_inspection' || a.status === 'assessment').length;
    const pendingApproval = applications.filter((a) => a.status === 'pending_approval').length;
    const disbursed = applications.filter((a) => a.status === 'disbursed').length;
    const totalDisbursedAmount = applications.reduce((acc, a) => acc + (a.disbursedAmount || 0), 0);
    return { total, pendingAssessment, pendingApproval, disbursed, totalDisbursedAmount };
  }, [applications]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header & Quick Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              ทะเบียนและคำร้องขอรับซะกาต (Beneficiaries)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              แบบสำรวจฉบับปรับปรุง
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ฐานข้อมูลผู้ขอรับความช่วยเหลือตามหลักชะรีอะฮ์ ตรวจสอบสิทธิ์ 8 อัสนาฟ และติดตามผลขั้นตอนการสงเคราะห์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            title="ส่งออกรายชื่อเป็นไฟล์ Excel/CSV"
          >
            <Download className="w-3.5 h-3.5" /> ส่งออก CSV
          </button>

          <button
            onClick={() => onNavigate('new-application')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" /> เพิ่มทะเบียนคำร้องใหม่
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">คำร้องทั้งหมดในระบบ</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">ครอบคลุมทุกสาขาทั่วประเทศ</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">รอตรวจเอกสาร/ลงพื้นที่</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{stats.pendingAssessment}</div>
          <div className="text-[10px] text-slate-400 mt-1">อยู่ระหว่างจัดเจ้าหน้าที่สำรวจ</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">รอคณะกรรมการอนุมัติ</div>
          <div className="text-2xl font-extrabold text-purple-600 mt-1">{stats.pendingApproval}</div>
          <div className="text-[10px] text-slate-400 mt-1">พร้อมพิจารณาวงเงินกองทุน</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">ดำเนินการช่วยเหลือแล้ว</div>
          <div className="text-2xl font-extrabold text-teal-700 mt-1">{stats.disbursed}</div>
          <div className="text-[10px] text-teal-600 font-semibold mt-1">ยอดจ่ายจริง: ฿{stats.totalDisbursedAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* 2. Search, Filters & Branch Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ-สกุล, เลขคำร้อง, บัตร ปชช., เบอร์โทร, จังหวัด, ชุมชน..."
            value={searchTerm}
            onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter (9 statuses) */}
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-medium"
          >
            <option value="all">สถานะคำร้อง (ทั้งหมด)</option>
            <option value="draft">1. ฉบับร่าง (Draft)</option>
            <option value="submitted">2. ยื่นคำร้องแล้ว (Submitted)</option>
            <option value="doc_review">3. รอตรวจสอบเอกสาร (Doc Review)</option>
            <option value="field_inspection">4. รอลงพื้นที่ (Field Inspection)</option>
            <option value="pending_approval">5. รอพิจารณา (Pending Approval)</option>
            <option value="approved">6. อนุมัติแล้ว (Approved)</option>
            <option value="rejected">7. ไม่อนุมัติ (Rejected)</option>
            <option value="disbursed">8. จ่ายช่วยเหลือแล้ว (Disbursed)</option>
            <option value="closed">9. ปิดคำร้อง (Closed)</option>
          </select>

          {/* Asnaf Filter */}
          <select
            value={asnafFilter}
            onChange={(e) => handleFilterChange(setAsnafFilter, e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-medium"
          >
            <option value="all">หมวดอัสนาฟ (ทั้งหมด)</option>
            <option value="miskin">มิสเกน (ผู้ขัดสน)</option>
            <option value="faqir">ฟะกีร (ผู้ยากไร้)</option>
            <option value="gharimin">ฆอริมูน (มีหนี้สิน)</option>
            <option value="fisabilillah">ฟีสะบีลิลลาฮ์ (การศึกษา)</option>
            <option value="ibnsabil">อิบนุสสะบีล (ผู้เดินทาง)</option>
            <option value="muallaf">มุอัลลัฟ (ผู้เข้ารับอิสลาม)</option>
          </select>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => handleFilterChange(setBranchFilter, e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-medium"
          >
            <option value="all">สาขาทั้งหมด</option>
            <option value="br-hq">สำนักงานใหญ่ กรุงเทพมหานคร</option>
            <option value="br-central">สาขาภาคกลางและปริมณฑล</option>
            <option value="br-south">สาขาภาคใต้ (ปัตตานี)</option>
            <option value="br-north">สาขาภาคเหนือ (เชียงใหม่)</option>
          </select>

          {(searchTerm || statusFilter !== 'all' || asnafFilter !== 'all' || branchFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setAsnafFilter('all');
                setBranchFilter('all');
                setCurrentPage(1);
              }}
              className="text-xs text-rose-600 hover:underline px-2 py-1 font-medium"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Beneficiaries Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">รหัสผู้รับซะกาต</th>
                <th className="py-3 px-4 font-bold">ชื่อ–นามสกุล / เบอร์โทร</th>
                <th className="py-3 px-4 font-bold">จังหวัด / อำเภอ / ตำบล</th>
                <th className="py-3 px-4 font-bold">ประเภทปัญหา</th>
                <th className="py-3 px-4 font-bold">วันที่ยื่น</th>
                <th className="py-3 px-4 font-bold">สถานะการพิจารณา</th>
                <th className="py-3 px-4 font-bold">ผู้รับผิดชอบ & สาขา</th>
                <th className="py-3 px-4 font-bold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">ไม่พบข้อมูลคำร้องที่ตรงกับเงื่อนไข</p>
                      <p className="text-xs text-slate-400">กรุณาลองเปลี่ยนคำค้นหา หรือล้างตัวกรอง</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/90 transition-colors group">
                    {/* รหัสผู้รับซะกาต */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {app.applicationNo}
                    </td>

                    {/* ชื่อ–นามสกุล & โทร */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{formatPersonName(app)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                        <span className="text-slate-400">ปชช:</span> {app.nationalIdMasked}
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600 font-sans flex items-center gap-0.5">
                          <Phone className="w-3 h-3 text-slate-400" /> {app.phone}
                        </span>
                      </div>
                    </td>

                    {/* ที่อยู่ */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{app.community}</div>
                      <div className="text-[11px] text-slate-500">
                        {app.subdistrict ? `ต.${app.subdistrict} ` : ''}
                        {app.district ? `อ.${app.district} ` : ''}
                        {app.province}
                      </div>
                    </td>

                    {/* ประเภทปัญหา */}
                    <td className="py-3.5 px-4">
                      {renderHardshipSummary(app)}
                    </td>

                    {/* วันที่ยื่นคำร้อง */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {app.appliedDate}
                    </td>

                    {/* สถานะการพิจารณา */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>

                    {/* ผู้รับผิดชอบ & สาขา */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{app.assignedOfficerName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {app.branchName || 'สำนักงานใหญ่'}
                      </div>
                    </td>

                    {/* ปุ่มจัดการ */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openAppDetail(app)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold transition-colors flex items-center gap-1 text-[11px] border border-emerald-200"
                          title="ดูแบบสำรวจและรายละเอียดครบชุด"
                        >
                          <Eye className="w-3.5 h-3.5" /> ดูข้อมูล
                        </button>

                        <button
                          onClick={() => {
                            if (onEditApplication) {
                              onEditApplication(app);
                            } else {
                              onNavigate('new-application');
                            }
                          }}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors flex items-center gap-1 text-[11px]"
                          title="แก้ไขข้อมูลคำร้อง"
                        >
                          <Edit className="w-3 h-3" /> แก้ไข
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Footer */}
        <div className="bg-slate-50/80 border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              แสดง {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} ถึง{' '}
              {Math.min(currentPage * pageSize, totalItems)} จากทั้งหมด {totalItems} รายการ
            </span>

            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-[11px] text-slate-400">แถวต่อหน้า:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition-colors"
              aria-label="หน้าก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-semibold text-slate-800">
              หน้า {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition-colors"
              aria-label="หน้าถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Comprehensive Beneficiary Detail Modal (Sections A - I & Checklist) */}
      {activeModalApp && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveModalApp(null);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-5xl w-full max-h-[calc(100dvh-24px)] flex flex-col shadow-2xl border border-slate-200 my-auto overflow-hidden"
            >
            {/* Modal Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {formatPersonName(activeModalApp)}
                    </h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {activeModalApp.applicationNo}
                    </span>
                    {getStatusBadge(activeModalApp.status)}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                      PDPA Protected
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ยื่นคำร้อง: {activeModalApp.appliedDate} • สาขา: {activeModalApp.branchName || 'สำนักงานใหญ่'} • เจ้าหน้าที่: {activeModalApp.assignedOfficerName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  title="พิมพ์เอกสารคำร้อง"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveModalApp(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-semibold shrink-0 overflow-x-auto">
              <button
                onClick={() => setModalTab('survey')}
                className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${modalTab === 'survey'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <FileText className="w-4 h-4" /> แบบสำรวจข้อมูล (ส่วน A–H)
              </button>

              <button
                onClick={() => setModalTab('checklist')}
                className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${modalTab === 'checklist'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <CheckSquare className="w-4 h-4" /> หลักเกณฑ์การพิจารณา (Checklist)
              </button>

              <button
                onClick={() => setModalTab('documents')}
                className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${modalTab === 'documents'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Layers className="w-4 h-4" /> เอกสารแนบ (ส่วน I)
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                  {activeModalApp.documents?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setModalTab('history')}
                className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${modalTab === 'history'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Clock className="w-4 h-4" /> ประวัติการพิจารณา & การเงิน
              </button>
            </div>

            {/* Modal Tab Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs bg-white">
              {/* TAB 1: SURVEY SECTIONS A - H */}
              {modalTab === 'survey' && (
                <div className="space-y-6">
                  {/* ส่วน A: ข้อมูลส่วนบุคคลและที่อยู่อาศัย */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="font-bold text-slate-900 text-sm flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-emerald-700" />
                        ข้อมูลส่วนบุคคลและที่อยู่อาศัย
                      </span>
                      <span className="text-xs text-slate-400 font-normal">
                        แบบสำรวจฉบับปรับปรุง
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px]">ชื่อ–นามสกุล:</span>
                        <span className="font-semibold text-slate-900">{formatPersonName(activeModalApp)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">เลขบัตรประชาชน (PDPA):</span>
                        <span className="font-mono text-slate-800">{activeModalApp.nationalIdMasked}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">วันเดือนปีเกิด / อายุ:</span>
                        <span>{activeModalApp.birthDate || '-'} ({activeModalApp.age ? `${activeModalApp.age} ปี` : 'ไม่ระบุ'})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">เบอร์โทรศัพท์:</span>
                        <span className="font-semibold text-slate-900">{activeModalApp.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">อาชีพ:</span>
                        <span>{activeModalApp.occupation || 'รับจ้างทั่วไป/ไม่มีอาชีพประจำ'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">สถานภาพสมรส:</span>
                        <span>
                          {activeModalApp.maritalStatus === 'married' ? 'สมรส' :
                            activeModalApp.maritalStatus === 'divorced' ? 'หย่าร้าง' :
                              activeModalApp.maritalStatus === 'widowed' ? 'หม้าย' :
                                activeModalApp.maritalStatus === 'separated' ? 'แยกกันอยู่' : 'โสด'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">ลักษณะที่อยู่อาศัย:</span>
                        <span className="font-medium text-emerald-800">
                          {activeModalApp.housingType === 'own' ? 'บ้านของตนเอง' :
                            activeModalApp.housingType === 'rent' ? 'บ้านเช่า' :
                              activeModalApp.housingType === 'relative' ? 'อาศัยกับญาติ' : 'บ้านผู้อื่น'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">เอกสารสิทธิ์ที่ดิน:</span>
                        <span>
                          {activeModalApp.landTitleType === 'title_deed' ? 'โฉนดที่ดิน' :
                            activeModalApp.landTitleType === 'ns3' ? 'น.ส.3 / น.ส.3 ก' :
                              activeModalApp.landTitleType === 'spk' ? 'ส.ป.ก.' :
                                activeModalApp.landTitleType === 'public_land' ? 'ที่ดินสาธารณะ' :
                                  activeModalApp.landTitleType === 'permission_granted' ? 'ที่ดินผู้อื่น (ได้รับอนุญาต)' : 'ไม่มีเอกสารสิทธิ์'}
                        </span>
                      </div>
                      <div className="col-span-full pt-1">
                        <span className="text-slate-400 block text-[10px]">ที่อยู่ปัจจุบัน:</span>
                        <span className="text-slate-800">
                          {activeModalApp.address} ต.{activeModalApp.subdistrict || '-'} อ.{activeModalApp.district || '-'} จ.{activeModalApp.province} {activeModalApp.postcode || ''} (ชุมชน: {activeModalApp.community})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ส่วน B & C: เหตุผลสภาพปัญหา และประเภทความช่วยเหลือ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ส่วน B */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />  เหตุผลและสภาพปัจจุบัน
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {activeModalApp.hardshipReasons ? (
                          <>
                            {activeModalApp.hardshipReasons.poverty && (
                              <div className="flex items-center gap-2 text-slate-700">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>ยากจนหรือรายได้น้อย</span>
                              </div>
                            )}
                            {activeModalApp.hardshipReasons.debt && (
                              <div className="flex items-start gap-2 text-slate-700">
                                <Check className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium text-rose-700">มีหนี้สินจำเป็น</span>
                                  <span className="text-slate-500 text-[11px] block">
                                    ประเภท: {activeModalApp.hardshipReasons.debtType || 'ในระบบ/นอกระบบ'} (จำนวน ฿{(activeModalApp.hardshipReasons.debtAmount || 0).toLocaleString()} บาท)
                                  </span>
                                </div>
                              </div>
                            )}
                            {activeModalApp.hardshipReasons.unemployed && (
                              <div className="flex items-center gap-2 text-slate-700">
                                <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>ตกงาน ไม่มีงานทำ หรือไม่มีอาชีพประจำ</span>
                              </div>
                            )}
                            {activeModalApp.hardshipReasons.disability && (
                              <div className="flex items-center gap-2 text-slate-700">
                                <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span>มีความพิการ: {activeModalApp.hardshipReasons.disabilityDetails || 'ทุพพลภาพ'}</span>
                              </div>
                            )}
                            {activeModalApp.hardshipReasons.illness && (
                              <div className="flex items-center gap-2 text-slate-700">
                                <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>การเจ็บป่วยเรื้อรัง: {activeModalApp.hardshipReasons.illnessDetails || 'มีโรคประจำตัว'}</span>
                              </div>
                            )}
                            {activeModalApp.hardshipReasons.familyIssue && (
                              <div className="flex items-center gap-2 text-slate-700">
                                <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>ปัญหาครอบครัว / ภาระพึ่งพิงสูง</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-slate-500 italic">ขัดสนตามเกณฑ์หมวด {getAsnafLabel(activeModalApp.asnafCategory)}</div>
                        )}
                      </div>
                    </div>

                    {/* ส่วน C */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-600" />  ประเภทความช่วยเหลือที่ร้องขอ
                        </span>
                        <span className="text-emerald-700 font-bold text-sm">
                          ฿{activeModalApp.requestedAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1 text-slate-700">
                        <div>
                          <span className="text-slate-400 block text-[10px]">ประเภทความช่วยเหลือ:</span>
                          <span className="font-semibold text-slate-900">
                            {activeModalApp.assistanceType === 'cash' ? 'เงินช่วยเหลือยังชีพ' :
                              activeModalApp.assistanceType === 'in_kind' ? 'สิ่งของ / ถุงยังชีพ' :
                                activeModalApp.assistanceType === 'housing_repair' ? 'ซ่อมแซมที่อยู่อาศัย' :
                                  activeModalApp.assistanceType === 'housing_construction' ? 'สร้างบ้านใหม่' :
                                    activeModalApp.assistanceType === 'education' ? 'ทุนการศึกษา' :
                                      activeModalApp.assistanceType === 'medical' ? 'ค่ารักษาพยาบาล' : 'ความช่วยเหลืออื่นๆ'}
                          </span>
                        </div>
                        {activeModalApp.necessityDetails && (
                          <div>
                            <span className="text-slate-400 block text-[10px]">รายละเอียดและความจำเป็น:</span>
                            <span className="text-slate-800">{activeModalApp.necessityDetails}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                          <span className="text-slate-500">หมวดอัสนาฟ:</span>
                          <span className="font-bold text-emerald-800">{getAsnafLabel(activeModalApp.asnafCategory)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ส่วน D: ประวัติการช่วยเหลือ */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <span> ประวัติการรับความช่วยเหลือในอดีต</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {activeModalApp.pastAssistance && activeModalApp.pastAssistance.length > 0 ? 'เคยได้รับความช่วยเหลือ' : 'ไม่เคยได้รับความช่วยเหลือ'}
                      </span>
                    </div>

                    {activeModalApp.pastAssistance && activeModalApp.pastAssistance.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 text-[10px] text-slate-600 uppercase">
                            <tr>
                              <th className="py-2 px-3">หน่วยงานผู้ให้</th>
                              <th className="py-2 px-3">ประเภทความช่วยเหลือ</th>
                              <th className="py-2 px-3">จำนวนเงิน/สิ่งของ</th>
                              <th className="py-2 px-3">ปีที่ได้รับ (พ.ศ.)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activeModalApp.pastAssistance.map((p, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-medium text-slate-800">{p.agency}</td>
                                <td className="py-2 px-3 text-slate-600">{p.assistanceType}</td>
                                <td className="py-2 px-3 text-slate-800">{p.amountOrItems}</td>
                                <td className="py-2 px-3 text-slate-600">{p.yearReceived}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic text-center py-2">
                        ไม่มีประวัติการได้รับความช่วยเหลือจากหน่วยงานอื่นมาก่อน
                      </div>
                    )}
                  </div>

                  {/* ส่วน E: รายรับและรายจ่ายครัวเรือน */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="font-bold text-slate-900 text-sm flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-700" /> รายรับและรายจ่ายครัวเรือนต่อเดือน
                      </span>
                      {activeModalApp.netIncome !== undefined && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${activeModalApp.netIncome < 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                          รายรับสุทธิ: ฿{activeModalApp.netIncome.toLocaleString()} /เดือน
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* รายรับ */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="font-semibold text-emerald-800 border-b border-slate-100 pb-1 flex justify-between">
                          <span>รายรับต่อเดือน (8 รายการ)</span>
                          <span className="font-bold">
                            ฿{(
                              (activeModalApp.incomeBreakdown?.salary || 0) +
                              (activeModalApp.incomeBreakdown?.familySupport || 0) +
                              (activeModalApp.incomeBreakdown?.agriculture || 0) +
                              (activeModalApp.incomeBreakdown?.trading || 0) +
                              (activeModalApp.incomeBreakdown?.assetIncome || 0) +
                              (activeModalApp.incomeBreakdown?.freelance || 0) +
                              (activeModalApp.incomeBreakdown?.welfare || 0) +
                              (activeModalApp.incomeBreakdown?.otherIncome || 0)
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-1 text-slate-600 text-[11px]">
                          <div className="flex justify-between"><span>1. ค่าจ้าง/เงินเดือน:</span> <span>฿{(activeModalApp.incomeBreakdown?.salary || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>2. เงินจากสมาชิกครอบครัว:</span> <span>฿{(activeModalApp.incomeBreakdown?.familySupport || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>3. ผลผลิตเกษตร:</span> <span>฿{(activeModalApp.incomeBreakdown?.agriculture || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>4. การค้าขาย:</span> <span>฿{(activeModalApp.incomeBreakdown?.trading || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>5. รายได้ทรัพย์สิน:</span> <span>฿{(activeModalApp.incomeBreakdown?.assetIncome || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>6. อาชีพส่วนตัว/อิสระ:</span> <span>฿{(activeModalApp.incomeBreakdown?.freelance || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>7. เงินสวัสดิการ/เบี้ยยังชีพ:</span> <span>฿{(activeModalApp.incomeBreakdown?.welfare || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>8. รายการอื่น:</span> <span>฿{(activeModalApp.incomeBreakdown?.otherIncome || 0).toLocaleString()}</span></div>
                        </div>
                      </div>

                      {/* รายจ่าย */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="font-semibold text-rose-800 border-b border-slate-100 pb-1 flex justify-between">
                          <span>รายจ่ายต่อเดือน (7 รายการ)</span>
                          <span className="font-bold">
                            ฿{(
                              (activeModalApp.expenseBreakdown?.living || 0) +
                              (activeModalApp.expenseBreakdown?.education || 0) +
                              (activeModalApp.expenseBreakdown?.healthcare || 0) +
                              (activeModalApp.expenseBreakdown?.utilities || 0) +
                              (activeModalApp.expenseBreakdown?.rent || 0) +
                              (activeModalApp.expenseBreakdown?.debtPayment || 0) +
                              (activeModalApp.expenseBreakdown?.otherExpense || 0)
                            ).toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-1 text-slate-600 text-[11px]">
                          <div className="flex justify-between"><span>1. ค่าอุปโภคบริโภค:</span> <span>฿{(activeModalApp.expenseBreakdown?.living || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>2. การศึกษาบุตร:</span> <span>฿{(activeModalApp.expenseBreakdown?.education || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>3. สุขภาพ/ยารักษาโรค:</span> <span>฿{(activeModalApp.expenseBreakdown?.healthcare || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>4. ค่าน้ำและค่าไฟ:</span> <span>฿{(activeModalApp.expenseBreakdown?.utilities || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>5. ค่าเช่าบ้าน:</span> <span>฿{(activeModalApp.expenseBreakdown?.rent || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>6. ชำระหนี้สิน:</span> <span>฿{(activeModalApp.expenseBreakdown?.debtPayment || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>7. รายการอื่น:</span> <span>฿{(activeModalApp.expenseBreakdown?.otherExpense || 0).toLocaleString()}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ส่วน F: สมาชิกครอบครัว */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-700" />
                         สมาชิกในครัวเรือน ({activeModalApp.householdMembers?.length || 0} คน)
                      </span>
                      <span className="text-xs text-slate-400">ตรวจสอบภาระการพึ่งพิง</span>
                    </div>

                    {activeModalApp.householdMembers && activeModalApp.householdMembers.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 text-[10px] text-slate-600 uppercase">
                            <tr>
                              <th className="py-2 px-3">ชื่อ–นามสกุล</th>
                              <th className="py-2 px-3">ความสัมพันธ์</th>
                              <th className="py-2 px-3">อายุ</th>
                              <th className="py-2 px-3">การศึกษา</th>
                              <th className="py-2 px-3">อาชีพ</th>
                              <th className="py-2 px-3">รายได้</th>
                              <th className="py-2 px-3">สุขภาพ/หมายเหตุ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activeModalApp.householdMembers.map((m) => (
                              <tr key={m.id}>
                                <td className="py-2 px-3 font-semibold text-slate-800">{m.fullName}</td>
                                <td className="py-2 px-3 text-slate-600">{m.relation}</td>
                                <td className="py-2 px-3 text-slate-600">{m.age} ปี</td>
                                <td className="py-2 px-3 text-slate-600">{m.educationStatus || '-'}</td>
                                <td className="py-2 px-3 text-slate-600">{m.occupation}</td>
                                <td className="py-2 px-3 font-semibold text-slate-800">฿{m.monthlyIncome.toLocaleString()}</td>
                                <td className="py-2 px-3">
                                  {m.healthStatus === 'chronically_ill' ? (
                                    <span className="text-rose-700 font-medium">ป่วยเรื้อรัง ({m.healthNotes})</span>
                                  ) : m.healthStatus === 'disabled' ? (
                                    <span className="text-purple-700 font-medium">พิการ ({m.healthNotes})</span>
                                  ) : (
                                    <span className="text-emerald-700">ปกติ</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic text-center py-2">ไม่มีสมาชิกอื่นในครัวเรือน (อาศัยอยู่คนเดียว)</div>
                    )}
                  </div>

                  {/* ส่วน G & H: สภาพครอบครัวโดยละเอียด และ ผู้ประสานงาน/รับรอง */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ส่วน G */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                         สภาพครอบครัวโดยละเอียด & ความจำเป็นเร่งด่วน
                      </div>
                      <div className="space-y-2 text-slate-700 pt-1">
                        <div>
                          <span className="text-slate-400 block text-[10px]">สถานการณ์ครอบครัว:</span>
                          <p className="text-slate-800">{activeModalApp.familySituationSummary || 'ครอบครัวมีฐานะยากจน รายได้ไม่แน่นอน'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">ความจำเป็นเร่งด่วน:</span>
                          <p className="text-rose-700 font-medium">{activeModalApp.urgentNeeds || 'ต้องการเงินช่วยเหลือค่าครองชีพและยารักษาโรค'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">ภาระการดูแลเด็ก/ผู้สูงอายุ/ผู้ป่วย:</span>
                          <p className="text-slate-800">{activeModalApp.dependentBurdens || 'ไม่มี'}</p>
                        </div>
                      </div>
                    </div>

                    {/* ส่วน H */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                        <span> ผู้ประสานงานและผู้รับรอง</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div className="space-y-2 pt-1 text-slate-700">
                        {activeModalApp.coordinator && (
                          <div>
                            <span className="text-slate-400 block text-[10px]">ผู้ประสานงาน:</span>
                            <span className="font-semibold text-slate-900">{activeModalApp.coordinator.fullName}</span>
                            <span className="text-slate-500 block text-[11px]">โทร: {activeModalApp.coordinator.phone} ({activeModalApp.coordinator.occupation})</span>
                          </div>
                        )}
                        {activeModalApp.certifier ? (
                          <div className="pt-2 border-t border-slate-200">
                            <span className="text-slate-400 block text-[10px]">ผู้รับรองความประพฤติ & ความเดือดร้อน:</span>
                            <span className="font-semibold text-emerald-900">{activeModalApp.certifier.fullName}</span>
                            <span className="text-slate-600 block text-[11px]">
                              ตำแหน่ง: {activeModalApp.certifier.roleTitle} ({activeModalApp.certifier.organization})
                            </span>
                            <span className="text-slate-500 block text-[11px]">โทร: {activeModalApp.certifier.phone}</span>
                            {activeModalApp.certifier.comments && (
                              <p className="text-xs text-slate-700 mt-1 italic bg-white p-2 rounded-lg border border-slate-200">
                                &ldquo;{activeModalApp.certifier.comments}&rdquo;
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-400 italic">ไม่มีข้อมูลผู้รับรองในเอกสาร</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: EVALUATOR CHECKLIST */}
              {modalTab === 'checklist' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900">
                    <div className="font-bold flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      ข้อสำคัญเกี่ยวกับหลักเกณฑ์การพิจารณา (Checklist)
                    </div>
                    <p className="text-xs mt-1 text-amber-800">
                      Checklist เป็นข้อมูลประกอบการพิจารณา ไม่ใช่ระบบตัดสินสิทธิ์อัตโนมัติ ต้องให้เจ้าหน้าที่และคณะกรรมการใช้ดุลยพินิจตามระเบียบมูลนิธิ และไม่ถือว่าการขาดข้อมูลเป็นการไม่ผ่านโดยอัตโนมัติ
                    </p>
                  </div>

                  {checklistState && (
                    <div className="space-y-3">
                      {/* Item 1 */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setChecklistState({ ...checklistState, amalIbadah: !checklistState.amalIbadah })}
                          className="mt-0.5 text-emerald-700"
                        >
                          {checklistState.amalIbadah ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <div className="flex-1 space-y-1">
                          <label className="font-bold text-slate-900 cursor-pointer" onClick={() => setChecklistState({ ...checklistState, amalIbadah: !checklistState.amalIbadah })}>
                            1. การประกอบอามั้ลและอิบาดะฮ์ในกรณีที่เป็นมุสลิม
                          </label>
                          <input
                            type="text"
                            value={checklistState.amalIbadahNotes || ''}
                            onChange={(e) => setChecklistState({ ...checklistState, amalIbadahNotes: e.target.value })}
                            placeholder="ระบุข้อสังเกต เช่น ละหมาดสม่ำเสมอในชุมชนมัสยิด..."
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Item 2 */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setChecklistState({ ...checklistState, landRights: !checklistState.landRights })}
                          className="mt-0.5 text-emerald-700"
                        >
                          {checklistState.landRights ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <div className="flex-1 space-y-1">
                          <label className="font-bold text-slate-900 cursor-pointer" onClick={() => setChecklistState({ ...checklistState, landRights: !checklistState.landRights })}>
                            2. เอกสารสิทธิ์หรือการอนุญาตใช้ที่ดิน (เมื่อเกี่ยวข้องกับการซ่อม/สร้างบ้าน)
                          </label>
                          <input
                            type="text"
                            value={checklistState.landRightsNotes || ''}
                            onChange={(e) => setChecklistState({ ...checklistState, landRightsNotes: e.target.value })}
                            placeholder="ระบุรายละเอียด เช่น โฉนดที่ดินของตนเอง หรือมีหนังสืออนุญาตจากเจ้าของที่ดิน..."
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Item 3 */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setChecklistState({ ...checklistState, housingCondition: !checklistState.housingCondition })}
                          className="mt-0.5 text-emerald-700"
                        >
                          {checklistState.housingCondition ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <div className="flex-1 space-y-1">
                          <label className="font-bold text-slate-900 cursor-pointer" onClick={() => setChecklistState({ ...checklistState, housingCondition: !checklistState.housingCondition })}>
                            3. สภาพที่อยู่อาศัย (เมื่อเกี่ยวข้องกับคำร้องซ่อม/สร้างบ้าน)
                          </label>
                          <input
                            type="text"
                            value={checklistState.housingConditionNotes || ''}
                            onChange={(e) => setChecklistState({ ...checklistState, housingConditionNotes: e.target.value })}
                            placeholder="สภาพชำรุดทรุดโทรม หลังคารั่ว ห้องน้ำชำรุด หรือไม่มีสุขอนามัย..."
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Item 4 */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setChecklistState({ ...checklistState, economicStatus: !checklistState.economicStatus })}
                          className="mt-0.5 text-emerald-700"
                        >
                          {checklistState.economicStatus ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <div className="flex-1 space-y-1">
                          <label className="font-bold text-slate-900 cursor-pointer" onClick={() => setChecklistState({ ...checklistState, economicStatus: !checklistState.economicStatus })}>
                            4. ฐานะทางเศรษฐกิจและหนี้สิน
                          </label>
                          <input
                            type="text"
                            value={checklistState.economicStatusNotes || ''}
                            onChange={(e) => setChecklistState({ ...checklistState, economicStatusNotes: e.target.value })}
                            placeholder="รายได้ต่ำกว่าเกณฑ์ความยากจน หรือมีภาระหนี้สินจำเป็นที่ไม่สามารถชำระได้..."
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Item 5 */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setChecklistState({ ...checklistState, communityParticipation: !checklistState.communityParticipation })}
                          className="mt-0.5 text-emerald-700"
                        >
                          {checklistState.communityParticipation ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <div className="flex-1 space-y-1">
                          <label className="font-bold text-slate-900 cursor-pointer" onClick={() => setChecklistState({ ...checklistState, communityParticipation: !checklistState.communityParticipation })}>
                            5. การมีส่วนร่วมของชุมชน (เมื่อเกี่ยวข้องกับโครงการ)
                          </label>
                          <input
                            type="text"
                            value={checklistState.communityParticipationNotes || ''}
                            onChange={(e) => setChecklistState({ ...checklistState, communityParticipationNotes: e.target.value })}
                            placeholder="การร่วมกิจกรรมพัฒนาหมู่บ้าน หรือมีจิตอาสาช่วยเหลือส่วนรวม..."
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Item 6 */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setChecklistState({ ...checklistState, leaderEndorsement: !checklistState.leaderEndorsement })}
                          className="mt-0.5 text-emerald-700"
                        >
                          {checklistState.leaderEndorsement ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <div className="flex-1 space-y-1">
                          <label className="font-bold text-slate-900 cursor-pointer" onClick={() => setChecklistState({ ...checklistState, leaderEndorsement: !checklistState.leaderEndorsement })}>
                            6. การรับรองจากผู้นำท้องถิ่น (อิหม่าม, ผู้ใหญ่บ้าน หรือผู้นำชุมชน)
                          </label>
                          <input
                            type="text"
                            value={checklistState.leaderEndorsementNotes || ''}
                            onChange={(e) => setChecklistState({ ...checklistState, leaderEndorsementNotes: e.target.value })}
                            placeholder="มีหนังสือรับรอง หรือการยืนยันข้อเท็จจริงจากผู้นำชุมชน..."
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Item 7 */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setChecklistState({ ...checklistState, asnafVulnerability: !checklistState.asnafVulnerability })}
                          className="mt-0.5 text-emerald-700"
                        >
                          {checklistState.asnafVulnerability ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <div className="flex-1 space-y-1">
                          <label className="font-bold text-slate-900 cursor-pointer" onClick={() => setChecklistState({ ...checklistState, asnafVulnerability: !checklistState.asnafVulnerability })}>
                            7. การเป็นผู้ด้อยโอกาสตามหลักเกณฑ์ 8 อัสนาฟ
                          </label>
                          <input
                            type="text"
                            value={checklistState.asnafVulnerabilityNotes || ''}
                            onChange={(e) => setChecklistState({ ...checklistState, asnafVulnerabilityNotes: e.target.value })}
                            placeholder="คุณสมบัติตรงตามหมวดซะกาต ฟะกีร มิสเกน ฆอริมูน ฯลฯ..."
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Item 8 */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setChecklistState({ ...checklistState, dependentBurdens: !checklistState.dependentBurdens })}
                          className="mt-0.5 text-emerald-700"
                        >
                          {checklistState.dependentBurdens ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <div className="flex-1 space-y-1">
                          <label className="font-bold text-slate-900 cursor-pointer" onClick={() => setChecklistState({ ...checklistState, dependentBurdens: !checklistState.dependentBurdens })}>
                            8. สมาชิกครอบครัวที่พิการ สูงอายุ เจ็บป่วยเรื้อรัง หรือมีบุตรวัยเรียน
                          </label>
                          <input
                            type="text"
                            value={checklistState.dependentBurdensNotes || ''}
                            onChange={(e) => setChecklistState({ ...checklistState, dependentBurdensNotes: e.target.value })}
                            placeholder="ภาระการเลี้ยงดูเด็กกำพร้า ผู้ป่วยติดเตียง หรือผู้สูงอายุ..."
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Committee Remarks */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                        <label className="font-bold text-slate-900">
                          9. ข้อสังเกตและดุลยพินิจเพิ่มเติมของคณะกรรมการ / เจ้าหน้าที่
                        </label>
                        <textarea
                          rows={2}
                          value={checklistState.committeeNotes || ''}
                          onChange={(e) => setChecklistState({ ...checklistState, committeeNotes: e.target.value })}
                          placeholder="บันทึกความเห็นชอบ หรือข้อเสนอแนะเพิ่มเติมสำหรับคณะกรรมการอนุมัติ..."
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>

                      {/* Save Checklist Button */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleSaveChecklist}
                          disabled={isSavingChecklist}
                          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs"
                        >
                          <Save className="w-4 h-4" />
                          {isSavingChecklist ? 'กำลังบันทึก...' : 'บันทึกผลการตรวจสอบ Checklist'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DOCUMENTS (Section I) */}
              {modalTab === 'documents' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">เอกสารแนบและหลักฐานประกอบคำร้อง</h3>
                      <p className="text-xs text-slate-500">จัดเก็บอย่างปลอดภัยตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA) • เปิดดูและดาวน์โหลดได้ตามสิทธิ์</p>
                    </div>
                  </div>

                  <DocumentListTable
                    documents={activeModalApp.documents || []}
                    readOnly={currentUser?.role !== 'super_admin' && currentUser?.role !== 'officer'}
                  />

                  <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs">
                    <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" /> นโยบายความเป็นส่วนตัวและสิทธิ์การเข้าถึง
                    </div>
                    เอกสารประกอบคำร้องนี้เข้าถึงได้เฉพาะเจ้าหน้าที่ผู้รับผิดชอบ คณะกรรมการพิจารณาซะกาต และผู้ตรวจสอบภายในมูลนิธิฯ เท่านั้น ไม่เปิดเผยสู่สาธารณะ
                  </div>
                </div>
              )}

              {/* TAB 4: AUDIT TIMELINE & FINANCIAL LEDGER */}
              {modalTab === 'history' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Status Timeline */}
                  <div className="space-y-3">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
                      <Clock className="w-4 h-4 text-slate-600" /> ประวัติการเปลี่ยนสถานะคำร้อง (Workflow History)
                    </div>

                    <div className="relative pl-6 space-y-4 border-l-2 border-emerald-500 ml-3">
                      {activeModalApp.statusHistory?.map((h, idx) => (
                        <div key={idx} className="relative">
                          <div className="w-3 h-3 rounded-full bg-emerald-600 absolute -left-[31px] top-1 ring-4 ring-white" />
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{h.status}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{h.timestamp}</span>
                            <span className="text-[11px] font-semibold text-emerald-800">โดย {h.changedBy}</span>
                          </div>
                          <div className="text-slate-600 text-xs mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                            {h.notes}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Ledger Disbursements */}
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" /> รายการเบิกจ่ายจากระบบบัญชีกองทุนจริง (Financial Ledger)
                    </div>

                    {activeModalApp.disbursedAmount ? (
                      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-teal-900">บันทึกการโอนเงินสวัสดิการสำเร็จ</span>
                          <span className="text-base font-extrabold text-teal-800">฿{activeModalApp.disbursedAmount.toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-teal-800 text-xs">
                          <div><span className="text-teal-600">วันที่โอนจ่าย:</span> {activeModalApp.disbursementDate || '-'}</div>
                          <div><span className="text-teal-600">ผู้ทำรายการ:</span> {activeModalApp.disbursedBy || 'ฝ่ายการเงิน'}</div>
                          <div className="col-span-2 font-mono"><span className="text-teal-600">เลขอ้างอิงธนาคาร:</span> {activeModalApp.disbursementRef || '-'}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50 text-slate-400 text-center italic">
                        ยังไม่มีรายการเบิกจ่ายเงินสวัสดิการสำหรับคำร้องนี้
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Workflow Action Bar */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                สถานะปัจจุบัน: {getStatusBadge(activeModalApp.status)}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* 1. If draft -> Submit */}
                {activeModalApp.status === 'draft' && (
                  <button
                    onClick={() => handleTransition('submitted', 'ยื่นคำร้องเข้าสู่ระบบ')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                  >
                    ยื่นคำร้องเข้าสู่ระบบ →
                  </button>
                )}

                {/* 2. If submitted -> Send to Doc Review */}
                {activeModalApp.status === 'submitted' && (
                  <button
                    onClick={() => handleTransition('doc_review', 'ส่งต่อฝ่ายตรวจสอบเอกสาร')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-700 text-white hover:bg-indigo-800 transition-colors"
                  >
                    ส่งตรวจสอบเอกสาร →
                  </button>
                )}

                {/* 3. If doc_review -> Send to Field Inspection */}
                {activeModalApp.status === 'doc_review' && (
                  <button
                    onClick={() => handleTransition('field_inspection', 'เอกสารครบถ้วน ส่งต่อลงพื้นที่สำรวจสภาพจริง')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-700 text-white hover:bg-amber-800 transition-colors"
                  >
                    ส่งต่อลงพื้นที่สำรวจสภาพจริง →
                  </button>
                )}

                {/* 4. If field_inspection -> Submit for Approval */}
                {(activeModalApp.status === 'field_inspection' || activeModalApp.status === 'assessment') && (
                  <button
                    onClick={() => handleTransition('pending_approval', 'สำรวจลงพื้นที่เรียบร้อย ส่งเสนอคณะกรรมการพิจารณาอนุมัติ')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-700 text-white hover:bg-purple-800 transition-colors"
                  >
                    ส่งเสนอคณะกรรมการพิจารณา →
                  </button>
                )}

                {/* 5. If pending_approval -> Approve / Reject buttons */}
                {activeModalApp.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => setShowRejectionDialog(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 transition-colors"
                    >
                      ไม่อนุมัติคำร้อง...
                    </button>
                    <button
                      onClick={() => setShowApprovalDialog(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs"
                    >
                      พิจารณาอนุมัติวงเงิน...
                    </button>
                  </>
                )}

                {/* 6. If approved / wait_disbursement -> Disburse */}
                {(activeModalApp.status === 'approved' || activeModalApp.status === 'wait_disbursement') && (
                  <button
                    onClick={() => setShowDisburseDialog(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-xs"
                  >
                    ดำเนินการจ่ายเงินสวัสดิการ...
                  </button>
                )}

                {/* 7. If disbursed -> Close application */}
                {activeModalApp.status === 'disbursed' && (
                  <button
                    onClick={() => handleTransition('closed', 'ดำเนินการช่วยเหลือครบถ้วน ปิดคำร้องสมบูรณ์')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 transition-colors"
                  >
                    ปิดคำร้องสมบูรณ์ ✓
                  </button>
                )}

                <button
                  onClick={() => setActiveModalApp(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* APPROVAL DIALOG MODAL */}
      {showApprovalDialog && activeModalApp && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowApprovalDialog(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
            <h3 className="font-bold text-slate-900 text-base">พิจารณาอนุมัติคำร้องขอรับซะกาต</h3>
            <p className="text-xs text-slate-500">
              ผู้ขอรับ: {formatPersonName(activeModalApp)} (ขอรับ ฿{activeModalApp.requestedAmount.toLocaleString()} บาท)
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">วงเงินที่อนุมัติ (บาท):</label>
                <input
                  type="number"
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ตัดจ่ายจากบัญชีกองทุน:</label>
                <select
                  value={selectedFundId}
                  onChange={(e) => setSelectedFundId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {funds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (คงเหลือจัดสรรได้: ฿{f.availableAmount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">มติ / บันทึกคณะกรรมการ:</label>
                <textarea
                  rows={2}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="ระบุเหตุผลในการอนุมัติวงเงิน..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowApprovalDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await approveApplication(
                    activeModalApp.id,
                    approvalAmount,
                    selectedFundId,
                    approvalNotes || 'อนุมัติวงเงินช่วยเหลือตามเกณฑ์'
                  );
                  if (ok) {
                    setShowApprovalDialog(false);
                    setActiveModalApp({
                      ...activeModalApp,
                      status: 'approved',
                      approvedAmount: approvalAmount
                    });
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800"
              >
                ยืนยันอนุมัติคำร้อง
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* REJECTION DIALOG MODAL */}
      {showRejectionDialog && activeModalApp && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowRejectionDialog(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
            <h3 className="font-bold text-rose-900 text-base">ระบุเหตุผลการไม่อนุมัติคำร้อง</h3>
            <p className="text-xs text-slate-500">
              บันทึกเหตุผลตามระเบียบมูลนิธิเพื่อความโปร่งใสและแจ้งแก่ผู้ยื่นคำร้อง
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">เหตุผลในการไม่อนุมัติ:</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="เช่น รายได้ครอบครัวเกินเกณฑ์ที่กำหนด, ไม่ตรงตามคุณสมบัติ 8 อัสนาฟ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectionDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!rejectionReason.trim()) {
                    showToast('กรุณาระบุเหตุผลการไม่อนุมัติ', 'error');
                    return;
                  }
                  const ok = await rejectApplication(activeModalApp.id, rejectionReason);
                  if (ok) {
                    setShowRejectionDialog(false);
                    setActiveModalApp({
                      ...activeModalApp,
                      status: 'rejected',
                      rejectionReason: rejectionReason
                    });
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-700 text-white hover:bg-rose-800"
              >
                ยืนยันการไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* DISBURSEMENT DIALOG MODAL */}
      {showDisburseDialog && activeModalApp && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDisburseDialog(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
            <h3 className="font-bold text-teal-900 text-base">บันทึกการโอนจ่ายเงินสวัสดิการ</h3>
            <p className="text-xs text-slate-500">
              ยอดเงินที่ได้รับอนุมัติ: ฿{(activeModalApp.approvedAmount || activeModalApp.requestedAmount).toLocaleString()} บาท
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">หมายเลขอ้างอิงการโอนเงิน (Reference No.):</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="เช่น KTB-TR-2569-88123"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">หมายเหตุการจ่ายเงิน:</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="เช่น โอนเข้าบัญชีผู้ขอรับซะกาตเรียบร้อย"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDisburseDialog(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!paymentRef.trim()) {
                    showToast('กรุณาระบุหมายเลขอ้างอิงการโอนเงิน', 'error');
                    return;
                  }
                  const amount = activeModalApp.approvedAmount || activeModalApp.requestedAmount;
                  const ok = await executeDisbursement(
                    activeModalApp.id,
                    amount,
                    paymentRef,
                    '/slips/default-slip.jpg',
                    paymentNotes || 'จ่ายเงินช่วยเหลือผู้รับซะกาตเรียบร้อย'
                  );
                  if (ok) {
                    setShowDisburseDialog(false);
                    setActiveModalApp({
                      ...activeModalApp,
                      status: 'disbursed',
                      disbursedAmount: amount,
                      disbursementRef: paymentRef
                    });
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800"
              >
                บันทึกการจ่ายเงิน
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}
    </div>
  );
}
