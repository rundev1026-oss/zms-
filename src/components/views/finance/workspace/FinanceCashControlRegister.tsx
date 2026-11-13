'use client';

import React, { useState } from 'react';
import {
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  RotateCcw,
  Eye,
  ExternalLink,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';

export interface RegisterItem {
  index: number;
  id: string;
  date: string;
  documentNo: string;
  batchNo: string;
  staffName: string;
  staffId?: string;
  purposeType?: 'ช่วยเหลือ' | 'บริหาร' | 'รอบเบิกเงิน';
  purpose: string;
  sourceAccountName: string;
  targetAccountName: string;
  requestedAmount: number;
  approvedAmount: number;
  transferredAmount: number;
  actualPaidAmount: number;
  remainingAmount: number;
  refundAmount: number;
  actualPaidDate: string;
  refundDate: string;
  proofStatus: 'ครบถ้วน' | 'รอตรวจสอบ' | 'ยังไม่แนบ';
  proofUrl: string;
  itemStatus: string;
  approverName: string;
  // Metadata
  workflowId?: string;
  withdrawalId?: string;
  applicationId?: string;
  applicationNo?: string;
  beneficiaryName?: string;
  expenseCategory?: string;
  batchStatus?: string;
  withdrawnAmount?: number;
}

function fmt(n: number): string {
  return (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function FinanceCashControlRegister({
  items,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onRefresh,
  onOpenAidModal,
  onOpenAdminModal,
  onOpenCreateBatch,
  onOpenSettlement,
}: {
  items: RegisterItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh?: () => void;
  onOpenAidModal?: () => void;
  onOpenAdminModal?: () => void;
  onOpenCreateBatch?: () => void;
  onOpenSettlement?: (workflowId: string) => void;
}) {
  const [selectedItem, setSelectedItem] = useState<RegisterItem | null>(null);

  const tabs = [
    { id: 'all', label: 'ทั้งหมด (All)' },
    { id: 'draft', label: 'ฉบับร่าง (Draft)' },
    { id: 'pending_approval', label: 'รออนุมัติ (Pending)' },
    { id: 'approved', label: 'อนุมัติแล้ว (Approved)' },
    { id: 'disbursed', label: 'เบิกเงินสำเร็จ (Disbursed)' },
    { id: 'pending_handover', label: 'รอส่งมอบ/รอจ่าย (Handover)' },
    { id: 'paid', label: 'จ่ายแล้ว (Paid)' },
    { id: 'partial', label: 'จ่ายบางส่วน (Partial)' },
    { id: 'pending_refund', label: 'รอส่งคืน (Pending Refund)' },
    { id: 'refunded', label: 'ส่งคืนแล้ว (Refunded)' },
    { id: 'cancelled', label: 'ยกเลิก (Cancelled)' },
  ];

  function exportCsv() {
    const headers = [
      'ลำดับ',
      'วันที่เบิก',
      'เลขที่เอกสารเบิก',
      'เลขที่รอบเบิก',
      'ชื่อผู้เบิก/เจ้าหน้าที่',
      'วัตถุประสงค์/ประเภทเงิน',
      'บัญชีต้นทาง',
      'บัญชีปลายทาง',
      'ยอดขอเบิก (บาท)',
      'ยอดอนุมัติ (บาท)',
      'ยอดโอนส่งมอบ (บาท)',
      'ยอดจ่ายจริง (บาท)',
      'ยอดคงเหลือ (บาท)',
      'ยอดส่งคืน (บาท)',
      'วันที่จ่ายจริง',
      'วันที่ส่งคืน',
      'สถานะหลักฐาน',
      'สถานะรายการ',
      'ผู้อนุมัติ/ผู้จ่าย',
    ];

    const rows = items.map((it) => [
      it.index,
      it.date,
      it.documentNo,
      it.batchNo || '-',
      `"${it.staffName || ''}"`,
      `"${it.purpose || ''}"`,
      `"${it.sourceAccountName || ''}"`,
      `"${it.targetAccountName || ''}"`,
      it.requestedAmount || it.withdrawnAmount || 0,
      it.approvedAmount || 0,
      it.transferredAmount || 0,
      it.actualPaidAmount || 0,
      it.remainingAmount || 0,
      it.refundAmount || 0,
      it.actualPaidDate || '-',
      it.refundDate || '-',
      it.proofStatus || 'ยังไม่แนบ',
      `"${it.itemStatus || ''}"`,
      `"${it.approverName || ''}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cash-control-register-${activeTab}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            ทะเบียนควบคุมการเบิกและตัดยอดเงินสด (Cash Disbursement Control Register)
          </h2>
          <p className="text-xs text-slate-500">
            ระบบทะเบียนคุม 19 คอลัมน์ เชื่อมโยงบัญชีธนาคาร (A) เงินสดเหรัญญิก (B) เงินสดเจ้าหน้าที่ (C) และผู้รับซะกาต
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCreateBatch && (
            <button
              type="button"
              onClick={onOpenCreateBatch}
              className="zms-action inline-flex items-center gap-1.5 rounded-xl border border-teal-700 bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-teal-800"
            >
              <Plus className="h-3.5 w-3.5" /> สร้างรอบเบิกเงิน (Batch)
            </button>
          )}
          {onOpenAidModal && (
            <button
              type="button"
              onClick={onOpenAidModal}
              className="zms-action inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 transition hover:bg-teal-100"
            >
              <Plus className="h-3.5 w-3.5" /> ตัดจ่ายช่วยเหลือ
            </button>
          )}
          {onOpenAdminModal && (
            <button
              type="button"
              onClick={onOpenAdminModal}
              className="zms-action inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-100"
            >
              <Plus className="h-3.5 w-3.5" /> ตัดจ่ายบริหาร
            </button>
          )}
          <button
            type="button"
            onClick={exportCsv}
            className="zms-action inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" /> ส่งออก Excel/CSV
          </button>
        </div>
      </div>

      {/* 11 Filter Tabs and Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-3">
        {/* 11 Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs w-full lg:w-80 xl:w-96 shrink-0">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาตามเลขที่, เจ้าหน้าที่, ผู้รับ, วัตถุประสงค์..."
            className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 shrink-0"
            >
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* 19-Column Central Table (+ 1 Action Column = 20 Columns Exactly) */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full min-w-[1900px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700">
              <th className="py-3.5 pl-4 pr-2 whitespace-nowrap">#</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">วันที่เบิก</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">เลขที่เอกสารเบิก</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">เลขที่รอบเบิก</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">ผู้เบิก/เจ้าหน้าที่</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">วัตถุประสงค์/ประเภทเงิน</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">บัญชีต้นทาง</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">บัญชีปลายทาง</th>
              <th className="px-2.5 py-3.5 text-right whitespace-nowrap">ยอดขอเบิก (Requested)</th>
              <th className="px-2.5 py-3.5 text-right whitespace-nowrap">ยอดอนุมัติ (Approved)</th>
              <th className="px-2.5 py-3.5 text-right whitespace-nowrap">ยอดโอนส่งมอบ (Transferred)</th>
              <th className="px-2.5 py-3.5 text-right whitespace-nowrap">ยอดจ่ายจริง (Actual Paid)</th>
              <th className="px-2.5 py-3.5 text-right whitespace-nowrap">ยอดคงเหลือ (Remaining)</th>
              <th className="px-2.5 py-3.5 text-right whitespace-nowrap">ยอดส่งคืน (Refunded)</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">วันที่จ่ายจริง</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">วันที่ส่งคืน</th>
              <th className="px-2.5 py-3.5 text-center whitespace-nowrap">สถานะหลักฐาน</th>
              <th className="px-2.5 py-3.5 text-center whitespace-nowrap">สถานะรายการ</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">ผู้อนุมัติ/ผู้จ่าย</th>
              <th className="py-3.5 pl-2 pr-4 text-center whitespace-nowrap">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={20} className="py-12 text-center text-slate-400">
                  ไม่พบรายการเบิกจ่ายเงินสดตามเงื่อนไข
                </td>
              </tr>
            ) : (
              items.map((it, idx) => (
                <tr key={`reg-${it.id}-${it.index ?? idx}`} className="transition hover:bg-slate-50/80">
                  {/* 1. ลำดับ */}
                  <td className="py-3.5 pl-4 pr-2 font-medium text-slate-400 whitespace-nowrap">{it.index}</td>
                  {/* 2. วันที่เบิก */}
                  <td className="px-2.5 py-3.5 text-slate-600 whitespace-nowrap">{it.date}</td>
                  {/* 3. เลขที่เอกสารเบิก */}
                  <td className="px-2.5 py-3.5 font-semibold text-slate-900 whitespace-nowrap">{it.documentNo}</td>
                  {/* 4. เลขที่รอบเบิก */}
                  <td className="px-2.5 py-3.5 font-mono text-[11px] text-teal-700 whitespace-nowrap">{it.batchNo || '-'}</td>
                  {/* 5. ชื่อผู้เบิก / เจ้าหน้าที่ */}
                  <td className="px-2.5 py-3.5 font-medium text-slate-800 whitespace-nowrap">{it.staffName}</td>
                  {/* 6. วัตถุประสงค์ / ประเภทเงิน */}
                  <td className="px-2.5 py-3.5 min-w-[200px]">
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        it.purposeType === 'ช่วยเหลือ'
                          ? 'bg-teal-100 text-teal-800'
                          : it.purposeType === 'บริหาร'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {it.purposeType || 'ช่วยเหลือ'}
                    </span>
                    <div className="mt-0.5 truncate text-[11px] text-slate-600 max-w-[220px]" title={it.purpose}>
                      {it.purpose}
                    </div>
                  </td>
                  {/* 7. บัญชีต้นทาง */}
                  <td className="px-2.5 py-3.5 text-[11px] text-slate-700 whitespace-nowrap max-w-[180px] truncate" title={it.sourceAccountName}>
                    {it.sourceAccountName || '-'}
                  </td>
                  {/* 8. บัญชีปลายทาง */}
                  <td className="px-2.5 py-3.5 text-[11px] text-slate-700 whitespace-nowrap max-w-[180px] truncate" title={it.targetAccountName}>
                    {it.targetAccountName || 'บัญชี C: เงินสดเจ้าหน้าที่ (1030-01)'}
                  </td>
                  {/* 9. ยอดขอเบิก */}
                  <td className="px-2.5 py-3.5 text-right font-medium text-slate-700 whitespace-nowrap tabular-nums">
                    ฿{fmt(it.requestedAmount || it.withdrawnAmount || 0)}
                  </td>
                  {/* 10. ยอดอนุมัติ */}
                  <td className="px-2.5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">
                    ฿{fmt(it.approvedAmount || 0)}
                  </td>
                  {/* 11. ยอดโอนส่งมอบ */}
                  <td className="px-2.5 py-3.5 text-right font-bold text-teal-700 whitespace-nowrap tabular-nums">
                    ฿{fmt(it.transferredAmount || 0)}
                  </td>
                  {/* 12. ยอดจ่ายจริง */}
                  <td className="px-2.5 py-3.5 text-right font-bold text-indigo-700 whitespace-nowrap tabular-nums">
                    {it.actualPaidAmount > 0 ? `฿${fmt(it.actualPaidAmount)}` : '-'}
                  </td>
                  {/* 13. ยอดคงเหลือ */}
                  <td className="px-2.5 py-3.5 text-right font-bold text-amber-700 whitespace-nowrap tabular-nums">
                    ฿{fmt(it.remainingAmount || 0)}
                  </td>
                  {/* 14. ยอดส่งคืน */}
                  <td className="px-2.5 py-3.5 text-right font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                    {it.refundAmount > 0 ? `฿${fmt(it.refundAmount)}` : '-'}
                  </td>
                  {/* 15. วันที่จ่ายจริง */}
                  <td className="px-2.5 py-3.5 text-slate-600 whitespace-nowrap">{it.actualPaidDate || '-'}</td>
                  {/* 16. วันที่ส่งคืน */}
                  <td className="px-2.5 py-3.5 text-slate-600 whitespace-nowrap">{it.refundDate || '-'}</td>
                  {/* 17. สถานะหลักฐาน */}
                  <td className="px-2.5 py-3.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        it.proofStatus === 'ครบถ้วน'
                          ? 'bg-emerald-100 text-emerald-800'
                          : it.proofStatus === 'รอตรวจสอบ'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {it.proofStatus}
                    </span>
                  </td>
                  {/* 18. สถานะรายการ */}
                  <td className="px-2.5 py-3.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        it.itemStatus === 'จ่ายแล้ว' || it.itemStatus === 'เคลียร์แล้ว' || it.itemStatus === 'ส่งคืนแล้ว'
                          ? 'bg-emerald-100 text-emerald-800'
                          : it.itemStatus === 'เบิกเงินสำเร็จ' || it.itemStatus === 'อนุมัติแล้ว'
                          ? 'bg-teal-100 text-teal-800'
                          : it.itemStatus === 'จ่ายบางส่วน' || it.itemStatus === 'รอจ่าย' || it.itemStatus === 'รอส่งมอบ'
                          ? 'bg-blue-100 text-blue-800'
                          : it.itemStatus === 'รออนุมัติ' || it.itemStatus === 'รอเบิกจ่าย'
                          ? 'bg-amber-100 text-amber-800'
                          : it.itemStatus === 'ฉบับร่าง'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {it.itemStatus}
                    </span>
                  </td>
                  {/* 19. ผู้อนุมัติ / ผู้จ่าย */}
                  <td className="px-2.5 py-3.5 text-slate-600 whitespace-nowrap">{it.approverName || '-'}</td>
                  {/* 20. จัดการ */}
                  <td className="py-3.5 pl-2 pr-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedItem(it)}
                      className="zms-action rounded-lg border border-slate-200 bg-white p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      title="ดูรายละเอียดรายการ"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800">
                รายละเอียดรายการเบิกจ่าย #{selectedItem.documentNo}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="zms-action rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">เลขที่รอบเบิก (Batch No):</span>
                <span className="font-mono font-bold text-teal-700">{selectedItem.batchNo || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">เจ้าหน้าที่ผู้รับผิดชอบ:</span>
                <span className="font-bold text-slate-800">{selectedItem.staffName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">บัญชีต้นทาง:</span>
                <span className="font-medium text-slate-800">{selectedItem.sourceAccountName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">บัญชีปลายทาง:</span>
                <span className="font-medium text-slate-800">{selectedItem.targetAccountName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">วัตถุประสงค์:</span>
                <span className="font-semibold text-slate-800">{selectedItem.purpose}</span>
              </div>
              {selectedItem.beneficiaryName && selectedItem.beneficiaryName !== '-' && (
                <div className="flex justify-between border-b border-slate-50 py-1.5">
                  <span className="text-slate-500">ผู้รับประโยชน์:</span>
                  <span className="font-semibold text-slate-800">{selectedItem.beneficiaryName}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">ยอดขอเบิก:</span>
                <span className="font-semibold text-slate-800">฿{fmt(selectedItem.requestedAmount || selectedItem.withdrawnAmount || 0)} บาท</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">ยอดอนุมัติ:</span>
                <span className="font-bold text-slate-900">฿{fmt(selectedItem.approvedAmount)} บาท</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">ยอดโอนส่งมอบให้เจ้าหน้าที่:</span>
                <span className="font-bold text-teal-700">฿{fmt(selectedItem.transferredAmount)} บาท</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">จำนวนเงินจ่ายจริง:</span>
                <span className="font-bold text-indigo-700">฿{fmt(selectedItem.actualPaidAmount)} บาท</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">ยอดคงเหลือ:</span>
                <span className="font-bold text-amber-700">฿{fmt(selectedItem.remainingAmount)} บาท</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">ยอดเงินสดคงเหลือส่งคืน:</span>
                <span className="font-bold text-emerald-700">฿{fmt(selectedItem.refundAmount)} บาท</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">ผู้อนุมัติ/ผู้ตรวจสอบ:</span>
                <span className="font-medium text-slate-800">{selectedItem.approverName || '-'}</span>
              </div>
              {selectedItem.proofUrl && (
                <div className="pt-2">
                  <div className="font-medium text-slate-500">หลักฐานที่แนบ:</div>
                  <a
                    href={selectedItem.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-teal-700 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> เปิดดูรูปหลักฐาน/สลิป
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              {onOpenSettlement && selectedItem.workflowId ? (
                <button
                  type="button"
                  onClick={() => {
                    const wid = selectedItem.workflowId || selectedItem.id;
                    setSelectedItem(null);
                    onOpenSettlement(wid);
                  }}
                  className="rounded-xl border border-teal-600 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 transition hover:bg-teal-100"
                >
                  เปิดหน้าต่างตัดยอด / คืนเงิน
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
