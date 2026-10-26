'use client';

import React, { useState, useEffect } from 'react';
import { BankAccount } from '@/types';
import { maskAccountNumber } from '@/lib/financeUtils';
import { ModalPortal } from '@/components/common/Modal';
import { 
  ArrowLeftRight, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  ShieldCheck, 
  Plus, 
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface BankTransfersTabProps {
  currentUser: any;
  bankAccounts: BankAccount[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshBankAccounts?: () => void;
}

interface BankTransaction {
  id: string;
  transactionNo: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  paymentMethod: string;
  payerOrPayee: string;
  referenceNo: string;
  slipUrl?: string;
  receiptUrl?: string;
  status: string;
  bankAccountId: string;
  bankAccountName?: string;
  bankName?: string;
  recordedByName: string;
  notes?: string;
  createdAt: string;
}

export function BankTransfersTab({
  currentUser,
  bankAccounts,
  showToast,
  onRefreshBankAccounts,
}: BankTransfersTabProps) {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'transfer' | 'deposit' | 'withdrawal'>('all');
  const [filterBankId, setFilterBankId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [modalMode, setModalMode] = useState<'transfer' | 'deposit' | 'withdraw' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states - Transfer
  const [sourceBankId, setSourceBankId] = useState(bankAccounts[0]?.id || '');
  const [targetBankId, setTargetBankId] = useState(bankAccounts[1]?.id || bankAccounts[0]?.id || '');
  const [transferAmount, setTransferAmount] = useState<number>(10000);
  const [transferRef, setTransferRef] = useState(`TRF-${Date.now().toString().slice(-6)}`);
  const [transferSlipUrl, setTransferSlipUrl] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Form states - Deposit
  const [depositBankId, setDepositBankId] = useState(bankAccounts[0]?.id || '');
  const [depositAmount, setDepositAmount] = useState<number>(5000);
  const [depositRef, setDepositRef] = useState(`DEP-${Date.now().toString().slice(-6)}`);
  const [depositSlipUrl, setDepositSlipUrl] = useState('');
  const [depositNotes, setDepositNotes] = useState('');

  // Form states - Withdraw
  const [withdrawBankId, setWithdrawBankId] = useState(bankAccounts[0]?.id || '');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(5000);
  const [withdrawPurpose, setWithdrawPurpose] = useState('ถอนเงินสดสำรองจ่ายสำหรับสำนักงาน');
  const [withdrawRef, setWithdrawRef] = useState(`WTH-${Date.now().toString().slice(-6)}`);
  const [withdrawNotes, setWithdrawNotes] = useState('');

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/finance/transfers');
      const json = await res.json();
      if (json.success && json.data) {
        setTransactions(json.data);
      }
    } catch (err: any) {
      showToast('ไม่สามารถดึงข้อมูลรายการธนาคารได้: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Set default accounts when list loads
  useEffect(() => {
    if (bankAccounts.length >= 2) {
      if (!sourceBankId) setSourceBankId(bankAccounts[0].id);
      if (!targetBankId || targetBankId === bankAccounts[0].id) setTargetBankId(bankAccounts[1].id);
      if (!depositBankId) setDepositBankId(bankAccounts[0].id);
      if (!withdrawBankId) setWithdrawBankId(bankAccounts[0].id);
    } else if (bankAccounts.length === 1) {
      if (!sourceBankId) setSourceBankId(bankAccounts[0].id);
      if (!depositBankId) setDepositBankId(bankAccounts[0].id);
      if (!withdrawBankId) setWithdrawBankId(bankAccounts[0].id);
    }
  }, [bankAccounts]);

  const selectedSourceBank = bankAccounts.find((b) => b.id === sourceBankId);
  const selectedTargetBank = bankAccounts.find((b) => b.id === targetBankId);
  const selectedWithdrawBank = bankAccounts.find((b) => b.id === withdrawBankId);

  // Submit Handler
  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceBankId || !targetBankId) {
      showToast('กรุณาระบุบัญชีต้นทางและปลายทาง', 'error');
      return;
    }
    if (sourceBankId === targetBankId) {
      showToast('บัญชีต้นทางและปลายทางต้องไม่ซ้ำกัน', 'error');
      return;
    }
    if (transferAmount <= 0) {
      showToast('จำนวนเงินต้องมากกว่า 0 บาท', 'error');
      return;
    }
    if (selectedSourceBank && transferAmount > selectedSourceBank.currentBalance) {
      showToast('ยอดเงินในบัญชีต้นทางไม่เพียงพอ', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer',
          input: {
            sourceBankAccountId: sourceBankId,
            targetBankAccountId: targetBankId,
            amount: transferAmount,
            referenceNo: transferRef.trim(),
            slipUrl: transferSlipUrl.trim(),
            notes: transferNotes.trim(),
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'โอนเงินระหว่างบัญชีไม่สำเร็จ');

      showToast(`โอนเงินสำเร็จ วงเงิน ฿${transferAmount.toLocaleString('th-TH')} บาท`, 'success');
      setModalMode(null);
      setTransferAmount(10000);
      setTransferRef(`TRF-${Date.now().toString().slice(-6)}`);
      setTransferSlipUrl('');
      setTransferNotes('');
      fetchTransactions();
      if (onRefreshBankAccounts) onRefreshBankAccounts();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositBankId) {
      showToast('กรุณาเลือกบัญชีธนาคารปลายทาง', 'error');
      return;
    }
    if (depositAmount <= 0) {
      showToast('จำนวนเงินต้องมากกว่า 0 บาท', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deposit',
          input: {
            bankAccountId: depositBankId,
            amount: depositAmount,
            referenceNo: depositRef.trim(),
            slipUrl: depositSlipUrl.trim(),
            notes: depositNotes.trim(),
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'นำฝากเงินสดไม่สำเร็จ');

      showToast(`นำฝากเงินสดสำเร็จ ฿${depositAmount.toLocaleString('th-TH')} บาท`, 'success');
      setModalMode(null);
      setDepositAmount(5000);
      setDepositRef(`DEP-${Date.now().toString().slice(-6)}`);
      setDepositSlipUrl('');
      setDepositNotes('');
      fetchTransactions();
      if (onRefreshBankAccounts) onRefreshBankAccounts();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawBankId) {
      showToast('กรุณาเลือกบัญชีธนาคารที่ต้องการถอน', 'error');
      return;
    }
    if (withdrawAmount <= 0) {
      showToast('จำนวนเงินต้องมากกว่า 0 บาท', 'error');
      return;
    }
    if (selectedWithdrawBank && withdrawAmount > selectedWithdrawBank.currentBalance) {
      showToast('ยอดเงินคงเหลือในบัญชีไม่เพียงพอสำหรับการถอน', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdraw',
          input: {
            bankAccountId: withdrawBankId,
            amount: withdrawAmount,
            purpose: withdrawPurpose.trim(),
            referenceNo: withdrawRef.trim(),
            notes: withdrawNotes.trim(),
          },
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'ถอนเงินสดไม่สำเร็จ');

      showToast(`ถอนเงินสดสำเร็จ ฿${withdrawAmount.toLocaleString('th-TH')} บาท`, 'success');
      setModalMode(null);
      setWithdrawAmount(5000);
      setWithdrawRef(`WTH-${Date.now().toString().slice(-6)}`);
      setWithdrawNotes('');
      fetchTransactions();
      if (onRefreshBankAccounts) onRefreshBankAccounts();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    if (filterBankId !== 'all' && t.bankAccountId !== filterBankId) return false;
    if (filterType === 'transfer' && !t.type.includes('transfer')) return false;
    if (filterType === 'deposit' && t.type !== 'bank_deposit') return false;
    if (filterType === 'withdrawal' && t.type !== 'bank_withdrawal') return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNo = t.transactionNo.toLowerCase().includes(q);
      const matchRef = t.referenceNo.toLowerCase().includes(q);
      const matchBank = (t.bankAccountName || '').toLowerCase().includes(q);
      const matchPayer = (t.payerOrPayee || '').toLowerCase().includes(q);
      if (!matchNo && !matchRef && !matchBank && !matchPayer) return false;
    }
    return true;
  });

  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + (b.currentBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>ยอดคงเหลือรวมในธนาคาร</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight text-right">
            ฿{totalBankBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-right">
            จากทั้งหมด {bankAccounts.length} บัญชีธนาคาร
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>การโอนระหว่างบัญชี</span>
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 tracking-tight text-right">
            {transactions.filter((t) => t.type.includes('transfer')).length}
            <span className="text-xs font-normal text-slate-500 ml-1">รายการ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-right">บันทึกแบบ Dual-ledger สมบูรณ์</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>นำเงินสดเข้าธนาคาร</span>
            <ArrowDownToLine className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-700 tracking-tight text-right">
            {transactions.filter((t) => t.type === 'bank_deposit').length}
            <span className="text-xs font-normal text-slate-500 ml-1">รายการ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-right">เงินสดนำส่งโดยเหรัญญิก</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>ถอนเงินสดเพื่อสำรอง</span>
            <ArrowUpFromLine className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 tracking-tight text-right">
            {transactions.filter((t) => t.type === 'bank_withdrawal').length}
            <span className="text-xs font-normal text-slate-500 ml-1">รายการ</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 text-right">เงินสดสำรองจ่ายสำนักงาน/ภาคสนาม</p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-700" />
            ระบบฝาก–ถอน–โอนเงินระหว่างบัญชี
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดการการโอนระหว่างบัญชีธนาคาร การนำส่งเงินสดเข้าบัญชี และการถอนเงินสดมาเป็นเงินสำรอง
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setModalMode('transfer')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            โอนระหว่างบัญชี
          </button>
          <button
            onClick={() => setModalMode('deposit')}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowDownToLine className="w-4 h-4" />
            นำเงินสดเข้าบัญชี
          </button>
          <button
            onClick={() => setModalMode('withdraw')}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            ถอนเงินสดสำรอง
          </button>
          <button
            onClick={fetchTransactions}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilterType('transfer')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'transfer' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              โอนระหว่างบัญชี
            </button>
            <button
              onClick={() => setFilterType('deposit')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'deposit' ? 'bg-white text-teal-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              นำเงินสดเข้า
            </button>
            <button
              onClick={() => setFilterType('withdrawal')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'withdrawal' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              ถอนเงินสด
            </button>
          </div>

          <select
            value={filterBankId}
            onChange={(e) => setFilterBankId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">ทุกบัญชีธนาคาร</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.accountName} ({maskAccountNumber(b.accountNumber)})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาเลขอ้างอิง, บัญชี..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">รายการประวัติธุรกรรมธนาคาร</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {filteredTransactions.length} รายการ
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
            <p className="text-xs">กำลังโหลดข้อมูลธุรกรรมธนาคาร...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">ไม่พบรายการธุรกรรมตามเงื่อนไขที่เลือก</p>
            <p className="text-xs text-slate-400 mt-1">สามารถกดปุ่มด้านบนเพื่อทำรายการโอน ฝาก หรือถอนเงิน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold">
                  <th className="py-3 px-4">วันที่ / เวลา</th>
                  <th className="py-3 px-4">เลขที่ธุรกรรม / อ้างอิง</th>
                  <th className="py-3 px-4">ประเภทธุรกรรม</th>
                  <th className="py-3 px-4">บัญชีธนาคาร</th>
                  <th className="py-3 px-4">รายละเอียด / ผู้เกี่ยวข้อง</th>
                  <th className="py-3 px-4 text-right">จำนวนเงิน (บาท)</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((t) => {
                  const isPositive = t.amount > 0;
                  const isTransfer = t.type.includes('transfer');
                  const isDeposit = t.type === 'bank_deposit';
                  const isWithdrawal = t.type === 'bank_withdrawal';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{t.date}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{t.transactionNo}</div>
                        <div className="text-[11px] text-slate-500 font-mono">Ref: {t.referenceNo}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isTransfer ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            t.type === 'bank_transfer_in' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            <ArrowLeftRight className="w-3 h-3" />
                            {t.type === 'bank_transfer_in' ? 'รับโอนระหว่างบัญชี' : 'โอนออกระหว่างบัญชี'}
                          </span>
                        ) : isDeposit ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700">
                            <ArrowDownToLine className="w-3 h-3" />
                            นำเงินสดเข้าบัญชี
                          </span>
                        ) : isWithdrawal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
                            <ArrowUpFromLine className="w-3 h-3" />
                            ถอนเงินสดสำรอง
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {t.type}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{t.bankAccountName || 'บัญชีธนาคาร'}</div>
                        <div className="text-[11px] text-slate-500">{t.bankName}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="font-medium text-slate-800">{t.category}</div>
                        <div className="text-[11px] text-slate-500">โดย: {t.recordedByName}</div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-black text-sm">
                        <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {isPositive ? '+' : ''}
                          {t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          สมบูรณ์
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Inter-Account Transfer */}
      {modalMode === 'transfer' && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-[#0b2545]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">โอนเงินระหว่างบัญชีธนาคาร</h3>
                    <p className="text-xs text-slate-500">บันทึกรายการตัดบัญชีต้นทางและเพิ่มบัญชีปลายทางอัตโนมัติ</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalMode(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitTransfer} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    บัญชีธนาคารต้นทาง (หักเงินออก) *
                  </label>
                  <select
                    value={sourceBankId}
                    onChange={(e) => setSourceBankId(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.accountName} — ยอดคงเหลือ ฿{b.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                  {selectedSourceBank && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      เลขที่บัญชี: {maskAccountNumber(selectedSourceBank.accountNumber)} | ยอดคงเหลือพร้อมโอน: ฿{selectedSourceBank.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    บัญชีธนาคารปลายทาง (รับเงินเข้า) *
                  </label>
                  <select
                    value={targetBankId}
                    onChange={(e) => setTargetBankId(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {bankAccounts
                      .filter((b) => b.id !== sourceBankId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.accountName} — ยอดคงเหลือ ฿{b.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนเงินที่ต้องการโอน (บาท) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(Number(e.target.value))}
                    className="w-full text-sm font-bold text-right bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  {selectedSourceBank && transferAmount > selectedSourceBank.currentBalance && (
                    <p className="text-xs text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      ยอดเงินเกินกว่ายอดคงเหลือในบัญชีต้นทาง!
                    </p>
                  )}
                  {transferAmount > 10000 && (
                    <p className="text-[11px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>ยอดโอนเกิน 10,000 บาท โปรดตรวจสอบเลขบัญชีและแนบหลักฐานสลิป</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เลขอ้างอิงสลิป / รหัสธุรกรรม *
                    </label>
                    <input
                      type="text"
                      required
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      แนบลิงก์สลิปโอนเงิน (URL)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น /slips/trf-01.jpg"
                      value={transferSlipUrl}
                      onChange={(e) => setTransferSlipUrl(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ</label>
                  <textarea
                    rows={2}
                    placeholder="ระบุวัตถุประสงค์ในการโอนระหว่างบัญชี..."
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (selectedSourceBank ? transferAmount > selectedSourceBank.currentBalance : false)}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันโอนเงินระหว่างบัญชี'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 2: Deposit Cash into Bank */}
      {modalMode === 'deposit' && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-[#0b2545]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
                    <ArrowDownToLine className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">นำเงินสดเข้าบัญชีธนาคาร</h3>
                    <p className="text-xs text-slate-500">บันทึกการนำส่งเงินสดเข้าบัญชีโดยเหรัญญิก</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalMode(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitDeposit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    บัญชีธนาคารปลายทาง (รับเงินเข้า) *
                  </label>
                  <select
                    value={depositBankId}
                    onChange={(e) => setDepositBankId(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.accountName} — ยอดคงเหลือ ฿{b.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนเงินสดที่นำฝาก (บาท) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full text-sm font-bold text-right bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                  {depositAmount > 10000 && (
                    <p className="text-[11px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>ยอดนำฝากเกิน 10,000 บาท โปรดแนบหลักฐานใบนำฝากธนาคาร</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เลขอ้างอิงใบนำฝาก / สลิป *
                    </label>
                    <input
                      type="text"
                      required
                      value={depositRef}
                      onChange={(e) => setDepositRef(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      แนบลิงก์หลักฐานใบนำฝาก
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น /slips/dep-01.jpg"
                      value={depositSlipUrl}
                      onChange={(e) => setDepositSlipUrl(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ</label>
                  <textarea
                    rows={2}
                    placeholder="เช่น นำส่งเงินสดจากตู้บริจาค หรือเงินสดคงเหลือ..."
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันนำฝากเงินสด'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL 3: Withdraw Cash from Bank */}
      {modalMode === 'withdraw' && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-[#0b2545]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                    <ArrowUpFromLine className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">ถอนเงินสดจากธนาคาร</h3>
                    <p className="text-xs text-slate-500">ถอนเงินสดเพื่อถือเป็นเงินสำรองจ่ายหรือเตรียมจ่ายช่วยเหลือ</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalMode(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitWithdraw} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    บัญชีธนาคารที่ต้องการถอน *
                  </label>
                  <select
                    value={withdrawBankId}
                    onChange={(e) => setWithdrawBankId(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.accountName} — ยอดคงเหลือ ฿{b.currentBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนเงินสดที่ถอน (บาท) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full text-sm font-bold text-right bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  {selectedWithdrawBank && withdrawAmount > selectedWithdrawBank.currentBalance && (
                    <p className="text-xs text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      ยอดเงินเกินกว่ายอดคงเหลือในบัญชีธนาคาร!
                    </p>
                  )}
                  {withdrawAmount > 10000 && (
                    <p className="text-[11px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>ยอดถอนเกิน 10,000 บาท ต้องมีใบขออนุมัติถอนเงินสดกำกับ</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วัตถุประสงค์ในการถอน *
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawPurpose}
                    onChange={(e) => setWithdrawPurpose(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลขอ้างอิงใบถอนเงิน / เช็ค *
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawRef}
                    onChange={(e) => setWithdrawRef(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ</label>
                  <textarea
                    rows={2}
                    placeholder="ระบุรายละเอียดเพิ่มเติม..."
                    value={withdrawNotes}
                    onChange={(e) => setWithdrawNotes(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (selectedWithdrawBank ? withdrawAmount > selectedWithdrawBank.currentBalance : false)}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันถอนเงินสด'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
