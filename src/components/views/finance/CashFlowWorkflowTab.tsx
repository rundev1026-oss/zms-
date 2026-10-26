'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  User,
  BankAccount,
  CashFlowWorkflow,
  CashFlowWithdrawal,
  CashFlowDisbursementItem,
  CashMovementHistoryEntry,
  WorkflowAuditSummary,
  AdminExpenseCategory,
  PettyCashClearanceItem,
  VoucherHandoverSummary,
  FinanceHandoverRecord,
  HandoverStatus
} from '@/types';
import { ModalPortal } from '@/components/common/Modal';
import {
  RefreshCw,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Building2,
  Building,
  ShieldCheck,
  Sparkles,
  Coins,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Paperclip,
  Download,
  Trash2,
  Check,
  X,
  Search,
  Filter,
  Eye,
  FileCheck2,
  HelpCircle,
  FileSpreadsheet,
  Calendar,
  UserCheck,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Tag,
  AlertCircle,
  Lock,
  Edit2,
  Receipt,
  PlusCircle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface CashFlowWorkflowTabProps {
  currentUser: User;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onNavigate?: (view: string) => void;
  initialViewMode?: 'workflows' | 'history' | 'handovers';
}

// 11 Default Admin Expense Categories (TASK 6)
const DEFAULT_ADMIN_EXPENSE_CATEGORIES = [
  { code: 'STAFF_COMPENSATION', name: '1. ค่าตอบแทนเจ้าหน้าที่', group: 'บุคลากร' },
  { code: 'OFFICE_EXPENSES', name: '2. ค่าใช้จ่ายสำนักงาน', group: 'ดำเนินงาน' },
  { code: 'VEHICLE_FUEL', name: '3. ค่าน้ำมันรถ', group: 'ยานพาหนะ' },
  { code: 'VEHICLE_MAINTENANCE', name: '4. รถยนต์', group: 'ยานพาหนะ' },
  { code: 'INTERNET_TELECOM', name: '5. ค่าอินเทอร์เน็ต', group: 'สาธารณูปโภค' },
  { code: 'TRAVEL_EXPENSES', name: '6. ค่าเดินทาง', group: 'ดำเนินงาน' },
  { code: 'BOOKKEEPING_FEE', name: '7. ค่าทำบัญชี', group: 'วิชาชีพ' },
  { code: 'AUDIT_FEE', name: '8. ค่าตรวจสอบบัญชี', group: 'วิชาชีพ' },
  { code: 'MEALS_CATERING', name: '9. อาหาร', group: 'สวัสดิการ' },
  { code: 'ELECTRICITY_BILL', name: '10. ค่าไฟฟ้า', group: 'สาธารณูปโภค' },
  { code: 'OTHER_EXPENSES', name: '11. อื่น ๆ', group: 'ทั่วไป' },
];

export function CashFlowWorkflowTab({ currentUser, showToast, onNavigate, initialViewMode }: CashFlowWorkflowTabProps) {
  // Navigation View: 'workflows' | 'history' | 'handovers'
  const [viewMode, setViewMode] = useState<'workflows' | 'history' | 'handovers'>(initialViewMode || 'workflows');

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Core Data
  const [workflows, setWorkflows] = useState<CashFlowWorkflow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [historyEntries, setHistoryEntries] = useState<CashMovementHistoryEntry[]>([]);
  const [approvedApplications, setApprovedApplications] = useState<any[]>([]);

  // Handover Data (TASK 1: Finance Handover to Case Worker)
  const [handoverList, setHandoverList] = useState<VoucherHandoverSummary[]>([]);
  const [isLoadingHandovers, setIsLoadingHandovers] = useState<boolean>(false);
  const [handoverSearch, setHandoverSearch] = useState<string>('');
  const [handoverStatusFilter, setHandoverStatusFilter] = useState<string>('all');

  // Modal: Record Handover (TASK 1)
  const [showHandoverModal, setShowHandoverModal] = useState<VoucherHandoverSummary | null>(null);
  const [handoverDate, setHandoverDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [handoverTime, setHandoverTime] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [handedOverByName, setHandedOverByName] = useState<string>(currentUser.name || 'เจ้าหน้าที่ฝ่ายการเงิน');
  const [receivedByName, setReceivedByName] = useState<string>('');
  const [receivedByPosition, setReceivedByPosition] = useState<string>('ผู้ดูแลเคส / เจ้าหน้าที่ภาคสนาม');
  const [handoverAmount, setHandoverAmount] = useState<number>(0);
  const [handoverMethod, setHandoverMethod] = useState<string>('cash');
  const [handoverRefNo, setHandoverRefNo] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [handoverProof, setHandoverProof] = useState<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string } | null>(null);
  const [isHandoverConfirmed, setIsHandoverConfirmed] = useState<boolean>(false);

  // Modal: Handover History (TASK 1)
  const [showHandoverHistoryModal, setShowHandoverHistoryModal] = useState<VoucherHandoverSummary | null>(null);
  const [cancellingHandover, setCancellingHandover] = useState<FinanceHandoverRecord | null>(null);
  const [cancelHandoverReason, setCancelHandoverReason] = useState<string>('');

  // Expanded cards state
  const [expandedWorkflows, setExpandedWorkflows] = useState<Record<string, boolean>>({});

  // Filter States
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [workflowSearch, setWorkflowSearch] = useState<string>('');

  // History Filter States (TASK 4: Unified Disbursement History)
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>('all');
  const [historyPaymentTypeFilter, setHistoryPaymentTypeFilter] = useState<string>('all');
  const [historyAsnafFilter, setHistoryAsnafFilter] = useState<string>('all');
  const [historyAssistanceTypeFilter, setHistoryAssistanceTypeFilter] = useState<string>('all');
  const [historyOfficeCategoryFilter, setHistoryOfficeCategoryFilter] = useState<string>('all');
  const [historyPayeeFilter, setHistoryPayeeFilter] = useState<string>('');
  const [historyOperatorFilter, setHistoryOperatorFilter] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historyResponsibleFilter, setHistoryResponsibleFilter] = useState<string>('');
  const [historyVoucherFilter, setHistoryVoucherFilter] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<CashMovementHistoryEntry | null>(null);
  const [historyCurrentPage, setHistoryCurrentPage] = useState<number>(1);
  const [historyPageSize, setHistoryPageSize] = useState<number>(15);

  // Step 5 Audit Summary State
  const [auditSummary, setAuditSummary] = useState<WorkflowAuditSummary | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // Modals State
  // -------------------------------------------------------------------------
  // Modal: Step 1 (Bank Withdrawal)
  const [showStep1Modal, setShowStep1Modal] = useState<boolean>(false);
  const [step1Title, setStep1Title] = useState<string>('');
  const [step1BankAccountId, setStep1BankAccountId] = useState<string>('');
  const [step1WithdrawAmount, setStep1WithdrawAmount] = useState<number>(100000);
  const [step1EventDatetime, setStep1EventDatetime] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [step1RefNo, setStep1RefNo] = useState<string>(() => `WD-KBANK-${Date.now().toString().slice(-5)}`);
  const [step1OperatorName, setStep1OperatorName] = useState<string>(currentUser.name || 'เจ้าหน้าที่การเงิน');
  const [step1ApproverName, setStep1ApproverName] = useState<string>('อิหม่ามฟารุก อาลี');
  const [step1Notes, setStep1Notes] = useState<string>('เบิกเงินสดเพื่อเตรียมจัดสรรความช่วยเหลือและสำรองจ่ายสำนักงาน');
  const [step1Status, setStep1Status] = useState<'completed' | 'draft' | 'pending_approval'>('completed');
  const [step1FundType, setStep1FundType] = useState<string>('zakat');
  const [step1TransferRef, setStep1TransferRef] = useState<string>(() => `TR-2569-${Date.now().toString().slice(-5)}`);
  const [step1EventDate, setStep1EventDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [step1EventTime, setStep1EventTime] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [step1Proof, setStep1Proof] = useState<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string } | null>(null);

  // Modal: Step 2 (Deposit to Treasurer Ruslan Hasamae)
  const [showStep2Modal, setShowStep2Modal] = useState<CashFlowWorkflow | null>(null);
  const [step2HandoverAmount, setStep2HandoverAmount] = useState<number>(0);
  const [step2DepositAmount, setStep2DepositAmount] = useState<number>(0);
  const [step2HandoverDatetime, setStep2HandoverDatetime] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [step2ReceivedDatetime, setStep2ReceivedDatetime] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [step2RefNo, setStep2RefNo] = useState<string>('');
  const [step2HandoverPersonName, setStep2HandoverPersonName] = useState<string>('');
  const [step2TreasurerName, setStep2TreasurerName] = useState<string>('นายรุสลัน หะสาเมาะ'); // Default mandated by Section 1 Step 2
  const [step2AuditorName, setStep2AuditorName] = useState<string>('อิหม่ามฟารุก อาลี');
  const [step2MismatchReason, setStep2MismatchReason] = useState<string>('');
  const [step2MismatchApprovedByName, setStep2MismatchApprovedByName] = useState<string>('อิหม่ามฟารุก อาลี (ผู้อนุมัติ)');
  const [step2Notes, setStep2Notes] = useState<string>('นายรุสลัน หะสาเมาะ ได้รับมอบเงินสดเข้าตู้นิรภัยเรียบร้อย');
  const [step2StatusMode, setStep2StatusMode] = useState<'received' | 'draft'>('received');
  const [step2Proof, setStep2Proof] = useState<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string } | null>(null);

  // Modal: Step 3 & 4 (Cash Withdrawal Voucher - Aid Cash, Office Petty Cash, or Other Approved)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState<CashFlowWorkflow | null>(null);
  const [voucherType, setVoucherType] = useState<'aid_disbursement' | 'office_expense' | 'other_approved'>('aid_disbursement');
  const [otherApprovedAmount, setOtherApprovedAmount] = useState<number>(0);
  const [otherApprovalRef, setOtherApprovalRef] = useState<string>('');
  const [withdrawerName] = useState<string>('นายมุกลิส มีระยะ'); // Default mandated by Section 1 Step 3
  const [voucherNo, setVoucherNo] = useState<string>(() => `01/${new Date().getFullYear() + 543}`);
  const [isVoucherCustomized, setIsVoucherCustomized] = useState<boolean>(false);
  const [withdrawalDatetime, setWithdrawalDatetime] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [withdrawalPurpose, setWithdrawalPurpose] = useState<string>('');
  const [targetAsnaf, setTargetAsnaf] = useState<string>('faqir_miskin');
  const [targetFundId, setTargetFundId] = useState<string>('fund-1');
  const [approverName, setApproverName] = useState<string>('อิหม่ามฟารุก อาลี');
  const [voucherStatus, setVoucherStatus] = useState<'disbursed' | 'draft' | 'pending' | 'approved'>('disbursed');
  const [voucherSourceFundType, setVoucherSourceFundType] = useState<string>('zakat');
  const [voucherRequestedAmount, setVoucherRequestedAmount] = useState<number>(0);
  const [voucherApprovedAmount, setVoucherApprovedAmount] = useState<number>(0);
  const [withdrawalNotes, setWithdrawalNotes] = useState<string>('');
  const [withdrawalProof, setWithdrawalProof] = useState<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string } | null>(null);

  // Petty Cash Specific Fields (TASK 6)
  const [pettyExpenseCategory, setPettyExpenseCategory] = useState<string>('OFFICE_EXPENSES');
  const [pettyExpenseDetails, setPettyExpenseDetails] = useState<string>('');
  const [pettyRequestedAmount, setPettyRequestedAmount] = useState<number>(5000);
  const [pettyApprovedAmount, setPettyApprovedAmount] = useState<number>(5000);
  const [pettyActualReceivedAmount, setPettyActualReceivedAmount] = useState<number>(5000);
  const [pettyAllowedFundId, setPettyAllowedFundId] = useState<string>('amileen');
  const [pettyDeadlineDate, setPettyDeadlineDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  // Category Management State (TASK 6)
  const [categoryList, setCategoryList] = useState<AdminExpenseCategory[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [newCatCode, setNewCatCode] = useState<string>('');
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatGroup, setNewCatGroup] = useState<string>('ดำเนินงาน');
  const [newCatLimit, setNewCatLimit] = useState<number>(50000);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState<string>('');
  const [editCatLimit, setEditCatLimit] = useState<number>(0);

  const canManageCategories = ['super_admin', 'executive', 'finance', 'admin'].includes(currentUser.role);

  const activeCategories = useMemo(() => {
    if (categoryList.length > 0) {
      return categoryList.filter((c) => c.isActive !== false);
    }
    return DEFAULT_ADMIN_EXPENSE_CATEGORIES.map((c, i) => ({
      id: `aec-${i + 1}`,
      code: c.code,
      name: c.name,
      groupName: c.group,
      expenseGroup: c.group,
      isActive: true,
      budgetLimit: 50000,
      orderIndex: i + 1,
      displayOrder: i + 1,
    }));
  }, [categoryList]);

  // Aid Cash Specific Fields (Group A - Step 4 Table Rows)
  const [aidItems, setAidItems] = useState<{
    applicationId: string;
    applicationNo: string;
    registrationNo?: string;
    beneficiaryId: string;
    beneficiaryName: string;
    nationalId: string;
    asnafCategory: string;
    assistanceType: string;
    areaInfo: string;
    approvedAmount: number;
    disbursedAmountBefore: number;
    thisDisbursementAmount: number;
    remainingBalance: number;
    notes: string;
  }[]>([]);

  // Modal: Select from Approved Applications Picker (TASK 2 - 3 Groups)
  const [showApprovedPicker, setShowApprovedPicker] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerAsnaf, setPickerAsnaf] = useState<string>('all');
  const [pickerActiveGroup, setPickerActiveGroup] = useState<'ready' | 'in_progress'>('ready');
  const [categorizedApps, setCategorizedApps] = useState<{
    readyToDisburse: any[];
    inProgress: any[];
    summary: { totalReady: number; totalInProgress: number; totalReadyAmount: number };
  }>({ readyToDisburse: [], inProgress: [], summary: { totalReady: 0, totalInProgress: 0, totalReadyAmount: 0 } });
  const [selectedAppDetailModal, setSelectedAppDetailModal] = useState<any | null>(null);
  const [isValidatingSelection, setIsValidatingSelection] = useState<boolean>(false);

  // Modal: Clear Petty Cash Itemized State (TASK 6)
  const [showClearPettyModal, setShowClearPettyModal] = useState<{ workflow: CashFlowWorkflow; withdrawal: CashFlowWithdrawal } | null>(null);
  const [clearanceSpentAmount, setClearanceSpentAmount] = useState<number>(0);
  const [clearanceDate, setClearanceDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [clearanceReturnDate, setClearanceReturnDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [clearanceOverspentReason, setClearanceOverspentReason] = useState<string>('');
  const [clearanceOverspentApproved, setClearanceOverspentApproved] = useState<boolean>(false);
  const [clearanceItems, setClearanceItems] = useState<{
    id: string;
    expenseDate: string;
    description: string;
    amount: number;
    receiptUrl?: string;
    receiptName?: string;
    receiptSize?: number;
    receiptType?: string;
    categoryCode?: string;
    notes?: string;
  }[]>([]);
  const [clearanceNotes, setClearanceNotes] = useState<string>('ใช้จ่ายตามใบเสร็จแนบ เงินคงเหลือส่งคืนเหรัญญิก');
  const [clearanceProof, setClearanceProof] = useState<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string } | null>(null);

  // Modal: Step 5 (Audit & Close Workflow)
  const [showStep5Modal, setShowStep5Modal] = useState<CashFlowWorkflow | null>(null);
  const [step5ReconciledAmount, setStep5ReconciledAmount] = useState<number>(0);
  const [step5RemainingCash, setStep5RemainingCash] = useState<number>(0);
  const [step5EventDatetime, setStep5EventDatetime] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [step5AuditorName, setStep5AuditorName] = useState<string>(currentUser.name || 'ผู้ตรวจสอบบัญชี');
  const [step5Notes, setStep5Notes] = useState<string>('ตรวจสอบความถูกต้องของใบสำคัญและยอดเงินสด ส่งคืนเงินคงเหลือเรียบร้อย');
  const [step5Proof, setStep5Proof] = useState<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string } | null>(null);

  // Modal: Document / Attachment Preview Modal
  const [previewFile, setPreviewFile] = useState<{ fileName: string; fileUrl: string; mimeType: string } | null>(null);

  // -------------------------------------------------------------------------
  // Fetch Functions
  // -------------------------------------------------------------------------
  const fetchWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/finance/cash-flow');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setWorkflows(json.data);
        // Expand first workflow by default
        if (json.data.length > 0) {
          setExpandedWorkflows((prev) => ({ ...prev, [json.data[0].id]: true }));
        }
      }
    } catch (err: any) {
      showToast('ไม่สามารถดึงข้อมูลรอบการฝาก–เบิกเงินสดได้: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/bank-accounts');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBankAccounts(json.data);
        if (json.data.length > 0) {
          setStep1BankAccountId(json.data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load bank accounts:', err);
    }
  }, []);

  const fetchApprovedApps = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/cash-flow?categorized_apps=true');
      const json = await res.json();
      if (json.success && json.data) {
        setCategorizedApps(json.data);
        if (Array.isArray(json.data.readyToDisburse)) {
          setApprovedApplications(json.data.readyToDisburse);
        }
      }
    } catch (err: any) {
      console.error('Failed to load categorized applications:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/cash-flow?categories=true&includeInactive=true');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCategoryList(json.data);
      }
    } catch (err: any) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (historyPaymentTypeFilter !== 'all') params.set('paymentType', historyPaymentTypeFilter);
      if (historyCategoryFilter !== 'all') params.set('category', historyCategoryFilter);
      if (historyAsnafFilter !== 'all') params.set('asnaf', historyAsnafFilter);
      if (historyAssistanceTypeFilter !== 'all') params.set('assistanceType', historyAssistanceTypeFilter);
      if (historyOfficeCategoryFilter !== 'all') params.set('officeCategory', historyOfficeCategoryFilter);
      if (historyPayeeFilter.trim()) params.set('payee', historyPayeeFilter.trim());
      if (historyOperatorFilter.trim()) params.set('responsiblePerson', historyOperatorFilter.trim());
      else if (historyResponsibleFilter.trim()) params.set('responsiblePerson', historyResponsibleFilter.trim());
      if (historyStatusFilter !== 'all') params.set('status', historyStatusFilter);
      if (historyVoucherFilter.trim()) params.set('voucherNo', historyVoucherFilter.trim());
      if (historySearch.trim()) params.set('search', historySearch.trim());
      if (historyStartDate) params.set('startDate', historyStartDate);
      if (historyEndDate) params.set('endDate', historyEndDate);

      const res = await fetch(`/api/finance/cash-flow?history=true&${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setHistoryEntries(json.data);
      }
    } catch (err: any) {
      showToast('ไม่สามารถโหลดประวัติธุรกรรมได้: ' + err.message, 'error');
    }
  }, [
    historyPaymentTypeFilter,
    historyCategoryFilter,
    historyAsnafFilter,
    historyAssistanceTypeFilter,
    historyOfficeCategoryFilter,
    historyPayeeFilter,
    historyOperatorFilter,
    historyStatusFilter,
    historyResponsibleFilter,
    historyVoucherFilter,
    historySearch,
    historyStartDate,
    historyEndDate,
    showToast,
  ]);

  const canOperateHandover = ['super_admin', 'executive', 'finance', 'admin'].includes(currentUser.role);

  const fetchHandovers = useCallback(async () => {
    try {
      setIsLoadingHandovers(true);
      const params = new URLSearchParams();
      if (handoverSearch.trim()) params.set('search', handoverSearch.trim());
      if (handoverStatusFilter !== 'all') params.set('status', handoverStatusFilter);

      const res = await fetch(`/api/finance/handovers?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setHandoverList(json.data);
      }
    } catch (err: any) {
      console.error('Failed to load voucher handovers:', err);
      showToast('ไม่สามารถดึงข้อมูลรายการส่งมอบเงินได้: ' + err.message, 'error');
    } finally {
      setIsLoadingHandovers(false);
    }
  }, [handoverSearch, handoverStatusFilter, showToast]);

  useEffect(() => {
    fetchWorkflows();
    fetchBankAccounts();
    fetchApprovedApps();
    fetchCategories();
    fetchHandovers();
  }, [fetchWorkflows, fetchBankAccounts, fetchApprovedApps, fetchCategories, fetchHandovers]);

  useEffect(() => {
    if (viewMode === 'history') {
      fetchHistory();
    } else if (viewMode === 'handovers') {
      fetchHandovers();
    }
  }, [viewMode, fetchHistory, fetchHandovers]);

  // -------------------------------------------------------------------------
  // KPI Aggregations
  // -------------------------------------------------------------------------
  const kpiStats = useMemo(() => {
    let totalBankWithdrawn = 0;
    let totalTreasurerAvailable = 0;
    let totalAidConfirmed = 0;
    let totalPettyPending = 0;
    let totalCashReturned = 0;

    for (const wf of workflows) {
      totalBankWithdrawn += Number(wf.step1WithdrawAmount || 0);
      totalTreasurerAvailable += Number(wf.availableTreasurerCash || 0);
      totalCashReturned += Number(wf.step5RemainingCash || 0);

      const withdrawals = wf.withdrawals || [];
      for (const w of withdrawals) {
        if (w.voucherType === 'aid_disbursement') {
          if (w.status === 'completed' || w.status === 'disbursed') {
            totalAidConfirmed += Number(w.amount || 0);
          }
        } else if (w.voucherType === 'office_expense') {
          if (w.clearanceStatus === 'pending_clearance') {
            totalPettyPending += Number(w.amount || 0);
          }
        }
      }
    }

    return {
      totalBankWithdrawn,
      totalTreasurerAvailable,
      totalAidConfirmed,
      totalPettyPending,
      totalCashReturned,
      activeCount: workflows.filter((w) => w.overallStatus !== 'completed').length,
    };
  }, [workflows]);

  // Filtered Workflows
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((wf) => {
      if (workflowStatusFilter === 'in_progress' && wf.overallStatus === 'completed') return false;
      if (workflowStatusFilter === 'completed' && wf.overallStatus !== 'completed') return false;
      if (workflowSearch.trim()) {
        const q = workflowSearch.toLowerCase();
        const matchTitle = wf.title.toLowerCase().includes(q);
        const matchNo = wf.workflowNo.toLowerCase().includes(q);
        const matchBank = (wf.step1BankAccountName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNo && !matchBank) return false;
      }
      return true;
    });
  }, [workflows, workflowStatusFilter, workflowSearch]);

  // Handover KPI Aggregations (TASK 1)
  const handoverStats = useMemo(() => {
    let totalWithdrawn = 0;
    let totalHandedOver = 0;
    let totalRemaining = 0;
    let fullyCount = 0;
    let partialCount = 0;
    let notHandedCount = 0;

    for (const item of handoverList) {
      totalWithdrawn += Number(item.amount || 0);
      totalHandedOver += Number(item.totalHandedOverAmount || 0);
      totalRemaining += Number(item.remainingHandoverAmount || 0);
      if (item.handoverStatus === 'fully_handed_over') fullyCount++;
      else if (item.handoverStatus === 'partially_handed_over') partialCount++;
      else notHandedCount++;
    }

    return {
      totalWithdrawn,
      totalHandedOver,
      totalRemaining,
      fullyCount,
      partialCount,
      notHandedCount,
      totalCount: handoverList.length,
    };
  }, [handoverList]);

  // Filtered Handovers
  const filteredHandovers = useMemo(() => {
    return handoverList.filter((item) => {
      if (handoverStatusFilter !== 'all' && item.handoverStatus !== handoverStatusFilter) {
        return false;
      }
      if (handoverSearch.trim()) {
        const q = handoverSearch.toLowerCase();
        const matchNo = item.withdrawalNo.toLowerCase().includes(q);
        const matchWf = item.workflowNo.toLowerCase().includes(q);
        const matchRecipient = (item.recipientCaseWorkerName || '').toLowerCase().includes(q);
        const matchWithdrawer = (item.withdrawerName || '').toLowerCase().includes(q);
        const matchPurpose = (item.purpose || '').toLowerCase().includes(q);
        const matchAsnaf = (item.targetAsnaf || '').toLowerCase().includes(q);
        if (!matchNo && !matchWf && !matchRecipient && !matchWithdrawer && !matchPurpose && !matchAsnaf) {
          return false;
        }
      }
      return true;
    });
  }, [handoverList, handoverStatusFilter, handoverSearch]);

  // -------------------------------------------------------------------------
  // Handover Action Handlers (TASK 1)
  // -------------------------------------------------------------------------
  const handleOpenHandoverModal = (summary: VoucherHandoverSummary) => {
    setShowHandoverModal(summary);
    setHandoverDate(new Date().toISOString().slice(0, 10));
    setHandoverTime(new Date().toTimeString().slice(0, 5));
    setHandedOverByName(currentUser.name || 'เจ้าหน้าที่ฝ่ายการเงิน');
    setReceivedByName(summary.recipientCaseWorkerName || 'อุสมาน เจริญสุข (ผู้ดูแลเคส)');
    setReceivedByPosition('ผู้ดูแลเคส / เจ้าหน้าที่ภาคสนาม');
    const rem = Number(summary.remainingHandoverAmount ?? summary.amount);
    setHandoverAmount(rem > 0 ? rem : Number(summary.amount));
    setHandoverMethod('cash');
    setHandoverRefNo(`REF-HO-${Date.now().toString().slice(-4)}`);
    setHandoverNotes(`ส่งมอบเงินสดตามใบสำคัญ ${summary.withdrawalNo} ให้ผู้ดูแลเคส`);
    setHandoverProof(null);
    setIsHandoverConfirmed(false); // Checkbox MUST NOT be pre-checked
  };

  const handleOpenHandoverModalByWithdrawal = (wf: CashFlowWorkflow, w: CashFlowWithdrawal) => {
    const existing = handoverList.find((h) => h.withdrawalId === w.id);
    if (existing) {
      handleOpenHandoverModal(existing);
    } else {
      const summary: VoucherHandoverSummary = {
        withdrawalId: w.id,
        withdrawalNo: w.withdrawalNo,
        workflowId: wf.id,
        workflowNo: wf.workflowNo,
        withdrawalDatetime: w.withdrawalDatetime || new Date().toISOString(),
        amount: w.amount,
        sourceFundType: w.sourceFundType || wf.step1FundType || 'ซะกาต',
        sourceDescription: wf.step1BankAccountName || 'บัญชีกองทุนซะกาต',
        targetAsnaf: w.targetAsnaf || 'faqir_miskin',
        assistanceType: w.voucherType === 'aid_disbursement' ? 'เงินสงเคราะห์เพื่อการยังชีพ' : (w.voucherType === 'other_approved' ? 'วัตถุประสงค์อื่นที่ได้รับอนุมัติ' : 'สำรองจ่ายสำนักงาน'),
        purpose: w.purpose,
        withdrawerName: w.withdrawerName || 'นายมุกลิส มีระยะ',
        recipientCaseWorkerName: w.recipientCaseWorkerName || 'อุสมาน เจริญสุข (ผู้ดูแลเคส)',
        totalHandedOverAmount: w.totalHandedOverAmount || 0,
        remainingHandoverAmount: w.remainingHandoverAmount ?? (w.amount - (w.totalHandedOverAmount || 0)),
        handoverStatus: (w.handoverStatus as HandoverStatus) || 'not_handed_over',
        handoverHistory: w.handoverHistory || [],
      };
      handleOpenHandoverModal(summary);
    }
  };

  const handleOpenHandoverHistoryModal = async (summary: VoucherHandoverSummary) => {
    setShowHandoverHistoryModal(summary);
    setCancellingHandover(null);
    setCancelHandoverReason('');
    try {
      const res = await fetch(`/api/finance/handovers?search=${encodeURIComponent(summary.withdrawalNo)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const found = json.data.find((item: VoucherHandoverSummary) => item.withdrawalId === summary.withdrawalId);
        if (found) {
          setShowHandoverHistoryModal(found);
        }
      }
    } catch (err) {
      console.error('Error fetching handover history:', err);
    }
  };

  const handleOpenHandoverHistoryByWithdrawal = async (wf: CashFlowWorkflow, w: CashFlowWithdrawal) => {
    const existing = handoverList.find((h) => h.withdrawalId === w.id);
    if (existing) {
      await handleOpenHandoverHistoryModal(existing);
    } else {
      const summary: VoucherHandoverSummary = {
        withdrawalId: w.id,
        withdrawalNo: w.withdrawalNo,
        workflowId: wf.id,
        workflowNo: wf.workflowNo,
        withdrawalDatetime: w.withdrawalDatetime || new Date().toISOString(),
        amount: w.amount,
        sourceFundType: w.sourceFundType || wf.step1FundType || 'ซะกาต',
        sourceDescription: wf.step1BankAccountName || 'บัญชีกองทุนซะกาต',
        targetAsnaf: w.targetAsnaf || 'faqir_miskin',
        assistanceType: w.voucherType === 'aid_disbursement' ? 'เงินสงเคราะห์เพื่อการยังชีพ' : (w.voucherType === 'other_approved' ? 'วัตถุประสงค์อื่นที่ได้รับอนุมัติ' : 'สำรองจ่ายสำนักงาน'),
        purpose: w.purpose,
        withdrawerName: w.withdrawerName || 'นายมุกลิส มีระยะ',
        recipientCaseWorkerName: w.recipientCaseWorkerName || 'อุสมาน เจริญสุข (ผู้ดูแลเคส)',
        totalHandedOverAmount: w.totalHandedOverAmount || 0,
        remainingHandoverAmount: w.remainingHandoverAmount ?? (w.amount - (w.totalHandedOverAmount || 0)),
        handoverStatus: (w.handoverStatus as HandoverStatus) || 'not_handed_over',
        handoverHistory: w.handoverHistory || [],
      };
      await handleOpenHandoverHistoryModal(summary);
    }
  };

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showHandoverModal) return;

    if (!canOperateHandover) {
      showToast('ไม่อนุญาต: สิทธิ์ของผู้ใช้ไม่เพียงพอในการยืนยันการส่งมอบเงิน (เฉพาะฝ่ายการเงิน/ผู้บริหาร/แอดมิน)', 'error');
      return;
    }

    if (!isHandoverConfirmed) {
      showToast('กรุณาทำเครื่องหมายในช่อง "ข้าพเจ้ายืนยันว่าได้ตรวจสอบหลักฐานและข้อมูลการส่งมอบเงินตามรายการนี้แล้ว"', 'error');
      return;
    }

    if (!handedOverByName.trim() || !receivedByName.trim()) {
      showToast('กรุณาระบุชื่อผู้ส่งมอบเงินและผู้รับมอบเงินให้ครบถ้วน', 'error');
      return;
    }

    if (!handoverDate || !handoverTime) {
      showToast('กรุณาระบุวันที่และเวลาส่งมอบเงิน', 'error');
      return;
    }

    const amt = Number(handoverAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('จำนวนเงินที่ส่งมอบต้องมากกว่า 0 บาท', 'error');
      return;
    }

    const maxAllowed = Number(showHandoverModal.remainingHandoverAmount ?? showHandoverModal.amount);
    if (amt > maxAllowed) {
      showToast(`ยอดส่งมอบ (฿${amt.toLocaleString()}) เกินยอดคงเหลือที่ยังไม่ได้ส่งมอบ (฿${maxAllowed.toLocaleString()})`, 'error');
      return;
    }

    if (!handoverProof || !handoverProof.fileUrl) {
      showToast('กรุณาแนบไฟล์หลักฐานการส่งมอบเงิน (รองรับ PDF, JPG, JPEG, PNG)', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        withdrawalId: showHandoverModal.withdrawalId,
        handoverDate,
        handoverTime,
        handedOverByName: handedOverByName.trim(),
        receivedByName: receivedByName.trim(),
        receivedByPosition: receivedByPosition.trim(),
        amount: amt,
        handoverMethod,
        referenceNo: handoverRefNo.trim(),
        notes: handoverNotes.trim(),
        proofUrl: handoverProof.fileUrl,
        proofName: handoverProof.fileName,
        proofSize: handoverProof.fileSize,
        proofType: handoverProof.mimeType,
        isConfirmed: isHandoverConfirmed,
      };

      const res = await fetch('/api/finance/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: payload,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถบันทึกการส่งมอบเงินได้');
      }

      showToast(`บันทึกการส่งมอบเงิน ${json.data.handoverNo} ยอด ฿${amt.toLocaleString()} บาท เรียบร้อยแล้ว`, 'success');
      setShowHandoverModal(null);
      await fetchHandovers();
      await fetchWorkflows();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelHandover = async (handoverId: string) => {
    if (!cancelHandoverReason.trim() || cancelHandoverReason.trim().length < 5) {
      showToast('กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 5 ตัวอักษร', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/handovers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoverId,
          reason: cancelHandoverReason.trim(),
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ไม่สามารถยกเลิกรายการส่งมอบเงินได้');
      }

      showToast('ยกเลิกรายการส่งมอบเงินและปรับปรุงยอดคงเหลือเรียบร้อย', 'success');
      setCancellingHandover(null);
      setCancelHandoverReason('');
      await fetchHandovers();
      await fetchWorkflows();
      if (showHandoverHistoryModal) {
        await handleOpenHandoverHistoryModal(showHandoverHistoryModal);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // File Upload Helper
  // -------------------------------------------------------------------------
  const handleFileUpload = async (
    file: File,
    onSuccess: (info: { fileName: string; fileUrl: string; fileSize: number; mimeType: string }) => void
  ) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'proof_document');
      formData.append('entityType', 'cash_flow_workflow');

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'การอัปโหลดไฟล์ล้มเหลว');
      }

      onSuccess({
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      });
      showToast(`แนบไฟล์ "${data.fileName}" สำเร็จ`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // -------------------------------------------------------------------------
  // Step 1: Submit Bank Withdrawal Workflow
  // -------------------------------------------------------------------------
  const handleSubmitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step1Title.trim() || !step1BankAccountId || step1WithdrawAmount <= 0) {
      showToast('กรุณาระบุวัตถุประสงค์ เลือกบัญชีธนาคาร และระบุจำนวนเงินที่ถูกต้อง', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: step1Title.trim(),
        bankAccountId: step1BankAccountId,
        withdrawAmount: Number(step1WithdrawAmount),
        fundType: step1FundType,
        transferRef: step1TransferRef.trim(),
        eventDate: step1EventDate,
        eventTime: step1EventTime,
        eventDatetime: `${step1EventDate}T${step1EventTime}:00`,
        refNo: step1RefNo.trim(),
        withdrawnByName: step1OperatorName.trim(),
        approverName: step1ApproverName.trim(),
        status: step1Status,
        notes: step1Notes.trim(),
        proofUrl: step1Proof?.fileUrl || '',
        proofName: step1Proof?.fileName || '',
        proofSize: step1Proof?.fileSize || 0,
        proofType: step1Proof?.mimeType || '',
      };

      const res = await fetch('/api/finance/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: payload,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถสร้างรอบเบิกเงินได้');

      showToast(`บันทึกขั้นตอนที่ 1 (${step1Status === 'completed' ? 'ถอนเงินแล้ว' : step1Status === 'draft' ? 'ร่าง' : 'รออนุมัติ'}) ${json.data?.workflowNo || ''} เรียบร้อยแล้ว`, 'success');
      setShowStep1Modal(false);
      setStep1Title('');
      setStep1Proof(null);
      await fetchWorkflows();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmStep1Withdrawal = async (wf: CashFlowWorkflow) => {
    if (!confirm(`ยืนยันการถอนเงินสดจำนวน ฿${wf.step1WithdrawAmount.toLocaleString()} จากบัญชี "${wf.step1BankAccountName || 'ธนาคาร'}" หรือไม่?\n\nระบบจะตัดยอดเงินในบัญชีธนาคารและบันทึกประวัติธุรกรรมทันที`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 1,
          workflowId: wf.id,
          input: {
            status: 'completed',
            eventDatetime: new Date().toISOString().slice(0, 16),
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถยืนยันการถอนเงินได้');
      showToast(`ยืนยันการถอนเงินสด ${wf.workflowNo} เรียบร้อยแล้ว`, 'success');
      await fetchWorkflows();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveStep1 = async (wf: CashFlowWorkflow) => {
    if (!confirm(`อนุมัติคำขอถอนเงินสด ${wf.workflowNo} (จำนวน ฿${wf.step1WithdrawAmount.toLocaleString()}) หรือไม่?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 1,
          workflowId: wf.id,
          input: {
            status: 'approved',
            approverName: currentUser.name || 'ผู้อนุมัติ',
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถอนุมัติคำขอได้');
      showToast(`อนุมัติคำขอถอนเงินสด ${wf.workflowNo} เรียบร้อยแล้ว`, 'success');
      await fetchWorkflows();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelStep1 = async (wf: CashFlowWorkflow) => {
    const reason = prompt(`กรุณาระบุเหตุผลการยกเลิกคำขอถอนเงินสด ${wf.workflowNo}:`);
    if (!reason || !reason.trim()) {
      showToast('ต้องระบุเหตุผลในการยกเลิกคำขอ', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 1,
          workflowId: wf.id,
          input: {
            status: 'cancelled',
            notes: `ยกเลิกคำขอ: ${reason.trim()}`,
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถยกเลิกคำขอได้');
      showToast(`ยกเลิกคำขอ ${wf.workflowNo} เรียบร้อยแล้ว (หากมีการตัดยอดจะคืนเข้าบัญชีธนาคารอัตโนมัติ)`, 'success');
      await fetchWorkflows();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDraft = async (wf: CashFlowWorkflow) => {
    if (!confirm(`ยืนยันการลบแบบร่าง ${wf.workflowNo} หรือไม่?\n(คำเตือน: สามารถลบได้เฉพาะแบบร่างที่ยังไม่มีการถอนเงินจริงเท่านั้น)`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/finance/cash-flow?workflowId=${wf.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถลบแบบร่างได้');
      showToast(json.data?.message || 'ลบแบบร่างเรียบร้อยแล้ว', 'success');
      await fetchWorkflows();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Step 2: Submit Deposit to Treasurer Ruslan Hasamae
  // -------------------------------------------------------------------------
  const handleOpenStep2 = (wf: CashFlowWorkflow) => {
    setShowStep2Modal(wf);
    const amt = wf.step2DepositAmount || wf.step1WithdrawAmount;
    setStep2HandoverAmount(wf.step2HandoverAmount || wf.step1WithdrawAmount);
    setStep2DepositAmount(amt);
    setStep2HandoverDatetime(wf.step2HandoverDatetime || wf.step1EventDatetime || new Date().toISOString().slice(0, 16));
    setStep2ReceivedDatetime(wf.step2ReceivedDatetime || new Date().toISOString().slice(0, 16));
    setStep2RefNo(wf.step2RefNo || `REC-TREAS-${Date.now().toString().slice(-4)}`);
    setStep2HandoverPersonName(wf.step2HandoverPersonName || wf.step1WithdrawnByName || wf.step1OperatorName || 'เจ้าหน้าที่ผู้ถอนเงิน');
    setStep2TreasurerName(wf.step2TreasurerName || 'นายรุสลัน หะสาเมาะ');
    setStep2AuditorName(wf.step2AuditorName || 'อิหม่ามฟารุก อาลี');
    setStep2MismatchReason(wf.step2MismatchReason || '');
    setStep2MismatchApprovedByName(wf.step2MismatchApprovedByName || 'อิหม่ามฟารุก อาลี (ผู้อนุมัติ)');
    setStep2Notes(wf.step2Notes || `${wf.step2TreasurerName || 'นายรุสลัน หะสาเมาะ'} ได้รับมอบเงินสดครบถ้วน ฿${amt.toLocaleString()}`);
    setStep2StatusMode(wf.step2Status === 'draft' ? 'draft' : 'received');
    if (wf.step2ProofUrl) {
      setStep2Proof({
        fileName: wf.step2ProofName || 'หลักฐานรับมอบ.pdf',
        fileUrl: wf.step2ProofUrl,
        fileSize: wf.step2ProofSize || 102400,
        mimeType: wf.step2ProofType || 'application/pdf',
      });
    } else {
      setStep2Proof(null);
    }
  };

  const handleSubmitStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStep2Modal) return;

    const withdrawAmt = showStep2Modal.step1WithdrawAmount;
    const receivedAmt = Number(step2DepositAmount);

    if (receivedAmt <= 0) {
      showToast('จำนวนเงินที่รับมอบจริงต้องมากกว่า 0 บาท', 'error');
      return;
    }

    if (withdrawAmt !== receivedAmt) {
      if (!step2MismatchReason.trim()) {
        showToast('ยอดเงินที่รับมอบจริงไม่ตรงกับยอดถอนจากธนาคาร! กรุณาระบุเหตุผลความคลาดเคลื่อนก่อนดำเนินการต่อ', 'error');
        return;
      }
      if (!step2MismatchApprovedByName.trim() && !['super_admin', 'executive'].includes(currentUser.role)) {
        showToast('ยอดเงินมีส่วนต่าง ต้องระบุผู้ตรวจสอบ/ผู้อนุมัติตามนโยบาย', 'error');
        return;
      }
    }

    if (step2StatusMode !== 'draft' && !step2Proof && !showStep2Modal.step2ProofUrl) {
      showToast('กรุณาแนบไฟล์หลักฐานการรับมอบเงินสด (ใบส่งมอบหรือใบเสร็จรับเงิน)', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 2,
          workflowId: showStep2Modal.id,
          input: {
            depositAmount: receivedAmt,
            handoverAmount: Number(step2HandoverAmount || withdrawAmt),
            handoverDatetime: step2HandoverDatetime,
            receivedDatetime: step2ReceivedDatetime,
            eventDatetime: step2ReceivedDatetime,
            refNo: step2RefNo.trim(),
            handoverPersonName: step2HandoverPersonName.trim(),
            treasurerName: step2TreasurerName.trim(),
            auditorName: step2AuditorName.trim(),
            mismatchReason: step2MismatchReason.trim(),
            mismatchApprovedByName: step2MismatchApprovedByName.trim(),
            notes: step2Notes.trim(),
            status: step2StatusMode,
            proofUrl: step2Proof?.fileUrl || '',
            proofName: step2Proof?.fileName || '',
            proofSize: step2Proof?.fileSize || 0,
            proofType: step2Proof?.mimeType || '',
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถบันทึกการส่งมอบได้');

      showToast(`บันทึกฝากเงินเข้าเหรัญญิก (${step2TreasurerName}) สำเร็จ ยอดเงินพร้อมเบิก: ฿${receivedAmt.toLocaleString()}`, 'success');
      setShowStep2Modal(null);
      await fetchWorkflows();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelStep2 = async (wf: CashFlowWorkflow) => {
    const reason = prompt(`กรุณาระบุเหตุผลการยกเลิกขั้นตอนที่ 2 (ส่งมอบเหรัญญิก) สำหรับรายการ ${wf.workflowNo}:`);
    if (reason === null) return;
    if (!reason.trim()) {
      showToast('กรุณาระบุเหตุผลการยกเลิก', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 2,
          workflowId: wf.id,
          input: {
            status: 'cancelled',
            notes: reason.trim(),
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถยกเลิกการส่งมอบได้');
      showToast(`ยกเลิกขั้นตอนที่ 2 ของรายการ ${wf.workflowNo} เรียบร้อยแล้ว`, 'success');
      await fetchWorkflows();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Step 3 & 4: Open and Submit Cash Withdrawal Voucher
  // -------------------------------------------------------------------------
  // Extract Buddhist Era year dynamically from ISO string or Date
  const getSelectedYear = useCallback((dt?: string) => {
    if (dt) {
      try {
        const d = new Date(dt);
        if (!isNaN(d.getTime())) {
          const ceYear = d.getFullYear();
          return String(ceYear > 2400 ? ceYear : ceYear + 543);
        }
      } catch { }
    }
    return String(new Date().getFullYear() + 543);
  }, []);

  // Calculate next sequential voucher number across all loaded workflows
  const computeNextVoucherNo = useCallback((wfs: CashFlowWorkflow[] = workflows, targetYear?: string) => {
    const year = targetYear || getSelectedYear(withdrawalDatetime);
    let maxSeq = 0;
    for (const wf of wfs) {
      for (const w of (wf.withdrawals || [])) {
        if (w.withdrawalNo) {
          const parts = String(w.withdrawalNo).split('/');
          if (parts.length === 2 && parts[1] === year) {
            const num = parseInt(parts[0], 10);
            if (!isNaN(num) && num > maxSeq) {
              maxSeq = num;
            }
          }
        }
      }
    }
    return `${String(maxSeq + 1).padStart(2, '0')}/${year}`;
  }, [workflows, withdrawalDatetime, getSelectedYear]);

  // Check if current voucherNo is duplicate across all loaded workflows
  const isDuplicateVoucherNo = useMemo(() => {
    if (!voucherNo || !voucherNo.trim()) return false;
    const target = voucherNo.trim();
    for (const wf of workflows) {
      for (const w of (wf.withdrawals || [])) {
        if (w.withdrawalNo && w.withdrawalNo.trim() === target) {
          return true;
        }
      }
    }
    return false;
  }, [voucherNo, workflows]);

  const handleRegenerateNextVoucherNo = async (targetYear?: string) => {
    const year = targetYear || getSelectedYear(withdrawalDatetime);
    setIsVoucherCustomized(false);
    try {
      const res = await fetch(`/api/finance/cash-flow?next_voucher_no=true&year=${encodeURIComponent(year)}`);
      const json = await res.json();
      if (json.success && json.nextVoucherNo) {
        setVoucherNo(json.nextVoucherNo);
        showToast(`ออกเลขที่ใบสำคัญใหม่: ${json.nextVoucherNo}`, 'info');
        return;
      }
    } catch {
      // fallback
    }
    const computed = computeNextVoucherNo(workflows, year);
    setVoucherNo(computed);
    showToast(`ออกเลขที่ใบสำคัญใหม่: ${computed}`, 'info');
  };

  const handleWithdrawalDatetimeChange = async (newVal: string) => {
    const oldYear = getSelectedYear(withdrawalDatetime);
    const newYear = getSelectedYear(newVal);
    setWithdrawalDatetime(newVal);
    if (oldYear !== newYear && !isVoucherCustomized) {
      try {
        const res = await fetch(`/api/finance/cash-flow?next_voucher_no=true&year=${encodeURIComponent(newYear)}`);
        const json = await res.json();
        if (json.success && json.nextVoucherNo) {
          setVoucherNo(json.nextVoucherNo);
          showToast(`เปลี่ยนปีเอกสารเป็น พ.ศ. ${newYear} ปรับเลขที่ใบสำคัญอัตโนมัติ: ${json.nextVoucherNo}`, 'info');
          return;
        }
      } catch { }
      const fallbackNo = computeNextVoucherNo(workflows, newYear);
      setVoucherNo(fallbackNo);
    }
  };

  const handleOpenWithdrawalModal = async (wf: CashFlowWorkflow) => {
    const nowIso = new Date().toISOString().slice(0, 16);
    const year = getSelectedYear(nowIso);
    setIsVoucherCustomized(false);
    let nextNo = computeNextVoucherNo(workflows, year);

    try {
      const res = await fetch(`/api/finance/cash-flow?next_voucher_no=true&year=${encodeURIComponent(year)}`);
      const json = await res.json();
      if (json.success && json.nextVoucherNo) {
        nextNo = json.nextVoucherNo;
      }
    } catch {
      // fallback to computed
    }

    setShowWithdrawalModal(wf);
    setVoucherNo(nextNo);
    setVoucherType('aid_disbursement');
    setOtherApprovedAmount(0);
    setOtherApprovalRef('');
    setWithdrawalDatetime(nowIso);
    setWithdrawalPurpose(`เบิกเงินสดเพื่อจัดสรรช่วยเหลือผู้รับซะกาตตามคำร้องอนุมัติ`);
    setVoucherSourceFundType(wf.step1FundType || 'zakat');
    setVoucherStatus('disbursed');
    setVoucherRequestedAmount(0);
    setVoucherApprovedAmount(0);
    setApproverName('อิหม่ามฟารุก อาลี');
    setWithdrawalNotes('');
    setWithdrawalProof(null);
    setAidItems([]);
    setPettyRequestedAmount(5000);
    setPettyExpenseDetails('');
  };

  // TASK 3: Fast status transition handler for vouchers (Draft -> Pending -> Approved -> Disbursed)
  const handleUpdateVoucherStatus = async (wf: CashFlowWorkflow, withdrawal: CashFlowWithdrawal, newStatus: string) => {
    if (newStatus === 'disbursed') {
      const available = wf.availableTreasurerCash || 0;
      if (withdrawal.amount > available) {
        showToast(
          `ยอดเงินสดในมือเหรัญญิกไม่เพียงพอสำหรับยืนยันเบิกจริง! (คงเหลือที่เบิกได้ ฿${available.toLocaleString()} บาท, ยอดใบสำคัญ ฿${withdrawal.amount.toLocaleString()} บาท)`,
          'error'
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_withdrawal',
          withdrawalId: withdrawal.id,
          input: {
            status: newStatus,
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถอัปเดตสถานะใบสำคัญได้');
      
      const statusLabel = 
        newStatus === 'draft' ? 'แบบร่าง (Draft)' :
        newStatus === 'pending' || newStatus === 'pending_approval' ? 'ส่งขออนุมัติแล้ว (Pending)' :
        newStatus === 'approved' ? 'อนุมัติแล้ว (Approved)' :
        newStatus === 'disbursed' ? 'เบิกเงินสดจริงแล้ว (Disbursed)' : newStatus;
      
      showToast(`ปรับสถานะใบสำคัญ ${withdrawal.withdrawalNo} เป็น "${statusLabel}" เรียบร้อยแล้ว`, 'success');
      await fetchWorkflows();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Item to Step 4 Aid Table from Picker (TASK 2: Strict Backend Validation)
  const handleSelectApprovedApp = async (app: any) => {
    const alreadySelected = aidItems.some((item) => item.applicationId === app.id);
    if (alreadySelected) {
      showToast(`คำร้อง ${app.applicationNo} ถูกเลือกในใบสำคัญนี้แล้ว ไม่สามารถเลือกซ้ำได้`, 'info');
      return;
    }

    setIsValidatingSelection(true);
    try {
      // TASK 2 Section 3: Verify with Backend before allowing selection
      const valRes = await fetch('/api/finance/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate_app_for_withdrawal',
          input: { applicationId: app.id },
          actor: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        }),
      });

      const valJson = await valRes.json();
      if (!valRes.ok || !valJson.success) {
        showToast(valJson.error || 'ไม่สามารถเลือกเคสนี้เพื่อเบิกเงินได้', 'error');
        return;
      }

      const validApp = valJson.data.application || app;
      const approvedAmt = Number(validApp.approvedAmount ?? validApp.approved_amount ?? 0);
      const disbursedBefore = Number(validApp.disbursedAmount ?? validApp.disbursed_amount ?? 0);
      const remaining = Number(validApp.remainingAmount ?? (approvedAmt - disbursedBefore));

      if (remaining <= 0) {
        showToast(`คำร้อง ${validApp.applicationNo} ได้รับการจ่ายครบตามยอดอนุมัติแล้ว`, 'error');
        return;
      }

      const newItem = {
        applicationId: validApp.id,
        applicationNo: validApp.applicationNo,
        registrationNo: validApp.registrationNo || validApp.registration_no,
        beneficiaryId: validApp.beneficiaryId,
        beneficiaryName: validApp.beneficiaryName,
        nationalId: validApp.nationalId,
        asnafCategory: validApp.asnafCategory || validApp.asnaf_category || 'faqir_miskin',
        assistanceType: validApp.assistanceType || validApp.assistance_type || 'เงินสงเคราะห์เพื่อการยังชีพ',
        areaInfo: validApp.areaInfo || validApp.area_info || 'ปัตตานี',
        approvedAmount: approvedAmt,
        disbursedAmountBefore: disbursedBefore,
        thisDisbursementAmount: remaining, // default to full remaining
        remainingBalance: 0,
        notes: 'จ่ายเงินสดตามมติอนุมัติ',
      };

      setAidItems((prev) => [...prev, newItem]);
      showToast(`เพิ่ม "${validApp.beneficiaryName}" (ยอดเบิก ฿${remaining.toLocaleString()} บาท) เข้าสู่ใบสำคัญเรียบร้อย`, 'success');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์คำร้อง', 'error');
    } finally {
      setIsValidatingSelection(false);
    }
  };

  const handleRemoveAidItem = (index: number) => {
    setAidItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateAidItemAmount = (index: number, newAmount: number) => {
    setAidItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const maxAllowed = item.approvedAmount - item.disbursedAmountBefore;
      const validAmount = Math.max(0, Math.min(newAmount, maxAllowed));
      updated[index] = {
        ...item,
        thisDisbursementAmount: validAmount,
        remainingBalance: maxAllowed - validAmount,
      };
      return updated;
    });
  };

  const handleUpdateAidItemArea = (index: number, newArea: string) => {
    setAidItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], areaInfo: newArea };
      return updated;
    });
  };

  const handleUpdateAidItemNotes = (index: number, newNotes: string) => {
    setAidItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], notes: newNotes };
      return updated;
    });
  };

  // Calculate total voucher amount
  const totalVoucherAmount = useMemo(() => {
    if (voucherType === 'aid_disbursement') {
      return aidItems.reduce((acc, item) => acc + Number(item.thisDisbursementAmount || 0), 0);
    } else if (voucherType === 'office_expense') {
      return Number(pettyActualReceivedAmount || pettyRequestedAmount || 0);
    } else if (voucherType === 'other_approved') {
      return Number(otherApprovedAmount || 0);
    }
    return 0;
  }, [voucherType, aidItems, pettyActualReceivedAmount, pettyRequestedAmount, otherApprovedAmount]);

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showWithdrawalModal) return;

    if (isDuplicateVoucherNo) {
      showToast(`ตรวจพบเลขที่ใบสำคัญซ้ำซ้อน: เลขที่ "${voucherNo}" มีอยู่ในระบบแล้ว กรุณาคลิก "สร้างเลขถัดไป" หรือระบุเลขที่อื่น`, 'error');
      return;
    }

    if (totalVoucherAmount <= 0) {
      showToast('จำนวนเงินที่เบิกต้องมากกว่า 0 บาท', 'error');
      return;
    }

    const isDisbursed = voucherStatus === 'disbursed';
    const availableCash = showWithdrawalModal.availableTreasurerCash || 0;
    if (isDisbursed && totalVoucherAmount > availableCash) {
      showToast(`ยอดเงินสดในมือเหรัญญิกไม่เพียงพอ! (คงเหลือที่เบิกได้ ฿${availableCash.toLocaleString()} บาท, ยอดที่ขอเบิก ฿${totalVoucherAmount.toLocaleString()} บาท)`, 'error');
      return;
    }

    if (voucherType === 'aid_disbursement') {
      if (aidItems.length === 0) {
        showToast('กรุณากด "+ เลือกจากรายการอนุมัติ" เพื่อเพิ่มผู้รับความช่วยเหลืออย่างน้อย 1 รายการ', 'error');
        return;
      }
      for (const item of aidItems) {
        const remainingApproved = item.approvedAmount - item.disbursedAmountBefore;
        if (item.thisDisbursementAmount > remainingApproved) {
          showToast(`ยอดจ่ายครั้งนี้ของ "${item.beneficiaryName}" (฿${item.thisDisbursementAmount.toLocaleString()}) เกินยอดอนุมัติคงเหลือ (฿${remainingApproved.toLocaleString()})`, 'error');
          return;
        }
        if (item.thisDisbursementAmount <= 0) {
          showToast(`ยอดจ่ายครั้งนี้ของ "${item.beneficiaryName}" ต้องมากกว่า 0 บาท`, 'error');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        workflowId: showWithdrawalModal.id,
        withdrawalNo: voucherNo.trim(),
        isAutoAllocated: !isVoucherCustomized,
        voucherType,
        sourceFundType: voucherSourceFundType,
        requestedAmount: Number(voucherRequestedAmount || totalVoucherAmount),
        approvedAmount: Number(voucherApprovedAmount || totalVoucherAmount),
        amount: totalVoucherAmount,
        status: voucherStatus,
        withdrawalDatetime,
        withdrawerName,
        approverName,
        notes: withdrawalNotes.trim(),
        proofUrl: withdrawalProof?.fileUrl || '',
        proofName: withdrawalProof?.fileName || '',
        proofSize: withdrawalProof?.fileSize || 0,
        proofType: withdrawalProof?.mimeType || '',
      };

      if (voucherType === 'aid_disbursement') {
        payload.purpose = withdrawalPurpose.trim() || 'เบิกเงินสดช่วยเหลือตามคำร้องอนุมัติ';
        payload.targetAsnaf = targetAsnaf;
        payload.targetFundId = targetFundId;
        payload.disbursementItems = aidItems.map((item) => ({
          applicationId: item.applicationId,
          applicationNo: item.applicationNo,
          registrationNo: item.registrationNo,
          beneficiaryId: item.beneficiaryId,
          beneficiaryName: item.beneficiaryName,
          nationalId: item.nationalId,
          asnafCategory: item.asnafCategory,
          assistanceType: item.assistanceType,
          areaInfo: item.areaInfo,
          approvedAmount: item.approvedAmount,
          disbursedAmountBefore: item.disbursedAmountBefore,
          thisDisbursementAmount: item.thisDisbursementAmount,
          remainingBalance: item.remainingBalance,
          notes: item.notes,
        }));
      } else if (voucherType === 'office_expense') {
        const cat = activeCategories.find((c) => c.code === pettyExpenseCategory);
        payload.purpose = pettyExpenseDetails.trim() || (cat ? cat.name : 'สำรองจ่ายสำนักงาน');
        payload.expenseCategory = pettyExpenseCategory;
        payload.expenseDetails = pettyExpenseDetails.trim();
        payload.deadlineDate = pettyDeadlineDate;
        payload.allowedFundId = pettyAllowedFundId;
        payload.sourceFundType = pettyAllowedFundId;
        payload.targetAsnaf = 'amileen';
        payload.requestedAmount = Number(pettyRequestedAmount);
        payload.approvedAmount = Number(pettyApprovedAmount);
        payload.amount = Number(pettyActualReceivedAmount);
        payload.actualReceivedAmount = Number(pettyActualReceivedAmount);
        payload.notes = withdrawalNotes.trim();
      } else {
        // other_approved
        payload.purpose = withdrawalPurpose.trim() || 'เบิกเงินสดเพื่อวัตถุประสงค์อื่นที่ได้รับอนุมัติ';
        payload.targetAsnaf = targetAsnaf || 'other';
        payload.requestedAmount = Number(voucherRequestedAmount || otherApprovedAmount);
        payload.approvedAmount = Number(voucherApprovedAmount || otherApprovedAmount);
        payload.amount = Number(otherApprovedAmount);
        payload.actualReceivedAmount = Number(otherApprovedAmount);
        payload.notes = (otherApprovalRef ? `อ้างอิงมติ/เอกสารอนุมัติ: ${otherApprovalRef}\n` : '') + withdrawalNotes.trim();
      }

      const res = await fetch('/api/finance/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_withdrawal',
          input: payload,
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถบันทึกการเบิกเงินสดได้');

      showToast(`บันทึกใบสำคัญเบิกเงินสด ${json.data.withdrawalNo} สำเร็จ (สถานะ: ${voucherStatus}) ยอดเงิน ฿${totalVoucherAmount.toLocaleString()} บาท`, 'success');
      setShowWithdrawalModal(null);
      await fetchWorkflows();
      await fetchApprovedApps();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelWithdrawal = async (wf: CashFlowWorkflow, w: CashFlowWithdrawal) => {
    const reason = prompt(`กรุณาระบุเหตุผลการยกเลิกใบสำคัญเบิกเงินสด ${w.withdrawalNo} (จำนวน ฿${w.amount.toLocaleString()}):`);
    if (reason === null) return;
    if (reason.trim().length < 5) {
      showToast('กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 5 ตัวอักษร', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_withdrawal',
          withdrawalId: w.id,
          reason: reason.trim(),
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถยกเลิกใบสำคัญได้');

      showToast(`ยกเลิกใบสำคัญ ${w.withdrawalNo} เรียบร้อยแล้ว (ยอดเงินคืนเข้าความดูแลเหรัญญิก)`, 'success');
      await fetchWorkflows();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Step 4 Action: Confirm Aid Disbursement (Mark as Disbursed)
  // -------------------------------------------------------------------------
  const handleConfirmAidDisbursement = async (wf: CashFlowWorkflow, withdrawal: CashFlowWithdrawal) => {
    if (!confirm(`ยืนยันการจ่ายเงินสดจริงตามใบสำคัญ ${withdrawal.withdrawalNo} จำนวน ฿${withdrawal.amount.toLocaleString()} บาท? (ระบบจะปรับปรุงสถานะคำร้องและบันทึกบัญชีรายจ่ายสวัสดิการทันที)`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_disbursement',
          input: {
            workflowId: wf.id,
            withdrawalId: withdrawal.id,
            confirmationDatetime: new Date().toISOString().slice(0, 16),
            confirmedByName: currentUser.name || 'เจ้าหน้าที่ผู้จ่ายเงิน',
            notes: `จ่ายเงินสดช่วยเหลือตามใบสำคัญ ${withdrawal.withdrawalNo} เรียบร้อย`,
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถยืนยันการจ่ายเงินได้');

      showToast(`ยืนยันการจ่ายเงินสด ${withdrawal.withdrawalNo} สำเร็จ คำร้องถูกปรับปรุงสถานะเรียบร้อย`, 'success');
      await fetchWorkflows();
      await fetchApprovedApps();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Clear Petty Cash Submit (Section 2 - TASK 6 Itemized)
  // -------------------------------------------------------------------------
  const handleOpenClearPetty = (wf: CashFlowWorkflow, withdrawal: CashFlowWithdrawal) => {
    setShowClearPettyModal({ workflow: wf, withdrawal });
    setClearanceSpentAmount(withdrawal.amount);
    setClearanceDate(new Date().toISOString().slice(0, 10));
    setClearanceReturnDate(new Date().toISOString().slice(0, 10));
    setClearanceNotes('ใช้จ่ายตามใบเสร็จแนบครบถ้วน เงินคงเหลือส่งคืนเหรัญญิก');
    setClearanceProof(null);
    setClearanceOverspentReason('');
    setClearanceOverspentApproved(false);

    // Initialize with 1 default expense line item
    setClearanceItems([
      {
        id: `item-1`,
        expenseDate: new Date().toISOString().slice(0, 10),
        description: withdrawal.purpose || withdrawal.expenseDetails || 'ค่าใช้จ่ายตามใบสำคัญ',
        amount: withdrawal.amount,
        categoryCode: withdrawal.expenseCategory || 'OFFICE_EXPENSES',
        receiptUrl: '',
        receiptName: '',
        notes: '',
      },
    ]);
  };

  const handleSubmitClearPetty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showClearPettyModal) return;

    const totalSpent = clearanceItems.length > 0
      ? clearanceItems.reduce((acc, it) => acc + Number(it.amount || 0), 0)
      : Number(clearanceSpentAmount);

    const receivedAmt = showClearPettyModal.withdrawal.amount;
    const returnAmt = Math.max(0, receivedAmt - totalSpent);
    const excessAmt = totalSpent > receivedAmt ? totalSpent - receivedAmt : 0;

    if (excessAmt > 0 && !clearanceOverspentReason.trim()) {
      showToast('มียอดค่าใช้จ่ายเกินเงินที่ได้รับ ต้องระบุเหตุผลชี้แจงส่วนต่าง', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_petty_cash',
          input: {
            withdrawalId: showClearPettyModal.withdrawal.id,
            spentAmount: totalSpent,
            returnedAmount: returnAmt,
            returnDate: clearanceReturnDate,
            clearanceDate,
            items: clearanceItems,
            overspentReason: clearanceOverspentReason.trim(),
            isOverspentApproved: clearanceOverspentApproved,
            notes: clearanceNotes.trim(),
            proofUrl: clearanceProof?.fileUrl || '',
            proofName: clearanceProof?.fileName || '',
            proofSize: clearanceProof?.fileSize || 0,
            proofType: clearanceProof?.mimeType || '',
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถเคลียร์เงินสำรองจ่ายได้');

      showToast(`เคลียร์เงินสำรองจ่าย ${showClearPettyModal.withdrawal.withdrawalNo} สำเร็จ (คืนเงินสดเข้าเหรัญญิก ฿${returnAmt.toLocaleString()} บาท)`, 'success');
      setShowClearPettyModal(null);
      await fetchWorkflows();
      await fetchHistory();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clearance Items Helpers (TASK 6)
  const handleAddClearanceItem = () => {
    setClearanceItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        expenseDate: new Date().toISOString().slice(0, 10),
        description: '',
        amount: 0,
        categoryCode: showClearPettyModal?.withdrawal.expenseCategory || 'OFFICE_EXPENSES',
        receiptUrl: '',
        receiptName: '',
        notes: '',
      },
    ]);
  };

  const handleRemoveClearanceItem = (index: number) => {
    setClearanceItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateClearanceItem = (index: number, field: string, val: any) => {
    setClearanceItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  // Category Management Handlers (TASK 6)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatCode.trim() || !newCatName.trim()) {
      showToast('กรุณากรอกรหัสและชื่อหมวดค่าใช้จ่าย', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_admin_category',
          input: {
            code: newCatCode.trim().toUpperCase(),
            name: newCatName.trim(),
            expenseGroup: newCatGroup,
            budgetLimit: Number(newCatLimit || 0),
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถเพิ่มหมวดได้');
      showToast(`เพิ่มหมวด "${newCatName.trim()}" สำเร็จ`, 'success');
      setNewCatCode('');
      setNewCatName('');
      await fetchCategories();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCatName.trim()) {
      showToast('กรุณาระบุชื่อหมวดค่าใช้จ่าย', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_admin_category',
          input: {
            id,
            name: editCatName.trim(),
            budgetLimit: Number(editCatLimit || 0),
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถแก้ไขหมวดได้');
      showToast('แก้ไขหมวดค่าใช้จ่ายสำเร็จ', 'success');
      setEditingCatId(null);
      await fetchCategories();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCategory = async (id: string, currentStatus: boolean) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_admin_category',
          input: {
            id,
            isActive: !currentStatus,
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถเปลี่ยนสถานะได้');
      showToast('เปลี่ยนสถานะหมวดค่าใช้จ่ายสำเร็จ', 'success');
      await fetchCategories();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Step 5: Audit & Close Workflow
  // -------------------------------------------------------------------------
  const handleOpenStep5 = async (wf: CashFlowWorkflow) => {
    setShowStep5Modal(wf);
    setIsLoadingAudit(true);
    setAuditSummary(null);

    const totalWithdrawn = wf.totalCashWithdrawn || 0;
    const remainingTreasurerCash = wf.availableTreasurerCash || 0;

    setStep5ReconciledAmount(totalWithdrawn);
    setStep5RemainingCash(remainingTreasurerCash);
    setStep5EventDatetime(new Date().toISOString().slice(0, 16));
    setStep5AuditorName(currentUser.name || 'ผู้ตรวจสอบบัญชี');
    setStep5Notes(
      wf.step5Notes ||
      `ตรวจสอบความถูกต้องของรายการเบิกจ่าย ส่งคืนเงินสดคงเหลือ ฿${remainingTreasurerCash.toLocaleString()} บาท ฝากคืนบัญชีเหรัญญิกเรียบร้อย`
    );
    setStep5Proof(null);

    try {
      const res = await fetch(`/api/finance/cash-flow?audit_summary=true&workflowId=${wf.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setAuditSummary(json.data);
        setStep5ReconciledAmount(json.data.actualWithdrawnAmount);
        setStep5RemainingCash(json.data.remainingCashAmount);
      }
    } catch (err: any) {
      console.error('Failed to load audit summary:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleSubmitStep5 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStep5Modal) return;

    if (auditSummary && !auditSummary.canClose && auditSummary.validationErrors.length > 0) {
      showToast(`ไม่สามารถปิดรอบได้:\n${auditSummary.validationErrors.join('\n')}`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/cash-flow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 5,
          workflowId: showStep5Modal.id,
          input: {
            reconciledAmount: Number(step5ReconciledAmount),
            remainingCash: Number(step5RemainingCash),
            eventDatetime: step5EventDatetime,
            auditorName: step5AuditorName.trim(),
            notes: step5Notes.trim(),
            proofUrl: step5Proof?.fileUrl || '',
            proofName: step5Proof?.fileName || '',
            proofSize: step5Proof?.fileSize || 0,
            proofType: step5Proof?.mimeType || '',
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ไม่สามารถปิดรอบรายการได้');

      showToast(`ปิดรอบรายการ ${showStep5Modal.workflowNo} เรียบร้อยแล้ว ยอดเงินสดคงเหลือส่งคืนสมบูรณ์`, 'success');
      setShowStep5Modal(null);
      await fetchWorkflows();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Export History to CSV
  // -------------------------------------------------------------------------
  const handleExportCSV = () => {
    if (historyEntries.length === 0) {
      showToast('ไม่มีข้อมูลประวัติธุรกรรมสำหรับส่งออก', 'info');
      return;
    }

    const headers = [
      'วันที่จ่าย',
      'เวลา',
      'เลขที่ใบสำคัญ',
      'รอบการเบิก',
      'ประเภทการจ่าย',
      'ผู้รับเงินหรือผู้รับความช่วยเหลือ',
      'เลขประจำตัว ปชช.',
      'อัสนัฟ',
      'ประเภทการช่วยเหลือ/หมวดค่าใช้จ่าย',
      'จำนวนเงิน (บาท)',
      'แหล่งเงิน',
      'ผู้ดำเนินการ',
      'ผู้อนุมัติ',
      'สถานะ',
      'หมายเหตุ'
    ];
    const rows = historyEntries.map((h) => [
      `"${h.date}"`,
      `"${h.time}"`,
      `"${h.voucherNo}"`,
      `"${h.workflowNo}"`,
      `"${h.paymentTypeLabel || h.category}"`,
      `"${(h.payeeName || '').replace(/"/g, '""')}"`,
      `"${h.nationalId || '-'}"`,
      `"${h.asnafLabel || h.asnaf || '-'}"`,
      `"${(h.assistanceType || h.expenseCategoryName || h.expenseCategory || '-').replace(/"/g, '""')}"`,
      h.amount,
      `"${h.sourceFundName || h.sourceFundType || 'ซะกาต'}"`,
      `"${(h.responsiblePerson || '').replace(/"/g, '""')}"`,
      `"${(h.approverName || '').replace(/"/g, '""')}"`,
      `"${h.statusLabel || h.status}"`,
      `"${(h.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ZMS_Disbursement_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ส่งออกรายงานประวัติการจ่ายเงิน (CSV) เรียบร้อย', 'success');
    showToast('ส่งออกรายงานประวัติธุรกรรม CSV เรียบร้อย', 'success');
  };

  // -------------------------------------------------------------------------
  // Render Main Layout
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* 1. Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-700" />
              ขั้นตอนการฝาก–เบิกเงินสด (5-Step Cash Movement Workflow)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              ระบบมาตรฐานการเงิน 2569
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            บันทึกการเคลื่อนย้ายเงินสด 5 ขั้นตอน (ถอนเงินธนาคาร ➔ ฝากเข้าเหรัญญิก ➔ เบิกเงินสด ➔ จัดสรรช่วยเหลือ & สำรองจ่าย ➔ ปิดรอบ)
          </p>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('workflows')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'workflows'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              รอบการเบิกเงินสด ({workflows.length})
            </button>
            <button
              onClick={() => setViewMode('handovers')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${viewMode === 'handovers'
                  ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
              ส่งมอบเงินให้ผู้ดูแลเคส ({handoverList.length})
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${viewMode === 'history'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
              ประวัติการจ่ายเงิน ({historyEntries.length})
            </button>
          </div>

          {canManageCategories && (
            <button
              onClick={() => setShowCategoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all border border-slate-200 shadow-2xs"
            >
              <Tag className="w-3.5 h-3.5 text-emerald-700" />
              จัดการหมวดค่าใช้จ่าย
            </button>
          )}

          <button
            onClick={() => setShowStep1Modal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            + เริ่มคำขอถอนเงินสด (ขั้นตอนที่ 1)
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>1. ถอนจากธนาคารรวม</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            ฿{kpiStats.totalBankWithdrawn.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block">ตัดยอดจากบัญชีกองทุน</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span>2. ในมือเหรัญญิก (นายรุสลัน)</span>
            <Wallet className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-900">
            ฿{kpiStats.totalTreasurerAvailable.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium block">พร้อมให้เบิกจ่ายช่วยเหลือ</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>3. จ่ายช่วยเหลือยืนยันแล้ว</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-bold font-mono text-teal-800">
            ฿{kpiStats.totalAidConfirmed.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block">เชื่อมคำร้องจริง & ตัดยอด</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>4. สำรองจ่ายรอเคลียร์</span>
            <Briefcase className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-900">
            ฿{kpiStats.totalPettyPending.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block">10 หมวดบริหารสำนักงาน</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>5. ส่งคืนปิดรอบแล้ว</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-900">
            ฿{kpiStats.totalCashReturned.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block">กระทบยอดและปิดรอบสมบูรณ์</span>
        </div>
      </div>

      {/* 3. Main View Switching */}
      {viewMode === 'workflows' ? (
        /* =========================================================================
           VIEW A: ACTIVE & CLOSED WORKFLOWS
           ========================================================================= */
        <div className="space-y-4">
          {/* Workflows Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่รอบ (CFW), วัตถุประสงค์, บัญชีธนาคาร..."
                value={workflowSearch}
                onChange={(e) => setWorkflowSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
              <span className="text-slate-400 text-[11px] mr-1">สถานะ:</span>
              {(['all', 'in_progress', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setWorkflowStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${workflowStatusFilter === st
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {st === 'all' ? 'ทั้งหมด' : st === 'in_progress' ? 'กำลังดำเนินการ' : 'ปิดรอบแล้ว'}
                </button>
              ))}
            </div>
          </div>

          {/* Workflow Cards */}
          {filteredWorkflows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">ไม่พบรายการรอบการฝาก–เบิกเงินสด</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                ยังไม่มีข้อมูลรอบการเบิกเงินสด หรือไม่พบรายการที่ตรงกับคำค้นหา คลิกปุ่มด้านล่างเพื่อเริ่มขั้นตอนที่ 1
              </p>
              <button
                onClick={() => setShowStep1Modal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                + เริ่มคำขอถอนเงินสด (ขั้นตอนที่ 1)
              </button>
            </div>
          ) : (
            filteredWorkflows.map((wf) => {
              const isExpanded = expandedWorkflows[wf.id] ?? true;
              const withdrawals = wf.withdrawals || [];
              const treasurerAvailable = wf.availableTreasurerCash || 0;
              const isClosed = wf.overallStatus === 'completed';

              return (
                <div
                  key={wf.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-slate-800 text-white">
                          {wf.workflowNo}
                        </span>
                        <h2 className="text-sm font-bold text-slate-900">{wf.title}</h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isClosed
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                          {isClosed ? 'ปิดรอบเสร็จสิ้น (Closed)' : 'กำลังดำเนินการ (In Progress)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        บัญชีต้นทาง: <strong className="text-slate-700">{wf.step1BankAccountName || 'ธนาคารอิสลามแห่งประเทศไทย'}</strong> •
                        ผู้ดำเนินการถอน: <span className="text-slate-700">{wf.step1WithdrawnByName || wf.step1OperatorName}</span> •
                        วันที่: {wf.step1EventDatetime?.slice(0, 10) || wf.step1Date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">ยอดถอนจากธนาคาร</span>
                        <span className="text-base font-extrabold font-mono text-emerald-800">
                          ฿{wf.step1WithdrawAmount.toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => setExpandedWorkflows((prev) => ({ ...prev, [wf.id]: !isExpanded }))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-5 space-y-6">
                      {/* 5-Step Stepper Strip */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 text-xs">
                        {/* Step 1 Box */}
                        <div className={`p-3 rounded-xl border space-y-2 ${wf.step1Status === 'completed'
                            ? 'bg-slate-50 border-slate-200'
                            : wf.step1Status === 'draft'
                              ? 'bg-slate-100/70 border-dashed border-slate-300'
                              : wf.step1Status === 'pending_approval'
                                ? 'bg-amber-50/70 border-amber-200'
                                : wf.step1Status === 'approved'
                                  ? 'bg-sky-50/70 border-sky-200'
                                  : 'bg-rose-50/70 border-rose-200'
                          }`}>
                          <div className="flex items-center justify-between font-bold text-slate-800 text-[11px]">
                            <span>1. ถอนเงินธนาคาร</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${wf.step1Status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : wf.step1Status === 'draft'
                                  ? 'bg-slate-200 text-slate-700 border-slate-300'
                                  : wf.step1Status === 'pending_approval'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : wf.step1Status === 'approved'
                                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                              {wf.step1Status === 'completed' ? 'ถอนเงินแล้ว' :
                                wf.step1Status === 'draft' ? 'ร่าง' :
                                  wf.step1Status === 'pending_approval' ? 'รออนุมัติ' :
                                    wf.step1Status === 'approved' ? 'อนุมัติแล้ว' :
                                      wf.step1Status === 'cancelled' ? 'ยกเลิก' : wf.step1Status}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between gap-1">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              ฿{wf.step1WithdrawAmount.toLocaleString()}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700 font-medium">
                              {wf.step1FundType === 'sadaqah' ? 'ศอดะเกาะฮ์ทั่วไป' :
                                wf.step1FundType === 'admin' ? 'เงินสำหรับบริหาร' :
                                  wf.step1FundType === 'emergency' ? 'กองทุนฉุกเฉิน' : 'เงินซะกาต'}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-500 space-y-0.5">
                            <div className="truncate">ธนาคาร: <span className="text-slate-700 font-medium">{wf.step1BankAccountName || 'ธนาคารต้นทาง'}</span></div>
                            <div className="truncate">เลขอ้างอิง: <span className="font-mono text-slate-700 font-semibold">{wf.step1RefNo || '-'}</span></div>
                            <div className="truncate">รหัสส่งมอบขั้น 2: <span className="font-mono text-emerald-700 font-bold">{wf.step1TransferRef || wf.workflowNo}</span></div>
                            <div className="truncate">เวลาถอนจริง: <span className="text-slate-700">{wf.step1EventDate || wf.step1EventDatetime?.slice(0, 10)} {wf.step1EventTime || wf.step1EventDatetime?.slice(11, 16)} น.</span></div>
                            <div className="truncate text-slate-400">บันทึกระบบ: <span>{wf.step1Date}</span></div>
                            <div className="truncate">ผู้ถอน/อนุมัติ: <span className="text-slate-700">{wf.step1WithdrawnByName || wf.step1OperatorName} / {wf.step1ApproverName || '-'}</span></div>
                          </div>

                          <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200/60">
                            {wf.step1ProofUrl ? (
                              <button
                                onClick={() => setPreviewFile({
                                  fileName: wf.step1ProofName || 'สลิปถอนเงิน',
                                  fileUrl: wf.step1ProofUrl!,
                                  mimeType: wf.step1ProofType || 'application/pdf',
                                })}
                                className="text-[10px] text-emerald-700 hover:text-emerald-800 underline font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Paperclip className="w-3 h-3" /> ดูสลิปถอนเงิน
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">ไม่มีสลิป</span>
                            )}

                            {/* Status Actions */}
                            <div className="flex items-center gap-1">
                              {wf.step1Status === 'draft' && (
                                <>
                                  <button
                                    onClick={() => handleConfirmStep1Withdrawal(wf)}
                                    disabled={isSubmitting}
                                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] cursor-pointer shadow-xs"
                                    title="ยืนยันการถอนเงินจริงจากธนาคาร"
                                  >
                                    ยืนยันถอนเงิน
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDraft(wf)}
                                    disabled={isSubmitting}
                                    className="px-1.5 py-0.5 rounded text-rose-600 hover:bg-rose-50 text-[9px] cursor-pointer"
                                    title="ลบแบบร่างที่ยังไม่ถอนเงิน"
                                  >
                                    ลบ
                                  </button>
                                </>
                              )}

                              {wf.step1Status === 'pending_approval' && (
                                <>
                                  <button
                                    onClick={() => handleApproveStep1(wf)}
                                    disabled={isSubmitting}
                                    className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[9px] cursor-pointer shadow-xs"
                                  >
                                    อนุมัติ
                                  </button>
                                  <button
                                    onClick={() => handleConfirmStep1Withdrawal(wf)}
                                    disabled={isSubmitting}
                                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] cursor-pointer shadow-xs"
                                  >
                                    ยืนยันถอน
                                  </button>
                                  <button
                                    onClick={() => handleCancelStep1(wf)}
                                    disabled={isSubmitting}
                                    className="px-1.5 py-0.5 rounded text-rose-600 hover:bg-rose-50 text-[9px] cursor-pointer"
                                  >
                                    ยกเลิก
                                  </button>
                                </>
                              )}

                              {wf.step1Status === 'approved' && (
                                <>
                                  <button
                                    onClick={() => handleConfirmStep1Withdrawal(wf)}
                                    disabled={isSubmitting}
                                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] cursor-pointer shadow-xs"
                                  >
                                    ยืนยันถอนเงินจริง
                                  </button>
                                  <button
                                    onClick={() => handleCancelStep1(wf)}
                                    disabled={isSubmitting}
                                    className="px-1.5 py-0.5 rounded text-rose-600 hover:bg-rose-50 text-[9px] cursor-pointer"
                                  >
                                    ยกเลิก
                                  </button>
                                </>
                              )}

                              {wf.step1Status === 'completed' && (
                                <button
                                  onClick={() => handleCancelStep1(wf)}
                                  disabled={isSubmitting}
                                  className="text-[9px] text-slate-400 hover:text-rose-600 hover:underline cursor-pointer"
                                  title="ยกเลิกและคืนยอดเงินเข้าบัญชีธนาคารพร้อม Audit Log"
                                >
                                  ยกเลิกรายการ
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Step 2 Box: ฝากเข้าบัญชีเหรัญญิก */}
                        <div className={`p-3 rounded-xl border space-y-1.5 ${wf.step2Status === 'received' || wf.step2Status === 'completed'
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : wf.step2Status === 'draft'
                              ? 'bg-blue-50/70 border-blue-200'
                              : wf.step2Status === 'cancelled'
                                ? 'bg-rose-50/70 border-rose-200'
                                : wf.step1Status === 'completed'
                                  ? 'bg-amber-50/70 border-amber-200'
                                  : 'bg-slate-50 border-slate-200 opacity-70'
                          }`}>
                          <div className="flex items-center justify-between font-bold text-[11px]">
                            <span className="flex items-center gap-1 text-slate-800">
                              <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                              2. ฝากเข้าเหรัญญิก
                            </span>
                            {wf.step2Status === 'received' || wf.step2Status === 'completed' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> รับมอบแล้ว
                              </span>
                            ) : wf.step2Status === 'draft' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">
                                ร่าง
                              </span>
                            ) : wf.step2Status === 'cancelled' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800">
                                ยกเลิก
                              </span>
                            ) : wf.step1Status === 'completed' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3" /> รอรับมอบ
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-normal">
                                รอขั้นที่ 1
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline justify-between">
                            <div className="font-mono font-bold text-slate-900 text-sm">
                              ฿{(wf.step2DepositAmount || 0).toLocaleString()}
                            </div>
                            {wf.step2DepositAmount && wf.step2DepositAmount !== wf.step1WithdrawAmount && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded" title={wf.step2MismatchReason || 'ยอดไม่ตรง'}>
                                ส่วนต่าง ฿{Math.abs(wf.step2DepositAmount - wf.step1WithdrawAmount).toLocaleString()}
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-600 space-y-0.5 pt-0.5 border-t border-slate-200/60">
                            <div className="truncate">
                              <span className="text-slate-400">ผู้รับ: </span>
                              <span className="font-semibold text-slate-700">{wf.step2TreasurerName || 'นายรุสลัน หะสาเมาะ'}</span>
                            </div>
                            {wf.step2HandoverPersonName && (
                              <div className="truncate text-slate-500">
                                <span className="text-slate-400">ผู้ส่ง: </span>{wf.step2HandoverPersonName}
                              </div>
                            )}
                            {wf.step2ReceivedDatetime && (
                              <div className="text-slate-400 text-[9px]">
                                รับจริง: {wf.step2ReceivedDatetime.replace('T', ' ')}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-1 flex flex-wrap items-center gap-1.5">
                            {wf.step1Status === 'completed' && wf.step2Status !== 'received' && wf.step2Status !== 'completed' && !isClosed && (
                              <button
                                onClick={() => handleOpenStep2(wf)}
                                className="w-full py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold cursor-pointer shadow-2xs transition-all"
                              >
                                + บันทึกรับมอบเงินสด
                              </button>
                            )}

                            {wf.step2ProofUrl && (
                              <button
                                onClick={() => setPreviewFile({
                                  fileName: wf.step2ProofName || 'หลักฐานรับมอบเหรัญญิก',
                                  fileUrl: wf.step2ProofUrl!,
                                  mimeType: wf.step2ProofType || 'application/pdf',
                                })}
                                className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Paperclip className="w-3 h-3" /> หลักฐาน
                              </button>
                            )}

                            {(wf.step2Status === 'received' || wf.step2Status === 'completed') && (withdrawals.length === 0) && !isClosed && (
                              <button
                                onClick={() => handleCancelStep2(wf)}
                                disabled={isSubmitting}
                                className="text-[9px] text-slate-400 hover:text-rose-600 hover:underline cursor-pointer ml-auto"
                                title="ยกเลิกการรับมอบเงินเหรัญญิก"
                              >
                                ยกเลิก
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Step 3 Box */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-800 text-[11px]">
                            <span>3. เบิกเงินสดรวม</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                              {withdrawals.length} ใบสำคัญ
                            </span>
                          </div>
                          <div className="font-mono font-bold text-slate-900">
                            ฿{(wf.totalCashWithdrawn || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            ผู้เบิก: นายมุกลิส มีระยะ
                          </div>
                          {!isClosed && wf.step2Status === 'received' && (
                            <button
                              onClick={() => handleOpenWithdrawalModal(wf)}
                              disabled={treasurerAvailable <= 0}
                              className="mt-1 w-full py-1 rounded bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-[10px] font-bold cursor-pointer disabled:cursor-not-allowed"
                            >
                              + ออกใบสำคัญเบิก
                            </button>
                          )}
                        </div>

                        {/* Step 4 Box */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-800 text-[11px]">
                            <span>4. จ่ายช่วย & เคลียร์</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          </div>
                          <div className="font-mono font-bold text-teal-900">
                            ฿{(wf.step4AllocatedAmount || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {wf.step4DistributionSummary || 'ตามใบสำคัญเบิก'}
                          </div>
                        </div>

                        {/* Step 5 Box */}
                        <div className={`p-3 rounded-xl border space-y-1 ${isClosed ? 'bg-purple-50/70 border-purple-200' : 'bg-slate-50 border-slate-200'
                          }`}>
                          <div className="flex items-center justify-between font-bold text-slate-800 text-[11px]">
                            <span>5. ปิดรอบ & คืนเงิน</span>
                            {isClosed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                          <div className="font-mono font-bold text-purple-900">
                            ฿{(wf.step5RemainingCash || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {isClosed ? 'ปิดรอบเรียบร้อย' : 'รอตรวจสอบปิดรอบ'}
                          </div>
                          {!isClosed && wf.step2Status === 'received' && (
                            <button
                              onClick={() => handleOpenStep5(wf)}
                              className="mt-1 w-full py-1 rounded bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-bold cursor-pointer"
                            >
                              ตรวจสอบ & ปิดรอบ
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ส่วนที่ 1: สรุปเงินสดพร้อมเบิกจากเหรัญญิก (TASK 3 Mandatory Metrics) */}
                      <div className="p-4 rounded-2xl bg-white border border-emerald-200/90 shadow-xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold">
                              <Wallet className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                สรุปเงินสดพร้อมเบิกจากเหรัญญิก (นายรุสลัน หะสาเมาะ)
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">ข้อมูลธุรกรรมจริง</span>
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                ติดตามสถานะเงินสดคงเหลือ ยอดเบิกจ่ายยืนยันแล้ว และใบสำคัญที่อยู่ระหว่างดำเนินการ
                              </p>
                            </div>
                          </div>
                          {!isClosed && wf.step2Status === 'received' && (
                            <button
                              onClick={() => handleOpenWithdrawalModal(wf)}
                              disabled={treasurerAvailable <= 0}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold cursor-pointer disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" /> + ออกใบสำคัญเบิกเงินสด
                            </button>
                          )}
                        </div>

                        {/* 5 Real Transaction Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-500 block">1. ยอดรับจากเหรัญญิก</span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              ฿{(wf.totalTreasurerReceived || wf.step2DepositAmount || 0).toLocaleString()}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">รับเข้าตู้นิรภัย</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                            <span className="text-[10px] text-sky-800 font-semibold block">2. เบิกจ่ายยืนยันแล้ว</span>
                            <span className="font-mono font-bold text-sky-950 text-sm">
                              ฿{(wf.totalConfirmedDisbursed ?? wf.totalCashWithdrawn ?? 0).toLocaleString()}
                            </span>
                            <span className="text-[9px] text-sky-600 block mt-0.5">ตัดเงินสดจริงแล้ว</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                            <span className="text-[10px] text-amber-800 font-semibold block">3. อยู่ระหว่างดำเนินการ</span>
                            <span className="font-mono font-bold text-amber-950 text-sm">
                              ฿{(wf.totalInProgressWithdrawals || 0).toLocaleString()}
                            </span>
                            <span className="text-[9px] text-amber-600 block mt-0.5">ร่าง/รออนุมัติ</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300">
                            <span className="text-[10px] text-emerald-800 font-bold block">4. ยอดเงินสดคงเหลือ</span>
                            <span className="font-mono font-bold text-emerald-900 text-sm">
                              ฿{treasurerAvailable.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-emerald-700 font-medium block mt-0.5">พร้อมให้เบิกจ่าย</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-purple-800 font-semibold block">5. ใบสำคัญไม่เสร็จสิ้น</span>
                            <span className="font-mono font-bold text-purple-950 text-sm">
                              {wf.pendingVoucherCount ?? withdrawals.filter(w => ['draft', 'pending', 'pending_approval', 'approved'].includes(w.status)).length} ใบ
                            </span>
                            <span className="text-[9px] text-purple-600 block mt-0.5">รอส่งต่อ/เบิกจริง</span>
                          </div>
                        </div>
                      </div>

                      {/* Vouchers Section (List of Withdrawals under this Workflow) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-slate-500" />
                            รายการใบสำคัญการเบิกจ่าย ({withdrawals.length} รายการ)
                          </h3>
                          {!isClosed && wf.step2Status === 'received' && (
                            <button
                              onClick={() => handleOpenWithdrawalModal(wf)}
                              disabled={treasurerAvailable <= 0}
                              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3.5 h-3.5" /> ออกใบสำคัญเบิกเงินสดใหม่
                            </button>
                          )}
                        </div>

                        {withdrawals.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100 text-xs">
                            ยังไม่มีการออกใบสำคัญเบิกเงินสดในรอบนี้ กดปุ่ม &quot;ออกใบสำคัญเบิก&quot; เพื่อเบิกเงินสดช่วยเหลือหรือสำรองจ่าย
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {withdrawals.map((w, wIdx) => {
                              const isAid = w.voucherType === 'aid_disbursement';
                              const isOther = w.voucherType === 'other_approved';
                              const items = w.disbursementItems || [];
                              const isConfirmed = w.status === 'completed' || w.status === 'disbursed';
                              const isCleared = w.clearanceStatus === 'cleared' || w.clearanceStatus === 'overspent_approved';

                              return (
                                <div
                                  key={w.id || wIdx}
                                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all space-y-3"
                                >
                                  {/* Voucher Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                        ใบสำคัญ {w.withdrawalNo}
                                      </span>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isAid
                                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                                          : isOther
                                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                            : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}>
                                        {isAid ? 'เบิกเงินสดช่วยเหลือ (Aid Cash)' : isOther ? 'วัตถุประสงค์อื่นที่ได้รับอนุมัติ' : 'สำรองจ่ายสำนักงาน (Petty Cash)'}
                                      </span>
                                      {/* Status Badge */}
                                      {w.status === 'cancelled' ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-800 border-rose-200">
                                          ยกเลิกแล้ว
                                        </span>
                                      ) : w.status === 'draft' ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-200">
                                          แบบร่าง (Draft)
                                        </span>
                                      ) : w.status === 'pending' || w.status === 'pending_approval' ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                                          รออนุมัติ (Pending)
                                        </span>
                                      ) : w.status === 'approved' ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-800 border-indigo-200">
                                          อนุมัติแล้ว (Approved)
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                                          เบิกจริงแล้ว (Disbursed)
                                        </span>
                                      )}
                                      <span className="text-xs text-slate-500">
                                        {w.withdrawalDatetime?.slice(0, 10)} • ผู้เบิก: <strong>{w.withdrawerName}</strong>
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-extrabold font-mono text-slate-900">
                                        ฿{w.amount.toLocaleString()}
                                      </span>

                                      {/* Action buttons based on type */}
                                      {isAid && (
                                        isConfirmed ? (
                                          <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200" title="สถานะ: ฝ่ายการเงิน/เหรัญญิกเบิกเงินสดออกจากตู้นิรภัยเรียบร้อยแล้ว">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> เบิกเงินสดแล้ว
                                          </span>
                                        ) : !isClosed ? (
                                          <button
                                            onClick={() => handleConfirmAidDisbursement(wf, w)}
                                            className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                                            title="ยืนยันการเบิกเงินสดออกจากเหรัญญิก"
                                          >
                                            ยืนยันการเบิกเงินสด (Disburse Cash)
                                          </button>
                                        ) : null
                                      )}

                                      {/* Quick Status Action for Draft / Pending / Approved */}
                                      {!isClosed && w.status !== 'cancelled' && !isConfirmed && (
                                        <div className="flex items-center gap-1.5">
                                          {w.status === 'draft' && (
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateVoucherStatus(wf, w, 'pending')}
                                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer"
                                            >
                                              ส่งขออนุมัติ
                                            </button>
                                          )}
                                          {(w.status === 'pending' || w.status === 'pending_approval') && (
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateVoucherStatus(wf, w, 'approved')}
                                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] cursor-pointer"
                                            >
                                              อนุมัติใบสำคัญ
                                            </button>
                                          )}
                                          {w.status === 'approved' && (
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateVoucherStatus(wf, w, 'disbursed')}
                                              disabled={w.amount > treasurerAvailable}
                                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-[11px] cursor-pointer disabled:cursor-not-allowed"
                                            >
                                              ยืนยันเบิกสดจริง
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {!isAid && (
                                        isCleared ? (
                                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {w.clearanceStatus === 'overspent_approved'
                                              ? `เคลียร์แล้ว (จ่ายเกิน ฿${(w.clearanceExcessAmount || 0).toLocaleString()} - อนุมัติแล้ว)`
                                              : `เคลียร์แล้ว (คืน ฿${(w.clearanceReturnedAmount || 0).toLocaleString()})`}
                                          </span>
                                        ) : !isClosed ? (
                                          <button
                                            onClick={() => handleOpenClearPetty(wf, w)}
                                            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                                          >
                                            เคลียร์เงินสำรองจ่าย
                                          </button>
                                        ) : null
                                      )}

                                      {/* Cancel button */}
                                      {!isClosed && w.status !== 'cancelled' && (
                                        <button
                                          onClick={() => handleCancelWithdrawal(wf, w)}
                                          disabled={isSubmitting}
                                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 cursor-pointer"
                                          title="ยกเลิกใบสำคัญนี้"
                                        >
                                          ยกเลิก
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Voucher Financial Details */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    <div>
                                      <span className="text-slate-400 block text-[10px]">ประเภท/แหล่งเงิน</span>
                                      <span className="font-semibold text-slate-800">{w.sourceFundType || wf.step1FundType || 'ซะกาต'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[10px]">ยอดที่ขอเบิก</span>
                                      <span className="font-mono text-slate-700 font-medium">฿{(w.requestedAmount || w.amount).toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[10px]">ยอดที่อนุมัติ</span>
                                      <span className="font-mono text-slate-700 font-medium">฿{(w.approvedAmount || w.amount).toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[10px]">ผู้อนุมัติ</span>
                                      <span className="text-slate-800 font-semibold">{w.approverName || 'อิหม่ามฟารุก อาลี'}</span>
                                    </div>
                                  </div>

                                  {/* Voucher Description, Payment Confirmation Info & Proof */}
                                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                                    <div className="flex flex-wrap justify-between items-center gap-2">
                                      <span>วัตถุประสงค์: <strong>{w.purpose}</strong></span>
                                      {w.proofUrl && (
                                        <button
                                          onClick={() => setPreviewFile({
                                            fileName: w.proofName || 'หลักฐานใบสำคัญ',
                                            fileUrl: w.proofUrl!,
                                            mimeType: w.proofType || 'application/pdf',
                                          })}
                                          className="text-emerald-700 font-semibold underline flex items-center gap-1 text-[11px] cursor-pointer"
                                        >
                                          <Paperclip className="w-3 h-3" /> แนบหลักฐานแล้ว ({w.proofName || 'เปิดดู'})
                                        </button>
                                      )}
                                    </div>
                                    {(isConfirmed || w.status === 'completed' || w.status === 'disbursed') && (
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-teal-800 bg-teal-50/70 p-2 rounded-md border border-teal-100">
                                        <span><strong>วันที่และเวลาจ่าย:</strong> {w.withdrawalDatetime || w.updatedAt || '-'}</span>
                                        <span><strong>ผู้รับผิดชอบการจ่าย:</strong> {w.withdrawerName || 'เจ้าหน้าที่ผู้จ่ายเงิน'}</span>
                                        {w.notes && <span><strong>หมายเหตุ:</strong> {w.notes}</span>}
                                      </div>
                                    )}
                                  </div>

                                  {/* Handover Status Strip (TASK 1: Finance Handover to Case Worker) */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80 text-xs">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                        <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                                        การส่งมอบเงินให้ผู้ดูแลเคส:
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${w.handoverStatus === 'fully_handed_over'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                          : w.handoverStatus === 'partially_handed_over'
                                            ? 'bg-sky-100 text-sky-800 border-sky-300'
                                            : w.handoverStatus === 'cancelled'
                                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                                              : 'bg-slate-100 text-slate-700 border-slate-300'
                                        }`}>
                                        {w.handoverStatus === 'fully_handed_over' ? 'ส่งมอบครบแล้ว' :
                                          w.handoverStatus === 'partially_handed_over' ? 'ส่งมอบบางส่วน' :
                                            w.handoverStatus === 'cancelled' ? 'ยกเลิก' : 'ยังไม่ส่งมอบ'}
                                      </span>
                                      <span className="text-slate-500 text-[11px]">
                                        ผู้รับมอบ: <strong className="text-slate-800">{w.recipientCaseWorkerName || 'ผู้ดูแลเคส'}</strong> •
                                        ส่งมอบแล้ว: <strong className="text-emerald-800 font-mono">฿{(w.totalHandedOverAmount || 0).toLocaleString()}</strong> •
                                        คงเหลือค้างส่งมอบ: <strong className="text-amber-800 font-mono">฿{(w.remainingHandoverAmount ?? (w.amount - (w.totalHandedOverAmount || 0))).toLocaleString()}</strong>
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                      {(!isClosed && w.status !== 'cancelled' && (w.remainingHandoverAmount === undefined || w.remainingHandoverAmount > 0)) && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenHandoverModalByWithdrawal(wf, w)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer shadow-2xs transition-all"
                                        >
                                          <UserCheck className="w-3 h-3" />
                                          ส่งมอบเงิน
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenHandoverHistoryByWithdrawal(wf, w)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                                      >
                                        <Clock className="w-3 h-3 text-slate-500" />
                                        ประวัติส่งมอบ
                                      </button>
                                    </div>
                                  </div>

                                  {/* Step 4 Table: Recipients Breakdown for Aid Cash */}
                                  {isAid && items.length > 0 && (
                                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                                          <tr>
                                            <th className="py-2 px-2.5 text-center w-10">ลำดับ</th>
                                            <th className="py-2 px-3">ชื่อ–นามสกุล</th>
                                            <th className="py-2 px-3">ประเภทการช่วยเหลือ</th>
                                            <th className="py-2 px-2.5 text-right">ยอดอนุมัติ</th>
                                            <th className="py-2 px-2.5 text-right">จ่ายแล้ว</th>
                                            <th className="py-2 px-2.5 text-right font-bold text-emerald-800">จ่ายครั้งนี้</th>
                                            <th className="py-2 px-2.5 text-right">คงเหลือ</th>
                                            <th className="py-2 px-3">พื้นที่</th>
                                            <th className="py-2 px-3">หมายเหตุ</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {items.map((item, idx) => {
                                            const remaining = Math.max(0, (item.approvedAmount || 0) - (item.disbursedAmountBefore || 0) - (item.thisDisbursementAmount || 0));
                                            return (
                                              <tr key={item.id || idx} className="hover:bg-slate-50">
                                                <td className="py-2 px-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                                                <td className="py-2 px-3">
                                                  <div className="font-semibold text-slate-900">{item.beneficiaryName}</div>
                                                  <div className="text-[10px] font-mono text-slate-500">
                                                    {item.applicationNo && <span>คำร้อง: {item.applicationNo}</span>}
                                                    {item.registrationNo && <span> • ทะเบียน: {item.registrationNo}</span>}
                                                  </div>
                                                  <div className="text-[9px] font-mono text-slate-400">ปชช: {item.nationalId}</div>
                                                </td>
                                                <td className="py-2 px-3 text-slate-700">{item.assistanceType}</td>
                                                <td className="py-2 px-2.5 text-right font-mono text-slate-600">฿{item.approvedAmount.toLocaleString()}</td>
                                                <td className="py-2 px-2.5 text-right font-mono text-slate-500">฿{(item.disbursedAmountBefore || 0).toLocaleString()}</td>
                                                <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-800">
                                                  ฿{item.thisDisbursementAmount.toLocaleString()}
                                                </td>
                                                <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-700">
                                                  ฿{remaining.toLocaleString()}
                                                </td>
                                                <td className="py-2 px-3 text-slate-600">{item.areaInfo || '-'}</td>
                                                <td className="py-2 px-3 text-slate-500 text-[11px]">{item.notes || '-'}</td>
                                              </tr>
                                            );
                                          })}
                                          <tr className="bg-slate-50 font-bold border-t border-slate-200">
                                            <td colSpan={5} className="py-2 px-3 text-right text-slate-700">รวมยอดจ่ายตามใบสำคัญนี้:</td>
                                            <td className="py-2 px-2.5 text-right font-mono text-emerald-800">
                                              ฿{items.reduce((s, i) => s + i.thisDisbursementAmount, 0).toLocaleString()}
                                            </td>
                                            <td colSpan={3}></td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {/* Itemized Clearance Table for Petty Cash (TASK 6) */}
                                  {!isAid && w.clearanceItems && w.clearanceItems.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                        <span className="flex items-center gap-1.5">
                                          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                                          รายละเอียดใบเสร็จค่าใช้จ่ายจริงที่เคลียร์แล้ว ({w.clearanceItems.length} รายการ)
                                        </span>
                                        <span className="font-mono text-emerald-800">
                                          รวมจ่ายจริง: ฿{(w.clearanceSpentAmount || 0).toLocaleString()} • ส่งคืน: ฿{(w.clearanceReturnedAmount || 0).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                                            <tr>
                                              <th className="py-1.5 px-2.5 text-center w-10">ลำดับ</th>
                                              <th className="py-1.5 px-3">วันที่จ่าย</th>
                                              <th className="py-1.5 px-3">หมวด</th>
                                              <th className="py-1.5 px-3">รายละเอียด</th>
                                              <th className="py-1.5 px-2.5 text-right font-bold text-slate-800">จำนวนเงิน</th>
                                              <th className="py-1.5 px-3">หลักฐาน/ใบเสร็จ</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 bg-white">
                                            {w.clearanceItems.map((cItem, cIdx) => (
                                              <tr key={cItem.id || cIdx} className="hover:bg-slate-50">
                                                <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono">{cIdx + 1}</td>
                                                <td className="py-1.5 px-3 text-slate-700">{cItem.expenseDate}</td>
                                                <td className="py-1.5 px-3 text-slate-600 font-medium">{cItem.categoryName || cItem.categoryCode}</td>
                                                <td className="py-1.5 px-3 text-slate-800 font-medium">{cItem.description}</td>
                                                <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                                                  ฿{Number(cItem.amount || 0).toLocaleString()}
                                                </td>
                                                <td className="py-1.5 px-3 text-slate-500">
                                                  {cItem.receiptUrl ? (
                                                    <button
                                                      onClick={() => setPreviewFile({
                                                        fileName: cItem.receiptName || 'ใบเสร็จค่าใช้จ่าย',
                                                        fileUrl: cItem.receiptUrl!,
                                                        mimeType: cItem.receiptType || 'application/pdf',
                                                      })}
                                                      className="text-emerald-700 underline flex items-center gap-1 text-[11px] cursor-pointer"
                                                    >
                                                      <Paperclip className="w-3 h-3" /> {cItem.receiptName || 'ดูใบเสร็จ'}
                                                    </button>
                                                  ) : (
                                                    <span className="text-slate-400 text-[10px]">-</span>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : viewMode === 'handovers' ? (
        /* =========================================================================
           VIEW C: FINANCE HANDOVER TO CASE WORKER (TASK 1)
           ========================================================================= */
        <div className="space-y-4">
          {/* Handover Specific Top KPI Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>ยอดเบิกเงินสดทั้งหมด</span>
                <Coins className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold font-mono text-slate-900">
                ฿{handoverStats.totalWithdrawn.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400 block">จากใบสำคัญเบิกเงินสดทั้งหมด</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
                <span>ส่งมอบให้ผู้ดูแลเคสแล้ว</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-xl font-extrabold font-mono text-emerald-900">
                ฿{handoverStats.totalHandedOver.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium block">มีหลักฐานยืนยันแล้ว</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
                <span>คงเหลือยังไม่ได้ส่งมอบ</span>
                <Clock className="w-4 h-4 text-amber-700" />
              </div>
              <div className="text-xl font-bold font-mono text-amber-900">
                ฿{handoverStats.totalRemaining.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-amber-700 block">รอส่งมอบให้ผู้ดูแล</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>จำนวนใบสำคัญ</span>
                <FileText className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-xl font-bold font-mono text-slate-900">
                {handoverStats.totalCount} รายการ
              </div>
              <span className="text-[10px] text-slate-400 block">ใบสำคัญที่เบิกจ่ายแล้ว</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>สถานะการส่งมอบ</span>
                <UserCheck className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-sm font-bold text-slate-800 mt-1">
                <span className="text-emerald-700">{handoverStats.fullyCount} ครบ</span> • <span className="text-sky-700">{handoverStats.partialCount} บางส่วน</span> • <span className="text-slate-500">{handoverStats.notHandedCount} รอ</span>
              </div>
              <span className="text-[10px] text-slate-400 block">อัตราส่งมอบครบ {(handoverStats.totalCount > 0 ? ((handoverStats.fullyCount / handoverStats.totalCount) * 100).toFixed(0) : 0)}%</span>
            </div>
          </div>

          {/* Search & Status Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่ Workflow, ใบสำคัญ, ผู้ดูแลเคส, ผู้เบิก..."
                value={handoverSearch}
                onChange={(e) => setHandoverSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] mr-1">สถานะ:</span>
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'not_handed_over', label: 'ยังไม่ส่งมอบ' },
                { id: 'partially_handed_over', label: 'ส่งมอบบางส่วน' },
                { id: 'fully_handed_over', label: 'ส่งมอบครบแล้ว' },
                { id: 'pending_verification', label: 'รอตรวจสอบ' },
                { id: 'discrepancy', label: 'มีข้อผิดพลาด' },
                { id: 'cancelled', label: 'ยกเลิก' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setHandoverStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${handoverStatusFilter === st.id
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {st.label}
                </button>
              ))}

              <button
                onClick={() => fetchHandovers()}
                disabled={isLoadingHandovers}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-all"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHandovers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Handover Data Table (Mandated 11 Fields) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">1. เลขที่ Workflow</th>
                    <th className="py-3 px-3">2. เลขที่ใบสำคัญ</th>
                    <th className="py-3 px-3 whitespace-nowrap">3. วัน-เวลาที่เบิก</th>
                    <th className="py-3 px-3 text-right">4. ยอดที่เบิก</th>
                    <th className="py-3 px-3">5. แหล่งเงิน & บัญชี</th>
                    <th className="py-3 px-3">6. อัสนัฟ & ประเภท</th>
                    <th className="py-3 px-3">7. ผู้เบิกเงิน</th>
                    <th className="py-3 px-3">8. ผู้ดูแลเคส (ผู้รับมอบ)</th>
                    <th className="py-3 px-3 text-right text-emerald-800">9. ยอดที่ส่งมอบ</th>
                    <th className="py-3 px-3 text-right text-amber-800">10. ยังไม่ส่งมอบ</th>
                    <th className="py-3 px-3 text-center">11. สถานะ</th>
                    <th className="py-3 px-3 text-center">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHandovers.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <Coins className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">ไม่พบรายการใบสำคัญเบิกเงินสดที่ตรงกับเงื่อนไข</p>
                        <p className="text-[11px] text-slate-400 mt-1">ใบสำคัญเบิกเงินสดที่ได้รับการเบิกจ่ายแล้วจะแสดงที่นี่เพื่อยืนยันการส่งมอบเงินให้ผู้ดูแลเคส</p>
                      </td>
                    </tr>
                  ) : (
                    filteredHandovers.map((item) => {
                      const isFullyHanded = item.handoverStatus === 'fully_handed_over';
                      const isPartial = item.handoverStatus === 'partially_handed_over';
                      const isCancelled = item.handoverStatus === 'cancelled';
                      const isPending = item.handoverStatus === 'pending_verification';
                      const isDiscrepancy = item.handoverStatus === 'discrepancy' || item.handoverStatus === 'error';

                      return (
                        <tr key={item.withdrawalId} className="hover:bg-slate-50/70 transition-colors">
                          {/* 1. Workflow No */}
                          <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {item.workflowNo}
                            </span>
                          </td>

                          {/* 2. Voucher No */}
                          <td className="py-3 px-3 font-mono font-extrabold text-emerald-900 whitespace-nowrap">
                            {item.withdrawalNo}
                          </td>

                          {/* 3. Withdrawal Datetime */}
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap text-[11px]">
                            {item.withdrawalDatetime ? item.withdrawalDatetime.replace('T', ' ').slice(0, 16) : '-'}
                          </td>

                          {/* 4. Withdrawn Amount */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            ฿{Number(item.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>

                          {/* 5. Source Fund & Account */}
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                            <div className="font-medium">
                              {item.sourceFundType === 'sadaqah' ? 'ศอดะเกาะฮ์ทั่วไป' :
                                item.sourceFundType === 'admin' ? 'เงินสำหรับบริหาร' :
                                  item.sourceFundType === 'emergency' ? 'กองทุนฉุกเฉิน' : 'เงินซะกาต'}
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[120px]" title={item.sourceDescription}>
                              {item.sourceDescription || 'บัญชีกองทุน'}
                            </span>
                          </td>

                          {/* 6. Asnaf & Aid Type */}
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 block w-fit">
                              {item.targetAsnaf === 'faqir_miskin' || item.targetAsnaf === 'fakir' ? 'ฟากิร/มิสคีน' :
                                item.targetAsnaf === 'amileen' ? 'อามิลีน' :
                                  item.targetAsnaf === 'muallaf' ? 'มุอัลลัฟ' :
                                    item.targetAsnaf === 'gharimeen' ? 'ฆอริมีน' : item.targetAsnaf}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5 truncate max-w-[130px]" title={item.assistanceType || item.purpose}>
                              {item.assistanceType || item.purpose || 'เงินช่วยเหลือยังชีพ'}
                            </span>
                          </td>

                          {/* 7. Withdrawer Name */}
                          <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                            {item.withdrawerName || '-'}
                          </td>

                          {/* 8. Recipient Case Worker Name */}
                          <td className="py-3 px-3 text-slate-900 font-semibold whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                              <span>{item.recipientCaseWorkerName || 'ผู้ดูแลเคส'}</span>
                            </div>
                          </td>

                          {/* 9. Total Handed Over Amount */}
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700 whitespace-nowrap bg-emerald-50/20">
                            ฿{Number(item.totalHandedOverAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>

                          {/* 10. Remaining Unhanded Amount */}
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-amber-700 whitespace-nowrap bg-amber-50/20">
                            ฿{Number(item.remainingHandoverAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>

                          {/* 11. Handover Status */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${isFullyHanded
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : isPartial
                                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                                  : isCancelled
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : isPending
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : isDiscrepancy
                                        ? 'bg-orange-50 text-orange-800 border-orange-300'
                                        : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}>
                              {isFullyHanded ? 'ส่งมอบครบแล้ว' :
                                isPartial ? 'ส่งมอบบางส่วน' :
                                  isCancelled ? 'ยกเลิก' :
                                    isPending ? 'รอตรวจสอบ' :
                                      isDiscrepancy ? 'มีข้อผิดพลาด' : 'ยังไม่ส่งมอบ'}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {Number(item.remainingHandoverAmount) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenHandoverModal(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer shadow-2xs transition-all"
                                  title="บันทึกส่งมอบเงินให้ผู้ดูแลเคส"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  ส่งมอบเงิน
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenHandoverHistoryModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                                title="ดูประวัติการส่งมอบ"
                              >
                                <Clock className="w-3 h-3 text-slate-500" />
                                ประวัติ ({item.handoverHistory?.length || 0})
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
          </div>
        </div>
      ) : (
        /* =========================================================================
           VIEW B: UNIFIED DISBURSEMENT & EXPENSE HISTORY (TASK 4)
           ========================================================================= */
        (() => {
          // Calculate Accurate Deduplicated Financial Totals (TASK 4 Section 1 & Testing Rule)
          const confirmedAid = historyEntries.filter(
            (h) => h.isActualDisbursement && h.paymentType === 'aid_disbursement' && (h.status === 'disbursed' || h.status === 'completed')
          );
          const totalConfirmedAid = confirmedAid.reduce((acc, h) => acc + Number(h.amount || 0), 0);

          const confirmedOffice = historyEntries.filter(
            (h) => h.isActualDisbursement && h.paymentType === 'office_expense' && (h.status === 'cleared' || h.status === 'disbursed' || h.status === 'completed')
          );
          const totalConfirmedOffice = confirmedOffice.reduce((acc, h) => acc + Number(h.amount || 0), 0);

          const confirmedOther = historyEntries.filter(
            (h) => h.isActualDisbursement && h.paymentType === 'other_approved' && (h.status === 'disbursed' || h.status === 'completed')
          );
          const totalConfirmedOther = confirmedOther.reduce((acc, h) => acc + Number(h.amount || 0), 0);

          // Total Actual Disbursements: strictly aid + office + other (Never double counts cash float / transfers!)
          const totalActualDisbursements = totalConfirmedAid + totalConfirmedOffice + totalConfirmedOther;

          const pendingDisbursements = historyEntries.filter(
            (h) => ['draft', 'pending', 'pending_approval', 'pending_clearance'].includes(h.status)
          );
          const totalPending = pendingDisbursements.reduce((acc, h) => acc + Number(h.amount || 0), 0);

          const cashMovements = historyEntries.filter((h) => !h.isActualDisbursement);
          const totalMovements = cashMovements.reduce((acc, h) => acc + Number(h.amount || 0), 0);

          const cancelledEntries = historyEntries.filter((h) => h.status === 'cancelled');
          const totalCancelled = cancelledEntries.reduce((acc, h) => acc + Number(h.amount || 0), 0);

          // Pagination
          const totalPages = Math.max(1, Math.ceil(historyEntries.length / historyPageSize));
          const currentPageSafe = Math.min(historyCurrentPage, totalPages);
          const startIndex = (currentPageSafe - 1) * historyPageSize;
          const paginatedEntries = historyEntries.slice(startIndex, startIndex + historyPageSize);

          const hasActiveFilters =
            historyPaymentTypeFilter !== 'all' ||
            historyCategoryFilter !== 'all' ||
            historyAsnafFilter !== 'all' ||
            historyAssistanceTypeFilter !== 'all' ||
            historyOfficeCategoryFilter !== 'all' ||
            historyPayeeFilter.trim() !== '' ||
            historyOperatorFilter.trim() !== '' ||
            historyStatusFilter !== 'all' ||
            historySearch.trim() !== '' ||
            historyStartDate !== '' ||
            historyEndDate !== '' ||
            historyResponsibleFilter.trim() !== '' ||
            historyVoucherFilter.trim() !== '';

          return (
            <div className="space-y-4">
              {/* Header & Title */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-emerald-700" />
                    ประวัติการจ่ายเงิน (Disbursement History)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    รวมประวัติการจ่ายเงินช่วยเหลือผู้รับซะกาตและค่าใช้จ่ายสำนักงานในหน้าเดียว แยกยอดจ่ายจริงออกจากการเคลื่อนย้ายเงินสดเด็ดขาด
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs cursor-pointer transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    ส่งออก Excel (CSV)
                  </button>
                  <button
                    onClick={fetchHistory}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all"
                    title="รีเฟรชข้อมูล"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    รีเฟรช
                  </button>
                </div>
              </div>

              {/* 7 Summary KPI Cards (TASK 4 Section 1 & Testing Rule: แยกยอดจ่ายจริงออกจากรายการเคลื่อนย้ายเงิน) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
                {/* Card 1: Aid Cash Disbursed */}
                <div className="bg-white p-3 rounded-xl border border-teal-200 shadow-2xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-teal-800">
                    <HeartHandshake className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    จ่ายช่วยเหลือจริง
                  </div>
                  <div className="text-sm font-extrabold font-mono text-teal-900 mt-1">
                    ฿{totalConfirmedAid.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-teal-700 mt-0.5 font-medium">
                    {confirmedAid.length} รายการจ่ายจริง
                  </div>
                </div>

                {/* Card 2: Office Expenses */}
                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
                    <Briefcase className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    จ่ายสำนักงานจริง
                  </div>
                  <div className="text-sm font-extrabold font-mono text-amber-900 mt-1">
                    ฿{totalConfirmedOffice.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-amber-700 mt-0.5 font-medium">
                    {confirmedOffice.length} รายการเบิก/เคลียร์
                  </div>
                </div>

                {/* Card 3: Other Approved */}
                <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-purple-800">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    จ่ายอื่นตามอนุมัติ
                  </div>
                  <div className="text-sm font-extrabold font-mono text-purple-900 mt-1">
                    ฿{totalConfirmedOther.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-purple-700 mt-0.5 font-medium">
                    {confirmedOther.length} รายการมติบอร์ด
                  </div>
                </div>

                {/* Card 4: Total Actual Disbursements (Hero Card) */}
                <div className="bg-emerald-50/90 p-3 rounded-xl border-2 border-emerald-500 shadow-xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-900">
                    <Coins className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    รวมรายจ่ายจริง
                  </div>
                  <div className="text-base font-extrabold font-mono text-emerald-950 mt-1">
                    ฿{totalActualDisbursements.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-emerald-800 mt-0.5 font-bold">
                    ไม่นับซ้ำเงินเคลื่อนย้าย
                  </div>
                </div>

                {/* Card 5: In-Progress / Drafts */}
                <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-blue-800">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    รอตรวจสอบ / ร่าง
                  </div>
                  <div className="text-sm font-extrabold font-mono text-blue-900 mt-1">
                    ฿{totalPending.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-blue-700 mt-0.5 font-medium">
                    {pendingDisbursements.length} ใบสำคัญยังไม่จ่าย
                  </div>
                </div>

                {/* Card 6: Cash Movements (Float) */}
                <div className="bg-white p-3 rounded-xl border border-sky-200 shadow-2xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-sky-800">
                    <RefreshCw className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    การเคลื่อนย้ายเงินสด
                  </div>
                  <div className="text-sm font-extrabold font-mono text-sky-900 mt-1">
                    ฿{totalMovements.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-sky-700 mt-0.5 font-medium">
                    ถอนธนาคาร / ส่งมอบ
                  </div>
                </div>

                {/* Card 7: Cancelled / Reversals */}
                <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-2xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    ยกเลิก / ปรับปรุง
                  </div>
                  <div className="text-sm font-extrabold font-mono text-rose-900 mt-1">
                    ฿{totalCancelled.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="text-[10px] text-rose-700 mt-0.5 font-medium">
                    {cancelledEntries.length} รายการยกเลิก
                  </div>
                </div>
              </div>

              {/* Filters Toolbar (TASK 4 Section 2: All 9 Filters) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                {/* Row 1: Primary Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {/* General Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาทั่วไป (ชื่อ, ปชช., เลขที่)..."
                      value={historySearch}
                      onChange={(e) => {
                        setHistorySearch(e.target.value);
                        setHistoryCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>

                  {/* Filter 1: ประเภทการจ่าย (Payment Type) */}
                  <select
                    value={historyPaymentTypeFilter}
                    onChange={(e) => {
                      setHistoryPaymentTypeFilter(e.target.value);
                      setHistoryCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-semibold text-slate-800"
                  >
                    <option value="all">ทุกประเภทธุรกรรม</option>
                    <option value="actual_disbursements">⭐ เฉพาะรายจ่ายจริงทั้งหมด (ช่วยเหลือ + สำนักงาน + อื่นๆ)</option>
                    <option value="aid_disbursement">🤝 เงินสดช่วยเหลือผู้มีสิทธิ์ (Aid Disbursement)</option>
                    <option value="office_expense">🏢 เงินสำรองจ่ายสำนักงาน (Office Petty Cash)</option>
                    <option value="other_approved">📋 วัตถุประสงค์อื่นที่ได้รับอนุมัติ (Other Approved)</option>
                    <option value="cash_movements">🔄 การเคลื่อนย้ายเงินสด (ถอนธนาคาร / ฝากเหรัญญิก / คืนเงิน)</option>
                  </select>

                  {/* Filter 2: สถานะ (Status) */}
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => {
                      setHistoryStatusFilter(e.target.value);
                      setHistoryCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-800"
                  >
                    <option value="all">ทุกสถานะ</option>
                    <option value="completed_disbursed">✓ จ่ายจริง / สำเร็จ / เคลียร์แล้ว</option>
                    <option value="pending">⏳ รอตรวจสอบ / รออนุมัติ / รอเคลียร์ใบเสร็จ</option>
                    <option value="draft">📝 แบบร่าง (Draft)</option>
                    <option value="cancelled">✕ ยกเลิก / ปรับปรุง (Cancelled)</option>
                  </select>

                  {/* Filter 3: ช่วงวันที่ (Date Range) */}
                  <div className="col-span-1 sm:col-span-2 flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">ตั้งแต่วันที่:</span>
                    <input
                      type="date"
                      value={historyStartDate}
                      onChange={(e) => {
                        setHistoryStartDate(e.target.value);
                        setHistoryCurrentPage(1);
                      }}
                      className="p-0 bg-transparent border-0 text-xs focus:ring-0 text-slate-700 w-full"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="date"
                      value={historyEndDate}
                      onChange={(e) => {
                        setHistoryEndDate(e.target.value);
                        setHistoryCurrentPage(1);
                      }}
                      className="p-0 bg-transparent border-0 text-xs focus:ring-0 text-slate-700 w-full"
                    />
                  </div>
                </div>

                {/* Row 2: Specific Filters (Asnaf, Assistance Type, Office Category, Payee, Operator, VoucherNo) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
                  {/* Filter 4: กลุ่มอัสนัฟ */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">กลุ่มอัสนัฟ</label>
                    <select
                      value={historyAsnafFilter}
                      onChange={(e) => {
                        setHistoryAsnafFilter(e.target.value);
                        setHistoryCurrentPage(1);
                      }}
                      className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                    >
                      <option value="all">ทุกอัสนัฟ</option>
                      <option value="faqir">ฟากีร (ผู้ยากไร้)</option>
                      <option value="miskin">มิสactivity/ขัดสน</option>
                      <option value="amileen">อามิลีน (เจ้าหน้าที่)</option>
                      <option value="muallaf">มุอัลลัฟ</option>
                      <option value="riqab">ริกอบ (ปลดปล่อย)</option>
                      <option value="gharimin">ฆอริมีน (ผู้มีหนี้สิน)</option>
                      <option value="fisabilillah">ฟีสะบีลิลลาฮ์</option>
                      <option value="ibnsabil">อิบนุสสะบีล</option>
                    </select>
                  </div>

                  {/* Filter 5: ประเภทการช่วยเหลือ */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ประเภทการช่วยเหลือ</label>
                    <select
                      value={historyAssistanceTypeFilter}
                      onChange={(e) => {
                        setHistoryAssistanceTypeFilter(e.target.value);
                        setHistoryCurrentPage(1);
                      }}
                      className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                    >
                      <option value="all">ทุกประเภทช่วยเหลือ</option>
                      <option value="เงินสงเคราะห์เพื่อการยังชีพ">เงินสงเคราะห์เพื่อการยังชีพ</option>
                      <option value="ทุนการศึกษา">ทุนการศึกษา</option>
                      <option value="ค่ารักษาพยาบาล">ค่ารักษาพยาบาล</option>
                      <option value="ซ่อมแซมที่อยู่อาศัย">ซ่อมแซมที่อยู่อาศัย</option>
                      <option value="ทุนประกอบอาชีพ">ทุนประกอบอาชีพ</option>
                      <option value="บรรเทาทุกข์ฉุกเฉิน">บรรเทาทุกข์ฉุกเฉิน</option>
                      <option value="ปลดเปลื้องหนี้สิน">ปลดเปลื้องหนี้สิน</option>
                    </select>
                  </div>

                  {/* Filter 6: หมวดค่าใช้จ่ายสำนักงาน */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">หมวดค่าใช้จ่ายสำนักงาน</label>
                    <select
                      value={historyOfficeCategoryFilter}
                      onChange={(e) => {
                        setHistoryOfficeCategoryFilter(e.target.value);
                        setHistoryCurrentPage(1);
                      }}
                      className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                    >
                      <option value="all">ทุกหมวดสำนักงาน</option>
                      <option value="staff_remuneration">ค่าตอบแทนเจ้าหน้าที่</option>
                      <option value="office_supplies">ค่าวัสดุและเครื่องเขียน</option>
                      <option value="fuel">ค่ายานพาหนะและน้ำมัน</option>
                      <option value="electricity">ค่าไฟฟ้าและสาธารณูปโภค</option>
                      <option value="internet">ค่าอินเทอร์เน็ตและสื่อสาร</option>
                      <option value="travel">ค่าเดินทางติดต่อราชการ</option>
                      <option value="accounting">ค่าธรรมเนียมบัญชีและตรวจสอบ</option>
                      <option value="food_hospitality">ค่าอาหารและรับรอง</option>
                      <option value="other">ค่าใช้จ่ายเบ็ดเตล็ด</option>
                    </select>
                  </div>

                  {/* Filter 7: ผู้รับเงิน / ผู้รับ / ร้านค้า */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ผู้รับเงิน / ร้านค้า</label>
                    <input
                      type="text"
                      placeholder="ชื่อผู้รับ / ปชช. / ร้านค้า..."
                      value={historyPayeeFilter}
                      onChange={(e) => {
                        setHistoryPayeeFilter(e.target.value);
                        setHistoryCurrentPage(1);
                      }}
                      className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                    />
                  </div>

                  {/* Filter 8: ผู้ดำเนินการ */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ผู้ดำเนินการ / ผู้เบิก</label>
                    <input
                      type="text"
                      placeholder="ชื่อผู้ดำเนินการ..."
                      value={historyOperatorFilter}
                      onChange={(e) => {
                        setHistoryOperatorFilter(e.target.value);
                        setHistoryCurrentPage(1);
                      }}
                      className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                    />
                  </div>

                  {/* Filter 9: เลขที่ใบสำคัญ */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">เลขที่ใบสำคัญ / รอบ</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="เช่น 08/2569..."
                        value={historyVoucherFilter}
                        onChange={(e) => {
                          setHistoryVoucherFilter(e.target.value);
                          setHistoryCurrentPage(1);
                        }}
                        className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                      />
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryPaymentTypeFilter('all');
                            setHistoryCategoryFilter('all');
                            setHistoryAsnafFilter('all');
                            setHistoryAssistanceTypeFilter('all');
                            setHistoryOfficeCategoryFilter('all');
                            setHistoryPayeeFilter('');
                            setHistoryOperatorFilter('');
                            setHistoryStatusFilter('all');
                            setHistoryResponsibleFilter('');
                            setHistoryVoucherFilter('');
                            setHistorySearch('');
                            setHistoryStartDate('');
                            setHistoryEndDate('');
                            setHistoryCurrentPage(1);
                          }}
                          className="px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 rounded-lg font-bold shrink-0 cursor-pointer"
                          title="ล้างตัวกรองทั้งหมด"
                        >
                          ✕ ล้าง
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Section (TASK 4 Section 3: All 11 Required Columns) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200 font-extrabold">
                      <tr>
                        <th className="py-3 px-3 min-w-[95px]">วันที่จ่าย</th>
                        <th className="py-3 px-3 min-w-[110px]">เลขที่ใบสำคัญ</th>
                        <th className="py-3 px-3 min-w-[125px]">ประเภทการจ่าย</th>
                        <th className="py-3 px-3 min-w-[170px]">ชื่อผู้รับเงิน / ผู้รับช่วยเหลือ</th>
                        <th className="py-3 px-2 text-center min-w-[85px]">อัสนัฟ</th>
                        <th className="py-3 px-3 min-w-[150px]">ประเภทการช่วยเหลือ / หมวด</th>
                        <th className="py-3 px-3 text-right min-w-[105px]">จำนวนเงิน</th>
                        <th className="py-3 px-3 min-w-[120px]">ผู้ดำเนินการ</th>
                        <th className="py-3 px-2.5 text-center min-w-[95px]">สถานะ</th>
                        <th className="py-3 px-2 text-center min-w-[80px]">หลักฐาน</th>
                        <th className="py-3 px-3 text-center min-w-[100px]">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyEntries.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-slate-400">
                            <FileCheck2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            ไม่พบรายการประวัติการจ่ายเงินตามเงื่อนไขตัวกรอง
                          </td>
                        </tr>
                      ) : (
                        paginatedEntries.map((h) => {
                          const isAid = h.paymentType === 'aid_disbursement';
                          const isOffice = h.paymentType === 'office_expense';
                          const isOther = h.paymentType === 'other_approved';
                          const isMovement = !h.isActualDisbursement;

                          return (
                            <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* 1. วันที่จ่าย */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-mono font-bold text-slate-900">{h.date}</div>
                                <div className="font-mono text-[10px] text-slate-500">{h.time} น.</div>
                              </td>

                              {/* 2. เลขที่ใบสำคัญ */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-mono font-extrabold text-emerald-900">{h.voucherNo}</div>
                                <div className="font-mono text-[10px] text-slate-500">รอบ: {h.workflowNo}</div>
                              </td>

                              {/* 3. ประเภทการจ่าย */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                                    isAid
                                      ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                      : isOffice
                                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                      : isOther
                                      ? 'bg-purple-50 text-purple-900 border border-purple-200'
                                      : 'bg-sky-50 text-sky-900 border border-sky-200'
                                  }`}
                                >
                                  {isAid && <HeartHandshake className="w-3 h-3 text-teal-600 shrink-0" />}
                                  {isOffice && <Briefcase className="w-3 h-3 text-amber-600 shrink-0" />}
                                  {isOther && <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />}
                                  {isMovement && <RefreshCw className="w-3 h-3 text-sky-600 shrink-0" />}
                                  {h.paymentTypeLabel}
                                </span>
                              </td>

                              {/* 4. ชื่อผู้รับเงินหรือผู้รับความช่วยเหลือ */}
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900">{h.payeeName || '-'}</div>
                                {h.nationalId && h.nationalId !== '-' && (
                                  <div className="font-mono text-[10px] text-slate-500">
                                    ปชช: {h.nationalId}
                                  </div>
                                )}
                                {isOffice && h.expenseDetails && (
                                  <div className="text-[10px] text-slate-500 truncate max-w-xs">
                                    ผู้ขาย: {h.expenseDetails}
                                  </div>
                                )}
                              </td>

                              {/* 5. อัสนัฟ (สำหรับค่าใช้จ่ายสำนักงานแสดง - โดยไม่บังคับตามข้อกำหนด) */}
                              <td className="py-3 px-2 text-center whitespace-nowrap">
                                {isOffice || isMovement || !h.asnaf || h.asnaf === '-' ? (
                                  <span className="text-slate-400 font-mono">-</span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                    {h.asnafLabel || h.asnaf}
                                  </span>
                                )}
                              </td>

                              {/* 6. ประเภทการช่วยเหลือหรือหมวดค่าใช้จ่าย */}
                              <td className="py-3 px-3">
                                {isOffice ? (
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                    {h.expenseCategoryName || h.expenseCategory || 'ค่าใช้จ่ายสำนักงาน'}
                                  </span>
                                ) : (
                                  <div className="font-medium text-slate-700">
                                    {h.assistanceType || '-'}
                                  </div>
                                )}
                              </td>

                              {/* 7. จำนวนเงิน */}
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <span className="font-mono font-extrabold text-sm text-slate-900">
                                  ฿{h.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                              </td>

                              {/* 8. ผู้ดำเนินการ */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-semibold text-slate-800">{h.responsiblePerson}</div>
                                {h.approverName && (
                                  <div className="text-[10px] text-slate-500">อนุมัติ: {h.approverName}</div>
                                )}
                              </td>

                              {/* 9. สถานะ */}
                              <td className="py-3 px-2.5 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    h.status === 'completed' || h.status === 'cleared'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : h.status === 'disbursed' || h.status === 'received'
                                      ? 'bg-teal-100 text-teal-800'
                                      : h.status === 'approved'
                                      ? 'bg-blue-100 text-blue-800'
                                      : h.status === 'pending' || h.status === 'pending_approval' || h.status === 'pending_clearance'
                                      ? 'bg-amber-100 text-amber-800'
                                      : h.status === 'cancelled'
                                      ? 'bg-rose-100 text-rose-800 line-through'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {h.statusLabel || h.status}
                                </span>
                              </td>

                              {/* 10. หลักฐาน */}
                              <td className="py-3 px-2 text-center whitespace-nowrap">
                                {h.proofUrl ? (
                                  <button
                                    onClick={() =>
                                      setPreviewFile({
                                        fileName: h.proofName || `หลักฐาน-${h.voucherNo}`,
                                        fileUrl: h.proofUrl!,
                                        mimeType: 'application/pdf',
                                      })
                                    }
                                    className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline cursor-pointer"
                                    title="ดูเอกสารหลักฐาน"
                                  >
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <span className="text-[11px]">เอกสาร</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>

                              {/* 11. ปุ่มดูรายละเอียด (TASK 4 Section 3 & 4) */}
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedHistoryDetail(h)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer shadow-2xs transition-all"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  ดูรายละเอียด
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Card View (TASK 5: บนมือถือให้แสดงเป็น Card สำหรับหน้าจอขนาด 393 × 852 px) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {historyEntries.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 p-4">
                      <FileCheck2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      ไม่พบรายการประวัติการจ่ายเงินตามเงื่อนไขตัวกรอง
                    </div>
                  ) : (
                    paginatedEntries.map((h) => {
                      const isAid = h.paymentType === 'aid_disbursement';
                      const isOffice = h.paymentType === 'office_expense';
                      const isOther = h.paymentType === 'other_approved';

                      return (
                        <div key={h.id} className="p-4 space-y-3 bg-white hover:bg-slate-50 transition-colors">
                          {/* Row 1: Date & Status */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">
                              {h.date}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                h.status === 'completed' || h.status === 'cleared'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : h.status === 'disbursed' || h.status === 'received'
                                  ? 'bg-teal-100 text-teal-800'
                                  : h.status === 'approved'
                                  ? 'bg-blue-100 text-blue-800'
                                  : h.status === 'pending' || h.status === 'pending_approval' || h.status === 'pending_clearance'
                                  ? 'bg-amber-100 text-amber-800'
                                  : h.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800 line-through'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {h.status === 'completed' || h.status === 'cleared' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                              {h.statusLabel || h.status}
                            </span>
                          </div>

                          {/* Row 2: Voucher & Payee */}
                          <div>
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              ใบสำคัญ: {h.voucherNo}
                            </span>
                            <div className="text-base font-bold text-slate-900 mt-1.5 leading-snug">
                              {h.payeeName}
                            </div>
                            {h.nationalId && (
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                ปชช: {h.nationalId}
                              </div>
                            )}
                          </div>

                          {/* Row 3: Payment Type & Category Badges */}
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                isAid
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : isOffice
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-purple-50 text-purple-800 border border-purple-200'
                              }`}
                            >
                              {h.paymentTypeLabel}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                              {isAid && (h.asnafLabel || h.asnaf) ? `${h.asnafLabel || h.asnaf} • ` : ''}
                              {h.assistanceType || h.expenseCategoryName || h.expenseCategory || h.sourceFundType || '-'}
                            </span>
                          </div>

                          {/* Row 4: Amount Banner */}
                          <div className="flex items-center justify-between p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                            <span className="text-xs font-semibold text-emerald-800">จำนวนเงินจ่ายจริง:</span>
                            <span className="text-lg font-black text-emerald-950 font-mono">
                              ฿{h.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {/* Row 5: Operator & Proof */}
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>
                              ผู้ดำเนินการ: <strong className="text-slate-800">{h.responsiblePerson}</strong>
                            </span>
                            {h.proofUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewFile({
                                    fileName: h.proofName || `หลักฐาน-${h.voucherNo}`,
                                    fileUrl: h.proofUrl!,
                                    mimeType: 'application/pdf',
                                  })
                                }
                                className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                มีเอกสารแนบ
                              </button>
                            ) : (
                              <span className="text-slate-400">ยังไม่มีหลักฐาน</span>
                            )}
                          </div>

                          {/* Row 6: Action Button */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedHistoryDetail(h)}
                              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-xs cursor-pointer transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              ดูรายละเอียดและหลักฐาน
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination Toolbar */}
                {historyEntries.length > 0 && (
                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                    <div>
                      แสดง {startIndex + 1} ถึง {Math.min(startIndex + historyPageSize, historyEntries.length)} จากทั้งหมด{' '}
                      <span className="font-bold text-slate-900">{historyEntries.length}</span> รายการ
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500">แสดงหน้าละ:</span>
                        <select
                          value={historyPageSize}
                          onChange={(e) => {
                            setHistoryPageSize(Number(e.target.value));
                            setHistoryCurrentPage(1);
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value={10}>10</option>
                          <option value={15}>15</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                      </div>

                      <div className="inline-flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          disabled={currentPageSafe <= 1}
                          onClick={() => setHistoryCurrentPage((p) => Math.max(1, p - 1))}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                          title="หน้าก่อนหน้า"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 text-xs font-bold text-slate-800 flex items-center">
                          {currentPageSafe} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={currentPageSafe >= totalPages}
                          onClick={() => setHistoryCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                          title="หน้าถัดไป"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}

      {/* =========================================================================
         MODALS SECTION
         ========================================================================= */}

      {/* MODAL 1: STEP 1 ถอนเงินจากธนาคาร */}
      {showStep1Modal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    ขั้นตอนที่ 1: เบิกเงินจากธนาคาร (Bank Withdrawal)
                  </h3>
                  <p className="text-[11px] text-slate-500">บันทึกการถอนเงินจากบัญชีกองทุนเพื่อเริ่มรอบรายการ</p>
                </div>
                <button onClick={() => setShowStep1Modal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
              </div>

              <form onSubmit={handleSubmitStep1} className="p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">วัตถุประสงค์ / ชื่อรอบรายการ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เบิกเงินสดเพื่อจัดสรรถุงยังชีพและทุนการศึกษาฉุกเฉิน ยะลา"
                    value={step1Title}
                    onChange={(e) => setStep1Title(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">บัญชีธนาคารต้นทาง *</label>
                    <select
                      value={step1BankAccountId}
                      onChange={(e) => setStep1BankAccountId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} — {b.accountName.slice(0, 25)} (฿{b.currentBalance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ประเภทเงินหรือแหล่งเงินที่ถอน *</label>
                    <select
                      value={step1FundType}
                      onChange={(e) => setStep1FundType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium text-emerald-900"
                    >
                      <option value="zakat">เงินซะกาต (Zakat Fund — สำหรับผู้ยากไร้และขัดสน)</option>
                      <option value="sadaqah">เงินศอดะเกาะฮ์ทั่วไป (General Sadaqah — กองทุนบริจาคทั่วไป)</option>
                      <option value="admin">เงินสำหรับบริหารจัดการ (Administrative Fund — สำรองจ่ายสำนักงาน)</option>
                      <option value="emergency">เงินกองทุนฉุกเฉิน (Emergency Relief — บรรเทาสาธารณภัย)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">สถานะของรายการ *</label>
                    <select
                      value={step1Status}
                      onChange={(e) => setStep1Status(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="completed">ถอนเงินแล้ว (Completed — ตัดยอดธนาคารทันที)</option>
                      <option value="draft">ร่าง (Draft — บันทึกร่าง ยังไม่ตัดยอดธนาคาร)</option>
                      <option value="pending_approval">รออนุมัติ (Pending Approval — ส่งขออนุมัติ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">รหัสส่งมอบเชื่อมขั้นที่ 2 (Transfer Ref)</label>
                    <input
                      type="text"
                      value={step1TransferRef}
                      onChange={(e) => setStep1TransferRef(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-emerald-800 font-semibold"
                      placeholder="เช่น TR-2569-001"
                    />
                  </div>
                </div>

                {/* Bank balance status */}
                {(() => {
                  const selBank = bankAccounts.find((b) => b.id === step1BankAccountId);
                  const isOver = selBank && step1WithdrawAmount > selBank.currentBalance;
                  return selBank ? (
                    <div className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${isOver ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                      <span>
                        ยอดคงเหลือในบัญชี: <strong className="font-mono text-slate-900">฿{selBank.currentBalance.toLocaleString()}</strong>
                        {isOver && <span className="block text-rose-600 font-bold mt-0.5">⚠️ จำนวนเงินที่ถอนเกินยอดคงเหลือในบัญชีธนาคาร!</span>}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">เลขบัญชี: {selBank.accountNumber}</span>
                    </div>
                  ) : null;
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">จำนวนเงินที่ถอน (บาท) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={step1WithdrawAmount}
                      onChange={(e) => setStep1WithdrawAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">วันที่ถอนเงินจริง *</label>
                    <input
                      type="date"
                      required
                      value={step1EventDate}
                      onChange={(e) => setStep1EventDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เวลาถอนเงินจริง *</label>
                    <input
                      type="time"
                      required
                      value={step1EventTime}
                      onChange={(e) => setStep1EventTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เลขอ้างอิงธนาคาร (Slip/Ref)</label>
                    <input
                      type="text"
                      value={step1RefNo}
                      onChange={(e) => setStep1RefNo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ผู้ดำเนินการถอนเงิน</label>
                    <input
                      type="text"
                      value={step1OperatorName}
                      onChange={(e) => setStep1OperatorName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ผู้ตรวจสอบ/ผู้อนุมัติการถอนเงิน</label>
                  <input
                    type="text"
                    value={step1ApproverName}
                    onChange={(e) => setStep1ApproverName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    placeholder="ระบุชื่ออิหม่ามหรือผู้บริหารที่มีสิทธิ์อนุมัติ"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">แนบหลักฐานการถอน (สลิป/เอกสาร PDF หรือรูปภาพ)</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], (info) => setStep1Proof(info));
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-800 file:font-semibold"
                  />
                  {step1Proof && (
                    <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                      ✓ อัปโหลดสำเร็จ: {step1Proof.fileName}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมายเหตุ</label>
                  <textarea
                    rows={2}
                    value={step1Notes}
                    onChange={(e) => setStep1Notes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="pt-3 border-t flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStep1Modal(false)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold cursor-pointer shadow-xs transition-colors"
                  >
                    {isSubmitting
                      ? 'กำลังบันทึก...'
                      : step1Status === 'draft'
                      ? `บันทึกร่าง (฿${step1WithdrawAmount.toLocaleString()} บาท)`
                      : step1Status === 'pending_approval'
                      ? `ส่งตรวจสอบและขออนุมัติ (฿${step1WithdrawAmount.toLocaleString()} บาท)`
                      : `ยืนยันการถอนเงินสดจริง (฿${step1WithdrawAmount.toLocaleString()} บาท)`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 2: STEP 2 ส่งมอบเงินเข้าเหรัญญิก (นายรุสลัน หะสาเมาะ) */}
      {showStep2Modal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
                    ขั้นตอนที่ 2: ฝากเข้าบัญชีเหรัญญิก ({showStep2Modal.workflowNo})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    รับมอบเงินสดเข้าความดูแลของเหรัญญิก • ห้ามนับเป็นรายรับใหม่ (Internal Transit)
                  </p>
                </div>
                <button onClick={() => setShowStep2Modal(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
              </div>

              <form onSubmit={handleSubmitStep2} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                {/* 1. Header Reference Details */}
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">รหัส Workflow ต้นทาง</span>
                    <span className="font-mono font-bold text-slate-900">{showStep2Modal.workflowNo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">เลขอ้างอิงถอนเงินขั้นที่ 1</span>
                    <span className="font-mono font-semibold text-slate-800 truncate block">
                      {showStep2Modal.step1RefNo || showStep2Modal.step1TransferRef || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">ยอดถอนจากธนาคาร</span>
                    <span className="font-mono font-bold text-emerald-900 text-sm">
                      ฿{showStep2Modal.step1WithdrawAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 2. Amount Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      จำนวนเงินที่ส่งมอบ (บาท)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={step2HandoverAmount}
                      onChange={(e) => setStep2HandoverAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      จำนวนเงินที่รับจริง (บาท) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={step2DepositAmount}
                      onChange={(e) => setStep2DepositAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-emerald-800 text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* 3. Mismatch Section (If depositAmount !== step1WithdrawAmount) */}
                {step2DepositAmount !== showStep2Modal.step1WithdrawAmount && (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 space-y-2.5">
                    <div className="flex items-center justify-between text-amber-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        ยอดเงินรับมอบไม่ตรงกับยอดถอน!
                      </span>
                      <span className="font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-bold text-xs">
                        ส่วนต่าง: {step2DepositAmount - showStep2Modal.step1WithdrawAmount > 0 ? '+' : ''}
                        ฿{(step2DepositAmount - showStep2Modal.step1WithdrawAmount).toLocaleString()} บาท
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-amber-900 mb-1">
                          เหตุผลความคลาดเคลื่อน (บังคับ) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น หักค่าธรรมเนียมธนาคาร หรือแบ่งเก็บในตู้นิรภัยอื่น"
                          value={step2MismatchReason}
                          onChange={(e) => setStep2MismatchReason(e.target.value)}
                          className="w-full px-3 py-1.5 border border-amber-300 rounded-lg bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-amber-900 mb-1">
                          ผู้ตรวจสอบ / ผู้อนุมัติส่วนต่าง *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="ระบุชื่อผู้บริหารหรือผู้ตรวจสอบ"
                          value={step2MismatchApprovedByName}
                          onChange={(e) => setStep2MismatchApprovedByName(e.target.value)}
                          className="w-full px-3 py-1.5 border border-amber-300 rounded-lg bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Handover & Received Timestamps */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">วันที่และเวลาส่งมอบ *</label>
                    <input
                      type="datetime-local"
                      required
                      value={step2HandoverDatetime}
                      onChange={(e) => setStep2HandoverDatetime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">วันที่และเวลารับเงินจริง *</label>
                    <input
                      type="datetime-local"
                      required
                      value={step2ReceivedDatetime}
                      onChange={(e) => setStep2ReceivedDatetime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* 5. Persons: Handover Person, Treasurer, Auditor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ผู้ส่งมอบเงิน</label>
                    <input
                      type="text"
                      value={step2HandoverPersonName}
                      onChange={(e) => setStep2HandoverPersonName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ผู้รับเงิน (เหรัญญิก)
                    </label>
                    <input
                      type="text"
                      value={step2TreasurerName}
                      onChange={(e) => setStep2TreasurerName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-medium"
                      title="ผู้รับผิดชอบเริ่มต้น: นายรุสลัน หะสาเมาะ สามารถแก้ไขได้ตามสิทธิ์"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ผู้ตรวจสอบ / พยาน</label>
                    <input
                      type="text"
                      value={step2AuditorName}
                      onChange={(e) => setStep2AuditorName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* 6. Voucher Ref & Evidence */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เลขที่ใบรับเงิน / เลขอ้างอิง</label>
                    <input
                      type="text"
                      value={step2RefNo}
                      onChange={(e) => setStep2RefNo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">สถานะบันทึก</label>
                    <select
                      value={step2StatusMode}
                      onChange={(e) => setStep2StatusMode(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white"
                    >
                      <option value="received">รับมอบเงินสดเข้าความดูแลแล้ว (เสร็จสมบูรณ์)</option>
                      <option value="draft">บันทึกแบบร่าง (Draft - ยังไม่เปลี่ยนยอดพร้อมเบิก)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    แนบหลักฐานการรับมอบเงิน (ใบเสร็จรับเงิน/ใบส่งมอบ) *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], (info) => setStep2Proof(info));
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-800 file:font-semibold"
                  />
                  {step2Proof && (
                    <div className="flex items-center justify-between p-2 mt-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                      <span className="text-[11px] text-emerald-800 font-semibold truncate">
                        ✓ แนบไฟล์: {step2Proof.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewFile({
                          fileName: step2Proof.fileName,
                          fileUrl: step2Proof.fileUrl,
                          mimeType: step2Proof.mimeType,
                        })}
                        className="text-[11px] text-emerald-700 underline font-bold cursor-pointer"
                      >
                        Preview
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมายเหตุ</label>
                  <textarea
                    rows={2}
                    value={step2Notes}
                    onChange={(e) => setStep2Notes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="pt-3 border-t flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStep2Modal(null)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold cursor-pointer shadow-xs transition-colors"
                  >
                    {isSubmitting
                      ? 'กำลังบันทึก...'
                      : step2StatusMode === 'draft'
                      ? `บันทึกร่าง (฿${step2DepositAmount.toLocaleString()} บาท)`
                      : `ยืนยันรับมอบเงินสดเข้าเหรัญญิก (฿${step2DepositAmount.toLocaleString()} บาท)`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 3 & 4: ออกใบสำคัญเบิกเงินสด (Aid Cash หรือ Office Petty Cash) */}
      {showWithdrawalModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                    ขั้นตอนที่ 3 & 4: ออกใบสำคัญเบิกเงินสด (Voucher {voucherNo})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    เบิกจากเงินสดในมือเหรัญญิก (คงเหลือที่เบิกได้: ฿{(showWithdrawalModal.availableTreasurerCash || 0).toLocaleString()} บาท)
                  </p>
                </div>
                <button onClick={() => setShowWithdrawalModal(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
              </div>

              <form onSubmit={handleSubmitWithdrawal} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                {/* 6-Step Workflow Lifecycle Indicator (TASK 3 Section 4) */}
                <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    ขั้นตอนการทำงานเบิกเงินสดจากเหรัญญิก (6 ขั้นตอน)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-1 text-[11px]">
                    <div className="px-2 py-1.5 rounded-lg bg-emerald-100 text-emerald-900 font-bold border border-emerald-300 text-center">
                      1. กรอกข้อมูล ✓
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-emerald-100 text-emerald-900 font-bold border border-emerald-300 text-center">
                      2. ตรวจยอดเงิน ✓
                    </div>
                    <div className={`px-2 py-1.5 rounded-lg text-center font-bold border transition-colors ${
                      voucherStatus === 'draft' ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/40' : 'bg-white text-slate-600 border-slate-200'
                    }`}>
                      3. บันทึกร่าง
                    </div>
                    <div className={`px-2 py-1.5 rounded-lg text-center font-bold border transition-colors ${
                      voucherStatus === 'pending' ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/40' : 'bg-white text-slate-600 border-slate-200'
                    }`}>
                      4. ส่งอนุมัติ
                    </div>
                    <div className={`px-2 py-1.5 rounded-lg text-center font-bold border transition-colors ${
                      voucherStatus === 'disbursed' ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-500/40' : 'bg-white text-slate-600 border-slate-200'
                    }`}>
                      5. ยืนยันเบิกจริง
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white text-slate-500 border border-slate-200 text-center font-medium">
                      6. ประวัติ & แนบไฟล์
                    </div>
                  </div>
                </div>

                {/* 1. Purpose Type Switcher (TASK 3 Section 3: 3 Distinct Types) */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">เลือกประเภทวัตถุประสงค์การเบิกเงินสด (Section 3) *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setVoucherType('aid_disbursement');
                        setWithdrawalPurpose('เบิกเงินสดเพื่อจัดสรรช่วยเหลือผู้รับซะกาตตามคำร้องอนุมัติ');
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${voucherType === 'aid_disbursement'
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <Wallet className="w-4 h-4 text-emerald-700" />
                        1. เบิกเงินสดเพื่อช่วยเหลือ
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        จ่ายตามคำร้องที่อนุมัติแล้ว เชื่อมโยง ID ผู้รับและประวัติการช่วยเหลือ
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVoucherType('office_expense');
                        setWithdrawalPurpose('เบิกเงินสำรองจ่ายสำนักงาน (Petty Cash)');
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${voucherType === 'office_expense'
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <Briefcase className="w-4 h-4 text-amber-700" />
                        2. เบิกเงินสำรองจ่ายสำนักงาน
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        ค่าใช้จ่ายบริหารสำนักงาน (ค่าตอบแทน, สำนักงาน, น้ำมัน ฯลฯ) พร้อมเคลียร์ใบเสร็จ
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVoucherType('other_approved');
                        setWithdrawalPurpose('เบิกเงินสดเพื่อวัตถุประสงค์อื่นที่ได้รับอนุมัติ');
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${voucherType === 'other_approved'
                          ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <FileText className="w-4 h-4 text-indigo-700" />
                        3. วัตถุประสงค์อื่นที่อนุมัติ
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        รายการเฉพาะที่ผ่านมติเห็นชอบ เช่น ค่าธรรมเนียม หรือกิจกรรมพิเศษ
                      </p>
                    </button>
                  </div>
                </div>

                {/* ส่วนที่ 1: สรุปเงินสดพร้อมเบิก (5 Mandatory Metrics Banner) */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center shadow-2xs">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">1. รับจากเหรัญญิก</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      ฿{(showWithdrawalModal.totalTreasurerReceived || showWithdrawalModal.step2DepositAmount || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-sky-50 border border-sky-200">
                    <span className="text-[10px] text-sky-800 font-semibold block">2. เบิกยืนยันแล้ว</span>
                    <span className="font-mono font-bold text-sky-950 text-xs">
                      ฿{(showWithdrawalModal.totalConfirmedDisbursed ?? showWithdrawalModal.totalCashWithdrawn ?? 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-[10px] text-amber-800 font-semibold block">3. ระหว่างดำเนิน</span>
                    <span className="font-mono font-bold text-amber-950 text-xs">
                      ฿{(showWithdrawalModal.totalInProgressWithdrawals || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-300">
                    <span className="text-[10px] text-emerald-800 font-bold block">4. เงินสดคงเหลือ</span>
                    <span className="font-mono font-bold text-emerald-900 text-xs">
                      ฿{(showWithdrawalModal.availableTreasurerCash || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-purple-800 font-semibold block">5. ค้างไม่เสร็จ</span>
                    <span className="font-mono font-bold text-purple-950 text-xs">
                      {showWithdrawalModal.pendingVoucherCount || 0} ใบ
                    </span>
                  </div>
                </div>

                {/* Voucher Header Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700">เลขที่ใบสำคัญ *</label>
                      <button
                        type="button"
                        onClick={() => handleRegenerateNextVoucherNo()}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                        title="คำนวณและดึงเลขที่ถัดไปอัตโนมัติ"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>สร้างเลขถัดไป</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={voucherNo}
                      onChange={(e) => {
                        setVoucherNo(e.target.value);
                        setIsVoucherCustomized(true);
                      }}
                      className={`w-full px-3 py-1.5 border rounded-xl font-mono font-bold transition-all ${isDuplicateVoucherNo
                          ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                          : 'border-slate-200'
                        }`}
                      placeholder={`01/${getSelectedYear(withdrawalDatetime)}`}
                    />
                    {isDuplicateVoucherNo && (
                      <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        เลขที่ &quot;{voucherNo}&quot; ซ้ำกับเอกสารในระบบแล้ว คลิก &quot;สร้างเลขถัดไป&quot;
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">วันที่และเวลาที่เบิกจริง *</label>
                    <input
                      type="datetime-local"
                      required
                      value={withdrawalDatetime}
                      onChange={(e) => handleWithdrawalDatetimeChange(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ผู้เบิกเงินสด *</label>
                    <input
                      type="text"
                      readOnly
                      value={withdrawerName}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-100 font-semibold text-slate-800"
                    />
                  </div>
                </div>

                {/* Voucher Header Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ประเภทเงินและแหล่งเงิน *</label>
                    <select
                      value={voucherSourceFundType}
                      onChange={(e) => setVoucherSourceFundType(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="zakat">เงินซะกาต (Zakat — ผู้ยากไร้และขัดสน)</option>
                      <option value="sadaqah">เงินศอดะเกาะฮ์ทั่วไป (General Sadaqah)</option>
                      <option value="admin">เงินสำหรับบริหารจัดการ (Administrative Fund)</option>
                      <option value="emergency">เงินกองทุนฉุกเฉิน (Emergency Relief)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">สถานะของใบสำคัญ *</label>
                    <select
                      value={voucherStatus}
                      onChange={(e) => setVoucherStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-bold bg-white"
                    >
                      <option value="disbursed">เบิกจริง (Disbursed — ตัดยอดเงินสดในมือเหรัญญิก)</option>
                      <option value="draft">ร่าง (Draft — ไม่ตัดยอดเงินสด)</option>
                      <option value="pending">รอตรวจสอบ (Pending — ไม่ตัดยอดเงินสด)</option>
                      <option value="approved">อนุมัติแล้ว (Approved — รอเบิกเงินสด)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ผู้อนุมัติ *</label>
                    <input
                      type="text"
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* Voucher Header Row 3: Amounts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">จำนวนเงินที่ขอเบิก (บาท)</label>
                    <input
                      type="number"
                      min={0}
                      value={voucherRequestedAmount || totalVoucherAmount}
                      onChange={(e) => setVoucherRequestedAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">จำนวนเงินที่อนุมัติ (บาท)</label>
                    <input
                      type="number"
                      min={0}
                      value={voucherApprovedAmount || totalVoucherAmount}
                      onChange={(e) => setVoucherApprovedAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">จำนวนเงินที่เบิกจริง (บาท) *</label>
                    <div className="w-full px-3 py-1.5 border border-emerald-300 rounded-xl font-mono font-bold text-emerald-900 bg-emerald-50 text-sm">
                      ฿{totalVoucherAmount.toLocaleString()} บาท
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">วัตถุประสงค์การเบิกจ่าย *</label>
                  <input
                    type="text"
                    required
                    value={withdrawalPurpose}
                    onChange={(e) => setWithdrawalPurpose(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                    placeholder="ระบุวัตถุประสงค์ เช่น เบิกเงินสดเพื่อมอบให้ผู้ยากไร้และขัดสนตามคำร้องอนุมัติ"
                  />
                </div>

                {/* Group A: Aid Cash Specific (Step 4 Linking Table) */}
                {voucherType === 'aid_disbursement' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">
                          ตารางรายละเอียดผู้รับความช่วยเหลือ (เชื่อมโยงคำร้องอนุมัติจริง) *
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          แสดงเฉพาะคำร้องที่ได้รับอนุมัติแล้วและยังไม่ถูกจ่ายเต็มจำนวน
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowApprovedPicker(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> + เลือกจากรายการอนุมัติ
                      </button>
                    </div>

                    {aidItems.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 bg-slate-50/50">
                        ยังไม่มีผู้รับความช่วยเหลือในใบสำคัญนี้ กดปุ่ม &quot;+ เลือกจากรายการอนุมัติ&quot; เพื่อเลือกเคสจริง
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                            <tr>
                              <th className="py-2.5 px-2 text-center w-10">ลำดับ</th>
                              <th className="py-2.5 px-3 min-w-[150px]">ชื่อ–นามสกุล</th>
                              <th className="py-2.5 px-3 min-w-[120px]">ประเภทการช่วยเหลือ</th>
                              <th className="py-2.5 px-2.5 text-right w-24">ยอดอนุมัติ</th>
                              <th className="py-2.5 px-2.5 text-right w-24">จ่ายแล้ว</th>
                              <th className="py-2.5 px-2.5 text-right w-28">จ่ายครั้งนี้ *</th>
                              <th className="py-2.5 px-2.5 text-right w-24">คงเหลือ</th>
                              <th className="py-2.5 px-2.5 min-w-[110px]">พื้นที่</th>
                              <th className="py-2.5 px-2.5 min-w-[120px]">หมายเหตุ</th>
                              <th className="py-2.5 px-2 text-center w-10">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {aidItems.map((item, idx) => {
                              const remainingApproved = item.approvedAmount - item.disbursedAmountBefore;
                              const currentRemaining = Math.max(0, remainingApproved - item.thisDisbursementAmount);
                              return (
                                <tr key={item.applicationId} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-2 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-semibold text-slate-900">{item.beneficiaryName}</div>
                                    <div className="text-[10px] font-mono text-slate-500">
                                      {item.applicationNo && <span>คำร้อง: {item.applicationNo}</span>}
                                      {item.registrationNo && <span> • ทะเบียน: {item.registrationNo}</span>}
                                    </div>
                                    <div className="text-[9px] font-mono text-slate-400">ปชช: {item.nationalId}</div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                                      {item.assistanceType || 'เงินสงเคราะห์เพื่อการยังชีพ'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                                    ฿{item.approvedAmount.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right font-mono text-slate-500">
                                    ฿{item.disbursedAmountBefore.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right">
                                    <input
                                      type="number"
                                      min={1}
                                      max={remainingApproved}
                                      value={item.thisDisbursementAmount}
                                      onChange={(e) => handleUpdateAidItemAmount(idx, Number(e.target.value))}
                                      className="w-full px-2 py-1 text-right border border-emerald-300 rounded-lg font-mono font-bold text-emerald-800 bg-white focus:ring-1 focus:ring-emerald-500"
                                      placeholder="ยอดจ่าย"
                                    />
                                    <div className="text-[9px] text-slate-400 text-right mt-0.5">
                                      สูงสุด: ฿{remainingApproved.toLocaleString()}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-slate-700">
                                    ฿{currentRemaining.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-2.5">
                                    <input
                                      type="text"
                                      value={item.areaInfo || ''}
                                      onChange={(e) => handleUpdateAidItemArea(idx, e.target.value)}
                                      placeholder="ระบุพื้นที่ (เช่น ต.จะบังติกอ)"
                                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 text-slate-700"
                                    />
                                  </td>
                                  <td className="py-2.5 px-2.5">
                                    <input
                                      type="text"
                                      value={item.notes || ''}
                                      onChange={(e) => handleUpdateAidItemNotes(idx, e.target.value)}
                                      placeholder="หมายเหตุเพิ่มเติม"
                                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 text-slate-700"
                                    />
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAidItem(idx)}
                                      className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                                      title="ลบรายการ"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="bg-emerald-50/90 font-bold border-t-2 border-emerald-200">
                              <td colSpan={5} className="py-3 px-3 text-right text-emerald-950 font-semibold">
                                รวมยอดจ่ายตามใบสำคัญนี้ (คำนวณอัตโนมัติ):
                              </td>
                              <td className="py-3 px-2.5 text-right font-mono text-emerald-900 text-sm font-bold">
                                ฿{totalVoucherAmount.toLocaleString()}
                              </td>
                              <td colSpan={4} className="py-3 px-3 text-xs text-emerald-700 font-medium">
                                ({aidItems.length} รายการ)
                                {voucherStatus === 'disbursed' && showWithdrawalModal && (
                                  <span className={`ml-2 font-bold ${totalVoucherAmount > (showWithdrawalModal.availableTreasurerCash || 0) ? 'text-red-600' : 'text-emerald-700'}`}>
                                    {totalVoucherAmount > (showWithdrawalModal.availableTreasurerCash || 0)
                                      ? `⚠️ เกินเงินสดพร้อมใช้ (฿${(showWithdrawalModal.availableTreasurerCash || 0).toLocaleString()})`
                                      : `✓ อยู่ในวงเงินสดพร้อมใช้ (฿${(showWithdrawalModal.availableTreasurerCash || 0).toLocaleString()})`}
                                  </span>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Purpose 2: Office Petty Cash Specific (TASK 6 - 13 Fields) */}
                {voucherType === 'office_expense' && (
                  <div className="space-y-3.5 pt-2 border-t border-slate-100">
                    <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-900 text-xs">
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        <Briefcase className="w-4 h-4 text-amber-700" />
                        ข้อกำหนดการเบิกเงินสำรองจ่ายสำนักงาน (Office Petty Cash Advance)
                      </div>
                      <p className="text-[11px] text-amber-800">
                        • แยกออกจากการเบิกเงินสดช่วยเหลือผู้รับซะกาต ห้ามรวมยอดเป็นยอดช่วยเหลือผู้รับซะกาตโดยเด็ดขาด<br />
                        • ห้ามใช้แหล่งเงินซะกาตช่วยเหลือผู้ยากไร้ อนุญาตเฉพาะงบประมาณบริหาร (Amileen, Admin Fund, สำรองจ่ายดำเนินงาน หรือ ศอดะเกาะฮ์ทั่วไป)
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">หมวดค่าใช้จ่าย (Category) *</label>
                        <select
                          value={pettyExpenseCategory}
                          onChange={(e) => setPettyExpenseCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium text-slate-800"
                        >
                          {activeCategories.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name} ({c.expenseGroup || c.groupName || 'ทั่วไป'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">แหล่งเงินที่อนุญาตให้ใช้ *</label>
                        <select
                          value={pettyAllowedFundId}
                          onChange={(e) => setPettyAllowedFundId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium text-slate-800"
                        >
                          <option value="amileen">กองทุนส่วนแบ่งเจ้าหน้าที่ปฏิบัติงาน (Amileen)</option>
                          <option value="admin">งบประมาณบริหารจัดการสำนักงาน (Administrative Fund)</option>
                          <option value="operational">เงินสำรองจ่ายดำเนินงาน (Operational Advance)</option>
                          <option value="general_sadaqah">เงินศอดะเกาะฮ์ทั่วไป (General Sadaqah)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">รายละเอียดการใช้จ่าย *</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="ระบุรายละเอียดค่าใช้จ่าย เช่น ค่าน้ำมันรถยนต์สำหรับลงพื้นที่สำรวจคำร้อง เขต อ.เมืองปัตตานี"
                        value={pettyExpenseDetails}
                        onChange={(e) => setPettyExpenseDetails(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                      />
                    </div>

                    {/* 3 Financial Amount Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">จำนวนเงินที่ขอเบิก (บาท) *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={pettyRequestedAmount}
                          onChange={(e) => setPettyRequestedAmount(Number(e.target.value))}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">จำนวนเงินที่อนุมัติ (บาท) *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={pettyApprovedAmount}
                          onChange={(e) => setPettyApprovedAmount(Number(e.target.value))}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-[11px]">จำนวนเงินที่ได้รับจริง (บาท) *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={pettyActualReceivedAmount}
                          onChange={(e) => setPettyActualReceivedAmount(Number(e.target.value))}
                          className="w-full px-3 py-1.5 border border-emerald-300 rounded-xl font-mono font-bold text-emerald-900 bg-emerald-50"
                        />
                        <span className="text-[10px] text-emerald-700 block mt-0.5">
                          ยอดเบิกจริงที่จะตัดจากตู้นิรภัยเหรัญญิก
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">กำหนดวันเคลียร์เงิน / ส่งใบเสร็จ *</label>
                        <input
                          type="date"
                          required
                          value={pettyDeadlineDate}
                          onChange={(e) => setPettyDeadlineDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">ผู้อนุมัติการเบิกสำรองจ่าย *</label>
                        <input
                          type="text"
                          required
                          value={approverName}
                          onChange={(e) => setApproverName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                      <input
                        type="text"
                        placeholder="ระบุหมายเหตุหรือเงื่อนไขการเบิกจ่าย (ถ้ามี)"
                        value={withdrawalNotes}
                        onChange={(e) => setWithdrawalNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Purpose 3: Other Approved Purpose (TASK 3 Section 3) */}
                {voucherType === 'other_approved' && (
                  <div className="space-y-3.5 pt-2 border-t border-slate-100">
                    <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-indigo-900 text-xs">
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        <FileText className="w-4 h-4 text-indigo-700" />
                        ข้อกำหนดการเบิกเพื่อวัตถุประสงค์อื่นที่ได้รับอนุมัติ (Other Approved Purpose)
                      </div>
                      <p className="text-[11px] text-indigo-800">
                        • ต้องมีเอกสารหรือมติคณะกรรมการอนุมัติรองรับอย่างเป็นลายลักษณ์อักษร<br />
                        • ห้ามนำยอดนี้ไปรวมเป็นหมวดเงินช่วยเหลือผู้รับซะกาต หรือหมวดค่าใช้จ่ายสำนักงานทั่วไป
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">อ้างอิงมติ / คำสั่งอนุมัติ *</label>
                        <input
                          type="text"
                          required
                          value={otherApprovalRef}
                          onChange={(e) => setOtherApprovalRef(e.target.value)}
                          placeholder="เช่น มติที่ประชุมคณะกรรมการ ครั้งที่ 4/2569 หรือ คำสั่งประธานมูลนิธิ"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">จำนวนเงินที่เบิก (บาท) *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={otherApprovedAmount || ''}
                          onChange={(e) => setOtherApprovedAmount(Number(e.target.value))}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">รายละเอียดวัตถุประสงค์การใช้เงิน *</label>
                      <textarea
                        rows={2}
                        required
                        value={withdrawalPurpose}
                        onChange={(e) => setWithdrawalPurpose(e.target.value)}
                        placeholder="ระบุวัตถุประสงค์และความจำเป็นในการเบิกจ่ายเงินสดครั้งนี้..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Real-time Solvency Check & Balance Indicator (TASK 3 Section 4 Step 2) */}
                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  totalVoucherAmount <= (showWithdrawalModal.availableTreasurerCash || 0)
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-center gap-2">
                    {totalVoucherAmount <= (showWithdrawalModal.availableTreasurerCash || 0) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      <strong>ตรวจสอบยอดเงินสด:</strong>{' '}
                      {totalVoucherAmount <= (showWithdrawalModal.availableTreasurerCash || 0)
                        ? `ยอดเบิก ฿${totalVoucherAmount.toLocaleString()} อยู่ในวงเงินสดคงเหลือ (คงเหลือหลังเบิก: ฿${((showWithdrawalModal.availableTreasurerCash || 0) - totalVoucherAmount).toLocaleString()} บาท)`
                        : `ยอดเบิก ฿${totalVoucherAmount.toLocaleString()} เกินเงินสดในมือเหรัญญิก (ขาดอีก ฿${(totalVoucherAmount - (showWithdrawalModal.availableTreasurerCash || 0)).toLocaleString()} บาท) — บันทึกร่างได้แต่ไม่สามารถยืนยันเบิกจริงได้`}
                    </span>
                  </div>
                </div>

                {/* Common Proof & Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">แนบหลักฐานการเบิก (ถ้ามี)</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], (info) => setWithdrawalProof(info));
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-800 file:font-semibold"
                  />
                  {withdrawalProof && (
                    <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                      ✓ อัปโหลดสำเร็จ: {withdrawalProof.fileName}
                    </span>
                  )}
                </div>

                {/* Footer Action Buttons with 3 Distinct Workflow Actions (TASK 5) */}
                <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawalModal(null)}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    ยกเลิก
                  </button>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || totalVoucherAmount <= 0 || isDuplicateVoucherNo}
                      onClick={() => setVoucherStatus('draft')}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="บันทึกร่าง ไม่ตัดยอดเงินสดในมือเหรัญญิก"
                    >
                      {isSubmitting && voucherStatus === 'draft' ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || totalVoucherAmount <= 0 || isDuplicateVoucherNo}
                      onClick={() => setVoucherStatus('pending')}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white text-xs font-bold cursor-pointer disabled:cursor-not-allowed transition-colors shadow-xs"
                      title="ส่งขออนุมัติ ไม่ตัดยอดเงินสดในมือเหรัญญิก"
                    >
                      {isSubmitting && voucherStatus === 'pending' ? 'กำลังบันทึก...' : 'ส่งตรวจสอบ'}
                    </button>

                    <button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        totalVoucherAmount <= 0 ||
                        isDuplicateVoucherNo ||
                        totalVoucherAmount > (showWithdrawalModal.availableTreasurerCash || 0)
                      }
                      onClick={() => setVoucherStatus('disbursed')}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold cursor-pointer disabled:cursor-not-allowed transition-colors shadow-xs"
                      title={
                        totalVoucherAmount > (showWithdrawalModal.availableTreasurerCash || 0)
                          ? 'ยอดเงินสดคงเหลือไม่เพียงพอ'
                          : 'ยืนยันเบิกเงินสดจริงและตัดยอดเงินสดในมือเหรัญญิก'
                      }
                    >
                      {isSubmitting && voucherStatus === 'disbursed'
                        ? 'กำลังบันทึก...'
                        : `ยืนยันการจ่าย (฿${totalVoucherAmount.toLocaleString()} บาท)`}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL PICKER: เลือกรวมจากรายการอนุมัติจริง (TASK 2 - 3 กลุ่ม A, B, C) */}
      {showApprovedPicker && (() => {
        const readyList = categorizedApps.readyToDisburse.length > 0
          ? categorizedApps.readyToDisburse
          : approvedApplications.filter((a) => {
              const rem = Number(a.remainingAmount ?? ((a.approvedAmount ?? 0) - (a.disbursedAmount ?? 0)));
              return rem > 0 && ['approved', 'wait_disbursement', 'partially_disbursed'].includes(a.status);
            });

        const inProgressList = categorizedApps.inProgress || [];

        const filterFn = (a: any) => {
          if (pickerAsnaf !== 'all' && a.asnafCategory !== pickerAsnaf) return false;
          if (pickerSearch.trim()) {
            const q = pickerSearch.toLowerCase();
            const matchName = (a.beneficiaryName || '').toLowerCase().includes(q);
            const matchApp = (a.applicationNo || '').toLowerCase().includes(q);
            const matchReg = (a.registrationNo || a.registration_no || '').toLowerCase().includes(q);
            const matchType = (a.assistanceType || a.assistance_type || '').toLowerCase().includes(q);
            const matchArea = (a.areaInfo || a.area_info || '').toLowerCase().includes(q);
            const matchDate = (a.approvedDate || a.approved_date || '').toLowerCase().includes(q);
            const matchId = (a.nationalId || '').includes(q);
            if (!matchName && !matchApp && !matchReg && !matchType && !matchArea && !matchDate && !matchId) return false;
          }
          return true;
        };

        const filteredReady = readyList.filter(filterFn);
        const filteredInProgress = inProgressList.filter(filterFn);

        return (
          <ModalPortal>
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-emerald-700" />
                      เลือกคำร้องขอความช่วยเหลือเพื่อเบิกเงินสด (3 กลุ่มสถานะ)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ดึงข้อมูลจริงจากระบบ ZMS แยกคำร้องพร้อมเบิกจ่าย คำร้องอยู่ระหว่างดำเนินการ และคำร้องที่ต้องยื่นใหม่
                    </p>
                  </div>
                  <button
                    onClick={() => setShowApprovedPicker(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Filter & Search Bar */}
                <div className="p-3.5 border-b border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ค้นหาเลขที่คำร้อง, เลขทะเบียน, ชื่อ-สกุลผู้รับ, ปชช, พื้นที่..."
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <select
                      value={pickerAsnaf}
                      onChange={(e) => setPickerAsnaf(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                    >
                      <option value="all">ทุกหมวดอัสนัฟ</option>
                      <option value="faqir_miskin">ฟากีร-มิสกิน (ผู้ยากไร้และขัดสน)</option>
                      <option value="faqir">ฟากีร (ผู้ยากไร้)</option>
                      <option value="miskin">มิสกิน (ผู้ขัดสน)</option>
                      <option value="gharimin">ผู้มีหนี้สิน (อัล-ฆอริมีน)</option>
                      <option value="muallaf">มุอัลลัฟ (ผู้เข้ารับอิสลาม)</option>
                      <option value="amileen">อามิลีน (เจ้าหน้าที่)</option>
                      <option value="fisabilillah">ฟีสะบีลิลลาฮ์ (เพื่อการศาสนา)</option>
                      <option value="ibnsabil">อิบนุสสะบีล (ผู้เดินทาง)</option>
                    </select>
                  </div>
                </div>

                {/* 3 Groups Tab Navigation */}
                <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-2">
                  <button
                    type="button"
                    onClick={() => setPickerActiveGroup('ready')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      pickerActiveGroup === 'ready'
                        ? 'bg-white text-emerald-800 shadow-xs border border-emerald-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>กลุ่ม A: พร้อมเบิกจ่าย</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold">
                      {filteredReady.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPickerActiveGroup('in_progress')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      pickerActiveGroup === 'in_progress'
                        ? 'bg-white text-amber-800 shadow-xs border border-amber-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>กลุ่ม B: อยู่ระหว่างดำเนินการ (ไม่สามารถเบิกได้)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono font-bold">
                      {filteredInProgress.length}
                    </span>
                  </button>
                </div>

                {/* Content Area */}
                <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
                  {/* GROUP A: พร้อมเบิกจ่าย */}
                  {pickerActiveGroup === 'ready' && (
                    <>
                      {filteredReady.length === 0 ? (
                        /* GROUP C: ต้องยื่นคำร้องใหม่ */
                        <div className="p-8 text-center bg-white border border-dashed border-amber-300 rounded-2xl space-y-4 my-2">
                          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">
                              ไม่พบคำร้องที่ได้รับอนุมัติและพร้อมเบิกจ่าย กรุณายื่นคำร้องขอความช่วยเหลือก่อน
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                              บุคคลที่ค้นหาหรือในหมวดหมู่นี้ ยังไม่มีคำร้องที่ผ่านการอนุมัติวงเงินช่วยเหลือและพร้อมเบิกจ่ายในระบบ
                            </p>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowApprovedPicker(false);
                                if (onNavigate) {
                                  onNavigate('assistance-requests');
                                } else {
                                  showToast('กรุณาไปที่เมนู "ยื่นคำร้องขอความช่วยเหลือ" เพื่อสร้างคำร้องใหม่', 'info');
                                }
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                            >
                              <ArrowRight className="w-4 h-4" />
                              ไปหน้ายื่นคำร้องขอความช่วยเหลือ
                            </button>
                          </div>
                        </div>
                      ) : (
                        filteredReady.map((app) => {
                          const isAlreadyAdded = aidItems.some((item) => item.applicationId === app.id);
                          const approvedAmt = Number(app.approvedAmount ?? app.approved_amount ?? 0);
                          const disbursedAmt = Number(app.disbursedAmount ?? app.disbursed_amount ?? 0);
                          const remaining = Number(app.remainingAmount ?? app.remaining_amount ?? (approvedAmt - disbursedAmt));
                          const regNo = app.registrationNo || app.registration_no || '-';
                          const dateAppr = app.approvedDate || app.approved_date || '-';

                          return (
                            <div
                              key={app.id}
                              className={`p-4 rounded-2xl border transition-all ${
                                isAlreadyAdded
                                  ? 'bg-slate-100/70 border-slate-200 opacity-70'
                                  : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-xs'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1.5 flex-1">
                                  {/* Row 1: Name and Badges */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-900 text-sm">{app.beneficiaryName}</span>
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                                      ทะเบียน: {regNo}
                                    </span>
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                      คำร้อง: {app.applicationNo}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-medium border border-sky-200">
                                      {app.assistanceType || app.assistance_type || 'เงินช่วยเหลือยังชีพ'}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-medium border border-purple-200">
                                      {app.asnafCategory === 'faqir_miskin' ? 'ฟากีร-มิสกิน' : app.asnafCategory || 'ซะกาต'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                      พร้อมเบิกจ่าย
                                    </span>
                                  </div>

                                  {/* Row 2: Area, Approval Date, National ID */}
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span>พื้นที่: <strong className="text-slate-700 font-medium">{app.areaInfo || app.area_info || 'ปัตตานี'}</strong></span>
                                    <span>อนุมัติเมื่อ: <strong className="text-slate-700 font-medium">{dateAppr}</strong></span>
                                    <span>ปชช: <span className="font-mono text-slate-600">{app.nationalId}</span></span>
                                  </div>

                                  {/* Row 3: Financial Progress */}
                                  <div className="flex flex-wrap items-center gap-x-4 text-xs pt-1">
                                    <span className="text-slate-600">ยอดอนุมัติ: <strong className="font-mono text-slate-800 font-bold">฿{approvedAmt.toLocaleString()}</strong></span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-600">จ่ายแล้ว: <strong className="font-mono text-slate-600">฿{disbursedAmt.toLocaleString()}</strong></span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-emerald-800 font-bold">
                                      คงเหลือรอจ่าย: <strong className="font-mono text-emerald-900 text-sm">฿{remaining.toLocaleString()} บาท</strong>
                                    </span>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAppDetailModal(app)}
                                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                                    ดูรายละเอียด
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isAlreadyAdded || remaining <= 0 || isValidatingSelection}
                                    onClick={() => handleSelectApprovedApp(app)}
                                    className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold cursor-pointer disabled:cursor-not-allowed transition-colors shadow-xs flex items-center gap-1"
                                  >
                                    {isAlreadyAdded ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        เลือกแล้ว
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3.5 h-3.5" />
                                        เลือกเพื่อเบิกเงิน
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* GROUP B: อยู่ระหว่างดำเนินการ (ไม่สามารถเบิกได้ พร้อมแสดงเหตุผลชัดเจน) */}
                  {pickerActiveGroup === 'in_progress' && (
                    <>
                      {filteredInProgress.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                          ไม่พบคำร้องที่อยู่ระหว่างดำเนินการ
                        </div>
                      ) : (
                        filteredInProgress.map((app) => {
                          const requestedAmt = Number(app.requestedAmount ?? 0);
                          const approvedAmt = Number(app.approvedAmount ?? 0);
                          const dateAppr = app.approvedDate || app.approved_date || '-';

                          return (
                            <div
                              key={app.id}
                              className="p-4 rounded-2xl border border-slate-200 bg-white opacity-85 hover:opacity-100 transition-all space-y-2.5"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-800 text-sm">{app.beneficiaryName}</span>
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                      คำร้อง: {app.applicationNo}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                                      สถานะ: {app.status}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                      {app.assistanceType || 'เงินช่วยเหลือยังชีพ'}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-4 text-xs text-slate-500">
                                    <span>พื้นที่: <strong className="text-slate-700">{app.areaInfo || 'ปัตตานี'}</strong></span>
                                    <span>ยอดขอรับ: <strong className="font-mono text-slate-700">฿{requestedAmt.toLocaleString()}</strong></span>
                                    {approvedAmt > 0 && <span>ยอดอนุมัติ: <strong className="font-mono text-slate-700">฿{approvedAmt.toLocaleString()}</strong></span>}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAppDetailModal(app)}
                                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                                    ดูรายละเอียด
                                  </button>

                                  <button
                                    type="button"
                                    disabled
                                    className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-400 text-xs font-bold cursor-not-allowed flex items-center gap-1"
                                    title={`ไม่สามารถเบิกได้: ${app.blockReason || 'อยู่ระหว่างดำเนินการ'}`}
                                  >
                                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                                    ไม่สามารถเบิกได้
                                  </button>
                                </div>
                              </div>

                              {/* Prominent Block Reason Box (TASK 2 Requirement) */}
                              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                                <span>
                                  <strong>เหตุผลที่ยังไม่สามารถเบิกได้:</strong> {app.blockReason || 'อยู่ระหว่างการดำเนินการตามขั้นตอนของระบบ'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-slate-600">
                    เลือกไว้ในใบสำคัญแล้ว: <strong className="font-mono text-emerald-800 font-bold">{aidItems.length} รายการ</strong> (ยอดรวม ฿{totalVoucherAmount.toLocaleString()} บาท)
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowApprovedPicker(false)}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        );
      })()}

      {/* MODAL: รายละเอียดคำร้องขอความช่วยเหลือ (TASK 2: ปุ่มดูรายละเอียด) */}
      {selectedAppDetailModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-fadeIn">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    รายละเอียดคำร้องขอความช่วยเหลือ
                  </h3>
                  <p className="font-mono text-xs text-slate-500">
                    เลขที่: {selectedAppDetailModal.applicationNo} • ทะเบียน: {selectedAppDetailModal.registrationNo || '-'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAppDetailModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                {/* Beneficiary Header */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 text-sm">{selectedAppDetailModal.beneficiaryName}</div>
                  <div className="text-slate-500 flex gap-2">
                    <span>ปชช: <strong className="font-mono text-slate-700">{selectedAppDetailModal.nationalId}</strong></span>
                    <span>•</span>
                    <span>โทร: <strong className="text-slate-700">{selectedAppDetailModal.phone || '-'}</strong></span>
                  </div>
                  <div className="text-slate-500">
                    พื้นที่: <strong className="text-slate-700">{selectedAppDetailModal.areaInfo || 'ปัตตานี'}</strong>
                  </div>
                </div>

                {/* Financial Progress */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">ยอดอนุมัติ</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ฿{(selectedAppDetailModal.approvedAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">จ่ายแล้ว</span>
                    <span className="font-mono font-bold text-slate-600 text-sm">
                      ฿{(selectedAppDetailModal.disbursedAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-bold block">คงเหลือรอเบิก</span>
                    <span className="font-mono font-bold text-emerald-900 text-sm">
                      ฿{(selectedAppDetailModal.remainingAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Category & Status */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">หมวดอัสนัฟ:</span>
                    <span className="font-semibold text-slate-800">{selectedAppDetailModal.asnafCategory || 'ฟากีร-มิสกิน'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ประเภทความช่วยเหลือ:</span>
                    <span className="font-semibold text-slate-800">{selectedAppDetailModal.assistanceType || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">วันที่อนุมัติ:</span>
                    <span className="font-semibold text-slate-800">{selectedAppDetailModal.approvedDate || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">สถานะปัจจุบัน:</span>
                    <span className="font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100">
                      {selectedAppDetailModal.status}
                    </span>
                  </div>
                </div>

                {/* Necessity Details / Notes */}
                {selectedAppDetailModal.necessityDetails && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-semibold block mb-1">ความจำเป็น / วัตถุประสงค์:</span>
                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-700 leading-relaxed border border-slate-200">
                      {selectedAppDetailModal.necessityDetails}
                    </div>
                  </div>
                )}

                {selectedAppDetailModal.approvalNotes && (
                  <div className="pt-1">
                    <span className="text-slate-500 font-semibold block mb-1">มติ / บันทึกคณะกรรมการ:</span>
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 text-emerald-900 leading-relaxed border border-emerald-200/80">
                      {selectedAppDetailModal.approvalNotes}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAppDetailModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: เคลียร์เงินสำรองจ่ายสำนักงาน (TASK 6 - Itemized Clearance) */}

      {/* MODAL: เคลียร์เงินสำรองจ่ายสำนักงาน (TASK 6 - Itemized Clearance) */}
      {showClearPettyModal && (() => {
        const receivedAmt = Number(showClearPettyModal.withdrawal.actualReceivedAmount || showClearPettyModal.withdrawal.amount || 0);
        const totalSpent = clearanceItems.length > 0
          ? clearanceItems.reduce((acc, it) => acc + Number(it.amount || 0), 0)
          : Number(clearanceSpentAmount || 0);
        const returnAmt = Math.max(0, receivedAmt - totalSpent);
        const excessAmt = totalSpent > receivedAmt ? totalSpent - receivedAmt : 0;

        return (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        เคลียร์เงินสำรองจ่ายสำนักงาน — ใบสำคัญ {showClearPettyModal.withdrawal.withdrawalNo}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        บันทึกรายการค่าใช้จ่ายจริงแต่ละรายการ แนบใบเสร็จ คืนเงินสดส่วนเกิน และกระทบยอด
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowClearPettyModal(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                </div>

                <form onSubmit={handleSubmitClearPetty} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                  {/* Financial Summary Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">1. เงินที่ได้รับจริง (Advance)</span>
                      <span className="text-base font-extrabold font-mono text-slate-900">
                        ฿{receivedAmt.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200">
                      <span className="text-[10px] text-blue-700 block">2. รวมจ่ายจริงตามใบเสร็จ</span>
                      <span className="text-base font-extrabold font-mono text-blue-900">
                        ฿{totalSpent.toLocaleString()}
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl border ${returnAmt > 0
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                      <span className="text-[10px] text-slate-500 block">3. เงินคงเหลือส่งคืนเหรัญญิก</span>
                      <span className="text-base font-extrabold font-mono text-emerald-800">
                        ฿{returnAmt.toLocaleString()}
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl border ${excessAmt > 0
                        ? 'bg-rose-50 border-rose-300 text-rose-950'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                      <span className="text-[10px] text-slate-500 block">4. จ่ายเกินเงินที่ได้รับ (ส่วนต่าง)</span>
                      <span className={`text-base font-extrabold font-mono ${excessAmt > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                        {excessAmt > 0 ? `+฿${excessAmt.toLocaleString()}` : '฿0'}
                      </span>
                    </div>
                  </div>

                  {/* Overspent Warning & Policy Approval Box */}
                  {excessAmt > 0 && (
                    <div className="p-3.5 bg-rose-50/90 rounded-xl border border-rose-200 space-y-2.5">
                      <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>แจ้งเตือน: ค่าใช้จ่ายจริงเกินกว่าเงินที่ได้รับ (ส่วนต่าง ฿{excessAmt.toLocaleString()} บาท)</span>
                      </div>
                      <p className="text-[11px] text-rose-800">
                        ตามนโยบายมูลนิธิ: <strong>ห้ามบันทึกเงินคืนติดลบโดยไม่มีการชี้แจง</strong> กรุณาระบุเหตุผลชี้แจงเพื่อขออนุมัติเบิกจ่ายชดเชยส่วนต่างตามระเบียบ
                      </p>
                      <div>
                        <label className="block font-bold text-rose-900 mb-1 text-[11px]">
                          เหตุผลชี้แจงค่าใช้จ่ายส่วนเกิน (Overspent Reason) *
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={clearanceOverspentReason}
                          onChange={(e) => setClearanceOverspentReason(e.target.value)}
                          placeholder="ระบุเหตุผลความจำเป็นของค่าใช้จ่ายส่วนเกิน เช่น มีงานเร่งด่วนนอกแผนงาน หรือราคาน้ำมันปรับสูงขึ้น..."
                          className="w-full px-3 py-1.5 border border-rose-300 rounded-xl bg-white text-xs text-rose-950"
                        />
                      </div>
                      <label className="inline-flex items-center gap-2 text-rose-900 font-bold text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={clearanceOverspentApproved}
                          onChange={(e) => setClearanceOverspentApproved(e.target.checked)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>ได้รับการอนุมัติส่วนต่างตามนโยบายมูลนิธิแล้ว (โดยผู้มีอำนาจอนุมัติ)</span>
                      </label>
                    </div>
                  )}

                  {/* Itemized Clearance Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                        รายการค่าใช้จ่ายจริงแต่ละรายการ (Itemized Receipts) *
                      </div>
                      <button
                        type="button"
                        onClick={handleAddClearanceItem}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> + เพิ่มรายการค่าใช้จ่าย
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="py-2 px-2 text-center w-8">#</th>
                            <th className="py-2 px-2.5 w-32">วันที่จ่ายจริง</th>
                            <th className="py-2 px-2.5 w-48">หมวดค่าใช้จ่าย</th>
                            <th className="py-2 px-3">รายละเอียดค่าใช้จ่าย</th>
                            <th className="py-2 px-2.5 w-32 text-right">จำนวนเงิน (บาท)</th>
                            <th className="py-2 px-2.5 w-44">ใบเสร็จ/หลักฐาน</th>
                            <th className="py-2 px-2 text-center w-10">ลบ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {clearanceItems.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50">
                              <td className="py-2 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2 px-2.5">
                                <input
                                  type="date"
                                  required
                                  value={item.expenseDate}
                                  onChange={(e) => handleUpdateClearanceItem(idx, 'expenseDate', e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white"
                                />
                              </td>
                              <td className="py-2 px-2.5">
                                <select
                                  value={item.categoryCode || showClearPettyModal.withdrawal.expenseCategory || 'OFFICE_EXPENSES'}
                                  onChange={(e) => handleUpdateClearanceItem(idx, 'categoryCode', e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white font-medium"
                                >
                                  {activeCategories.map((c) => (
                                    <option key={c.code} value={c.code}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  required
                                  placeholder="เช่น ค่าน้ำมัน ปตท. ทะเบียน กข-1234"
                                  value={item.description}
                                  onChange={(e) => handleUpdateClearanceItem(idx, 'description', e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white"
                                />
                              </td>
                              <td className="py-2 px-2.5">
                                <input
                                  type="number"
                                  required
                                  min={0.01}
                                  step="0.01"
                                  value={item.amount || ''}
                                  onChange={(e) => handleUpdateClearanceItem(idx, 'amount', Number(e.target.value))}
                                  className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono font-bold text-right bg-white text-slate-900"
                                />
                              </td>
                              <td className="py-2 px-2.5">
                                <input
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleFileUpload(e.target.files[0], (info) => {
                                        handleUpdateClearanceItem(idx, 'receiptUrl', info.fileUrl);
                                        handleUpdateClearanceItem(idx, 'receiptName', info.fileName);
                                        handleUpdateClearanceItem(idx, 'receiptSize', info.fileSize);
                                        handleUpdateClearanceItem(idx, 'receiptType', info.mimeType);
                                      });
                                    }
                                  }}
                                  className="w-full text-[10px] text-slate-500 file:mr-1 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-slate-100 file:text-slate-700"
                                />
                                {item.receiptName && (
                                  <span className="text-[10px] text-emerald-700 font-semibold block truncate">
                                    ✓ {item.receiptName}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {clearanceItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveClearanceItem(idx)}
                                    className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                                    title="ลบรายการนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                            <td colSpan={4} className="py-2.5 px-3 text-right text-slate-700">
                              รวมยอดค่าใช้จ่ายจริง ({clearanceItems.length} รายการ):
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-blue-900 font-extrabold">
                              ฿{totalSpent.toLocaleString()}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Return Details & Inspector Audit */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">วันที่ส่งคืนเงินสด *</label>
                      <input
                        type="date"
                        required
                        value={clearanceReturnDate}
                        onChange={(e) => setClearanceReturnDate(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">วันที่บันทึกเคลียร์เงิน *</label>
                      <input
                        type="date"
                        required
                        value={clearanceDate}
                        onChange={(e) => setClearanceDate(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">เหรัญญิกผู้รับคืน / ผู้ตรวจสอบ *</label>
                      <input
                        type="text"
                        readOnly
                        value={step2TreasurerName}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-100 font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Proof Attachment & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">แนบใบเสร็จรวม / หลักฐานประกอบ</label>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0], (info) => setClearanceProof(info));
                          }
                        }}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-800 file:font-semibold"
                      />
                      {clearanceProof && (
                        <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                          ✓ อัปโหลดสำเร็จ: {clearanceProof.fileName}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">หมายเหตุการเคลียร์เงิน</label>
                      <input
                        type="text"
                        value={clearanceNotes}
                        onChange={(e) => setClearanceNotes(e.target.value)}
                        placeholder="ระบุหมายเหตุ เช่น ใบเสร็จครบถ้วน ส่งคืนเงินสดเข้าตู้นิรภัยเรียบร้อย"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowClearPettyModal(null)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || (excessAmt > 0 && !clearanceOverspentReason.trim())}
                      className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      {isSubmitting ? 'กำลังบันทึก...' : `ยืนยันเคลียร์เงิน (คืน ฿${returnAmt.toLocaleString()} บาท)`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </ModalPortal>
        );
      })()}

      {/* MODAL: จัดการหมวดค่าใช้จ่ายบริหาร (Admin Expense Categories) */}
      {showCategoryModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-700" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      จัดการหมวดค่าใช้จ่ายบริหารและสำรองจ่ายสำนักงาน (Admin Expense Categories)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      ผู้ดูแลที่มีสิทธิ์สามารถเพิ่ม แก้ไข หรือเปิด/ปิดใช้งานหมวดค่าใช้จ่ายได้
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                {/* Form to add new category */}
                <form onSubmit={handleCreateCategory} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-emerald-700" />
                    เพิ่มหมวดค่าใช้จ่ายใหม่
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">รหัสหมวด (เช่น OFFICE_NEW) *</label>
                      <input
                        type="text"
                        required
                        placeholder="OFFICE_SUPPLIES"
                        value={newCatCode}
                        onChange={(e) => setNewCatCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono uppercase bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อหมวดค่าใช้จ่าย *</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น วัสดุสิ้นเปลืองสำนักงาน"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">กลุ่มค่าใช้จ่าย</label>
                      <select
                        value={newCatGroup}
                        onChange={(e) => setNewCatGroup(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="ดำเนินงาน">ดำเนินงาน</option>
                        <option value="บุคลากร">บุคลากร</option>
                        <option value="ยานพาหนะ">ยานพาหนะ</option>
                        <option value="สาธารณูปโภค">สาธารณูปโภค</option>
                        <option value="วิชาชีพ">วิชาชีพ</option>
                        <option value="สวัสดิการ">สวัสดิการ</option>
                        <option value="ทั่วไป">ทั่วไป</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting || !newCatCode.trim() || !newCatName.trim()}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                    >
                      + เพิ่มหมวดค่าใช้จ่าย
                    </button>
                  </div>
                </form>

                {/* Categories Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                        <th className="py-2.5 px-3">รหัสหมวด</th>
                        <th className="py-2.5 px-3">ชื่อหมวดค่าใช้จ่าย</th>
                        <th className="py-2.5 px-3">กลุ่ม</th>
                        <th className="py-2.5 px-3 text-center">สถานะ</th>
                        <th className="py-2.5 px-3 text-center w-28">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(categoryList.length > 0 ? categoryList : activeCategories).map((cat, idx) => {
                        const isEditing = editingCatId === cat.id;
                        const isCatActive = cat.isActive !== false;

                        return (
                          <tr key={cat.id || cat.code} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{cat.code}</td>
                            <td className="py-2 px-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editCatName}
                                  onChange={(e) => setEditCatName(e.target.value)}
                                  className="w-full px-2 py-1 border border-emerald-400 rounded bg-white text-xs"
                                  autoFocus
                                />
                              ) : (
                                <span className={!isCatActive ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                                  {cat.name}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                {cat.expenseGroup || cat.groupName || 'ทั่วไป'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isCatActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                {isCatActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCategory(cat.id)}
                                      className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 cursor-pointer"
                                    >
                                      บันทึก
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCatId(null)}
                                      className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px] hover:bg-slate-300 cursor-pointer"
                                    >
                                      ยกเลิก
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCatId(cat.id);
                                        setEditCatName(cat.name);
                                        setEditCatLimit(cat.budgetLimit || 0);
                                      }}
                                      className="p-1 text-slate-500 hover:text-emerald-700 rounded hover:bg-slate-100 cursor-pointer"
                                      title="แก้ไขชื่อหมวด"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleCategory(cat.id, isCatActive)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${isCatActive
                                          ? 'text-rose-600 hover:bg-rose-50'
                                          : 'text-emerald-600 hover:bg-emerald-50'
                                        }`}
                                    >
                                      {isCatActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 5: STEP 5 ตรวจสอบและปิดรอบรายการ (TASK 5) */}
      {showStep5Modal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Modal Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <ShieldCheck className="w-5 h-5 text-purple-700" />
                      ขั้นตอนที่ 5: ตรวจสอบและปิด Workflow ฝาก–เบิกเงินสด ({showStep5Modal.workflowNo})
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${showStep5Modal.overallStatus === 'completed' || auditSummary?.isClosed
                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                      {showStep5Modal.overallStatus === 'completed' || auditSummary?.isClosed ? (
                        <>
                          <Lock className="w-3 h-3 text-purple-700" />
                          ปิดรอบสมบูรณ์แล้ว (Locked)
                        </>
                      ) : (
                        'กำลังตรวจสอบความสมบูรณ์'
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    หน้าสรุปและตรวจสอบยอดเงินของ Workflow จากธุรกรรมจริงทุกขั้นตอนตามหลักธรรมาภิบาล
                  </p>
                </div>
                <button
                  onClick={() => setShowStep5Modal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                {isLoadingAudit ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
                    <p className="text-slate-500 font-medium">กำลังคำนวณและกระทบยอดเงินจากธุรกรรมจริงทุกขั้นตอน...</p>
                  </div>
                ) : (
                  <>
                    {/* SECTION 1: 12 ข้อมูลสรุปและตรวจสอบยอดเงิน */}
                    <div>
                      <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                        <span>12 รายการข้อมูลสรุปและตรวจสอบยอดเงินจริง</span>
                        <span className="text-[10px] text-slate-400 font-normal">คำนวณสดจากฐานข้อมูลธุรกรรม</span>
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {/* 1. ยอดถอนจากธนาคาร */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block">1. ยอดถอนจากธนาคาร</span>
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            ฿{(auditSummary?.bankWithdrawAmount ?? showStep5Modal.step1WithdrawAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-400">Step 1 ถอนจริง</span>
                        </div>

                        {/* 2. ยอดส่งมอบ */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block">2. ยอดส่งมอบ</span>
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            ฿{(auditSummary?.handoverAmount ?? showStep5Modal.step2HandoverAmount ?? showStep5Modal.step1WithdrawAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-400">Step 2 นำส่งเหรัญญิก</span>
                        </div>

                        {/* 3. ยอดรับจริงโดยเหรัญญิก */}
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-0.5">
                          <span className="text-[10px] text-emerald-800 font-semibold block">3. ยอดรับจริงโดยเหรัญญิก</span>
                          <span className="font-mono font-bold text-emerald-900 text-sm block">
                            ฿{(auditSummary?.treasurerReceivedAmount ?? showStep5Modal.step2DepositAmount ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-emerald-600">นายรุสลัน หะสาเมาะ</span>
                        </div>

                        {/* 4. ยอดเบิกเงินสดจริง */}
                        <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-0.5">
                          <span className="text-[10px] text-sky-800 font-semibold block">4. ยอดเบิกเงินสดจริง</span>
                          <span className="font-mono font-bold text-sky-900 text-sm block">
                            ฿{(auditSummary?.actualWithdrawnAmount ?? showStep5Modal.totalCashWithdrawn ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-sky-600">Step 3 ใบสำคัญเบิก</span>
                        </div>

                        {/* 5. ยอดจ่ายช่วยเหลือที่ยืนยันแล้ว */}
                        <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-0.5">
                          <span className="text-[10px] text-teal-800 font-semibold block">5. จ่ายช่วยที่ยืนยันแล้ว</span>
                          <span className="font-mono font-bold text-teal-900 text-sm block">
                            ฿{(auditSummary?.confirmedAidAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-teal-600">Step 4 แจกจ่ายจริง</span>
                        </div>

                        {/* 6. ยอดค่าใช้จ่ายอื่นที่เกี่ยวข้อง */}
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-0.5">
                          <span className="text-[10px] text-amber-800 font-semibold block">6. ค่าใช้จ่ายอื่นที่เคลียร์แล้ว</span>
                          <span className="font-mono font-bold text-amber-900 text-sm block">
                            ฿{(auditSummary?.confirmedOtherExpenseAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-amber-600">เงินสำรองจ่ายสำนักงาน</span>
                        </div>

                        {/* 7. ยอดเงินสดคงเหลือ */}
                        <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-300 space-y-0.5">
                          <span className="text-[10px] text-purple-900 font-bold block">7. ยอดเงินสดคงเหลือ</span>
                          <span className="font-mono font-extrabold text-purple-900 text-sm block">
                            ฿{(auditSummary?.remainingCashAmount ?? showStep5Modal.availableTreasurerCash ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-purple-700">ส่งคืนเหรัญญิก/ธนาคาร</span>
                        </div>

                        {/* 8. ยอดที่ยังไม่ระบุการใช้จ่าย */}
                        <div className={`p-2.5 rounded-xl border space-y-0.5 ${(auditSummary?.unallocatedAmount || 0) > 0
                            ? 'bg-rose-50 border-rose-300'
                            : 'bg-slate-50 border-slate-200'
                          }`}>
                          <span className={`text-[10px] font-semibold block ${(auditSummary?.unallocatedAmount || 0) > 0 ? 'text-rose-800' : 'text-slate-500'
                            }`}>
                            8. ยังไม่ระบุการใช้จ่าย
                          </span>
                          <span className={`font-mono font-bold text-sm block ${(auditSummary?.unallocatedAmount || 0) > 0 ? 'text-rose-900' : 'text-slate-900'
                            }`}>
                            ฿{(auditSummary?.unallocatedAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-400">ต้องเป็น 0 ก่อนปิด</span>
                        </div>

                        {/* 9. จำนวนใบสำคัญ */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block">9. จำนวนใบสำคัญ</span>
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            {(auditSummary?.voucherCount || showStep5Modal.withdrawals?.length || 0)} ฉบับ
                          </span>
                          <span className="text-[9px] text-slate-400">ใบสำคัญเบิกทั้งหมด</span>
                        </div>

                        {/* 10. จำนวนเคสช่วยเหลือ */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block">10. จำนวนเคสช่วยเหลือ</span>
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            {(auditSummary?.assistanceCaseCount || 0)} เคส
                          </span>
                          <span className="text-[9px] text-slate-400">ผู้รับซะกาตที่ยืนยัน</span>
                        </div>

                        {/* 11. จำนวนรายการรอตรวจสอบ */}
                        <div className={`p-2.5 rounded-xl border space-y-0.5 ${(auditSummary?.pendingItemCount || 0) > 0
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-slate-50 border-slate-200'
                          }`}>
                          <span className={`text-[10px] font-semibold block ${(auditSummary?.pendingItemCount || 0) > 0 ? 'text-amber-800' : 'text-slate-500'
                            }`}>
                            11. รายการรอตรวจสอบ
                          </span>
                          <span className={`font-mono font-bold text-sm block ${(auditSummary?.pendingItemCount || 0) > 0 ? 'text-amber-900' : 'text-slate-900'
                            }`}>
                            {(auditSummary?.pendingItemCount || 0)} รายการ
                          </span>
                          <span className="text-[9px] text-slate-400">ร่าง/รออนุมัติ/ยังไม่เคลียร์</span>
                        </div>

                        {/* 12. จำนวนเอกสารที่ยังขาด */}
                        <div className={`p-2.5 rounded-xl border space-y-0.5 ${(auditSummary?.missingProofCount || 0) > 0
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-slate-50 border-slate-200'
                          }`}>
                          <span className={`text-[10px] font-semibold block ${(auditSummary?.missingProofCount || 0) > 0 ? 'text-amber-800' : 'text-slate-500'
                            }`}>
                            12. เอกสารที่ยังขาด
                          </span>
                          <span className={`font-mono font-bold text-sm block ${(auditSummary?.missingProofCount || 0) > 0 ? 'text-amber-900' : 'text-slate-900'
                            }`}>
                            {(auditSummary?.missingProofCount || 0)} ฉบับ
                          </span>
                          <span className="text-[9px] text-slate-400">สลิป/หลักฐานที่ยังไม่แนบ</span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: สูตรกระทบยอดและตรวจสอบส่วนต่าง */}
                    <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 space-y-1.5 text-xs">
                      <div className="font-bold text-purple-950 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-700" />
                        ความสัมพันธ์ของรายการและยอดเงินสดคงเหลือ (Reconciliation Formula)
                      </div>
                      <div className="text-[11px] text-purple-900 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          • เงินสดคงเหลือเหรัญญิก = ยอดรับจริง (฿{(auditSummary?.treasurerReceivedAmount || 0).toLocaleString()}) - ยอดเบิกจริง (฿{(auditSummary?.actualWithdrawnAmount || 0).toLocaleString()}) + คืนเงินสำรอง (฿{(auditSummary?.totalPettyReturnedAmount || 0).toLocaleString()}) = <strong className="font-mono">฿{(auditSummary?.remainingCashAmount || 0).toLocaleString()} บาท</strong>
                        </div>
                        <div>
                          • ยอดใช้จ่ายที่ยืนยันแล้ว = ช่วยเหลือ (฿{(auditSummary?.confirmedAidAmount || 0).toLocaleString()}) + ค่าใช้จ่ายสำนักงาน (฿{(auditSummary?.confirmedOtherExpenseAmount || 0).toLocaleString()}) = <strong className="font-mono">฿{((auditSummary?.confirmedAidAmount || 0) + (auditSummary?.confirmedOtherExpenseAmount || 0)).toLocaleString()} บาท</strong>
                        </div>
                      </div>

                      {/* Discrepancy Alerts if any */}
                      {auditSummary?.discrepancies && auditSummary.discrepancies.length > 0 && (
                        <div className="mt-2 p-2.5 bg-amber-50 rounded-lg border border-amber-300 space-y-1 text-amber-900">
                          <span className="font-bold flex items-center gap-1 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            รายการที่มีส่วนต่างและเหตุผลประกอบ:
                          </span>
                          {auditSummary.discrepancies.map((d, i) => (
                            <div key={i} className="text-[11px] pl-4 border-l-2 border-amber-400">
                              <div><strong>{d.stage}:</strong> {d.description} (ส่วนต่าง ฿{Math.abs(d.difference).toLocaleString()} บาท)</div>
                              <div>เหตุผล: <span className="italic">{d.reason || 'ยังไม่มีการระบุเหตุผล'}</span> • สถานะ: <strong className={d.isApproved ? 'text-emerald-700' : 'text-rose-700'}>{d.isApproved ? '✓ อนุมัติแล้ว' : '⚠️ ยังไม่ได้รับการอนุมัติ'}</strong></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: ผลการตรวจสอบกฎการปิดรายการ (Rules Assessment) */}
                    {auditSummary && (
                      <div className="space-y-2">
                        {auditSummary.validationErrors.length > 0 && (
                          <div className="p-3 bg-rose-50 rounded-xl border border-rose-300 text-rose-900 space-y-1">
                            <span className="font-bold text-xs flex items-center gap-1.5 text-rose-800">
                              <AlertCircle className="w-4 h-4 text-rose-600" />
                              ห้ามปิด Workflow เนื่องจากพบข้อผิดพลาดสำคัญหรือยอดที่ยังไม่ได้ระบุ (กฎข้อ 6):
                            </span>
                            <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-1">
                              {auditSummary.validationErrors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {auditSummary.validationWarnings.length > 0 && (
                          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                            <span className="font-bold text-[11px] flex items-center gap-1 text-amber-800">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              ข้อสังเกตเอกสารประกอบ:
                            </span>
                            <ul className="list-disc list-inside text-[10px] space-y-0.5 pl-1">
                              {auditSummary.validationWarnings.map((warn, idx) => (
                                <li key={idx}>{warn}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {auditSummary.canClose && (
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-900 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-xs">
                              ผ่านการตรวจสอบความถูกต้องครบถ้วนทุกขั้นตอน พร้อมสำหรับการปิดรอบรายการและล็อกประวัติการเงิน
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SECTION 4: บันทึกการปิดรายการหรือแสดงผลการปิดที่ล็อกแล้ว */}
                    {showStep5Modal.overallStatus === 'completed' || auditSummary?.isClosed ? (
                      /* LOCKED CLOSED VIEW (Rule 9) */
                      <div className="p-4 bg-slate-50 rounded-xl border border-purple-300 space-y-3">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-purple-700" />
                          <span className="font-bold text-purple-950 text-xs">
                            บันทึกการปิดรอบรายการที่สมบูรณ์แล้ว (Audit Trail Locked)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 block text-[10px]">ผู้ตรวจสอบและปิดรายการ:</span>
                            <strong className="text-slate-900">{auditSummary?.closedByName || showStep5Modal.step5AuditorName || '-'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">วันเวลาที่ปิดรอบ:</span>
                            <strong className="text-slate-900">{auditSummary?.closedAt || showStep5Modal.step5ClosedAt || '-'}</strong>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500 block text-[10px]">บันทึกและหมายเหตุการปิดรอบ:</span>
                            <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 mt-0.5">
                              {auditSummary?.closureNotes || showStep5Modal.step5Notes || 'ไม่มีบันทึกเพิ่มเติม'}
                            </p>
                          </div>
                        </div>

                        {(auditSummary?.closureProofUrl || showStep5Modal.step5ProofUrl) && (
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-slate-600 text-[11px]">เอกสารหลักฐานการปิดรอบ:</span>
                            <button
                              type="button"
                              onClick={() => setPreviewFile({
                                fileName: showStep5Modal.step5ProofName || 'เอกสารปิดรอบ.pdf',
                                fileUrl: (auditSummary?.closureProofUrl || showStep5Modal.step5ProofUrl)!,
                                mimeType: showStep5Modal.step5ProofType || 'application/pdf',
                              })}
                              className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              ดูเอกสารปิดรอบ
                            </button>
                          </div>
                        )}

                        <div className="p-2 bg-purple-100/60 rounded-lg text-[10px] text-purple-900 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                          รายการที่ปิดแล้วได้รับการล็อกป้องกันการแก้ไขย้อนหลังโดยไม่มีขั้นตอนปรับปรุงที่ตรวจสอบได้ตามมาตรฐาน
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowStep5Modal(null)}
                            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer"
                          >
                            ปิดหน้าต่าง
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ACTIVE CLOSURE FORM (Rules 7 & 8) */
                      <form onSubmit={handleSubmitStep5} className="space-y-3 pt-2 border-t border-slate-200">
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-purple-700" />
                          การยืนยันและบันทึกปิดรอบรายการ (ผู้มีสิทธิ์: Super Admin / Executive / Finance)
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">วันที่และเวลาปิดรอบ *</label>
                            <input
                              type="datetime-local"
                              required
                              value={step5EventDatetime}
                              onChange={(e) => setStep5EventDatetime(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 mb-1">ผู้ตรวจสอบและยืนยันปิดรอบ *</label>
                            <input
                              type="text"
                              required
                              value={step5AuditorName}
                              onChange={(e) => setStep5AuditorName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">แนบหลักฐานการส่งคืนเงินสด / เอกสารกระทบยอด</label>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileUpload(e.target.files[0], (info) => setStep5Proof(info));
                              }
                            }}
                            className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-purple-50 file:text-purple-800 file:font-semibold"
                          />
                          {step5Proof && (
                            <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                              ✓ อัปโหลดสำเร็จ: {step5Proof.fileName}
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">หมายเหตุและบันทึกการตรวจสอบ *</label>
                          <textarea
                            rows={2}
                            required
                            value={step5Notes}
                            onChange={(e) => setStep5Notes(e.target.value)}
                            placeholder="ระบุข้อความสรุปการตรวจสอบและการส่งคืนเงินสดคงเหลือ..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                          />
                        </div>

                        <div className="pt-3 border-t flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowStep5Modal(null)}
                            className="min-h-[44px] px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer transition-colors"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || (auditSummary !== null && !auditSummary.canClose)}
                            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold cursor-pointer inline-flex items-center gap-2 shadow-xs transition-colors"
                          >
                            <Lock className="w-4 h-4" />
                            {isSubmitting
                              ? 'กำลังบันทึกและล็อก...'
                              : `ยืนยันปิดรอบและล็อกรายการ (ส่งคืน ฿${(step5RemainingCash || 0).toLocaleString()} บาท)`}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* =========================================================================
         MODAL: RECORD FINANCE HANDOVER TO CASE WORKER (TASK 1)
         ========================================================================= */}
      {showHandoverModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-fadeIn">
              {/* Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    ยืนยันการส่งมอบเงินสดให้ผู้ดูแลเคส
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ใบสำคัญเบิกเงินสด: <strong className="text-slate-800">{showHandoverModal.withdrawalNo}</strong> (รอบ {showHandoverModal.workflowNo})
                  </p>
                </div>
                <button
                  onClick={() => setShowHandoverModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmitHandover} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                {/* 1. Voucher Summary Strip */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                  <div>
                    <span className="text-slate-400 block text-[10px]">ยอดเบิกตามใบสำคัญ</span>
                    <strong className="text-sm font-mono text-slate-900">
                      ฿{Number(showHandoverModal.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ส่งมอบไปแล้วก่อนหน้า</span>
                    <strong className="text-sm font-mono text-emerald-700">
                      ฿{Number(showHandoverModal.totalHandedOverAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ยอดคงเหลือที่ต้องส่งมอบ</span>
                    <strong className="text-sm font-mono text-amber-700">
                      ฿{Number(showHandoverModal.remainingHandoverAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                {/* 2. Handover Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">วันที่ส่งมอบจริง *</label>
                    <input
                      type="date"
                      required
                      value={handoverDate}
                      onChange={(e) => setHandoverDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เวลาส่งมอบจริง *</label>
                    <input
                      type="time"
                      required
                      value={handoverTime}
                      onChange={(e) => setHandoverTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                </div>

                {/* 3. Handover Person & Recipient Person */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ผู้ส่งมอบเงิน (ฝ่ายการเงิน) *</label>
                    <input
                      type="text"
                      required
                      value={handedOverByName}
                      onChange={(e) => setHandedOverByName(e.target.value)}
                      placeholder="ระบุชื่อเจ้าหน้าที่ฝ่ายการเงิน"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ผู้รับมอบเงิน (ผู้ดูแลเคส) *</label>
                    <input
                      type="text"
                      required
                      value={receivedByName}
                      onChange={(e) => setReceivedByName(e.target.value)}
                      placeholder="ระบุชื่อผู้ดูแลเคสที่รับมอบเงิน"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                </div>

                {/* 4. Position & Handover Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ตำแหน่งผู้รับมอบ</label>
                    <input
                      type="text"
                      value={receivedByPosition}
                      onChange={(e) => setReceivedByPosition(e.target.value)}
                      placeholder="เช่น ผู้ดูแลเคส / เจ้าหน้าที่ภาคสนาม"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">วิธีส่งมอบ *</label>
                    <select
                      value={handoverMethod}
                      onChange={(e) => setHandoverMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                    >
                      <option value="cash">เงินสด (Cash Handover)</option>
                      <option value="bank_transfer">โอนเงินเข้าบัญชีผู้ดูแล (Bank Transfer)</option>
                      <option value="other">วิธีอื่นที่ระบบรองรับ</option>
                    </select>
                  </div>
                </div>

                {/* 5. Actual Amount & Reference No */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">จำนวนเงินที่ส่งมอบจริง (บาท) *</label>
                      <button
                        type="button"
                        onClick={() => setHandoverAmount(Number(showHandoverModal.remainingHandoverAmount || 0))}
                        className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        ส่งมอบยอดที่เหลือทั้งหมด
                      </button>
                    </div>
                    <input
                      type="number"
                      required
                      min={1}
                      max={Number(showHandoverModal.remainingHandoverAmount || showHandoverModal.amount)}
                      step="any"
                      value={handoverAmount || ''}
                      onChange={(e) => setHandoverAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-mono font-bold text-sm text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      ยอดสูงสุดที่ส่งมอบได้: ฿{Number(showHandoverModal.remainingHandoverAmount || 0).toLocaleString()} บาท
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">เลขที่เอกสารอ้างอิง</label>
                    <input
                      type="text"
                      value={handoverRefNo}
                      onChange={(e) => setHandoverRefNo(e.target.value)}
                      placeholder="เช่น ใบส่งมอบเงินสด HO-2569-XXX"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                </div>

                {/* 6. Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หมายเหตุการส่งมอบ</label>
                  <textarea
                    rows={2}
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="ระบุข้อความหรือรายละเอียดเพิ่มเติมเกี่ยวกับการส่งมอบเงิน..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>

                {/* 7. Proof Upload */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    หลักฐานการส่งมอบเงิน (PDF, JPG, JPEG, PNG) *
                  </label>
                  <input
                    type="file"
                    required={!handoverProof}
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0], (info) => setHandoverProof(info));
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-800 file:font-semibold cursor-pointer"
                  />
                  {handoverProof && (
                    <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-emerald-700" />
                        <div>
                          <span className="font-semibold text-slate-800 text-xs block">{handoverProof.fileName}</span>
                          <span className="text-[10px] text-slate-500">{(handoverProof.fileSize / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewFile(handoverProof)}
                        className="text-emerald-700 font-bold hover:underline text-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> ดูตัวอย่าง
                      </button>
                    </div>
                  )}
                </div>

                {/* 8. Pre-submission Calculation Summary */}
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    สรุปยอดคำนวณก่อนยืนยันรายการ
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-slate-700 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">ยอดตามใบสำคัญ:</span>
                      <span className="font-mono font-bold">฿{Number(showHandoverModal.amount).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ส่งมอบครั้งนี้:</span>
                      <span className="font-mono font-extrabold text-emerald-700">฿{Number(handoverAmount || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ยอดคงเหลือหลังส่งมอบ:</span>
                      <span className="font-mono font-bold text-amber-800">
                        ฿{Math.max(0, Number(showHandoverModal.remainingHandoverAmount || 0) - Number(handoverAmount || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-amber-800 pt-1 border-t border-amber-200/60">
                    สถานะที่จะปรับปรุง: <strong>
                      {Math.max(0, Number(showHandoverModal.remainingHandoverAmount || 0) - Number(handoverAmount || 0)) === 0
                        ? 'ส่งมอบครบแล้ว (Fully Handed Over)'
                        : 'ส่งมอบบางส่วน (Partially Handed Over)'}
                    </strong>
                  </div>
                </div>

                {/* 9. Recorded by info */}
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                  <span>ผู้บันทึกข้อมูล: <strong className="text-slate-700">{currentUser.name || 'เจ้าหน้าที่ฝ่ายการเงิน'}</strong> ({currentUser.role})</span>
                  <span>บันทึกตามมาตรฐานการเงิน</span>
                </div>

                {/* 10. Confirmation Checkbox (Mandated: Unchecked by default) */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 cursor-pointer border border-slate-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={isHandoverConfirmed}
                      onChange={(e) => setIsHandoverConfirmed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-900 select-none">
                      ข้าพเจ้ายืนยันว่าได้ตรวจสอบหลักฐานและข้อมูลการส่งมอบเงินตามรายการนี้แล้ว
                    </span>
                  </label>
                </div>

                {/* 11. Modal Footer Actions */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHandoverModal(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !isHandoverConfirmed ||
                      !handoverProof ||
                      Number(handoverAmount) <= 0 ||
                      Number(handoverAmount) > Number(showHandoverModal.remainingHandoverAmount || showHandoverModal.amount) ||
                      !handedOverByName.trim() ||
                      !receivedByName.trim() ||
                      !canOperateHandover
                    }
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการส่งมอบเงิน'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* =========================================================================
         MODAL: HANDOVER HISTORY LIST & CANCELLATION (TASK 1)
         ========================================================================= */}
      {showHandoverHistoryModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-fadeIn">
              {/* Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    ประวัติการส่งมอบเงินให้ผู้ดูแลเคส
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ใบสำคัญ: <strong className="text-slate-800">{showHandoverHistoryModal.withdrawalNo}</strong> • ยอดเบิก ฿{Number(showHandoverHistoryModal.amount).toLocaleString()} บาท
                  </p>
                </div>
                <button
                  onClick={() => setShowHandoverHistoryModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Aggregated Status Strip */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/40 grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">ส่งมอบแล้วสะสม</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    ฿{Number(showHandoverHistoryModal.totalHandedOverAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">คงเหลือยังไม่ส่งมอบ</span>
                  <span className="font-mono font-bold text-amber-800 text-sm">
                    ฿{Number(showHandoverHistoryModal.remainingHandoverAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">สถานะปัจจุบัน</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {showHandoverHistoryModal.handoverStatus === 'fully_handed_over' ? 'ส่งมอบครบแล้ว' :
                      showHandoverHistoryModal.handoverStatus === 'partially_handed_over' ? 'ส่งมอบบางส่วน' :
                        showHandoverHistoryModal.handoverStatus === 'cancelled' ? 'ยกเลิก' : 'ยังไม่ส่งมอบ'}
                  </span>
                </div>
              </div>

              {/* History List */}
              <div className="p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
                {(!showHandoverHistoryModal.handoverHistory || showHandoverHistoryModal.handoverHistory.length === 0) ? (
                  <div className="py-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">ยังไม่มีประวัติการส่งมอบเงินสำหรับใบสำคัญนี้</p>
                    <p className="text-[11px] text-slate-400 mt-1">เมื่อมีการส่งมอบเงินให้ผู้ดูแลเคส ประวัติแต่ละครั้งจะแสดงที่นี่</p>
                  </div>
                ) : (
                  showHandoverHistoryModal.handoverHistory.map((h) => {
                    const isCancelled = h.status === 'cancelled';
                    const isBeingCancelled = cancellingHandover?.id === h.id;

                    return (
                      <div
                        key={h.id}
                        className={`p-4 rounded-xl border transition-all space-y-2.5 ${isCancelled
                            ? 'bg-rose-50/40 border-rose-200/80 opacity-80'
                            : 'bg-white border-slate-200/90 shadow-2xs'
                          }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {h.handoverNo}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              {h.handoverDate} {h.handoverTime}
                            </span>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${isCancelled
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                              {isCancelled ? 'ยกเลิกแล้ว' : 'ส่งมอบแล้ว'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-sm text-emerald-800">
                              ฿{Number(h.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </span>

                            {!isCancelled && canOperateHandover && !isBeingCancelled && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancellingHandover(h);
                                  setCancelHandoverReason('');
                                }}
                                className="text-rose-600 hover:text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded hover:bg-rose-50 cursor-pointer"
                              >
                                ยกเลิกรายการนี้
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[10px]">ผู้ส่งมอบเงิน:</span>
                            <strong className="text-slate-800">{h.handedOverByName}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">ผู้รับมอบเงิน (ผู้ดูแลเคส):</span>
                            <strong className="text-slate-800">{h.receivedByName}</strong> {h.receivedByPosition && `(${h.receivedByPosition})`}
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">วิธีส่งมอบ & เลขที่อ้างอิง:</span>
                            <span>{h.handoverMethod === 'cash' ? 'เงินสด' : h.handoverMethod} {h.referenceNo ? `• อ้างอิง: ${h.referenceNo}` : ''}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">ผู้ยืนยันรายการ:</span>
                            <span>{h.confirmedByName} ({h.confirmedAt})</span>
                          </div>
                        </div>

                        {h.notes && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <strong>หมายเหตุ:</strong> {h.notes}
                          </div>
                        )}

                        {h.proofUrl && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-500">หลักฐานการส่งมอบ:</span>
                            <button
                              type="button"
                              onClick={() => setPreviewFile({
                                fileName: h.proofName || 'หลักฐานส่งมอบเงิน',
                                fileUrl: h.proofUrl,
                                mimeType: h.proofType || 'application/pdf',
                              })}
                              className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer text-[11px]"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              {h.proofName || 'เปิดดูหลักฐาน'}
                            </button>
                          </div>
                        )}

                        {isCancelled && h.cancellationReason && (
                          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                            <strong>เหตุผลการยกเลิก:</strong> {h.cancellationReason}
                          </div>
                        )}

                        {/* Inline Cancellation Form */}
                        {isBeingCancelled && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2 mt-2">
                            <span className="font-bold text-rose-900 block text-xs">ระบุเหตุผลการยกเลิกรายการส่งมอบเงิน *</span>
                            <textarea
                              rows={2}
                              required
                              value={cancelHandoverReason}
                              onChange={(e) => setCancelHandoverReason(e.target.value)}
                              placeholder="ระบุเหตุผลการยกเลิกอย่างน้อย 5 ตัวอักษร (เช่น ระบุยอดเงินผิดพลาด, ยกเลิกการส่งมอบ)..."
                              className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg text-xs"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setCancellingHandover(null)}
                                className="px-2.5 py-1 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                              >
                                ปิด
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelHandover(h.id)}
                                disabled={isSubmitting || cancelHandoverReason.trim().length < 5}
                                className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                              >
                                {isSubmitting ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกรายการ'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHandoverHistoryModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer text-xs"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: Unified Disbursement History Detail Modal (TASK 4 Section 4) */}
      {selectedHistoryDetail && (
        <ModalPortal>
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-start justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {selectedHistoryDetail.voucherNo}
                    </span>
                    <span className="text-xs text-slate-300">
                      รอบ: <span className="font-mono font-bold text-white">{selectedHistoryDetail.workflowNo}</span>
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        selectedHistoryDetail.status === 'completed' || selectedHistoryDetail.status === 'cleared'
                          ? 'bg-emerald-500 text-white'
                          : selectedHistoryDetail.status === 'cancelled'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500 text-slate-900'
                      }`}
                    >
                      {selectedHistoryDetail.statusLabel || selectedHistoryDetail.status}
                    </span>
                    {selectedHistoryDetail.isActualDisbursement ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40">
                        ⭐ รายจ่ายจริงตามงบประมาณ
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40">
                        🔄 การเคลื่อนย้ายเงินสดภายใน
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-emerald-400" />
                    รายละเอียดใบสำคัญและการจ่ายเงิน: {selectedHistoryDetail.paymentTypeLabel}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryDetail(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-700 bg-slate-50/50">
                {/* 1. ข้อมูลใบสำคัญ & รายละเอียดธุรกรรม (Section 1 & 5) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    1. ข้อมูลใบสำคัญและรายละเอียดธุรกรรม
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-medium text-slate-400 block">เลขที่ใบสำคัญ / เอกสาร</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{selectedHistoryDetail.voucherNo}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-medium text-slate-400 block">ประเภทการจ่าย</span>
                      <span className="font-semibold text-slate-900">{selectedHistoryDetail.paymentTypeLabel}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-medium text-slate-400 block">ยอดเงินขอเบิก</span>
                      <span className="font-mono font-bold text-slate-700">
                        ฿{(selectedHistoryDetail.requestedAmount || selectedHistoryDetail.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700 block">ยอดจ่ายจริง / อนุมัติ</span>
                      <span className="font-mono font-extrabold text-emerald-900 text-base">
                        ฿{selectedHistoryDetail.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {selectedHistoryDetail.notes && (
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-700 border border-slate-100">
                      <span className="font-bold text-slate-800 text-[11px] block mb-0.5">วัตถุประสงค์ / หมายเหตุการจ่าย:</span>
                      <p className="leading-relaxed">{selectedHistoryDetail.notes}</p>
                    </div>
                  )}

                  {selectedHistoryDetail.expenseDetails && (
                    <div className="p-3 bg-amber-50/70 rounded-xl text-amber-900 border border-amber-200">
                      <span className="font-bold text-amber-800 text-[11px] block mb-0.5">รายละเอียดผู้ขาย / ใบเสร็จสำนักงาน:</span>
                      <p>{selectedHistoryDetail.expenseDetails}</p>
                    </div>
                  )}
                </div>

                {/* 2. แหล่งเงิน & วันเวลา (Section 2) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* แหล่งเงิน */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                    <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Building2 className="w-4 h-4 text-emerald-700" />
                      2. แหล่งเงินและบัญชีต้นทาง
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">ประเภทกองทุน / แหล่งเงิน:</span>
                        <span className="font-bold text-slate-900">{selectedHistoryDetail.sourceFundName || selectedHistoryDetail.sourceFundType || 'เงินซะกาต / เงินสดในความดูแลเหรัญญิก'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">บัญชีธนาคารต้นทาง:</span>
                        <span className="font-medium text-slate-800">{selectedHistoryDetail.bankAccountName || 'บัญชีเงินสดเหรัญญิกกลาง'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">สถานะทางงบประมาณ:</span>
                        <span className="font-semibold text-emerald-700">
                          {selectedHistoryDetail.isActualDisbursement ? 'ตัดจ่ายจากงบประมาณจริง' : 'เคลื่อนย้ายเงินสดภายใน (ไม่กระทบงบรายจ่าย)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* วันเวลา */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                    <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Clock className="w-4 h-4 text-emerald-700" />
                      3. วันเวลาการทำรายการ
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">วันที่จ่าย / ทำรายการ:</span>
                        <span className="font-bold text-slate-900 font-mono">{selectedHistoryDetail.date}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">เวลาที่ทำรายการ:</span>
                        <span className="font-semibold text-slate-800 font-mono">{selectedHistoryDetail.time || '-'} น.</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">บันทึกในระบบเมื่อ:</span>
                        <span className="text-slate-600 font-mono text-[11px]">
                          {selectedHistoryDetail.datetime ? new Date(selectedHistoryDetail.datetime).toLocaleString('th-TH') : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. ผู้บันทึกและผู้อนุมัติ & ผู้รับเงิน (Section 3) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 pb-2 border-b border-slate-100">
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    4. บุคลากรผู้เกี่ยวข้องและผู้รับเงิน
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">ผู้รับเงิน / ผู้รับความช่วยเหลือ</span>
                      <span className="font-bold text-slate-900 block truncate">{selectedHistoryDetail.payeeName || '-'}</span>
                      {selectedHistoryDetail.nationalId && selectedHistoryDetail.nationalId !== '-' && (
                        <span className="text-[10px] text-slate-500 font-mono block">ปชช: {selectedHistoryDetail.nationalId}</span>
                      )}
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">กลุ่มอัสนัฟ / หมวดค่าใช้จ่าย</span>
                      <span className="font-semibold text-slate-800 block">
                        {selectedHistoryDetail.paymentType === 'office_expense'
                          ? selectedHistoryDetail.expenseCategoryName || selectedHistoryDetail.expenseCategory || 'ค่าใช้จ่ายสำนักงาน'
                          : selectedHistoryDetail.asnafLabel || (selectedHistoryDetail.asnaf !== '-' ? selectedHistoryDetail.asnaf : '-')}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">ผู้ดำเนินการ / ผู้เบิก</span>
                      <span className="font-semibold text-slate-800 block">{selectedHistoryDetail.withdrawerName || selectedHistoryDetail.responsiblePerson || '-'}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">ผู้อนุมัติ</span>
                      <span className="font-semibold text-emerald-900 block">{selectedHistoryDetail.approverName || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* 4. รายการส่งมอบเงิน หากเกี่ยวข้อง (Section 4 - Handover Records) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                      5. รายการส่งมอบเงินให้เจ้าหน้าที่ / ผู้ดูแลเคส (Handover Records)
                    </h3>
                    {selectedHistoryDetail.handoverSummary && (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        ส่งมอบแล้ว ฿{selectedHistoryDetail.handoverSummary.totalHandedOver.toLocaleString()} / ฿{selectedHistoryDetail.amount.toLocaleString()} บาท
                      </span>
                    )}
                  </div>

                  {selectedHistoryDetail.handoverSummary && selectedHistoryDetail.handoverSummary.handovers && selectedHistoryDetail.handoverSummary.handovers.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">วันเวลาส่งมอบ</th>
                            <th className="py-2 px-3">ผู้ส่งมอบ</th>
                            <th className="py-2 px-3">ผู้รับมอบเงิน</th>
                            <th className="py-2 px-3 text-right">จำนวนเงิน (บาท)</th>
                            <th className="py-2 px-3 text-center">สถานะ</th>
                            <th className="py-2 px-3">หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedHistoryDetail.handoverSummary.handovers.map((ho) => (
                            <tr key={ho.id} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-700">
                                {ho.handoverDate} {ho.handoverTime ? `${ho.handoverTime} น.` : ''}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-800">{ho.handedOverByName}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{ho.receivedByName}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                ฿{ho.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    ho.status === 'fully_handed_over'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : ho.status === 'partially_handed_over'
                                      ? 'bg-teal-100 text-teal-800'
                                      : ho.status === 'cancelled'
                                      ? 'bg-rose-100 text-rose-800 line-through'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {ho.status === 'fully_handed_over'
                                    ? 'ส่งมอบครบถ้วน'
                                    : ho.status === 'partially_handed_over'
                                    ? 'ส่งมอบบางส่วน'
                                    : ho.status === 'cancelled'
                                    ? 'ยกเลิก'
                                    : 'รอดำเนินการ'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[11px]">{ho.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-xl text-xs">
                      ไม่มีรายการส่งมอบเงินต่อให้เจ้าหน้าที่ (จ่ายตรงหรือเป็นรายการเคลื่อนย้ายเงินสด)
                    </div>
                  )}
                </div>

                {/* 5. รายละเอียดการช่วยเหลือ หรือ ใบเสร็จค่าใช้จ่ายสำนักงาน (Section 5) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-emerald-700" />
                      6. รายละเอียดการช่วยเหลือผู้มีสิทธิ์ / ใบเสร็จค่าใช้จ่ายสำนักงาน
                    </h3>
                    {selectedHistoryDetail.aidItems && selectedHistoryDetail.aidItems.length > 0 && (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {selectedHistoryDetail.aidItems.length} ผู้รับความช่วยเหลือ
                      </span>
                    )}
                    {selectedHistoryDetail.clearanceItems && selectedHistoryDetail.clearanceItems.length > 0 && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        {selectedHistoryDetail.clearanceItems.length} ใบเสร็จสำนักงาน
                      </span>
                    )}
                  </div>

                  {/* Case 1: Aid Items */}
                  {selectedHistoryDetail.aidItems && selectedHistoryDetail.aidItems.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">ลำดับ</th>
                            <th className="py-2 px-3">ชื่อผู้รับความช่วยเหลือ</th>
                            <th className="py-2 px-3">บัตรประชาชน</th>
                            <th className="py-2 px-3">อัสนัฟ</th>
                            <th className="py-2 px-3">ประเภทความช่วยเหลือ</th>
                            <th className="py-2 px-3 text-right">ยอดจัดสรร (บาท)</th>
                            <th className="py-2 px-3">หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedHistoryDetail.aidItems.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{item.beneficiaryName}</td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{item.nationalId || '-'}</td>
                              <td className="py-2 px-3">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                                  {item.asnafCategory || '-'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-700">{item.assistanceType || '-'}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900">
                                ฿{(item.thisDisbursementAmount || item.disbursedAmount || item.approvedAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[11px]">{item.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : selectedHistoryDetail.clearanceItems && selectedHistoryDetail.clearanceItems.length > 0 ? (
                    /* Case 2: Office Petty Cash Clearance Items */
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">วันที่ใบเสร็จ</th>
                            <th className="py-2 px-3">รายการ / ผู้ขาย</th>
                            <th className="py-2 px-3">หมวดค่าใช้จ่าย</th>
                            <th className="py-2 px-3 text-right">จำนวนเงิน (บาท)</th>
                            <th className="py-2 px-3 text-center">หลักฐาน</th>
                            <th className="py-2 px-3">หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedHistoryDetail.clearanceItems.map((c, idx) => (
                            <tr key={c.id || idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-mono text-slate-700">{c.expenseDate}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{c.description}</td>
                              <td className="py-2 px-3">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[10px] border border-amber-200">
                                  {c.categoryName || c.categoryCode || 'ค่าใช้จ่ายทั่วไป'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                ฿{c.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {c.receiptUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewFile({
                                        fileName: c.receiptName || `ใบเสร็จ-${c.description}`,
                                        fileUrl: c.receiptUrl!,
                                        mimeType: c.receiptType || 'image/jpeg',
                                      })
                                    }
                                    className="text-emerald-700 hover:underline font-bold text-[11px] cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Paperclip className="w-3 h-3" /> ดูใบเสร็จ
                                  </button>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[11px]">{c.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-xl text-xs">
                      ไม่มีรายการแยกย่อยเพิ่มเติม (เป็นรายการเคลื่อนย้ายเงินสดหรือรายการก้อนเดียว)
                    </div>
                  )}
                </div>

                {/* 6. เอกสารหลักฐาน (Section 6) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Paperclip className="w-4 h-4 text-emerald-700" />
                    7. เอกสารหลักฐานประกอบการจ่าย
                  </h3>
                  {selectedHistoryDetail.proofUrl ? (
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{selectedHistoryDetail.proofName || `หลักฐาน-${selectedHistoryDetail.voucherNo}`}</div>
                          <div className="text-[10px] text-slate-500">
                            {selectedHistoryDetail.proofType || 'เอกสารการเงิน'}
                            {selectedHistoryDetail.proofSize ? ` • ${(selectedHistoryDetail.proofSize / 1024).toFixed(1)} KB` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewFile({
                              fileName: selectedHistoryDetail.proofName || `หลักฐาน-${selectedHistoryDetail.voucherNo}`,
                              fileUrl: selectedHistoryDetail.proofUrl!,
                              mimeType: selectedHistoryDetail.proofType || 'application/pdf',
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> ดูตัวอย่าง
                        </button>
                        <a
                          href={selectedHistoryDetail.proofUrl}
                          download={selectedHistoryDetail.proofName || `หลักฐาน-${selectedHistoryDetail.voucherNo}`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> ดาวน์โหลด
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-xl text-xs">
                      ยังไม่มีเอกสารหลักฐานแนบในรายการนี้
                    </div>
                  )}

                  {selectedHistoryDetail.attachments && selectedHistoryDetail.attachments.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[11px] font-bold text-slate-700 mb-1.5">ไฟล์แนบอื่นๆ ในกระบวนการ:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedHistoryDetail.attachments.map((att: any, idx: number) => (
                          <div key={att.id || idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <span className="truncate max-w-[200px] font-medium text-slate-800">{att.fileName || `เอกสารแนบ ${idx + 1}`}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewFile({
                                  fileName: att.fileName || 'ไฟล์แนบ',
                                  fileUrl: att.fileUrl,
                                  mimeType: att.fileType || 'application/pdf',
                                })
                              }
                              className="text-emerald-700 hover:underline font-bold text-[11px] cursor-pointer"
                            >
                              เปิดดู
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. ประวัติการเปลี่ยนสถานะ (Section 7 - Status History & Audit Trail) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    8. ประวัติการเปลี่ยนสถานะและการตรวจสอบ (Audit Trail)
                  </h3>
                  {selectedHistoryDetail.auditLogs && selectedHistoryDetail.auditLogs.length > 0 ? (
                    <div className="space-y-2">
                      {selectedHistoryDetail.auditLogs.map((log: any, idx: number) => (
                        <div key={log.id || idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                          <div className="p-1 rounded-full bg-emerald-100 text-emerald-800 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{log.action || 'ปรับปรุงข้อมูล'}</span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString('th-TH') : '-'}
                              </span>
                            </div>
                            <div className="text-slate-600 text-[11px] mt-0.5">
                              ผู้ดำเนินการ: <span className="font-medium text-slate-800">{log.userName || log.userEmail || 'เจ้าหน้าที่ระบบ'}</span>
                            </div>
                            {log.details && (
                              <p className="text-slate-500 text-[10px] mt-1 bg-white p-1.5 rounded-lg border border-slate-200">
                                {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>บันทึกธุรกรรมสมบูรณ์เมื่อ: {selectedHistoryDetail.datetime ? new Date(selectedHistoryDetail.datetime).toLocaleString('th-TH') : selectedHistoryDetail.date}</span>
                        <span className="ml-auto font-bold text-slate-800">โดย: {selectedHistoryDetail.responsiblePerson}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  รหัสอ้างอิงระบบ: <span className="font-mono font-bold text-slate-700">{selectedHistoryDetail.id}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryDetail(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL: File Preview & Safe Download Modal */}
      {previewFile && (
        <ModalPortal>
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-slate-900 text-xs">{previewFile.fileName}</span>
                </div>
                <button onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100">
                {previewFile.mimeType.startsWith('image/') ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewFile.fileUrl}
                    alt={previewFile.fileName}
                    className="max-h-[65vh] max-w-full rounded-lg shadow-xs object-contain"
                  />
                ) : (
                  <iframe
                    src={previewFile.fileUrl}
                    title={previewFile.fileName}
                    className="w-full h-[65vh] rounded-lg border border-slate-200 bg-white"
                  />
                )}
              </div>

              <div className="p-3 bg-white border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500">เอกสารการเงินผ่านการตรวจสอบความปลอดภัย</span>
                <a
                  href={previewFile.fileUrl}
                  download={previewFile.fileName}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> ดาวน์โหลดไฟล์ต้นฉบับ
                </a>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
