'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  HandCoins,
  Receipt,
  FileText,
  DollarSign,
  User,
  ArrowRight,
  RefreshCw,
  UploadCloud,
  CheckCheck,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';

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

interface FinanceStaffBatchSettlementModalProps {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
  actor: { id: string; name: string; role: string };
  onSettled?: () => void;
}

export function FinanceStaffBatchSettlementModal({
  workflowId,
  isOpen,
  onClose,
  actor,
  onSettled,
}: FinanceStaffBatchSettlementModalProps) {
  const [data, setData] = useState<BatchDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Settlement popup state
  const [settleItem, setSettleItem] = useState<{
    type: 'aid' | 'admin';
    id: string;
    title: string;
    amount: number;
  } | null>(null);

  const [actualPaidAmount, setActualPaidAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptNumber, setReceiptNumber] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Refund popup state
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundDate, setRefundDate] = useState(new Date().toISOString().slice(0, 10));
  const [refundReason, setRefundReason] = useState('ส่งคืนเงินสดคงเหลือจากการเบิกจ่ายตามจริง');
  const [refundProofUrl, setRefundProofUrl] = useState('');

  const loadData = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/finance/workflow-actions?view=batch_detail&workflowId=${workflowId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || 'ไม่พบข้อมูลรอบเบิกจ่าย');
      }
    } catch (e: any) {
      setError(e.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (isOpen && workflowId) {
      loadData();
    }
  }, [isOpen, workflowId, loadData]);

  if (!isOpen) return null;

  // Confirm receipt of cash handover from treasurer
  async function handleConfirmReceipt() {
    if (!data?.handover?.id) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_receipt',
          input: {
            workflowId,
            handoverId: data.handover.id,
          },
          actor,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'ยืนยันรับเงินไม่สำเร็จ');

      await loadData();
      if (onSettled) onSettled();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Submit single line item settlement (Aid or Admin)
  async function handleSettleItem() {
    if (!settleItem) return;
    if (actualPaidAmount <= 0) {
      setError('ยอดจ่ายจริงต้องมากกว่า 0 บาท');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'settle_item',
          input: {
            workflowId,
            type: settleItem.type,
            itemId: settleItem.id,
            actualAmount: actualPaidAmount,
            receiptNumber: receiptNumber.trim() || undefined,
            paymentDate,
            proofUrl: proofUrl.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          actor,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'บันทึกจ่ายจริงไม่สำเร็จ');

      setSettleItem(null);
      await loadData();
      if (onSettled) onSettled();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Submit Refund to Treasurer
  async function handleRecordRefund() {
    if (refundAmount <= 0) {
      setError('ยอดเงินส่งคืนต้องมากกว่า 0 บาท');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/finance/workflow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_refund',
          input: {
            workflowId,
            amount: refundAmount,
            reason: refundReason.trim(),
            proofUrl: refundProofUrl.trim() || undefined,
            date: refundDate,
          },
          actor,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'บันทึกส่งคืนเงินไม่สำเร็จ');

      setIsRefundModalOpen(false);
      await loadData();
      if (onSettled) onSettled();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const isHandedOverPendingReceipt =
    data?.handover && data.handover.status === 'handed_over' && !data.handover.confirmed_at;

  const canSettle =
    data?.workflow.status === 'received' ||
    data?.workflow.status === 'in_progress' ||
    (data?.handover && !!data.handover.confirmed_at);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white font-bold">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  สรุปการใช้เงินและตัดยอดรอบเบิก: {data?.workflow.workflow_number || 'กำลังโหลด...'}
                </h3>
                <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                  สำหรับเจ้าหน้าที่
                </span>
              </div>
              <p className="text-xs text-slate-500">
                วัตถุประสงค์: {data?.withdrawal.purpose || '-'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {loading || !data ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-teal-700" />
              กำลังโหลดข้อมูลรอบการเบิกจ่าย...
            </div>
          ) : (
            <>
              {/* HANDOVER CONFIRMATION BANNER */}
              {isHandedOverPendingReceipt && (
                <div className="rounded-2xl border-2 border-indigo-500/40 bg-indigo-50/60 p-5 shadow-sm space-y-3 animate-pulse">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-700 text-white">
                        <HandCoins className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-indigo-950">
                          เหรัญญิกได้ส่งมอบเงินสดให้ท่านแล้ว
                        </h4>
                        <p className="text-xs text-indigo-800 mt-0.5">
                          จำนวนเงิน: <span className="font-bold text-base text-indigo-950 tabular-nums font-mono">฿{Number(data.handover?.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span> | ส่งมอบเมื่อ: {data.handover?.handed_over_at}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleConfirmReceipt}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-800 disabled:opacity-50 transition"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {busy ? 'กำลังยืนยัน...' : 'ยืนยันรับเงินสดเข้าระบบ'}
                    </button>
                  </div>
                  <p className="text-[11px] text-indigo-700 bg-indigo-100/60 rounded-lg p-2">
                    * เมื่อกดยืนยันรับเงินสด ระบบจะลงบัญชีแยกประเภทคู่ (GL) เดบิตเงินสดในมือเจ้าหน้าที่ (1030-01) และเครดิตเงินสดเหรัญญิก (1020-01) โดยอัตโนมัติ
                  </p>
                </div>
              )}

              {/* 4 Financial KPI Summary Boxes */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase">1. รับเงินสดมา</span>
                  <p className="mt-1 text-sm font-black text-indigo-950 tabular-nums">
                    ฿{Number(data.equation.handedOver || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-3">
                  <span className="text-[11px] font-bold text-teal-700 uppercase">2. จ่ายจริงแล้ว</span>
                  <p className="mt-1 text-sm font-black text-teal-950 tabular-nums">
                    ฿{Number(data.equation.actualPaid || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3">
                  <span className="text-[11px] font-bold text-blue-700 uppercase">3. ส่งคืนเหรัญญิกแล้ว</span>
                  <p className="mt-1 text-sm font-black text-blue-950 tabular-nums">
                    ฿{Number(data.equation.refunded || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className={`rounded-2xl border p-3 ${data.equation.remainingFloat === 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase ${data.equation.remainingFloat === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      4. คงเหลือในมือ
                    </span>
                    {data.equation.remainingFloat > 0 && canSettle && (
                      <button
                        type="button"
                        onClick={() => {
                          setRefundAmount(data.equation.remainingFloat);
                          setRefundDate(new Date().toISOString().slice(0, 10));
                          setRefundReason('ส่งคืนเงินสดคงเหลือจากการเบิกจ่ายตามจริง');
                          setRefundProofUrl('');
                          setIsRefundModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md transition"
                      >
                        ส่งคืนเงินสด
                      </button>
                    )}
                  </div>
                  <p className={`mt-1 text-sm font-black tabular-nums ${data.equation.remainingFloat === 0 ? 'text-emerald-950' : 'text-amber-950'}`}>
                    ฿{Number(data.equation.remainingFloat || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Notice if not confirmed yet */}
              {!canSettle && !isHandedOverPendingReceipt && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <Clock className="h-4 w-4" /> รอบเบิกนี้ยังไม่ได้รับการส่งมอบเงินสดหรือยังรอการอนุมัติ
                  </div>
                  <p>ท่านจะสามารถบันทึกจ่ายจริงและตัดยอดได้ เมื่อเหรัญญิกอนุมัติและส่งมอบเงินสดให้ท่านแล้ว</p>
                </div>
              )}

              {/* AID ITEMS TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-teal-700" /> รายการเงินสงเคราะห์ (Aid Items)
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                      {data.aidItems.length} รายการ
                    </span>
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    ตัดยอดแล้ว {data.aidItems.filter((i) => i.status === 'cleared' || i.status === 'disbursed').length} จาก {data.aidItems.length} รายการ
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 pl-4">ผู้รับความช่วยเหลือ</th>
                        <th className="px-2 py-2.5">ช่องทาง</th>
                        <th className="px-2 py-2.5 text-right">ยอดขอเบิก</th>
                        <th className="px-2 py-2.5 text-right">จ่ายจริง</th>
                        <th className="px-2 py-2.5 text-center">สถานะ</th>
                        <th className="py-2.5 pr-4 text-center">การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.aidItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400">ไม่มีรายการเงินสงเคราะห์ในรอบนี้</td>
                        </tr>
                      ) : (
                        data.aidItems.map((item) => {
                          const isSettled = item.status === 'cleared' || item.status === 'disbursed';
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/60">
                              <td className="py-3 pl-4 font-bold text-slate-900">
                                {item.beneficiary_name}
                              </td>
                              <td className="px-2 py-3 text-slate-600">
                                {item.payment_method === 'cash' ? 'เงินสด' : 'โอนธนาคาร'}
                              </td>
                              <td className="px-2 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                                ฿{Number(item.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-3 text-right font-mono font-bold text-teal-800 tabular-nums">
                                ฿{Number(item.actual_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-3 text-center">
                                {isSettled ? (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">จ่ายแล้ว</span>
                                ) : (
                                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">ยังไม่ตัดยอด</span>
                                )}
                              </td>
                              <td className="py-3 pr-4 text-center">
                                {isSettled ? (
                                  <span className="text-[11px] text-slate-400 font-medium">บันทึกแล้ว</span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!canSettle}
                                    onClick={() => {
                                      setSettleItem({
                                        type: 'aid',
                                        id: item.id,
                                        title: `เงินสงเคราะห์: ${item.beneficiary_name}`,
                                        amount: item.amount,
                                      });
                                      setActualPaidAmount(item.amount);
                                      setPaymentDate(new Date().toISOString().slice(0, 10));
                                      setReceiptNumber('');
                                      setProofUrl('');
                                      setNotes('');
                                    }}
                                    className="inline-flex items-center gap-1 rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 disabled:opacity-40 transition border border-teal-200"
                                  >
                                    <Receipt className="h-3.5 w-3.5" /> บันทึกจ่ายจริง
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ADMIN ITEMS TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-teal-700" /> รายการค่าใช้จ่ายบริหาร (Admin Expenses)
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                      {data.adminItems.length} รายการ
                    </span>
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    ตัดยอดแล้ว {data.adminItems.filter((i) => i.status === 'cleared').length} จาก {data.adminItems.length} รายการ
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 pl-4">หมวดหมู่ค่าใช้จ่าย</th>
                        <th className="px-2 py-2.5">คำอธิบาย</th>
                        <th className="px-2 py-2.5 text-right">ยอดเบิก</th>
                        <th className="px-2 py-2.5 text-center">สถานะ</th>
                        <th className="py-2.5 pr-4 text-center">การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.adminItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">ไม่มีรายการค่าใช้จ่ายบริหารในรอบนี้</td>
                        </tr>
                      ) : (
                        data.adminItems.map((item) => {
                          const isSettled = item.status === 'cleared';
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/60">
                              <td className="py-3 pl-4 font-bold text-slate-900">
                                {item.category_name}
                              </td>
                              <td className="px-2 py-3 text-slate-600 truncate max-w-[220px]">
                                {item.description || '-'}
                              </td>
                              <td className="px-2 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                                ฿{Number(item.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-2 py-3 text-center">
                                {isSettled ? (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">ตัดจ่ายแล้ว</span>
                                ) : (
                                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">ยังไม่ตัดยอด</span>
                                )}
                              </td>
                              <td className="py-3 pr-4 text-center">
                                {isSettled ? (
                                  <span className="text-[11px] text-slate-400 font-medium">บันทึกแล้ว</span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!canSettle}
                                    onClick={() => {
                                      setSettleItem({
                                        type: 'admin',
                                        id: item.id,
                                        title: `ค่าใช้จ่ายบริหาร: ${item.category_name}`,
                                        amount: item.amount,
                                      });
                                      setActualPaidAmount(item.amount);
                                      setPaymentDate(new Date().toISOString().slice(0, 10));
                                      setReceiptNumber('');
                                      setProofUrl('');
                                      setNotes('');
                                    }}
                                    className="inline-flex items-center gap-1 rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 disabled:opacity-40 transition border border-teal-200"
                                  >
                                    <Receipt className="h-3.5 w-3.5" /> ตัดยอดจ่ายจริง
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REFUND HISTORY */}
              {data.refunds.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <RotateCcw className="h-4 w-4 text-blue-600" /> ประวัติการส่งคืนเงินสดให้เหรัญญิก
                  </h4>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 divide-y divide-slate-100 text-xs">
                    {data.refunds.map((rf) => (
                      <div key={rf.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800">คืนเงินจำนวน: ฿{Number(rf.refund_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                          <p className="text-slate-500 text-[11px]">{rf.reason} (บันทึกเมื่อ {rf.recorded_at?.slice(0, 16)})</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">ส่งคืนแล้ว</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 bg-slate-50/90 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            ปิดหน้าต่าง
          </button>

          <div className="text-xs text-slate-500 font-medium">
            รอบการเบิกจ่าย ZMS | สองบทบาทเพื่อการควบคุมภายในที่โปร่งใส
          </div>
        </div>

        {/* =================================================================== */}
        {/* SUB-MODAL: SETTLE LINE ITEM POPUP                                   */}
        {/* =================================================================== */}
        {settleItem && (
          <div className="absolute inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-2xs p-4 animate-in fade-in duration-100">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-teal-700" />
                  บันทึกจ่ายจริงและตัดยอดรายการ
                </h4>
                <button
                  type="button"
                  onClick={() => setSettleItem(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs">
                <span className="text-slate-500">รายการ:</span>{' '}
                <span className="font-bold text-slate-900">{settleItem.title}</span>
                <br />
                <span className="text-slate-500">ยอดที่ขอเบิกไว้:</span>{' '}
                <span className="font-bold text-teal-800 font-mono">
                  ฿{Number(settleItem.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">ยอดเงินที่จ่ายจริง (บาท) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualPaidAmount}
                    onChange={(e) => setActualPaidAmount(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs font-bold outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">วันที่จ่ายจริง *</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">เลขที่ใบเสร็จ / ใบสำคัญรับเงิน</label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="เช่น REC-2569-001 หรือเลขที่บิล"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">ลิงก์ภาพถ่ายใบเสร็จ / หลักฐานการจ่าย</label>
                  <input
                    type="text"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://... หรือแนบลิงก์รูปภาพ"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">หมายเหตุ</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ระบุข้อความเพิ่มเติม..."
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettleItem(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSettleItem}
                  className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {busy ? 'กำลังบันทึก...' : 'ยืนยันจ่ายจริงและตัดยอด GL'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SUB-MODAL: REFUND CASH TO TREASURER                                 */}
        {/* =================================================================== */}
        {isRefundModalOpen && (
          <div className="absolute inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-2xs p-4 animate-in fade-in duration-100">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <RotateCcw className="h-4 w-4 text-blue-600" />
                  ส่งคืนเงินสดคงเหลือให้เหรัญญิก
                </h4>
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">จำนวนเงินสดที่ส่งคืน (บาท) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs font-bold outline-none focus:border-blue-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    ยอดเงินสดคงเหลือในมือ: ฿{Number(data?.equation.remainingFloat || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">วันที่ส่งคืนเงิน *</label>
                  <input
                    type="date"
                    value={refundDate}
                    onChange={(e) => setRefundDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">เหตุผลการคืนเงิน</label>
                  <textarea
                    rows={2}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">ลิงก์หลักฐาน / ใบรับคืนเงินสด</label>
                  <input
                    type="text"
                    value={refundProofUrl}
                    onChange={(e) => setRefundProofUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRecordRefund}
                  className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {busy ? 'กำลังบันทึก...' : 'ยืนยันคืนเงินสดและตัดยอด GL'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
