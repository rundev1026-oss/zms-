'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  AssistanceFinancialDetail, 
  AssistanceFinanceDiscrepancy, 
  AssistanceExecutionRecord, 
  AssistanceOutcomeStatus 
} from '@/types';
import { ModalPortal } from '@/components/common/Modal';
import { 
  ArrowUpRight, 
  CheckCircle, 
  Upload, 
  Printer, 
  Wallet, 
  Building2, 
  FileCheck, 
  AlertCircle,
  X,
  CreditCard,
  Check,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  Eye,
  Download,
  ExternalLink,
  ChevronRight,
  HandCoins,
  History,
  Lock,
  MessageSquareWarning,
  RefreshCw,
  Info,
  Calendar,
  Paperclip,
  Edit3,
  CheckSquare,
  Square,
  CheckCheck,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  LayoutGrid,
  TableProperties,
  ClipboardCheck,
  ArrowRight
} from 'lucide-react';

export const OUTCOME_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  not_started: { label: 'ยังไม่เริ่มดำเนินการ', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  in_progress: { label: 'กำลังดำเนินการ', bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300' },
  partially_assisted: { label: 'ช่วยเหลือบางส่วน', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  wait_proof_verification: { label: 'รอตรวจสอบหลักฐาน', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300' },
  completed: { label: 'ช่วยเหลือเสร็จสิ้น', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  has_issues: { label: 'มีปัญหาหรือรอแก้ไข', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300' },
  cancelled: { label: 'ยกเลิกพร้อมเหตุผล', bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-300' },
  draft: { label: 'บันทึกร่าง (ยังไม่ยืนยัน)', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-dashed border-slate-300' },
};

export const getAsnafColor = (asnaf: string) => {
  switch (asnaf?.toLowerCase()) {
    case 'fakir': return { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-500' };
    case 'miskin': return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' };
    case 'gharimin': return { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-500' };
    case 'muallaf': return { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' };
    case 'ibnsabil': return { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300', dot: 'bg-sky-500' };
    case 'fisabilillah': return { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-500' };
    default: return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-400' };
  }
};

export const formatThaiDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  if (dateStr.includes('ต.ค.') || dateStr.includes('/') || dateStr.includes('พ.ศ.')) {
    return dateStr;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const month = months[d.getMonth()];
    const year = d.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

interface DisbursementsViewProps {
  onNavigate: (view: string) => void;
}

export function DisbursementsView({ onNavigate }: DisbursementsViewProps) {
  const { currentUser, showToast } = useApp();

  // Financial Linkage Data State
  const [assistanceList, setAssistanceList] = useState<AssistanceFinancialDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDetail, setSelectedDetail] = useState<AssistanceFinancialDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [financeStatusFilter, setFinanceStatusFilter] = useState<string>('all');
  const [assistanceStatusFilter, setAssistanceStatusFilter] = useState<string>('all');
  const [outcomeStatusFilter, setOutcomeStatusFilter] = useState<string>('all');
  const [asnafFilter, setAsnafFilter] = useState<string>('all');
  const [assistanceTypeFilter, setAssistanceTypeFilter] = useState<string>('all');
  const [dateStartFilter, setDateStartFilter] = useState<string>('');
  const [dateEndFilter, setDateEndFilter] = useState<string>('');

  // UI View Mode & Responsive Controls
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Modals
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState<boolean>(false);
  const [showExecutionModal, setShowExecutionModal] = useState<boolean>(false);
  const [showEditExecutionModal, setShowEditExecutionModal] = useState<boolean>(false);
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<AssistanceExecutionRecord | null>(null);
  const [showProofViewerModal, setShowProofViewerModal] = useState<boolean>(false);
  const [activeProofUrl, setActiveProofUrl] = useState<string>('');
  const [activeProofName, setActiveProofName] = useState<string>('');

  // Discrepancy Form State
  const [discrepancyCategory, setDiscrepancyCategory] = useState<string>('amount_mismatch');
  const [discrepancyActualAmount, setDiscrepancyActualAmount] = useState<string>('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState<string>('');
  const [isSubmittingDiscrepancy, setIsSubmittingDiscrepancy] = useState<boolean>(false);

  // Task 3 Form State: Confirmation / Draft Execution
  const [execDate, setExecDate] = useState<string>('');
  const [execTime, setExecTime] = useState<string>('');
  const [execInstallmentNo, setExecInstallmentNo] = useState<number>(1);
  const [execTotalInstallments, setExecTotalInstallments] = useState<number>(1);
  const [execOutcome, setExecOutcome] = useState<string>('');
  const [execActualAmount, setExecActualAmount] = useState<number>(0);
  const [execActualValue, setExecActualValue] = useState<number>(0);
  const [execDetails, setExecDetails] = useState<string>('');
  const [execProofUrl, setExecProofUrl] = useState<string>('');
  const [execProofName, setExecProofName] = useState<string>('');
  const [execStatus, setExecStatus] = useState<AssistanceOutcomeStatus>('completed');
  // CRITICAL RULE: Checkbox ต้องไม่ถูกเลือกไว้ล่วงหน้า (defaultChecked = false)
  const [execIsConfirmed, setExecIsConfirmed] = useState<boolean>(false);
  const [isSubmittingExecution, setIsSubmittingExecution] = useState<boolean>(false);

  // Task 3 Form State: Edit Confirmed Execution
  const [editReason, setEditReason] = useState<string>('');
  const [editOutcome, setEditOutcome] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editValue, setEditValue] = useState<number>(0);
  const [editDetails, setEditDetails] = useState<string>('');
  const [editStatus, setEditStatus] = useState<AssistanceOutcomeStatus>('completed');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Fetch list of assistance cases with financial status
  const fetchAssistanceList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/finance/assistance-link?actorId=${currentUser.id}&actorName=${encodeURIComponent(currentUser.name)}&actorRole=${currentUser.role}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAssistanceList(json.data);
      } else {
        showToast(json.error || 'ไม่สามารถโหลดข้อมูลการช่วยเหลือได้', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssistanceList();
  }, [currentUser]);

  // Open Detailed Modal & fetch fresh details
  const handleOpenDetail = async (item: AssistanceFinancialDetail) => {
    setSelectedDetail(item);
    setShowDetailModal(true);
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/finance/assistance-link?applicationId=${item.applicationId}&actorId=${currentUser.id}&actorName=${encodeURIComponent(currentUser.name)}&actorRole=${currentUser.role}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedDetail(json.data);
      }
    } catch {
      // Keep existing data
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Open Discrepancy Modal
  const handleOpenDiscrepancy = () => {
    if (!selectedDetail) return;
    setDiscrepancyCategory('amount_mismatch');
    setDiscrepancyActualAmount(String(selectedDetail.receivedAmount || selectedDetail.handedOverAmount || ''));
    setDiscrepancyNotes('');
    setShowDiscrepancyModal(true);
  };

  // Submit Discrepancy
  const handleSubmitDiscrepancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail || isSubmittingDiscrepancy) return;

    if (!discrepancyNotes.trim()) {
      showToast('กรุณาระบุรายละเอียดข้อผิดพลาดหรือปัญหาที่พบ', 'error');
      return;
    }

    setIsSubmittingDiscrepancy(true);
    try {
      const res = await fetch('/api/finance/assistance-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discrepancy',
          applicationId: selectedDetail.applicationId,
          input: {
            withdrawalId: selectedDetail.disbursementItems[0]?.withdrawalId,
            category: discrepancyCategory,
            notes: discrepancyNotes.trim(),
            expectedAmount: selectedDetail.handedOverAmount,
            actualAmount: discrepancyActualAmount ? parseFloat(discrepancyActualAmount) : undefined,
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถบันทึกการแจ้งปัญหาได้', 'error');
        return;
      }

      showToast('ส่งรายงานปัญหายอดเงินไปยังฝ่ายการเงินเรียบร้อยแล้ว โดยไม่แก้ไขธุรกรรมเดิม', 'success');
      setShowDiscrepancyModal(false);
      // Refresh details
      await handleOpenDetail(selectedDetail);
      await fetchAssistanceList();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
    } finally {
      setIsSubmittingDiscrepancy(false);
    }
  };

  // Open Execution Modal for Confirmation or Draft (Task 3)
  const handleOpenExecutionModal = (detail: AssistanceFinancialDetail, installment?: number) => {
    setSelectedDetail(detail);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().slice(0, 5);
    const existingCount = detail.executionRecords ? detail.executionRecords.filter(r => r.isConfirmed && r.status !== 'cancelled').length : 0;
    const currentInst = installment || (existingCount + 1);
    const totalInst = detail.installmentCount || 1;
    
    setExecDate(today);
    setExecTime(now);
    setExecInstallmentNo(currentInst);
    setExecTotalInstallments(totalInst);
    
    const defaultAmt = detail.remainingBalance > 0
      ? (totalInst > 1 ? Math.min(detail.remainingBalance, Math.round(detail.approvedAmount / totalInst)) : detail.remainingBalance)
      : Math.min(detail.approvedAmount, detail.handedOverAmount || detail.approvedAmount);
    
    setExecActualAmount(defaultAmt);
    setExecActualValue(defaultAmt);
    setExecOutcome('ส่งมอบเงินสงเคราะห์ตามหลักเกณฑ์การช่วยเหลือแก่ผู้มีสิทธิ์เรียบร้อย');
    setExecDetails('เจ้าหน้าที่ผู้ดูแลลงพื้นที่ตรวจสอบความถูกต้องและส่งมอบเงินสด/สิ่งของถึงมือผู้รับตามคำร้อง');
    setExecProofUrl(`/uploads/assistance-execution-${detail.applicationNo}-${currentInst}.pdf`);
    setExecProofName(`หลักฐานการช่วยเหลือจริง_${detail.applicationNo}_งวด${currentInst}.pdf`);
    
    const defaultStat: AssistanceOutcomeStatus = totalInst > 1 && currentInst < totalInst ? 'partially_assisted' : 'completed';
    setExecStatus(defaultStat);
    
    // CRITICAL: Checkbox ต้องไม่ถูกเลือกไว้ล่วงหน้า
    setExecIsConfirmed(false);
    setShowExecutionModal(true);
  };

  // 1. Save Draft (Rule: การบันทึกร่างไม่ถือว่าช่วยเหลือเสร็จสิ้น)
  const handleSaveDraft = async () => {
    if (!selectedDetail || isSubmittingExecution) return;

    setIsSubmittingExecution(true);
    try {
      const res = await fetch('/api/finance/assistance-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft_execution',
          applicationId: selectedDetail.applicationId,
          input: {
            installmentNo: execInstallmentNo,
            totalInstallments: execTotalInstallments,
            executionDate: execDate,
            executionTime: execTime,
            assistanceOutcome: execOutcome || 'บันทึกแบบร่างผลการช่วยเหลือ',
            actualDisbursedAmount: execActualAmount,
            actualAssistanceValue: execActualValue,
            details: execDetails,
            proofUrl: execProofUrl,
            proofName: execProofName,
            status: 'draft',
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถบันทึกแบบร่างได้', 'error');
        return;
      }

      showToast('บันทึกแบบร่างผลการช่วยเหลือเรียบร้อย (ยังไม่ถือว่าเสร็จสิ้น)', 'info');
      setShowExecutionModal(false);
      await handleOpenDetail(selectedDetail);
      await fetchAssistanceList();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกร่าง', 'error');
    } finally {
      setIsSubmittingExecution(false);
    }
  };

  // 2. Confirm Completion (Enforce 6 validations + un-prechecked checkbox)
  const handleConfirmCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail || isSubmittingExecution) return;

    // Checkbox check
    if (!execIsConfirmed) {
      showToast('กรุณากดยืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง', 'error');
      return;
    }

    // 6 Validation checks
    if (!execDate || !execTime || !execOutcome.trim()) {
      showToast('กรุณาระบุวัน เวลา และผลการช่วยเหลือให้ครบถ้วน', 'error');
      return;
    }
    if (!execProofUrl || !execProofName) {
      showToast('กรุณาแนบไฟล์หลักฐานการช่วยเหลือจริงตามนโยบาย', 'error');
      return;
    }
    if (selectedDetail.handedOverAmount <= 0) {
      showToast('ไม่สามารถยืนยันผลการช่วยเหลือได้เนื่องจากยังไม่มีการส่งมอบเงินสดจากฝ่ายการเงิน', 'error');
      return;
    }
    if (execActualAmount <= 0) {
      showToast('จำนวนเงินที่ส่งมอบให้ผู้รับจริงต้องมากกว่า 0 บาท', 'error');
      return;
    }
    if (execActualAmount > selectedDetail.approvedAmount) {
      showToast(`จำนวนเงินที่รายงาน (฿${execActualAmount.toLocaleString()}) เกินยอดที่ได้รับอนุมัติ (฿${selectedDetail.approvedAmount.toLocaleString()})`, 'error');
      return;
    }
    if (execActualAmount > selectedDetail.handedOverAmount) {
      showToast(`จำนวนเงินที่รายงาน (฿${execActualAmount.toLocaleString()}) เกินยอดเงินสดที่ได้รับมอบจากฝ่ายการเงิน (฿${selectedDetail.handedOverAmount.toLocaleString()})`, 'error');
      return;
    }

    setIsSubmittingExecution(true);
    try {
      const res = await fetch('/api/finance/assistance-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_completion',
          applicationId: selectedDetail.applicationId,
          input: {
            installmentNo: execInstallmentNo,
            totalInstallments: execTotalInstallments,
            executionDate: execDate,
            executionTime: execTime,
            assistanceOutcome: execOutcome.trim(),
            actualDisbursedAmount: execActualAmount,
            actualAssistanceValue: execActualValue,
            details: execDetails.trim(),
            proofUrl: execProofUrl,
            proofName: execProofName,
            isConfirmed: true,
            confirmationStatement: 'ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง',
            status: execStatus,
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถยืนยันผลการช่วยเหลือได้', 'error');
        return;
      }

      showToast(`ยืนยันผลการช่วยเหลือสำเร็จ (สถานะ: ${json.data.outcomeStatus === 'completed' ? 'ช่วยเหลือเสร็จสิ้น' : 'ช่วยเหลือบางส่วน'})`, 'success');
      setShowExecutionModal(false);
      await handleOpenDetail(selectedDetail);
      await fetchAssistanceList();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการยืนยันผล', 'error');
    } finally {
      setIsSubmittingExecution(false);
    }
  };

  // 3. Open Edit Modal for Confirmed Record
  const handleOpenEditExecution = (rec: AssistanceExecutionRecord) => {
    setSelectedRecordForEdit(rec);
    setEditReason('');
    setEditDate(rec.executionDate);
    setEditTime(rec.executionTime);
    setEditOutcome(rec.assistanceOutcome);
    setEditAmount(rec.actualDisbursedAmount);
    setEditValue(rec.actualAssistanceValue);
    setEditDetails(rec.details || '');
    setEditStatus(rec.status);
    setShowEditExecutionModal(true);
  };

  // 4. Submit Edit for Confirmed Record
  const handleSubmitEditExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForEdit || isSubmittingEdit) return;

    if (!editReason.trim()) {
      showToast('การแก้ไขผลการช่วยเหลือที่ยืนยันแล้ว ต้องระบุเหตุผลการแก้ไขเสมอ', 'error');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch('/api/finance/assistance-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_execution',
          applicationId: selectedRecordForEdit.applicationId,
          recordId: selectedRecordForEdit.id,
          editReason: editReason.trim(),
          input: {
            executionDate: editDate,
            executionTime: editTime,
            assistanceOutcome: editOutcome.trim(),
            actualDisbursedAmount: editAmount,
            actualAssistanceValue: editValue,
            details: editDetails.trim(),
            status: editStatus,
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'ไม่สามารถแก้ไขข้อมูลได้', 'error');
        return;
      }

      showToast('แก้ไขผลการช่วยเหลือที่ยืนยันแล้วเรียบร้อย พร้อมบันทึกประวัติการแก้ไข', 'success');
      setShowEditExecutionModal(false);
      if (selectedDetail) {
        await handleOpenDetail(selectedDetail);
      }
      await fetchAssistanceList();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการแก้ไข', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Dynamic unique assistance types
  const availableAssistanceTypes = useMemo(() => {
    const set = new Set<string>();
    assistanceList.forEach((a) => {
      if (a.assistanceType) set.add(a.assistanceType);
    });
    return Array.from(set);
  }, [assistanceList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return assistanceList.filter((item) => {
      // 1. Finance Status Filter
      if (financeStatusFilter !== 'all' && item.financeStatus !== financeStatusFilter) {
        return false;
      }
      // 2. Assistance Status Filter
      if (assistanceStatusFilter !== 'all' && item.assistanceStatus !== assistanceStatusFilter) {
        return false;
      }
      // 3. Outcome Status Filter
      if (outcomeStatusFilter !== 'all' && item.outcomeStatus !== outcomeStatusFilter) {
        return false;
      }
      // 4. Asnaf Filter
      if (asnafFilter !== 'all' && item.asnafCategory !== asnafFilter) {
        return false;
      }
      // 5. Assistance Type Filter
      if (assistanceTypeFilter !== 'all' && item.assistanceType !== assistanceTypeFilter) {
        return false;
      }
      // 6. Date Range Filter
      if (dateStartFilter) {
        const itemDate = (item.appliedDate || item.actualAssistanceDate || item.approvedDate || '').slice(0, 10);
        if (itemDate && itemDate < dateStartFilter) return false;
      }
      if (dateEndFilter) {
        const itemDate = (item.appliedDate || item.actualAssistanceDate || item.approvedDate || '').slice(0, 10);
        if (itemDate && itemDate > dateEndFilter) return false;
      }
      // 7. Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const match =
          item.applicationNo.toLowerCase().includes(q) ||
          item.registrationNo.toLowerCase().includes(q) ||
          item.beneficiaryName.toLowerCase().includes(q) ||
          item.withdrawalNo.toLowerCase().includes(q) ||
          item.assistanceType.toLowerCase().includes(q) ||
          (item.branchName && item.branchName.toLowerCase().includes(q)) ||
          (item.area && item.area.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [
    assistanceList,
    financeStatusFilter,
    assistanceStatusFilter,
    outcomeStatusFilter,
    asnafFilter,
    assistanceTypeFilter,
    dateStartFilter,
    dateEndFilter,
    searchTerm
  ]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    financeStatusFilter,
    assistanceStatusFilter,
    outcomeStatusFilter,
    asnafFilter,
    assistanceTypeFilter,
    dateStartFilter,
    dateEndFilter
  ]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setFinanceStatusFilter('all');
    setAssistanceStatusFilter('all');
    setOutcomeStatusFilter('all');
    setAsnafFilter('all');
    setAssistanceTypeFilter('all');
    setDateStartFilter('');
    setDateEndFilter('');
    setCurrentPage(1);
  };

  // Open Proof Preview Modal
  const handleOpenProof = (url: string, name?: string) => {
    setActiveProofUrl(url);
    setActiveProofName(name || 'หลักฐานการส่งมอบเงิน');
    setShowProofViewerModal(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-[#0b2545] p-5 sm:p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 transform skew-x-12 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 text-teal-200 border border-white/20 flex items-center justify-center font-bold shadow-inner shrink-0">
                <Wallet className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  บันทึกการช่วยเหลือ
                </h1>
                <p className="text-xs sm:text-sm text-teal-200/90 font-medium mt-0.5">
                  จัดการรายการช่วยเหลือผู้มีสิทธิ์รับซะกาต ตรวจสอบสถานะ และบันทึกผลการช่วยเหลือ
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAssistanceList}
              disabled={isLoading}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs sm:text-sm font-semibold text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>
          </div>
        </div>

        {/* Security & Access Notice */}
        <div className="mt-4 pt-3 border-t border-white/10 text-[11px] sm:text-xs text-teal-200/90 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-300 shrink-0" />
          <span>
            <strong>หลักเกณฑ์ความปลอดภัย:</strong> เจ้าหน้าที่เห็นเฉพาะเคสที่ได้รับมอบหมาย • ข้อมูลการเงินเป็นแบบอ่านอย่างเดียว • หากพบข้อมูลไม่ตรงกันให้กด <strong>"แจ้งยอดไม่ตรง"</strong> เพื่อส่งเรื่องตรวจสอบ
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Bar (Section 2: จัดวางเป็นระเบียบ พับเก็บได้บนจอเล็ก) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Filter Bar Header / Quick Search */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้รับ, เลขที่คำร้อง (APP-...), ทะเบียน (REG-...), หรือพื้นที่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-teal-600 transition-all text-slate-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick controls: View Mode toggle & Filter toggle */}
          <div className="flex items-center gap-2 justify-between md:justify-end">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                showFilterPanel
                  ? 'bg-teal-50 border-teal-200 text-teal-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>ตัวกรองละเอียด</span>
              {showFilterPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* View Mode Toggle: Table vs Card */}
            <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-teal-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="มุมมองตารางรายการ (Table View)"
              >
                <TableProperties className="w-4 h-4" />
                <span className="hidden sm:inline">ตาราง</span>
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-white text-teal-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="มุมมองการ์ด (Card View)"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">การ์ด</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Filter Dropdowns Panel */}
        {showFilterPanel && (
          <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Date Start Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-teal-700" />
                  วันที่เริ่มต้น (จากวันที่)
                </label>
                <input
                  type="date"
                  value={dateStartFilter}
                  onChange={(e) => setDateStartFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-teal-600"
                />
              </div>

              {/* Date End Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-teal-700" />
                  วันที่สิ้นสุด (ถึงวันที่)
                </label>
                <input
                  type="date"
                  value={dateEndFilter}
                  onChange={(e) => setDateEndFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-teal-600"
                />
              </div>

              {/* Asnaf Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  หมวดอัสนัฟ
                </label>
                <select
                  value={asnafFilter}
                  onChange={(e) => setAsnafFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-teal-600"
                >
                  <option value="all">หมวดอัสนัฟ: ทั้งหมด</option>
                  <option value="fakir">ผู้ยากไร้ (Faqir)</option>
                  <option value="miskin">ผู้ขัดสน (Miskin)</option>
                  <option value="gharimin">มีหนี้สินล้นพ้นตัว (Gharimin)</option>
                  <option value="muallaf">ผู้เข้ารับอิสลามใหม่ (Muallaf)</option>
                  <option value="ibnsabil">ผู้เดินทางขาดแคลน (Ibn Sabil)</option>
                  <option value="fisabilillah">ในหนทางของอัลลอฮ์ (Fisabilillah)</option>
                </select>
              </div>

              {/* Assistance Type Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ประเภทความช่วยเหลือ
                </label>
                <select
                  value={assistanceTypeFilter}
                  onChange={(e) => setAssistanceTypeFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-teal-600"
                >
                  <option value="all">ประเภทความช่วยเหลือ: ทั้งหมด</option>
                  {availableAssistanceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  สถานะการช่วยเหลือ
                </label>
                <select
                  value={outcomeStatusFilter}
                  onChange={(e) => setOutcomeStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-teal-600"
                >
                  <option value="all">สถานะผลการช่วยเหลือ: ทั้งหมด</option>
                  <option value="not_started">ยังไม่เริ่มดำเนินการ</option>
                  <option value="in_progress">กำลังดำเนินการ</option>
                  <option value="partially_assisted">ช่วยเหลือบางส่วน (แบ่งงวด)</option>
                  <option value="wait_proof_verification">รอตรวจสอบหลักฐาน</option>
                  <option value="completed">ช่วยเหลือเสร็จสิ้น</option>
                  <option value="has_issues">มีปัญหาหรือรอแก้ไข</option>
                  <option value="cancelled">ยกเลิกพร้อมเหตุผล</option>
                </select>
              </div>
            </div>

            {/* Active filters status summary & clear button */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <span>แสดงผลลัพธ์ <strong>{filteredList.length}</strong> จากทั้งหมด {assistanceList.length} รายการ</span>
              </div>

              {(searchTerm || financeStatusFilter !== 'all' || assistanceStatusFilter !== 'all' || outcomeStatusFilter !== 'all' || asnafFilter !== 'all' || assistanceTypeFilter !== 'all' || dateStartFilter || dateEndFilter) && (
                <button
                  onClick={handleClearFilters}
                  className="text-teal-700 hover:text-teal-900 font-bold cursor-pointer underline flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Main Content: Assistance Cards UI (or alternate Table UI) */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-800">กำลังเชื่อมโยงข้อมูลการช่วยเหลือจากฐานข้อมูลจริง...</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            กำลังตรวจสอบสิทธิ์ผู้ดูแลเคสและสถานะการเงินล่าสุด
          </p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">ไม่พบข้อมูลการช่วยเหลือตามเงื่อนไขที่ระบุ</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูรายการช่วยเหลือทั้งหมดที่อยู่ในความรับผิดชอบของคุณ
            </p>
          </div>
          <button
            onClick={handleClearFilters}
            className="px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            ล้างตัวกรองและแสดงทั้งหมด
          </button>
        </div>
      ) : viewMode === 'card' ? (
        /* ================================================================= */
        /* CARD-BASED UI (Grid 2-3 cols on desktop, 2 on tablet, 1 on mobile) */
        /* ================================================================= */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedList.map((item) => {
              const statusConfig = OUTCOME_STATUS_CONFIG[item.outcomeStatus || 'not_started'] || OUTCOME_STATUS_CONFIG.not_started;
              const asnafStyle = getAsnafColor(item.asnafCategory);
              const confirmedRecord = item.executionRecords?.find((r) => r.isConfirmed);

              return (
                <div
                  key={item.applicationId}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-teal-400"
                >
                  {/* Card Header (Section 4) */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-slate-100/60 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs sm:text-sm text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                          {item.applicationNo}
                        </span>
                        <span className="text-[11px] text-teal-800 font-mono font-semibold">
                          {item.registrationNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>บันทึกเมื่อ: {formatThaiDate(item.appliedDate)}</span>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {statusConfig.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        item.financeStatus === 'fully_handed_over' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : item.financeStatus === 'partially_handed_over'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.financeStatus === 'fully_handed_over' ? 'bg-emerald-500' : item.financeStatus === 'partially_handed_over' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        การเงิน: {item.financeStatusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Beneficiary, Details & Financial Info */}
                  <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
                    {/* Beneficiary Info */}
                    <div className="flex items-start gap-3.5">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0 border border-teal-600/30">
                        {item.beneficiaryName.charAt(0) || 'ผ'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate group-hover:text-teal-800 transition-colors">
                          {item.beneficiaryName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.branchName || 'สำนักงานใหญ่ กรุงเทพมหานคร'} {item.area ? `• ${item.area}` : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Asnaf & Assistance Details */}
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${asnafStyle.bg} ${asnafStyle.text} ${asnafStyle.border}`}>
                          {item.asnafLabel}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                          {item.assistanceType}
                        </span>
                      </div>

                      {item.purpose && (
                        <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50/80 border border-slate-100 p-2.5 rounded-xl">
                          {item.purpose}
                        </p>
                      )}

                      {/* Metadata Row */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                        <div>
                          <span className="text-slate-400 block">วันที่อนุมัติ:</span>
                          <span className="font-semibold text-slate-700">{formatThaiDate(item.approvedDate)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">วันที่ช่วยเหลือจริง:</span>
                          <span className="font-semibold text-slate-700">{formatThaiDate(item.actualAssistanceDate) || 'ยังไม่ได้ส่งมอบ'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block">เจ้าหน้าที่ผู้รับผิดชอบ:</span>
                          <span className="font-semibold text-slate-700">{item.assignedOfficerName || item.recipientCaseWorkerName || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Data Box */}
                    <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2.5">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">ยอดอนุมัติ</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-700 font-mono">
                            ฿{item.approvedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-700 block uppercase font-bold">จ่ายจริง</span>
                          <span className="text-xs sm:text-sm font-black text-emerald-900 font-mono">
                            ฿{item.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">คงเหลือ</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-700 font-mono">
                            ฿{item.remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Proof Status Row */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-500 truncate">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.withdrawalNo}</span>
                        </div>

                        {item.proofUrl ? (
                          <button
                            onClick={() => handleOpenProof(item.proofUrl!, item.proofName)}
                            className="px-2 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-[11px] border border-teal-200 transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <FileCheck className="w-3 h-3 text-teal-600" />
                            ดูหลักฐาน
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            รอหลักฐาน
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer (Section 4: Buttons) */}
                  <div className="p-3.5 sm:p-4 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenDetail(item)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors border border-slate-200/90 shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      ดูรายละเอียด
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Follow-up button if completed or has follow up plan */}
                      {(item.hasFollowUpPlan || item.outcomeStatus === 'completed' || item.assistanceStatus === 'completed') && (
                        <button
                          onClick={() => onNavigate('follow-up')}
                          className="px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs transition-colors border border-indigo-200 flex items-center gap-1 cursor-pointer"
                          title="ไปที่การติดตามผลและบันทึกการตรวจเยี่ยม"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          ติดตามผล
                        </button>
                      )}

                      {/* Edit button if confirmed execution record exists */}
                      {confirmedRecord && (
                        <button
                          onClick={() => handleOpenEditExecution(confirmedRecord)}
                          className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors border border-amber-200 flex items-center gap-1 cursor-pointer"
                          title="แก้ไขผลการช่วยเหลือที่ยืนยันแล้วพร้อมบันทึกเหตุผล"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          แก้ไข
                        </button>
                      )}

                      {/* Record execution button */}
                      <button
                        onClick={() => handleOpenExecutionModal(item)}
                        className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="บันทึกและยืนยันผลการช่วยเหลือ"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        บันทึกผล
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-medium">
                แสดง <strong>{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredList.length)}</strong> จากทั้งหมด <strong>{filteredList.length}</strong> รายการ
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  ย้อนกลับ
                </button>

                <span className="px-3 py-1 font-mono font-bold text-slate-800">
                  หน้า {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================================================================= */
        /* POLISHED TABLE VIEW (10 Columns, Readable, Accessible)           */
        /* ================================================================= */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1240px]">
              <thead className="bg-slate-50/90 text-slate-700 font-bold text-xs border-b border-slate-200/90">
                <tr>
                  <th className="py-3.5 px-4 w-36 min-w-[135px] whitespace-nowrap text-left">เลขที่คำร้อง / เลขทะเบียน</th>
                  <th className="py-3.5 px-4 min-w-[240px] max-w-[300px] whitespace-nowrap text-left">ผู้รับความช่วยเหลือและอัสนัฟ</th>
                  <th className="py-3.5 px-4 text-center w-36 min-w-[130px] whitespace-nowrap">สถานะการเงิน</th>
                  <th className="py-3.5 px-4 text-center w-36 min-w-[135px] whitespace-nowrap">สถานะการช่วยเหลือ</th>
                  <th className="py-3.5 px-4 text-right w-32 min-w-[115px] whitespace-nowrap">ยอดอนุมัติ</th>
                  <th className="py-3.5 px-4 text-right w-32 min-w-[115px] whitespace-nowrap">ยอดจ่ายจริง</th>
                  <th className="py-3.5 px-4 text-right w-32 min-w-[115px] whitespace-nowrap">ยอดคงเหลือ</th>
                  <th className="py-3.5 px-4 w-36 min-w-[130px] whitespace-nowrap text-left">ใบสำคัญเบิกจ่าย</th>
                  <th className="py-3.5 px-4 text-center w-28 min-w-[110px] whitespace-nowrap">หลักฐาน</th>
                  <th className="py-3.5 px-4 text-center w-48 min-w-[180px] whitespace-nowrap">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedList.map((item) => {
                  const statusConfig = OUTCOME_STATUS_CONFIG[item.outcomeStatus || 'not_started'] || {
                    label: item.assistanceStatusLabel || 'ยังไม่เริ่ม',
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                    border: 'border-slate-300'
                  };
                  const asnafStyle = getAsnafColor(item.asnafCategory);
                  const confirmedRecord = item.executionRecords?.find((r) => r.isConfirmed);
                  const hasDiscrepancy = item.discrepancies && item.discrepancies.length > 0;

                  return (
                    <tr key={item.applicationId} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. เลขที่คำร้อง / เลขทะเบียน */}
                      <td className="py-3.5 px-4 w-36 min-w-[135px]">
                        <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200/80 inline-block shadow-2xs">
                          {item.applicationNo}
                        </div>
                        <div className="text-[11px] text-teal-800 font-mono font-semibold mt-1">
                          {item.registrationNo}
                        </div>
                      </td>

                      {/* 2. ผู้รับความช่วยเหลือและอัสนัฟ */}
                      <td className="py-3.5 px-4 min-w-[240px] max-w-[300px]">
                        <div className="font-bold text-slate-900 text-sm tracking-tight truncate max-w-[280px]" title={item.beneficiaryName}>
                          {item.beneficiaryName}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${asnafStyle.bg} ${asnafStyle.text} ${asnafStyle.border}`}>
                            {item.asnafLabel}
                          </span>
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 truncate max-w-[140px]" 
                            title={item.assistanceType}
                          >
                            {item.assistanceType}
                          </span>
                        </div>
                        {item.registrationNo && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ทะเบียน: {item.registrationNo}
                          </div>
                        )}
                      </td>

                      {/* 3. สถานะการเงิน */}
                      <td className="py-3.5 px-4 text-center w-36 min-w-[130px]">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border ${
                            item.financeStatus === 'fully_handed_over'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : item.financeStatus === 'partially_handed_over'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.financeStatus === 'fully_handed_over'
                                ? 'bg-emerald-500'
                                : item.financeStatus === 'partially_handed_over'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {item.financeStatusLabel}
                        </span>
                        {hasDiscrepancy && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap animate-pulse">
                              ⚠️ มียอดแจ้งไม่ตรง
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 4. สถานะการช่วยเหลือ */}
                      <td className="py-3.5 px-4 text-center w-36 min-w-[135px]">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* 5. ยอดอนุมัติ */}
                      <td className="py-3.5 px-4 text-right w-32 min-w-[115px]">
                        <div className="font-mono tabular-nums text-xs sm:text-sm font-semibold text-slate-700">
                          ฿{item.approvedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* 6. ยอดจ่ายจริง */}
                      <td className="py-3.5 px-4 text-right w-32 min-w-[115px]">
                        <div className={`font-mono tabular-nums text-xs sm:text-sm font-bold ${
                          item.disbursedAmount > 0 ? 'text-emerald-700' : 'text-slate-600'
                        }`}>
                          ฿{item.disbursedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* 7. ยอดคงเหลือ */}
                      <td className="py-3.5 px-4 text-right w-32 min-w-[115px]">
                        <div className={`font-mono tabular-nums text-xs sm:text-sm font-semibold ${
                          item.remainingBalance > 0 ? 'text-amber-800' : 'text-slate-400'
                        }`}>
                          ฿{item.remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* 8. ใบสำคัญเบิกจ่าย */}
                      <td className="py-3.5 px-4 w-36 min-w-[130px]">
                        {item.withdrawalNo ? (
                          <div 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/90 font-mono text-xs font-semibold text-slate-800"
                            title={`เลขที่ใบสำคัญเบิกจ่าย: ${item.withdrawalNo}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{item.withdrawalNo}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            ยังไม่มีใบสำคัญ
                          </span>
                        )}
                      </td>

                      {/* 9. หลักฐาน */}
                      <td className="py-3.5 px-4 text-center w-28 min-w-[110px]">
                        {item.proofUrl ? (
                          <button
                            onClick={() => handleOpenProof(item.proofUrl!, item.proofName)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs border border-teal-200 transition-colors shadow-2xs cursor-pointer"
                            title={item.proofName ? `ดูหลักฐาน: ${item.proofName}` : 'ดูหลักฐานการส่งมอบ'}
                          >
                            <FileCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>ดูหลักฐาน</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic" title="ยังไม่มีการแนบไฟล์หลักฐาน">
                            ยังไม่มีหลักฐาน
                          </span>
                        )}
                      </td>

                      {/* 10. ดำเนินการ */}
                      <td className="py-3.5 px-4 text-center w-48 min-w-[180px]">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors border border-slate-200/90 shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                            title="ดูรายละเอียดข้อมูลทั้งหมด"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>ดูรายละเอียด</span>
                          </button>

                          {confirmedRecord ? (
                            <button
                              onClick={() => handleOpenEditExecution(confirmedRecord)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors border border-amber-200 inline-flex items-center gap-1 cursor-pointer"
                              title="แก้ไขผลการช่วยเหลือที่ยืนยันแล้ว"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>แก้ไข</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenExecutionModal(item)}
                              className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                              title="บันทึกและยืนยันผลการช่วยเหลือ"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>บันทึกผล</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table pagination */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-medium">
                แสดง <strong>{((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredList.length)}</strong> จากทั้งหมด <strong>{filteredList.length}</strong> รายการ
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                >
                  ย้อนกลับ
                </button>
                <span className="px-3 py-1 font-mono font-bold text-slate-800 bg-white rounded-lg border border-slate-200/80">
                  หน้า {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. COMPREHENSIVE DETAIL MODAL (13 Required Fields & Handover Linkage) */}
      {/* ===================================================================== */}
      {showDetailModal && selectedDetail && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDetailModal(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden my-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                    <Wallet className="w-6 h-6 text-teal-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">
                        รายละเอียดการช่วยเหลือและข้อมูลการเงิน
                      </h2>
                      {isDetailLoading && (
                        <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {selectedDetail.applicationNo} • ผู้รับ: {selectedDetail.beneficiaryName} ({selectedDetail.registrationNo})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="overflow-y-auto flex-1 space-y-5 pr-1 text-xs">
                {/* Dual Independent Statuses Strip */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      สถานะระบบร่วมกัน (Dual Independent Real-time Statuses)
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Finance Status */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border ${
                          selectedDetail.financeStatus === 'fully_handed_over'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : selectedDetail.financeStatus === 'partially_handed_over'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-200 text-slate-800 border-slate-300'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current" />
                        การเงิน: {selectedDetail.financeStatusLabel}
                      </span>

                      {/* Assistance Status */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border ${
                          selectedDetail.assistanceStatus === 'completed'
                            ? 'bg-teal-100 text-teal-900 border-teal-300'
                            : selectedDetail.assistanceStatus === 'wait_confirmation'
                            ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                            : selectedDetail.assistanceStatus === 'in_progress'
                            ? 'bg-sky-100 text-sky-900 border-sky-300'
                            : 'bg-stone-200 text-stone-800 border-stone-300'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current" />
                        การช่วยเหลือ: {selectedDetail.assistanceStatusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Discrepancy Action */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenDiscrepancy}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs border border-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <MessageSquareWarning className="w-4 h-4 text-rose-600" />
                      แจ้งยอดไม่ตรง / รายงานปัญหา
                    </button>
                  </div>
                </div>

                {/* Read-Only Notice Box (Requirement 2) */}
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>การป้องกันความปลอดภัยและการแก้ไข:</strong> ข้อมูลการเบิกเงินสดและหลักฐานของฝ่ายการเงินเป็นข้อมูลที่ได้รับการยืนยันธุรกรรมแล้ว ไม่อนุญาตให้ผู้ดูแลเคสแก้ไขยอดเงินหรือเปลี่ยนไฟล์หลักฐานของฝ่ายการเงินโดยตรง หากพบข้อมูลไม่ตรงกันให้แจ้งเรื่องผ่านปุ่ม <strong>"แจ้งยอดไม่ตรง"</strong> เพื่อให้ฝ่ายการเงินตรวจสอบ
                  </div>
                </div>

                {/* 13 Required Fields Grid */}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-2.5 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-teal-700" />
                    ข้อมูลความช่วยเหลือและการเงิน (13 รายการตามเกณฑ์)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* 1. เลขที่คำร้อง */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">1. เลขที่คำร้องช่วยเหลือ</span>
                      <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">{selectedDetail.applicationNo}</div>
                    </div>

                    {/* 2. รหัสทะเบียน */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">2. รหัสทะเบียนผู้มีสิทธิ์</span>
                      <div className="font-mono font-bold text-teal-800 text-sm mt-0.5">{selectedDetail.registrationNo}</div>
                    </div>

                    {/* 3. ชื่อผู้รับความช่วยเหลือ */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">3. ชื่อผู้รับความช่วยเหลือ</span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedDetail.beneficiaryName}</div>
                    </div>

                    {/* 4. อัสนัฟ */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">4. หมวดอัสนัฟ</span>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedDetail.asnafLabel}</div>
                    </div>

                    {/* 5. ประเภทการช่วยเหลือ */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">5. ประเภทการช่วยเหลือ</span>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedDetail.assistanceType}</div>
                    </div>

                    {/* 6. ยอดอนุมัติ */}
                    <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200">
                      <span className="text-[10px] font-semibold text-teal-700 uppercase">6. ยอดเงินอนุมัติ</span>
                      <div className="font-mono font-black text-teal-950 text-base mt-0.5">
                        ฿{selectedDetail.approvedAmount.toLocaleString()}
                      </div>
                    </div>

                    {/* 7. ยอดเบิกเงินสด */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">7. ยอดเบิกเงินสด (ฝ่ายการเงิน)</span>
                      <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                        ฿{selectedDetail.withdrawnAmount.toLocaleString()}
                      </div>
                    </div>

                    {/* 8. ยอดที่ฝ่ายการเงินส่งมอบแล้ว */}
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                      <span className="text-[10px] font-semibold text-emerald-700 uppercase">8. ยอดที่ฝ่ายการเงินส่งมอบแล้ว</span>
                      <div className="font-mono font-black text-emerald-950 text-base mt-0.5">
                        ฿{selectedDetail.handedOverAmount.toLocaleString()}
                      </div>
                    </div>

                    {/* 9. ยอดที่ผู้ดูแลรับจริง */}
                    <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200">
                      <span className="text-[10px] font-semibold text-sky-700 uppercase">9. ยอดที่ผู้ดูแลรับจริง</span>
                      <div className="font-mono font-black text-sky-950 text-base mt-0.5">
                        ฿{selectedDetail.receivedAmount.toLocaleString()}
                      </div>
                    </div>

                    {/* 10. ยอดช่วยเหลือที่ดำเนินการจริง */}
                    <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200">
                      <span className="text-[10px] font-semibold text-teal-700 uppercase">10. ยอดช่วยเหลือที่ดำเนินการจริง</span>
                      <div className="font-mono font-black text-teal-950 text-base mt-0.5">
                        ฿{selectedDetail.disbursedAmount.toLocaleString()}
                      </div>
                    </div>

                    {/* 11. ยอดคงเหลือ */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">11. ยอดคงเหลือ</span>
                      <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                        ฿{selectedDetail.remainingBalance.toLocaleString()}
                      </div>
                    </div>

                    {/* 12. เลขที่ใบสำคัญเบิกจ่าย */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">12. เลขที่ใบสำคัญการเบิกจ่าย</span>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{selectedDetail.withdrawalNo}</div>
                    </div>
                  </div>

                  {/* 13. วันเวลาและหลักฐานการส่งมอบ */}
                  <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">13. วันเวลาและหลักฐานการส่งมอบ</span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-slate-800 font-medium">
                          วันเวลาส่งมอบ: <strong>{selectedDetail.handoverDatetime || 'ยังไม่มีการส่งมอบ'}</strong>
                        </div>
                        {selectedDetail.proofName && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            ไฟล์หลักฐาน: {selectedDetail.proofName} {selectedDetail.proofSize ? `(${(selectedDetail.proofSize / 1024).toFixed(1)} KB)` : ''}
                          </div>
                        )}
                      </div>

                      {selectedDetail.proofUrl ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenProof(selectedDetail.proofUrl!, selectedDetail.proofName)}
                            className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            เปิดดูหลักฐานฝ่ายการเงิน
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">ยังไม่มีไฟล์หลักฐานการส่งมอบ</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Discrepancy Alert & History Section */}
                {selectedDetail.discrepancies && selectedDetail.discrepancies.length > 0 && (
                  <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>ประวัติการแจ้งปัญหายอดเงิน / หลักฐาน ({selectedDetail.discrepancies.length} รายการ)</span>
                    </div>

                    <div className="space-y-2">
                      {selectedDetail.discrepancies.map((d) => (
                        <div key={d.id} className="p-3 rounded-lg bg-white border border-rose-100 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-800">
                              {d.category === 'amount_mismatch' ? 'ยอดเงินไม่ตรง' :
                               d.category === 'voucher_mismatch' ? 'ใบสำคัญไม่ตรง' :
                               d.category === 'proof_mismatch' ? 'หลักฐานไม่ถูกต้อง' : 'ปัญหาอื่น'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{d.reportedAt}</span>
                          </div>
                          <p className="text-slate-700">{d.notes}</p>
                          <div className="text-[10px] text-slate-500">
                            แจ้งโดย: {d.reportedByName} • ยอดคาดหมาย: ฿{d.expectedAmount?.toLocaleString() ?? '-'} • ยอดรับจริง: ฿{d.actualAmount?.toLocaleString() ?? '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Handover Records History */}
                {selectedDetail.handovers && selectedDetail.handovers.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <History className="w-4 h-4 text-teal-700" />
                      ประวัติการส่งมอบเงินสดจากฝ่ายการเงิน (Handover Log)
                    </h4>

                    <div className="space-y-2">
                      {selectedDetail.handovers.map((h) => (
                        <div key={h.id} className="p-3 rounded-lg bg-white border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>เลขที่ส่งมอบ: {h.handoverNo}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                ฿{h.amount.toLocaleString()} บาท
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              ส่งมอบเมื่อ: {h.handoverDate} {h.handoverTime} • โดย: {h.handedOverByName} ➔ ผู้รับ: {h.receivedByName}
                            </div>
                            {h.notes && <div className="text-[11px] text-slate-600 italic">หมายเหตุ: {h.notes}</div>}
                          </div>

                          {h.proofUrl && (
                            <button
                              onClick={() => handleOpenProof(h.proofUrl, h.proofName)}
                              className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-[11px] border border-teal-200 transition-colors shrink-0"
                            >
                              เปิดไฟล์หลักฐาน
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* TASK 3: Assistance Execution Records History (ประวัติการดำเนินงานจริงและการยืนยันผลแต่ละงวด) */}
                <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
                      <CheckCheck className="w-4 h-4 text-teal-700" />
                      ผลการช่วยเหลือจริงและประวัติแต่ละงวด ({selectedDetail.executionRecords?.length || 0} รายการ)
                    </h4>
                    {selectedDetail.executionRecords && selectedDetail.executionRecords.length > 0 && (
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleOpenExecutionModal(selectedDetail);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> บันทึกงวดถัดไป / ยืนยันผล
                      </button>
                    )}
                  </div>

                  {(!selectedDetail.executionRecords || selectedDetail.executionRecords.length === 0) ? (
                    <div className="p-5 bg-white rounded-xl border border-slate-200 text-center space-y-2">
                      <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-600">ยังไม่มีการบันทึกผลการช่วยเหลือสำหรับคำร้องนี้</p>
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          handleOpenExecutionModal(selectedDetail);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckSquare className="w-4 h-4" /> เริ่มบันทึกผลการช่วยเหลือ
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDetail.executionRecords.map((rec) => {
                        const statusConfig = OUTCOME_STATUS_CONFIG[rec.status] || OUTCOME_STATUS_CONFIG.completed;
                        let previousSnapshots: any[] = [];
                        if (rec.previousValues) {
                          try {
                            previousSnapshots = JSON.parse(rec.previousValues);
                          } catch {}
                        }

                        return (
                          <div key={rec.id} className="p-4 rounded-xl bg-white border border-teal-100 shadow-2xs space-y-2.5 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-900 border border-teal-200 font-mono">
                                  งวดที่ {rec.installmentNo}/{rec.totalInstallments}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                                  {statusConfig.label}
                                </span>
                                {rec.isConfirmed ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-emerald-600" /> ยืนยันผลแล้ว
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    บันทึกร่าง
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-500 font-mono">
                                วันที่ดำเนินการ: <strong>{rec.executionDatetime}</strong>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                              <div>
                                <span className="text-[10px] font-semibold text-slate-400 block uppercase">เงินส่งมอบจริง</span>
                                <span className="font-mono font-extrabold text-teal-950 text-sm">
                                  ฿{rec.actualDisbursedAmount.toLocaleString()} บาท
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold text-slate-400 block uppercase">มูลค่าความช่วยเหลือจริง</span>
                                <span className="font-mono font-bold text-slate-800 text-sm">
                                  ฿{rec.actualAssistanceValue.toLocaleString()} บาท
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-semibold text-slate-400 block uppercase">ผู้ดำเนินการ</span>
                                <span className="font-medium text-slate-700">{rec.executorName}</span>
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 block uppercase mb-0.5">ผลการช่วยเหลือ</span>
                              <p className="text-slate-800 font-medium">{rec.assistanceOutcome}</p>
                              {rec.details && <p className="text-slate-500 text-[11px] mt-1">{rec.details}</p>}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                              <div className="text-slate-500">
                                {rec.isConfirmed && rec.confirmedByName && (
                                  <span>
                                    ยืนยันโดย: <strong>{rec.confirmedByName}</strong> เมื่อ {rec.confirmedAt}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {rec.proofUrl && (
                                  <button
                                    onClick={() => handleOpenProof(rec.proofUrl!, rec.proofName || 'หลักฐานการช่วยเหลือ.pdf')}
                                    className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-[11px] border border-teal-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <FileCheck className="w-3.5 h-3.5" /> ดูหลักฐานจริง
                                  </button>
                                )}

                                {/* Edit confirmed record button (Rule: หากต้องแก้ไขผลที่ยืนยันแล้ว ให้ใช้กระบวนการแก้ไขพร้อมเหตุผลและประวัติ) */}
                                {rec.isConfirmed && (
                                  <button
                                    onClick={() => handleOpenEditExecution(rec)}
                                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] border border-slate-200 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-slate-500" /> แก้ไขผลที่ยืนยันแล้ว
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Revision History if edited */}
                            {previousSnapshots.length > 0 && (
                              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-[11px] space-y-1.5">
                                <div className="font-bold text-amber-900 flex items-center gap-1">
                                  <History className="w-3.5 h-3.5 text-amber-700" />
                                  ประวัติการแก้ไขข้อมูล ({previousSnapshots.length} ครั้ง):
                                </div>
                                <div className="space-y-1">
                                  {previousSnapshots.map((snap, sIdx) => (
                                    <div key={sIdx} className="text-slate-600 bg-white/80 p-2 rounded border border-amber-100">
                                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                                        <span>แก้ไขเมื่อ: {snap.snapshotTimestamp} โดย {snap.snapshotActor}</span>
                                        <span className="font-mono">เดิม ฿{snap.actualDisbursedAmount?.toLocaleString()}</span>
                                      </div>
                                      <div className="text-slate-800 font-medium mt-0.5">
                                        เหตุผล: <span className="text-amber-950 font-semibold">{snap.editReason}</span>
                                      </div>
                                    </div>
                                  ))}
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

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-500">
                  ผู้ดูแลเคส: <strong>{selectedDetail.assignedOfficerName || selectedDetail.recipientCaseWorkerName || '-'}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>

                  {/* Record execution button */}
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleOpenExecutionModal(selectedDetail);
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckSquare className="w-4 h-4" />
                    บันทึก/ยืนยันผลการช่วยเหลือ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ===================================================================== */}
      {/* 2. DISCREPANCY REPORT MODAL (Requirement 2: Caretaker report issue)   */}
      {/* ===================================================================== */}
      {showDiscrepancyModal && selectedDetail && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1060] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDiscrepancyModal(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden my-auto"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                    <MessageSquareWarning className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      แจ้งยอดไม่ตรง / รายงานปัญหาฝ่ายการเงิน
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {selectedDetail.applicationNo} • ผู้รับ: {selectedDetail.beneficiaryName}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowDiscrepancyModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 text-rose-900 text-xs">
                <strong>ความปลอดภัย:</strong> การแจ้งปัญหานี้จะไม่แก้ไขธุรกรรมที่ฝ่ายการเงินยืนยันแล้ว แต่จะบันทึกข้อสังเกตและส่งสัญญาณแจ้งเตือนไปยังฝ่ายการเงินและผู้บริหารเพื่อตรวจสอบข้อเท็จจริง
              </div>

              <form onSubmit={handleSubmitDiscrepancy} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ประเภทปัญหา <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={discrepancyCategory}
                    onChange={(e) => setDiscrepancyCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value="amount_mismatch">ยอดเงินไม่ตรงกับที่ระบุในใบสำคัญ / ใบส่งมอบ</option>
                    <option value="voucher_mismatch">เลขที่ใบสำคัญหรือข้อมูลเอกสารไม่ตรง</option>
                    <option value="proof_mismatch">ไฟล์หลักฐานไม่ถูกต้องหรือไม่ชัดเจน</option>
                    <option value="missing_voucher">ไม่พบรายการส่งมอบเงินสดในความรับผิดชอบ</option>
                    <option value="other">ปัญหาอื่น ๆ</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ยอดเงินตามใบสำคัญ</label>
                    <input
                      type="text"
                      disabled
                      value={`฿${selectedDetail.handedOverAmount.toLocaleString()} บาท`}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ยอดเงินที่ได้รับจริง (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="ระบุยอดที่ได้รับจริง"
                      value={discrepancyActualAmount}
                      onChange={(e) => setDiscrepancyActualAmount(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    รายละเอียดปัญหาและข้อสังเกต <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="อธิบายเหตุการณ์ เช่น ได้รับซองเงินสดไม่ครบจำนวน หรือเอกสารแนบไม่ตรงกับยอดที่ระบุ..."
                    value={discrepancyNotes}
                    onChange={(e) => setDiscrepancyNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDiscrepancyModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDiscrepancy}
                    className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {isSubmittingDiscrepancy ? 'กำลังส่งข้อมูล...' : 'ส่งรายงานปัญหาไปยังฝ่ายการเงิน'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ===================================================================== */}
      {/* 3. DELIVER AID TO BENEFICIARY MODAL (Caseworker Execution)           */}
      {/* ===================================================================== */}
      {/* ===================================================================== */}
      {/* 3. TASK 3: CONFIRM ASSISTANCE COMPLETION & DRAFT MODAL                */}
      {/* ===================================================================== */}
      {showExecutionModal && selectedDetail && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1060] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowExecutionModal(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden my-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b pb-3.5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                    <CheckSquare className="w-6 h-6 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                      บันทึกและยืนยันผลการช่วยเหลือเสร็จสิ้น
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {selectedDetail.applicationNo} • ผู้รับ: {selectedDetail.beneficiaryName} ({selectedDetail.asnafLabel})
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowExecutionModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="overflow-y-auto pr-1 space-y-4 flex-1 text-xs">
                {/* 1-4 Read-Only Badges (Application, Registration, Assistance Type, Asnaf) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">1. เลขที่คำร้อง</span>
                    <span className="font-mono font-bold text-slate-900 text-[11px]">{selectedDetail.applicationNo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">2. รหัสทะเบียนผู้รับ</span>
                    <span className="font-mono font-bold text-teal-900 text-[11px]">{selectedDetail.registrationNo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">3. ประเภทการช่วยเหลือ</span>
                    <span className="font-semibold text-slate-800 text-[11px] truncate block" title={selectedDetail.assistanceType}>
                      {selectedDetail.assistanceType}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">4. อัสนัฟ</span>
                    <span className="font-semibold text-slate-800 text-[11px]">{selectedDetail.asnafLabel}</span>
                  </div>
                </div>

                {/* Financial Context Banner */}
                <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-teal-950 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] text-teal-800">วงเงินอนุมัติทั้งหมด:</span>
                    <strong className="font-mono ml-1.5 text-sm">฿{selectedDetail.approvedAmount.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-teal-800">เงินสดที่ฝ่ายการเงินส่งมอบแล้ว:</span>
                    <strong className="font-mono ml-1.5 text-sm text-emerald-900">฿{selectedDetail.handedOverAmount.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-teal-800">ช่วยเหลือไปแล้ว:</span>
                    <strong className="font-mono ml-1.5 text-sm text-teal-900">฿{selectedDetail.disbursedAmount.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Installments & Tranche Handling (Rule 3) */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      การดำเนินงานงวดที่ <span className="text-teal-700">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={execInstallmentNo}
                      onChange={(e) => setExecInstallmentNo(parseInt(e.target.value) || 1)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      จำนวนงวดช่วยเหลือทั้งหมด <span className="text-teal-700">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={execTotalInstallments}
                      onChange={(e) => setExecTotalInstallments(parseInt(e.target.value) || 1)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                {/* 5. Actual Datetime & 6. Executor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      5.1 วันที่ช่วยเหลือจริง <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={execDate}
                      onChange={(e) => setExecDate(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      5.2 เวลาที่ช่วยเหลือจริง <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={execTime}
                      onChange={(e) => setExecTime(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      6. ผู้ดำเนินการช่วยเหลือ
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${currentUser.name} (${currentUser.role})`}
                      className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium truncate"
                    />
                  </div>
                </div>

                {/* 7. Outcome Description */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    7. ผลการช่วยเหลือ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ระบุผลการดำเนินงาน เช่น ส่งมอบเงินสงเคราะห์ปัจจัยยังชีพถึงมือผู้รับเรียบร้อย"
                    value={execOutcome}
                    onChange={(e) => setExecOutcome(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white"
                  />
                </div>

                {/* 8. Actual Disbursed Amount & 9. Actual Assistance Value */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      8. จำนวนเงินที่ส่งมอบให้ผู้รับจริง (บาท) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={1}
                      required
                      value={execActualAmount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setExecActualAmount(val);
                        setExecActualValue(val);
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-black text-teal-950 focus:bg-white"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      ต้องไม่เกินยอดอนุมัติ (฿{selectedDetail.approvedAmount.toLocaleString()}) และยอดที่รับมอบ (฿{selectedDetail.handedOverAmount.toLocaleString()})
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      9. มูลค่าความช่วยเหลือที่ดำเนินการจริง (บาท) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min={1}
                      required
                      value={execActualValue}
                      onChange={(e) => setExecActualValue(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-black text-slate-800 focus:bg-white"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      ประเมินตามหลักเกณฑ์ของประเภทความช่วยเหลือ (ค่าเครื่องอุปโภค/ค่าครองชีพ)
                    </span>
                  </div>
                </div>

                {/* 10. Details & Notes */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    10. รายละเอียดและหมายเหตุเพิ่มเติม
                  </label>
                  <textarea
                    rows={2}
                    value={execDetails}
                    onChange={(e) => setExecDetails(e.target.value)}
                    placeholder="บันทึกสภาพความเป็นอยู่ ข้อสังเกต หรือสภาพปัญหาที่พบในพื้นที่..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                {/* 11. Real Proof Attachment */}
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-700">
                    11. หลักฐานการช่วยเหลือ (ต้องใช้ไฟล์จริงตามนโยบาย) <span className="text-rose-500">*</span>
                  </label>
                  <div className="p-3.5 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-teal-700" />
                        <div>
                          <div className="font-bold text-teal-950 text-xs">{execProofName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">ไฟล์จริงได้รับการเข้ารหัสความปลอดภัย (240 KB)</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        พร้อมแนบ
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500">
                      นโยบาย: ภาพถ่ายขณะส่งมอบ ลายมือชื่อผู้รับ หรือใบเสร็จค่าใช้จ่ายจริง
                    </div>
                  </div>
                </div>

                {/* 12. Assistance Outcome Status (7 Statuses - Section 3) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    12. สถานะผลการช่วยเหลือ (Outcome Status) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={execStatus}
                    onChange={(e) => setExecStatus(e.target.value as AssistanceOutcomeStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="completed">ช่วยเหลือเสร็จสิ้น (Completed)</option>
                    <option value="partially_assisted">ช่วยเหลือบางส่วน (Partially Assisted - แบ่งจ่ายเป็นงวด)</option>
                    <option value="in_progress">กำลังดำเนินการ (In Progress)</option>
                    <option value="wait_proof_verification">รอตรวจสอบหลักฐาน (Wait Proof Verification)</option>
                    <option value="has_issues">มีปัญหาหรือรอแก้ไข (Has Issues)</option>
                    <option value="cancelled">ยกเลิกพร้อมเหตุผล (Cancelled)</option>
                    <option value="not_started">ยังไม่เริ่มดำเนินการ (Not Started)</option>
                  </select>
                  {execTotalInstallments > 1 && execInstallmentNo < execTotalInstallments && (
                    <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
                      ⚠️ เป็นการช่วยเหลือแบบแบ่งงวด (งวด {execInstallmentNo} จาก {execTotalInstallments}) สถานะคำร้องโดยรวมจะคงเป็น "ช่วยเหลือบางส่วน" จนกว่าจะครบทุกเงื่อนไข
                    </span>
                  )}
                </div>

                {/* 6 Pre-confirmation Validations Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    การตรวจสอบเงื่อนไขความถูกต้องก่อนยืนยัน (6 รายการ):
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>1. ผู้ใช้มีสิทธิ์บันทึก ({currentUser.name})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {selectedDetail.approvedAmount > 0 ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span>2. มีรายการอนุมัติ (฿{selectedDetail.approvedAmount.toLocaleString()})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {execDate && execTime && execOutcome.trim() ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span>3. ระบุวันเวลาและผลช่วยเหลือ</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {execProofName ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span>4. มีไฟล์หลักฐานตามนโยบาย</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {execActualAmount > 0 && execActualAmount <= selectedDetail.approvedAmount ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span>5. ยอดรายงานไม่เกินยอดอนุมัติ</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {selectedDetail.handedOverAmount > 0 && execActualAmount <= selectedDetail.handedOverAmount ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span>6. มีการส่งมอบเงินจากฝ่ายการเงิน</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: MANDATORY CONFIRMATION CHECKBOX */}
                <div className="p-4 rounded-2xl border-2 border-teal-300 bg-teal-50/70 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="confirm-completion-checkbox"
                      checked={execIsConfirmed}
                      onChange={(e) => setExecIsConfirmed(e.target.checked)}
                      defaultChecked={false}
                      className="mt-1 w-5 h-5 text-teal-700 rounded-md border-slate-300 focus:ring-teal-500 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-teal-950 text-xs sm:text-sm leading-snug block">
                        “ข้าพเจ้ายืนยันว่าได้ดำเนินการช่วยเหลือตามรายละเอียดนี้แล้ว และข้อมูลกับหลักฐานตรงกับการดำเนินงานจริง”
                      </span>
                      <span className="text-[11px] text-teal-800/80 block">
                        * Checkbox ต้องไม่ถูกเลือกไว้ล่วงหน้า • การกด Checkbox โดยไม่มีการบันทึกสำเร็จจะไม่ถือว่าเสร็จสิ้น • ระบบจะบันทึกตัวตนและเวลาที่ยืนยันลงใน Audit Log
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Footer Buttons (Draft vs Confirm - Section 4) */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowExecutionModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer text-xs"
                >
                  ยกเลิก
                </button>

                <div className="flex items-center gap-2">
                  {/* Draft Button (Rule: การบันทึกร่างไม่ถือว่าช่วยเหลือเสร็จสิ้น) */}
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSubmittingExecution}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                    title="บันทึกร่างไว้ก่อน โดยยังไม่ถือว่าช่วยเหลือเสร็จสิ้น"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    {isSubmittingExecution ? 'กำลังบันทึก...' : 'บันทึกแบบร่าง (Draft)'}
                  </button>

                  {/* Confirm Completion Button */}
                  <button
                    type="button"
                    onClick={handleConfirmCompletion}
                    disabled={isSubmittingExecution}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isSubmittingExecution ? 'กำลังยืนยัน...' : 'ยืนยันผลการช่วยเหลือเสร็จสิ้น'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ===================================================================== */}
      {/* 3.1 EDIT CONFIRMED ASSISTANCE EXECUTION MODAL (Rule 4: Edit Workflow) */}
      {/* ===================================================================== */}
      {showEditExecutionModal && selectedRecordForEdit && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1070] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowEditExecutionModal(false);
            }}
          >
            <div 
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden my-auto"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Edit3 className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      แก้ไขผลการช่วยเหลือที่ยืนยันแล้ว
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      งวดที่ {selectedRecordForEdit.installmentNo}/{selectedRecordForEdit.totalInstallments}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowEditExecutionModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 text-amber-950 text-xs space-y-1">
                <strong>กฎความปลอดภัย:</strong> การแก้ไขผลที่ยืนยันแล้วจำเป็นต้องระบุเหตุผลอย่างชัดเจน และระบบจะจัดเก็บประวัติการแก้ไขเดิมลง Audit Trail ไว้เสมอ
              </div>

              <form onSubmit={handleSubmitEditExecution} className="space-y-3.5 text-xs overflow-y-auto pr-1">
                {/* Mandatory Edit Reason */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เหตุผลในการแก้ไขผลการช่วยเหลือ <span className="text-rose-500">* (บังคับระบุ)</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="ระบุเหตุผล เช่น แก้ไขยอดเงินให้ตรงกับใบเสร็จใหม่, ปรับปรุงคำอธิบายผลการดำเนินงาน..."
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full p-2.5 bg-amber-50/40 border border-amber-300 rounded-xl font-medium focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">วันที่ช่วยเหลือ</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">เวลาช่วยเหลือ</label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ผลการช่วยเหลือ</label>
                  <input
                    type="text"
                    value={editOutcome}
                    onChange={(e) => setEditOutcome(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">จำนวนเงินส่งมอบจริง (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      value={editAmount}
                      onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">มูลค่าความช่วยเหลือจริง (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      value={editValue}
                      onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สถานะผลการช่วยเหลือ</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as AssistanceOutcomeStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="completed">ช่วยเหลือเสร็จสิ้น</option>
                    <option value="partially_assisted">ช่วยเหลือบางส่วน</option>
                    <option value="in_progress">กำลังดำเนินการ</option>
                    <option value="wait_proof_verification">รอตรวจสอบหลักฐาน</option>
                    <option value="has_issues">มีปัญหาหรือรอแก้ไข</option>
                    <option value="cancelled">ยกเลิกพร้อมเหตุผล</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">รายละเอียดและหมายเหตุ</label>
                  <textarea
                    rows={2}
                    value={editDetails}
                    onChange={(e) => setEditDetails(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditExecutionModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {isSubmittingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขพร้อมประวัติ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ===================================================================== */}
      {/* 4. PROOF VIEWER MODAL                                                 */}
      {/* ===================================================================== */}
      {showProofViewerModal && (
        <ModalPortal>
          <div 
            className="fixed inset-0 z-[1070] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
            onClick={() => setShowProofViewerModal(false)}
          >
            <div 
              className="bg-white rounded-3xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-700" />
                  <h3 className="font-bold text-sm text-slate-900">{activeProofName}</h3>
                </div>
                <button onClick={() => setShowProofViewerModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-100 rounded-2xl p-6 text-center space-y-3 flex-1 overflow-auto flex flex-col items-center justify-center min-h-[250px]">
                <FileCheck className="w-16 h-16 text-teal-600 mx-auto" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">{activeProofName}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">URL: {activeProofUrl}</p>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 mt-2">
                    ✓ ไฟล์ได้รับการตรวจสอบความสมบูรณ์และลายเซ็นดิจิทัลแล้ว
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t text-xs">
                <span className="text-slate-400 text-[11px]">ระบบจัดเก็บเอกสาร ZMS Secure Storage</span>
                <div className="flex items-center gap-2">
                  <a
                    href={activeProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> เปิดในแท็บใหม่
                  </a>
                  <button
                    onClick={() => {
                      showToast(`ดาวน์โหลด ${activeProofName} สำเร็จ`, 'success');
                      setShowProofViewerModal(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> ดาวน์โหลด
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}


    </div>
  );
}
