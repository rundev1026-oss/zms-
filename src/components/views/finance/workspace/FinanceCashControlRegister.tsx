'use client';

import React, { useState, useEffect } from 'react';
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
  staffName: string;
  staffId: string;
  purposeType: 'ช่วยเหลือ' | 'บริหาร';
  purpose: string;
  withdrawnAmount: number;
  approvedAmount?: number;
  transferredAmount?: number;
  remainingAmount?: number;
  batchStatus?: string;
  paymentStatus?: string;
  applicationNo: string;
  beneficiaryName: string;
  expenseCategory: string;
  actualPaidDate: string;
  actualPaidAmount: number;
  refundAmount: number;
  refundDate: string;
  proofStatus: 'ครบถ้วน' | 'รอตรวจสอบ' | 'ยังไม่แนบ';
  proofUrl: string;
  itemStatus: 'รอจ่าย' | 'รอเบิกจ่าย' | 'เบิกเงินสำเร็จ' | 'จ่ายบางส่วน' | 'จ่ายแล้ว' | 'เคลียร์แล้ว' | 'เกินกำหนด' | 'ยกเลิก';
  approverName: string;
  voucherType: string;
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
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'aid', label: 'รายการช่วยเหลือ' },
    { id: 'admin', label: 'รายจ่ายบริหาร' },
    { id: 'pending_disbursement', label: 'รอการจ่าย' },
    { id: 'pending_review', label: 'รอตรวจสอบหลักฐาน' },
    { id: 'completed', label: 'เสร็จสิ้น' },
    { id: 'pending_refund', label: 'รอคืนเงิน' },
  ];

  function exportCsv() {
    const headers = [
      'ลำดับ',
      'วันที่เบิกเงิน',
      'เลขที่เอกสาร',
      'ชื่อเจ้าหน้าที่',
      'ประเภท',
      'วัตถุประสงค์',
      'จำนวนเงินที่เบิก',
      'เลขที่คำร้อง',
      'ผู้รับประโยชน์',
      'หมวดหมู่รายจ่าย',
      'วันที่จ่ายจริง',
      'จำนวนเงินจ่ายจริง',
      'ยอดเงินคืน',
      'วันที่คืนเงิน',
      'สถานะหลักฐาน',
      'สถานะรายการ',
      'ผู้ตรวจสอบ',
    ];

    const rows = items.map((it) => [
      it.index,
      it.date,
      it.documentNo,
      `"${it.staffName}"`,
      it.purposeType,
      `"${it.purpose}"`,
      it.withdrawnAmount,
      it.applicationNo,
      `"${it.beneficiaryName}"`,
      `"${it.expenseCategory}"`,
      it.actualPaidDate,
      it.actualPaidAmount,
      it.refundAmount,
      it.refundDate,
      it.proofStatus,
      it.itemStatus,
      `"${it.approverName}"`,
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
            บัญชีคุมยอดเงินสดทดรองจ่าย 16 คอลัมน์ เชื่อมโยงเงินสดยืม ค่าใช้จ่าย และการส่งคืน
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

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-3">
        {/* 7 Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
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
            placeholder="ค้นหาตามชื่อ, เลขที่, ผู้รับ, หมวดหมู่..."
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

      {/* 16-Column Central Table */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full min-w-[1440px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700">
              <th className="py-3.5 pl-4 pr-2 whitespace-nowrap">#</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">วันที่เบิก</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">เลขที่เอกสาร</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">เจ้าหน้าที่ผู้เบิก</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">ประเภท/วัตถุประสงค์</th>
              <th className="px-2.5 py-3.5 text-right whitespace-nowrap">ยอดที่ขอเบิก</th>
              <th className="px-2.5 py-3.5 text-right whitespace-nowrap">ยอดอนุมัติ</th>
              <th className="px-2.5 py-3.5 text-right whitespace-nowrap">โอนให้เจ้าหน้าที่</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">คำร้อง/ผู้รับ</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">หมวดหมู่รายจ่าย</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">วันที่จ่ายจริง</th>
              <th className="px-2.5 py-3.5 text-right whitespace-nowrap">จ่ายจริง (บาท)</th>
              <th className="px-2.5 py-3.5 text-right whitespace-nowrap">เงินคงเหลือคืน</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">วันที่คืน</th>
              <th className="px-2.5 py-3.5 text-center whitespace-nowrap">หลักฐาน</th>
              <th className="px-2.5 py-3.5 text-center whitespace-nowrap">สถานะ</th>
              <th className="px-2.5 py-3.5 whitespace-nowrap">ผู้ตรวจสอบ</th>
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
                  <td className="py-3.5 pl-4 pr-2 font-medium text-slate-400 whitespace-nowrap">{it.index}</td>
                  <td className="px-2.5 py-3.5 text-slate-600 whitespace-nowrap">{it.date}</td>
                  <td className="px-2.5 py-3.5 font-semibold text-slate-900 whitespace-nowrap">{it.documentNo}</td>
                  <td className="px-2.5 py-3.5 font-medium text-slate-800 whitespace-nowrap">{it.staffName}</td>
                  <td className="px-2.5 py-3.5 min-w-[180px]">
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        it.purposeType === 'ช่วยเหลือ'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {it.purposeType}
                    </span>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500 max-w-[200px] xl:max-w-[280px]" title={it.purpose}>
                      {it.purpose}
                    </div>
                  </td>
                  <td className="px-2.5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">
                    ฿{fmt(it.withdrawnAmount)}
                  </td>
                  <td className="px-2.5 py-3.5 text-right whitespace-nowrap tabular-nums">฿{fmt(it.approvedAmount || it.withdrawnAmount)}</td>
                  <td className="px-2.5 py-3.5 text-right whitespace-nowrap tabular-nums">฿{fmt(it.transferredAmount || 0)}</td>
                  <td className="px-2.5 py-3.5 min-w-[160px]">
                    {it.applicationNo !== '-' ? (
                      <div>
                        <div className="font-semibold text-teal-700 whitespace-nowrap">{it.applicationNo}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]" title={it.beneficiaryName}>
                          {it.beneficiaryName}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-2.5 py-3.5 text-slate-600 whitespace-nowrap">{it.expenseCategory}</td>
                  <td className="px-2.5 py-3.5 text-slate-600 whitespace-nowrap">{it.actualPaidDate}</td>
                  <td className="px-2.5 py-3.5 text-right font-bold text-indigo-700 whitespace-nowrap tabular-nums">
                    {it.actualPaidAmount > 0 ? `฿${fmt(it.actualPaidAmount)}` : '-'}
                  </td>
                  <td className="px-2.5 py-3.5 text-right font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                    {it.refundAmount > 0 ? `฿${fmt(it.refundAmount)}` : '-'}
                  </td>
                  <td className="px-2.5 py-3.5 text-right whitespace-nowrap tabular-nums">฿{fmt(it.remainingAmount || 0)}</td>
                  <td className="px-2.5 py-3.5 whitespace-nowrap">{it.batchStatus || '-'}</td>
                  <td className="px-2.5 py-3.5 text-slate-600 whitespace-nowrap">{it.refundDate}</td>
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
                  <td className="px-2.5 py-3.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        it.itemStatus === 'เคลียร์แล้ว' || it.itemStatus === 'จ่ายแล้ว'
                          ? 'bg-emerald-100 text-emerald-800'
                          : it.itemStatus === 'จ่ายบางส่วน' || it.itemStatus === 'เบิกเงินสำเร็จ'
                          ? 'bg-teal-100 text-teal-800'
                          : it.itemStatus === 'รอจ่าย' || it.itemStatus === 'รอเบิกจ่าย'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {it.itemStatus}
                    </span>
                  </td>
                  <td className="px-2.5 py-3.5 text-slate-600 whitespace-nowrap">{it.approverName}</td>
                  <td className="py-3.5 pl-2 pr-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedItem(it)}
                      className="zms-action rounded-lg border border-slate-200 bg-white p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      title="ดูรายละเอียด"
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
                รายละเอียดใบสำคัญเบิกเงินสด #{selectedItem.documentNo}
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
                <span className="text-slate-500">เจ้าหน้าที่ผู้รับผิดชอบ:</span>
                <span className="font-bold text-slate-800">{selectedItem.staffName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">ประเภทรายการ:</span>
                <span className="font-semibold text-slate-800">{selectedItem.purposeType}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">วัตถุประสงค์:</span>
                <span className="font-semibold text-slate-800">{selectedItem.purpose}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">จำนวนเงินที่เบิกรับ:</span>
                <span className="font-bold text-slate-900">฿{fmt(selectedItem.withdrawnAmount)} บาท</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">จำนวนเงินจ่ายจริง:</span>
                <span className="font-bold text-indigo-700">฿{fmt(selectedItem.actualPaidAmount)} บาท</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1.5">
                <span className="text-slate-500">ยอดเงินสดคงเหลือส่งคืน:</span>
                <span className="font-bold text-emerald-700">฿{fmt(selectedItem.refundAmount)} บาท</span>
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
              {onOpenSettlement ? (
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedItem.id;
                    setSelectedItem(null);
                    onOpenSettlement(id);
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
