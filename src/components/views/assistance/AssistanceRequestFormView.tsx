'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  AsnafAllocation,
  AssistanceTypeItem,
  FaqirMiskinSubFund,
} from '@/types';
import { formatPersonName } from '@zms/shared';
import { DocumentUploader, UploadedDocumentItem } from '@/components/common/DocumentUploader';
import { ModalPortal } from '@/components/common/Modal';
import {
  FileText,
  User,
  Users,
  Home,
  MapPin,
  Phone,
  Calendar,
  Lock,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  FolderOpen,
  ClipboardCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Check,
  X,
  Search,
  ExternalLink,
  DollarSign,
  Download,
  Building,
  ArrowRight,
  RefreshCw,
  Edit,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

export interface AssistanceRequestFormViewProps {
  onNavigate: (view: string) => void;
  initialBeneficiaryId?: string;
  editDraftId?: string;
  onOpenMemberDetail?: (
    beneficiaryId: string,
    startEdit?: boolean,
    targetSection?: 'member_info' | 'requests'
  ) => void;
  onOpenRequestDetail?: (applicationId: string, rawApp?: any) => void;
}

const ASNAF_LABELS: Record<string, string> = {
  faqir: 'ฟะกีร (ผู้ยากจนข้นแค้น)',
  miskin: 'มิสกีน (ผู้มีรายได้ไม่พอใช้)',
  amil: 'อามิล (เจ้าหน้าที่ซะกาต)',
  muallaf: 'มุอัลลัฟ (ผู้มีใจผูกพันกับอิสลาม)',
  riqab: 'ริกอบ (ปลดปล่อยพันธนาการ)',
  gharimin: 'ฆอริมีน (ผู้มีหนี้สินล้นพ้นตัว)',
  fisabilillah: 'ฟีสะบีลิลลาฮ์ (ในหนทางของอัลลอฮ์)',
  ibnsabil: 'อิบนุสสะบีล (ผู้เดินทางขาดแคลน)',
};

const DRAFT_STORAGE_KEY = 'zms_assistance_request_draft_v1';

function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AssistanceRequestFormView({
  onNavigate,
  initialBeneficiaryId,
  editDraftId,
  onOpenMemberDetail,
  onOpenRequestDetail,
}: AssistanceRequestFormViewProps) {
  const {
    currentUser,
    authToken,
    registries,
    createAssistanceRequest,
    showToast,
    refreshData,
  } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitLock, setSubmitLock] = useState<boolean>(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => makeIdempotencyKey());

  // Draft banner
  const [savedDraftNotice, setSavedDraftNotice] = useState<{
    savedAt: string;
    beneficiaryId: string;
    memberId?: string;
    applicantName?: string;
    data: any;
  } | null>(null);

  // Success view state
  const [submittedResult, setSubmittedResult] = useState<{
    applicationId: string;
    applicationNo: string;
    beneficiaryName: string;
    amount: number;
    category: string;
    status: string;
  } | null>(null);

  // Confirmation dialog
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // ========================================================
  // Step 1: Beneficiary Profile State (Read-Only)
  // ========================================================
  const [beneficiaryInputId, setBeneficiaryInputId] = useState<string>(initialBeneficiaryId || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFetchingBeneficiary, setIsFetchingBeneficiary] = useState<boolean>(false);
  const [beneficiaryProfile, setBeneficiaryProfile] = useState<any | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ========================================================
  // 3-Tier Dynamic Fund Structure State
  // ========================================================
  const [primaryGroups, setPrimaryGroups] = useState<AsnafAllocation[]>([]);
  const [selectedPrimaryCode, setSelectedPrimaryCode] = useState<string>('faqir_miskin');
  const [selectedSpecificFundId, setSelectedSpecificFundId] = useState<string>('');
  const [selectedAssistanceTypeId, setSelectedAssistanceTypeId] = useState<string>('');
  const [selectedAssistanceTypeName, setSelectedAssistanceTypeName] = useState<string>('');
  const [selectedAssistanceGroup, setSelectedAssistanceGroup] = useState<'core' | 'specific'>('core');

  // ========================================================
  // Step 2: Request Details State
  // ========================================================
  const [targetAssessmentId, setTargetAssessmentId] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [hardshipReasons, setHardshipReasons] = useState<string>('');
  const [necessityDetails, setNecessityDetails] = useState<string>('');
  const [requestedAmount, setRequestedAmount] = useState<number>(5000);
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [fiscalYear, setFiscalYear] = useState<string>('2569');

  // ========================================================
  // Step 3: Documents State
  // ========================================================
  // Selected existing master documents from beneficiary_documents (read-only reference)
  const [selectedExistingDocIds, setSelectedExistingDocIds] = useState<string[]>([]);
  // Additional request-specific documents uploaded via DocumentUploader
  const [applicationDocs, setApplicationDocs] = useState<UploadedDocumentItem[]>([]);
  const [evidenceNotes, setEvidenceNotes] = useState<string>('');

  // ========================================================
  // Step 4: Verification & Certification Checkbox
  // ========================================================
  const [isCertifiedCorrect, setIsCertifiedCorrect] = useState<boolean>(true);

  // ========================================================
  // Draft editing state
  // ========================================================
  const [currentDraftApplicationNo, setCurrentDraftApplicationNo] = useState<string | null>(null);

  // Load 3-Tier Fund Hierarchy
  useEffect(() => {
    let active = true;
    fetch('/api/finance/allocations/asnaf?view=hierarchy&year=2569&activeOnly=true')
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        if (json.success && Array.isArray(json.data?.primaryGroups)) {
          setPrimaryGroups(json.data.primaryGroups);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Filter specific funds and assistance types based on selection
  const currentPrimaryGroup = useMemo(
    () => primaryGroups.find((g) => g.asnafCode === selectedPrimaryCode) || primaryGroups[0] || null,
    [primaryGroups, selectedPrimaryCode]
  );

  const availableSpecificFunds = useMemo(
    () => currentPrimaryGroup?.specificFunds || [],
    [currentPrimaryGroup]
  );

  const currentSpecificFund = useMemo(
    () =>
      availableSpecificFunds.find((sf) => sf.id === selectedSpecificFundId || sf.code === selectedSpecificFundId) ||
      availableSpecificFunds[0] ||
      null,
    [availableSpecificFunds, selectedSpecificFundId]
  );

  const availableAssistanceTypes = useMemo(
    () => currentSpecificFund?.assistanceTypes || [],
    [currentSpecificFund]
  );

  const currentAssistanceType = useMemo(
    () =>
      availableAssistanceTypes.find((at) => at.id === selectedAssistanceTypeId || at.code === selectedAssistanceTypeId) ||
      availableAssistanceTypes[0] ||
      null,
    [availableAssistanceTypes, selectedAssistanceTypeId]
  );

  // Sync fund selection defaults
  useEffect(() => {
    if (availableSpecificFunds.length > 0 && !availableSpecificFunds.some((sf) => sf.id === selectedSpecificFundId || sf.code === selectedSpecificFundId)) {
      setSelectedSpecificFundId(availableSpecificFunds[0].id);
    }
  }, [availableSpecificFunds, selectedSpecificFundId]);

  useEffect(() => {
    if (availableAssistanceTypes.length > 0) {
      if (!availableAssistanceTypes.some((at) => at.id === selectedAssistanceTypeId || at.code === selectedAssistanceTypeId)) {
        const first = availableAssistanceTypes[0];
        setSelectedAssistanceTypeId(first.id);
        setSelectedAssistanceTypeName(first.name);
        setSelectedAssistanceGroup(first.group || 'core');
      }
    }
  }, [availableAssistanceTypes, selectedAssistanceTypeId, requestedAmount]);

  // Fetch full verified beneficiary profile from Backend
  const loadBeneficiaryProfile = useCallback(
    async (targetIdOrCode: string) => {
      const trimmed = targetIdOrCode.trim();
      if (!trimmed) return;

      setIsFetchingBeneficiary(true);
      setFetchError(null);

      try {
        const token =
          authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token && token !== 'cookie-session') {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const cleanDigits = trimmed.replace(/[^0-9]/g, '');
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

        const payload: any = {};
        if (isUuid) {
          payload.beneficiaryId = trimmed;
        } else if (cleanDigits.length === 13) {
          payload.nationalId = cleanDigits;
        } else if (trimmed.startsWith('MB-')) {
          payload.memberId = trimmed;
        } else {
          payload.registrationNo = trimmed;
        }

        const res = await fetch('/api/assistance-requests/check-beneficiary', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (res.ok && json.success && json.found && json.beneficiary) {
          const ben = json.beneficiary;
          setBeneficiaryProfile(ben);
          setBeneficiaryInputId(ben.id);

          // Auto-select latest assessment
          if (ben.assessments && ben.assessments.length > 0) {
            setTargetAssessmentId(ben.latestAssessmentId || ben.assessments[0].id);
          }

          // Pre-check all existing registry documents as referenced
          if (Array.isArray(ben.registryDocuments)) {
            setSelectedExistingDocIds(ben.registryDocuments.map((d: any) => d.id));
          }
        } else {
          setFetchError(json.error || 'ไม่พบข้อมูลผู้มีสิทธิ์รับซะกาตตามที่ระบุ');
          setBeneficiaryProfile(null);
        }
      } catch (err: any) {
        setFetchError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูลผู้มีสิทธิ์');
        setBeneficiaryProfile(null);
      } finally {
        setIsFetchingBeneficiary(false);
      }
    },
    [authToken]
  );

  // Auto-fetch if initialBeneficiaryId is provided
  useEffect(() => {
    if (initialBeneficiaryId) {
      loadBeneficiaryProfile(initialBeneficiaryId);
    }
  }, [initialBeneficiaryId, loadBeneficiaryProfile]);

  // Load existing draft if editDraftId is passed
  useEffect(() => {
    if (!editDraftId) return;
    const fetchDraft = async () => {
      try {
        const token =
          authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
        const headers: Record<string, string> = {};
        if (token && token !== 'cookie-session') {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`/api/assistance-requests/${encodeURIComponent(editDraftId)}`, {
          headers,
          credentials: 'include',
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const app = json.data;
          setCurrentDraftApplicationNo(app.applicationNo);
          setPurpose(app.assistanceTypeDetails || '');
          setHardshipReasons(app.hardshipReasons || '');
          setNecessityDetails(app.necessityDetails || '');
          setRequestedAmount(Number(app.requestedAmount) || 5000);
          setUrgencyLevel(app.urgencyLevel || 'normal');
          setFiscalYear(app.fiscalYear || '2569');
          if (app.assessmentId) setTargetAssessmentId(app.assessmentId);
          if (app.primaryGroupCode) setSelectedPrimaryCode(app.primaryGroupCode);
          if (app.specificFundId) setSelectedSpecificFundId(app.specificFundId);
          if (app.assistanceTypeId) setSelectedAssistanceTypeId(app.assistanceTypeId);

          if (app.beneficiaryId) {
            await loadBeneficiaryProfile(app.beneficiaryId);
          }
        }
      } catch {}
    };
    void fetchDraft();
  }, [editDraftId, authToken, loadBeneficiaryProfile]);

  // Check LocalStorage Draft on mount
  useEffect(() => {
    if (editDraftId) return;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.savedAt && parsed.data) {
          setSavedDraftNotice(parsed);
        }
      }
    } catch {}
  }, [editDraftId]);

  // Auto-save form progress to LocalStorage
  const saveDraftToStorage = useCallback(() => {
    if (!beneficiaryProfile) return;
    try {
      const draftData = {
        savedAt: new Date().toISOString(),
        beneficiaryId: beneficiaryProfile.id,
        memberId: beneficiaryProfile.memberId,
        applicantName: beneficiaryProfile.fullName,
        data: {
          currentStep,
          selectedPrimaryCode,
          selectedSpecificFundId,
          selectedAssistanceTypeId,
          selectedAssistanceTypeName,
          targetAssessmentId,
          purpose,
          hardshipReasons,
          necessityDetails,
          requestedAmount,
          urgencyLevel,
          fiscalYear,
          selectedExistingDocIds,
          evidenceNotes,
        },
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    } catch {}
  }, [
    beneficiaryProfile,
    currentStep,
    selectedPrimaryCode,
    selectedSpecificFundId,
    selectedAssistanceTypeId,
    selectedAssistanceTypeName,
    targetAssessmentId,
    purpose,
    hardshipReasons,
    necessityDetails,
    requestedAmount,
    urgencyLevel,
    fiscalYear,
    selectedExistingDocIds,
    evidenceNotes,
  ]);

  // Restore draft handler
  const handleRestoreDraft = () => {
    if (!savedDraftNotice) return;
    const { beneficiaryId, data } = savedDraftNotice;
    if (beneficiaryId) {
      void loadBeneficiaryProfile(beneficiaryId);
    }
    if (data) {
      if (data.selectedPrimaryCode) setSelectedPrimaryCode(data.selectedPrimaryCode);
      if (data.selectedSpecificFundId) setSelectedSpecificFundId(data.selectedSpecificFundId);
      if (data.selectedAssistanceTypeId) setSelectedAssistanceTypeId(data.selectedAssistanceTypeId);
      if (data.selectedAssistanceTypeName) setSelectedAssistanceTypeName(data.selectedAssistanceTypeName);
      if (data.targetAssessmentId) setTargetAssessmentId(data.targetAssessmentId);
      if (data.purpose) setPurpose(data.purpose);
      if (data.hardshipReasons) setHardshipReasons(data.hardshipReasons);
      if (data.necessityDetails) setNecessityDetails(data.necessityDetails);
      if (data.requestedAmount) setRequestedAmount(Number(data.requestedAmount));
      if (data.urgencyLevel) setUrgencyLevel(data.urgencyLevel);
      if (data.fiscalYear) setFiscalYear(data.fiscalYear);
      if (Array.isArray(data.selectedExistingDocIds)) setSelectedExistingDocIds(data.selectedExistingDocIds);
      if (data.evidenceNotes) setEvidenceNotes(data.evidenceNotes);
      if (data.currentStep) setCurrentStep(Math.min(5, Math.max(1, data.currentStep)));
    }
    setSavedDraftNotice(null);
    showToast('กู้คืนข้อมูลคำร้องฉบับร่างเรียบร้อยแล้ว', 'info');
  };

  const handleDismissDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setSavedDraftNotice(null);
  };

  // Step validation before proceeding
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!beneficiaryProfile) {
        showToast('กรุณาระบุและตรวจสอบข้อมูลผู้มีสิทธิ์รับซะกาตก่อนดำเนินการ', 'error');
        return;
      }
    } else if (currentStep === 2) {
      if (!requestedAmount || requestedAmount <= 0) {
        showToast('กรุณาระบุจำนวนเงินที่ขอรับความช่วยเหลือให้ถูกต้อง', 'error');
        return;
      }
      if (!necessityDetails.trim() && !hardshipReasons.trim() && !purpose.trim()) {
        showToast('กรุณาระบุวัตถุประสงค์หรือรายละเอียดความจำเป็นในการขอความช่วยเหลือ', 'error');
        return;
      }
    } else if (currentStep === 4) {
      if (!isCertifiedCorrect) {
        showToast('กรุณากดยืนยันการรับรองความถูกต้องของข้อมูลก่อนดำเนินการต่อ', 'error');
        return;
      }
    }

    saveDraftToStorage();
    setCurrentStep((s) => Math.min(5, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    saveDraftToStorage();
    setCurrentStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Build assistance request payload
  const buildPayload = (targetStatus: 'draft' | 'submitted') => {
    return {
      beneficiaryId: beneficiaryProfile?.id || beneficiaryInputId,
      assessmentId: targetAssessmentId || undefined,
      primaryGroupCode: selectedPrimaryCode || 'faqir_miskin',
      asnafCategory: beneficiaryProfile?.asnafCategory || 'miskin',
      specificFundId: currentSpecificFund?.id || undefined,
      specificFundCode: currentSpecificFund?.code || undefined,
      specificFundName: currentSpecificFund?.name || undefined,
      assistanceTypeId: currentAssistanceType?.id || undefined,
      assistanceType: currentAssistanceType?.name || selectedAssistanceTypeName || 'ปัจจัยยังชีพ',
      assistanceGroup: selectedAssistanceGroup || 'core',
      assistanceTypeDetails: purpose || necessityDetails || undefined,
      hardshipReasons: hardshipReasons || necessityDetails || purpose || '',
      necessityDetails: necessityDetails || hardshipReasons || purpose || '',
      requestedAmount: Number(requestedAmount) || 0,
      urgencyLevel,
      fiscalYear,
      idempotencyKey,
      status: targetStatus,
      documents: applicationDocs.map((doc) => ({
        name: doc.name,
        category: doc.category || 'other_doc',
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        storageProvider: doc.storageProvider || 'local',
        storagePath: doc.storagePath || doc.fileUrl,
      })),
    };
  };

  // Submit or Save Draft Handler
  const handleSaveOrSubmit = async (targetStatus: 'draft' | 'submitted') => {
    if (submitLock || isSubmitting) return;

    if (!beneficiaryProfile) {
      showToast('ไม่พบข้อมูลผู้มีสิทธิ์รับซะกาต กรุณาตรวจสอบข้อมูลก่อน', 'error');
      return;
    }

    if (targetStatus === 'submitted' && (!requestedAmount || requestedAmount <= 0)) {
      showToast('กรุณาระบุจำนวนเงินที่ขอรับความช่วยเหลือให้ถูกต้อง', 'error');
      return;
    }

    setSubmitLock(true);
    setIsSubmitting(true);

    try {
      const payload = buildPayload(targetStatus);

      // If updating an existing draft application
      if (currentDraftApplicationNo || editDraftId) {
        const targetId = currentDraftApplicationNo || editDraftId;
        const token =
          authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token && token !== 'cookie-session') {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/assistance-requests/${encodeURIComponent(targetId!)}`, {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'ไม่สามารถบันทึกคำร้องได้');
        }

        const appData = json.data;
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}

        if (targetStatus === 'draft') {
          showToast(`บันทึกฉบับร่างเรียบร้อยแล้ว (เลขคำร้อง ${appData.applicationNo})`, 'success');
        } else {
          showToast(`ยื่นคำร้องขอความช่วยเหลือสำเร็จ เลขที่คำร้อง ${appData.applicationNo}`, 'success');
          setSubmittedResult({
            applicationId: appData.id || appData.applicationId,
            applicationNo: appData.applicationNo,
            beneficiaryName: beneficiaryProfile.fullName,
            amount: Number(appData.requestedAmount || requestedAmount),
            category: appData.assistanceType || selectedAssistanceTypeName,
            status: 'submitted',
          });
        }
        await refreshData();
        return;
      }

      // Creating a new assistance request
      const result = await createAssistanceRequest(payload);
      if (!result) {
        throw new Error('ไม่สามารถบันทึกคำร้องได้ กรุณาลองใหม่อีกครั้ง');
      }

      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      if (targetStatus === 'draft') {
        showToast(
          `บันทึกฉบับร่างคำร้องเรียบร้อยแล้ว (เลขคำร้อง ${result.applicationNo || 'DRAFT'})`,
          'success'
        );
        setCurrentDraftApplicationNo(result.applicationNo || null);
      } else {
        showToast(
          `ยื่นคำร้องขอความช่วยเหลือสำเร็จ เลขที่คำร้อง ${result.applicationNo}`,
          'success'
        );
        setSubmittedResult({
          applicationId: result.applicationId || (result as any).id,
          applicationNo: result.applicationNo,
          beneficiaryName: beneficiaryProfile.fullName,
          amount: Number(requestedAmount),
          category: selectedAssistanceTypeName,
          status: 'submitted',
        });
      }

      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกคำร้องขอความช่วยเหลือ', 'error');
    } finally {
      setIsSubmitting(false);
      setSubmitLock(false);
      setShowConfirmModal(false);
    }
  };

  // 5 Step definitions matching MultiStepRegistrationView design
  const steps = [
    { num: 1, title: 'ข้อมูลผู้ยื่นคำร้อง' },
    { num: 2, title: 'รายละเอียดความต้องการ' },
    { num: 3, title: 'หลักฐานและเอกสาร' },
    { num: 4, title: 'ตรวจสอบและยืนยัน' },
    { num: 5, title: 'สรุปและส่งคำร้อง' },
  ];

  // If successfully submitted, show clean completion summary
  if (submittedResult) {
    return (
      <div className="space-y-6 w-full max-w-7xl mx-auto animate-fadeIn pb-16">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              ยื่นคำร้องสำเร็จแล้ว
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-3">
              คำร้องขอความช่วยเหลือเลขที่ {submittedResult.applicationNo}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              คำร้องของ <strong className="text-slate-800">{submittedResult.beneficiaryName}</strong> ถูกส่งเข้าสู่กระบวนการพิจารณาตรวจสอบตามลำดับขั้นตอนของระบบแล้ว
            </p>
          </div>

          {/* Workflow Pipeline */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/70 max-w-3xl mx-auto text-left">
            <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-700" /> ขั้นตอนการดำเนินงานถัดไป (Workflow)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-[11px]">
              <div className="p-2.5 rounded-xl bg-emerald-700 text-white font-bold shadow-xs">
                1. ยื่นคำร้อง<br />✓ สำเร็จ
              </div>
              <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800 font-bold border border-sky-200">
                2. ตรวจสอบ<br />เอกสาร
              </div>
              <div className="p-2.5 rounded-xl bg-slate-200 text-slate-600">
                3. ประเมิน<br />สิทธิ์
              </div>
              <div className="p-2.5 rounded-xl bg-slate-200 text-slate-600">
                4. พิจารณา<br />อนุมัติ
              </div>
              <div className="p-2.5 rounded-xl bg-slate-200 text-slate-600">
                5. บันทึกการ<br />ช่วยเหลือ
              </div>
              <div className="p-2.5 rounded-xl bg-slate-200 text-slate-600">
                6. ตรวจสอบ<br />และติดตาม
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                if (onOpenRequestDetail) {
                  onOpenRequestDetail(submittedResult.applicationId);
                } else {
                  onNavigate('assistance-requests');
                }
              }}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-2 min-h-[44px]"
            >
              <FileText className="w-4 h-4" /> ดูรายละเอียดคำร้องฉบับนี้
            </button>
            <button
              type="button"
              onClick={() => {
                if (beneficiaryProfile?.id && onOpenMemberDetail) {
                  onOpenMemberDetail(beneficiaryProfile.id, false, 'requests');
                } else {
                  onNavigate('beneficiaries');
                }
              }}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors min-h-[44px]"
            >
              กลับหน้ารายละเอียดสมาชิก
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto animate-fadeIn pb-16">
      {/* ========================================================
          1. Top Banner (Identical to MultiStepRegistrationView)
         ======================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900">
                  แบบฟอร์มยื่นคำร้องขอรับความช่วยเหลือ (Assistance Request Form)
                </h1>
                {currentDraftApplicationNo && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    โหมดแก้ไขฉบับร่าง: {currentDraftApplicationNo}
                  </span>
                )}
                {beneficiaryProfile?.memberId && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {beneficiaryProfile.memberId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                มูลนิธิซะกาตและสาธารณกุศล • บันทึกคำร้องขอรับความช่วยเหลือตามหลักชะรีอะฮ์ โดยเชื่อมโยงทะเบียนเดิมอัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (initialBeneficiaryId && onOpenMemberDetail) {
              onOpenMemberDetail(initialBeneficiaryId);
            } else {
              onNavigate('assistance-requests');
            }
          }}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
        >
          ← กลับหน้ารายการ
        </button>
      </div>

      {/* ========================================================
          2. Draft restoration banner (Identical to MultiStepRegistrationView)
         ======================================================== */}
      {savedDraftNotice && !editDraftId && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0">
              <Save className="w-5 h-5" />
            </span>
            <div>
              <p className="font-bold text-sm text-amber-950">พบข้อมูลฉบับร่างคำร้องที่ยังกรอกไม่เสร็จในเครื่องนี้</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                ผู้ขอรับความช่วยเหลือ: <strong className="text-slate-800">{savedDraftNotice.applicantName || 'ไม่ระบุชื่อ'}</strong> • รหัสสมาชิก: {savedDraftNotice.memberId || '-'} • บันทึกเมื่อ: {savedDraftNotice.savedAt ? new Date(savedDraftNotice.savedAt).toLocaleString('th-TH') : 'ไม่ระบุ'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-colors shadow-xs"
            >
              กู้คืนข้อมูลร่าง
            </button>
            <button
              type="button"
              onClick={handleDismissDraft}
              className="px-3.5 py-2 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100/60 rounded-xl font-medium transition-colors"
            >
              ลบฉบับร่าง
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          3. Steps Stepper Bar (Identical to MultiStepRegistrationView)
         ======================================================== */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none">
          {steps.map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num > 1 && !beneficiaryProfile) {
                  showToast('กรุณาระบุและตรวจสอบข้อมูลผู้มีสิทธิ์ก่อน', 'error');
                  return;
                }
                setCurrentStep(s.num);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] ${
                currentStep === s.num
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : currentStep > s.num
                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === s.num
                    ? 'bg-white text-emerald-700'
                    : currentStep > s.num
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {currentStep > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
              </span>
              <span className="hidden sm:inline">{s.title}</span>
              <span className="sm:hidden">ขั้นที่ {s.num}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          4. Main Multi-Step Form Container
         ======================================================== */}
      <form onSubmit={(e) => e.preventDefault()} className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">

        {/* ========================================================
            STEP 1: ส่วนที่ 1 ข้อมูลผู้ยื่นคำร้อง (จากทะเบียนเดิม)
           ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-700" /> ส่วนที่ 1: ข้อมูลผู้ยื่นคำร้อง (อ้างอิงจากทะเบียนเดิม)
                </h2>
                <p className="text-xs text-slate-500">
                  ระบบดึงข้อมูลจากทะเบียนหลักอัตโนมัติในรูปแบบอ่านอย่างเดียว (Read-Only) เพื่อความถูกต้องและไม่สร้างข้อมูลบุคคลซ้ำ
                </p>
              </div>

              {beneficiaryProfile && (
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" /> ทะเบียนตรวจสอบแล้ว
                  </span>
                </div>
              )}
            </div>

            {/* Beneficiary Lookup Bar (Only shown if no beneficiary profile loaded yet) */}
            {!beneficiaryProfile && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <label className="font-bold text-slate-800 block text-xs">
                  ค้นหาผู้มีสิทธิ์รับซะกาตเพื่อยื่นคำร้อง *:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void loadBeneficiaryProfile(searchQuery);
                        }
                      }}
                      placeholder="กรอกเลขบัตรประชาชน 13 หลัก, รหัสสมาชิก (MB-...), หรือเลขทะเบียน (ZMS-...)"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isFetchingBeneficiary || !searchQuery.trim()}
                    onClick={() => void loadBeneficiaryProfile(searchQuery)}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    {isFetchingBeneficiary ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    ตรวจสอบสิทธิ์
                  </button>
                </div>

                {fetchError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" /> {fetchError}
                  </div>
                )}
              </div>
            )}

            {/* Profile Completeness Alert */}
            {beneficiaryProfile && !beneficiaryProfile.isProfileComplete && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-sm text-amber-950 block">
                      ข้อมูลในทะเบียนผู้มีสิทธิ์ยังไม่ครบถ้วนสมบูรณ์
                    </span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      ฟิลด์ข้อมูลสำคัญที่ยังขาดในทะเบียน: <strong>{beneficiaryProfile.missingFields?.join(', ')}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenMemberDetail) {
                        onOpenMemberDetail(beneficiaryProfile.id, true, 'member_info');
                      } else {
                        onNavigate('beneficiaries');
                      }
                    }}
                    className="px-3.5 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Edit className="w-3.5 h-3.5" /> ไปแก้ไขข้อมูลทะเบียน
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadBeneficiaryProfile(beneficiaryProfile.id)}
                    className="px-3 py-1.5 bg-amber-700 text-white hover:bg-amber-800 rounded-xl font-semibold text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> รีเฟรช
                  </button>
                </div>
              </div>
            )}

            {/* Master Beneficiary Card (Read-Only Fields) */}
            {beneficiaryProfile && (
              <div className="space-y-4">
                {/* Header Summary Pill */}
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-black flex items-center justify-center shrink-0 text-sm">
                      {beneficiaryProfile.firstName?.slice(0, 1)}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        {beneficiaryProfile.titlePrefix} {beneficiaryProfile.fullName}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        รหัสสมาชิก: <strong className="text-emerald-800">{beneficiaryProfile.memberId}</strong> • ทะเบียน: {beneficiaryProfile.registryNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                      หมวดอัสนัฟ: {ASNAF_LABELS[beneficiaryProfile.asnafCategory] || beneficiaryProfile.asnafCategory}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBeneficiaryProfile(null);
                        setBeneficiaryInputId('');
                      }}
                      className="px-2.5 py-1 rounded-xl text-[11px] text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    >
                      เปลี่ยนผู้มีสิทธิ์
                    </button>
                  </div>
                </div>

                {/* 1.1 ข้อมูลส่วนบุคคล */}
                <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-700" /> ข้อมูลส่วนบุคคล (Read-Only)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">ชื่อ-นามสกุล:</span>
                      <div className="p-2.5 bg-slate-100 text-slate-800 font-semibold rounded-xl border border-slate-200 cursor-not-allowed">
                        {beneficiaryProfile.fullName || '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">เลขประจำตัวประชาชน 13 หลัก:</span>
                      <div className="p-2.5 bg-slate-100 text-slate-800 font-semibold rounded-xl border border-slate-200 cursor-not-allowed">
                        {beneficiaryProfile.nationalIdMasked || beneficiaryProfile.nationalId || '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">วันเกิด / อายุ:</span>
                      <div className="p-2.5 bg-slate-100 text-slate-800 font-semibold rounded-xl border border-slate-200 cursor-not-allowed">
                        {beneficiaryProfile.birthDate ? new Date(beneficiaryProfile.birthDate).toLocaleDateString('th-TH') : '-'} ({beneficiaryProfile.age != null ? `${beneficiaryProfile.age} ปี` : '-'})
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">เบอร์โทรศัพท์ติดต่อ:</span>
                      <div className="p-2.5 bg-slate-100 text-slate-800 font-semibold rounded-xl border border-slate-200 cursor-not-allowed">
                        {beneficiaryProfile.phone || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1.2 ข้อมูลที่อยู่ */}
                <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-700" /> ที่อยู่ปัจจุบันตามทะเบียน (Read-Only)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="md:col-span-2">
                      <span className="text-slate-400 block mb-0.5">ที่อยู่ / ชุมชน:</span>
                      <div className="p-2.5 bg-slate-100 text-slate-800 font-medium rounded-xl border border-slate-200 cursor-not-allowed">
                        {beneficiaryProfile.address || '-'} {beneficiaryProfile.community ? `(ชุมชน ${beneficiaryProfile.community})` : ''}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">ตำบล / อำเภอ:</span>
                      <div className="p-2.5 bg-slate-100 text-slate-800 font-medium rounded-xl border border-slate-200 cursor-not-allowed">
                        {beneficiaryProfile.subdistrict || '-'} / {beneficiaryProfile.district || '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">จังหวัด / รหัสไปรษณีย์:</span>
                      <div className="p-2.5 bg-slate-100 text-slate-800 font-medium rounded-xl border border-slate-200 cursor-not-allowed">
                        {beneficiaryProfile.province || '-'} {beneficiaryProfile.postalCode || ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1.3 ข้อมูลสถานะครัวเรือนและเศรษฐกิจ */}
                {beneficiaryProfile.household && (
                  <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-700" /> ข้อมูลเศรษฐกิจครัวเรือน (Read-Only)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block mb-0.5">สมาชิกในครัวเรือน</span>
                        <strong className="text-sm text-slate-900">{beneficiaryProfile.household.memberCount || 1} คน</strong>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block mb-0.5">รายได้รวมต่อเดือน</span>
                        <strong className="text-sm text-emerald-700">฿{(beneficiaryProfile.household.monthlyIncome || 0).toLocaleString()}</strong>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block mb-0.5">รายจ่ายรวมต่อเดือน</span>
                        <strong className="text-sm text-red-700">฿{(beneficiaryProfile.household.monthlyExpense || 0).toLocaleString()}</strong>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block mb-0.5">หนี้สินรวม</span>
                        <strong className="text-sm text-amber-800">฿{(beneficiaryProfile.household.debtAmount || 0).toLocaleString()}</strong>
                      </div>
                    </div>

                    {beneficiaryProfile.household.familySituationSummary && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-700 block mb-0.5">สภาพความเป็นอยู่ปัจจุบัน:</span>
                        {beneficiaryProfile.household.familySituationSummary}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STEP 2: ส่วนที่ 2 รายละเอียดความต้องการความช่วยเหลือ
           ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-700" /> ส่วนที่ 2: รายละเอียดความต้องการความช่วยเหลือ
              </h2>
              <p className="text-xs text-slate-500">
                เลือกประเภทความช่วยเหลือตามโครงสร้าง 3 ชั้นของกองทุน และระบุรายละเอียดความเดือดร้อน
              </p>
            </div>

            {/* 3-Tier Structure */}
            <div className="space-y-4">
              {/* Tier 1: Primary Group */}
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  ระดับที่ 1: กลุ่มหลักตามหมวดอัสนัฟ (Primary Asnaf Group) *:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {primaryGroups.map((pg) => (
                    <button
                      key={pg.asnafCode}
                      type="button"
                      onClick={() => {
                        setSelectedPrimaryCode(pg.asnafCode);
                        if (pg.specificFunds && pg.specificFunds.length > 0) {
                          setSelectedSpecificFundId(pg.specificFunds[0].id);
                        }
                      }}
                      className={`p-3 rounded-xl text-left border transition-all text-xs ${
                        selectedPrimaryCode === pg.asnafCode
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                      }`}
                    >
                      <strong className="block text-slate-900 font-bold">{pg.asnafName}</strong>
                      <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                        {pg.asnafCode}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tier 2: Specific Sub-Fund */}
              {availableSpecificFunds.length > 0 && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-xs">
                    ระดับที่ 2: กองทุนเฉพาะด้าน (Specific Sub-Fund) *:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {availableSpecificFunds.map((sf) => (
                      <button
                        key={sf.id}
                        type="button"
                        onClick={() => {
                          setSelectedSpecificFundId(sf.id);
                          if (sf.assistanceTypes && sf.assistanceTypes.length > 0) {
                            setSelectedAssistanceTypeId(sf.assistanceTypes[0].id);
                            setSelectedAssistanceTypeName(sf.assistanceTypes[0].name);
                          }
                        }}
                        className={`p-3 rounded-xl text-left border transition-all text-xs ${
                          selectedSpecificFundId === sf.id || selectedSpecificFundId === sf.code
                            ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                        }`}
                      >
                        <strong className="block text-slate-900 font-bold">{sf.name}</strong>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          รหัส: {sf.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tier 3: Assistance Type */}
              {availableAssistanceTypes.length > 0 && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-xs">
                    ระดับที่ 3: ประเภทความช่วยเหลือย่อย (Assistance Type) *:
                  </label>
                  <select
                    value={selectedAssistanceTypeId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedAssistanceTypeId(id);
                      const found = availableAssistanceTypes.find((at) => at.id === id);
                      if (found) {
                        setSelectedAssistanceTypeName(found.name);
                        setSelectedAssistanceGroup(found.group || 'core');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {availableAssistanceTypes.map((at) => (
                      <option key={at.id} value={at.id}>
                        {at.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Assessment Reference */}
            {beneficiaryProfile?.assessments && beneficiaryProfile.assessments.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-700 block text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" /> อ้างอิงรอบการประเมินสิทธิ์ (Periodic Assessment Reference) *:
                </label>
                <select
                  value={targetAssessmentId}
                  onChange={(e) => setTargetAssessmentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {beneficiaryProfile.assessments.map((asm: any) => (
                    <option key={asm.id} value={asm.id}>
                      {asm.assessmentNumber} - {asm.assessmentPeriod} (สถานะ: {asm.status}, ผล: {asm.eligibilityResult})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Request Amount and Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  จำนวนเงินที่ขอความช่วยเหลือ (บาท) *:
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">฿</span>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    value={requestedAmount || ''}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="เช่น 5000"
                  />
                </div>
                <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                  จำนวนเงิน: {(requestedAmount || 0).toLocaleString()} บาทถ้วน
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  ระดับความเร่งด่วน *:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'normal', label: 'ปกติ', color: 'slate' },
                    { id: 'high', label: 'เร่งด่วน', color: 'amber' },
                    { id: 'urgent', label: 'ฉุกเฉินวิกฤต', color: 'red' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setUrgencyLevel(lvl.id as any)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                        urgencyLevel === lvl.id
                          ? lvl.id === 'urgent'
                            ? 'bg-red-700 text-white border-red-700 shadow-xs'
                            : lvl.id === 'high'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Purpose & Necessity */}
            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  วัตถุประสงค์ของการขอความช่วยเหลือ *:
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="เช่น จัดซื้ออาหารยังชีพและยารักษาโรคประจำตัว, ค่าอุปกรณ์การศึกษาบุตร ฯลฯ"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  รายละเอียดปัญหาและเหตุผลความจำเป็น *:
                </label>
                <textarea
                  rows={4}
                  value={necessityDetails}
                  onChange={(e) => setNecessityDetails(e.target.value)}
                  placeholder="ระบุเหตุผลความเดือดร้อน เช่น ผู้มีสิทธิ์มีภาระดูแลผู้ป่วยติดเตียง รายได้ไม่เพียงพอต่อค่าครองชีพ หรือประสบภัยพิบัติ..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: ส่วนที่ 3 รายละเอียดและหลักฐานประกอบ
           ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-emerald-700" /> ส่วนที่ 3: รายละเอียดและหลักฐานประกอบ
              </h2>
              <p className="text-xs text-slate-500">
                เลือกใช้เอกสารเดิมที่มีในทะเบียนได้โดยไม่ต้องอัปโหลดซ้ำ และแนบเอกสารเพิ่มเติมเฉพาะคำร้องนี้
              </p>
            </div>

            {/* Box 1: Existing Master Registry Documents (Selectable) */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" /> เอกสารหลักที่มีอยู่ในทะเบียนเดิม (เลือกใช้ประกอบคำร้อง)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ติ๊กเลือกเอกสารหลักเดิมเพื่อนำมาอ้างอิงกับคำร้องนี้โดยไม่ต้องอัปโหลดไฟล์ซ้ำ
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  เลือก {selectedExistingDocIds.length} / {beneficiaryProfile?.registryDocuments?.length || 0} รายการ
                </span>
              </div>

              {beneficiaryProfile?.registryDocuments && beneficiaryProfile.registryDocuments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {beneficiaryProfile.registryDocuments.map((doc: any) => {
                    const isSelected = selectedExistingDocIds.includes(doc.id);
                    return (
                      <label
                        key={doc.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedExistingDocIds((prev) => [...prev, doc.id]);
                              } else {
                                setSelectedExistingDocIds((prev) => prev.filter((id) => id !== doc.id));
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          />
                          <div className="min-w-0">
                            <span className="block truncate">{doc.name}</span>
                            <span className="text-[10px] text-slate-400 block">
                              ประเภท: {doc.category || 'เอกสารทั่วไป'} • {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : ''}
                            </span>
                          </div>
                        </div>
                        {doc.downloadUrl && (
                          <a
                            href={doc.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-white"
                            title="เปิดดูเอกสาร"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                  ไม่พบเอกสารเดิมในทะเบียนหลัก
                </div>
              )}
            </div>

            {/* Box 2: New Request-Specific Documents Uploader */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
              <div>
                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-emerald-700" /> เอกสารแนบเพิ่มเติมเฉพาะคำร้องนี้
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  เช่น รูปถ่ายสภาพความเป็นอยู่ปัจจุบัน, ใบเสนอราคา/ใบเสร็จ, หนังสือรับรองหนี้สิน หรือหนังสือรับรองจากชุมชน
                </p>
              </div>

              <DocumentUploader
                entityType="assistance_request"
                entityId={currentDraftApplicationNo || 'draft'}
                existingDocuments={applicationDocs}
                onDocumentsChange={setApplicationDocs}
                maxFiles={10}
              />
            </div>

            {/* Box 3: Notes */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                หมายเหตุเพิ่มเติมประกอบหลักฐาน (ถ้ามี):
              </label>
              <textarea
                rows={2}
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                placeholder="ระบุข้อสังเกตเพิ่มเติมเกี่ยวกับเอกสารหรือหลักฐานที่แนบ..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 4: ส่วนที่ 4 การตรวจสอบข้อมูลและการยืนยัน
           ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-emerald-700" /> ส่วนที่ 4: การตรวจสอบข้อมูลและการยืนยัน
              </h2>
              <p className="text-xs text-slate-500">
                กรุณาตรวจสอบความถูกต้องของข้อมูลทั้งหมดก่อนเข้าสู่ขั้นตอนส่งคำร้องขอรับความช่วยเหลือ
              </p>
            </div>

            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Card 1: ผู้ยื่นคำร้อง */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <User className="w-4 h-4 text-emerald-700" /> 1. ข้อมูลผู้ยื่นคำร้อง
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p><strong>ชื่อ-สกุล:</strong> {beneficiaryProfile?.titlePrefix} {beneficiaryProfile?.fullName}</p>
                  <p><strong>รหัสสมาชิก:</strong> <span className="text-emerald-700 font-bold">{beneficiaryProfile?.memberId}</span></p>
                  <p><strong>เลขบัตรประชาชน:</strong> {beneficiaryProfile?.nationalIdMasked || beneficiaryProfile?.nationalId}</p>
                  <p><strong>เบอร์โทรศัพท์:</strong> {beneficiaryProfile?.phone || '-'}</p>
                  <p><strong>ที่อยู่:</strong> {beneficiaryProfile?.address || '-'} {beneficiaryProfile?.province}</p>
                </div>
              </div>

              {/* Card 2: รายละเอียดความช่วยเหลือ */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <HelpCircle className="w-4 h-4 text-emerald-700" /> 2. รายละเอียดความช่วยเหลือที่ขอ
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p><strong>หมวดอัสนัฟ:</strong> {currentPrimaryGroup?.asnafName || selectedPrimaryCode}</p>
                  <p><strong>กองทุนเฉพาะด้าน:</strong> {currentSpecificFund?.name || '-'}</p>
                  <p><strong>ประเภทความช่วยเหลือ:</strong> {selectedAssistanceTypeName || currentAssistanceType?.name}</p>
                  <p>
                    <strong>วงเงินที่ขอรับความช่วยเหลือ:</strong>{' '}
                    <strong className="text-sm text-emerald-700">฿{(requestedAmount || 0).toLocaleString()}</strong>
                  </p>
                  <p><strong>ระดับความเร่งด่วน:</strong> {urgencyLevel === 'urgent' ? 'ฉุกเฉินวิกฤต' : urgencyLevel === 'high' ? 'เร่งด่วน' : 'ปกติ'}</p>
                </div>
              </div>

              {/* Card 3: เอกสารและหลักฐาน */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <FolderOpen className="w-4 h-4 text-emerald-700" /> 3. หลักฐานและเอกสารประกอบ
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p><strong>เอกสารเดิมจากทะเบียนที่เลือกใช้:</strong> {selectedExistingDocIds.length} ฉบับ</p>
                  <p><strong>เอกสารแนบใหม่เฉพาะคำร้อง:</strong> {applicationDocs.length} ฉบับ</p>
                  {purpose && <p><strong>วัตถุประสงค์:</strong> {purpose}</p>}
                </div>
              </div>

              {/* Card 4: ผู้บันทึกและระบบ */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Building className="w-4 h-4 text-emerald-700" /> 4. ข้อมูลการบันทึกระบบ
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p><strong>เจ้าหน้าที่ผู้บันทึก:</strong> {currentUser.name} ({currentUser.role})</p>
                  <p><strong>ปีงบประมาณ:</strong> พ.ศ. {fiscalYear}</p>
                  <p><strong>วันที่บันทึก:</strong> {new Date().toLocaleDateString('th-TH')}</p>
                </div>
              </div>
            </div>

            {/* Certification Checkbox */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-800">
                <input
                  type="checkbox"
                  checked={isCertifiedCorrect}
                  onChange={(e) => setIsCertifiedCorrect(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-500 w-4 h-4 mt-0.5"
                />
                <div>
                  <strong className="block font-bold text-slate-900">
                    การรับรองความถูกต้องของข้อมูลตามระเบียบของมูลนิธิ
                  </strong>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    ข้าพเจ้าขอรับรองว่าข้อมูลข้างต้นเป็นข้อมูลที่ได้จากการตรวจสอบร่วมกับผู้มีสิทธิ์และเอกสารหลักฐานที่มีอยู่จริงตามหลักการบริหารจัดการเงินซะกาต
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 5: ส่วนที่ 5 สรุปและส่งคำร้อง
           ======================================================== */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" /> ส่วนที่ 5: สรุปและส่งคำร้องขอรับความช่วยเหลือ
              </h2>
              <p className="text-xs text-slate-500">
                พร้อมส่งคำร้องเข้าสู่กระบวนการตรวจสอบและประเมินสิทธิ์ หรือบันทึกฉบับร่างไว้ดำเนินการต่อในภายหลัง
              </p>
            </div>

            {/* Ready summary alert */}
            <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-2 shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-700" />
                <h4 className="font-bold text-sm">ข้อมูลคำร้องพร้อมสำหรับการดำเนินการ</h4>
              </div>
              <p className="leading-relaxed text-slate-700">
                ท่านสามารถเลือกบันทึกเป็น <strong>ฉบับร่าง (Draft)</strong> เพื่อกลับมาแก้ไขในภายหลัง หรือกด <strong>ส่งคำร้องขอความช่วยเหลือ</strong> เพื่อส่งเรื่องไปยังขั้นตอนการตรวจสอบและพิจารณาอนุมัติต่อไป
              </p>
              <div className="pt-2 text-[11px] text-slate-500">
                • รหัสสมาชิก: {beneficiaryProfile?.memberId} | ผู้ขอรับความช่วยเหลือ: {beneficiaryProfile?.fullName} | วงเงิน: ฿{(requestedAmount || 0).toLocaleString()}
              </div>
            </div>

            {/* Final Action Buttons Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <strong className="text-xs text-slate-900 block font-bold">ตัวเลือกที่ 1: บันทึกฉบับร่าง (Save Draft)</strong>
                <p className="text-[11px] text-slate-500">
                  บันทึกข้อมูลไว้ในระบบโดยยังไม่ส่งเรื่องเข้าสู่กระบวนการพิจารณา สามารถกลับมาเปิดแก้ไขได้ตลอดเวลา
                </p>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleSaveOrSubmit('draft')}
                  className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                  <Save className="w-4 h-4 text-slate-500" /> บันทึกฉบับร่าง (Draft)
                </button>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <strong className="text-xs text-emerald-950 block font-bold">ตัวเลือกที่ 2: ส่งคำร้องขอรับความช่วยเหลือ (Submit)</strong>
                <p className="text-[11px] text-emerald-700">
                  ส่งคำร้องเข้าสู่กระบวนการตรวจสอบเอกสารและเสนออนุมัติตามขั้นตอน เจ้าหน้าที่จะได้รับเลขคำร้องอย่างเป็นทางการ
                </p>
                <button
                  type="button"
                  disabled={isSubmitting || !isCertifiedCorrect}
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md min-h-[44px] disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> ส่งคำร้องขอความช่วยเหลือ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            Bottom Action Bar (Identical to MultiStepRegistrationView)
           ======================================================== */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors min-h-[44px]"
              >
                <ChevronLeft className="w-4 h-4" /> ขั้นตอนก่อนหน้า
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Save as Draft */}
            <button
              type="button"
              disabled={isSubmitting || !beneficiaryProfile}
              onClick={() => void handleSaveOrSubmit('draft')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors min-h-[44px] disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" /> บันทึกฉบับร่าง (Draft)
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl text-xs font-semibold transition-colors shadow-xs min-h-[44px]"
              >
                ถัดไป <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || !isCertifiedCorrect}
                onClick={() => setShowConfirmModal(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl text-xs font-bold transition-colors shadow-md min-h-[44px] disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {isSubmitting ? 'กำลังส่งคำร้อง...' : 'ยืนยันและส่งคำร้อง'}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* ========================================================
          Confirmation Dialog Modal
         ======================================================== */}
      {showConfirmModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) setShowConfirmModal(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                  <h3 className="font-bold text-sm">ยืนยันการส่งคำร้องขอความช่วยเหลือ</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3.5 text-xs text-slate-700">
                <p className="leading-relaxed">
                  ท่านกำลังจะยื่นคำร้องขอความช่วยเหลือสำหรับผู้มีสิทธิ์รายนี้:
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p><strong>ผู้ขอรับความช่วยเหลือ:</strong> {beneficiaryProfile?.fullName}</p>
                  <p><strong>รหัสสมาชิก:</strong> {beneficiaryProfile?.memberId}</p>
                  <p><strong>ประเภทความช่วยเหลือ:</strong> {selectedAssistanceTypeName || 'ปัจจัยยังชีพ'}</p>
                  <p><strong>วงเงินที่ขอ:</strong> <strong className="text-emerald-700 text-sm">฿{(requestedAmount || 0).toLocaleString()}</strong></p>
                </div>

                <p className="text-[11px] text-slate-500">
                  เมื่อกดยืนยัน ระบบจะสร้างเลขคำร้องและส่งเรื่องไปยังขั้นตอนการตรวจสอบเอกสารต่อไป
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-white rounded-xl font-semibold min-h-[44px]"
                >
                  ย้อนกลับไปแก้ไข
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleSaveOrSubmit('submitted')}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-colors shadow-xs flex items-center gap-1.5 min-h-[44px]"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isSubmitting ? 'กำลังส่งคำร้อง...' : 'ยืนยันการส่งคำร้อง'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
