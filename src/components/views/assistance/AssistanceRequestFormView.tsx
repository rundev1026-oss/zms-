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
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { ModalPortal } from '@/components/common/Modal';
import {
  LEVEL_1_ASNAFS,
  LEVEL_3_ASSISTANCE_FORMATS,
  resolveAsnafGroupCode,
  getSupportedFormatsForType,
  getChartOfAccountsForDisbursement,
} from '@/lib/constants/asnafRelationshipCatalog';
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
  Shield,
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
  Building,
  RefreshCw,
  Clock,
  Sparkles,
  Info,
  CreditCard,
  Layers,
  Truck,
  FileCheck,
  ArrowRightLeft,
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

const DRAFT_STORAGE_KEY = 'zms_assistance_request_draft_v2';

const DEFAULT_PRIMARY_GROUPS: any[] = [
  {
    asnafCode: 'faqir_miskin',
    asnafName: 'ฟากีร-มิสคีน (ผู้ยากไร้และผู้ยากจน)',
    specificFunds: [
      {
        id: 'fund-living',
        code: 'living',
        name: 'กองทุนปัจจัยยังชีพขั้นพื้นฐาน',
        assistanceTypes: [
          { id: 'type-living-monthly', code: 'living_monthly', name: 'ปัจจัยยังชีพรายเดือน', group: 'core' },
          { id: 'type-living-ration', code: 'living_ration', name: 'ถุงยังชีพ/อาหารแห้งจำเป็น', group: 'core' },
          { id: 'type-living-emergency', code: 'living_emergency', name: 'ช่วยเหลือฉุกเฉินเฉพาะหน้า', group: 'specific' },
        ],
      },
    ],
  },
];

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

  // 5 Step Management (Covers all 8 Mandated Sections)
  // Step 1: ส่วนที่ 1 (ข้อมูลผู้มีสิทธิ์) & ส่วนที่ 2 (อัสนัฟจากทะเบียน)
  // Step 2: ส่วนที่ 3 (ประเภทการช่วยเหลือ) & ส่วนที่ 4 (รูปแบบการช่วยเหลือ)
  // Step 3: ส่วนที่ 5 (รายละเอียดความต้องการ) & ส่วนที่ 6 (งบประมาณโดยประมาณ)
  // Step 4: ส่วนที่ 7 (เอกสารประกอบ)
  // Step 5: ส่วนที่ 8 (สรุปก่อนส่งคำร้อง)
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
    format: string;
    status: string;
  } | null>(null);

  // ========================================================
  // Section 1: ข้อมูลผู้มีสิทธิ์ (Beneficiary Information)
  // ========================================================
  const [beneficiaryInputId, setBeneficiaryInputId] = useState<string>(initialBeneficiaryId || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [candidateList, setCandidateList] = useState<any[]>([]);
  const [isSearchingCandidates, setIsSearchingCandidates] = useState<boolean>(false);
  const [isFetchingBeneficiary, setIsFetchingBeneficiary] = useState<boolean>(false);
  const [beneficiaryProfile, setBeneficiaryProfile] = useState<any | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ========================================================
  // Section 2: อัสนัฟจากทะเบียน (Asnaf from Registry)
  // ========================================================
  const [primaryGroups, setPrimaryGroups] = useState<AsnafAllocation[]>(DEFAULT_PRIMARY_GROUPS);
  const [selectedPrimaryCode, setSelectedPrimaryCode] = useState<string>('faqir_miskin');
  const [selectedAsnafId, setSelectedAsnafId] = useState<string>('');
  const [asnafChangeNotice, setAsnafChangeNotice] = useState<string | null>(null);
  const prevAsnafRef = useRef<string>(selectedPrimaryCode);

  // ========================================================
  // Section 3: ประเภทการช่วยเหลือ (Assistance Type)
  // ========================================================
  const [selectedSpecificFundId, setSelectedSpecificFundId] = useState<string>('');
  const [selectedAssistanceTypeId, setSelectedAssistanceTypeId] = useState<string>('');
  const [selectedAssistanceTypeName, setSelectedAssistanceTypeName] = useState<string>('');
  const [selectedAssistanceGroup, setSelectedAssistanceGroup] = useState<'core' | 'specific'>('core');

  // ========================================================
  // Section 4: รูปแบบการช่วยเหลือ (Assistance Format)
  // ========================================================
  const [selectedFormatCode, setSelectedFormatCode] = useState<string>('bank_transfer');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [selectedFormatName, setSelectedFormatName] = useState<string>('');
  const [formatChangeNotice, setFormatChangeNotice] = useState<string | null>(null);
  const prevTypeRef = useRef<string>(selectedAssistanceTypeId);

  // Phase 8: Category Duplicate Prevention State
  const [duplicateCheck, setDuplicateCheck] = useState<any>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState<boolean>(false);

  // ========================================================
  // Section 5: รายละเอียดความต้องการ (Needs Details)
  // ========================================================
  const [targetAssessmentId, setTargetAssessmentId] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [hardshipReasons, setHardshipReasons] = useState<string>('');
  const [necessityDetails, setNecessityDetails] = useState<string>('');
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [appliedDate, setAppliedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [fiscalYear, setFiscalYear] = useState<string>('2569');

  // ========================================================
  // Section 6: งบประมาณโดยประมาณ & Solvency Pre-check
  // ========================================================
  const [requestedAmount, setRequestedAmount] = useState<number>(8000);
  const [solvencyCheck, setSolvencyCheck] = useState<any>(null);
  const [isCheckingSolvency, setIsCheckingSolvency] = useState<boolean>(false);

  // ========================================================
  // Section 7: เอกสารประกอบ (Supporting Documents)
  // ========================================================
  const [selectedExistingDocIds, setSelectedExistingDocIds] = useState<string[]>([]);
  const [applicationDocs, setApplicationDocs] = useState<UploadedDocumentItem[]>([]);
  const [evidenceNotes, setEvidenceNotes] = useState<string>('');

  // ========================================================
  // Section 8: สรุปก่อนส่งคำร้อง (Certification & Submit)
  // ========================================================
  const [hasCertified, setHasCertified] = useState<boolean>(true);
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

  // Filter specific funds and assistance types strictly by Asnaf
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

  // Filter assistance formats strictly by Assistance Type
  const availableAssistanceFormats = useMemo(() => {
    if (
      currentAssistanceType &&
      Array.isArray((currentAssistanceType as any).supportedFormats) &&
      (currentAssistanceType as any).supportedFormats.length > 0
    ) {
      return (currentAssistanceType as any).supportedFormats;
    }
    const code = currentAssistanceType?.code;
    return code ? getSupportedFormatsForType(code) : LEVEL_3_ASSISTANCE_FORMATS;
  }, [currentAssistanceType]);

  const currentAssistanceFormat = useMemo(() => {
    return (
      availableAssistanceFormats.find(
        (f: any) => f.code === selectedFormatCode || f.id === selectedFormatId
      ) ||
      availableAssistanceFormats.find((f: any) => f.isDefault) ||
      availableAssistanceFormats[0] ||
      null
    );
  }, [availableAssistanceFormats, selectedFormatCode, selectedFormatId]);

  // Chart of accounts mapping
  const chartOfAccounts = useMemo(() => {
    return getChartOfAccountsForDisbursement({
      asnafCode: selectedPrimaryCode,
      formatCode: currentAssistanceFormat?.code || selectedFormatCode || 'bank_transfer',
      formatId: currentAssistanceFormat?.id || selectedFormatId,
    });
  }, [selectedPrimaryCode, currentAssistanceFormat, selectedFormatCode, selectedFormatId]);

  // Synchronize Sub-fund and Assistance Type defaults
  useEffect(() => {
    if (availableSpecificFunds.length > 0) {
      if (!availableSpecificFunds.some((sf) => sf.id === selectedSpecificFundId || sf.code === selectedSpecificFundId)) {
        setSelectedSpecificFundId(availableSpecificFunds[0].id);
      }
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
  }, [availableAssistanceTypes, selectedAssistanceTypeId]);

  // Synchronize Assistance Format defaults when Assistance Type changes
  useEffect(() => {
    if (availableAssistanceFormats.length > 0) {
      const isValid = availableAssistanceFormats.some(
        (fmt: any) => fmt.code === selectedFormatCode || fmt.id === selectedFormatId
      );
      if (!isValid) {
        const defaultFmt = availableAssistanceFormats.find((f: any) => f.isDefault) || availableAssistanceFormats[0];
        if (defaultFmt) {
          setSelectedFormatCode(defaultFmt.code);
          setSelectedFormatId(defaultFmt.id);
          setSelectedFormatName(defaultFmt.name);
          if (prevTypeRef.current && prevTypeRef.current !== selectedAssistanceTypeId) {
            setFormatChangeNotice(`ปรับรูปแบบการส่งมอบเป็น "${defaultFmt.name}" ให้สอดคล้องกับประเภทความช่วยเหลือใหม่`);
          }
        }
      }
    }
    prevTypeRef.current = selectedAssistanceTypeId;
  }, [availableAssistanceFormats, selectedAssistanceTypeId, selectedFormatCode, selectedFormatId]);

  // Asnaf switch notification & cascade reset
  useEffect(() => {
    if (prevAsnafRef.current && prevAsnafRef.current !== selectedPrimaryCode) {
      const asnafMeta = LEVEL_1_ASNAFS.find((a) => a.code === selectedPrimaryCode);
      setAsnafChangeNotice(`สลับหมวดอัสนัฟเป็น "${asnafMeta?.nameTh || selectedPrimaryCode}" ระบบปรับกรองประเภทความช่วยเหลือให้อัตโนมัติ`);
    }
    prevAsnafRef.current = selectedPrimaryCode;
  }, [selectedPrimaryCode]);

  // Search candidate beneficiaries for Searchable Select
  const searchBeneficiaryCandidates = useCallback(async (query: string) => {
    setIsSearchingCandidates(true);
    try {
      const res = await fetch(`/api/assistance-requests/check-beneficiary?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.candidates)) {
        setCandidateList(data.candidates);
      } else {
        setCandidateList([]);
      }
    } catch {
      setCandidateList([]);
    } finally {
      setIsSearchingCandidates(false);
    }
  }, []);

  // Fetch verified beneficiary profile
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

        const payload: any = { beneficiaryId: trimmed };
        if (isUuid || trimmed.startsWith('ben-')) {
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

          // Phase 4: Beneficiary Asnaf Integration (Read from DB, do not overwrite registry)
          if (Array.isArray(ben.eligibleAsnafs) && ben.eligibleAsnafs.length > 0) {
            const primaryAsnaf = ben.eligibleAsnafs.find((a: any) => a.isPrimary) || ben.eligibleAsnafs[0];
            setSelectedPrimaryCode(primaryAsnaf.asnafCode);
            setSelectedAsnafId(primaryAsnaf.id);
          } else if (ben.asnafCategory) {
            setSelectedPrimaryCode(resolveAsnafGroupCode(ben.asnafCategory));
          }

          // Pre-select assessment
          if (ben.assessments && ben.assessments.length > 0) {
            setTargetAssessmentId(ben.latestAssessmentId || ben.assessments[0].id);
          }

          // Reference existing documents
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

  // Auto-fetch if initialBeneficiaryId passed
  useEffect(() => {
    if (initialBeneficiaryId) {
      loadBeneficiaryProfile(initialBeneficiaryId);
    }
  }, [initialBeneficiaryId, loadBeneficiaryProfile]);

  // Initial candidate pre-load
  useEffect(() => {
    if (!beneficiaryProfile && !initialBeneficiaryId) {
      searchBeneficiaryCandidates('');
    }
  }, [beneficiaryProfile, initialBeneficiaryId, searchBeneficiaryCandidates]);

  // Duplicate check effect
  useEffect(() => {
    const benId = beneficiaryProfile?.id || beneficiaryInputId;
    const natId = beneficiaryProfile?.nationalId;
    if (!benId || !selectedAssistanceTypeId) {
      setDuplicateCheck(null);
      return;
    }

    let isCancelled = false;
    const checkDuplicate = async () => {
      setIsCheckingDuplicate(true);
      try {
        const curType = availableAssistanceTypes.find((t: any) => t.id === selectedAssistanceTypeId);
        const res = await fetch('/api/assistance-requests/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beneficiaryId: benId,
            nationalId: natId,
            assistanceTypeId: selectedAssistanceTypeId,
            assistanceTypeCode: curType?.code,
            assistanceTypeName: curType?.name || selectedAssistanceTypeName,
            fiscalYear: fiscalYear || '2569',
          }),
        });
        const data = await res.json();
        if (!isCancelled) {
          if (data.success && data.hasDuplicate) {
            setDuplicateCheck(data);
          } else {
            setDuplicateCheck(null);
          }
        }
      } catch {
        if (!isCancelled) setDuplicateCheck(null);
      } finally {
        if (!isCancelled) setIsCheckingDuplicate(false);
      }
    };

    checkDuplicate();
    return () => {
      isCancelled = true;
    };
  }, [beneficiaryProfile?.id, beneficiaryProfile?.nationalId, beneficiaryInputId, selectedAssistanceTypeId, availableAssistanceTypes, selectedAssistanceTypeName, fiscalYear]);

  // Solvency pre-check effect
  useEffect(() => {
    if (!currentSpecificFund?.id || !requestedAmount || requestedAmount <= 0) {
      setSolvencyCheck(null);
      return;
    }

    let isCancelled = false;
    const checkSolvency = async () => {
      setIsCheckingSolvency(true);
      try {
        const res = await fetch('/api/assistance-requests/check-fund-solvency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fundAccountId: 'fund-1',
            specificFundId: currentSpecificFund.id,
            requestedAmount: Number(requestedAmount),
            asnafCode: selectedPrimaryCode,
            assistanceFormatCode: selectedFormatCode,
          }),
        });
        const data = await res.json();
        if (!isCancelled) {
          if (data.success) {
            setSolvencyCheck(data.solvency);
          } else {
            setSolvencyCheck(null);
          }
        }
      } catch {
        if (!isCancelled) setSolvencyCheck(null);
      } finally {
        if (!isCancelled) setIsCheckingSolvency(false);
      }
    };

    const timer = setTimeout(checkSolvency, 400);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [currentSpecificFund?.id, requestedAmount, selectedPrimaryCode, selectedFormatCode]);

  // Step Validation & Navigation
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!beneficiaryProfile) {
        showToast('กรุณาระบุและตรวจสอบข้อมูลผู้มีสิทธิ์รับซะกาตก่อนดำเนินการ', 'error');
        return;
      }
      if (beneficiaryProfile.asnafStatus === 'NO_ASNAF') {
        showToast('ผู้มีสิทธิ์รายนี้ยังไม่ได้รับการรับรองอัสนัฟ ไม่สามารถสร้างคำร้องได้', 'error');
        return;
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      if (!selectedAssistanceTypeId) {
        showToast('กรุณาเลือกประเภทความช่วยเหลือ', 'error');
        return;
      }
      if (!selectedFormatCode) {
        showToast('กรุณาเลือกรูปแบบการส่งมอบความช่วยเหลือ', 'error');
        return;
      }
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 3) {
      if (!requestedAmount || requestedAmount <= 0) {
        showToast('กรุณาระบุจำนวนเงินที่ขอรับความช่วยเหลือให้ถูกต้อง', 'error');
        return;
      }
      if (!necessityDetails.trim() && !purpose.trim()) {
        showToast('กรุณาระบุวัตถุประสงค์หรือรายละเอียดความจำเป็น', 'error');
        return;
      }
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 4) {
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Build Payload adhering to strict relationship model
  const buildPayload = (targetStatus: 'draft' | 'submitted') => {
    return {
      beneficiaryId: beneficiaryProfile?.id || beneficiaryInputId,
      assessmentId: targetAssessmentId || undefined,
      asnafCode: selectedPrimaryCode || 'faqir_miskin',
      primaryGroupCode: selectedPrimaryCode || 'faqir_miskin',
      asnafCategory: beneficiaryProfile?.asnafCategory || selectedPrimaryCode || 'faqir_miskin',
      specificFundId: currentSpecificFund?.id || undefined,
      specificFundCode: currentSpecificFund?.code || undefined,
      specificFundName: currentSpecificFund?.name || undefined,
      assistanceTypeId: currentAssistanceType?.id || undefined,
      assistanceTypeCode: currentAssistanceType?.code || undefined,
      assistanceType: currentAssistanceType?.name || selectedAssistanceTypeName || 'ปัจจัยยังชีพ',
      assistanceFormatId: currentAssistanceFormat?.id || selectedFormatId || undefined,
      assistanceFormatCode: currentAssistanceFormat?.code || selectedFormatCode || 'bank_transfer',
      assistanceFormatName: currentAssistanceFormat?.name || selectedFormatName || 'โอนเงินเข้าบัญชี',
      deliveryMethod: currentAssistanceFormat?.deliveryMethod || 'bank_transfer',
      assistanceGroup: selectedAssistanceGroup || 'core',
      assistanceTypeDetails: purpose || necessityDetails || undefined,
      hardshipReasons: hardshipReasons || necessityDetails || purpose || '',
      necessityDetails: necessityDetails || hardshipReasons || purpose || '',
      requestedAmount: Number(requestedAmount) || 0,
      urgencyLevel,
      fiscalYear,
      appliedDate,
      idempotencyKey,
      status: targetStatus,
      referencedDocumentIds: selectedExistingDocIds,
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

  // Submit Handler
  const handleSaveOrSubmit = async (targetStatus: 'draft' | 'submitted') => {
    if (submitLock || isSubmitting) return;

    if (!beneficiaryProfile) {
      showToast('ไม่พบข้อมูลผู้มีสิทธิ์รับซะกาต กรุณาตรวจสอบข้อมูลก่อน', 'error');
      return;
    }

    if (targetStatus === 'submitted') {
      if (!hasCertified) {
        showToast('กรุณากดรับรองความถูกต้องของข้อมูลก่อนยืนยันส่งคำร้อง', 'error');
        return;
      }
      if (!requestedAmount || requestedAmount <= 0) {
        showToast('กรุณาระบุจำนวนเงินที่ขอรับความช่วยเหลือให้ถูกต้อง', 'error');
        return;
      }
    }

    setSubmitLock(true);
    setIsSubmitting(true);

    try {
      const payload = buildPayload(targetStatus);

      // Create new assistance request
      const result = await createAssistanceRequest(payload);
      if (!result) {
        throw new Error('ไม่สามารถบันทึกคำร้องได้ กรุณาลองใหม่อีกครั้ง');
      }

      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      if (targetStatus === 'draft') {
        showToast(`บันทึกฉบับร่างคำร้องเรียบร้อยแล้ว (${result.applicationNo || 'DRAFT'})`, 'success');
        setCurrentDraftApplicationNo(result.applicationNo || null);
      } else {
        showToast(`ยื่นคำร้องขอความช่วยเหลือสำเร็จ เลขที่คำร้อง ${result.applicationNo}`, 'success');
        setSubmittedResult({
          applicationId: result.applicationId || (result as any).id,
          applicationNo: result.applicationNo,
          beneficiaryName: beneficiaryProfile.fullName,
          amount: Number(requestedAmount),
          category: selectedAssistanceTypeName || currentAssistanceType?.name || 'ปัจจัยยังชีพ',
          format: currentAssistanceFormat?.name || 'โอนเงินเข้าบัญชี',
          status: 'submitted',
        });
      }
      await refreshData();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกคำร้อง', 'error');
    } finally {
      setIsSubmitting(false);
      setSubmitLock(false);
    }
  };

  // 5 Steps Definitions
  const steps = [
    { num: 1, title: 'ส่วนที่ 1-2: ผู้มีสิทธิ์ & อัสนัฟ', badge: 'ผู้มีสิทธิ์' },
    { num: 2, title: 'ส่วนที่ 3-4: ประเภท & รูปแบบ', badge: 'ประเภท/รูปแบบ' },
    { num: 3, title: 'ส่วนที่ 5-6: ความจำเป็น & งบประมาณ', badge: 'ความต้องการ' },
    { num: 4, title: 'ส่วนที่ 7: เอกสารประกอบ', badge: 'เอกสาร' },
    { num: 5, title: 'ส่วนที่ 8: สรุปและส่งคำร้อง', badge: 'สรุปส่งคำร้อง' },
  ];

  // Success Completion Screen
  if (submittedResult) {
    return (
      <div className="space-y-6 w-full max-w-5xl mx-auto animate-fadeIn pb-16">
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              ยื่นคำร้องสำเร็จแล้ว
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 font-mono">
              {submittedResult.applicationNo}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
              คำร้องของ <strong className="text-slate-900 font-semibold">{submittedResult.beneficiaryName}</strong> ถูกส่งเข้าสู่กระบวนการพิจารณาตรวจสอบตามลำดับขั้นตอนของระบบแล้ว
            </p>
          </div>

          {/* Quick Summary Pill Details */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 max-w-lg mx-auto text-left text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">ประเภทความช่วยเหลือ:</span>
              <span className="font-semibold text-slate-900">{submittedResult.category}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">รูปแบบการส่งมอบ:</span>
              <span className="font-semibold text-teal-800">{submittedResult.format}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">วงเงินที่ร้องขอ:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                ฿{submittedResult.amount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setSubmittedResult(null);
                setCurrentStep(1);
                setBeneficiaryProfile(null);
                setBeneficiaryInputId('');
                setPurpose('');
                setNecessityDetails('');
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition min-h-[44px]"
            >
              ยื่นคำร้องใหม่
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigate('assistance-requests');
                if (onOpenRequestDetail) {
                  onOpenRequestDetail(submittedResult.applicationId);
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 min-h-[44px]"
            >
              <span>ดูรายการคำร้องในระบบ</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full max-w-6xl mx-auto animate-fadeIn pb-24 sm:pb-16">
      {/* 1. Header & Navigation Back */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('assistance-requests')}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="กลับสู่หน้ารายการคำร้อง"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                ยื่นคำร้องขอรับความช่วยเหลือ (Assistance Request Form)
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                ระบบ 8 ส่วนสัมพันธ์
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              เชื่อมโยงข้อมูลผู้มีสิทธิ์จากทะเบียนหลัก กรองประเภทและรูปแบบการช่วยเหลือตามหลักศาสนบัญญัติ
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => void handleSaveOrSubmit('draft')}
            disabled={isSubmitting || !beneficiaryProfile}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50 min-h-[40px]"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">บันทึกเป็น</span>ฉบับร่าง
          </button>
        </div>
      </div>

      {/* 2. Responsive 5-Step Stepper Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        {/* Mobile Step Badge (<640px) */}
        <div className="sm:hidden flex items-center justify-between px-2 py-1">
          <span className="text-xs font-bold text-slate-700">
            ขั้นตอน {currentStep} จาก 5: <span className="text-teal-800">{steps[currentStep - 1].badge}</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {Math.round((currentStep / 5) * 100)}%
          </span>
        </div>

        {/* Stepper Buttons (Tablet/Desktop & Horizontal Mobile Scroll) */}
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
                  ? 'bg-teal-800 text-white shadow-xs'
                  : currentStep > s.num
                  ? 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  currentStep === s.num
                    ? 'bg-white text-teal-800'
                    : currentStep > s.num
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {currentStep > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
              </span>
              <span className="hidden md:inline">{s.title}</span>
              <span className="md:hidden">{s.badge}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Form Card */}
      <div className="bg-white p-4 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">

        {/* ========================================================
            STEP 1: ส่วนที่ 1 (ข้อมูลผู้มีสิทธิ์) & ส่วนที่ 2 (อัสนัฟจากทะเบียน)
           ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Section 1 Header */}
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-700" /> ส่วนที่ 1: ข้อมูลผู้มีสิทธิ์ (Beneficiary Information)
                </h2>
                <p className="text-xs text-slate-500">
                  ดึงข้อมูลจากทะเบียนกลางของ ZMS ป้องกันการสร้างข้อมูลบุคคลซ้ำ (Single Source of Truth)
                </p>
              </div>

              {beneficiaryProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setBeneficiaryProfile(null);
                    setBeneficiaryInputId('');
                  }}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline self-start sm:self-auto"
                >
                  ค้นหาผู้มีสิทธิ์รายอื่น
                </button>
              )}
            </div>

            {/* Beneficiary Searchable Lookup Box (If no profile loaded) */}
            {!beneficiaryProfile && (
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                <label className="font-bold text-slate-800 block text-xs">
                  ค้นหาและเลือกผู้มีสิทธิ์รับซะกาตเพื่อยื่นคำร้อง *:
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        void searchBeneficiaryCandidates(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void loadBeneficiaryProfile(searchQuery);
                        }
                      }}
                      placeholder="พิมพ์ชื่อ-นามสกุล, เลขบัตรประชาชน 13 หลัก, หรือรหัสสมาชิก MB-..."
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-teal-600 focus:border-teal-600 min-h-[44px]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isFetchingBeneficiary || !searchQuery.trim()}
                    onClick={() => void loadBeneficiaryProfile(searchQuery)}
                    className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
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
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{fetchError}</span>
                  </div>
                )}

                {/* Candidate Suggestions Dropdown Cards */}
                {candidateList.length > 0 && !fetchError && (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    <div className="text-[11px] font-bold text-slate-500 mb-1">
                      ผลการค้นหาจากทะเบียน ({candidateList.length} ราย):
                    </div>
                    {candidateList.map((cand) => (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => void loadBeneficiaryProfile(cand.id)}
                        className="w-full p-2.5 bg-white border border-slate-200 hover:border-teal-500 rounded-xl text-left flex items-center justify-between gap-3 transition hover:shadow-2xs min-h-[44px]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{cand.fullName}</span>
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                              {cand.memberId}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            เลขบัตร: {cand.nationalId} • โทร: {cand.phone || '-'}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                            {cand.asnafNameTh || cand.asnafCode}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Verified Beneficiary Profile Card */}
            {beneficiaryProfile && (
              <div className="bg-gradient-to-r from-teal-50/70 via-slate-50 to-sky-50/40 border border-teal-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                      {beneficiaryProfile.fullName ? beneficiaryProfile.fullName[0] : 'ซ'}
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-teal-800 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-teal-700" /> สมาชิกผู้มีสิทธิ์ (ดึงจากทะเบียนเดิม)
                      </div>
                      <div className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        <span>{beneficiaryProfile.fullName}</span>
                        <span className="text-xs font-normal text-slate-500 font-mono">
                          ({beneficiaryProfile.nationalId})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-white text-teal-800 border border-teal-200 rounded-lg shadow-2xs">
                      {beneficiaryProfile.memberId}
                    </span>
                    <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                      {beneficiaryProfile.registrationStatus || 'ตรวจสอบแล้ว'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">เบอร์โทรศัพท์</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {beneficiaryProfile.phone || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">ที่อยู่จดทะเบียน</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {beneficiaryProfile.address || beneficiaryProfile.subdistrict || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">สาขา / สำนักงาน</span>
                    <span className="font-semibold text-slate-800">
                      {beneficiaryProfile.branchName || 'สำนักงานใหญ่'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">สถานะฐานข้อมูล</span>
                    <span className="font-semibold text-teal-700 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-teal-600 inline" /> ทะเบียนกลาง
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                ส่วนที่ 2: อัสนัฟจากทะเบียน (Asnaf from Registry)
               ======================================================== */}
            {beneficiaryProfile && (
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-700" /> ส่วนที่ 2: อัสนัฟจากทะเบียน (Asnaf from Registry)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    * ไม่อนุญาตให้แก้ไขหมวดอัสนัฟในทะเบียนหลักโดยอัตโนมัติ
                  </span>
                </div>

                {/* Case 1: Single Asnaf (Read-only verified badge) */}
                {beneficiaryProfile.hasSingleAsnaf ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        ✓
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">หมวดหมู่อัสนัฟที่รับรองตามทะเบียน:</span>
                        <strong className="text-emerald-950 font-bold text-sm">
                          {beneficiaryProfile.eligibleAsnafs?.[0]?.asnafNameTh || beneficiaryProfile.asnafCategory || 'ฟากีร-มิสกิน'}
                        </strong>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-white text-emerald-800 border border-emerald-200">
                      รับรองตามทะเบียน (Read-Only)
                    </span>
                  </div>
                ) : beneficiaryProfile.hasMultipleAsnafs && beneficiaryProfile.eligibleAsnafs?.length > 0 ? (
                  /* Case 2: Multiple Asnafs (Select strictly among beneficiary's registered Asnafs) */
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      ผู้มีสิทธิ์ได้รับการรับรองหลายหมวดหมู่อัสนัฟ — เลือกหมวดอัสนัฟที่เป็นฐานของคำร้องครั้งนี้ *:
                    </label>
                    <SearchableSelect
                      options={beneficiaryProfile.eligibleAsnafs.map((g: any) => ({
                        value: g.asnafCode,
                        label: g.asnafNameTh,
                        subLabel: g.isPrimary ? 'อัสนัฟหลักตามทะเบียน' : 'อัสนัฟรองตามทะเบียน',
                        badge: g.isPrimary ? 'อัสนัฟหลัก' : 'อัสนัฟรอง',
                        badgeColor: g.isPrimary ? 'emerald' : 'blue',
                      }))}
                      value={selectedPrimaryCode}
                      onChange={(code) => setSelectedPrimaryCode(code)}
                      placeholder="เลือกหมวดอัสนัฟสำหรับคำร้องนี้..."
                    />
                  </div>
                ) : (
                  /* Case 3: No Asnaf Found (Block application) */
                  <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-sm block">ไม่พบข้อมูลการรับรองหมวดหมู่อัสนัฟ</strong>
                      <p className="mt-1 text-rose-700">
                        ทะเบียนผู้มีสิทธิ์รายนี้ยังไม่ได้รับการรับรองอัสนัฟตามระเบียบ ไม่สามารถสร้างคำร้องขอความช่วยเหลือได้ กรุณาบันทึกการประเมินสิทธิ์และรับรองอัสนัฟในทะเบียนก่อน
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STEP 2: ส่วนที่ 3 (ประเภทการช่วยเหลือ) & ส่วนที่ 4 (รูปแบบการช่วยเหลือ)
           ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Section 3 Header */}
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-700" /> ส่วนที่ 3: ประเภทการช่วยเหลือ (Assistance Type)
              </h2>
              <p className="text-xs text-slate-500">
                กรองประเภทความช่วยเหลือเฉพาะรายการที่สัมพันธ์กับหมวดอัสนัฟ{' '}
                <strong className="text-teal-800 font-bold">
                  {currentPrimaryGroup?.asnafName || selectedPrimaryCode}
                </strong>{' '}
                (ห้ามแสดงประเภทที่ไม่สัมพันธ์กัน)
              </p>
            </div>

            {/* Asnaf Switch Alert Notice */}
            {asnafChangeNotice && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{asnafChangeNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAsnafChangeNotice(null)}
                  className="text-amber-500 hover:text-amber-800 text-sm font-bold p-1"
                >
                  ×
                </button>
              </div>
            )}

            {/* 2-Tier Selection Grid: Sub-Fund & Assistance Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Specific Sub-Fund */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  กองทุน *:
                </label>
                <select
                  value={currentSpecificFund?.id || ''}
                  onChange={(e) => setSelectedSpecificFundId(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white min-h-[44px]"
                >
                  {availableSpecificFunds.map((sf: any) => (
                    <option key={sf.id} value={sf.id}>
                      {sf.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assistance Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ประเภทการช่วยเหลือ *:
                </label>
                <SearchableSelect
                  options={availableAssistanceTypes.map((at: any) => ({
                    value: at.id,
                    label: at.name,
                  }))}
                  value={currentAssistanceType?.id || selectedAssistanceTypeId}
                  onChange={(id) => {
                    setSelectedAssistanceTypeId(id);
                    const found = availableAssistanceTypes.find((at: any) => at.id === id);
                    if (found) {
                      setSelectedAssistanceTypeName(found.name);
                      setSelectedAssistanceGroup(found.group || 'core');
                    }
                  }}
                  placeholder="เลือกประเภทความช่วยเหลือ..."
                />
              </div>
            </div>

            {/* ========================================================
                ส่วนที่ 4: รูปแบบการช่วยเหลือ
               ======================================================== */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-teal-700" /> ส่วนที่ 4: รูปแบบการช่วยเหลือ
                </h3>
                <span className="text-[11px] text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 font-semibold">
                  รองรับ {availableAssistanceFormats.length} รูปแบบ
                </span>
              </div>

              {/* Format Change Alert Notice */}
              {formatChangeNotice && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{formatChangeNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormatChangeNotice(null)}
                    className="text-blue-500 hover:text-blue-800 text-sm font-bold p-1"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Dynamic Format Cards Grid (Responsive 1-col mobile, 2-col tablet, 3-col desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {availableAssistanceFormats.map((fmt: any) => {
                  const isSelected = selectedFormatCode === fmt.code || selectedFormatId === fmt.id;
                  return (
                    <button
                      key={fmt.id || fmt.code}
                      type="button"
                      onClick={() => {
                        setSelectedFormatCode(fmt.code);
                        setSelectedFormatId(fmt.id);
                        setSelectedFormatName(fmt.name);
                        setFormatChangeNotice(null);
                      }}
                      className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between min-h-[44px] ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/80 ring-2 ring-teal-600/30 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <strong className="block text-slate-900 font-bold text-xs">{fmt.name}</strong>
                          {fmt.isDefault && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-bold">
                              แนะนำ
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {fmt.description || fmt.deliveryMethodLabelTh || fmt.deliveryMethod}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">วิธีส่งมอบ:</span>
                        <span className="font-semibold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded text-[10px]">
                          {fmt.deliveryMethodLabelTh || fmt.deliveryMethod}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duplicate Request Prevention Warning (Phase 8) */}
            {duplicateCheck && duplicateCheck.hasDuplicate && (
              <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>ตรวจพบเงื่อนไขการขอรับความช่วยเหลือซ้ำซ้อน: {duplicateCheck.ruleNameTh}</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  {duplicateCheck.message}
                </p>
                {duplicateCheck.existingApplication && (
                  <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="font-semibold text-slate-500">เลขที่คำร้องเดิม:</span>{' '}
                      <span className="font-mono font-bold text-slate-900">{duplicateCheck.existingApplication.applicationNo}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">วันที่ยื่น / ได้รับ:</span>{' '}
                      <span className="font-medium text-slate-900">{duplicateCheck.existingApplication.appliedDate}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">วงเงินเดิม:</span>{' '}
                      <span className="font-bold text-teal-700">฿{(duplicateCheck.existingApplication.approvedAmount || duplicateCheck.existingApplication.requestedAmount || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">สถานะปัจจุบัน:</span>{' '}
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900">
                        {duplicateCheck.existingApplication.statusLabelTh}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            STEP 3: ส่วนที่ 5 (รายละเอียดความต้องการ) & ส่วนที่ 6 (งบประมาณโดยประมาณ)
           ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Section 5 Header */}
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-700" /> ส่วนที่ 5: รายละเอียดความต้องการ (Needs Details / Description)
              </h2>
              <p className="text-xs text-slate-500">
                ระบุสภาพปัญหา ความจำเป็นเร่งด่วน และระดับความสำคัญในการพิจารณา
              </p>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                วัตถุประสงค์ / หัวข้อคำร้อง *:
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="เช่น ขอรับเงินสงเคราะห์ยังชีพและค่าอาหารจำเป็นในครัวเรือนประจำเดือน"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white min-h-[44px]"
              />
            </div>

            {/* Necessity Details */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                รายละเอียดสภาพปัญหาและความจำเป็น * (อย่างน้อย 5 ตัวอักษร):
              </label>
              <textarea
                rows={3}
                value={necessityDetails}
                onChange={(e) => setNecessityDetails(e.target.value)}
                placeholder="ระบุรายละเอียดสภาพปัญหาความเดือดร้อนและความจำเป็นเร่งด่วนที่ต้องได้รับความช่วยเหลือ..."
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
              />
            </div>

            {/* Hardship Reasons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เหตุผลความเดือดร้อน (Hardship Reasons):
              </label>
              <textarea
                rows={2}
                value={hardshipReasons}
                onChange={(e) => setHardshipReasons(e.target.value)}
                placeholder="เช่น มีภาระดูแลผู้ป่วยติดเตียง ขาดรายได้ประจำ มีภาระหนี้สินจำเป็น..."
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
              />
            </div>

            {/* Urgency Level (Responsive 1-col mobile, 3-col tablet/desktop) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ระดับความเร่งด่วน *:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setUrgencyLevel('normal')}
                  className={`p-3 rounded-xl border text-left transition min-h-[44px] flex items-center gap-2.5 ${
                    urgencyLevel === 'normal'
                      ? 'bg-teal-50/80 border-teal-600 text-teal-900 font-bold ring-1 ring-teal-600 shadow-2xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-teal-600 flex items-center justify-center">
                    {urgencyLevel === 'normal' && <span className="w-2 h-2 rounded-full bg-teal-600" />}
                  </span>
                  <div className="text-xs">
                    <span className="font-bold block">ปกติ</span>
                    <span className="text-[10px] text-slate-500 font-normal">ตามรอบการพิจารณา</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUrgencyLevel('high')}
                  className={`p-3 rounded-xl border text-left transition min-h-[44px] flex items-center gap-2.5 ${
                    urgencyLevel === 'high'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold ring-1 ring-amber-500 shadow-2xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-amber-500 flex items-center justify-center">
                    {urgencyLevel === 'high' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                  </span>
                  <div className="text-xs">
                    <span className="font-bold block text-amber-800">เร่งด่วน</span>
                    <span className="text-[10px] text-amber-700 font-normal">ภายใน 7 วันทำการ</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUrgencyLevel('urgent')}
                  className={`p-3 rounded-xl border text-left transition min-h-[44px] flex items-center gap-2.5 ${
                    urgencyLevel === 'urgent'
                      ? 'bg-rose-50 border-rose-500 text-rose-900 font-bold ring-1 ring-rose-500 shadow-2xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-rose-500 flex items-center justify-center">
                    {urgencyLevel === 'urgent' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                  </span>
                  <div className="text-xs">
                    <span className="font-bold block text-rose-800">ฉุกเฉินวิกฤต</span>
                    <span className="text-[10px] text-rose-700 font-normal">ดำเนินการทันที</span>
                  </div>
                </button>
              </div>
            </div>

            {/* ========================================================
                ส่วนที่ 6: งบประมาณโดยประมาณ & สภาพคล่องกองทุนย่อย
               ======================================================== */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-teal-700" /> ส่วนที่ 6: งบประมาณโดยประมาณ (Estimated Budget & Solvency)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Requested Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    วงเงินที่ขอรับความช่วยเหลือ (บาท) *:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      ฿
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="500"
                      value={requestedAmount || ''}
                      onChange={(e) => setRequestedAmount(Number(e.target.value))}
                      className="w-full text-base font-bold font-mono pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white min-h-[44px]"
                      placeholder="เช่น 8000"
                    />
                  </div>
                  <span className="text-[11px] text-teal-800 font-semibold mt-1 block">
                    จำนวนเงิน: {(requestedAmount || 0).toLocaleString()} บาทถ้วน
                  </span>
                </div>

                {/* Application Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    วันที่ยื่นคำร้อง *:
                  </label>
                  <input
                    type="date"
                    value={appliedDate}
                    onChange={(e) => setAppliedDate(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white min-h-[44px]"
                  />
                </div>
              </div>

              {/* Solvency Pre-check Banner & Chart of Accounts Preview */}
              {solvencyCheck && (
                <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                  solvencyCheck.isSolvent
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold">
                      {solvencyCheck.isSolvent ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>
                        สถานะงบประมาณกองทุนย่อย: {solvencyCheck.isSolvent ? 'งบประมาณเพียงพอสำหรับการอนุมัติ' : 'งบประมาณไม่เพียงพอ'}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      solvencyCheck.isSolvent
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {solvencyCheck.isSolvent ? 'Solvent' : 'Insufficient'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white/80 p-2.5 rounded-xl border border-slate-200/60">
                    <div>
                      <span className="text-slate-500">กองทุนเฉพาะ ({solvencyCheck.specificSubFund?.name || 'ทุน'}):</span>{' '}
                      <strong className="font-mono text-slate-800">
                        คงเหลือ ฿{(solvencyCheck.specificSubFund?.remainingAmount || 0).toLocaleString()} บ.
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">บัญชีคู่สองขา (GL Preview):</span>{' '}
                      <strong className="font-mono text-teal-800">
                        Dr: {chartOfAccounts.debitAcc.code} / Cr: {chartOfAccounts.creditAcc.code}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 4: ส่วนที่ 7 (เอกสารประกอบคำร้อง)
           ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Section 7 Header */}
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-teal-700" /> ส่วนที่ 7: เอกสารประกอบคำร้อง (Supporting Documents)
              </h2>
              <p className="text-xs text-slate-500">
                อ้างอิงเอกสารเดิมจากทะเบียนผู้มีสิทธิ์ และแนบเอกสารใหม่เฉพาะคำร้องนี้
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Section 7.1: เอกสารจากทะเบียนเดิม (อ้างอิง) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-teal-700" /> เอกสารจากทะเบียนเดิม (อ้างอิง)
                  </h4>
                  <span className="text-[10px] font-semibold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md">
                    เลือก {selectedExistingDocIds.length} ฉบับ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  เลือกเอกสารหลักที่ได้รับการตรวจสอบแล้วจากทะเบียน (ไม่สร้างไฟล์ซ้ำซ้อน)
                </p>

                {beneficiaryProfile?.registryDocuments && beneficiaryProfile.registryDocuments.length > 0 ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {beneficiaryProfile.registryDocuments.map((doc: any) => {
                      const isChecked = selectedExistingDocIds.includes(doc.id);
                      return (
                        <label
                          key={doc.id}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition min-h-[40px] ${
                            isChecked
                              ? 'bg-white border-teal-500 shadow-2xs font-medium text-slate-900'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedExistingDocIds([...selectedExistingDocIds, doc.id]);
                              } else {
                                setSelectedExistingDocIds(
                                  selectedExistingDocIds.filter((id) => id !== doc.id)
                                );
                              }
                            }}
                            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="truncate block font-semibold">{doc.name}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {doc.category || 'เอกสารทะเบียน'}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    ไม่มีเอกสารในทะเบียนเดิม สามารถแนบเอกสารใหม่ด้านขวาได้
                  </div>
                )}
              </div>

              {/* Section 7.2: แนบเอกสารใหม่เฉพาะคำร้อง */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-teal-700" /> แนบเอกสารใหม่เฉพาะคำร้องนี้
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    แนบแล้ว {applicationDocs.length} ฉบับ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  เช่น รูปถ่ายบ้านชำรุด, ใบรับรองแพทย์, ใบเสร็จค่าใช้จ่าย, หรือใบเสนอราคา
                </p>

                <DocumentUploader
                  entityType="assistance_request"
                  entityId={beneficiaryProfile?.memberId || 'draft'}
                  existingDocuments={applicationDocs}
                  onDocumentsChange={setApplicationDocs}
                  maxFiles={6}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 5: ส่วนที่ 8 (สรุปก่อนส่งคำร้อง)
           ======================================================== */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fadeIn">
            {/* Section 8 Header */}
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-teal-700" /> ส่วนที่ 8: สรุปก่อนส่งคำร้อง (Summary Preview before Submit)
              </h2>
              <p className="text-xs text-slate-500">
                ตรวจสอบความถูกต้องครบถ้วนของข้อมูลคำร้องทั้ง 8 ส่วนก่อนยืนยันบันทึกเข้าสู่ระบบ
              </p>
            </div>

            {/* 2-Column Responsive Review Cards (Single col on mobile) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              {/* Summary Card 1: ผู้ยื่นและประเภทความช่วยเหลือ */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-teal-700" /> 1. ผู้ยื่นและประเภทการช่วยเหลือ
                </h4>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">ชื่อ-นามสกุล:</span>
                  <span className="font-bold text-slate-900">{beneficiaryProfile?.fullName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">รหัสสมาชิก (Member ID):</span>
                  <span className="font-mono font-bold text-teal-800">{beneficiaryProfile?.memberId}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">หมวดอัสนัฟ (Asnaf):</span>
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {currentPrimaryGroup?.asnafName || selectedPrimaryCode}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">กองทุนเฉพาะ:</span>
                  <span className="font-semibold text-slate-800">{currentSpecificFund?.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">ประเภทความช่วยเหลือ:</span>
                  <span className="font-bold text-teal-700">{selectedAssistanceTypeName || currentAssistanceType?.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">รูปแบบการส่งมอบ:</span>
                  <span className="font-bold text-teal-800">
                    {currentAssistanceFormat?.name || selectedFormatName} ({currentAssistanceFormat?.deliveryMethodLabelTh || 'โอนเงิน'})
                  </span>
                </div>
              </div>

              {/* Summary Card 2: วงเงิน รายละเอียด และผังบัญชี */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-2 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-teal-700" /> 2. วงเงินและรายละเอียดคำร้อง
                </h4>

                <div className="flex justify-between items-center py-2 bg-white px-3.5 rounded-xl border border-teal-200">
                  <span className="text-slate-600 font-semibold">วงเงินที่ร้องขอ:</span>
                  <span className="text-lg font-extrabold font-mono text-emerald-700">
                    ฿{Number(requestedAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">ระดับความเร่งด่วน:</span>
                  <span className={`font-bold ${
                    urgencyLevel === 'urgent' ? 'text-rose-600' : urgencyLevel === 'high' ? 'text-amber-600' : 'text-slate-800'
                  }`}>
                    {urgencyLevel === 'urgent' ? 'ฉุกเฉินวิกฤต' : urgencyLevel === 'high' ? 'เร่งด่วน' : 'ปกติ'}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">วันที่ยื่นคำร้อง:</span>
                  <span className="font-mono text-slate-800">{appliedDate}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">วัตถุประสงค์:</span>
                  <p className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-800">
                    {purpose || '-'}
                  </p>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">เอกสารแนบทั้งหมด:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedExistingDocIds.length} ฉบับเดิม + {applicationDocs.length} ฉบับใหม่
                  </span>
                </div>
              </div>
            </div>

            {/* Governance Callout Banner */}
            <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-2xl text-teal-950 text-xs flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <strong>ระเบียบธรรมาภิบาล:</strong> คำร้องนี้จะถูกออกเลขที่คำร้องอัตโนมัติตามลำดับ{' '}
                <span className="font-mono font-bold">APP-2569-XXXXXX</span>{' '}
                โดยแยกสถานะคำร้องออกจากสถานะสมาชิกและสถานะการประเมินสิทธิ์ และจะตั้งผังบัญชีแยกประเภททั่วไป (GL Voucher) อัตโนมัติเมื่อมีการจ่ายเงิน
              </div>
            </div>

            {/* Officer Certification Checkbox */}
            <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={hasCertified}
                onChange={(e) => setHasCertified(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="text-slate-700 font-medium">
                ข้าพเจ้าขอรับรองว่าได้ตรวจสอบข้อมูลความถูกต้องและความจำเป็นของผู้มีสิทธิ์รับซะกาตรายนี้แล้ว ข้อมูลและเอกสารทั้งหมดเป็นความจริง
              </span>
            </label>
          </div>
        )}

        {/* ========================================================
            Footer & Navigation Buttons (Mobile Sticky / Desktop Fixed)
           ======================================================== */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="px-4 sm:px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition flex items-center gap-1.5 min-h-[44px]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ย้อนกลับ</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={currentStep === 1 && !beneficiaryProfile}
                className="px-5 sm:px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 min-h-[44px]"
              >
                <span>ถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveOrSubmit('draft')}
                  disabled={isSubmitting || submitLock}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition min-h-[44px]"
                >
                  บันทึกฉบับร่าง
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveOrSubmit('submitted')}
                  disabled={isSubmitting || submitLock || !hasCertified}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>ยืนยันและส่งคำร้อง</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
