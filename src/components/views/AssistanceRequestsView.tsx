'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  AssistanceApplication, 
  ApplicationStatus, 
  AsnafCategory,
  AssistanceTypeItem,
  FaqirMiskinSubFund,
  AsnafAllocation
} from '@/types';
import { formatPersonName } from '@zms/shared';
import { normalizePrimaryGroupCode } from '@/lib/financeUtils';
import { DocumentListTable } from '@/components/common/DocumentListTable';
import { ModalPortal, lockBodyScroll, unlockBodyScroll } from '@/components/common/Modal';
import { AssistanceRequestFormModal } from '@/components/views/assistance/AssistanceRequestFormModal';
import { 
  Search, 
  Filter, 
  Plus, 
  ArrowRightLeft,
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
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  Wallet,
  UserPlus,
  GraduationCap,
  Wrench,
  HeartHandshake,
  Navigation,
  Receipt as ReceiptIcon,
  Sparkles,
  Package,
  Ban,
  Lock,
  ExternalLink
} from 'lucide-react';

interface AssistanceRequestsViewProps {
  onNavigate: (view: string) => void;
  initialStatusFilter?: string;
  selectedRequestId?: string;
  onClearSelectedRequestId?: () => void;
  initialBeneficiaryId?: string;
  onClearInitialBeneficiaryId?: () => void;
  onOpenMemberDetail?: (
    beneficiaryId: string,
    startEdit?: boolean,
    targetSection?: 'member_info' | 'requests'
  ) => void;
}

// 9-step Workflow Status Definitions mandated by Prompt Section 5
const WORKFLOW_STEPS: { 
  step: number; 
  status: ApplicationStatus; 
  label: string; 
  desc: string; 
  color: string; 
  bg: string; 
  border: string 
}[] = [
  { step: 1, status: 'submitted', label: '1. รอตรวจสอบคำร้อง', desc: 'ยื่นคำร้องเข้าระบบ', color: 'text-sky-800', bg: 'bg-sky-50', border: 'border-sky-200' },
  { step: 2, status: 'doc_review', label: '2. กำลังตรวจสอบข้อมูล', desc: 'ตรวจเอกสารและความครบถ้วน', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  { step: 3, status: 'field_inspection', label: '3. รอลงพื้นที่ประเมิน', desc: 'ลงพื้นที่ & ประเมินสิทธิ์', color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-200' },
  { step: 4, status: 'pending_approval', label: '4. รอพิจารณาอนุมัติ', desc: 'รอคณะกรรมการอนุมัติ', color: 'text-indigo-800', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { step: 5, status: 'approved', label: '5. อนุมัติ', desc: 'ผ่านการอนุมัติวงเงิน', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { step: 6, status: 'rejected', label: '6. ไม่อนุมัติ', desc: 'ไม่ผ่านเกณฑ์การพิจารณา', color: 'text-red-800', bg: 'bg-red-50', border: 'border-red-200' },
  { step: 7, status: 'wait_disbursement', label: '7. กำลังดำเนินการช่วยเหลือ', desc: 'รอฝ่ายการเงินจ่ายเงิน/มอบสิ่งของ', color: 'text-teal-800', bg: 'bg-teal-50', border: 'border-teal-200' },
  { step: 8, status: 'disbursed', label: '8. ดำเนินการเสร็จสิ้น', desc: 'ช่วยเหลือเรียบร้อย', color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-300' },
  { step: 9, status: 'cancelled', label: '9. ยกเลิกคำร้อง', desc: 'ผู้ยื่นยกเลิกหรือระงับ', color: 'text-stone-700', bg: 'bg-stone-100', border: 'border-stone-300' },
];

const APPLICATION_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'ฉบับร่าง (Draft)', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  submitted: { label: '1. รอตรวจสอบคำร้อง', color: 'text-sky-800', bg: 'bg-sky-50', border: 'border-sky-200' },
  doc_review: { label: '2. กำลังตรวจสอบข้อมูล', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  need_info: { label: 'ขอเอกสารเพิ่มเติม', color: 'text-orange-800', bg: 'bg-orange-50', border: 'border-orange-200' },
  field_inspection: { label: '3. รอลงพื้นที่ประเมิน', color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-200' },
  assessment: { label: '3. รอลงพื้นที่ประเมิน', color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-200' },
  pending_approval: { label: '4. รอพิจารณาอนุมัติ', color: 'text-indigo-800', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  approved: { label: '5. อนุมัติ', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  rejected: { label: '6. ไม่อนุมัติ', color: 'text-red-800', bg: 'bg-red-50', border: 'border-red-200' },
  wait_disbursement: { label: '7. กำลังดำเนินการช่วยเหลือ', color: 'text-teal-800', bg: 'bg-teal-50', border: 'border-teal-200' },
  disbursed: { label: '8. ดำเนินการเสร็จสิ้น', color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-300' },
  closed: { label: '8. ดำเนินการเสร็จสิ้น (ปิดคำร้อง)', color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-300' },
  cancelled: { label: '9. ยกเลิกคำร้อง', color: 'text-stone-700', bg: 'bg-stone-100', border: 'border-stone-300' },
};

const ASSISTANCE_FORMAT_LABELS: Record<string, string> = {
  cash: 'เงินสด / โอนเงิน',
  in_kind: 'สิ่งของ / อุปกรณ์',
  mixed: 'ผสมผสาน (เงินและสิ่งของ)',
  monthly: 'เงินอุดหนุนรายเดือน',
  one_time: 'ช่วยเหลือรายครั้ง',
};

export function AssistanceRequestsView({ 
  onNavigate, 
  initialStatusFilter = 'all',
  selectedRequestId,
  onClearSelectedRequestId,
  initialBeneficiaryId,
  onClearInitialBeneficiaryId,
  onOpenMemberDetail,
}: AssistanceRequestsViewProps) {
  const { 
    applications, 
    registries, 
    currentUser, 
    authToken,
    funds,
    updateApplication,
    updateApplicationStatus, 
    approveApplication, 
    rejectApplication, 
    executeDisbursement, 
    showToast, 
    refreshData,
    isLoading 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [orgBranches, setOrgBranches] = useState<{ id: string; code: string; name: string; status: string }[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    fetch('/api/organization/structure')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.branches) {
          setOrgBranches(json.data.branches);
        }
      })
      .catch((err) => console.error('Failed to load branches for assistance filter:', err));
  }, []);

  // Unified Assistance Request Form Modal state (Single Source of Truth)
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(Boolean(initialBeneficiaryId));
  const [wizardBeneficiaryId, setWizardBeneficiaryId] = useState<string | undefined>(initialBeneficiaryId);

  // Live 3-Tier Fund & Assistance Type Hierarchy (fetched from DB, activeOnly=true)
  const [hierarchyGroups, setHierarchyGroups] = useState<AsnafAllocation[]>([]);
  const [, setIsLoadingHierarchy] = useState<boolean>(false);

  const loadActiveHierarchy = useCallback(async () => {
    setIsLoadingHierarchy(true);
    try {
      const r = await fetch('/api/finance/allocations/asnaf?view=hierarchy&year=2569&activeOnly=true');
      const json = await r.json();
      if (json.success && Array.isArray(json.data?.primaryGroups)) {
        setHierarchyGroups(json.data.primaryGroups);
      }
    } catch (err) {
      console.error('Failed to load active 3-tier fund hierarchy:', err);
    } finally {
      setIsLoadingHierarchy(false);
    }
  }, []);

  useEffect(() => {
    loadActiveHierarchy();
  }, [loadActiveHierarchy]);

  // Filter Primary Groups to those that are active and contain >=1 active Specific Fund with >=1 active Assistance Type
  const eligiblePrimaryGroups = useMemo(() => {
    return hierarchyGroups
      .filter((pg) => pg.isActive !== false)
      .map((pg) => ({
        ...pg,
        specificFunds: (pg.specificFunds || [])
          .filter((sf) => sf.isActive)
          .map((sf) => ({
            ...sf,
            assistanceTypes: (sf.assistanceTypes || []).filter((ast) => ast.isActive),
          }))
          .filter((sf) => (sf.assistanceTypes || []).length > 0),
      }))
      .filter((pg) => (pg.specificFunds || []).length > 0);
  }, [hierarchyGroups]);

  // Flat list of all active Assistance Types from DB for top table filter
  const allActiveAssistanceTypes = useMemo(() => {
    const list: (AssistanceTypeItem & { specificFundName: string; primaryGroupName: string })[] = [];
    for (const pg of eligiblePrimaryGroups) {
      for (const sf of pg.specificFunds || []) {
        for (const ast of sf.assistanceTypes || []) {
          list.push({
            ...ast,
            specificFundName: sf.name,
            primaryGroupName: pg.asnafName,
          });
        }
      }
    }
    return list;
  }, [eligiblePrimaryGroups]);

  // Pre-approval classification edit state (for authorized staff only)
  const [isEditingClassification, setIsEditingClassification] = useState<boolean>(false);
  const [editPrimaryCode, setEditPrimaryCode] = useState<string>('');
  const [editSpecificFundId, setEditSpecificFundId] = useState<string>('');
  const [editAssistanceTypeId, setEditAssistanceTypeId] = useState<string>('');
  const [editRequestedAmount, setEditRequestedAmount] = useState<number>(0);
  const [isSavingClassification, setIsSavingClassification] = useState<boolean>(false);

  const editPrimaryGroupObj = useMemo(
    () => eligiblePrimaryGroups.find((pg) => pg.asnafCode === editPrimaryCode) || null,
    [eligiblePrimaryGroups, editPrimaryCode]
  );
  const editAvailableSpecificFunds = useMemo(
    () => editPrimaryGroupObj?.specificFunds || [],
    [editPrimaryGroupObj]
  );
  const editSpecificFundObj = useMemo(
    () => editAvailableSpecificFunds.find((sf) => sf.id === editSpecificFundId) || null,
    [editAvailableSpecificFunds, editSpecificFundId]
  );
  const editAvailableAssistanceTypes = useMemo(
    () => editSpecificFundObj?.assistanceTypes || [],
    [editSpecificFundObj]
  );

  // Cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Modal application detail
  const [selectedApp, setSelectedApp] = useState<AssistanceApplication | null>(
    selectedRequestId ? applications.find((a) => a.id === selectedRequestId) || null : null
  );

  // Helper to fetch live PostgreSQL detail for any application (including separated registryDocuments & documents)
  const openApplicationDetail = useCallback(
    async (appOrId: AssistanceApplication | string, fallbackRaw?: any) => {
      const targetId = typeof appOrId === 'string' ? appOrId : appOrId.id;
      if (typeof appOrId !== 'string') {
        setSelectedApp(appOrId);
      } else {
        const inList = applications.find((a) => a.id === targetId || a.applicationNo === targetId);
        if (inList) {
          setSelectedApp(inList);
        } else if (fallbackRaw) {
          setSelectedApp(fallbackRaw as AssistanceApplication);
        }
      }

      try {
        const token =
          authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
        const headers: Record<string, string> = {};
        if (token && token !== 'cookie-session') {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`/api/assistance-requests/${encodeURIComponent(targetId)}`, {
          headers,
          credentials: 'include',
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success && json.data) {
          const item = json.data;
          setSelectedApp((prev) => ({
            ...(prev || {}),
            ...item,
            fullName: item.fullName || item.beneficiary?.fullName || prev?.fullName || '',
            nationalIdMasked:
              item.nationalIdMasked || item.beneficiary?.identityNumberMasked || prev?.nationalIdMasked || '',
            phone: item.phone || item.beneficiary?.phone || prev?.phone || '',
            address: item.address || prev?.address || '',
            province: item.province || prev?.province || '',
            district: item.district || prev?.district || '',
            community: item.community || prev?.community || '',
            householdMembers: Array.isArray(item.householdMembers) ? item.householdMembers : [],
            documents: Array.isArray(item.documents) ? item.documents : prev?.documents || [],
            registryDocuments: Array.isArray(item.registryDocuments) ? item.registryDocuments : [],
            statusHistory: Array.isArray(item.statusHistory)
              ? item.statusHistory
              : prev?.statusHistory || [],
          }));
        }
      } catch {
        // Keep existing selectedApp state if legacy SQLite ID
      }
    },
    [applications, authToken]
  );

  // Auto-open shared AssistanceRequestFormModal when navigated from Beneficiary Master Registry (Entry Point 2)
  useEffect(() => {
    if (!initialBeneficiaryId) return;
    onNavigate('new-assistance-request');
    if (onClearInitialBeneficiaryId) {
      onClearInitialBeneficiaryId();
    }
  }, [initialBeneficiaryId, loadActiveHierarchy, onClearInitialBeneficiaryId]);

  // Auto-open Request Detail Modal when selectedRequestId is passed from Member Detail / Dashboard
  useEffect(() => {
    if (!selectedRequestId) return;
    void openApplicationDetail(selectedRequestId);
    if (onClearSelectedRequestId) {
      onClearSelectedRequestId();
    }
  }, [selectedRequestId, openApplicationDetail, onClearSelectedRequestId]);

  // Task 2: Linked Financial Handover Data State
  const [linkedFinanceData, setLinkedFinanceData] = useState<any>(null);

  useEffect(() => {
    if (selectedApp) {
      fetch(`/api/finance/assistance-link?applicationId=${selectedApp.id}&actorId=${currentUser.id}&actorName=${encodeURIComponent(currentUser.name)}&actorRole=${currentUser.role}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) setLinkedFinanceData(json.data);
          else setLinkedFinanceData(null);
        })
        .catch(() => setLinkedFinanceData(null));
    } else {
      setLinkedFinanceData(null);
    }
  }, [selectedApp, currentUser]);

  // Approval & Rejection dialogs
  const [showApprovalDialog, setShowApprovalDialog] = useState<boolean>(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState<boolean>(false);
  const [showDisburseDialog, setShowDisburseDialog] = useState<boolean>(false);
  const [approvalAmount, setApprovalAmount] = useState<number>(10000);
  const [selectedFundId, setSelectedFundId] = useState<string>(funds[0]?.id || 'fund-1');
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('/receipts/slip-demo.pdf');

  // Phase 10: Fund Solvency Pre-check & GL Details State
  const [solvencyCheck, setSolvencyCheck] = useState<any>(null);
  const [isCheckingSolvency, setIsCheckingSolvency] = useState<boolean>(false);
  const [appLedgerDetails, setAppLedgerDetails] = useState<any>(null);

  // Live Solvency Pre-Check when approval dialog opens or amounts change
  useEffect(() => {
    if (!showApprovalDialog || !selectedApp) {
      setSolvencyCheck(null);
      return;
    }
    let isCancelled = false;
    setIsCheckingSolvency(true);
    fetch('/api/assistance-requests/check-fund-solvency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: selectedApp.id,
        approvedAmount: approvalAmount,
        fundId: selectedFundId,
        specificFundId: selectedApp.specificFundId,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!isCancelled && json.success) {
          setSolvencyCheck(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsCheckingSolvency(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [showApprovalDialog, selectedApp, approvalAmount, selectedFundId]);

  // Fetch full Financial Ledger Details when application detail opens
  useEffect(() => {
    if (!selectedApp) {
      setAppLedgerDetails(null);
      return;
    }
    let isCancelled = false;
    fetch(`/api/assistance-requests/${encodeURIComponent(selectedApp.id)}/financial-ledger`)
      .then((res) => res.json())
      .then((json) => {
        if (!isCancelled && json.success) {
          setAppLedgerDetails(json.data);
        }
      })
      .catch(() => {
        if (!isCancelled) setAppLedgerDetails(null);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedApp]);

  // Lock body scroll cleanly whenever any modal in this view is active
  const isAnyModalOpen = Boolean(
    selectedApp || 
    showApprovalDialog || 
    showRejectionDialog || 
    showDisburseDialog || 
    showCancelDialog || 
    isWizardOpen
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isAnyModalOpen]);

  // Entry Point 1: Open shared AssistanceRequestFormModal from Main Menu
  const handleOpenWizard = () => {
    onNavigate('new-assistance-request');
  };

  // Start editing 3-tier classification on an editable pre-approval application (staff only)
  const handleStartEditClassification = (app: AssistanceApplication) => {
    loadActiveHierarchy();
    const initPrimary = normalizePrimaryGroupCode(app.primaryGroupCode || app.asnafCategory || 'faqir_miskin');
    setEditPrimaryCode(initPrimary);
    setEditSpecificFundId(app.specificFundId || '');
    setEditAssistanceTypeId(app.assistanceTypeId || '');
    setEditRequestedAmount(Number(app.requestedAmount || 0));
    setIsEditingClassification(true);
  };

  const handleSaveClassificationEdit = async () => {
    if (!selectedApp || isSavingClassification) return;
    if (!editPrimaryCode || !editSpecificFundId || !editAssistanceTypeId) {
      showToast('กรุณาเลือกกลุ่มกองทุนหลัก กองทุนเฉพาะ และประเภทความช่วยเหลือให้ครบทั้ง 3 ระดับ', 'error');
      return;
    }
    if (!Number.isFinite(Number(editRequestedAmount)) || Number(editRequestedAmount) <= 0) {
      showToast('จำนวนเงินที่ขอรับต้องมากกว่า 0 บาท', 'error');
      return;
    }

    const editPg = eligiblePrimaryGroups.find((pg) => pg.asnafCode === editPrimaryCode);
    const editSf = editPg?.specificFunds?.find((sf) => sf.id === editSpecificFundId);
    const editAst = editSf?.assistanceTypes?.find((ast) => ast.id === editAssistanceTypeId);
    if (!editPg || !editSf || !editAst) {
      showToast('ข้อมูลกองทุนหรือประเภทความช่วยเหลือที่เลือกไม่สัมพันธ์กันหรือถูกปิดใช้งานแล้ว', 'error');
      return;
    }

    setIsSavingClassification(true);
    try {
      const ok = await updateApplication(selectedApp.id, {
        primaryGroupCode: editPrimaryCode,
        specificFundId: editSpecificFundId,
        assistanceTypeId: editAssistanceTypeId,
        assistanceType: editAst.name,
        requestedAmount: Number(editRequestedAmount),
      });
      if (ok) {
        setIsEditingClassification(false);
        setSelectedApp((prev) =>
          prev
            ? {
                ...prev,
                primaryGroupCode: editPrimaryCode,
                primaryGroupName: editPg.asnafName,
                specificFundId: editSf.id,
                specificFundCode: editSf.code,
                specificFundName: editSf.name,
                assistanceTypeId: editAst.id,
                assistanceTypeCode: editAst.code,
                assistanceType: editAst.name,
                requestedAmount: Number(editRequestedAmount),
              }
            : null
        );
      }
    } finally {
      setIsSavingClassification(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedApp) return;
    await updateApplicationStatus(selectedApp.id, 'cancelled', cancelReason || 'ขอยกเลิกคำร้อง');
    setShowCancelDialog(false);
    setSelectedApp((prev) => prev ? { ...prev, status: 'cancelled' } : null);
  };

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Member privacy: Members only see their own requests
      if (currentUser.role === 'member') {
        const isOwner =
          (app.memberId && app.memberId === currentUser.id) ||
          (currentUser.beneficiaryId && app.beneficiaryId === currentUser.beneficiaryId) ||
          (currentUser.nationalId && app.nationalId === currentUser.nationalId);
        if (!isOwner) return false;
      }

      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        app.fullName.toLowerCase().includes(term) ||
        app.applicationNo.toLowerCase().includes(term) ||
        (app.registrationNo && app.registrationNo.toLowerCase().includes(term)) ||
        (app.nationalId && app.nationalId.includes(term)) ||
        (app.nationalIdMasked && app.nationalIdMasked.includes(term)) ||
        app.phone.includes(term) ||
        app.community.toLowerCase().includes(term);

      const matchStatus = 
        statusFilter === 'all' || 
        app.status === statusFilter ||
        (statusFilter === 'pending' && ['submitted', 'doc_review', 'assessing', 'pending_approval'].includes(app.status)) ||
        (statusFilter === 'approved_group' && ['approved', 'wait_disbursement'].includes(app.status));

      const matchUrgency = urgencyFilter === 'all' || app.urgencyLevel === urgencyFilter;
      const matchType =
        typeFilter === 'all' ||
        app.assistanceTypeId === typeFilter ||
        app.assistanceType === typeFilter ||
        app.specificFundId === typeFilter;
      const matchBranch = branchFilter === 'all' || app.branchId === branchFilter || app.branchName === branchFilter;

      return matchSearch && matchStatus && matchUrgency && matchType && matchBranch;
    });
  }, [applications, searchTerm, statusFilter, urgencyFilter, typeFilter, branchFilter, currentUser]);

  // Pagination
  const totalItems = filteredApplications.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [filteredApplications, currentPage, pageSize]);

  // Lookup linked registry for active application
  const linkedRegistry = useMemo(() => {
    if (!selectedApp) return null;
    return registries.find((r) => 
      r.id === selectedApp.beneficiaryId || 
      (Boolean(selectedApp.registrationNo) && r.registrationNo === selectedApp.registrationNo) ||
      (Boolean(selectedApp.nationalId) && r.nationalId === selectedApp.nationalId)
    ) || null;
  }, [selectedApp, registries]);

  // Handle workflow step advance
  const handleAdvanceWorkflow = async (appId: string, nextStatus: ApplicationStatus, notes: string) => {
    await updateApplicationStatus(appId, nextStatus, notes);
    if (selectedApp && selectedApp.id === appId) {
      setSelectedApp((prev) => prev ? { ...prev, status: nextStatus } : null);
    }
  };

  // Handle Confirm Approval
  const handleConfirmApproval = async () => {
    if (!selectedApp) return;
    const ok = await approveApplication(
      selectedApp.id,
      approvalAmount,
      selectedFundId,
      approvalNotes || 'ผ่านการอนุมัติตามระเบียบ',
      selectedApp.specificFundId || 'subf-1'
    );
    if (ok) {
      setShowApprovalDialog(false);
      setSelectedApp((prev) => prev ? {
        ...prev,
        status: 'approved',
        approvedAmount: approvalAmount,
        approvedFundId: selectedFundId,
        approvedSpecificFundId: selectedApp.specificFundId || 'subf-1'
      } : null);
    }
  };

  // Handle Confirm Rejection
  const handleConfirmRejection = async () => {
    if (!selectedApp) return;
    const ok = await rejectApplication(selectedApp.id, rejectionReason || 'ไม่ผ่านเกณฑ์การพิจารณา');
    if (ok) {
      setShowRejectionDialog(false);
      setSelectedApp((prev) => prev ? { ...prev, status: 'rejected' } : null);
    }
  };

  // Handle Confirm Disbursement
  const handleConfirmDisbursement = async () => {
    if (!selectedApp) return;
    const amount = selectedApp.approvedAmount || selectedApp.requestedAmount;
    const ok = await executeDisbursement(selectedApp.id, amount, paymentRef || `TR-${Date.now().toString().slice(-6)}`, proofUrl, 'จ่ายเงินเรียบร้อย');
    if (ok) {
      setShowDisburseDialog(false);
      setSelectedApp((prev) => prev ? { ...prev, status: 'disbursed', paymentRef } : null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header & Quick Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-teal-200 font-bold flex items-center justify-center text-base shadow-xs shrink-0">
              <FileCheck2 className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  ยื่นคำร้องขอความช่วยเหลือ
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                  Workflow 9 ขั้นตอน
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                รับคำร้อง ตรวจสอบ ประเมินความจำเป็น เสนอพิจารณา และดำเนินการช่วยเหลือ โดยต้องมีทะเบียนผู้มีสิทธิ์ก่อน
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
            onClick={handleOpenWizard}
            className="zms-action flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs min-h-[40px]"
           aria-label="ยื่นคำร้องขอความช่วยเหลือใหม่" title="ยื่นคำร้องขอความช่วยเหลือใหม่">
            <Plus className="w-4 h-4" />
            <span>ยื่นคำร้องขอความช่วยเหลือใหม่</span>
          </button>
        </div>
      </div>

      {/* 2. Workflow Stepper Progress Overview */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            ขั้นตอนการดำเนินงานคำร้อง (Assistance Request Workflow 9 ขั้นตอน)
          </span>
          <span className="text-[11px] text-slate-400">
            คำร้องขอความช่วยเหลือต้องอ้างอิงจากทะเบียนผู้มีสิทธิ์ที่ผ่านการตรวจสอบแล้ว
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-xs">
          {WORKFLOW_STEPS.map((ws) => {
            let count = 0;
            if (ws.status === 'submitted') count = applications.filter((a) => a.status === 'submitted').length;
            else if (ws.status === 'doc_review') count = applications.filter((a) => a.status === 'doc_review' || a.status === 'need_info').length;
            else if (ws.status === 'field_inspection') count = applications.filter((a) => a.status === 'field_inspection' || a.status === 'assessment').length;
            else if (ws.status === 'pending_approval') count = applications.filter((a) => a.status === 'pending_approval').length;
            else if (ws.status === 'approved') count = applications.filter((a) => a.status === 'approved').length;
            else if (ws.status === 'rejected') count = applications.filter((a) => a.status === 'rejected').length;
            else if (ws.status === 'wait_disbursement') count = applications.filter((a) => a.status === 'wait_disbursement').length;
            else if (ws.status === 'disbursed') count = applications.filter((a) => a.status === 'disbursed' || a.status === 'closed').length;
            else if (ws.status === 'cancelled') count = applications.filter((a) => a.status === 'cancelled').length;

            const isCurrent = statusFilter === ws.status;

            return (
              <button
                key={ws.step}
                onClick={() => {
                  setStatusFilter(isCurrent ? 'all' : ws.status);
                  setCurrentPage(1);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                  isCurrent 
                    ? 'border-[#0b2545] bg-[#0b2545] text-white shadow-xs' 
                    : `${ws.bg} ${ws.border} hover:opacity-90 text-slate-800`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${isCurrent ? 'text-amber-300' : ws.color}`}>
                    ขั้นตอนที่ {ws.step}
                  </span>
                  <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isCurrent ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
                  }`}>
                    {count}
                  </span>
                </div>
                <div className={`font-bold mt-1 truncate text-xs ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                  {ws.label.split('. ')[1]}
                </div>
                <div className={`text-[10px] truncate mt-0.5 ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                  {ws.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Search & Secondary Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาเลขคำร้อง APP-, ชื่อผู้ยื่น, เลขทะเบียน REG-, หรือเบอร์โทร..."
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

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] text-xs font-medium"
            >
              <option value="all">ทุกสาขาที่รับผิดชอบ ({orgBranches.length})</option>
              {orgBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.status === 'inactive' ? '(ปิดใช้งาน)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic 3-Tier Assistance Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] text-xs font-medium"
            >
              <option value="all">ทุกประเภทความช่วยเหลือ ({allActiveAssistanceTypes.length})</option>
              {eligiblePrimaryGroups.map((pg) => (
                <optgroup key={pg.asnafCode} label={`กลุ่มหลัก: ${pg.asnafName}`}>
                  {(pg.specificFunds || []).map((sf) =>
                    (sf.assistanceTypes || []).map((ast) => (
                      <option key={ast.id} value={ast.id}>
                        [{sf.name}] {ast.name}
                      </option>
                    ))
                  )}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Urgency Filter */}
          <div>
            <select
              value={urgencyFilter}
              onChange={(e) => { setUrgencyFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] text-xs font-medium"
            >
              <option value="all">ทุกระดับความเร่งด่วน</option>
              <option value="normal">ปกติ</option>
              <option value="urgent">เร่งด่วน</option>
              <option value="critical">วิกฤตฉุกเฉิน</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Requests Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="md:hidden text-[11px] text-slate-500 flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
          <span className="flex items-center gap-1.5 font-medium">
            <ArrowRightLeft className="w-3.5 h-3.5 text-teal-700" />
            เลื่อนในแนวนอนเพื่อดูข้อมูลคำร้องทั้งหมด
          </span>
          <span className="text-[10px] text-teal-800 font-bold bg-teal-100/70 px-2 py-0.5 rounded">
            Swipe ↔
          </span>
        </div>
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">เลขคำร้อง</th>
                <th className="py-3 px-4">ผู้ยื่นคำร้อง</th>
                <th className="py-3 px-4">ทะเบียนผู้มีสิทธิ์</th>
                <th className="py-3 px-4">ประเภทความช่วยเหลือ</th>
                <th className="py-3 px-4 text-right">วงเงินที่ขอ</th>
                <th className="py-3 px-4">สถานะคำร้อง</th>
                <th className="py-3 px-4">วันที่ยื่น</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedApplications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">ไม่พบคำร้องขอความช่วยเหลือตามเงื่อนไข</p>
                    <p className="text-[11px] mt-1">ลองเปลี่ยนเงื่อนไขค้นหา หรือกด "ยื่นคำร้องขอความช่วยเหลือใหม่"</p>
                  </td>
                </tr>
              ) : (
                paginatedApplications.map((app) => {
                  const statusMeta = APPLICATION_STATUS_MAP[app.status] || {
                    label: app.status,
                    color: 'text-slate-800',
                    bg: 'bg-slate-100',
                    border: 'border-slate-300'
                  };

                  return (
                    <tr 
                      key={app.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => openApplicationDetail(app)}
                    >
                      {/* Application No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0b2545] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{app.applicationNo}</span>
                          {app.urgencyLevel === 'urgent' && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="เร่งด่วน" />
                          )}
                        </div>
                      </td>

                      {/* Applicant Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {formatPersonName(app)}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{app.phone}</span>
                          <span>•</span>
                          <span>{app.community}</span>
                        </div>
                      </td>

                      {/* Linked Beneficiary Registry */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {app.registrationNo ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 font-mono font-semibold text-[11px]">
                            <ShieldCheck className="w-3 h-3 text-teal-600" />
                            <span>{app.registrationNo}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            ยังไม่มีทะเบียนหลัก
                          </span>
                        )}
                      </td>

                      {/* Assistance Type & Linked Specific Fund */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-semibold block">{app.assistanceType || 'เงินสงเคราะห์'}</span>
                        {app.specificFundName && (
                          <span className="inline-block text-[10px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded mt-0.5">
                            กองทุน: {app.specificFundName}
                          </span>
                        )}
                        {app.necessityDetails && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px] mt-0.5">
                            {app.necessityDetails}
                          </div>
                        )}
                      </td>

                      {/* Requested Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ฿{(app.requestedAmount || 0).toLocaleString()}
                        {app.approvedAmount ? (
                          <div className="text-[10px] text-emerald-700 font-medium">
                            อนุมัติ: ฿{app.approvedAmount.toLocaleString()}
                          </div>
                        ) : null}
                      </td>

                      {/* Multi-Lifecycle Statuses */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span>{statusMeta.label}</span>
                          </span>
                          <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                            {app.assessmentStatus && (
                              <span className={`px-1.5 py-0.5 rounded ${
                                app.assessmentStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                app.assessmentStatus === 'in_assessment' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                ประเมิน: {app.assessmentStatus}
                              </span>
                            )}
                            {app.paymentStatus && app.paymentStatus !== 'not_applicable' && (
                              <span className={`px-1.5 py-0.5 rounded ${
                                app.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                app.paymentStatus === 'wait_disbursement' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                จ่าย: {app.paymentStatus}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Submission Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString('th-TH') : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openApplicationDetail(app)}
                            className="zms-action p-1.5 rounded-lg text-slate-600 hover:text-[#0b2545] hover:bg-slate-100 transition-colors"
                            title="ดูรายละเอียดคำร้อง & ติดตาม Workflow"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {app.status === 'draft' && (
                            <button
                              onClick={() => {
                                onNavigate('new-assistance-request');
                              }}
                              className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-[10px] font-bold border border-amber-200"
                            >
                              แก้ไขฉบับร่าง
                            </button>
                          )}

                          {app.status === 'submitted' && (
                            <button
                              onClick={() => handleAdvanceWorkflow(app.id, 'doc_review', 'เจ้าหน้าที่รับคำร้องและเริ่มตรวจสอบเอกสาร')}
                              className="px-2 py-1 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 text-[10px] font-bold border border-sky-200"
                            >
                              ตรวจคำร้อง
                            </button>
                          )}

                          {app.status === 'doc_review' && (
                            <button
                              onClick={() => handleAdvanceWorkflow(app.id, 'field_inspection', 'ส่งต่อลงพื้นที่สำรวจและประเมินสิทธิ์')}
                              className="px-2 py-1 rounded-lg bg-purple-50 text-purple-800 hover:bg-purple-100 text-[10px] font-bold border border-purple-200"
                            >
                              ประเมินสิทธิ์
                            </button>
                          )}

                          {(app.status === 'field_inspection' || app.status === 'assessment') && (
                            <button
                              onClick={() => handleAdvanceWorkflow(app.id, 'pending_approval', 'ผลประเมินเสร็จสิ้น เสนอคณะกรรมการอนุมัติ')}
                              className="px-2 py-1 rounded-lg bg-rose-50 text-rose-800 hover:bg-rose-100 text-[10px] font-bold border border-rose-200"
                            >
                              เสนออนุมัติ
                            </button>
                          )}

                          {app.status === 'pending_approval' && (
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setApprovalAmount(app.requestedAmount);
                                setShowApprovalDialog(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200"
                            >
                              พิจารณา
                            </button>
                          )}

                          {app.status === 'approved' && (
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setShowDisburseDialog(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 text-[10px] font-bold border border-teal-200"
                            >
                              จ่ายเงิน
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

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            แสดง {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} ถึง {Math.min(currentPage * pageSize, totalItems)} จากทั้งหมด {totalItems} รายการ
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
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
              className="zms-action p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Request Details & Workflow Modal */}
      {selectedApp && !showApprovalDialog && !showRejectionDialog && !showDisburseDialog && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedApp(null);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden"
            >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-[#0b2545] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
                  <span>เลขที่คำร้อง: {selectedApp.applicationNo}</span>
                  <span>•</span>
                  <span>วันที่ยื่น: {selectedApp.appliedDate ? new Date(selectedApp.appliedDate).toLocaleDateString('th-TH') : '-'}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                  คำร้องขอความช่วยเหลือ: {formatPersonName(selectedApp)}
                </h2>
                <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-1">
                  <span>ประเภท: {selectedApp.assistanceType}</span>
                  <span>•</span>
                  <span>วงเงินที่ขอ: ฿{(selectedApp.requestedAmount || 0).toLocaleString()} บาท</span>
                  <span>•</span>
                  <span>ระดับ: {selectedApp.urgencyLevel}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="zms-action w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Multi-Lifecycle 7-Stage Status Header in Modal (Phase 7 Mandate) */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2.5">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  วงจรชีวิตคำร้อง 7 มิติ (Multi-Lifecycle Architecture)
                </span>
                <span className="text-teal-800 font-mono text-[11px] px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                  {selectedApp.completionStatus === 'closed' ? 'ปิดคำร้องสมบูรณ์ (Closed)' :
                   selectedApp.completionStatus === 'terminated' ? 'ยุติคำร้อง (Terminated)' : 'กำลังดำเนินการ (Active)'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {/* 1. Request Status */}
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">1. คำขอ (Request)</span>
                  <span className={`text-[11px] font-bold block mt-0.5 truncate ${
                    selectedApp.requestStatus === 'submitted' ? 'text-sky-700' :
                    selectedApp.requestStatus === 'need_info' ? 'text-amber-700' :
                    selectedApp.requestStatus === 'canceled' ? 'text-red-700' : 'text-slate-600'
                  }`}>
                    {selectedApp.requestStatus === 'submitted' ? 'ยื่นคำร้องแล้ว' :
                     selectedApp.requestStatus === 'need_info' ? 'ขอข้อมูลเพิ่ม' :
                     selectedApp.requestStatus === 'canceled' ? 'ยกเลิกคำขอ' : 'ฉบับร่าง'}
                  </span>
                </div>

                {/* 2. Assessment Status */}
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">2. ประเมินสิทธิ์</span>
                  <span className={`text-[11px] font-bold block mt-0.5 truncate ${
                    selectedApp.assessmentStatus === 'completed' ? 'text-emerald-700' :
                    selectedApp.assessmentStatus === 'in_assessment' ? 'text-purple-700' :
                    selectedApp.assessmentStatus === 'rejected' ? 'text-red-700' : 'text-slate-500'
                  }`}>
                    {selectedApp.assessmentStatus === 'completed' ? 'ประเมินผ่านแล้ว' :
                     selectedApp.assessmentStatus === 'in_assessment' ? 'กำลังลงพื้นที่' :
                     selectedApp.assessmentStatus === 'rejected' ? 'ไม่ผ่านเกณฑ์' : 'รอการประเมิน'}
                  </span>
                </div>

                {/* 3. Approval Status */}
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">3. พิจารณาอนุมัติ</span>
                  <span className={`text-[11px] font-bold block mt-0.5 truncate ${
                    selectedApp.approvalStatus === 'approved' ? 'text-emerald-700' :
                    selectedApp.approvalStatus === 'in_review' ? 'text-indigo-700' :
                    selectedApp.approvalStatus === 'rejected' ? 'text-red-700' : 'text-slate-500'
                  }`}>
                    {selectedApp.approvalStatus === 'approved' ? 'อนุมัติวงเงิน' :
                     selectedApp.approvalStatus === 'in_review' ? 'อยู่ระหว่างพิจารณา' :
                     selectedApp.approvalStatus === 'rejected' ? 'ไม่อนุมัติ' : 'รอเสนออนุมัติ'}
                  </span>
                </div>

                {/* 4. Payment Status */}
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">4. การจ่ายเงิน</span>
                  <span className={`text-[11px] font-bold block mt-0.5 truncate ${
                    selectedApp.paymentStatus === 'paid' ? 'text-emerald-700' :
                    selectedApp.paymentStatus === 'wait_disbursement' ? 'text-amber-700' :
                    selectedApp.paymentStatus === 'not_applicable' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {selectedApp.paymentStatus === 'paid' ? 'จ่ายเงินแล้ว' :
                     selectedApp.paymentStatus === 'wait_disbursement' ? 'รอฝ่ายการเงินจ่าย' :
                     selectedApp.paymentStatus === 'not_applicable' ? 'ไม่ต้องจ่ายเงิน' : 'รอเบิกจ่าย'}
                  </span>
                </div>

                {/* 5. Delivery Status */}
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">5. การส่งมอบ</span>
                  <span className={`text-[11px] font-bold block mt-0.5 truncate ${
                    selectedApp.deliveryStatus === 'delivered' ? 'text-emerald-700' :
                    selectedApp.deliveryStatus === 'dispatched' ? 'text-blue-700' :
                    selectedApp.deliveryStatus === 'not_applicable' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {selectedApp.deliveryStatus === 'delivered' ? 'ส่งมอบเรียบร้อย' :
                     selectedApp.deliveryStatus === 'dispatched' ? 'กำลังจัดส่ง' :
                     selectedApp.deliveryStatus === 'not_applicable' ? 'ส่งมอบพร้อมโอน' : 'รอส่งมอบ'}
                  </span>
                </div>

                {/* 6. Follow-up Status */}
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">6. ติดตามผล</span>
                  <span className={`text-[11px] font-bold block mt-0.5 truncate ${
                    selectedApp.followupStatus === 'completed' ? 'text-emerald-700' :
                    selectedApp.followupStatus === 'scheduled' ? 'text-purple-700' :
                    selectedApp.followupStatus === 'not_required' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {selectedApp.followupStatus === 'completed' ? 'ติดตามผลแล้ว' :
                     selectedApp.followupStatus === 'scheduled' ? 'นัดหมายแล้ว' :
                     selectedApp.followupStatus === 'not_required' ? 'ไม่ต้องติดตาม' : 'รอนัดหมาย'}
                  </span>
                </div>

                {/* 7. Completion Status */}
                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">7. ปิดคำร้อง</span>
                  <span className={`text-[11px] font-bold block mt-0.5 truncate ${
                    selectedApp.completionStatus === 'closed' ? 'text-emerald-700' :
                    selectedApp.completionStatus === 'terminated' ? 'text-red-700' : 'text-amber-700'
                  }`}>
                    {selectedApp.completionStatus === 'closed' ? 'ปิดคำร้องแล้ว' :
                     selectedApp.completionStatus === 'terminated' ? 'ยุติคำร้อง' : 'อยู่ระหว่างดำเนินการ'}
                  </span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* Linked Registry Box */}
              <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    <span className="font-bold text-teal-900 text-xs">ความเชื่อมโยงกับทะเบียนผู้มีสิทธิ์รับซะกาต:</span>
                  </div>
                  {linkedRegistry ? (
                    <div className="mt-1 text-xs text-teal-800">
                      เชื่อมโยงกับเลขทะเบียน <strong>{linkedRegistry.registrationNo}</strong> (สถานะ: {linkedRegistry.registrationStatus})
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-amber-800">
                      คำร้องนี้ยังไม่มีทะเบียนผู้มีสิทธิ์รับซะกาตหลักในระบบ
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {linkedRegistry ? (
                    <button
                      onClick={() => {
                        const benId = linkedRegistry.id;
                        setSelectedApp(null);
                        if (onOpenMemberDetail) {
                          onOpenMemberDetail(benId, false, 'member_info');
                        } else {
                          onNavigate('beneficiaries');
                        }
                      }}
                      className="px-3 py-1.5 bg-white text-teal-900 font-bold rounded-xl border border-teal-300 hover:bg-teal-100 transition-colors"
                    >
                      ดูทะเบียนผู้มีสิทธิ์นี้
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate('new-application')}
                      className="px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-xs"
                    >
                      เริ่มขึ้นทะเบียนผู้มีสิทธิ์
                    </button>
                  )}
                </div>
              </div>

              {/* Request Details Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1">รายละเอียดปัญหาและความจำเป็น</h4>
                  <p className="text-slate-800 text-xs whitespace-pre-line leading-relaxed">
                    {selectedApp.necessityDetails || 'ไม่มีการระบุรายละเอียดเพิ่มเติม'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">โครงสร้างกองทุนและประเภทความช่วยเหลือ</h4>
                    {['submitted', 'doc_review', 'assessing', 'pending_approval'].includes(selectedApp.status) &&
                    ['super_admin', 'executive', 'approver', 'officer'].includes(currentUser.role) ? (
                      !isEditingClassification ? (
                        <button
                          type="button"
                          onClick={() => handleStartEditClassification(selectedApp)}
                          className="zms-action inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-teal-800 bg-white border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors shadow-2xs"
                         aria-label="แก้ไขกองทุน/ประเภทคำร้อง" title="แก้ไขกองทุน/ประเภทคำร้อง">
                          <Edit className="w-3 h-3" />
                          <span>แก้ไขกองทุน/ประเภทคำร้อง</span>
                        </button>
                      ) : null
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                        <span>ล็อกโครงสร้างคำร้อง</span>
                      </span>
                    )}
                  </div>

                  {isEditingClassification ? (
                    <div className="space-y-2.5 p-3 bg-white rounded-xl border border-teal-200 text-xs">
                      <div className="font-bold text-teal-900 text-[11px] flex items-center justify-between">
                        <span>แก้ไขโครงสร้างกองทุน 3 ระดับ (ก่อนอนุมัติ)</span>
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-normal">
                          มีผลต่อรายงานและการจัดสรร
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">ระดับที่ 1: กลุ่มหลัก (Primary Group)</label>
                        <select
                          value={editPrimaryCode}
                          onChange={(e) => {
                            const newPgCode = e.target.value;
                            setEditPrimaryCode(newPgCode);
                            const pg = eligiblePrimaryGroups.find((p) => p.asnafCode === newPgCode);
                            const firstSf = pg?.specificFunds?.[0];
                            const firstAst = firstSf?.assistanceTypes?.[0];
                            setEditSpecificFundId(firstSf ? firstSf.id : '');
                            setEditAssistanceTypeId(firstAst ? firstAst.id : '');
                            if (firstAst?.defaultMinAmount) setEditRequestedAmount(firstAst.defaultMinAmount);
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-xs"
                        >
                          {eligiblePrimaryGroups.map((pg) => (
                            <option key={pg.asnafCode} value={pg.asnafCode}>
                              {pg.asnafName} ({pg.asnafCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">ระดับที่ 2: กลุ่มเฉพาะ / กองทุน (Specific Fund)</label>
                        <select
                          value={editSpecificFundId}
                          onChange={(e) => {
                            const newSfId = e.target.value;
                            setEditSpecificFundId(newSfId);
                            const sf = editAvailableSpecificFunds.find((s) => s.id === newSfId);
                            const firstAst = sf?.assistanceTypes?.[0];
                            setEditAssistanceTypeId(firstAst ? firstAst.id : '');
                            if (firstAst?.defaultMinAmount) setEditRequestedAmount(firstAst.defaultMinAmount);
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-xs"
                        >
                          {editAvailableSpecificFunds.length === 0 ? (
                            <option value="">ไม่มีกองทุนเฉพาะในกลุ่มนี้</option>
                          ) : (
                            editAvailableSpecificFunds.map((sf) => (
                              <option key={sf.id} value={sf.id}>
                                [{sf.code}] {sf.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">ระดับที่ 3: ประเภทความช่วยเหลือ (Assistance Type)</label>
                        <select
                          value={editAssistanceTypeId}
                          onChange={(e) => {
                            const newAstId = e.target.value;
                            setEditAssistanceTypeId(newAstId);
                            const ast = editAvailableAssistanceTypes.find((a) => a.id === newAstId);
                            if (ast?.defaultMinAmount) setEditRequestedAmount(ast.defaultMinAmount);
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-xs"
                        >
                          {editAvailableAssistanceTypes.length === 0 ? (
                            <option value="">ไม่มีประเภทความช่วยเหลือในกองทุนนี้</option>
                          ) : (
                            editAvailableAssistanceTypes.map((ast) => (
                              <option key={ast.id} value={ast.id}>
                                [{ast.code}] {ast.name} (แนะนำ: ฿{ast.defaultMinAmount?.toLocaleString() || 0})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">วงเงินที่ขอรับ (บาท)</label>
                        <input
                          type="number"
                          min={1}
                          step={500}
                          value={editRequestedAmount}
                          onChange={(e) => setEditRequestedAmount(Number(e.target.value))}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-teal-900 text-xs"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingClassification(false)}
                          disabled={isSavingClassification}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 text-xs"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveClassificationEdit}
                          disabled={isSavingClassification}
                          className="zms-action px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                         aria-label="กำลังบันทึก..." title="กำลังบันทึก...">
                          {isSavingClassification ? (
                            <span>กำลังบันทึก...</span>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>บันทึกการแก้ไข</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-400 shrink-0">ระดับ 1 (กลุ่มหลัก):</span>
                        <strong className="text-slate-900 text-right">
                          {selectedApp.primaryGroupName || (selectedApp.primaryGroupCode === 'faqir_miskin' ? 'ฟากีร–มิสกีน' : selectedApp.primaryGroupCode) || 'ฟากีร–มิสกีน'}
                        </strong>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-400 shrink-0">ระดับ 2 (กลุ่มเฉพาะ/กองทุน):</span>
                        <strong className="text-teal-900 text-right">
                          {selectedApp.specificFundName || selectedApp.specificFundCode || '-'}
                        </strong>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-slate-400 shrink-0">ระดับ 3 (ประเภทความช่วยเหลือ):</span>
                        <strong className="text-slate-900 text-right">
                          {selectedApp.assistanceType} {selectedApp.assistanceTypeCode ? `(${selectedApp.assistanceTypeCode})` : ''}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                        <span className="text-slate-400">วงเงินที่ขอรับ:</span>
                        <strong className="text-slate-900 font-mono text-sm">฿{(selectedApp.requestedAmount || 0).toLocaleString()}</strong>
                      </div>
                      {selectedApp.approvedSpecificFundName && (
                        <div className="flex justify-between text-emerald-900 text-xs">
                          <span className="text-slate-400">กองทุนที่อนุมัติ:</span>
                          <span className="font-bold">{selectedApp.approvedSpecificFundName}</span>
                        </div>
                      )}
                      {selectedApp.approvedAmount && (
                        <div className="flex justify-between text-emerald-800 font-bold border-t border-slate-200 pt-1">
                          <span>วงเงินที่อนุมัติ:</span>
                          <span className="font-mono text-sm">฿{selectedApp.approvedAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedApp.disbursementRef && (
                        <div className="flex justify-between text-teal-800">
                          <span>เลขอ้างอิงการโอนเงิน:</span>
                          <span className="font-mono font-bold">{selectedApp.disbursementRef}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Task 2: Financial Handover Linkage Box */}
              {linkedFinanceData && (
                <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-teal-700" />
                      <h4 className="font-bold text-teal-950 text-xs">ข้อมูลการเงินและการส่งมอบเงินสดจากฝ่ายการเงิน (Finance Link)</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> ตรวจสอบเท่านั้น
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        linkedFinanceData.financeStatus === 'fully_handed_over'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : linkedFinanceData.financeStatus === 'partially_handed_over'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-slate-100 text-slate-800 border-slate-300'
                      }`}>
                        การเงิน: {linkedFinanceData.financeStatusLabel}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
                        การช่วยเหลือ: {linkedFinanceData.assistanceStatusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-white border border-teal-100">
                      <span className="text-slate-400 block text-[10px]">ยอดเบิกเงินสด (ฝ่ายการเงิน)</span>
                      <strong className="text-slate-800 font-mono text-xs">฿{linkedFinanceData.withdrawnAmount.toLocaleString()}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-teal-100">
                      <span className="text-slate-400 block text-[10px]">ยอดที่ส่งมอบให้ผู้ดูแล</span>
                      <strong className="text-emerald-900 font-mono text-xs">฿{linkedFinanceData.handedOverAmount.toLocaleString()}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-teal-100">
                      <span className="text-slate-400 block text-[10px]">ยอดที่ผู้ดูแลรับจริง</span>
                      <strong className="text-sky-900 font-mono text-xs">฿{linkedFinanceData.receivedAmount.toLocaleString()}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-teal-100">
                      <span className="text-slate-400 block text-[10px]">ยอดช่วยเหลือที่ดำเนินการจริง</span>
                      <strong className="text-teal-900 font-mono text-xs">฿{linkedFinanceData.disbursedAmount.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-slate-600">
                    <div>
                      <span>ใบสำคัญการเบิกจ่าย: <strong className="font-mono text-slate-800">{linkedFinanceData.withdrawalNo}</strong></span>
                      {linkedFinanceData.handoverDatetime && (
                        <span className="ml-3">วันเวลาส่งมอบ: <strong>{linkedFinanceData.handoverDatetime}</strong></span>
                      )}
                    </div>
                    {linkedFinanceData.proofUrl && (
                      <a
                        href={linkedFinanceData.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-700 hover:text-teal-900 font-bold underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> ดูหลักฐานการส่งมอบเงิน
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Phase 10: Financial & General Ledger Double-Entry Card */}
              {appLedgerDetails && (appLedgerDetails.glEntries?.length > 0 || appLedgerDetails.holdHistory?.length > 0) && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-blue-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-700" />
                      <h4 className="font-bold text-blue-950 text-xs">บันทึกบัญชีแยกประเภททั่วไป (General Ledger & Double-Entry)</h4>
                      {appLedgerDetails.journalNo && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
                          {appLedgerDetails.journalNo}
                        </span>
                      )}
                    </div>
                    {appLedgerDetails.isBalanced && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ยอดดุลบัญชีสมบูรณ์ (Debit = Credit)
                      </span>
                    )}
                  </div>

                  {/* GL Entries Table */}
                  {appLedgerDetails.glEntries?.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-blue-100 bg-white">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-blue-100">
                          <tr>
                            <th className="py-1.5 px-3">ประเภท</th>
                            <th className="py-1.5 px-3">รหัสผังบัญชี</th>
                            <th className="py-1.5 px-3">ชื่อบัญชี</th>
                            <th className="py-1.5 px-3 text-right">เดบิต (Dr.)</th>
                            <th className="py-1.5 px-3 text-right">เครดิต (Cr.)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {appLedgerDetails.glEntries.map((entry: any) => (
                            <tr key={entry.id} className="hover:bg-slate-50/50">
                              <td className="py-1.5 px-3 font-sans font-bold">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                                  entry.entryType === 'debit' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
                                }`}>
                                  {entry.entryType.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 font-bold text-slate-800">{entry.accountCode}</td>
                              <td className="py-1.5 px-3 font-sans text-slate-700">{entry.accountName}</td>
                              <td className="py-1.5 px-3 text-right text-emerald-700 font-bold">
                                {entry.entryType === 'debit' ? `฿${Number(entry.amount).toLocaleString()}` : '-'}
                              </td>
                              <td className="py-1.5 px-3 text-right text-teal-700 font-bold">
                                {entry.entryType === 'credit' ? `฿${Number(entry.amount).toLocaleString()}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-mono font-bold text-[11px] border-t border-blue-100 text-slate-800">
                          <tr>
                            <td colSpan={3} className="py-1.5 px-3 font-sans text-right">รวมยอดทั้งสิ้น:</td>
                            <td className="py-1.5 px-3 text-right text-emerald-800">฿{appLedgerDetails.totalDebit.toLocaleString()}</td>
                            <td className="py-1.5 px-3 text-right text-teal-800">฿{appLedgerDetails.totalCredit.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Fund Hold / Release audit events */}
                  {appLedgerDetails.holdHistory?.length > 0 && (
                    <div className="pt-1 space-y-1.5 text-[11px]">
                      <span className="text-slate-500 font-bold text-[10px] block">ประวัติการจองและปลดงบประมาณ (Fund Hold & Release):</span>
                      <div className="space-y-1">
                        {appLedgerDetails.holdHistory.map((h: any) => (
                          <div key={h.id} className="p-2 rounded bg-white/70 border border-slate-200/80 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                h.action === 'HOLD_FUND_BALANCE' || h.action === 'APPROVE'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : h.action === 'RELEASE_FUND_HOLD'
                                  ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}>
                                {h.action}
                              </span>
                              <span className="text-slate-700">{h.notes}</span>
                            </div>
                            <div className="text-slate-400 text-[10px] shrink-0 ml-2">{h.createdAt?.slice(0, 16)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Attached Documents in Modal (Separated Request Documents vs Master Registry Documents) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>เอกสารประกอบเฉพาะคำร้องครั้งนี้ ({selectedApp.documents?.length || 0} รายการ)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">แยกอิสระจากเอกสารทะเบียนหลัก • เปิดดูและดาวน์โหลดได้ตามสิทธิ์</span>
                </div>

                <DocumentListTable
                  documents={selectedApp.documents || []}
                  readOnly={true}
                />

                {Array.isArray(selectedApp.registryDocuments) && selectedApp.registryDocuments.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        เอกสารเดิมจากทะเบียนผู้มีสิทธิ์หลัก ({selectedApp.registryDocuments.length} รายการ — อ่านอย่างเดียว)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedApp.registryDocuments.map((rdoc) => (
                        <div
                          key={rdoc.id}
                          className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">{rdoc.name}</div>
                            <div className="text-[10px] text-slate-400">หมวด: {rdoc.category}</div>
                          </div>
                          {rdoc.downloadUrl && (
                            <a
                              href={rdoc.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline shrink-0"
                            >
                              <span>เปิดดู</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Workflow Audit Timeline */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <span>บันทึกประวัติการดำเนินการ (Audit Trail)</span>
                </h4>
                <div className="space-y-2">
                  {(!selectedApp.statusHistory || selectedApp.statusHistory.length === 0) ? (
                    <p className="text-slate-400 italic">ยังไม่มีประวัติการส่งต่อ</p>
                  ) : (
                    selectedApp.statusHistory.map((item, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs pb-2 border-b border-slate-100 last:border-none last:pb-0">
                        <span className="w-2 h-2 rounded-full bg-teal-600 mt-1 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900">{APPLICATION_STATUS_MAP[item.status]?.label || item.status}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">{new Date(item.timestamp).toLocaleString('th-TH')}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">โดย: {item.changedBy}</div>
                          {item.notes && <p className="text-slate-700 italic mt-0.5">{item.notes}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer Workflow Action Buttons */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">ขั้นตอนถัดไปที่แนะนำ:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedApp.status === 'submitted' && (
                  <button
                    onClick={() => handleAdvanceWorkflow(selectedApp.id, 'doc_review', 'รับคำร้องและเริ่มตรวจสอบเอกสาร')}
                    className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl shadow-xs"
                  >
                    เริ่มตรวจสอบคำร้อง (ขั้นตอนที่ 2)
                  </button>
                )}

                {selectedApp.status === 'doc_review' && (
                  <button
                    onClick={() => handleAdvanceWorkflow(selectedApp.id, 'field_inspection', 'ส่งต่อลงพื้นที่สำรวจและประเมินสิทธิ์')}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs"
                  >
                    ส่งต่อประเมินความจำเป็น (ขั้นตอนที่ 3)
                  </button>
                )}

                {(selectedApp.status === 'field_inspection' || selectedApp.status === 'assessment') && (
                  <button
                    onClick={() => handleAdvanceWorkflow(selectedApp.id, 'pending_approval', 'ผลประเมินเสร็จสิ้น เสนอคณะกรรมการอนุมัติ')}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-xs"
                  >
                    เสนอผู้มีอำนาจพิจารณา (ขั้นตอนที่ 4)
                  </button>
                )}

                {selectedApp.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => setShowRejectionDialog(true)}
                      className="px-3.5 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold rounded-xl"
                    >
                      ไม่อนุมัติ
                    </button>
                    <button
                      onClick={() => {
                        setApprovalAmount(selectedApp.requestedAmount);
                        setShowApprovalDialog(true);
                      }}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                    >
                      อนุมัติคำร้อง (ขั้นตอนที่ 5)
                    </button>
                  </>
                )}

                {selectedApp.status === 'approved' && (
                  <button
                    onClick={() => setShowDisburseDialog(true)}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs"
                  >
                    ดำเนินการจ่ายเงิน/ส่งมอบ (ขั้นตอนที่ 6)
                  </button>
                )}

                {selectedApp.status === 'disbursed' && (
                  <button
                    onClick={() => handleAdvanceWorkflow(selectedApp.id, 'closed', 'บันทึกผลการช่วยเหลือเสร็จสมบูรณ์และปิดคำร้อง')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xs"
                  >
                    บันทึกผล & ปิดคำร้อง (ขั้นตอนที่ 7)
                  </button>
                )}

                {selectedApp.status !== 'cancelled' && selectedApp.status !== 'disbursed' && selectedApp.status !== 'closed' && (
                  <button
                    onClick={() => {
                      setCancelReason('');
                      setShowCancelDialog(true);
                    }}
                    className="px-3.5 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold rounded-xl text-xs"
                  >
                    ยกเลิกคำร้อง (ขั้นตอนที่ 9)
                  </button>
                )}

                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-xl"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* 6. Approval Dialog */}
      {showApprovalDialog && selectedApp && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowApprovalDialog(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">พิจารณาอนุมัติคำร้องขอความช่วยเหลือ</h3>
              <button onClick={() => setShowApprovalDialog(false)} className="zms-action text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">ผู้ยื่นคำร้อง:</span>
                <strong className="text-slate-900 text-sm block">{formatPersonName(selectedApp)}</strong>
                <span className="font-mono text-slate-500">{selectedApp.applicationNo}</span>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">วงเงินอนุมัติ (บาท):</label>
                <input
                  type="number"
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">จัดสรรจากกองทุน:</label>
                <select
                  value={selectedFundId}
                  onChange={(e) => setSelectedFundId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {funds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (คงเหลือ: ฿{f.availableAmount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">มติ / ข้อกำหนดการอนุมัติ:</label>
                <textarea
                  rows={2}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="ระบุมติที่ประชุมหรือเงื่อนไขการเบิกจ่าย..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Phase 10: Solvency Check Live Banner */}
              {isCheckingSolvency ? (
                <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-xs flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังตรวจสอบความเพียงพอของงบประมาณ 3 ระดับ...</span>
                </div>
              ) : solvencyCheck ? (
                <div className="space-y-2">
                  {solvencyCheck.isSolvent ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>งบประมาณเพียงพอสำหรับการอนุมัติ (ระบบจะกันยอดจองงบประมาณ)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <span className="text-slate-500 block">กองทุนหลัก (Tier 1):</span>
                          <strong className="text-slate-800 truncate block">{solvencyCheck.fundAccount.name}</strong>
                          <div className="text-emerald-700 font-mono font-bold">คงเหลือ: ฿{solvencyCheck.fundAccount.availableAmount.toLocaleString()}</div>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                          <span className="text-slate-500 block">กองทุนย่อย (Tier 2):</span>
                          <strong className="text-slate-800 truncate block">{solvencyCheck.specificSubFund.name}</strong>
                          <div className="text-emerald-700 font-mono font-bold">คงเหลือ: ฿{solvencyCheck.specificSubFund.remainingAmount.toLocaleString()}</div>
                        </div>
                      </div>
                      {/* Chart of Accounts Double-Entry Preview */}
                      {solvencyCheck.chartOfAccountsPreview && (
                        <div className="p-2 bg-white/90 rounded-lg border border-emerald-100 text-[10px] space-y-0.5 font-mono">
                          <div className="text-slate-500 font-sans font-bold text-[10px]">บันทึกผังบัญชีอัตโนมัติ (Journal Preview):</div>
                          <div className="text-emerald-800 truncate">
                            [Dr. ค่าใช้จ่ายซะกาต] {solvencyCheck.chartOfAccountsPreview.debit.code} - {solvencyCheck.chartOfAccountsPreview.debit.name}: ฿{solvencyCheck.chartOfAccountsPreview.debit.amount.toLocaleString()}
                          </div>
                          <div className="text-teal-800 truncate">
                            [Cr. ตัดจ่ายตามรูปแบบ] {solvencyCheck.chartOfAccountsPreview.credit.code} - {solvencyCheck.chartOfAccountsPreview.credit.name}: ฿{solvencyCheck.chartOfAccountsPreview.credit.amount.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>ไม่อนุญาตให้อนุมัติ: งบประมาณไม่เพียงพอ</span>
                      </div>
                      <p className="text-[11px] text-rose-700">{solvencyCheck.reason}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowApprovalDialog(false)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-white rounded-xl font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={Boolean(solvencyCheck && !solvencyCheck.isSolvent)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {solvencyCheck && !solvencyCheck.isSolvent ? 'งบประมาณไม่เพียงพอ' : 'ยืนยันอนุมัติ'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* 7. Rejection Dialog */}
      {showRejectionDialog && selectedApp && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowRejectionDialog(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
            <div className="p-4 bg-rose-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">บันทึกผลการไม่อนุมัติคำร้อง</h3>
              <button onClick={() => setShowRejectionDialog(false)} className="zms-action text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">ผู้ยื่นคำร้อง:</span>
                <strong className="text-slate-900 text-sm block">{formatPersonName(selectedApp)}</strong>
                <span className="font-mono text-slate-500">{selectedApp.applicationNo}</span>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">เหตุผลการไม่อนุมัติ *:</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="ระบุเหตุผล เช่น ไม่เข้าเกณฑ์ผู้มีสิทธิ์ตามหลักศาสนา, ข้อมูลรายได้เกินเกณฑ์..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowRejectionDialog(false)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-white rounded-xl font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmRejection}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold transition-colors disabled:opacity-50 shadow-xs"
              >
                ยืนยันไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* 8. Disbursement Dialog */}
      {showDisburseDialog && selectedApp && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDisburseDialog(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">ดำเนินการช่วยเหลือ / จ่ายเงินสวัสดิการ</h3>
              <button onClick={() => setShowDisburseDialog(false)} className="zms-action text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">ผู้รับความช่วยเหลือ:</span>
                <strong className="text-slate-900 text-sm block">{formatPersonName(selectedApp)}</strong>
                <span className="font-mono text-emerald-700 font-bold">
                  ยอดอนุมัติ: ฿{(selectedApp.approvedAmount || selectedApp.requestedAmount).toLocaleString()} บาท
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">หมายเลขอ้างอิงการโอนเงิน (Transaction Ref) *:</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="เช่น SCB-25691019-8891"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">หลักฐานการโอน / ส่งมอบ:</label>
                <input
                  type="text"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Automated Journal Voucher Notice */}
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-teal-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>การลงบัญชีอัตโนมัติ (Automated Double-Entry Ledger)</span>
                </div>
                <p className="text-[11px] text-teal-800">
                  ระบบจะออกใบสำคัญจ่าย (JV-2569-XXXXX) เดบิตบัญชีค่าใช้จ่ายซะกาตตามอัสนัฟ และเครดิตบัญชีการเงินตามรูปแบบการช่วยเหลือ พร้อมปลดการจองงบประมาณ (Fund Hold Release) โดยอัตโนมัติ
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowDisburseDialog(false)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-white rounded-xl font-semibold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDisbursement}
                disabled={!paymentRef.trim()}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition-colors disabled:opacity-50 shadow-xs"
              >
                ยืนยันการจ่ายเงิน
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* 9. Cancel Request Dialog */}
      {showCancelDialog && selectedApp && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCancelDialog(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
            <div className="p-4 bg-stone-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-stone-300" />
                <h3 className="font-bold text-sm">ยกเลิกคำร้องขอความช่วยเหลือ</h3>
              </div>
              <button onClick={() => setShowCancelDialog(false)} className="zms-action text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">คำร้อง:</span>
                <strong className="text-slate-900 text-sm block">{selectedApp.applicationNo} - {formatPersonName(selectedApp)}</strong>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">เหตุผลในการยกเลิกคำร้อง *:</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="ระบุเหตุผล เช่น ผู้ยื่นขอยกเลิกเอง หรือพบข้อมูลไม่ถูกต้อง..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-white rounded-xl font-semibold min-h-[44px]"
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-bold transition-colors disabled:opacity-50 shadow-xs min-h-[44px]"
              >
                ยืนยันการยกเลิกคำร้อง
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      )}

      {/* 10. Unified Assistance Request Form Modal (Single Source of Truth across Main Menu & Beneficiary Registry) */}
      <AssistanceRequestFormModal
        isOpen={isWizardOpen}
        initialBeneficiaryId={wizardBeneficiaryId}
        eligiblePrimaryGroups={eligiblePrimaryGroups}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardBeneficiaryId(undefined);
        }}
        onNavigate={onNavigate}
        onOpenRequestDetail={(applicationId, createdRaw) => {
          void openApplicationDetail(applicationId, createdRaw);
        }}
        onOpenMemberDetail={onOpenMemberDetail}
      />
    </div>
  );
}
