'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Ban,
  Search,
  RefreshCw,
  Eye,
  X,
  FileText,
  DollarSign,
  User,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  Receipt,
  FileCheck2,
  Building2,
  Wallet,
  AlertTriangle,
  Info,
  CheckCheck,
  Filter,
  Upload,
  Download,
  Trash2,
  Plus,
  FileCheck,
  ArrowUpRight,
  Lock,
} from 'lucide-react';
import { DocumentPreviewModal } from '@/components/common/DocumentPreviewModal';
import { BeneficiaryDocument } from '@/types';

export interface TreasurerApprovalWorkbenchProps {
  actor: { id: string; name: string; role: string };
  onNavigate?: (view: string) => void;
  onRefreshParent?: () => void;
}

interface BatchSummaryItem {
  id: string;
  workflowNo: string;
  title: string;
  date: string;
  operatorId: string;
  operatorName: string;
  treasurerName: string;
  fundType: string;
  totalAmount: number;
  handedAmount: number;
  actualDisbursed: number;
  refunded: number;
  remainingResponsibility: number;
  itemCount: number;
  aidCount: number;
  adminCount: number;
  step1Status: string;
  step2Status: string;
  overallStatus: string;
  createdAt: string;
}

interface BatchDetailData {
  workflow: {
    id: string;
    workflowNo: string;
    title: string;
    status: string;
    fundType: string;
    bankAccountId: string;
    sourceAccountId: string;
    sourceAccountName: string;
    sourceAccountType: string;
    treasurerId: string;
    treasurerName: string;
    withdrawAmount: number;
    date: string;
    operatorId: string;
    operatorName: string;
    approverId: string | null;
    approverName: string | null;
    notes: string;
    rejection_reason?: string | null;
    step1Status: string;
    step2Status: string;
    overallStatus: string;
    createdAt: string;
    updated_at: string;
  };
  aidItems: Array<{
    id: string;
    applicationId: string;
    applicationNo: string;
    beneficiaryId: string;
    beneficiaryName: string;
    nationalId: string;
    asnafCategory: string;
    assistanceType: string;
    approvedAmount: number;
    thisDisbursementAmount: number;
    status: string;
    notes?: string;
  }>;
  adminItems: Array<{
    id: string;
    description: string;
    amount: number;
    categoryCode: string;
    categoryName: string;
    expenseDate: string;
    receiptUrl?: string;
    status: string;
    notes?: string;
  }>;
  approvalEvents: Array<{
    id: string;
    action: string;
    fromStatus: string | null;
    toStatus: string;
    actorName: string;
    actorRole: string;
    note: string;
    createdAt: string;
  }>;
  treasurerAccount?: {
    accountId: string;
    accountName: string;
    currentBalance: number;
    simulatedBalanceAfter: number;
    isSufficient: boolean;
  };
  staffAccount?: {
    accountId: string;
    accountCode: string;
    accountName: string;
    operatorId: string;
    operatorName: string;
    currentBalance: number;
  };
  financialSummary?: {
    totalRequested: number;
    totalTransferred: number;
    confirmedReceived: number;
    remainingToTransfer: number;
    treasurerBalance: number;
    staffCashBalance: number;
    mismatchDiff: number;
    isMatched: boolean;
    status: string;
  };
  handovers?: Array<{
    id: string;
    handoverNo: string;
    handoverDate: string;
    handoverTime: string;
    handedOverByName: string;
    receivedByName: string;
    amount: number;
    actualReceivedAmount?: number;
    discrepancyReason?: string | null;
    sourceAccountId: string;
    destinationAccountId: string;
    proofUrl: string;
    proofName?: string;
    status: string;
    confirmedAt?: string | null;
    notes: string;
  }>;
  transferEvidence?: TransferEvidenceSummary;
  totalWithdrawAmount: number;
  totalActualAidDisbursed: number;
  totalActualAdminDisbursed: number;
}

export interface TransferEvidenceItem {
  id: string;
  workflowId: string;
  sourceBankAccountId: string;
  sourceBankName: string;
  sourceAccountName: string;
  sourceAccountNumber: string;
  sourceAccountId?: string;
  destinationAccountId: string;
  destinationAccountName: string;
  recipientUserId?: string;
  recipientUserName?: string;
  handoverId?: string | null;
  documentType?: 'transfer_slip' | 'bank_withdrawal_slip' | 'payment_voucher_receipt' | 'cash_handover_slip' | 'other_document';
  documentTypeName?: string;
  amount: number;
  transferDatetime: string;
  referenceNo?: string;
  issuingBank?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  notes?: string;
  status: 'not_attached' | 'attached' | 'pending_verification' | 'verified' | 'invalid' | 'need_more_info';
  verifiedById?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface PendingEvidenceFile {
  tempId: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  documentType: 'transfer_slip' | 'bank_withdrawal_slip' | 'payment_voucher_receipt' | 'cash_handover_slip' | 'other_document';
  notes: string;
}

export interface TransferEvidenceSummary {
  items: TransferEvidenceItem[];
  totalAmount: number;
  verifiedAmount: number;
  requiredAmount: number;
  isAmountMatched: boolean;
  overallStatus: string;
  isApprovalReady: boolean;
  mismatchDiff: number;
}

export interface BankAccountOption {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  account_type: string;
  is_active: number;
}

interface Counts {
  all: number;
  pending_approval: number;
  approved: number;
  revision: number;
  rejected: number;
}

export function TreasurerApprovalWorkbench({
  actor,
  onNavigate,
  onRefreshParent,
}: TreasurerApprovalWorkbenchProps) {
  // Tabs for Filtering
  const [activeTab, setActiveTab] = useState<'pending_approval' | 'approved' | 'revision' | 'rejected' | 'all'>('pending_approval');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  // List Data & Summary KPI Counts
  const [batches, setBatches] = useState<BatchSummaryItem[]>([]);
  const [counts, setCounts] = useState<Counts>({
    all: 0,
    pending_approval: 0,
    approved: 0,
    revision: 0,
    rejected: 0,
  });

  // Selected Detail Modal
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BatchDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Bank Accounts for transferring
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);

  // Transfer Evidence Upload Modal
  const [showUploadEvidenceModal, setShowUploadEvidenceModal] = useState(false);
  const [uploadBankId, setUploadBankId] = useState('');
  const [uploadAmount, setUploadAmount] = useState('');
  const [uploadDatetime, setUploadDatetime] = useState('');
  const [uploadRefNo, setUploadRefNo] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Evidence Verify/Reject Modal
  const [evidenceDecisionModal, setEvidenceDecisionModal] = useState<{
    evidence: TransferEvidenceItem;
    decision: 'invalid' | 'need_more_info';
  } | null>(null);
  const [evidenceDecisionReason, setEvidenceDecisionReason] = useState('');
  const [evidenceDecisionBusy, setEvidenceDecisionBusy] = useState(false);
  const [evidenceDecisionError, setEvidenceDecisionError] = useState('');

  // Action Modals
  const [actionType, setActionType] = useState<'approve' | 'return_for_revision' | 'reject' | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState<BeneficiaryDocument | null>(null);

  // Section 4: Transfer Form & Multi-file Attachment State
  const [transferFormAmount, setTransferFormAmount] = useState('');
  const [transferFormDatetime, setTransferFormDatetime] = useState('');
  const [transferFormNotes, setTransferFormNotes] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingEvidenceFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [transferFormBusy, setTransferFormBusy] = useState(false);
  const [transferFormError, setTransferFormError] = useState('');

  // Staff Confirmation Modal State
  const [staffConfirmDecisionModal, setStaffConfirmDecisionModal] = useState<{
    open: boolean;
    decision: 'partially_received' | 'returned_for_review';
  } | null>(null);
  const [staffReceivedAmount, setStaffReceivedAmount] = useState('');
  const [staffDiscrepancyReason, setStaffDiscrepancyReason] = useState('');
  const [staffConfirmBusy, setStaffConfirmBusy] = useState(false);

  // Fetch bank accounts
  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/workflow-actions?view=bank_accounts');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBankAccounts(json.data);
      }
    } catch (e) {
      console.error('Error fetching bank accounts:', e);
    }
  }, []);

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  // Fetch batches and real counts from database
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        view: 'batch_list',
        tab: activeTab,
        search,
      });
      if (dateFrom) p.set('dateFrom', dateFrom);
      if (dateTo) p.set('dateTo', dateTo);

      const res = await fetch(`/api/finance/workflow-actions?${p.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setBatches(json.data.items || json.data.batches || []);
        if (json.data.badgeCounts || json.data.counts) {
          const bc = json.data.badgeCounts || json.data.counts;
          setCounts({
            all: Number(bc.all || 0),
            pending_approval: Number(bc.pending_approval || 0),
            approved: Number(bc.approved || 0),
            revision: Number(bc.revision || 0),
            rejected: Number(bc.rejected || 0),
          });
        }
      }
    } catch (e) {
      console.error('Error fetching batch disbursements for treasurer:', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Load Detail when selected
  const loadDetail = useCallback(async (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    setLoadingDetail(true);
    setActionError('');
    setActionSuccessMessage('');
    try {
      const res = await fetch(`/api/finance/workflow-actions?view=batch_detail&workflowId=${encodeURIComponent(workflowId)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDetail(json.data);
        const now = new Date();
        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setTransferFormAmount(json.data.totalWithdrawAmount ? json.data.totalWithdrawAmount.toString() : '');
        setTransferFormDatetime(localIso);
        setTransferFormNotes('');
        setPendingFiles([]);
        setTransferFormError('');
      } else {
        setActionError(json.error || 'ไม่พบข้อมูลรอบการเบิก');
      }
    } catch (e) {
      console.error('Error loading batch detail:', e);
      setActionError('ไม่สามารถโหลดข้อมูลรอบการเบิกได้');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const isEligibleToRecordTransfer = useMemo(() => {
    if (!detail) return false;
    const canActorManage = actor.role === 'finance' || actor.role === 'super_admin' || actor.role === 'approver' || actor.role === 'executive';
    const isFinished = detail.workflow.overallStatus === 'disbursed' || detail.workflow.overallStatus === 'completed' || detail.financialSummary?.status === 'fully_received';
    const isCancelled = detail.workflow.overallStatus === 'cancelled' || detail.workflow.step1Status === 'rejected';
    return canActorManage && !isFinished && !isCancelled;
  }, [detail, actor.role]);

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles: PendingEvidenceFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.size > 10 * 1024 * 1024) {
        alert(`ไฟล์ "${f.name}" มีขนาดเกิน 10MB (ระบบจำกัดไม่เกิน 10MB)`);
        continue;
      }
      const previewUrl = URL.createObjectURL(f);
      newFiles.push({
        tempId: `pf-${Date.now()}-${i}-${Math.random()}`,
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        previewUrl,
        documentType: 'transfer_slip',
        notes: '',
      });
    }
    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemovePendingFile = (tempId: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.tempId === tempId);
      if (target && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.tempId !== tempId);
    });
  };

  const handleUpdatePendingFileType = (
    tempId: string,
    docType: 'transfer_slip' | 'bank_withdrawal_slip' | 'payment_voucher_receipt' | 'cash_handover_slip' | 'other_document'
  ) => {
    setPendingFiles((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, documentType: docType } : p))
    );
  };

  const handleRecordTransferAndHandover = async () => {
    if (!detail) return;
    const amt = Number(transferFormAmount);
    if (isNaN(amt) || amt <= 0) {
      setTransferFormError('กรุณาระบุจำนวนเงินที่เบิกให้ถูกต้อง (มากกว่า 0 บาท)');
      return;
    }
    const hasEvidence = pendingFiles.length > 0 || (detail.transferEvidence?.items && detail.transferEvidence.items.length > 0);
    if (!hasEvidence) {
      setTransferFormError('กรุณาแนบเอกสารหลักฐานอย่างน้อย 1 ไฟล์ (สลิปโอนเงิน / ใบถอนเงิน / ใบสำคัญรับเงิน)');
      return;
    }

    setTransferFormBusy(true);
    setTransferFormError('');
    try {
      const uploadedFiles: Array<{
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        documentType: any;
        notes?: string;
      }> = [];

      for (const pf of pendingFiles) {
        const fd = new FormData();
        fd.append('file', pf.file);
        fd.append('category', pf.documentType);
        fd.append('entityType', 'cash_flow_workflow');
        fd.append('entityId', detail.workflow.id);

        const upRes = await fetch('/api/storage/upload', {
          method: 'POST',
          body: fd,
        });
        const upJson = await upRes.json();
        if (!upJson.success) {
          throw new Error(upJson.error || `อัปโหลดไฟล์ ${pf.name} ล้มเหลว`);
        }
        uploadedFiles.push({
          fileUrl: upJson.fileUrl,
          fileName: upJson.fileName || pf.name,
          fileSize: upJson.fileSize || pf.size,
          mimeType: upJson.mimeType || pf.type,
          documentType: pf.documentType,
          notes: pf.notes || undefined,
        });
      }

      if (uploadedFiles.length === 0 && detail.transferEvidence?.items) {
        for (const ev of detail.transferEvidence.items) {
          uploadedFiles.push({
            fileUrl: ev.fileUrl,
            fileName: ev.fileName,
            fileSize: ev.fileSize,
            mimeType: ev.mimeType,
            documentType: (ev as any).documentType || 'transfer_slip',
            notes: ev.notes,
          });
        }
      }

      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_treasurer_transfer',
          input: {
            workflowId: detail.workflow.id,
            sourceAccountId: '1020-01',
            destinationAccountId: '1030-01',
            amount: amt,
            transferDatetime: transferFormDatetime || new Date().toISOString(),
            notes: transferFormNotes.trim() || undefined,
            recipientUserId: detail.workflow.operatorId,
            recipientUserName: detail.workflow.operatorName,
            files: uploadedFiles,
          },
          actor,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'ไม่สามารถบันทึกการส่งมอบเงินได้');
      }

      pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.previewUrl));
      setPendingFiles([]);
      setActionSuccessMessage('บันทึกการส่งมอบเงินสดและแนบหลักฐานเรียบร้อยแล้ว (สถานะ: รอเจ้าหน้าที่ยืนยันรับเงิน)');
      await loadDetail(detail.workflow.id);
      await fetchBatches();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      setTransferFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกการส่งมอบเงิน');
    } finally {
      setTransferFormBusy(false);
    }
  };

  const handleStaffConfirmReceipt = async (
    decision: 'fully_received' | 'partially_received' | 'returned_for_review',
    actualAmount?: number,
    reason?: string
  ) => {
    if (!detail) return;
    setStaffConfirmBusy(true);
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_transfer_receipt',
          input: {
            workflowId: detail.workflow.id,
            decision,
            actualReceivedAmount: actualAmount,
            discrepancyReason: reason,
          },
          actor,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการยืนยัน');
      }

      setStaffConfirmDecisionModal(null);
      setActionSuccessMessage(
        decision === 'fully_received'
          ? 'ยืนยันรับเงินสดครบถ้วนเรียบร้อยแล้ว (ระบบบันทึกบัญชีแยกประเภทแล้ว)'
          : decision === 'partially_received'
          ? 'บันทึกการรับเงินสดบางส่วนเรียบร้อยแล้ว'
          : 'ส่งกลับรายการให้เหรัญญิกตรวจสอบเรียบร้อยแล้ว'
      );
      await loadDetail(detail.workflow.id);
      await fetchBatches();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการทำรายการ');
    } finally {
      setStaffConfirmBusy(false);
    }
  };

  const getHandoverStatusBadge = (status: string) => {
    switch (status) {
      case 'fully_received':
      case 'fully_handed_over':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            รับเงินครบแล้ว
          </span>
        );
      case 'transferred':
      case 'pending_staff_confirm':
      case 'pending_verification':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            ถอนหรือโอนเงินแล้ว — รอเจ้าหน้าที่ยืนยันรับเงิน
          </span>
        );
      case 'partially_received':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            รับเงินไม่ครบ
          </span>
        );
      case 'returned_for_review':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            ส่งกลับตรวจสอบ
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300">
            <Ban className="w-3.5 h-3.5 text-slate-500" />
            ยกเลิกรายการ
          </span>
        );
      case 'pending_withdrawal':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            รอเบิกเงิน
          </span>
        );
    }
  };

  // Open Upload Transfer Evidence Modal
  const handleOpenUploadModal = () => {
    if (!detail) return;
    const remaining = Math.max(
      0,
      detail.totalWithdrawAmount - (detail.transferEvidence?.totalAmount || 0)
    );
    setUploadBankId(bankAccounts[0]?.id || '');
    setUploadAmount(remaining > 0 ? remaining.toString() : detail.totalWithdrawAmount.toString());
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setUploadDatetime(localIso);
    setUploadRefNo('');
    setUploadNotes('');
    setUploadFile(null);
    setUploadError('');
    setShowUploadEvidenceModal(true);
  };

  // Upload slip to storage and attach evidence
  const handleUploadAndAttachEvidence = async () => {
    if (!detail) return;
    if (!uploadFile) {
      setUploadError('กรุณาเลือกไฟล์สลิปหรือหลักฐานการโอนเงิน (JPG, PNG, PDF)');
      return;
    }
    if (!uploadBankId) {
      setUploadError('กรุณาเลือกบัญชีธนาคารต้นทาง');
      return;
    }
    const amt = Number(uploadAmount);
    if (isNaN(amt) || amt <= 0) {
      setUploadError('จำนวนเงินที่โอนต้องมากกว่า 0 บาท');
      return;
    }

    setUploadBusy(true);
    setUploadError('');
    try {
      // Step 1: Upload file to storage
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('category', 'payment_slip');
      fd.append('entityType', 'assistance_request');
      fd.append('entityId', detail.workflow.id);

      const upRes = await fetch('/api/storage/upload', {
        method: 'POST',
        body: fd,
      });
      const upJson = await upRes.json();
      if (!upJson.success) {
        throw new Error(upJson.error || 'การอัปโหลดไฟล์ล้มเหลว');
      }

      // Step 2: Attach transfer evidence
      const selectedBank = bankAccounts.find((b) => b.id === uploadBankId);
      const attRes = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'attach_transfer_evidence',
          input: {
            workflowId: detail.workflow.id,
            sourceBankAccountId: uploadBankId,
            destinationAccountId: '1020-01',
            destinationAccountName: 'บัญชีเงินสดเหรัญญิก (Treasurer Cash Float)',
            amount: amt,
            transferDatetime: uploadDatetime || new Date().toISOString(),
            referenceNo: uploadRefNo.trim() || undefined,
            issuingBank: selectedBank?.bank_name || 'ธนาคารพาณิชย์',
            fileUrl: upJson.fileUrl,
            fileName: upJson.fileName || uploadFile.name,
            fileSize: upJson.fileSize || uploadFile.size,
            mimeType: upJson.mimeType || uploadFile.type,
            notes: uploadNotes.trim() || undefined,
          },
          actor,
        }),
      });

      const attJson = await attRes.json();
      if (!attJson.success) {
        throw new Error(attJson.error || 'ไม่สามารถบันทึกหลักฐานการโอนเงินได้');
      }

      setShowUploadEvidenceModal(false);
      setActionSuccessMessage('แนบหลักฐานการโอนเงินเรียบร้อยแล้ว');
      await loadDetail(detail.workflow.id);
      await fetchBatches();
    } catch (err: any) {
      setUploadError(err.message || 'เกิดข้อผิดพลาดในการแนบหลักฐาน');
    } finally {
      setUploadBusy(false);
    }
  };

  // Verify / Invalidate / Request Info on Evidence
  const handleVerifyEvidence = async (
    evidenceId: string,
    decision: 'verify' | 'invalid' | 'need_more_info',
    reason?: string
  ) => {
    if (!detail) return;
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_transfer_evidence',
          input: {
            evidenceId,
            decision,
            reason: reason?.trim(),
          },
          actor,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการตรวจสอบหลักฐาน');
      }
      setActionSuccessMessage(
        decision === 'verify'
          ? 'ยืนยันความถูกต้องของหลักฐานการโอนเงินเรียบร้อย'
          : decision === 'invalid'
          ? 'ระบุหลักฐานไม่ถูกต้องเรียบร้อย'
          : 'ส่งคำขอข้อมูลเพิ่มเติมเรียบร้อย'
      );
      setEvidenceDecisionModal(null);
      setEvidenceDecisionReason('');
      await loadDetail(detail.workflow.id);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  // Delete evidence
  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!detail) return;
    if (!window.confirm('คุณต้องการลบหลักฐานการโอนเงินนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_transfer_evidence',
          input: { evidenceId },
          actor,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการลบหลักฐาน');
      }
      setActionSuccessMessage('ลบหลักฐานการโอนเงินเรียบร้อยแล้ว');
      await loadDetail(detail.workflow.id);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    }
  };

  // Handle Review Action (Approve, Return for Revision, Reject)
  const handleReviewAction = async () => {
    if (!detail || !actionType) return;
    const workflowId = detail.workflow.id;

    // Frontend validations
    if ((actionType === 'return_for_revision' || actionType === 'reject') && !reasonInput.trim()) {
      setActionError('กรุณาระบุเหตุผลให้ชัดเจน');
      return;
    }

    if (actionType === 'approve') {
      // Check self-approval
      if (detail.workflow.operatorId === actor.id && actor.role !== 'super_admin') {
        setActionError('ไม่อนุญาตให้อนุมัติรอบเบิกที่ตนเองเป็นผู้จัดทำ (Segregation of Duties)');
        return;
      }
      // Check treasurer balance
      const currentBal = detail.treasurerAccount?.currentBalance ?? 0;
      if (currentBal < detail.totalWithdrawAmount) {
        setActionError(`ยอดเงินคงเหลือในบัญชีเหรัญญิกไม่เพียงพอ (คงเหลือ ฿${currentBal.toLocaleString()} บาท, ยอดเบิกรอบนี้ ฿${detail.totalWithdrawAmount.toLocaleString()} บาท)`);
        return;
      }
      // STRICT CHECK: Evidence readiness before approval
      if (!detail.transferEvidence?.isApprovalReady) {
        if (!detail.transferEvidence || detail.transferEvidence.items.length === 0) {
          setActionError('ไม่อนุญาตให้อนุมัติ: ยังไม่ได้แนบหลักฐานการโอนเงินเข้าบัญชีเหรัญญิก');
          return;
        }
        if (!detail.transferEvidence.isAmountMatched) {
          setActionError(`ไม่อนุญาตให้อนุมัติ: ยอดเงินตามหลักฐาน (฿${detail.transferEvidence.totalAmount.toLocaleString()} บาท) ไม่ตรงกับยอดขอเบิก (฿${detail.totalWithdrawAmount.toLocaleString()} บาท)`);
          return;
        }
        const unverified = detail.transferEvidence.items.filter((i) => i.status !== 'verified');
        if (unverified.length > 0) {
          setActionError('ไม่อนุญาตให้อนุมัติ: มีหลักฐานการโอนเงินที่ยังไม่ผ่านการตรวจสอบความถูกต้องโดยเหรัญญิก');
          return;
        }
        setActionError('ไม่อนุญาตให้อนุมัติ: ข้อมูลหลักฐานการโอนเงินยังไม่พร้อมสำหรับการอนุมัติ');
        return;
      }
    }

    setActionBusy(true);
    setActionError('');
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'treasurer_review',
          input: {
            workflowId,
            decision: actionType,
            reason: reasonInput.trim(),
            note: reasonInput.trim(),
          },
          actor,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกการพิจารณา');
      }

      const msg =
        actionType === 'approve'
          ? 'อนุมัติรอบการเบิกเงินเรียบร้อยแล้ว (สถานะ: รอส่งมอบเงินสด)'
          : actionType === 'return_for_revision'
          ? 'ส่งกลับรอบการเบิกเงินให้เจ้าหน้าที่แก้ไขเรียบร้อยแล้ว'
          : 'ปฏิเสธ/ไม่อนุมัติรอบการเบิกเงินเรียบร้อยแล้ว';

      setActionSuccessMessage(msg);
      setActionType(null);
      setReasonInput('');
      await loadDetail(workflowId);
      await fetchBatches();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      setActionError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setActionBusy(false);
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (step1Status: string, overallStatus: string) => {
    if (step1Status === 'pending_approval') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5" />
          รอเหรัญญิกอนุมัติ
        </span>
      );
    }
    if (step1Status === 'rejected_for_revision') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <RotateCcw className="w-3.5 h-3.5" />
          ส่งกลับแก้ไข
        </span>
      );
    }
    if (step1Status === 'rejected' || overallStatus === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <Ban className="w-3.5 h-3.5" />
          ไม่อนุมัติ / ยกเลิก
        </span>
      );
    }
    if (step1Status === 'approved') {
      if (overallStatus === 'completed') {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <CheckCheck className="w-3.5 h-3.5" />
            ปิดรอบเบิกแล้ว
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" />
          อนุมัติแล้ว
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
        {step1Status}
      </span>
    );
  };

  // Helper for Transfer Evidence Item Status Badge
  const getEvidenceStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ตรวจสอบแล้ว
          </span>
        );
      case 'invalid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <Ban className="w-3.5 h-3.5 text-rose-600" />
            ไม่ถูกต้อง
          </span>
        );
      case 'need_more_info':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            ขอหลักฐานเพิ่ม
          </span>
        );
      case 'pending_verification':
      case 'attached':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            รอตรวจสอบ
          </span>
        );
    }
  };

  // Helper for Overall Transfer Evidence Badge
  const getOverallEvidenceBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            ตรวจสอบครบถ้วน ถูกต้อง
          </span>
        );
      case 'invalid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            หลักฐานไม่ถูกต้อง
          </span>
        );
      case 'need_more_info':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
            <Info className="w-4 h-4 text-blue-600" />
            ขอหลักฐานเพิ่มเติม
          </span>
        );
      case 'pending_verification':
      case 'attached':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-4 h-4 text-amber-600" />
            แนบหลักฐานแล้ว (รอเหรัญญิกตรวจสอบ)
          </span>
        );
      case 'not_attached':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            ยังไม่ได้แนบหลักฐานการโอนเงิน
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & ACTOR CONTEXT                                             */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  ระบบอนุมัติรอบการเบิกเงินโดยฝ่ายเหรัญญิก
                </h1>
                <p className="text-sm font-medium text-slate-500">
                  Treasurer Approval Workbench — ตรวจสอบความถูกต้องของรายการช่วยเหลือและค่าใช้จ่ายบริหาร พร้อมควบคุมวงเงินคลังเหรัญญิก
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-700">
              <User className="w-4 h-4 text-slate-400" />
              <span>ผู้พิจารณา: <strong className="text-slate-900">{actor.name}</strong> ({actor.role})</span>
            </div>

            <button
              onClick={fetchBatches}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PHASE 3.1: 4 SUMMARY KPI CARDS                                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: รออนุมัติ (Amber) */}
        <div
          onClick={() => setActiveTab('pending_approval')}
          className={`cursor-pointer rounded-3xl p-5 border transition-all ${
            activeTab === 'pending_approval'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/30 shadow-md'
              : 'bg-white border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">รอบเบิกรออนุมัติ</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-950">{counts.pending_approval}</span>
            <span className="text-xs font-medium text-amber-700">รอบเบิก</span>
          </div>
          <p className="mt-2 text-xs text-amber-600/90 font-medium">รอการตรวจสอบและพิจารณาจากเหรัญญิก</p>
        </div>

        {/* Card 2: อนุมัติแล้ว (Emerald) */}
        <div
          onClick={() => setActiveTab('approved')}
          className={`cursor-pointer rounded-3xl p-5 border transition-all ${
            activeTab === 'approved'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/30 shadow-md'
              : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">รอบเบิกอนุมัติแล้ว</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-950">{counts.approved}</span>
            <span className="text-xs font-medium text-emerald-700">รอบเบิก</span>
          </div>
          <p className="mt-2 text-xs text-emerald-600/90 font-medium">ผ่านการอนุมัติแล้ว รอขั้นตอนส่งมอบเงินสด</p>
        </div>

        {/* Card 3: ส่งกลับแก้ไข (Blue) */}
        <div
          onClick={() => setActiveTab('revision')}
          className={`cursor-pointer rounded-3xl p-5 border transition-all ${
            activeTab === 'revision'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/30 shadow-md'
              : 'bg-white border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">ส่งกลับแก้ไข</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-950">{counts.revision}</span>
            <span className="text-xs font-medium text-blue-700">รอบเบิก</span>
          </div>
          <p className="mt-2 text-xs text-blue-600/90 font-medium">รอเจ้าหน้าที่สำนักงานแก้ไขข้อมูลและยื่นใหม่</p>
        </div>

        {/* Card 4: ไม่อนุมัติ (Rose) */}
        <div
          onClick={() => setActiveTab('rejected')}
          className={`cursor-pointer rounded-3xl p-5 border transition-all ${
            activeTab === 'rejected'
              ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/30 shadow-md'
              : 'bg-white border-slate-200/80 hover:border-rose-300 hover:bg-rose-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">รอบเบิกไม่อนุมัติ</span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Ban className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-950">{counts.rejected}</span>
            <span className="text-xs font-medium text-rose-700">รอบเบิก</span>
          </div>
          <p className="mt-2 text-xs text-rose-600/90 font-medium">คำขอถูกยกเลิก/ยุติรายการ ไม่มีการตัดเงิน</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PHASE 3.2: LIST / TABLE VIEW WITH SEARCH & FILTERS                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter Navigation Tabs */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
              <button
                onClick={() => setActiveTab('pending_approval')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'pending_approval'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>รออนุมัติ</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'pending_approval' ? 'bg-amber-100 text-amber-800' : 'bg-slate-300 text-slate-700'
                }`}>
                  {counts.pending_approval}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('approved')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'approved'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>อนุมัติแล้ว</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
                }`}>
                  {counts.approved}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('revision')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'revision'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>ส่งกลับแก้ไข</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'revision' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300 text-slate-700'
                }`}>
                  {counts.revision}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('rejected')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'rejected'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>ไม่อนุมัติ</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-300 text-slate-700'
                }`}>
                  {counts.rejected}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>ทั้งหมด</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-300 text-slate-700">
                  {counts.all}
                </span>
              </button>
            </div>

            {/* Search Input & Date Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่, ชื่อรอบ, ผู้ขอเบิก..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <span>ถึง</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {(search || dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">เลขที่รอบเบิก</th>
                <th className="py-3 px-4">หัวข้อ / วัตถุประสงค์</th>
                <th className="py-3 px-4">วันที่ขอเบิก</th>
                <th className="py-3 px-4">ผู้ขอเบิก (Officer)</th>
                <th className="py-3 px-4 text-center">รายการช่วยเหลือ</th>
                <th className="py-3 px-4 text-center">ค่าบริหาร</th>
                <th className="py-3 px-4 text-right">ยอดรวมเงินเบิก</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    กำลังโหลดข้อมูลรอบการเบิกเงิน...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    ไม่พบรายการรอบการเบิกเงินในหมวดหมู่นี้
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr
                    key={batch.id}
                    onClick={() => loadDetail(batch.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {batch.workflowNo}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-xs truncate">
                      {batch.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {batch.date}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                      {batch.operatorName}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {batch.aidCount} รายการ
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {batch.adminCount} รายการ
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap text-sm">
                      ฿{batch.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(batch.step1Status, batch.overallStatus)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadDetail(batch.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {batch.step1Status === 'pending_approval' ? 'ตรวจสอบและพิจารณา' : 'ดูรายละเอียด'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PHASE 3.3: DETAIL MODAL / DRAWER (5 SECTIONS)                          */}
      {/* ========================================================================= */}
      {selectedWorkflowId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500 uppercase">
                      เลขที่รอบเบิก:
                    </span>
                    <span className="font-mono font-black text-slate-900 text-base">
                      {detail?.workflow.workflowNo || selectedWorkflowId}
                    </span>
                    {detail && getStatusBadge(detail.workflow.step1Status, detail.workflow.overallStatus)}
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-0.5">
                    {detail?.workflow.title || 'กำลังโหลดรายละเอียด...'}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedWorkflowId(null);
                  setDetail(null);
                  setActionError('');
                  setActionSuccessMessage('');
                }}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {loadingDetail ? (
                <div className="py-20 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-400" />
                  กำลังโหลดข้อมูลรอบการเบิกและรายการย่อย...
                </div>
              ) : !detail ? (
                <div className="p-6 text-center text-rose-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  {actionError || 'ไม่พบข้อมูลรอบการเบิก'}
                </div>
              ) : (
                <>
                  {/* Action Success Alert */}
                  {actionSuccessMessage && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{actionSuccessMessage}</span>
                    </div>
                  )}

                  {/* Action Error Alert */}
                  {actionError && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* ------------------------------------------------------------- */}
                  {/* SECTION 1: ข้อมูลรอบเบิก (Batch Information)                    */}
                  {/* ------------------------------------------------------------- */}
                  <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-slate-500" />
                      ส่วนที่ 1: ข้อมูลรอบการเบิกเงิน (Batch Overview)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium">เลขที่รอบเบิก:</span>
                        <p className="font-mono font-bold text-slate-900 text-sm">{detail.workflow.workflowNo}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">วันที่ขอเบิก:</span>
                        <p className="font-semibold text-slate-800">{detail.workflow.date}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">ผู้ขอเบิก (Officer):</span>
                        <p className="font-semibold text-slate-800">{detail.workflow.operatorName}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">ประเภทกองทุน:</span>
                        <p className="font-semibold text-slate-800">
                          {detail.workflow.fundType === 'zakat' ? 'กองทุนซะกาต (Zakat Fund)' : 'กองทุนทั่วไป/บริหาร'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">บัญชีต้นทาง (เหรัญญิก):</span>
                        <p className="font-semibold text-slate-800">{detail.workflow.sourceAccountName}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">สถานะรอบเบิก:</span>
                        <div className="mt-1">
                          {getStatusBadge(detail.workflow.step1Status, detail.workflow.overallStatus)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* SECTION 2: รายการช่วยเหลือ (Aid Assistance Line Items)           */}
                  {/* ------------------------------------------------------------- */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-teal-600" />
                        ส่วนที่ 2: รายการสงเคราะห์และช่วยเหลือผู้มีสิทธิ์ ({detail.aidItems.length} รายการ)
                      </h3>
                      <span className="text-xs font-bold text-teal-700">
                        รวมเงินสงเคราะห์: ฿{detail.aidItems.reduce((s, it) => s + it.thisDisbursementAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-teal-50/50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">ลำดับ</th>
                            <th className="py-2.5 px-3">เลขที่คำร้อง</th>
                            <th className="py-2.5 px-3">ชื่อผู้รับประโยชน์</th>
                            <th className="py-2.5 px-3">หมวดอสนาฟ</th>
                            <th className="py-2.5 px-3">ประเภทความช่วยเหลือ</th>
                            <th className="py-2.5 px-3 text-right">วงเงินอนุมัติ</th>
                            <th className="py-2.5 px-3 text-right">เบิกจ่ายรอบนี้</th>
                            <th className="py-2.5 px-3 text-center">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.aidItems.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-4 text-center text-slate-400">
                                ไม่มีรายการสงเคราะห์ในรอบนี้
                              </td>
                            </tr>
                          ) : (
                            detail.aidItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{item.applicationNo}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">{item.beneficiaryName}</td>
                                <td className="py-2.5 px-3 text-slate-600">{item.asnafCategory}</td>
                                <td className="py-2.5 px-3 text-slate-600">{item.assistanceType}</td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-500">
                                  ฿{item.approvedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-teal-800">
                                  ฿{item.thisDisbursementAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* SECTION 3: ค่าใช้จ่ายบริหาร (Administrative Expenses)           */}
                  {/* ------------------------------------------------------------- */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-amber-600" />
                        ส่วนที่ 3: รายการค่าใช้จ่ายบริหารสำนักงาน ({detail.adminItems.length} รายการ)
                      </h3>
                      <span className="text-xs font-bold text-amber-700">
                        รวมค่าบริหาร: ฿{detail.adminItems.reduce((s, it) => s + it.amount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-amber-50/50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">ลำดับ</th>
                            <th className="py-2.5 px-3">หมวดหมู่ค่าใช้จ่าย</th>
                            <th className="py-2.5 px-3">รายละเอียด / วัตถุประสงค์</th>
                            <th className="py-2.5 px-3">วันที่</th>
                            <th className="py-2.5 px-3 text-right">จำนวนเงิน</th>
                            <th className="py-2.5 px-3 text-center">เอกสาร/ใบเสร็จ</th>
                            <th className="py-2.5 px-3 text-center">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.adminItems.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-4 text-center text-slate-400">
                                ไม่มีรายการค่าใช้จ่ายบริหารในรอบนี้
                              </td>
                            </tr>
                          ) : (
                            detail.adminItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{item.categoryName}</td>
                                <td className="py-2.5 px-3 text-slate-700">{item.description}</td>
                                <td className="py-2.5 px-3 text-slate-500">{item.expenseDate}</td>
                                <td className="py-2.5 px-3 text-right font-black text-amber-800">
                                  ฿{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {item.receiptUrl ? (
                                    <button
                                      onClick={() =>
                                        setPreviewDoc({
                                          id: item.receiptUrl!,
                                          name: item.description,
                                          category: 'other_doc',
                                          fileUrl: item.receiptUrl!,
                                          uploadDate: item.expenseDate || new Date().toISOString().slice(0, 10),
                                          status: 'verified',
                                        })
                                      }
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                                    >
                                      <Eye className="w-3 h-3" />
                                      ดูเอกสาร
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------------------- */}
                  {/* SECTION 4: บันทึกการโอนเงินจากบัญชีเหรัญญิกไปยังเงินสดเจ้าหน้าที่             */}
                  {/* (Treasurer Cash Withdrawal & Transfer Evidence to Staff Cash Float)       */}
                  {/* ------------------------------------------------------------------------- */}
                  <div className="space-y-4 bg-white rounded-3xl p-5 border-2 border-red-500/80 shadow-md">
                    {/* Header with Title and Lifecycle Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                            <FileCheck2 className="w-4 h-4 text-emerald-600" />
                            ส่วนที่ 4: บันทึกการโอนเงินจากบัญชีเหรัญญิกไปยังเงินสดเจ้าหน้าที่
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          บันทึกการถอนหรือโอนเงินจากบัญชีเหรัญญิก (1020-01) ไปยังเงินสดเจ้าหน้าที่ (1030-01) พร้อมแนบหลักฐานเอกสารครบถ้วน
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {getHandoverStatusBadge(detail.financialSummary?.status || 'pending_withdrawal')}
                      </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* PART 1: ข้อมูลการเบิกเงิน (WITHDRAWAL INFORMATION)                         */}
                    {/* ========================================================================= */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                          1
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          ส่วนที่ 1: ข้อมูลการเบิกเงิน
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        {/* 1. เลขที่รอบเบิก */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-slate-500 text-[11px] block font-medium">เลขที่รอบเบิก:</span>
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                            {detail.workflow.workflowNo}
                          </span>
                        </div>

                        {/* 2. บัญชีต้นทาง (เหรัญญิก) - Locked to 1020-01 */}
                        <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-800 text-[11px] block font-bold">บัญชีต้นทาง (เหรัญญิก):</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">คลังเหรัญญิก</span>
                          </div>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {detail.treasurerAccount?.accountName || 'บัญชีเงินสดเหรัญญิก (Treasurer Cash Float)'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            รหัสบัญชี: 1020-01 • ผู้ดำเนินการ: {detail.workflow.treasurerName || actor.name}
                          </div>
                        </div>

                        {/* 3. บัญชีปลายทาง (เงินสดเจ้าหน้าที่) - Locked to 1030-01 linked to responsible officer */}
                        <div className="bg-white p-3 rounded-xl border border-blue-200 bg-blue-50/30 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-800 text-[11px] block font-bold">บัญชีปลายทาง (เงินสดเจ้าหน้าที่):</span>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">เงินสดยืมทดรอง</span>
                          </div>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {detail.staffAccount?.accountName || 'บัญชีเงินสดยืมทดรองเจ้าหน้าที่ (Staff Cash Float)'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            รหัสบัญชี: 1030-01 • ผู้รับเงิน: {detail.workflow.operatorName}
                          </div>
                        </div>

                        {/* 4. จำนวนเงินที่เบิก (Editable if pending, display if confirmed) */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <label className="text-slate-700 text-[11px] block font-bold mb-1">
                            จำนวนเงินที่เบิก (บาท) <span className="text-rose-500">*</span>
                          </label>
                          {isEligibleToRecordTransfer ? (
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="1"
                                value={transferFormAmount}
                                onChange={(e) => setTransferFormAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full p-2 pr-8 bg-slate-50 border border-slate-300 rounded-lg font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                              />
                              <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">฿</span>
                            </div>
                          ) : (
                            <div className="font-black text-slate-900 text-base">
                              ฿{detail.financialSummary?.totalTransferred 
                                ? detail.financialSummary.totalTransferred.toLocaleString('th-TH', { minimumFractionDigits: 2 })
                                : detail.totalWithdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>

                        {/* 5. วันที่และเวลาทำรายการ */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <label className="text-slate-700 text-[11px] block font-bold mb-1">
                            วันที่และเวลาทำรายการ <span className="text-rose-500">*</span>
                          </label>
                          {isEligibleToRecordTransfer ? (
                            <input
                              type="datetime-local"
                              value={transferFormDatetime}
                              onChange={(e) => setTransferFormDatetime(e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                          ) : (
                            <div className="font-semibold text-slate-800 text-xs mt-1">
                              {detail.handovers?.[0]?.handoverDate 
                                ? `${detail.handovers[0].handoverDate} ${detail.handovers[0].handoverTime || ''}`
                                : detail.workflow.date}
                            </div>
                          )}
                        </div>

                        {/* 6. ผู้รับเงิน (เจ้าหน้าที่ผู้รับผิดชอบ) */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-slate-500 text-[11px] block font-medium">ผู้รับเงิน (เจ้าหน้าที่สำนักงาน):</span>
                          <div className="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{detail.workflow.operatorName}</span>
                          </div>
                        </div>
                      </div>

                      {/* หมายเหตุ */}
                      {isEligibleToRecordTransfer && (
                        <div className="mt-3">
                          <label className="text-slate-700 text-[11px] block font-bold mb-1">
                            หมายเหตุการส่งมอบเงินสด (ถ้ามี)
                          </label>
                          <input
                            type="text"
                            value={transferFormNotes}
                            onChange={(e) => setTransferFormNotes(e.target.value)}
                            placeholder="เช่น ถอนเงินสดจากธนาคารส่งมอบให้เจ้าหน้าที่ หรือ โอนผ่านโมบายแบงก์กิ้ง"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>
                      )}
                    </div>

                    {/* ========================================================================= */}
                    {/* PART 2: แนบเอกสารหลักฐาน (DOCUMENT EVIDENCE ATTACHMENTS)                     */}
                    {/* ========================================================================= */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                            2
                          </div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                            ส่วนที่ 2: แนบเอกสารหลักฐาน
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          รองรับ JPG, PNG, PDF ขนาดไม่เกิน 10MB
                        </span>
                      </div>

                      {/* Drag and Drop Upload Area (for new files) */}
                      {isEligibleToRecordTransfer && (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            handleAddFiles(e.dataTransfer.files);
                          }}
                          className={`border-2 border-dashed rounded-2xl p-4 text-center transition cursor-pointer relative mb-3 ${
                            isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="file"
                            multiple
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(e) => handleAddFiles(e.target.files)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center py-2">
                            <Upload className="w-6 h-6 text-slate-400 mb-1" />
                            <p className="text-xs font-bold text-slate-700">
                              ลากไฟล์มาวางที่นี่ หรือ <span className="text-emerald-600 underline">คลิกเพื่อเลือกไฟล์จากเครื่อง</span>
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              สลิปการโอนเงิน, ใบถอนเงินจากธนาคาร, ใบสำคัญรับเงิน, ใบส่งมอบเงินสด หรือเอกสารอื่น ๆ
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Pending Upload Files List (Pre-save preview with category dropdown) */}
                      {pendingFiles.length > 0 && (
                        <div className="space-y-2 mb-4 bg-white p-3 rounded-2xl border border-emerald-200">
                          <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5" />
                            ไฟล์ที่เลือกและรอการบันทึก ({pendingFiles.length} รายการ):
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {pendingFiles.map((pf) => (
                              <div
                                key={pf.tempId}
                                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs"
                              >
                                {/* Preview Thumbnail */}
                                <div
                                  onClick={() => {
                                    setPreviewDoc({
                                      id: pf.previewUrl,
                                      name: pf.name,
                                      category: 'other_doc',
                                      fileUrl: pf.previewUrl,
                                      uploadDate: new Date().toISOString().slice(0, 10),
                                      status: 'pending',
                                    });
                                  }}
                                  className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80"
                                  title="คลิกเพื่อดูตัวอย่าง"
                                >
                                  {pf.type.startsWith('image/') ? (
                                    <img src={pf.previewUrl} alt={pf.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-slate-500" />
                                  )}
                                </div>

                                {/* File Info & Category Selector */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-800 text-[11px] truncate" title={pf.name}>
                                    {pf.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <select
                                      value={pf.documentType}
                                      onChange={(e) => handleUpdatePendingFileType(pf.tempId, e.target.value as any)}
                                      className="p-1 text-[10px] bg-white border border-slate-200 rounded font-semibold text-slate-700"
                                    >
                                      <option value="transfer_slip">สลิปการโอนเงิน</option>
                                      <option value="bank_withdrawal_slip">ใบถอนเงินจากธนาคาร</option>
                                      <option value="payment_voucher_receipt">ใบสำคัญรับเงิน</option>
                                      <option value="cash_handover_slip">ใบส่งมอบเงินสด</option>
                                      <option value="other_document">เอกสารอื่น ๆ</option>
                                    </select>
                                    <span className="text-[10px] text-slate-400">
                                      {(pf.size / 1024).toFixed(0)} KB
                                    </span>
                                  </div>
                                </div>

                                {/* Remove button */}
                                <button
                                  type="button"
                                  onClick={() => handleRemovePendingFile(pf.tempId)}
                                  className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition shrink-0"
                                  title="ลบไฟล์นี้"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Saved Evidence Items Table (Existing in Database) */}
                      {detail.transferEvidence?.items && detail.transferEvidence.items.length > 0 ? (
                        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/70 text-[11px] font-bold text-slate-700 border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">ลำดับ</th>
                                <th className="py-2.5 px-3">ประเภทเอกสาร</th>
                                <th className="py-2.5 px-3">ชื่อไฟล์ / ขนาด</th>
                                <th className="py-2.5 px-3 text-right">จำนวนเงิน</th>
                                <th className="py-2.5 px-3">ผู้บันทึก / วันที่</th>
                                <th className="py-2.5 px-3 text-center">ดูเอกสาร</th>
                                <th className="py-2.5 px-3 text-center">ดาวน์โหลด</th>
                                {isEligibleToRecordTransfer && (
                                  <th className="py-2.5 px-3 text-right">ลบ</th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {detail.transferEvidence.items.map((ev, idx) => (
                                <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <Receipt className="w-3 h-3 text-emerald-600" />
                                      {(ev as any).documentTypeName || 'สลิปการโอนเงิน'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <p className="font-semibold text-slate-900 truncate max-w-[180px]" title={ev.fileName}>
                                      {ev.fileName}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      {((ev.fileSize || 0) / 1024).toFixed(1)} KB • {ev.mimeType}
                                    </p>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-black text-emerald-700 text-xs sm:text-sm">
                                    ฿{ev.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="text-slate-800 font-medium">{ev.createdByName}</div>
                                    <div className="text-[10px] text-slate-400">
                                      {ev.transferDatetime?.replace('T', ' ').slice(0, 16)}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      onClick={() =>
                                        setPreviewDoc({
                                          id: ev.fileUrl,
                                          name: ev.fileName,
                                          category: 'other_doc',
                                          fileUrl: ev.fileUrl,
                                          uploadDate: ev.transferDatetime.slice(0, 10),
                                          status: 'verified',
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition"
                                    >
                                      <Eye className="w-3 h-3" />
                                      ดูสลิป
                                    </button>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <a
                                      href={`/api/storage/download?docId=${encodeURIComponent(ev.fileUrl)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-[11px] transition"
                                    >
                                      <Download className="w-3 h-3" />
                                      ดาวน์โหลด
                                    </a>
                                  </td>
                                  {isEligibleToRecordTransfer && (
                                    <td className="py-2.5 px-3 text-right">
                                      <button
                                        onClick={() => handleDeleteEvidence(ev.id)}
                                        className="p-1 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                                        title="ลบหลักฐานนี้"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        !pendingFiles.length && (
                          <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
                            <FileText className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                            <p className="text-xs font-semibold">ยังไม่มีเอกสารหลักฐานแนบ</p>
                            <p className="text-[11px] text-slate-400">กรุณาลากไฟล์หรือเลือกไฟล์เพื่อแนบหลักฐาน</p>
                          </div>
                        )
                      )}
                    </div>

                    {/* ========================================================================= */}
                    {/* PART 3: สรุปยอดเงิน (FINANCIAL SUMMARY 6-GRID)                             */}
                    {/* ========================================================================= */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                          3
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          ส่วนที่ 3: สรุปยอดเงิน (Financial Summary)
                        </h4>
                      </div>

                      {/* 6 Automated Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                        {/* 1. ยอดที่ขอเบิกทั้งหมด */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-slate-500 text-[10px] block font-bold">1. ยอดขอเบิกทั้งหมด:</span>
                          <strong className="text-slate-900 font-black text-sm block mt-1">
                            ฿{(detail.financialSummary?.totalRequested ?? detail.totalWithdrawAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>

                        {/* 2. ยอดที่โอนหรือถอนแล้ว */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-slate-500 text-[10px] block font-bold">2. ยอดโอน/ถอนแล้ว:</span>
                          <strong className="text-emerald-700 font-black text-sm block mt-1">
                            ฿{(detail.financialSummary?.totalTransferred ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>

                        {/* 3. ยอดที่ยืนยันรับแล้ว */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-slate-500 text-[10px] block font-bold">3. ยอดรับเงินแล้ว:</span>
                          <strong className="text-teal-700 font-black text-sm block mt-1">
                            ฿{(detail.financialSummary?.confirmedReceived ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>

                        {/* 4. ยอดที่ยังไม่ได้เบิก */}
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-slate-500 text-[10px] block font-bold">4. ยอดค้างเบิก:</span>
                          <strong className={`font-black text-sm block mt-1 ${
                            (detail.financialSummary?.remainingToTransfer ?? 0) > 0 ? 'text-amber-700' : 'text-slate-500'
                          }`}>
                            ฿{(detail.financialSummary?.remainingToTransfer ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>

                        {/* 5. ยอดคงเหลือในบัญชีเหรัญญิก */}
                        <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
                          <span className="text-emerald-800 text-[10px] block font-bold">5. คงเหลือเหรัญญิก:</span>
                          <strong className="text-slate-900 font-black text-sm block mt-1">
                            ฿{(detail.financialSummary?.treasurerBalance ?? detail.treasurerAccount?.currentBalance ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>

                        {/* 6. ยอดเงินสดคงเหลือของเจ้าหน้าที่ */}
                        <div className="bg-white p-3 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
                          <span className="text-blue-800 text-[10px] block font-bold">6. คงเหลือเงินสด จนท.:</span>
                          <strong className="text-slate-900 font-black text-sm block mt-1">
                            ฿{(detail.financialSummary?.staffCashBalance ?? detail.staffAccount?.currentBalance ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>

                      {/* Discrepancy Indicator Banner */}
                      <div className="mt-3">
                        {detail.financialSummary?.isMatched || (detail.financialSummary?.totalTransferred === detail.totalWithdrawAmount && detail.financialSummary?.totalTransferred > 0) ? (
                          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-2 border border-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>ยอดเงินโอน/ถอนตรงกับยอดขอเบิกครบถ้วน (฿{detail.totalWithdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })})</span>
                          </div>
                        ) : (detail.financialSummary?.totalTransferred || 0) > 0 ? (
                          <div className="p-2.5 rounded-xl bg-rose-100 text-rose-900 text-xs font-bold flex items-center gap-2 border border-rose-300">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                              พบส่วนต่างของยอดเงิน:{' '}
                              {(detail.financialSummary?.mismatchDiff || 0) < 0
                                ? `ยอดโอนขาดไป ฿${Math.abs(detail.financialSummary?.mismatchDiff || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                                : `ยอดโอนเกินมา ฿${(detail.financialSummary?.mismatchDiff || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}
                              {' '}(ยอดขอเบิก ฿{detail.totalWithdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })})
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Action Error / Success Display */}
                    {transferFormError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{transferFormError}</span>
                      </div>
                    )}

                    {/* Form Actions Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-slate-500">
                        * ข้อมูลจะถูกบันทึกเป็นประวัติธุรกรรม และจะบันทึกบัญชีแยกประเภท (GL) เมื่อเจ้าหน้าที่ยืนยันรับเงินสด
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Treasurer Submit Button */}
                        {isEligibleToRecordTransfer && (
                          <button
                            onClick={handleRecordTransferAndHandover}
                            disabled={transferFormBusy || (pendingFiles.length === 0 && (!detail.transferEvidence?.items || detail.transferEvidence.items.length === 0))}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-sm disabled:opacity-50 cursor-pointer"
                          >
                            {transferFormBusy ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                กำลังบันทึกข้อมูล...
                              </>
                            ) : (
                              <>
                                <FileCheck2 className="w-3.5 h-3.5" />
                                บันทึกการส่งมอบเงินสดและหลักฐาน
                              </>
                            )}
                          </button>
                        )}

                        {/* Office Staff Confirmation Buttons */}
                        {(detail.financialSummary?.status === 'pending_staff_confirm' || detail.workflow.step2Status === 'transferred') &&
                          (actor.id === detail.workflow.operatorId || actor.role === 'super_admin' || actor.role === 'staff' || actor.role === 'finance') && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStaffConfirmReceipt('fully_received')}
                                disabled={staffConfirmBusy}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                ยืนยันรับเงินสดครบถ้วน
                              </button>

                              <button
                                onClick={() =>
                                  setStaffConfirmDecisionModal({
                                    open: true,
                                    decision: 'partially_received',
                                  })
                                }
                                disabled={staffConfirmBusy}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                แจ้งยอดรับไม่ครบ
                              </button>

                              <button
                                onClick={() =>
                                  setStaffConfirmDecisionModal({
                                    open: true,
                                    decision: 'returned_for_review',
                                  })
                                }
                                disabled={staffConfirmBusy}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition shadow-2xs"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                ส่งกลับตรวจสอบ
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* SECTION 5: สรุปยอดเงิน & ยอดเงินคงเหลือจำลอง                     */}
                  {/* ------------------------------------------------------------- */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-6 border border-slate-200">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-4">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      ส่วนที่ 5: สรุปยอดเงินและจำลองยอดคงเหลือบัญชีเหรัญญิก (Float Balance Simulation)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 text-xs font-medium">ยอดรายการช่วยเหลือ:</span>
                        <p className="text-lg font-black text-teal-800 mt-1">
                          ฿{detail.aidItems.reduce((s, it) => s + it.thisDisbursementAmount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 text-xs font-medium">ยอดค่าใช้จ่ายบริหาร:</span>
                        <p className="text-lg font-black text-amber-800 mt-1">
                          ฿{detail.adminItems.reduce((s, it) => s + it.amount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs">
                        <span className="text-slate-900 text-xs font-bold">ยอดขอเบิกเงินรอบนี้ทั้งสิ้น:</span>
                        <p className="text-xl font-black text-slate-950 mt-1">
                          ฿{detail.totalWithdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Simulation Card */}
                    {detail.treasurerAccount && (
                      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        detail.treasurerAccount.isSufficient
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50/80 border-rose-200 text-rose-950'
                      }`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-bold text-xs">
                            <Wallet className="w-4 h-4" />
                            <span>{detail.treasurerAccount.accountName} (รหัส 1020-01)</span>
                          </div>
                          <p className="text-xs text-slate-600">
                            ยอดเงินคงเหลือปัจจุบันในคลัง: <strong className="text-slate-900">฿{detail.treasurerAccount.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>
                          </p>
                          <p className="text-xs font-semibold">
                            ยอดคงเหลือจำลองหลังอนุมัติรอบนี้:{' '}
                            <strong className={detail.treasurerAccount.isSufficient ? 'text-emerald-700 text-sm' : 'text-rose-700 text-sm'}>
                              ฿{detail.treasurerAccount.simulatedBalanceAfter.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </strong>
                          </p>
                        </div>

                        <div>
                          {detail.treasurerAccount.isSufficient ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              วงเงินเหรัญญิกเพียงพอ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-black">
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                              วงเงินเหรัญญิกไม่เพียงพอ
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Important Regulatory Banner */}
                    <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">หลักเกณฑ์การควบคุมทางการเงิน:</strong> การอนุมัติในขั้นตอนนี้เป็นการยืนยันความถูกต้องของรายการและจองยอดเงิน{' '}
                        <strong>โดยยังไม่มีการตัดเงินสดจริงหรือบันทึกบัญชีแยกประเภท (GL)</strong> ระบบจะตัดเงินสดและบันทึกบัญชีแยกประเภทเมื่อเหรัญญิกส่งมอบเงินสดจริง (Cash Handover) ให้แก่เจ้าหน้าที่เท่านั้น
                      </div>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* SECTION 6: ประวัติการดำเนินงาน (Audit History & Events)          */}
                  {/* ------------------------------------------------------------- */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      ส่วนที่ 6: ประวัติการดำเนินงานและเส้นทางการอนุมัติ (Audit Trail)
                    </h3>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                      {detail.approvalEvents.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">ยังไม่มีประวัติการอนุมัติ</p>
                      ) : (
                        <div className="space-y-3">
                          {detail.approvalEvents.map((event) => (
                            <div key={event.id} className="flex items-start gap-3 text-xs border-b border-slate-200/60 pb-2.5 last:border-0 last:pb-0">
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-[10px] shrink-0 mt-0.5">
                                {event.action === 'APPROVE' ? '✓' : event.action === 'RETURN_FOR_REVISION' ? '↩' : event.action === 'REJECT' ? '✕' : '•'}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900">
                                    {event.action} — โดย {event.actorName} ({event.actorRole})
                                  </span>
                                  <span className="text-[11px] text-slate-400">{event.createdAt}</span>
                                </div>
                                {event.note && (
                                  <p className="text-slate-600 mt-1 bg-white p-2 rounded-xl border border-slate-200/60">
                                    {event.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* =================================================================== */}
            {/* 5. PHASE 4: 3 TREASURER ACTION BUTTONS & FOOTER                     */}
            {/* =================================================================== */}
            {detail && (
              <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {detail.workflow.step1Status === 'pending_approval' ? (
                    <span className="text-amber-700 font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      คำขอนี้รอการพิจารณาจากฝ่ายเหรัญญิก
                    </span>
                  ) : detail.workflow.step1Status === 'approved' ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      อนุมัติแล้วโดย {detail.workflow.approverName || 'เหรัญญิก'}
                    </span>
                  ) : (
                    <span>สถานะปัจจุบัน: {detail.workflow.step1Status}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {detail.workflow.step1Status === 'pending_approval' && (
                    <>
                      {/* Button 1: ส่งกลับแก้ไข */}
                      <button
                        onClick={() => {
                          setActionType('return_for_revision');
                          setReasonInput('');
                          setActionError('');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl border border-blue-300 bg-white hover:bg-blue-50 text-blue-800 text-xs font-bold transition shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        ส่งกลับแก้ไข
                      </button>

                      {/* Button 2: ไม่อนุมัติ */}
                      <button
                        onClick={() => {
                          setActionType('reject');
                          setReasonInput('');
                          setActionError('');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-800 text-xs font-bold transition shadow-2xs"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        ไม่อนุมัติ
                      </button>

                      {/* Button 3: อนุมัติรอบเบิก (Gated by transfer evidence) */}
                      <div className="flex items-center gap-2">
                        {!detail.transferEvidence?.isApprovalReady && (
                          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              {!detail.transferEvidence || detail.transferEvidence.items.length === 0
                                ? 'กรุณาแนบหลักฐานการโอนเงินก่อนอนุมัติ'
                                : !detail.transferEvidence.isAmountMatched
                                ? 'ยอดตามหลักฐานไม่ตรงกับยอดขอเบิก'
                                : 'มีหลักฐานที่ยังไม่ผ่านการตรวจสอบ'}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setActionType('approve');
                            setReasonInput('');
                            setActionError('');
                          }}
                          disabled={!detail.transferEvidence?.isApprovalReady}
                          title={
                            !detail.transferEvidence?.isApprovalReady
                              ? 'ไม่สามารถอนุมัติได้: ต้องแนบหลักฐานการโอนเงินและตรวจสอบความถูกต้องให้ตรงกับยอดขอเบิกครบถ้วนก่อน'
                              : 'อนุมัติรอบการเบิกเงิน'
                          }
                          className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl text-white text-xs font-black transition shadow-xs ${
                            detail.transferEvidence?.isApprovalReady
                              ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                              : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          อนุมัติรอบเบิก
                        </button>
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setSelectedWorkflowId(null);
                      setDetail(null);
                    }}
                    className="px-4 py-2 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ACTION CONFIRMATION MODAL (APPROVE / REVISION / REJECT)                 */}
      {/* ========================================================================= */}
      {actionType && detail && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {actionType === 'approve' && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ยืนยันการอนุมัติรอบการเบิกเงิน
                  </>
                )}
                {actionType === 'return_for_revision' && (
                  <>
                    <RotateCcw className="w-5 h-5 text-blue-600" />
                    ยืนยันการส่งกลับแก้ไข
                  </>
                )}
                {actionType === 'reject' && (
                  <>
                    <Ban className="w-5 h-5 text-rose-600" />
                    ยืนยันการไม่อนุมัติรอบการเบิกเงิน
                  </>
                )}
              </h3>
              <button
                onClick={() => setActionType(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context Summary in Confirmation Modal */}
            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-1.5 border border-slate-200/80">
              <div className="flex justify-between">
                <span className="text-slate-500">เลขที่รอบเบิก:</span>
                <span className="font-mono font-bold text-slate-900">{detail.workflow.workflowNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ยอดรวมขอเบิก:</span>
                <span className="font-black text-slate-900">
                  ฿{detail.totalWithdrawAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {actionType === 'approve' && detail.transferEvidence && (
                <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1">
                  <span className="text-emerald-700 font-bold">ยอดตามหลักฐานโอนเงินที่ตรวจผ่าน:</span>
                  <span className="font-black text-emerald-700">
                    ฿{detail.transferEvidence.verifiedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {actionType === 'approve' && detail.treasurerAccount && (
                <div className="flex justify-between">
                  <span className="text-slate-500">ยอดคงเหลือจำลองคลังเหรัญญิก:</span>
                  <span className="font-black text-emerald-700">
                    ฿{detail.treasurerAccount.simulatedBalanceAfter.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            {actionType === 'approve' && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 flex items-start gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  หลักฐานการโอนเงินได้รับการตรวจสอบความถูกต้องครบถ้วนแล้ว เมื่ออนุมัติรอบเบิก ระบบจะเปลี่ยนสถานะเป็น <strong>&quot;อนุมัติแล้ว (รอส่งมอบเงินสด)&quot;</strong> โดยจะบันทึกบัญชีแยกประเภท (GL) ในขั้นตอนส่งมอบเงินสดจริง
                </div>
              </div>
            )}

            {/* Reason Textarea (Mandatory for Revision and Rejection) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {actionType === 'approve' ? 'หมายเหตุการอนุมัติ (ถ้ามี):' : 'เหตุผลในการดำเนินการ (จำเป็นต้องระบุ):'}
                {(actionType === 'return_for_revision' || actionType === 'reject') && (
                  <span className="text-rose-500 ml-1">*</span>
                )}
              </label>
              <textarea
                rows={3}
                placeholder={
                  actionType === 'approve'
                    ? 'ระบุหมายเหตุเพิ่มเติม (ถ้ามี)...'
                    : actionType === 'return_for_revision'
                    ? 'ระบุสิ่งที่ต้องการให้เจ้าหน้าที่สำนักงานแก้ไข เช่น แก้ไขเอกสารใบเสร็จ, ปรับยอดเงิน...'
                    : 'ระบุเหตุผลที่ไม่อนุมัติคำขอนี้...'
                }
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                className="w-full p-3 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {actionError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {actionError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActionType(null)}
                disabled={actionBusy}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                ยกเลิก
              </button>

              <button
                onClick={handleReviewAction}
                disabled={actionBusy || ((actionType === 'return_for_revision' || actionType === 'reject') && !reasonInput.trim())}
                className={`px-5 py-2 rounded-2xl text-white text-xs font-black transition disabled:opacity-50 ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionType === 'return_for_revision'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionBusy ? 'กำลังบันทึก...' : 'ยืนยันการทำรายการ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. UPLOAD TRANSFER EVIDENCE MODAL                                         */}
      {/* ========================================================================= */}
      {showUploadEvidenceModal && detail && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">แนบหลักฐานการโอนเงิน</h3>
                  <p className="text-[11px] text-slate-500">โอนจากบัญชีธนาคารเข้าบัญชีเงินสดเหรัญญิก (1020-01)</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadEvidenceModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Source Bank Account */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  บัญชีธนาคารต้นทาง <span className="text-rose-500">*</span>
                </label>
                <select
                  value={uploadBankId}
                  onChange={(e) => setUploadBankId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {bankAccounts.length === 0 ? (
                    <option value="">กำลังโหลดรายชื่อธนาคาร...</option>
                  ) : (
                    bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bank_name} - {b.account_number} ({b.account_name})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Destination Account (Fixed) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  บัญชีปลายทาง (เหรัญญิก)
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">
                  บัญชีเงินสดเหรัญญิก (Treasurer Cash Float) — รหัส 1020-01
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    จำนวนเงินที่โอน (บาท) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={uploadAmount}
                    onChange={(e) => setUploadAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    วัน-เวลาที่โอน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={uploadDatetime}
                    onChange={(e) => setUploadDatetime(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Ref No & Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  เลขที่อ้างอิงธุรกรรม / Ref No. (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={uploadRefNo}
                  onChange={(e) => setUploadRefNo(e.target.value)}
                  placeholder="เช่น 20261111XXXX หรือ เลขที่สลิป"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="เช่น โอนเงินงวดที่ 1 สำหรับรอบเบิกนี้"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* File Upload Area */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ไฟล์สลิปหรือหลักฐานการโอน <span className="text-rose-500">*</span> (JPG, PNG, PDF ขนาดไม่เกิน 10MB)
                </label>
                <div className="mt-1 border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        setUploadError('');
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-700">
                      <FileCheck className="w-5 h-5 shrink-0" />
                      <div className="text-left max-w-xs truncate">
                        <p className="font-bold text-xs truncate">{uploadFile.name}</p>
                        <p className="text-[10px] text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-700">คลิกหรือลากไฟล์มาวางที่นี่</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">รองรับไฟล์ JPG, PNG, PDF</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowUploadEvidenceModal(false)}
                disabled={uploadBusy}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                ยกเลิก
              </button>

              <button
                onClick={handleUploadAndAttachEvidence}
                disabled={uploadBusy || !uploadFile}
                className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition disabled:opacity-50"
              >
                {uploadBusy ? 'กำลังอัปโหลด...' : 'บันทึกและแนบหลักฐาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. EVIDENCE DECISION MODAL (INVALID / NEED MORE INFO)                     */}
      {/* ========================================================================= */}
      {evidenceDecisionModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {evidenceDecisionModal.decision === 'invalid' ? (
                  <>
                    <Ban className="w-5 h-5 text-rose-600" />
                    ระบุว่าหลักฐานไม่ถูกต้อง
                  </>
                ) : (
                  <>
                    <Info className="w-5 h-5 text-blue-600" />
                    ขอหลักฐานหรือข้อมูลเพิ่มเติม
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setEvidenceDecisionModal(null);
                  setEvidenceDecisionReason('');
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1 border border-slate-200/80">
              <p className="font-semibold text-slate-800">
                ไฟล์: <span className="font-normal">{evidenceDecisionModal.evidence.fileName}</span>
              </p>
              <p className="font-semibold text-slate-800">
                จำนวนเงิน: <span className="font-bold text-emerald-700">฿{evidenceDecisionModal.evidence.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                เหตุผลที่ดำเนินการ <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder={
                  evidenceDecisionModal.decision === 'invalid'
                    ? 'ระบุสาเหตุที่หลักฐานไม่ถูกต้อง เช่น สลิปไม่ชัดเจน, บัญชีปลายทางไม่ถูกต้อง, สลิปซ้ำ...'
                    : 'ระบุข้อมูลที่ต้องการเพิ่มเติม เช่น ขอสลิปฉบับเต็ม, ขอเอกสารยืนยันจากธนาคาร...'
                }
                value={evidenceDecisionReason}
                onChange={(e) => setEvidenceDecisionReason(e.target.value)}
                className="w-full p-3 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setEvidenceDecisionModal(null);
                  setEvidenceDecisionReason('');
                }}
                disabled={evidenceDecisionBusy}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                ยกเลิก
              </button>

              <button
                onClick={async () => {
                  if (!evidenceDecisionReason.trim()) {
                    alert('กรุณาระบุเหตุผล');
                    return;
                  }
                  setEvidenceDecisionBusy(true);
                  try {
                    await handleVerifyEvidence(
                      evidenceDecisionModal.evidence.id,
                      evidenceDecisionModal.decision,
                      evidenceDecisionReason
                    );
                  } finally {
                    setEvidenceDecisionBusy(false);
                  }
                }}
                disabled={evidenceDecisionBusy || !evidenceDecisionReason.trim()}
                className={`px-5 py-2 rounded-2xl text-white text-xs font-black transition disabled:opacity-50 ${
                  evidenceDecisionModal.decision === 'invalid'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {evidenceDecisionBusy ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. STAFF CONFIRMATION DECISION MODAL (PARTIAL / RETURN)                   */}
      {/* ========================================================================= */}
      {staffConfirmDecisionModal && staffConfirmDecisionModal.open && detail && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {staffConfirmDecisionModal.decision === 'partially_received' ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    แจ้งยอดรับเงินสดไม่ครบ
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-5 h-5 text-rose-600" />
                    ส่งกลับรายการให้เหรัญญิกตรวจสอบ
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setStaffConfirmDecisionModal(null);
                  setStaffReceivedAmount('');
                  setStaffDiscrepancyReason('');
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-1.5 border border-slate-200/80">
              <div className="flex justify-between">
                <span className="text-slate-500">เลขที่รอบเบิก:</span>
                <span className="font-mono font-bold text-slate-900">{detail.workflow.workflowNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ยอดที่ส่งมอบตามบันทึก:</span>
                <span className="font-black text-slate-900">
                  ฿{(detail.financialSummary?.totalTransferred ?? detail.totalWithdrawAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {staffConfirmDecisionModal.decision === 'partially_received' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  จำนวนเงินที่ได้รับจริง (บาท) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={(detail.financialSummary?.totalTransferred ?? detail.totalWithdrawAmount) - 0.01}
                  value={staffReceivedAmount}
                  onChange={(e) => setStaffReceivedAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2.5 text-xs font-black border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {staffConfirmDecisionModal.decision === 'partially_received'
                  ? 'สาเหตุหรือเหตุผลที่ได้รับเงินไม่ครบ'
                  : 'เหตุผลในการส่งกลับตรวจสอบ'} <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder={
                  staffConfirmDecisionModal.decision === 'partially_received'
                    ? 'ระบุสาเหตุ เช่น ธนาคารหักค่าธรรมเนียม, ยอดเงินสดในซองนับได้ไม่ครบ...'
                    : 'ระบุสาเหตุ เช่น สลิปโอนเงินไม่ตรงกับยอดขอเบิก, เอกสารไม่ครบถ้วน...'
                }
                value={staffDiscrepancyReason}
                onChange={(e) => setStaffDiscrepancyReason(e.target.value)}
                className="w-full p-3 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setStaffConfirmDecisionModal(null);
                  setStaffReceivedAmount('');
                  setStaffDiscrepancyReason('');
                }}
                disabled={staffConfirmBusy}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                ยกเลิก
              </button>

              <button
                onClick={() => {
                  if (!staffDiscrepancyReason.trim()) {
                    alert('กรุณาระบุเหตุผล');
                    return;
                  }
                  if (staffConfirmDecisionModal.decision === 'partially_received') {
                    const amt = Number(staffReceivedAmount);
                    if (isNaN(amt) || amt <= 0) {
                      alert('กรุณาระบุจำนวนเงินที่ได้รับจริงให้ถูกต้อง');
                      return;
                    }
                  }
                  handleStaffConfirmReceipt(
                    staffConfirmDecisionModal.decision,
                    staffConfirmDecisionModal.decision === 'partially_received' ? Number(staffReceivedAmount) : undefined,
                    staffDiscrepancyReason
                  );
                }}
                disabled={
                  staffConfirmBusy ||
                  !staffDiscrepancyReason.trim() ||
                  (staffConfirmDecisionModal.decision === 'partially_received' && (!staffReceivedAmount || Number(staffReceivedAmount) <= 0))
                }
                className={`px-5 py-2 rounded-2xl text-white text-xs font-black transition disabled:opacity-50 ${
                  staffConfirmDecisionModal.decision === 'partially_received'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {staffConfirmBusy ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
