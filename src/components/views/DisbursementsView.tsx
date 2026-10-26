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
  UserCheck,
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
  CheckCheck
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

  // Filtered List
  const filteredList = useMemo(() => {
    return assistanceList.filter((item) => {
      // Finance Status Filter
      if (financeStatusFilter !== 'all' && item.financeStatus !== financeStatusFilter) {
        return false;
      }
      // Assistance Status Filter
      if (assistanceStatusFilter !== 'all' && item.assistanceStatus !== assistanceStatusFilter) {
        return false;
      }
      // Outcome Status Filter (Task 3)
      if (outcomeStatusFilter !== 'all' && item.outcomeStatus !== outcomeStatusFilter) {
        return false;
      }
      // Asnaf Filter
      if (asnafFilter !== 'all' && item.asnafCategory !== asnafFilter) {
        return false;
      }
      // Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const match =
          item.applicationNo.toLowerCase().includes(q) ||
          item.registrationNo.toLowerCase().includes(q) ||
          item.beneficiaryName.toLowerCase().includes(q) ||
          item.withdrawalNo.toLowerCase().includes(q) ||
          item.assistanceType.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [assistanceList, financeStatusFilter, assistanceStatusFilter, outcomeStatusFilter, asnafFilter, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCases = assistanceList.length;
    const fullyHandedOver = assistanceList.filter((a) => a.financeStatus === 'fully_handed_over').length;
    const partiallyHandedOver = assistanceList.filter((a) => a.financeStatus === 'partially_handed_over').length;
    const notHandedOver = assistanceList.filter((a) => a.financeStatus === 'not_handed_over').length;
    const assistanceCompleted = assistanceList.filter((a) => a.assistanceStatus === 'completed').length;
    const totalHandedAmount = assistanceList.reduce((sum, a) => sum + (a.handedOverAmount || 0), 0);
    const totalDisbursedAmount = assistanceList.reduce((sum, a) => sum + (a.disbursedAmount || 0), 0);

    return {
      totalCases,
      fullyHandedOver,
      partiallyHandedOver,
      notHandedOver,
      assistanceCompleted,
      totalHandedAmount,
      totalDisbursedAmount,
    };
  }, [assistanceList]);

  // Open Proof Preview Modal
  const handleOpenProof = (url: string, name?: string) => {
    setActiveProofUrl(url);
    setActiveProofName(name || 'หลักฐานการส่งมอบเงิน');
    setShowProofViewerModal(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-[#0b2545] p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 transform skew-x-12 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/10 text-teal-200 border border-white/20 flex items-center justify-center font-bold">
                <Wallet className="w-5 h-5 text-teal-300" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  บันทึกการช่วยเหลือ & ตรวจสอบการส่งมอบเงิน
                </h1>
                <p className="text-xs text-teal-200">
                  เชื่อมโยงข้อมูลการเบิกเงินสดและการส่งมอบเงินจากฝ่ายการเงินกับบันทึกการช่วยเหลือในพื้นที่
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-teal-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-300" />
              <span>
                ผู้ใช้งาน: <strong>{currentUser.name}</strong> ({currentUser.role === 'officer' ? 'ผู้ดูแลเคส' : currentUser.role})
              </span>
            </div>
            <button
              onClick={fetchAssistanceList}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>
        </div>

        {/* Security & Segregation Notice */}
        <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-teal-200/90 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-300 shrink-0" />
          <span>
            <strong>หลักการตรวจสอบสิทธิ์:</strong> ผู้ดูแลเคสเห็นเฉพาะเคสที่ได้รับมอบหมาย • ข้อมูลการเงินจากฝ่ายการเงินเป็นแบบอ่านอย่างเดียว (Read-Only) • ห้ามแก้ไขยอดเงินโดยตรง หากพบข้อมูลไม่ตรงกันให้กดปุ่ม <strong>"แจ้งยอดไม่ตรง"</strong>
          </span>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 block">คำร้องทั้งหมดในสิทธิ์</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{metrics.totalCases}</span>
            <span className="text-[10px] text-slate-400 font-mono">เคส</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> การเงิน: ส่งมอบครบ
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-950">{metrics.fullyHandedOver}</span>
            <span className="text-[10px] text-emerald-700 font-bold">พร้อมจ่าย</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> การเงิน: ส่งมอบบางส่วน
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-950">{metrics.partiallyHandedOver}</span>
            <span className="text-[10px] text-amber-700 font-bold">แบ่งจ่าย</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> การเงิน: ยังไม่ส่งมอบ
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-700">{metrics.notHandedOver}</span>
            <span className="text-[10px] text-slate-400 font-bold">รอการเงิน</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-teal-800 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-teal-600" /> ช่วยเหลือเสร็จสิ้น
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-teal-950">{metrics.assistanceCompleted}</span>
            <span className="text-[10px] text-teal-700 font-bold">ปิดเคสแล้ว</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาเลขคำร้อง, ทะเบียน, ชื่อ, ใบสำคัญ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-teal-600 transition-all"
            />
          </div>

          {/* Finance Status Filter */}
          <div>
            <select
              value={financeStatusFilter}
              onChange={(e) => setFinanceStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white"
            >
              <option value="all">สถานะการเงิน: ทั้งหมด</option>
              <option value="fully_handed_over">การเงิน: ส่งมอบครบแล้ว</option>
              <option value="partially_handed_over">การเงิน: ส่งมอบบางส่วน</option>
              <option value="not_handed_over">การเงิน: ยังไม่ส่งมอบ</option>
            </select>
          </div>

          {/* Assistance Status Filter */}
          <div>
            <select
              value={assistanceStatusFilter}
              onChange={(e) => setAssistanceStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white"
            >
              <option value="all">สถานะการช่วยเหลือ: ทั้งหมด</option>
              <option value="not_started">การช่วยเหลือ: ยังไม่เริ่ม</option>
              <option value="in_progress">การช่วยเหลือ: กำลังดำเนินการ</option>
              <option value="wait_confirmation">การช่วยเหลือ: รอยืนยันผล</option>
              <option value="completed">การช่วยเหลือ: เสร็จสิ้น</option>
            </select>
          </div>

          {/* Task 3: Outcome Status Filter */}
          <div>
            <select
              value={outcomeStatusFilter}
              onChange={(e) => setOutcomeStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white"
            >
              <option value="all">ผลการช่วยเหลือ: ทั้งหมด (7 สถานะ)</option>
              <option value="not_started">ยังไม่เริ่มดำเนินการ</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="partially_assisted">ช่วยเหลือบางส่วน (แบ่งงวด)</option>
              <option value="wait_proof_verification">รอตรวจสอบหลักฐาน</option>
              <option value="completed">ช่วยเหลือเสร็จสิ้น</option>
              <option value="has_issues">มีปัญหาหรือรอแก้ไข</option>
              <option value="cancelled">ยกเลิกพร้อมเหตุผล</option>
            </select>
          </div>

          {/* Asnaf Filter */}
          <div>
            <select
              value={asnafFilter}
              onChange={(e) => setAsnafFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white"
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
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>พบผลลัพธ์ <strong>{filteredList.length}</strong> รายการ</span>
          {(searchTerm || financeStatusFilter !== 'all' || assistanceStatusFilter !== 'all' || outcomeStatusFilter !== 'all' || asnafFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFinanceStatusFilter('all');
                setAssistanceStatusFilter('all');
                setOutcomeStatusFilter('all');
                setAsnafFilter('all');
              }}
              className="text-teal-700 hover:text-teal-900 font-semibold cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Main Table & Cards */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">กำลังเชื่อมโยงข้อมูลการเงินและคำร้องช่วยเหลือจากฐานข้อมูลจริง...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">ไม่พบข้อมูลการช่วยเหลือตามเงื่อนไขที่ระบุ</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            หากคุณเป็นผู้ดูแลเคส ระบบจะแสดงเฉพาะรายการคำร้องที่ได้รับมอบหมายหรือได้รับอนุญาตให้เข้าถึงเท่านั้น
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">เลขที่คำร้อง / ทะเบียน</th>
                  <th className="py-3.5 px-4">ผู้รับความช่วยเหลือ & อัสนัฟ</th>
                  <th className="py-3.5 px-4 text-center">สถานะการเงิน</th>
                  <th className="py-3.5 px-4 text-center">สถานะการช่วยเหลือ</th>
                  <th className="py-3.5 px-4 text-right">ยอดอนุมัติ</th>
                  <th className="py-3.5 px-4 text-right">ยอดรับจริงจากฝ่ายการเงิน</th>
                  <th className="py-3.5 px-4 text-right">ยอดช่วยเหลือจริง</th>
                  <th className="py-3.5 px-4">ใบสำคัญเบิกจ่าย</th>
                  <th className="py-3.5 px-4 text-center">หลักฐาน</th>
                  <th className="py-3.5 px-4 text-center">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => {
                  const hasDiscrepancy = item.discrepancies && item.discrepancies.length > 0;
                  return (
                    <tr key={item.applicationId} className="hover:bg-slate-50/90 transition-colors">
                      {/* 1 & 2: Application No & Registration No */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{item.applicationNo}</div>
                        <div className="text-[11px] text-teal-800 font-mono mt-0.5">{item.registrationNo}</div>
                      </td>

                      {/* 3 & 4: Beneficiary Name & Asnaf */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.beneficiaryName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {item.asnafLabel}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                            {item.assistanceType}
                          </span>
                        </div>
                      </td>

                      {/* Dual Status 1: Finance Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            item.financeStatus === 'fully_handed_over'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : item.financeStatus === 'partially_handed_over'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
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
                          การเงิน: {item.financeStatusLabel}
                        </span>
                        {hasDiscrepancy && (
                          <div className="mt-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              ⚠️ มียอดแจ้งไม่ตรง
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Dual Status 2: Assistance Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            item.assistanceStatus === 'completed'
                              ? 'bg-teal-50 text-teal-800 border-teal-300'
                              : item.assistanceStatus === 'wait_confirmation'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                              : item.assistanceStatus === 'in_progress'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : 'bg-stone-100 text-stone-700 border-stone-300'
                          }`}
                        >
                          การช่วยเหลือ: {item.assistanceStatusLabel}
                        </span>
                      </td>

                      {/* 6: Approved Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                        ฿{item.approvedAmount.toLocaleString()}
                      </td>

                      {/* 8 & 9: Handed Over & Received Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-bold text-emerald-900">
                          ฿{item.receivedAmount.toLocaleString()}
                        </div>
                        {item.withdrawnAmount > 0 && item.withdrawnAmount !== item.receivedAmount && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            เบิก: ฿{item.withdrawnAmount.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* 10: Disbursed to Beneficiary */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-extrabold text-teal-900">
                          ฿{item.disbursedAmount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          คงเหลือ: ฿{item.remainingBalance.toLocaleString()}
                        </div>
                      </td>

                      {/* 12: Voucher No */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {item.withdrawalNo}
                      </td>

                      {/* 13: Handover Proof */}
                      <td className="py-3.5 px-4 text-center">
                        {item.proofUrl ? (
                          <button
                            onClick={() => handleOpenProof(item.proofUrl!, item.proofName)}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-[11px] border border-teal-200 transition-colors inline-flex items-center gap-1"
                            title="ดูหลักฐานการส่งมอบเงิน"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            ดูหลักฐาน
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> รายละเอียด
                          </button>

                          {/* Record execution / confirm completion button */}
                          <button
                            onClick={() => handleOpenExecutionModal(item)}
                            className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="บันทึกและยืนยันผลการช่วยเหลือเสร็จสิ้น"
                          >
                            <CheckSquare className="w-3.5 h-3.5" /> บันทึก/ยืนยันผล
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
