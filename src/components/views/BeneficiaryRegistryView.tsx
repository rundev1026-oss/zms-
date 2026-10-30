'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  Package
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

export type RegistryMainSection = 
  | 'personal'           // 1. ส่วนข้อมูลส่วนบุคคล
  | 'location'           // 2. ส่วนพิกัดที่อยู่อาศัยและแผนที่
  | 'coordinator'        // 3. ส่วนผู้ประสานงานและผู้รับรอง
  | 'documents'          // 4. ส่วนเอกสารแนบ
  | 'assistance_history' // 5. ส่วนประวัติการช่วยเหลือ
  | 'status';            // 6. ส่วนสถานะ

const MAIN_SECTIONS = [
  { id: 'personal', label: '1. ข้อมูลส่วนบุคคล', icon: User },
  { id: 'location', label: '2. พิกัด & แผนที่', icon: MapPin },
  { id: 'coordinator', label: '3. ผู้ประสานงาน & รับรอง', icon: ShieldCheck },
  { id: 'documents', label: '4. เอกสารแนบ', icon: FileText },
  { id: 'assistance_history', label: '5. ประวัติการช่วยเหลือ', icon: DollarSign },
  { id: 'status', label: '6. สถานะทะเบียน', icon: CheckSquare },
] as const;

interface BeneficiaryRegistryViewProps {
  onNavigate: (view: string) => void;
  initialStatusFilter?: string;
  onSelectBeneficiaryForAssistance?: (beneficiary: BeneficiaryRegistryItem) => void;
}

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'ร่าง', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-300' },
  pending_verification: { label: 'รอตรวจสอบข้อมูล', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  pending_survey: { label: 'รอลงพื้นที่สำรวจ', color: 'text-sky-800', bg: 'bg-sky-50', border: 'border-sky-200' },
  pending_qualification: { label: 'รอพิจารณาคุณสมบัติ', color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-200' },
  qualified: { label: 'มีคุณสมบัติตามเกณฑ์', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  disqualified: { label: 'ไม่มีคุณสมบัติตามเกณฑ์', color: 'text-rose-800', bg: 'bg-rose-50', border: 'border-rose-200' },
  need_more_info: { label: 'ต้องตรวจสอบเพิ่มเติม', color: 'text-orange-800', bg: 'bg-orange-50', border: 'border-orange-200' },
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
  onSelectBeneficiaryForAssistance 
}: BeneficiaryRegistryViewProps) {
  const { 
    registries, 
    applications,
    currentUser, 
    updateRegistryStatus, 
    updateRegistryChecklist,
    updateBeneficiaryRegistry,
    getRegistryEditHistory,
    createAssistanceRequest,
    showToast, 
    refreshData,
    isLoading 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [asnafFilter, setAsnafFilter] = useState<string>('all');
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
      .catch((err) => console.error('Failed to load branches for registry filter:', err));
  }, []);

  // 6 Main Sections state
  const [selectedRegistry, setSelectedRegistry] = useState<BeneficiaryRegistryItem | null>(null);
  const [activeMainSection, setActiveMainSection] = useState<RegistryMainSection>('personal');
  const [activePersonalSubSection, setActivePersonalSubSection] = useState<PersonalSubTab>('all');
  const [selectedAidForReceipt, setSelectedAidForReceipt] = useState<AssistanceApplication | null>(null);
  const [isSavingLocationDirectly, setIsSavingLocationDirectly] = useState<boolean>(false);
  
  // Legacy tab state compatibility
  const [activeTab, setActiveTab] = useState<'survey' | 'location' | 'members' | 'economy' | 'limitations' | 'other_aid' | 'coordinator' | 'documents' | 'checklist' | 'history' | 'assistance'>('survey');
  
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

  // Assistance request creation dialog state (Creates independent assistance request)
  const [isAssistanceDialogOpen, setIsAssistanceDialogOpen] = useState<boolean>(false);
  const [regHierarchyData, setRegHierarchyData] = useState<any[]>([]);
  const [quickPrimaryCode, setQuickPrimaryCode] = useState<string>('faqir_miskin');
  const [quickSpecificFundId, setQuickSpecificFundId] = useState<string>('');
  const [quickAssistanceTypeId, setQuickAssistanceTypeId] = useState<string>('');
  const [assistanceType, setAssistanceType] = useState<string>('เงินสงเคราะห์ยังชีพ');
  const [assistanceDetails, setAssistanceDetails] = useState<string>('');
  const [requestedAmount, setRequestedAmount] = useState<number>(10000);
  const [urgencyLevel, setUrgencyLevel] = useState<string>('normal');
  const [necessityDetails, setNecessityDetails] = useState<string>('');
  const [isSubmittingAssistance, setIsSubmittingAssistance] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/finance/allocations/asnaf?view=hierarchy&year=2569&activeOnly=true')
      .then((res) => res.json())
      .then((json) => {
        const groups = Array.isArray(json.data?.primaryGroups) ? json.data.primaryGroups : (Array.isArray(json.data) ? json.data : []);
        if (json.success && groups.length > 0) {
          setRegHierarchyData(groups);
        }
      })
      .catch((err) => console.error('Failed to load fund hierarchy in BeneficiaryRegistryView', err));
  }, []);

  const quickPrimaryObj = useMemo(
    () => regHierarchyData.find((pg) => pg.asnafCode === quickPrimaryCode) || regHierarchyData[0] || null,
    [regHierarchyData, quickPrimaryCode]
  );
  const quickSpecificFunds = useMemo(
    () => quickPrimaryObj?.specificFunds || [],
    [quickPrimaryObj]
  );
  const quickSpecificFundObj = useMemo(
    () => quickSpecificFunds.find((sf: any) => sf.id === quickSpecificFundId) || quickSpecificFunds[0] || null,
    [quickSpecificFunds, quickSpecificFundId]
  );
  const quickAssistanceTypes = useMemo(
    () => quickSpecificFundObj?.assistanceTypes || [],
    [quickSpecificFundObj]
  );
  const quickAssistanceTypeObj = useMemo(
    () => quickAssistanceTypes.find((ast: any) => ast.id === quickAssistanceTypeId) || quickAssistanceTypes[0] || null,
    [quickAssistanceTypes, quickAssistanceTypeId]
  );

  // Checklist editing state
  const [checklist, setChecklist] = useState<EvaluatorChecklist | null>(null);
  const [isSavingChecklist, setIsSavingChecklist] = useState<boolean>(false);

  // In-app unsaved changes confirmation modal state (replaces native window.confirm)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState<boolean>(false);

  // Lock body scroll cleanly whenever any modal in this view is active
  const isAnyModalActive = Boolean(
    selectedRegistry || 
    isStatusDialogOpen || 
    isAssistanceDialogOpen || 
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

  // Filtered registries
  const filteredRegistries = useMemo(() => {
    return registries.filter((item) => {
      // 1. Search filter
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        item.fullName.toLowerCase().includes(term) ||
        item.registrationNo.toLowerCase().includes(term) ||
        item.nationalId.includes(term) ||
        item.phone.includes(term) ||
        item.community.toLowerCase().includes(term) ||
        item.district.toLowerCase().includes(term);

      // 2. Status filter
      const matchStatus = statusFilter === 'all' || item.registrationStatus === statusFilter;

      // 3. Asnaf filter
      const matchAsnaf = asnafFilter === 'all' || item.asnafCategory === asnafFilter;

      // 4. Branch filter
      const matchBranch = branchFilter === 'all' || item.branchId === branchFilter || item.branchName === branchFilter;

      // RBAC: Member can only view their own registration record
      if (currentUser.role === 'member') {
        const isOwner =
          (item.memberId && item.memberId === currentUser.id) ||
          (currentUser.beneficiaryId && item.id === currentUser.beneficiaryId) ||
          (currentUser.nationalId && item.nationalId === currentUser.nationalId);
        if (!isOwner) return false;
      }

      return matchSearch && matchStatus && matchAsnaf && matchBranch;
    });
  }, [registries, searchTerm, statusFilter, asnafFilter, branchFilter, currentUser]);

  // Pagination calculation
  const totalItems = filteredRegistries.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRegistries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRegistries.slice(start, start + pageSize);
  }, [filteredRegistries, currentPage, pageSize]);

  // Permission check for registry editing (Member can edit own, Officer/Approver/SuperAdmin can edit assigned/all)
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

  // Open details modal
  const handleOpenDetails = (
    reg: BeneficiaryRegistryItem, 
    mainSection: RegistryMainSection = 'personal',
    personalSub: PersonalSubTab = 'all'
  ) => {
    setSelectedRegistry(reg);
    setActiveMainSection(mainSection);
    setActivePersonalSubSection(personalSub);
    setIsEditing(false);
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
  const handleStartEdit = (mainSec: RegistryMainSection = 'personal', personalSub?: PersonalSubTab) => {
    if (!selectedRegistry) return;
    if (!canEditRegistry(selectedRegistry)) {
      showToast('ท่านไม่มีสิทธิ์แก้ไขข้อมูลทะเบียนนี้', 'error');
      return;
    }
    setIsEditing(true);
    setActiveMainSection(mainSec);
    if (personalSub) setActivePersonalSubSection(personalSub);
    setEditForm({
      titlePrefix: selectedRegistry.titlePrefix || 'นาย',
      fullName: selectedRegistry.fullName || '',
      nationalId: selectedRegistry.nationalId || '',
      phone: selectedRegistry.phone || '',
      email: selectedRegistry.email || '',
      birthDate: selectedRegistry.birthDate || '',
      age: selectedRegistry.age || 0,
      occupation: selectedRegistry.occupation || '',
      maritalStatus: selectedRegistry.maritalStatus || 'married',
      asnafCategory: selectedRegistry.asnafCategory || 'miskin',
      branchId: selectedRegistry.branchId || 'br-hq',
      branchName: selectedRegistry.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร',
      address: selectedRegistry.address || '',
      province: selectedRegistry.province || '',
      district: selectedRegistry.district || '',
      subdistrict: selectedRegistry.subdistrict || '',
      community: selectedRegistry.community || '',
      postcode: selectedRegistry.postcode || '',
      housingType: selectedRegistry.housingType || 'own',
      housingCondition: selectedRegistry.housingCondition || 'dilapidated',
      housingNotes: selectedRegistry.housingNotes || '',
      landTitleType: selectedRegistry.landTitleType || 'title_deed',
      landTitleNotes: selectedRegistry.landTitleNotes || '',
      monthlyIncome: selectedRegistry.monthlyIncome ?? null,
      monthlyExpense: selectedRegistry.monthlyExpense ?? null,
      debtAmount: selectedRegistry.debtAmount ?? null,
      debtMonthlyPayment: selectedRegistry.debtMonthlyPayment ?? null,
      creditorName: selectedRegistry.creditorName || '',
      debtPurpose: selectedRegistry.debtPurpose || selectedRegistry.debtType || '',
      incomeBreakdown: selectedRegistry.incomeBreakdown ? { ...selectedRegistry.incomeBreakdown } : null,
      expenseBreakdown: selectedRegistry.expenseBreakdown ? { ...selectedRegistry.expenseBreakdown } : null,
      householdMembers: selectedRegistry.householdMembers ? selectedRegistry.householdMembers.map(m => ({ ...m })) : [],
      pastAssistance: selectedRegistry.pastAssistance ? selectedRegistry.pastAssistance.map(a => ({ ...a })) : [],
      hardshipReasons: selectedRegistry.hardshipReasons || {
        poverty: true,
        hasDebt: true,
      },
      disabilityNotes: selectedRegistry.disabilityNotes || '',
      illnessNotes: selectedRegistry.illnessNotes || '',
      livingLimitations: selectedRegistry.livingLimitations || '',
      familySituationSummary: selectedRegistry.familySituationSummary || '',
      urgentNeeds: selectedRegistry.urgentNeeds || '',
      dependentBurdens: selectedRegistry.dependentBurdens || '',
      coordinator: selectedRegistry.coordinator ? { ...selectedRegistry.coordinator } : { fullName: '', phone: '', occupation: '' },
      certifier: selectedRegistry.certifier ? { ...selectedRegistry.certifier } : { fullName: '', phone: '', roleTitle: '', organization: '', comments: '' },
      latitude: selectedRegistry.latitude !== undefined ? selectedRegistry.latitude : null,
      longitude: selectedRegistry.longitude !== undefined ? selectedRegistry.longitude : null,
      residenceAddress: selectedRegistry.residenceAddress || selectedRegistry.address || '',
      placeName: selectedRegistry.placeName || '',
      locationVerificationStatus: selectedRegistry.locationVerificationStatus || 'not_specified',
      editNotes: '',
      newUploadedDocs: [] as UploadedDocumentItem[],
    });
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
        const res = await fetch(`/api/registry/${selectedRegistry.id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setSelectedRegistry(json.data);
        }
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
          age: 18,
          occupation: '',
          monthlyIncome: 0,
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
      list[index] = { ...list[index], [field]: value };
      return { ...prev, householdMembers: list };
    });
  };

  // Save edit changes to real database
  const handleSaveEdit = async () => {
    if (!selectedRegistry) return;

    if (!editForm.fullName?.trim()) {
      showToast('กรุณาระบุชื่อ-นามสกุลผู้มีสิทธิ์', 'error');
      return;
    }
    const cleanId = String(editForm.nationalId || '').replace(/[^0-9]/g, '');
    if (!cleanId || cleanId.length !== 13) {
      showToast('กรุณาระบุหมายเลขบัตรประชาชน 13 หลักให้ถูกต้อง', 'error');
      return;
    }
    if (!editForm.phone?.trim()) {
      showToast('กรุณาระบุเบอร์โทรศัพท์ติดต่อ', 'error');
      return;
    }
    if (!editForm.address?.trim()) {
      showToast('กรุณาระบุที่อยู่ปัจจุบัน', 'error');
      return;
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

    setIsSaving(true);
    try {
      const payload = {
        ...editForm,
        nationalId: cleanId,
        documents: (editForm.newUploadedDocs || []).map((d: UploadedDocumentItem) => ({
          name: d.name,
          category: d.category,
          fileUrl: d.fileUrl,
          storageProvider: d.storageProvider,
          storagePath: d.storagePath,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
        })),
      };

      const ok = await updateBeneficiaryRegistry(selectedRegistry.id, payload, editForm.editNotes);
      if (ok) {
        // Fetch fresh registry record from database
        const res = await fetch(`/api/registry/${selectedRegistry.id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setSelectedRegistry(json.data);
        }
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Open Edit History Modal
  const handleOpenHistoryModal = async (benId: string, name?: string, regNo?: string) => {
    const reg = registries.find(r => r.id === benId) || selectedRegistry;
    setHistoryTarget({
      name: name || reg?.fullName || 'ผู้มีสิทธิ์',
      regNo: regNo || reg?.registrationNo || '-'
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

  // Open quick create assistance request
  const handleOpenAssistanceDialog = (reg: BeneficiaryRegistryItem) => {
    setSelectedRegistry(reg);
    const regAsnaf = (reg.asnafCategory || (reg as any).asnaf?.code || 'miskin').toLowerCase();
    const pCode = ['faqir', 'miskin'].includes(regAsnaf) ? 'faqir_miskin' : regAsnaf;
    const pg = regHierarchyData.find((p) => p.asnafCode === pCode) || regHierarchyData[0];
    const sf = pg?.specificFunds?.[0];
    const ast = sf?.assistanceTypes?.[0];

    setQuickPrimaryCode(pg ? pg.asnafCode : 'faqir_miskin');
    setQuickSpecificFundId(sf ? sf.id : '');
    setQuickAssistanceTypeId(ast ? ast.id : '');
    setAssistanceType(ast ? ast.name : 'เงินสงเคราะห์ยังชีพ');
    setAssistanceDetails('');
    setRequestedAmount(ast?.defaultMinAmount || (reg.netIncome < 0 ? 10000 : 8000));
    setUrgencyLevel('normal');
    setNecessityDetails(`ขอรับการสนับสนุนสำหรับครัวเรือน ${reg.fullName} เนื่องจากมีรายได้ไม่เพียงพอต่อค่าครองชีพ`);
    setIsAssistanceDialogOpen(true);
  };

  // Confirm assistance request creation
  const handleConfirmAssistanceRequest = async () => {
    if (!selectedRegistry) return;
    setIsSubmittingAssistance(true);
    try {
      const res = await createAssistanceRequest({
        beneficiaryId: selectedRegistry.id,
        nationalId: selectedRegistry.nationalId,
        primaryGroupCode: quickPrimaryCode,
        specificFundId: quickSpecificFundId || undefined,
        assistanceTypeId: quickAssistanceTypeId || undefined,
        assistanceType: quickAssistanceTypeObj?.name || assistanceType,
        assistanceTypeDetails: assistanceDetails,
        urgencyLevel,
        requestedAmount: Number(requestedAmount),
        necessityDetails,
        coordinator: selectedRegistry.coordinator,
        certifier: selectedRegistry.certifier,
      });

      if (res) {
        setIsAssistanceDialogOpen(false);
        showToast(`สร้างคำร้องเลขที่ ${res.applicationNo} เรียบร้อยแล้ว (ไม่ส่งผลต่อสถานะทะเบียน)`, 'success');
      }
    } finally {
      setIsSubmittingAssistance(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#0b2545] text-amber-300 font-bold flex items-center justify-center text-base shadow-xs shrink-0">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  ขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  ฐานข้อมูลหลักบุคคลและครัวเรือน
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                จัดเก็บสำรวจข้อมูล 10 หมวด ตรวจสอบคุณสมบัติ และเชื่อมโยงคำร้องขอความช่วยเหลือ โดยไม่สร้างข้อมูลบุคคลซ้ำ
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
            onClick={() => {
              // Quick export demo
              showToast('ส่งออกข้อมูลทะเบียนผู้มีสิทธิ์เป็น Excel/CSV สำเร็จ', 'success');
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>ส่งออก Excel</span>
          </button>

          <button
            onClick={() => onNavigate('new-application')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>ขึ้นทะเบียนผู้มีสิทธิ์ใหม่</span>
          </button>
        </div>
      </div>

      {/* 2. Search, Status Tabs & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Status Pill Tabs (8 Statuses required by Specification) */}
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
          {/* Search box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, เลขทะเบียน REG-, เลขบัตร ปชช., เบอร์โทร หรือชุมชน..."
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

          {/* Asnaf Filter */}
          <div>
            <select
              value={asnafFilter}
              onChange={(e) => { setAsnafFilter(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0b2545] text-xs font-medium"
            >
              <option value="all">หมวดอัสนาฟทั้งหมด</option>
              {Object.entries(ASNAF_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
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

      {/* 3. Registries Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">เลขทะเบียน</th>
                <th className="py-3 px-4">ชื่อ-นามสกุล / หมายเลขบัตร</th>
                <th className="py-3 px-4">ชุมชน / จังหวัด</th>
                <th className="py-3 px-4">หมวดอัสนาฟ</th>
                <th className="py-3 px-4">สถานะทะเบียน</th>
                <th className="py-3 px-4 text-center">คำร้องขอรับ</th>
                <th className="py-3 px-4 text-right">ช่วยเหลือสะสม</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRegistries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">ไม่พบข้อมูลทะเบียนผู้มีสิทธิ์ตามเงื่อนไขที่เลือก</p>
                    <p className="text-[11px] mt-1">ลองปรับคำค้นหา หรือกด "ขึ้นทะเบียนผู้มีสิทธิ์ใหม่"</p>
                  </td>
                </tr>
              ) : (
                paginatedRegistries.map((reg) => {
                  const statusKey = String(reg.registrationStatus || (reg as any).status || '').toLowerCase() as RegistrationStatus;
                  const statusMeta = REGISTRATION_STATUS_LABELS[statusKey] || REGISTRATION_STATUS_LABELS[reg.registrationStatus] || REGISTRATION_STATUS_LABELS.draft;
                  const asnafKey = String(reg.asnafCategory || (reg as any).asnaf?.code || '').toLowerCase();
                  const asnafText = ASNAF_LABELS[asnafKey] || (reg as any).asnaf?.nameTh || reg.asnafCategory || 'ไม่ระบุ';

                  return (
                    <tr 
                      key={reg.id} 
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => handleOpenDetails(reg)}
                    >
                      {/* Registration No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0b2545] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{reg.registrationNo || (reg as any).registryNumber || '-'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {reg.registeredDate ? new Date(reg.registeredDate).toLocaleDateString('th-TH') : '-'}
                        </div>
                      </td>

                      {/* Name & Masked ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{reg.titlePrefix || (reg as any).title || ''} {reg.fullName || `${(reg as any).firstName || ''} ${(reg as any).lastName || ''}`.trim() || 'ไม่ระบุชื่อ'}</span>
                          {reg.age && <span className="text-[10px] font-normal text-slate-400">({reg.age} ปี)</span>}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                          <span title="หมายเลขประจำตัวประชาชน (PDPA Masked)">{reg.nationalIdMasked || (reg as any).identityNumber || '-'}</span>
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
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                          {typeof asnafText === 'string' && asnafText.includes(' ') ? asnafText.split(' ').slice(1).join(' ') : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{statusMeta.label}</span>
                        </span>
                      </td>

                      {/* Linked Assistance Applications Count */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                          {reg.assistanceApplicationsCount || 0}
                        </span>
                      </td>

                      {/* Total Assistance Received */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        ฿{(reg.totalAssistanceReceived || 0).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. ดูรายละเอียด */}
                          <button
                            onClick={() => handleOpenDetails(reg, 'personal', 'all')}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b2545] hover:bg-slate-100 transition-colors"
                            title="ดูรายละเอียดทะเบียนรายบุคคล (6 ส่วนหลัก)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 2. ดูตำแหน่งที่อยู่อาศัยบนแผนที่ */}
                          <button
                            onClick={() => handleOpenDetails(reg, 'location')}
                            className={`p-1.5 rounded-lg transition-colors ${
                              reg.latitude && reg.longitude
                                ? 'text-emerald-700 hover:bg-emerald-50'
                                : 'text-slate-400 hover:bg-slate-100'
                            }`}
                            title={reg.latitude && reg.longitude ? `ดูตำแหน่งบนแผนที่ Google Maps (${reg.latitude.toFixed(4)}, ${reg.longitude.toFixed(4)})` : 'ยังไม่ได้ระบุพิกัดที่อยู่อาศัย (คลิกเพื่อระบุ)'}
                          >
                            <MapPin className="w-4 h-4" />
                          </button>

                          {/* 3. ดูประวัติการแก้ไข */}
                          <button
                            onClick={() => handleOpenHistoryModal(reg.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0b2545] hover:bg-slate-100 transition-colors"
                            title="ดูประวัติการแก้ไขข้อมูลทะเบียนรายบุคคล"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* 4. แก้ไขข้อมูล */}
                          {canEditRegistry(reg) && (
                            <button
                              onClick={() => {
                                handleOpenDetails(reg, 'personal', 'all');
                                handleStartEdit('personal');
                              }}
                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="แก้ไขข้อมูลทะเบียนรายบุคคล"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* 5. ปรับสถานะทะเบียน */}
                          <button
                            onClick={() => handleOpenStatusDialog(reg)}
                            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors"
                            title="ปรับสถานะทะเบียนและบันทึกประวัติ"
                          >
                            <FileCheck2 className="w-4 h-4" />
                          </button>

                          {/* 6. ยื่นคำร้องขอความช่วยเหลือ */}
                          <button
                            onClick={() => handleOpenAssistanceDialog(reg)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-bold transition-colors ml-1"
                            title="ยื่นคำร้องขอความช่วยเหลือให้ผู้มีสิทธิ์นี้"
                          >
                            <FilePlus2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="hidden sm:inline">ยื่นคำร้อง</span>
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

        {/* Pagination bar */}
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

      {/* 4. Details & 6 Main Sections View Modal */}
      {selectedRegistry && !isStatusDialogOpen && !isAssistanceDialogOpen && (
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
            {/* Modal Header (Compliant with Section 7 Requirements) */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0b2545] via-[#103463] to-[#133e6f] text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0 shadow-sm">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-semibold mb-1">
                  <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md border border-white/10">รหัสทะเบียน: {selectedRegistry.registrationNo}</span>
                  <span>•</span>
                  <span>ขึ้นทะเบียน: {selectedRegistry.registeredDate ? new Date(selectedRegistry.registeredDate).toLocaleDateString('th-TH') : '-'}</span>
                  <span>•</span>
                  <span className="text-slate-200">ผู้รับผิดชอบ: {selectedRegistry.surveyorName || selectedRegistry.branchName || 'เจ้าหน้าที่ฝ่ายสงเคราะห์'}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                    {selectedRegistry.titlePrefix} {selectedRegistry.fullName}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.bg || 'bg-slate-100'
                  } ${
                    REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.color || 'text-slate-800'
                  } ${
                    REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.border || 'border-slate-300'
                  }`}>
                    {REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.label || selectedRegistry.registrationStatus}
                  </span>
                </div>

                <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-1.5">
                  <span>บัตร ปชช: {selectedRegistry.nationalIdMasked}</span>
                  <span>•</span>
                  <span>โทร: {selectedRegistry.phone || '-'}</span>
                  <span>•</span>
                  <span>{selectedRegistry.community || selectedRegistry.subdistrict}, {selectedRegistry.district}, {selectedRegistry.province}</span>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {!isEditing ? (
                  <>
                    {/* ปุ่มแก้ไขข้อมูล */}
                    {canEditRegistry(selectedRegistry) && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeMainSection)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                        title="แก้ไขข้อมูลทะเบียนรายบุคคล"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>แก้ไขข้อมูล</span>
                      </button>
                    )}

                    {/* ปรับสถานะทะเบียน */}
                    <button
                      type="button"
                      onClick={() => handleOpenStatusDialog(selectedRegistry)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl text-xs transition-colors shadow-sm"
                      title="ปรับสถานะทะเบียน"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-slate-900" />
                      <span className="hidden sm:inline">ปรับสถานะ</span>
                    </button>

                    {/* ดูประวัติการแก้ไข */}
                    <button
                      type="button"
                      onClick={() => handleOpenHistoryModal(selectedRegistry.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition-colors border border-white/10"
                      title="ดูประวัติการแก้ไขข้อมูลรายฟิลด์ (Audit Trail)"
                    >
                      <History className="w-3.5 h-3.5 text-amber-300" />
                      <span className="hidden md:inline">ประวัติแก้ไข</span>
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
                      <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                    </button>
                  </>
                )}

                {/* ปุ่มกลับหน้ารายการ */}
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      setShowUnsavedConfirm(true);
                    } else {
                      setSelectedRegistry(null);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-colors border border-white/15 ml-1"
                  title="กลับหน้ารายการทะเบียน"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>กลับหน้ารายการ</span>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Dropdown (< md) - Optimised for iPhone 15 393 × 852 px */}
            <div className="md:hidden p-2.5 bg-slate-100 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600 shrink-0">หมวดข้อมูล:</span>
                <select
                  value={activeMainSection}
                  onChange={(e) => setActiveMainSection(e.target.value as RegistryMainSection)}
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

            {/* 6-Section Navigation Tabs Bar (Desktop & Touch-scrollable) */}
            <div className="border-b border-slate-200 bg-slate-50 px-3 sm:px-4 flex items-center gap-1 overflow-x-auto text-xs font-semibold shrink-0 no-scrollbar touch-scroll">
              {MAIN_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeMainSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveMainSection(sec.id as RegistryMainSection)}
                    className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-bold whitespace-nowrap transition-all text-xs ${
                      isActive
                        ? 'border-emerald-600 text-emerald-800 bg-emerald-50/70 shadow-2xs'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body Container with 6 Section Components */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60">
              {/* Section 1: ส่วนข้อมูลส่วนบุคคล (5 หมวด) */}
              {activeMainSection === 'personal' && (
                <PersonalSection
                  registry={selectedRegistry}
                  isEditing={isEditing}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onStartEdit={(subSec) => handleStartEdit('personal', subSec)}
                  activeSubTab={activePersonalSubSection}
                  setActiveSubTab={setActivePersonalSubSection}
                  asnafLabels={ASNAF_LABELS}
                  canViewUnmaskedId={['super_admin', 'approver', 'officer'].includes(currentUser.role)}
                />
              )}

              {/* Section 2: ส่วนพิกัดที่อยู่อาศัยและแผนที่ */}
              {activeMainSection === 'location' && (
                <LocationSection
                  registry={selectedRegistry}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onSaveLocationDirectly={handleSaveLocationDirectly}
                  isSavingLocation={isSavingLocationDirectly}
                />
              )}

              {/* Section 3: ส่วนผู้ประสานงานและผู้รับรอง */}
              {activeMainSection === 'coordinator' && (
                <CoordinatorSection
                  registry={selectedRegistry}
                  isEditing={isEditing}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onStartEdit={() => handleStartEdit('coordinator')}
                />
              )}

              {/* Section 4: ส่วนเอกสารแนบ */}
              {activeMainSection === 'documents' && (
                <DocumentsSection
                  registry={selectedRegistry}
                  canEdit={canEditRegistry(selectedRegistry)}
                  onRefreshRegistry={async () => {
                    const res = await fetch(`/api/registry/${selectedRegistry.id}`);
                    const json = await res.json();
                    if (json.success && json.data) {
                      setSelectedRegistry(json.data);
                    }
                  }}
                  onDocumentsUploaded={async (newDocs) => {
                    const res = await fetch(`/api/registry/${selectedRegistry.id}`);
                    const json = await res.json();
                    if (json.success && json.data) {
                      setSelectedRegistry(json.data);
                    }
                  }}
                />
              )}

              {/* Section 5: ส่วนประวัติการช่วยเหลือ */}
              {activeMainSection === 'assistance_history' && (
                <AssistanceHistorySection
                  registry={selectedRegistry}
                  applications={applications}
                  onOpenReceiptModal={(app) => setSelectedAidForReceipt(app)}
                  onOpenNewAssistanceDialog={() => handleOpenAssistanceDialog(selectedRegistry)}
                  canEdit={canEditRegistry(selectedRegistry)}
                />
              )}

              {/* Section 6: ส่วนสถานะ */}
              {activeMainSection === 'status' && (
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

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              {!isEditing ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">ส่วนข้อมูลปัจจุบัน:</span>
                    <span className="font-bold text-slate-800">
                      {MAIN_SECTIONS.find((s) => s.id === activeMainSection)?.label}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">สถานะ:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] border ${
                      REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.bg || 'bg-slate-100'
                    } ${
                      REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.color || 'text-slate-700'
                    } ${
                      REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.border || 'border-slate-300'
                    }`}>
                      {REGISTRATION_STATUS_LABELS[selectedRegistry.registrationStatus]?.label || selectedRegistry.registrationStatus}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* ปุ่มแก้ไขข้อมูลในส่วนปัจจุบัน */}
                    {canEditRegistry(selectedRegistry) && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(activeMainSection)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>แก้ไขข้อมูลส่วนนี้</span>
                      </button>
                    )}

                    {/* ปุ่มยื่นคำร้องขอความช่วยเหลือ */}
                    <button
                      type="button"
                      onClick={() => handleOpenAssistanceDialog(selectedRegistry)}
                      className="px-4 py-2 bg-[#0b2545] hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-xs flex items-center gap-1.5"
                    >
                      <FilePlus2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ยื่นคำร้องขอความช่วยเหลือ</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={editForm.editNotes || ''}
                      onChange={(e) => setEditForm({ ...editForm, editNotes: e.target.value })}
                      placeholder="ระบุเหตุผล/หมายเหตุการแก้ไข (เช่น: ปรับปรุงพิกัดบ้านจริงจากการลงพื้นที่, อัปเดตรายได้)..."
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
                <h3 className="font-bold text-sm">ปรับสถานะทะเบียนผู้มีสิทธิ์รับซะกาต</h3>
                <button
                  onClick={() => setIsStatusDialogOpen(false)}
                  className="text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">ผู้มีสิทธิ์:</span>
                  <strong className="text-slate-900 block text-sm">{selectedRegistry.fullName}</strong>
                  <span className="text-[11px] font-mono text-slate-500">{selectedRegistry.registrationNo}</span>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">เลือกสถานะใหม่ (8 สถานะตามเกณฑ์):</label>
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
                    placeholder="ระบุเหตุผล เช่น ผ่านการลงพื้นที่สำรวจ, ตรวจสอบเอกสารครบถ้วนแล้ว..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                  <strong className="block">ข้อควรทราบ:</strong>
                  การเปลี่ยนสถานะทะเบียนจะถูกบันทึกลงใน Audit Trail พร้อมระบุผู้ดำเนินการ ({currentUser.name}) และวันเวลาโดยอัตโนมัติ และจะไม่กระทบกับคำร้องขอความช่วยเหลือเดิม
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

      {/* 6. Quick Assistance Request Creation Dialog */}
      {isAssistanceDialogOpen && selectedRegistry && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1010] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmittingAssistance) {
                setIsAssistanceDialogOpen(false);
              }
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
            >
              <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-sm">ยื่นคำร้องขอความช่วยเหลือใหม่</h3>
                  <p className="text-[11px] text-emerald-200">เชื่อมโยงกับทะเบียนผู้มีสิทธิ์: {selectedRegistry.registrationNo}</p>
                </div>
                <button
                  onClick={() => setIsAssistanceDialogOpen(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">ผู้มีสิทธิ์รับความช่วยเหลือ:</span>
                    <strong className="text-slate-900 block font-bold">{selectedRegistry.fullName}</strong>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-700">
                    {selectedRegistry.registrationNo}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">1. กลุ่มหลัก:</label>
                      <select
                        value={quickPrimaryCode}
                        onChange={(e) => {
                          const pCode = e.target.value;
                          setQuickPrimaryCode(pCode);
                          const pg = regHierarchyData.find((p) => p.asnafCode === pCode);
                          const sf = pg?.specificFunds?.[0];
                          const ast = sf?.assistanceTypes?.[0];
                          setQuickSpecificFundId(sf ? sf.id : '');
                          setQuickAssistanceTypeId(ast ? ast.id : '');
                          if (ast?.defaultMinAmount) setRequestedAmount(ast.defaultMinAmount);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                      >
                        {regHierarchyData.map((pg) => (
                          <option key={pg.asnafCode} value={pg.asnafCode}>
                            {pg.asnafName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">2. กองทุนเฉพาะ:</label>
                      <select
                        value={quickSpecificFundId}
                        onChange={(e) => {
                          const sfId = e.target.value;
                          setQuickSpecificFundId(sfId);
                          const sf = quickSpecificFunds.find((s: any) => s.id === sfId);
                          const ast = sf?.assistanceTypes?.[0];
                          setQuickAssistanceTypeId(ast ? ast.id : '');
                          if (ast?.defaultMinAmount) setRequestedAmount(ast.defaultMinAmount);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                      >
                        {quickSpecificFunds.map((sf: any) => (
                          <option key={sf.id} value={sf.id}>
                            [{sf.code}] {sf.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">3. ประเภทความช่วยเหลือ:</label>
                      <select
                        value={quickAssistanceTypeId}
                        onChange={(e) => {
                          const astId = e.target.value;
                          setQuickAssistanceTypeId(astId);
                          const ast = quickAssistanceTypes.find((a: any) => a.id === astId);
                          if (ast?.defaultMinAmount) setRequestedAmount(ast.defaultMinAmount);
                        }}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-xs"
                      >
                        {quickAssistanceTypes.map((ast: any) => (
                          <option key={ast.id} value={ast.id}>
                            {ast.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 block mb-1">ระดับความเร่งด่วน:</label>
                    <select
                      value={urgencyLevel}
                      onChange={(e) => setUrgencyLevel(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="normal">ปกติ (ตามรอบการพิจารณา)</option>
                      <option value="urgent">เร่งด่วน (มีผลกระทบต่อชีวิต)</option>
                      <option value="critical">วิกฤตฉุกเฉิน (ทันที)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">วงเงินที่ขอรับความช่วยเหลือ (บาท):</label>
                  <input
                    type="number"
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">รายละเอียดปัญหาและความจำเป็น *:</label>
                  <textarea
                    rows={3}
                    value={necessityDetails}
                    onChange={(e) => setNecessityDetails(e.target.value)}
                    placeholder="ระบุเหตุผลความจำเป็นในการขอรับความช่วยเหลือครั้งนี้..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-[11px]">
                  <strong className="block">ข้อกำหนดสำคัญ:</strong>
                  คำร้องนี้จะถูกสร้างขึ้นในระบบ <strong>"คำร้องขอความช่วยเหลือ"</strong> โดยแยกอิสระจากทะเบียนผู้มีสิทธิ์ และจะไม่ทำให้สถานะทะเบียนเปลี่ยนแปลงโดยอัตโนมัติ
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 text-xs shrink-0">
                <button
                  onClick={() => setIsAssistanceDialogOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-white rounded-xl font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmAssistanceRequest}
                  disabled={isSubmittingAssistance || !necessityDetails.trim()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isSubmittingAssistance ? 'กำลังส่งคำร้อง...' : 'ยืนยันยื่นคำร้อง'}
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
        beneficiaryName={historyTarget.name || selectedRegistry?.fullName || ''}
        registrationNo={historyTarget.regNo || selectedRegistry?.registrationNo || ''}
        historyList={historyList}
        isLoading={isLoadingHistory}
      />
      {/* 8. Printable Receipt & Disbursement Voucher Modal */}
      <ReceiptPreviewModal
        isOpen={Boolean(selectedAidForReceipt)}
        onClose={() => setSelectedAidForReceipt(null)}
        application={selectedAidForReceipt}
        beneficiaryName={selectedRegistry?.fullName}
        registrationNo={selectedRegistry?.registrationNo}
      />

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

    </div>
  );
}
