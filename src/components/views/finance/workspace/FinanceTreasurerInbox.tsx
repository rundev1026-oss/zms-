'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  HandCoins,
  Receipt,
  CheckCheck,
  Search,
  RefreshCw,
  Eye,
  X,
  FileText,
  DollarSign,
  User,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Ban,
  UploadCloud,
  FileCheck2,
} from 'lucide-react';

interface BatchItemSummary {
  id: string;
  workflowNo: string;
  title: string;
  batchType: string;
  totalAmount: number;
  actualAmount: number;
  refundAmount: number;
  remainingFloat: number;
  status: string;
  operatorId: string;
  operatorName: string;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  handedOverAt: string | null;
  receivedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  rejectionReason: string | null;
  itemCount: number;
  unsettledCount: number;
}

interface BatchDetailData {
  workflow: {
    id: string;
    workflow_number: string;
    status: string;
    created_by_id: string;
    created_by_name: string;
    approved_by_id: string | null;
    approved_by_name: string | null;
    notes: string;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
  };
  withdrawal: {
    id: string;
    voucher_number: string;
    amount: number;
    actual_amount: number;
    refund_amount: number;
    recipient_type: string;
    recipient_user_id: string;
    purpose: string;
    status: string;
    bank_account_id: string | null;
    fund_source_type: string;
  };
  aidItems: Array<{
    id: string;
    application_id: string;
    beneficiary_name: string;
    amount: number;
    actual_amount: number;
    status: string;
    payment_method: string;
    receipt_number?: string;
    disbursed_at?: string;
  }>;
  adminItems: Array<{
    id: string;
    category_id: string;
    category_name: string;
    amount: number;
    receipt_number: string;
    status: string;
    description: string;
    cleared_at?: string;
  }>;
  handover: {
    id: string;
    handed_over_by_id: string;
    handed_over_by_name: string;
    received_by_id: string;
    amount: number;
    status: string;
    handed_over_at: string;
    confirmed_at: string | null;
    proof_url: string | null;
    notes: string | null;
  } | null;
  refunds: Array<{
    id: string;
    refund_amount: number;
    reason: string;
    recorded_at: string;
    recorded_by_name: string;
  }>;
  auditEvents: Array<{
    id: string;
    action: string;
    from_status: string;
    to_status: string;
    actor_id: string;
    actor_name: string;
    note: string;
    created_at: string;
  }>;
  equation: {
    handedOver: number;
    actualPaid: number;
    refunded: number;
    remainingFloat: number;
    isBalanced: boolean;
  };
}

interface Counts {
  pending_approval: number;
  revision: number;
  approved: number;
  pending_handover: number;
  pending_receipt: number;
  pending_closing: number;
  closed: number;
  all: number;
}

interface FinanceTreasurerInboxProps {
  actor: { id: string; name: string; role: string };
  onRefreshParent?: () => void;
  onOpenCreateBatch?: () => void;
}

export function FinanceTreasurerInbox({
  actor,
  onRefreshParent,
  onOpenCreateBatch,
}: FinanceTreasurerInboxProps) {
  const [activeTab, setActiveTab] = useState<
    | 'pending_approval'
    | 'revision'
    | 'approved'
    | 'pending_handover'
    | 'pending_receipt'
    | 'pending_closing'
    | 'closed'
    | 'all'
  >('pending_approval');

  const [batches, setBatches] = useState<BatchItemSummary[]>([]);
  const [counts, setCounts] = useState<Counts>({
    pending_approval: 0,
    revision: 0,
    approved: 0,
    pending_handover: 0,
    pending_receipt: 0,
    pending_closing: 0,
    closed: 0,
    all: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected batch for detail modal/drawer
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<BatchDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal sub-actions
  const [actionModal, setActionModal] = useState<
    'approve' | 'revision' | 'reject' | 'handover' | 'close_round' | null
  >(null);
  const [reasonNote, setReasonNote] = useState('');
  const [handoverAmount, setHandoverAmount] = useState(0);
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().slice(0, 10));
  const [handoverProof, setHandoverProof] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({
        view: 'batch_list',
        tab: activeTab,
        search,
      });
      const res = await fetch(`/api/finance/workflow-actions?${p.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setBatches(json.data.batches || []);
        if (json.data.counts) {
          setCounts(json.data.counts);
        }
      }
    } catch (e) {
      console.error('Error fetching batch disbursements for treasurer:', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Load detail when batch selected
  async function loadDetail(workflowId: string) {
    setSelectedWorkflowId(workflowId);
    setLoadingDetail(true);
    setActionError('');
    try {
      const res = await fetch(`/api/finance/workflow-actions?view=batch_detail&workflowId=${workflowId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDetailData(json.data);
        setHandoverAmount(json.data.withdrawal?.amount || 0);
      }
    } catch (e) {
      console.error('Error loading batch detail:', e);
    } finally {
      setLoadingDetail(false);
    }
  }

  // Handle Review (Approve, Reject, Revision)
  async function submitReview(decision: 'approved' | 'rejected' | 'rejected_with_revision') {
    if (!selectedWorkflowId) return;
    if (decision === 'rejected_with_revision' && !reasonNote.trim()) {
      setActionError('กรุณาระบุเหตุผลการส่งกลับแก้ไขให้เจ้าหน้าที่ทราบ');
      return;
    }
    if (decision === 'rejected' && !reasonNote.trim()) {
      setActionError('กรุณาระบุเหตุผลการปฏิเสธคำขอ');
      return;
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
            workflowId: selectedWorkflowId,
            decision,
            reason: reasonNote.trim(),
            note: reasonNote.trim(),
          },
          actor,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'เกิดข้อผิดพลาดในการตรวจสอบ');

      setActionModal(null);
      setReasonNote('');
      await loadDetail(selectedWorkflowId);
      await fetchBatches();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  }

  // Handle Handover Cash
  async function submitHandover() {
    if (!selectedWorkflowId) return;
    if (handoverAmount <= 0) {
      setActionError('จำนวนเงินที่ส่งมอบต้องมากกว่า 0 บาท');
      return;
    }

    setActionBusy(true);
    setActionError('');
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'handover_cash',
          input: {
            workflowId: selectedWorkflowId,
            amount: handoverAmount,
            handoverDate,
            proofUrl: handoverProof.trim(),
            notes: handoverNotes.trim(),
          },
          actor,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'เกิดข้อผิดพลาดในการบันทึกส่งมอบเงิน');

      setActionModal(null);
      await loadDetail(selectedWorkflowId);
      await fetchBatches();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  }

  // Handle Close Round
  async function submitCloseRound() {
    if (!selectedWorkflowId) return;

    setActionBusy(true);
    setActionError('');
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_round',
          input: {
            workflowId: selectedWorkflowId,
            notes: reasonNote.trim() || 'ปิดรอบการเบิกจ่ายเสร็จสิ้นและตรวจสอบสมดุลแล้ว',
          },
          actor,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'เกิดข้อผิดพลาดในการปิดรอบ');

      setActionModal(null);
      await loadDetail(selectedWorkflowId);
      await fetchBatches();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionBusy(false);
    }
  }

  const tabsConfig = [
    { key: 'pending_approval', label: 'รออนุมัติ', count: counts.pending_approval, color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { key: 'revision', label: 'ส่งกลับแก้ไข', count: counts.revision, color: 'text-rose-700 bg-rose-50 border-rose-200' },
    { key: 'approved', label: 'อนุมัติแล้ว', count: counts.approved, color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { key: 'pending_handover', label: 'รอส่งมอบเงิน', count: counts.pending_handover, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    { key: 'pending_receipt', label: 'รอยืนยันรับเงิน', count: counts.pending_receipt, color: 'text-purple-700 bg-purple-50 border-purple-200' },
    { key: 'pending_closing', label: 'รอปิดรอบ', count: counts.pending_closing, color: 'text-orange-700 bg-orange-50 border-orange-200' },
    { key: 'closed', label: 'ปิดรอบแล้ว', count: counts.closed, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { key: 'all', label: 'ทั้งหมด', count: counts.all, color: 'text-slate-700 bg-slate-50 border-slate-200' },
  ] as const;

  function renderStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">แบบร่าง</span>;
      case 'pending_approval':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200"><Clock className="h-3 w-3" /> รออนุมัติ</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200"><CheckCircle2 className="h-3 w-3" /> อนุมัติแล้ว</span>;
      case 'rejected_with_revision':
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200"><RotateCcw className="h-3 w-3" /> ส่งกลับแก้ไข</span>;
      case 'handed_over':
      case 'pending_receipt':
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200"><HandCoins className="h-3 w-3" /> ส่งมอบแล้ว / รอยืนยัน</span>;
      case 'in_progress':
      case 'received':
        return <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 border border-teal-200"><Receipt className="h-3 w-3" /> กำลังเบิกจ่ายจริง</span>;
      case 'pending_closing':
        return <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 border border-orange-200"><AlertCircle className="h-3 w-3" /> รอตรวจสอบปิดรอบ</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200"><CheckCheck className="h-3 w-3" /> ปิดรอบสมบูรณ์</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 border border-slate-300">ไม่อนุมัติ</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">{status}</span>;
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-100">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">กล่องงานเหรัญญิก (Treasurer Inbox)</h2>
              <span className="rounded-md bg-teal-100/80 px-2 py-0.5 text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                Two-Role Control
              </span>
            </div>
            <p className="text-xs text-slate-500">
              ศูนย์ตรวจสอบและอนุมัติรอบเบิกจ่าย ส่งมอบเงินสด และตรวจสอบสมดุลปิดรอบการเบิกจ่าย
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCreateBatch && (
            <button
              type="button"
              onClick={onOpenCreateBatch}
              className="zms-action inline-flex items-center gap-1.5 rounded-xl border border-teal-600 bg-teal-600/10 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-600/20 transition"
            >
              <FileText className="h-4 w-4" /> สร้างรอบเบิกเงินใหม่
            </button>
          )}

          <button
            type="button"
            onClick={fetchBatches}
            className="zms-action inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-teal-700' : ''}`} />
            รีเฟรช
          </button>
        </div>
      </div>

      {/* 7-Tab Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {tabsConfig.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่รอบเบิก, ผู้ขอเบิก, หรือวัตถุประสงค์..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          พบทั้งหมด <span className="font-bold text-slate-800">{batches.length}</span> รายการ
        </div>
      </div>

      {/* Batch Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500">
              <tr>
                <th className="py-3 pl-4 pr-2">เลขที่รอบเบิก</th>
                <th className="px-3 py-3">วันที่จัดทำ</th>
                <th className="px-3 py-3">ผู้จัดทำ (เจ้าหน้าที่)</th>
                <th className="px-3 py-3">วัตถุประสงค์ / หัวข้อ</th>
                <th className="px-3 py-3 text-center">จำนวนรายการ</th>
                <th className="px-3 py-3 text-right">ยอดขอเบิก</th>
                <th className="px-3 py-3 text-center">สถานะ</th>
                <th className="py-3 pl-3 pr-4 text-center">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-teal-700" />
                    กำลังโหลดข้อมูลกล่องงาน...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    ไม่มีรายการในสถานะนี้
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="transition hover:bg-slate-50/70">
                    <td className="py-3.5 pl-4 pr-2 font-mono font-bold text-slate-900">
                      {b.workflowNo}
                    </td>
                    <td className="px-3 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                      {b.createdAt ? b.createdAt.slice(0, 10) : '-'}
                    </td>
                    <td className="px-3 py-3.5 font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{b.operatorName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-slate-700 font-medium max-w-[260px] truncate" title={b.title}>
                      {b.title || '-'}
                    </td>
                    <td className="px-3 py-3.5 text-center font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px]">
                        <Layers className="h-3 w-3 text-slate-500" />
                        {b.itemCount} รายการ
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ฿{Number(b.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      {renderStatusBadge(b.status)}
                    </td>
                    <td className="py-3.5 pl-3 pr-4 text-center">
                      <button
                        type="button"
                        onClick={() => loadDetail(b.id)}
                        className="zms-action inline-flex items-center gap-1 rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 transition border border-teal-200/60"
                      >
                        <Eye className="h-3.5 w-3.5" /> ตรวจสอบ
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
      {/* DRAWER / MODAL: BATCH DETAIL & TREASURER ACTIONS                           */}
      {/* ========================================================================= */}
      {selectedWorkflowId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      รอบการเบิกเงิน: {detailData?.workflow.workflow_number || 'กำลังโหลด...'}
                    </h3>
                    {detailData && renderStatusBadge(detailData.workflow.status)}
                  </div>
                  <p className="text-xs text-slate-500">
                    ผู้จัดทำ: {detailData?.workflow.created_by_name || '-'} | จัดทำเมื่อ: {detailData?.workflow.created_at?.slice(0, 16) || '-'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedWorkflowId(null);
                  setDetailData(null);
                  setActionModal(null);
                  setActionError('');
                }}
                className="zms-action rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetail || !detailData ? (
                <div className="py-20 text-center text-slate-400">
                  <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-teal-700" />
                  กำลังดึงข้อมูลรอบการเบิกจ่ายและยอดเงิน...
                </div>
              ) : (
                <>
                  {/* Action Error Banner */}
                  {actionError && (
                    <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* Rejection / Revision Note alert if present */}
                  {detailData.workflow.rejection_reason && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                        เหตุผลการส่งกลับแก้ไข / ปฏิเสธ:
                      </div>
                      <p className="pl-6">{detailData.workflow.rejection_reason}</p>
                    </div>
                  )}

                  {/* 5 Financial KPI Summary Boxes */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">1. ยอดขอเบิก</span>
                      <p className="mt-1 text-sm font-black text-slate-900 tabular-nums">
                        ฿{Number(detailData.withdrawal.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3">
                      <span className="text-[11px] font-bold text-indigo-700 uppercase">2. ส่งมอบเงินสด</span>
                      <p className="mt-1 text-sm font-black text-indigo-900 tabular-nums">
                        ฿{Number(detailData.equation.handedOver || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-3">
                      <span className="text-[11px] font-bold text-teal-700 uppercase">3. จ่ายจริงแล้ว</span>
                      <p className="mt-1 text-sm font-black text-teal-900 tabular-nums">
                        ฿{Number(detailData.equation.actualPaid || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3">
                      <span className="text-[11px] font-bold text-blue-700 uppercase">4. ส่งคืนเงินแล้ว</span>
                      <p className="mt-1 text-sm font-black text-blue-900 tabular-nums">
                        ฿{Number(detailData.equation.refunded || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className={`rounded-2xl border p-3 ${detailData.equation.remainingFloat === 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                      <span className={`text-[11px] font-bold uppercase ${detailData.equation.remainingFloat === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        5. คงเหลือที่จนท.
                      </span>
                      <p className={`mt-1 text-sm font-black tabular-nums ${detailData.equation.remainingFloat === 0 ? 'text-emerald-900' : 'text-amber-900'}`}>
                        ฿{Number(detailData.equation.remainingFloat || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Cash Balance Equation Card */}
                  <div className={`rounded-2xl border p-4 ${detailData.equation.isBalanced ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {detailData.equation.isBalanced ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-slate-800">
                            สมการกระทบยอดเงินสดรอบเบิก (Closing Balance Equation):
                          </span>
                          <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                            ส่งมอบ (฿{detailData.equation.handedOver.toFixed(2)}) = จ่ายจริง (฿{detailData.equation.actualPaid.toFixed(2)}) + คืนเงิน (฿{detailData.equation.refunded.toFixed(2)}) + คงเหลือ (฿{detailData.equation.remainingFloat.toFixed(2)})
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${detailData.equation.isBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {detailData.equation.isBalanced ? 'สมการสมดุล 100%' : 'ยอดเงินยังไม่สมดุล'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Aid Items Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-teal-700" /> รายการเงินสงเคราะห์ (Aid Items)
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                          {detailData.aidItems.length} รายการ
                        </span>
                      </h4>
                      <span className="text-xs font-bold text-slate-700 tabular-nums">
                        รวม: ฿{detailData.aidItems.reduce((acc, i) => acc + (Number(i.amount) || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 pl-3">ผู้รับความช่วยเหลือ</th>
                            <th className="px-2 py-2.5">ช่องทาง</th>
                            <th className="px-2 py-2.5 text-right">ยอดขอเบิก</th>
                            <th className="px-2 py-2.5 text-right">จ่ายจริงแล้ว</th>
                            <th className="py-2.5 pr-3 text-center">สถานะรายการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailData.aidItems.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-4 text-center text-slate-400">ไม่มีรายการเงินสงเคราะห์</td>
                            </tr>
                          ) : (
                            detailData.aidItems.map((ai) => (
                              <tr key={ai.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 pl-3 font-semibold text-slate-800">
                                  {ai.beneficiary_name}
                                </td>
                                <td className="px-2 py-2.5 text-slate-600">
                                  {ai.payment_method === 'cash' ? 'เงินสด' : 'โอนธนาคาร'}
                                </td>
                                <td className="px-2 py-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                                  ฿{Number(ai.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-2 py-2.5 text-right font-mono font-bold text-teal-800 tabular-nums">
                                  ฿{Number(ai.actual_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 pr-3 text-center">
                                  {ai.status === 'cleared' || ai.status === 'disbursed' ? (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">จ่ายแล้ว</span>
                                  ) : (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">ยังไม่ตัดยอด</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Admin Items Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-teal-700" /> รายการค่าใช้จ่ายบริหาร (Admin Expenses)
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                          {detailData.adminItems.length} รายการ
                        </span>
                      </h4>
                      <span className="text-xs font-bold text-slate-700 tabular-nums">
                        รวม: ฿{detailData.adminItems.reduce((acc, i) => acc + (Number(i.amount) || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 pl-3">หมวดหมู่ค่าใช้จ่าย</th>
                            <th className="px-2 py-2.5">คำอธิบาย</th>
                            <th className="px-2 py-2.5 text-right">ยอดเงิน</th>
                            <th className="py-2.5 pr-3 text-center">สถานะรายการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailData.adminItems.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-slate-400">ไม่มีรายการค่าใช้จ่ายบริหาร</td>
                            </tr>
                          ) : (
                            detailData.adminItems.map((ci) => (
                              <tr key={ci.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 pl-3 font-semibold text-slate-800">
                                  {ci.category_name}
                                </td>
                                <td className="px-2 py-2.5 text-slate-600 truncate max-w-[200px]">
                                  {ci.description || '-'}
                                </td>
                                <td className="px-2 py-2.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                                  ฿{Number(ci.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 pr-3 text-center">
                                  {ci.status === 'cleared' ? (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">ตัดจ่ายแล้ว</span>
                                  ) : (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">ยังไม่ตัดยอด</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Handover & Confirmation Box */}
                  {detailData.handover && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <HandCoins className="h-4 w-4 text-indigo-600" /> ข้อมูลการส่งมอบเงินสด (Cash Handover)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400">ส่งมอบโดย:</span> {detailData.handover.handed_over_by_name}
                          <br />
                          <span className="text-slate-400">วันที่ส่งมอบ:</span> {detailData.handover.handed_over_at}
                        </div>
                        <div>
                          <span className="text-slate-400">สถานะการยืนยัน:</span>{' '}
                          {detailData.handover.confirmed_at ? (
                            <span className="font-bold text-emerald-700">
                              เจ้าหน้าที่กดยืนยันรับเงินแล้ว ({detailData.handover.confirmed_at.slice(0, 16)})
                            </span>
                          ) : (
                            <span className="font-bold text-amber-700">รอเจ้าหน้าที่กดยืนยันรับเงิน</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Audit Timeline */}
                  {detailData.auditEvents.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-500" /> ประวัติการทำรายการ (Audit Trail)
                      </h4>
                      <div className="rounded-xl border border-slate-200 bg-white p-3 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {detailData.auditEvents.map((ae) => (
                          <div key={ae.id} className="py-2 first:pt-0 last:pb-0 text-xs">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="font-bold text-slate-700">{ae.actor_name} ({ae.action})</span>
                              <span>{ae.created_at?.slice(0, 16)}</span>
                            </div>
                            <p className="text-slate-600 mt-0.5">{ae.note || '-'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Action Controls for Treasurer */}
            {detailData && (
              <div className="border-t border-slate-200 bg-slate-50/90 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedWorkflowId(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  ปิดหน้าต่าง
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Status: pending_approval -> Approve / Revision / Reject */}
                  {detailData.workflow.status === 'pending_approval' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActionModal('revision');
                          setReasonNote('');
                        }}
                        className="zms-action inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
                      >
                        <RotateCcw className="h-4 w-4" /> ส่งกลับแก้ไข
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActionModal('reject');
                          setReasonNote('');
                        }}
                        className="zms-action inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 transition"
                      >
                        <Ban className="h-4 w-4" /> ไม่อนุมัติ
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActionModal('approve');
                          setReasonNote('');
                        }}
                        className="zms-action inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
                      >
                        <CheckCircle2 className="h-4 w-4" /> อนุมัติรอบเบิก
                      </button>
                    </>
                  )}

                  {/* Status: approved or pending_handover -> Handover Cash */}
                  {(detailData.workflow.status === 'approved' || detailData.workflow.status === 'pending_handover') && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionModal('handover');
                        setHandoverAmount(detailData.withdrawal.amount || 0);
                        setHandoverDate(new Date().toISOString().slice(0, 10));
                        setHandoverProof('');
                        setHandoverNotes('');
                      }}
                      className="zms-action inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-800 transition"
                    >
                      <HandCoins className="h-4 w-4" /> บันทึกการส่งมอบเงินสดให้เจ้าหน้าที่
                    </button>
                  )}

                  {/* Status: pending_receipt -> Waiting for staff */}
                  {detailData.workflow.status === 'pending_receipt' && (
                    <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-200 px-4 py-2 text-xs font-bold text-purple-800">
                      <Clock className="h-4 w-4 animate-spin" />
                      รอเจ้าหน้าที่ประจำสำนักงานกดยืนยันรับเงิน
                    </div>
                  )}

                  {/* Status: pending_closing or in_progress -> Close Round */}
                  {(detailData.workflow.status === 'pending_closing' ||
                    detailData.workflow.status === 'in_progress' ||
                    detailData.workflow.status === 'received') && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionModal('close_round');
                        setReasonNote('ตรวจสอบยอดเงินจ่ายจริงและเงินคืนครบถ้วน สมดุล 100% ปิดรอบการเบิกจ่าย');
                      }}
                      className="zms-action inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
                    >
                      <CheckCheck className="h-4 w-4" /> อนุมัติปิดรอบการเบิกจ่าย
                    </button>
                  )}

                  {/* Status: closed */}
                  {detailData.workflow.status === 'closed' && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                      <CheckCheck className="h-4 w-4 text-emerald-600" />
                      ปิดรอบเรียบร้อยแล้วเมื่อ {detailData.workflow.updated_at?.slice(0, 16)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* SUB-MODAL: CONFIRM ACTION POPUP                                     */}
            {/* =================================================================== */}
            {actionModal && (
              <div className="absolute inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-2xs p-4 animate-in fade-in duration-100">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-bold text-slate-900">
                      {actionModal === 'approve' && 'ยืนยันอนุมัติรอบการเบิกจ่าย'}
                      {actionModal === 'revision' && 'ส่งกลับแก้ไข (ระบุเหตุผล)'}
                      {actionModal === 'reject' && 'ปฏิเสธคำขอเบิกจ่าย'}
                      {actionModal === 'handover' && 'บันทึกการส่งมอบเงินสด'}
                      {actionModal === 'close_round' && 'ยืนยันปิดรอบการเบิกจ่าย'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setActionModal(null);
                        setActionError('');
                      }}
                      className="zms-action rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {actionError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                      {actionError}
                    </div>
                  )}

                  {/* Approve Prompt */}
                  {actionModal === 'approve' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600">
                        คุณกำลังจะอนุมัติรอบการเบิกจ่าย{' '}
                        <span className="font-bold text-slate-900">{detailData?.workflow.workflow_number}</span>{' '}
                        ยอดรวม{' '}
                        <span className="font-bold text-teal-800">
                          ฿{Number(detailData?.withdrawal.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                        <textarea
                          rows={2}
                          value={reasonNote}
                          onChange={(e) => setReasonNote(e.target.value)}
                          placeholder="ระบุข้อความถึงเจ้าหน้าที่..."
                          className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-teal-600"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActionModal(null)}
                          className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => submitReview('approved')}
                          className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50"
                        >
                          {actionBusy ? 'กำลังบันทึก...' : 'ยืนยันอนุมัติ'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Revision Prompt */}
                  {actionModal === 'revision' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600">
                        ระบุรายละเอียดที่ต้องการให้เจ้าหน้าที่แก้ไขรอบเบิกนี้:
                      </p>
                      <div>
                        <label className="text-[11px] font-bold text-rose-700">เหตุผลการส่งกลับแก้ไข (จำเป็น) *</label>
                        <textarea
                          rows={3}
                          value={reasonNote}
                          onChange={(e) => setReasonNote(e.target.value)}
                          placeholder="เช่น เอกสารใบสมัครไม่ชัดเจน, หมวดค่าใช้จ่ายไม่ถูกต้อง..."
                          className="mt-1 w-full rounded-xl border border-rose-300 bg-rose-50/20 p-2 text-xs outline-none focus:border-rose-600"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActionModal(null)}
                          className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => submitReview('rejected_with_revision')}
                          className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          {actionBusy ? 'กำลังบันทึก...' : 'ส่งกลับแก้ไข'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reject Prompt */}
                  {actionModal === 'reject' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600">
                        คุณกำลังจะปฏิเสธรอบเบิกนี้ รายการทั้งหมดจะไม่สามารถดำเนินการต่อได้:
                      </p>
                      <div>
                        <label className="text-[11px] font-bold text-rose-700">เหตุผลการปฏิเสธ (จำเป็น) *</label>
                        <textarea
                          rows={3}
                          value={reasonNote}
                          onChange={(e) => setReasonNote(e.target.value)}
                          placeholder="ระบุเหตุผลที่ไม่อนุมัติ..."
                          className="mt-1 w-full rounded-xl border border-rose-300 bg-rose-50/20 p-2 text-xs outline-none focus:border-rose-600"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActionModal(null)}
                          className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => submitReview('rejected')}
                          className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {actionBusy ? 'กำลังบันทึก...' : 'ยืนยันปฏิเสธ'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Handover Cash Prompt */}
                  {actionModal === 'handover' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">จำนวนเงินสดส่งมอบ (บาท) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={handoverAmount}
                          onChange={(e) => setHandoverAmount(parseFloat(e.target.value) || 0)}
                          className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs font-bold outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700">วันที่และเวลาส่งมอบ *</label>
                        <input
                          type="date"
                          value={handoverDate}
                          onChange={(e) => setHandoverDate(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700">ลิงก์หลักฐาน / ใบรับเงินสด (URL)</label>
                        <input
                          type="text"
                          value={handoverProof}
                          onChange={(e) => setHandoverProof(e.target.value)}
                          placeholder="https://... หรือแนบลิงก์สลิป"
                          className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700">หมายเหตุ</label>
                        <textarea
                          rows={2}
                          value={handoverNotes}
                          onChange={(e) => setHandoverNotes(e.target.value)}
                          placeholder="ระบุข้อความกำกับ..."
                          className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActionModal(null)}
                          className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={submitHandover}
                          className="rounded-xl bg-indigo-700 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-800 disabled:opacity-50"
                        >
                          {actionBusy ? 'กำลังบันทึก...' : 'บันทึกส่งมอบเงิน'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Close Round Prompt */}
                  {actionModal === 'close_round' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600">
                        ตรวจสอบสมการสมดุลรอบเบิกจ่ายเรียบร้อยแล้ว:
                        <br />
                        <span className="font-mono text-[11px] text-slate-700 block mt-1">
                          ยอดส่งมอบ ฿{detailData?.equation.handedOver.toFixed(2)} = จ่ายจริง ฿{detailData?.equation.actualPaid.toFixed(2)} + คืนเงิน ฿{detailData?.equation.refunded.toFixed(2)} + คงเหลือ ฿{detailData?.equation.remainingFloat.toFixed(2)}
                        </span>
                      </p>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">หมายเหตุการปิดรอบ</label>
                        <textarea
                          rows={2}
                          value={reasonNote}
                          onChange={(e) => setReasonNote(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActionModal(null)}
                          className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={submitCloseRound}
                          className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          {actionBusy ? 'กำลังบันทึก...' : 'ยืนยันปิดรอบสมบูรณ์'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
