'use client';

import React, { useState } from 'react';
import { FinancialTransaction, FundAccount, BankAccount } from '@/types';
import { ModalPortal } from '@/components/common/Modal';
import { DigitalReceiptModal } from './DigitalReceiptModal';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Receipt,
  Eye,
  FileCheck,
  Building2,
  QrCode,
  Banknote,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  X,
  Calendar
} from 'lucide-react';

interface DonationTransactionHistoryTabProps {
  currentUser: any;
  transactions: FinancialTransaction[];
  funds: FundAccount[];
  bankAccounts?: BankAccount[];
  onActionSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function DonationTransactionHistoryTab({
  currentUser,
  transactions,
  funds,
  bankAccounts = [],
  onActionSuccess,
  showToast,
}: DonationTransactionHistoryTabProps) {
  // Filters
  const [filterType, setFilterType] = useState<'all' | 'income' | 'disbursement' | 'pending'>('all');
  const [filterMoneyType, setFilterMoneyType] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extended Filters (Phase 2 Requirement)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterFundId, setFilterFundId] = useState<string>('all');
  const [filterBankAccountId, setFilterBankAccountId] = useState<string>('all');
  const [filterRecorder, setFilterRecorder] = useState<string>('all');
  const [searchRefNo, setSearchRefNo] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Distinct recorders from transactions
  const distinctRecorders = Array.from(
    new Set(transactions.map((t) => t.recordedBy).filter(Boolean))
  );

  // Modals
  const [selectedTxnForReceipt, setSelectedTxnForReceipt] = useState<FinancialTransaction | null>(null);
  const [verifyingTxn, setVerifyingTxn] = useState<FinancialTransaction | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Apply filters
  const filteredTransactions = transactions.filter((t) => {
    // Quick filter tabs
    if (filterType === 'income' && t.type !== 'income') return false;
    if (filterType === 'disbursement' && t.type !== 'disbursement' && t.type !== 'expense') return false;
    if (filterType === 'pending' && t.status !== 'pending') return false;

    // Date Range Filter
    if (startDate) {
      const d = String(t.date || '');
      const c = String((t as any).created_at || '');
      if (d < startDate && c < startDate && !d.includes(startDate) && !c.startsWith(startDate)) return false;
    }
    if (endDate) {
      const d = String(t.date || '');
      const c = String((t as any).created_at || '');
      const endLimit = `${endDate} 23:59:59`;
      if (d > endLimit && c > endLimit) return false;
    }

    // Money Type Filter
    if (filterMoneyType !== 'all' && t.moneyType !== filterMoneyType) return false;

    // Target Fund Filter
    if (filterFundId !== 'all' && t.fundId !== filterFundId) return false;

    // Bank Account Filter
    if (filterBankAccountId !== 'all' && t.bankAccountId !== filterBankAccountId) return false;

    // Payment Method Filter
    if (filterPaymentMethod !== 'all' && t.paymentMethod !== filterPaymentMethod) return false;

    // Status Filter
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;

    // Recorder Filter
    if (filterRecorder !== 'all' && t.recordedBy !== filterRecorder) return false;

    // Reference No Filter
    if (searchRefNo.trim()) {
      const refQ = searchRefNo.trim().toLowerCase();
      const matchRef = t.referenceNo?.toLowerCase().includes(refQ);
      const matchTx = t.transactionNo?.toLowerCase().includes(refQ);
      if (!matchRef && !matchTx) return false;
    }

    // General Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNo = t.transactionNo?.toLowerCase().includes(q);
      const matchRef = t.referenceNo?.toLowerCase().includes(q);
      const matchParty = t.payerOrPayee?.toLowerCase().includes(q);
      const matchDonor = t.donorName?.toLowerCase().includes(q);
      const matchCat = t.category?.toLowerCase().includes(q);
      if (!matchNo && !matchRef && !matchParty && !matchDonor && !matchCat) return false;
    }

    return true;
  });

  // Verify pending transfer slip
  const handleVerifyTransaction = async (action: 'approve' | 'reject') => {
    if (!verifyingTxn) return;

    if (action === 'reject' && !rejectionReason.trim()) {
      showToast('กรุณาระบุเหตุผลในการปฏิเสธรายการ', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch(`/api/donations/${verifyingTxn.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: rejectionReason.trim(),
          actor: {
            id: currentUser.id || 'u-1',
            name: currentUser.name || 'เจ้าหน้าที่ฝ่ายการเงิน',
            role: currentUser.role || 'finance',
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'เกิดข้อผิดพลาดในการตรวจสอบรายการ', 'error');
        return;
      }

      showToast(
        action === 'approve'
          ? `ยืนยันรับเงินสำเร็จ รายการเลขที่ ${verifyingTxn.transactionNo} เข้ากองทุนเรียบร้อยแล้ว`
          : `ปฏิเสธรายการ ${verifyingTxn.transactionNo} เรียบร้อยแล้ว`,
        action === 'approve' ? 'success' : 'info'
      );

      setVerifyingTxn(null);
      setRejectionReason('');
      onActionSuccess();
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> สำเร็จ (Paid)
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <Clock className="w-3 h-3" /> รอตรวจสอบสลิป
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" /> ปฏิเสธ (Rejected)
          </span>
        );
      case 'reversed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <RotateCcw className="w-3 h-3" /> ยกเลิก/คืนเงิน
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'promptpay_qr':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
            <QrCode className="w-3.5 h-3.5" /> PromptPay QR
          </span>
        );
      case 'bank_transfer':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-800">
            <Building2 className="w-3.5 h-3.5" /> โอนธนาคาร
          </span>
        );
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800">
            <Banknote className="w-3.5 h-3.5" /> เงินสด
          </span>
        );
      default:
        return <span className="text-[11px] text-slate-600">{method}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        {/* Top Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'income' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รับบริจาค ({transactions.filter(t => t.type === 'income').length})
            </button>
            <button
              onClick={() => setFilterType('disbursement')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'disbursement' ? 'bg-white text-rose-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              จ่ายซะกาต ({transactions.filter(t => t.type === 'disbursement' || t.type === 'expense').length})
            </button>
            <button
              onClick={() => setFilterType('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all relative ${
                filterType === 'pending' ? 'bg-white text-amber-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>รอตรวจสอบ</span>
              {transactions.filter(t => t.status === 'pending').length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white">
                  {transactions.filter(t => t.status === 'pending').length}
                </span>
              )}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเลขที่, ผู้บริจาค, อ้างอิง..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Secondary Dropdown & Advanced Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">กรองละเอียด:</span>

          {/* Money Type Filter */}
          <select
            value={filterMoneyType}
            onChange={(e) => setFilterMoneyType(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
          >
            <option value="all">ทุกประเภทเงิน</option>
            <option value="zakat">เงินซะกาต (Zakat)</option>
            <option value="sadaqah">เงินศอดะเกาะฮ์ (Sadaqah)</option>
            <option value="operational_admin">เงินค่าบริหาร</option>
            <option value="specific_purpose">เฉพาะวัตถุประสงค์</option>
          </select>

          {/* Target Fund Filter */}
          <select
            value={filterFundId}
            onChange={(e) => setFilterFundId(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white max-w-[160px] truncate"
          >
            <option value="all">ทุกกองทุน</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {/* Bank Account Filter */}
          <select
            value={filterBankAccountId}
            onChange={(e) => setFilterBankAccountId(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white max-w-[160px] truncate"
          >
            <option value="all">ทุกบัญชีธนาคาร</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bankName} - {b.accountNumber}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="completed">สำเร็จ (Completed)</option>
            <option value="pending">รอตรวจสอบ (Pending)</option>
            <option value="rejected">ปฏิเสธ (Rejected)</option>
            <option value="reversed">ยกเลิก (Reversed)</option>
          </select>

          {/* Recorder Filter */}
          {distinctRecorders.length > 0 && (
            <select
              value={filterRecorder}
              onChange={(e) => setFilterRecorder(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white max-w-[140px] truncate"
            >
              <option value="all">ผู้บันทึกทั้งหมด</option>
              {distinctRecorders.map((rec) => (
                <option key={rec} value={rec}>
                  {rec}
                </option>
              ))}
            </select>
          )}

          {/* Reference Search Input */}
          <input
            type="text"
            value={searchRefNo}
            onChange={(e) => setSearchRefNo(e.target.value)}
            placeholder="เลขอ้างอิง / Ref..."
            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white w-32 font-mono"
          />

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>วันที่:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-0.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
            />
            <span>ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-0.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
            />
          </div>

          {/* Clear Filters Button */}
          {(startDate || endDate || filterFundId !== 'all' || filterBankAccountId !== 'all' || filterMoneyType !== 'all' || filterStatus !== 'all' || filterRecorder !== 'all' || searchRefNo) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setFilterFundId('all');
                setFilterBankAccountId('all');
                setFilterMoneyType('all');
                setFilterStatus('all');
                setFilterRecorder('all');
                setSearchRefNo('');
                setSearchTerm('');
              }}
              className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">ไม่พบรายการธุรกรรมตามเงื่อนไข</p>
            <p className="text-xs text-slate-400 mt-0.5">ลองปรับตัวกรองหรือค้นหาด้วยคำอื่น</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">เลขที่ธุรกรรม</th>
                  <th className="py-3 px-4">วันและเวลา</th>
                  <th className="py-3 px-4">ประเภท</th>
                  <th className="py-3 px-4">ผู้บริจาค / ผู้รับ</th>
                  <th className="py-3 px-4">กองทุน / วัตถุประสงค์</th>
                  <th className="py-3 px-4 text-right">จำนวนเงิน</th>
                  <th className="py-3 px-4">ช่องทาง</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-center">เอกสาร / จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((t) => {
                  const isIncome = t.type === 'income';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {t.transactionNo}
                        {t.referenceNo && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            Ref: {t.referenceNo}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {t.date}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isIncome ? 'รับบริจาค' : 'จ่ายซะกาต'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">
                          {t.isAnonymous ? 'ผู้ไม่ประสงค์ออกนาม' : t.payerOrPayee}
                        </p>
                        {t.donorTaxId && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Tax ID: {t.donorTaxId}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-[180px] truncate">
                        <p className="truncate font-medium">{t.fundName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{t.category}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-sm">
                        <span className={isIncome ? 'text-emerald-700' : 'text-rose-700'}>
                          {isIncome ? '+' : '-'}฿{Number(t.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getMethodBadge(t.paymentMethod)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* If pending: Verify button */}
                          {t.status === 'pending' && (
                            <button
                              onClick={() => setVerifyingTxn(t)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-2xs transition-colors flex items-center gap-1"
                              title="ตรวจสอบสลิปการโอนเงิน"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>ตรวจสลิป</span>
                            </button>
                          )}

                          {/* Print/View Receipt */}
                          <button
                            onClick={() => setSelectedTxnForReceipt(t)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                            title="พิมพ์ใบสำคัญ / ใบเสร็จรับเงิน"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-800" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slip Verification Modal */}
      {verifyingTxn && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm">ตรวจสอบความถูกต้องของสลิปโอนเงิน</h3>
                </div>
                <button
                  onClick={() => setVerifyingTxn(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* Transaction Summary Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-slate-700">{verifyingTxn.transactionNo}</span>
                    <span className="text-slate-500">{verifyingTxn.date}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-900">{verifyingTxn.payerOrPayee}</span>
                    <span className="font-mono text-emerald-800 text-base">
                      ฿{Number(verifyingTxn.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-slate-600 font-mono text-[11px]">เลขอ้างอิง: {verifyingTxn.referenceNo}</p>
                  <p className="text-slate-500 text-[11px]">เข้ากองทุน: {verifyingTxn.fundName}</p>
                </div>

                {/* Slip Preview Box */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">ภาพหลักฐานสลิปการโอนเงิน:</label>
                  <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-center">
                    {verifyingTxn.slipUrl ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-white rounded-lg border border-slate-300 font-mono text-slate-600 text-[11px] truncate">
                          หลักฐาน: {verifyingTxn.slipUrl}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          ตรวจสอบวันเวลา ยอดเงิน และชื่อบัญชีปลายทางให้ตรงกับ Statement ธนาคาร
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-400">ไม่มีไฟล์ภาพแนบมา (ตรวจสอบตามเลขอ้างอิง Statement)</p>
                    )}
                  </div>
                </div>

                {/* Rejection Reason (If rejecting) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เหตุผลในการปฏิเสธ (กรณีปฏิเสธรายการ):
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="เช่น ยอดเงินไม่เข้าบัญชี, สลิปซ้ำ, สลิปไม่ชัดเจน"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-rose-600 focus:outline-hidden"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() => handleVerifyTransaction('reject')}
                    className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold transition-colors disabled:opacity-50"
                  >
                    ปฏิเสธรายการ (Reject)
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVerifyingTxn(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                    >
                      ปิด
                    </button>
                    <button
                      type="button"
                      disabled={isVerifying}
                      onClick={() => handleVerifyTransaction('approve')}
                      className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>กำลังยืนยัน...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>อนุมัติรับเงิน (Credit GL)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Digital Receipt Modal */}
      {selectedTxnForReceipt && (
        <DigitalReceiptModal
          transaction={selectedTxnForReceipt}
          onClose={() => setSelectedTxnForReceipt(null)}
        />
      )}
    </div>
  );
}

