'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formatPersonName, splitPersonName } from '@zms/shared';
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
  HeartHandshake
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

const MAIN_SECTIONS = [
  { id: 'member_info', label: '1. ข้อมูลสมาชิก', icon: User },
  { id: 'family', label: '2. ข้อมูลครอบครัว', icon: Users },
  { id: 'economy', label: '3. รายได้ รายจ่าย และหนี้สิน', icon: DollarSign },
  { id: 'limitations', label: '4. สภาพปัจจุบันและข้อจำกัด', icon: AlertTriangle },
  { id: 'documents', label: '5. เอกสารแนบ', icon: FileText },
  { id: 'assessments', label: '6. ประวัติการประเมินสิทธิ์', icon: ClipboardCheck },
  { id: 'requests', label: '7. ประวัติคำร้อง', icon: FilePlus2 },
  { id: 'aid_history', label: '8. ประวัติการช่วยเหลือ', icon: HeartHandshake },
] as const;

const MEMBER_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'สมาชิกปกติ', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  PENDING_VERIFICATION: { label: 'รอตรวจสอบสมาชิก', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  SUSPENDED: { label: 'ระงับสถานะสมาชิก', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
  ARCHIVED: { label: 'ปิดประวัติถาวร', cls: 'bg-slate-200 text-slate-700 border-slate-300' },
};

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
  pending_verification: { label: 'รอตรวจสอบข้อมูล', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  pending_survey: { label: 'รอลงพื้นที่สำรวจ', color: 'text-sky-800', bg: 'bg-sky-50', border: 'border-sky-200' },
  pending_qualification: { label: 'รอพิจารณาคุณสมบัติ', color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-200' },
  qualified: { label: 'มีคุณสมบัติตามเกณฑ์', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  disqualified: { label: 'ไม่มีคุณสมบัติตามเกณฑ์', color: 'text-rose-800', bg: 'bg-rose-50', border: 'border-rose-200' },
  need_more_info: { label: 'รอตรวจสอบใหม่', color: 'text-orange-800', bg: 'bg-orange-50', border: 'border-orange-200' },
  suspended: { label: 'ระงับหรือยกเลิกทะเบียน', color: 'text-slate-800', bg: 'bg-slate-200', border: 'border-slate-400' },
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
  const [registryViewMode, setRegistryViewMode] = useState<'active' | 'deleted'>('active');
  const [softDeleteTarget, setSoftDeleteTarget] = useState<{ id: string; registryNumber: string; fullName: string } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; registryNumber: string; fullName: string } | null>(null);
  const [auditTarget, setAuditTarget] = useState<{ id: string; registryNumber: string; fullName: string } | null>(null);
  const [deletedRefreshTrigger, setDeletedRefreshTrigger] = useState<number>(0);

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
  const [newStatus, setNewStatus] = useState<RegistrationStatus>('pending_verification');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  // 3-Step Assistance Request Wizard Modal state (Overlay directly over Beneficiary Registry)
  const [isAssistanceWizardOpen, setIsAssistanceWizardOpen] = useState<boolean>(false);
  const [activeAssistanceBeneficiaryId, setActiveAssistanceBeneficiaryId] = useState<string | null>(null);

  const handleStartAssistanceRequest = (beneficiaryId: string) => {
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
  const editBaseline = useRef<any>(null);

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
        registries.filter((r) => ['draft', 'pending_verification', 'pending_survey', 'pending_qualification', 'need_more_info'].includes(r.registrationStatus)).length,
      eligibleCount:
        activeStatsSource?.eligibleCount ??
        activeStatsSource?.separated?.eligibleCount ??
        registries.filter((r) => r.registrationStatus === 'qualified').length,
      ineligibleCount:
        activeStatsSource?.ineligibleCount ??
        activeStatsSource?.separated?.ineligibleCount ??
        registries.filter((r) => r.registrationStatus === 'disqualified').length,
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

      if (currentUser.role === 'member') {
        const isOwner =
          (item.memberId && item.memberId === currentUser.id) ||
          (currentUser.beneficiaryId && item.id === currentUser.beneficiaryId) ||
          (currentUser.nationalId && item.nationalId === currentUser.nationalId);
        if (!isOwner) return false;
      }

      return matchSearch && matchStatus && matchAsnaf && matchBranch && matchPeriod;
    });
  }, [registries, searchTerm, statusFilter, asnafFilter, branchFilter, assessmentPeriodFilter, currentUser]);

  // Pagination calculation
  const totalItems = filteredRegistries.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRegistries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRegistries.slice(start, start + pageSize);
  }, [filteredRegistries, currentPage, pageSize]);

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
  const handleStartEdit = async (mainSec: RegistryMainSection = 'member_info', personalSub?: PersonalSubTab) => {
    if (!selectedRegistry) return;
    if (!canEditRegistry(selectedRegistry)) {
      showToast('ท่านไม่มีสิทธิ์แก้ไขข้อมูลทะเบียนนี้', 'error');
      return;
    }
    const fresh = await loadRegistryDetail(selectedRegistry.id);
    const source = fresh || selectedRegistry;
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
  };

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
    if (reviewed && material && String(editForm.editNotes || '').trim().length < 5) {
      showToast('การแก้ไขข้อมูลที่มีผลต่อคุณสมบัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร', 'error');
      return;
    }
    setSavePreview({ changes, material, reviewed, syncedForm });
  };

  const handleConfirmSave = async () => {
    if (!selectedRegistry || !savePreview) return;
    const formToSave = savePreview.syncedForm || editForm;
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

      const ok = await updateBeneficiaryRegistry(selectedRegistry.id, payload, formToSave.editNotes);
      if (ok) {
        await loadRegistryDetail(selectedRegistry.id);
        setIsEditing(false);
        setSavePreview(null);
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
    setSelectedRegistry(reg);
    setNewStatus(reg.registrationStatus);
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
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors min-h-[40px]"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            onClick={() => onNavigate('new-application')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs min-h-[40px]"
          >
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">2. รอประเมิน</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-amber-800 mt-1.5 font-mono">{summaryMetrics.pendingAssessments}</div>
            <div className="text-[11px] text-slate-500">รอประเมิน/ตรวจสอบสิทธิ์</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">3. ผ่านเกณฑ์</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-800 mt-1.5 font-mono">{summaryMetrics.eligibleCount}</div>
            <div className="text-[11px] text-slate-500">มีสิทธิ์รับซะกาตตามเกณฑ์</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-rose-200/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">4. ไม่ผ่านเกณฑ์</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-extrabold text-rose-800 mt-1.5 font-mono">{summaryMetrics.ineligibleCount}</div>
            <div className="text-[11px] text-slate-500">ไม่ผ่านเกณฑ์ในรอบที่เลือก</div>
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              registryViewMode === 'deleted'
                ? 'bg-red-700 text-white shadow-xs'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
        </div>
      </div>

      {/* 3. Member Registry Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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

                      {/* Separated Member Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${memberMeta.cls}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{memberMeta.label}</span>
                        </span>
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
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b2545] hover:bg-slate-100 transition-colors"
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
                              className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 rounded-lg text-[10px] font-bold transition-colors"
                              title="ประเมินสิทธิ์ใหม่ (สร้างระเบียนประเมินใหม่โดยไม่สร้างทะเบียนบุคคลซ้ำ)"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5 text-teal-700" />
                              <span className="hidden xl:inline">ประเมินใหม่</span>
                            </button>
                          )}

                          {canEditRegistry(reg) && (
                            <button
                              onClick={() => {
                                handleOpenDetails(reg, 'member_info', 'info');
                                handleStartEdit('member_info', 'info');
                              }}
                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="แก้ไขข้อมูลสมาชิก"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleStartAssistanceRequest(reg.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 rounded-lg text-[10px] font-bold transition-colors"
                            title="ยื่นคำร้องขอความช่วยเหลือ"
                          >
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
                              className="p-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
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

        {/* Pagination bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            แสดง {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} ถึง {Math.min(currentPage * pageSize, totalItems)} จากสมาชิกทั้งหมด {totalItems} ราย
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800">
              หน้า {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
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
            className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-hidden"
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
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[94vh] max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden"
            >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0b2545] via-[#103463] to-[#133e6f] text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shrink-0 shadow-sm">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-semibold mb-1">
                  <span className="font-mono bg-white/15 px-2.5 py-0.5 rounded-md border border-amber-300/30 text-amber-200 font-bold">
                    รหัสสมาชิกถาวร: {getDisplayMemberCode(selectedRegistry)}
                  </span>
                  <span>•</span>
                  <span>วันที่ขึ้นทะเบียน: {selectedRegistry.registeredDate ? new Date(selectedRegistry.registeredDate).toLocaleDateString('th-TH') : '-'}</span>
                  <span>•</span>
                  <span className="text-slate-200">สาขา: {selectedRegistry.branchName || 'สำนักงานกลาง'}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="beneficiary-detail-title" className="text-lg sm:text-2xl font-black text-white tracking-tight">
                    {formatPersonName(selectedRegistry)}
                  </h2>
                  {/* Separated Member Status Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    (MEMBER_STATUS_LABELS[String(selectedRegistry.memberStatus || 'ACTIVE').toUpperCase()] || MEMBER_STATUS_LABELS.ACTIVE).cls
                  }`}>
                    {(MEMBER_STATUS_LABELS[String(selectedRegistry.memberStatus || 'ACTIVE').toUpperCase()] || MEMBER_STATUS_LABELS.ACTIVE).label}
                  </span>
                  {/* Separated Latest Assessment Status Badge */}
                  {(() => {
                    const latest = memberAssessments[0] || selectedRegistry.latestAssessment;
                    const meta = latest
                      ? getAssessmentStatusMeta(latest.status)
                      : {
                          label: REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.label || 'รอประเมินสิทธิ์',
                          cls: 'bg-amber-100 text-amber-800 border-amber-300',
                        };
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.cls}`}>
                        ประเมินล่าสุด: {meta.label}
                        {latest?.assessmentNumber ? ` (${latest.assessmentNumber})` : ''}
                      </span>
                    );
                  })()}
                </div>

                <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-1.5">
                  <span>บัตร ปชช: {selectedRegistry.nationalIdMasked}</span>
                  <span>•</span>
                  <span>โทร: {selectedRegistry.phone || '-'}</span>
                  <span>•</span>
                  <span>{selectedRegistry.community || selectedRegistry.subdistrict}, {selectedRegistry.district}, {selectedRegistry.province}</span>
                </div>
              </div>

              {/* 4 Required Primary Action Buttons (Section 8) + Secondary Tools */}
              <div className="flex flex-wrap items-center gap-2">
                {!isEditing ? (
                  <>
                    {/* 1. แก้ไขข้อมูลสมาชิก */}
                    {canEditRegistry(selectedRegistry) && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeMainSection)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>แก้ไขข้อมูลสมาชิก</span>
                      </button>
                    )}

                    {/* 2. ประเมินสิทธิ์ใหม่ */}
                    {canPerformAssessment && (
                      <button
                        type="button"
                        onClick={() => setIsPeriodicAssessmentModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-xl text-xs transition-colors shadow-sm"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5 text-slate-950" />
                        <span>ประเมินสิทธิ์ใหม่</span>
                      </button>
                    )}

                    {/* 3. ยื่นคำร้องขอความช่วยเหลือ */}
                    <button
                      type="button"
                      onClick={() => handleStartAssistanceRequest(selectedRegistry.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>ยื่นคำร้องขอความช่วยเหลือ</span>
                    </button>

                    {/* 4. ดูประวัติการประเมิน */}
                    <button
                      type="button"
                      onClick={() => setActiveMainSection('assessments')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs transition-colors border border-white/15"
                    >
                      <History className="w-3.5 h-3.5 text-emerald-300" />
                      <span>ดูประวัติการประเมิน ({memberAssessments.length || selectedRegistry.assessmentCount || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        window.location.assign(`/beneficiaries/${selectedRegistry.id}/print`);
                      }}
                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs transition-colors border border-white/10"
                      title="พิมพ์เอกสารแบบสำรวจสมาชิก"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenHistoryModal(selectedRegistry.id)}
                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs transition-colors border border-white/10"
                      title="ดูประวัติการแก้ไขข้อมูลรายฟิลด์ (Audit Trail)"
                    >
                      <FileCheck2 className="w-4 h-4 text-amber-300" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl text-xs transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>ยกเลิก</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition-colors shadow-md disabled:opacity-50"
                    >
                      {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      setShowUnsavedConfirm(true);
                    } else {
                      setSelectedRegistry(null);
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-colors border border-white/15"
                  title="ปิดหน้ารายละเอียดสมาชิก"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">กลับ</span>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Dropdown (< md) */}
            <div className="md:hidden p-2.5 bg-slate-100 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 shrink-0">ส่วนข้อมูล (8 หมวด):</span>
                <select
                  value={activeMainSection}
                  onChange={(e) => {
                    const sec = e.target.value as RegistryMainSection;
                    setActiveMainSection(sec);
                  }}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-[#0b2545]"
                >
                  {MAIN_SECTIONS.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 8-Section Navigation Tabs Bar (Master Requirement Section 8) */}
            <div className="border-b border-slate-200 bg-slate-50 px-3 sm:px-4 flex items-center gap-1 overflow-x-auto text-xs font-semibold shrink-0 no-scrollbar touch-scroll">
              {MAIN_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeMainSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveMainSection(sec.id as RegistryMainSection)}
                    className={`flex items-center gap-1.5 py-3 px-3 border-b-2 font-bold whitespace-nowrap transition-all text-xs ${
                      isActive
                        ? 'border-emerald-600 text-emerald-800 bg-emerald-50/70 shadow-2xs'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body Container with 8 Required Sections */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60">
              {/* 1. ข้อมูลสมาชิก (ข้อมูลบุคคลและที่อยู่ + พิกัดแผนที่ + ผู้ประสานงาน/ผู้รับรอง + สถานะสมาชิก) */}
              {activeMainSection === 'member_info' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 flex-wrap bg-white p-2 rounded-xl border border-slate-200 text-xs">
                    {[
                      { id: 'info', label: 'ข้อมูลบุคคลและที่อยู่อาศัย' },
                      { id: 'location', label: 'พิกัดบ้านและแผนที่ Google Maps' },
                      { id: 'coordinator', label: 'ผู้ประสานงานและผู้รับรอง' },
                      { id: 'status', label: 'สถานะสมาชิกและประวัติสถานะ' },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setMemberInfoSubTab(sub.id as any)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                          memberInfoSubTab === sub.id
                            ? 'bg-[#0b2545] text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  {memberInfoSubTab === 'info' && (
                    <PersonalSection
                      registry={selectedRegistry}
                      isEditing={isEditing}
                      editForm={editForm}
                      setEditForm={setEditForm}
                      canEdit={canEditRegistry(selectedRegistry)}
                      onStartEdit={(subSec) => {
                        if (subSec === 'household') handleStartEdit('family', 'household');
                        else if (subSec === 'economy') handleStartEdit('economy', 'economy');
                        else if (subSec === 'limitations' || subSec === 'other_aid') handleStartEdit('limitations', subSec);
                        else handleStartEdit('member_info', 'info');
                      }}
                      activeSubTab="info"
                      setActiveSubTab={(sub) => {
                        if (sub === 'household') setActiveMainSection('family');
                        else if (sub === 'economy') setActiveMainSection('economy');
                        else if (sub === 'limitations' || sub === 'other_aid') {
                          setLimitationsSubTab(sub);
                          setActiveMainSection('limitations');
                        }
                      }}
                      asnafLabels={ASNAF_LABELS}
                      canViewUnmaskedId={['super_admin', 'approver', 'officer'].includes(currentUser.role)}
                    />
                  )}

                  {memberInfoSubTab === 'location' && (
                    <LocationSection
                      registry={selectedRegistry}
                      canEdit={canEditRegistry(selectedRegistry)}
                      onSaveLocationDirectly={handleSaveLocationDirectly}
                      isSavingLocation={isSavingLocationDirectly}
                    />
                  )}

                  {memberInfoSubTab === 'coordinator' && (
                    <CoordinatorSection
                      registry={selectedRegistry}
                      isEditing={isEditing}
                      editForm={editForm}
                      setEditForm={setEditForm}
                      canEdit={canEditRegistry(selectedRegistry)}
                      onStartEdit={() => {
                        setMemberInfoSubTab('coordinator');
                        handleStartEdit('coordinator');
                      }}
                    />
                  )}

                  {memberInfoSubTab === 'status' && (
                    <StatusSection
                      registry={selectedRegistry}
                      statusLabels={REGISTRATION_STATUS_LABELS}
                      canEdit={canEditRegistry(selectedRegistry)}
                      onOpenStatusDialog={() => handleOpenStatusDialog(selectedRegistry)}
                      onOpenHistoryModal={() => handleOpenHistoryModal(selectedRegistry.id)}
                      onSaveChecklist={handleSaveChecklist}
                      isSavingChecklist={isSavingChecklist}
                    />
                  )}
                </div>
              )}

              {/* 2. ข้อมูลครอบครัว */}
              {activeMainSection === 'family' && (
                <PersonalSection
                  registry={selectedRegistry}
                  isEditing={isEditing}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onStartEdit={() => handleStartEdit('family', 'household')}
                  activeSubTab="household"
                  setActiveSubTab={(sub) => {
                    if (sub === 'info') setActiveMainSection('member_info');
                    else if (sub === 'economy') setActiveMainSection('economy');
                    else if (sub === 'limitations' || sub === 'other_aid') {
                      setLimitationsSubTab(sub);
                      setActiveMainSection('limitations');
                    }
                  }}
                  asnafLabels={ASNAF_LABELS}
                  canViewUnmaskedId={['super_admin', 'approver', 'officer'].includes(currentUser.role)}
                />
              )}

              {/* 3. รายได้ รายจ่าย และหนี้สิน */}
              {activeMainSection === 'economy' && (
                <PersonalSection
                  registry={selectedRegistry}
                  isEditing={isEditing}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onStartEdit={() => handleStartEdit('economy', 'economy')}
                  activeSubTab="economy"
                  setActiveSubTab={(sub) => {
                    if (sub === 'info') setActiveMainSection('member_info');
                    else if (sub === 'household') setActiveMainSection('family');
                    else if (sub === 'limitations' || sub === 'other_aid') {
                      setLimitationsSubTab(sub);
                      setActiveMainSection('limitations');
                    }
                  }}
                  asnafLabels={ASNAF_LABELS}
                  canViewUnmaskedId={['super_admin', 'approver', 'officer'].includes(currentUser.role)}
                />
              )}

              {/* 4. สภาพปัจจุบันและข้อจำกัด */}
              {activeMainSection === 'limitations' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setLimitationsSubTab('limitations')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        limitationsSubTab === 'limitations' ? 'bg-[#0b2545] text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      สภาพปัญหาและข้อจำกัดปัจจุบัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setLimitationsSubTab('other_aid')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        limitationsSubTab === 'other_aid' ? 'bg-[#0b2545] text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      ความช่วยเหลือจากหน่วยงานภายนอก
                    </button>
                  </div>

                  <PersonalSection
                    registry={selectedRegistry}
                    isEditing={isEditing}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    canEdit={canEditRegistry(selectedRegistry)}
                    onStartEdit={() => handleStartEdit('limitations', limitationsSubTab)}
                    activeSubTab={limitationsSubTab}
                    setActiveSubTab={(sub) => {
                      if (sub === 'info') setActiveMainSection('member_info');
                      else if (sub === 'household') setActiveMainSection('family');
                      else if (sub === 'economy') setActiveMainSection('economy');
                      else if (sub === 'limitations' || sub === 'other_aid') setLimitationsSubTab(sub);
                    }}
                    asnafLabels={ASNAF_LABELS}
                    canViewUnmaskedId={['super_admin', 'approver', 'officer'].includes(currentUser.role)}
                  />
                </div>
              )}

              {/* 5. เอกสารแนบ */}
              {activeMainSection === 'documents' && (
                <DocumentsSection
                  registry={selectedRegistry}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onRefreshRegistry={async () => {
                    await loadRegistryDetail(selectedRegistry.id);
                  }}
                  onDocumentsUploaded={async () => {
                    await loadRegistryDetail(selectedRegistry.id);
                  }}
                />
              )}

              {/* 6. ประวัติการประเมินสิทธิ์ */}
              {activeMainSection === 'assessments' && (
                <AssessmentHistorySection
                  registry={selectedRegistry}
                  assessments={memberAssessments}
                  isLoading={isLoadingAssessments}
                  canAssess={canPerformAssessment}
                  canApprove={canApproveAssessment}
                  authToken={authToken}
                  onOpenNewAssessment={() => setIsPeriodicAssessmentModalOpen(true)}
                  onRefreshAssessments={async () => {
                    await Promise.all([
                      loadMemberAssessments(selectedRegistry.id),
                      loadRegistryDetail(selectedRegistry.id),
                      refreshData(),
                    ]);
                  }}
                  showToast={showToast}
                />
              )}

              {/* 7. ประวัติคำร้อง */}
              {activeMainSection === 'requests' && (
                <MemberRequestsSection
                  registry={selectedRegistry}
                  contextApplications={applications}
                  authToken={authToken}
                  canCreateRequest={true}
                  onOpenCreateRequest={() => handleStartAssistanceRequest(selectedRegistry.id)}
                  onNavigateToRequests={(reqId) => {
                    setSelectedRegistry(null);
                    if (onOpenAssistanceRequestDetail && reqId) {
                      onOpenAssistanceRequestDetail(reqId);
                    } else {
                      onNavigate('assistance-requests');
                    }
                  }}
                />
              )}

              {/* 8. ประวัติการช่วยเหลือ */}
              {activeMainSection === 'aid_history' && (
                <AssistanceHistorySection
                  registry={selectedRegistry}
                  applications={applications}
                  onOpenReceiptModal={(app) => setSelectedAidForReceipt(app)}
                  onOpenNewAssistanceDialog={() => handleStartAssistanceRequest(selectedRegistry.id)}
                  canEdit={canEditRegistry(selectedRegistry)}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-[#0b2545]">
                      {getDisplayMemberCode(selectedRegistry)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">หมวดปัจจุบัน:</span>
                    <span className="font-bold text-slate-800">
                      {MAIN_SECTIONS.find((s) => s.id === activeMainSection)?.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canEditRegistry(selectedRegistry) && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeMainSection)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>แก้ไขข้อมูลสมาชิก</span>
                      </button>
                    )}

                    {canPerformAssessment && (
                      <button
                        type="button"
                        onClick={() => setIsPeriodicAssessmentModalOpen(true)}
                        className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>ประเมินสิทธิ์ใหม่</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleStartAssistanceRequest(selectedRegistry.id)}
                      className="px-4 py-2 bg-[#0b2545] hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <FilePlus2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ยื่นคำร้องขอความช่วยเหลือ</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-[200px] space-y-1">
                    {registryNeedsReReview(selectedRegistry.registrationStatus) && (
                      <p className="text-[11px] text-amber-800 font-semibold">
                        การแก้ไขข้อมูลปัจจุบันของสมาชิกจะไม่กระทบ Snapshot ของประวัติการประเมินสิทธิ์ย้อนหลัง
                      </p>
                    )}
                    <input
                      type="text"
                      value={editForm.editNotes || ''}
                      onChange={(e) => setEditForm({ ...editForm, editNotes: e.target.value })}
                      placeholder="ระบุเหตุผล/หมายเหตุการแก้ไขข้อมูลสมาชิก (เช่น: อัปเดตรายได้ปัจจุบัน, ปรับปรุงที่อยู่ใหม่)..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                    >
                      ยกเลิกการแก้ไข
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors shadow-md disabled:opacity-50 flex items-center gap-1.5"
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
                  className="text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">สมาชิกผู้มีสิทธิ์:</span>
                  <strong className="text-slate-900 block text-sm">{formatPersonName(selectedRegistry)}</strong>
                  <span className="text-[11px] font-mono text-slate-500">รหัสสมาชิก: {getDisplayMemberCode(selectedRegistry)}</span>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">เลือกสถานะ:</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as RegistrationStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    {(Object.keys(REGISTRATION_STATUS_LABELS) as RegistrationStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {REGISTRATION_STATUS_LABELS[st].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">เหตุผลประกอบการเปลี่ยนสถานะ *:</label>
                  <textarea
                    rows={3}
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="ระบุเหตุผลประกอบการปรับสถานะ..."
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
                  disabled={isUpdatingStatus || !statusNotes.trim()}
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
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 bg-slate-950/60">
            <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden">
              <div className="p-4 bg-[#0b2545] text-white">
                <h3 className="font-bold">ยืนยันการบันทึกการแก้ไข</h3>
                <p className="text-xs text-slate-200 mt-1">ตรวจรายการที่เปลี่ยนก่อนบันทึกลงฐานข้อมูล</p>
              </div>
              <div className="p-4 overflow-y-auto text-xs space-y-2">
                {savePreview.reviewed && savePreview.material && (
                  <p className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    ข้อมูลนี้มีผลต่อคุณสมบัติ หลังบันทึกทะเบียนจะอยู่ในสถานะรอตรวจสอบใหม่ ประวัติการช่วยเหลือและการเงินเดิมจะไม่ถูกแก้ไข
                  </p>
                )}
                <table className="w-full">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left py-1">รายการ</th>
                      <th className="text-left py-1">ค่าเดิม</th>
                      <th className="text-left py-1">ค่าใหม่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savePreview.changes.map((change, idx) => (
                      <tr key={`${change.field}-${idx}`} className="border-t border-slate-100">
                        <td className="py-1.5 pr-2 font-semibold">{change.fieldLabel}</td>
                        <td className="py-1.5 pr-2 text-rose-800">{change.oldValue || 'ไม่มีข้อมูล'}</td>
                        <td className="py-1.5 text-emerald-800 font-semibold">{change.newValue || 'ไม่มีข้อมูล'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={() => setSavePreview(null)} disabled={isSaving} className="px-3 py-2 border border-slate-300 rounded-xl">ยกเลิก</button>
                <button type="button" onClick={handleConfirmSave} disabled={isSaving} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50">
                  {isSaving ? 'กำลังบันทึก...' : 'ยืนยันบันทึก'}
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
