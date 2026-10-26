'use client';

import React, { useState } from 'react';
import { FinancialTransaction, FundAccount, BankAccount } from '@/types';
import { ModalPortal } from '@/components/common/Modal';
import { 
  ArrowDownLeft, 
  Plus, 
  Search, 
  Filter, 
  ShieldCheck, 
  Receipt, 
  CheckCircle2, 
  Layers, 
  Building2,
  Calendar,
  Lock,
  UserCheck,
  UserX,
  CreditCard,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface IncomeEntryTabProps {
  currentUser: any;
  funds: FundAccount[];
  transactions: FinancialTransaction[];
  bankAccounts: BankAccount[];
  recordIncome: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
}

export function IncomeEntryTab({
  currentUser,
  funds,
  transactions,
  bankAccounts,
  recordIncome,
  showToast,
  onRefresh,
}: IncomeEntryTabProps) {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'zakat' | 'sadaqah' | 'operational_admin'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [moneyType, setMoneyType] = useState<'zakat' | 'sadaqah' | 'operational_admin'>('zakat');
  const [fundId, setFundId] = useState('fund-1');
  const [category, setCategory] = useState('ซะกาตทรัพย์สินทางการเงิน');
  const [amount, setAmount] = useState<number>(50000);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'promptpay_qr' | 'bank_transfer' | 'cash'>('bank_transfer');
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '');
  const [zakatYear, setZakatYear] = useState('2569');
  const [receiptNo, setReceiptNo] = useState(`REC-2569-${Date.now().toString().slice(-5)}`);
  const [referenceNo, setReferenceNo] = useState(`DEP-REF-${Date.now().toString().slice(-6)}`);
  const [usageRestriction, setUsageRestriction] = useState('');
  const [notes, setNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  // Handle Money Type change to adjust default funds and categories
  const handleMoneyTypeChange = (type: 'zakat' | 'sadaqah' | 'operational_admin') => {
    setMoneyType(type);
    if (type === 'zakat') {
      setFundId('fund-1');
      setCategory('ซะกาตทรัพย์สินทางการเงิน');
    } else if (type === 'sadaqah') {
      setFundId('fund-5');
      setCategory('ศอดะเกาะฮ์สาธารณประโยชน์');
    } else {
      setFundId('fund-6');
      setCategory('เงินบริจาคสมทบค่าใช้จ่ายบริหาร');
    }
  };

  const [showConfirmSummaryModal, setShowConfirmSummaryModal] = useState(false);

  const handlePrepareIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAnonymous && !donorName.trim()) {
      showToast('กรุณาระบุชื่อผู้บริจาค หรือเลือก "ไม่ประสงค์ออกนาม"', 'error');
      return;
    }
    if (!referenceNo.trim()) {
      showToast('กรุณาระบุหมายเลขอ้างอิงการชำระเงินเพื่อป้องกันธุรกรรมซ้ำ', 'error');
      return;
    }
    if (amount <= 0) {
      showToast('จำนวนเงินต้องมากกว่า 0 บาท', 'error');
      return;
    }

    setShowConfirmSummaryModal(true);
  };

  const handleFinalIncome = async () => {
    setIsSubmitting(true);
    try {
      const payerDisplayName = isAnonymous ? 'ผู้ไม่ประสงค์ออกนาม' : donorName.trim();
      const success = await recordIncome(
        fundId,
        category,
        amount,
        payerDisplayName,
        paymentMethod,
        referenceNo.trim(),
        notes.trim(),
        {
          bankAccountId: paymentMethod !== 'cash' ? bankAccountId : undefined,
          moneyType,
          zakatYear,
          isAnonymous,
          donorName: payerDisplayName,
          usageRestriction: usageRestriction.trim() || undefined,
          receiptNo: receiptNo.trim(),
        }
      );

      if (success) {
        setShowConfirmSummaryModal(false);
        setShowAddModal(false);
        setDonorName('');
        setIsAnonymous(false);
        setNotes('');
        setUsageRestriction('');
        setReferenceNo(`DEP-REF-${Date.now().toString().slice(-6)}`);
        setReceiptNo(`REC-2569-${Date.now().toString().slice(-5)}`);
        showToast(`บันทึกรับเงิน ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท สำเร็จ`, 'success');
        onRefresh();
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกรายรับ', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered transactions
  const incomeTransactions = transactions.filter((t) => {
    const isInc = t.type === 'income' && t.status !== 'reversed';
    const matchesType = activeCategoryFilter === 'all' || t.moneyType === activeCategoryFilter;
    const matchesSearch =
      t.transactionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.payerOrPayee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fundName.toLowerCase().includes(searchTerm.toLowerCase());

    return isInc && matchesType && matchesSearch;
  });

  const totalFilteredIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
            ระบบบันทึกรายรับ (Income Entry & Classification)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            แยกรายรับหลัก 3 หมวดหมู่: 1. ซะกาต 2. ศอดะเกาะฮ์ทั่วไป 3. สำหรับบริหาร (ห้ามนำเงินต่างวัตถุประสงค์มาปะปนกัน)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {['super_admin', 'finance'].includes(currentUser.role) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              บันทึกรับเงินใหม่
            </button>
          )}
        </div>
      </div>

      {/* 3 Categories Filter Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveCategoryFilter('all')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeCategoryFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">รายรับทั้งหมด</p>
          <h3 className="text-xl font-bold mt-1">
            ฿{transactions.filter((t) => t.type === 'income' && t.status !== 'reversed').reduce((s, t) => s + t.amount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs opacity-75 mt-0.5">รวมทุกหมวดหมู่รายรับ</p>
        </button>

        <button
          onClick={() => setActiveCategoryFilter('zakat')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeCategoryFilter === 'zakat'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200/80 hover:bg-emerald-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">1. ซะกาต (Zakat)</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/20">8 อัสนัฟ</span>
          </div>
          <h3 className="text-xl font-bold mt-1">
            ฿{transactions.filter((t) => t.type === 'income' && (t.moneyType === 'zakat' || (!t.moneyType && t.fundName.includes('ซะกาต'))) && t.status !== 'reversed').reduce((s, t) => s + t.amount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs opacity-75 mt-0.5">จัดสรรเฉพาะ 8 อัสนัฟ</p>
        </button>

        <button
          onClick={() => setActiveCategoryFilter('sadaqah')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeCategoryFilter === 'sadaqah'
              ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200/80 hover:bg-teal-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">2. ศอดะเกาะฮ์ทั่วไป</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/20">สาธารณกุศล</span>
          </div>
          <h3 className="text-xl font-bold mt-1">
            ฿{transactions.filter((t) => t.type === 'income' && (t.moneyType === 'sadaqah' || (!t.moneyType && t.fundName.includes('ศอดะเกาะฮ์'))) && t.status !== 'reversed').reduce((s, t) => s + t.amount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs opacity-75 mt-0.5">เงินบริจาคโครงการ/ทั่วไป</p>
        </button>

        <button
          onClick={() => setActiveCategoryFilter('operational_admin')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeCategoryFilter === 'operational_admin'
              ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200/80 hover:bg-indigo-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">3. สำหรับบริหาร</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/20">ค่าใช้จ่าย สนง.</span>
          </div>
          <h3 className="text-xl font-bold mt-1">
            ฿{transactions.filter((t) => t.type === 'income' && (t.moneyType === 'operational_admin' || (!t.moneyType && t.fundName.includes('ดำเนินงาน'))) && t.status !== 'reversed').reduce((s, t) => s + t.amount, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs opacity-75 mt-0.5">เงินสนับสนุนการบริหาร</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาตามเลขที่, ผู้บริจาค, อ้างอิง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="text-xs text-slate-600 font-medium">
          ยอดรวมรายรับที่กรอง: <span className="font-bold text-slate-900 font-mono text-sm">฿{totalFilteredIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="p-3.5">เลขที่รายการ</th>
                <th className="p-3.5">วันที่</th>
                <th className="p-3.5">หมวดหมู่รายรับ</th>
                <th className="p-3.5">ผู้บริจาค / ชำระ</th>
                <th className="p-3.5">กองทุนปลายทาง</th>
                <th className="p-3.5">บัญชีปลายทาง / ช่องทาง</th>
                <th className="p-3.5">หมายเลขอ้างอิง</th>
                <th className="p-3.5 text-right">จำนวนเงิน</th>
                <th className="p-3.5">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {incomeTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    ไม่พบรายการรายรับตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                incomeTransactions.map((t) => {
                  const mType = t.moneyType || (t.fundName.includes('ซะกาต') ? 'zakat' : t.fundName.includes('ศอดะเกาะฮ์') ? 'sadaqah' : 'operational_admin');
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-semibold text-slate-900">{t.transactionNo}</td>
                      <td className="p-3.5 font-medium">{t.date}</td>
                      <td className="p-3.5 font-medium">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            mType === 'zakat'
                              ? 'bg-emerald-100 text-emerald-800'
                              : mType === 'sadaqah'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {mType === 'zakat' ? 'ซะกาต' : mType === 'sadaqah' ? 'ศอดะเกาะฮ์' : 'สำหรับบริหาร'}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        {t.isAnonymous ? (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <UserX className="w-3.5 h-3.5 text-slate-400" />
                            ไม่ประสงค์ออกนาม
                          </span>
                        ) : (
                          t.payerOrPayee
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{t.fundName.split(' ')[0]}</td>
                      <td className="p-3.5 text-slate-500">
                        {t.bankAccountName ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                            {t.bankAccountName.split('—')[0]}
                          </span>
                        ) : (
                          t.paymentMethod === 'promptpay_qr' ? 'PromptPay QR' : t.paymentMethod === 'bank_transfer' ? 'โอนธนาคาร' : 'เงินสด'
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{t.referenceNo}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                        ฿{t.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                          {t.status === 'completed' ? 'สำเร็จ' : t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Income */}
      {showAddModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                    บันทึกรับเงิน (ซะกาต / ศอดะเกาะฮ์ / สำหรับบริหาร)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">ระบุประเภทเงินและเงื่อนไขการใช้เงินอย่างถูกต้อง</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
              </div>

              <form onSubmit={handlePrepareIncome} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* 1. Money Type Switcher */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">ประเภทรายรับหลัก 3 หมวดหมู่ *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleMoneyTypeChange('zakat')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        moneyType === 'zakat'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      1. ซะกาต
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoneyTypeChange('sadaqah')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        moneyType === 'sadaqah'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      2. ศอดะเกาะฮ์ทั่วไป
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoneyTypeChange('operational_admin')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        moneyType === 'operational_admin'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      3. สำหรับบริหาร
                    </button>
                  </div>
                </div>

                {/* 2. Destination Fund & Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">กองทุนปลายทาง *</label>
                    <select
                      value={fundId}
                      onChange={(e) => setFundId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      {funds
                        .filter((f) => {
                          if (moneyType === 'zakat') return f.category === 'zakat';
                          if (moneyType === 'sadaqah') return f.category === 'sadaqah';
                          return f.category === 'operational';
                        })
                        .map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่รายรับ *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      {moneyType === 'zakat' && (
                        <>
                          <option value="ซะกาตทรัพย์สินทางการเงิน">ซะกาตทรัพย์สินทางการเงินและเงินออม</option>
                          <option value="ซะกาตรายได้และเงินเดือน">ซะกาตรายได้และเงินเดือน</option>
                          <option value="ซะกาตธุรกิจการค้า">ซะกาตธุรกิจการค้าและสินค้าคงเหลือ</option>
                          <option value="ซะกาตผลผลิตการเกษตร">ซะกาตผลผลิตการเกษตร</option>
                          <option value="ซะกาตทองคำและเครื่องประดับ">ซะกาตทองคำและเครื่องประดับ</option>
                        </>
                      )}
                      {moneyType === 'sadaqah' && (
                        <>
                          <option value="ศอดะเกาะฮ์สาธารณประโยชน์">ศอดะเกาะฮ์สาธารณประโยชน์</option>
                          <option value="บริจาคโครงการบรรเทาทุกข์น้ำท่วม">บริจาคโครงการบรรเทาทุกข์น้ำท่วม</option>
                          <option value="บริจาคสร้างและซ่อมบ้านยากไร้">บริจาคสร้างและซ่อมบ้านยากไร้</option>
                          <option value="ทุนการศึกษาเด็กกำพร้า">ทุนการศึกษาเด็กกำพร้า</option>
                        </>
                      )}
                      {moneyType === 'operational_admin' && (
                        <>
                          <option value="เงินบริจาคสมทบค่าใช้จ่ายบริหาร">เงินบริจาคสมทบค่าใช้จ่ายบริหาร</option>
                          <option value="เงินอุดหนุนดำเนินงานมูลนิธิ">เงินอุดหนุนดำเนินงานมูลนิธิ</option>
                          <option value="ค่าตอบแทนเจ้าหน้าที่จัดการซะกาต">ค่าตอบแทนเจ้าหน้าที่จัดการซะกาต</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* 3. Donor Name & Anonymous Option */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">ชื่อผู้บริจาค / ผู้จ่าย *</label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>ไม่ประสงค์ออกนาม</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    disabled={isAnonymous}
                    required={!isAnonymous}
                    placeholder={isAnonymous ? 'ผู้ไม่ประสงค์ออกนาม' : 'เช่น นายยูซุฟ มีลาภ'}
                    value={isAnonymous ? 'ผู้ไม่ประสงค์ออกนาม' : donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                {/* 4. Amount, Date, Zakat Year */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนเงิน (บาท) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold"
                    />
                    {amount > 10000 && (
                      <p className="text-[11px] font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>ยอดรับเงินเกิน 10,000 บาท แนะนำให้แนบสลิป/หลักฐานการโอน</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ปีซะกาต / รอบบัญชี</label>
                    <select
                      value={zakatYear}
                      onChange={(e) => setZakatYear(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="2569">2569 (ปัจจุบัน)</option>
                      <option value="2568">2568</option>
                      <option value="2567">2567</option>
                    </select>
                  </div>
                </div>

                {/* 5. Destination Bank Account & Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ช่องทางรับเงิน *</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="bank_transfer">โอนเงินผ่านธนาคาร</option>
                      <option value="promptpay_qr">PromptPay QR</option>
                      <option value="cash">เงินสด</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">บัญชีธนาคารปลายทาง</label>
                    <select
                      disabled={paymentMethod === 'cash'}
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                    >
                      {bankAccounts.filter((b) => b.status === 'active').map((b) => (
                        <option key={b.id} value={b.id}>{b.accountName.split('—')[0]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 6. Reference No & Receipt No */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เลขที่ใบรับเงิน</label>
                    <input
                      type="text"
                      value={receiptNo}
                      onChange={(e) => setReceiptNo(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเลขอ้างอิงชำระเงิน *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น BBL-12345 หรือ KTB-6789"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                {/* 7. Usage Restriction (for Sadaqah) */}
                {moneyType === 'sadaqah' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ข้อจำกัดการใช้เงิน (หากผู้บริจาคระบุไว้)</label>
                    <input
                      type="text"
                      placeholder="เช่น สำหรับโครงการอาหารกลางวันเด็กกำพร้าเท่านั้น..."
                      value={usageRestriction}
                      onChange={(e) => setUsageRestriction(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] px-6 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    ตรวจสอบข้อมูลและดำเนินการต่อ →
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Pre-Confirmation Summary for Income Receipt */}
      {showConfirmSummaryModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-6 h-6 text-emerald-200" />
                  <div>
                    <h3 className="font-bold text-lg leading-tight">สรุปข้อมูลใบรับเงินบริจาค</h3>
                    <p className="text-xs text-emerald-100">โปรดตรวจสอบความถูกต้องของยอดเงินและแหล่งเงิน</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfirmSummaryModal(false)}
                  disabled={isSubmitting}
                  className="text-emerald-200 hover:text-white p-1 text-lg font-bold"
                >✕</button>
              </div>

              <div className="p-6 space-y-4">
                {/* Large amount callout */}
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-center">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                    ยอดเงินรับเข้า ({moneyType === 'zakat' ? 'เงินซะกาต' : moneyType === 'sadaqah' ? 'เงินศอดะเกาะฮ์' : 'เงินสำหรับบริหาร'})
                  </p>
                  <div className="text-3xl font-extrabold text-emerald-700 font-mono mt-1">
                    ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                  </div>
                  <p className="text-xs text-emerald-600 mt-1 font-medium">{category}</p>
                </div>

                {amount > 10000 && (
                  <div className="bg-amber-100 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900">⚠️ แจ้งเตือนยอดเงินรับเข้าสูงเป็นพิเศษ (เกิน 10,000 บาท)</p>
                      <p className="mt-0.5 text-slate-700">รายการรับบริจาคนี้มียอด ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท ซึ่งเกินเกณฑ์ 10,000 บาท แนะนำให้ตรวจสอบความถูกต้องของสลิปการโอนเงิน/ยอดเงินในสมุดบัญชีธนาคารก่อนออกใบรับเงิน</p>
                    </div>
                  </div>
                )}

                {/* Summary Table */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">ผู้บริจาค:</span>
                    <span className="font-bold text-slate-900 text-base">{isAnonymous ? 'ผู้ไม่ประสงค์ออกนาม' : donorName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">กองทุนปลายทาง:</span>
                    <span className="font-semibold text-slate-800">{funds.find(f => f.id === fundId)?.name || fundId}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">ช่องทางการรับเงิน:</span>
                    <span className="font-semibold text-slate-800">
                      {paymentMethod === 'bank_transfer' ? 'โอนเงินเข้าบัญชีธนาคาร' : paymentMethod === 'promptpay_qr' ? 'PromptPay QR' : 'เงินสด'}
                      {paymentMethod !== 'cash' && bankAccounts.find(b => b.id === bankAccountId) && ` (${bankAccounts.find(b => b.id === bankAccountId)?.accountName.split('—')[0]})`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">เลขอ้างอิงสลิป:</span>
                    <span className="font-mono text-slate-700">{referenceNo}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-xs">เลขที่ใบรับเงิน:</span>
                    <span className="font-mono font-semibold text-emerald-800">{receiptNo}</span>
                  </div>
                  {usageRestriction && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 text-xs">เงื่อนไขการใช้เงิน:</span>
                      <span className="text-indigo-700 font-medium text-xs">{usageRestriction}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 text-xs">เจ้าหน้าที่ผู้รับบันทึก:</span>
                    <span className="text-slate-700 font-medium">{currentUser.name} ({currentUser.role})</span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>การออกใบรับเงิน:</strong> ระบบจะบันทึกรายรับเข้ากองทุนและปรับปรุงยอดคงเหลือในบัญชีธนาคาร/เงินสดทันที พร้อมจัดทำใบรับเงินอิเล็กทรอนิกส์
                  </p>
                </div>

                {/* Big Action Buttons */}
                <div className="pt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowConfirmSummaryModal(false)}
                    className="min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-base transition-all"
                  >
                    ← แก้ไขข้อมูล
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFinalIncome}
                    className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                        ยืนยันบันทึกรับเงิน
                      </>
                    )}
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
