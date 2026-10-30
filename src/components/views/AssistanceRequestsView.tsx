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
import { normalizePrimaryGroupCode } from '@/lib/financeUtils';
import { DocumentUploader, UploadedDocumentItem } from '@/components/common/DocumentUploader';
import { DocumentListTable } from '@/components/common/DocumentListTable';
import { ModalPortal, lockBodyScroll, unlockBodyScroll } from '@/components/common/Modal';
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
  selectedRequestId 
}: AssistanceRequestsViewProps) {
  const { 
    applications, 
    registries, 
    currentUser, 
    funds,
    createAssistanceRequest,
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

  // Wizard state for "ยื่นคำร้องขอความช่วยเหลือใหม่"
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: ID & Registry check
  const [nationalIdInput, setNationalIdInput] = useState<string>('');
  const [isCheckingId, setIsCheckingId] = useState<boolean>(false);
  const [idCheckStatus, setIdCheckStatus] = useState<'idle' | 'not_found' | 'forbidden' | 'found'>('idle');
  const [idCheckError, setIdCheckError] = useState<string | null>(null);
  const [verifiedBeneficiary, setVerifiedBeneficiary] = useState<any>(null);

  // Live 3-Tier Fund & Assistance Type Hierarchy (fetched from DB, activeOnly=true)
  const [hierarchyGroups, setHierarchyGroups] = useState<AsnafAllocation[]>([]);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState<boolean>(false);

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

  // Step 2: 3-Tier Dynamic Selection (Primary Group -> Specific Fund -> Assistance Type)
  const [selectedPrimaryGroupCode, setSelectedPrimaryGroupCode] = useState<string>('');
  const [selectedSpecificFundId, setSelectedSpecificFundId] = useState<string>('');
  const [selectedAssistanceTypeId, setSelectedAssistanceTypeId] = useState<string>('');
  const isSubmittingWizardRef = useRef<boolean>(false);

  const selectedPrimaryGroupObj = useMemo(
    () => eligiblePrimaryGroups.find((pg) => pg.asnafCode === selectedPrimaryGroupCode) || null,
    [eligiblePrimaryGroups, selectedPrimaryGroupCode]
  );

  const availableSpecificFundsForWizard = useMemo<FaqirMiskinSubFund[]>(
    () => selectedPrimaryGroupObj?.specificFunds || [],
    [selectedPrimaryGroupObj]
  );

  const selectedSpecificFundObj = useMemo(
    () => availableSpecificFundsForWizard.find((sf) => sf.id === selectedSpecificFundId) || null,
    [availableSpecificFundsForWizard, selectedSpecificFundId]
  );

  const availableAssistanceTypesForWizard = useMemo<AssistanceTypeItem[]>(
    () => selectedSpecificFundObj?.assistanceTypes || [],
    [selectedSpecificFundObj]
  );

  const selectedAssistanceTypeObj = useMemo(
    () => availableAssistanceTypesForWizard.find((ast) => ast.id === selectedAssistanceTypeId) || null,
    [availableAssistanceTypesForWizard, selectedAssistanceTypeId]
  );

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

  // Step 3: Details, items & Cloud Storage Documents
  const [requestedAmountInput, setRequestedAmountInput] = useState<number>(3000);
  const [requestedItemsDetail, setRequestedItemsDetail] = useState<string>('');
  const [necessityDetailsInput, setNecessityDetailsInput] = useState<string>('');
  const [urgencyLevelInput, setUrgencyLevelInput] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [attachedDocuments, setAttachedDocuments] = useState<UploadedDocumentItem[]>([]);

  // Step 4: Submission result
  const [isSubmittingWizard, setIsSubmittingWizard] = useState<boolean>(false);
  const [wizardSuccessData, setWizardSuccessData] = useState<{ applicationId: string; applicationNo: string } | null>(null);

  // Cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Modal application detail
  const [selectedApp, setSelectedApp] = useState<AssistanceApplication | null>(
    selectedRequestId ? applications.find((a) => a.id === selectedRequestId) || null : null
  );

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

  // Helper to pre-populate 3-tier defaults for a given primary group code
  const applyDefaultThreeTierForPrimary = useCallback(
    (rawAsnafOrPrimary?: string) => {
      const targetPrimary = normalizePrimaryGroupCode(rawAsnafOrPrimary || 'faqir_miskin');
      const matchedPg =
        eligiblePrimaryGroups.find((pg) => pg.asnafCode === targetPrimary) ||
        eligiblePrimaryGroups[0];
      if (!matchedPg) {
        setSelectedPrimaryGroupCode('');
        setSelectedSpecificFundId('');
        setSelectedAssistanceTypeId('');
        return;
      }
      const firstSf = matchedPg.specificFunds?.[0];
      const firstAst = firstSf?.assistanceTypes?.[0];
      setSelectedPrimaryGroupCode(matchedPg.asnafCode);
      setSelectedSpecificFundId(firstSf ? firstSf.id : '');
      setSelectedAssistanceTypeId(firstAst ? firstAst.id : '');
      if (firstAst?.defaultMinAmount && firstAst.defaultMinAmount > 0) {
        setRequestedAmountInput(firstAst.defaultMinAmount);
      } else {
        setRequestedAmountInput(3000);
      }
    },
    [eligiblePrimaryGroups]
  );

  // Handlers for Wizard
  const handleOpenWizard = () => {
    loadActiveHierarchy();
    setWizardStep(1);
    setIdCheckStatus('idle');
    setIdCheckError(null);
    setVerifiedBeneficiary(null);
    setNationalIdInput(currentUser.nationalId || '');
    applyDefaultThreeTierForPrimary('faqir_miskin');
    setRequestedItemsDetail('');
    setNecessityDetailsInput('');
    setUrgencyLevelInput('normal');
    setAttachedDocuments([]);
    setWizardSuccessData(null);
    setIsWizardOpen(true);
  };

  const handleVerifyNationalId = async () => {
    const cleanId = nationalIdInput.replace(/[^0-9]/g, '');
    if (!cleanId || cleanId.length !== 13) {
      setIdCheckStatus('not_found');
      setIdCheckError('กรุณากรอกเลขประจำตัวประชาชน 13 หลักให้ถูกต้อง');
      return;
    }

    setIsCheckingId(true);
    setIdCheckError(null);
    try {
      const res = await fetch('/api/assistance-requests/check-beneficiary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nationalId: cleanId,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            nationalId: currentUser.nationalId,
            beneficiaryId: currentUser.beneficiaryId,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        if (res.status === 404 || json.found === false) {
          setIdCheckStatus('not_found');
          setIdCheckError('เลขบัตรประชาชนนี้ยังไม่ได้ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต กรุณาดำเนินการขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตก่อนยื่นคำร้องขอความช่วยเหลือ');
        } else if (res.status === 403) {
          setIdCheckStatus('forbidden');
          setIdCheckError(json.error || 'ท่านไม่มีสิทธิ์ยื่นคำร้องแทนบุคคลอื่น หรือไม่มีความเชื่อมโยงกับทะเบียนนี้');
        } else {
          setIdCheckStatus('not_found');
          setIdCheckError(json.error || 'เลขบัตรประชาชนนี้ยังไม่ได้ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต กรุณาดำเนินการขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตก่อนยื่นคำร้องขอความช่วยเหลือ');
        }
        setVerifiedBeneficiary(null);
        return;
      }

      setVerifiedBeneficiary(json.beneficiary);
      applyDefaultThreeTierForPrimary(json.beneficiary?.asnafCategory);
      setIdCheckStatus('found');
      setIdCheckError(null);
    } catch (err: any) {
      setIdCheckStatus('not_found');
      setIdCheckError(err.message || 'เลขบัตรประชาชนนี้ยังไม่ได้ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต กรุณาดำเนินการขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตก่อนยื่นคำร้องขอความช่วยเหลือ');
    } finally {
      setIsCheckingId(false);
    }
  };

  const handleSubmitWizard = async () => {
    if (!verifiedBeneficiary) return;
    if (isSubmittingWizardRef.current || isSubmittingWizard) return;

    if (!selectedPrimaryGroupCode || !selectedSpecificFundId || !selectedAssistanceTypeId || !selectedAssistanceTypeObj) {
      showToast('กรุณาเลือกกลุ่มกองทุนหลัก กองทุนเฉพาะ และประเภทความช่วยเหลือให้ครบทั้ง 3 ระดับ', 'error');
      setWizardStep(2);
      return;
    }
    if (!Number.isFinite(Number(requestedAmountInput)) || Number(requestedAmountInput) <= 0) {
      showToast('จำนวนเงินที่ขอรับความช่วยเหลือต้องมากกว่า 0 บาท', 'error');
      setWizardStep(3);
      return;
    }

    isSubmittingWizardRef.current = true;
    setIsSubmittingWizard(true);
    try {
      const res = await createAssistanceRequest({
        beneficiaryId: verifiedBeneficiary.id,
        nationalId: verifiedBeneficiary.nationalId,
        memberId: currentUser.role === 'member' ? currentUser.id : undefined,
        primaryGroupCode: selectedPrimaryGroupCode,
        specificFundId: selectedSpecificFundId,
        asnafCategory: selectedPrimaryGroupCode === 'faqir_miskin'
          ? (verifiedBeneficiary.asnafCategory === 'faqir' ? 'faqir' : 'miskin')
          : undefined,
        branchId: verifiedBeneficiary.branchId,
        branchName: verifiedBeneficiary.branchName,
        assistanceType: selectedAssistanceTypeObj.name,
        assistanceTypeId: selectedAssistanceTypeObj.id,
        assistanceGroup: selectedAssistanceTypeObj.group,
        assistanceTypeDetails: requestedItemsDetail,
        requestedAmount: Number(requestedAmountInput),
        necessityDetails: necessityDetailsInput || `ขอรับความช่วยเหลือประเภท ${selectedAssistanceTypeObj.name} (${selectedSpecificFundObj?.name || ''})`,
        urgencyLevel: urgencyLevelInput,
        documents: attachedDocuments.map((doc) => ({
          name: doc.name,
          category: doc.category,
          fileUrl: doc.fileUrl,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          storageProvider: doc.storageProvider,
          storagePath: doc.storagePath,
        })),
      });

      if (res) {
        setWizardSuccessData(res);
        setWizardStep(4);
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการยื่นคำร้อง', 'error');
    } finally {
      isSubmittingWizardRef.current = false;
      setIsSubmittingWizard(false);
    }
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
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors min-h-[40px]"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            onClick={handleOpenWizard}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs min-h-[40px]"
          >
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                      onClick={() => setSelectedApp(app)}
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
                          {app.titlePrefix} {app.fullName}
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

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{statusMeta.label}</span>
                        </span>
                      </td>

                      {/* Submission Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                        {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString('th-TH') : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b2545] hover:bg-slate-100 transition-colors"
                            title="ดูรายละเอียดคำร้อง & ติดตาม Workflow"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

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
                  คำร้องขอความช่วยเหลือ: {selectedApp.titlePrefix} {selectedApp.fullName}
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
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Header in Modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>ความคืบหน้า Workflow 7 ขั้นตอน</span>
                <span className="text-teal-800">
                  สถานะปัจจุบัน: {APPLICATION_STATUS_MAP[selectedApp.status]?.label || selectedApp.status}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {WORKFLOW_STEPS.map((ws) => {
                  let isDone = false;
                  let isCurrent = false;

                  const currentIdx = WORKFLOW_STEPS.findIndex((s) => s.status === selectedApp.status);
                  const thisIdx = ws.step - 1;

                  if (selectedApp.status === 'rejected') {
                    isDone = false;
                  } else if (thisIdx < currentIdx || selectedApp.status === 'closed') {
                    isDone = true;
                  } else if (thisIdx === currentIdx) {
                    isCurrent = true;
                  }

                  return (
                    <div key={ws.step} className="text-center">
                      <div className={`h-2 rounded-full mb-1 transition-all ${
                        isDone ? 'bg-emerald-600' : isCurrent ? 'bg-amber-500 animate-pulse' : 'bg-slate-200'
                      }`} />
                      <span className={`text-[9px] block font-semibold leading-tight truncate ${
                        isCurrent ? 'text-amber-800 font-bold' : isDone ? 'text-emerald-800' : 'text-slate-400'
                      }`}>
                        {ws.label.split('. ')[1]}
                      </span>
                    </div>
                  );
                })}
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
                      onClick={() => onNavigate('beneficiaries')}
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
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-teal-800 bg-white border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors shadow-2xs"
                        >
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
                          className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                        >
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

              {/* Attached Documents in Modal */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>เอกสารและหลักฐานประกอบคำร้อง ({selectedApp.documents?.length || 0} รายการ)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">ระบบจัดเก็บปลอดภัย • เปิดดูและดาวน์โหลดได้ตามสิทธิ์</span>
                </div>

                <DocumentListTable
                  documents={selectedApp.documents || []}
                  readOnly={true}
                />
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
              <button onClick={() => setShowApprovalDialog(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">ผู้ยื่นคำร้อง:</span>
                <strong className="text-slate-900 text-sm block">{selectedApp.fullName}</strong>
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
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="ระบุมติที่ประชุมหรือเงื่อนไขการเบิกจ่าย..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
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
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-colors shadow-xs"
              >
                ยืนยันอนุมัติ
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
              <button onClick={() => setShowRejectionDialog(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">ผู้ยื่นคำร้อง:</span>
                <strong className="text-slate-900 text-sm block">{selectedApp.fullName}</strong>
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
              <button onClick={() => setShowDisburseDialog(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">ผู้รับความช่วยเหลือ:</span>
                <strong className="text-slate-900 text-sm block">{selectedApp.fullName}</strong>
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
              <button onClick={() => setShowCancelDialog(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">คำร้อง:</span>
                <strong className="text-slate-900 text-sm block">{selectedApp.applicationNo} - {selectedApp.fullName}</strong>
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

      {/* 10. New Assistance Request Wizard Modal (4 Steps) */}
      {isWizardOpen && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsWizardOpen(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[calc(100dvh-24px)] flex flex-col overflow-hidden my-auto"
            >
            {/* Wizard Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-[#0b2545] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-amber-300 font-bold flex items-center justify-center shrink-0 border border-white/20">
                  <FileText className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white">
                    ยื่นคำร้องขอความช่วยเหลือ (Assistance Request)
                  </h2>
                  <p className="text-xs text-sky-200 mt-0.5">
                    สำหรับผู้ที่มีทะเบียนผู้มีสิทธิ์รับซะกาตที่ผ่านการตรวจสอบแล้วในระบบ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wizard Stepper Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {[
                  { step: 1, title: '1. ตรวจสอบทะเบียน' },
                  { step: 2, title: '2. ประเภทความช่วยเหลือ' },
                  { step: 3, title: '3. รายละเอียดคำร้อง' },
                  { step: 4, title: '4. ส่งคำร้องสำเร็จ' },
                ].map((s, idx) => (
                  <div key={s.step} className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        wizardStep === s.step
                          ? 'bg-[#0b2545] text-white shadow-xs'
                          : wizardStep > s.step
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {wizardStep > s.step ? '✓' : s.step}
                    </div>
                    <span
                      className={`text-xs font-semibold hidden md:inline ${
                        wizardStep === s.step ? 'text-slate-900 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {s.title}
                    </span>
                    {idx < 3 && <div className="w-6 sm:w-12 h-0.5 bg-slate-200 hidden sm:block" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Wizard Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {/* ======================================================== */}
              {/* STEP 1: Verify National ID & Beneficiary Registry       */}
              {/* ======================================================== */}
              {wizardStep === 1 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl text-sky-900 text-xs flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm text-sky-950">
                        เงื่อนไขบังคับก่อนยื่นคำร้องขอความช่วยเหลือ
                      </div>
                      <p className="mt-1 leading-relaxed text-sky-800">
                        ผู้ยื่นคำร้องต้องมีบัญชีสมาชิก (Member) และมีทะเบียนผู้มีสิทธิ์รับซะกาตที่ตรวจสอบแล้วในระบบก่อน ระบบจะตรวจสอบความถูกต้องจากฐานข้อมูลฝั่ง Server ก่อนอนุญาตให้ดำเนินการ
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                    <label className="block text-xs font-bold text-slate-800">
                      ระบุเลขประจำตัวประชาชน 13 หลักของผู้มีสิทธิ์รับซะกาต *
                    </label>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          maxLength={13}
                          inputMode="numeric"
                          value={nationalIdInput}
                          onChange={(e) => {
                            setNationalIdInput(e.target.value.replace(/[^0-9]/g, ''));
                            setIdCheckStatus('idle');
                            setIdCheckError(null);
                          }}
                          placeholder="กรอกเลขประจำตัวประชาชน 13 หลัก เช่น 1100200000006"
                          className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm tracking-wider focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] font-semibold"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyNationalId}
                        disabled={isCheckingId || nationalIdInput.length !== 13}
                        className="px-6 py-3 bg-[#0b2545] hover:bg-[#143761] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shrink-0 flex items-center justify-center gap-2 min-h-[44px]"
                      >
                        {isCheckingId ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>กำลังตรวจสอบกับเซิร์ฟเวอร์...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 text-amber-300" />
                            <span>ตรวจสอบสิทธิ์ในฐานข้อมูล</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* ERROR CASE: Beneficiary NOT Found (Mandatory Prompt Requirement) */}
                    {idCheckStatus === 'not_found' && (
                      <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-4 animate-shake">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertTriangle className="w-5 h-5 text-rose-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-base text-rose-950">
                              ไม่พบข้อมูลการขึ้นทะเบียนผู้มีสิทธิ์ในระบบ
                            </div>
                            <p className="text-sm font-bold text-rose-800 mt-1 leading-relaxed">
                              {idCheckError || 'เลขบัตรประชาชนนี้ยังไม่ได้ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต กรุณาดำเนินการขึ้นทะเบียนผู้มีสิทธิ์รับซะกาตก่อนยื่นคำร้องขอความช่วยเหลือ'}
                            </p>
                            <p className="text-xs text-rose-600 mt-1.5">
                              ตามระเบียบของมูลนิธิ การยื่นคำร้องขอความช่วยเหลือจะกระทำได้เฉพาะบุคคลที่มีทะเบียนผู้มีสิทธิ์รับซะกาตที่ผ่านการตรวจสอบแล้วเท่านั้น
                            </p>
                          </div>
                        </div>

                        {/* 2 Mandated Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-rose-200">
                          <button
                            type="button"
                            onClick={() => {
                              setIsWizardOpen(false);
                              onNavigate('beneficiaries');
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors min-h-[44px]"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>ไปหน้าขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsWizardOpen(false);
                              onNavigate('dashboard');
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 font-bold text-xs sm:text-sm transition-colors min-h-[44px]"
                          >
                            <span>กลับหน้าหลัก</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* FORBIDDEN CASE: Member attempting to use someone else's ID */}
                    {idCheckStatus === 'forbidden' && (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-sm text-amber-900">
                            จำกัดสิทธิ์ความปลอดภัย:
                          </div>
                          <p className="text-xs text-amber-800 mt-0.5">
                            {idCheckError}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SUCCESS CASE: Beneficiary Found & Verified */}
                    {idCheckStatus === 'found' && verifiedBeneficiary && (
                      <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <span>ตรวจสอบสำเร็จ: พบบัญชีทะเบียนผู้มีสิทธิ์ในระบบเรียบร้อย</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900 font-mono">
                            {verifiedBeneficiary.registrationNo}
                          </span>
                        </div>

                        {/* Verified Profile Card - Auto-fills basic info, no re-entry needed */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-emerald-200 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[11px]">ชื่อ–นามสกุล:</span>
                            <strong className="text-slate-900 text-sm block mt-0.5">{verifiedBeneficiary.fullName}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">เลขประจำตัวประชาชน:</span>
                            <span className="font-mono text-slate-800 font-bold block mt-0.5">{verifiedBeneficiary.nationalIdMasked}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">หมวดหมู่อัสนัฟ:</span>
                            <span className="font-semibold text-teal-800 block mt-0.5">
                              {verifiedBeneficiary.asnafCategory === 'faqir' ? 'ฟะกีร (ผู้ยากจน)' :
                               verifiedBeneficiary.asnafCategory === 'miskin' ? 'มิสกีน (ผู้ขัดสน)' :
                               verifiedBeneficiary.asnafCategory === 'muallaf' ? 'มุอัลลัฟ (มุสลิมใหม่)' :
                               verifiedBeneficiary.asnafCategory === 'gharimin' ? 'ฆอริมูน (มีหนี้สินล้นตัว)' :
                               verifiedBeneficiary.asnafCategory === 'ibnsabil' ? 'อิบนุสสะบีล (ผู้เดินทาง)' : 'ผู้มีสิทธิ์ตามหลักศาสนา'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">หมายเลขโทรศัพท์:</span>
                            <span className="text-slate-800 block mt-0.5">{verifiedBeneficiary.phone || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">สาขาที่ดูแล:</span>
                            <span className="text-slate-800 block mt-0.5">{verifiedBeneficiary.branchName || 'สำนักงานใหญ่'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">สถานะทะเบียน:</span>
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px] mt-0.5">
                              ✓ มีคุณสมบัติตามเกณฑ์
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => setWizardStep(2)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors min-h-[44px]"
                          >
                            <span>ขั้นตอนถัดไป: เลือกประเภทความช่วยเหลือ</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 2: Choose 3-Tier Dynamic Fund Structure             */}
              {/* ======================================================== */}
              {wizardStep === 2 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900">
                        เลือกโครงสร้างกองทุนและประเภทความช่วยเหลือ (3 ระดับ)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        โครงสร้างมาตรฐาน: ระดับ 1 กลุ่มหลัก › ระดับ 2 กองทุนเฉพาะ › ระดับ 3 ประเภทความช่วยเหลือ
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold shrink-0">
                      <span>ปีงบประมาณ 2569</span>
                    </div>
                  </div>

                  {/* Level 1: Primary Fund Group */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-800 text-white inline-flex items-center justify-center text-[10px]">1</span>
                      <span>ระดับที่ 1: กลุ่มหลัก (Primary Fund Group)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {eligiblePrimaryGroups.map((pg) => {
                        const isSelected = selectedPrimaryGroupCode === pg.asnafCode;
                        return (
                          <button
                            key={pg.asnafCode}
                            type="button"
                            onClick={() => {
                              setSelectedPrimaryGroupCode(pg.asnafCode);
                              const firstSf = pg.specificFunds?.[0];
                              const firstAst = firstSf?.assistanceTypes?.[0];
                              setSelectedSpecificFundId(firstSf ? firstSf.id : '');
                              setSelectedAssistanceTypeId(firstAst ? firstAst.id : '');
                              if (firstAst?.defaultMinAmount) setRequestedAmountInput(firstAst.defaultMinAmount);
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                              isSelected
                                ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{pg.asnafName}</span>
                            <span className={`ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {pg.specificFunds?.length || 0} กองทุน
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Level 2: Specific Fund */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-800 text-white inline-flex items-center justify-center text-[10px]">2</span>
                      <span>ระดับที่ 2: กลุ่มเฉพาะ / กองทุน (Specific Fund Group)</span>
                      <span className="text-[11px] font-normal text-slate-500">ภายใต้ {selectedPrimaryGroupObj?.asnafName || '-'}</span>
                    </label>

                    {availableSpecificFundsForWizard.length === 0 ? (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                        ยังไม่มีกองทุนเฉพาะที่เปิดใช้งานภายใต้กลุ่มหลักนี้
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {availableSpecificFundsForWizard.map((sf) => {
                          const isSelected = selectedSpecificFundId === sf.id;
                          return (
                            <div
                              key={sf.id}
                              onClick={() => {
                                setSelectedSpecificFundId(sf.id);
                                const firstAst = sf.assistanceTypes?.[0];
                                setSelectedAssistanceTypeId(firstAst ? firstAst.id : '');
                                if (firstAst?.defaultMinAmount) setRequestedAmountInput(firstAst.defaultMinAmount);
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-teal-700 bg-teal-50/70 shadow-xs ring-1 ring-teal-700'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-100/70 px-1.5 py-0.5 rounded">
                                  {sf.code}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 font-mono">
                                  {sf.percentage}%
                                </span>
                              </div>
                              <strong className="text-xs text-slate-900 block leading-snug">
                                {sf.name}
                              </strong>
                              <span className="text-[10px] text-slate-500 block mt-1">
                                {sf.assistanceTypes?.length || 0} ประเภทความช่วยเหลือ
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Level 3: Assistance Types */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-800 text-white inline-flex items-center justify-center text-[10px]">3</span>
                      <span>ระดับที่ 3: ประเภทความช่วยเหลือ (Assistance Type) *</span>
                      <span className="text-[11px] font-normal text-slate-500">ภายใต้ {selectedSpecificFundObj?.name || '-'}</span>
                    </label>

                    {availableAssistanceTypesForWizard.length === 0 ? (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                        ยังไม่มีประเภทความช่วยเหลือที่เปิดใช้งานภายใต้กองทุนเฉพาะนี้
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {availableAssistanceTypesForWizard.map((ast) => {
                          const isSelected = selectedAssistanceTypeId === ast.id;
                          return (
                            <div
                              key={ast.id}
                              onClick={() => {
                                setSelectedAssistanceTypeId(ast.id);
                                if (ast.defaultMinAmount) setRequestedAmountInput(ast.defaultMinAmount);
                              }}
                              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                                isSelected
                                  ? 'border-teal-700 bg-teal-50/60 shadow-sm ring-1 ring-teal-700'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-teal-50 text-teal-800 border-teal-200 font-mono">
                                    {ast.code}
                                  </span>

                                  <span className="text-[11px] font-bold text-slate-600 font-mono">
                                    ฿{ast.defaultMinAmount?.toLocaleString() || 0} - ฿{ast.defaultMaxAmount?.toLocaleString() || 0}
                                  </span>
                                </div>

                                <div className="flex items-start gap-2.5 mt-2">
                                  <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                      isSelected ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    ✓
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-sm text-slate-900">
                                      {ast.name}
                                    </h4>
                                    {ast.description && (
                                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                        {ast.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {ast.conditionsText && (
                                  <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                                    <span className="font-bold text-slate-800">เกณฑ์เงื่อนไข:</span> {ast.conditionsText}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                                <span className="text-[10px] text-slate-400 block w-full mb-0.5">เอกสารที่ต้องใช้:</span>
                                {(ast.requiredDocuments || ['สำเนาบัตรประจำตัวประชาชน', 'สำเนาทะเบียนบ้าน']).slice(0, 3).map((doc, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[170px]"
                                  >
                                    • {doc}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Navigation footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs min-h-[44px]"
                    >
                      ← ย้อนกลับ
                    </button>
                    <button
                      type="button"
                      disabled={!selectedAssistanceTypeId}
                      onClick={() => setWizardStep(3)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors min-h-[44px]"
                    >
                      <span>ขั้นตอนถัดไป: ระบุวงเงินและความจำเป็น</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 3: Enter Amount, Necessity & Documents              */}
              {/* ======================================================== */}
              {wizardStep === 3 && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Selected 3-Tier Summary */}
                  <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                        <span>{selectedPrimaryGroupObj?.asnafName || 'กลุ่มหลัก'}</span>
                        <span>›</span>
                        <span>{selectedSpecificFundObj?.name || 'กองทุนเฉพาะ'}</span>
                      </div>
                      <strong className="text-sm sm:text-base text-slate-900 block mt-0.5">
                        {selectedAssistanceTypeObj?.name || 'ประเภทความช่วยเหลือ'} {selectedAssistanceTypeObj?.code ? `(${selectedAssistanceTypeObj.code})` : ''}
                      </strong>
                      {selectedAssistanceTypeObj?.conditionsText && (
                        <p className="text-[11px] text-teal-900/80 mt-0.5">
                          เกณฑ์เงื่อนไข: {selectedAssistanceTypeObj.conditionsText}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="text-xs text-teal-800 underline font-semibold hover:text-teal-950 shrink-0"
                    >
                      เปลี่ยนประเภทความช่วยเหลือ
                    </button>
                  </div>

                  <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 text-xs">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        จำนวนเงินที่ขอรับความช่วยเหลือ (บาท) *
                      </label>
                      <input
                        type="number"
                        min={500}
                        step={500}
                        value={requestedAmountInput}
                        onChange={(e) => setRequestedAmountInput(Number(e.target.value))}
                        className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-base font-extrabold text-teal-900"
                      />

                      {/* Quick Amount Presets */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[2000, 3000, 5000, 10000, 20000, 25000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setRequestedAmountInput(amt)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                              requestedAmountInput === amt
                                ? 'bg-teal-800 text-white border-teal-800'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            ฿{amt.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        รายละเอียดสิ่งของ / อุปกรณ์ หรือการดำเนินงานที่ต้องการ (ถ้ามี):
                      </label>
                      <input
                        type="text"
                        value={requestedItemsDetail}
                        onChange={(e) => setRequestedItemsDetail(e.target.value)}
                        placeholder="เช่น ข้าวสาร 2 กระสอบและนมผงเด็ก, หรือวัสดุมุงหลังคาและอุปกรณ์ช่าง..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        รายละเอียดความจำเป็นและเหตุผลความเดือดร้อน *
                      </label>
                      <textarea
                        rows={3}
                        value={necessityDetailsInput}
                        onChange={(e) => setNecessityDetailsInput(e.target.value)}
                        placeholder="ระบุเหตุผลความจำเป็นเร่งด่วน สภาพปัญหา และผลกระทบต่อการดำรงชีพ..."
                        className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1.5">
                        ระดับความเร่งด่วน:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'normal', label: 'ปกติ', color: 'border-slate-200 text-slate-700' },
                          { id: 'high', label: 'ด่วน', color: 'border-amber-300 text-amber-800' },
                          { id: 'urgent', label: 'ฉุกเฉินเร่งด่วน', color: 'border-rose-300 text-rose-800' },
                        ].map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setUrgencyLevelInput(u.id as any)}
                            className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-colors ${
                              urgencyLevelInput === u.id
                                ? 'bg-[#0b2545] text-white border-[#0b2545]'
                                : `bg-slate-50 ${u.color}`
                            }`}
                          >
                            {u.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Required Documents Checklist */}
                    <div className="pt-3 border-t border-slate-100">
                      <span className="font-bold text-slate-700 block mb-1">
                        เอกสารประกอบที่ต้องเตรียมแนบตามเกณฑ์ ({selectedAssistanceTypeObj?.name || 'ทั่วไป'}):
                      </span>
                      <ul className="space-y-1 text-slate-600">
                        {(
                          selectedAssistanceTypeObj?.requiredDocuments && selectedAssistanceTypeObj.requiredDocuments.length > 0
                            ? selectedAssistanceTypeObj.requiredDocuments
                            : ['สำเนาบัตรประจำตัวประชาชน', 'สำเนาทะเบียนบ้าน']
                        ).map((d, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Direct S3 / Cloud Storage File Uploader */}
                    <div className="pt-3 border-t border-slate-100">
                      <DocumentUploader
                        entityType="assistance_request"
                        entityId={verifiedBeneficiary?.id || 'draft'}
                        existingDocuments={attachedDocuments}
                        onDocumentsChange={setAttachedDocuments}
                      />
                    </div>
                  </div>

                  {/* Navigation footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs min-h-[44px]"
                    >
                      ← ย้อนกลับ
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors min-h-[44px]"
                    >
                      <span>ขั้นตอนถัดไป: ตรวจสอบและยืนยัน</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 4: Review, Confirmation & Success Tracking          */}
              {/* ======================================================== */}
              {wizardStep === 4 && (
                <div className="space-y-5 animate-fadeIn">
                  {!wizardSuccessData ? (
                    <>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
                        <h3 className="font-extrabold text-base text-slate-900 border-b border-slate-100 pb-2">
                          สรุปข้อมูลคำร้องขอความช่วยเหลือเพื่อยืนยัน
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div>
                            <span className="text-slate-400 block text-[11px]">ผู้ยื่นคำร้อง:</span>
                            <strong className="text-slate-900 text-sm block mt-0.5">
                              {verifiedBeneficiary?.fullName}
                            </strong>
                            <span className="font-mono text-teal-800 font-bold">
                              รหัสทะเบียน: {verifiedBeneficiary?.registrationNo}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[11px]">เลขประจำตัวประชาชน:</span>
                            <span className="font-mono text-slate-800 font-bold block mt-0.5">
                              {verifiedBeneficiary?.nationalIdMasked}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[11px]">โครงสร้างกองทุนและประเภท:</span>
                            <strong className="text-slate-900 block mt-0.5">
                              {selectedAssistanceTypeObj?.name || '-'}
                            </strong>
                            <span className="text-[10px] text-teal-800 block">
                              {selectedPrimaryGroupObj?.asnafName || '-'} › {selectedSpecificFundObj?.name || '-'}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[11px]">วงเงินที่ขอรับความช่วยเหลือ:</span>
                            <span className="font-mono text-base font-extrabold text-teal-800 block mt-0.5">
                              ฿{requestedAmountInput.toLocaleString()} บาท
                            </span>
                          </div>

                          {requestedItemsDetail && (
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 block text-[11px]">สิ่งของ / อุปกรณ์ที่ต้องการ:</span>
                              <span className="text-slate-800 block mt-0.5">{requestedItemsDetail}</span>
                            </div>
                          )}

                          <div className="sm:col-span-2">
                            <span className="text-slate-400 block text-[11px]">รายละเอียดความจำเป็น:</span>
                            <span className="text-slate-800 block mt-0.5 whitespace-pre-line">
                              {necessityDetailsInput || 'ขอรับความช่วยเหลือตามหลักเกณฑ์มูลนิธิ'}
                            </span>
                          </div>

                          <div className="sm:col-span-2">
                            <span className="text-slate-400 block text-[11px]">เอกสารแนบในระบบ ({attachedDocuments.length} รายการ):</span>
                            {attachedDocuments.length === 0 ? (
                              <span className="text-slate-500 italic block mt-0.5">ไม่มีเอกสารแนบเพิ่มเติม</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {attachedDocuments.map((d) => (
                                  <span key={d.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium">
                                    <FileCheck2 className="w-3 h-3 text-emerald-600" />
                                    <span>{d.name}</span>
                                    <span className="text-slate-400">({(d.fileSize / 1024).toFixed(0)} KB)</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Shariah & Policy Disclaimer */}
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <p className="text-[11px] leading-relaxed">
                            <strong>ข้อควรทราบ:</strong> การยื่นคำร้องขอความช่วยเหลือไม่ถือเป็นการอนุมัติโดยอัตโนมัติ เจ้าหน้าที่จะตรวจสอบข้อมูล ลงพื้นที่ประเมิน และเสนอผลต่อผู้มีอำนาจพิจารณาอนุมัติตามระเบียบของมูลนิธิ
                          </p>
                        </div>
                      </div>

                      {/* Submit buttons */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs min-h-[44px]"
                        >
                          ← ย้อนกลับแก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitWizard}
                          disabled={isSubmittingWizard}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors min-h-[44px] disabled:opacity-50"
                        >
                          {isSubmittingWizard ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>กำลังส่งข้อมูลเข้าสู่ระบบ...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                              <span>ยืนยันและส่งคำร้องขอความช่วยเหลือ</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Submission Completed Screen */
                    <div className="text-center py-6 sm:py-8 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs border border-emerald-300">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                      </div>

                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">
                          ยื่นคำร้องขอความช่วยเหลือสำเร็จเรียบร้อย
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          ระบบได้บันทึกคำร้องและออกหมายเลขอ้างอิงเข้าสู่กระบวนการพิจารณา 9 ขั้นตอน
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-xs space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">เลขที่คำร้อง:</span>
                          <span className="font-mono font-extrabold text-sm text-[#0b2545]">
                            {wizardSuccessData.applicationNo}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">สถานะเริ่มต้น:</span>
                          <span className="px-2 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 text-[10px]">
                            1. รอตรวจสอบคำร้อง
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">ผู้ยื่นคำร้อง:</span>
                          <strong className="text-slate-800">{verifiedBeneficiary?.fullName}</strong>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsWizardOpen(false);
                            refreshData();
                          }}
                          className="px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors min-h-[44px]"
                        >
                          ดูรายการคำร้องทั้งหมด
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
      )}
    </div>
  );
}
