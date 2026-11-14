'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formatPersonName, getRegistryStatusLabelTh, splitPersonName } from '@zms/shared';
import { breakdownsEqual, diffRegistryFields, registryNeedsReReview, sumFilled, valuesEqual, INCOME_LINE_KEYS, EXPENSE_LINE_KEYS } from '@/lib/registrySurvey';
import { useApp } from '@/context/AppContext';
import { 
  BeneficiaryRegistryItem, 
  RegistrationStatus, 
  AsnafCategory,
  EvaluatorChecklist,
  HouseholdMember,
  PastAssistanceRecord,
  RegistryEditHistoryItem,
  AssistanceApplication,
  BeneficiaryPeriodicAssessment,
} from '@/types';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye,
  EyeOff,
  FileCheck2, 
  CheckCircle, 
  Printer, 
  Download, 
  MapPin, 
  Phone, 
  Calendar, 
  X,
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
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  Edit,
  Save,
  Check,
  HelpCircle,
  Briefcase,
  History,
  FilePlus2,
  RefreshCw,
  Navigation,
  Compass,
  ExternalLink,
  Trash2,
  UploadCloud,
  FileUp,
  ArrowLeft,
  Receipt,
  Package,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  HeartHandshake,
  List,
  LayoutGrid,
  MoreHorizontal,
} from 'lucide-react';
import { DocumentListTable } from '@/components/common/DocumentListTable';
import { GoogleMapsLocationPicker, LocationData } from '@/components/common/GoogleMapsLocationPicker';
import { RegistryEditHistoryModal } from '@/components/common/RegistryEditHistoryModal';
import { DocumentUploader, UploadedDocumentItem } from '@/components/common/DocumentUploader';
import { PersonalSection, PersonalSubTab } from '@/components/views/registry/PersonalSection';
import { LocationSection, LOCATION_VERIFICATION_LABELS } from '@/components/views/registry/LocationSection';
import { CoordinatorSection } from '@/components/views/registry/CoordinatorSection';
import { DocumentsSection } from '@/components/views/registry/DocumentsSection';
import { AssistanceHistorySection } from '@/components/views/registry/AssistanceHistorySection';
import { StatusSection } from '@/components/views/registry/StatusSection';
import { ReceiptPreviewModal } from '@/components/views/registry/ReceiptPreviewModal';
import { ModalPortal, lockBodyScroll, unlockBodyScroll, ConfirmModal } from '@/components/common/Modal';
import { SoftDeleteModal } from '@/components/views/registry/SoftDeleteModal';
import { RestoreModal } from '@/components/views/registry/RestoreModal';
import { BeneficiaryAuditModal } from '@/components/views/registry/BeneficiaryAuditModal';
import { DeletedBeneficiariesTable } from '@/components/views/registry/DeletedBeneficiariesTable';
import { PeriodicAssessmentModal } from '@/components/views/registry/PeriodicAssessmentModal';
import { AssessmentHistorySection, getAssessmentStatusMeta } from '@/components/views/registry/AssessmentHistorySection';
import { MemberRequestsSection } from '@/components/views/registry/MemberRequestsSection';
import { AssistanceRequestWizardModal } from '@/components/views/assistance/AssistanceRequestWizardModal';
import { BeneficiaryRegistryCards, registryAssessmentMeta, resolveRequestStats } from '@/components/views/registry/BeneficiaryRegistryCards';
import { BeneficiaryIntegratedProfile, PROFILE_SECTION_ANCHOR } from '@/components/views/registry/BeneficiaryIntegratedProfile';
import { useCardViewSettings } from '@/hooks/useCardViewSettings';
import { resolveCardPageSize } from '@/lib/cardViewSettings';

export type RegistryMainSection =
  | 'member_info'        // 1. ข้อมูลสมาชิก
  | 'family'             // 2. ข้อมูลครอบครัว
  | 'economy'            // 3. รายได้ รายจ่าย และหนี้สิน
  | 'limitations'        // 4. สภาพปัจจุบันและข้อจำกัด
  | 'documents'          // 5. เอกสารแนบ
  | 'assessments'        // 6. ประวัติการประเมินสิทธิ์
  | 'requests'           // 7. ประวัติคำร้อง
  | 'aid_history'        // 8. ประวัติการช่วยเหลือ
  | 'personal'
  | 'location'
  | 'coordinator'
  | 'assistance_history'
  | 'status';

const MEMBER_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'สมาชิกปกติ', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  PENDING_VERIFICATION: { label: 'รอตรวจสอบสมาชิก', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  SUSPENDED: { label: 'ระงับสถานะสมาชิก', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
  ARCHIVED: { label: 'ปิดประวัติถาวร', cls: 'bg-slate-200 text-slate-700 border-slate-300' },
};

function MemberStatusBadge({ status }: { status?: string | null }) {
  const meta = MEMBER_STATUS_LABELS[String(status || 'ACTIVE').toUpperCase()] || MEMBER_STATUS_LABELS.ACTIVE;
  return (
    <span className={`inline-flex max-w-[48%] shrink-0 items-center truncate rounded-full border px-2.5 py-0.5 text-[12px] font-bold leading-5 sm:text-[13px] ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function closeActionMenu(target: HTMLElement) {
  target.closest('details')?.removeAttribute('open');
}

function getDisplayMemberCode(reg?: Partial<BeneficiaryRegistryItem> | null): string {
  if (!reg) return '-';
  const candidates = [reg.memberCode, reg.memberId, reg.registrationNo, (reg as any).registryNumber];
  const mb = candidates.find((c) => typeof c === 'string' && c.startsWith('MB-'));
  if (mb) return mb;
  return candidates.find((c) => typeof c === 'string' && c.trim().length > 0) || '-';
}

interface BeneficiaryRegistryViewProps {
  onNavigate: (view: string) => void;
  initialStatusFilter?: string;
  initialMemberId?: string;
  onClearInitialMember?: () => void;
  onSelectBeneficiaryForAssistance?: (beneficiary: BeneficiaryRegistryItem) => void;
  onStartAssistanceRequest?: (beneficiaryId: string) => void;
  onOpenAssistanceRequestDetail?: (requestId: string) => void;
  initialMainSection?: RegistryMainSection;
  initialStartEdit?: boolean;
}

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'ร่าง', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-300' },
  under_review: { label: 'ตรวจสอบข้อมูล', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  qualified: { label: 'มีคุณสมบัติตามเกณฑ์', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  not_qualified: { label: 'ไม่มีคุณสมบัติตามเกณฑ์', color: 'text-rose-800', bg: 'bg-rose-50', border: 'border-rose-200' },
};

const ALLOWED_NEXT_REGISTRATION_STATUSES: Record<RegistrationStatus, RegistrationStatus[]> = {
  draft: ['under_review'],
  under_review: ['qualified', 'not_qualified', 'draft'],
  qualified: ['under_review'],
  not_qualified: ['under_review'],
};

const ASNAF_LABELS: Record<string, string> = {
  faqir: 'ฟะกีร (ผู้ยากจนข้นแค้น)',
  miskin: 'มิสกีน (ผู้มีรายได้ไม่พอใช้)',
  amil: 'อามิล (เจ้าหน้าที่ซะกาต)',
  muallaf: 'มุอัลลัฟ (ผู้มีใจผูกพัน)',
  riqab: 'ริกอบ (ปลดปล่อยทาส/ไถ่ตัว)',
  gharimin: 'ฆอริมีน (ผู้มีหนี้สินล้นพ้น)',
  fisabilillah: 'ฟีสะบีลิลลาฮ์ (หนทางของอัลลอฮ์)',
  ibnsabil: 'อิบนุสสะบีล (คนเดินทางขาดแคลน)',
};

export function BeneficiaryRegistryView({ 
  onNavigate, 
  initialStatusFilter = 'all',
  initialMemberId,
  onClearInitialMember,
  onSelectBeneficiaryForAssistance,
  onStartAssistanceRequest,
  onOpenAssistanceRequestDetail,
  initialMainSection,
  initialStartEdit
}: BeneficiaryRegistryViewProps) {
  const { 
    registries, 
    applications,
    dashboardStats,
    currentUser, 
    updateRegistryStatus, 
    updateRegistryChecklist,
    updateBeneficiaryRegistry,
    getRegistryEditHistory,
    createAssistanceRequest,
    showToast, 
    refreshData,
    isLoading,
    authToken,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [asnafFilter, setAsnafFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [assessmentPeriodFilter, setAssessmentPeriodFilter] = useState<string>('all');
  const [periodStatsOverride, setPeriodStatsOverride] = useState<any | null>(null);
  const [orgBranches, setOrgBranches] = useState<{ id: string; code: string; name: string; status: string }[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [displayMode, setDisplayMode] = useState<'table' | 'card'>('table');
  const [sortMode, setSortMode] = useState<'registered_desc' | 'registered_asc' | 'name_asc' | 'code_asc' | 'assessment_desc'>('registered_desc');
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>('all');
  const [assessmentResultFilter, setAssessmentResultFilter] = useState<string>('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('all');
  const { layout: cardLayout } = useCardViewSettings('registry');
  const [registryViewMode, setRegistryViewMode] = useState<'active' | 'deleted'>('active');
  const [softDeleteTarget, setSoftDeleteTarget] = useState<{ id: string; registryNumber: string; fullName: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; registryNumber: string; fullName: string } | null>(null);
  const [auditTarget, setAuditTarget] = useState<{ id: string; registryNumber: string; fullName: string } | null>(null);
  const [deletedRefreshTrigger, setDeletedRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    const saved = window.localStorage.getItem('zms_registry_view_mode');
    if (saved === 'card' || saved === 'table') setDisplayMode(saved);
  }, []);

  useEffect(() => {
    fetch('/api/organization/structure')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.branches) {
          setOrgBranches(json.data.branches);
        }
      })
      .catch((err) => console.error('Failed to load branches for registry filter:', err));
  }, []);

  // Load period-specific separated dashboard metrics when assessmentPeriodFilter is selected
  useEffect(() => {
    if (assessmentPeriodFilter === 'all') {
      setPeriodStatsOverride(null);
      return;
    }
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
    const headers: Record<string, string> = {};
    if (token && token !== 'cookie-session') headers['Authorization'] = `Bearer ${token}`;
    fetch(`/api/dashboard/stats?period=${encodeURIComponent(assessmentPeriodFilter)}`, {
      headers,
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setPeriodStatsOverride(json.data);
        }
      })
      .catch(() => setPeriodStatsOverride(null));
  }, [assessmentPeriodFilter, authToken]);

  // 8 Main Sections state (Master Requirement Section 8)
  const [selectedRegistry, setSelectedRegistry] = useState<BeneficiaryRegistryItem | null>(null);
  const [activeMainSection, setActiveMainSection] = useState<RegistryMainSection>('member_info');
  const [profileFocus, setProfileFocus] = useState<{ id: string; nonce: number } | null>(null);
  const focusProfile = (section: string) => {
    const id = PROFILE_SECTION_ANCHOR[section] || PROFILE_SECTION_ANCHOR.member_info;
    setProfileFocus({ id, nonce: Date.now() });
  };
  const [activePersonalSubSection, setActivePersonalSubSection] = useState<PersonalSubTab>('info');
  const [memberInfoSubTab, setMemberInfoSubTab] = useState<'info' | 'location' | 'coordinator' | 'status'>('info');
  const [limitationsSubTab, setLimitationsSubTab] = useState<'limitations' | 'other_aid'>('limitations');
  const [selectedAidForReceipt, setSelectedAidForReceipt] = useState<AssistanceApplication | null>(null);
  const [isSavingLocationDirectly, setIsSavingLocationDirectly] = useState<boolean>(false);

  // Periodic Assessment state
  const [memberAssessments, setMemberAssessments] = useState<BeneficiaryPeriodicAssessment[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState<boolean>(false);
  const [isPeriodicAssessmentModalOpen, setIsPeriodicAssessmentModalOpen] = useState<boolean>(false);
  const [selectedAssessmentIdForRequest, setSelectedAssessmentIdForRequest] = useState<string>('');
  
  // Edit mode state for individual registry
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<any>({});

  // Edit History Modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<RegistryEditHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyTarget, setHistoryTarget] = useState<{ name: string; regNo: string }>({ name: '', regNo: '' });

  // Status transition dialog state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<RegistrationStatus>('under_review');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  // 3-Step Assistance Request Wizard Modal state (Overlay directly over Beneficiary Registry)
  const [isAssistanceWizardOpen, setIsAssistanceWizardOpen] = useState<boolean>(false);
  const [activeAssistanceBeneficiaryId, setActiveAssistanceBeneficiaryId] = useState<string | null>(null);

  const handleStartAssistanceRequest = (beneficiaryId: string) => {
    const target =
      registries.find((r) => r.id === beneficiaryId) ||
      (selectedRegistry?.id === beneficiaryId ? selectedRegistry : null);
    if (target && target.registrationStatus !== 'qualified') {
      showToast(
        `ไม่สามารถยื่นคำร้องได้ เนื่องจากสมาชิกอยู่ในสถานะ "${getRegistryStatusLabelTh(target.registrationStatus)}" (ต้องมีสถานะ "มีคุณสมบัติตามเกณฑ์" เท่านั้น)`,
        'error',
      );
      return;
    }
    setActiveAssistanceBeneficiaryId(beneficiaryId);
    setIsAssistanceWizardOpen(true);
  };

  // Checklist editing state
  const [checklist, setChecklist] = useState<EvaluatorChecklist | null>(null);
  const [isSavingChecklist, setIsSavingChecklist] = useState<boolean>(false);

  // In-app unsaved changes confirmation modal state
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState<boolean>(false);
  const [savePreview, setSavePreview] = useState<null | {
    changes: { field: string; fieldLabel: string; oldValue: string; newValue: string; material: boolean }[];
    material: boolean;
    reviewed: boolean;
    syncedForm?: any;
  }>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const editBaseline = useRef<any>(null);
  const profileBodyRef = useRef<HTMLDivElement>(null);
  const [memberHeaderCollapsed, setMemberHeaderCollapsed] = useState(false);
  const [showFullNationalId, setShowFullNationalId] = useState(false);

  useEffect(() => {
    const el = profileBodyRef.current;
    if (!selectedRegistry || !el) {
      setMemberHeaderCollapsed(false);
      return;
    }
    let frame = 0;
    const update = () => {
      const top = el.scrollTop;
      setMemberHeaderCollapsed((prev) => {
        if (!prev && top > 120) return true;
        if (prev && top < 72) return false;
        return prev;
      });
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
    };
  }, [selectedRegistry, isStatusDialogOpen]);

  useEffect(() => {
    setShowFullNationalId(false);
  }, [selectedRegistry?.id]);

  const isAnyModalActive = Boolean(
    selectedRegistry || 
    isStatusDialogOpen || 
        isPeriodicAssessmentModalOpen ||
    isHistoryModalOpen || 
    selectedAidForReceipt || 
    showUnsavedConfirm
  );

  useEffect(() => {
    if (isAnyModalActive) {
      lockBodyScroll();
      return () => {
        unlockBodyScroll();
      };
    }
  }, [isAnyModalActive]);

  const activeStatsSource = periodStatsOverride || dashboardStats;
  const availablePeriods = useMemo(() => {
    const set = new Set<string>(dashboardStats?.availablePeriods || []);
    for (const r of registries) {
      if (r.latestAssessment?.assessmentPeriod) {
        set.add(r.latestAssessment.assessmentPeriod);
      }
    }
    return Array.from(set);
  }, [dashboardStats?.availablePeriods, registries]);

  const summaryMetrics = useMemo(() => {
    return {
      totalMembers:
        activeStatsSource?.totalMembers ??
        activeStatsSource?.separated?.totalMembers ??
        registries.length,
      pendingAssessments:
        activeStatsSource?.pendingAssessments ??
        activeStatsSource?.separated?.pendingAssessments ??
        registries.filter((r) => r.registrationStatus === 'under_review').length,
      eligibleCount:
        activeStatsSource?.eligibleCount ??
        activeStatsSource?.separated?.eligibleCount ??
        registries.filter((r) => r.registrationStatus === 'qualified').length,
      ineligibleCount:
        activeStatsSource?.ineligibleCount ??
        activeStatsSource?.separated?.ineligibleCount ??
        registries.filter((r) => r.registrationStatus === 'not_qualified').length,
      totalAssistanceRequests:
        activeStatsSource?.totalAssistanceRequests ??
        activeStatsSource?.separated?.totalAssistanceRequests ??
        applications.length,
      assistedMembersCount:
        activeStatsSource?.assistedMembersCount ??
        activeStatsSource?.separated?.assistedMembersCount ??
        registries.filter((r) => Number(r.totalAssistanceReceived || 0) > 0).length,
      totalAssessmentRounds:
        activeStatsSource?.totalAssessmentRounds ??
        activeStatsSource?.separated?.totalAssessmentRounds ??
        registries.reduce((sum, r) => sum + Number(r.assessmentCount || (r.latestAssessment ? 1 : 0)), 0),
    };
  }, [activeStatsSource, registries, applications]);

  // Filtered registries
  const filteredRegistries = useMemo(() => {
    return registries.filter((item) => {
      const term = searchTerm.toLowerCase().trim();
      const memberCode = getDisplayMemberCode(item).toLowerCase();
      const matchSearch =
        !term ||
        item.fullName.toLowerCase().includes(term) ||
        memberCode.includes(term) ||
        item.registrationNo.toLowerCase().includes(term) ||
        item.nationalId.includes(term) ||
        item.phone.includes(term) ||
        item.community.toLowerCase().includes(term) ||
        item.district.toLowerCase().includes(term);

      const matchStatus = statusFilter === 'all' || item.registrationStatus === statusFilter;
      const matchAsnaf = asnafFilter === 'all' || item.asnafCategory === asnafFilter;
      const matchBranch = branchFilter === 'all' || item.branchId === branchFilter || item.branchName === branchFilter;
      const matchPeriod =
        assessmentPeriodFilter === 'all' ||
        item.latestAssessment?.assessmentPeriod === assessmentPeriodFilter;
      const matchMemberStatus =
        memberStatusFilter === 'all' ||
        String(item.memberStatus || 'ACTIVE').toUpperCase() === memberStatusFilter;
      const matchAssessment =
        assessmentResultFilter === 'all' ||
        registryAssessmentMeta(item).key === assessmentResultFilter;
      const requestStats = resolveRequestStats(item, applications);
      const matchRequest =
        requestStatusFilter === 'all' ||
        (requestStatusFilter === 'pending' && requestStats.pending > 0) ||
        (requestStatusFilter === 'approved' && requestStats.approved > 0) ||
        (requestStatusFilter === 'assisted' && requestStats.disbursed > 0) ||
        (requestStatusFilter === 'none' && requestStats.total === 0);

      if (currentUser.role === 'member') {
        const isOwner =
          (item.memberId && item.memberId === currentUser.id) ||
          (currentUser.beneficiaryId && item.id === currentUser.beneficiaryId) ||
          (currentUser.nationalId && item.nationalId === currentUser.nationalId);
        if (!isOwner) return false;
      }

      return matchSearch && matchStatus && matchAsnaf && matchBranch && matchPeriod && matchMemberStatus && matchAssessment && matchRequest;
    });
  }, [registries, applications, searchTerm, statusFilter, asnafFilter, branchFilter, assessmentPeriodFilter, memberStatusFilter, assessmentResultFilter, requestStatusFilter, currentUser]);

  const sortedRegistries = useMemo(() => {
    const items = [...filteredRegistries];
    const dateValue = (value?: string) => {
      const time = value ? new Date(value).getTime() : 0;
      return Number.isNaN(time) ? 0 : time;
    };
    items.sort((a, b) => {
      if (sortMode === 'name_asc') return formatPersonName(a).localeCompare(formatPersonName(b), 'th');
      if (sortMode === 'code_asc') return getDisplayMemberCode(a).localeCompare(getDisplayMemberCode(b), 'en');
      if (sortMode === 'assessment_desc') {
        return dateValue(b.latestAssessment?.assessmentDate) - dateValue(a.latestAssessment?.assessmentDate);
      }
      const diff = dateValue(b.registeredDate) - dateValue(a.registeredDate);
      return sortMode === 'registered_asc' ? -diff : diff;
    });
    return items;
  }, [filteredRegistries, sortMode]);

  const listPageSize = displayMode === 'card' ? resolveCardPageSize(cardLayout, sortedRegistries.length) : pageSize;
  const totalItems = sortedRegistries.length;
  const totalPages = Math.ceil(totalItems / listPageSize) || 1;
  const paginatedRegistries = useMemo(() => {
    const start = (currentPage - 1) * listPageSize;
    return sortedRegistries.slice(start, start + listPageSize);
  }, [sortedRegistries, currentPage, listPageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const canEditRegistry = (reg: BeneficiaryRegistryItem | null) => {
    if (!reg) return false;
    if (['super_admin', 'approver', 'officer', 'executive'].includes(currentUser.role)) {
      return true;
    }
    if (currentUser.role === 'member') {
      const isOwner =
        (reg.memberId && reg.memberId === currentUser.id) ||
        (currentUser.beneficiaryId && reg.id === currentUser.beneficiaryId) ||
        (currentUser.nationalId && reg.nationalId === currentUser.nationalId);
      return Boolean(isOwner);
    }
    return false;
  };

  const canPerformAssessment = ['super_admin', 'approver', 'officer', 'executive'].includes(currentUser.role);
  const canApproveAssessment = ['super_admin', 'approver', 'executive'].includes(currentUser.role);

  const loadRegistryDetail = async (id: string): Promise<BeneficiaryRegistryItem | null> => {
    const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
    const headers: Record<string, string> = {};
    if (token && token !== 'cookie-session') headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/registry/${id}`, { headers, credentials: 'include' });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.success && json.data) {
      setSelectedRegistry(json.data);
      return json.data as BeneficiaryRegistryItem;
    }
    return null;
  };

  const loadMemberAssessments = async (id: string): Promise<BeneficiaryPeriodicAssessment[]> => {
    setIsLoadingAssessments(true);
    try {
      const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
      const headers: Record<string, string> = {};
      if (token && token !== 'cookie-session') headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/registry/${id}/assessments`, { headers, credentials: 'include' });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setMemberAssessments(json.data);
        return json.data;
      }
      setMemberAssessments([]);
      return [];
    } catch {
      setMemberAssessments([]);
      return [];
    } finally {
      setIsLoadingAssessments(false);
    }
  };

  const normalizeSectionKey = (sec: RegistryMainSection): RegistryMainSection => {
    if (sec === 'personal') return 'member_info';
    if (sec === 'assistance_history') return 'aid_history';
    if (sec === 'location') {
      setMemberInfoSubTab('location');
      return 'member_info';
    }
    if (sec === 'coordinator') {
      setMemberInfoSubTab('coordinator');
      return 'member_info';
    }
    if (sec === 'status') {
      setMemberInfoSubTab('status');
      return 'member_info';
    }
    return sec;
  };

  // Auto-open Member Detail View when navigated from New Registration or Duplicate Member Alert (Section 4)
  useEffect(() => {
    if (!initialMemberId) return;
    let active = true;
    (async () => {
      const existingInList = registries.find((r) => r.id === initialMemberId);
      if (existingInList && active) {
        setSelectedRegistry(existingInList);
      }
      const targetSec = initialMainSection ? normalizeSectionKey(initialMainSection) : 'member_info';
      setActiveMainSection(targetSec);
      focusProfile(targetSec);
      setMemberInfoSubTab('info');
      setIsEditing(Boolean(initialStartEdit));
      await Promise.all([
        loadRegistryDetail(initialMemberId),
        loadMemberAssessments(initialMemberId),
      ]);
      if (active && onClearInitialMember) {
        onClearInitialMember();
      }
    })();
    return () => {
      active = false;
    };
  }, [initialMemberId, initialMainSection, initialStartEdit]);

  const handleOpenDetails = (
    reg: BeneficiaryRegistryItem, 
    mainSection: RegistryMainSection = 'member_info',
    personalSub: PersonalSubTab = 'info'
  ) => {
    setSelectedRegistry(reg);
    if (mainSection === 'member_info' || mainSection === 'personal') {
      setMemberInfoSubTab('info');
    }
    const normalized = normalizeSectionKey(mainSection);
    setActiveMainSection(normalized);
    focusProfile(mainSection === 'aid_history' ? 'aid_history' : normalized);
    setActivePersonalSubSection(personalSub);
    setIsEditing(false);
    void loadRegistryDetail(reg.id);
    void loadMemberAssessments(reg.id);
    setChecklist(reg.evaluatorChecklist || {
      amalIbadah: true,
      landRights: true,
      housingCondition: true,
      economicStatus: true,
      communityParticipation: true,
      leaderEndorsement: true,
      asnafVulnerability: true,
      dependentBurdens: false,
      committeeNotes: '',
      checkedBy: currentUser.name,
      checkedAt: new Date().toISOString()
    });
  };

  // Start editing registry
  const handleStartEdit = async (
    mainSec: RegistryMainSection = 'member_info',
    personalSub?: PersonalSubTab,
    sourceRegistry?: BeneficiaryRegistryItem,
  ) => {
    const target = sourceRegistry || selectedRegistry;
    if (!target) return;
    if (sourceRegistry) setSelectedRegistry(sourceRegistry);
    if (!canEditRegistry(target)) {
      showToast('ท่านไม่มีสิทธิ์แก้ไขข้อมูลทะเบียนนี้', 'error');
      return;
    }
    const fresh = await loadRegistryDetail(target.id);
    const source = fresh || target;
    const name = splitPersonName(source);
    const initialForm = {
      titlePrefix: name.prefix,
      firstName: name.firstName,
      lastName: name.lastName,
      fullName: formatPersonName(name),
      nationalId: source.nationalId || '',
      phone: source.phone || '',
      email: source.email || '',
      birthDate: source.birthDate || '',
      age: source.age ?? null,
      occupation: source.occupation || '',
      maritalStatus: source.maritalStatus || '',
      asnafCategory: source.asnafCategory || '',
      branchId: source.branchId || '',
      branchName: source.branchName || '',
      address: source.address || '',
      province: source.province || '',
      district: source.district || '',
      subdistrict: source.subdistrict || '',
      community: source.community || '',
      postcode: source.postcode || '',
      housingType: source.housingType || '',
      housingCondition: source.housingCondition || '',
      housingNotes: source.housingNotes || '',
      landTitleType: source.landTitleType || '',
      landTitleNotes: source.landTitleNotes || '',
      monthlyIncome: source.monthlyIncome ?? null,
      monthlyExpense: source.monthlyExpense ?? null,
      debtAmount: source.debtAmount ?? null,
      debtMonthlyPayment: source.debtMonthlyPayment ?? null,
      debtType: source.debtType || '',
      creditorName: source.creditorName || '',
      debtPurpose: source.creditorName || source.debtPurpose || '',
      debtNotes: source.debtNotes || '',
      incomeBreakdown: source.incomeBreakdown ? { ...source.incomeBreakdown } : null,
      expenseBreakdown: source.expenseBreakdown ? { ...source.expenseBreakdown } : null,
      householdMembers: source.householdMembers ? source.householdMembers.map(m => ({ ...m })) : [],
      pastAssistance: source.pastAssistance ? source.pastAssistance.map(a => ({ ...a })) : [],
      hardshipReasons: source.hardshipReasons ? { ...source.hardshipReasons } : {},
      disabilityNotes: source.disabilityNotes || '',
      illnessNotes: source.illnessNotes || '',
      livingLimitations: source.livingLimitations || '',
      familySituationSummary: source.familySituationSummary || '',
      urgentNeeds: source.urgentNeeds || '',
      dependentBurdens: source.dependentBurdens || '',
      coordinator: source.coordinator ? { ...source.coordinator } : { fullName: '', phone: '', occupation: '' },
      certifier: source.certifier ? { ...source.certifier } : { fullName: '', phone: '', roleTitle: '', organization: '', comments: '' },
      latitude: source.latitude !== undefined ? source.latitude : null,
      longitude: source.longitude !== undefined ? source.longitude : null,
      residenceAddress: source.residenceAddress || source.address || '',
      placeName: source.placeName || '',
      locationVerificationStatus: source.locationVerificationStatus || '',
      editNotes: '',
      newUploadedDocs: [] as UploadedDocumentItem[],
    };
    editBaseline.current = JSON.parse(JSON.stringify({ ...initialForm, updatedAt: source.updatedAt }));
    setIsEditing(true);
    const normalizedSec = normalizeSectionKey(mainSec);
    setActiveMainSection(normalizedSec);
    if (personalSub) setActivePersonalSubSection(personalSub);
    else if (normalizedSec === 'family') setActivePersonalSubSection('household');
    else if (normalizedSec === 'economy') setActivePersonalSubSection('economy');
    else if (normalizedSec === 'limitations') setActivePersonalSubSection('limitations');
    else setActivePersonalSubSection('info');
    setEditForm(initialForm);
    setReasonError(null);
  };

  // Direct save of location & coordinates from Section 2
  const handleSaveLocationDirectly = async (
    loc: LocationData,
    status: 'not_specified' | 'pending_verification' | 'verified'
  ): Promise<boolean> => {
    if (!selectedRegistry) return false;
    setIsSavingLocationDirectly(true);
    try {
      const payload = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        residenceAddress: loc.residenceAddress,
        placeName: loc.placeName,
        locationVerificationStatus: status,
      };
      const ok = await updateBeneficiaryRegistry(
        selectedRegistry.id,
        payload,
        `ปรับปรุงพิกัดที่อยู่อาศัย (${loc.latitude?.toFixed(5)}, ${loc.longitude?.toFixed(5)}) สถานะ: ${LOCATION_VERIFICATION_LABELS[status]?.label}`
      );
      if (ok) {
        await loadRegistryDetail(selectedRegistry.id);
        return true;
      }
      return false;
    } finally {
      setIsSavingLocationDirectly(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setReasonError(null);
    editBaseline.current = null;
  };

  // Real-time diff detection for dirty state & material changes
  const currentChanges = useMemo(() => {
    if (!isEditing || !editBaseline.current) return [];
    return diffRegistryFields(editBaseline.current, editForm);
  }, [isEditing, editForm]);

  const hasMaterialChanges = useMemo(() => {
    return currentChanges.some((c) => c.material);
  }, [currentChanges]);

  // Helper functions for household members editing
  const handleAddMember = () => {
    setEditForm((prev: any) => ({
      ...prev,
      householdMembers: [
        ...(prev.householdMembers || []),
        {
          id: `mem-${Date.now()}`,
          fullName: '',
          relation: 'บุตร',
          relationship: 'บุตร',
          age: 18,
          ageYears: 18,
          occupation: '',
          monthlyIncome: undefined,
          healthNotes: '',
        }
      ]
    }));
  };

  const handleRemoveMember = (index: number) => {
    setEditForm((prev: any) => ({
      ...prev,
      householdMembers: (prev.householdMembers || []).filter((_: any, i: number) => i !== index)
    }));
  };

  const handleMemberChange = (index: number, field: string, value: any) => {
    setEditForm((prev: any) => {
      const list = [...(prev.householdMembers || [])];
      const next = { ...list[index], [field]: value };
      if (field === 'relation' || field === 'relationship') {
        next.relation = value;
        next.relationship = value;
      }
      if (field === 'age' || field === 'ageYears') {
        next.age = value;
        next.ageYears = value;
      }
      list[index] = next;
      return { ...prev, householdMembers: list };
    });
  };

  useEffect(() => {
    if (!isEditing) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isEditing]);

  // Save edit changes to real database
  const handleSaveEdit = async () => {
    if (!selectedRegistry) return;

    if (!editForm.firstName?.trim() || !editForm.lastName?.trim()) {
      showToast('กรุณาระบุชื่อและนามสกุลผู้มีสิทธิ์', 'error');
      return;
    }
    const cleanId = String(editForm.nationalId || '').replace(/[^0-9]/g, '');
    if (!cleanId || cleanId.length !== 13) {
      showToast('กรุณาระบุหมายเลขบัตรประชาชน 13 หลักให้ถูกต้อง', 'error');
      return;
    }
    const trimmedPhone = String(editForm.phone || '').trim();
    if (!trimmedPhone) {
      showToast('กรุณาระบุเบอร์โทรศัพท์ติดต่อ', 'error');
      return;
    }
    if (!/^[0-9+\-\s]{8,20}$/.test(trimmedPhone)) {
      showToast('หมายเลขโทรศัพท์ไม่ถูกต้อง (กรุณาระบุตัวเลข 8–20 หลัก)', 'error');
      return;
    }
    if (!editForm.address?.trim()) {
      showToast('กรุณาระบุที่อยู่ปัจจุบัน', 'error');
      return;
    }

    for (const [val, label] of [
      [editForm.monthlyIncome, 'รายได้รวมต่อเดือน'],
      [editForm.monthlyExpense, 'รายจ่ายรวมต่อเดือน'],
      [editForm.debtAmount, 'ภาระหนี้สินคงค้าง'],
    ] as const) {
      if (val !== null && val !== undefined && val !== '') {
        const num = Number(val);
        if (!Number.isFinite(num) || num < 0) {
          showToast(`${label}ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป`, 'error');
          return;
        }
      }
    }

    // Coordinates validation (-90 <= lat <= 90, -180 <= lng <= 180)
    if (editForm.latitude !== null && editForm.latitude !== undefined && editForm.latitude !== '') {
      const latVal = Number(editForm.latitude);
      if (isNaN(latVal) || latVal < -90 || latVal > 90) {
        showToast('ละติจูดต้องอยู่ระหว่าง -90 ถึง 90 องศา', 'error');
        return;
      }
    }
    if (editForm.longitude !== null && editForm.longitude !== undefined && editForm.longitude !== '') {
      const lngVal = Number(editForm.longitude);
      if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) {
        showToast('ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180 องศา', 'error');
        return;
      }
    }

    const baseline = editBaseline.current || selectedRegistry;
    const incBreakChanged = !breakdownsEqual(baseline.incomeBreakdown, editForm.incomeBreakdown);
    const incTotalChanged = !valuesEqual(baseline.monthlyIncome, editForm.monthlyIncome, 'number');
    const expBreakChanged = !breakdownsEqual(baseline.expenseBreakdown, editForm.expenseBreakdown);
    const expTotalChanged = !valuesEqual(baseline.monthlyExpense, editForm.monthlyExpense, 'number');
    const incomeLineSum = sumFilled(editForm.incomeBreakdown, INCOME_LINE_KEYS);
    const expenseLineSum = sumFilled(editForm.expenseBreakdown, EXPENSE_LINE_KEYS);

    const syncedForm = {
      ...editForm,
      phone: trimmedPhone,
      monthlyIncome: incBreakChanged && !incTotalChanged && incomeLineSum !== null ? incomeLineSum : editForm.monthlyIncome,
      monthlyExpense: expBreakChanged && !expTotalChanged && expenseLineSum !== null ? expenseLineSum : editForm.monthlyExpense,
      nationalId: cleanId,
    };
    const changes = diffRegistryFields(baseline, syncedForm);
    if (changes.length === 0) {
      showToast('ไม่มีข้อมูลที่เปลี่ยนแปลง', 'error');
      return;
    }
    const reviewed = registryNeedsReReview(selectedRegistry.registrationStatus);
    const material = changes.some((change) => change.material);
    const trimmedNotes = String(editForm.editNotes || '').trim();
    if (material && trimmedNotes.length < 5) {
      setReasonError('การแก้ไขข้อมูลที่มีผลต่อคุณสมบัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร');
      showToast('การแก้ไขข้อมูลที่มีผลต่อคุณสมบัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร', 'error');
      const el = document.getElementById('edit-reason-input');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }
    setReasonError(null);
    setSavePreview({ changes, material, reviewed, syncedForm });
  };

  const handleConfirmSave = async () => {
    if (!selectedRegistry || !savePreview) return;
    const formToSave = savePreview.syncedForm || editForm;
    const notesToSave = String(formToSave.editNotes || '').trim();
    if (savePreview.material && notesToSave.length < 5) {
      showToast('การแก้ไขข้อมูลที่มีผลต่อคุณสมบัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร', 'error');
      return;
    }
    const cleanId = String(formToSave.nationalId || '').replace(/[^0-9]/g, '');
    setIsSaving(true);
    try {
      const payload = {
        ...formToSave,
        nationalId: cleanId,
        expectedUpdatedAt: editBaseline.current?.updatedAt || selectedRegistry.updatedAt,
        changes: savePreview.changes,
        documents: (formToSave.newUploadedDocs || []).map((d: UploadedDocumentItem) => ({
          name: d.name,
          category: d.category,
          fileUrl: d.fileUrl,
          storageProvider: d.storageProvider,
          storagePath: d.storagePath,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
        })),
      };

      const ok = await updateBeneficiaryRegistry(selectedRegistry.id, payload, notesToSave);
      if (ok) {
        await loadRegistryDetail(selectedRegistry.id);
        setIsEditing(false);
        setSavePreview(null);
        setReasonError(null);
        editBaseline.current = null;
      } else {
        setSavePreview(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Open Edit History Modal
  const handleOpenHistoryModal = async (benId: string, name?: string, regNo?: string) => {
    const reg = registries.find(r => r.id === benId) || selectedRegistry;
    setHistoryTarget({
      name: name || (reg ? formatPersonName(reg) : '') || 'ผู้มีสิทธิ์',
      regNo: regNo || getDisplayMemberCode(reg)
    });
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const hist = await getRegistryEditHistory(benId);
      setHistoryList(hist);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Open status change dialog
  const handleOpenStatusDialog = (reg: BeneficiaryRegistryItem) => {
    const allowedNext = ALLOWED_NEXT_REGISTRATION_STATUSES[reg.registrationStatus] || ['under_review'];
    setSelectedRegistry(reg);
    setNewStatus(allowedNext[0]);
    setStatusNotes('');
    setIsStatusDialogOpen(true);
  };

  // Confirm status transition
  const handleConfirmStatusChange = async () => {
    if (!selectedRegistry) return;
    setIsUpdatingStatus(true);
    try {
      const ok = await updateRegistryStatus(selectedRegistry.id, newStatus, statusNotes);
      if (ok) {
        setIsStatusDialogOpen(false);
        // Update local selected registry if modal open
        setSelectedRegistry((prev) => prev ? {
          ...prev,
          registrationStatus: newStatus,
          registrationHistory: [
            ...(prev.registrationHistory || []),
            {
              status: newStatus,
              timestamp: new Date().toISOString(),
              changedBy: `${currentUser.name} (${currentUser.roleTitleTh})`,
              notes: statusNotes || `เปลี่ยนสถานะเป็น ${newStatus}`
            }
          ]
        } : null);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save checklist evaluation
  const handleSaveChecklist = async (updatedChecklist?: EvaluatorChecklist) => {
    const listToSave = updatedChecklist || checklist;
    if (!selectedRegistry || !listToSave) return;
    setIsSavingChecklist(true);
    try {
      const ok = await updateRegistryChecklist(selectedRegistry.id, listToSave);
      if (ok) {
        setChecklist(listToSave);
        setSelectedRegistry((prev) => prev ? { ...prev, evaluatorChecklist: listToSave } : null);
      }
    } finally {
      setIsSavingChecklist(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0b2545] text-amber-300 font-bold flex items-center justify-center text-base shadow-xs shrink-0">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">
                  ทะเบียนสมาชิกผู้มีสิทธิ์รับซะกาต
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  ขึ้นทะเบียนครั้งเดียว • ประเมินสิทธิ์ตามรอบระยะเวลา
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                สมาชิก 1 คน มีรหัสสมาชิกถาวร (MB-...) เพียงชุดเดียว • บันทึกประวัติประเมินสิทธิ์เป็นรอบพร้อม Snapshot ย้อนหลังโดยไม่สร้างทะเบียนบุคคลซ้ำ
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refreshData()}
            disabled={isLoading}
            className="zms-action flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors min-h-[40px]"
            title="รีเฟรชข้อมูลล่าสุด"
           aria-label="รีเฟรช">
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            onClick={() => onNavigate('new-application')}
            className="zms-action flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs min-h-[40px]"
           aria-label="ขึ้นทะเบียนสมาชิกใหม่" title="ขึ้นทะเบียนสมาชิกใหม่">
            <Plus className="w-4 h-4" />
            <span>ขึ้นทะเบียนสมาชิกใหม่</span>
          </button>
        </div>
      </div>

      {/* Section 9: 6 Strictly Separated Summary Cards + Assessment Period Filter */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              สรุปจำนวนแยกชัดเจน: สมาชิกหลัก • ผลประเมินสิทธิ์ ({summaryMetrics.totalAssessmentRounds} รอบสะสม) • คำร้อง • ผู้ได้รับช่วยเหลือ
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">รอบการประเมิน:</span>
            <select
              value={assessmentPeriodFilter}
              onChange={(e) => {
                setAssessmentPeriodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="all">ทุกรอบการประเมิน (ผลล่าสุดรายสมาชิก)</option>
              {availablePeriods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">1. สมาชิกทั้งหมด</span>
              <Users className="w-4 h-4 text-teal-700" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1.5 font-mono">{summaryMetrics.totalMembers}</div>
            <div className="text-[11px] text-slate-500">บุคคล (ไม่นับซ้ำรอบประเมิน)</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">2. ตรวจสอบข้อมูล</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-800 mt-1.5 font-mono">{summaryMetrics.pendingAssessments}</div>
            <div className="text-[11px] text-slate-500">อยู่ระหว่างตรวจสอบและประเมินสิทธิ์</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">3. มีคุณสมบัติตามเกณฑ์</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-800 mt-1.5 font-mono">{summaryMetrics.eligibleCount}</div>
            <div className="text-[11px] text-slate-500">ผ่านการตรวจสอบและมีสิทธิ์รับซะกาต</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-rose-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">4. ไม่มีคุณสมบัติตามเกณฑ์</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-extrabold text-rose-800 mt-1.5 font-mono">{summaryMetrics.ineligibleCount}</div>
            <div className="text-[11px] text-slate-500">ตรวจสอบแล้วไม่ผ่านหลักเกณฑ์</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-sky-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">5. จำนวนคำร้อง</span>
              <FilePlus2 className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-extrabold text-sky-900 mt-1.5 font-mono">{summaryMetrics.totalAssistanceRequests}</div>
            <div className="text-[11px] text-slate-500">คำร้องขอความช่วยเหลือ</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-purple-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">6. ได้รับช่วยเหลือ</span>
              <HeartHandshake className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-extrabold text-purple-900 mt-1.5 font-mono">{summaryMetrics.assistedMembersCount}</div>
            <div className="text-[11px] text-slate-500">ผู้ได้รับความช่วยเหลือจริง</div>
          </div>
        </div>
      </div>

      {/* Super Admin View Mode Switcher: Active Registries vs Deleted Registries */}
      {currentUser.role === 'super_admin' && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setRegistryViewMode('active')}
            className={`zms-action flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              registryViewMode === 'active'
                ? 'bg-[#0b2545] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>สมาชิกที่ใช้งานอยู่ ({registries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setRegistryViewMode('deleted')}
            className={`zms-action flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              registryViewMode === 'deleted'
                ? 'bg-red-700 text-white shadow-xs'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
           aria-label="สมาชิกที่ถูกจำหน่าย/ลบ (Soft Deleted)" title="สมาชิกที่ถูกจำหน่าย/ลบ (Soft Deleted)">
            <Trash2 className="w-4 h-4" />
            <span>สมาชิกที่ถูกจำหน่าย/ลบ (Soft Deleted)</span>
          </button>
        </div>
      )}

      {registryViewMode === 'deleted' && currentUser.role === 'super_admin' ? (
        <DeletedBeneficiariesTable
          onRestore={(target) => setRestoreTarget(target)}
          onViewAudit={(target) => setAuditTarget(target)}
          refreshTrigger={deletedRefreshTrigger}
        />
      ) : (
        <>
      {/* 2. Search, Status Tabs & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold touch-scroll">
          <button
            onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#0b2545] text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({registries.length})
          </button>

          {(Object.keys(REGISTRATION_STATUS_LABELS) as RegistrationStatus[]).map((st) => {
            const count = registries.filter((r) => r.registrationStatus === st).length;
            const meta = REGISTRATION_STATUS_LABELS[st];
            const isActive = statusFilter === st;
            const StatusIcon =
              st === 'draft'
                ? FileText
                : st === 'under_review'
                  ? Clock
                  : st === 'qualified'
                    ? CheckCircle2
                    : XCircle;

            return (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-[#0b2545] text-white border-[#0b2545] shadow-xs font-bold'
                    : `${meta.bg} ${meta.color} ${meta.border} hover:opacity-80`
                }`}
              >
                <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{meta.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัสสมาชิก MB-..., เลขบัตรประชาชน, เบอร์โทร หรือชุมชน..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] text-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="zms-action absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div>
            <select
              value={asnafFilter}
              onChange={(e) => { setAsnafFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] text-xs font-medium"
            >
              <option value="all">หมวดอัสนัฟทั้งหมด</option>
              {Object.entries(ASNAF_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] text-xs font-medium"
            >
              <option value="all">ทุกสาขา / พื้นที่ ({orgBranches.length})</option>
              {orgBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.status === 'inactive' ? '(ปิดใช้งาน)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={memberStatusFilter}
              onChange={(e) => { setMemberStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] text-xs font-medium"
            >
              <option value="all">สถานะสมาชิกทั้งหมด</option>
              <option value="ACTIVE">สมาชิกปกติ</option>
              <option value="SUSPENDED">ถูกระงับ</option>
              <option value="ARCHIVED">ปิดประวัติถาวร</option>
            </select>
          </div>
          <div>
            <select
              value={assessmentResultFilter}
              onChange={(e) => { setAssessmentResultFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] text-xs font-medium"
            >
              <option value="all">ผลการประเมินทั้งหมด</option>
              <option value="pending_assessment">รอประเมิน</option>
              <option value="review">รอตรวจสอบ</option>
              <option value="eligible">มีคุณสมบัติตามเกณฑ์</option>
              <option value="ineligible">ไม่มีคุณสมบัติตามเกณฑ์</option>
              <option value="reassess">ต้องประเมินใหม่</option>
            </select>
          </div>
          <div>
            <select
              value={requestStatusFilter}
              onChange={(e) => { setRequestStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] text-xs font-medium"
            >
              <option value="all">สถานะคำร้องทั้งหมด</option>
              <option value="pending">มีคำร้องรอพิจารณา</option>
              <option value="approved">มีคำร้องที่อนุมัติ</option>
              <option value="assisted">ได้รับการช่วยเหลือจริง</option>
              <option value="none">ยังไม่มีคำร้อง</option>
            </select>
          </div>
          <div>
            <select
              value={sortMode}
              onChange={(e) => { setSortMode(e.target.value as typeof sortMode); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] text-xs font-medium"
            >
              <option value="registered_desc">วันที่ขึ้นทะเบียนล่าสุด</option>
              <option value="registered_asc">วันที่ขึ้นทะเบียนเก่าสุด</option>
              <option value="name_asc">ชื่อสมาชิก ก–ฮ</option>
              <option value="code_asc">รหัสสมาชิก</option>
              <option value="assessment_desc">วันที่ประเมินล่าสุด</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Member Registry Data Table / Card View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#0B2545]">รายการสมาชิก</p>
            <p className="text-[11px] text-slate-500">
              {displayMode === 'card'
                ? `${cardLayout.cardsPerRow} การ์ด/แถว · ${listPageSize} รายการต่อหน้า`
                : `ตาราง ${listPageSize} รายการต่อหน้า`}
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="สลับมุมมองรายการสมาชิก">
            <button
              type="button"
              aria-pressed={displayMode === 'table'}
              onClick={() => {
                setDisplayMode('table');
                window.localStorage.setItem('zms_registry_view_mode', 'table');
              }}
              className={`zms-action inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                displayMode === 'table' ? 'bg-[#0B2545] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <List className="h-4 w-4" /> ตาราง
            </button>
            <button
              type="button"
              aria-pressed={displayMode === 'card'}
              onClick={() => {
                setDisplayMode('card');
                window.localStorage.setItem('zms_registry_view_mode', 'card');
              }}
              className={`zms-action inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                displayMode === 'card' ? 'bg-[#0B2545] text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid className="h-4 w-4" /> การ์ด
            </button>
          </div>
        </div>
        {displayMode === 'card' ? (
          <BeneficiaryRegistryCards
            items={paginatedRegistries}
            applications={applications}
            layout={cardLayout}
            memberCode={getDisplayMemberCode}
            memberStatus={(reg) => {
              const regMeta = REGISTRATION_STATUS_LABELS[reg.registrationStatus] || REGISTRATION_STATUS_LABELS.under_review;
              return {
                label: regMeta.label,
                cls: `${regMeta.bg} ${regMeta.color} ${regMeta.border}`,
              };
            }}
            asnafLabel={(reg) => {
              const asnafKey = String(reg.asnafCategory || '').toLowerCase();
              return ASNAF_LABELS[asnafKey] || reg.asnafCategory || 'ไม่ระบุอัสนัฟ';
            }}
            personName={(reg) => formatPersonName(reg)}
            canEdit={canEditRegistry}
            canAssess={canPerformAssessment}
            canDelete={currentUser.role === 'super_admin'}
            onOpen={(reg, section) => handleOpenDetails(reg, section || 'member_info')}
            onEdit={(reg) => {
              handleOpenDetails(reg, 'member_info', 'info');
              void handleStartEdit('member_info', 'info', reg);
            }}
            onAssess={async (reg) => {
              setSelectedRegistry(reg);
              await loadRegistryDetail(reg.id);
              await loadMemberAssessments(reg.id);
              setIsPeriodicAssessmentModalOpen(true);
            }}
            onRequest={(reg) => handleStartAssistanceRequest(reg.id)}
            onDelete={(reg) => {
              setSoftDeleteTarget({
                id: reg.id,
                registryNumber: getDisplayMemberCode(reg),
                fullName: formatPersonName(reg),
              });
            }}
          />
        ) : (
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">รหัสสมาชิก</th>
                <th className="py-3 px-4">ชื่อ-นามสกุล / เลขบัตร</th>
                <th className="py-3 px-4">ชุมชน / จังหวัด</th>
                <th className="py-3 px-4">หมวดอัสนัฟ</th>
                <th className="py-3 px-4">สถานะสมาชิก</th>
                <th className="py-3 px-4">ผลประเมินสิทธิ์ล่าสุด</th>
                <th className="py-3 px-4 text-center">คำร้อง / ช่วยเหลือ</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRegistries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">ไม่พบข้อมูลสมาชิกตามเงื่อนไขที่เลือก</p>
                    <p className="text-[11px] mt-1">ลองปรับคำค้นหา หรือกด &ldquo;ขึ้นทะเบียนสมาชิกใหม่&rdquo;</p>
                  </td>
                </tr>
              ) : (
                paginatedRegistries.map((reg) => {
                  const memberCode = getDisplayMemberCode(reg);
                  const memberStatusKey = String(reg.memberStatus || 'ACTIVE').toUpperCase();
                  const memberMeta = MEMBER_STATUS_LABELS[memberStatusKey] || MEMBER_STATUS_LABELS.ACTIVE;
                  const latestAsm = reg.latestAssessment;
                  const asmMeta = latestAsm
                    ? getAssessmentStatusMeta(latestAsm.status)
                    : {
                        label: REGISTRATION_STATUS_LABELS[reg.registrationStatus]?.label || 'รอประเมินสิทธิ์',
                        cls: `${REGISTRATION_STATUS_LABELS[reg.registrationStatus]?.bg || 'bg-amber-50'} ${REGISTRATION_STATUS_LABELS[reg.registrationStatus]?.color || 'text-amber-800'} ${REGISTRATION_STATUS_LABELS[reg.registrationStatus]?.border || 'border-amber-200'}`,
                      };
                  const asnafKey = String(reg.asnafCategory || (reg as any).asnaf?.code || '').toLowerCase();
                  const asnafText = ASNAF_LABELS[asnafKey] || (reg as any).asnaf?.nameTh || reg.asnafCategory || 'ไม่ระบุ';
                  const asmRounds = reg.assessmentCount ?? (latestAsm ? 1 : 0);

                  return (
                    <tr 
                      key={reg.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => handleOpenDetails(reg)}
                    >
                      {/* Permanent Member ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0b2545] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[#0b2545]">
                            {memberCode}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          ขึ้นทะเบียน: {reg.registeredDate ? new Date(reg.registeredDate).toLocaleDateString('th-TH') : '-'}
                        </div>
                      </td>

                      {/* Name & Masked ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{formatPersonName(reg)}</span>
                          {reg.age && <span className="text-[10px] font-normal text-slate-400">({reg.age} ปี)</span>}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                          <span title="หมายเลขประจำตัวประชาชน">{reg.nationalIdMasked || (reg as any).identityNumber || '-'}</span>
                          <span>•</span>
                          <span>{reg.phone}</span>
                        </div>
                      </td>

                      {/* Community / Area */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-medium text-slate-800 truncate max-w-[150px]">
                          {reg.community || reg.district}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {reg.district}, {reg.province}
                        </div>
                      </td>

                      {/* Asnaf */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 font-semibold border border-teal-200/80 text-[11px]">
                          {typeof asnafText === 'string' && asnafText.includes(' ') ? asnafText.split(' ')[0] : (asnafText || '-')}
                        </span>
                      </td>

                      {/* Canonical 4-State Registration Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(() => {
                          const regMeta = REGISTRATION_STATUS_LABELS[reg.registrationStatus] || REGISTRATION_STATUS_LABELS.under_review;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${regMeta.bg} ${regMeta.color} ${regMeta.border}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span>{regMeta.label}</span>
                            </span>
                          );
                        })()}
                        {(memberStatusKey === 'SUSPENDED' || memberStatusKey === 'ARCHIVED') && (
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${memberMeta.cls}`}>
                              {memberMeta.label}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Separated Latest Assessment Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${asmMeta.cls}`}>
                          <span>{asmMeta.label}</span>
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          {latestAsm?.assessmentNumber ? `${latestAsm.assessmentNumber} (${asmRounds} ครั้ง)` : 'ยังไม่มีระเบียนประเมิน'}
                        </div>
                      </td>

                      {/* Linked Assistance Applications Count & Total Received */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                          {reg.assistanceApplicationsCount || 0} คำร้อง
                        </div>
                        <div className="text-[11px] font-mono font-bold text-emerald-700 mt-0.5">
                          ฿{(reg.totalAssistanceReceived || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenDetails(reg, 'member_info', 'info')}
                            className="zms-action p-1.5 rounded-lg text-slate-600 hover:text-[#0b2545] hover:bg-slate-100 transition-colors"
                            title="เปิดข้อมูลสมาชิก (8 ส่วนหลัก)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canPerformAssessment && (
                            <button
                              onClick={async () => {
                                setSelectedRegistry(reg);
                                await loadRegistryDetail(reg.id);
                                await loadMemberAssessments(reg.id);
                                setIsPeriodicAssessmentModalOpen(true);
                              }}
                              className="zms-action inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 rounded-lg text-[10px] font-bold transition-colors"
                              title="ประเมินสิทธิ์ใหม่ (สร้างระเบียนประเมินใหม่โดยไม่สร้างทะเบียนบุคคลซ้ำ)"
                             aria-label="ประเมินใหม่">
                              <ClipboardCheck className="w-3.5 h-3.5 text-teal-700" />
                              <span className="hidden xl:inline">ประเมินใหม่</span>
                            </button>
                          )}

                          {canEditRegistry(reg) && (
                            <button
                              onClick={() => {
                                handleOpenDetails(reg, 'member_info', 'info');
                                void handleStartEdit('member_info', 'info', reg);
                              }}
                              className="zms-action p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="แก้ไขข้อมูลสมาชิก"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleStartAssistanceRequest(reg.id)}
                            className={`zms-action inline-flex items-center gap-1 px-2 py-1 border rounded-lg text-[10px] font-bold transition-colors ${
                              reg.registrationStatus === 'qualified'
                                ? 'bg-sky-50 text-sky-800 hover:bg-sky-100 border-sky-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                            }`}
                            title={
                              reg.registrationStatus === 'qualified'
                                ? 'ยื่นคำร้องขอความช่วยเหลือ'
                                : 'ยื่นคำร้องได้เฉพาะสมาชิกสถานะ "มีคุณสมบัติตามเกณฑ์" เท่านั้น'
                            }
                            aria-label="ยื่นคำร้อง">
                            <FilePlus2 className="w-3.5 h-3.5 text-sky-700" />
                            <span className="hidden xl:inline">ยื่นคำร้อง</span>
                          </button>

                          {currentUser.role === 'super_admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSoftDeleteTarget({
                                  id: reg.id,
                                  registryNumber: memberCode,
                                  fullName: formatPersonName(reg),
                                });
                              }}
                              className="zms-action p-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="จำหน่าย/ลบสมาชิก (Super Admin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            แสดง {totalItems === 0 ? 0 : (currentPage - 1) * listPageSize + 1} ถึง {Math.min(currentPage * listPageSize, totalItems)} จากสมาชิกทั้งหมด {totalItems} ราย
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="หน้าก่อนหน้า"
              title="หน้าก่อนหน้า"
              className="zms-action p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800">
              หน้า {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="หน้าถัดไป"
              title="หน้าถัดไป"
              className="zms-action p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      {/* 4. Member Detail View Modal (8 Sections & 4 Primary Action Buttons — Section 8) */}
      {selectedRegistry && !isStatusDialogOpen && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1000] flex items-stretch justify-center bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-hidden sm:items-center sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (isEditing) {
                  setShowUnsavedConfirm(true);
                } else {
                  setSelectedRegistry(null);
                }
              }
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              aria-labelledby="beneficiary-detail-title"
              className="bg-white shadow-2xl border border-slate-200 flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden sm:h-[94vh] sm:max-h-[calc(100dvh-24px)] sm:rounded-2xl"
            >
            {/* Modal Header — expands at the top, collapses while the profile scrolls */}
            <div className={`member-smart-header sticky top-0 z-30 shrink-0 bg-gradient-to-r from-[#0b2545] via-[#103463] to-[#133e6f] text-white shadow-sm ${memberHeaderCollapsed ? 'is-collapsed' : ''}`}>
              <style>{`
                .member-smart-header {
                  padding: 12px;
                  padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
                  transition: padding 250ms ease;
                }
                @media (min-width: 768px) {
                  .member-smart-header:not(.is-collapsed) {
                    padding: 16px;
                    padding-top: calc(env(safe-area-inset-top, 0px) + 16px);
                  }
                }
                @media (min-width: 1024px) {
                  .member-smart-header:not(.is-collapsed) {
                    padding: 20px;
                    padding-top: calc(env(safe-area-inset-top, 0px) + 20px);
                  }
                }
                .member-smart-header.is-collapsed {
                  padding: 12px;
                  padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
                }
                .member-smart-header .member-header-title { transition: font-size 250ms ease, line-height 250ms ease; }
                .member-smart-header .member-header-extra {
                  display: grid;
                  grid-template-rows: 1fr;
                  opacity: 1;
                  transition: grid-template-rows 250ms ease, opacity 220ms ease;
                }
                .member-smart-header.is-collapsed .member-header-extra {
                  grid-template-rows: 0fr;
                  flex: 0 0 0;
                  width: 0;
                  min-width: 0;
                  opacity: 0;
                  pointer-events: none;
                  overflow: hidden;
                }
                .member-smart-header .member-header-extra > div { min-height: 0; }
                .member-smart-header.is-collapsed .member-header-extra > div { overflow: hidden; }
                .member-smart-header details > :not(summary) { display: none; }
                .member-smart-header details[open] > :not(summary) { display: block; }
                @media (prefers-reduced-motion: reduce) {
                  .member-smart-header,
                  .member-smart-header .member-header-title,
                  .member-smart-header .member-header-extra { transition: none; }
                }
              `}</style>
              <div className="min-w-0 lg:flex lg:items-start lg:justify-between lg:gap-4">
              <div className="min-w-0 w-full flex-1">
                <div className={memberHeaderCollapsed ? 'flex min-w-0 items-center gap-2' : 'min-w-0'}>
                  <div className="min-w-0 flex-1">
                    <p className={`min-w-0 truncate font-mono font-bold text-amber-200 ${memberHeaderCollapsed ? 'text-[12px] leading-4' : 'text-[13px] leading-5'}`}>
                      {getDisplayMemberCode(selectedRegistry)}
                    </p>
                    <h2 id="beneficiary-detail-title" className={`member-header-title font-black text-white ${memberHeaderCollapsed ? 'truncate text-[17px] leading-6' : 'mt-1 text-[24px] leading-tight break-words sm:text-[26px] lg:text-[30px]'}`}>
                      {formatPersonName(selectedRegistry)}
                    </h2>
                    {!memberHeaderCollapsed && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        {(() => {
                          const regMeta = REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus] || REGISTRATION_STATUS_LABELS.under_review;
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-bold leading-5 ${regMeta.bg} ${regMeta.color} ${regMeta.border}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span>{regMeta.label}</span>
                            </span>
                          );
                        })()}
                        {['SUSPENDED', 'ARCHIVED'].includes(String(selectedRegistry.memberStatus || '').toUpperCase()) && (
                          <MemberStatusBadge status={selectedRegistry.memberStatus} />
                        )}
                      </div>
                    )}
                  </div>
                  {memberHeaderCollapsed && (() => {
                    const regMeta = REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus] || REGISTRATION_STATUS_LABELS.under_review;
                    return (
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-bold leading-5 ${regMeta.bg} ${regMeta.color} ${regMeta.border}`}>
                        {regMeta.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="member-header-extra" aria-hidden={memberHeaderCollapsed}>
                  <div className="min-w-0 space-y-0.5 overflow-hidden pt-1.5">
                    <p className="truncate text-[14px] font-semibold leading-5 text-teal-100">
                      {selectedRegistry.occupation?.trim()
                        || (selectedRegistry.asnafCategory
                          ? (ASNAF_LABELS[selectedRegistry.asnafCategory] || selectedRegistry.asnafCategory)
                          : 'ยังไม่ระบุอาชีพ')}
                    </p>
                    <div className="flex min-w-0 items-center gap-1.5 text-[13px] leading-5 text-slate-100">
                      <span className="shrink-0 text-slate-300">บัตรประชาชน</span>
                      <span className="min-w-0 truncate font-mono font-bold">
                        {(() => {
                          const masked = selectedRegistry.nationalIdMasked || 'ไม่มีเลขบัตร';
                          const digits = String(selectedRegistry.nationalId || '').replace(/\D/g, '');
                          const canReveal = ['super_admin', 'approver', 'officer'].includes(currentUser.role) && digits.length === 13;
                          if (!showFullNationalId || !canReveal) return masked;
                          return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
                        })()}
                      </span>
                      {['super_admin', 'approver', 'officer'].includes(currentUser.role) && (
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
                          aria-label={showFullNationalId ? 'ซ่อนเลขบัตรประชาชน' : 'แสดงเลขบัตรประชาชน'}
                          title={showFullNationalId ? 'ซ่อนเลขบัตรประชาชน' : 'แสดงเลขบัตรประชาชน'}
                          onClick={() => {
                            const digits = String(selectedRegistry.nationalId || '').replace(/\D/g, '');
                            if (digits.length !== 13) {
                              showToast('บทบาทนี้เห็นได้เฉพาะเลขบัตรที่ปกปิดไว้', 'info');
                              return;
                            }
                            setShowFullNationalId((open) => !open);
                          }}
                        >
                          {showFullNationalId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    <p className="truncate text-[13px] leading-5 text-slate-200">{selectedRegistry.phone || 'ไม่มีเบอร์โทร'}</p>
                    <p className="truncate text-[13px] leading-5 text-slate-200">
                      {[selectedRegistry.community || selectedRegistry.subdistrict, selectedRegistry.district, selectedRegistry.province].filter(Boolean).join(' ') || 'ไม่มีที่อยู่'}
                    </p>
                    <p className="text-[12px] leading-5 text-slate-300">ขึ้นทะเบียน {selectedRegistry.registeredDate ? new Date(selectedRegistry.registeredDate).toLocaleDateString('th-TH') : '-'}</p>
                    <p className="truncate text-[12px] leading-5 text-slate-300">{selectedRegistry.branchName || 'สำนักงานกลาง'}</p>
                    <p className="truncate text-[12px] leading-5 text-slate-300">
                      {(() => {
                        const latest = memberAssessments[0] || selectedRegistry.latestAssessment;
                        const meta = latest ? getAssessmentStatusMeta(latest.status) : { label: 'ยังไม่ประเมิน' };
                        return `ประเมินล่าสุด: ${meta.label}`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`member-header-extra ${memberHeaderCollapsed ? '' : 'mt-2.5 lg:mt-0 lg:max-w-xl lg:shrink-0'}`} aria-hidden={memberHeaderCollapsed}>
              <div>
                {!isEditing ? (
                  <div className="grid grid-cols-4 justify-items-center gap-2 md:flex md:flex-wrap md:items-center md:justify-end">
                    {canEditRegistry(selectedRegistry) && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeMainSection)}
                        className="zms-action flex h-12 w-12 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-[14px] font-bold text-white shadow-sm md:h-11 md:w-auto md:px-3"
                        aria-label="แก้ไขข้อมูลสมาชิก"
                        title="แก้ไขข้อมูลสมาชิก"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden md:inline">แก้ไข</span>
                      </button>
                    )}
                    {canPerformAssessment && (
                      <button
                        type="button"
                        onClick={() => setIsPeriodicAssessmentModalOpen(true)}
                        className="zms-action flex h-12 w-12 items-center justify-center gap-1.5 rounded-xl bg-amber-400 text-[14px] font-extrabold text-slate-950 shadow-sm md:h-11 md:w-auto md:px-3"
                        aria-label="ประเมินสิทธิ์"
                        title="ประเมินสิทธิ์"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        <span className="hidden md:inline">ประเมินสิทธิ์</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartAssistanceRequest(selectedRegistry.id)}
                      className="zms-action flex h-12 w-12 items-center justify-center gap-1.5 rounded-xl bg-sky-500 text-[14px] font-bold text-white shadow-sm md:h-11 md:w-auto md:px-3"
                      aria-label="ยื่นคำร้อง"
                      title="ยื่นคำร้อง"
                    >
                      <FilePlus2 className="h-4 w-4" />
                      <span className="hidden md:inline">ยื่นคำร้อง</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) setShowUnsavedConfirm(true);
                        else setSelectedRegistry(null);
                      }}
                      className="zms-action flex h-12 w-12 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 text-[14px] font-bold text-white md:h-11 md:w-auto md:px-3"
                      aria-label="กลับ"
                      title="กลับ"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span className="hidden md:inline">กลับ</span>
                    </button>
                    <details className="relative col-span-4 w-full md:w-auto">
                      <summary className="flex h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-[14px] font-bold text-white md:w-auto [&::-webkit-details-marker]:hidden">
                        <MoreHorizontal className="h-4 w-4" />
                        เพิ่มเติม
                      </summary>
                      <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-white/15 bg-[#0b2545] p-1.5 shadow-xl md:left-auto md:w-64">
                        <button type="button" data-keep-label onClick={(event) => { closeActionMenu(event.currentTarget); focusProfile('assessments'); }} className="zms-action flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-[14px] font-bold text-white hover:bg-white/10" aria-label="ประวัติการประเมิน" title="ประวัติการประเมิน">
                          <History className="h-4 w-4 shrink-0 text-emerald-300" />
                          <span>ประวัติการประเมิน ({memberAssessments.length || selectedRegistry.assessmentCount || 0})</span>
                        </button>
                        <button type="button" data-keep-label onClick={(event) => { closeActionMenu(event.currentTarget); window.location.assign(`/beneficiaries/${selectedRegistry.id}/print`); }} className="zms-action flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-[14px] font-bold text-white hover:bg-white/10" aria-label="พิมพ์ข้อมูล" title="พิมพ์ข้อมูล">
                          <Printer className="h-4 w-4 shrink-0" />
                          <span>พิมพ์ข้อมูล</span>
                        </button>
                        <button type="button" data-keep-label onClick={(event) => { closeActionMenu(event.currentTarget); focusProfile('documents'); }} className="zms-action flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-[14px] font-bold text-white hover:bg-white/10" aria-label="ดูเอกสาร" title="ดูเอกสาร">
                          <FileText className="h-4 w-4 shrink-0 text-sky-300" />
                          <span>ดูเอกสาร</span>
                        </button>
                        <button type="button" data-keep-label onClick={(event) => { closeActionMenu(event.currentTarget); focusProfile('audit'); }} className="zms-action flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-[14px] font-bold text-white hover:bg-white/10" aria-label="ประวัติการแก้ไข" title="ประวัติการแก้ไข">
                          <FileCheck2 className="h-4 w-4 shrink-0 text-amber-300" />
                          <span>ประวัติการแก้ไข</span>
                        </button>
                      </div>
                    </details>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 justify-items-center gap-2 md:flex md:justify-end">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="zms-action flex h-12 w-12 items-center justify-center gap-1.5 rounded-xl bg-white/20 text-[14px] font-semibold text-white md:h-11 md:w-auto md:px-3"
                      aria-label="ยกเลิก"
                      title="ยกเลิก"
                    >
                      <X className="h-4 w-4" />
                      <span className="hidden md:inline">ยกเลิก</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="zms-action flex h-12 w-12 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-[14px] font-extrabold text-slate-950 disabled:opacity-50 md:h-11 md:w-auto md:px-3"
                      aria-label={isSaving ? 'กำลังบันทึก' : 'บันทึก'}
                      title={isSaving ? 'กำลังบันทึก' : 'บันทึก'}
                    >
                      {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span className="hidden md:inline">{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</span>
                    </button>
                  </div>
                )}
              </div>
              </div>
              </div>
            </div>

            <div ref={profileBodyRef} className="flex-1 overflow-y-auto bg-[#F4F7FB] px-2.5 pb-4 pt-2 sm:p-5">
              <BeneficiaryIntegratedProfile
                registry={selectedRegistry}
                applications={applications}
                memberAssessments={memberAssessments}
                isLoadingAssessments={isLoadingAssessments}
                isEditing={isEditing}
                editForm={editForm}
                setEditForm={setEditForm}
                canEdit={canEditRegistry(selectedRegistry)}
                canAssess={canPerformAssessment}
                canApprove={canApproveAssessment}
                canViewUnmaskedId={['super_admin', 'approver', 'officer'].includes(currentUser.role)}
                authToken={authToken}
                asnafLabels={ASNAF_LABELS}
                statusLabels={REGISTRATION_STATUS_LABELS}
                focusRequest={profileFocus}
                isSavingLocation={isSavingLocationDirectly}
                isSavingChecklist={isSavingChecklist}
                onStartEdit={(section) => {
                  if (section === 'coordinator') void handleStartEdit('coordinator');
                  else if (section === 'household') void handleStartEdit('family', 'household');
                  else if (section === 'economy') void handleStartEdit('economy', 'economy');
                  else if (section === 'limitations' || section === 'other_aid') void handleStartEdit('limitations', section);
                  else void handleStartEdit('member_info', 'info');
                }}
                onSaveLocationDirectly={handleSaveLocationDirectly}
                onOpenStatusDialog={() => handleOpenStatusDialog(selectedRegistry)}
                onOpenHistoryModal={() => handleOpenHistoryModal(selectedRegistry.id)}
                onSaveChecklist={handleSaveChecklist}
                onRefreshRegistry={async () => { await loadRegistryDetail(selectedRegistry.id); }}
                onOpenNewAssessment={() => setIsPeriodicAssessmentModalOpen(true)}
                onRefreshAssessments={async () => {
                  await Promise.all([
                    loadMemberAssessments(selectedRegistry.id),
                    loadRegistryDetail(selectedRegistry.id),
                    refreshData(),
                  ]);
                }}
                showToast={showToast}
                onOpenCreateRequest={() => handleStartAssistanceRequest(selectedRegistry.id)}
                onNavigateToRequests={(reqId) => {
                  setSelectedRegistry(null);
                  if (onOpenAssistanceRequestDetail && reqId) onOpenAssistanceRequestDetail(reqId);
                  else onNavigate('assistance-requests');
                }}
                onOpenReceiptModal={(app) => setSelectedAidForReceipt(app)}
              />
            </div>


            {/* Modal Footer */}
            <div className={`shrink-0 gap-3 border-t border-slate-200 bg-white p-3 text-xs sm:p-4 ${isEditing ? 'flex flex-col lg:flex-row lg:items-end lg:justify-between' : 'hidden lg:flex lg:flex-wrap lg:items-center lg:justify-between'}`}>
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-[#0b2545]">
                      {getDisplayMemberCode(selectedRegistry)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-bold text-slate-800">โปรไฟล์สมาชิกแบบหน้าเดียว</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canEditRegistry(selectedRegistry) && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeMainSection)}
                        className="zms-action px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                       aria-label="แก้ไขข้อมูลสมาชิก" title="แก้ไขข้อมูลสมาชิก">
                        <Edit className="w-3.5 h-3.5" />
                        <span>แก้ไขข้อมูลสมาชิก</span>
                      </button>
                    )}

                    {canPerformAssessment && (
                      <button
                        type="button"
                        onClick={() => setIsPeriodicAssessmentModalOpen(true)}
                        className="zms-action px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                       aria-label="ประเมินสิทธิ์ใหม่" title="ประเมินสิทธิ์ใหม่">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>ประเมินสิทธิ์ใหม่</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleStartAssistanceRequest(selectedRegistry.id)}
                      className="zms-action px-4 py-2 bg-[#0b2545] hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-xs flex items-center gap-1.5"
                     aria-label="ยื่นคำร้องขอความช่วยเหลือ" title="ยื่นคำร้องขอความช่วยเหลือ">
                      <FilePlus2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ยื่นคำร้องขอความช่วยเหลือ</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-[280px] space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {hasMaterialChanges ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>ข้อมูลที่แก้ไขมีผลต่อคุณสมบัติ กรุณาระบุเหตุผล (อย่างน้อย 5 ตัวอักษร)*</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>เหตุผล / บันทึกการแก้ไข (ไม่บังคับ — ข้อมูลทั่วไปบันทึกได้ทันที)</span>
                        </div>
                      )}
                      {hasMaterialChanges && (
                        <div className="text-[11px] font-semibold shrink-0">
                          {String(editForm.editNotes || '').trim().length < 5 ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {String(editForm.editNotes || '').trim().length}/5 ตัวอักษร
                            </span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {String(editForm.editNotes || '').trim().length}/5 ตัวอักษร (ผ่านเกณฑ์)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="edit-reason-input"
                        type="text"
                        value={editForm.editNotes || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditForm({ ...editForm, editNotes: val });
                          if (reasonError && (val.trim().length >= 5 || !hasMaterialChanges)) {
                            setReasonError(null);
                          }
                        }}
                        placeholder={
                          hasMaterialChanges
                            ? "กรุณาระบุเหตุผลการแก้ไข (เช่น: ปรับปรุงรายได้ครัวเรือนให้เป็นปัจจุบันตามที่ลงพื้นที่จริง)..."
                            : "ระบุเหตุผล/หมายเหตุการแก้ไขข้อมูลสมาชิก (ไม่บังคับ)..."
                        }
                        className={`w-full p-2.5 bg-white border rounded-xl text-xs placeholder:text-slate-400 focus:outline-none transition-all ${
                          reasonError || (hasMaterialChanges && String(editForm.editNotes || '').trim().length > 0 && String(editForm.editNotes || '').trim().length < 5)
                            ? 'border-rose-400 ring-2 ring-rose-200/50 bg-rose-50/20 text-rose-950'
                            : hasMaterialChanges && String(editForm.editNotes || '').trim().length >= 5
                              ? 'border-emerald-400 ring-2 ring-emerald-200/50'
                              : 'border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
                        }`}
                      />
                    </div>
                    {reasonError && (
                      <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{reasonError}</span>
                      </p>
                    )}
                    {registryNeedsReReview(selectedRegistry.registrationStatus) && !reasonError && (
                      <p className="text-[10.5px] text-slate-500">
                        การแก้ไขข้อมูลปัจจุบันของสมาชิกจะไม่กระทบ Snapshot ของประวัติการประเมินสิทธิ์ย้อนหลัง
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      ยกเลิกการแก้ไข
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="zms-action flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-600 px-5 font-bold text-white shadow-md transition-colors hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* Periodic Re-Assessment Modal (Sections 5 & 6) */}
      {selectedRegistry && isPeriodicAssessmentModalOpen && (
        <ModalPortal>
          <PeriodicAssessmentModal
            isOpen={isPeriodicAssessmentModalOpen}
            registry={selectedRegistry}
            previousAssessment={memberAssessments[0] || null}
            assessmentCount={memberAssessments.length || selectedRegistry.assessmentCount || 0}
            authToken={authToken}
            onClose={() => setIsPeriodicAssessmentModalOpen(false)}
            onEditMemberFirst={() => {
              setIsPeriodicAssessmentModalOpen(false);
              handleStartEdit('member_info', 'info');
            }}
            onSaved={async () => {
              await Promise.all([
                loadMemberAssessments(selectedRegistry.id),
                loadRegistryDetail(selectedRegistry.id),
                refreshData(),
              ]);
              setActiveMainSection('assessments');
              focusProfile('assessments');
            }}
            showToast={showToast}
          />
        </ModalPortal>
      )}

      {/* 5. Status Transition Dialog */}
      {isStatusDialogOpen && selectedRegistry && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isUpdatingStatus) {
                setIsStatusDialogOpen(false);
              }
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
              <div className="p-4 bg-[#0b2545] text-white flex items-center justify-between shrink-0">
                <h3 className="font-bold text-sm">ปรับสถานะสมาชิก / การตรวจสอบ</h3>
                <button
                  onClick={() => setIsStatusDialogOpen(false)}
                  className="zms-action text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">สมาชิกผู้มีสิทธิ์:</span>
                  <strong className="text-slate-900 block text-sm">{formatPersonName(selectedRegistry)}</strong>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] font-mono text-slate-500">รหัสสมาชิก: {getDisplayMemberCode(selectedRegistry)}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.bg || 'bg-slate-100'} ${REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.color || 'text-slate-700'} ${REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.border || 'border-slate-300'}`}>
                      สถานะปัจจุบัน: {REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.label || selectedRegistry.registrationStatus}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">เปลี่ยนเป็นสถานะ (ตามขั้นตอนที่กำหนด):</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as RegistrationStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    {(ALLOWED_NEXT_REGISTRATION_STATUSES[selectedRegistry.registrationStatus] || []).map((st) => (
                      <option key={st} value={st}>
                        {REGISTRATION_STATUS_LABELS[st].label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    ลำดับขั้นตอน: ร่าง → ตรวจสอบข้อมูล → มีคุณสมบัติตามเกณฑ์ / ไม่มีคุณสมบัติตามเกณฑ์ (หากต้องการเปลี่ยนผลการพิจารณา ให้นำกลับเข้า &ldquo;ตรวจสอบข้อมูล&rdquo; ก่อน)
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">เหตุผลประกอบการเปลี่ยนสถานะ *:</label>
                  <textarea
                    rows={3}
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="ระบุเหตุผลประกอบการปรับสถานะอย่างน้อย 2 ตัวอักษร..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs shrink-0">
                <button
                  onClick={() => setIsStatusDialogOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-white rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmStatusChange}
                  disabled={
                    isUpdatingStatus ||
                    statusNotes.trim().length < 2 ||
                    !(ALLOWED_NEXT_REGISTRATION_STATUSES[selectedRegistry.registrationStatus] || []).includes(newStatus)
                  }
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isUpdatingStatus ? 'กำลังบันทึก...' : 'ยืนยันเปลี่ยนสถานะ'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      {/* 7. Individual Registry Edit History Diff Modal */}
      <RegistryEditHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        beneficiaryName={historyTarget.name || (selectedRegistry ? formatPersonName(selectedRegistry) : '')}
        registrationNo={historyTarget.regNo || getDisplayMemberCode(selectedRegistry)}
        historyList={historyList}
        isLoading={isLoadingHistory}
      />
      {/* 8. Printable Receipt & Disbursement Voucher Modal */}
      <ReceiptPreviewModal
        isOpen={Boolean(selectedAidForReceipt)}
        onClose={() => setSelectedAidForReceipt(null)}
        application={selectedAidForReceipt}
        beneficiaryName={selectedRegistry ? formatPersonName(selectedRegistry) : ''}
        registrationNo={getDisplayMemberCode(selectedRegistry)}
      />

      {savePreview && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs">
            <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-[#0b2545] text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base">ยืนยันการบันทึกการแก้ไข</h3>
                    <p className="text-xs text-slate-200 mt-0.5">ตรวจรายการที่เปลี่ยนก่อนบันทึกลงฐานข้อมูล</p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                    savePreview.material 
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30' 
                      : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  }`}>
                    {savePreview.material ? 'มีข้อมูลกระทบคุณสมบัติ' : 'ข้อมูลทั่วไป'}
                  </span>
                </div>
              </div>

              <div className="p-4 overflow-y-auto text-xs space-y-3 flex-1">
                {savePreview.reviewed && savePreview.material && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      ข้อมูลนี้มีผลต่อคุณสมบัติ หลังบันทึกทะเบียนจะอยู่ในสถานะตรวจสอบข้อมูล ทั้งนี้ประวัติการช่วยเหลือและการเงินเดิมจะไม่ถูกแก้ไข
                    </p>
                  </div>
                )}

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-slate-600 font-semibold">
                        <th className="text-left py-2 px-3">รายการ</th>
                        <th className="text-left py-2 px-3">ประเภท</th>
                        <th className="text-left py-2 px-3">ค่าเดิม</th>
                        <th className="text-left py-2 px-3">ค่าใหม่</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {savePreview.changes.map((change, idx) => (
                        <tr key={`${change.field}-${idx}`} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{change.fieldLabel}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {change.material ? (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-1.5 py-0.5 rounded">กลุ่ม B (คุณสมบัติ)</span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded">กลุ่ม A (ทั่วไป)</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-rose-700 max-w-[120px] truncate" title={change.oldValue}>
                            {change.oldValue || 'ไม่มีข้อมูล'}
                          </td>
                          <td className="py-2 px-3 text-emerald-700 font-semibold max-w-[120px] truncate" title={change.newValue}>
                            {change.newValue || 'ไม่มีข้อมูล'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Inline Reason Editor in Preview Modal */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <span>เหตุผลการแก้ไขข้อมูล</span>
                      {savePreview.material && <span className="text-rose-600">*</span>}
                    </label>
                    <span className={`text-[11px] ${
                      savePreview.material && (savePreview.syncedForm?.editNotes || '').trim().length < 5
                        ? 'text-rose-600 font-bold'
                        : 'text-slate-500'
                    }`}>
                      {savePreview.material
                        ? `${(savePreview.syncedForm?.editNotes || '').trim().length}/5 ตัวอักษร`
                        : `${(savePreview.syncedForm?.editNotes || '').trim().length} ตัวอักษร (ไม่บังคับ)`}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={savePreview.syncedForm?.editNotes || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSavePreview({
                        ...savePreview,
                        syncedForm: { ...(savePreview.syncedForm || {}), editNotes: val },
                      });
                      setEditForm((prev: any) => ({ ...prev, editNotes: val }));
                      if (reasonError && (val.trim().length >= 5 || !savePreview.material)) {
                        setReasonError(null);
                      }
                    }}
                    placeholder={
                      savePreview.material
                        ? "ระบุเหตุผลในการแก้ไขข้อมูล เช่น ปรับปรุงรายได้ครัวเรือนให้เป็นปัจจุบันตามการลงพื้นที่สำรวจจริง (อย่างน้อย 5 ตัวอักษร)..."
                        : "ระบุเหตุผลหรือบันทึกช่วยจำ (ไม่บังคับ)..."
                    }
                    className={`w-full p-2 bg-white border rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      savePreview.material && (savePreview.syncedForm?.editNotes || '').trim().length < 5
                        ? 'border-rose-300 focus:ring-rose-300 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-emerald-500'
                    }`}
                  />
                  {savePreview.material && (savePreview.syncedForm?.editNotes || '').trim().length < 5 && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      การแก้ไขข้อมูลที่มีผลต่อคุณสมบัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร (เหลืออีก {5 - (savePreview.syncedForm?.editNotes || '').trim().length} ตัวอักษร)
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setSavePreview(null)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={isSaving || (savePreview.material && (savePreview.syncedForm?.editNotes || '').trim().length < 5)}
                  className="zms-action px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-xs"
                 aria-label="กำลังบันทึก..." title="กำลังบันทึก...">
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>ยืนยันบันทึก</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* 9. In-app Unsaved Changes Confirmation Modal (Replaces browser confirm) */}
      <ConfirmModal
        isOpen={showUnsavedConfirm}
        title="ละทิ้งการเปลี่ยนแปลงหรือไม่?"
        message="คุณกำลังแก้ไขข้อมูลทะเบียนอยู่ หากปิดหน้ารายละเอียดนี้ ข้อมูลที่คุณปรับปรุงจะสูญหาย ต้องการปิดโดยไม่บันทึกหรือไม่?"
        confirmLabel="ละทิ้งข้อมูล"
        cancelLabel="แก้ไขต่อ"
        variant="warning"
        onConfirm={() => {
          setShowUnsavedConfirm(false);
          setIsEditing(false);
          setSelectedRegistry(null);
        }}
        onCancel={() => setShowUnsavedConfirm(false)}
      />

      {/* 10. Super Admin Soft Delete Modal */}
      {softDeleteTarget && (
        <SoftDeleteModal
          beneficiaryId={softDeleteTarget.id}
          registryNumber={softDeleteTarget.registryNumber}
          fullName={softDeleteTarget.fullName}
          onClose={() => setSoftDeleteTarget(null)}
          onSuccess={() => {
            setSelectedRegistry(null);
            refreshData();
            setDeletedRefreshTrigger((prev) => prev + 1);
          }}
          showToast={showToast}
        />
      )}

      {/* 11. Super Admin Restore Modal */}
      {restoreTarget && (
        <RestoreModal
          beneficiaryId={restoreTarget.id}
          registryNumber={restoreTarget.registryNumber}
          fullName={restoreTarget.fullName}
          onClose={() => setRestoreTarget(null)}
          onSuccess={() => {
            refreshData();
            setDeletedRefreshTrigger((prev) => prev + 1);
          }}
          showToast={showToast}
        />
      )}

      {/* 12. Super Admin Beneficiary Audit Modal */}
      {auditTarget && (
        <BeneficiaryAuditModal
          beneficiaryId={auditTarget.id}
          registryNumber={auditTarget.registryNumber}
          fullName={auditTarget.fullName}
          onClose={() => setAuditTarget(null)}
        />
      )}

      {/* 13. 3-Step Assistance Request Wizard Modal (Single Source of Truth Overlay) */}
      <AssistanceRequestWizardModal
        isOpen={isAssistanceWizardOpen}
        beneficiaryId={activeAssistanceBeneficiaryId || undefined}
        onClose={() => {
          setIsAssistanceWizardOpen(false);
          setActiveAssistanceBeneficiaryId(null);
        }}
        onSuccess={(app) => {
          void refreshData();
          if (selectedRegistry) {
            setSelectedRegistry((prev) =>
              prev
                ? {
                    ...prev,
                    assistanceApplicationsCount: (prev.assistanceApplicationsCount || 0) + 1,
                  }
                : null
            );
          }
        }}
        onNavigate={onNavigate}
        onOpenRequestDetail={(appId) => {
          setIsAssistanceWizardOpen(false);
          setActiveAssistanceBeneficiaryId(null);
          if (onOpenAssistanceRequestDetail) {
            onOpenAssistanceRequestDetail(appId);
          } else {
            onNavigate('assistance-requests');
          }
        }}
      />

    </div>
  );
}
