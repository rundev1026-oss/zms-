'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PERSON_TITLE_OPTIONS, formatPersonName, splitPersonName } from '@zms/shared';
import { useApp } from '@/context/AppContext';
import {
  AsnafCategory,
  HouseholdMember,
  HousingType,
  MaritalStatus,
  LandTitleType,
  PastAssistanceRecord,
  HouseholdIncomeBreakdown,
  HouseholdExpenseBreakdown
} from '@/types';
import {
  UserPlus,
  ChevronRight,
  ChevronLeft,
  Check,
  Trash2,
  Plus,
  Upload,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building,
  Home,
  CheckSquare,
  Square,
  DollarSign,
  Users,
  AlertTriangle,
  Save,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Phone,
  Calendar,
  Lock,
  MapPin
} from 'lucide-react';
import { DocumentUploader, UploadedDocumentItem } from '@/components/common/DocumentUploader';
import { uploadPendingRegistryDocuments, type PendingRegistryFile } from '@/lib/registryDocuments';
import { GoogleMapsLocationPicker } from '@/components/common/GoogleMapsLocationPicker';
import { calculateAge, getTodayISODate, normalizeBirthDateToCE } from '@/utils/ageCalculator';
import { ThaiAddressFields } from '@/components/common/ThaiAddressFields';
import { validateAddress, isValidThaiNationalId } from '@/lib/thaiAddress';

interface MultiStepRegistrationViewProps {
  onNavigate: (view: string) => void;
  editAppId?: string;
}

export function MultiStepRegistrationView({ onNavigate, editAppId }: MultiStepRegistrationViewProps) {
  const { registerBeneficiaryProfile, updateBeneficiaryRegistry, createApplication, showToast, currentUser, funds, authToken } = useApp();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const submitLockRef = useRef(false);
  const [createdBeneficiaryId, setCreatedBeneficiaryId] = useState<string>(editAppId || '');
  const [formMode, setFormMode] = useState<'registry_only' | 'application'>('registry_only');
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocumentItem[]>([]);
  const pendingFilesRef = useRef<PendingRegistryFile[]>([]);
  const [savedDraftNotice, setSavedDraftNotice] = useState<{ savedAt: string; data: any } | null>(null);

  // ========================================================
  // ส่วน A: ข้อมูลส่วนบุคคลและที่อยู่อาศัย
  // ========================================================
  const [titlePrefix, setTitlePrefix] = useState<string>('นาย');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
  const [nationalId, setNationalId] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('1972-05-12');
  const [age, setAge] = useState<number>(54);
  const todayIso = useMemo(() => getTodayISODate(), []);
  const ageCalculation = useMemo(() => calculateAge(birthDate), [birthDate]);
  const [addressValidationStatus, setAddressValidationStatus] = useState<{ isValid: boolean; message?: string }>({ isValid: true });
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [nationality, setNationality] = useState<string>('ไทย');
  const [religion, setReligion] = useState<string>('อิสลาม');
  const [employmentStatus, setEmploymentStatus] = useState<string>('employed');
  const [occupation, setOccupation] = useState<string>('รับจ้างทั่วไป');
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('married');
  const [address, setAddress] = useState<string>('');
  const [province, setProvince] = useState<string>('กรุงเทพมหานคร');
  const [district, setDistrict] = useState<string>('หนองจอก');
  const [subdistrict, setSubdistrict] = useState<string>('คลองสิบ');
  const [postcode, setPostcode] = useState<string>('10530');
  const [community, setCommunity] = useState<string>('ชุมชนนูรุลยากีน');
  const [branchId, setBranchId] = useState<string>('br-hq');
  const [branchName, setBranchName] = useState<string>('สำนักงานใหญ่ กรุงเทพมหานคร');
  const [activeBranches, setActiveBranches] = useState<{ id: string; code: string; name: string }[]>([
    { id: 'br-hq', code: 'HQ-BKK', name: 'สำนักงานใหญ่ กรุงเทพมหานคร' },
  ]);

  useEffect(() => {
    fetch('/api/organization/structure?activeOnly=true')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.branches?.length > 0) {
          setActiveBranches(json.data.branches);
          const currentMatch = json.data.branches.find((b: any) => b.id === branchId) || json.data.branches[0];
          if (currentMatch) {
            setBranchId(currentMatch.id);
            setBranchName(currentMatch.name);
          }
        }
      })
      .catch((err) => console.error('Failed to load active branches:', err));
  }, []);
  const [housingType, setHousingType] = useState<HousingType>('own');
  const [housingCondition, setHousingCondition] = useState<string>('dilapidated');
  const [housingNotes, setHousingNotes] = useState<string>('บ้านไม้ชั้นเดียวยกพื้น หลังคาสังกะสีรั่ว ผุพัง');
  const [landTitleType, setLandTitleType] = useState<LandTitleType>('title_deed');
  const [landTitleNotes, setLandTitleNotes] = useState<string>('โฉนดที่ดินของตนเอง');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [residenceAddress, setResidenceAddress] = useState<string>('');
  const [placeName, setPlaceName] = useState<string>('');

  // ========================================================
  // ส่วน B: เหตุผลและสภาพปัจจุบัน
  // ========================================================
  const [poverty, setPoverty] = useState<boolean>(true);
  const [hasDebt, setHasDebt] = useState<boolean>(true);
  const [debtType, setDebtType] = useState<string>('หนี้สินจำเป็นในระบบ (ค่ายาและค่ารักษาพยาบาล)');
  const [debtAmount, setDebtAmount] = useState<number>(15000);
  const [unemployed, setUnemployed] = useState<boolean>(false);
  const [familyIssue, setFamilyIssue] = useState<boolean>(false);
  const [familyIssueDetails, setFamilyIssueDetails] = useState<string>('');
  const [hasDisability, setHasDisability] = useState<boolean>(false);
  const [disabilityDetails, setDisabilityDetails] = useState<string>('');
  const [hasIllness, setHasIllness] = useState<boolean>(true);
  const [illnessDetails, setIllnessDetails] = useState<string>('เบาหวานและความดันโลหิตสูง');
  const [otherHardship, setOtherHardship] = useState<boolean>(false);
  const [otherHardshipDetails, setOtherHardshipDetails] = useState<string>('');

  const [asnafCategory, setAsnafCategory] = useState<AsnafCategory>('miskin');
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'high' | 'urgent'>('high');

  // ========================================================
  // ส่วน C: ประเภทความช่วยเหลือ
  // ========================================================
  const [assistanceType, setAssistanceType] = useState<string>('cash');
  const [assistanceTypeDetails, setAssistanceTypeDetails] = useState<string>('เงินช่วยเหลือยังชีพรายเดือนและค่ารักษาพยาบาล');
  const [requestedAmount, setRequestedAmount] = useState<number>(18000);
  const [necessityDetails, setNecessityDetails] = useState<string>('เพื่อจัดซื้ออาหารยังชีพและยารักษาโรคประจำตัว');

  // ========================================================
  // ส่วน D: ประวัติการช่วยเหลือ
  // ========================================================
  const [hasPastAssistance, setHasPastAssistance] = useState<boolean>(false);
  const [pastAssistanceList, setPastAssistanceList] = useState<PastAssistanceRecord[]>([
    {
      id: 'past-1',
      hasReceived: true,
      agency: 'สำนักงานเขตหนองจอก (พม.)',
      assistanceType: 'ถุงยังชีพฉุกเฉินน้ำท่วม',
      amountOrItems: 'ถุงยังชีพ 1 ชุด',
      yearReceived: '2568',
    },
  ]);

  // ========================================================
  // ส่วน E: รายรับและรายจ่ายครัวเรือน (ต่อเดือน)
  // ========================================================
  const [incomeBreakdown, setIncomeBreakdown] = useState<HouseholdIncomeBreakdown>({
    salary: 4000,
    familySupport: 1500,
    agriculture: 0,
    trading: 0,
    assetIncome: 0,
    freelance: 500,
    welfare: 800,
    otherIncome: 0,
    otherIncomeNotes: '',
  });

  const [expenseBreakdown, setExpenseBreakdown] = useState<HouseholdExpenseBreakdown>({
    living: 4500,
    education: 1200,
    healthcare: 1500,
    utilities: 800,
    rent: 0,
    debtPayment: 1000,
    otherExpense: 300,
    otherExpenseNotes: '',
  });

  // Calculate Totals automatically
  const totalIncome = useMemo(() => {
    return (
      (incomeBreakdown.salary || 0) +
      (incomeBreakdown.familySupport || 0) +
      (incomeBreakdown.agriculture || 0) +
      (incomeBreakdown.trading || 0) +
      (incomeBreakdown.assetIncome || 0) +
      (incomeBreakdown.freelance || 0) +
      (incomeBreakdown.welfare || 0) +
      (incomeBreakdown.otherIncome || 0)
    );
  }, [incomeBreakdown]);

  const totalExpense = useMemo(() => {
    return (
      (expenseBreakdown.living || 0) +
      (expenseBreakdown.education || 0) +
      (expenseBreakdown.healthcare || 0) +
      (expenseBreakdown.utilities || 0) +
      (expenseBreakdown.rent || 0) +
      (expenseBreakdown.debtPayment || 0) +
      (expenseBreakdown.otherExpense || 0)
    );
  }, [expenseBreakdown]);

  const netIncome = useMemo(() => {
    return totalIncome - totalExpense;
  }, [totalIncome, totalExpense]);

  // ========================================================
  // ส่วน F: สมาชิกครอบครัว
  // ========================================================
  const [members, setMembers] = useState<HouseholdMember[]>([
    {
      id: 'm-1',
      fullName: 'นาง ซาเราะฮ์ สันติภาพ',
      relation: 'คู่สมรส',
      age: 48,
      educationStatus: 'มัธยมศึกษาตอนต้น',
      occupation: 'รับจ้างทั่วไป',
      monthlyIncome: 2500,
      healthStatus: 'chronically_ill',
      healthNotes: 'โรคหัวใจ',
    },
    {
      id: 'm-2',
      fullName: 'ด.ช. ฟะฮัด สันติภาพ',
      relation: 'บุตร',
      age: 12,
      educationStatus: 'กำลังศึกษาชั้น ป.6',
      occupation: 'นักเรียน',
      monthlyIncome: 0,
      healthStatus: 'healthy',
      healthNotes: 'ปกติ',
    },
  ]);

  // ========================================================
  // ส่วน G: สภาพครอบครัวโดยละเอียด
  // ========================================================
  const [familySituationSummary, setFamilySituationSummary] = useState<string>(
    'หัวหน้าครอบครัวประกอบอาชีพรับจ้างทั่วไป รายได้ไม่สม่ำเสมอ คู่สมรสมีภาวะเจ็บป่วยเรื้อรัง ต้องดูแลบุตรวัยเรียน'
  );
  const [urgentNeeds, setUrgentNeeds] = useState<string>(
    'ต้องการเงินช่วยเหลือยังชีพฉุกเฉินและค่ายารักษาโรคประจำตัว'
  );
  const [dependentBurdens, setDependentBurdens] = useState<string>(
    'มีบุตรวัยเรียน 1 คน และคู่สมรสเจ็บป่วยเรื้อรัง'
  );

  // ========================================================
  // ส่วน H: ผู้ประสานงานและผู้รับรอง
  // ========================================================
  const [coordName, setCoordName] = useState<string>('นาย ดาริส มานะ');
  const [coordPhone, setCoordPhone] = useState<string>('089-111-2233');
  const [coordOccupation, setCoordOccupation] = useState<string>('กรรมการชุมชน');
  const [coordAge, setCoordAge] = useState<number>(45);
  const [coordAddress, setCoordAddress] = useState<string>('ชุมชนนูรุลยากีน เขตหนองจอก');

  const [certifierType, setCertifierType] = useState<'imam' | 'village_head' | 'community_leader' | 'other'>('imam');
  const [certifierName, setCertifierName] = useState<string>('อิหม่าม มะมูด สุมาลี');
  const [certifierRole, setCertifierRole] = useState<string>('อิหม่ามประจำมัสยิดนูรุลยากีน');
  const [certifierPhone, setCertifierPhone] = useState<string>('081-444-5566');
  const [certifierOrg, setCertifierOrg] = useState<string>('มัสยิดนูรุลยากีน เขตหนองจอก');
  const [certifierComments, setCertifierComments] = useState<string>(
    'ขอรับรองว่าครอบครัวนี้เป็นผู้มีความประพฤติดี ประกอบศาสนกิจสม่ำเสมอ และมีความขัดสนเดือดร้อนตามหลักเกณฑ์ซะกาตจริง'
  );

  // ========================================================
  // ส่วน I: เอกสารแนบ
  // ========================================================
  const [hasIdCardDoc, setHasIdCardDoc] = useState<boolean>(false);
  const [hasHouseRegDoc, setHasHouseRegDoc] = useState<boolean>(false);
  const [hasFamilyPhotoDoc, setHasFamilyPhotoDoc] = useState<boolean>(false);
  const [hasHousingPhotoDoc, setHasHousingPhotoDoc] = useState<boolean>(false);
  const [hasLandDoc, setHasLandDoc] = useState<boolean>(false);
  const [hasMedicalCertDoc, setHasMedicalCertDoc] = useState<boolean>(false);

  // Auto-sync age integer with birthDate calculation
  useEffect(() => {
    if (ageCalculation.isValid) {
      setAge(ageCalculation.years);
    }
  }, [ageCalculation]);

  // Load existing beneficiary if editAppId is provided, or check local draft
  useEffect(() => {
    if (!editAppId) {
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('zms_draft_beneficiary');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.fullName || parsed.nationalId)) {
              setSavedDraftNotice({ savedAt: parsed.savedAt || '', data: parsed });
            }
          }
        } catch {}
      }
      return;
    }

    const loadData = async () => {
      try {
        const res = await fetch(`/api/registry/${editAppId}`);
        const json = await res.json();
        if (json.success && json.data) {
          applyBeneficiaryData(json.data);
        }
      } catch (err) {
        console.error('Failed to load beneficiary for editing:', err);
      }
    };
    loadData();
  }, [editAppId]);

  const applyBeneficiaryData = (b: any) => {
    const loadedName = splitPersonName(b);
    setTitlePrefix(loadedName.prefix);
    setFirstName(loadedName.firstName);
    setLastName(loadedName.lastName);
    if (b.nationalId) setNationalId(b.nationalId);
    if (b.birthDate) setBirthDate(b.birthDate);
    if (b.age) setAge(b.age);
    if (b.phone) setPhone(b.phone);
    if (b.email) setEmail(b.email);
    if (b.occupation) setOccupation(b.occupation);
    if (b.maritalStatus) setMaritalStatus(b.maritalStatus);
    if (b.employmentStatus) setEmploymentStatus(b.employmentStatus);
    if (b.nationality) setNationality(b.nationality);
    if (b.religion) setReligion(b.religion);
    if (b.gender) setGender(b.gender);
    if (b.address) setAddress(b.address);
    if (b.province) setProvince(b.province);
    if (b.district) setDistrict(b.district);
    if (b.subdistrict) setSubdistrict(b.subdistrict);
    if (b.postcode) setPostcode(b.postcode);
    if (b.community) setCommunity(b.community);
    if (b.latitude) setLatitude(Number(b.latitude));
    if (b.longitude) setLongitude(Number(b.longitude));
    if (b.residenceAddress) setResidenceAddress(b.residenceAddress);
    if (b.placeName) setPlaceName(b.placeName);
    if (b.housingType) setHousingType(b.housingType);
    if (b.housingCondition) setHousingCondition(b.housingCondition);
    if (b.housingNotes) setHousingNotes(b.housingNotes);
    if (b.landTitleType) setLandTitleType(b.landTitleType);
    if (b.landTitleNotes) setLandTitleNotes(b.landTitleNotes);
    if (b.asnafCategory) setAsnafCategory(b.asnafCategory);
    if (b.incomeBreakdown) setIncomeBreakdown(b.incomeBreakdown);
    if (b.expenseBreakdown) setExpenseBreakdown(b.expenseBreakdown);
    if (b.debtAmount !== undefined && b.debtAmount !== null) {
      setDebtAmount(Number(b.debtAmount));
      setHasDebt(Number(b.debtAmount) > 0);
    }
    if (b.debtType) setDebtType(b.debtType);
    else if (b.debtPurpose) setDebtType(b.debtPurpose);
    if (b.id || b.registryNumber || b.disabilityNotes !== undefined || b.hardshipReasons) {
      setHasDisability(Boolean(b.disabilityNotes || b.hardshipReasons?.disability));
      setDisabilityDetails(b.disabilityNotes || b.hardshipReasons?.disabilityDetails || '');
      setHasIllness(Boolean(b.illnessNotes || b.hardshipReasons?.illness));
      setIllnessDetails(b.illnessNotes || b.hardshipReasons?.illnessDetails || '');
      setOtherHardship(Boolean(b.livingLimitations || b.hardshipReasons?.other));
      setOtherHardshipDetails(b.livingLimitations || b.hardshipReasons?.otherDetails || '');
      if (b.hardshipReasons) {
        if (typeof b.hardshipReasons.poverty === 'boolean') setPoverty(b.hardshipReasons.poverty);
        if (typeof b.hardshipReasons.unemployed === 'boolean') setUnemployed(b.hardshipReasons.unemployed);
        if (typeof b.hardshipReasons.familyIssue === 'boolean') setFamilyIssue(b.hardshipReasons.familyIssue);
        setFamilyIssueDetails(b.hardshipReasons.familyIssueDetails || '');
      }
    }
    if (b.householdMembers && Array.isArray(b.householdMembers) && b.householdMembers.length > 0) {
      setMembers(b.householdMembers);
    }
    if (b.pastAssistance && Array.isArray(b.pastAssistance) && b.pastAssistance.length > 0) {
      setPastAssistanceList(b.pastAssistance);
      setHasPastAssistance(true);
    }
    if (b.familySituationSummary) setFamilySituationSummary(b.familySituationSummary);
    if (b.urgentNeeds) setUrgentNeeds(b.urgentNeeds);
    if (b.dependentBurdens) setDependentBurdens(b.dependentBurdens);
    if (b.coordinator) {
      setCoordName(b.coordinator.fullName || b.coordinator.coordName || '');
      setCoordPhone(b.coordinator.phone || b.coordinator.coordPhone || '');
      setCoordOccupation(b.coordinator.occupation || b.coordinator.coordOccupation || '');
      setCoordAge(b.coordinator.age || b.coordinator.coordAge || 45);
      setCoordAddress(b.coordinator.address || b.coordinator.coordAddress || '');
    }
    if (b.certifier) {
      setCertifierType(b.certifier.certifierType || 'imam');
      setCertifierName(b.certifier.fullName || b.certifier.certifierName || '');
      setCertifierRole(b.certifier.roleTitle || b.certifier.certifierRole || '');
      setCertifierPhone(b.certifier.phone || b.certifier.certifierPhone || '');
      setCertifierOrg(b.certifier.organization || b.certifier.certifierOrg || '');
      setCertifierComments(b.certifier.comments || b.certifier.certifierComments || '');
    }
    if (b.documents && Array.isArray(b.documents)) {
      setUploadedDocs(b.documents);
    }
  };

  const handleRestoreDraft = () => {
    if (savedDraftNotice?.data) {
      applyBeneficiaryData(savedDraftNotice.data);
      if (savedDraftNotice.data.currentStep) {
        setCurrentStep(savedDraftNotice.data.currentStep);
      }
      setSavedDraftNotice(null);
      showToast('กู้คืนข้อมูลแบบฟอร์มร่างสำเร็จ', 'success');
    }
  };

  const handleDismissDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zms_draft_beneficiary');
    }
    setSavedDraftNotice(null);
    showToast('ลบข้อมูลร่างเดิมแล้ว', 'info');
  };

  const saveDraftToStorage = () => {
    if (typeof window === 'undefined' || editAppId) return;
    try {
      const draftData = {
        titlePrefix, firstName, lastName, fullName, nationalId, birthDate, age, phone, email, occupation, maritalStatus,
        employmentStatus, nationality, religion, gender,
        address, province, district, subdistrict, postcode, community, branchId, branchName,
        housingType, housingCondition, housingNotes, landTitleType, landTitleNotes,
        latitude, longitude, residenceAddress, placeName,
        poverty, hasDebt, debtType, debtAmount, unemployed, familyIssue, familyIssueDetails,
        hasDisability, disabilityDetails, hasIllness, illnessDetails, otherHardship, otherHardshipDetails,
        asnafCategory, urgencyLevel,
        assistanceType, assistanceTypeDetails, requestedAmount, necessityDetails,
        hasPastAssistance, pastAssistanceList,
        incomeBreakdown, expenseBreakdown,
        members, familySituationSummary, urgentNeeds, dependentBurdens,
        coordName, coordPhone, coordOccupation, coordAge, coordAddress,
        certifierType, certifierName, certifierRole, certifierPhone, certifierOrg, certifierComments,
        uploadedDocs, currentStep,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('zms_draft_beneficiary', JSON.stringify(draftData));
    } catch {}
  };

  // Helpers for Dynamic Lists
  const addMember = () => {
    setMembers([
      ...members,
      {
        id: `m-${Date.now()}`,
        fullName: '',
        relation: 'บุตร',
        age: 10,
        educationStatus: 'กำลังศึกษา',
        occupation: 'นักเรียน',
        monthlyIncome: 0,
        healthStatus: 'healthy',
        notes: '',
      },
    ]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, idx) => idx !== index));
  };

  const updateMember = (index: number, field: keyof HouseholdMember, value: any) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const addPastAssistance = () => {
    setPastAssistanceList([
      ...pastAssistanceList,
      {
        id: `past-${Date.now()}`,
        hasReceived: true,
        agency: '',
        assistanceType: '',
        amountOrItems: '',
        yearReceived: '2569',
      },
    ]);
  };

  const removePastAssistance = (index: number) => {
    setPastAssistanceList(pastAssistanceList.filter((_, idx) => idx !== index));
  };

  const updatePastAssistance = (index: number, field: keyof PastAssistanceRecord, value: any) => {
    const updated = [...pastAssistanceList];
    updated[index] = { ...updated[index], [field]: value };
    setPastAssistanceList(updated);
  };

  // Submit Handler
  const handleSubmit = async (submitStatus: 'draft' | 'submitted') => {
    if (submitLockRef.current || isSubmitting) {
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      showToast('กรุณาระบุชื่อและนามสกุลผู้ขอรับความช่วยเหลือ', 'error');
      setCurrentStep(1);
      return;
    }

    const cleanNationalId = (nationalId || '').replace(/[^0-9]/g, '');
    if (!cleanNationalId || cleanNationalId.length !== 13) {
      showToast('หมายเลขบัตรประชาชนต้องมี 13 หลัก', 'error');
      setCurrentStep(1);
      return;
    }
    if (!isValidThaiNationalId(cleanNationalId)) {
      showToast('หมายเลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลข 13 หลัก', 'error');
      setCurrentStep(1);
      return;
    }

    if (!phone || !phone.trim()) {
      showToast('กรุณาระบุเบอร์โทรศัพท์ติดต่อ', 'error');
      setCurrentStep(1);
      return;
    }

    if (!birthDate) {
      showToast('กรุณาระบุวันเดือนปีเกิดของผู้ขอรับความช่วยเหลือ', 'error');
      setCurrentStep(1);
      return;
    }

    if (!ageCalculation.isValid || ageCalculation.isFuture) {
      showToast(ageCalculation.error || 'วันเดือนปีเกิดไม่ถูกต้องหรืออยู่ในอนาคต', 'error');
      setCurrentStep(1);
      return;
    }

    if (!postcode || postcode.length !== 5) {
      showToast('กรุณาระบุรหัสไปรษณีย์ 5 หลัก', 'error');
      setCurrentStep(1);
      return;
    }

    if (!province || !district || !subdistrict) {
      showToast('กรุณาเลือกจังหวัด อำเภอ และตำบลให้ครบถ้วน', 'error');
      setCurrentStep(1);
      return;
    }

    const addrCheck = validateAddress(postcode, province, district, subdistrict);
    if (!addrCheck.isValid) {
      showToast(`ข้อมูลที่อยู่ไม่สัมพันธ์กัน: ${addrCheck.message}`, 'error');
      setCurrentStep(1);
      return;
    }

    if (!address || !address.trim()) {
      showToast('กรุณาระบุรายละเอียดที่อยู่ปัจจุบัน (บ้านเลขที่ หมู่ ซอย ถนน)', 'error');
      setCurrentStep(1);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const payload: any = {
        titlePrefix,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        nationalId: cleanNationalId,
        birthDate,
        age,
        phone,
        email,
        gender,
        nationality,
        religion,
        employmentStatus,
        occupation,
        maritalStatus,
        address,
        province,
        district,
        subdistrict,
        postcode,
        community,
        branchId,
        branchName,
        housingType,
        housingCondition,
        housingNotes,
        landTitleType,
        landTitleNotes,
        latitude,
        longitude,
        residenceAddress: residenceAddress || address,
        placeName,
        asnafCategory,
        monthlyIncome: totalIncome,
        monthlyExpense: totalExpense,
        incomeBreakdown,
        expenseBreakdown,
        householdMembers: members.filter((m) => (m.fullName || '').trim() !== ''),
        debtAmount: hasDebt ? debtAmount : 0,
        debtPurpose: hasDebt ? debtType : '',
        hardshipReasons: {
          poverty,
          debt: hasDebt,
          debtType: hasDebt ? debtType : undefined,
          debtAmount: hasDebt ? debtAmount : 0,
          unemployed,
          familyIssue,
          familyIssueDetails: familyIssue ? familyIssueDetails : undefined,
          disability: hasDisability,
          disabilityDetails: hasDisability ? disabilityDetails : undefined,
          illness: hasIllness,
          illnessDetails: hasIllness ? illnessDetails : undefined,
          other: otherHardship,
          otherDetails: otherHardship ? otherHardshipDetails : undefined,
        },
        disabilityNotes: hasDisability ? disabilityDetails : undefined,
        illnessNotes: hasIllness ? illnessDetails : undefined,
        livingLimitations: otherHardship ? otherHardshipDetails : undefined,
        pastAssistance: hasPastAssistance ? pastAssistanceList : [],
        familySituationSummary,
        urgentNeeds,
        dependentBurdens,
        coordinator: (coordName || '').trim()
          ? {
              fullName: coordName,
              phone: coordPhone,
              occupation: coordOccupation,
              age: coordAge,
              address: coordAddress,
            }
          : undefined,
        certifier: (certifierName || '').trim()
          ? {
              certifierType,
              fullName: certifierName,
              roleTitle: certifierRole,
              phone: certifierPhone,
              organization: certifierOrg,
              comments: certifierComments,
            }
          : undefined,
        registrationStatus: submitStatus === 'draft' ? 'draft' : 'pending_verification',
      };

      const attachPendingDocuments = async (beneficiaryId: string) => {
        const pending = pendingFilesRef.current;
        if (pending.length === 0) return;
        const result = await uploadPendingRegistryDocuments(beneficiaryId, pending, authToken || null);
        pendingFilesRef.current = [];
        if (result.failed.length > 0) {
          showToast(`บันทึกทะเบียนแล้ว แต่แนบเอกสารไม่สำเร็จ: ${result.failed.join(', ')}`, 'error');
        } else {
          showToast('บันทึกเอกสารแนบเรียบร้อยแล้ว', 'success');
        }
      };

      if (formMode === 'registry_only') {
        const existingId = editAppId || createdBeneficiaryId;
        if (existingId) {
          const ok = await updateBeneficiaryRegistry(existingId, payload, 'แก้ไขข้อมูลจากการขึ้นทะเบียน');
          if (ok) {
            await attachPendingDocuments(existingId);
            if (typeof window !== 'undefined') localStorage.removeItem('zms_draft_beneficiary');
            onNavigate('beneficiaries');
          }
        } else {
          const benId = await registerBeneficiaryProfile(payload);
          if (benId) {
            setCreatedBeneficiaryId(benId);
            await attachPendingDocuments(benId);
            if (typeof window !== 'undefined') localStorage.removeItem('zms_draft_beneficiary');
            onNavigate('beneficiaries');
          }
        }
      } else {
        const appId = await createApplication({
          titlePrefix,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName,
          nationalId: cleanNationalId,
          birthDate,
          age,
          phone,
          email,
          occupation,
          maritalStatus,
          address,
          province,
          district,
          subdistrict,
          postcode,
          community,
          branchId,
          branchName,
          housingType,
          housingCondition,
          housingNotes,
          landTitleType,
          landTitleNotes,

          // ส่วน B
          hardshipReasons: {
            poverty,
            debt: hasDebt,
            debtType: hasDebt ? debtType : undefined,
            debtAmount: hasDebt ? debtAmount : 0,
            unemployed,
            familyIssue,
            familyIssueDetails: familyIssue ? familyIssueDetails : undefined,
            disability: hasDisability,
            disabilityDetails: hasDisability ? disabilityDetails : undefined,
            illness: hasIllness,
            illnessDetails: hasIllness ? illnessDetails : undefined,
            other: otherHardship,
            otherDetails: otherHardship ? otherHardshipDetails : undefined,
          },
          asnafCategory,
          urgencyLevel,
          debtAmount: hasDebt ? debtAmount : 0,
          debtPurpose: hasDebt ? debtType : '',

          // ส่วน C
          assistanceType,
          assistanceTypeDetails,
          requestedAmount,
          necessityDetails,

          // ส่วน D
          pastAssistance: hasPastAssistance ? pastAssistanceList : [],

          // ส่วน E
          monthlyIncome: totalIncome,
          monthlyExpense: totalExpense,
          incomeBreakdown,
          expenseBreakdown,

          // ส่วน F
          householdMembers: members.filter((m) => (m.fullName || '').trim() !== ''),

          // ส่วน G
          familySituationSummary,
          urgentNeeds,
          dependentBurdens,

          // ส่วน H
          coordinator: (coordName || '').trim()
            ? {
              fullName: coordName,
              phone: coordPhone,
              occupation: coordOccupation,
              age: coordAge,
              address: coordAddress,
            }
            : undefined,
          certifier: (certifierName || '').trim()
            ? {
              certifierType,
              fullName: certifierName,
              roleTitle: certifierRole,
              phone: certifierPhone,
              organization: certifierOrg,
              comments: certifierComments,
            }
            : undefined,

          status: submitStatus,
        });

        if (appId) {
          onNavigate('assistance-requests');
        }
      }
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        showToast('กรุณาระบุชื่อและนามสกุลผู้ขอรับความช่วยเหลือ', 'error');
        return;
      }
      const cleanNationalId = (nationalId || '').replace(/[^0-9]/g, '');
      if (!cleanNationalId || cleanNationalId.length !== 13) {
        showToast('หมายเลขบัตรประชาชนต้องมี 13 หลัก', 'error');
        return;
      }
      if (!isValidThaiNationalId(cleanNationalId)) {
        showToast('หมายเลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลข 13 หลัก', 'error');
        return;
      }
      if (!phone || !phone.trim()) {
        showToast('กรุณาระบุเบอร์โทรศัพท์ติดต่อ', 'error');
        return;
      }
      if (!birthDate) {
        showToast('กรุณาระบุวันเดือนปีเกิด', 'error');
        return;
      }
      if (!ageCalculation.isValid || ageCalculation.isFuture) {
        showToast(ageCalculation.error || 'วันเดือนปีเกิดไม่ถูกต้องหรืออยู่ในอนาคต', 'error');
        return;
      }
      if (!postcode || postcode.length !== 5) {
        showToast('กรุณาระบุรหัสไปรษณีย์ 5 หลัก', 'error');
        return;
      }
      if (!province || !district || !subdistrict) {
        showToast('กรุณาเลือกจังหวัด อำเภอ และตำบลให้ครบถ้วน', 'error');
        return;
      }
      const addrCheck = validateAddress(postcode, province, district, subdistrict);
      if (!addrCheck.isValid) {
        showToast(`ข้อมูลที่อยู่ไม่สัมพันธ์กัน: ${addrCheck.message}`, 'error');
        return;
      }
      if (!address || !address.trim()) {
        showToast('กรุณาระบุรายละเอียดที่อยู่ปัจจุบัน (บ้านเลขที่ หมู่ ซอย ถนน)', 'error');
        return;
      }
    }
    saveDraftToStorage();
    setCurrentStep((s) => s + 1);
  };

  const steps = [
    { num: 1, title: 'ข้อมูลส่วนบุคคล & ที่อยู่' },
    { num: 2, title: 'สภาพปัญหา & ความช่วยเหลือ' },
    { num: 3, title: 'ประวัติ & รายรับ–รายจ่าย' },
    { num: 4, title: 'ครอบครัว & ความจำเป็น' },
    { num: 5, title: 'ผู้รับรอง & เอกสารแนบ' },
  ];

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto animate-fadeIn pb-16">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <UserPlus className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                แบบสำรวจขึ้นทะเบียนผู้มีสิทธิ์รับซะกาต {editAppId ? '(โหมดแก้ไขข้อมูลทะเบียน)' : ''}
              </h1>
              <p className="text-xs text-slate-500">
                มูลนิธิซะกาตและสาธารณกุศล • บันทึกข้อมูลคำร้องขอรับความช่วยเหลือตามหลักชะรีอะฮ์
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigate('beneficiaries')}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
        >
          ← กลับหน้ารายการ
        </button>
      </div>

      {/* Draft restoration banner */}
      {savedDraftNotice && !editAppId && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0">
              <Save className="w-5 h-5" />
            </span>
            <div>
              <p className="font-bold text-sm text-amber-950">พบข้อมูลฉบับร่างที่ยังกรอกไม่เสร็จในเครื่องนี้</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                ชื่อผู้มีสิทธิ์: <strong className="text-slate-800">{formatPersonName(savedDraftNotice.data) || 'ไม่ระบุชื่อ'}</strong> • เลขบัตร: {savedDraftNotice.data.nationalId || '-'} • บันทึกเมื่อ: {savedDraftNotice.savedAt ? new Date(savedDraftNotice.savedAt).toLocaleString('th-TH') : 'ไม่ระบุ'}
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

      {/* Steps Stepper Bar (Mobile Responsive for iPhone 15) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-none">
          {steps.map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setCurrentStep(s.num)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] ${currentStep === s.num
                ? 'bg-emerald-700 text-white shadow-xs'
                : currentStep > s.num
                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === s.num
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

      {/* Main Multi-Step Form Container */}
      <form onSubmit={(e) => e.preventDefault()} className="bg-white p-5 sm:p-7 rounded-xl border border-slate-200/80 shadow-xs space-y-6">


        {/* ========================================================
            STEP 1: ส่วน A ข้อมูลส่วนบุคคลและที่อยู่อาศัย
           ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-emerald-700" /> ข้อมูลส่วนบุคคลและที่อยู่อาศัย
              </h2>
              <p className="text-xs text-slate-500">ข้อมูลพื้นฐานของผู้ยื่นขอรับความช่วยเหลือตามแบบสำรวจของมูลนิธิ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">คำนำหน้า</label>
                <select
                  value={titlePrefix}
                  onChange={(e) => setTitlePrefix(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">ไม่ระบุ</option>
                  {PERSON_TITLE_OPTIONS.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ชื่อ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="เช่น มารีแย"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">นามสกุล <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ลาเต๊ะ"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              {/* เลขประจำตัวประชาชน 13 หลัก */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">เลขประจำตัวประชาชน (13 หลัก) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  maxLength={17}
                  placeholder="x-xxxx-xxxxx-xx-x"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              {/* วันเดือนปีเกิด (Date Picker) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  วัน/เดือน/ปีเกิด <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  max={todayIso}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[44px] ${
                    !ageCalculation.isValid || ageCalculation.isFuture
                      ? 'border-rose-300 bg-rose-50/40 text-rose-900'
                      : 'border-slate-300'
                  }`}
                />
                {ageCalculation.isValid ? (
                  <p className="text-[11px] text-emerald-800 mt-1 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-700" />
                    <span>ปฏิทินไทย: {ageCalculation.buddhistDateFormatted}</span>
                  </p>
                ) : ageCalculation.isFuture ? (
                  <p className="text-[11px] text-rose-600 mt-1 font-bold">
                    ⚠️ {ageCalculation.error}
                  </p>
                ) : null}
              </div>

              {/* อายุ (คำนวณอัตโนมัติจากวันเดือนปีเกิด) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 block">
                    อายุ <span className="text-emerald-700 font-normal text-[11px]">(คำนวณอัตโนมัติ)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5 text-slate-400" /> คำนวณอัตโนมัติจากวันเดือนปีเกิด
                  </span>
                </div>
                <div className="w-full px-3.5 py-2.5 bg-slate-100/90 border border-slate-200 rounded-xl flex items-center justify-between min-h-[44px]">
                  <span className="font-bold text-slate-800 text-sm">
                    {ageCalculation.isValid ? ageCalculation.displayText : '-'}
                  </span>
                  {ageCalculation.isValid && ageCalculation.isUnderOneYear && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      อายุต่ำกว่า 1 ปี
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  คำนวณอัตโนมัติจากวันเดือนปีเกิด • อ้างอิงวันที่ปัจจุบัน
                </p>
              </div>

              {/* หมายเลขโทรศัพท์ติดต่อ (แถวเดียวกันกับอาชีพและสถานภาพสมรส) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">หมายเลขโทรศัพท์ติดต่อ <span className="text-rose-500">*</span></label>
                <input
                  type="tel"
                  required
                  placeholder="08x-xxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium min-h-[44px]"
                />
              </div>

              {/* อาชีพปัจจุบัน (แถวเดียวกันกับโทรศัพท์และสถานภาพสมรส) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">อาชีพปัจจุบัน</label>
                <input
                  type="text"
                  placeholder="เช่น ค้าขาย, รับจ้างทั่วไป, ทำสวน"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                />
              </div>

              {/* สถานภาพสมรส (แถวเดียวกันกับโทรศัพท์และอาชีพ) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">สถานภาพสมรส</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                >
                  <option value="single">โสด</option>
                  <option value="married">สมรส</option>
                  <option value="divorced">หย่าร้าง</option>
                  <option value="widowed">หม้าย</option>
                  <option value="separated">แยกกันอยู่</option>
                </select>
              </div>

              {/* เพศ */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">เพศ</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                >
                  <option value="male">ชาย</option>
                  <option value="female">หญิง</option>
                </select>
              </div>

              {/* สถานะการทำงาน */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">สถานะการทำงาน</label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                >
                  <option value="employed">มีงานทำประจำ</option>
                  <option value="freelance">รับจ้างทั่วไป / อาชีพอิสระ</option>
                  <option value="unemployed">ว่างงาน / ตกงาน</option>
                  <option value="elderly">ผู้สูงอายุ / เกษียณ</option>
                  <option value="unable_to_work">ไม่สามารถทำงานได้ (ป่วย/พิการ)</option>
                </select>
              </div>

              {/* สัญชาติ */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">สัญชาติ</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="เช่น ไทย"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                />
              </div>

              {/* ศาสนา */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">ศาสนา</label>
                <select
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                >
                  <option value="อิสลาม">อิสลาม</option>
                  <option value="พุทธ">พุทธ</option>
                  <option value="คริสต์">คริสต์</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>

              {/* ที่อยู่และการค้นหาข้อมูลจากรหัสไปรษณีย์ */}
              <div className="col-span-full pt-2">
                <ThaiAddressFields
                  postcode={postcode}
                  province={province}
                  district={district}
                  subdistrict={subdistrict}
                  address={address}
                  community={community}
                  onChangePostcode={setPostcode}
                  onChangeProvince={setProvince}
                  onChangeDistrict={setDistrict}
                  onChangeSubdistrict={setSubdistrict}
                  onChangeAddress={setAddress}
                  onChangeCommunity={setCommunity}
                  onValidateStatus={setAddressValidationStatus}
                />
              </div>

              {/* สาขามูลนิธิที่รับผิดชอบ (แถวเดียวกันกับลักษณะที่อยู่อาศัยและเอกสารสิทธิ์ที่ดิน) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">สาขาผู้รับผิดชอบ (เฉพาะสาขาที่เปิดใช้งาน)</label>
                <select
                  value={branchId}
                  onChange={(e) => {
                    const selected = activeBranches.find((b) => b.id === e.target.value);
                    setBranchId(e.target.value);
                    setBranchName(selected ? selected.name : e.target.options[e.target.selectedIndex].text);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                >
                  {activeBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* ลักษณะที่อยู่อาศัย (แถวเดียวกันกับสาขาผู้รับผิดชอบและเอกสารสิทธิ์ที่ดิน) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">ลักษณะที่อยู่อาศัย</label>
                <select
                  value={housingType}
                  onChange={(e) => setHousingType(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                >
                  <option value="own">บ้านของตนเอง</option>
                  <option value="rent">บ้านเช่า</option>
                  <option value="relative">อาศัยกับญาติ</option>
                  <option value="other">บ้านผู้อื่น</option>
                </select>
              </div>

              {/* เอกสารสิทธิ์ที่ดิน (แถวเดียวกันกับสาขาผู้รับผิดชอบและลักษณะที่อยู่อาศัย) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">เอกสารสิทธิ์ที่ดิน (หากเกี่ยวข้องกับคำร้อง)</label>
                <select
                  value={landTitleType}
                  onChange={(e) => setLandTitleType(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]"
                >
                  <option value="title_deed">โฉนดที่ดิน (ครุฑแดง)</option>
                  <option value="ns3">น.ส.3 / น.ส.3 ก</option>
                  <option value="spk">ส.ป.ก.</option>
                  <option value="permission_granted">ที่ดินผู้อื่น (ได้รับอนุญาตให้ใช้ประโยชน์ถูกต้อง)</option>
                  <option value="public_land">ที่ดินสาธารณะ</option>
                  <option value="no_doc">ไม่มีเอกสารสิทธิ์</option>
                </select>
              </div>

              {/* ส่วนพิกัดที่อยู่อาศัยบน Google Maps */}
              <div className="col-span-full pt-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-emerald-700" />
                      <span>พิกัดที่อยู่อาศัยบน Google Maps (ไม่บังคับ - ระบุเพื่อความสะดวกในการลงพื้นที่สำรวจ)</span>
                    </h3>
                    <p className="text-xs text-slate-500">ค้นหาที่อยู่หรือคลิกเลื่อนหมุดบนแผนที่เพื่อระบุบ้านผู้มีสิทธิ์รับซะกาต</p>
                  </div>
                  {latitude && longitude && (
                    <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0 self-start sm:self-auto">
                      พิกัด: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 overflow-hidden">
                  <GoogleMapsLocationPicker
                    latitude={latitude}
                    longitude={longitude}
                    residenceAddress={residenceAddress || address}
                    placeName={placeName}
                    beneficiaryName={formatPersonName({ prefix: titlePrefix, firstName, lastName })}
                    onLocationChange={(loc) => {
                      setLatitude(loc.latitude);
                      setLongitude(loc.longitude);
                      setResidenceAddress(loc.residenceAddress);
                      setPlaceName(loc.placeName);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 2: ส่วน B เหตุผลและสภาพปัจจุบัน & ส่วน C ประเภทความช่วยเหลือ
           ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            {/* ส่วน B */}
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" /> เหตุผลและสภาพปัจจุบัน (เลือกได้หลายข้อ)
              </h2>
              <p className="text-xs text-slate-500">ติ๊กเลือกสาเหตุความเดือดร้อนและความจำเป็นในการขอรับความช่วยเหลือ</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
                {/* 1. ยากจน */}
                <label className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={poverty}
                    onChange={(e) => setPoverty(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">ยากจนหรือรายได้น้อย ไม่พอยังชีพ</span>
                </label>

                {/* 2. หนี้สิน */}
                <label className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={hasDebt}
                    onChange={(e) => setHasDebt(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">มีหนี้สินจำเป็น (ฆอริมูน)</span>
                </label>

                {/* 3. ตกงาน */}
                <label className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={unemployed}
                    onChange={(e) => setUnemployed(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">ตกงาน ไม่มีงานทำ หรือไม่มีอาชีพประจำ</span>
                </label>

                {/* 4. ปัญหาครอบครัว */}
                <label className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={familyIssue}
                    onChange={(e) => setFamilyIssue(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">ปัญหาครอบครัว / ถูกทอดทิ้ง / ม่าย</span>
                </label>

                {/* 5. ความพิการ */}
                <label className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={hasDisability}
                    onChange={(e) => setHasDisability(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">มีความพิการ / ทุพพลภาพ</span>
                </label>

                {/* 6. การเจ็บป่วย */}
                <label className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={hasIllness}
                    onChange={(e) => setHasIllness(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">การเจ็บป่วยเรื้อรัง / ติดเตียง</span>
                </label>
              </div>

              {/* Debt Details if checked */}
              {hasDebt && (
                <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">ประเภทหนี้สิน:</label>
                    <input
                      type="text"
                      value={debtType}
                      onChange={(e) => setDebtType(e.target.value)}
                      placeholder="เช่น หนี้นอกระบบ, หนี้ค่ายาจำเป็น..."
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-amber-900 block mb-1">จำนวนหนี้สินรวม (บาท):</label>
                    <input
                      type="number"
                      value={debtAmount}
                      onChange={(e) => setDebtAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ส่วน C: ประเภทความช่วยเหลือ */}

          </div>
        )}

        {/* ========================================================
            STEP 3: ส่วน D ประวัติ & ส่วน E รายรับ–รายจ่ายครัวเรือน
           ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            {/* ส่วน D */}
            <div className="border-b border-slate-200 pb-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-slate-900">
                  ประวัติการได้รับความช่วยเหลือในอดีต
                </h2>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="hasPast"
                      checked={!hasPastAssistance}
                      onChange={() => setHasPastAssistance(false)}
                      className="text-emerald-600"
                    />
                    ไม่เคยได้รับ
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="hasPast"
                      checked={hasPastAssistance}
                      onChange={() => setHasPastAssistance(true)}
                      className="text-emerald-600"
                    />
                    เคยได้รับ
                  </label>
                </div>
              </div>

              {hasPastAssistance && (
                <div className="space-y-3 mt-3">
                  <div className="space-y-2">
                    {pastAssistanceList.map((p, idx) => (
                      <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs items-center">
                        <div>
                          <label className="text-[10px] text-slate-400 block">หน่วยงานผู้ให้:</label>
                          <input
                            type="text"
                            value={p.agency}
                            onChange={(e) => updatePastAssistance(idx, 'agency', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">ประเภทความช่วยเหลือ:</label>
                          <input
                            type="text"
                            value={p.assistanceType}
                            onChange={(e) => updatePastAssistance(idx, 'assistanceType', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">จำนวนเงิน/สิ่งของ:</label>
                          <input
                            type="text"
                            value={p.amountOrItems}
                            onChange={(e) => updatePastAssistance(idx, 'amountOrItems', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-400 block">ปีที่ได้รับ (พ.ศ.):</label>
                            <input
                              type="text"
                              value={p.yearReceived}
                              onChange={(e) => updatePastAssistance(idx, 'yearReceived', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removePastAssistance(idx)}
                            className="mt-4 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addPastAssistance}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มประวัติการช่วยเหลือ
                  </button>
                </div>
              )}
            </div>

            {/* ส่วน E: รายรับและรายจ่ายครัวเรือน */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    รายรับและรายจ่ายครัวเรือนต่อเดือน
                  </h2>
                  <p className="text-xs text-slate-500">ระบบจะคำนวณรายรับ รายจ่าย และยอดสุทธิโดยอัตโนมัติ</p>
                </div>

                <div className={`px-3 py-1.5 rounded-2xl text-xs font-bold ${netIncome < 0 ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                  รายรับสุทธิ: ฿{netIncome.toLocaleString()} บาท/เดือน
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 8 รายการรับ */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="font-bold text-emerald-800 border-b border-slate-200 pb-1.5 flex justify-between">
                    <span>รายรับต่อเดือน (8 รายการ)</span>
                    <span className="font-extrabold">รวม: ฿{totalIncome.toLocaleString()}</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">1. ค่าจ้าง / เงินเดือน:</span>
                      <input
                        type="number"
                        value={incomeBreakdown.salary}
                        onChange={(e) => setIncomeBreakdown({ ...incomeBreakdown, salary: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">2. เงินจากสมาชิกครอบครัว:</span>
                      <input
                        type="number"
                        value={incomeBreakdown.familySupport}
                        onChange={(e) => setIncomeBreakdown({ ...incomeBreakdown, familySupport: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">3. ขายผลผลิตเกษตร:</span>
                      <input
                        type="number"
                        value={incomeBreakdown.agriculture}
                        onChange={(e) => setIncomeBreakdown({ ...incomeBreakdown, agriculture: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">4. การค้าขาย:</span>
                      <input
                        type="number"
                        value={incomeBreakdown.trading}
                        onChange={(e) => setIncomeBreakdown({ ...incomeBreakdown, trading: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">5. รายได้จากทรัพย์สิน/ค่าเช่า:</span>
                      <input
                        type="number"
                        value={incomeBreakdown.assetIncome}
                        onChange={(e) => setIncomeBreakdown({ ...incomeBreakdown, assetIncome: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">6. อาชีพส่วนตัว/อิสระ:</span>
                      <input
                        type="number"
                        value={incomeBreakdown.freelance}
                        onChange={(e) => setIncomeBreakdown({ ...incomeBreakdown, freelance: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">7. เงินสวัสดิการ/เบี้ยยังชีพ:</span>
                      <input
                        type="number"
                        value={incomeBreakdown.welfare}
                        onChange={(e) => setIncomeBreakdown({ ...incomeBreakdown, welfare: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">8. รายได้อื่น ๆ:</span>
                      <input
                        type="number"
                        value={incomeBreakdown.otherIncome}
                        onChange={(e) => setIncomeBreakdown({ ...incomeBreakdown, otherIncome: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 7 รายการจ่าย */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="font-bold text-rose-800 border-b border-slate-200 pb-1.5 flex justify-between">
                    <span>รายจ่ายต่อเดือน (7 รายการ)</span>
                    <span className="font-extrabold">รวม: ฿{totalExpense.toLocaleString()}</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">1. ค่าอุปโภคบริโภค:</span>
                      <input
                        type="number"
                        value={expenseBreakdown.living}
                        onChange={(e) => setExpenseBreakdown({ ...expenseBreakdown, living: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">2. ค่าใช้จ่ายการศึกษา:</span>
                      <input
                        type="number"
                        value={expenseBreakdown.education}
                        onChange={(e) => setExpenseBreakdown({ ...expenseBreakdown, education: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">3. ค่าใช้จ่ายสุขภาพ/ค่ายา:</span>
                      <input
                        type="number"
                        value={expenseBreakdown.healthcare}
                        onChange={(e) => setExpenseBreakdown({ ...expenseBreakdown, healthcare: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">4. ค่าน้ำและค่าไฟฟ้า:</span>
                      <input
                        type="number"
                        value={expenseBreakdown.utilities}
                        onChange={(e) => setExpenseBreakdown({ ...expenseBreakdown, utilities: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">5. ค่าเช่าบ้าน:</span>
                      <input
                        type="number"
                        value={expenseBreakdown.rent}
                        onChange={(e) => setExpenseBreakdown({ ...expenseBreakdown, rent: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">6. ชำระหนี้สิน:</span>
                      <input
                        type="number"
                        value={expenseBreakdown.debtPayment}
                        onChange={(e) => setExpenseBreakdown({ ...expenseBreakdown, debtPayment: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-600">7. รายจ่ายอื่น ๆ:</span>
                      <input
                        type="number"
                        value={expenseBreakdown.otherExpense}
                        onChange={(e) => setExpenseBreakdown({ ...expenseBreakdown, otherExpense: Number(e.target.value) })}
                        className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 4: ส่วน F สมาชิกครอบครัว & ส่วน G สภาพครอบครัวโดยละเอียด
           ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            {/* ส่วน F */}
            <div className="border-b border-slate-200 pb-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-700" />  สมาชิกในครัวเรือน ({members.length} คน)
                </h2>
                <button
                  type="button"
                  onClick={addMember}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มสมาชิก
                </button>
              </div>

              <div className="space-y-3 mt-3">
                {members.map((m, idx) => (
                  <div key={m.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs items-center">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block">ชื่อ–นามสกุล:</label>
                      <input
                        type="text"
                        placeholder="ชื่อ-สกุลสมาชิก"
                        value={m.fullName}
                        onChange={(e) => updateMember(idx, 'fullName', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block">ความสัมพันธ์:</label>
                      <select
                        value={m.relation}
                        onChange={(e) => updateMember(idx, 'relation', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="คู่สมรส">คู่สมรส</option>
                        <option value="บุตร">บุตร</option>
                        <option value="บิดา">บิดา</option>
                        <option value="มารดา">มารดา</option>
                        <option value="ญาติ">ญาติ</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block">อายุ (ปี):</label>
                      <input
                        type="number"
                        value={m.age}
                        onChange={(e) => updateMember(idx, 'age', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block">รายได้/เดือน:</label>
                      <input
                        type="number"
                        value={m.monthlyIncome}
                        onChange={(e) => updateMember(idx, 'monthlyIncome', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block">สุขภาพ:</label>
                        <select
                          value={m.healthStatus}
                          onChange={(e) => updateMember(idx, 'healthStatus', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                        >
                          <option value="healthy">ปกติ</option>
                          <option value="chronically_ill">ป่วยเรื้อรัง</option>
                          <option value="disabled">พิการ</option>
                          <option value="elderly">ผู้สูงอายุ</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeMember(idx)}
                        className="mt-3.5 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ส่วน G: สภาพครอบครัวโดยละเอียด */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                สภาพครอบครัวโดยละเอียด & ความจำเป็นเร่งด่วน
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">คำอธิบายสถานการณ์ครอบครัว:</label>
                  <textarea
                    rows={2}
                    value={familySituationSummary}
                    onChange={(e) => setFamilySituationSummary(e.target.value)}
                    placeholder="อธิบายสภาพความเป็นอยู่ ปัญหาอุปสรรคในการหารายได้..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ความจำเป็นเร่งด่วน:</label>
                  <input
                    type="text"
                    value={urgentNeeds}
                    onChange={(e) => setUrgentNeeds(e.target.value)}
                    placeholder="เช่น ค่ารักษาพยาบาลด่วน, ค่าซ่อมหลังคาที่รั่วพัง..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-rose-700 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">ภาระการดูแลเด็ก ผู้สูงอายุ หรือผู้มีข้อจำกัด:</label>
                  <input
                    type="text"
                    value={dependentBurdens}
                    onChange={(e) => setDependentBurdens(e.target.value)}
                    placeholder="ระบุจำนวนเด็กในวัยเรียน ผู้ป่วยติดเตียง หรือผู้พิการในครอบครัว..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 5: ส่วน H ผู้ประสานงานและผู้รับรอง & ส่วน I เอกสารแนบ
           ======================================================== */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fadeIn">
            {/* ส่วน H */}
            <div className="border-b border-slate-200 pb-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />  ผู้ประสานงานและผู้รับรอง
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* ผู้ประสานงาน */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                    ข้อมูลผู้ประสานงานในพื้นที่
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">ชื่อ-นามสกุล:</label>
                    <input
                      type="text"
                      value={coordName}
                      onChange={(e) => setCoordName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">เบอร์โทรศัพท์:</label>
                      <input
                        type="text"
                        value={coordPhone}
                        onChange={(e) => setCoordPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">อาชีพ/ตำแหน่ง:</label>
                      <input
                        type="text"
                        value={coordOccupation}
                        onChange={(e) => setCoordOccupation(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* ผู้รับรอง */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex justify-between">
                    <span>ผู้รับรอง (อิหม่าม / ผู้ใหญ่บ้าน / ผู้นำท้องถิ่น)</span>
                    <span className="text-emerald-700 font-bold">* สำคัญ</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">ประเภทผู้รับรอง:</label>
                      <select
                        value={certifierType}
                        onChange={(e) => setCertifierType(e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-medium"
                      >
                        <option value="imam">อิหม่าม / กรรมการมัสยิด</option>
                        <option value="village_head">ผู้ใหญ่บ้าน / กำนัน</option>
                        <option value="community_leader">ผู้นำชุมชนท้องถิ่น</option>
                        <option value="other">บุคคลน่าเชื่อถืออื่น</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">ชื่อ-นามสกุล:</label>
                      <input
                        type="text"
                        value={certifierName}
                        onChange={(e) => setCertifierName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">ตำแหน่ง / มัสยิด / หมู่บ้าน:</label>
                    <input
                      type="text"
                      value={certifierRole}
                      onChange={(e) => setCertifierRole(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">ความเห็นการรับรอง:</label>
                    <input
                      type="text"
                      value={certifierComments}
                      onChange={(e) => setCertifierComments(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg italic"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ส่วน I: เอกสารแนบ (Checklist อัปโหลด) */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />  เอกสารแนบประกอบคำร้อง (PDPA Compliant)
              </h2>

              <p className="text-xs text-slate-500">การติ๊กชื่อประเภทเอกสารไม่ใช่การแนบไฟล์ ให้เลือกไฟล์จริงในส่วนอัปโหลดด้านล่าง</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={hasIdCardDoc}
                      onChange={(e) => setHasIdCardDoc(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">สำเนาบัตรประชาชนผู้ขอรับ</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">จำเป็น</span>
                </label>

                <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={hasHouseRegDoc}
                      onChange={(e) => setHasHouseRegDoc(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">สำเนาทะเบียนบ้าน</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">จำเป็น</span>
                </label>

                <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={hasFamilyPhotoDoc}
                      onChange={(e) => setHasFamilyPhotoDoc(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">ภาพถ่ายครอบครัว</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">ถ้ามี</span>
                </label>

                <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={hasHousingPhotoDoc}
                      onChange={(e) => setHasHousingPhotoDoc(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">ภาพถ่ายที่อยู่อาศัย (ใน/นอก)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">ถ้ามี</span>
                </label>

                <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={hasMedicalCertDoc}
                      onChange={(e) => setHasMedicalCertDoc(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">ใบรับรองแพทย์ / ประวัติการรักษา</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">ถ้ามี</span>
                </label>

                <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={hasLandDoc}
                      onChange={(e) => setHasLandDoc(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">เอกสารสิทธิ์ที่ดิน (ถ้ามี)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">ตัวเลือก</span>
                </label>
              </div>

              {/* Direct S3 / Cloud Storage Real File Uploader */}
              <div className="pt-2">
                <DocumentUploader
                  entityType="beneficiary"
                  entityId={editAppId || createdBeneficiaryId || ''}
                  existingDocuments={uploadedDocs}
                  onDocumentsChange={setUploadedDocs}
                  onPendingFilesChange={(files) => {
                    pendingFilesRef.current = files;
                  }}
                />
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3">
                <Lock className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold block">การคุ้มครองข้อมูลส่วนบุคคล (PDPA Notice):</span>
                  ข้อมูลและเอกสารทั้งหมดจะถูกเข้ารหัสและจัดเก็บในฐานข้อมูลที่ปลอดภัย เข้าถึงได้เฉพาะเจ้าหน้าที่และคณะกรรมการพิจารณาซะกาตตามสิทธิ์ที่กำหนดเท่านั้น
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Stepper Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
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
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors min-h-[44px]"
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
                disabled={isSubmitting}
                onClick={() => handleSubmit('submitted')}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl text-xs font-bold transition-colors shadow-md min-h-[44px]"
              >
                <Check className="w-4 h-4" /> {isSubmitting ? 'กำลังส่งคำร้อง...' : 'ยื่นคำร้องขอรับความช่วยเหลือ'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
