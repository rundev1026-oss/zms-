'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FileText,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  Phone,
  Shield,
  Layers,
  Clock,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  HelpCircle,
  Eye,
  FileCheck,
  Building,
} from 'lucide-react';
import { ModalPortal, lockBodyScroll, unlockBodyScroll } from '@/components/common/Modal';
import { DocumentUploader, UploadedDocumentItem } from '@/components/common/DocumentUploader';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { useApp } from '@/context/AppContext';
import {
  LEVEL_3_ASSISTANCE_FORMATS,
  getSupportedFormatsForType,
} from '@/lib/constants/asnafRelationshipCatalog';

export interface AssistanceRequestWizardModalProps {
  isOpen: boolean;
  beneficiaryId?: string;
  onClose: () => void;
  onSuccess?: (application: any) => void;
  onNavigate?: (view: string) => void;
  onOpenRequestDetail?: (applicationId: string, createdRaw?: any) => void;
}

// Default Asnaf 3-tier hierarchy fallback in case API is loading or unavailable
const DEFAULT_PRIMARY_GROUPS: any[] = [
  {
    asnafCode: 'faqir_miskin',
    asnafName: 'ฟากีร-มิสคีน (ผู้ยากไร้และผู้ยากจน)',
    allocatedAmount: 10000000,
    spentAmount: 0,
    remainingAmount: 10000000,
    recipientCount: 0,
    percentage: 50,
    description: 'ผู้มีรายได้ไม่เพียงพอต่อการยังชีพขั้นพื้นฐาน',
    specificFunds: [
      {
        id: 'fund-living',
        code: 'living',
        name: 'กองทุนปัจจัยยังชีพขั้นพื้นฐาน',
        description: 'ค่าอาหารและเครื่องอุปโภคบริโภคจำเป็นต่อการดำรงชีวิต',
        budgetCap: 15000,
        currentSpent: 0,
        assistanceTypes: [
          { id: 'type-living-monthly', code: 'living_monthly', name: 'ปัจจัยยังชีพรายเดือน', category: 'cash', group: 'core', isActive: true },
          { id: 'type-living-ration', code: 'living_ration', name: 'ถุงยังชีพ/อาหารแห้งจำเป็น', category: 'in_kind', group: 'core', isActive: true },
          { id: 'type-living-emergency', code: 'living_emergency', name: 'ช่วยเหลือฉุกเฉินเฉพาะหน้า', category: 'cash', group: 'specific', isActive: true },
        ],
      },
      {
        id: 'fund-housing',
        code: 'housing',
        name: 'กองทุนปรับปรุงและซ่อมแซมที่อยู่อาศัย',
        description: 'ซ่อมแซมหลังคา ผนัง ห้องน้ำเพื่อสุขอนามัยและความปลอดภัย',
        budgetCap: 50000,
        currentSpent: 0,
        assistanceTypes: [
          { id: 'type-house-repair', code: 'house_repair', name: 'ซ่อมแซมหลังคา/ผนังบ้าน', category: 'housing', group: 'core', isActive: true },
          { id: 'type-house-sanitation', code: 'house_sanitation', name: 'ปรับปรุงห้องน้ำเพื่อสุขอนามัย', category: 'housing', group: 'specific', isActive: true },
          { id: 'type-house-material', code: 'house_material', name: 'สนับสนุนวัสดุก่อสร้างซ่อมแซม', category: 'housing', group: 'specific', isActive: true },
        ],
      },
      {
        id: 'fund-medical',
        code: 'medical',
        name: 'กองทุนสุขภาวะและฟื้นฟูสุขภาพ',
        description: 'ช่วยเหลือค่าเดินทางรักษาพยาบาล อุปกรณ์การแพทย์จำเป็น',
        budgetCap: 25000,
        currentSpent: 0,
        assistanceTypes: [
          { id: 'type-med-travel', code: 'med_travel', name: 'ค่าพาหนะเดินทางไปรักษาพยาบาล', category: 'medical', group: 'core', isActive: true },
          { id: 'type-med-equip', code: 'med_equip', name: 'อุปกรณ์การแพทย์/กายอุปกรณ์จำเป็น', category: 'medical', group: 'specific', isActive: true },
          { id: 'type-med-care', code: 'med_care', name: 'เงินอุดหนุนดูแลผู้ป่วยติดเตียง', category: 'medical', group: 'specific', isActive: true },
        ],
      },
      {
        id: 'fund-education',
        code: 'education',
        name: 'กองทุนทุนการศึกษาและทักษะ',
        description: 'สนับสนุนทุนการศึกษาและอุปกรณ์การเรียนบุตรหลาน',
        budgetCap: 20000,
        currentSpent: 0,
        assistanceTypes: [
          { id: 'type-edu-scholarship', code: 'edu_scholarship', name: 'ทุนการศึกษาประจำภาคเรียน', category: 'education', group: 'core', isActive: true },
          { id: 'type-edu-supplies', code: 'edu_supplies', name: 'อุปกรณ์และชุดนักเรียน', category: 'education', group: 'core', isActive: true },
        ],
      },
      {
        id: 'fund-career',
        code: 'career',
        name: 'กองทุนส่งเสริมอาชีพสร้างรายได้',
        description: 'ทุนหมุนเวียนและอุปกรณ์เครื่องมือประกอบอาชีพ',
        budgetCap: 30000,
        currentSpent: 0,
        assistanceTypes: [
          { id: 'type-career-tools', code: 'career_tools', name: 'อุปกรณ์และเครื่องมือทำกิน', category: 'in_kind', group: 'core', isActive: true },
          { id: 'type-career-seed', code: 'career_seed', name: 'ทุนหมุนเวียนตั้งต้นอาชีพ', category: 'cash', group: 'specific', isActive: true },
        ],
      },
    ],
  },
  {
    asnafCode: 'gharimin',
    asnafName: 'ผู้มีหนี้สินล้นพ้นตัว (ฆอริมีน)',
    allocatedAmount: 3000000,
    spentAmount: 0,
    remainingAmount: 3000000,
    recipientCount: 0,
    percentage: 15,
    description: 'ผู้มีหนี้สินจำเป็นต่อการดำรงชีพและไม่สามารถชำระได้',
    specificFunds: [
      {
        id: 'fund-debt-relief',
        code: 'debt_relief',
        name: 'กองทุนปลดเปลื้องหนี้สินจำเป็นเพื่อการยังชีพ',
        description: 'ช่วยเหลือเจรจาและปลดเปลื้องหนี้สินจำเป็น',
        budgetCap: 40000,
        currentSpent: 0,
        assistanceTypes: [
          { id: 'type-debt-living', code: 'debt_living', name: 'ปลดหนี้สินเพื่อการยังชีพ', category: 'cash', group: 'core', isActive: true },
          { id: 'type-debt-med', code: 'debt_med', name: 'ปลดหนี้สินค่ารักษาพยาบาล', category: 'cash', group: 'specific', isActive: true },
        ],
      },
    ],
  },
  {
    asnafCode: 'ibn_sabil',
    asnafName: 'ผู้เดินทางที่ขาดแคลน (อิบนุสสะบีล)',
    allocatedAmount: 1000000,
    spentAmount: 0,
    remainingAmount: 1000000,
    recipientCount: 0,
    percentage: 5,
    description: 'ผู้เดินทางที่ตกทุกข์ได้ยากหรือขาดแคลนปัจจัยเดินทาง',
    specificFunds: [
      {
        id: 'fund-travel-emergency',
        code: 'travel_emergency',
        name: 'กองทุนช่วยเหลือผู้เดินทางตกทุกข์ได้ยาก',
        description: 'ค่าพาหนะเดินทางกลับภูมิลำเนาและค่าอาหารชั่วคราว',
        budgetCap: 10000,
        currentSpent: 0,
        assistanceTypes: [
          { id: 'type-travel-fare', code: 'travel_fare', name: 'ค่าพาหนะเดินทางกลับภูมิลำเนา', category: 'cash', group: 'core', isActive: true },
          { id: 'type-travel-shelter', code: 'travel_shelter', name: 'ค่าอาหารและที่พักชั่วคราวฉุกเฉิน', category: 'service', group: 'specific', isActive: true },
        ],
      },
    ],
  },
  {
    asnafCode: 'muallaf',
    asnafName: 'ผู้เข้ารับอิสลามใหม่ (มุอัลลัฟ)',
    allocatedAmount: 2000000,
    spentAmount: 0,
    remainingAmount: 2000000,
    recipientCount: 0,
    percentage: 10,
    description: 'ผู้เข้ารับอิสลามที่ต้องการการดูแลและตั้งหลักชีวิต',
    specificFunds: [
      {
        id: 'fund-muallaf-support',
        code: 'muallaf_support',
        name: 'กองทุนฟื้นฟูจิตใจและตั้งหลักชีวิตมุอัลลัฟ',
        description: 'ค่าครองชีพช่วงเปลี่ยนผ่านและทุนตั้งหลักชีวิต',
        budgetCap: 25000,
        currentSpent: 0,
        assistanceTypes: [
          { id: 'type-muallaf-living', code: 'muallaf_living', name: 'ค่าครองชีพเพื่อการตั้งหลักชีวิต', category: 'cash', group: 'core', isActive: true },
          { id: 'type-muallaf-housing', code: 'muallaf_housing', name: 'เงินช่วยเหลือที่พักอาศัยชั่วคราว', category: 'housing', group: 'specific', isActive: true },
        ],
      },
    ],
  },
  {
    asnafCode: 'fisabilillah',
    asnafName: 'ในหนทางของอัลลอฮ์ (ฟีสะบีลิลลาฮ์)',
    allocatedAmount: 4000000,
    spentAmount: 0,
    remainingAmount: 4000000,
    recipientCount: 0,
    percentage: 20,
    description: 'กิจกรรมสาธารณประโยชน์เพื่อสังคมและศาสนา',
    specificFunds: [
      {
        id: 'fund-community-welfare',
        code: 'community_welfare',
        name: 'กองทุนสาธารณประโยชน์และงานศาสนา',
        description: 'สนับสนุนโครงการชุมชนและศาสนาเพื่อผู้ยากไร้',
        budgetCap: 35000,
        currentSpent: 0,
        assistanceTypes: [
          { id: 'type-community-aid', code: 'community_aid', name: 'ช่วยเหลือชุมชนยากไร้ส่วนรวม', category: 'service', group: 'core', isActive: true },
        ],
      },
    ],
  },
];

// Helper mappings for clean Thai presentation (No English codes or identifiers shown)
function getCleanFormatTitle(fmt: any): string {
  if (!fmt) return '';
  const code = String(fmt.code || '').toLowerCase();
  if (code.includes('bank_transfer') || code.includes('transfer')) return 'โอนเงินเข้าบัญชี';
  if (code.includes('cash')) return 'เงินสด';
  if (code.includes('in_kind') || code.includes('kind')) return 'มอบสิ่งของ';
  if (code.includes('materials') || code.includes('material')) return 'จัดซื้อวัสดุ';
  if (code.includes('vendor_direct') || code.includes('vendor')) return 'จ่ายให้ผู้ให้บริการโดยตรง';
  if (code.includes('contractor')) return 'จ้างผู้รับเหมา';
  if (code.includes('scholarship')) return 'ทุนการศึกษา';
  if (code.includes('career_equipment') || code.includes('career')) return 'สนับสนุนอุปกรณ์ประกอบอาชีพ';
  if (code.includes('training')) return 'จัดฝึกอบรม';
  return fmt.name || 'โอนเงินเข้าบัญชี';
}

function getCleanFormatDescription(fmt: any): string {
  if (!fmt) return '';
  const code = String(fmt.code || '').toLowerCase();
  if (code.includes('bank_transfer') || code.includes('transfer')) return 'โอนเงินเข้าบัญชีเงินฝากธนาคารของผู้มีสิทธิ์โดยตรง';
  if (code.includes('cash')) return 'ส่งมอบเงินสดพร้อมหลักฐานใบสำคัญรับเงิน';
  if (code.includes('in_kind') || code.includes('kind')) return 'ส่งมอบเครื่องอุปโภคบริโภคหรือสิ่งของจำเป็น';
  if (code.includes('materials') || code.includes('material')) return 'จัดซื้อวัสดุเพื่อนำไปใช้งานตามความจำเป็น';
  if (code.includes('vendor_direct') || code.includes('vendor')) return 'ชำระค่าสินค้าหรือบริการแก่ผู้ให้บริการโดยตรง';
  if (code.includes('contractor')) return 'ชำระค่างวดงานตามสัญญาจ้างเหมา';
  if (code.includes('scholarship')) return 'ส่งมอบทุนการศึกษาแก่ผู้เรียนหรือสถานศึกษา';
  if (code.includes('career_equipment') || code.includes('career')) return 'จัดซื้อเครื่องมือและอุปกรณ์ประกอบอาชีพ';
  if (code.includes('training')) return 'สนับสนุนค่าใช้จ่ายในการฝึกอบรมทักษะ';
  return fmt.description || '';
}

function getCleanAsnafTitle(codeOrName: string): string {
  if (!codeOrName) return 'ฟากีร–มิสกิน';
  const raw = codeOrName.toLowerCase();
  if (raw.includes('faqir') || raw.includes('miskin') || raw.includes('ฟากีร') || raw.includes('มิสคีน') || raw.includes('ยากไร้')) return 'ฟากีร–มิสกิน';
  if (raw.includes('amil') || raw.includes('อามิล')) return 'อามิลีน';
  if (raw.includes('muallaf') || raw.includes('มุอัลลัฟ')) return 'มุอัลลัฟ';
  if (raw.includes('riqab') || raw.includes('humanitarian') || raw.includes('มนุษยธรรม')) return 'มนุษยธรรม';
  if (raw.includes('gharim') || raw.includes('หนี้สิน') || raw.includes('ฆอริมีน')) return 'ผู้มีหนี้สินล้นตัว';
  if (raw.includes('fisabilillah') || raw.includes('ฟีสะบีลิลลาฮ์')) return 'ฟีสะบีลิลลาฮ์';
  if (raw.includes('sabil') || raw.includes('ผู้เดินทาง') || raw.includes('อิบนุ')) return 'ผู้เดินทาง';
  return codeOrName;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `wiz-${crypto.randomUUID()}`;
  }
  return `wiz-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function AssistanceRequestWizardModal({
  isOpen,
  beneficiaryId,
  onClose,
  onSuccess,
  onNavigate,
  onOpenRequestDetail,
}: AssistanceRequestWizardModalProps) {
  const { authToken, showToast, refreshData } = useApp();

  // Step Management: 1: ประเภทความช่วยเหลือ, 2: รายละเอียดคำร้อง, 3: ตรวจสอบและยืนยันคำร้อง
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitLock, setSubmitLock] = useState<boolean>(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());

  // Beneficiary Profile State (Fetched automatically via beneficiaryId)
  const [beneficiary, setBeneficiary] = useState<any | null>(null);
  const [isLoadingBeneficiary, setIsLoadingBeneficiary] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 3-Tier Hierarchy State
  const [primaryGroups, setPrimaryGroups] = useState<any[]>(DEFAULT_PRIMARY_GROUPS);
  const [selectedPrimaryCode, setSelectedPrimaryCode] = useState<string>('faqir_miskin');
  const [selectedSpecificFundId, setSelectedSpecificFundId] = useState<string>('');
  const [selectedAssistanceTypeId, setSelectedAssistanceTypeId] = useState<string>('');
  const [asnafChangeNotice, setAsnafChangeNotice] = useState<string | null>(null);
  const prevAsnafRef = useRef<string>(selectedPrimaryCode);

  // Phase 6: Level 3 Assistance Delivery Format State
  const [selectedFormatCode, setSelectedFormatCode] = useState<string>('bank_transfer');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [selectedFormatName, setSelectedFormatName] = useState<string>('');
  const [formatChangeNotice, setFormatChangeNotice] = useState<string | null>(null);
  const prevAssistanceTypeRef = useRef<string>(selectedAssistanceTypeId);

  // Phase 8: Category-Specific Duplicate Prevention State
  const [duplicateCheck, setDuplicateCheck] = useState<any>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState<boolean>(false);

  // Step 1: Assistance Type Fields
  const [targetAssessmentId, setTargetAssessmentId] = useState<string>('');
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'high' | 'urgent'>('normal');

  // Step 2: Request Details Fields
  const [requestedAmount, setRequestedAmount] = useState<number>(8000);
  const [purpose, setPurpose] = useState<string>('');
  const [necessityDetails, setNecessityDetails] = useState<string>('');
  const [hardshipReasons, setHardshipReasons] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [appliedDate, setAppliedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Documents
  const [selectedExistingDocIds, setSelectedExistingDocIds] = useState<string[]>([]);
  const [applicationDocs, setApplicationDocs] = useState<UploadedDocumentItem[]>([]);

  // Step 3: Confirmation Dialog State
  const [showConfirmSubmitDialog, setShowConfirmSubmitDialog] = useState<boolean>(false);
  const [hasCertified, setHasCertified] = useState<boolean>(true);

  // Success State
  const [submittedApplication, setSubmittedApplication] = useState<{
    id: string;
    applicationNo: string;
    memberId?: string;
    beneficiaryName: string;
    status: string;
    amount: number;
    assistanceType: string;
  } | null>(null);

  // Lock body scroll cleanly while modal is open
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  // Load 3-Tier Hierarchy from backend
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch('/api/finance/allocations/asnaf?view=hierarchy&year=2569&activeOnly=true')
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        if (json.success && Array.isArray(json.data?.primaryGroups) && json.data.primaryGroups.length > 0) {
          setPrimaryGroups(json.data.primaryGroups);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Load Beneficiary Data automatically via beneficiaryId (NO National ID step required!)
  const loadBeneficiary = useCallback(
    async (id: string) => {
      if (!id) return;
      setIsLoadingBeneficiary(true);
      setFetchError(null);

      try {
        const token =
          authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token && token !== 'cookie-session') {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const payload: any = { beneficiaryId: id };
        if (isUuid || id.startsWith('ben-')) {
          payload.beneficiaryId = id;
        } else if (id.startsWith('MB-')) {
          payload.memberId = id;
        } else {
          payload.registrationNo = id;
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
          setBeneficiary(ben);

          // Phase 4: Pre-populate Asnaf matching verified beneficiary registry
          if (ben.eligibleAsnafs && ben.eligibleAsnafs.length > 0) {
            const primary = ben.eligibleAsnafs.find((a: any) => a.isPrimary) || ben.eligibleAsnafs[0];
            setSelectedPrimaryCode(primary.asnafCode);
          } else if (ben.asnafCategory) {
            const raw = String(ben.asnafCategory).toLowerCase();
            if (raw.includes('miskin') || raw.includes('faqir')) {
              setSelectedPrimaryCode('faqir_miskin');
            } else if (raw.includes('gharim')) {
              setSelectedPrimaryCode('gharimin');
            } else if (raw.includes('sabil') || raw.includes('travel')) {
              setSelectedPrimaryCode('ibnsabil');
            } else if (raw.includes('muallaf')) {
              setSelectedPrimaryCode('muallaf');
            } else {
              setSelectedPrimaryCode(ben.asnafCategory);
            }
          }

          // Auto-reference matching assessment in registration year (Optional)
          if (ben.matchingAssessment?.id) {
            setTargetAssessmentId(ben.matchingAssessment.id);
          } else {
            setTargetAssessmentId('');
          }

          // Pre-select existing documents
          if (Array.isArray(ben.registryDocuments) && ben.registryDocuments.length > 0) {
            setSelectedExistingDocIds(ben.registryDocuments.map((d: any) => d.id));
          }

          // Default hardship purpose preview
          setPurpose((prev) => prev || `ขอรับการสนับสนุนสำหรับครัวเรือน ${ben.fullName || ben.firstName}`);
          setNecessityDetails(
            (prev) =>
              prev ||
              `ขอรับการสนับสนุนสำหรับครัวเรือน ${ben.fullName || ben.firstName} เนื่องจากมีรายได้ไม่เพียงพอต่อค่าครองชีพขั้นพื้นฐาน`
          );
        } else {
          setFetchError(json.error || 'ไม่พบข้อมูลทะเบียนผู้มีสิทธิ์รับซะกาต หรือข้อมูลบุคคลไม่ถูกต้อง');
          setBeneficiary(null);
        }
      } catch (err: any) {
        setFetchError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลผู้มีสิทธิ์');
        setBeneficiary(null);
      } finally {
        setIsLoadingBeneficiary(false);
      }
    },
    [authToken]
  );

  // Trigger load when beneficiaryId changes or modal opens
  useEffect(() => {
    if (isOpen && beneficiaryId) {
      // Reset wizard flow
      setCurrentStep(1);
      setSubmittedApplication(null);
      setShowConfirmSubmitDialog(false);
      setIdempotencyKey(generateIdempotencyKey());
      loadBeneficiary(beneficiaryId);
    } else if (!isOpen) {
      setBeneficiary(null);
      setFetchError(null);
      setSubmittedApplication(null);
    }
  }, [isOpen, beneficiaryId, loadBeneficiary]);

  // Registration year from real database beneficiary profile
  const registrationYearBe = useMemo(() => {
    if (!beneficiary) return '2569';
    if (beneficiary.registrationYearBe) return String(beneficiary.registrationYearBe);
    if (beneficiary.createdAt) {
      const d = new Date(beneficiary.createdAt);
      return String(d.getFullYear() + 543);
    }
    const match = String(beneficiary.registryNumber || beneficiary.memberId || '').match(/\b(25\d{2}|20\d{2})\b/);
    if (match) {
      const y = parseInt(match[1], 10);
      return String(y > 2400 ? y : y + 543);
    }
    return '2569';
  }, [beneficiary]);

  // Find matching assessment in the registration year (Optional)
  const matchedAssessment = useMemo(() => {
    if (!beneficiary) return null;
    if (beneficiary.matchingAssessment) return beneficiary.matchingAssessment;

    const regYearBeNum = parseInt(registrationYearBe, 10);
    const regYearCeNum = regYearBeNum - 543;

    return (
      (beneficiary.assessments || []).find((a: any) => {
        const d = a.assessmentDate || a.assessedAt || a.createdAt;
        const asmDate = d ? new Date(d) : null;
        const asmCe = asmDate ? asmDate.getFullYear() : null;
        const asmBe = asmCe ? asmCe + 543 : null;
        const periodStr = String(a.assessmentPeriod || '');
        const numStr = String(a.assessmentNumber || '');
        return (
          asmCe === regYearCeNum ||
          asmBe === regYearBeNum ||
          periodStr.includes(String(regYearBeNum)) ||
          periodStr.includes(String(regYearCeNum)) ||
          numStr.includes(String(regYearCeNum)) ||
          numStr.includes(String(regYearBeNum))
        );
      }) || null
    );
  }, [beneficiary, registrationYearBe]);

  // Keep targetAssessmentId synchronized with matched assessment (or null/empty if none)
  useEffect(() => {
    if (matchedAssessment?.id) {
      setTargetAssessmentId(matchedAssessment.id);
    } else {
      setTargetAssessmentId('');
    }
  }, [matchedAssessment]);

  // Derived 3-tier selections
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
      availableSpecificFunds.find((sf: any) => sf.id === selectedSpecificFundId || sf.code === selectedSpecificFundId) ||
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
      availableAssistanceTypes.find(
        (at: any) => at.id === selectedAssistanceTypeId || at.code === selectedAssistanceTypeId
      ) ||
      availableAssistanceTypes[0] ||
      null,
    [availableAssistanceTypes, selectedAssistanceTypeId]
  );

  const availableAssistanceFormats = useMemo(() => {
    if (currentAssistanceType && Array.isArray((currentAssistanceType as any).supportedFormats) && (currentAssistanceType as any).supportedFormats.length > 0) {
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

  // Phase 5: Dynamic Assistance Type Synchronization & Asnaf Switch Validation
  useEffect(() => {
    if (availableSpecificFunds.length > 0) {
      if (!availableSpecificFunds.some((sf: any) => sf.id === selectedSpecificFundId || sf.code === selectedSpecificFundId)) {
        setSelectedSpecificFundId(availableSpecificFunds[0].id);
      }
    }
  }, [availableSpecificFunds, selectedSpecificFundId]);

  useEffect(() => {
    const isAsnafChanged = prevAsnafRef.current && prevAsnafRef.current !== selectedPrimaryCode;
    if (isAsnafChanged) {
      prevAsnafRef.current = selectedPrimaryCode;
      const isValidInNewAsnaf = availableAssistanceTypes.some(
        (at: any) => at.id === selectedAssistanceTypeId || at.code === selectedAssistanceTypeId
      );

      if (!isValidInNewAsnaf) {
        const fallbackType = availableAssistanceTypes[0];
        setSelectedAssistanceTypeId(fallbackType ? fallbackType.id : '');
        const asnafName = getCleanAsnafTitle(currentPrimaryGroup?.asnafName || selectedPrimaryCode);
        setAsnafChangeNotice(`เปลี่ยนหมวดอัสนัฟเป็น "${asnafName}": ระบบได้รีเซ็ตประเภทการช่วยเหลือให้สอดคล้องกับหมวดใหม่โดยอัตโนมัติ`);
      } else {
        setAsnafChangeNotice(null);
      }
    } else {
      prevAsnafRef.current = selectedPrimaryCode;
      if (availableAssistanceTypes.length > 0) {
        if (!availableAssistanceTypes.some((at: any) => at.id === selectedAssistanceTypeId || at.code === selectedAssistanceTypeId)) {
          setSelectedAssistanceTypeId(availableAssistanceTypes[0].id);
        }
      }
    }
  }, [availableAssistanceTypes, selectedAssistanceTypeId, selectedPrimaryCode, currentPrimaryGroup]);

  // Phase 6: Dynamic Assistance Format Synchronization & Type Switch Validation
  useEffect(() => {
    const isTypeChanged = prevAssistanceTypeRef.current && prevAssistanceTypeRef.current !== selectedAssistanceTypeId;
    if (isTypeChanged) {
      prevAssistanceTypeRef.current = selectedAssistanceTypeId;
      const isValidInNewType = availableAssistanceFormats.some(
        (fmt: any) => fmt.code === selectedFormatCode || fmt.id === selectedFormatId
      );

      if (!isValidInNewType) {
        const defaultFmt = availableAssistanceFormats.find((f: any) => f.isDefault) || availableAssistanceFormats[0];
        if (defaultFmt) {
          const defaultFmtTitle = getCleanFormatTitle(defaultFmt);
          setSelectedFormatCode(defaultFmt.code);
          setSelectedFormatId(defaultFmt.id);
          setSelectedFormatName(defaultFmtTitle);
          setFormatChangeNotice(`เปลี่ยนประเภทการช่วยเหลือ: ระบบได้รีเซ็ตรูปแบบการช่วยเหลือเป็น "${defaultFmtTitle}" โดยอัตโนมัติ`);
        } else {
          setSelectedFormatCode('');
          setSelectedFormatId('');
          setSelectedFormatName('');
        }
      } else {
        setFormatChangeNotice(null);
      }
    } else {
      prevAssistanceTypeRef.current = selectedAssistanceTypeId;
      if (availableAssistanceFormats.length > 0) {
        if (!availableAssistanceFormats.some((fmt: any) => fmt.code === selectedFormatCode || fmt.id === selectedFormatId)) {
          const defaultFmt = availableAssistanceFormats.find((f: any) => f.isDefault) || availableAssistanceFormats[0];
          if (defaultFmt) {
            const defaultFmtTitle = getCleanFormatTitle(defaultFmt);
            setSelectedFormatCode(defaultFmt.code);
            setSelectedFormatId(defaultFmt.id);
            setSelectedFormatName(defaultFmtTitle);
          }
        }
      }
    }
  }, [availableAssistanceFormats, selectedAssistanceTypeId, selectedFormatCode, selectedFormatId]);

  // Phase 8: Live Real-time Category Duplicate Check Effect
  useEffect(() => {
    const benId = beneficiary?.id;
    const natId = beneficiary?.nationalId;
    if ((!benId && !natId) || !selectedAssistanceTypeId) {
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
            assistanceTypeName: curType?.name,
            fiscalYear: '2569',
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
  }, [beneficiary?.id, beneficiary?.nationalId, selectedAssistanceTypeId, availableAssistanceTypes]);

  // Handle Close / Cancel
  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  // Step 1 Validation -> Next to Step 2
  const handleGoToStep2 = () => {
    if (!beneficiary) {
      showToast('ไม่พบข้อมูลผู้มีสิทธิ์รับซะกาต ไม่สามารถดำเนินการได้', 'error');
      return;
    }
    if (!selectedPrimaryCode || !currentSpecificFund || !currentAssistanceType) {
      showToast('กรุณาเลือกหมวดอัสนัฟ กองทุนเฉพาะ และประเภทความช่วยเหลือให้ครบถ้วน', 'info');
      return;
    }
    if (duplicateCheck && duplicateCheck.hasDuplicate) {
      showToast(duplicateCheck.message || 'ตรวจพบเงื่อนไขการขอรับความช่วยเหลือซ้ำซ้อนตามระเบียบ', 'error');
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 Validation -> Next to Step 3
  const handleGoToStep3 = () => {
    const amt = Number(requestedAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      showToast('กรุณาระบุจำนวนเงินที่ขอรับความช่วยเหลือมากกว่า 0 บาท', 'info');
      return;
    }
    if (!necessityDetails || necessityDetails.trim().length < 5) {
      showToast('กรุณากรอกรายละเอียดปัญหาและความจำเป็นอย่างน้อย 5 ตัวอักษร', 'info');
      return;
    }
    setCurrentStep(3);
  };

  // Submit / Draft Execution
  const executeSubmit = async (targetStatus: 'submitted' | 'draft') => {
    if (!beneficiary || isSubmitting || submitLock) return;

    setIsSubmitting(true);
    setSubmitLock(true);

    try {
      const token =
        authToken || (typeof window !== 'undefined' ? localStorage.getItem('zms_auth_token') : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token && token !== 'cookie-session') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        beneficiaryId: beneficiary.id,
        assessmentId: targetAssessmentId ? targetAssessmentId : undefined,
        asnafCategory: selectedPrimaryCode || beneficiary.asnafCategory || 'faqir_miskin',
        primaryGroupCode: selectedPrimaryCode,
        specificFundId: currentSpecificFund?.id,
        specificFundCode: currentSpecificFund?.code,
        specificFundName: currentSpecificFund?.name,
        assistanceType: currentAssistanceType?.name || 'ปัจจัยยังชีพ',
        assistanceTypeId: currentAssistanceType?.id,
        assistanceTypeDetails: currentAssistanceType?.name,
        assistanceGroup: currentAssistanceType?.group || 'core',
        assistanceFormatId: currentAssistanceFormat?.id || selectedFormatId || undefined,
        assistanceFormatCode: currentAssistanceFormat?.code || selectedFormatCode || undefined,
        assistanceFormatName: getCleanFormatTitle(currentAssistanceFormat) || currentAssistanceFormat?.name || selectedFormatName || undefined,
        deliveryMethod: currentAssistanceFormat?.deliveryMethod || undefined,
        requestedAmount: Number(requestedAmount) || 0,
        urgencyLevel,
        hardshipReasons: hardshipReasons?.trim() || purpose?.trim() || 'ขอรับความช่วยเหลือเนื่องจากรายได้ไม่เพียงพอต่อค่าครองชีพ',
        necessityDetails: necessityDetails?.trim(),
        additionalNotes: additionalNotes?.trim() || undefined,
        fiscalYear: '2569',
        status: targetStatus,
        idempotencyKey,
        documents: applicationDocs.map((doc) => ({
          name: doc.name,
          category: doc.category || 'other_doc',
          fileUrl: doc.fileUrl,
          mimeType: doc.mimeType || 'application/octet-stream',
          fileSize: Number(doc.fileSize || 0),
          isConfidential: true,
        })),
      };

      const res = await fetch('/api/assistance-requests', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      const app = json.application || json.data;
      if (res.ok && json.success && app) {
        const appNo = app.applicationNo || 'APP-2569-XXXXXX';
        const isDraft = targetStatus === 'draft';

        showToast(
          isDraft
            ? `บันทึกฉบับร่างเรียบร้อยแล้ว (เลขคำร้อง ${appNo})`
            : `ส่งคำร้องขอความช่วยเหลือเรียบร้อยแล้ว (เลขคำร้อง ${appNo})`,
          'success'
        );

        setSubmittedApplication({
          id: app.id,
          applicationNo: appNo,
          memberId: app.memberId || beneficiary.memberId,
          beneficiaryName: beneficiary.fullName || `${beneficiary.firstName} ${beneficiary.lastName}`,
          status: app.status || targetStatus,
          amount: Number(app.requestedAmount || requestedAmount),
          assistanceType: currentAssistanceType?.name || 'ปัจจัยยังชีพ',
        });

        // Trigger context refresh
        void refreshData();
        onSuccess?.(app);
      } else {
        const errMsg = json.error || json.message || 'เกิดข้อผิดพลาดในการบันทึกคำร้องขอความช่วยเหลือ';
        showToast(errMsg, 'error');
        setSubmitLock(false);
      }
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', 'error');
      setSubmitLock(false);
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmitDialog(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) {
            handleClose();
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/90 text-slate-800 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* ======================================================== */}
          {/* 1. Fixed Header with Dark Green & Navy Gradient         */}
          {/* ======================================================== */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-950 to-[#0b2545] text-white p-5 flex items-center justify-between border-b border-teal-800/40 select-none shrink-0 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>ยื่นคำร้องขอความช่วยเหลือ</span>
                </h2>
                <p className="text-xs md:text-sm text-teal-200/80 font-normal mt-0.5">
                  สำหรับผู้มีทะเบียนผู้มีสิทธิ์รับซะกาต
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="zms-action p-2 rounded-xl text-teal-200/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ======================================================== */}
          {/* 2. Fixed Stepper Bar: 3 Steps Only                       */}
          {/* ======================================================== */}
          {!submittedApplication && (
            <div className="bg-slate-50 border-b border-slate-200/90 px-6 py-3.5 shrink-0 select-none">
              <div className="max-w-2xl mx-auto flex items-center justify-between">
                {/* Step 1 */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      currentStep === 1
                        ? 'bg-[#0b2545] text-white ring-4 ring-sky-100 shadow-xs'
                        : currentStep > 1
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                  </div>
                  <span
                    className={`text-xs sm:text-sm ${
                      currentStep === 1
                        ? 'font-bold text-slate-900'
                        : currentStep > 1
                        ? 'font-semibold text-emerald-700'
                        : 'font-medium text-slate-400'
                    }`}
                  >
                    1. ข้อมูลการช่วยเหลือ {/* 1. ประเภทความช่วยเหลือ */}
                  </span>
                </div>

                {/* Connector 1-2 */}
                <div
                  className={`h-0.5 flex-1 mx-3 transition-colors ${
                    currentStep >= 2 ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />

                {/* Step 2 */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      currentStep === 2
                        ? 'bg-[#0b2545] text-white ring-4 ring-sky-100 shadow-xs'
                        : currentStep > 2
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
                  </div>
                  <span
                    className={`text-xs sm:text-sm ${
                      currentStep === 2
                        ? 'font-bold text-slate-900'
                        : currentStep > 2
                        ? 'font-semibold text-emerald-700'
                        : 'font-medium text-slate-400'
                    }`}
                  >
                    2. รายละเอียดคำร้อง
                  </span>
                </div>

                {/* Connector 2-3 */}
                <div
                  className={`h-0.5 flex-1 mx-3 transition-colors ${
                    currentStep === 3 ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />

                {/* Step 3 */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      currentStep === 3
                        ? 'bg-[#0b2545] text-white ring-4 ring-sky-100 shadow-xs'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    3
                  </div>
                  <span
                    className={`text-xs sm:text-sm ${
                      currentStep === 3 ? 'font-bold text-slate-900' : 'font-medium text-slate-400'
                    }`}
                  >
                    3. ตรวจสอบและยืนยัน
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. Scrollable Modal Body                                 */}
          {/* ======================================================== */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-white">
            {/* Loading Beneficiary */}
            {isLoadingBeneficiary && (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium">กำลังโหลดข้อมูลผู้มีสิทธิ์รับซะกาต...</p>
              </div>
            )}

            {/* Error loading Beneficiary */}
            {!isLoadingBeneficiary && fetchError && (
              <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">ไม่สามารถเปิดแบบฟอร์มคำร้องได้</h4>
                  <p className="text-xs text-rose-700 mt-1">{fetchError}</p>
                </div>
              </div>
            )}

            {/* Success Submission Screen */}
            {submittedApplication && (
              <div className="py-8 px-4 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {submittedApplication.status === 'draft'
                    ? 'บันทึกฉบับร่างคำร้องเรียบร้อยแล้ว'
                    : 'ส่งคำร้องขอความช่วยเหลือเรียบร้อยแล้ว'}
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  ระบบได้บันทึกคำร้องและเชื่อมโยงกับทะเบียนผู้มีสิทธิ์รับซะกาตโดยตรง
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 text-xs mb-6">
                  <div className="flex justify-between pb-2 border-b border-slate-200">
                    <span className="text-slate-500">เลขที่คำร้อง:</span>
                    <span className="font-mono font-bold text-teal-800 text-sm">
                      {submittedApplication.applicationNo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">รหัสสมาชิก:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {submittedApplication.memberId || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ผู้ขอรับความช่วยเหลือ:</span>
                    <span className="font-semibold text-slate-800">
                      {submittedApplication.beneficiaryName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ประเภทการช่วยเหลือ:</span>
                    <span className="font-semibold text-slate-800">
                      {submittedApplication.assistanceType}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-500">วงเงินที่ขอรับ:</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      ฿{submittedApplication.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition"
                  >
                    ปิดหน้าต่าง
                  </button>
                  {onNavigate && onOpenRequestDetail && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        onNavigate('assistance-requests');
                        onOpenRequestDetail(submittedApplication.id);
                      }}
                      className="zms-action px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-medium text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                     aria-label="ดูรายการคำร้อง" title="ดูรายการคำร้อง">
                      <span>ดูรายการคำร้อง</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Active Wizard Workflow */}
            {!isLoadingBeneficiary && !fetchError && !submittedApplication && beneficiary && (
              <>
                {/* ======================================================== */}
                {/* Auto-Loaded Beneficiary Card (Always Visible on Steps)   */}
                {/* ======================================================== */}
                {/* ส่วนที่ 1: ข้อมูลผู้มีสิทธิ์ */}
                <div className="bg-gradient-to-r from-teal-50/70 via-slate-50 to-sky-50/40 border border-teal-200/80 rounded-xl p-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                        {beneficiary.firstName ? beneficiary.firstName[0] : 'ซ'}
                      </div>
                      <div>
                        <div className="text-[11px] font-medium text-teal-700 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 inline text-teal-600" />
                          <span>ผู้รับความช่วยเหลือ</span>
                        </div>
                        <div className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                          <span>{beneficiary.fullName || `${beneficiary.firstName} ${beneficiary.lastName}`}</span>
                          <span className="text-xs font-normal text-slate-500 font-mono">
                            ({beneficiary.nationalIdMasked || beneficiary.nationalId})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-mono font-bold bg-white text-teal-800 border border-teal-200 rounded-lg shadow-2xs">
                        {beneficiary.memberId || beneficiary.registrationNo}
                      </span>
                      <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                        {beneficiary.registrationStatus || beneficiary.memberStatus || 'ผ่านการตรวจสอบ'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">อัสนัฟจากทะเบียน</span>
                      <span className="font-semibold text-slate-800">
                        {getCleanAsnafTitle(beneficiary.asnafNameTh || beneficiary.asnafCategory)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">เบอร์โทรศัพท์</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {beneficiary.phone || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">สมาชิกในครัวเรือน</span>
                      <span className="font-semibold text-slate-800">
                        {beneficiary.household?.memberCount || 1} คน
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">สถานะทะเบียน</span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-emerald-600 inline" /> มีสิทธิ์รับซะกาต
                      </span>
                    </div>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* STEP 1: ข้อมูลการช่วยเหลือ                               */}
                {/* ======================================================== */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
                      <Layers className="w-4 h-4 text-teal-700" />
                      <span>ข้อมูลการช่วยเหลือและกองทุนที่เกี่ยวข้อง</span>
                    </div>

                    {/* 3-Tier Dynamic Fund Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* อัสนัฟ */}
                      <div>
                        {/* ส่วนที่ 2: อัสนัฟจากทะเบียน */}
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          อัสนัฟ *
                        </label>
                        {beneficiary?.hasMultipleAsnafs && beneficiary.eligibleAsnafs?.length > 1 ? (
                          <SearchableSelect
                            options={beneficiary.eligibleAsnafs.map((g: any) => ({
                              value: g.asnafCode,
                              label: getCleanAsnafTitle(g.asnafNameTh || g.asnafCode),
                            }))}
                            value={selectedPrimaryCode}
                            onChange={(code) => setSelectedPrimaryCode(code)}
                            placeholder="เลือกอัสนัฟ..."
                          />
                        ) : beneficiary ? (
                          <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs font-semibold text-emerald-950 flex items-center justify-between min-h-[44px]">
                            <span>
                              {getCleanAsnafTitle(
                                beneficiary.asnafNameTh ||
                                beneficiary.eligibleAsnafs?.[0]?.asnafNameTh ||
                                currentPrimaryGroup?.asnafName ||
                                selectedPrimaryCode
                              )}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium">
                              จากทะเบียน
                            </span>
                          </div>
                        ) : (
                          <select
                            value={selectedPrimaryCode}
                            onChange={(e) => setSelectedPrimaryCode(e.target.value)}
                            className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white min-h-[44px]"
                          >
                            {primaryGroups.map((g) => (
                              <option key={g.asnafCode} value={g.asnafCode}>
                                {getCleanAsnafTitle(g.asnafName)}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* กองทุน */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          กองทุน *
                        </label>
                        <select
                          value={currentSpecificFund?.id || ''}
                          onChange={(e) => setSelectedSpecificFundId(e.target.value)}
                          className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white min-h-[44px] text-slate-800 font-medium"
                        >
                          {availableSpecificFunds.map((sf: any) => (
                            <option key={sf.id} value={sf.id}>
                              {sf.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* ประเภทการช่วยเหลือ */}
                      <div>
                        {/* ส่วนที่ 3: ประเภทความช่วยเหลือ */}
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          ประเภทการช่วยเหลือ *
                        </label>
                        <SearchableSelect
                          options={availableAssistanceTypes.map((at: any) => ({
                            value: at.id,
                            label: at.name,
                          }))}
                          value={currentAssistanceType?.id || selectedAssistanceTypeId}
                          onChange={(id) => setSelectedAssistanceTypeId(id)}
                          placeholder="เลือกประเภทการช่วยเหลือ..."
                        />
                      </div>
                    </div>

                    {/* Asnaf Switch Alert Banner */}
                    {asnafChangeNotice && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-2 shadow-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{asnafChangeNotice}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAsnafChangeNotice(null)}
                          className="text-amber-500 hover:text-amber-800 text-sm font-bold leading-none p-0.5"
                          title="ปิดข้อความแจ้งเตือน"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* รูปแบบการช่วยเหลือ */}
                    {availableAssistanceFormats.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        {/* ส่วนที่ 4: รูปแบบการช่วยเหลือ */}
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700">
                            รูปแบบการช่วยเหลือ *
                          </label>
                          <span className="text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 font-medium">
                            {availableAssistanceFormats.length} รูปแบบที่รองรับ
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {availableAssistanceFormats.map((fmt: any) => {
                            const isSelected = selectedFormatCode === fmt.code || selectedFormatId === fmt.id;
                            const titleTh = getCleanFormatTitle(fmt);
                            const descTh = getCleanFormatDescription(fmt);
                            return (
                              <button
                                key={fmt.id || fmt.code}
                                type="button"
                                onClick={() => {
                                  setSelectedFormatCode(fmt.code);
                                  setSelectedFormatId(fmt.id);
                                  setSelectedFormatName(titleTh);
                                  setFormatChangeNotice(null);
                                }}
                                className={`p-3 rounded-xl text-left border transition-all text-xs flex items-start gap-3 min-h-[58px] ${
                                  isSelected
                                    ? 'border-teal-600 bg-teal-50/80 ring-2 ring-teal-500/20 shadow-xs font-medium'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                                    isSelected
                                      ? 'border-teal-600 bg-teal-600'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <strong className={`block text-xs truncate ${isSelected ? 'text-teal-950 font-bold' : 'text-slate-900 font-semibold'}`}>
                                      {titleTh}
                                    </strong>
                                    {fmt.isDefault && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-medium shrink-0">
                                        แนะนำ
                                      </span>
                                    )}
                                  </div>
                                  {descTh && (
                                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                      {descTh}
                                    </p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Format Switch Alert Banner */}
                    {formatChangeNotice && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start justify-between gap-2 shadow-xs">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{formatChangeNotice}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormatChangeNotice(null)}
                          className="text-blue-500 hover:text-blue-800 text-sm font-bold leading-none p-0.5"
                          title="ปิดข้อความแจ้งเตือน"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* Category-Specific Duplicate Prevention Alert Banner */}
                    {duplicateCheck && duplicateCheck.hasDuplicate && (
                      <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 shadow-sm space-y-2.5 animate-in fade-in duration-200">
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
                        <p className="text-[11px] text-amber-700 italic">
                          * ระบบจำกัดการยื่นคำร้องตามเกณฑ์ธรรมาภิบาลเพื่อป้องกันการขอรับความช่วยเหลือซ้ำซ้อน
                        </p>
                      </div>
                    )}

                    {/* ระดับความเร่งด่วน */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        ระดับความเร่งด่วน *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <label
                          className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition min-h-[44px] ${
                            urgencyLevel === 'normal'
                              ? 'bg-teal-50/70 border-teal-500 text-teal-900 font-semibold shadow-2xs'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="urgency"
                            value="normal"
                            checked={urgencyLevel === 'normal'}
                            onChange={() => setUrgencyLevel('normal')}
                            className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-xs">ปกติ</span>
                        </label>

                        <label
                          className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition min-h-[44px] ${
                            urgencyLevel === 'high'
                              ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold shadow-2xs'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="urgency"
                            value="high"
                            checked={urgencyLevel === 'high'}
                            onChange={() => setUrgencyLevel('high')}
                            className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs">เร่งด่วน (ภายใน 7 วัน)</span>
                        </label>

                        <label
                          className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition min-h-[44px] ${
                            urgencyLevel === 'urgent'
                              ? 'bg-rose-50 border-rose-500 text-rose-900 font-semibold shadow-2xs'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="urgency"
                            value="urgent"
                            checked={urgencyLevel === 'urgent'}
                            onChange={() => setUrgencyLevel('urgent')}
                            className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-xs">ฉุกเฉิน (ทันที)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                        {/* ======================================================== */}
                {/* STEP 2: รายละเอียดคำร้อง                                */}
                {/* ======================================================== */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
                      <DollarSign className="w-4 h-4 text-teal-700" />
                      <span>กรอกจำนวนเงิน รายละเอียดความจำเป็น และเอกสารแนบ</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* วงเงินที่ขอรับ */}
                      <div>
                        {/* ส่วนที่ 6: วงเงินงบประมาณ */}
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          วงเงินที่ขอรับ (บาท) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                            ฿
                          </span>
                          <input
                            type="number"
                            min="1"
                            step="500"
                            value={requestedAmount || ''}
                            onChange={(e) => setRequestedAmount(Number(e.target.value))}
                            className="w-full text-base font-bold font-mono pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                            placeholder="ระบุจำนวนเงิน เช่น 8000"
                          />
                        </div>
                      </div>

                      {/* วันที่ยื่นคำร้อง */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          วันที่ยื่นคำร้อง *
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={appliedDate}
                            onChange={(e) => setAppliedDate(e.target.value)}
                            className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* วัตถุประสงค์ */}
                    <div>
                      {/* ส่วนที่ 5: วัตถุประสงค์ */}
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        วัตถุประสงค์ *
                      </label>
                      <input
                        type="text"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="เช่น ขอรับเงินอุดหนุนยังชีพสำหรับค่าอาหารและสิ่งจำเป็นในครัวเรือน"
                        className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                      />
                    </div>

                    {/* รายละเอียดความจำเป็น */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        รายละเอียดความจำเป็น *
                      </label>
                      <textarea
                        rows={3}
                        value={necessityDetails}
                        onChange={(e) => setNecessityDetails(e.target.value)}
                        placeholder="ระบุรายละเอียดสภาพปัญหาความเดือดร้อนและความจำเป็นเร่งด่วนที่ต้องได้รับความช่วยเหลือ..."
                        className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                      />
                    </div>

                    {/* เหตุผลเพิ่มเติม (ถ้ามี) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        เหตุผลเพิ่มเติม (ถ้ามี)
                      </label>
                      <textarea
                        rows={2}
                        value={hardshipReasons}
                        onChange={(e) => setHardshipReasons(e.target.value)}
                        placeholder="เช่น รายได้ครอบครัวไม่เพียงพอ มีภาระหนี้สิน หรือมีผู้ป่วยติดเตียง..."
                        className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                      />
                    </div>

                    {/* เอกสารประกอบคำร้อง */}
                    <div className="pt-2 border-t border-slate-200">
                      {/* ส่วนที่ 7: เอกสารประกอบคำร้อง */}
                      <h4 className="font-bold text-xs text-slate-800 mb-2 flex items-center gap-1.5">
                        <FolderOpen className="w-4 h-4 text-teal-700" />
                        <span>เอกสารประกอบคำร้อง</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Section A: เอกสารจากทะเบียนเดิม */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <div className="text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                            <span>เอกสารจากทะเบียนเดิม</span>
                            <span className="text-[10px] text-teal-700 font-semibold">
                              เลือก {selectedExistingDocIds.length} ฉบับ
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mb-2">
                            เลือกเอกสารที่ต้องการอ้างอิงจากทะเบียน
                          </p>

                          {beneficiary.registryDocuments && beneficiary.registryDocuments.length > 0 ? (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {beneficiary.registryDocuments.map((doc: any) => {
                                const isChecked = selectedExistingDocIds.includes(doc.id);
                                return (
                                  <label
                                    key={doc.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                                      isChecked
                                        ? 'bg-white border-teal-400 shadow-2xs'
                                        : 'bg-white/60 border-slate-200 text-slate-600'
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
                                      className="w-3.5 h-3.5 text-teal-600 rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate font-medium">{doc.name}</div>
                                      <div className="text-[10px] text-slate-400">
                                        {doc.category || 'เอกสารทะเบียน'}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 py-2 text-center">
                              ไม่มีเอกสารในทะเบียนเดิม
                            </p>
                          )}
                        </div>

                        {/* Section B: แนบเอกสารเพิ่มเติม */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <div className="text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                            <span>แนบเอกสารเพิ่มเติม</span>
                            <span className="text-[10px] text-slate-500">
                              {applicationDocs.length} ฉบับ
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mb-2">
                            เช่น ภาพถ่ายสภาพบ้าน ใบรับรองแพทย์ หรือใบเสร็จค่าใช้จ่าย
                          </p>

                          <DocumentUploader
                            entityType="assistance_request"
                            entityId={beneficiary.memberId || 'draft'}
                            existingDocuments={applicationDocs}
                            onDocumentsChange={setApplicationDocs}
                            maxFiles={6}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* STEP 3: ตรวจสอบและยืนยันคำร้อง                           */}
                {/* ======================================================== */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    {/* ส่วนที่ 8: สรุปก่อนส่งคำร้อง */}
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
                      <FileCheck className="w-4 h-4 text-teal-700" />
                      <span>ตรวจสอบและยืนยันคำร้อง</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Summary Card 1: ข้อมูลผู้ขอรับและประเภทการช่วยเหลือ */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
                        <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-2">
                          ข้อมูลผู้ขอรับและประเภทการช่วยเหลือ
                        </h4>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ผู้ขอรับความช่วยเหลือ:</span>
                          <span className="font-semibold text-slate-900">
                            {beneficiary.fullName || `${beneficiary.firstName} ${beneficiary.lastName}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">รหัสสมาชิก:</span>
                          <span className="font-mono font-bold text-teal-800">
                            {beneficiary.memberId || beneficiary.registrationNo}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">อัสนัฟ:</span>
                          <span className="font-medium text-slate-800">
                            {getCleanAsnafTitle(currentPrimaryGroup?.asnafName || selectedPrimaryCode)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">กองทุน:</span>
                          <span className="font-medium text-slate-800">
                            {currentSpecificFund?.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ประเภทการช่วยเหลือ:</span>
                          <span className="font-semibold text-teal-700">
                            {currentAssistanceType?.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">รูปแบบการช่วยเหลือ:</span>
                          <span className="font-semibold text-teal-800">
                            {getCleanFormatTitle(currentAssistanceFormat)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ระดับความเร่งด่วน:</span>
                          <span
                            className={`font-semibold ${
                              urgencyLevel === 'urgent'
                                ? 'text-rose-600'
                                : urgencyLevel === 'high'
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {urgencyLevel === 'urgent'
                              ? 'ฉุกเฉิน (ทันที)'
                              : urgencyLevel === 'high'
                              ? 'เร่งด่วน (ภายใน 7 วัน)'
                              : 'ปกติ'}
                          </span>
                        </div>
                      </div>

                      {/* Summary Card 2: วงเงินและรายละเอียดคำร้อง */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
                        <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-2">
                          วงเงินและรายละเอียดคำร้อง
                        </h4>
                        <div className="flex justify-between items-center py-1 bg-white px-3 rounded-lg border border-teal-200">
                          <span className="text-slate-600 font-semibold">วงเงินที่ขอรับ:</span>
                          <span className="text-base font-extrabold font-mono text-emerald-700">
                            ฿{Number(requestedAmount).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">วันที่ยื่นคำร้อง:</span>
                          <span className="font-mono text-slate-800">{appliedDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-0.5">วัตถุประสงค์:</span>
                          <p className="text-slate-800 bg-white p-2 rounded-lg border border-slate-200">
                            {purpose || '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-0.5">รายละเอียดความจำเป็น:</span>
                          <p className="text-slate-800 bg-white p-2 rounded-lg border border-slate-200 line-clamp-2">
                            {necessityDetails || '-'}
                          </p>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-slate-500">เอกสารประกอบ:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedExistingDocIds.length} ฉบับเดิม + {applicationDocs.length} ฉบับเพิ่มเติม
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notice Callout */}
                    <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-start gap-2.5">
                      <Shield className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                      <div>
                        <strong>หมายเหตุ:</strong> ระบบจะบันทึกคำร้องและส่งต่อให้เจ้าหน้าที่พิจารณาตามขั้นตอนต่อไป
                      </div>
                    </div>

                    {/* Certification Checkbox */}
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={hasCertified}
                        onChange={(e) => setHasCertified(e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-slate-700 font-medium">
                        ข้าพเจ้าขอรับรองว่าได้ตรวจสอบข้อมูลและความจำเป็นของผู้มีสิทธิ์รับซะกาตรายนี้แล้ว ข้อมูลและเอกสารทั้งหมดถูกต้องเป็นความจริง
                      </span>
                    </label>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ======================================================== */}
          {/* 4. Fixed Footer & Navigation Buttons                    */}
          {/* ======================================================== */}
          {!submittedApplication && beneficiary && !fetchError && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0 select-none">
              {/* Step 1 Footer */}
              {currentStep === 1 && (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-100 transition disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToStep2}
                    disabled={Boolean(duplicateCheck?.hasDuplicate)}
                    data-keep-label className="zms-action px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={duplicateCheck?.hasDuplicate ? duplicateCheck.message : undefined}
                   aria-label="ถัดไป">
                    <span>ถัดไป</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Step 2 Footer */}
              {currentStep === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    data-keep-label className="zms-action px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-100 transition flex items-center gap-1.5"
                   aria-label="ย้อนกลับ" title="ย้อนกลับ">
                    <ChevronLeft className="w-4 h-4" />
                    <span>ย้อนกลับ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToStep3}
                    data-keep-label className="zms-action px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
                   aria-label="ถัดไป" title="ถัดไป">
                    <span>ถัดไป</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Step 3 Footer */}
              {currentStep === 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    disabled={isSubmitting}
                    data-keep-label className="zms-action px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-100 transition flex items-center gap-1.5 disabled:opacity-50"
                   aria-label="ย้อนกลับ" title="ย้อนกลับ">
                    <ChevronLeft className="w-4 h-4" />
                    <span>ย้อนกลับ</span>
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => executeSubmit('draft')}
                      disabled={isSubmitting || !hasCertified}
                      className="px-4 py-2 rounded-xl border border-teal-300 bg-white text-teal-800 hover:bg-teal-50 font-semibold text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                      ) : null}
                      <span>บันทึกฉบับร่าง</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowConfirmSubmitDialog(true)}
                      disabled={isSubmitting || !hasCertified}
                      data-keep-label className="zms-action px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                     aria-label="ยืนยันส่งคำร้อง" title="ยืนยันส่งคำร้อง">
                      {isSubmitting ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>ยืนยันส่งคำร้อง</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* Confirmation Dialog before Final Submit                 */}
          {/* ======================================================== */}
          {showConfirmSubmitDialog && (
            <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 text-slate-800">
                <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-center text-slate-900 mb-1">
                  ยืนยันการส่งคำร้องขอความช่วยเหลือ
                </h4>
                <p className="text-xs text-center text-slate-500 mb-4">
                  กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนยืนยันการส่งคำร้อง
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs mb-5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ผู้ขอรับความช่วยเหลือ:</span>
                    <span className="font-semibold text-slate-800">
                      {beneficiary.fullName || `${beneficiary.firstName} ${beneficiary.lastName}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">รหัสสมาชิก:</span>
                    <span className="font-mono font-bold text-teal-800">{beneficiary.memberId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ประเภทการช่วยเหลือ:</span>
                    <span className="font-semibold text-slate-800">{currentAssistanceType?.name}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">วงเงินที่ขอรับ:</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      ฿{Number(requestedAmount).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowConfirmSubmitDialog(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                  >
                    แก้ไขข้อมูล
                  </button>
                  <button
                    type="button"
                    onClick={() => executeSubmit('submitted')}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                  >
                    {isSubmitting && (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <span>ยืนยันส่งคำร้อง</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
